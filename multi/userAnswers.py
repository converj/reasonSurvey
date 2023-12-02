# Data-record class for a single participant's answers to multi-question-survey

# External modules
from collections import Counter, namedtuple
from google.appengine.ext import ndb
import hashlib
import logging
import re
# Application modules
from multi.configMulti import conf
import multi.survey
import multi.voteAggregates
import text
from text import LogMessage


# Answer data-structure for easier reading by caller
KEY_CONTENT = 'content'
KEY_REASON = 'reason'
KEY_OPTION = 'option'
KEY_ID = 'id'
Answer = namedtuple( 'Answer', [KEY_CONTENT, KEY_REASON, KEY_ID] )


def answerIsEmpty( content, reason ):  return ( content in [None, ''] ) and ( reason in [None, ''] )  # Do not treat zero as empty


OptionAndReason = namedtuple( 'OptionAndReason', ['optionId', 'reason'] )



# Storage record user's answers to all questions in a survey -- supplemented by proposal-reason records
# map{  (survey x user)  ->  tree{ questionId/option... -> answer:(content, reason) }  }
class SurveyAnswers( ndb.Model ):

    # Key
    surveyId = ndb.StringProperty()
    userId = ndb.StringProperty()
    
    answers = ndb.JsonProperty( default={}, indexed=False )  # map{ questionId -> answer }

    ######################################################################################
    # Construction and retrieval methods

    @staticmethod
    def retrieveOrCreate( surveyId, userId ):  return SurveyAnswers.retrieve(surveyId, userId) or SurveyAnswers.create(surveyId, userId)

    @staticmethod
    def create( surveyId, userId ):  return SurveyAnswers( id=SurveyAnswers.toKeyId(surveyId, userId), surveyId=surveyId, userId=userId )

    @staticmethod
    def retrieve( surveyId, userId ):  return SurveyAnswers.get_by_id( SurveyAnswers.toKeyId(surveyId, userId) )

    @staticmethod
    def toKeyId( surveyId, userId ):  return '{}-{}'.format( surveyId, userId )


    ######################################################################################
    # Methods to edit answers

    # Assume rank and answer are 1-based, but ranking is zero-based
    def setRanking( self, questionId, optionsAllowed, ranking, optionId, rank, reason ):
        # Could store rank answers in an array to ensure ordering
        # But keeping the standard map{ option-ID -> answer, reason } may have benefits like storing a reason without a rank

        # Initially, every option has a default rank in display, no visible gaps
        # User probably wants to find options and move them up to the top ranks, pushing down collided options, leaving no gaps
        # So always move collided options in the direction of moved option

        # Do not have to condense rank, since user may have only ranked an option to a middle rank

        # Better for client to send all {rank, option}, since without reasons, user cannot distinguish un/ranked options?
        #  - Client has to do reordering logic
        #  + No gaps ever
        #  + Simpler server logic
        #  + Simpler client logic without merging answers and random order?  No, still needed for incomplete answers / stale options
        #  + No storing answers for stale options
        #  + Client data validity can still be checked by server
        #  + Option order is more stable for user, only randomized on first view

        # Ensure question-answers exist
        if not self.answers:  self.answers = { }
        if questionId not in self.answers:  self.answers[ questionId ] = { }
        optionToAnswer = self.answers[ questionId ]
        logging.debug(LogMessage( 'optionToAnswer=', optionToAnswer ))

        # Remove option from old rank
        ranking = [ o  for o in ranking  if (o != optionId) and (o in optionsAllowed) ]
        logging.debug( LogMessage('ranking=', ranking) )

        # Insert option to new rank
        ranking.insert( rank-1, optionId )
        logging.debug( LogMessage('ranking=', ranking) )

        # Null out old ranks, but keep old reasons
        for o,a in optionToAnswer.items():
            a[ KEY_CONTENT ] = None
        logging.debug( LogMessage('optionToAnswer=', optionToAnswer) )
        # Merge ranks back into map{ option-ID -> rank, reason }
        for r,o in enumerate( ranking ):
            if o in optionToAnswer:  optionToAnswer[ o ][ KEY_CONTENT ] = str( r + 1 )
            else:  optionToAnswer[ o ] = { KEY_CONTENT:str(r+1), KEY_REASON:None }
        logging.debug( LogMessage('optionToAnswer=', optionToAnswer) )

        optionToAnswer[ optionId ][ KEY_REASON ] = reason
        logging.debug( LogMessage('optionToAnswer=', optionToAnswer) )


    def questionHasAnswer( self, questionId ):
        optionToAnswer = self.getQuestionAnswers( questionId )
        if optionToAnswer:
            for o,a in optionToAnswer.items():
                if a  and  ( type(a) == dict )  and  not answerIsEmpty( a.get(KEY_CONTENT, None), a.get(KEY_REASON, None) ):
                    return True
        return False

    def getQuestionAnswers( self, questionId ):
        return self.answers.get( questionId, None )  if self.answers  else None

    # subkeys are strings
    def getAnswer( self, subkeys ):
        subkeyMap = self.getSubtree( subkeys )
        if subkeyMap:  return Answer( subkeyMap.get(KEY_CONTENT, None) , subkeyMap.get(KEY_REASON, None) , subkeyMap.get(KEY_ID, None) )
        return Answer( None, None, None )

    def getSubtree( self, subkeys ):
        if not self.answers:  return None

        subkeyMap = self.answers
        for subkey in subkeys:
            subkeyMap = subkeyMap.get( subkey, None )
            if subkeyMap is None:  return None

        return subkeyMap

    def setAnswer( self, subkeys, answerContent, reason, setId=False, id=None ):
        if not self.answers:  self.answers = { }

        subkeyMap = self.answers
        for subkey in subkeys:
            if not subkey in subkeyMap:
                subkeyMap[ subkey ] = { }
            subkeyMap = subkeyMap[ subkey ]

        subkeyMap[ KEY_CONTENT ] = answerContent
        subkeyMap[ KEY_REASON ] = reason

        if setId and not subkeyMap.get( KEY_ID, None ):
            newId = id
            if newId is None:
                parent = self.getSubtree( subkeys[0:-1] )
                existingIds = [ a.get(KEY_ID, -1)  for o,a in parent.items() ]
                newId = 1 + max( existingIds )  if existingIds  else 0
            subkeyMap[ KEY_ID ] = newId

        return subkeyMap

    def removeAnswer( self, subkeys ):
        oldAnswer = self.getAnswer( subkeys )
        parent = self.getSubtree( subkeys[0:-1] )
        if parent:  parent.pop( subkeys[-1], None )
        return oldAnswer

    def budgetSum( self, questionId ):
        if not self.answers:  return 0
        budgetItemToAnswer = self.answers.get( questionId, None )
        if not budgetItemToAnswer:  return 0
        return sum(  int( amountAndReason[KEY_CONTENT] )  for budgetItem, amountAndReason in budgetItemToAnswer.items()  )


    ######################################################################################
    # Methods for filtering data for display in client

    def toClient( self, userId ):
        return self.answers


