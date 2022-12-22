# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import time
import urllib.parse
# Import app modules
import common
from configuration import const as conf
import httpServer
from httpServer import app
import linkKey
import requestForProposals
import secrets
import text
from text import LogMessage
import user



@app.post('/newRequest')
def submitNewRequest( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug(LogMessage('SubmitNewRequest', 'inputData=', inputData))

        title = text.formTextToStored( inputData.get('title', '') )
        detail = text.formTextToStored( inputData.get('detail', '') )
        loginRequired = bool( inputData.get('loginRequired', False) )
        experimentalPassword = inputData.get( 'experimentalPassword', None )
        hideReasons = bool( inputData.get('hideReasons', False) )
        doneLink = inputData.get( 'doneLink', None )
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug(LogMessage('SubmitNewRequest', 'title=', title, 'detail=', detail, 'browserCrumb=', browserCrumb, 'loginCrumb=', loginCrumb,
            'loginRequired=', loginRequired, 'hideReasons=', hideReasons))

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, loginRequired=loginRequired )
        if not cookieData.valid():  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_COOKIE )
        userId = cookieData.id()

        # Check request length
        if not httpServer.isLengthOk( title, detail, conf.minLengthRequest ):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )

        # Check experimental password (low-risk secret)
        isExperimental = hideReasons  or  doneLink  or  loginRequired  or  experimentalPassword
        if isExperimental  and  ( experimentalPassword != secrets.experimentalPassword ):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.EXPERIMENT_NOT_AUTHORIZED )

        # Clean up done-link
        doneLinkFields = urllib.parse.urlparse( doneLink )
        hasDoneLink = doneLinkFields.path  or  doneLinkFields.query  or  doneLinkFields.fragment
        doneLinkRelative = ( doneLinkFields.path + '?' + doneLinkFields.query + '#' + doneLinkFields.fragment )  if hasDoneLink  else None
        if ( doneLinkRelative  and  (doneLinkRelative[0] != '/') ):  doneLinkRelative = '/' + doneLinkRelative

        # Construct new request record
        now = int( time.time() )
        requestRecord = requestForProposals.RequestForProposals(
            creator=userId , title=title , detail=detail , allowEdit=True , hideReasons=hideReasons, doneLink=doneLinkRelative,
            adminHistory=common.initialChangeHistory() , timeCreated=now )
        # Store request record
        requestRecordKey = requestRecord.put()
        logging.debug(LogMessage('SubmitNewRequest', 'requestRecordKey.id=', requestRecordKey.id()))
        
        # Construct and store link key.
        requestId = str( requestRecordKey.id() )
        linkKeyRecord = httpServer.createAndStoreLinkKey( conf.REQUEST_CLASS_NAME, requestId, loginRequired, cookieData )
        
        # Send response data.
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
        requestDisplay = httpServer.requestToDisplay( requestRecord, userId )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'request':requestDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/editRequest')
def submitEditRequest( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug(LogMessage('SubmitEditRequest', 'inputData=', inputData))

        title = text.formTextToStored( inputData.get('inputTitle', '') )
        detail = text.formTextToStored( inputData.get('inputDetail', '') )
        linkKeyString = inputData.get( 'linkKey', None )
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug(LogMessage('SubmitEditRequest', 'title=', title, 'detail=', detail, 'browserCrumb=', browserCrumb, 'loginCrumb=', loginCrumb, 'linkKeyString=', linkKeyString))

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse )
        if not cookieData.valid():  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_COOKIE )
        userId = cookieData.id()

        # Require link-key, and convert it to requestId.
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug(LogMessage('SubmitEditRequest', 'linkKeyRec=', linkKeyRec))

        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        if linkKeyRec.destinationType != conf.REQUEST_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not a request' )
        requestId = int(linkKeyRec.destinationId)
        logging.debug(LogMessage('SubmitEditRequest', 'requestId=', requestId))

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Check request length.
        if not httpServer.isLengthOk( title, detail, conf.minLengthRequest ):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )
        
        # Retrieve request record.
        requestForProposalsRec = requestForProposals.RequestForProposals.get_by_id( requestId )
        logging.debug(LogMessage('SubmitEditRequest', 'requestForProposalsRec=', requestForProposalsRec))
        if requestForProposalsRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='requestForProposalsRec not found' )

        # Verify that request is editable.
        if userId != requestForProposalsRec.creator:
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NOT_OWNER )
        if not requestForProposalsRec.allowEdit:
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.HAS_RESPONSES )
        if requestForProposalsRec.freezeUserInput:
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

        # Update request record.
        requestForProposalsRec.title = title
        requestForProposalsRec.detail = detail
        requestForProposalsRec.put()
        
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRec )
        requestDisplay = httpServer.requestToDisplay( requestForProposalsRec, userId )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'request':requestDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/freezeRequest')
