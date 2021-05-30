# Import external modules
from collections import defaultdict, namedtuple
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
from configBudget import const as conf
import budget
import slice
import httpServer
import httpServerBudget
import linkKey
import text
import user


class SlicesForPrefix( webapp2.RequestHandler ):
    # Use POST (versus GET) to keep user-input private
    def post( self, linkKeyStr ):

        logging.debug(('SlicesForPrefix', 'linkKeyStr=', linkKeyStr))

        # Collect inputs
        inputData = json.loads( self.request.body )
        logging.debug(('SliceSizeReasons', 'inputData=', inputData))
        title = budget.standardizeContent( inputData.get( 'title', '' ) )
        reason = budget.standardizeContent( inputData.get( 'reason', '' ) )
        logging.debug(('SlicesForPrefix', 'title=', title, 'reason=', reason, 'linkKeyStr=', linkKeyStr))

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive, and part of a write flow
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check that budget is not frozen, to reduce the cost of unnecessary search
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget is null' )
        if budgetRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        # Retrieve best suggested slices for this slice-start
        sliceStart = ' '.join(  [ title if title else '' , reason if reason else '' ]  )
        slicesOrdered = slice.retrieveTopSlicesByScoreForStart( budgetId, sliceStart, hideReasons=budgetRecord.hideReasons )
        logging.debug(('SlicesForPrefix', 'slicesOrdered=', slicesOrdered))

        sliceDisplays = [ httpServerBudget.sliceToDisplay(a, userId) for a in slicesOrdered ]

        # Display slices data
        responseData.update(  { 'success':True , 'slices':sliceDisplays }  )
        httpServer.outputJson( cookieData, responseData, self.response )



SliceAndSums = namedtuple( 'SliceAndSums', 'record sumBelow sumAbove' )

class SliceSizeReasons( webapp2.RequestHandler ):
    # Use POST (versus GET) to keep user-input private
    def post( self, linkKeyStr ):

        logging.debug(('SliceSizeReasons', 'linkKeyStr=', linkKeyStr))

        # Collect inputs
        inputData = json.loads( self.request.body )
        logging.debug(('SliceSizeReasons', 'inputData=', inputData))
        title = budget.standardizeContent( inputData.get( 'title', '' ) )
        size = int( inputData.get('size', 0) )
        logging.debug(('SliceSizeReasons', 'title=', title, 'size=', size, 'linkKeyStr=', linkKeyStr))

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()

        if not title:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='title is null' )
        if not size:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='size is null' )
        if ( size < conf.SLICE_SIZE_MIN ) or ( conf.SLICE_SIZE_MAX < size ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='Size out of bounds' )
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive, and part of a write flow
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check that budget is not frozen, to reduce the cost of unnecessary search
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget is null' )
        if budgetRecord.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )
        if budgetRecord.hideReasons:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='reasons hidden' )

        # Retrieve top-scoring slice-reasons for title
        slicesByScore = slice.retrieveTopSliceReasonsByScore( budgetId, title, maxSlices=10 )
        logging.debug(('SliceSizeReasons', 'slicesByScore=', slicesByScore))

# TODO: Filter out suggestions that are from the same budget/user
# Retrieve SliceVotes
# votedSliceIds = [ s.key.id()  for sliceId, count in voteRecord.sliceVotes.iteritems() ]  if (voteRecord and voteRecord.sliceVotes)  else []
# votedSliceIds = set( votedSliceIds )
# slicesFiltered = [ s  for s in slicesByScore  if s not in votedSliceIds ]

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
        httpServer.outputJson( cookieData, responseData, self.response )



# Retrieves slices currently voted by user, not necessarily created by user
class SlicesForUser( webapp2.RequestHandler ):
    def get( self, linkKeyStr ):

        if conf.isDev:  logging.debug( 'SlicesForUser.get() linkKeyStr=' + linkKeyStr )

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # Retrieve all slices for this budget and voter
        sliceVoteRecord = slice.SliceVotes.get( budgetId, userId )
        sliceRecordKeys = [ ndb.Key( slice.Slice, sliceId )  for sliceId, size  in sliceVoteRecord.slices.iteritems() ]  if sliceVoteRecord  else []
        sliceRecords = ndb.get_multi( sliceRecordKeys )
        if conf.isDev:  logging.debug( 'SlicesForUser.get() sliceRecords=' + str(sliceRecords) )

