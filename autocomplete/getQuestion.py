# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
# Import app modules
from autocomplete.configAutocomplete import const as conf
from autocomplete import answer
import httpServer
from httpServer import app
from autocomplete import httpServerAutocomplete
import linkKey
from autocomplete import question
from autocomplete import survey
import user



@app.get( r'/autocomplete/getQuestion/<alphanumeric:linkKeyStr>/<int:questionId>' )
def getQuestion( linkKeyStr, questionId ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve Question by id, filter/transform fields for display.
        questionRecord = question.Question.get_by_id( int(questionId) )
        logging.debug( 'GetQuestion.get() questionRecord=' + str(questionRecord) )
        if questionRecord.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionRecord.surveyId != surveyId' )

        questionDisp = httpServerAutocomplete.questionToDisplay( questionRecord, userId )
        logging.debug( 'GetQuestion.get() questionDisp=' + str(questionDisp) )
        
        # Store question to user's recent (cookie).
        user.storeRecentLinkKey( linkKeyStr, cookieData )

        # Display question data.
        responseData = { 'success':True , 'question':questionDisp }
        return httpServer.outputJson( cookieData, responseData, httpResponse )


@app.get( r'/autocomplete/getSurveyQuestions/<alphanumeric:linkKeyStr>' )
def getSurveyQuestions( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve survey
        surveyRecord = survey.Survey.get_by_id( int(surveyId) )
        if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )

        # Retrieve all questions for this survey.
        questionRecords = question.Question.query( question.Question.surveyId==surveyId ).fetch()

        # Order questions based on survey order
        questionIdToRec = { str(q.key.id()) : q  for q in questionRecords }
        questionsOrdered = [ questionIdToRec.get(q, None)  for q in surveyRecord.questionIds ]
        questionsOrdered = [ q  for q in questionsOrdered  if q is not None ]

        questionDisplays = [ httpServerAutocomplete.questionToDisplay(q, userId) for q in questionsOrdered ]
        for q in range(len(questionDisplays)):
            questionDisplays[q]['positionInSurvey'] = q

        # Display questions data.
        responseData = { 'success':True , 'questions':questionDisplays }
        return httpServer.outputJson( cookieData, responseData, httpResponse )



