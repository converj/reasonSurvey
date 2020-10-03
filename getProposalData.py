# Get all data associated with a single-page proposal, including reasons and votes.

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


class GetProposalData(webapp2.RequestHandler):
    def get( self, linkKeyStr, proposalId ):

        logging.debug( 'getProposalData.GetProposalData() linkKeyStr=' + linkKeyStr + ' proposalId=' + str(proposalId) )

        # Collect inputs.
        onlyTopReasons = ( self.request.get( 'onlyTop', None ) == 'true' )
        logging.debug( 'onlyTopReasons=' + str(onlyTopReasons) )

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()

        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        requestId = None
        if linkKeyRecord is None:
            logging.debug( 'linkKeyRecord is None' )
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        elif linkKeyRecord.destinationType == conf.PROPOSAL_CLASS_NAME:
            proposalId = linkKeyRecord.destinationId
        elif linkKeyRecord.destinationType == conf.REQUEST_CLASS_NAME:
            requestId = linkKeyRecord.destinationId
        else:
            logging.debug( 'linkKeyRecord has unhandled destinationType=' + str(linkKeyRecord.destinationType) )
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )

        # Retrieve Proposal by id, filter/transform fields for display.
        proposalRecord = proposal.Proposal.get_by_id( int(proposalId) )
        logging.debug( 'GetProposalData() proposalRecord=' + str(proposalRecord) )
        if proposalRecord.requestId != requestId:
            logging.debug( 'proposalRecord.requestId=' + str(proposalRecord.requestId) + '  !=  requestId=' + str(requestId) )
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )

# Retrieve request-for-proposals record, to check frozen state
        requestRecord = requestForProposals.RequestForProposals.get_by_id( int(requestId) )  if requestId  else None
        
        proposalDisp = httpServer.proposalToDisplay( proposalRecord, userId, requestRecord=requestRecord )
        logging.debug( 'GetProposalData() proposalDisp=' + str(proposalDisp) )

        # Prepare parallel retrieve reasons, with votes.
        if onlyTopReasons:
            reasonRecordsFutures = reason.retrieveTopReasonsAsync( proposalId, conf.MAX_TOP_REASONS )
        else:
            reasonRecordsFutures = [ reason.Reason.query( reason.Reason.proposalId==proposalId ).fetch_async() ]

        # If userId exists... retrieve user's ReasonVotes by KeyProperty proposalId x userId.
        voteRecordsFuture = reasonVote.ReasonVote.query( reasonVote.ReasonVote.proposalId==proposalId, reasonVote.ReasonVote.userId==userId ).fetch_async() if userId  else None

        # Run parallel retrieval.  Filter/transform fields for display.
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
        logging.debug( 'GetProposalData() linkKeyDisplay=' + str(linkKeyDisplay) )
        
        reasonRecords = reason.fetchReasonRecordsFutures( reasonRecordsFutures )
        logging.debug( 'GetProposalData() reasonRecords=' + str(reasonRecords) )

        reasonDisps = [ httpServer.reasonToDisplay(r, userId)  for r in reasonRecords ]
        logging.debug( 'GetProposalData() reasonDisps=' + str(reasonDisps) )

        voteRecords = voteRecordsFuture.get_result() if voteRecordsFuture  else None
        logging.debug( 'GetProposalData() voteRecords=' + str(voteRecords) )

        # For each reason... lookup user vote ... set reason.myVote
        reasonToVoteRec = { v.reasonId:v for v in voteRecords } if voteRecords  else {}
        logging.debug( 'GetProposalData() reasonToVoteRec=' + str(reasonToVoteRec) )

        for r in reasonDisps:
            voteRec = reasonToVoteRec.get( r['id'] )
            r['myVote'] = voteRec.voteUp if voteRec  else False

        # Store proposal to user's recent (cookie).
        user.storeRecentLinkKey( linkKeyStr, cookieData )

        # Display proposal data.
        responseData = {
            'success':True,
            'linkKey': linkKeyDisplay,
            'proposal':proposalDisp,
            'reasons':reasonDisps,
        }
        logging.debug( 'GetProposalData() responseData=' + json.dumps(responseData, indent=4, separators=(', ' , ':')) )
        httpServer.outputJson( cookieData, responseData, self.response )


class GetProposalDataForSingleProp( GetProposalData ):
    def get( self, linkKeyStr ):
        GetProposalData.get( self, linkKeyStr, None )


# Route HTTP request
app = webapp2.WSGIApplication( [
    ( r'/getProposalData/([0-9A-Za-z]+)' , GetProposalDataForSingleProp ),
    ( r'/getProposalData/([0-9A-Za-z]+)/(\d+)' , GetProposalData )
] )


