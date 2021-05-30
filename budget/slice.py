# Allow slice-creator to change their slice even after other users voted for it
#   Slices are un-modifiable
#   If user changes their slice, create new slice record
#   Deduplicate slice-records by content
#   Remove the slice-record if votes=0 and fromEditPage=false
#   Also allows user to vote for slice that was changed after display
#   Also enables search-indexing without changing slice-content
#
# Uses title-only records to help retrieve top titles for budget-results
#   Risks transaction failure because title-records are somewhat contended
#   Title-record also stores slice-size distribution for slice-votes with that title, to get median size for title



# Import external modules
from collections import Counter, namedtuple
import datetime
from google.appengine.ext import ndb
from google.appengine.api import search
import hashlib
import logging
import re
import time;
# Import app modules
from configBudget import const as conf
import autocomplete.stats as stats
import text



# Constants
conf.MAX_RETRY = 3
conf.MAX_VOTE_RETRY = 3
conf.CHAR_LENGTH_UNIT = 100
conf.MAX_SLICE_SUGGESTIONS = 3
conf.NUM_FREQ_SLICE_SUGGESTIONS = min( 1, conf.MAX_SLICE_SUGGESTIONS - 1 )  # Should be less than MAX_SLICE_SUGGESTIONS



def standardizeContent( content ):
    content = text.formTextToStored( content ) if content  else None
    content = content.strip(' \n\r\x0b\x0c') if content  else None    # For now keep TAB to delimit slice from reason
    return content if content  else None



def voteCountToScore( voteCount, title, reason ):
    contentLen = ( len(title) if title else 0 ) + ( len(reason) if reason else 0 )
    # score = votes per CHAR_LENGTH_UNITs used
    unitsUsed = ( float(contentLen) / float(conf.CHAR_LENGTH_UNIT) )  if contentLen >= conf.CHAR_LENGTH_UNIT  else 1.0
    return float(voteCount) / float(unitsUsed)



# Persistent-record for unique slice-title & reason
class Slice( ndb.Model ):
    budgetId = ndb.StringProperty()   # To verify slice belongs to budget, and indexed to retrieve popular slices
    title = ndb.StringProperty()    # Indexed to retrieve popular reasons per title
    reason = ndb.StringProperty()
    creator = ndb.StringProperty()   # Indexed to check slice sum is valid
    fromEditPage = ndb.BooleanProperty()  # To keep slices from budget-creator only from edit-page

    voteCount = ndb.IntegerProperty( default=0 )
    sizeToCount = ndb.JsonProperty( default={} )  # map[ size -> vote-count ]
    score = ndb.FloatProperty( default=0 )
    
    # For matching input-words to make suggestions
    words = ndb.StringProperty( repeated=True )

    # Key slices by budgetId+hash(content), to prevent duplicates
    # Prevents problem of voting for slice by ID that was deleted (down-voted) between display & vote
    @staticmethod
    def toKeyId( budgetId, title, reason ):
        hasher = hashlib.md5()
        if title is None: title = ''
        if reason is None: reason = ''
        hasher.update( text.utf8(title + '\t' + reason) )
        return '{}-{}'.format( budgetId, hasher.hexdigest() )

    @staticmethod
    def create( budgetId, title, reason, creator=None, fromEditPage=False ):
        slice = Slice( id=Slice.toKeyId(budgetId, title, reason), 
            budgetId=budgetId, title=title, reason=reason, creator=creator, fromEditPage=fromEditPage )
        # Index content words
        content = ' '.join(  [ w for w in [title, reason] if w ]  )
        words = text.uniqueInOrder(  text.removeStopWords( text.tokenize(content) )  )
        words = words[ 0 : conf.MAX_WORDS_INDEXED ]  # Limit number of words indexed
        slice.words = text.tuples( words, maxSize=2 )
        return slice

    @staticmethod
    def get( budgetId, title, reason ):
        return Slice.get_by_id( Slice.toKeyId( budgetId, title, reason ) )

    def hasTitle( self ):
        return self.title and self.title.strip()

    def hasTitleAndReason( self ):
        return self.title and self.title.strip() and self.reason and self.reason.strip()

    def incrementSizeCount( self, size, increment ):
        size = str( size )  # JSON-field stores keys as strings
        countOld = self.sizeToCount.get( size, 0 )
        self.sizeToCount[ size ] = max( 0, countOld + increment )  # Do not allow negative counts
        self.sizeToCount = { s:c  for s,c in self.sizeToCount.iteritems()  if 0 < c }  # Filter zeros

    def medianSize( self ):  return stats.medianKey( self.sizeToCount )

    def sumScoreBelowSize( self, size ):
        return voteCountToScore( self.countVotesBelowSize(size), self.title, self.reason )

    def sumScoreAboveSize( self, size ):
        return voteCountToScore( self.countVotesAboveSize(size), self.title, self.reason )

    def countVotesBelowSize( self, size ):
        resultSum = sum(  [ c  for s, c  in self.sizeToCount.iteritems()  if int(s) < size ]  )
        logging.debug( 'countVotesBelowSize() resultSum=' + str(resultSum) + ' size=' + str(size) + ' sizeToCount=' + str(self.sizeToCount) )
        return resultSum

    def countVotesAboveSize( self, size ):
        resultSum = sum(  [ c  for s, c  in self.sizeToCount.iteritems()  if size < int(s) ]  )
        logging.debug( 'countVotesAboveSize() resultSum=' + str(resultSum) + ' size=' + str(size) + ' sizeToCount=' + str(self.sizeToCount) )
        return resultSum



