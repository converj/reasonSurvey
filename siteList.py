# Simple list of site URLs


# Import external modules
import logging
import os
import webapp2
# Import local modules
import configuration
import httpServer
import user


class SiteList( webapp2.RequestHandler ):

    def get(self):
        templateValues = { }
        httpServer.outputTemplate( 'siteList.html', templateValues, self.response )


# Route URLs to page generators
app = webapp2.WSGIApplication([
    ('/', SiteList),
])

