# Data record classes

# Import external modules
from collections import namedtuple
import copy
import datetime
from google.appengine.ext import ndb
import logging
import time
# Import app modules
from multi.configMulti import conf
import autocomplete.stats as stats
import multi.shared
import multi.userAnswers
import text
from text import LogMessage


#####################################################################################################
# Data record classes

# Use cases:
#  Show results:  top answers by votes
#  Suggest answer:  top scored answers by start words
#  Suggest higher (or lower) answer:  top scored answers higher (lower) than current answer

# A piece of the VoteAggregate key, with meta-data
class SubKey( object ):
    def __init__( self, value, doAggregate=False, isId=False, isHash=False, isNumber=False, mergeWords=False, childDistribution=False ):
        self.value = value
        self.doAggregate = doAggregate
        self.isId = isId
        self.isHash = isHash
        self.isNumber = isNumber
        self.mergeWords = mergeWords  # For matching words in text-answer + reason, have to search by combined parent + last subkey words
        self.childDistribution = childDistribution

    def isText( self ):  return not ( self.isId or self.isHash or self.isNumber )

    def __repr__( self ):
        valueStr = '"{}"'.format( self.value )  if ( (self.value is not None) and self.isText() )  else str( self.value )
        flags = [
            ( 'doAggregate'  if self.doAggregate  else None ) ,
            ( 'isId'  if self.isId  else None ) ,
            ( 'isHash'  if self.isHash  else None ) ,
            ( 'isNumber'  if self.isNumber  else None ) ,
            ( 'mergeWords'  if self.mergeWords  else None ) ,
            ( 'childDistribution'  if self.childDistribution  else None ) ,
        ]
        flags = [ f  for f in flags  if f is not None ]
        return 'SubKey{' + ' '.join( [valueStr] + flags ) + '}'

    def __eq__( self, other ):
        return (
            isinstance( other, SubKey ) and
            ( self.value == other.value ) and
            ( self.doAggregate == other.doAggregate ) and
            ( self.isId == other.isId ) and
            ( self.doAggregate == other.doAggregate ) and
            ( self.isHash == other.isHash ) and
            ( self.isNumber == other.isNumber ) and
            ( self.mergeWords == other.mergeWords ) and
            ( self.childDistribution == other.childDistribution )
        )