def submitFreezeRequest( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug(LogMessage('SubmitFreezeRequest', 'inputData=', inputData))

        freeze = bool( inputData.get('freezeUserInput', False) )
        linkKeyString = inputData.get( 'linkKey', None )
        logging.debug(LogMessage('SubmitFreezeRequest', 'freeze=', freeze, 'linkKeyString=', linkKeyString))

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse )
        if not cookieData.valid():  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_COOKIE )
        userId = cookieData.id()

        # Retrieve link-key record
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug(LogMessage('SubmitFreezeRequest', 'linkKeyRec=', linkKeyRec))

        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        if linkKeyRec.destinationType != conf.REQUEST_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not a request' )
        requestId = int(linkKeyRec.destinationId)
        logging.debug(LogMessage('SubmitFreezeRequest', 'requestId=', requestId))

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Retrieve request record
        requestForProposalsRec = requestForProposals.RequestForProposals.get_by_id( int(requestId) )
        logging.debug(LogMessage('SubmitFreezeRequest', 'requestForProposalsRec=', requestForProposalsRec))
        if requestForProposalsRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='requestForProposalsRec not found' )

        # Verify that user is authorized
        if userId != requestForProposalsRec.creator:
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NOT_OWNER )

        # Update request record
        requestForProposalsRec.freezeUserInput = freeze
        common.appendFreezeInputToHistory( freeze, requestForProposalsRec.adminHistory )
        requestForProposalsRec.put()
        
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRec )
        requestDisplay = httpServer.requestToDisplay( requestForProposalsRec, userId )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'request':requestDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.post('/freezeNewProposals')
def freezeNewProposals( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug(LogMessage('FreezeNewProposals', 'inputData=', inputData))

        freeze = bool( inputData.get('freezeNewProposals', False) )
        linkKeyString = inputData.get( 'linkKey', None )
        logging.debug(LogMessage('FreezeNewProposals', 'freeze=', freeze, 'linkKeyString=', linkKeyString))

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse )
        if not cookieData.valid():  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_COOKIE )
        userId = cookieData.id()

        # Retrieve link-key record
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug(LogMessage('FreezeNewProposals', 'linkKeyRec=', linkKeyRec))

        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        if linkKeyRec.destinationType != conf.REQUEST_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not a request' )
        requestId = int(linkKeyRec.destinationId)
        logging.debug(LogMessage('FreezeNewProposals', 'requestId=', requestId))

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Retrieve request record
        requestForProposalsRec = requestForProposals.RequestForProposals.get_by_id( int(requestId) )
        logging.debug(LogMessage('FreezeNewProposals', 'requestForProposalsRec=', requestForProposalsRec))
        if requestForProposalsRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='requestForProposalsRec not found' )

        # Verify that user is authorized
        if userId != requestForProposalsRec.creator:
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NOT_OWNER )

        # Update request record
        requestForProposalsRec.freezeNewProposals = freeze
        common.appendFreezeProposalsToHistory( freeze, requestForProposalsRec.adminHistory )
        requestForProposalsRec.put()
        
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRec )
        requestDisplay = httpServer.requestToDisplay( requestForProposalsRec, userId )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'request':requestDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )


