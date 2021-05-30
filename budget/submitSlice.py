# Client can delete any unsaved duplicate input, because it will either have no sliceId,
# or it will have an older saved slice id/content.


# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
import slice
from configBudget import const as conf
import httpServer
import httpServerBudget
import linkKey
import slice
import budget
import text
import user



# Returns budgetId, loginRequired from linkKey record, or None
# No longer need to return loginRequired, enforced here, not used by callers
def retrieveBudgetIdFromLinkKey( cookieData, linkKeyString, responseData, httpResponse ):
    # Retrieve link-key
    linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyString )
    logging.debug( 'retrieveBudgetIdFromLinkKey() linkKeyRec=' + str(linkKeyRec) )

    if linkKeyRec is None:
        httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        return None, None

    if linkKeyRec.destinationType != conf.BUDGET_CLASS_NAME:
        httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey destinationType=' + str(linkKeyRec.destinationType) )
        return None, None

    if linkKeyRec.loginRequired  and  not cookieData.loginId:
        httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )
        return None, None

    return linkKeyRec.destinationId, linkKeyRec.loginRequired



class SliceEditByCreator( webapp2.RequestHandler ):

    def post(self):
        logging.debug(('EditSlice.post()', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug(('EditSlice.post()', 'inputData=', inputData))

        responseData = { 'success':False, 'requestLogId':requestLogId }

        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        title = slice.standardizeContent( text.formTextToStored( inputData['title'] ) )
        reason = slice.standardizeContent( text.formTextToStored( inputData['reason'] ) )
        linkKeyString = inputData['linkKey']
        sliceId = inputData.get( 'sliceId', None )   # Null if slice is new
        logging.debug(('EditSlice.post()', 'sliceId=', sliceId, 'title=', title, 'reason=', reason, 'linkKeyString=', linkKeyString))

        budgetId, loginRequired = retrieveBudgetIdFromLinkKey( cookieData, linkKeyString, responseData, self.response )
        if budgetId is None:  return

        # Retrieve budget record to check budget creator
        budgetRec = budget.Budget.get_by_id( int(budgetId) )
        if budgetRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget record not found' )
        if budgetRec.creator != userId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budgetRec.creator != userId' )

        # Check slice length
        if (not title) or ( len(title) < conf.minLengthSliceTitle ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )
        if budgetRec.hideReasons:
            if reason:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='reasons hidden' )
        else:
            if (not reason) or ( len(reason) < conf.minLengthSliceTitle ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.REASON_TOO_SHORT )

        # Delete old slice if it has no votes
        if sliceId:
            oldSliceRec = slice.Slice.get_by_id( sliceId )
            if oldSliceRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='slice record not found' )
            if oldSliceRec.budgetId != budgetId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='oldSliceRec.budgetId != budgetId' )
            if oldSliceRec.creator != userId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=NOT_OWNER )
            if ( oldSliceRec.voteCount <= 0 ):
                oldSliceRec.key.delete()

        # Create new slice only if there is existing record/vote
        sliceRec = slice.Slice.get( budgetId, title, reason )
        if sliceRec is None:
            sliceRec = slice.Slice.create( budgetId, title, reason, creator=userId )
        # Store slice record
        sliceRec.fromEditPage = True
        sliceRec.put()

        # Display updated slices
        sliceDisplay = httpServerBudget.sliceToDisplay( sliceRec, userId )
        responseData.update(  { 'success':True, 'slice':sliceDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class SliceDeleteByCreator( webapp2.RequestHandler ):

    def post(self):
        logging.debug( 'SliceDeleteByCreator.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SliceDeleteByCreator.post() inputData=' + str(inputData) )

        linkKeyString = inputData['linkKey']
        sliceId = inputData.get( 'sliceId', None )
        logging.debug( 'SliceDeleteByCreator.post() linkKeyString=' + str(linkKeyString) + ' sliceId=' + str(sliceId) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        budgetId, loginRequired = retrieveBudgetIdFromLinkKey( cookieData, linkKeyString, responseData, self.response )
        if not budgetId:  return
        if not sliceId:  return

        # Retrieve budget record to check budget creator
        budgetRec = budget.Budget.get_by_id( int(budgetId) )
        if budgetRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget record not found' )
        if budgetRec.creator != userId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budgetRec.creator != userId' )

        # Delete old slice
        if sliceId:
            oldSliceRec = slice.Slice.get_by_id( sliceId )
            if oldSliceRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='slice record not found' )
            if oldSliceRec.budgetId != budgetId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='oldSliceRec.budgetId != budgetId' )
            # Only delete if slice has no votes... else de-flag that record is from budget creator
            if oldSliceRec.voteCount <= 0:
                oldSliceRec.key.delete()
            else:
                oldSliceRec.fromEditPage = False
                oldSliceRec.put()
        
        # Display result
        responseData.update(  { 'success':True }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class SliceVote( webapp2.RequestHandler ):

    def post(self):
        logging.debug( 'SliceVote.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug(('SliceVote.post()', 'inputData=', inputData))

        title = slice.standardizeContent( inputData.get( 'title', None ) )
        reason = slice.standardizeContent( inputData.get( 'reason', None ) )
        size = int( inputData.get( 'size', -1 ) )
        linkKeyString = inputData['linkKey']
        sliceId = inputData.get( 'sliceId', None )
        logging.debug(('SliceVote.post()', 'title=', title, 'reason=', reason, 'linkKeyString=', linkKeyString))

        responseData = { 'success':False , 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Enforce size limits
        if ( size < conf.SLICE_SIZE_MIN ) or ( conf.SLICE_SIZE_MAX < size ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='Size out of bounds' )

        # Retrieve link-key record
        budgetId, loginRequired = retrieveBudgetIdFromLinkKey( cookieData, linkKeyString, responseData, self.response )
        if budgetId is None:  return

        # Retrieve budget record to check whether budget is frozen
        budgetRec = budget.Budget.get_by_id( int(budgetId) )
        if budgetRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget record not found' )
        if budgetRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        # Enforce minimum title/reason lengths
        if ( title is None ) or ( len(title) < conf.minLengthSliceTitle ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )
        if budgetRec.hideReasons:
            if reason:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='reasons hidden' )
        else:
            if ( reason is None ) or ( len(reason) < conf.minLengthSliceReason ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )

        # Do not need to prevent duplicate titles here, because title & detail are already deduplicated by storage key
        # Storage-side deduplication would drop some user input, so have client-side warn if title is duplicate

        # Un-vote for old title and reason, if different
        newSliceId = slice.Slice.toKeyId( budgetId, title, reason )
        logging.debug(('SliceVote.post()', 'sliceId=', sliceId))
        logging.debug(('SliceVote.post()', 'newSliceId=', newSliceId))
        if sliceId and ( sliceId != newSliceId ):
            oldSliceRecord = slice.Slice.get_by_id( sliceId )  if sliceId  else None
            logging.debug(('SliceVote.post()', 'oldSliceRecord=', oldSliceRecord))
            if oldSliceRecord:
                if ( oldSliceRecord.budgetId != budgetId ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='sliceId does not match budgetId' )
                titleOld = oldSliceRecord.title
                reasonOld = oldSliceRecord.reason
                sliceRecord, voteRecord, success = slice.vote( budgetId, titleOld, reasonOld, 0, userId )
                if not success:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='un-vote failed' )

        # Update slice and vote
        sliceRecord, voteRecord, success = slice.vote( budgetId, title, reason, size, userId )
        if not success:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.OVER_BUDGET )

        # Display updated slice
        sliceDisplay = httpServerBudget.sliceToDisplay( sliceRecord, userId )
        responseData.update(  { 'success':success , 'slice':sliceDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class SliceSetSize( webapp2.RequestHandler ):

    def post(self):
        if conf.isDev:  logging.debug( 'SliceSetSize.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        if conf.isDev:  logging.debug( 'SliceSetSize.post() inputData=' + str(inputData) )

        sliceId = inputData.get( 'sliceId', None )
        size = int( inputData.get( 'size', -1 ) )
        linkKeyString = inputData['linkKey']
        if conf.isDev:  logging.debug( 'SliceSetSize.post() sliceId=' + str(sliceId) + ' size=' + str(size) + ' linkKeyString=' + str(linkKeyString) )
        
        responseData = { 'success':False , 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        if not sliceId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='sliceId is null' )

        # Enforce size limits
        if ( size < conf.SLICE_SIZE_MIN ) or ( conf.SLICE_SIZE_MAX < size ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='size out of bounds' )

        # Retrieve link-key record
        budgetId, loginRequired = retrieveBudgetIdFromLinkKey( cookieData, linkKeyString, responseData, self.response )
        if budgetId is None:  return

        # Retrieve slice-record to get title and reason
        sliceRecord = slice.Slice.get_by_id( sliceId )
        if conf.isDev:  logging.debug( 'SliceSetSize.post() sliceRecord=' + str(sliceRecord) )
        if sliceRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='slice record not found' )
        if ( sliceRecord.budgetId != budgetId ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='sliceId does not match budgetId' )
        title = sliceRecord.title
        reason = sliceRecord.reason

        # Retrieve budget record to check whether budget is frozen
        budgetRec = budget.Budget.get_by_id( int(budgetId) )
        if budgetRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget record not found' )
        if budgetRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        # Update slice-vote, and vote-aggregates
        sliceRecord, voteRecord, success = slice.vote( budgetId, title, reason, size, userId )
        if conf.isDev:  logging.debug( 'SliceSetSize.post() success=' + str(success) + ' sliceRecord=' + str(sliceRecord) + ' voteRecord=' + str(voteRecord) )
        if not success:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.OVER_BUDGET )
        if sliceRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='sliceRecord is null' )

        # Display updated slice
        sliceDisplay = httpServerBudget.sliceToDisplay( sliceRecord, userId )  if sliceRecord  else None
        voteRecord = httpServerBudget.sliceVotesToDisplay( voteRecord, userId )
        responseData.update(  { 'success':True, 'slice':sliceDisplay, 'vote':voteRecord }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class SliceDelete( webapp2.RequestHandler ):

    def post( self ):
        logging.debug( 'SliceDelete.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SliceDelete.post() inputData=' + str(inputData) )

        sliceId = inputData.get( 'sliceId', None )
        linkKeyString = inputData['linkKey']
        logging.debug( 'SliceDelete.post() + sliceId=' + str(sliceId) + ' linkKeyString=' + str(linkKeyString) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        if not sliceId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='sliceId is null' )

        # Retrieve link-key record
        budgetId, loginRequired = retrieveBudgetIdFromLinkKey( cookieData, linkKeyString, responseData, self.response )
        if budgetId is None:  return

        # Retrieve slice-record to get title and reason
        sliceRecord = slice.Slice.get_by_id( sliceId )
        if conf.isDev:  logging.debug( 'SliceSetSize.post() sliceRecord=' + str(sliceRecord) )
        if sliceRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='slice record not found' )
        if ( sliceRecord.budgetId != budgetId ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='sliceId does not match budgetId' )
        title = sliceRecord.title
        reason = sliceRecord.reason

        # Retrieve budget record to check whether budget is frozen
        budgetRec = budget.Budget.get_by_id( int(budgetId) )
        if budgetRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget record not found' )
        if budgetRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        # Update slice-vote, and vote-aggregates
        size = 0
        sliceRecord, voteRecord, success = slice.vote( budgetId, title, reason, size, userId )
        if conf.isDev:  logging.debug( 'SliceSetSize.post() success=' + str(success) + ' sliceRecord=' + str(sliceRecord) + ' voteRecord=' + str(voteRecord) )
        if not success:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='success is false' )
        
        # Display result
        voteRecord = httpServerBudget.sliceVotesToDisplay( voteRecord, userId )
        responseData.update(  { 'success':True, 'vote':voteRecord }  )
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication([
    ('/budget/sliceCreatorEdit', SliceEditByCreator),
    ('/budget/sliceCreatorDelete', SliceDeleteByCreator) ,
    ('/budget/sliceVote', SliceVote) ,
    ('/budget/sliceSetSize', SliceSetSize) ,
    ('/budget/sliceDelete', SliceDelete) ,
])


