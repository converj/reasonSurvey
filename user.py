# Import external modules
import base64
import hashlib
import hmac
import logging
import random
import re
import string
import sys
import time
# Import app modules
import configuration
from configuration import const as conf
from constants import Constants
import cookie
import secrets
import text


########################################################################
# Constants

const = Constants()
const.ID_COOKIE_LENGTH = 50

log = False


########################################################################
# Signature functions

def signLoginRequest( loginRequestKey ):
    return loginRequestSignature( secrets.loginRequestSigningSecret, loginRequestKey, secrets.loginApplicationId )

def signLoginResult( loginRequestKey, voterId, city ):
    return loginResponseSignature( secrets.loginResponseSigningSecret, loginRequestKey, secrets.loginApplicationId, voterId, city )


def loginRequestSignature( applicationRequestSigningSecret, requestId, applicationId ):
    if (not requestId) or (not applicationId) or (not applicationRequestSigningSecret):  return None
    return hashForSignature( applicationRequestSigningSecret , requestId + applicationId )

def loginResponseSignature( applicationResponseSigningSecret, requestId, applicationId, voterId, city ):
    if (not requestId) or (not applicationId) or (not voterId) or (not city) or (not applicationResponseSigningSecret):
        return None
    return hashForSignature( applicationResponseSigningSecret , requestId + applicationId + voterId + city )

def hashForSignature( secret, data ):
    return text.toUnicode(   base64.b32encode(  hmac.new( text.utf8(secret), text.utf8(data), digestmod=hashlib.sha512 ).digest()  )   )




########################################################################
# crumb functions

def createCrumb( userId, loginRequired=False ):
    hasher = hashlib.md5()
    hasher.update(  text.utf8( userId + secrets.crumbSalt )  )
    return hasher.hexdigest()

def checkCrumb( userId, browserCrumb, loginRequired=False, loginCrumb=None ):
    expectedCrumb = createCrumb( userId, loginRequired=loginRequired )
    
    inputCrumb = loginCrumb if loginRequired  else browserCrumb
    if conf.isDev and log:  logging.debug( 'user.checkCrumb() inputCrumb=' + str(inputCrumb) )
    if conf.isDev and log:  logging.debug( 'user.checkCrumb() expectedCrumb=' + str(expectedCrumb) )
    
    return (expectedCrumb == inputCrumb)



########################################################################
# cookie id functions

randomGenerator = random.SystemRandom()

def randomStringWithLength( length ):
    characters = string.ascii_uppercase + string.ascii_lowercase + string.digits
    return ''.join( randomGenerator.choice(characters) for _ in range(length) )

def generateCookieId():
    return randomStringWithLength( const.ID_COOKIE_LENGTH )

def isValidCookieId( c ):
    return (c is not None) and (len(c) == const.ID_COOKIE_LENGTH) and re.match( r'^[A-Za-z0-9]+$' , c )

def voterIdToApp( voterId ):
    return hashlib.sha512( voterId + secrets.voterIdSalt ).hexdigest()





# Data structure returned by validate()
class CookieData ( object ):
    def __init__( self, browserId=None, loginId=None, crumb=None, fingerprint=None, data={}, dataNew={}, errorMessage=None ):
        # Data from incoming http-request
        self.browserId = browserId
        self.loginId = loginId
        self.crumb = crumb
        self.fingerprint = fingerprint
        self.data = data
        # Data for outgoing http-response
        self.dataNew = dataNew  if dataNew  else data.copy()   # Initialize newData with old data
        # Error
        self.errorMessage = errorMessage
        self.output = False

    def valid( self ):  return (self.browserId is not None) and (self.errorMessage is None)

    def id( self ):  return self.loginId  if self.loginId  else self.browserId

    # Keeps old signature if fingerprint not available
    def sign( self ):
        if not self.fingerprint:  return   # Only sign for POST calls, where fingerprint was available
        self.dataNew['signature'] = cookieSignature( self.fingerprint, self.dataNew )

    def __repr__( self ):
        return str( self.__dict__ )

