# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
from configAutocomplete import const as conf
import answer
import httpServer
import httpServerAutocomplete
import linkKey
import question
import survey
import user


class GetQuestion( webapp2.RequestHandler ):
    def get( self, linkKeyStr, questionId ):

        logging.debug( 'GetQuestion.get() linkKeyStr=' + str(linkKeyStr) + ' questionId=' + str(questionId) )

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve Question by id, filter/transform fields for display.
        questionRecord = question.Question.get_by_id( int(questionId) )
        logging.debug( 'GetQuestion.get() questionRecord=' + str(questionRecord) )
        if questionRecord.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='questionRecord.surveyId != surveyId' )

        questionDisp = httpServerAutocomplete.questionToDisplay( questionRecord, userId )
        logging.debug( 'GetQuestion.get() questionDisp=' + str(questionDisp) )
        
        # Store question to user's recent (cookie).
        user.storeRecentLinkKey( linkKeyStr, cookieData )

        # Display question data.
        responseData = { 'success':True , 'question':questionDisp }
        httpServer.outputJson( cookieData, responseData, self.response )


class GetSurveyQuestions( webapp2.RequestHandler ):
    def get( self, linkKeyStr ):

        logging.debug( 'GetSurveyQuestions.get() linkKeyStr=' + linkKeyStr )

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve survey
        surveyRecord = survey.Survey.get_by_id( int(surveyId) )
        if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )

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
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication( [
    ( r'/autocomplete/getQuestion/([0-9A-Za-z]+)/(\d+)' , GetQuestion ) ,
    ( r'/autocomplete/getSurveyQuestions/([0-9A-Za-z]+)' , GetSurveyQuestions )
] )


