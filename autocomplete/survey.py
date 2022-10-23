# Import external modules.
from google.appengine.ext import ndb
import logging
# Import local modules.
from autocomplete.configAutocomplete import const as conf
# from constants import Constants



class Survey( ndb.Model ):
#     surveyId = ndb.StringProperty()   # Primary key

    title = ndb.StringProperty()
    introduction = ndb.StringProperty()
    questionIds = ndb.StringProperty( repeated=True )  # Ordered

    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty( default=True )  # Always true
    freezeUserInput = ndb.BooleanProperty( default=False )
    adminHistory = ndb.JsonProperty( default=[] )  # group[ {text:conf.CHANGE*, time:seconds} ]

    # For cleaning up unused records
    timeModified = ndb.DateTimeProperty( auto_now=True )
    hasResponses = ndb.BooleanProperty( default=False )  # Set when first answer is created by participant.  Could check questionIds, but less useful for cleanup.

    hideReasons = ndb.BooleanProperty( default=False )  # Experimental option


