# Import external modules
from google.appengine.ext import ndb
# Import local modules
from budget.configBudget import const as conf
import text


class Budget( ndb.Model ):
#     surveyId = ndb.StringProperty()   # Primary key

    title = ndb.StringProperty()
    introduction = ndb.StringProperty()
    total = ndb.FloatProperty()

    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty( default=True )  # Always true
    freezeUserInput = ndb.BooleanProperty( default=False )
    adminHistory = ndb.JsonProperty( default=[] )  # group[ {text:conf.CHANGE*, time:seconds} ]

    # For cleaning up unused records
    timeModified = ndb.DateTimeProperty( auto_now=True )
    hasResponses = ndb.BooleanProperty( default=False )  # Set when first budget-item is created by participant

    hideReasons = ndb.BooleanProperty( default=False )  # Experimental option


def standardizeContent( content ):
    content = text.formTextToStored( content ) if content  else None
    content = content.strip(' \n\r\x0b\x0c') if content  else None    # Keep TAB to delimit slice-title from reason
    return content if content  else None

