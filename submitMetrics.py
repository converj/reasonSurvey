# Import external modules
from collections import defaultdict, namedtuple
import datetime
from google.appengine.datastore.datastore_query import Cursor
from google.appengine.ext import ndb
import logging
import time
# Import local modules
from configuration import const as conf
from autocomplete.survey import Survey
from autocomplete import httpServerAutocomplete
from budget.budget import Budget
from budget import httpServerBudget
import globalRecord
import httpServer
from httpServer import app
from linkKey import LinkKey
import metrics
from requestForProposals import RequestForProposals
import os
from proposal import Proposal
import secrets
import security
from text import LogMessage
import text
import timeFunctions
import user




@app.get('/admin') 
def adminPasswordForm( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()
    if conf.isDev:  logging.debug(LogMessage('adminPasswordForm()'))
    templateValues = { }
    return httpServer.outputTemplate( 'admin.html', templateValues, httpResponse )


@app.post('/adminSet')
def adminPasswordSave( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
    responseData = { 'success':False, 'requestLogId':requestLogId }

    inputData = httpRequest.postJsonData()
    if conf.isDev:  logging.debug(LogMessage('adminPasswordSave', 'inputData=', inputData))
    adminPassword = inputData.get( 'secret', None )

    cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=False, crumbRequired=False, signatureRequired=False )
    userId = None

    if not adminPassword:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Admin password missing' )

    # Retrieve global record
    globalRec = globalRecord.retrieve()
    if conf.isDev:  logging.debug(LogMessage('adminPasswordSave', 'globalRec=', globalRec))

    if not globalRec:
        # Only auto-create global-record on dev-instance
        if not conf.isDev:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Global record is null' )
        globalRec = globalRecord.new()

    if globalRec.adminPassword:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Admin password already exists' )

    # Store admin-password to global-record
    if conf.isDev:  logging.debug(LogMessage('adminPasswordSave', 'Setting globalRec.adminPassword'))
    adminPasswordHash = security.hashForPassword( secrets.adminSalt, adminPassword )
    globalRec.adminPassword = adminPasswordHash
    globalRec.put()

    responseData['success'] = True
    return httpServer.outputJson( cookieData, responseData, httpResponse )




SURVEYS_PER_LOAD = 3


@app.get('/links') 
def linksInitialForm( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()
    if conf.isDev:  logging.debug(LogMessage('linksInitialForm()'))
    templateValues = { }
    return httpServer.outputTemplate( 'links.html', templateValues, httpResponse )


@app.post('/linksPage')
def linksPage( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
    responseData = { 'success':False, 'requestLogId':requestLogId }

    inputData = httpRequest.postJsonData()
    if conf.isDev:  logging.debug(LogMessage('linksPage', 'inputData=', inputData))
    adminPassword = inputData.get( 'secret', None )

    cursor = httpRequest.getUrlParam( 'cursor', None )  # Cursor is specific to survey-type
    cursor = Cursor( urlsafe=cursor )  if cursor  else None

    cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=False, crumbRequired=False, signatureRequired=False )
    userId = None
    
    # Verify admin password
    if not adminPassword:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Admin password missing' )
    adminPasswordHash = security.hashForPassword( secrets.adminSalt, adminPassword )
    globalRec = globalRecord.retrieve()
    if conf.isDev:  logging.debug(LogMessage('linksPage', 'globalRec=', globalRec))
    if not globalRec:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Global record is null' )
    if (not globalRec.adminPassword) or (adminPasswordHash != globalRec.adminPassword):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Admin password mismatch' )

    # Retrieve a page of links
    linkRecords, cursor, hasMore = LinkKey.query().order( -LinkKey.timeCreated ).fetch_page( SURVEYS_PER_LOAD , start_cursor=cursor )
    # For each link... retrieve survey
    surveyDisplays = [ ]
    for linkRecord in linkRecords:
        if conf.isDev:  logging.debug(LogMessage('linksPage', 'linkRecord=', linkRecord))
        if conf.isDev:  logging.debug(LogMessage('linksPage', 'linkRecord.destinationType=', linkRecord.destinationType, ' == PROPOSAL_CLASS_NAME is ', linkRecord.destinationType==conf.PROPOSAL_CLASS_NAME ))

        surveyRecord = None
        destinationId = int( linkRecord.destinationId )
        if ( linkRecord.destinationType == conf.PROPOSAL_CLASS_NAME ):  surveyRecord = Proposal.get_by_id( destinationId )
        elif ( linkRecord.destinationType == conf.REQUEST_CLASS_NAME ):  surveyRecord = RequestForProposals.get_by_id( destinationId )
        elif ( linkRecord.destinationType == conf.SURVEY_CLASS_NAME ):  surveyRecord = Survey.get_by_id( destinationId )
        elif ( linkRecord.destinationType == conf.BUDGET_CLASS_NAME ):  surveyRecord = Budget.get_by_id( destinationId )
        
        if conf.isDev:  logging.debug(LogMessage('linksPage', 'surveyRecord=', surveyRecord))

        if surveyRecord:
            surveyDisplay = { 'time':surveyRecord.timeCreated, 'user':surveyRecord.creator, 'type':surveyRecord.__class__.__name__, 
                'title':surveyRecord.title, 'link':linkRecord.key.id() }
            surveyDisplays.append( surveyDisplay )

    responseData['surveys'] = surveyDisplays
    responseData['hasMore'] = hasMore

    if cursor:  responseData['cursor'] = text.toUnicode( cursor.urlsafe() )
    responseData['success'] = True
    return httpServer.outputJson( cookieData, responseData, httpResponse )





MAX_SURVEYS_TO_AGG_PER_TYPE = 10   # Per survey-type

class MetricsPerDay( object ):
    def __init__( self ):
        self.numSurveys = 0
        self.userToNumSurveys = defaultdict( int )
        self.typeToNumSurveys = defaultdict( int )

    def toStruct( self ):
        return { 'numSurveys':self.numSurveys , 'userToNumSurveys':dict(self.userToNumSurveys) , 'typeToNumSurveys':dict(self.typeToNumSurveys) }

    def __repr__( self ):
        return format( '\n\t numSurveys={} \n\t userToNumSurveys={} \n\t typeToNumSurveys={}'.format(
            self.numSurveys, self.userToNumSurveys, self.typeToNumSurveys ) )

TimeRange = namedtuple( 'TimeRange', 'start end' )


@app.get('/metrics')
def metricsInitialForm( ):
    httpRequest, httpResponse = httpServer.requestAndResponse()
    if conf.isDev:  logging.debug(LogMessage('metricsInitialForm()'))
    templateValues = { }
    return httpServer.outputTemplate( 'metrics.html', templateValues, httpResponse )


@app.post('/metricsReset')
def resetSurveyCounts( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
    responseData = { 'success':False, 'requestLogId':requestLogId }
    inputData = httpRequest.postJsonData()
    if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'inputData=', inputData))
    adminPassword = inputData.get( 'secret', None )

    cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=False, crumbRequired=False, signatureRequired=False )
    userId = None

    # Verify admin password
    if not adminPassword:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Admin password missing' )
    adminPasswordHash = security.hashForPassword( secrets.adminSalt, adminPassword )
    globalRec = globalRecord.retrieve()
    if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'globalRec=', globalRec))
    if not globalRec:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Global record is null' )
    if (not globalRec.adminPassword) or (adminPasswordHash != globalRec.adminPassword):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Admin password mismatch' )

    # Clear global record counters
    globalRec.resetMetrics()
    globalRec.put()
    if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'Resetting metrics in globalRec=', globalRec))

    responseData['globalRec'] = globalRecord.toDisplay( globalRec )

    # Delete all metrics records
    metricsRecords = metrics.Metrics.query().fetch()
    for metricsRecord in metricsRecords:
        if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'Deleting metricsRecord=', metricsRecord))
        metricsRecord.key.delete()

    # Retrieve any remaining metrics records
    metricsRecords = metrics.Metrics.query().fetch()
    responseData['dayToMetrics'] = { __timeIntToText(TimeRange(m.start, m.end)) : metrics.toDisplay(m)  for m in metricsRecords }
    responseData['success'] = (  0 == len( responseData['dayToMetrics'] )  )

    return httpServer.outputJson( cookieData, responseData, httpResponse )


