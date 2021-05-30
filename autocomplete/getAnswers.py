# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
from configAutocomplete import const as conf
import answer
import answerVote
import httpServer
import httpServerAutocomplete
import linkKey
import question
import survey
from text import LogMessage
import user


class QuestionAnswersForPrefix( webapp2.RequestHandler ):
    # Use POST for privacy of user's answer-input
    def post( self, linkKeyStr, questionId ):

        logging.debug(LogMessage('QuestionAnswersForPrefix', 'linkKeyStr=', linkKeyStr, 'questionId=', questionId))

        # Collect inputs
        inputData = json.loads( self.request.body )
        logging.debug(LogMessage('QuestionAnswersForPrefix', 'inputData=', inputData))
        answerStart = answer.standardizeContent( inputData.get( 'answerStart', None ) )
        logging.debug(LogMessage('QuestionAnswersForPrefix', 'answerStart=', answerStart))

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive, and part of a write flow
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check that question is part of survey, because the answer query may be too expensive to allow unnecessary calls.
        questionRecord = question.Question.get_by_id( int(questionId) )
        if questionRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='questionRecord is null' )
        if questionRecord.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='questionRecord.surveyId != surveyId' )

        # Retrieve survey record
        surveyRecord = survey.Survey.get_by_id( int(surveyId) )
        if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='survey record not found' )
        # Check that survey is not frozen, to reduce the cost of abuse via search queries
        if surveyRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        # Retrieve best suggested answers for this question and creator.
        answersOrdered = answer.retrieveTopAnswers( surveyId, questionId, answerStart=answerStart, hideReasons=surveyRecord.hideReasons )
        logging.debug(LogMessage('QuestionAnswersForPrefix', 'answersOrdered=', answersOrdered))

        answerDisplays = [ httpServerAutocomplete.answerToDisplay(a, userId) for a in answersOrdered ]

        # Display answers data.
        responseData.update(  { 'success':True , 'answers':answerDisplays }  )
        httpServer.outputJson( cookieData, responseData, self.response )


