# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
import webapp2
# Import app modules
from configAutocomplete import const as conf
import httpServer
import httpServerAutocomplete
import linkKey
import survey
import user


class GetSurvey( webapp2.RequestHandler ):
    def get( self, linkKeyStr ):

        logging.debug( 'getSurvey.GetSurvey() linkKeyStr=' + linkKeyStr )

        # Collect inputs.
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, idRequired=False )
        userId = cookieData.id()
        
        # Retrieve and check linkKey.
        linkKeyRecord = linkKey.LinkKey.get_by_id( linkKeyStr )
        if (linkKeyRecord is None) or (linkKeyRecord.destinationType != conf.SURVEY_CLASS_NAME):
            return httpServer.outputJson( cookieData, responseData, self.response, errorMessage=conf.BAD_LINK )
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
        httpServer.outputJson( cookieData, responseData, self.response )


# Route HTTP request
app = webapp2.WSGIApplication( [
    ( r'/autocomplete/getSurvey/([0-9A-Za-z]+)' , GetSurvey )
] )


