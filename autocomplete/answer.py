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
const.USE_SEARCH_INDEX = True
const.MAX_SEARCH_QUERY_WORDS = 10



def standardizeContent( content ):
    content = text.formTextToStored( content ) if content  else None
    content = content.strip(' \n\r\x0b\x0c') if content  else None    # For now keep TAB to delimit answer from reason
    return content if content  else None



# Persistent record
class Answer(ndb.Model):
    questionId = ndb.StringProperty()   # Search index, to retrieve popular answers for question.

    surveyId = ndb.StringProperty()   # To verify answer belongs to survey
    content = ndb.StringProperty()
    creator = ndb.StringProperty()
    fromEditPage = ndb.BooleanProperty()  # To keep answers from survey-creator only from edit-page

    voteCount = ndb.IntegerProperty( default=0 )
    score = ndb.FloatProperty( default=0 )


def __voteCountToScore( voteCount, content ):
    contentLen = len(content)
    # score = votes per CHAR_LENGTH_UNITs used
    unitsUsed = float(contentLen) / float(const.CHAR_LENGTH_UNIT)  if contentLen >= const.CHAR_LENGTH_UNIT  else 1.0
    return float(voteCount) / float(unitsUsed)


class AnswerMatch:
    def __init__( self, answerRecord=None, content=None, wordSeq=None ):
        self.answerRecord = answerRecord
        self.content = content
        self.wordSeq = wordSeq
        self.score = 0.0


# Returns series[ answer future ]
def retrieveTopAnswersAsync( surveyId, questionId, answerStart=None ):
    questionIdStr = str( questionId )

    logging.debug( 'retrieveTopAnswersAsync() answerStart=' + str(answerStart) )

    if answerStart:

        # Retrieve answer records
        answerRecords = []
        # Try to use search index, which may fail if query words do not match any answers
        if const.USE_SEARCH_INDEX:
            # Retrieve a limited number of answers that match answerStart words
            answerRecords = __getAnswersFromSearchIndex( surveyId, questionId, answerStart )
        # Fall-back to retrieving all answers
        if len(answerRecords) == 0:
            # Retrieve all answers
            answerRecords = Answer.query( Answer.surveyId==surveyId, Answer.questionId==questionIdStr ).fetch( const.MAX_SEARCH_RESULTS )

            # Maybe limit number of query words to first N, or top N by TF-IDF (which is not available at this point).

            # TF/IDF weighting -- apply in code to keyword-matching answers?
            # Cheaper to batch-retrieve all answer records, match keywords with TF/IDF weighting, sort by score, return top N?

            # But computing inv-doc-freq only on keyword matching documents has sparse data.
            # And we want inv-doc-freq available to help sample query words used for search index match.

            # concat intro questions answers up to n characters, store, for word frequency sample?
            # better, store json word->count map up to n entries?
            #  map record becomes a transaction bottleneck, unless it is allowed to lose updates.
            #   But losing decrements + increments could mean negative counts, very incorrect data even for a sample.
            #   Could store each word&count separately, and only update a few on each answer update. 
            #    Still has negative count problem.  Plus no good way to get the whole count map.
            #  Just use first 10 query words, first 100 matching answers?
            #   May miss high-vote answers, but those are always shown for empty query.
            #  Ideally want inv-doc-freq per question.
            # 
            # Pipeline: retrieve keyword-matching answers, sum inverse-document-frequency keyword weights, weight by vote count.
            # Randomly sample 10 keywords from the answer input, compute inverse-document-frequency on 100 first retrieved answers.
            #  Random sampling on subsequent queries ensures wide retrieval coverage as user types their answer.
            # 
            # Don't query too often.  Don't query for each word, because user is not likely to pay attention to suggestions at word boundary.
            #  Only query if user pauses typing for a second, possibly looking at suggestions?


        # Compute inverse-document-frequency weights for query words, across retrieved answer records
        answerMatches = [ AnswerMatch( answerRecord=a, content=a.content, wordSeq=__tokenize(a.content) ) for a in answerRecords ]
        
        queryWords = set( __tokenize(answerStart) )
        logging.debug( 'retrieveTopAnswersAsync() queryWords=' + str(queryWords) )

        wordToInvDocFreq = stats.computeInvDocFreq( answerMatches, queryWords )
        logging.debug( 'retrieveTopAnswersAsync() wordToInvDocFreq=' + str(wordToInvDocFreq) )

        # for each answer... compute match score from word-match weights, and from answer score from number of votes and content length.
        for answerMatch in answerMatches:
            weightSum = 0.0
            # for each term in query and in doc...
            for word in answerMatch.wordSeq:
                wordIdfWeight = wordToInvDocFreq.get( word, None )
                # Sum IDF weight
                if wordIdfWeight:
                    weightSum += wordIdfWeight
            # Combine match score and answer score (plus 1 to avoid zero-vote problems)
            answerMatch.score = weightSum * ( 1.0 + answerMatch.answerRecord.score )

        # sort answers by score
        matchesByScore = sorted( answerMatches, key=lambda a:a.score, reverse=True )
        # return top N scores
        topMatches = matchesByScore[ 0 : const.MAX_ANSWER_SUGGESTIONS - const.NUM_FREQ_ANSWER_SUGGESTIONS ]
        topMatchesRecords = [ m.answerRecord for m in topMatches ]
        answerRecordsWithRemoval = [ a for a in answerRecords  if a not in topMatchesRecords ]
        answerRecsFreq = stats.weightedRandom( answerRecordsWithRemoval, const.NUM_FREQ_ANSWER_SUGGESTIONS, lambda r: r.voteCount )
        suggestions = topMatchesRecords + answerRecsFreq
        suggestionsOrdered = sorted( suggestions, key=lambda a:a.score, reverse=True )
        return suggestionsOrdered

    # No answer start text, so get most frequent answers
    else:
        answerRecords = Answer.query( Answer.surveyId==surveyId, Answer.questionId==questionIdStr ).fetch()
        answerRecsFreq = stats.weightedRandom( answerRecords, const.MAX_ANSWER_SUGGESTIONS, lambda r: r.voteCount )
        suggestionsOrdered = sorted( answerRecsFreq, key=lambda a:a.voteCount, reverse=True )
        return suggestionsOrdered


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


def __tokenize( text ):
    return re.split( r'[^a-z0-9\-]+' , text.lower() )



# Key answers by questionId+hash(content), to prevent duplicates.
# Prevents problem of voting for answer that was deleted (down-voted) between display & vote
def toKeyId( questionId, answerContent ):
    hasher = hashlib.md5()
    hasher.update( answerContent )
    return "{}:{}".format( questionId, hasher.hexdigest() )


# answerContent may be null
# Returns Answer, AnswerVote
# If any answer vote increment fails... then undo answerVote._setVote() and all answer vote increments via transaction.
@ndb.transactional(xg=True, retries=const.MAX_VOTE_RETRY)   # Cross-table is ok because vote record (user x answer) is not contended, and answer vote count record is locking anyway.
def vote( questionId, surveyId, answerContent, userId, questionCreator ):

    logging.debug( 'vote() answerContent=' + str(answerContent) )

    answerRecord = None
    answerId = None
    isNewAnswer = False
    if (answerContent is not None) and (answerContent != ''):
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
    answerRecord = Answer( id=answerRecKey, questionId=questionId, surveyId=surveyId, creator=userId, 
        content=answerContent, voteCount=voteCount, fromEditPage=fromEditPage )

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

