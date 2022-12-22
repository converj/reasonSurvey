# Import external modules
import datetime
from google.appengine.ext import ndb
import logging
import random
# Import local modules
from configuration import const as conf
import timeFunctions


MAX_USERS_PER_DAY = 3

# Record for metric aggregates
# Use 1 record per day containing map[user / survey-type -> count], not sparse record per count, 
# since user / survey-type ranges are small per day, so record is not large, and we dont want too many records.
class Metrics( ndb.Model ):
    # Key
    start = ndb.IntegerProperty( default=None )
    end = ndb.IntegerProperty( default=None )  # End point excluded from time-range

    # Aggregates
    numSurveys = ndb.IntegerProperty( default=0 )
    timeModified = ndb.DateTimeProperty( auto_now=True, default=datetime.datetime.now() )
    userToNumSurveys = ndb.JsonProperty( )  # map[ userId -> count ]   Cannot use default={}, because default instance is reused
    typeToNumSurveys = ndb.JsonProperty( )  # map[ surveyType -> count ]

    def increment( self, increment ):  self.numSurveys += increment

    def incrementUser( self, userId, increment ):
        # Check whether to sample the user
        # Like reservoir sampling, but without duplicates
        uncontestedSample = ( len(self.userToNumSurveys) < MAX_USERS_PER_DAY )
        existingSample = userId in self.userToNumSurveys
        replacementSample = ( not uncontestedSample )  and  ( not existingSample )  and  ( random.randrange( self.numSurveys ) < MAX_USERS_PER_DAY )

        # Drop an existing user from the sample
        if replacementSample:
            userToDrop = self.__randomKeyWeightedByValue( self.userToNumSurveys )
            if userToDrop:  del self.userToNumSurveys[ userToDrop ]

        if uncontestedSample or existingSample or replacementSample:
            self.userToNumSurveys[ userId ] = increment + self.userToNumSurveys.get( userId, 0 )

    # Returns random key, with probability weighted by value.  Returns null if map is empty.
    def __randomKeyWeightedByValue( self, map ):
        point = random.uniform( 0, sum(map.values()) )
        cumulativeSum = 0
        for key, value  in map.items():
            cumulativeSum += value
            if ( point <= cumulativeSum ):  return key
        return None


    def incrementSurveyType( self, surveyType, increment ):
        self.typeToNumSurveys[ surveyType ] = increment + self.typeToNumSurveys.get( surveyType, 0 )

    def __repr__( self ):
        return format( '\n\t id={}  timeModified={}  numSurveys={}  userToNumSurveys={} \n\t typeToNumSurveys={}'.format( 
            self.key.id(), self.timeModified, self.numSurveys, self.userToNumSurveys, self.typeToNumSurveys ) )


# Does not store record
def getOrCreate( startTime, endTime ):
    metricsRecord = Metrics.get_by_id( id=__toId(startTime, endTime) )
    return metricsRecord  if metricsRecord  else Metrics( 
        id=__toId(startTime, endTime), start=startTime, end=endTime, userToNumSurveys={}, typeToNumSurveys={} )

def __toId( startTime, endTime ):  return '{}-{}'.format( startTime, endTime )
    


def toDisplay( metricsRecord ):
    return {
        'start': metricsRecord.start ,
        'end': metricsRecord.end ,
        'numSurveys': metricsRecord.numSurveys ,
        'timeModified': timeFunctions.toSeconds( metricsRecord.timeModified.timestamp() )  if metricsRecord.timeModified  else None ,
        'userToNumSurveys': metricsRecord.userToNumSurveys ,
        'typeToNumSurveys': metricsRecord.typeToNumSurveys ,
    }

