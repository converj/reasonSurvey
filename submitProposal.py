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
import proposal
import reason
import requestForProposals
import secrets
import text
from text import LogMessage
import user



class SubmitNewProposal(webapp2.RequestHandler):

    def post(self):

        logging.debug(LogMessage('SubmitNewProposal', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'requestLogId':requestLogId }
        inputData = json.loads( self.request.body )
        logging.debug(LogMessage('SubmitNewProposal', 'inputData=', inputData))

        title = text.formTextToStored( inputData.get('title', '') )
        detail = text.formTextToStored( inputData.get('detail', '') )
        loginRequired = bool( inputData.get('loginRequired', False) )
        experimentalPassword = inputData.get( 'experimentalPassword', None )
        hideReasons = bool( inputData.get('hideReasons', False) )
        browserCrumb = inputData.get( 'crumb', '' )
        loginCrumb = inputData.get( 'crumbForLogin', '' )

        logging.debug(LogMessage('SubmitNewProposal', 'title=', title, 'detail=', detail, 'browserCrumb=', browserCrumb, 'loginCrumb=', loginCrumb, 'loginRequired=', loginRequired, 'hideReasons=', hideReasons))

        # Voter login not required to create initial proposal, though login may be required to use proposal
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response, loginRequired=loginRequired )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Check proposal length
        if not httpServer.isLengthOk( title, detail, conf.minLengthProposal ):  return httpServer.outputJson( responseData, self.response, errorMessage=conf.TOO_SHORT )

        # Check experimental password (low-risk secret)
        if ( hideReasons or loginRequired or experimentalPassword )  and  ( experimentalPassword != secrets.experimentalPassword ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.EXPERIMENT_NOT_AUTHORIZED )

        # No need to prevent duplicates, because this is a top-level single proposal
        
        # Construct new proposal record
        proposalRecord = proposal.Proposal( creator=userId , allowEdit=True , hideReasons=hideReasons )
        proposalRecord.setContent( title, detail )
        # Store proposal record
        proposalRecordKey = proposalRecord.put()
        logging.debug(LogMessage('SubmitNewProposal', 'proposalRecordKey.id=', proposalRecordKey.id()))
        proposalId = str( proposalRecordKey.id() )

        if proposalRecord.hideReasons:
            # Store empty pro/con-reasons
            emptyProKey = reason.Reason( proposalId=proposalId , creator=userId , 
                proOrCon=conf.PRO , content=None , allowEdit=False )
            emptyConKey = reason.Reason( proposalId=proposalId , creator=userId ,
                proOrCon=conf.CON , content=None , allowEdit=False )
            # Update empty-reason-ids in proposal-record
            proposalRecord = proposalRecordKey.get()
            proposalRecord.emptyProId = str( emptyProKey.put().id() )
            proposalRecord.emptyConId = str( emptyConKey.put().id() )
            proposalRecord.put()

        # Construct and store link key
        proposalLinkKeyRecord = httpServer.createAndStoreLinkKey( conf.PROPOSAL_CLASS_NAME, proposalId, loginRequired, cookieData )

        # Display proposal
        linkKeyDisplay = httpServer.linkKeyToDisplay( proposalLinkKeyRecord )
        proposalDisplay = httpServer.proposalToDisplay( proposalRecord, userId )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'proposal':proposalDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class SubmitNewProposalForRequest(webapp2.RequestHandler):

    def post(self):

        logging.debug(LogMessage('SubmitNewProposalForRequest', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'requestLogId':requestLogId }
        inputData = json.loads( self.request.body )
        logging.debug(LogMessage('SubmitNewProposalForRequest', 'inputData=', inputData))

        requestLinkKeyStr = inputData['requestId']
        title = text.formTextToStored( inputData['title'] )
        detail = text.formTextToStored( inputData['detail'] )
        initialReason1 = text.formTextToStored( inputData.get( 'initialReason1', None ) )
        initialReason2 = text.formTextToStored( inputData.get( 'initialReason2', None ) )
        initialReason3 = text.formTextToStored( inputData.get( 'initialReason3', None ) )
        browserCrumb = inputData['crumb']
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug(LogMessage('SubmitNewProposalForRequest', 'requestLinkKeyStr=', requestLinkKeyStr, 'title=', title, 'detail=', detail, 'browserCrumb=', browserCrumb, 'loginCrumb=', loginCrumb))

        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Check proposal length
        if not httpServer.isLengthOk( title, detail, conf.minLengthProposal ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )
        initialReasons = [ r for r in [ initialReason1, initialReason2, initialReason3 ] if r is not None ]
        for initialReason in initialReasons:
            if initialReason is not None and not httpServer.isLengthOk( initialReason, None, conf.minLengthReason ):  httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.REASON_TOO_SHORT );  return;

        # Retrieve link-key record, and convert it to requestId
        if requestLinkKeyStr is None:  httpServer.outputJson( cookieData, responseData, self.response, errorMessage='requestLinkKeyStr is null');  return;
        requestLinkKeyRec = linkKey.LinkKey.get_by_id( requestLinkKeyStr )
        logging.debug(LogMessage('SubmitNewProposalForRequest', 'requestLinkKeyRec=', requestLinkKeyRec))

        if requestLinkKeyRec is None:  httpServer.outputJson( cookieData, responseData, self.response, errorMessage='requestLinkKey not found' );  return;
        if requestLinkKeyRec.destinationType != conf.REQUEST_CLASS_NAME:  httpServer.outputJson( cookieData, responseData, self.response, errorMessage='requestLinkKey not a request' );  return;
        requestId = requestLinkKeyRec.destinationId

        if requestLinkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Retrieve request-for-proposals record
        requestRec = requestForProposals.RequestForProposals.get_by_id( int(requestId) )
        if not requestRec:  return

        # Check whether request-for-proposals is frozen
        if requestRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )
        
        # Retrieve any existing identical proposal, to prevent duplicates
        existingProposals = proposal.Proposal.query( proposal.Proposal.requestId==requestId ,
            proposal.Proposal.title==title , proposal.Proposal.detail==detail ).fetch( 1 )
        if existingProposals:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.DUPLICATE )

        # Construct new proposal record
        hasReasons = ( 0 < len(initialReasons) )
        proposalRecord = proposal.Proposal( requestId=requestId, creator=userId, allowEdit=(not hasReasons) )
        proposalRecord.setContent( title, detail )
        # Store proposal record
        proposalRecordKey = proposalRecord.put()
        proposalId = str( proposalRecordKey.id() )
        logging.debug(LogMessage('SubmitNewProposalForRequest', 'proposalRecordKey.id=', proposalRecordKey.id()))

        # Store initial reasons
        reasonDisplays = []
        if requestRec.hideReasons:
            # Store empty pro/con-reasons
            emptyProRecord = reason.Reason( requestId=requestId , proposalId=proposalId , creator=userId , 
                proOrCon=conf.PRO , content=None , allowEdit=False )
            emptyConRecord = reason.Reason( requestId=requestId , proposalId=proposalId , creator=userId ,
                proOrCon=conf.CON , content=None , allowEdit=False )
            # Update empty-reason-ids in proposal-record
            proposalRecord = proposalRecordKey.get()
            proposalRecord.emptyProId = str( emptyProRecord.put().id() )
            proposalRecord.emptyConId = str( emptyConRecord.put().id() )
            proposalRecord.put()

            reasonDisplays.append(  httpServer.reasonToDisplay( emptyProRecord, userId )  )
            reasonDisplays.append(  httpServer.reasonToDisplay( emptyConRecord, userId )  )

        else:
            # For each initial reason...
            for initialReason in initialReasons:
                # Construct new reason record.
                reasonRecord = reason.Reason( requestId=requestId , proposalId=proposalId , creator=userId , proOrCon= conf.PRO , allowEdit=True )
                reasonRecord.setContent( initialReason )
                # Store reason record.
                reasonRecordKey = reasonRecord.put()
                logging.debug(LogMessage('SubmitNewProposalForRequest', 'reasonRecordKey', reasonRecordKey))

                # Convert reason for display.
                reasonDisplays.append(  httpServer.reasonToDisplay( reasonRecord, userId )  )

        # Display proposal.
        proposalDisplay = httpServer.proposalToDisplay( proposalRecord, userId, requestRecord=requestRec )
        responseData.update(  { 'success':True, 'proposal':proposalDisplay, 'reasons':reasonDisplays }  )
        httpServer.outputJson( cookieData, responseData, self.response )

        # Mark request-for-proposals as not editable.
        if ( requestRec.allowEdit ):
            requestForProposals.setEditable( requestId, False )