@app.post('/metricsIncrement')
def incrementSurveyCounts( ):
    # Collect inputs
    httpRequest, httpResponse = httpServer.requestAndResponse()
    requestLogId = os.environ.get( conf.REQUEST_LOG_ID )
    responseData = { 'success':False, 'requestLogId':requestLogId }
    inputData = httpRequest.postJsonData()
    if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'inputData=', inputData))
    adminPassword = inputData.get( 'secret', None )

    cookieData = httpServer.validate( httpRequest, inputData, responseData, httpResponse, idRequired=False, crumbRequired=False, signatureRequired=False )
    userId = None

    # Verify admin password
    if not adminPassword:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Admin password missing' )
    adminPasswordHash = security.hashForPassword( secrets.adminSalt, adminPassword )
    globalRec = globalRecord.retrieve()
    if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'globalRec=', globalRec))
    if not globalRec:  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Global record is null' )
    if (not globalRec.adminPassword) or (adminPasswordHash != globalRec.adminPassword):  return httpServer.outputJson( cookieData, responseData, httpResponse, errorMessage='Admin password mismatch' )

    # Prepare to collect metric increment
    increments = defaultdict( MetricsPerDay )
    responseData['surveysAggregated'] = [ ]

    # Retrieving via links would be simpler and keeps survey-types more aligned by time
    # But it requires 2x retrievals
    # And it must still use latestMetricUpdate times to persist aggregation state,
    # which can skip surveys created in the same second as latestMetricUpdate.

    # Keep times of survey-types more in sync, by only retrieving 1 needed survey-type
    surveyTypes = [ (conf.SURVEY_TYPE_PROPOSAL, globalRec.latestMetricUpdateForProposal) , 
        (conf.SURVEY_TYPE_REQUEST_PROPOSALS, globalRec.latestMetricUpdateForRequestProposals) , 
        (conf.SURVEY_TYPE_AUTOCOMPLETE, globalRec.latestMetricUpdateForAutocomplete) , 
        (conf.SURVEY_TYPE_BUDGET, globalRec.latestMetricUpdateForBudget)
    ]
    surveyTypes = sorted( surveyTypes, key=lambda t: t[1] )
    nextSurveyType = surveyTypes[ 0 ][ 0 ]

    # Retrieve N oldest surveys after lastMetricUpdate, collect metrics increment
    # Retrieving from old to new, to prevent duplicate aggregation
    # Proposal
    if nextSurveyType == conf.SURVEY_TYPE_PROPOSAL:
        unaggregatedSurveys = Proposal.query( Proposal.timeCreated > globalRec.latestMetricUpdateForProposal , Proposal.requestId==None ).fetch( limit=MAX_SURVEYS_TO_AGG_PER_TYPE )
        if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'unaggregatedSurveys=', unaggregatedSurveys))
        latest = __collectMetricIncrements( unaggregatedSurveys, conf.SURVEY_TYPE_PROPOSAL, increments )
        globalRec.latestMetricUpdateForProposal = max( globalRec.latestMetricUpdateForProposal, latest )
        responseData['surveysAggregated'].extend(  [ __surveyToDisplay(s)  for s in unaggregatedSurveys ]  )

    # Request-for-proposals
    if nextSurveyType == conf.SURVEY_TYPE_REQUEST_PROPOSALS:
        unaggregatedSurveys = RequestForProposals.query( RequestForProposals.timeCreated > globalRec.latestMetricUpdateForRequestProposals ).fetch( limit=MAX_SURVEYS_TO_AGG_PER_TYPE )
        if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'unaggregatedSurveys=', unaggregatedSurveys))
        latest = __collectMetricIncrements( unaggregatedSurveys, conf.SURVEY_TYPE_REQUEST_PROPOSALS, increments )
        globalRec.latestMetricUpdateForRequestProposals = max( globalRec.latestMetricUpdateForRequestProposals, latest )
        responseData['surveysAggregated'].extend(  [ __surveyToDisplay(s)  for s in unaggregatedSurveys ]  )

    # Auto-complete
    if nextSurveyType == conf.SURVEY_TYPE_AUTOCOMPLETE:
        unaggregatedSurveys = Survey.query( Survey.timeCreated > globalRec.latestMetricUpdateForAutocomplete ).fetch( limit=MAX_SURVEYS_TO_AGG_PER_TYPE )
        if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'unaggregatedSurveys=', unaggregatedSurveys))
        latest = __collectMetricIncrements( unaggregatedSurveys, conf.SURVEY_TYPE_AUTOCOMPLETE, increments )
        globalRec.latestMetricUpdateForAutocomplete = max( globalRec.latestMetricUpdateForAutocomplete, latest )
        responseData['surveysAggregated'].extend(  [ __surveyToDisplay(s)  for s in unaggregatedSurveys ]  )

    # Budget
    if nextSurveyType == conf.SURVEY_TYPE_BUDGET:
        unaggregatedSurveys = Budget.query( Budget.timeCreated > globalRec.latestMetricUpdateForBudget ).fetch( limit=MAX_SURVEYS_TO_AGG_PER_TYPE )
        if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'unaggregatedSurveys=', unaggregatedSurveys))
        latest = __collectMetricIncrements( unaggregatedSurveys, conf.SURVEY_TYPE_BUDGET, increments )
        globalRec.latestMetricUpdateForBudget = max( globalRec.latestMetricUpdateForBudget, latest )
        responseData['surveysAggregated'].extend(  [ __surveyToDisplay(s)  for s in unaggregatedSurveys ]  )

    if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'increments=', increments))
    incrementsDisplays = {  __timespanToText(d) : i.toStruct()  for d,i in increments.items()  }
    responseData['increments'] = incrementsDisplays

    # Store latest metric update times
    globalRec.put()

    # For each metric increment... store in metric aggregate record
    for day, incrementsPerDay  in increments.items():
        if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'day=', day))
        # Retrieve / create metric-record for day
        metricsRecord = metrics.getOrCreate( day.start, day.end )
        if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'incrementing metricsRecord=', metricsRecord))
        metricsRecord.increment( incrementsPerDay.numSurveys )
        for u, increment in incrementsPerDay.userToNumSurveys.items():
            metricsRecord.incrementUser( u, increment )
        for surveyType, increment in incrementsPerDay.typeToNumSurveys.items():
            metricsRecord.incrementSurveyType( surveyType, increment )
        # Store metric-record for day
        metricsRecord.put()
        if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'incremented metricsRecord=', metricsRecord))

    # Retrieve all metrics to display
    metricsRecords = metrics.Metrics.query().fetch()
    # Collect map[ day -> map[user->numSurveys] , map[surveyType->numSurveys] ]
    dayToMetrics = defaultdict( MetricsPerDay )
    for metricsRecord in metricsRecords:
        if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'retrieved metricsRecord=', metricsRecord))
        day = TimeRange( metricsRecord.start, metricsRecord.end )
        dayToMetrics[ day ].numSurveys = metricsRecord.numSurveys
        dayToMetrics[ day ].userToNumSurveys = sorted( metricsRecord.userToNumSurveys.items() )
        dayToMetrics[ day ].typeToNumSurveys = sorted( metricsRecord.typeToNumSurveys.items() )
    if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'retrieved and aggregated dayToMetrics=', dayToMetrics))
    # Order days
    dayToMetricsDisplays = {  __timespanToText(d) : m.toStruct()  for d,m in dayToMetrics.items()  }
    if conf.isDev:  logging.debug(LogMessage('incrementSurveyCounts', 'dayToMetricsDisplays=', dayToMetricsDisplays))
    responseData['dayToMetrics'] = dayToMetricsDisplays

    # Collect display data
    responseData['globalRec'] = globalRecord.toDisplay( globalRec )
    responseData['success'] = True
    return httpServer.outputJson( cookieData, responseData, httpResponse )


