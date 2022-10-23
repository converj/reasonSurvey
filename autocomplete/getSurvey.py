# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
# Import app modules
from autocomplete.configAutocomplete import const as conf
import httpServer
from httpServer import app
from autocomplete import httpServerAutocomplete
import linkKey
from autocomplete import survey
import user



@app.get( r'/autocomplete/getSurvey/<alphanumeric:linkKeyStr>' )
def getSurvey( linkKeyStr ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage=conf.BAD_LINK )
        surveyId = linkKeyRecord.destinationId

        # Retrieve Survey by id, filter/transform fields for display.
        surveyRecord = survey.Survey.get_by_id( int(surveyId) )
        logging.debug( 'GetSurveyData() surveyRecord=' + str(surveyRecord) )

        surveyDisp = httpServerAutocomplete.surveyToDisplay( surveyRecord, userId )
        logging.debug( 'GetSurveyData() surveyDisp=' + str(surveyDisp) )
        
        linkKeyDisplay = httpServer.linkKeyToDisplay( linkKeyRecord )
        
        # Store survey to user's recent (cookie).
        user.storeRecentLinkKey( linkKeyStr, cookieData )

        # Display survey data.
        responseData = { 'success':True , 'linkKey':linkKeyDisplay , 'survey':surveyDisp }
        return httpServer.outputJson( cookieData, responseData, httpResponse )