# Vote-count aggregate, keyed by a series of SubKey
# If reason or other answer parts are null, might need vote-counts for own/ancesstor results
class VoteAggregate( ndb.Model ):

    surveyId = ndb.StringProperty()   # To verify answer belongs to survey

    parentKey = ndb.StringProperty()  # To find top answers for a given parent-question, or top reasons for a given parent-answer
    grandparentKey = ndb.StringProperty()  # To find top answers & reasons for a given grandparent-question
    greatgrandparentKey = ndb.StringProperty()  # To find top budget items & amounts & reasons for a great-grandparent question

    grandparentSubkeyText = ndb.StringProperty()  # To retrieve budget-item text for top budget-item-allocations
    parentSubkeyText = ndb.StringProperty()  # To retrieve top answers for a given grandparent-question
    lastSubkeyText = ndb.StringProperty()  # To find top non-null answers

    words = ndb.StringProperty( repeated=True )  # For matching input-words to make suggestions

    voteCount = ndb.IntegerProperty( default=0 )  # Votes for last-subkey, non-negative
    score = ndb.FloatProperty( default=0 )
    childToVotes = ndb.JsonProperty()
    
    @staticmethod
    def create( surveyId, subkeys ):
        record = VoteAggregate( id=VoteAggregate.toKeyId(surveyId, subkeys), surveyId=surveyId )
        record.parentKey = VoteAggregate.toKeyId( surveyId, subkeys[0 : -1] )
        record.grandparentKey = VoteAggregate.toKeyId( surveyId, subkeys[0 : -2] )
        record.greatgrandparentKey = VoteAggregate.toKeyId( surveyId, subkeys[0 : -3] )

        lastSubkey = subkeys[ -1 ]
        record.lastSubkeyText = str( lastSubkey.value )  if not text.isEmpty(lastSubkey.value)  else None
        record.parentSubkeyText = str( subkeys[-2].value )  if ( 2 <= len(subkeys) ) and not text.isEmpty(subkeys[-2].value)  else None
        record.grandparentSubkeyText = str( subkeys[-3].value )  if ( 3 <= len(subkeys) ) and not text.isEmpty(subkeys[-3].value)  else None

        # Interpret last-subkey: parse as number or index words
        if lastSubkey.isText():
            searchableText = ' '.join(  [ s.value or ''  for i,s in enumerate(subkeys)  if (i == len(subkeys)-1) or (s.mergeWords and s.isText()) ]  )
            words = multi.shared.tokenizeText( searchableText )
            words = words[ 0 : conf.MAX_WORDS_TO_INDEX ]  # Limit number of words indexed
            record.words = text.tuples( words, conf.MAX_COMPOUND_WORD_LENGTH )

        return record

    @staticmethod
    def retrieve( surveyId, subkeys ):
        return VoteAggregate.get_by_id( VoteAggregate.toKeyId(surveyId, subkeys) )

    @staticmethod
    def toKeyId( surveyId, subkeys ):
        subkeyStrings = VoteAggregate.subkeysToStrings( subkeys )
        return '-'.join( [surveyId] + subkeyStrings )

    @staticmethod
    def subkeysToStrings( subkeys ):
        subkeyStrings = []
        for s in subkeys:
            if s.value is None: subkeyStrings.append( '' )
            elif s.isNumber:    subkeyStrings.append( str(s.value) )
            elif s.isHash:      subkeyStrings.append( s.value )
            elif s.isId:        subkeyStrings.append( s.value )
            else:               subkeyStrings.append( multi.shared.hashForKey(s.value) )
        return subkeyStrings

    def incrementVoteCount( self, increment ):  self.setVoteCount( self.voteCount + increment )

    def setVoteCount( self, newVoteCount ):
        self.voteCount = max( 0, newVoteCount )
        self.score = multi.shared.scoreDiscountedByLength( self.voteCount, self.lastSubkeyText )

    def setChildVotes( self, child, votes ):
        if self.childToVotes is None:  self.childToVotes = {}
        self.childToVotes[ child ] = votes

    def medianChild( self ):  return stats.medianKey( self.childToVotes )
    def averageChild( self ):  return stats.averageKey( self.childToVotes )

    def lastSubkeyHash( self ):  return multi.shared.hashForKey( self.lastSubkeyText )

    def toClient( self, userId ):
        data = {
            'id': str( self.key.id() ) ,
            'lastSubkey': self.lastSubkeyText ,
            'parentSubkey': self.parentSubkeyText ,
            'grandparentSubkey': self.grandparentSubkeyText ,
            'words': ' '.join( self.words )  if self.words  else '' ,
            'votes': self.voteCount ,
            'score': self.score ,
        }
        return data



#####################################################################################################
# Methods for voting and incrementing vote-aggregates

# Assumes that user is voting for answerContent & reason, which may be null
# Allows only 1 answer & reason per subkey-path
#  User could input a group of subkey-paths (example: budget items), but only 1 answer/reason per path
#  Proposal-reasons are not subkey-paths, because proposal-reasons must exist even without votes
# Use numUnaggregatedSubkeys to only change aggregate-votes for answer/UGC ancestors, not question ancestors
# If any vote/aggregate increment fails... then undo all vote increments via transaction
@ndb.transactional(xg=True, retries=conf.MAX_VOTE_RETRY)
def vote( userId, surveyId, subkeys, answerContent, reason, numericAnswer=False, countUniqueVoters=False ):

    logging.debug(LogMessage('userId=', userId, 'surveyId=', surveyId, 'subkeys=', subkeys))

    # Store answer in user-survey-answers
    userVoteRecord, answerOld, questionHadAnswer = multi.userAnswers.updateAnswer( userId, surveyId, subkeys, answerContent, reason )
    logging.debug(LogMessage('userVoteRecord=', userVoteRecord))
    if not userVoteRecord:  return None, None, None, None

    # Prepare subkeys for incrementing vote-aggregates
    subkeysWithAnswerOld = subkeys + [
        SubKey(value=answerOld.content, isNumber=numericAnswer, doAggregate=True) ,
        SubKey(value=answerOld.reason, doAggregate=True)
    ]
    subkeysWithAnswerNew = subkeys + [
        SubKey(value=answerContent, isNumber=numericAnswer, doAggregate=True) ,
        SubKey(value=reason, doAggregate=True)
    ]
    logging.debug(LogMessage('subkeysWithAnswerNew=', subkeysWithAnswerNew))

    # Increment vote-aggregates
    oldAnswerIsNull = multi.userAnswers.answerIsEmpty( answerOld.content, answerOld.reason )
    newAnswerIsNull = multi.userAnswers.answerIsEmpty( answerContent, reason )
    aggregateRecordsNew, aggregateRecordsOld = incrementVoteAggregates( surveyId, subkeysWithAnswerOld, subkeysWithAnswerNew, oldAnswerIsNull, newAnswerIsNull )

    # Increment vote-aggregate for question unique voter count
    questionVotes = None
    if countUniqueVoters:
        questionVotes = VoteAggregate.retrieve( surveyId, subkeys[0:1] )
        if questionVotes and questionHadAnswer and newAnswerIsNull:
            questionVotes.incrementVoteCount( -1 )
            questionVotes.put()
        elif (not questionHadAnswer) and (not newAnswerIsNull):
            if not questionVotes:  questionVotes = VoteAggregate.create( surveyId, subkeys[0:1] )
            questionVotes.incrementVoteCount( 1 )
            questionVotes.put()
    logging.debug(LogMessage('questionVotes=', questionVotes))

    return userVoteRecord, aggregateRecordsNew, aggregateRecordsOld, questionVotes