def __surveyToDisplay( surveyRecord ):
    return { 
        'time': __timeIntToText( surveyRecord.timeCreated ) ,
        'user': surveyRecord.creator ,
        'type': surveyRecord.__class__.__name__ ,
        'title': surveyRecord.title ,
    }

def __timespanToText( timeSpan ):  return '-'.join(  [ __timeIntToText(t)  for t in timeSpan ]  )

def __timeIntToText( timestamp ):  return datetime.date.fromtimestamp( timestamp ).strftime('%Y/%m/%d')

# Modifies increments
def __collectMetricIncrements( unaggregatedSurveys, surveyType, increments ):
    # For each survey... 
    latest = 0
    for surveyRecord in unaggregatedSurveys:
        latest = max( latest, surveyRecord.timeCreated )
        timeStart, timeEnd = timeFunctions.dayBounds( surveyRecord.timeCreated )
        if conf.isDev:  logging.debug(LogMessage('__collectMetricIncrements', 'timeStart=', timeStart, 'timeEnd=', timeEnd))
        # Accumulate metric increments 
        day = TimeRange( timeStart, timeEnd )
        metricsPerDay = increments[ day ]
        metricsPerDay.numSurveys += 1
        metricsPerDay.userToNumSurveys[ surveyRecord.creator ] += 1
        metricsPerDay.typeToNumSurveys[ surveyType ] += 1
    return latest


