# If user changes their answer, create new answer record, or modify existing record?  
#     Modify, because we don't want too many unused records.
#     New record, because user should be able to change their answer anytime, even if other people voted for it.
#         This implies that answer record is independent of creator, once other people vote for it.
#             If creator changes answer that is displayed to voter, then change might happen before vote, and voter wanted to vote for old answer.
#                 Not so bad for reason voting, but very bad if answer changes from yes to no.
#         Rather than changing answer from owned to voted (with possible race condition),
#         always have answer un-owned, and delete answer when no votes (also possible race)?
# 
# Assume answers are un-modifiable, because user should be able to change their answer anytime, even if other people voted for it, 
# and because voter may vote for answer that was changed after display, and for keyword-search indexing.
#     Each user x question stores a copy of answer, and suggested matching answer records are counted?  (Counts cached?)
#     Or only unique answers are stored, only as long as it has voteCount > 0 or author is question creator?
#         Never modify answer. Periodically delete unused answers, maybe.
#             For efficiency, delete zero-vote answers with creator=voter when creator votes, to prevent one user from making lots of answers.
#             Just delete the previously-voted answer from user when voting, if it has zero votes.
#                 transaction(
#                     get user x answer, compute map[ answer -> increment ]
#                     if decrement...
#                         get prev answer, if vote count is 1... delete answer... else decrement vote count and store
#                     if increment...
#                         get answer, increment vote count and store
#                 )
# 


# Import external modules
from collections import Counter
from google.appengine.ext import ndb
from google.appengine.api import search
import hashlib
import logging
import re
# Import app modules
import answerVote
from configAutocomplete import const as conf
from constants import Constants
import question
import stats
import text



# Constants
const = Constants()
const.MAX_RETRY = 3
const.MAX_VOTE_RETRY = 3
const.CHAR_LENGTH_UNIT = 100
const.MAX_ANSWER_SUGGESTIONS = 3
const.NUM_FREQ_ANSWER_SUGGESTIONS = min( 1, const.MAX_ANSWER_SUGGESTIONS - 1 )  # Should be less than MAX_ANSWER_SUGGESTIONS
const.SEARCH_INDEX_NAME = 'answersearchindex'
const.MAX_SEARCH_RESULTS = 100
const.USE_SEARCH_INDEX = False
const.MAX_SEARCH_QUERY_WORDS = 10

conf.ANSWER_REASON_DELIMITER = '\t'



def standardizeContent( content ):
    content = text.formTextToStored( content ) if content  else None
    content = content.strip(' \n\r\x0b\x0c') if content  else None    # For now keep TAB to delimit answer from reason
    return content if content  else None


# Returns [answer, reason]
def parseAnswerAndReason( answerAndReasonStr ):
    if not answerAndReasonStr:  return None, None
    delimIndex = answerAndReasonStr.find( conf.ANSWER_REASON_DELIMITER )
    if ( delimIndex < 0 ):  return answerAndReasonStr, None
    return answerAndReasonStr[0 : delimIndex] , answerAndReasonStr[ (delimIndex + len(conf.ANSWER_REASON_DELIMITER)) : ]



# Persistent record
class Answer(ndb.Model):
    questionId = ndb.StringProperty()   # Search index, to retrieve popular answers for question.

    surveyId = ndb.StringProperty()   # To verify answer belongs to survey
    content = ndb.StringProperty()
    creator = ndb.StringProperty()
    fromEditPage = ndb.BooleanProperty()  # To keep answers from survey-creator only from edit-page

    voteCount = ndb.IntegerProperty( default=0 )
    score = ndb.FloatProperty( default=0 )

    # For matching input-words to make suggestions
    words = ndb.StringProperty( repeated=True )

    def setContent( self, content ):
        self.content = content
        words = text.uniqueInOrder(  text.removeStopWords( text.tokenize(content) )  )
        words = words[ 0 : 20 ]  # Limit number of words indexed
        self.words = text.tuples( words, maxSize=2 )

    def hasAnswer( self ):
        answer, reason = parseAnswerAndReason( self.content )
        return answer and answer.strip()

    def hasAnswerAndReason( self ):
        answer, reason = parseAnswerAndReason( self.content )
        return answer and answer.strip() and reason and reason.strip()



def __voteCountToScore( voteCount, content ):
    contentLen = len(content)
    # score = votes per CHAR_LENGTH_UNITs used
    unitsUsed = float(contentLen) / float(const.CHAR_LENGTH_UNIT)  if contentLen >= const.CHAR_LENGTH_UNIT  else 1.0
    return float(voteCount) / float(unitsUsed)


