# Record-class for storing question x user -> answer vote


# Import external modules.
from google.appengine.ext import ndb
# Import app modules.
import configuration
import logging


class AnswerVote( ndb.Model ):
    # Primary key
    userId = ndb.StringProperty()
    questionId = ndb.StringProperty()
    
    # For querying all answers by user in a survey
    surveyId = ndb.StringProperty()

    answerId = ndb.StringProperty()


# answerId may be null
# Returns voteCountIncrements:map[answerId->integer], ReasonVote
def _setVote( surveyId, questionId, answerId, userId ):

    # Retrieve vote record by custom key string because query(userId,questionId) does not work in transaction.
    voteId = _toKeyId( questionId, userId )
    logging.debug( 'voteId=' + voteId )
    
    voteRecord = AnswerVote.get_by_id( voteId )
    logging.debug( 'voteRecord=' + str(voteRecord) )

    # Compute answer vote increments.
    if voteRecord is None:
        # Create vote record
        voteRecord = AnswerVote( id=voteId, surveyId=surveyId, questionId=questionId, userId=userId )
        voteCountIncrements = { answerId:1 }
    elif voteRecord.answerId == answerId:
        # If no change... update fails.
        logging.debug( 'voteRecord no change' )
        return {}, voteRecord
    else:
        voteCountIncrements = { answerId:1 , voteRecord.answerId:-1 }

    # Modify vote record.
    voteRecord.answerId = answerId
    voteRecord.put()
    return voteCountIncrements, voteRecord


def get( questionId, userId ):
    voteId = _toKeyId( questionId, userId )
    voteRecord = AnswerVote.get_by_id( voteId )
    return voteRecord


def _toKeyId( questionId, userId ):
    return '{}-{}'.format( questionId, userId )


