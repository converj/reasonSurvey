# Get all data associated with a single-page proposal, including reasons and votes.

# Import external modules
from google.appengine.datastore.datastore_query import Cursor
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
import text
import user


class TopReasons( webapp2.RequestHandler ):
    def get( self, linkKeyStr, proposalId ):

        if conf.isDev:  logging.debug( 'TopReasons.get() linkKeyStr=' + str(linkKeyStr) + ' proposalId=' + str(proposalId) )

        # Collect inputs
        preview = self.request.get('preview', None) is not None
        cursorPro = self.request.get( 'cursorPro', None )
        cursorPro = Cursor( urlsafe=cursorPro )  if cursorPro  else None
        cursorCon = self.request.get( 'cursorCon', None )
        cursorCon = Cursor( urlsafe=cursorCon )  if cursorCon  else None
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()

        # Retrieve top-level records
        ( linkKeyRecord, proposalRecord, requestRecord ) = retrieveRequestAndProposal( linkKeyStr, proposalId )
        if not linkKeyRecord:  return   # Bad link
        proposalId = str( proposalRecord.key.id() )

        # Retrieve reasons and vote, in parallel
        voteRecordsFuture = reasonVote.ReasonVote.query( reasonVote.ReasonVote.proposalId==proposalId, reasonVote.ReasonVote.userId==userId
            ).fetch_async()  if userId  else None
        maxReasonsPerType =  (conf.MAX_TOP_REASONS / 2)  if preview  else 10
        proRecordsFuture, conRecordsFuture = reason.retrieveTopReasonsAsync( proposalId, maxReasonsPerType, cursorPro=cursorPro, cursorCon=cursorCon )
        proRecords, cursorPro, morePros = proRecordsFuture.get_result()
        conRecords, cursorCon, moreCons = conRecordsFuture.get_result()
        cursorPro = cursorPro.urlsafe()  if cursorPro  else None
        cursorCon = cursorCon.urlsafe()  if cursorCon  else None
        voteRecords = voteRecordsFuture.get_result()  if voteRecordsFuture  else None

        # Filter/transform fields for display
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
        proposalDisp = httpServer.proposalToDisplay( proposalRecord, userId, requestRecord=requestRecord )
        reasonDisps = [ httpServer.reasonToDisplay(r, userId)  for r in (proRecords + conRecords) ]
        mergeReasonVotes( voteRecords, reasonDisps )

        # Store request/proposal to user's recent (cookie)
        user.storeRecentLinkKey( linkKeyStr, cookieData )

        # Display proposal data
        responseData = { 'success':True , 'linkKey':linkKeyDisplay , 'proposal':proposalDisp , 'reasons':reasonDisps ,
            'cursorPro':cursorPro , 'cursorCon':cursorCon }
        httpServer.outputJson( cookieData, responseData, self.response )



class SuggestReasons( webapp2.RequestHandler ):
    def post( self, linkKeyStr, proposalId ):

        if conf.isDev:  logging.debug( 'SuggestReasons.post() linkKeyStr=' + str(linkKeyStr) + ' proposalId=' + str(proposalId) )

        # Collect inputs
        inputData = json.loads( self.request.body )
        if conf.isDev:  logging.debug( 'SuggestReasons.post() inputData=' + str(inputData) )
        
        reasonStart = text.formTextToStored( inputData.get('content', '') )
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()
        
        if not reasonStart:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='Empty input' )

        # Retrieve top-level records
        ( linkKeyRecord, proposalRecord, requestRecord ) = retrieveRequestAndProposal( linkKeyStr, proposalId )
        if not linkKeyRecord:  return  # Bad link
        proposalId = str( proposalRecord.key.id() )
        if proposalRecord.freezeUserInput or ( requestRecord and requestRecord.freezeUserInput ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        # Retrieve reasons and vote, in parallel
        voteRecordsFuture = reasonVote.ReasonVote.query( reasonVote.ReasonVote.proposalId==proposalId, reasonVote.ReasonVote.userId==userId
            ).fetch_async()  if userId  else None
        reasonRecords = reason.retrieveTopReasonsForStart( proposalId, reasonStart )  # Retrieve reasons while vote-record is retrieving
        voteRecords = voteRecordsFuture.get_result()  if voteRecordsFuture  else None

        # Filter/transform fields for display
        reasonDisps = [ httpServer.reasonToDisplay(r, userId)  for r in reasonRecords ]
        mergeReasonVotes( voteRecords, reasonDisps )

        # Display proposal data
        responseData = { 'success':True , 'reasons':reasonDisps }
        httpServer.outputJson( cookieData, responseData, self.response )


# Returns records, or sends error-response
def retrieveRequestAndProposal( linkKeyStr, proposalId ):
    # Retrieve and check linkKey
    linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
    requestId = None
    if linkKeyRecord is None:
        if conf.isDev:  logging.debug( 'retrieveRequestAndProposal() linkKeyRecord is None' )
        httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        return ( None, None, None )
    elif linkKeyRecord.destinationType == conf.PROPOSAL_CLASS_NAME:
        proposalId = linkKeyRecord.destinationId
    elif linkKeyRecord.destinationType == conf.REQUEST_CLASS_NAME:
        requestId = linkKeyRecord.destinationId

    if ( not proposalId ) and ( not requestId ):
        if conf.isDev:  logging.debug( 'retrieveRequestAndProposal() linkKeyRecord has unhandled destinationType=' + str(linkKeyRecord.destinationType) )
        httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        return ( None, None, None )

    # Retrieve proposal-record
    proposalRecord = proposal.Proposal.get_by_id( int(proposalId) )
    if conf.isDev:  logging.debug( 'retrieveRequestAndProposal() proposalRecord=' + str(proposalRecord) )
    # Enfoce that proposal must come from request from link-key
    if ( proposalRecord.requestId != requestId ):
        if conf.isDev:  logging.debug( 'retrieveRequestAndProposal() proposalRecord.requestId=' + str(proposalRecord.requestId) + '  !=  requestId=' + str(requestId) )
        httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        return ( None, None, None )

    # Retrieve request-for-proposals record, to check frozen state
    requestRecord = requestForProposals.RequestForProposals.get_by_id( int(requestId) )  if requestId  else None
    return ( linkKeyRecord, proposalRecord, requestRecord )


def mergeReasonVotes( voteRecords, reasonDisps ):
    # Sets myVote-field in every reason-display
    # For each reason... lookup user vote, set reason.myVote
    reasonToVoteRec = { v.reasonId:v for v in voteRecords }  if voteRecords  else {}  # There should be only 1 vote-record per proposal
    for reasonDisplay in reasonDisps:
        voteRecord = reasonToVoteRec.get( reasonDisplay['id'] )
        reasonDisplay['myVote'] =  voteRecord and voteRecord.voteUp



# Route HTTP request
app = webapp2.WSGIApplication( [
    ( r'/topReasons/([0-9A-Za-z]+)()' , TopReasons ) ,   # Use empty-parentheses to ensure 2 arguments are sent to handler
    ( r'/topReasons/([0-9A-Za-z]+)/(\d+)' , TopReasons ) ,
    ( r'/suggestReasons/([0-9A-Za-z]+)()' , SuggestReasons ) ,
    ( r'/suggestReasons/([0-9A-Za-z]+)/(\d+)' , SuggestReasons ) ,
] )


