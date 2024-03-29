# Services to get voter-id login cookie
# 
# If abuser steals browser-cookie... 
#   Only send open-voter-id cookie with first client-response
#   Can request login and possibly get voter-id from logged-in user who never returned after login
#     Need timeout
#   Can request logout... and fail because no crumb?
#     Logged-in user cannot logout if login-crumb lost, until page-refresh re-sends login-crumb? Ok?


# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import re
import time
# Import app modules
import browser
import cookie
from configuration import const as conf
import httpServer
from httpServer import app
import linkKey
import user



@app.post('/signLoginRequest')
def signLoginRequest( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'requestLogId':requestLogId }
        inputData = httpRequest.postJsonData()
        logging.debug( 'SignLoginRequest.post() inputData=' + str(inputData) )

        loginRequestId = user.randomStringWithLength( conf.VOTER_ID_LOGIN_REQUEST_ID_LENGTH )
        signature = user.signLoginRequest( loginRequestId )

        # Store login-request-id, to later check against spoofed login-return
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse )
        if not cookieData.browserId:  return httpResponse
        browserId = cookieData.browserId

        browserRecord = browser.BrowserRecord.get_by_id( browserId )
        logging.debug( 'LoginReturn.post() browserRecord=' + str(browserRecord) )

        if not browserRecord:
            browserRecord = browser.BrowserRecord( id=browserId )
        now = int( time.time() )
        browserRecord.loginRequestTime = now
        browserRecord.voterLoginRequestId = loginRequestId
        browserRecord.put()

        responseData.update(  { 'success':True , 'loginRequestId':loginRequestId, 'signature':signature }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



# Login receiving service, storing browserId+requestId->loginId with 10-minute expiration time
@app.post('/loginReturn')
def loginReturn( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'requestLogId':requestLogId }
        inputData = httpRequest.postFormParams()
        logging.debug( 'LoginReturn.post() inputData=' + str(inputData) )

        requestId = inputData['requestId'][0]
        responseSignature = inputData['responseSignature'][0]
        voterId = inputData['voterId'][0]
        city = inputData['city'][0]

        # Check that browser-id exists
        # Cannot check browser crumb/fingerprint, because they do not exist in the referring page
        # Send fingerprint via ajax before auto-closing tab
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, crumbRequired=False, signatureRequired=False )

        if not cookieData.browserId:  return httpResponse
        browserId = cookieData.browserId

        # Check responseSignature
        expectedResponseSignature = user.signLoginResult( requestId, voterId, city )
        logging.debug( 'LoginReturn.post() expectedResponseSignature=' + str(expectedResponseSignature) )
        if (responseSignature != expectedResponseSignature):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='responseSignature does not match expected' )

        # Check stored browserId -> loginRequestId , check timeout, then delete record
        browserRecord = browser.BrowserRecord.get_by_id( browserId )
        logging.debug( 'LoginReturn.post() browserRecord=' + str(browserRecord) )
        
        now = int( time.time() )
        if not browserRecord:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='login browserRecord=null' )
        if browserRecord.voterLoginRequestId != requestId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='login requestId does not match expected' )
        if browserRecord.loginRequestTime + conf.VOTER_ID_TIMEOUT_SEC < now:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='login past timeout' )

        browserRecordKey = ndb.Key( browser.BrowserRecord, browserId )
        browserRecordKey.delete()

        # Send login-id to browser now, with response-page cookie, instead of server storing a mapping
        # To set crumbForLogin into original page's javascript variable, have to use separate getLoginCrumb call

        # Add voter-id to persistent cookie
        appVoterId = user.voterIdToApp( voterId )
        cookieData.dataNew[ conf.COOKIE_FIELD_VOTER_ID ] = appVoterId
        cookieData.dataNew[ conf.COOKIE_FIELD_VOTER_CITY ] = city

        # Send page that closes tab
        responseData.update( {
            'SITE_NAME': conf.SITE_NAME ,
            'crumb': user.createCrumb( browserId ) ,
            'city': city
        } )
        return httpServer.outputTemplate( 'loginReturn.html', responseData, httpResponse, cookieData=cookieData )



# Crumb/fingerprint not required, to enable user to logout even if browser crumb is lost or fingerprint changed.
# But browser crumb/fingerprint could be required for logout, since they can be regenerated by page reload.
@app.post('/submitLogout')
def submitLogout( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'requestLogId':requestLogId }
        inputData = httpRequest.postJsonData()
        logging.debug( 'SubmitLogout.post() inputData=' + str(inputData) )

        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return httpResponse   # Cookie already reset, no need to clear cookie fields

        # Remove voter-id from persistent cookie, even if cookie is already invalid
        cookieData.dataNew[ conf.COOKIE_FIELD_VOTER_ID ] = None
        cookieData.dataNew[ conf.COOKIE_FIELD_VOTER_CITY ] = None

        responseData.update(  { 'success':True }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )


