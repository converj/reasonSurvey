# Import external modules.
from google.appengine.ext import ndb
import json
import logging
import webapp2
# Import app modules.
from configuration import const as conf
import httpServer
import linkKey
import proposal
import requestForProposals
import user


class GetRecent(webapp2.RequestHandler):
    def get(self):
        # Collect inputs
        responseData = { }
        cookieData = httpServer.validate( self.request, self.request.GET, responseData, self.response, crumbRequired=False, signatureRequired=False )
        if not cookieData.valid():  return

        # Retrieve link-key records from cookie.
        recentLinkKeyToTime = user.retrieveRecentLinkKeys( self.request )
        if recentLinkKeyToTime:
            recentLinkKeyRecordKeys = [ ndb.Key(conf.LINK_KEY_CLASS_NAME, k) for k in recentLinkKeyToTime ]
            recentLinkKeyRecords = ndb.get_multi( recentLinkKeyRecordKeys )

            destTypeXIdToLink = { '{}:{}'.format(k.destinationType, k.destinationId) : k.key.id()  for k in recentLinkKeyRecords if k }
            logging.debug( 'destTypeXIdToLink=' + str(destTypeXIdToLink) )
            
            # Retrieve link-key destination records.
            recentLinkKeyRecordsFiltered = [ r  for r in recentLinkKeyRecords if (r and (r.destinationType == requestForProposals.RequestForProposals.__name__ or r.destinationType == proposal.Proposal.__name__)) ]
            recentDestinationKeys = [ ndb.Key(r.destinationType, int(r.destinationId))  for r in recentLinkKeyRecordsFiltered ]
            recentDestinationRecords = ndb.get_multi( recentDestinationKeys )
            
            # Collect destination summaries.
            recentDestSummaries = []
            for r in recentDestinationRecords:
                if r is None:  continue
                destTypeAndId = '{}:{}'.format( r.key.kind(), r.key.id() )
                logging.debug( 'destTypeAndId=' + str(destTypeAndId) )
                
                linkKey = destTypeXIdToLink.get( destTypeAndId )
                logging.debug( 'linkKey=' + str(linkKey) )

                if not linkKey:  continue
                recentDestSummary = {'title':r.title, 'detail':r.detail, 'type':r.key.kind()}
                recentDestSummary['linkKey'] = linkKey
                recentDestSummary['time'] = recentLinkKeyToTime[ linkKey ]
                recentDestSummaries.append( recentDestSummary )
            logging.debug( 'getRecent.GetRecent() recentDestSummaries=' + str(recentDestSummaries) )
            
            # Order summaries by time.
            recentDestSummaries = sorted( [r for r in recentDestSummaries if r] , key=lambda r:r['time'] , reverse=True )

        else:
            recentDestSummaries = []

        logging.debug( 'getRecent.GetRecent() recentDestSummaries=' + str(recentDestSummaries) )
        
        responseData = { 'success':True, 'recents':recentDestSummaries }
        httpServer.outputJson( cookieData, responseData, self.response )


# Route HTTP request
app = webapp2.WSGIApplication([
    ('/getRecent', GetRecent)
])


