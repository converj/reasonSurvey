# -*-coding: utf-8 -*-

# Import external modules
import datetime
import re
# Import app modules
from configuration import const as conf


def isEmpty( text ):  return ( text is None ) or ( (type(text) == str) and (text.strip() == '') )


def isNumber( text ):  return bool( re.match(r'^[+-]?\d+$', text) )


def isAscii( text ):
    if not text:  return False

    try:
        if isUnicode( text ):
            text.encode('ascii')
        else:
            text.decode('ascii')
        return True
    except ( UnicodeDecodeError, UnicodeEncodeError ):
        return False

def isBytes( text ):
    return isinstance( text, str )  if ( conf.pythonVersion <= 2 )  else isinstance( text, bytes )

def isUnicode( text ):
    return isinstance( text, unicode )  if ( conf.pythonVersion <= 2 )  else isinstance( text, str )


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
            if isBytes( a ):
                if ( a[-1:] == '=' ):  parts.append( a )   # If string is a label for following value... print it plainly
                elif not parts:        parts += [ a, ' ' ]  # If string is the log-tag... print it plainly, with following space
                else:                  parts += [ repr(a), ' ' ]   # parts+=['\'',a,'\' '] fails in python-3, because bytes cannot be concatenated by join()
            elif isUnicode( a ):
                if ( a == u'' ):
                    parts.append( u"'' " )
                elif isAscii( a ):
                    if ( a[-1:] == '=' ):  parts.append( a )
                    elif not parts:        parts += [ a, ' ' ]
                    else:                  parts += [ repr(a), ' ' ]
                else:
                    parts += [ repr(a), '=utf8:\'', toUtf8(a), '\' ' ]
            else:
                parts += [ repr(a), ' ' ]
        if None in parts:  raise ValueError( 'found None in parts={}'.format(parts) )
        return ''.join( parts )



# Encode unicode-object-sequence into bytes in utf8-format
def utf8( unicodeObjects ):  return toUtf8( unicodeObjects )

def toUtf8( unicodeObjects ):  return unicodeObjects.encode('utf-8')  if unicodeObjects  else None

# Encode unicode-object-sequence into bytes in ascii-range
def toAscii( unicodeObjects ):  return unicodeObjects.encode('ascii')  if unicodeObjects  else None

# Convert utf8/ascii-bytes to unicode-object-sequence
def toUnicode( utf8Bytes ):  return utf8Bytes.decode('utf-8')  if utf8Bytes  else None



# returns '2000-jan-1 24:00'
def dateToText( date ):
    if not date: return ''
    return date.strftime('%Y-%b-%d')


def formTextToStored( formText ):
    if formText is None:  return None
    html = formText
    # Ensure converted to unicode
    if not isUnicode( html ):  html = toUnicode( html )
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
        textWithNonAscii = '\xe3\x81\xa8\xe3\x81\xaf'
        textUnicode = u'\u3068\u306f'
        textAscii = 'abc123'
        self.assertFalse( isAscii(textWithNonAscii) )
        self.assertFalse( isAscii(textUnicode) )
        self.assertTrue( isAscii(textAscii) )

        if ( conf.pythonVersion <= 2 ):
            self.assertTrue( isBytes(textWithNonAscii) )
            self.assertFalse( isBytes(textUnicode) )
            self.assertTrue( isBytes(textAscii) )
        else:
            self.assertFalse( isBytes(textWithNonAscii) )
            self.assertFalse( isBytes(textUnicode) )
            self.assertFalse( isBytes(textAscii) )

        if ( conf.pythonVersion <= 2 ):
            self.assertFalse( isUnicode(textWithNonAscii) )
            self.assertTrue( isUnicode(textUnicode) )
            self.assertFalse( isUnicode(textAscii) )
        else:
            self.assertTrue( isUnicode(textWithNonAscii) )
            self.assertTrue( isUnicode(textUnicode) )
            self.assertTrue( isUnicode(textAscii) )

        # Test unicode encoding
        utf8( textUnicode )  # Should not error
        if ( conf.pythonVersion <= 2 ):
            with self.assertRaises( UnicodeEncodeError ):
                str( textUnicode )

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

