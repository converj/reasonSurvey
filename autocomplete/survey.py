# Import external modules.
from google.appengine.ext import ndb
import logging
# Import local modules.
from configAutocomplete import const as conf
from constants import Constants



class Survey(ndb.Model):
    surveyId = ndb.StringProperty()   # Primary key

    introduction = ndb.StringProperty()
    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty()
    freezeUserInput = ndb.BooleanProperty( default=False )
    questionIds = ndb.StringProperty( repeated=True )  # Ordered