class SubmitEditProposal(webapp2.RequestHandler):

    def post(self):
        logging.debug(LogMessage('SubmitEditProposal', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug(LogMessage('SubmitEditProposal', 'inputData=', inputData))

        title = text.formTextToStored( inputData['title'] )
        detail = text.formTextToStored( inputData['detail'] )
        linkKeyString = inputData['linkKey']
        proposalId = str( int( inputData['proposalId'] ) )
        browserCrumb = inputData['crumb']
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug(LogMessage('SubmitEditProposal', 'title=', title, 'detail=', detail, 'browserCrumb=', browserCrumb, 'loginCrumb=', loginCrumb, 'linkKeyString=', linkKeyString, 'proposalId=', proposalId))

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Check proposal length
        if not httpServer.isLengthOk( title, detail, conf.minLengthProposal ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )

        # Require link-key.
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug(LogMessage('SubmitEditProposal', 'linkKeyRec=', linkKeyRec))

        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Retrieve proposal record.
        proposalRec = proposal.Proposal.get_by_id( int(proposalId) )
        logging.debug(LogMessage('SubmitEditProposal', 'proposalRec=', proposalRec))

        if proposalRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='proposal not found' )

        # Verify that proposal matches link-key, and is not frozen
        requestRec = None
        if linkKeyRec.destinationType == conf.REQUEST_CLASS_NAME:
            if proposalRec.requestId != linkKeyRec.destinationId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='proposalRec.requestId != linkKeyRec.destinationId' )

            # Retrieve request-for-proposals to check whether it is frozen
            requestRec = requestForProposals.RequestForProposals.get_by_id( int(proposalRec.requestId) )
            if requestRec == None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='requestRec is null' )
            if requestRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        elif linkKeyRec.destinationType == conf.PROPOSAL_CLASS_NAME:
            if proposalId != linkKeyRec.destinationId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='proposalId != linkKeyRec.destinationId' )
            # Check whether proposal is frozen
            if proposalRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        else:
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + str(linkKeyRec.destinationType) )

        # Verify that proposal is editable
        if userId != proposalRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )
        if not proposalRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.HAS_RESPONSES )

        # Retrieve any existing identical proposal, to prevent duplicates
        existingProposals = proposal.Proposal.query( proposal.Proposal.requestId==proposalRec.requestId ,
            proposal.Proposal.title==title , proposal.Proposal.detail==detail ).fetch( 1 )
        if existingProposals:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.DUPLICATE )

        # Update proposal record.
        proposalRec.setContent( title, detail )
        proposalRec.put()
        
        # Display updated proposal.
        proposalDisplay = httpServer.proposalToDisplay( proposalRec, userId, requestRecord=requestRec )
        responseData.update(  { 'success':True, 'proposal':proposalDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )


class SubmitFreezeProposal(webapp2.RequestHandler):

    def post(self):
        logging.debug(LogMessage('SubmitFreezeProposal', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug(LogMessage('SubmitFreezeProposal', 'inputData=', inputData))

        freeze = bool( inputData.get('freezeUserInput', False) )
        linkKeyString = inputData['linkKey']
        proposalId = int( inputData['proposalId'] )
        logging.debug(LogMessage('SubmitFreezeProposal', 'freeze=', freeze, 'linkKeyString=', linkKeyString, 'proposalId=', proposalId))

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve link-key record
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug(LogMessage('SubmitFreezeProposal', 'linkKeyRec=', linkKeyRec))

        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Verify that proposal matches link-key
        if linkKeyRec.destinationType != conf.PROPOSAL_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + str(linkKeyRec.destinationType) )

        if str(proposalId) != linkKeyRec.destinationId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='proposalId != linkKeyRec.destinationId' )

        # Retrieve proposal record
        proposalRec = proposal.Proposal.get_by_id( proposalId )
        logging.debug(LogMessage('SubmitFreezeProposal', 'proposalRec=', proposalRec))

        if proposalRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='proposal not found' )

        # Verify that user is creator
        if userId != proposalRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )

        # Update proposal record.
        proposalRec.freezeUserInput = freeze
        proposalRec.put()
        
        # Display updated proposal.
        proposalDisplay = httpServer.proposalToDisplay( proposalRec, userId )
        responseData.update(  { 'success':True, 'proposal':proposalDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication([
    ('/newProposal', SubmitNewProposal),
    ('/newProposalForRequest', SubmitNewProposalForRequest),
    ('/editProposal', SubmitEditProposal) ,
    ('/freezeProposal', SubmitFreezeProposal)
])


