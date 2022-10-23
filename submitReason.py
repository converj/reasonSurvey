# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
# Import app modules
from configuration import const as conf
import httpServer
from httpServer import app
import linkKey
import proposal
import reason
import requestForProposals
import user
import text
from text import LogMessage



@app.post('/newReason')
def submitNewReason( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug(LogMessage('SubmitNewReason', 'inputData=', inputData))

        linkKeyStr = inputData.get( 'linkKey', None )
        proposalId = str( int( inputData.get( 'proposalId', None ) ) )
        proOrCon = inputData.get( 'proOrCon', None )
        reasonContent = text.formTextToStored( inputData.get('reasonContent', '') )
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug(LogMessage('SubmitNewReason', 'linkKeyStr=', linkKeyStr, 'proposalId=', proposalId,
            'proOrCon=', proOrCon, 'reasonContent=', reasonContent, 'browserCrumb=', browserCrumb, 'loginCrumb=', loginCrumb))

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse )
        if not cookieData.valid():  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_COOKIE )
        userId = cookieData.id()

        # Check reason length.
        if not httpServer.isLengthOk( reasonContent, '', conf.minLengthReason ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )

        # Retrieve link-key record
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyStr )
        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        logging.debug(LogMessage('SubmitNewReason', 'linkKeyRec=', linkKeyRec))

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Retrieve proposal record
        proposalRec = proposal.Proposal.get_by_id( int(proposalId) )
        if proposalRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='proposal not found' )
        logging.debug(LogMessage('SubmitNewReason', 'proposalRec=', proposalRec))

        # Verify that reason belongs to linkKey's request/proposal, and check whether frozen
        requestRec = None
        requestId = None
        if linkKeyRec.destinationType == conf.PROPOSAL_CLASS_NAME:
            if proposalId != linkKeyRec.destinationId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='proposalId != linkKeyRec.destinationId' )
            if proposalRec.hideReasons:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='reasons hidden' )
            if proposalRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

        elif linkKeyRec.destinationType == conf.REQUEST_CLASS_NAME:
            requestId = proposalRec.requestId
            if requestId != linkKeyRec.destinationId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='requestId != linkKeyRec.destinationId' )
            # Retrieve request-for-proposals, and check whether frozen
            requestRec = requestForProposals.RequestForProposals.get_by_id( int(requestId) )
            if not requestRec:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='requestRec is null' )
            if requestRec.hideReasons:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='reasons hidden' )
            if requestRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

        else:
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey destinationType=' + linkKeyRec.destinationType )

        # Retrieve any existing identical reason, to prevent duplicates
        existingReasons = reason.Reason.query( reason.Reason.requestId==requestId , reason.Reason.proposalId==proposalId ,
            reason.Reason.proOrCon==proOrCon , reason.Reason.content==reasonContent ).fetch( 1 )
        if existingReasons:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.DUPLICATE )
        
        # Construct new reason record
        reasonRecord = reason.Reason( requestId=requestId, proposalId=proposalId, creator=userId, proOrCon=proOrCon, allowEdit=True )
        reasonRecord.setContent( reasonContent )
        # Store reason record
        reasonRecordKey = reasonRecord.put()
        logging.debug(LogMessage('SubmitNewReason', 'reasonRecordKey=', reasonRecordKey))

        # Mark proposal as not editable
        # Causes a little delay, but only for first reason
        if proposalRec.allowEdit:
            proposalRec.allowEdit = False
            proposalRec.put()

        # Display reason
        reasonDisplay = httpServer.reasonToDisplay( reasonRecord, userId, proposal=proposalRec, request=requestRec )
        responseData.update(  { 'success':True, 'reason':reasonDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )
        


@app.post('/editReason')
def submitEditReason( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = httpRequest.postJsonData()
        logging.debug(LogMessage('SubmitEditReason', 'inputData=', inputData))

        linkKeyStr = inputData.get( 'linkKey', None )
        reasonId = str( int( inputData.get( 'reasonId', None ) ) )
        reasonContent = text.formTextToStored( inputData.get('inputContent', '') )
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug(LogMessage('SubmitEditReason', 'linkKeyStr=', linkKeyStr, 'reasonId=', reasonId,
            'reasonContent=', reasonContent, 'browserCrumb=', browserCrumb, 'loginCrumb=', loginCrumb))

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse )
        if not cookieData.valid():  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        userId = cookieData.id()

        # Check reason length.
        if not httpServer.isLengthOk( reasonContent, '', conf.minLengthReason ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.TOO_SHORT )

        # Retrieve link-key record
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyStr )
        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        logging.debug(LogMessage('SubmitEditReason', 'linkKeyRec=', linkKeyRec))

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Retrieve reason record
        reasonRec = reason.Reason.get_by_id( int(reasonId) )
        if reasonRec is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='reason not found' )
        logging.debug(LogMessage('SubmitEditReason', 'reasonRec=', reasonRec))

        # Verify that reason belongs to linkKey's request/proposal
        proposalRec = None
        requestRec = None
        if linkKeyRec.destinationType == conf.PROPOSAL_CLASS_NAME:
            if reasonRec.proposalId != linkKeyRec.destinationId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='reasonRec.proposalId != linkKeyRec.destinationId' )
            # Retrieve proposal record, and check whether frozen
            proposalRec = proposal.Proposal.get_by_id( int(reasonRec.proposalId) )
            if not proposalRec:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='proposalRec is null' )
            if proposalRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

        elif linkKeyRec.destinationType == conf.REQUEST_CLASS_NAME:
            if reasonRec.requestId != linkKeyRec.destinationId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='reasonRec.requestId != linkKeyRec.destinationId' )
            # Retrieve request-for-proposals, and check whether frozen
            requestRec = requestForProposals.RequestForProposals.get_by_id( int(reasonRec.requestId) )
            if not requestRec:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='requestRec is null' )
            if requestRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

        else:
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey destinationType=' + linkKeyRec.destinationType )

        # Verify that proposal is editable
        if userId != reasonRec.creator:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NOT_OWNER )
        if not reasonRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.HAS_RESPONSES )

        # Retrieve any existing identical reason, to prevent duplicates
        existingReasons = reason.Reason.query( reason.Reason.requestId==reasonRec.requestId ,
            reason.Reason.proposalId==reasonRec.proposalId ,
            reason.Reason.proOrCon==reasonRec.proOrCon , reason.Reason.content==reasonContent ).fetch( 1 )
        if existingReasons:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.DUPLICATE )
        
        # Update reason record
        reasonRec.setContent( reasonContent )
        reasonRec.put()
        
        # Display reason.
        reasonDisplay = httpServer.reasonToDisplay( reasonRec, userId, proposal=proposalRec, request=requestRec )
        responseData.update(  { 'success':True, 'reason':reasonDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )


