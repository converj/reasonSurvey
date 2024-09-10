# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import time
# Import app modules
import common
from autocomplete.configAutocomplete import const as conf
import httpServer
from httpServer import app
from autocomplete import httpServerAutocomplete
import linkKey
import mail
from autocomplete import question
import secrets
from autocomplete import survey
import user
import text



@app.post('/autocomplete/newSurvey')
def newSurvey( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug( 'SubmitNewSurvey.post() inputData=' + str(inputData) )

        title = text.formTextToStored( inputData.get('title', '') )
        introduction = text.formTextToStored( inputData.get('introduction', '') )
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        loginRequired = bool( inputData.get('loginRequired', False) )
        experimentalPassword = inputData.get( 'experimentalPassword', None )
        hideReasons = bool( inputData.get('hideReasons', False) )
        logging.debug( 'SubmitNewSurvey.post() introduction=' + str(introduction) + ' browserCrumb=' + str(browserCrumb)
            + ' loginCrumb=' + str(loginCrumb) + ' loginRequired=' + str(loginRequired) + ' hideReasons=' + str(hideReasons) )

        responseData = { 'success':False, 'requestLogId':requestLogId }

        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, loginRequired=loginRequired )
        if not cookieData.valid():  return httpResponse
        userId = cookieData.id()

        # Check survey introduction length.
        if not httpServer.isLengthOk( title, introduction, conf.minLengthSurveyIntro ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )

        # Check experimental password (low-risk secret)
        if ( hideReasons or loginRequired or experimentalPassword )  and  ( experimentalPassword != secrets.experimentalPassword ):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.EXPERIMENT_NOT_AUTHORIZED )

        # Construct and store new survey record
        now = int( time.time() )
        surveyRecord = survey.Survey( creator=userId, title=title, introduction=introduction, allowEdit=True, hideReasons=hideReasons,
            adminHistory=common.initialChangeHistory() , timeCreated=now )
        surveyRecordKey = surveyRecord.put()
        logging.debug( 'surveyRecordKey.id={}'.format(surveyRecordKey.id()) )

        # Construct and store link key.
        surveyId = str( surveyRecordKey.id() )
        linkKeyRecord = httpServer.createAndStoreLinkKey( conf.SURVEY_CLASS_NAME, surveyId, loginRequired, cookieData )
        mail.sendEmailToAdminSafe( f'Created autocomplete survey. \n\n linkKeyRecord={linkKeyRecord}' , subject='New survey' )

        # Display survey.
        surveyDisplay = httpServerAutocomplete.surveyToDisplay( surveyRecord, userId )
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'survey':surveyDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )


@app.post('/autocomplete/editSurvey') 
def editSurvey( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug( 'SubmitEditSurvey.post() inputData=' + str(inputData) )

        title = text.formTextToStored( inputData['title'] )
        introduction = text.formTextToStored( inputData['introduction'] )
        linkKeyString = inputData['linkKey']
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug( 'SubmitEditSurvey.post() introduction=' + str(introduction) + ' browserCrumb=' + str(browserCrumb) 
            + ' loginCrumb=' + str(loginCrumb) 
            + ' linkKeyString=' + str(linkKeyString) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse )
        if not cookieData.valid():  return httpResponse
        userId = cookieData.id()

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'SubmitEditSurvey.post() linkKeyRecord=' + str(linkKeyRecord) )

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        surveyId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Check survey length
        if not httpServer.isLengthOk( title, introduction, conf.minLengthSurveyIntro ):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )

        # Retrieve survey record.
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        logging.debug( 'SubmitEditSurvey.post() surveyRec=' + str(surveyRec) )

        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='survey not found' )

        # Verify that survey is editable
        if userId != surveyRec.creator:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NOT_OWNER )
        if not surveyRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.HAS_RESPONSES )

        # Update survey record
        surveyRec.title = title
        surveyRec.introduction = introduction
        surveyRec.put()
        
        # Display updated survey.
        surveyDisplay = httpServerAutocomplete.surveyToDisplay( surveyRec, userId )
        responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/autocomplete/reorderSurveyQuestions')
def reorderSurveyQuestions( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug( 'ReorderSurveyQuestions.post() inputData=' + str(inputData) )

        questionIds = inputData['questionIds']
        linkKeyString = inputData['linkKey']
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug( 'ReorderSurveyQuestions.post() questionIds=' + str(questionIds) + ' browserCrumb=' + str(browserCrumb) 
            + ' loginCrumb=' + str(loginCrumb) 
            + ' linkKeyString=' + str(linkKeyString) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse )
        if not cookieData.valid():  return httpResponse
        userId = cookieData.id()

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'ReorderSurveyQuestions.post() linkKeyRecord=' + str(linkKeyRecord) )

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        surveyId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Retrieve survey record.
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        logging.debug( 'ReorderSurveyQuestions.post() surveyRec=' + str(surveyRec) )

        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='survey not found' )
        if surveyId != linkKeyRecord.destinationId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='surveyId != linkKeyRecord.destinationId' )

        # Verify that survey is editable
        if userId != surveyRec.creator:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NOT_OWNER )
        if not surveyRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.HAS_RESPONSES )

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
        return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/autocomplete/freezeSurvey')
def freezeSurvey( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug( 'FreezeSurvey.post() inputData=' + str(inputData) )

        linkKeyString = inputData['linkKey']
        freeze = bool( inputData['freeze'] )
        logging.debug( 'FreezeSurvey.post() freeze=' + str(freeze) + ' linkKeyString=' + str(linkKeyString) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse )
        if not cookieData.valid():  return httpResponse
        userId = cookieData.id()

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'FreezeSurvey.post() linkKeyRecord=' + str(linkKeyRecord) )

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        surveyId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Retrieve survey record
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        logging.debug( 'FreezeSurvey.post() surveyRec=' + str(surveyRec) )

        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='survey not found' )

        # Verify that survey is editable
        if userId != surveyRec.creator:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NOT_OWNER )
        if not surveyRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.HAS_RESPONSES )

        # Update survey record
        surveyRec.freezeUserInput = freeze
        common.appendFreezeInputToHistory( freeze, surveyRec.adminHistory )
        surveyRec.put()

        # Display updated survey
        surveyDisplay = httpServerAutocomplete.surveyToDisplay( surveyRec, userId )
        responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



