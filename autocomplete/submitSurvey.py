# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
from configAutocomplete import const as conf
import httpServer
import httpServerAutocomplete
import linkKey
import question
import survey
import user
import text



class SubmitNewSurvey( webapp2.RequestHandler ):

    def post(self):
        logging.debug( 'SubmitNewSurvey.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SubmitNewSurvey.post() inputData=' + str(inputData) )

        introduction = text.formTextToStored( inputData.get('introduction', '') )
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        loginRequired = inputData.get( 'loginRequired', False )
        logging.debug( 'SubmitNewSurvey.post() introduction=' + str(introduction) + ' browserCrumb=' + str(browserCrumb)
            + ' loginCrumb=' + str(loginCrumb) + ' loginRequired=' + str(loginRequired) )

        responseData = { 'success':False, 'requestLogId':requestLogId }

        cookieData = httpServer.validate( self.request, inputData, responseData, self.response, loginRequired=loginRequired )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Check survey introduction length.
        if not httpServer.isLengthOk( introduction, '', conf.minLengthSurveyIntro ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )
        
        # Construct and store new survey record.
        surveyRecord = survey.Survey( creator=userId, introduction=introduction, allowEdit=True )
        surveyRecordKey = surveyRecord.put()
        logging.debug( 'surveyRecordKey.id={}'.format(surveyRecordKey.id()) )

        # Construct and store link key.
        surveyId = str( surveyRecordKey.id() )
        linkKeyRecord = httpServer.createAndStoreLinkKey( conf.SURVEY_CLASS_NAME, surveyId, loginRequired, cookieData )

        # Display survey.
        surveyDisplay = httpServerAutocomplete.surveyToDisplay( surveyRecord, userId )
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'survey':surveyDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )


class SubmitEditSurvey( webapp2.RequestHandler ):

    def post(self):
        logging.debug( 'SubmitEditSurvey.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SubmitEditSurvey.post() inputData=' + str(inputData) )

        introduction = text.formTextToStored( inputData['introduction'] )
        linkKeyString = inputData['linkKey']
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug( 'SubmitEditSurvey.post() introduction=' + str(introduction) + ' browserCrumb=' + str(browserCrumb) 
            + ' loginCrumb=' + str(loginCrumb) 
            + ' linkKeyString=' + str(linkKeyString) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'SubmitEditSurvey.post() linkKeyRecord=' + str(linkKeyRecord) )

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        surveyId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check survey length
        if not httpServer.isLengthOk( introduction, '', conf.minLengthSurveyIntro ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )

        # Retrieve survey record.
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        logging.debug( 'SubmitEditSurvey.post() surveyRec=' + str(surveyRec) )

        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='survey not found' )

        # Verify that survey is editable
        if userId != surveyRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )
        if not surveyRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.HAS_RESPONSES )

        # Update survey record.
        surveyRec.introduction = introduction
        surveyRec.put()
        
        # Display updated survey.
        surveyDisplay = httpServerAutocomplete.surveyToDisplay( surveyRec, userId )
        responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )


class ReorderSurveyQuestions( webapp2.RequestHandler ):

    def post(self):
        logging.debug( 'ReorderSurveyQuestions.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'ReorderSurveyQuestions.post() inputData=' + str(inputData) )

        questionIds = inputData['questionIds']
        linkKeyString = inputData['linkKey']
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug( 'ReorderSurveyQuestions.post() questionIds=' + str(questionIds) + ' browserCrumb=' + str(browserCrumb) 
            + ' loginCrumb=' + str(loginCrumb) 
            + ' linkKeyString=' + str(linkKeyString) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'ReorderSurveyQuestions.post() linkKeyRecord=' + str(linkKeyRecord) )

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        surveyId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Retrieve survey record.
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        logging.debug( 'ReorderSurveyQuestions.post() surveyRec=' + str(surveyRec) )

        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='survey not found' )
        if surveyId != linkKeyRecord.destinationId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='surveyId != linkKeyRecord.destinationId' )

        # Verify that survey is editable
        if userId != surveyRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )
        if not surveyRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.HAS_RESPONSES )

        # If questionId is missing from survey record... disallow/remove it.
        questionIdsFromSurveySet = set( surveyRec.questionIds )
        logging.debug( 'ReorderSurveyQuestions.post() questionIdsFromSurveySet=' + str(questionIdsFromSurveySet) )

        questionIdsFromInputFiltered = [ q for q in questionIds  if q in questionIdsFromSurveySet ]
        logging.debug( 'ReorderSurveyQuestions.post() questionIdsFromInputFiltered=' + str(questionIdsFromInputFiltered) )

        # If questionId is missing from input questionIds order... move it to end.
        questionIdSetFromInputSet = set( questionIdsFromInputFiltered )
        logging.debug( 'ReorderSurveyQuestions.post() questionIdSetFromInputSet=' + str(questionIdSetFromInputSet) )

        questionIdsFromSurveyReordered = questionIdsFromInputFiltered + [q for q in surveyRec.questionIds  if q not in questionIdSetFromInputSet]
        logging.debug( 'ReorderSurveyQuestions.post() questionIdsFromSurveyReordered=' + str(questionIdsFromSurveyReordered) )

        # Update survey record.
        surveyRec.questionIds = questionIdsFromSurveyReordered
        surveyRec.put()
        
        # Display updated survey.
        surveyDisplay = httpServerAutocomplete.surveyToDisplay( surveyRec, userId )
        surveyDisplay['questionIds'] = surveyRec.questionIds
        responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )


class FreezeSurvey( webapp2.RequestHandler ):

    def post(self):
        logging.debug( 'FreezeSurvey.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'FreezeSurvey.post() inputData=' + str(inputData) )

        linkKeyString = inputData['linkKey']
        freeze = bool( inputData['freeze'] )
        logging.debug( 'FreezeSurvey.post() freeze=' + str(freeze) + ' linkKeyString=' + str(linkKeyString) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'FreezeSurvey.post() linkKeyRecord=' + str(linkKeyRecord) )

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        surveyId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Retrieve survey record
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        logging.debug( 'FreezeSurvey.post() surveyRec=' + str(surveyRec) )

        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='survey not found' )

        # Verify that survey is editable
        if userId != surveyRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )
        if not surveyRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.HAS_RESPONSES )

        # Update survey record
        surveyRec.freezeUserInput = freeze
        surveyRec.put()

        # Display updated survey
        surveyDisplay = httpServerAutocomplete.surveyToDisplay( surveyRec, userId )
        responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication([
    ('/autocomplete/newSurvey', SubmitNewSurvey) ,
    ('/autocomplete/editSurvey', SubmitEditSurvey) ,
    ('/autocomplete/reorderSurveyQuestions', ReorderSurveyQuestions) ,
    ('/autocomplete/freezeSurvey', FreezeSurvey)
])


