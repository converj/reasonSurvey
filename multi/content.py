# Data record classes

# Import external modules
import base64
from collections import namedtuple
import datetime
from google.appengine.ext import ndb
import hashlib
import logging
import re
import time
# Import app modules
from multi.configMulti import conf
import autocomplete.stats as stats
import multi.shared
import multi.userAnswers
import text
from text import LogMessage


#####################################################################################################
# Data record classes

# Use cases:
#  In request-for-problems question, store problem with/out votes, find top / word-matching problems

# Record for storing problem / proposal / reason
class Content( ndb.Model ):

    surveyId = ndb.StringProperty()   # To verify answer belongs to survey
    questionId = ndb.StringProperty()   # To verify answer belongs to question
    parentKey = ndb.StringProperty()  # Parent content's key

    content = ndb.StringProperty()
    words = ndb.StringProperty( repeated=True )  # For matching input-words to make suggestions
    proOrCon = ndb.StringProperty()  # Value in { conf.PRO, conf.CON }

    creator = ndb.StringProperty()
    timeCreated = ndb.IntegerProperty( default=0 )
    timeModified = ndb.DateTimeProperty( auto_now=True )

    hasResponse = ndb.BooleanProperty()
    numPros = ndb.IntegerProperty( default=0 )
    numCons = ndb.IntegerProperty( default=0 )
    voteCount = ndb.IntegerProperty( default=0 )
    score = ndb.FloatProperty( default=0 )
    maxChildVotes = ndb.IntegerProperty( default=0 )
    
    @staticmethod
    def create( surveyId, questionId, subkeys, content=None, creator=None, proOrCon=None ):
        parentKey = str( subkeys[-1] )  if ( 0 < len(subkeys) )  else None
        record = Content( surveyId=surveyId, questionId=questionId, parentKey=parentKey, creator=creator, proOrCon=proOrCon )
        record.setContent( content )
        return record

    def setContent( self, content ):
        self.content = content
        # Index content words
        words = multi.shared.tokenizeText( self.content )
        words = words[ 0 : conf.MAX_WORDS_TO_INDEX ]  # Limit number of words indexed
        self.words = text.tuples( words, maxSize=conf.MAX_COMPOUND_WORD_LENGTH )

    @staticmethod
    def exists( surveyId, questionId, subkeys, content=content ):
        parentKey = str( subkeys[-1] )  if ( 0 < len(subkeys) )  else None
        existingContent = Content.query(
            Content.surveyId==str(surveyId) , Content.questionId==str(questionId) , Content.parentKey==parentKey , Content.content==content ).fetch()
        logging.debug(LogMessage('existingContent=', existingContent))
        return bool( existingContent )

    @staticmethod
    def retrieve( surveyId, questionId, subkeys, contentId=None ):
        parentKey = str( subkeys[-1] )  if ( 0 < len(subkeys) )  else None
        contentRecord = Content.get_by_id( contentId )
        if not contentRecord:  return None
        if ( contentRecord.surveyId != surveyId ): raise KeyError('surveyId does not match')
        if ( contentRecord.questionId != questionId ):  raise KeyError('questionId does not match')
        if ( contentRecord.parentKey != parentKey ):  raise KeyError('parentKey does not match')
        return contentRecord

    def incrementNumProsOrCons( self, proOrCon, increment ):
        if ( proOrCon is None ):  return
        elif ( proOrCon == conf.PRO ):  self.setNumProsAndCons( (self.numPros + increment), self.numCons )
        elif ( proOrCon == conf.CON ):  self.setNumProsAndCons( self.numPros, (self.numCons + increment) )
        else:  raise ValueError( 'proOrCon is invalid' )

    def setNumProsAndCons( self, newNumPros, newNumCons ):
        self.numPros = max( 0, newNumPros )
        self.numCons = max( 0, newNumCons )
        self.voteCount = self.numPros - self.numCons
        self.score = multi.shared.scoreDiscountedByLength( self.voteCount, self.content )

    def incrementVoteCount( self, increment ):  self.setVoteCount( self.voteCount + increment )

    def setVoteCount( self, newVoteCount ):
        self.voteCount = max( 0, newVoteCount )
        self.score = multi.shared.scoreDiscountedByLength( self.voteCount, self.content )


    def toClient( self, userId ):
        result = {
            'id': str( self.key.id() ) ,
            'parentKey': self.parentKey ,
            'mine': ( self.creator == userId ) ,
            'content': self.content ,
            'words': ' '.join( self.words )  if self.words  else '' ,
            'hasResponse': self.hasResponse ,
            'votes': self.voteCount ,
            'score': self.score ,
        }
        if self.proOrCon:  result['proOrCon'] = self.proOrCon
        if self.numPros is not None:  result['pros'] = self.numPros
        if self.numCons is not None:  result['cons'] = self.numCons
        return result