# Returns CookieData
# Caller should only check crumb & fingerprint from POST calls, to keep those secrets out of URL parameters
def validate( httpRequest, httpInput, crumbRequired=True, signatureRequired=True, makeValid=False ):

    if conf.isDev and log:  logging.debug( 'validate() crumbRequired=' + str(crumbRequired) + ' signatureRequired=' + str(signatureRequired) + ' makeValid=' + str(makeValid) )

    # Extract cookie-data
    cookieData = cookie.getCookieData( httpRequest )
    if conf.isDev and log:  logging.debug( 'validate() cookieData=' + str(cookieData) )

    # Fingerprint may be used to sign & set cookies, even if input-signature is not required
    fingerprint = browserFingerprint( httpRequest, httpInput )

    # Validate browser-id
    browserId = cookieData.get( conf.COOKIE_FIELD_BROWSER_ID, None )
    if conf.isDev and log:  logging.debug( 'validate() browserId=' + str(browserId) )
    if not isValidCookieId( browserId ):
        if makeValid:
            browserId = generateCookieId()
            return CookieData(
                browserId=browserId ,   # Set this so the rest of the http-call can use the id
                fingerprint=fingerprint ,
                dataNew={ conf.COOKIE_FIELD_BROWSER_ID: browserId }  )
        else:
            return CookieData( errorMessage=conf.NO_COOKIE )

    # Validate form-crumb
    crumb = httpInput.get( 'crumb', '' )
    if crumbRequired  and  not checkCrumb( browserId, crumb ):
        if conf.isDev:  logging.debug( 'validate() checkCrumb fail for crumb=' + str(crumb) )
        return CookieData( errorMessage=conf.BAD_CRUMB )

    # Validate cookie-signature
    if signatureRequired:
        signatureFromCookie = cookieData.get( conf.COOKIE_FIELD_SIGNATURE, None )
        if conf.isDev and log:  logging.debug( 'signatureFromCookie=' + str(signatureFromCookie) )

        signatureComputed = cookieSignature( fingerprint, cookieData )
        if conf.isDev and log:  logging.debug( 'signatureComputed=' + str(signatureComputed) )
        if signatureFromCookie != signatureComputed:
            if conf.isDev:  logging.debug( 'validate() signatureFromCookie=' + str(signatureFromCookie) + ' != signatureComputed=' + str(signatureComputed) )
            return CookieData( errorMessage=conf.NO_COOKIE )

    # Extract login id
    voterId = cookieData.get( conf.COOKIE_FIELD_VOTER_ID, None )

    return CookieData( browserId=browserId, loginId=voterId, crumb=crumb, data=cookieData, fingerprint=fingerprint )


# Returns text or null
def browserFingerprint( httpRequest, httpInput ):

    fingerprintHeaders = [ 'Accept-Language', 'Dnt', 'User-Agent' ]  # 'Accept' keeps changing from page to page
    fingerprintHeaderStrings = [ '{}:{}'.format(f, httpRequest.headers.get(f,''))  for f in fingerprintHeaders ]
    if conf.isDev and log:  logging.debug( 'fingerprintHeaderStrings=' + str(fingerprintHeaderStrings) )

    fingerprintFromJavascript = httpInput.get('fingerprint', None)
    if not fingerprintFromJavascript:  return None   # Fingerprint based only on http-headers would not match
    if conf.isDev and log:  logging.debug( 'fingerprintFromJavascript=' + str(fingerprintFromJavascript) )
    
    return str(fingerprintFromJavascript) + ' ' + ' '.join(fingerprintHeaderStrings)


# Do not set cookie-signature for GET-request because javascript-browser-fingerprint should not be 
# sent in the clear / URL
# To update recent-links from GET-requests without invalidating signature, dont include recent-links in signature, 
# and do set cookies, keeping old signature
def cookieSignature( browserFingerprintStr, cookieData ):
    
    if conf.isDev and log:  logging.debug( 'browserFingerprintStr=' + str(browserFingerprintStr) )

    # Exclude the signature itself from the signature-input
    signedCookieData = cookieData.copy()
    signedCookieData.pop( conf.COOKIE_FIELD_SIGNATURE, None )
    signedCookieData.pop( conf.COOKIE_FIELD_RECENTS, None )  # Don't sign recent-links, so that recent-links can be updated by GET calls without re-signing
    orderedCookieData = serialize( signedCookieData )
    if conf.isDev and log:  logging.debug( 'orderedCookieData=' + str(orderedCookieData) )
    
    signatureInput = [ browserFingerprintStr, orderedCookieData ]
    if conf.isDev and log:  logging.debug( 'signatureInput=' + str(signatureInput) )
    
    signature = hashForSignature( secrets.sessionSalt , ' '.join(signatureInput) )
    if conf.isDev and log:  logging.debug( 'signature=' + str(signature) )
    return signature


# Returns text
def serialize( data):
    if isinstance( data, list ):
        return '[' + ' '.join(  sorted( [ serialize(d) for d in data ] )  ) + ']'
    elif isinstance( data, dict ):
        return '{' + ' '.join(  [ '{}:{}'.format(k, serialize(data[k]))  for k in sorted(data.keys()) ]  ) + '}'
    elif data == None:
        return ''
    else:
        return str(data)



##########################################################################
# recently viewed requests/proposals

# Modifies valueToTime:map[value -> time]
def updateRecent( valueToTime, newValue, newTime, maxValues ):
    # add new value 
    valueToTime[ newValue ] = newTime
    # while we have too many values... 
    while len(valueToTime.keys()) > maxValues:
        # remove oldest value
        minTimeValue = min( valueToTime, key=valueToTime.get )
        del valueToTime[ minTimeValue ]


# Stores recent linkKeys in cookieData
def storeRecentLinkKey( linkKey, cookieData ):
    if not cookieData.valid():  return

    recentLinkKeys = cookieData.dataNew.get( conf.COOKIE_FIELD_RECENTS, {} )
    if conf.isDev and log:  logging.debug( 'storeRecentLinkKey() recentLinkKeys=' + str(recentLinkKeys) )

    now = int( time.time() )
    updateRecent( recentLinkKeys, linkKey, now, conf.recentRequestsMax )
    if conf.isDev and log:  logging.debug( 'storeRecentLinkKey() recentLinkKeys=' + str(recentLinkKeys) )

    cookieData.dataNew[ conf.COOKIE_FIELD_RECENTS ] = recentLinkKeys


# Retrieves recent linkKeys from cookie.
def retrieveRecentLinkKeys( httpRequest ):
    # Read old cookie field from httpRequest.
    oldCookieData = cookie.getCookieData( httpRequest )
    return oldCookieData.get( conf.COOKIE_FIELD_RECENTS, {} )



#################################################################################
# Unit test

import unittest

class TestUser(unittest.TestCase):

    class RequestAndResponseMock:
        def __init__(self):  self.cookies = {};  self.headers = {};
        
        def set_cookie( self, cookieName, cookieJson, secure=True, httponly=True ):
            self.cookies[ cookieName ] = cookieJson

    def testOrderedData( self ):
        self.assertEqual(  serialize('a') , 'a' )
        self.assertEqual(  serialize(4) , '4' )
        self.assertEqual(  serialize(['a','b']) , '[a b]' )
        self.assertEqual(  serialize(['b','a']) , '[a b]' )
        self.assertEqual(  serialize({'b':2,'a':1}) , '{a:1 b:2}' )
        self.assertEqual(  serialize( {'b':2, 'a':1, 'd':{'l':'L','m':40,'k':41}, 'c':['30','x',31]} ) , 
            '{a:1 b:2 c:[30 31 x] d:{k:41 l:L m:40}}' )

    def testCookieIdValid( self ):
        for i in range(1000):
            self.assertTrue(  isValidCookieId( generateCookieId() )  )


    def testCrumb( self ):
        userId = 'USER_ID'
        crumb = createCrumb( userId )
        self.assertTrue( checkCrumb( userId, crumb ) )
        
    def testSetAndGetCookie( self ):
        httpRequest = TestUser.RequestAndResponseMock()
        httpResponse = httpRequest
        
        id = generateCookieId()
        self.assertEqual( const.ID_COOKIE_LENGTH, len(id) )
        useSecureCookie = False
        javascriptFingerprint = '...'
        cookieData = CookieData( browserId=id, data={conf.COOKIE_FIELD_BROWSER_ID:id}, fingerprint=browserFingerprint(httpRequest, {'fingerprint':javascriptFingerprint}) )
        cookieData.sign()
        logging.debug( 'cookieData=' + str(cookieData) )

        cookie.setCookieData( cookieData.data, cookieData.dataNew, useSecureCookie, httpResponse )
        logging.debug( 'httpResponse.cookies=' + str(httpResponse.cookies) )

        cookieData = validate( httpRequest, {'fingerprint':javascriptFingerprint , 'crumb':createCrumb(id)} )
        logging.debug( 'cookieData=' + str(cookieData) )

        self.assertEqual( id, cookieData.browserId )

    def testRecentValuesUpdate( self ):
        valueToTime = { '0':0, '1':1, '2':2 }
        maxValues = 5
        updateRecent( valueToTime, '3', 3, maxValues )
        updateRecent( valueToTime, '4', 4, maxValues )
        updateRecent( valueToTime, '5', 5, maxValues )
        self.assertEqual( maxValues, len(valueToTime) )

if __name__ == '__main__':
    configuration.logForUnitTest()
    unittest.main()