# Returns null if answer & reason unchanged
def updateAnswer( userId, surveyId, subkeys, answerContent, reason ):
    logging.debug(LogMessage('userId=', userId, 'surveyId=', surveyId, 'subkeys=', subkeys))

    # Retrieve user-survey-answer 
    userVoteRecord = SurveyAnswers.retrieveOrCreate( surveyId, userId )
    logging.debug(LogMessage('userVoteRecord=', userVoteRecord))

    questionHadAnswer = userVoteRecord.questionHasAnswer( subkeys[0].value )
    logging.debug(LogMessage('questionHadAnswer=', questionHadAnswer))

    # Store answer in user-survey-answers, only if answer changed
    answerOld = userVoteRecord.getAnswer( multi.voteAggregates.VoteAggregate.subkeysToStrings(subkeys) )
    logging.debug(LogMessage('answerOld=', answerOld))

    if ( answerOld.content == answerContent ) and ( answerOld.reason == reason ):  return None, None, None
    userVoteRecord.setAnswer( multi.voteAggregates.VoteAggregate.subkeysToStrings(subkeys), answerContent, reason )
    userVoteRecord.put()
    logging.debug(LogMessage('userVoteRecord=', userVoteRecord))

    return userVoteRecord, answerOld, questionHadAnswer