# Persistent-record for unique slice-title
class SliceTitle( ndb.Model ):
    budgetId = ndb.StringProperty()   # To verify title belongs to budget, and indexed to retrieve popular titles
    title = ndb.StringProperty()    # Indexed to retrieve popular reasons per title

    voteCount = ndb.IntegerProperty( default=0 )  # Equal to sum of sizeToCount, indexed to retrieve top titles
    sizeToCount = ndb.JsonProperty( default={} )  # map[ size -> vote-count ]

    # Key slices by budgetId+hash(title)
    @staticmethod
    def toKeyId( budgetId, title ):
        hasher = hashlib.md5()
        hasher.update( text.utf8(title) )
        return '{}:{}'.format( budgetId, hasher.hexdigest() )

    @staticmethod
    def create( budgetId, title ):
        return SliceTitle( id=SliceTitle.toKeyId(budgetId, title), budgetId=budgetId, title=title )

    @staticmethod
    def get( budgetId, title ):
        return SliceTitle.get_by_id( SliceTitle.toKeyId( budgetId, title ) )

    def incrementSizeCount( self, size, increment ):
        logging.debug( 'SliceTitle.incrementSizeCount() size=' + str(size) + ' increment=' + str(increment) )
        size = str( size )  # JSON-field stores keys as strings
        countOld = self.sizeToCount.get( size, 0 )
        self.sizeToCount[ size ] = max( 0, countOld + increment )  # Do not allow negative counts
        self.sizeToCount = { s:c  for s,c in self.sizeToCount.iteritems()  if 0 < c }  # Filter zeros
        logging.debug( 'SliceTitle.incrementSizeCount() sizeToCount=' + str(self.sizeToCount) )

    def medianSize( self ):  return stats.medianKey( self.sizeToCount )

    def toDisplay( self, userId ):
        return {
            'id': str(self.key.id()) ,
            'title': self.title ,
            'votes': self.voteCount ,
            'medianSize': self.medianSize() ,
        }



# Record-class for storing budget x user -> all slice-votes for this user
class SliceVotes( ndb.Model ):
    # Indexed fields for querying
    userId = ndb.StringProperty()
    budgetId = ndb.StringProperty()

    slices = ndb.JsonProperty( default={} )  # map[ sliceId -> size ]
    
    def slicesTotalSize( self ):
        return sum( [size  for sliceId, size  in self.slices.iteritems()] )

    @staticmethod
    def toKeyId( budgetId, userId ):
        return '{}-{}'.format( budgetId, userId )

    @staticmethod
    def create( budgetId, userId ):
        voteId = SliceVotes.toKeyId( budgetId, userId )
        return SliceVotes( id=voteId, userId=userId, budgetId=budgetId )

    @staticmethod
    def get( budgetId, userId ):
        voteId = SliceVotes.toKeyId( budgetId, userId )
        return SliceVotes.get_by_id( voteId )



# Returns series[ SliceTitle ]
def retrieveTopSliceTitlesByVotes( budgetId ):
    logging.debug( 'retrieveTopSliceTitlesByVotes() budgetId=' + str(budgetId) )
    
    # Retrieve top title-records by vote-count
    sliceBatchSize = 20
    titleRecords = SliceTitle.query( Slice.budgetId==budgetId ).order( -Slice.voteCount ).fetch( sliceBatchSize )

    # Limit titles to amount summing to size=100%
    titleRecordsCapped = [ ]
    sumSizes = 0
    for t in titleRecords:
        if t is None:  continue
        sumSizes += t.medianSize()
        if sumSizes > 100:  break
        titleRecordsCapped.append( t )

    return sorted( titleRecordsCapped , key=lambda t:-t.voteCount )