def voteRanking( userId, surveyId, questionId, optionId, rankNew, reasonNew, ranking=None, optionsAllowed=None ):

    logging.debug(LogMessage( 'userId=', userId, 'surveyId=', surveyId, 'questionId=', questionId, 'optionId=', optionId, 'rankNew=', rankNew, 'reasonNew=', reasonNew ))
    logging.debug(LogMessage( 'ranking=', ranking ))
    logging.debug(LogMessage( 'optionsAllowed=', optionsAllowed ))

    userVoteRecord, rankingOld, rankingNew = voteRankingChangeUserVote(
        userId, surveyId, questionId, optionId, rankNew, reasonNew, ranking=ranking, optionsAllowed=optionsAllowed )

    # For each option... incrementVoteAggregates() with its old & new rank
    for o in set( rankingOld.keys() ).union( set(rankingNew.keys()) ):
        logging.debug(LogMessage('o=', o))

        oldAnswer = rankingOld.get( o, {} )
        newAnswer = rankingNew.get( o, {} )

        oldContent = oldAnswer.get( multi.userAnswers.KEY_CONTENT, None )
        newContent = newAnswer.get( multi.userAnswers.KEY_CONTENT, None )
        
        oldReason = oldAnswer.get( multi.userAnswers.KEY_REASON, None )
        newReason = newAnswer.get( multi.userAnswers.KEY_REASON, None )

        logging.debug(LogMessage('oldAnswer=', oldAnswer, 'newAnswer=', newAnswer))

        if ( oldContent == newContent ) and ( oldReason == newReason ):  continue

        # Have to change each aggregate in a separate transaction to avoid "operating on too many entity groups in a single transaction"
        # Since all options are re-voted on each change, error recovery is quick,
        # so each aggregate-path can be changed in a separate transaction
        voteRankingChangeAggregate( surveyId, questionId, o,
            (int(newContent) if newContent else None), newReason,
            (int(oldContent) if oldContent else None), oldReason )

    return userVoteRecord

@ndb.transactional(xg=True, retries=conf.MAX_VOTE_RETRY)
def voteRankingChangeUserVote( userId, surveyId, questionId, optionId, rankNew, reasonNew, ranking=None, optionsAllowed=None ):
    # Store answer in user-survey-answers
    userVoteRecord = multi.userAnswers.SurveyAnswers.retrieveOrCreate( surveyId, userId )
    logging.debug(LogMessage('userVoteRecord=', userVoteRecord))

    # Update user answers, maintaining a valid ranking
    rankingOld = userVoteRecord.getQuestionAnswers( questionId )  or  {}
    rankingOld = copy.deepcopy( rankingOld )
    logging.debug(LogMessage('rankingOld=', rankingOld))

    userVoteRecord.setRanking( questionId, optionsAllowed, ranking, optionId, rankNew, reasonNew )
    rankingNew = userVoteRecord.getQuestionAnswers( questionId )

    logging.debug(LogMessage('rankingOld=', rankingOld))
    logging.debug(LogMessage('rankingNew=', rankingNew))
    userVoteRecord.put()
    
    return userVoteRecord, rankingOld, rankingNew