#####################################################################################################
# Methods to retrieve top content-records

# Returns records, cursor, more:boolean
def retrieveTopContent( surveyId, questionId, subkeys, maxRecords=3, cursor=None, proOrCon=None ):
    future = retrieveTopContentAsync( surveyId, questionId, subkeys, maxRecords=maxRecords, cursor=cursor, proOrCon=proOrCon )
    return future.get_result()

# Returns future producing 1 batch of records & next-page-cursor 
def retrieveTopContentAsync( surveyId, questionId, subkeys, maxRecords=3, cursor=None, proOrCon=None ):

    parentKey = str( subkeys[-1] )  if ( 0 < len(subkeys) )  else None

    if proOrCon:
        return Content.query( 
            Content.surveyId==str(surveyId) , Content.questionId==str(questionId) , Content.parentKey==parentKey , Content.proOrCon==proOrCon ).order( 
            -Content.score ).fetch_page_async( maxRecords, start_cursor=cursor )
    else:
        return Content.query( 
            Content.surveyId==str(surveyId) , Content.questionId==str(questionId) , Content.parentKey==parentKey ).order( 
            -Content.score ).fetch_page_async( maxRecords, start_cursor=cursor )


def retrieveTopProblems( surveyId, questionId, maxRecords=3, cursor=None ):
    records, cursor, more = Content.query( 
        Content.surveyId==str(surveyId) , Content.questionId==str(questionId) , Content.parentKey==None ).order( -Content.maxChildVotes ).fetch_page( maxRecords, start_cursor=cursor )
    logging.debug(LogMessage('records=', records, 'cursor=', cursor, 'more=', more, 'v6'))
    return records, cursor, more


# Returns series[ content-record ]
def retrieveTopMatchingContent( surveyId, questionId, subkeys, contentStart ):
    inputWords = text.uniqueInOrder(  text.removeStopWords( text.tokenize(contentStart) )  )
    if conf.isDev:  logging.debug(LogMessage('inputWords=', inputWords))

    parentKey = str( subkeys[-1] )  if ( 0 < len(subkeys) )  else None

    contentRecordFutures = []
    if inputWords and ( 0 < len(inputWords) ):
        # Retrieve top-voted content-records matching last input-word 
        # Results will be collected & match-scored in client 
        lastWord = inputWords[ -1 ]
        contentRecordFutures.append(
            Content.query(
                Content.surveyId==str(surveyId), Content.questionId==str(questionId) , Content.parentKey==parentKey , Content.words==lastWord
                ).order( -Content.score ).fetch_async( 1 )  )
        # Retrieve for last input-word-pair 
        if ( 2 <= len(inputWords) ):
            lastTuple = ' '.join( inputWords[-2:-1] )
            contentRecordFutures.append(
                Content.query(
                    Content.surveyId==str(surveyId), Content.questionId==str(questionId) , Content.parentKey==parentKey , Content.words==lastTuple
                    ).order( -Content.score ).fetch_async( 1 )  )

    # De-duplicate records, since both word & tuple-top-suggestion may be the same 
    recordsUnique = { }
    for future in contentRecordFutures:
        if future:
            for record in future.get_result():
                if record:
                    recordsUnique[ record.key.id() ] = record
    if conf.isDev:  logging.debug(LogMessage('recordsUnique=', recordsUnique))

    return recordsUnique.values()


