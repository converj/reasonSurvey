# HTTP service endpoints

# External modules
from google.appengine.ext import ndb
import json
import logging
import os
import time
# Application modules
import common
from multi.configMulti import conf
import httpServer
from httpServer import app
import linkKey
import secrets
from multi import survey
import user
import text
from text import LogMessage


################################################################################################
# Methods: shared

def parseInputs( httpRequest, httpResponse ):
    httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
    responseData = { 'success':False, 'httpRequestId':httpRequestId }
    errorMessage = None

    inputData = httpRequest.postJsonData()
    logging.debug(LogMessage('parseInputs', 'inputData=', inputData))
    cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, outputError=False )
    if not cookieData.valid():  errorMessage = conf.NO_COOKIE
    userId = cookieData.id()
    linkKeyString = inputData.get( 'linkKey', None )
    return responseData, cookieData, userId, inputData, linkKeyString, errorMessage


def retrieveLink( linkKeyString ):
    # Retrieve and check linkKey
    logging.debug(LogMessage('retrieveLink', 'linkKeyString=', linkKeyString))
    if linkKeyString is None:  return None, None, conf.BAD_LINK
    linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
    logging.debug(LogMessage('retrieveLink', 'linkKeyRecord=', linkKeyRecord))
    if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.MULTI_SURVEY_CLASS_NAME):  return linkKeyRecord, None, conf.BAD_LINK

    surveyId = linkKeyRecord.destinationId
    if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return linkKeyRecord, surveyId, conf.NO_LOGIN
    return linkKeyRecord, surveyId, None


def retrieveSurvey( surveyId, userId, errorMessage=None, isEdit=True ):
    if errorMessage is not None:  return None, errorMessage  # Pass error through

    surveyRec = survey.MultipleQuestionSurvey.retrieve( surveyId )
    logging.debug(LogMessage('userId=', userId, 'surveyRec=', surveyRec))

    if surveyRec is None:  return surveyRec, conf.BAD_LINK
    if ( userId != surveyRec.creator ):  return surveyRec, conf.NOT_OWNER
    if isEdit and ( not surveyRec.allowEdit() ):  return surveyRec, conf.HAS_RESPONSES

    return surveyRec, None



################################################################################################
# Methods: HTTP endpoints: modify survey

