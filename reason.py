# Uses Sharded vote counter, to increase vote throughput.
#     https://cloud.google.com/appengine/articles/sharding_counters


# Import external modules
from google.appengine.ext import ndb
import math
# Import app modules
from configuration import const as conf
from constants import Constants
import logging
import proposal
import reasonVote
import text


# Constants for use only inside this file/module
const = Constants()
const.MAX_VOTE_RETRY = 3
const.CHAR_LENGTH_UNIT = 100


# Persistent record
# Parent key: proposal?  No, use key-properties instead, for better throughput.
class Reason(ndb.Model):
    proposalId = ndb.StringProperty()   # Primary key.  Needed to retrieve all reasons for a single proposal.
    requestId = ndb.StringProperty()   # Search index.  Needed to retrieve all reasons for request.

    content = ndb.StringProperty()
    proOrCon = ndb.StringProperty()  # { 'pro', 'con' }
    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty()

    # For matching input-words to make suggestions
    words = ndb.StringProperty( repeated=True )

    voteCount = ndb.IntegerProperty( default=0 )
    score = ndb.FloatProperty( default=0 )

    def setContent( self, content ):
        self.content = content
        # Index content words
        words = text.uniqueInOrder(  text.removeStopWords( text.tokenize(content) )  )
        words = words[ 0 : conf.MAX_WORDS_INDEXED ]  # Limit number of words indexed
        self.words = text.tuples( words, maxSize=2 )



def voteCountToScore( voteCount, content ):
    contentLen = len(content)  if content  else 0
    # score = votes per CHAR_LENGTH_UNITs used
    unitsUsed = float(contentLen) / float(const.CHAR_LENGTH_UNIT)  if contentLen >= const.CHAR_LENGTH_UNIT  else 1.0
    return float(voteCount) / float(unitsUsed)




def retrieveTopReasons( proposalId, maxReasonsPerType, cursorPro=None, cursorCon=None ):
    proRecordsFuture, conRecordsFuture = retrieveTopReasonsAsync( proposalId, maxReasonsPerType, cursorPro=cursorPro, cursorCon=cursorCon )

    proRecords, proCursor, proHasMore = proRecordsFuture.get_result()
    conRecords, conCursor, conHasMore = conRecordsFuture.get_result()

    if conf.isDev:  logging.debug( 'retrieveTopReasons() proRecords=' + str(proRecords) )
    if conf.isDev:  logging.debug( 'retrieveTopReasons() conRecords=' + str(conRecords) )

    return [ r  for r in (proRecords + conRecords)  if r is not None ] , proCursor , conCursor


# Returns 2 futures, each producing ( batch of records, next-page-cursor, more-records-flag )
def retrieveTopReasonsAsync( proposalId, maxReasonsPerType, cursorPro=None, cursorCon=None ):
    proposalIdStr = str( proposalId )

    if conf.isDev:  logging.debug( 'retrieveTopReasonsAsync() proposalId=' + str(proposalId) + ' maxReasonsPerType=' + str(maxReasonsPerType) )
    if conf.isDev:  logging.debug( 'retrieveTopReasonsAsync() cursorPro=' + str(cursorPro) + ' cursorCon=' + str(cursorCon) )

    proRecordsFuture = Reason.query( Reason.proposalId==proposalIdStr, Reason.proOrCon==conf.PRO ).order(
        -Reason.score ).fetch_page_async( maxReasonsPerType , start_cursor=cursorPro )

    conRecordsFuture = Reason.query( Reason.proposalId==proposalIdStr, Reason.proOrCon==conf.CON ).order(
        -Reason.score ).fetch_page_async( maxReasonsPerType , start_cursor=cursorCon )

    return proRecordsFuture, conRecordsFuture