# Returns series[ answer-record ]
#
# Cannot query for matching all input words, because nothing will match
# Cannot query for matching any input word, because too many irrelevant answers will match
# Cannot query for flexible number of matching words, because it requires an expensive search-index
# Ideally, query for answers that match a specific concept or logical-proposition
# So match 2 consecutive words as an approximation to a concept, which is usually low-frequency (high inverse-document-frequency-weight)
#
# Server-side match last input word, because that retrieves a spanning set of answers
# Client-side apply inverse-document-frequency weighting to score collected matches
def retrieveTopAnswers( surveyId, questionId, answerStart=None, hideReasons=False ):
    questionIdStr = str( questionId )
    logging.debug(('retrieveTopAnswers()', 'answerStart=', answerStart))

    answerRecords = []

    # Require user-input to suggest answers, to force some user thought
    inputWords = text.uniqueInOrder(  text.removeStopWords( text.tokenize(answerStart) )  )
    logging.debug(('retrieveTopAnswers()', 'inputWords=', inputWords))
    if inputWords and (0 < len(inputWords)):
        # Retrieve answer records
        answerRecords = Answer.query( Answer.surveyId==surveyId, Answer.questionId==questionIdStr, Answer.words==inputWords[-1]
            ).order( -Answer.score ).fetch( 1 )
        if ( 2 <= len(inputWords) ):
            tuple = ' '.join( inputWords[-2:-1] )
            answerRecords += Answer.query( Answer.surveyId==surveyId, Answer.questionId==questionIdStr, Answer.words==tuple
                ).order( -Answer.score ).fetch( 1 )
        logging.debug(('retrieveTopAnswers()', 'answerRecords=', answerRecords))

    # Filter out empty answer/reason
    # Answers missing required-reason should not be saveable.  Nor should empty answers.
    if hideReasons:  answerRecords = filter( lambda a: a.hasAnswer() , answerRecords )
    else:            answerRecords = filter( lambda a: a.hasAnswerAndReason() , answerRecords )

    return answerRecords



def __getAnswersFromSearchIndex( surveyId, questionId, answerStart ):

    queryWords = set(  re.split( r'[^a-z0-9\-]+' , answerStart.lower() )  )
    logging.debug( '__getAnswersFromSearchIndex() queryWords=' + str(queryWords) )

    # Filter out stop-words
    queryWords = [ w  for w in queryWords  if w and (w not in conf.STOP_WORDS) ]
    logging.debug( '__getAnswersFromSearchIndex() queryWords=' + str(queryWords) )
    if len(queryWords) == 0:  return []
    
    # Limit number of query words, randomly sample
    queryWordsSample = stats.randomSample( queryWords, const.MAX_SEARCH_QUERY_WORDS )
    logging.debug( '__getAnswersFromSearchIndex() queryWordsSample=' + str(queryWordsSample) )

    # Search for any query word
    queryStringWords = ' OR '.join(  [ 'content:~"{}"'.format(w)  for w in queryWordsSample  if w ]  )
    logging.debug( '__getAnswersFromSearchIndex() queryStringWords=' + str(queryStringWords) )
    
    # Constrain query to survey and question
    queryString = 'survey:"{}" AND question:"{}" AND ( {} )'.format( surveyId, questionId, queryStringWords )
    logging.debug( '__getAnswersFromSearchIndex() queryString=' + str(queryString) )

    searchIndex = search.Index( name=const.SEARCH_INDEX_NAME )
    logging.debug( '__getAnswersFromSearchIndex() searchIndex=' + str(searchIndex) )

    try:
        query = search.Query(
            query_string = queryString ,
            options = search.QueryOptions( limit=const.MAX_SEARCH_RESULTS )
        )
        searchResults = searchIndex.search( query )

        # Collect search results including answer record keys
        for doc in searchResults:
            logging.debug( '__getAnswersFromSearchIndex() doc=' + str(doc) )

        answerRecKeys = [ ndb.Key(Answer, doc.doc_id)  for doc in searchResults  if doc and doc.doc_id ]
        logging.debug( '__getAnswersFromSearchIndex() answerRecKeys=' + str(answerRecKeys) )
        
        # Fetch answer records
        answerRecords = ndb.get_multi( answerRecKeys )
        logging.debug( '__getAnswersFromSearchIndex() answerRecords=' + str(answerRecords) )

        answerRecords = [ a  for a in answerRecords  if a ]  # Filter null records
        logging.debug( '__getAnswersFromSearchIndex() answerRecords=' + str(answerRecords) )
        
        return answerRecords

    except search.Error as e:
        logging.error( 'Error in Index.search(): ' + str(e) )
        return []




# Key answers by questionId+hash(content), to prevent duplicates.
# Prevents problem of voting for answer that was deleted (down-voted) between display & vote
def toKeyId( questionId, answerContent ):
    hasher = hashlib.md5()
    hasher.update( text.utf8(answerContent) )
    return "{}:{}".format( questionId, hasher.hexdigest() )


