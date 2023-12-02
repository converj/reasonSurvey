# HTTP service endpoints

# Import external modules
from google.appengine.datastore.datastore_query import Cursor
from google.appengine.ext import ndb
import json
import logging
import os
# Import app modules
from autocomplete.answer import standardizeContent
from multi.configMulti import conf
import httpServer
from httpServer import app
import linkKey
import proposal
import reason
import multi.content
from multi.shared import toProposalId
from multi.shared import reasonForClient, proposalForClient
from multi import survey
import text
from text import LogMessage
import user
import multi.userAnswers
from multi import voteAggregates
from multi.voteAggregates import SubKey


################################################################################################
# Methods: shared

def parseInputs( httpRequest, httpResponse, inputData=None, idRequired=False ):
    httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
    responseData = { 'success':False, 'httpRequestId':httpRequestId }
    errorMessage = None
    if inputData is None:  inputData = httpRequest.getUrlParams()

    cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=idRequired, outputError=False )
    if idRequired and not cookieData.valid():  errorMessage = conf.NO_COOKIE
    userId = cookieData.id()
    return responseData, cookieData, userId, errorMessage


def retrieveLink( linkKeyStr, enforceLogin=False, errorMessage=None ):
    # Pass-through error message
    if errorMessage:  return None, None, errorMessage

    # Retrieve and check linkKey
    linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
    if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.MULTI_SURVEY_CLASS_NAME):  return linkKeyRecord, None, conf.BAD_LINK
    surveyId = linkKeyRecord.destinationId

    # Enforcing login requirement because the search is expensive and part of a write interaction
    if enforceLogin  and  linkKeyRecord.loginRequired  and  not cookieData.loginId:  return linkKeyRecord, surveyId, conf.NO_LOGIN

    return linkKeyRecord, surveyId, None



################################################################################################
# Methods to serve current user's answers

