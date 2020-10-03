# External imports
import re
# Local imports
from constants import Constants
from user import randomStringWithLength


# Constants
const = Constants()
const.LINK_KEY_LENGTH = 50


# If unit testing... exclude gCloud code
isUnitTest = __name__ == '__main__'
if not isUnitTest:

    from google.appengine.ext import ndb

    # Parent key: none
    # Key: long random alpha-numeric string
    class LinkKey(ndb.Model):
        destinationType = ndb.StringProperty()  # { REQUEST_CLASS_NAME, PROPOSAL_CLASS_NAME }
        destinationId = ndb.StringProperty()
        loginRequired = ndb.BooleanProperty()



def createLinkKey():
    return randomStringWithLength( const.LINK_KEY_LENGTH )

def isValidLinkKey( l ):
    return (l is not None) and (len(l) == const.LINK_KEY_LENGTH) and re.match( r'^[A-Za-z0-9]+$' , l )




#################################################################################
# Unit test

if isUnitTest:

    import unittest

    class Tests( unittest.TestCase ):

        def test( self ):
            for i in range(1000):
                self.assertTrue(  isValidLinkKey( createLinkKey() )  )

    unittest.main()


