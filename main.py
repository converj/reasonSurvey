# Single-page application, using javascript and AJAX.
#     Separate page-displays for each proposal, versus expand/collapse.
#         + May be more understandable to users.
#         - Requires extra clicks to vote/reason even for small proposals.
#         + Allows smaller data fetches when number of proposals/reasons is large.
#
# cookie user-identity
#     Generate cookie anytime cookie is absent.
#     Store cookie in database only when user tries to store data.


# Import external modules
import json
import logging
import os
import webapp2
# Import local modules
from configuration import const as conf
import httpServer
import secrets
import user



# Main page generator
class MainPage( webapp2.RequestHandler ):

    def get(self):
    
        logging.debug( 'self.request=' + str(self.request) )

        templateValues = {
            # Pass configuration data from server to client.
            'minLengthRequest': conf.minLengthRequest,
            'minLengthProposal': conf.minLengthProposal,
            'minLengthReason': conf.minLengthReason,
            'TOO_SHORT': conf.TOO_SHORT,
            'REASON_TOO_SHORT': conf.REASON_TOO_SHORT,
            'NO_COOKIE': conf.NO_COOKIE,
            'NO_LOGIN': conf.NO_LOGIN,
            'BAD_CRUMB': conf.BAD_CRUMB,
            'BAD_LINK': conf.BAD_LINK,
            'NOT_OWNER': conf.NOT_OWNER,
            'HAS_RESPONSES': conf.HAS_RESPONSES,
            'FROZEN': conf.FROZEN ,
            'STOP_WORDS': json.dumps(  { w:True for w in conf.STOP_WORDS }  ) ,
            'VOTER_ID_LOGIN_SIG_LENGTH': conf.VOTER_ID_LOGIN_SIG_LENGTH ,
            'VOTER_ID_LOGIN_REQUEST_ID_LENGTH': conf.VOTER_ID_LOGIN_REQUEST_ID_LENGTH ,
            'loginApplicationId': secrets.loginApplicationId ,
            'LOGIN_URL':  conf.LOGIN_URL_DEV if conf.isDev  else conf.LOGIN_URL ,
            'IS_DEV':  'true' if conf.isDev  else 'false' ,
        }
        # Dont set cookie at this time, because javascript-browser-fingerprint not available to sign cookie
        httpServer.outputTemplate( 'main.html', templateValues, self.response )



# Serve cookie on page load
class InitialCookie( webapp2.RequestHandler ):

    def post( self ):

        logging.debug( 'self.request=' + str(self.request) )

        # Collect inputs
        requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
        responseData = { 'success':False, 'requestLogId':requestLogId }
        inputData = json.loads( self.request.body )

        # Set cookie with signature based on browser-fingerprint from javascript
        cookieData = httpServer.validate( self.request, inputData, responseData, self.response, idRequired=False, makeValid=True )
        if not cookieData.valid():  return httpServer.outputJson( cookieData, responseData, self.response, errorMessage='cookieData invalid' )
        responseData['success'] = True
        responseData['crumb'] = user.createCrumb( cookieData.browserId )  if cookieData.valid()  else ''

        httpServer.outputJson( cookieData, responseData, self.response )
        


class TermsOfService( webapp2.RequestHandler ):

    def get( self ):
        logging.debug( 'self.request=' + str(self.request) )
        templateValues = {
            'TITLE': 'Terms of Service' ,
            'COMPANY_NAME': 'Converj LLC' ,
            'THE_CONTACT': '???CONTACT???' ,
            'THE_ADDRESS': '???ADDRESS???' ,
            'THE_LOCATION': '???LOCATION???' ,
        }
        httpServer.outputTemplate( 'termsOfService.html', templateValues, self.response )

class PrivacyPolicy( webapp2.RequestHandler ):

    def get( self ):
        logging.debug( 'self.request=' + str(self.request) )
        templateValues = {
            'TITLE': 'Privacy Policy' ,
            'COMPANY_NAME': 'Converj LLC' ,
            'THE_LOCATION': '???LOCATION???' ,
        }
        httpServer.outputTemplate( 'privacyPolicy.html', templateValues, self.response )

        


# Route URLs to page generators
app = webapp2.WSGIApplication(
    [
        ('/procon', MainPage),
        ('/initialCookie', InitialCookie) ,
        ('/termsOfService.html', TermsOfService) ,
        ('/privacyPolicy.html', PrivacyPolicy)
    ],
    debug=conf.isDev
)

