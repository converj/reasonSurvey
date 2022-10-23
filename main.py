# Single-page application, using javascript and AJAX.
#     Separate page-displays for each proposal, versus expand/collapse.
#         + May be more understandable to users.
#         - Requires extra clicks to vote/reason even for small proposals.
#         + Allows smaller data fetches when number of proposals/reasons is large.
#
# cookie user-identity
#     Generate cookie anytime cookie is absent.
#     Store cookie in database only when user tries to store data.



# Import external modules
from google.appengine.datastore.datastore_query import Cursor
from google.appengine.ext import ndb
import flask
import json
import logging
import os
# Import local modules
import autocomplete.answer
import autocomplete.configAutocomplete
import autocomplete.getAnswers
import autocomplete.getQuestion
import autocomplete.getSurvey
import autocomplete.submitAnswer
import autocomplete.submitQuestion
import autocomplete.submitSurvey
import autocomplete.survey
import autocomplete.question
import budget.configBudget
import budget.getBudget
import budget.getSlice
import budget.submitBudget
import budget.submitSlice
import cleanup
from configuration import const as conf
import getProposalData
import getRecent
import getRequestData
import httpServer
from httpServer import app
import secrets
import submitLogin
import submitProposal
import submitReason
import submitRequest
import submitVote
from text import LogMessage
import user




@app.get('/')
def mainPage( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()
        logging.debug( 'mainPage() httpRequest=' + str(httpRequest) )

        templateValues = {
            # Pass configuration data from server to client
            'SITE_NAME': conf.SITE_NAME ,
            'minLengthRequest': conf.minLengthRequest,
            'minLengthProposal': conf.minLengthProposal,
            'minLengthReason': conf.minLengthReason,
            'minLengthSurveyIntro': conf.minLengthSurveyIntro,
            'minLengthQuestion': conf.minLengthQuestion,
            'minLengthAnswer': conf.minLengthAnswer,
            'minLengthBudgetIntro': conf.minLengthBudgetIntro ,
            'minLengthSliceTitle': conf.minLengthSliceTitle ,
            'minLengthSliceReason': conf.minLengthSliceReason ,
            'TOO_SHORT': conf.TOO_SHORT,
            'REASON_TOO_SHORT': conf.REASON_TOO_SHORT,
            'DUPLICATE': conf.DUPLICATE,
            'NO_COOKIE': conf.NO_COOKIE,
            'NO_LOGIN': conf.NO_LOGIN,
            'BAD_CRUMB': conf.BAD_CRUMB,
            'BAD_LINK': conf.BAD_LINK,
            'NOT_OWNER': conf.NOT_OWNER,
            'HAS_RESPONSES': conf.HAS_RESPONSES,
            'ERROR_DUPLICATE': conf.ERROR_DUPLICATE,
            'FROZEN': conf.FROZEN ,
            'EXPERIMENT_NOT_AUTHORIZED': conf.EXPERIMENT_NOT_AUTHORIZED ,
            'OVER_BUDGET': conf.OVER_BUDGET ,
            'MAX_WORDS_INDEXED': conf.MAX_WORDS_INDEXED ,
            'STOP_WORDS': json.dumps(  { w:True for w in conf.STOP_WORDS }  ) ,
            'VOTER_ID_LOGIN_SIG_LENGTH': conf.VOTER_ID_LOGIN_SIG_LENGTH ,
            'VOTER_ID_LOGIN_REQUEST_ID_LENGTH': conf.VOTER_ID_LOGIN_REQUEST_ID_LENGTH ,
            'loginApplicationId': secrets.loginApplicationId ,
            'LOGIN_URL':  conf.LOGIN_URL_DEV if conf.isDev  else conf.LOGIN_URL ,
            'IS_DEV':  'true' if conf.isDev  else 'false' ,
        }
        # Dont set cookie at this time, because javascript-browser-fingerprint not available to sign cookie
        return httpServer.outputTemplate( 'main.html', templateValues, httpResponse )



# Serve cookie on page load
@app.post('/initialCookie')
def initialCookie( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()
        logging.debug( 'initialCookie() httpRequest=' + str(httpRequest) )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'requestLogId':requestLogId }
        inputData = httpRequest.postJsonData()

        # Set cookie with signature based on browser-fingerprint from javascript
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=False, makeValid=True )
        if not cookieData.valid():  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='cookieData invalid' )
        responseData['success'] = True
        responseData['crumb'] = user.createCrumb( cookieData.browserId )  if cookieData.valid()  else ''

        return httpServer.outputJson( cookieData, responseData, httpResponse )
        


