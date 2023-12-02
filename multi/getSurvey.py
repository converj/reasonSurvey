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
import linkKey
from multi import survey
from text import LogMessage
import user



@app.get( r'/multi/getSurvey/<alphanumeric:linkKeyStr>' )
def getMultiQuestionSurvey( linkKeyStr ):
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

    # Retrieve survey by ID
    surveyRecord = survey.MultipleQuestionSurvey.get_by_id( int(surveyId) )
    logging.debug(LogMessage('surveyRecord=' + str(surveyRecord) ))

    # Filter fields for display
    surveyDisp = surveyRecord.toClient( userId )
    linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
    
    # Store survey to recents in user cookie
    user.storeRecentLinkKey( linkKeyStr, cookieData )

    # Display survey data
    responseData = { 'success':True , 'link':linkKeyDisplay , 'survey':surveyDisp }
    return httpServer.outputJson( cookieData, responseData, httpResponse )