# For showing rating-question result ratings
@app.get( r'/multi/userAnswers/<alphanumeric:linkKeyStr>' )
def userAnswersToMultiQuestionSurvey( linkKeyStr ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )
    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve user answers to survey
    answersRecord = multi.userAnswers.SurveyAnswers.retrieveOrCreate( surveyId, userId )
    logging.debug(LogMessage('userAnswersToMultiQuestionSurvey', 'answersRecord=', answersRecord))

    # Send answers to client
    answersForDisplay = answersRecord.toClient( userId )
    responseData.update(  { 'success':True , 'answers':answersForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )


################################################################################################
# Methods to serve question answer suggestions

# Use POST for privacy of user's answer-input
@app.post( r'/multi/getRatingReasonsForPrefix' )
def ratingReasonsForPrefix( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    inputData = httpRequest.postJsonData()
    logging.debug(LogMessage('ratingReasonsForPrefix', 'inputData=', inputData))

    linkKeyStr = inputData['linkKey']
    questionId = str( inputData['questionId'] )
    optionId = str( inputData['optionId'] )
    logging.debug(LogMessage('ratingReasonsForPrefix', 'linkKeyStr=', linkKeyStr, 'questionId=', questionId, 'optionId=', optionId))

    reasonStart = standardizeContent( inputData.get( 'reasonStart', None ) )
    logging.debug(LogMessage('ratingReasonsForPrefix', 'reasonStart=', reasonStart))

    currentRating = inputData.get( 'rating', None )
    currentRating =  None  if currentRating in ['', None]  else int( currentRating )
    logging.debug(LogMessage('ratingReasonsForPrefix', 'currentRating=', currentRating))

    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, inputData=inputData, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    # Enforcing login requirement on this read-only GET call, because the search is expensive, and is part of a write interaction
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord = survey.MultipleQuestionSurvey.retrieve( surveyId )
    if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
    # Check that survey is active and question is part of survey, to reduce unnecessary expensive queries
    if not surveyRecord.questionIdExists( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionId invalid' )
    if surveyRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )
    if ( currentRating is not None ) and ( not surveyRecord.isAnswerInBounds(questionId, currentRating) ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.OUT_OF_RANGE )

    # Retrieve best suggested ratings & reasons for this question option
    optionIsId = ( surveyRecord.getQuestionType(questionId) != multi.survey.TYPE_BUDGET )  # Budget option-id is hash of content
    subkeys = [ voteAggregates.SubKey(questionId, isId=True) , voteAggregates.SubKey(optionId, isId=optionIsId, doAggregate=True) ]
    ratingsAndReasons = voteAggregates.retrieveTopNumericAnswersAndReasons( surveyId, subkeys, answer=currentRating, reasonStart=reasonStart )
    logging.debug(LogMessage('ratingReasonsForPrefix', 'ratingsAndReasons=', ratingsAndReasons))

    # Send reasons to client
    reasonsForDisplay = [ r.toClient(userId) for r in ratingsAndReasons ]
    responseData.update(  { 'success':True , 'suggestions':reasonsForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )


# Use POST for privacy of user's answer-input
@app.post( r'/multi/answersAndReasonsForPrefix' )
def answersAndReasonsForPrefix( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    inputData = httpRequest.postJsonData()
    logging.debug(LogMessage('answersAndReasonsForPrefix', 'inputData=', inputData))

    linkKeyStr = inputData['linkKey']
    questionId = inputData['questionId']
    logging.debug(LogMessage('answersAndReasonsForPrefix', 'linkKeyStr=', linkKeyStr, 'questionId=', questionId))

    inputStart = standardizeContent( inputData.get( 'inputStart', None ) )
    logging.debug(LogMessage('answersAndReasonsForPrefix', 'inputStart=', inputStart))

    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, inputData=inputData, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    # Enforcing login requirement on this read-only GET call, because the search is expensive, and is part of a write interaction
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord = survey.MultipleQuestionSurvey.retrieve( surveyId )
    if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
    # Check that survey is active and question is part of survey, to reduce unnecessary expensive queries
    if not surveyRecord.questionIdExists( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionId invalid' )
    if surveyRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

    # Retrieve best suggested answers & reasons for this question option
    subkeys = [ voteAggregates.SubKey(questionId, isId=True) ]
    answersAndReasons = None
    if ( surveyRecord.getQuestionType(questionId) == multi.survey.TYPE_BUDGET ):
        answersAndReasons = voteAggregates.retrieveTopAllocationsAndReasons( surveyId, subkeys, inputText=inputStart )
    else:
        answersAndReasons = voteAggregates.retrieveTopAnswersAndReasons( surveyId, subkeys, inputText=inputStart )
    logging.debug(LogMessage('answersAndReasonsForPrefix', 'answersAndReasons=', answersAndReasons))

    # Send reasons to client
    reasonsForDisplay = [ r.toClient(userId) for r in answersAndReasons ]
    responseData.update(  { 'success':True , 'suggestions':reasonsForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



# Use POST for privacy of user's answer-input
@app.post( r'/multi/proposalReasonsForPrefix' )
def proposalReasonsForPrefix( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    inputData = httpRequest.postJsonData()
    logging.debug(LogMessage('inputData=', inputData))

    linkKeyStr = inputData['linkKey']
    questionId = inputData['questionId']
    logging.debug(LogMessage('linkKeyStr=', linkKeyStr, 'questionId=', questionId))

    inputStart = standardizeContent( inputData.get( 'inputStart', None ) )
    logging.debug(LogMessage('inputStart=', inputStart))

    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, inputData=inputData, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    # Enforcing login requirement on this read-only GET call, because the search is expensive, and is part of a write interaction
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord = survey.MultipleQuestionSurvey.retrieve( surveyId )
    if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
    # Check that survey is active and question is part of survey, to reduce unnecessary expensive queries
    if not surveyRecord.questionIdExists( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionId invalid' )
    if surveyRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

    # Retrieve best suggested reasons for this proposal
    proposalId = toProposalId( surveyId, questionId )
    reasons = reason.retrieveTopReasonsForStart( proposalId, inputStart )
    logging.debug(LogMessage('reasons=', reasons))

    # Send reasons to client
    reasonsForDisplay = [ reasonForClient(r, userId)  for r in reasons ]
    responseData.update(  { 'success':True , 'suggestions':reasonsForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



# Use POST for privacy of user's answer-input
@app.post( r'/multi/problemsForPrefix' )
def problemsForPrefix( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    inputData = httpRequest.postJsonData()
    logging.debug(LogMessage('inputData=', inputData))

    linkKeyStr = inputData['linkKey']
    questionId = inputData['questionId']
    logging.debug(LogMessage('linkKeyStr=', linkKeyStr, 'questionId=', questionId))

    inputStart = standardizeContent( inputData.get( 'inputStart', None ) )
    logging.debug(LogMessage('inputStart=', inputStart))

    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, inputData=inputData, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    # Enforcing login requirement on this read-only GET call, because the search is expensive, and is part of a write interaction
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord = survey.MultipleQuestionSurvey.retrieve( surveyId )
    if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
    # Check that survey is active and question is part of survey, to reduce unnecessary expensive queries
    if not surveyRecord.questionIdExists( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionId invalid' )
    if surveyRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

    # Retrieve best suggested problems for this proposal
    contentRecords = multi.content.retrieveTopMatchingContent( surveyId, questionId, [], inputStart )
    logging.debug(LogMessage('contentRecords=', contentRecords))

    # Send reasons to client
    contentForDisplay = [ r.toClient(userId) for r in contentRecords ]  if contentRecords  else []
    responseData.update(  { 'success':True , 'suggestions':contentForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )

# Use POST for privacy of user's answer-input
@app.post( r'/multi/solutionsForPrefix' )
def solutionsForPrefix( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    inputData = httpRequest.postJsonData()
    logging.debug(LogMessage('inputData=', inputData))

    linkKeyStr = inputData['linkKey']
    questionId = inputData['questionId']
    problemId = inputData.get( 'problemId', None )
    problemId = None  if problemId is None  else int( problemId )
    logging.debug(LogMessage('linkKeyStr=', linkKeyStr, 'questionId=', questionId, 'problemId=', problemId))

    inputStart = standardizeContent( inputData.get( 'inputStart', None ) )
    logging.debug(LogMessage('inputStart=', inputStart))

    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, inputData=inputData, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    # Enforcing login requirement on this read-only GET call, because the search is expensive, and is part of a write interaction
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord = survey.MultipleQuestionSurvey.retrieve( surveyId )
    if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
    # Check that survey is active and question is part of survey, to reduce unnecessary expensive queries
    if not surveyRecord.questionIdExists( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionId invalid' )
    if surveyRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

    # Retrieve best suggested solutions for this proposal
    contentRecords = multi.content.retrieveTopMatchingContent( surveyId, questionId, [problemId], inputStart )
    logging.debug(LogMessage('contentRecords=', contentRecords))

    # Send reasons to client
    contentForDisplay = [ r.toClient(userId) for r in contentRecords ]  if contentRecords  else []
    responseData.update(  { 'success':True , 'suggestions':contentForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )

# Use POST for privacy of user's answer-input
@app.post( r'/multi/solutionReasonsForPrefix' )
def solutionReasonsForPrefix( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    inputData = httpRequest.postJsonData()
    logging.debug(LogMessage('inputData=', inputData))

    linkKeyStr = inputData['linkKey']
    questionId = inputData['questionId']
    problemId = inputData.get( 'problemId', None )
    problemId = None  if problemId is None  else int( problemId )
    solutionId = int( inputData['solutionId'] )
    logging.debug(LogMessage('linkKeyStr=', linkKeyStr, 'questionId=', questionId, 'problemId=', problemId, 'solutionId=', solutionId))

    inputStart = standardizeContent( inputData.get( 'inputStart', None ) )
    logging.debug(LogMessage('inputStart=', inputStart))

    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, inputData=inputData, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    # Enforcing login requirement on this read-only GET call, because the search is expensive, and is part of a write interaction
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey record
    surveyRecord = survey.MultipleQuestionSurvey.retrieve( surveyId )
    if surveyRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
    # Check that survey is active and question is part of survey, to reduce unnecessary expensive queries
    if not surveyRecord.questionIdExists( questionId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='questionId invalid' )
    if surveyRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

    # Retrieve best suggested solutions for this proposal
    contentRecords = multi.content.retrieveTopMatchingContent( surveyId, questionId, [problemId, solutionId], inputStart )
    logging.debug(LogMessage('contentRecords=', contentRecords))

    # Send reasons to client
    contentForDisplay = [ r.toClient(userId) for r in contentRecords ]  if contentRecords  else []
    responseData.update(  { 'success':True , 'suggestions':contentForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



################################################################################################
# Methods to serve question results

# For showing rating-question result ratings
@app.get( r'/multi/questionOptionRatings/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>' )
def questionOptionTopRatings( linkKeyStr, questionId ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve survey
    surveyRecord = survey.MultipleQuestionSurvey.retrieve( surveyId )
    optionIds = surveyRecord.getQuestionOptionIds( questionId )

    # Collect map{  optionId -> series[ struct{rating, votes} ]  }
    optionToTopRatings = { }
    optionToRatingDistribution = { }
    for optionId in optionIds:
        parentSubkeys = [ voteAggregates.SubKey(questionId, isId=True) , voteAggregates.SubKey(optionId, isId=True) ]

        # Retrieve child-distribution from parent aggregate-record
        optionVoteCounts = voteAggregates.VoteAggregate.retrieve( surveyId, parentSubkeys )
        logging.debug(LogMessage('optionVoteCounts=', optionVoteCounts))
        if optionVoteCounts and optionVoteCounts.childToVotes:
            optionToTopRatings[ optionId ] = [  { 'rating':child, 'votes':votes }  for child,votes in optionVoteCounts.childToVotes.items()  ]
            optionToRatingDistribution[ optionId ] = { 'average':optionVoteCounts.averageChild() , 'median':optionVoteCounts.medianChild() }

    # Retrieve total number of voters for question
    questionVotesForClient = None
    if surveyRecord.getQuestionType( questionId ) == survey.TYPE_CHECKLIST:
        questionSubkeys = [ voteAggregates.SubKey(questionId, isId=True) ]
        questionVotes = voteAggregates.VoteAggregate.retrieve( surveyId, questionSubkeys )
        logging.debug(LogMessage('questionVotes=', questionVotes))
        if questionVotes:
            questionVotesForClient = { 'voters':questionVotes.voteCount }

    # Send options to client
    responseData.update(  { 'success':True , 'options':optionToTopRatings , 'optionToRatingDistribution':optionToRatingDistribution, 
        'question':questionVotesForClient }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )

# For showing rating-question result reasons
@app.get( r'/multi/ratingTopReasons/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>/<alphanumeric:optionId>/<int(signed=True):rating>' )
def ratingTopReasons( linkKeyStr, questionId, optionId, rating ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )
    if ( rating < conf.MIN_RATING ) or ( conf.MAX_RATING < rating ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Invalid rating' )

    cursor = httpRequest.getUrlParam( 'cursor', None )
    cursor = Cursor( urlsafe=cursor )  if cursor  else None

    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve top option rating reasons
    parentSubkeys = [ voteAggregates.SubKey(questionId, isId=True) , voteAggregates.SubKey(optionId, isId=True) , voteAggregates.SubKey(rating, isNumber=True) ]
    reasonVoteCounts, cursor, more = voteAggregates.retrieveTopByVotes( surveyId, parentSubkeys, cursor=cursor, maxRecords=5 )
    logging.debug(LogMessage('ratingTopReasons', 'reasonVoteCounts=', reasonVoteCounts))

    # Send reasons to client
    cursor = text.toUnicode( cursor.urlsafe() )  if cursor  else None
    reasonsForDisplay = [  { 'reasonId':r.lastSubkeyHash(), 'reason':r.lastSubkeyText, 'votes':r.voteCount }  for r in reasonVoteCounts  ]
    responseData.update(  { 'success':True , 'reasons':reasonsForDisplay , 'cursor':cursor , 'more':more }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



# For showing text-question results
@app.get( r'/multi/questionTopAnswers/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>' )
def questionTopAnswers( linkKeyStr, questionId ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )
    
    cursor = httpRequest.getUrlParam( 'cursor', None )
    cursor = Cursor( urlsafe=cursor )  if cursor  else None
    
    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve top-voted answers
    parentSubkeys = [ voteAggregates.SubKey(questionId, isId=True) ]
    answerVoteCounts, cursor, more = voteAggregates.retrieveTopByVotes( surveyId, parentSubkeys, maxRecords=5, cursor=cursor )
    logging.debug(LogMessage('answerVoteCounts=', answerVoteCounts))

    # Send reasons to client
    cursor = text.toUnicode( cursor.urlsafe() )  if cursor  else None
    answersForDisplay = [  { 'answerId':a.lastSubkeyHash(), 'answer':a.lastSubkeyText, 'votes':a.voteCount }  
        for a in answerVoteCounts  ]  if answerVoteCounts  else []
    responseData.update(  { 'success':True , 'answers':answersForDisplay , 'cursor':cursor, 'more':more }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )


@app.get( r'/multi/questionAnswerTopReasons/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>/<alphanumeric:answerId>' )
def questionAnswerTopReasons( linkKeyStr, questionId, answerId ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve top-voted answers
    parentSubkeys = [ voteAggregates.SubKey(questionId, isId=True) , voteAggregates.SubKey(answerId, isHash=True) ]
    reasonVoteCounts, cursor, more = voteAggregates.retrieveTopByVotes( surveyId, parentSubkeys, maxRecords=5 )
    logging.debug(LogMessage('reasonVoteCounts=', reasonVoteCounts))

    # Send reasons to client
    reasonsForDisplay = [  { 'reasonId':r.lastSubkeyHash(), 'reason':r.lastSubkeyText, 'votes':r.voteCount }  for r in reasonVoteCounts  ]
    responseData.update(  { 'success':True , 'reasons':reasonsForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



# For showing proposal-question results
@app.get( r'/multi/proposalTopReasons/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>' )
def proposalTopReasons( linkKeyStr, questionId ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    cursorPro = httpRequest.getUrlParam( 'cursorPro', None )
    cursorPro = Cursor( urlsafe=cursorPro )  if cursorPro  else None
    cursorCon = httpRequest.getUrlParam( 'cursorCon', None )
    cursorCon = Cursor( urlsafe=cursorCon )  if cursorCon  else None

    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve top un/voted reasons, async
    proposalId = toProposalId( surveyId, questionId )
    maxReasonsPerType = 3
    proRecordsFuture, conRecordsFuture = reason.retrieveTopReasonsAsync(
        proposalId, maxReasonsPerType, cursorPro=cursorPro, cursorCon=cursorCon )  # , cursorProDone=cursorProDone, cursorConDone=cursorConDone )
    proRecords, cursorPro, morePros = proRecordsFuture.get_result()  if proRecordsFuture  else ( None, None, False )
    conRecords, cursorCon, moreCons = conRecordsFuture.get_result()  if conRecordsFuture  else ( None, None, False )

    cursorPro = text.toUnicode( cursorPro.urlsafe() )  if cursorPro  else None
    cursorCon = text.toUnicode( cursorCon.urlsafe() )  if cursorCon  else None
    prosForDisplay = [ reasonForClient(r, userId) for r in proRecords ]  if proRecords  else []
    consForDisplay = [ reasonForClient(r, userId) for r in conRecords ]  if conRecords  else []

    # Retrieve proposal-record with pro/con vote-counts
    proposalRecord = proposal.Proposal.get_by_id( proposalId )
    proposalForDisplay = proposalForClient( proposalRecord, userId )

    # Send reasons to client
    responseData.update(  {
        'success':True , 'pros':prosForDisplay , 'cons':consForDisplay , 'proposal':proposalForDisplay,
        'cursorPro':cursorPro, 'cursorCon':cursorCon, 'cursorProMore':morePros, 'cursorConMore':moreCons
    }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )



# For showing request-for-problems question results
@app.get( r'/multi/topProblems/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>' )
def topProblems( linkKeyStr, questionId ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve top un/voted reasons, async
    contentRecords, cursor, hasMore = multi.content.retrieveTopProblems( surveyId, questionId, maxRecords=5 )
    logging.debug(LogMessage('contentRecords=', contentRecords))

    # Send reasons to client
    contentForDisplay = [ r.toClient(userId) for r in contentRecords ]  if contentRecords  else []
    responseData.update(  { 'success':True , 'problems':contentForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )

@app.get( r'/multi/topSolutions/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>/<alphanumeric:problemId>' )
@app.get( r'/multi/topSolutions/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>' )
def topSolutions( linkKeyStr, questionId, problemId=None ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve top un/voted reasons, async
    contentRecords, cursor, hasMore = multi.content.retrieveTopContent( surveyId, questionId, [problemId], maxRecords=5 )
    logging.debug(LogMessage('contentRecords=', contentRecords))

    # Send reasons to client
    contentForDisplay = [ r.toClient(userId) for r in contentRecords ]  if contentRecords  else []
    responseData.update(  { 'success':True , 'solutions':contentForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )

@app.get( r'/multi/topSolutionReasons/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>/<alphanumeric:problemId>/<alphanumeric:solutionId>' )
def topSolutionReasons( linkKeyStr, questionId, solutionId, problemId=None ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )
    if ( problemId == 'x' ):  problemId = None

    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve top un/voted reasons, async
    proRecords, cursor, hasMore = multi.content.retrieveTopContent( surveyId, questionId, [problemId, solutionId], maxRecords=3, proOrCon=conf.PRO )
    logging.debug(LogMessage('proRecords=', proRecords))
    conRecords, cursor, hasMore = multi.content.retrieveTopContent( surveyId, questionId, [problemId, solutionId], maxRecords=3, proOrCon=conf.CON )
    logging.debug(LogMessage('conRecords=', conRecords))

    # Send reasons to client
    prosForDisplay = [ r.toClient(userId) for r in proRecords ]  if proRecords  else []
    consForDisplay = [ r.toClient(userId) for r in conRecords ]  if conRecords  else []
    responseData.update(  { 'success':True , 'pros':prosForDisplay , 'cons':consForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )




# For showing budget-question result items
@app.get( r'/multi/budgetTopItems/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>' )
def budgetTopItems( linkKeyStr, questionId ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve enough top-voted allocations to fill a budget
    parentSubkeys = [ voteAggregates.SubKey(questionId, isId=True) ]
    answerVoteCounts, cursor, more = voteAggregates.retrieveTopByVotes( surveyId, parentSubkeys, maxRecords=20 )
    logging.debug(LogMessage('answerVoteCounts=', answerVoteCounts))

    # If allocations sum to more than 100% of budget, truncate
    allocationsUnderLimit = []
    sum = 0
    for a in answerVoteCounts:
        amount = a.medianChild()
        sum += amount
        excess = (sum - 100)
        remainingAmount = amount - excess
        resultAmount = amount  if ( sum <= 100 )  else remainingAmount
        logging.debug(LogMessage('amount=', amount, 'sum=', sum, 'excess=', excess, 'resultAmount=', resultAmount))
        allocationsUnderLimit.append( { 'answerId':a.lastSubkeyHash(), 'answer':a.lastSubkeyText, 'votes':a.voteCount, 'medianSize':resultAmount } )
        if ( 100 <= sum ):  break

    # Send allocations to client
    responseData.update(  { 'success':True , 'answers':allocationsUnderLimit }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )

# For showing budget-item result reasons
@app.get( r'/multi/budgetItemTopReasons/<alphanumeric:linkKeyStr>/<alphanumeric:questionId>/<alphanumeric:itemId>' )
def budgetItemTopReasons( linkKeyStr, questionId, itemId ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    responseData, cookieData, userId, errorMessage = parseInputs( httpRequest, httpResponse, idRequired=True )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve link
    linkKeyRecord, surveyId, errorMessage = retrieveLink( linkKeyStr, enforceLogin=False )
    if errorMessage:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=errorMessage )

    # Retrieve top-voted answers
    grandparentSubkeys = [ SubKey(questionId, isId=True) , SubKey(itemId, isId=True) ]
    reasonVoteCounts, cursor, more = voteAggregates.retrieveTopByVotes( surveyId, grandparentSubkeys, subkeyIsGrandparent=True )
    logging.debug(LogMessage('reasonVoteCounts=', reasonVoteCounts))

    # Send reasons to client
    reasonsForDisplay = [  
        { 'reasonId':a.lastSubkeyHash(), 'reason':a.lastSubkeyText, 'votes':a.voteCount, 'amount':int(a.parentSubkeyText) }  for a in reasonVoteCounts  ]
    responseData.update(  { 'success':True , 'reasons':reasonsForDisplay }  )
    return httpServer.outputJson( cookieData, responseData, httpResponse )


