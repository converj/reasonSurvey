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
import secrets
import text
import user



class SubmitNewBudget( webapp2.RequestHandler ):

    def post(self):
        logging.debug( 'SubmitNewBudget.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SubmitNewBudget.post() inputData=' + str(inputData) )

        title = text.formTextToStored( inputData.get('title', '') )
        introduction = text.formTextToStored( inputData.get('introduction', '') )
        total = float( inputData.get('total', None) )
        loginRequired = inputData.get( 'loginRequired', False )
        experimentalPassword = inputData.get( 'experimentalPassword', None )
        hideReasons = bool( inputData.get('hideReasons', False) )
        logging.debug( 'SubmitNewBudget.post() title=' + str(title) + ' total=' + str(total) + ' introduction=' + str(introduction) + 
            ' loginRequired=' + str(loginRequired) + ' hideReasons=' + str(hideReasons) )

        responseData = { 'success':False, 'requestLogId':requestLogId }

        # Check user identity
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response, loginRequired=loginRequired )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Check budget introduction length
        if not httpServer.isLengthOk( title, introduction, conf.minLengthBudgetIntro ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )
        
        # Check budget-total
        if ( total <= 0 ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='Budget total must be a positive number' )

        # Check experimental password (low-risk secret)
        if ( hideReasons or loginRequired or experimentalPassword ) and ( experimentalPassword != secrets.experimentalPassword ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.EXPERIMENT_NOT_AUTHORIZED )
        
        # Construct and store new budget record
        budgetRecord = budget.Budget( creator=userId, title=title, introduction=introduction, total=total, 
            allowEdit=True, hideReasons=hideReasons )
        budgetRecordKey = budgetRecord.put()
        logging.debug( 'budgetRecordKey.id={}'.format(budgetRecordKey.id()) )

        # Construct and store link key
        budgetId = str( budgetRecordKey.id() )
        linkKeyRecord = httpServer.createAndStoreLinkKey( conf.BUDGET_CLASS_NAME, budgetId, loginRequired, cookieData )

        # Display budget
        budgetDisplay = httpServerBudget.budgetToDisplay( budgetRecord, userId )
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
        responseData.update(  { 'success':True, 'linkKey':linkKeyDisplay, 'budget':budgetDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )


class SubmitEditBudget( webapp2.RequestHandler ):

    def post(self):
        logging.debug( 'SubmitEditBudget.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'SubmitEditBudget.post() inputData=' + str(inputData) )

        title = text.formTextToStored( inputData['title'] )
        introduction = text.formTextToStored( inputData['introduction'] )
        total = float( inputData.get('total', None) )
        linkKeyString = inputData['linkKey']
        logging.debug( 'SubmitEditBudget.post() title=' + str(title) + ' total=' + str(total) + ' introduction=' + str(introduction) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'SubmitEditBudget.post() linkKeyRecord=' + str(linkKeyRecord) )

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        budgetId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check budget introduction length
        if not httpServer.isLengthOk( title, introduction, conf.minLengthBudgetIntro ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )

        # Check budget-total
        if ( total <= 0 ):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='Budget total must be a positive number' )

        # Retrieve budget record
        budgetRec = budget.Budget.get_by_id( int(budgetId) )
        logging.debug( 'SubmitEditBudget.post() budgetRec=' + str(budgetRec) )

        if budgetRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget not found' )

        # Verify that budget is editable
        if userId != budgetRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )
        if not budgetRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.HAS_RESPONSES )

        # Update budget record
        budgetRec.title = title
        budgetRec.introduction = introduction
        budgetRec.total = total
        budgetRec.put()
        
        # Display updated budget.
        budgetDisplay = httpServerBudget.budgetToDisplay( budgetRec, userId )
        responseData.update(  { 'success':True, 'budget':budgetDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )


class FreezeBudget( webapp2.RequestHandler ):

    def post(self):
        logging.debug( 'FreezeBudget.post() request.body=' + self.request.body )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug( 'FreezeBudget.post() inputData=' + str(inputData) )

        linkKeyString = inputData['linkKey']
        freeze = bool( inputData['freeze'] )
        logging.debug( 'FreezeBudget.post() freeze=' + str(freeze) + ' linkKeyString=' + str(linkKeyString) )

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug( 'FreezeBudget.post() linkKeyRecord=' + str(linkKeyRecord) )

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.BUDGET_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        budgetId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Retrieve budget record
        budgetRec = budget.Budget.get_by_id( int(budgetId) )
        logging.debug( 'FreezeBudget.post() budgetRec=' + str(budgetRec) )

        if budgetRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='budget not found' )

        # Verify that budget is freezeable
        if userId != budgetRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )

        # Update budget record
        budgetRec.freezeUserInput = freeze
        budgetRec.put()

        # Display updated budget
        budgetDisplay = httpServerBudget.budgetToDisplay( budgetRec, userId )
        responseData.update(  { 'success':True, 'budget':budgetDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication([
    ('/budget/budgetNew', SubmitNewBudget) ,
    ('/budget/budgetEdit', SubmitEditBudget) ,
    ('/budget/budgetFreeze', FreezeBudget)
])

