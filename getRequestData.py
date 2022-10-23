# Get all data associated with a request-for-proposals, including proposals, reasons, and votes.

# Import external modules
from google.appengine.datastore.datastore_query import Cursor
from google.appengine.ext import ndb
import json
import logging
import os
# Import app modules
from configuration import const as conf
import constants
import httpServer
from httpServer import app
import linkKey
import proposal
import reason
import reasonVote
import requestForProposals
import text
import user


const = constants.Constants()
const.INITIAL_MAX_PROPOSALS = 10



@app.get( r'/getRequestData/<alphanumeric:linkKeyStr>' )
def getRequestData( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()
        if conf.isDev:  logging.debug( 'getRequestData() linkKeyStr=' + str(linkKeyStr) )

        # Collect inputs
        cursor = httpRequest.getUrlParam( 'cursor', None )
        cursor = Cursor( urlsafe=cursor )  if cursor  else None
        getReasons = ( httpRequest.getUrlParam( 'getReasons', 'true' ) == 'true' )
        if conf.isDev:  logging.debug( 'getRequestData() getReasons=' + str(getReasons) )

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()

        # Retrieve requestId from linkKey.  destinationType must be RequestForProposals.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if conf.isDev:  logging.debug( 'GetRequestData.get() linkKeyRecord=' + str(linkKeyRecord) )

        if (linkKeyRecord == None) or (linkKeyRecord.destinationType != conf.REQUEST_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )

        # Retrieve RequestForProposal by id, filter/transform fields for display.
        requestId = linkKeyRecord.destinationId
        requestRecordFuture = requestForProposals.RequestForProposals.get_by_id_async( int(requestId) )

        requestRecord = requestRecordFuture.get_result()  if requestRecordFuture  else None

        if conf.isDev:  logging.debug( 'GetRequestData.get() userId=' + str(userId) + ' requestRecord.creator=' + str(requestRecord.creator) )

        # If userId exists... async-retrieve user's ReasonVotes by KeyProperty requestId x userId.
        voteRecordsFuture = None
        if getReasons and userId:
            voteRecordsFuture = reasonVote.ReasonVote.query( 
                reasonVote.ReasonVote.requestId==requestId, reasonVote.ReasonVote.userId==userId ).fetch_async()

        # Retrieve Proposals by KeyProperty requestId
        # Get all data up to current page maximum length.  + Refreshes earlier proposal data.
        maxProposals = const.INITIAL_MAX_PROPOSALS
        proposalRecords, cursor, hasMore = proposal.retrieveTopProposals( requestId, maxProposals, cursor=cursor )
        cursor = text.toUnicode(cursor.urlsafe())  if cursor  else None

        # Async-retrieve top N reasons per proposal, equal number of pro/con reasons
        reasonRecordsFutures = []
        if getReasons:
            for proposalRec in proposalRecords:
                maxReasonsPerType = conf.MAX_TOP_REASONS / 2
                proRecordsFuture, conRecordsFuture = reason.retrieveTopReasonsAsync( proposalRec.key.id() , maxReasonsPerType )
                reasonRecordsFutures.append( proRecordsFuture )
                reasonRecordsFutures.append( conRecordsFuture )

        # Wait for parallel retrievals
        if conf.isDev:  logging.debug( 'GetRequestData.get() requestRecord=' + str(requestRecord) )

        reasonRecords = []
        for reasonRecordsFuture in reasonRecordsFutures:
            reasonRecordsForProp, cursor, hasMore = reasonRecordsFuture.get_result()
            if conf.isDev:  logging.debug( 'GetRequestData.get() reasonRecordsForProp=' + str(reasonRecordsForProp) )
            reasonRecords.extend( reasonRecordsForProp )
        reasonRecords = sorted( reasonRecords , key=lambda r:-r.score )
        if conf.isDev:  logging.debug( 'GetRequestData.get() reasonRecords=' + str(reasonRecords) )

        voteRecords =  voteRecordsFuture.get_result()  if voteRecordsFuture  else []
        if conf.isDev:  logging.debug( 'GetRequestData.get() voteRecords=' + str(voteRecords) )
        
        # Transform records for display.
        linkKeyDisp = httpServer.linkKeyToDisplay( linkKeyRecord )
        if conf.isDev:  logging.debug( 'GetRequestData.get() linkKeyDisp=' + str(linkKeyDisp) )

        requestDisp = httpServer.requestToDisplay( requestRecord, userId )
        if conf.isDev:  logging.debug( 'GetRequestData.get() requestDisp=' + str(requestDisp) )
        
        proposalDisps = [ httpServer.proposalToDisplay(p, userId, requestRecord=requestRecord)  for p in proposalRecords ]
        if conf.isDev:  logging.debug( 'GetRequestData.get() proposalDisps=' + str(proposalDisps) )

        proposalIdToRecord = { p.key.id() : p  for p in proposalRecords }
        reasonDisps = [ httpServer.reasonToDisplay(r, userId, proposal=proposalIdToRecord.get(r.proposalId, None), request=requestRecord)  for r in reasonRecords ]
        if conf.isDev:  logging.debug( 'GetRequestData.get() reasonDisps=' + str(reasonDisps) )

        # For each reason... collect user vote in reason.myVote
        reasonToVoteRec = { v.reasonId:v for v in voteRecords }  if voteRecords  else { }
        if conf.isDev:  logging.debug( 'GetRequestData.get() reasonToVoteRec=' + str(reasonToVoteRec) )

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
            'cursor': cursor ,
        }
        if conf.isDev:  logging.debug( 'GetRequestData.get() responseData=' + json.dumps(responseData, indent=4, separators=(', ' , ':')) )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



# Use POST to keep user-input private
@app.post( r'/suggestProposals/<alphanumeric:linkKeyStr>' )
def suggestProposals( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()
        if conf.isDev:  logging.debug( 'getRequestData() linkKeyStr=' + str(linkKeyStr) )

        # Collect inputs
        inputData = httpRequest.postJsonData()
        if conf.isDev:  logging.debug( 'SuggestReasons.post() inputData=' + str(inputData) )
        content = text.formTextToStored( inputData.get('content', '') )

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()

        if not content:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Empty input' )

        # Retrieve link-record
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord == None) or (linkKeyRecord.destinationType != conf.REQUEST_CLASS_NAME):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        requestId = linkKeyRecord.destinationId

        # Retrieve RequestForProposal
        requestRecord = requestForProposals.RequestForProposals.get_by_id( int(requestId) )
        if requestRecord and ( requestRecord.freezeUserInput or requestRecord.freezeNewProposals ):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

        # Retrieve Proposals
        proposalRecords = proposal.retrieveTopProposalsForStart( requestRecord.key.id() , content )

        linkKeyDisp = httpServer.linkKeyToDisplay( linkKeyRecord )
        requestDisp = httpServer.requestToDisplay( requestRecord, userId )
        proposalDisps = [ httpServer.proposalToDisplay(p, userId, requestRecord=requestRecord)  for p in proposalRecords ]

        # Display
        responseData = { 'success':True , 'linkKey':linkKeyDisp , 'request':requestDisp , 'proposals':proposalDisps }
        return httpServer.outputJson( cookieData, responseData, httpResponse )



