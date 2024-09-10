# Import external modules
import datetime
from google.appengine.ext import ndb
import logging
import time
# Import local modules
from configuration import const as conf



GLOBAL_RECORD_ID = 'GLOBAL_RECORD_ID'
NEVER = -1

# Global record
class GlobalRecord( ndb.Model ):

    adminPassword = ndb.StringProperty( indexed=False )

    # Cannot query all survey-types together, so keep separate update-times for each survey-type
    # TODO: Change to single json map{ surveyType -> latestUpdateTimeSec }
    latestMetricUpdateForProposal = ndb.IntegerProperty( default=NEVER )
    latestMetricUpdateForRequestProposals = ndb.IntegerProperty( default=NEVER )
    latestMetricUpdateForAutocomplete = ndb.IntegerProperty( default=NEVER )
    latestMetricUpdateForBudget = ndb.IntegerProperty( default=NEVER )
    latestMetricUpdateForMulti = ndb.IntegerProperty( default=NEVER )


    @staticmethod
    def new( ):  return GlobalRecord( id=GLOBAL_RECORD_ID )

    @staticmethod
    def retrieve( ):  return GlobalRecord.get_by_id(GLOBAL_RECORD_ID)


    def resetMetrics( self ):
        self.latestMetricUpdateForProposal = NEVER
        self.latestMetricUpdateForRequestProposals = NEVER
        self.latestMetricUpdateForAutocomplete = NEVER
        self.latestMetricUpdateForBudget = NEVER
        self.latestMetricUpdateForMulti = NEVER

    def toDisplay( self ):
        return {
            'latestMetricUpdateForProposal': self.latestMetricUpdateForProposal ,
            'latestMetricUpdateForRequestProposals': self.latestMetricUpdateForRequestProposals ,
            'latestMetricUpdateForAutocomplete': self.latestMetricUpdateForAutocomplete ,
            'latestMetricUpdateForBudget': self.latestMetricUpdateForBudget ,
            'latestMetricUpdateForMulti': self.latestMetricUpdateForMulti ,
        }



