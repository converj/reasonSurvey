# Shared functions for all http request service classes.


# Import external modules.
import jinja2
import json
import logging
import os
# Import app modules.
from configuration import const as conf
import cookie
import linkKey
import user



JINJA_ENVIRONMENT = jinja2.Environment(
    loader = jinja2.FileSystemLoader( os.path.dirname(__file__) ),
    extensions = ['jinja2.ext.autoescape'],
    autoescape = True
)

log = False


########################################################################

# Checks title + detail length
def isLengthOk( title, detail, lengthMin ):
    totalLength = 0
    totalLength += len(title) if title  else 0
    totalLength += len(detail) if detail  else 0;
    logging.debug( 'isLengthOk() totalLength={} lengthMin={}'.format( totalLength, lengthMin ) )
    return ( totalLength >= lengthMin )


# Returns CookieData
def validate( httpRequest, httpInput, responseData, httpResponse, 
        idRequired=True, loginRequired=False, crumbRequired=True, signatureRequired=True, makeValid=False ):

    if not idRequired:  crumbRequired = False;  signatureRequired=False;

    # Convert URL parameters to a map
    if conf.isDev and log:  logging.debug( 'type(httpInput)=' + str( type(httpInput) ) )
    if conf.isDev and log:  logging.debug( 'type(httpInput)__name__=' + str( type(httpInput).__name__ ) )
    if not isinstance( httpInput, dict ):
        # httpInput may be UnicodeMultiDict, or other custom mapping class from webapp2.RequestHandler.request.GET
        httpInput = {  i[0] : httpRequest.GET[ i[0] ]  for i in httpRequest.GET.items()  }

    cookieData = user.validate( httpRequest, httpInput, crumbRequired=crumbRequired, signatureRequired=signatureRequired, 
        makeValid=makeValid )
    if conf.isDev and log:  logging.debug( 'validate() cookieData=' + str(cookieData) )
    
    # Output error
    if not cookieData:
        if idRequired:  outputJson( CookieData(), responseData, httpResponse, errorMessage='Null cookieData' )
        return CookieData()  # Always return CookieData that is non-null, but maybe invalid
    elif cookieData.errorMessage:
        if idRequired:  outputJson( cookieData, responseData, httpResponse, errorMessage=cookieData.errorMessage )
    elif not cookieData.browserId:
        if idRequired:  outputJson( cookieData, responseData, httpResponse, errorMessage='Null browserId' )
    elif not cookieData.loginId:
        if loginRequired:
            cookieData.errorMessage = conf.NO_LOGIN
            outputJson( cookieData, responseData, httpResponse, errorMessage=conf.NO_LOGIN )

    return cookieData


# Writes instantiated template to httpResponse
# Requires templateFilepath relative to this directory -- sub-directories must qualify path
def outputTemplate( templateFilepath, templateValues, httpResponse, cookieData=None ):
    logging.debug( 'httpServer.outputTemplate() templateFilepath=' + templateFilepath )

    if cookieData:
        # Signing modified cookies requires javascript-browser-fingerprint
        cookieData.sign()
        cookie.setCookieData( cookieData.data, cookieData.dataNew, getUseSecureCookie(), httpResponse )

    __setStandardHeaders( httpResponse )

    template = JINJA_ENVIRONMENT.get_template( templateFilepath )
    httpResponse.write( template.render(templateValues) ) 


# Modifies responseData and httpResponse
def outputJson( cookieData, responseData, httpResponse, errorMessage=None ):

    if errorMessage:
        if conf.isDev:  logging.error( 'outputJson() errorMessage=' + errorMessage )
        responseData['success'] = False
        responseData['message'] = errorMessage

    if cookieData:
        if cookieData.output:
            if conf.isDev:  logging.debug( 'outputJson() cookieData=' + str(cookieData) )
            raise Exception( 'outputJson() called more than once on cookieData=' + str(cookieData) )
        cookieData.output = True
        cookieData.sign()
        cookie.setCookieData( cookieData.data, cookieData.dataNew, getUseSecureCookie(), httpResponse )

    __setStandardHeaders( httpResponse )
    httpResponse.out.write( json.dumps( responseData ) )
    return None   # Allow function to be called as a return-value


def __setStandardHeaders( httpResponse ):
    httpResponse.headers['X-Frame-Options'] = 'deny' 
    httpResponse.headers['Content-Security-Policy'] = "frame-ancestors 'none'"


def getUseSecureCookie( ):  return not conf.isDev


# Creates link-key, stores link-key in persistent record, and adds link-key to recent links in cookie.
def createAndStoreLinkKey( destClassName, destinationId, loginRequired, cookieData ):
    linkKeyString = linkKey.createLinkKey()
    logging.debug( 'linkKeyString={}'.format(linkKeyString) )

    linkKeyRecord = linkKey.LinkKey(
        id = linkKeyString,
        destinationType = destClassName,
        destinationId = destinationId,
        loginRequired = loginRequired
    )
    linkKeyRecordKey = linkKeyRecord.put()

    user.storeRecentLinkKey( linkKeyString, cookieData )

    return linkKeyRecord



########################################################################
# Filtering / transforming persistent record fields for display

def linkKeyToDisplay( linkKeyRecord ):
    return {
        'loginRequired': (linkKeyRecord.loginRequired == True) ,
        'id': linkKeyRecord.key.id()
    }

def requestToDisplay( requestRecord, userId ):
    display = {
        'id': str(requestRecord.key.id()),
        'title': requestRecord.title,
        'detail': requestRecord.detail,
        'mine': (requestRecord.creator == userId),
        'allowEdit': (userId == requestRecord.creator) and requestRecord.allowEdit ,
        'freezeUserInput': requestRecord.freezeUserInput
    }
    # Only set if used
    if requestRecord.hideReasons:  display['hideReasons'] = requestRecord.hideReasons
    return display

# Accepts requestRecord to copy top-level-attributes like freeze and hide-reasons
def proposalToDisplay( proposalRecord, userId, requestRecord=None ):
    display = {
        'id': str(proposalRecord.key.id()),
        'title': proposalRecord.title,
        'detail': proposalRecord.detail,
        'mine': (proposalRecord.creator == userId),
        'allowEdit': (userId == proposalRecord.creator) and proposalRecord.allowEdit ,
        'freezeUserInput': proposalRecord.freezeUserInput or (requestRecord and requestRecord.freezeUserInput) ,
    }
    # Only set if used
    if proposalRecord.emptyProId:  display['emptyProId'] = str(proposalRecord.emptyProId)
    if proposalRecord.emptyConId:  display['emptyConId'] = str(proposalRecord.emptyConId)
    if proposalRecord.hideReasons or (requestRecord and requestRecord.hideReasons):  display['hideReasons'] = True
    return display

def reasonToDisplay( reasonRecord, userId ):
    return {
        'proposalId': reasonRecord.proposalId,
        'id': str(reasonRecord.key.id()),
        'content': reasonRecord.content,
        'proOrCon': reasonRecord.proOrCon,
        'mine': (reasonRecord.creator == userId),
        'allowEdit': (userId == reasonRecord.creator) and reasonRecord.allowEdit,
        'voteCount': reasonRecord.voteCount,
        'score': reasonRecord.score
    }