# Returns series[ reason-record-future ]
def retrieveTopReasonsForStart( proposalId, reasonStart ):
    proposalIdStr = str( proposalId )
    inputWords = text.uniqueInOrder(  text.removeStopWords( text.tokenize(reasonStart) )  )
    if conf.isDev:  logging.debug( 'retrieveTopReasonsForStart() inputWords=' + str(inputWords) )

    reasonRecordFutures = []
    if inputWords and ( 0 < len(inputWords) ):
        # Retrieve top-voted reason-records matching last input-word
        # Results will be collected & match-scored in client
        lastWord = inputWords[ -1 ]
        reasonRecordFutures.append(  Reason.query( Reason.proposalId==proposalIdStr, Reason.words==lastWord ).order( -Reason.score ).fetch_async( 1 )  )
        # Retrieve for last input-word-pair
        if ( 2 <= len(inputWords) ):
            lastTuple = ' '.join( inputWords[-2:-1] )
            reasonRecordFutures.append(  Reason.query( Reason.proposalId==proposalIdStr, Reason.words==lastTuple ).order( -Reason.score ).fetch_async( 1 )  )

    # De-duplicate records, since both word & tuple-top-suggestion may be the same
    recordsUnique = { }
    for f in reasonRecordFutures:
        if f:
            for r in f.get_result():
                if r:
                    recordsUnique[ r.key.id() ] = r
    if conf.isDev:  logging.debug( 'retrieveTopReasonsForStart() recordsUnique=' + str(recordsUnique) )

    return recordsUnique.values()



# Assumes that user can vote for only 1 reason per proposal
# Parameters: voteUp:boolean
# May modify reason, reason-vote, and proposal records
# Returns success:boolean, updated Reason, updated ReasonVote
# def vote( requestId, proposalId, reasonId, userId, voteUp, isRequestForProposals=False ):
def vote( requestId, proposalId, reasonId, userId, voteUp ):
    success, reasonRec, reasonVoteRec, prosInc, consInc = __voteTransaction( requestId, proposalId, reasonId, userId, voteUp )  # Transaction
    if conf.isDev:  logging.debug( 'vote() success=' + str(success) + ' prosInc=' + str(prosInc) + ' consInc=' + str(consInc) )
    if  success  and  (prosInc != 0  or  consInc != 0):
        proposal.incrementTasklet( requestId, proposalId, prosInc, consInc )  # Async
    return success, reasonRec, reasonVoteRec


# Assumes that user can vote for only 1 reason per proposal.
# Parameters: voteUp:boolean
# Returns success:boolean, Reason, ReasonVote
@ndb.transactional(xg=True, retries=const.MAX_VOTE_RETRY)   # Cross-table is ok because vote record (user x proposal) is not contended, and reason vote count record is locking anyway.
def __voteTransaction( requestId, proposalId, reasonId, userId, voteUp ):
    voteFlagSuccess, voteCountIncrements, voteRecord = reasonVote._setVote( requestId, proposalId, reasonId, userId, voteUp )  # Uncontested
    logging.debug( '__voteTransaction() voteFlagSuccess=' + str(voteFlagSuccess) + ' voteCountIncrements=' + str(voteCountIncrements) + ' voteRecord=' + str(voteRecord) )

    if not voteFlagSuccess:  return False, None, voteRecord, 0, 0
    
    # If any reason vote increment fails... then undo reasonVote._setVote() and all reason vote increments via transaction.
    reasonRecord = None
    prosInc = 0
    consInc = 0
    for incReasonId, voteCountIncrement in voteCountIncrements.items():
        incReasonRecord = __incrementVoteCount( incReasonId, voteCountIncrement )  # Contested lightly
        if str(incReasonRecord.key.id()) == reasonId:  reasonRecord = incReasonRecord

        if incReasonRecord.proOrCon == conf.PRO:  prosInc += voteCountIncrement
        elif incReasonRecord.proOrCon == conf.CON:  consInc += voteCountIncrement

    return True, reasonRecord, voteRecord, prosInc, consInc


# Increment vote count, inside another transaction
# Returns updated Reason record, or throws transaction Conflict exception
def __incrementVoteCount( reasonId, amount ):
    reasonRecord = Reason.get_by_id( int(reasonId) )
    reasonRecord.voteCount += amount
    reasonRecord.allowEdit = False  # If reason ever had votes... allow no further editing
    reasonRecord.score = voteCountToScore( reasonRecord.voteCount, reasonRecord.content )
    reasonRecord.put()
    return reasonRecord