@ndb.transactional(xg=True, retries=conf.MAX_VOTE_RETRY)
def voteRankingChangeAggregate( surveyId, questionId, optionId, newRank, newReason, oldRank, oldReason ):
    if ( oldRank == newRank ) and ( oldReason == newReason ):  return

    # Prepare subkeys for incrementing vote-aggregates
    subkeysWithAnswerOld = [
        SubKey(value=questionId, isId=True) ,
        SubKey(value=optionId, isId=True, doAggregate=True, childDistribution=True) ,
        SubKey(value=oldRank, isNumber=True, doAggregate=True) ,
        SubKey(value=oldReason, doAggregate=True)
    ]
    logging.debug(LogMessage('subkeysWithAnswerOld=', subkeysWithAnswerOld))

    subkeysWithAnswerNew = [
        SubKey(value=questionId, isId=True) ,
        SubKey(value=optionId, isId=True, doAggregate=True, childDistribution=True) ,
        SubKey(value=newRank, isNumber=True, doAggregate=True) ,
        SubKey(value=newReason, doAggregate=True)
    ]
    logging.debug(LogMessage('subkeysWithAnswerNew=', subkeysWithAnswerNew))

    oldAnswerIsNull = multi.userAnswers.answerIsEmpty( oldRank, oldReason )
    newAnswerIsNull = multi.userAnswers.answerIsEmpty( newRank, newReason )
    aggregateRecordsNew, aggregateRecordsOld = incrementVoteAggregates(
        surveyId, subkeysWithAnswerOld, subkeysWithAnswerNew, oldAnswerIsNull, newAnswerIsNull )



# For budget-question, which has to set 3 answer levels: content, amount, reason
# Caller must specify the old content, so this function can remove or modify the old allocation
@ndb.transactional(xg=True, retries=conf.MAX_VOTE_RETRY)
def voteBudgetItem( userId, surveyId, questionId, itemOld, itemNew, amountNew, reasonNew ):

    logging.debug(LogMessage('userId=', userId, 'surveyId=', surveyId, 'questionId=', questionId, 'itemOld=', itemOld, 'itemNew=', itemNew, 'amountNew=', amountNew, 'reasonNew=', reasonNew))

    # Store answer in user-survey-answers
    userVoteRecord = multi.userAnswers.SurveyAnswers.retrieveOrCreate( surveyId, userId )
    logging.debug(LogMessage('userVoteRecord=', userVoteRecord))

    # Check total allocation inside vote-transaction, because limit depends on current user-answers
    subkeysForBudgetItemOld = [
        SubKey(value=questionId, isId=True) ,
        SubKey(value=itemOld, isId=True)  # For user-answers, item-subkey should not be hashed, so that it is displayable in client
    ]
    subkeysForBudgetItemNew = [
        SubKey(value=questionId, isId=True) ,
        SubKey(value=itemNew, isId=True)
    ]
    answerOld = userVoteRecord.removeAnswer( VoteAggregate.subkeysToStrings(subkeysForBudgetItemOld) )
    questionAnswers = userVoteRecord.getQuestionAnswers( questionId )
    if questionAnswers:  questionAnswers.pop( itemOld, None )
    logging.debug(LogMessage('answerOld=', answerOld))

    if amountNew and ( 0 < amountNew ):
        # For new allocation, set an index-number, so that allocation order can be sorted consistently
        answerNew = userVoteRecord.setAnswer( VoteAggregate.subkeysToStrings(subkeysForBudgetItemNew), amountNew, reasonNew, setId=True, id=answerOld.id )
        logging.debug(LogMessage('userVoteRecord=', userVoteRecord))

    allocationSum = userVoteRecord.budgetSum( questionId ) 
    if ( allocationSum < 0 ) or ( 100 < allocationSum ):  raise ValueError( 'allocationSum={}'.format(allocationSum) ) 

    userVoteRecord.put()

    # Prepare subkeys for incrementing vote-aggregates
    subkeysWithAnswerOld = [
        SubKey(value=questionId, isId=True) ,
        SubKey(value=itemOld, doAggregate=True, mergeWords=True, childDistribution=True) ,  # For vote-aggregates, item-subkey should be marked text, so that it is merged into search text for allocation-reason
        SubKey(value=answerOld.content, isNumber=True, doAggregate=True) ,
        SubKey(value=answerOld.reason, doAggregate=True)
    ]
    subkeysWithAnswerNew = [
        SubKey(value=questionId, isId=True) ,
        SubKey(value=itemNew, doAggregate=True, mergeWords=True, childDistribution=True) ,
        SubKey(value=amountNew, isNumber=True, doAggregate=True) ,
        SubKey(value=reasonNew, doAggregate=True)
    ]
    logging.debug(LogMessage('subkeysWithAnswerNew=', subkeysWithAnswerNew))

    oldAnswerIsNull = ( answerOld.content in [None, '', 0] ) and not answerOld.reason
    newAnswerIsNull = ( amountNew in [None, '', 0] ) and not reasonNew
    aggregateRecordsNew, aggregateRecordsOld = incrementVoteAggregates( surveyId, subkeysWithAnswerOld, subkeysWithAnswerNew, oldAnswerIsNull, newAnswerIsNull )
    return userVoteRecord, aggregateRecordsNew, aggregateRecordsOld