# Returns series[ slice-record ] with top vote-counts
def retrieveTopSliceReasonsByVotes( budgetId, title, maxSlices=10 ):
    logging.debug( 'retrieveTopSliceReasonsByVotes() budgetId=' + str(budgetId) )
    sliceRecords = Slice.query( Slice.budgetId==budgetId, Slice.title==title ).order( -Slice.voteCount ).fetch( maxSlices )
    return sorted( sliceRecords , key=lambda s:-s.voteCount )



# Returns series[ slice-record ] with top scores
def retrieveTopSliceReasonsByScore( budgetId, title, maxSlices=10 ):
    logging.debug( 'retrieveTopSlicesByScore() budgetId=' + str(budgetId) + ' maxSlices=' + str(maxSlices) )
    sliceRecords = Slice.query( Slice.budgetId==budgetId, Slice.title==title ).order( -Slice.score ).fetch( maxSlices )
    return sorted( sliceRecords , key=lambda s:-s.score )



# Returns series[ slice-record ]
def retrieveTopSlicesByScoreForStart( budgetId, sliceStart, hideReasons=False ):

    logging.debug(('retrieveTopSlicesByScoreForStart()', 'sliceStart=', sliceStart))

    # We always have sliceStart, since we're not pre-populating slice-suggestions, there must always be slice input
    sliceRecords = []
    inputWords = text.uniqueInOrder(  text.removeStopWords( text.tokenize(sliceStart) )  )
    logging.debug( 'retrieveTopSlices() inputWords=' + str(inputWords) )
    if inputWords and (0 < len(inputWords)):
        # Retrieve top-voted slice-records matching last input-word.  Results will be collected and match-scored in client.
        # Only one inequality filter per query is supported, so cannot require both title and reason are non-null
        sliceRecords = Slice.query( Slice.budgetId==budgetId, Slice.words==inputWords[-1] ).order( -Slice.score ).fetch( 1 )
        # Retrieve for last input-word-pair
        if ( 2 <= len(inputWords) ):
            tuple = ' '.join( inputWords[-2:-1] )
            sliceRecords += Slice.query( Slice.budgetId==budgetId, Slice.words==tuple ).order( -Slice.score ).fetch( 1 )
    logging.debug( 'retrieveTopSlices() sliceRecords=' + str(sliceRecords) )

    # Filter out empty title/reason
    # There should be no records missing title & reason, since these should not be saveable, and should not word-match
    if hideReasons:  sliceRecords = filter( lambda s: s.hasTitle() , sliceRecords )
    else:            sliceRecords = filter( lambda s: s.hasTitleAndReason() , sliceRecords )

    return sliceRecords



# sliceContent may be null
# Returns Slice, SliceVote
# If any slice vote increment fails... then undo sliceVote._setVote() and all slice vote increments via transaction
@ndb.transactional(xg=True, retries=conf.MAX_VOTE_RETRY)   # Cross-table transaction is ok because vote record (user x slice) is not contended, and slice vote-count record is locking anyway
def vote( budgetId, title, reason, sizeNew, userId ):

    logging.debug(('vote()', 'sizeNew=', sizeNew, 'title=', title, 'reason=', reason))

    # Store vote for slice
    sliceId = Slice.toKeyId( budgetId, title, reason )
    logging.debug(('vote()', 'sliceId=', sliceId))
    voteRecord = SliceVotes.get( budgetId, userId )
    existingVote = (voteRecord is not None)  and  (voteRecord.slices is not None)  and  (sliceId in voteRecord.slices)
    sizeOld = voteRecord.slices.get(sliceId, 0)  if (voteRecord is not None) and (voteRecord.slices is not None)  else 0
    logging.debug(('vote()', 'sizeOld=', sizeOld, 'existingVote=', existingVote))
    logging.debug(('vote()', 'voteRecord=', voteRecord))
    if (0 < sizeNew):
        if voteRecord is None:  voteRecord = SliceVotes.create( budgetId, userId )
        voteRecord.slices[ sliceId ] = sizeNew
        if ( conf.SLICE_SIZE_SUM_MAX < voteRecord.slicesTotalSize() ):
            logging.debug(('vote()', 'voteRecord.slicesTotalSize()=', voteRecord.slicesTotalSize()))
            return None, None, False
        voteRecord.put()
    elif existingVote:  # and sizeNew <= 0...
        del voteRecord.slices[ sliceId ]
        voteRecord.put()
    logging.debug(('vote()', 'voteRecord=', voteRecord))

    # Increment and store vote aggregates in slice & title-records, during the same transaction
    sliceRecord = __incrementSliceVoteCount( sizeOld, sizeNew, budgetId, title, reason )
    __incrementTitleVoteCount( sizeOld, sizeNew, budgetId, title )
    logging.debug(('vote()', 'sliceRecord=', sliceRecord))
    return sliceRecord, voteRecord, True


