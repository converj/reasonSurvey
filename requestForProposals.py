# Import external modules.
from google.appengine.ext import ndb
import logging
# Import local modules.
from configuration import const as conf
from constants import Constants


const = Constants()
const.MAX_RETRY = 3


# Parent key: none
class RequestForProposals(ndb.Model):
    title = ndb.StringProperty()
    detail = ndb.StringProperty()
    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty()
    freezeUserInput = ndb.BooleanProperty( default=False )
        # Storing frozen-flag in request-for-proposals record
            # + Retrieving request-for-proposals can sometimes be done in parallel
            # - Writes (rare) to request-for-proposal lock a single frequently-read record
        # Storing frozen-flag in link-key record
            # + Convenient for many calls to check flag in 1 place unconditionally
            # + Reduces retrieving records: link-key, request, proposal, reason...
            # - Potentially inconsistent if multiple link-keys exist
            # - Link-key-record is not intended to be modified
            # - Writes (rare) to link-key lock a single frequently-read record


# @ndb.transactional_async( retries=const.MAX_RETRY )
# @ndb.tasklet
@ndb.transactional( retries=const.MAX_RETRY )
def setEditable( requestId, editable ):
    logging.debug( 'setEditable() editable={}'.format(editable) )
    requestRecord = RequestForProposals.get_by_id( int(requestId) )
    requestRecord.allowEdit = editable
    requestRecord.put()

