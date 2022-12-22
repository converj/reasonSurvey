# Import external modules
from google.appengine.ext import ndb
import logging
# Import local modules
from autocomplete.configAutocomplete import const as conf


class Question( ndb.Model ):

    surveyId = ndb.StringProperty()  # Search index to find all questions in a survey

    content = ndb.StringProperty()
    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty( default=True )