# For list-question, caller must specify the old content, so this function can remove or modify the old answer
@ndb.transactional(xg=True, retries=conf.MAX_VOTE_RETRY)
def voteListItem( userId, surveyId, questionId, itemOld, itemNew, reasonNew, maxItems=5 ):

    logging.debug(LogMessage('userId=', userId, 'surveyId=', surveyId, 'questionId=', questionId, 'itemOld=', itemOld, 'itemNew=', itemNew, 'reasonNew=', reasonNew))

    # Store answer in user-survey-answers
    userVoteRecord = multi.userAnswers.SurveyAnswers.retrieveOrCreate( surveyId, userId )
    logging.debug(LogMessage('userVoteRecord=', userVoteRecord))

    # Check for duplicate new item
    questionAnswers = userVoteRecord.getQuestionAnswers( questionId )
    if ( itemOld != itemNew ) and questionAnswers and ( itemNew in questionAnswers ):  return None, None, None, conf.DUPLICATE

    # Remove old reason
    # For user-answers, item-subkey should not be hashed, so that it is displayable in client
    subkeysOld = [ SubKey(value=questionId, isId=True) , SubKey(value=itemOld, isId=True) ]
    subkeysNew = [ SubKey(value=questionId, isId=True) , SubKey(value=itemNew, isId=True) ]
    logging.debug(LogMessage('subkeysToStrings(subkeysOld)=', VoteAggregate.subkeysToStrings(subkeysOld) ))
    answerOld = userVoteRecord.removeAnswer( VoteAggregate.subkeysToStrings(subkeysOld) )
    logging.debug(LogMessage('answerOld=', answerOld))
    # Remove old item
    if questionAnswers:  questionAnswers.pop( itemOld, None )
    logging.debug(LogMessage('userVoteRecord=', userVoteRecord))
    # Set new item
    if not multi.userAnswers.answerIsEmpty( itemNew, reasonNew ):
        # For new item, set an index-number, so that item order can be sorted consistently
        content = None
        answerNew = userVoteRecord.setAnswer( VoteAggregate.subkeysToStrings(subkeysNew), content, reasonNew, setId=True, id=answerOld.id )
        logging.debug(LogMessage('userVoteRecord=', userVoteRecord))

    # Check number of items inside vote-transaction, because limit depends on current user-answers
    numItems = userVoteRecord.numItems( questionId )
    if ( maxItems < numItems ):  raise ValueError( 'maxItems={} < numItems={}'.format(maxItems, numItems) )

    userVoteRecord.put()

    # Prepare subkeys for incrementing vote-aggregates
    subkeysWithAnswerOld = [
        SubKey(value=questionId, isId=True) ,
        SubKey(value=itemOld, doAggregate=True, mergeWords=True, childDistribution=True) ,  # For vote-aggregates, item-subkey should be marked text, so that it is merged into search text for reason
        SubKey(value=answerOld.reason, doAggregate=True)
    ]
    subkeysWithAnswerNew = [
        SubKey(value=questionId, isId=True) ,
        SubKey(value=itemNew, doAggregate=True, mergeWords=True, childDistribution=True) ,
        SubKey(value=reasonNew, doAggregate=True)
    ]
    logging.debug(LogMessage('subkeysWithAnswerNew=', subkeysWithAnswerNew))

    oldAnswerIsNull = multi.userAnswers.answerIsEmpty( itemOld, answerOld.reason )
    newAnswerIsNull = multi.userAnswers.answerIsEmpty( itemNew, reasonNew )
    aggregateRecordsNew, aggregateRecordsOld = incrementVoteAggregates( surveyId, subkeysWithAnswerOld, subkeysWithAnswerNew, oldAnswerIsNull, newAnswerIsNull )
    return userVoteRecord, aggregateRecordsNew, aggregateRecordsOld, None




