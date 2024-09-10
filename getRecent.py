# Import external modules
from google.appengine.ext import ndb
import json
import logging
import os
# Import app modules
import autocomplete.survey
import budget.budget
from configuration import const as conf
import httpServer
from httpServer import app
import linkKey
from multi.survey import MultipleQuestionSurvey
import proposal
import requestForProposals
import user



@app.get('/getRecent')
def recent( ):
        httpRequest, httpResponse = httpServer.requestAndResponse()

        # Collect inputs
        httpRequestId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'httpRequestId':httpRequestId }
        cookieData = httpServer.validate( httpRequest, {}, responseData, httpResponse, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return httpResponse

        recentDestSummaries = []

        # Retrieve link-key records from cookie.
        recentLinkKeyToTime = user.retrieveRecentLinkKeys( httpRequest )
        if recentLinkKeyToTime:
            recentLinkKeyRecordKeys = [ ndb.Key(conf.LINK_KEY_CLASS_NAME, k) for k in recentLinkKeyToTime ]
            recentLinkKeyRecords = ndb.get_multi( recentLinkKeyRecordKeys )

            destTypeXIdToLink = { (k.destinationType, k.destinationId) : k.key.id()  for k in recentLinkKeyRecords if k }
            logging.debug( 'destTypeXIdToLink=' + str(destTypeXIdToLink) )
            
            # Retrieve link-key destination records
            recentDestinationKeys = [ ndb.Key(k.destinationType, int(k.destinationId))  for k in recentLinkKeyRecords if k ]
            recentDestinationRecords = ndb.get_multi( recentDestinationKeys )
            
            # Collect destination summaries.
            userId = cookieData.id()
            for r in recentDestinationRecords:
                if r is None:  continue
                destTypeAndId = ( r.key.kind(), str(r.key.id()) )
                logging.debug( 'destTypeAndId=' + str(destTypeAndId) )
                
                linkKey = destTypeXIdToLink.get( destTypeAndId, None )
                logging.debug( 'linkKey=' + str(linkKey) )

                if not linkKey:  continue
                recentDestSummary = { 'type':r.key.kind() }
                recentDestSummary['linkKey'] = linkKey
                recentDestSummary['time'] = recentLinkKeyToTime[ linkKey ]
                recentDestSummary['title'] = r.title  if r.title  else ''
                introVsDetail = ( r.key.kind() == autocomplete.survey.Survey.__name__ ) or (
                    r.key.kind() == budget.budget.Budget.__name__ )
                detail = r.introduction  if introVsDetail  else r.detail
                recentDestSummary['detail'] = detail  if detail  else ''
                recentDestSummary['frozen'] = r.freezeUserInput
                recentDestSummary['mine'] = ( r.creator == userId )
                recentDestSummary['freezeNewProposals'] = ( r.key.kind() == requestForProposals.RequestForProposals.__name__ ) and r.freezeNewProposals
                recentDestSummary['hideReasons'] = False  if ( r.key.kind() == MultipleQuestionSurvey.__name__ )  else r.hideReasons
                recentDestSummaries.append( recentDestSummary )

            logging.debug( 'getRecent.GetRecent() recentDestSummaries=' + str(recentDestSummaries) )
            
            # Order summaries by time.
            recentDestSummaries = sorted( [r for r in recentDestSummaries if r] , key=lambda r:r['time'] , reverse=True )

        logging.debug( 'getRecent.GetRecent() recentDestSummaries=' + str(recentDestSummaries) )
        
        responseData.update( { 'success':True, 'recents':recentDestSummaries } )
        return httpServer.outputJson( cookieData, responseData, httpResponse )


