import datetime
import re


# returns '2000-jan-1 24:00'
def dateToText( date ):
    if not date: return ''
    return date.strftime('%Y-%b-%d')


def formTextToStored( formText ):
    if formText is None:  return None
    html = formText
    # remove tags
    html = re.sub( r'<', '&lt;', html )
    html = re.sub( r'>', '&gt;', html )
    return html



#################################################################################
# Unit test

import unittest

class TestText(unittest.TestCase):

    def test(self):

        # Test date to string.
        t = datetime.datetime.fromtimestamp(1483257600)
        self.assertEqual( '2017-Jan-01', dateToText(t) )
        
        # Test that html tags are stripped.
        self.assertEqual( 'before&lt;tag&gt;after', formTextToStored('before<tag>after') )

if __name__ == '__main__':
    unittest.main()