def incrementVoteAggregates( surveyId, subkeysWithAnswerOld, subkeysWithAnswerNew, oldAnswerIsNull, newAnswerIsNull ):

    logging.debug(LogMessage('subkeysWithAnswerOld=', subkeysWithAnswerOld, 'subkeysWithAnswerNew=', subkeysWithAnswerNew, 'oldAnswerIsNull=', oldAnswerIsNull, 'newAnswerIsNull=', newAnswerIsNull))

    # Increment aggregates from least to most contended record, to minimize time that contended record is locked
    aggregateRecordsNew = []
    aggregateRecordsOld = []
    endSubkeyIndices = list(   reversed(  range( 1, len(subkeysWithAnswerNew)+1 )  )   )
    childVotesOld = 0
    childVotesNew = 0
    childOld = None
    childNew = None
    for endSubkeyIndex in endSubkeyIndices:
        subkeysForAggregateNew = subkeysWithAnswerNew[ 0 : endSubkeyIndex ]
        subkeysForAggregateOld = subkeysWithAnswerOld[ 0 : endSubkeyIndex ]
        logging.debug(LogMessage('endSubkeyIndex=', endSubkeyIndex, 'subkeysForAggregateNew=', subkeysForAggregateNew))
        if not subkeysForAggregateNew[ -1 ].doAggregate:  continue

        aggregateRecordNew, aggregateRecordOld = incrementVoteAggregate(
            surveyId, subkeysForAggregateOld, subkeysForAggregateNew, oldAnswerIsNull, newAnswerIsNull,
            childOld, childNew, childVotesOld, childVotesNew )

        aggregateRecordsNew.append( aggregateRecordNew )
        aggregateRecordsOld.append( aggregateRecordOld )

        childOld = aggregateRecordOld.lastSubkeyText  if aggregateRecordOld  else None
        childNew = aggregateRecordNew.lastSubkeyText  if aggregateRecordNew  else None
        childVotesOld = aggregateRecordOld.voteCount  if aggregateRecordOld  else 0
        childVotesNew = aggregateRecordNew.voteCount  if aggregateRecordNew  else 0
        logging.debug(LogMessage('childOld=', childOld, 'childVotesOld=', childVotesOld, 'childNew=', childNew, 'childVotesNew=', childVotesNew))

    return aggregateRecordsNew, aggregateRecordsOld