@app.post('/multi/editSurvey') 
def setMultiQuestionSurvey( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    title = text.formTextToStored( inputData['title'] )
    detail = text.formTextToStored( inputData['detail'] )
    if httpServer.isLengthTooShort( title, detail, minLength=conf.minLengthSurveyIntro ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )
    if httpServer.isLengthTooLong( title, detail, maxLength=conf.MAX_LENGTH_SURVEY_INTRO ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_LONG )

    # Retrieve link-key record
    if linkKeyString:
        linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
        if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )
        # Retrieve survey record
        surveyRecord, errorMessage = retrieveSurvey( surveyId, userId )
        if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )
    else:
        # Store new survey record
        now = int( time.time() )
        surveyRecord = survey.MultipleQuestionSurvey( creator=userId, title=title, detail=detail, adminHistory=common.initialChangeHistory(), timeCreated=now )
        surveyRecordKey = surveyRecord.put()
        logging.debug(LogMessage('surveyRecordKey.id=', surveyRecordKey.id() ))
        # Store new link key record
        surveyId = str( surveyRecordKey.id() )
        loginRequired = False
        linkKeyRecord = httpServer.createAndStoreLinkKey( conf.MULTI_SURVEY_CLASS_NAME, surveyId, loginRequired, cookieData )

    # Update survey record
    surveyRecord.title = title
    surveyRecord.detail = detail
    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
    responseData.update(  { 'success':True, 'survey':surveyDisplay, 'link':linkKeyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/multi/freezeSurvey')
def freezeMultiQuestionSurvey( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )
    freeze = bool( inputData['freeze'] )
    logging.debug(LogMessage('freezeMultiQuestionSurvey()', 'freeze=', freeze, 'linkKeyString=', linkKeyString ))

    # Retrieve link-key record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId, isEdit=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    surveyRecord.freezeUserInput = freeze
    common.appendFreezeInputToHistory( freeze, surveyRecord.adminHistory )
    surveyRecord.put()

    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



################################################################################################
# Methods: HTTP endpoints: modify question

@app.post('/multi/addQuestion') 
def addQuestionToMultiQuestionSurvey( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    title = text.formTextToStored( inputData['title'] )
    detail = text.formTextToStored( inputData['detail'] )
    if httpServer.isLengthTooShort( title, detail, minLength=1 ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )
    if httpServer.isLengthTooLong( title, detail, maxLength=conf.MAX_LENGTH_SURVEY_INTRO ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_LONG )

    newType = inputData['type']
    if newType not in survey.QUESTION_TYPES:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Unhandled type' )

    # Retrieve link-key record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    if conf.MAX_QUESTIONS <= len( surveyRecord.questions ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_MANY_QUESTIONS )
    newQuestion = surveyRecord.addQuestion( title=title, detail=detail, type=newType )
    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    newQuestionDisplay = surveyRecord.questionToClient( newQuestion, userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay, 'newQuestion':newQuestionDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )


@app.post('/multi/editQuestion') 
def editQuestionInMultiQuestionSurvey( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']

    title = text.formTextToStored( inputData['title'] )
    detail = text.formTextToStored( inputData['detail'] )
    if httpServer.isLengthTooShort( title, detail, minLength=conf.minLengthSurveyIntro ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )
    if httpServer.isLengthTooLong( title, detail, maxLength=conf.MAX_LENGTH_SURVEY_INTRO ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_LONG )

    # Retrieve link-key record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    surveyRecord.setQuestionContent( questionId, title, detail )
    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/multi/changeQuestionType') 
def changeQuestionType( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    newType = inputData['type']
    if newType not in survey.QUESTION_TYPES:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Unhandled type' )

    # Retrieve link-key record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    surveyRecord.setQuestionType( questionId, newType )
    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/multi/setBudgetMaxTotal') 
def setBudgetMaxTotal( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    newTotal = float( inputData['total'] )

    # Retrieve link-key record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    surveyRecord.getQuestion( questionId )[ survey.KEY_BUDGET_TOTAL ] = newTotal
    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/multi/reorderSurveyQuestions')
def reorderMultiQuestionSurveyQuestions( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    newIndex = int( inputData['newIndex'] )
    if ( newIndex < 0 ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid newIndex' )
    logging.debug(LogMessage('reorderMultiQuestionSurveyQuestions()', 'questionId=', questionId, 'linkKeyString=', linkKeyString ))

    # Retrieve link-key record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Keep only question-IDs also found in the survey-record
    questionIdsFromSurvey = surveyRecord.getQuestionIds()
    if ( len(questionIdsFromSurvey) <= newIndex ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid newIndex' )

    # Remove questionId, reinsert at new position
    oldIndex = questionIdsFromSurvey.index( questionId )
    if ( oldIndex == newIndex ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='newIndex unchanged' )
    questionIdsFromSurvey.insert( newIndex, questionIdsFromSurvey.pop(oldIndex) )

    # Update survey record
    idToQuestion = surveyRecord.getIdToQuestion()
    surveyRecord.questions = [ idToQuestion[q]  for q in questionIdsFromSurvey ]
    surveyRecord.put()
    
    # Send updated survey-questions to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/multi/deleteQuestion') 
def deleteQuestionInMultiQuestionSurvey( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    # Retrieve link-key record, survey record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    surveyRecord.deleteQuestion( questionId )
    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



################################################################################################
# Methods: HTTP endpoints: modify question-option

@app.post('/multi/setRatingQuestionLimits') 
def setRatingQuestionLimits( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    minRating = int( inputData['min'] )
    maxRating = int( inputData['max'] )
    if ( minRating < conf.MIN_RATING ) or ( conf.MAX_RATING <= minRating ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.OUT_OF_RANGE )
    if ( maxRating <= conf.MIN_RATING ) or ( conf.MAX_RATING < maxRating ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.OUT_OF_RANGE )
    if ( maxRating <= minRating ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.OUT_OF_RANGE )

    minRatingLabel = inputData.get( 'minLabel', None )
    maxRatingLabel = inputData.get( 'maxLabel', None )

    # Retrieve link-key record, survey record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId, errorMessage=errorMessage )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    question = surveyRecord.getQuestion( questionId )
    if question.get( survey.KEY_TYPE, None ) != survey.TYPE_RATE:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Cannot set range in question type={}'.format(question.type) )
    question[ survey.KEY_RATING_MIN ] = minRating
    question[ survey.KEY_RATING_MAX ] = maxRating

    if minRatingLabel:  question[ survey.KEY_RATING_MIN_LABEL ] = minRatingLabel
    else:  question.pop( survey.KEY_RATING_MIN_LABEL, None )

    if maxRatingLabel:  question[ survey.KEY_RATING_MAX_LABEL ] = maxRatingLabel
    else:  question.pop( survey.KEY_RATING_MAX_LABEL, None )

    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/multi/setQuestionRequireReason') 
def setQuestionRequireReason( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    require = bool( inputData['require'] )

    # Retrieve link-key record, survey record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId, errorMessage=errorMessage )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    question = surveyRecord.getQuestion( questionId )
    if question.get( survey.KEY_TYPE, None ) not in [ survey.TYPE_RATE, survey.TYPE_RANK, survey.TYPE_CHECKLIST, survey.TYPE_TEXT, survey.TYPE_BUDGET ]:
        return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.WRONG_TYPE )
    question[ survey.KEY_REQUIRE_REASON ] = require
    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/multi/addQuestionOption') 
def addQuestionOption( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    optionContent = text.formTextToStored( inputData['option'] )
    if (optionContent is None) or ( len(optionContent) < 1 ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )
    if ( conf.MAX_OPTION_LENGTH < len(optionContent) ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_LONG )

    # Retrieve link-key record, survey record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId, errorMessage=errorMessage )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    option = surveyRecord.addOption( questionId, optionContent )
    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    optionDisplay = surveyRecord.optionToClient( option, userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay, 'option':optionDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )


@app.post('/multi/setQuestionOption') 
def setQuestionOption( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    optionId = inputData['optionId']
    if not survey.MultipleQuestionSurvey.isValidOptionId( optionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid optionId' )

    optionContent = text.formTextToStored( inputData['content'] )
    if (optionContent is None) or ( len(optionContent) < conf.MIN_OPTION_LENGTH ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )
    if ( conf.MAX_OPTION_LENGTH < len(optionContent) ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_LONG )

    # Retrieve link-key record, survey record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId, errorMessage=errorMessage )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    surveyRecord.setOptionContent( questionId, optionId, optionContent )
    surveyRecord.put()
    
    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )


@app.post('/multi/reorderQuestionOptions')
def reorderQuestionOptions( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    optionId = inputData['optionId']
    if not survey.MultipleQuestionSurvey.isValidOptionId( optionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid optionId' )

    newIndex = int( inputData['newIndex'] )
    if ( newIndex < 0 ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid newIndex' )
    logging.debug(LogMessage('reorderQuestionOptions()', 'questionId=', questionId, 'optionId=', optionId, 'newIndex=', newIndex, 'linkKeyString=', linkKeyString ))

    # Retrieve link-key record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Keep only option-IDs that exist in the survey-record
    optionIds = surveyRecord.getQuestionOptionIds( questionId )
    if ( len(optionIds) <= newIndex ):  newIndex = len(optionIds) - 1


    # Remove optionId, reinsert at new position
    oldIndex = optionIds.index( optionId )
    if ( oldIndex == newIndex ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='newIndex unchanged' )
    optionIds.insert( newIndex, optionIds.pop(oldIndex) )
    surveyRecord.reorderQuestionOptions( questionId, optionIds )
    surveyRecord.put()
    
    # Send updated survey-options to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/multi/deleteQuestionOption') 
def deleteQuestionOption( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()

    # Collect inputs
    responseData, cookieData, userId, inputData, linkKeyString, errorMessage = parseInputs( httpRequest, httpResponse )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    questionId = inputData['questionId']
    if not survey.MultipleQuestionSurvey.isValidQuestionId( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid questionId' )

    optionId = inputData['optionId']
    if not survey.MultipleQuestionSurvey.isValidOptionId( optionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid optionId' )

    # Retrieve link-key record, survey record
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyString )
    surveyRecord, errorMessage = retrieveSurvey( surveyId, userId, errorMessage=errorMessage )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Update survey record
    surveyRecord.deleteQuestionOption( questionId, optionId )
    surveyRecord.put()

    # Send updated survey to client
    surveyDisplay = surveyRecord.toClient( userId )
    responseData.update(  { 'success':True, 'survey':surveyDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )


