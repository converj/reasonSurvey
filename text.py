# -*-coding: utf-8 -*-

# Import external modules
import datetime
import re
# Import app modules
from configuration import const as conf



def isAscii( text ):
    if not text:  return False
    try:  text.decode('ascii')
    except ( UnicodeDecodeError, UnicodeEncodeError ):  return False
    else:  return True



# Loggable object that can build from variable-arguments-list, and flexibly format unicode values without crashing
# More expensive than logging tuples, but more readable.  Equally encoding-safe & argument-matching-safe.
# Retains file/line info, and only constructs log-message-string when needed, unlike a logging wrapper function
class LogMessage( object ):

    def __init__( self, *args, **kwargs ):
        self.args = args
        self.kwargs = kwargs

    def __str__( self ):
        parts = [ ]
        for a in self.args:
            if isinstance( a, str ):
                if ( a[-1:] == '=' ):  parts.append( a )   # If string is a label for following value... print it plainly
                else:                  parts += [ '\'', a, '\' ' ]
            elif isinstance( a, unicode ):
                if isAscii( a ):  parts += [ repr(a), ' ' ]
                else:             parts += [ repr(a), '=utf8:\'', utf8(a), '\' ' ]
            else:
                parts += [ repr(a), ' ' ]
        return ''.join( parts )



# Encode unicode-object-sequence into utf8-bytes (in ascii-range)
def utf8( unicodeObjects ):
    return unicodeObjects.encode('utf-8')  if unicodeObjects  else None

# Convert utf8-bytes to unicode-object-sequence
def toUnicode( utf8Bytes ):
    return utf8Bytes.decode('utf-8')  if utf8Bytes  else None



# returns '2000-jan-1 24:00'
def dateToText( date ):
    if not date: return ''
    return date.strftime('%Y-%b-%d')


def formTextToStored( formText ):
    if formText is None:  return None
    html = formText
    # Ensure converted to unicode
    if not isinstance( html, unicode ):  html = toUnicode( html )
    # Trim leading/trailing whitespace
    html = html.strip()
    # Remove html tags
    html = re.sub( r'<', '&lt;', html )
    html = re.sub( r'>', '&gt;', html )
    return html


# Outputs group of non-empty unicode-object-strings, which can be stored in datastore
def tokenize( unicodeObjects ):
    # Flag UNICODE only works with unicode-object-sequence
    words = re.split( r'\W+' , unicodeObjects.lower().strip() , flags=re.UNICODE )  if unicodeObjects  else []
    words = [ w  for w in words  if w ]
    return words

def removeStopWords( words ):
    return [ w  for w in words  if (w not in conf.STOP_WORDS_SET) ]  if words  else []

def uniqueInOrder( values ):
    if not values:  return []
    seen = set()
    kept = []
    for v in values:
        if (v in seen):  continue
        kept.append( v )
        seen.add( v )
    return kept

# Generates all n-tuples from size=1 to maxSize 
def tuples( words, maxSize=2 ):
    tuples = []
    if (not words) or (maxSize < 1):  return tuples
    for w in range( len(words) ):
        for s in range(  min( maxSize, len(words) - w )  ):
            tuples.append(  ' '.join( words[w : w+s+1] )  )
    return tuples



#################################################################################
# Unit test

import unittest

class TestText(unittest.TestCase):

    def test(self):
        # Test encoding detection
        textWithNonAscii = u'don\u2019t \t log'
        self.assertFalse( isAscii(textWithNonAscii) )
        self.assertTrue( isAscii("abc123") )

        # Test unicode encoding
        utf8( textWithNonAscii )  # Should not error
        with self.assertRaises( UnicodeEncodeError ):
            str( textWithNonAscii )

        # Test date to string.
        t = datetime.datetime.fromtimestamp(1483257600)
        self.assertEqual( '2017-Jan-01', dateToText(t) )
        
        # Test that html tags are stripped.
        self.assertEqual( 'before&lt;tag&gt;after', formTextToStored('before<tag>after') )

    def test_tokenize(self):
        self.assertEqual( tokenize(None), [] )
        self.assertEqual( tokenize(''), [] )
        self.assertEqual( tokenize(' a  b '), ['a','b'] )
        self.assertEqual( tokenize('a,;:b!'), ['a','b'] )
        self.assertEqual( tokenize(u'开始了。然后就结束了。'), [u'开始了', u'然后就结束了'] )

    def test_removeStopWords(self):
        self.assertEqual( removeStopWords(None), [] )
        self.assertEqual( removeStopWords(['the','quick','brown','fox']), ['quick','brown','fox'] )

    def test_uniqueInOrder(self):
        self.assertEqual( uniqueInOrder(None), [] )
        self.assertEqual( uniqueInOrder(['a','b','a','b','c','c','d']), ['a','b','c','d'] )

    def test_tuples(self):
        self.assertEqual( tuples(None), [] )
        self.assertEqual( tuples(['a','b','c','d','e'], maxSize=0) , [] )
        self.assertEqual( tuples(['a','b','c','d','e'], maxSize=1) , ['a','b','c','d','e'] )
        self.assertEqual( tuples(['a','b','c','d','e'], maxSize=3) , ['a','a b','a b c', 'b','b c','b c d', 'c','c d','c d e', 'd','d e', 'e'] )



if __name__ == '__main__':
    unittest.main()