# Increment aggregate vote count, inside a transaction
# Returns updated aggregate-record, or throws transaction-conflict exception
def incrementVoteAggregate( surveyId, subkeysForAggregateOld, subkeysForAggregateNew, oldAnswerIsNull, newAnswerIsNull,
    childOld, childNew, childVotesOld, childVotesNew ):
    logging.debug(LogMessage('surveyId=', surveyId, 'subkeysForAggregateOld=', subkeysForAggregateOld,
        'subkeysForAggregateNew=', subkeysForAggregateNew, 'oldAnswerIsNull=', oldAnswerIsNull, 'newAnswerIsNull=', newAnswerIsNull,
        'childOld=', childOld, 'childNew=', childNew, 'childVotesOld=', childVotesOld, 'childVotesNew=', childVotesNew))

    # Only change aggregate-votes when answer moved outside that ancestor?
    #  + More efficient
    #  Yes, if answer already exists inside ancestor, no need to increment (or if new-answer is null, and answer does not exist)
    #  No, answer cannot move outside ancestor -- even for budget, moving share to another slice requires multiple steps
    #  No, this leaves child-distribution stale
    sameSubkeys = ( subkeysForAggregateOld == subkeysForAggregateNew )
    sameAnswer = sameSubkeys and ( oldAnswerIsNull == newAnswerIsNull )
    storeDistribution = subkeysForAggregateNew[-1].childDistribution
    collectDistribution = subkeysForAggregateNew[-2].childDistribution
    logging.debug(LogMessage('sameSubkeys=', sameSubkeys, 'sameAnswer=', sameAnswer, 'storeDistribution=', storeDistribution, 'collectDistribution=', collectDistribution))
    if sameAnswer and (not storeDistribution) and (not collectDistribution):  return None, None

    # Decrement old answer
    # Cannot skip retrieve aggregateRecord when answerIsNull
    #  Causes the old child-distribution to be overwritten entirely, not incrementally
    #  Causes an error in voteCount for any ancestor
    aggregateRecordOld = None
    aggregateRecordOld = VoteAggregate.retrieve( surveyId, subkeysForAggregateOld )
    if aggregateRecordOld:
        if not oldAnswerIsNull:  aggregateRecordOld.incrementVoteCount( -1 )
        # Store decremented count
        if not sameSubkeys:
            if ( aggregateRecordOld.voteCount <= 0 ):  aggregateRecordOld.key.delete()
            else:  aggregateRecordOld.put()
        logging.debug(LogMessage('aggregateRecordOld=', aggregateRecordOld))

    # Increment new answer
    aggregateRecordNew = None
    aggregateRecordNew = aggregateRecordOld  if sameSubkeys  else VoteAggregate.retrieve( surveyId, subkeysForAggregateNew )
    if not aggregateRecordNew:  aggregateRecordNew = VoteAggregate.create( surveyId, subkeysForAggregateNew )
    logging.debug(LogMessage('aggregateRecordNew=', aggregateRecordNew))

    if not newAnswerIsNull:  aggregateRecordNew.incrementVoteCount( 1 )
    # Store incremented count
    if ( aggregateRecordNew.voteCount <= 0 ):
        aggregateRecordNew.voteCount = 0
        aggregateRecordNew.key.delete()
    else:
        if storeDistribution:
            if childOld is not None:  aggregateRecordNew.setChildVotes( childOld, childVotesOld )
            if childNew is not None:  aggregateRecordNew.setChildVotes( childNew, childVotesNew )
        aggregateRecordNew.put()
    logging.debug(LogMessage('aggregateRecordNew=', aggregateRecordNew))

    return aggregateRecordNew, aggregateRecordOld




#####################################################################################################
# Methods for retrieving vote-aggregates

# For displaying results
# For question, return all option-rating counts, as map{ optionId -> QuestionOption }
def retrieveTopByVotes( surveyId, parentSubkeys, maxRecords=5, subkeyIsGrandparent=False, cursor=None ):
    parentKey = VoteAggregate.toKeyId( surveyId, parentSubkeys )
    aggRecords = None
    cursorNew = None
    hasMore = False
    if subkeyIsGrandparent:
        aggRecords, cursorNew, hasMore = VoteAggregate.query( VoteAggregate.surveyId==surveyId , VoteAggregate.grandparentKey==parentKey
            ).order( -VoteAggregate.voteCount ).fetch_page( maxRecords, start_cursor=cursor )
    else:
        aggRecords, cursorNew, hasMore = VoteAggregate.query( VoteAggregate.surveyId==surveyId , VoteAggregate.parentKey==parentKey
            ).order( -VoteAggregate.voteCount ).fetch_page( maxRecords, start_cursor=cursor )
    return aggRecords, cursorNew, hasMore


# For suggesting higher/lower numeric answers & reasons while user inputs answer
def retrieveTopNumericAnswersAndReasons( surveyId, grandparentSubkeys, answer=0, reasonStart=None, maxRecords=3 ):

    logging.debug(LogMessage('retrieveTopNumericAnswersAndReasons()', 'grandparentSubkeys=', grandparentSubkeys, 'answer=', answer, 'reasonStart=', reasonStart))

    grandparentKey = VoteAggregate.toKeyId( surveyId, grandparentSubkeys )
    logging.debug(LogMessage('retrieveTopNumericAnswersAndReasons()', 'grandparentKey=', grandparentKey))

    inputWords = multi.shared.tokenizeText( reasonStart )
    logging.debug(LogMessage('retrieveTopNumericAnswersAndReasons()', 'inputWords=', inputWords))

    records = []
    if inputWords and (0 < len(inputWords)):
        # Retrieve top-scored record matching last input-word
        #  "Sort property must be the same as the property to which the inequality filter is applied"
        #  So cannot sort by score and constrain above/below/not-equal current number-answer (rating / rank / slice-size),
        #  nor constrain to reason non-null
        #  Instead, just sample 3 top-scored answers, and keep at most 1 above & 1 below
        #  (Or query adjacent number values, one above and one below)
        # Results will be collected and match-scored in client
        records += VoteAggregate.query( 
            VoteAggregate.surveyId==surveyId, 
            VoteAggregate.grandparentKey==grandparentKey, 
            VoteAggregate.words==inputWords[-1],
            ).order( -VoteAggregate.score ).fetch( maxRecords )
    else:
        # Retrieve top-scored records
        records += VoteAggregate.query( 
            VoteAggregate.surveyId==surveyId, 
            VoteAggregate.grandparentKey==grandparentKey, 
            ).order( -VoteAggregate.score ).fetch( maxRecords )
    logging.debug(LogMessage('retrieveTopNumericAnswersAndReasons()', 'records=', records))

    # Filter out empty reasons
    records = [  r  for r in records  if r.lastSubkeyText and ( (r.parentSubkeyText != answer) or (r.lastSubkeyText != reasonStart) )  ]
    return records


