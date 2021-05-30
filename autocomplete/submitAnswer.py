# Client can delete any unsaved duplicate input, because it will either have no answerId,
# or it will have an older saved answer id/content.


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
import text
import user



# Returns surveyId, loginRequired from linkKey record, or None
# No longer need to return loginRequired, enforced here, not used by callers
def retrieveSurveyIdFromLinkKey( cookieData, linkKeyString, responseData, httpResponse ):
    # Retrieve link-key
    linkKeyRec = linkKey.LinkKey.get_by_id( linkKeyString )
    logging.debug(('retrieveSurveyIdFromLinkKey()', 'linkKeyRec=', linkKeyRec))

    if linkKeyRec is None:
        httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey not found' )
        return None, None

    if linkKeyRec.destinationType != conf.SURVEY_CLASS_NAME:
        httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='linkKey destinationType=' + str(linkKeyRec.destinationType) )
        return None, None

    if linkKeyRec.loginRequired  and  not cookieData.loginId:
        httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.NO_LOGIN )
        return None, None

    return linkKeyRec.destinationId, linkKeyRec.loginRequired


class EditAnswer(webapp2.RequestHandler):

    def post(self):
        logging.debug(('EditAnswer', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug(('EditAnswer', 'inputData=', inputData))

        responseData = { 'success':False, 'requestLogId':requestLogId }

        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        content = answer.standardizeContent( inputData.get('content', None) )  # Calls formTextToStored()
        linkKeyString = inputData['linkKey']
        answerId = inputData['answerId']
        questionId = str( int( inputData['questionId'] ) )
        browserCrumb = inputData.get( 'crumb', None )
        logging.debug(('EditAnswer', 'content=', content, 'browserCrumb=', browserCrumb, 'linkKeyString=', linkKeyString, 'answerId=', answerId))

        surveyId, loginRequired = retrieveSurveyIdFromLinkKey( cookieData, linkKeyString, responseData, self.response )
        if surveyId is None:  return

        # Retrieve survey record to check survey creator
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='survey record not found' )
        if surveyRec.creator != userId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='surveyRec.creator != userId' )
      
        # Split answers by newline
        contentLines = content.split( '\n' )  if content  else []
        # For each non-empty answer...
        answerDisplays = []
        for contentLine in contentLines:
            logging.debug(('EditAnswer', 'contentLine=', contentLine))
            if not contentLine:  continue

            # Check answer length
            if not httpServer.isLengthOk( contentLine, '', conf.minLengthAnswer ):
                return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )

            # Require that answer is non-empty
            answerStr, reason = answer.parseAnswerAndReason( content )
            if surveyRec.hideReasons and reason:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='reasons hidden' )
            if (not answerStr) and reason:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )
            if answerStr and (not reason) and (not surveyRec.hideReasons):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.REASON_TOO_SHORT )
            if not answerStr:  continue

            # If new answer value already exists... error.  If new answer is same as old answer value... no problem?
            newAnswerId = answer.toKeyId( questionId, contentLine )
            answerRec = answer.Answer.get_by_id( newAnswerId )
            if answerRec:  continue

            # Delete old answer
            if answerId:
                oldAnswerRec = answer.Answer.get_by_id( answerId )
                if oldAnswerRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='answer record not found' )
                if oldAnswerRec.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='oldAnswerRec.surveyId != surveyId' )
                oldAnswerRec.key.delete()
            # Create new answer
            answerRec = answer.newAnswer( questionId, surveyId, contentLine, userId, voteCount=0, fromEditPage=True )
            answerDisplay = httpServerAutocomplete.answerToDisplay( answerRec, userId )
            answerDisplays.append( answerDisplay )
        
        # Display updated answers
        responseData.update(  { 'success':True, 'answers':answerDisplays }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class DeleteAnswer(webapp2.RequestHandler):

    def post(self):
        logging.debug(('DeleteAnswer', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug(('DeleteAnswer', 'inputData=', inputData))

        linkKeyString = inputData['linkKey']
        answerId = inputData['answerId']
        browserCrumb = inputData.get( 'crumb', None )
        logging.debug(('DeleteAnswer', 'browserCrumb=', browserCrumb, 'linkKeyString=', linkKeyString, 'answerId=', answerId))

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        surveyId, loginRequired = retrieveSurveyIdFromLinkKey( cookieData, linkKeyString, responseData, self.response )
        if surveyId is None:  return

        # Retrieve survey record to check survey creator
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='survey record not found' )
        if surveyRec.creator != userId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='surveyRec.creator != userId' )

        # Delete old answer.
        if answerId:
            oldAnswerRec = answer.Answer.get_by_id( answerId )
            if oldAnswerRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='answer record not found' )
            if oldAnswerRec.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='oldAnswerRec.surveyId != surveyId' )
            oldAnswerRec.key.delete()
        
        # Display result.
        responseData.update(  { 'success':True }  )
        httpServer.outputJson( cookieData, responseData, self.response )



class SetAnswer(webapp2.RequestHandler):

    def post(self):
        logging.debug(('SetAnswer', 'request.body=', self.request.body))

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        inputData = json.loads( self.request.body )
        logging.debug(('SetAnswer', 'inputData=', inputData))

        content = answer.standardizeContent( inputData.get( 'content', None ) )
        linkKeyString = inputData['linkKey']
        questionId = str( int( inputData['questionId'] ) )
        browserCrumb = inputData.get( 'crumb', None )
        logging.debug(('SetAnswer', 'content=', content, 'browserCrumb=', browserCrumb, 'linkKeyString=', linkKeyString))

        responseData = { 'success':False, 'requestLogId':requestLogId }
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response )
        if not cookieData.valid():  return
        userId = cookieData.id()

        # Retrieve link-key record
        surveyId, loginRequired = retrieveSurveyIdFromLinkKey( cookieData, linkKeyString, responseData, self.response )
        if surveyId is None:  return

        # Check answer length
        if ( content is not None ) and not httpServer.isLengthOk( content, '', conf.minLengthAnswer ):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )

        # Retrieve survey record to check whether survey is frozen
        surveyRec = survey.Survey.get_by_id( int(surveyId) )
        if surveyRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='survey record not found' )
        if surveyRec.freezeUserInput:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.FROZEN )

        # Require that answer and reason both exist, or both can be empty
        answerStr, reason = answer.parseAnswerAndReason( content )
        if surveyRec.hideReasons and reason:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='reasons hidden' )
        if (not answerStr) and reason:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.TOO_SHORT )
        if answerStr and (not reason) and (not surveyRec.hideReasons):  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.REASON_TOO_SHORT )

        # Retrieve question record.
        questionRec = question.Question.get_by_id( int(questionId) )
        logging.debug(('SetAnswer', 'questionRec=', questionRec))

        if questionRec is None:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='question not found' )
        if questionRec.surveyId != surveyId:  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='questionRec.surveyId != surveyId' )
        
        # Update answer and vote.
        answerRec, voteRecord = answer.vote( questionId, surveyId, content, userId, questionRec.creator )

        # Display updated answer.
        responseData.update(  { 'success':True, 'answerContent':content }  )
        httpServer.outputJson( cookieData, responseData, self.response )


# Route HTTP request
app = webapp2.WSGIApplication([
    ('/autocomplete/editAnswer', EditAnswer),
    ('/autocomplete/deleteAnswer', DeleteAnswer),
    ('/autocomplete/setAnswer', SetAnswer)
])