class UserAnswer( webapp2.RequestHandler ):
    def get( self, linkKeyStr, questionId ):

        logging.debug(LogMessage('UserAnswer', 'linkKeyStr=', linkKeyStr))

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve all answers for this question and voter
        answerVoteRec = answerVote.get( questionId, userId )
        logging.debug(LogMessage('UserAnswer', 'answerVoteRec=', answerVoteRec))
        
        answerRecord = answer.Answer.get_by_id( answerVoteRec.answerId )
        logging.debug(LogMessage('UserAnswer', 'answerRecord=', answerRecord))

        if answerRecord.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='answerRecord.surveyId != surveyId' )

        answerDisplay = httpServerAutocomplete.answerToDisplay( answerRecord, userId ) if answerRecord  else None

        # Display answers data.
        responseData.update(  { 'success':True , 'answer':answerDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )


# Retrieves answers currently voted by user, not necessarily created by user
class UserAnswers( webapp2.RequestHandler ):
    def get( self, linkKeyStr ):

        logging.debug(LogMessage('UserAnswers', 'linkKeyStr=', linkKeyStr))

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve all answers for this survey and voter
        answerVoteRecs = answerVote.AnswerVote.query( answerVote.AnswerVote.surveyId==surveyId, answerVote.AnswerVote.userId==userId ).fetch()
        logging.debug(LogMessage('UserAnswers', 'answerVoteRecs=', answerVoteRecs))
        
        answerRecordKeys = [ ndb.Key( answer.Answer, a.answerId )  for a in answerVoteRecs  if (a is not None) and (a.answerId is not None) ]
        answerRecords = ndb.get_multi( answerRecordKeys )
        logging.debug(LogMessage('UserAnswers', 'answerRecords=', answerRecords))
        
        answerIdToContent = { a.key.id() : a.content  for a in answerRecords  if a }
        questionIdToAnswerContent = { v.questionId : answerIdToContent.get( v.answerId, None )  for v in answerVoteRecs }

        # Display answers data.
        responseData.update(  { 'success':True , 'questionIdToAnswerContent':questionIdToAnswerContent }  )
        httpServer.outputJson( cookieData, responseData, self.response )


# Retrieves answers created by user, maybe not currently voted by user
class QuestionAnswersFromCreator( webapp2.RequestHandler ):
    def get( self, linkKeyStr, questionId ):

        logging.debug(LogMessage('QuestionAnswersFromCreator', 'linkKeyStr=', linkKeyStr, 'questionId=', questionId))

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve all answers for this question and creator.
        answerRecords = answer.Answer.query( 
            answer.Answer.questionId==questionId, answer.Answer.creator==userId, answer.Answer.fromEditPage==True ).fetch()
        answersByContent = sorted( answerRecords, key=lambda a:a.content )
        answerDisplays = [ httpServerAutocomplete.answerToDisplay(a, userId) for a in answersByContent ]

        # Display answers data.
        responseData = { 'success':True , 'answers':answerDisplays }
        httpServer.outputJson( cookieData, responseData, self.response )


class QuestionFrequentAnswers( webapp2.RequestHandler ):
    def get( self, linkKeyStr, questionId ):

        logging.debug(LogMessage('QuestionFrequentAnswers', 'linkKeyStr=', linkKeyStr, 'questionId=', questionId))

        # Collect inputs.
        answerStart = self.request.get( 'answerStart', None )
        logging.debug(LogMessage('QuestionFrequentAnswers', 'answerStart=', answerStart))
        all = ( self.request.get( 'all', None ) == 'true' )

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId
        
        # Check that question is part of survey, because the answer query may be too expensive to allow unnecessary calls.
        questionRecord = question.Question.get_by_id( int(questionId) )
        if questionRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='questionRecord is null' )
        if questionRecord.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='questionRecord.surveyId != surveyId' )

        # Retrieve most frequent answers for question
        if all:
            answerRecordsTrunc = answer.Answer.query( answer.Answer.surveyId==surveyId, answer.Answer.questionId==questionId, answer.Answer.voteCount > 0 
                ).order( -answer.Answer.voteCount ).fetch()
            hasMoreAnswers = False

        else:
            maxAnswersPerQuestion = 10
            answerRecords = answer.Answer.query( answer.Answer.surveyId==surveyId, answer.Answer.questionId==questionId, answer.Answer.voteCount > 0 
                ).order( -answer.Answer.voteCount ).fetch( maxAnswersPerQuestion + 1 )

            answerRecordsTrunc = answerRecords[ 0 : maxAnswersPerQuestion ]
            hasMoreAnswers = len(answerRecordsTrunc) < len(answerRecords)

        logging.debug(LogMessage('QuestionFrequentAnswers', 'answerRecordsTrunc=', answerRecordsTrunc))

        answerDisplays = [ httpServerAutocomplete.answerToDisplay(a, userId) for a in answerRecordsTrunc ]

        # Display answers data.
        responseData.update(  { 'success':True , 'answers':answerDisplays , 'hasMoreAnswers':hasMoreAnswers }  )
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication( [
    ( r'/autocomplete/getQuestionAnswersForPrefix/([0-9A-Za-z]+)/(\d+)' , QuestionAnswersForPrefix ) ,
    ( r'/autocomplete/getUserAnswer/([0-9A-Za-z]+)' , UserAnswer ) ,
    ( r'/autocomplete/getUserAnswers/([0-9A-Za-z]+)' , UserAnswers ) ,
    ( r'/autocomplete/getQuestionAnswersFromCreator/([0-9A-Za-z]+)/(\d+)' , QuestionAnswersFromCreator ) ,
    ( r'/autocomplete/getQuestionFrequentAnswers/([0-9A-Za-z]+)/(\d+)' , QuestionFrequentAnswers )
] )


