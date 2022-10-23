# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
# Import app modules
from autocomplete.configAutocomplete import const as conf
from autocomplete import answer
from autocomplete import answerVote
import httpServer
from httpServer import app
from autocomplete import httpServerAutocomplete
import linkKey
from autocomplete import question
from autocomplete import survey
from text import LogMessage
import user



# Use POST for privacy of user's answer-input
@app.post( r'/autocomplete/getQuestionAnswersForPrefix/<alphanumeric:linkKeyStr>/<int:questionId>' )
def questionAnswersForPrefix( linkKeyStr, questionId ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        inputData = httpRequest.postJsonData()
        logging.debug(LogMessage('QuestionAnswersForPrefix', 'inputData=', inputData))
        answerStart = answer.standardizeContent( inputData.get( 'answerStart', None ) )
        logging.debug(LogMessage('QuestionAnswersForPrefix', 'answerStart=', answerStart))

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive, and part of a write flow
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Check that question is part of survey, because the answer query may be too expensive to allow unnecessary calls.
        questionRecord = question.Question.get_by_id( int(questionId) )
        if questionRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionRecord is null' )
        if questionRecord.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionRecord.surveyId != surveyId' )

        # Retrieve survey record
        surveyRecord = survey.Survey.get_by_id( int(surveyId) )
        if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='survey record not found' )
        # Check that survey is not frozen, to reduce the cost of abuse via search queries
        if surveyRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

        # Retrieve best suggested answers for this question and creator.
        answersOrdered = answer.retrieveTopAnswers( surveyId, questionId, answerStart=answerStart, hideReasons=surveyRecord.hideReasons )
        logging.debug(LogMessage('QuestionAnswersForPrefix', 'answersOrdered=', answersOrdered))

        answerDisplays = [ httpServerAutocomplete.answerToDisplay(a, userId) for a in answersOrdered ]

        # Display answers data.
        responseData.update(  { 'success':True , 'answers':answerDisplays }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



# Retrieves answers currently voted by user, not necessarily created by user
@app.get( r'/autocomplete/getUserAnswers/<alphanumeric:linkKeyStr>' )
def userAnswers( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return httpResponse
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
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
        return httpServer.outputJson( cookieData, responseData, httpResponse )



# Retrieves answers created by user, maybe not currently voted by user
@app.get( r'/autocomplete/getQuestionAnswersFromCreator/<alphanumeric:linkKeyStr>/<int:questionId>' )
def questionAnswersCreatedByUser( linkKeyStr, questionId ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return httpResponse
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve all answers for this question and creator.
        answerRecords = answer.Answer.query( 
            answer.Answer.questionId==str(questionId), answer.Answer.creator==userId, answer.Answer.fromEditPage==True ).fetch()
        answersByContent = sorted( answerRecords, key=lambda a:a.content )
        answerDisplays = [ httpServerAutocomplete.answerToDisplay(a, userId) for a in answersByContent ]

        # Display answers data.
        responseData = { 'success':True , 'answers':answerDisplays }
        return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.get( r'/autocomplete/getQuestionFrequentAnswers/<alphanumeric:linkKeyStr>/<int:questionId>' )
def questionFrequentAnswers( linkKeyStr, questionId ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs.
        all = ( httpRequest.getUrlParam( 'all', None ) == 'true' )

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId
        
        # Check that question is part of survey, because the answer query may be too expensive to allow unnecessary calls.
        questionRecord = question.Question.get_by_id( int(questionId) )
        if questionRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionRecord is null' )
        if questionRecord.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionRecord.surveyId != surveyId' )

        # Retrieve most frequent answers for question
        if all:
            answerRecordsTrunc = answer.Answer.query( answer.Answer.surveyId==surveyId, answer.Answer.questionId==str(questionId), answer.Answer.voteCount > 0 
                ).order( -answer.Answer.voteCount ).fetch()
            hasMoreAnswers = False

        else:
            maxAnswersPerQuestion = 10
            answerRecords = answer.Answer.query(
                answer.Answer.surveyId==surveyId, answer.Answer.questionId==str(questionId), answer.Answer.voteCount > 0 
                ).order( -answer.Answer.voteCount ).fetch( maxAnswersPerQuestion + 1 )

            answerRecordsTrunc = answerRecords[ 0 : maxAnswersPerQuestion ]
            hasMoreAnswers = len(answerRecordsTrunc) < len(answerRecords)

        logging.debug(LogMessage('QuestionFrequentAnswers', 'answerRecordsTrunc=', answerRecordsTrunc))

        answerDisplays = [ httpServerAutocomplete.answerToDisplay(a, userId) for a in answerRecordsTrunc ]

        # Display answers data.
        responseData.update(  { 'success':True , 'answers':answerDisplays , 'hasMoreAnswers':hasMoreAnswers }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )


