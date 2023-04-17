# Import external modules
import base64
import json
import logging
import re
# Import app modules
from configuration import const as conf
from constants import Constants
import text


# Constants
const = Constants()
const.COOKIE_NAME = 'C'
const.COOKIE_NAME_FOR_JAVASCRIPT = 'J'
const.COOKIE_NAME_FOR_LOGIN = 'L'
const.COOKIE_NAME_FOR_LANGUAGE = 'A'

log = False


# Returns cookieData:map[name->value]
def getCookieData( httpRequest ):
    if conf.isDev and log:  logging.debug( 'getCookieData() httpRequest.cookies=' + str(httpRequest.cookies) )

    cookieBase64 = httpRequest.cookies.get( const.COOKIE_NAME )
    cookieBase64 = text.toAscii(cookieBase64) if cookieBase64  else None   # Only allow ASCII 128-bit range
    if conf.isDev and log:  logging.debug( 'getCookieData() cookieBase64=' + str(cookieBase64) )

    cookieJson = base64.urlsafe_b64decode( cookieBase64 ) if cookieBase64  else None   # Discards non-base-64 characters
    if conf.isDev and log:  logging.debug( 'getCookieData() cookieJson=' + str(cookieJson) )
    try:
        cookieStruct = json.loads( cookieJson ) if cookieJson  else {}
        if conf.isDev and log:  logging.debug( 'getCookieData() cookieStruct=' + str(cookieStruct) )
        if not isinstance( cookieStruct, dict )  or  not __isAllowedJsonValue( cookieStruct ):
            if conf.isDev:  logging.debug( 'getCookieData() disallowed json value in cookieStruct=' + str(cookieStruct) )
            return {}
        return cookieStruct
    except Exception as e:
        if conf.isDev:  logging.debug( 'getCookieData() Exception=' + str(e) )
        return {}

def __isAllowedJsonValue( value ):
    if value is None:  return True
    if isinstance( value, (int, float) ):  return True
    if isinstance( value, (str) ):
        reMatch = re.match( r'^[A-Za-z0-9=\-_., ]*$' , value )  # Must allow space and punctuation used in voter-city
        if conf.isDev and not reMatch:  logging.debug( '__isAllowedJsonValue() regex mismatch for value=' + str(value) )
        return reMatch
    if isinstance( value, dict ): 
        for k,v in value.items():
            if not __isAllowedJsonValue(k):  return False
            if not __isAllowedJsonValue(v):  return False
        return True
    if isinstance( value, list ):
        for v in value:
            if not __isAllowedJsonValue(v):  return False
        return True
    if conf.isDev:  logging.debug( '__isAllowedJsonValue() unhandled type(value)=' + str(type(value)) )
    return False


# old/newCookieData:map[key->value]
# Modifies httpResponse
# Returns mergedCookieData : map[key->value]
def setCookieData( oldCookieData, newCookieData, useSecureCookie, httpResponse ):

    # merge in new fields
    mergedCookieData = oldCookieData.copy()
    mergedCookieData.update( newCookieData )

    # Put all data into server-only (httponly) cookie
    setCookieNameToValues( const.COOKIE_NAME, mergedCookieData, httpResponse, secure=useSecureCookie, httponly=useSecureCookie )
    
    # Copy only data needed by browser into browser-accessible cookie
    mergedCookieDataForJavascript = {
        'city': mergedCookieData.get( conf.COOKIE_FIELD_VOTER_CITY, None ) ,
        'hasVoterId': bool( mergedCookieData.get( conf.COOKIE_FIELD_VOTER_ID, False ) )
    }
    setCookieNameToValues( const.COOKIE_NAME_FOR_JAVASCRIPT, mergedCookieDataForJavascript, httpResponse, secure=useSecureCookie, httponly=False )

    return mergedCookieData


def setCookieNameToValues( cookieName, cookieKeyToValue, httpResponse, secure=True, httponly=True ):
    cookieJson = json.dumps( cookieKeyToValue )
    if conf.isDev and log:  logging.debug( 'cookie.setCookieNameToValues() cookieName=' + str(cookieName) + ' cookieJson=' + str(cookieJson) )

    # HTTP-request will probably return cookie data as unicode, so set in HTTP-response as unicode, to match
    cookieBase64 = text.toUnicode(  base64.urlsafe_b64encode( text.utf8(cookieJson) )  )
    httpResponse.set_cookie( cookieName, cookieBase64, secure=secure, httponly=httponly )




#################################################################################
# Unit test

import unittest

class TestCookie(unittest.TestCase):

    class CookiesMock:
        def get( self, cookieName ):
            return text.toUnicode(   base64.urlsafe_b64encode(  text.utf8( json.dumps({'b':'B'}) )  )   )

    class RequestMock:
        def __init__(self): self.cookies = TestCookie.CookiesMock()
        
    class ResponseMock:
        def __init__(self): self.cookieNameToData = {}
        
        def set_cookie( self, cookieName, cookieData, secure=True, httponly=True ):
            self.cookieNameToData[ cookieName ] = cookieData

    def test( self ):
        mock_Request = TestCookie.RequestMock()
        # Test getting and parsing cookie
        oldCookieData = getCookieData( mock_Request )
        self.assertEqual( {'b':'B'} , oldCookieData )
        
        # Test setting and serializing cookie
        newCookieData = { 'a':'A' }
        mock_Response = TestCookie.ResponseMock()
        useSecureCookie = False
        mergedCookieData = setCookieData( oldCookieData, newCookieData, useSecureCookie, mock_Response )
        responseCookieData = mock_Response.cookieNameToData['C']

        self.assertEqual(
            text.toUnicode(   base64.urlsafe_b64encode(  text.utf8( json.dumps({'b':'B','a':'A'}) )  )   ) ,
            responseCookieData )

if __name__ == '__main__':
    unittest.main()

