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


class GetRecent( webapp2.RequestHandler ):
    def get( self ):

        logging.debug( 'GetRecent.get()' )

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }

        # No crumb because this is a get-call and we don't want to send crumb in the clear
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return

        recentDestSummaries = []

        # Read recent link-keys from cookie
        recentLinkKeyToTime = user.retrieveRecentLinkKeys( self.request )
        if recentLinkKeyToTime:
            # Retrieve link-key records, using link-keys from cookie
            recentLinkKeyRecordKeys = [ ndb.Key(linkKey.LinkKey, k) for k in recentLinkKeyToTime ]
            recentLinkKeyRecords = ndb.get_multi( recentLinkKeyRecordKeys )

            destSurveyIdToLink = { k.destinationId : k.key.id()  for k in recentLinkKeyRecords if k }
            logging.debug( 'destSurveyIdToLink=' + str(destSurveyIdToLink) )

            # Retrieve link-key destination records.
            recentDestinationKeys = [ ndb.Key(survey.Survey, int(k.destinationId))  for k in recentLinkKeyRecords if k ]
            recentDestinationRecords = ndb.get_multi( recentDestinationKeys )
            
            # Collect destination summaries.
            for r in recentDestinationRecords:
                if r is None:  continue
                
                # Is there a better way to match link-key to dest type & id, without using string concat?
                # Use map[ linkKey -> dest type & id ] ?  No, dont have linkKey.
                # Don't need dest type, because all should be survey type.
                # Use tuple[type, id] ?

                link = destSurveyIdToLink.get( str(r.key.id()), None )
                logging.debug( 'link=' + str(link) )

                if not link:  continue
                recentDestSummary = { 'introduction':r.introduction }
                recentDestSummary['linkKey'] = link
                recentDestSummary['time'] = recentLinkKeyToTime[ link ]
                recentDestSummaries.append( recentDestSummary )

            logging.debug( 'getRecent.GetRecent() recentDestSummaries=' + str(recentDestSummaries) )
            
            # Order summaries by time.
            recentDestSummaries = sorted( [r for r in recentDestSummaries if r] , key=lambda r:r['time'] , reverse=True )

        logging.debug( 'getRecent.GetRecent() recentDestSummaries=' + str(recentDestSummaries) )
        
        responseData = { 'success':True, 'recents':recentDestSummaries }
        httpServer.outputJson( cookieData, responseData, self.response )


# Route HTTP request
app = webapp2.WSGIApplication( [
    ( r'/autocomplete/getRecent' , GetRecent )
] )


