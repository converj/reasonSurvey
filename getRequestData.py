# Get all data associated with a request-for-proposals, including proposals, reasons, and votes.

# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
from configuration import const as conf
import constants
import httpServer
import linkKey
import proposal
import reason
import reasonVote
import requestForProposals
import user


const = constants.Constants()
const.INITIAL_MAX_PROPOSALS = 10


class GetRequestData(webapp2.RequestHandler):
    def get( self, linkKeyStr ):
        logging.debug( 'linkKeyStr=' + linkKeyStr )

        # Collect inputs.
        maxProposals = int( self.request.get( 'maxProposals', const.INITIAL_MAX_PROPOSALS ) )
        logging.debug( 'maxProposals=' + str(maxProposals) )

        getReasons = ( self.request.get( 'getReasons', 'true' ) == 'true' )
        logging.debug( 'getReasons=' + str(getReasons) )

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()

        # Retrieve requestId from linkKey.  destinationType must be RequestForProposals.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        logging.debug( 'GetRequestData.get() linkKeyRecord=' + str(linkKeyRecord) )

        if (linkKeyRecord == None) or (linkKeyRecord.destinationType != conf.REQUEST_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )

        # Retrieve RequestForProposal by id, filter/transform fields for display.
        requestId = linkKeyRecord.destinationId
        requestRecordFuture = requestForProposals.RequestForProposals.get_by_id_async( int(requestId) )

        requestRecord = requestRecordFuture.get_result()  if requestRecordFuture  else None

        logging.debug( 'GetRequestData.get() userId=' + str(userId) + ' requestRecord.creator=' + str(requestRecord.creator) )

        # If userId exists... async-retrieve user's ReasonVotes by KeyProperty requestId x userId.
        voteRecordsFuture = None
        if getReasons and userId:
            voteRecordsFuture = reasonVote.ReasonVote.query( 
                reasonVote.ReasonVote.requestId==requestId, reasonVote.ReasonVote.userId==userId ).fetch_async()

        # Retrieve Proposals by KeyProperty requestId.
        # Get all data up to current page maximum length.  + Refreshes earlier proposal data.
        proposalRecords = proposal.Proposal.query( proposal.Proposal.requestId==requestId 
            ).order( -proposal.Proposal.netPros ).fetch( maxProposals )
        # Ensure records are sorted, since datastore may not return them in order
        proposalRecords = sorted( proposalRecords , key=lambda r:-r.netPros )

        # Async-retrieve top N reasons per proposal, equal number of pro/con reasons.
        # Requires waiting to retrieve all proposals.
        # Replace with reason.retrieveTopReasonsAsync()
        reasonRecordsFutures = []
        if getReasons:
            for proposalRec in proposalRecords:
                proposalId = str( proposalRec.key.id() )

                reasonRecordsFuture = reason.Reason.query( reason.Reason.proposalId==proposalId,
                    reason.Reason.proOrCon==conf.PRO ).order( -reason.Reason.score ).fetch_async( conf.MAX_TOP_REASONS / 2 )
                reasonRecordsFutures.append( reasonRecordsFuture )

                reasonRecordsFuture = reason.Reason.query( reason.Reason.proposalId==proposalId,
                    reason.Reason.proOrCon==conf.CON ).order( -reason.Reason.score ).fetch_async( conf.MAX_TOP_REASONS / 2 )
                reasonRecordsFutures.append( reasonRecordsFuture )

        # Wait for parallel retrievals.
        # Replace with reason.fetchReasonRecordsFutures()
        logging.debug( 'GetRequestData.get() requestRecord=' + str(requestRecord) )

        reasonRecords = []
        for reasonRecordsFuture in reasonRecordsFutures:
            reasonRecordsForProp = reasonRecordsFuture.get_result()
            logging.debug( 'GetRequestData.get() reasonRecordsForProp=' + str(reasonRecordsForProp) )
            reasonRecords.extend( reasonRecordsForProp )
        reasonRecords = sorted( reasonRecords , key=lambda r:-r.score )
        logging.debug( 'GetRequestData.get() reasonRecords=' + str(reasonRecords) )

        voteRecords = []
        if getReasons:
            voteRecords = voteRecordsFuture.get_result() if voteRecordsFuture  else None
        logging.debug( 'GetRequestData.get() voteRecords=' + str(voteRecords) )
        
        # Transform records for display.
        linkKeyDisp = httpServer.linkKeyToDisplay( linkKeyRecord )
        logging.debug( 'GetRequestData.get() linkKeyDisp=' + str(linkKeyDisp) )

        requestDisp = httpServer.requestToDisplay( requestRecord, userId )
        logging.debug( 'GetRequestData.get() requestDisp=' + str(requestDisp) )
        
        proposalDisps = [ httpServer.proposalToDisplay(p, userId)  for p in proposalRecords ]
        logging.debug( 'GetRequestData.get() proposalDisps=' + str(proposalDisps) )

        reasonDisps = [ httpServer.reasonToDisplay(r, userId)  for r in reasonRecords ]
        logging.debug( 'GetRequestData.get() reasonDisps=' + str(reasonDisps) )

        # For each reason... collect user vote in reason.myVote
        reasonToVoteRec = { v.reasonId:v for v in voteRecords }  if voteRecords  else { }
        logging.debug( 'GetRequestData.get() reasonToVoteRec=' + str(reasonToVoteRec) )

        for r in reasonDisps:
            voteRec = reasonToVoteRec.get( r['id'] )
            r['myVote'] = voteRec.voteUp if voteRec  else False

        # Store request to user's recent requests (cookie).
        user.storeRecentLinkKey( linkKeyStr, cookieData )

        # Display request data.
        responseData = {
            'success':True,
            'linkKey':linkKeyDisp,
            'request':requestDisp,
            'proposals':proposalDisps,
            'reasons':reasonDisps,
            'maxProposals': maxProposals,
        }
        logging.debug( 'GetRequestData.get() responseData=' + json.dumps(responseData, indent=4, separators=(', ' , ':')) )
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication( [
    webapp2.Route( r'/getRequestData/<linkKeyStr:[0-9A-Za-z]+>' , handler=GetRequestData )
] )


