# HTTP service endpoints

# External modules
from google.appengine.ext import ndb
import json
import logging
import os
# Application modules
from multi.configMulti import conf
import httpServer
from httpServer import app
# from autocomplete import httpServerAutocomplete
import linkKey
from multi import survey
from text import LogMessage
import user
from multi import userAnswers



@app.get( r'/multi/getUserAnswers/<alphanumeric:linkKeyStr>' )
def getUserAnswers( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()

        # Retrieve and check linkKey
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.MULTI_SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve answers
        answersRecord = userAnswers.SurveyAnswers.retrieve( surveyId, userId )

        # Filter fields for display
        answersDisp = answersRecord.toClient( userId )
        logging.debug(LogMessage('getUserAnswers() answersDisp=' + str(answersDisp) ))
        
        # Send to client
        responseData = { 'success':True , 'userAnswers':answersDisp }
        return httpServer.outputJson( cookieData, responseData, httpResponse )


