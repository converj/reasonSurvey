# Import external modules
from collections import defaultdict, namedtuple
from google.appengine.ext import ndb
import json
import logging
import os
# Import app modules
from budget.configBudget import const as conf
from budget import budget
from budget import slice
import httpServer
from httpServer import app
from budget import httpServerBudget
import linkKey
import text
import user


# Use POST (versus GET) to keep user-input private
@app.post( r'/budget/slicesForPrefix/<alphanumeric:linkKeyStr>' )
def slicesForPrefix( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        inputData = httpRequest.postJsonData()
        logging.debug(('SliceSizeReasons', 'inputData=', inputData))
        title = budget.standardizeContent( inputData.get( 'title', '' ) )
        reason = budget.standardizeContent( inputData.get( 'reason', '' ) )
        logging.debug(('SlicesForPrefix', 'title=', title, 'reason=', reason, 'linkKeyStr=', linkKeyStr))

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive, and part of a write flow
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Check that budget is not frozen, to reduce the cost of unnecessary search
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='budget is null' )
        if budgetRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )

        # Retrieve best suggested slices for this slice-start
        sliceStart = ' '.join(  [ title if title else '' , reason if reason else '' ]  )
        slicesOrdered = slice.retrieveTopSlicesByScoreForStart( budgetId, sliceStart, hideReasons=budgetRecord.hideReasons )
        logging.debug(('SlicesForPrefix', 'slicesOrdered=', slicesOrdered))

        sliceDisplays = [ httpServerBudget.sliceToDisplay(a, userId) for a in slicesOrdered ]

        # Display slices data
        responseData.update(  { 'success':True , 'slices':sliceDisplays }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



SliceAndSums = namedtuple( 'SliceAndSums', 'record sumBelow sumAbove' )

# Use POST (versus GET) to keep user-input private
@app.post( r'/budget/sliceSizeReasons/<alphanumeric:linkKeyStr>' )
def sliceSizeReasons( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        inputData = httpRequest.postJsonData()
        logging.debug(('SliceSizeReasons', 'inputData=', inputData))
        title = budget.standardizeContent( inputData.get( 'title', '' ) )
        size = int( inputData.get('size', 0) )
        logging.debug(('SliceSizeReasons', 'title=', title, 'size=', size, 'linkKeyStr=', linkKeyStr))

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()

        if not title:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='title is null' )
        if not size:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='size is null' )
        if ( size < conf.SLICE_SIZE_MIN ) or ( conf.SLICE_SIZE_MAX < size ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Size out of bounds' )
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive, and part of a write flow
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Check that budget is not frozen, to reduce the cost of unnecessary search
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='budget is null' )
        if budgetRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.FROZEN )
        if budgetRecord.hideReasons:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='reasons hidden' )

        # Retrieve top-scoring slice-reasons for title
        slicesByScore = slice.retrieveTopSliceReasonsByScore( budgetId, title, maxSlices=10 )
        logging.debug(('SliceSizeReasons', 'slicesByScore=', slicesByScore))

        # For each slice... sum scores across sizes
        slicesAndSums = [  SliceAndSums( s, s.sumScoreBelowSize(size), s.sumScoreAboveSize(size) )  for s in slicesByScore ]
        logging.debug(('SliceSizeReasons', 'slicesAndSums=', slicesAndSums))
        # Each slice can only have a score-sum below or above, not both
        slicesAndSumsExclusive = [ ]
        for s in slicesAndSums:
            if   ( s.sumAbove < s.sumBelow ):  slicesAndSumsExclusive.append( SliceAndSums(s.record, s.sumBelow, 0) )
            elif ( s.sumBelow < s.sumAbove ):  slicesAndSumsExclusive.append( SliceAndSums(s.record, 0, s.sumAbove) )
        logging.debug(('SliceSizeReasons', 'slicesAndSumsExclusive=', slicesAndSumsExclusive))

        # Find slice with most votes below/above size
        sliceBelow = max( slicesAndSumsExclusive, key=lambda s: s.sumBelow )  if slicesAndSumsExclusive  else None
        sliceAbove = max( slicesAndSumsExclusive, key=lambda s: s.sumAbove )  if slicesAndSumsExclusive  else None
        if sliceBelow and ( sliceBelow.sumBelow <= 0 ):  sliceBelow = None
        if sliceAbove and ( sliceAbove.sumAbove <= 0 ):  sliceAbove = None
        logging.debug(('SliceSizeReasons', 'sliceBelow=', sliceBelow))
        logging.debug(('SliceSizeReasons', 'sliceAbove=', sliceAbove))

        # Display slices below/above
        sliceBelowDisplay = httpServerBudget.sliceToDisplay( sliceBelow.record, userId )  if sliceBelow  else None
        sliceAboveDisplay = httpServerBudget.sliceToDisplay( sliceAbove.record, userId )  if sliceAbove  else None
        responseData.update(  { 'success':True , 'sliceSmaller':sliceBelowDisplay , 'sliceBigger':sliceAboveDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



# Retrieves slices currently voted by user, not necessarily created by user
@app.get( r'/budget/slicesForUser/<alphanumeric:linkKeyStr>' )
def slicesForUser( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return httpResponse
        userId = cookieData.id()

        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # Retrieve all slices for this budget and voter
        sliceVoteRecord = slice.SliceVotes.get( budgetId, userId )
        sliceRecordKeys = [ ndb.Key( slice.Slice, sliceId )  for sliceId, size  in sliceVoteRecord.slices.items() ]  if sliceVoteRecord  else []
        sliceRecords = ndb.get_multi( sliceRecordKeys )
        if conf.isDev:  logging.debug( 'SlicesForUser.get() sliceRecords=' + str(sliceRecords) )

        sliceIdToDisplay = { s.key.id() : httpServerBudget.sliceToDisplay(s, userId)  for s in sliceRecords  if s }
        votesDisplay = httpServerBudget.sliceVotesToDisplay( sliceVoteRecord, userId )

        # Display slices data.
        responseData.update(  { 'success':True , 'slices':sliceIdToDisplay, 'votes':votesDisplay }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



# Retrieves slices created by budget-creator
@app.get( r'/budget/slicesFromCreator/<alphanumeric:linkKeyStr>' )
def slicesFromHost( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return httpResponse
        userId = cookieData.id()

        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if conf.isDev:  logging.debug( 'SlicesFromCreator.get() linkKeyRecord=' + str(linkKeyRecord) )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # Check that user is budget-creator
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if conf.isDev:  logging.debug( 'SlicesFromCreator.get() budgetRecord=' + str(budgetRecord) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='budget is null' )
        if ( budgetRecord.creator != userId ):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NOT_OWNER )

        # Retrieve all slices for this budget and creator
        sliceRecords = slice.Slice.query( 
            slice.Slice.budgetId==budgetId, slice.Slice.creator==userId, slice.Slice.fromEditPage==True ).fetch()
        slicesByTitle = sorted( sliceRecords, key=lambda a:a.title )
        sliceDisplays = [ httpServerBudget.sliceToDisplay(a, userId) for a in slicesByTitle ]

        # Display slices data
        responseData = { 'success':True , 'slices':sliceDisplays }
        return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.get( r'/budget/sliceTitleResults/<alphanumeric:linkKeyStr>' )
def sliceTitleResults( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Check that budget is valid
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='budget is null' )

        # Retrieve best suggested slices for this slice-start
        maxTitles = 20   # With minimum-size 5%, cannot have more than 20 top slices
        titlesOrdered = slice.retrieveTopSliceTitlesByVotes( budgetId )
        if conf.isDev:  logging.debug( 'SliceTitleResults.get() titlesOrdered=' + str(titlesOrdered) )

        # Display slices data
        titleDisplays = [ t.toDisplay(userId) for t in titlesOrdered ]
        responseData.update(  { 'success':True , 'titles':titleDisplays }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )



@app.get( r'/budget/sliceReasonResults/<alphanumeric:linkKeyStr>/<slicekey:sliceTitleId>' )
def sliceReasonResults( linkKeyStr, sliceTitleId ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        page = int( httpRequest.getUrlParam('page', 0) )

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive, and part of a write flow
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

        # Check that budget is valid
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='budget is null' )

        # Retrieve slice-title record
        sliceTitleRecord = slice.SliceTitle.get_by_id( sliceTitleId )
        if sliceTitleRecord is None:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='sliceTitleRecord is null' )
        if (sliceTitleRecord.budgetId != budgetId):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='sliceTitleRecord.budgetId mismatch' )

        # Retrieve top-voted slice-reasons for given slice-title
        maxSlices = 1  if (page <= 0)  else 100
        slicesOrdered = slice.retrieveTopSliceReasonsByVotes( budgetId, sliceTitleRecord.title, maxSlices=(maxSlices+1) )
        if conf.isDev:  logging.debug( 'SliceReasonResults.get() slicesOrdered=' + str(slicesOrdered) )

        sliceDisplays = [ httpServerBudget.sliceToDisplay(s, userId) for s in slicesOrdered[0:maxSlices] ]
        hasMore = ( maxSlices < len(slicesOrdered) )

        # Display slices data
        responseData.update(  { 'success':True , 'slices':sliceDisplays , 'hasMoreReasons':hasMore , 
            'totalBudget':budgetRecord.total, 'medianSize':sliceTitleRecord.medianSize() }  )
        return httpServer.outputJson( cookieData, responseData, httpResponse )