# For suggesting text answers & reasons while user inputs answer
def retrieveTopAnswersAndReasons( surveyId, grandparentSubkeys, inputText=None, maxRecords=3 ):

    logging.debug(LogMessage('grandparentSubkeys=', grandparentSubkeys, 'inputText=', inputText))

    grandparentKey = VoteAggregate.toKeyId( surveyId, grandparentSubkeys )
    logging.debug(LogMessage('grandparentKey=', grandparentKey))

    inputWords = multi.shared.tokenizeText( inputText )
    logging.debug(LogMessage('inputWords=', inputWords))

    records = []
    if inputWords and (0 < len(inputWords)):
        # Retrieve top-voted record matching last input-word
        # Results will be collected and match-scored in client
        records += VoteAggregate.query(
            VoteAggregate.surveyId==surveyId,
            VoteAggregate.grandparentKey==grandparentKey,
            VoteAggregate.words==inputWords[-1],
            ).order( -VoteAggregate.score ).fetch( maxRecords )
    logging.debug(LogMessage('records=', records))

    # Filter out empty reasons
    records = [ r  for r in records  if r.lastSubkeyText ]
    return records



# For suggesting budget allocations while user inputs answer
def retrieveTopAllocationsAndReasons( surveyId, greatGrandparentSubkeys, inputText=None, maxRecords=3 ):
    greatgrandparentKey = VoteAggregate.toKeyId( surveyId, greatGrandparentSubkeys )
    logging.debug(LogMessage('greatgrandparentKey=', greatgrandparentKey))

    inputWords = multi.shared.tokenizeText( inputText )
    logging.debug(LogMessage('inputWords=', inputWords))

    records = []
    if inputWords and (0 < len(inputWords)):
        # Retrieve top-voted record matching last input-word
        # Results will be collected and match-scored in client
        records += VoteAggregate.query(
            VoteAggregate.surveyId==surveyId,
            VoteAggregate.greatgrandparentKey==greatgrandparentKey,
            VoteAggregate.words==inputWords[-1],
            ).order( -VoteAggregate.score ).fetch( maxRecords )
    logging.debug(LogMessage('records=', records))

    # Filter out empty reasons
    records = [ r  for r in records  if r.lastSubkeyText ]
    return records



def logAllVoteAggregates( surveyId, parentSubkeys=None, grandparentSubkeys=None, maxRecords=1 ):

    logging.debug(LogMessage('logAllVoteAggregates()', 'parentSubkeys=', parentSubkeys, 'grandparentSubkeys=', grandparentSubkeys))

    parentKey = VoteAggregate.toKeyId( surveyId, parentSubkeys )  if parentSubkeys  else None
    logging.debug(LogMessage('logAllVoteAggregates()', 'parentKey=', parentKey))

    grandparentKey = VoteAggregate.toKeyId( surveyId, grandparentSubkeys )  if grandparentSubkeys  else None
    logging.debug(LogMessage('logAllVoteAggregates()', 'grandparentKey=', grandparentKey))

    allRecords = []
    if parentKey:
        allRecords = VoteAggregate.query( VoteAggregate.parentKey==parentKey ).fetch()
    elif grandparentKey:
        allRecords = VoteAggregate.query( VoteAggregate.grandparentKey==grandparentKey ).fetch()
    else:
        allRecords = VoteAggregate.query().fetch()

    for r in allRecords:
        logging.debug(LogMessage( 'r=', r ))

