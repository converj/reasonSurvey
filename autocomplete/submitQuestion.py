# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
import answer
from configAutocomplete import const as conf
import httpServer
import httpServerAutocomplete
import linkKey
import question
import survey
import user
import text



class SubmitEditQuestion(webapp2.RequestHandler):

    def post(self):
        logging.debug(('SubmitEditQuestion.post()', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug(('SubmitEditQuestion.post()', 'inputData=', inputData))

        content = text.formTextToStored( inputData['content'] )
        linkKeyString = inputData['linkKey']
        questionId = inputData.get( 'questionId', None )  # Allow questionId=null, which creates new question
        questionId = str( int(questionId) ) if questionId  else None
        browserCrumb = inputData.get( 'crumb', None )
        loginCrumb = inputData.get( 'crumbForLogin', None )
        logging.debug(('SubmitEditQuestion.post()', 'content=', content, 'browserCrumb=', browserCrumb,
            'loginCrumb=', loginCrumb, 'linkKeyString=', linkKeyString, 'questionId=', questionId))

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug(('SubmitEditQuestion.post()', 'linkKeyRecord=', linkKeyRecord))

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        surveyId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Check question length
        if not httpServer.isLengthOk( content, '', conf.minLengthQuestion ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )

        # Retrieve survey record
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='survey not found' )
        logging.debug(('SubmitEditQuestion.post()', 'surveyRec=', surveyRec))
        if userId != surveyRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )

        # Retrieve question record
        # If question record exists...
        if questionId:
            questionRec = question.Question.get_by_id( int(questionId) )
            logging.debug(('SubmitEditQuestion.post()', 'questionRec=', questionRec))

            if questionRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='question not found' )
            if questionRec.surveyId != linkKeyRecord.destinationId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='questionRec.surveyId != linkKeyRecord.destinationId' )

            # Verify that question is editable
            if userId != questionRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )
            if not questionRec.allowEdit:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.HAS_RESPONSES )

            # Update question record.
            questionRec.content = content
            questionRec.put()

        # If question record does not exist...
        else:
            # Create question record
            questionRec = question.Question( surveyId=surveyId, creator=userId, content=content, allowEdit=True )
            questionKey = questionRec.put()
            questionId = str( questionKey.id() )
            
            # Add question id to survey
            # If question is created but survey fails, then question will be orphaned.  Alternatively, use a transaction.
            questionIds = list( surveyRec.questionIds )
            questionIds.append( questionId )
            surveyRec.questionIds = questionIds   # Use property assignment for immediate value checking
            surveyRec.put()
        
        # Display updated question.
        questionDisplay = httpServerAutocomplete.questionToDisplay( questionRec, userId )
        responseData.update(  { 'success':True, 'question':questionDisplay }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class DeleteQuestion(webapp2.RequestHandler):

    def post(self):
        logging.debug(('DeleteQuestion', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug(('DeleteQuestion', 'inputData=', inputData))

        linkKeyString = inputData['linkKey']
        questionId = inputData['questionId']
        browserCrumb = inputData.get( 'crumb', None )
        loginCrumb = inputData.get( 'crumbForLogin', None )
        logging.debug(('DeleteQuestion', 'browserCrumb=', browserCrumb, 'loginCrumb=', loginCrumb, 'linkKeyString=', linkKeyString, 'questionId=', questionId))

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        if questionId is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='questionId is null' )

        # Retrieve link-key record
        if linkKeyString is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKeyString is null' )
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyString )
        logging.debug(('DeleteQuestion', 'linkKeyRecord=', linkKeyRecord))

        if linkKeyRecord is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey not found' )
        if linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='linkKey destinationType=' + str(linkKeyRecord.destinationType) )
        surveyId = linkKeyRecord.destinationId
        loginRequired = linkKeyRecord.loginRequired

        if linkKeyRecord.loginRequired  and  not cookieData.loginId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )

        # Retrieve question and check owner
        questionRec = question.Question.get_by_id( int(questionId) )
        if questionRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='question record not found' )
        if userId != questionRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )

        # Delete question from survey.
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        logging.debug(('DeleteQuestion', 'surveyRec=', surveyRec))
        
        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='survey record not found' )
        if userId != surveyRec.creator:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NOT_OWNER )

        questionIds = [ q for q in surveyRec.questionIds  if q != questionId ]
        logging.debug(('DeleteQuestion', 'questionIds=', questionIds))
        surveyRec.questionIds = questionIds
        surveyRec.put()

        # Delete old question.
        # If fail, question is orphaned, but retrievable by querying by survey id.
        # Using a transaction would be ok, because survey-creator is modifying survey, 
        # which should not be done at the same time as answering, and not done often.
        questionRec.key.delete()

        # Delete answers from question.  If fail, answers are orphaned, but retrievable by querying by question id.
        answerRecords = answer.Answer.query( answer.Answer.questionId==questionId ).fetch()
        logging.debug(('DeleteQuestion', 'answerRecords=', answerRecords))
        
        answerKeys = [ a.key  for a in answerRecords ]
        logging.debug(('DeleteQuestion', 'answerKeys=', answerKeys))
        
        ndb.delete_multi( answerKeys )
        
        # Display result.
        responseData.update(  { 'success':True }  )
        httpServer.outputJson( cookieData, responseData, self.response )



# Route HTTP request
app = webapp2.WSGIApplication([
    ('/autocomplete/editQuestion', SubmitEditQuestion) ,
    ('/autocomplete/deleteQuestion', DeleteQuestion)
])