@app.get('/termsOfService.html')
def termsOfService( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()
        logging.debug( 'httpRequest=' + str(httpRequest) )

        templateValues = {
            'TITLE': 'Terms of Service' ,
            'COMPANY_NAME': 'Converj LLC' ,
            'THE_CONTACT': 'LEGALCORP SOLUTIONS INC' ,
            'THE_ADDRESS': '506 S Spring St #13308, Los Angeles CA 90013' ,
            'THE_LOCATION': 'Los Angeles, California, United States' ,
        }
        return httpServer.outputTemplate( 'termsOfService.html', templateValues, httpResponse )


@app.get('/privacyPolicy.html')
def privacyPolicy( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()
        logging.debug( 'httpRequest=' + str(httpRequest) )

        templateValues = {
            'TITLE': 'Privacy Policy' ,
            'COMPANY_NAME': 'Converj LLC' ,
            'THE_LOCATION': 'Los Angeles, California, United States' ,
        }
        return httpServer.outputTemplate( 'privacyPolicy.html', templateValues, httpResponse )



# Find records needing cleanup, initial form
# @app.get('/clean')
def cleanGet( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()
        logging.debug(LogMessage('Clean', 'get()'))

        templateValues = { }
        return httpServer.outputTemplate( 'cleanup.html', templateValues, httpResponse )

# Find records needing cleanup, paged
# @app.post('/clean' )
def cleanPost( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()
        logging.debug(LogMessage('Clean.post()', 'httpRequest=', httpRequest))

        # Collect inputs
        inputData = httpServer.postFormParams( httpRequest )
        logging.debug(LogMessage('Clean', 'inputData=', inputData))
        secret = inputData.get( 'secret', [''] )[0]
        type = inputData.get( 'type', [''] )[0]
        cursor = inputData.get( 'cursor', [''] )[0]

        cursor = Cursor( urlsafe=cursor )  if cursor  else None
        doDelete = True
        templateValues = { 'cursor':(text.toUnicode(cursor.urlsafe()) if cursor else ''), 'type':type, 'secret':secret }

        # Check admin-secret, because this service risks exposing private data
        if ( secret != secrets.adminSecret ):
            templateValues['errorMessage'] = 'Admin secret mismatch'
            return httpServer.outputTemplate( 'cleanup.html', templateValues, httpResponse )

        # Clean 1 page of records
        if ( type == 'proposal' ):
            cursor, displayTuples = cleanup.removeProposalsWithoutRequest( cursor=cursor, doDelete=doDelete )
        elif ( type == 'proposalshard' ):
            cursor, displayTuples = cleanup.removeProposalShardsWithoutProposal( cursor=cursor, doDelete=doDelete )
        elif ( type == 'reason' ):
            cursor, displayTuples = cleanup.removeReasonsWithoutProposal( cursor=cursor, doDelete=doDelete )
        elif ( type == 'reasonvote' ):
            cursor, displayTuples = cleanup.removeReasonVotesWithoutReason( cursor=cursor, doDelete=doDelete )
        elif ( type == 'question' ):
            cursor, displayTuples = cleanup.removeQuestionsWithoutSurvey( cursor=cursor, doDelete=doDelete )
        elif ( type == 'answer' ):
            cursor, displayTuples = cleanup.removeAnswersWithoutQuestion( cursor=cursor, doDelete=doDelete )
        elif ( type == 'answervote' ):
            cursor, displayTuples = cleanup.removeAnswerVotesWithoutAnswer( cursor=cursor, doDelete=doDelete )
        elif ( type == 'slice' ):
            cursor, displayTuples = cleanup.removeSlicesWithoutBudget( cursor=cursor, doDelete=doDelete )
        elif ( type == 'slicevote' ):
            cursor, displayTuples = cleanup.removeSliceVotesWithoutBudget( cursor=cursor, doDelete=doDelete )
        elif ( type == 'link' ):
            cursor, displayTuples = cleanup.removeLinkKeysWithoutDestination( cursor=cursor, doDelete=doDelete )
        else:
            templateValues['errorMessage'] = 'Unhandled type'
            return httpServer.outputTemplate( 'cleanup.html', templateValues, httpResponse )

        # Display cleaning results
        templateValues['cursor'] = text.toUnicode(cursor.urlsafe())  if cursor  else ''
        templateValues['records'] = displayTuples
        return httpServer.outputTemplate( 'cleanup.html', templateValues, httpResponse )

        

