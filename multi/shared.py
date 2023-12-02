# Shared functions


# External modules
import base64
import hashlib
import logging
import re
# Application modules
from multi.configMulti import conf
import text



def hashForKey( valueUnicode ):
    hasher = hashlib.md5()
    valueBytes = text.utf8( valueUnicode )  if valueUnicode  else b''
    hasher.update( valueBytes )
    # Discard non-alpha-numeric characters, rather than accept punctuation
    return base64.b64encode( hasher.digest() , b'==' ).decode('utf-8').replace('=', '')[-10:]

def isValidHashForKey( s ):
    return  s  and  re.match( r'^[A-Za-z0-9]+$' , s )

def tokenizeText( textContent ):
    return text.uniqueInOrder(  text.removeStopWords( text.tokenize(textContent) )  )

def scoreDiscountedByLength( voteCount, content ):
    contentLen = 0  if (content is None)  else len(content)
    # score = votes per CHAR_LENGTH_UNITs used 
    unitsUsed = float(contentLen) / float(conf.CHAR_LENGTH_UNIT)  if contentLen >= conf.CHAR_LENGTH_UNIT  else 1.0
    return float(voteCount) / float(unitsUsed)



def toProposalId( surveyId, questionId ): 
    return '{}-{}'.format( surveyId, questionId ) 

def reasonForClient( reasonRecord, userId ):
    if not reasonRecord:  return None
    return {
        'id': str(reasonRecord.key.id()) ,
        'content': reasonRecord.content ,
        'proOrCon': reasonRecord.proOrCon ,
        'mine': (reasonRecord.creator == userId) ,
        'allowEdit': (userId == reasonRecord.creator) and reasonRecord.allowEdit ,
        'voteCount': reasonRecord.voteCount , 
        'score': reasonRecord.score ,
    }

def proposalForClient( proposalRecord, userId ):
    if not proposalRecord:  return None
    return {
        'id': str(proposalRecord.key.id()) ,
        'numPros': proposalRecord.numPros , 
        'numCons': proposalRecord.numCons , 
    }