# Increment vote count, inside another transaction
# Updates or deletes title-record
# Returns updated SliceTitle record, or throws transaction-conflict exception
# Title-record update is more contended than reason-record update
def __incrementTitleVoteCount( sizeOld, sizeNew, budgetId, title ):
    logging.debug(('__incrementTitleVoteCount()', 'sizeOld=', sizeOld, 'sizeNew=', sizeNew, 'budgetId=', budgetId, 'title=', title))

    voteIncrement = 0
    if ( sizeOld == sizeNew ):  return
    elif ( sizeOld <= 0 ) and ( 0 < sizeNew ):  voteIncrement = 1
    elif ( 0 < sizeOld ) and ( sizeNew <= 0 ):  voteIncrement = -1
    logging.debug(('__incrementTitleVoteCount()', 'voteIncrement=', voteIncrement))

    # If title-record does not exist...
    titleRecord = SliceTitle.get( budgetId, title )
    if titleRecord is None:
        # Decrement is redundant
        if ( sizeNew <= 0 ):  return
        # Create record to increment
        else:  titleRecord = SliceTitle.create( budgetId, title )

    if budgetId != titleRecord.budgetId:  raise ValueError('budgetId != titleRecord.budgetId')

    # Update title-record voteCount field
    titleRecord.voteCount = max( 0, titleRecord.voteCount + voteIncrement )
    logging.debug(('__incrementTitleVoteCount()', 'titleRecord=', titleRecord))

    # If title has votes... update title-record
    if (0 < titleRecord.voteCount):
        # Update title-record fields
        titleRecord.incrementSizeCount( sizeOld, -1 )
        titleRecord.incrementSizeCount( sizeNew, 1 )
        logging.debug(('__incrementTitleVoteCount()', 'overwriting titleRecord=', titleRecord))
        # Store title-record
        titleRecord.put()
    # If title has no votes... delete title-record
    else:
        logging.debug(('__incrementTitleVoteCount()', 'deleting titleRecord=', titleRecord))
        titleRecord.key.delete()


# Increment vote count, inside another transaction
# Updates or deletes slice-record
# Returns updated Slice record, or throws transaction Conflict exception
def __incrementSliceVoteCount( sizeOld, sizeNew, budgetId, title, reason ):

    logging.debug(('__incrementSliceVoteCount()', 'sizeOld=', sizeOld, 'sizeNew=', sizeNew, 'budgetId=', budgetId, 'title=', title, 'reason=', reason))

    voteIncrement = 0
    if ( sizeOld == sizeNew ):
        sliceRecord = Slice.get( budgetId, title, reason )
        logging.debug(('__incrementSliceVoteCount()', 'sizeOld=sizeNew sliceRecord=', sliceRecord))
    elif ( sizeOld <= 0 ) and ( 0 < sizeNew ):  voteIncrement = 1
    elif ( 0 < sizeOld ) and ( sizeNew <= 0 ):  voteIncrement = -1
    logging.debug(('__incrementSliceVoteCount()', 'voteIncrement=', voteIncrement))

    # If slice-record does not exist...
    sliceRecord = Slice.get( budgetId, title, reason )
    if sliceRecord is None:
        # Decrement is redundant
        if ( sizeNew <= 0 ):  return None
        # Create record to increment
        else:  sliceRecord = Slice.create( budgetId, title, reason )

    if budgetId != sliceRecord.budgetId:  raise ValueError('budgetId != sliceRecord.budgetId')

    # Update slice-record vote-count field
    sliceRecord.voteCount = max( 0, sliceRecord.voteCount + voteIncrement )
    logging.debug(('__incrementSliceVoteCount()', 'sliceRecord=', sliceRecord))

    # If slice has votes or comes from survey-creator... keep slice record
    if (0 < sliceRecord.voteCount) or sliceRecord.fromEditPage:

        sliceRecord.incrementSizeCount( sizeOld, -1 )
        sliceRecord.incrementSizeCount( sizeNew, 1 )

        # Update score field
        sliceRecord.score = voteCountToScore( sliceRecord.voteCount, sliceRecord.title, sliceRecord.reason )
        logging.debug(('__incrementSliceVoteCount()', 'overwriting sliceRecord=', sliceRecord))

        # Store slice-record
        sliceRecord.put()
        return sliceRecord

    # If slice has no votes and not from survey-creator... delete slice-record
    else:
        logging.debug(('__incrementSliceVoteCount()', 'deleting sliceRecord=', sliceRecord))
        sliceRecord.key.delete()
        return None


