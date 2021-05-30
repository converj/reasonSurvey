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

    # Store frozen-flag in request-for-proposals record, because storing frozen-flag in link-key-record
    # may be inconsistent if multiple link-keys exist, and link-key-record is designed to be constant.
    freezeUserInput = ndb.BooleanProperty( default=False )

    # Experimental
    hideReasons = ndb.BooleanProperty( default=False )


@ndb.transactional( retries=const.MAX_RETRY )
def setEditable( requestId, editable ):
    logging.debug( 'setEditable() editable={}'.format(editable) )
    requestRecord = RequestForProposals.get_by_id( int(requestId) )
    requestRecord.allowEdit = editable
    requestRecord.put()