# answerContent may be null
# Returns Answer, AnswerVote
# If any answer vote increment fails... then undo answerVote._setVote() and all answer vote increments via transaction.
@ndb.transactional(xg=True, retries=const.MAX_VOTE_RETRY)   # Cross-table is ok because vote record (user x answer) is not contended, and answer vote count record is locking anyway.
def vote( questionId, surveyId, answerContent, userId, questionCreator ):

    logging.debug(('vote()', 'answerContent=', answerContent))

    answerRecord = None
    answerId = None
    isNewAnswer = False
    # If answer is non-empty (disregarding tab-delimiter)...
    if (answerContent is not None) and (answerContent.strip() != ''):
        # If answer record does not exist... create answer record
        answerRecKey = toKeyId( questionId, answerContent )
        answerRecord = Answer.get_by_id( answerRecKey )
        if answerRecord is None:
            answerRecord = newAnswer( questionId, surveyId, answerContent, userId, voteCount=1 )
            isNewAnswer = True
        answerId = str( answerRecord.key.id() )
        if surveyId != answerRecord.surveyId:  raise ValueError('surveyId != answerRecord.surveyId')
        if questionId != answerRecord.questionId:  raise ValueError('questionId != answerRecord.questionId')

    # Store user x question -> answer , get answer vote-count increments.
    voteCountIncrements, voteRecord = answerVote._setVote( surveyId, questionId, answerId, userId )  # Uncontested
    logging.debug( 'vote() voteCountIncrements=' + str(voteCountIncrements) )
    logging.debug( 'vote() voteRecord=' + str(voteRecord) )

    if not voteCountIncrements:  return None, voteRecord
    
    # For each answer vote-count increment, apply increment...
    for incAnswerId, voteCountIncrement in voteCountIncrements.iteritems():
        if incAnswerId is None:  continue               # No record exists for empty answer
        isVotedAnswer = (incAnswerId == answerId)
        if isNewAnswer and isVotedAnswer:  continue     # voteCount already set to 1 during record creation
        # Store answer vote-count increment.
        logging.debug( 'vote() incAnswerId=' + str(incAnswerId) )
        answerRecordForIncrement = answerRecord if isVotedAnswer  else Answer.get_by_id( incAnswerId )
        # Contested lightly
        incAnswerRecord = __incrementVoteCount( voteCountIncrement, questionCreator, answerRecordForIncrement )

    return answerRecord, voteRecord


# Increment vote count, inside another transaction.
# May create or delete Answer record as needed.
# Returns updated Answer record, or throws transaction Conflict exception.
def __incrementVoteCount( amount, questionCreator, answerRecord ):
    logging.debug( '__incrementVoteCount() amount=' + str(amount) + ' questionCreator=' + str(questionCreator) + ' answerRecord=' + str(answerRecord) )

    # If answer record does not exist, decrement is redundant.
    if ( amount < 0 ) and ( answerRecord is None ):
        return None

    answerRecord.voteCount += amount

    if conf.isDev:  logging.debug( '__incrementVoteCount() answerRecord=' + str(answerRecord) )

    # If answer has votes or comes from question creator... keep answer record.
    if (answerRecord.voteCount >= 1) or (answerRecord.fromEditPage):

        if conf.isDev:  logging.debug( '__incrementVoteCount() overwriting answerRecord=' + str(answerRecord) )

        answerRecord.score = __voteCountToScore( answerRecord.voteCount, answerRecord.content )
        answerRecord.put()

        # Also have to re-insert record into search index with updated score, if we want search results ordered by score.
        # Better not try to search by score, because there will be too many updates to the search index.
        # Just retrieve keyword-matching answers, and get scores from datastore.

        return answerRecord
    # If answer has no votes... delete answer record.
    else:

        if conf.isDev:  logging.debug( '__incrementVoteCount() deleting answerRecord=' + str(answerRecord) )

        answerRecord.key.delete()

        # Also delete from search index?  Too frequent index operations?  Can we just ignore invalid index entries?  Within limits.
        if const.USE_SEARCH_INDEX:
            search.Index( name=const.SEARCH_INDEX_NAME ).delete( answerRecord.key.id() )

        return None



def newAnswer( questionId, surveyId, answerContent, userId, voteCount=0, fromEditPage=False ):
    answerRecKey = toKeyId( questionId, answerContent )
    answerRecord = Answer( id=answerRecKey, questionId=questionId, surveyId=surveyId, creator=userId, voteCount=voteCount, fromEditPage=fromEditPage )
    answerRecord.setContent( answerContent )

    if conf.isDev:  logging.debug( 'newAnswer() answerRecord=' + str(answerRecord) )

    answerRecord.score = __voteCountToScore( answerRecord.voteCount, answerRecord.content )
    answerRecord.put()

    if const.USE_SEARCH_INDEX:
        __addAnswerToSearchIndex( surveyId, questionId, answerRecKey, answerContent, answerRecord.score )

    return answerRecord


def __addAnswerToSearchIndex( surveyId, questionId, answerRecKey, answerContent, answerScore ):
    fields = [
        search.TextField( name='survey', value=surveyId ),
        search.TextField( name='question', value=questionId ),
        search.TextField( name='content', value=answerContent ),
    ]

    doc = search.Document( doc_id=answerRecKey, fields=fields )
    searchIndex = search.Index( name=const.SEARCH_INDEX_NAME )
    try:
        addResults = searchIndex.put( doc )
        logging.debug( 'indexAnswer() addResults=' + str(addResults) )
    except search.Error as e:
        logging.error( 'Error in search.Index(): ' + str(e) )

