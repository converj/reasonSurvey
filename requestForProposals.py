# Import external modules
from google.appengine.ext import ndb
import logging
# Import local modules
from configuration import const as conf


# Parent key: none
class RequestForProposals( ndb.Model ):
    title = ndb.StringProperty()
    detail = ndb.StringProperty()

    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty( default=True )
    
    # Store frozen-flag in request-for-proposals record, because storing frozen-flag in link-key-record
    # may be inconsistent if multiple link-keys exist, and because link-key-record is designed to be constant.
    freezeUserInput = ndb.BooleanProperty( default=False )
    freezeNewProposals = ndb.BooleanProperty( default=False )
    adminHistory = ndb.JsonProperty( default=[] )  # group[ {text:conf.CHANGE*, time:seconds} ]

    # For cleaning up unused records
    timeModified = ndb.DateTimeProperty( auto_now=True )
    hasResponses = ndb.ComputedProperty( lambda record: not record.allowEdit )  # Only updates when allowEdit changes?

    # Experimental
    hideReasons = ndb.BooleanProperty( default=False )
    doneLink = ndb.StringProperty()


