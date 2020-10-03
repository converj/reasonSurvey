# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
from configuration import const as conf
import httpServer
import linkKey
import requestForProposals
import text
import user




class SubmitNewRequest(webapp2.RequestHandler):

    def post(self):  # Not a transaction, because it is ok to fail link creation, and orphan the request.

        logging.debug( 'SubmitNewRequest.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SubmitNewRequest.post() inputData=' + str(inputData) )

        title = text.formTextToStored( inputData.get('title', '') )
        detail = text.formTextToStored( inputData.get('detail', '') )
        loginRequired = inputData.get( 'loginRequired', False )
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug( 'SubmitNewRequest.post() title=' + str(title) + ' detail=' + str(detail) + ' browserCrumb=' + str(browserCrumb) + ' loginCrumb=' + str(loginCrumb) + ' loginRequired=' + str(loginRequired) )

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response, loginRequired=loginRequired )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Check request length
        if not httpServer.isLengthOk( title, detail, conf.minLengthRequest ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )
        
        # Construct new request record
        requestRecord = requestForProposals.RequestForProposals(
            creator=userId,
            title=title,
            detail=detail,
            allowEdit=True,
        )
        # Store request record
        requestRecordKey = requestRecord.put()
        logging.debug( 'requestRecordKey.id={}'.format(requestRecordKey.id()) )
        
        # Construct and store link key.
        requestId = str( requestRecordKey.id() )
        linkKeyRecord = httpServer.createAndStoreLinkKey( conf.REQUEST_CLASS_NAME, requestId, loginRequired, cookieData )
        
        # Send response data.
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
        requestDisplay = httpServer.requestToDisplay( requestRecord, userId )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'request':requestDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )


class SubmitEditRequest(webapp2.RequestHandler):

    def post(self):
        logging.debug( 'SubmitEditRequest.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SubmitEditRequest.post() inputData=' + str(inputData) )

        title = text.formTextToStored( inputData.get('inputTitle', '') )
        detail = text.formTextToStored( inputData.get('inputDetail', '') )
        linkKeyString = inputData.get( 'linkKey', None )
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug( 'SubmitEditRequest.post() title=' + str(title) + ' detail=' + str(detail) + ' browserCrumb=' + str(browserCrumb) + ' loginCrumb=' + str(loginCrumb) + ' linkKeyString=' + str(linkKeyString) )

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Require link-key, and convert it to requestId.
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'SubmitEditRequest.post() linkKeyRec=' + str(linkKeyRec) )

        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRec.destinationType != conf.REQUEST_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not a request' )
        requestId = int(linkKeyRec.destinationId)
        logging.debug( 'SubmitEditRequest.post() requestId=' + str(requestId) )

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check request length.
        if not httpServer.isLengthOk( title, detail, conf.minLengthRequest ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )
        
        # Retrieve request record.
        requestForProposalsRec = requestForProposals.RequestForProposals.get_by_id( requestId )
        logging.debug( 'SubmitEditRequest.post() requestForProposalsRec=' + str(requestForProposalsRec) )
        if requestForProposalsRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='requestForProposalsRec not found' )

        # Verify that request is editable.
        if userId != requestForProposalsRec.creator:
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )
        if not requestForProposalsRec.allowEdit:
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.HAS_RESPONSES )
        if requestForProposalsRec.freezeUserInput:
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        # Update request record.
        requestForProposalsRec.title = title
        requestForProposalsRec.detail = detail
        requestForProposalsRec.put()
        
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRec )
        requestDisplay = httpServer.requestToDisplay( requestForProposalsRec, userId )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'request':requestDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class SubmitFreezeRequest(webapp2.RequestHandler):

    def post(self):
        logging.debug( 'SubmitFreezeRequest.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SubmitFreezeRequest.post() inputData=' + str(inputData) )

        freeze = bool( inputData.get('freezeUserInput', False) )
        linkKeyString = inputData.get( 'linkKey', None )
        logging.debug( 'SubmitFreezeRequest.post() freeze=' + str(freeze) + ' linkKeyString=' + str(linkKeyString) )

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve link-key record
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'SubmitFreezeRequest.post() linkKeyRec=' + str(linkKeyRec) )

        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRec.destinationType != conf.REQUEST_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not a request' )
        requestId = int(linkKeyRec.destinationId)
        logging.debug( 'SubmitFreezeRequest.post() requestId=' + str(requestId) )

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Retrieve request record
        requestForProposalsRec = requestForProposals.RequestForProposals.get_by_id( int(requestId) )
        logging.debug( 'SubmitFreezeRequest.post() requestForProposalsRec=' + str(requestForProposalsRec) )
        if requestForProposalsRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='requestForProposalsRec not found' )

        # Verify that user is authorized
        if userId != requestForProposalsRec.creator:
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )

        # Update request record
        requestForProposalsRec.freezeUserInput = freeze
        requestForProposalsRec.put()
        
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRec )
        requestDisplay = httpServer.requestToDisplay( requestForProposalsRec, userId )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'request':requestDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication([
    ('/newRequest', SubmitNewRequest),
    ('/editRequest', SubmitEditRequest) ,
    ('/freezeRequest', SubmitFreezeRequest)
])


