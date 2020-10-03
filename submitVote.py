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
import reasonVote
import requestForProposals
import user
import text



class SubmitVote(webapp2.RequestHandler):

    @ndb.toplevel   # Ensure that proposal.incrementAsync() completes before finishing execution, but after http response is sent.
    def post(self):

        logging.debug( 'SubmitVote.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SubmitVote.post() inputData=' + str(inputData) )

        linkKeyStr = inputData['linkKey']
        reasonId = str( int( inputData['reasonId'] ) )
        voteUp = inputData['vote']
        browserCrumb = inputData['crumb']
        loginCrumb = inputData.get( 'crumbForLogin', '' )
        logging.debug( 'SubmitVote.post() linkKeyStr=' + str(linkKeyStr) + ' reasonId=' + str(reasonId) + ' voteUp=' + str(voteUp) + ' browserCrumb=' + str(browserCrumb) + ' loginCrumb=' + str(loginCrumb) )

        # User id from cookie, crumb...
        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Verify that linkKey matches request/proposal.
        linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyStr )
        if linkKeyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRec.destinationId is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey.destinationId=null' )
        logging.debug( 'SubmitVote.post() linkKeyRec=' + str(linkKeyRec) )

        if linkKeyRec.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check whether request/proposal is frozen
        if linkKeyRec.destinationType == conf.PROPOSAL_CLASS_NAME:
            # Retrieve proposal record
            proposalRec = proposal.Proposal.get_by_id( int(linkKeyRec.destinationId) )
            if not proposalRec:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='proposalRec is null' )
            if proposalRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        elif linkKeyRec.destinationType == conf.REQUEST_CLASS_NAME:
            # Retrieve request-for-proposals record
            requestRecord = requestForProposals.RequestForProposals.get_by_id( int(linkKeyRec.destinationId) )
            if not requestRecord:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='requestRecord is null' )
            if requestRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        else:
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + linkKeyRec.destinationType )

        # Retrieve reason record
        reasonRecord = reason.Reason.get_by_id( int(reasonId) )
        if reasonRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='reasonId not found' )
        logging.debug( 'reasonRecord=' + str(reasonRecord) )

        # Verify that reason belongs to linkKey's request/proposal
        isRequestForProposals = ( linkKeyRec.destinationType == conf.REQUEST_CLASS_NAME )
        if linkKeyRec.destinationType == conf.PROPOSAL_CLASS_NAME:
            if reasonRecord.proposalId != linkKeyRec.destinationId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='reasonRecord.proposalId != linkKeyRec.destinationId' )
        elif linkKeyRec.destinationType == conf.REQUEST_CLASS_NAME:
            if reasonRecord.requestId != linkKeyRec.destinationId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='reasonRecord.requestId != linkKeyRec.destinationId' )
        else:
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + linkKeyRec.destinationType )

        # Set vote, update vote count -- using transactions and retry.
        success, reasonRecordUpdated, voteRecord = reason.vote( 
            reasonRecord.requestId, reasonRecord.proposalId, reasonId, userId, voteUp, isRequestForProposals=isRequestForProposals )
        logging.debug( 'success=' + str(success) + ' reasonRecordUpdated=' + str(reasonRecordUpdated) + ' voteRecord=' + str(voteRecord) )
        if not success:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='reason.vote() success=false' )
        if reasonRecordUpdated is not None:  reasonRecord = reasonRecordUpdated
        
        # Display reason and votes.
        reasonDisplay = httpServer.reasonToDisplay( reasonRecord, userId )
        reasonDisplay['myVote'] =  voteRecord.voteUp and ( str(voteRecord.reasonId) == str(reasonRecord.key.id()) )
        responseData.update(  { 'success':success, 'reason':reasonDisplay }  )
        logging.debug( 'responseData=' + str(responseData) )
        
        httpServer.outputJson( cookieData, responseData, self.response )
        logging.debug( 'SubmitVote.post() done' )

        # Mark reason as not editable.
        if reasonRecord.allowEdit:
            reason.setEditable( reasonId, False )


# Route HTTP request
app = webapp2.WSGIApplication([
    ('/submitVote', SubmitVote)
])


