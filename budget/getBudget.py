# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
# Import app modules
from budget.configBudget import const as conf
import httpServer
from httpServer import app
from budget import httpServerBudget
import linkKey
from budget import budget
import user



@app.get( r'/budget/budget/<alphanumeric:linkKeyStr>' )
def getBudget( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
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
        return httpServer.outputJson( cookieData, responseData, httpResponse )