# TODO: If slice-record does not exist for slice in slice-votes... remove that vote
        
        sliceIdToDisplay = { s.key.id() : httpServerBudget.sliceToDisplay(s, userId)  for s in sliceRecords  if s }
        votesDisplay = httpServerBudget.sliceVotesToDisplay( sliceVoteRecord, userId )

        # Display slices data.
        responseData.update(  { 'success':True , 'slices':sliceIdToDisplay, 'votes':votesDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



# Retrieves slices created by budget-creator
class SlicesFromCreator( webapp2.RequestHandler ):
    def get( self, linkKeyStr ):

        if conf.isDev:  logging.debug( 'SlicesFromCreator.get() linkKeyStr=' + str(linkKeyStr) )

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if conf.isDev:  logging.debug( 'SlicesFromCreator.get() linkKeyRecord=' + str(linkKeyRecord) )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # Check that user is budget-creator
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if conf.isDev:  logging.debug( 'SlicesFromCreator.get() budgetRecord=' + str(budgetRecord) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget is null' )
        if ( budgetRecord.creator != userId ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )

        # Retrieve all slices for this budget and creator
        sliceRecords = slice.Slice.query( 
            slice.Slice.budgetId==budgetId, slice.Slice.creator==userId, slice.Slice.fromEditPage==True ).fetch()
        slicesByTitle = sorted( sliceRecords, key=lambda a:a.title )
        sliceDisplays = [ httpServerBudget.sliceToDisplay(a, userId) for a in slicesByTitle ]

        # Display slices data
        responseData = { 'success':True , 'slices':sliceDisplays }
        httpServer.outputJson( cookieData, responseData, self.response )



class SliceTitleResults( webapp2.RequestHandler ):
    def get( self, linkKeyStr ):

        if conf.isDev:  logging.debug( 'SliceTitleResults.get() linkKeyStr=' + str(linkKeyStr) )

        # Collect inputs

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check that budget is valid
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget is null' )

        # Retrieve best suggested slices for this slice-start
        maxTitles = 20   # With minimum-size 5%, cannot have more than 20 top slices
        titlesOrdered = slice.retrieveTopSliceTitlesByVotes( budgetId )
        if conf.isDev:  logging.debug( 'SliceTitleResults.get() titlesOrdered=' + str(titlesOrdered) )

        # Display slices data
        titleDisplays = [ t.toDisplay(userId) for t in titlesOrdered ]
        responseData.update(  { 'success':True , 'titles':titleDisplays }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class SliceReasonResults( webapp2.RequestHandler ):
    def get( self, linkKeyStr, sliceTitleId ):

        if conf.isDev:  logging.debug( 'SliceReasonResults.get() sliceTitleId=' + str(sliceTitleId) + ' linkKeyStr=' + str(linkKeyStr) )

        # Collect inputs
        page = int( self.request.get('page', 0) )

        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No user-id required, works for any user with the link-key
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # No need to enforce login-required in GET calls, only on write operations that create/use link-key
        # But enforcing here because the search is expensive, and part of a write flow
        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check that budget is valid
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        if budgetRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget is null' )

        # Retrieve slice-title record
        sliceTitleRecord = slice.SliceTitle.get_by_id( sliceTitleId )
        if sliceTitleRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='sliceTitleRecord is null' )
        if (sliceTitleRecord.budgetId != budgetId):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='sliceTitleRecord.budgetId mismatch' )

        # Retrieve top-voted slice-reasons for given slice-title
        maxSlices = 1  if (page <= 0)  else 100
        slicesOrdered = slice.retrieveTopSliceReasonsByVotes( budgetId, sliceTitleRecord.title, maxSlices=(maxSlices+1) )
        if conf.isDev:  logging.debug( 'SliceReasonResults.get() slicesOrdered=' + str(slicesOrdered) )

        sliceDisplays = [ httpServerBudget.sliceToDisplay(s, userId) for s in slicesOrdered[0:maxSlices] ]
        hasMore = ( maxSlices < len(slicesOrdered) )

        # Display slices data
        responseData.update(  { 'success':True , 'slices':sliceDisplays , 'hasMoreReasons':hasMore , 
            'totalBudget':budgetRecord.total, 'medianSize':sliceTitleRecord.medianSize() }  )
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication( [
    ( r'/budget/slicesForPrefix/([0-9A-Za-z]+)' , SlicesForPrefix ) ,
    ( r'/budget/sliceSizeReasons/([0-9A-Za-z]+)' , SliceSizeReasons ) ,
    ( r'/budget/slicesForUser/([0-9A-Za-z]+)' , SlicesForUser ) ,
    ( r'/budget/slicesFromCreator/([0-9A-Za-z]+)' , SlicesFromCreator ) ,
    ( r'/budget/sliceTitleResults/([0-9A-Za-z]+)' , SliceTitleResults ) ,
    ( r'/budget/sliceReasonResults/([0-9A-Za-z]+)/([0-9A-Za-z:]+)' , SliceReasonResults ) ,
] )


