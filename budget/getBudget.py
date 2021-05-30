# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
from configBudget import const as conf
import httpServer
import httpServerBudget
import linkKey
import budget
import user


class GetBudget( webapp2.RequestHandler ):
    def get( self, linkKeyStr ):

        logging.debug( 'getBudget.GetBudget() linkKeyStr=' + linkKeyStr )

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
        budgetId = linkKeyRecord.destinationId

        # Retrieve Budget by id, filter/transform fields for display.
        budgetRecord = budget.Budget.get_by_id( int(budgetId) )
        logging.debug( 'GetBudgetData() budgetRecord=' + str(budgetRecord) )

        budgetDisp = httpServerBudget.budgetToDisplay( budgetRecord, userId )
        logging.debug( 'GetBudgetData() budgetDisp=' + str(budgetDisp) )
        
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
        
        # Store budget to user's recent (cookie).
        user.storeRecentLinkKey( linkKeyStr, cookieData )

        # Display budget data.
        responseData = { 'success':True , 'linkKey':linkKeyDisplay , 'budget':budgetDisp }
        httpServer.outputJson( cookieData, responseData, self.response )


# Route HTTP request
app = webapp2.WSGIApplication( [
    ( r'/budget/budget/([0-9A-Za-z]+)' , GetBudget )
] )


