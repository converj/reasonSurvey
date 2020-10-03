# Import external modules.
from google.appengine.ext import ndb
import logging
# Import local modules.
from configAutocomplete import const as conf
from constants import Constants


const = Constants()
const.MAX_RETRY = 3


class Question(ndb.Model):

    questionId = ndb.StringProperty()  # Primary key

    surveyId = ndb.StringProperty()  # Search index to find all questions in a survey

    content = ndb.StringProperty()
    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty( default=True )



