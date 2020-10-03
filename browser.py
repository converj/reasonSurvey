# Data record for each browser-cookie

# Import external modules
from google.appengine.ext import ndb
import logging
# Import app modules
from configuration import const as conf


# Parent key: none
# Key: browser-ID, a long random alpha-numeric string
class BrowserRecord( ndb.Model ):
    loginRequestTime = ndb.IntegerProperty( default=0 )
    voterLoginRequestId = ndb.StringProperty()  # To prevent fake-signature for abuser's browser-id

