# Uses Sharded vote counter, to increase vote throughput.
#     https://cloud.google.com/appengine/articles/sharding_counters


# Import external modules.
from google.appengine.ext import ndb
import math
# Import app modules.
from configuration import const as conf
from constants import Constants
import logging
import proposal
import reasonVote
import traceback


# Constants
const = Constants()
const.MAX_RETRY = 3
const.MAX_VOTE_RETRY = 3
const.CHAR_LENGTH_UNIT = 100


# Persistent record
# Parent key: proposal?  No, use key-properties instead, for better throughput.
class Reason(ndb.Model):
    proposalId = ndb.StringProperty()   # Primary key.  Needed to retrieve all reasons for a single proposal.
    requestId = ndb.StringProperty()   # Search index.  Needed to retrieve all reasons for request.

    content = ndb.StringProperty()
    proOrCon = ndb.StringProperty()  # { 'pro', 'con' }
    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty()

    voteCount = ndb.IntegerProperty( default=0 )
    score = ndb.FloatProperty( default=0 )


def voteCountToScore( voteCount, content ):
    contentLen = len(content)
    # score = votes per CHAR_LENGTH_UNITs used
    unitsUsed = float(contentLen) / float(const.CHAR_LENGTH_UNIT)  if contentLen >= const.CHAR_LENGTH_UNIT  else 1.0
    return float(voteCount) / float(unitsUsed)


@ndb.transactional( retries=const.MAX_RETRY )
def setEditable( reasonId, editable ):
    reasonRecord = Reason.get_by_id( int(reasonId) )
    reasonRecord.allowEdit = editable
    reasonRecord.put()


# Returns a group of query futures.
def retrieveTopReasonsAsync( proposalId, maxReasons ):
    proposalIdStr = str( proposalId )
    maxReasonsPerColumn = maxReasons / 2
    reasonRecordsFutures = []
 
    reasonRecordsFuture = Reason.query( Reason.proposalId==proposalIdStr, Reason.proOrCon==conf.PRO ).order(
        -Reason.score ).fetch_async( maxReasonsPerColumn )
    reasonRecordsFutures.append( reasonRecordsFuture ) 
 
    reasonRecordsFuture = Reason.query( Reason.proposalId==proposalIdStr, Reason.proOrCon==conf.CON ).order(
        -Reason.score ).fetch_async( maxReasonsPerColumn )
    reasonRecordsFutures.append( reasonRecordsFuture ) 
    
    return [ f for f in reasonRecordsFutures  if f is not None ]


# Returns a group of query records.
def fetchReasonRecordsFutures( reasonRecordsFutures ):
    reasonRecords = []
    for f in reasonRecordsFutures:
        if f is not None:
            reasonRecordsBatch = f.get_result()
            if reasonRecordsBatch is not None:
                reasonRecords.extend( reasonRecordsBatch )
    reasonRecords = sorted( reasonRecords , key=lambda r:-r.score )
    return reasonRecords


# Assumes that user can vote for only 1 reason per proposal.
# Parameters: voteUp:boolean
# Returns success:boolean, updated Reason, updated ReasonVote
def vote( requestId, proposalId, reasonId, userId, voteUp, isRequestForProposals=False ):
    success, reasonRec, reasonVoteRec, prosInc, consInc = _voteTransaction( requestId, proposalId, reasonId, userId, voteUp )  # Transaction
    if success and isRequestForProposals and (prosInc != 0  or  consInc != 0):
        logging.debug( 'reason.vote() incrementAsync() starting' )
        proposal.incrementTasklet( requestId, proposalId, prosInc, consInc )  # Async
        logging.debug( 'reason.vote() incrementAsync() done' )
    return success, reasonRec, reasonVoteRec


# Assumes that user can vote for only 1 reason per proposal.
# Parameters: voteUp:boolean
# Returns success:boolean, Reason, ReasonVote
@ndb.transactional(xg=True, retries=const.MAX_VOTE_RETRY)   # Cross-table is ok because vote record (user x proposal) is not contended, and reason vote count record is locking anyway.
def _voteTransaction( requestId, proposalId, reasonId, userId, voteUp ):
    voteFlagSuccess, voteCountIncrements, voteRecord = reasonVote._setVote( requestId, proposalId, reasonId, userId, voteUp )  # Uncontested
    logging.debug( 'vote() voteFlagSuccess=' + str(voteFlagSuccess) + ' voteCountIncrements=' + str(voteCountIncrements) + ' voteRecord=' + str(voteRecord) )

    if not voteFlagSuccess:  return False, None, voteRecord, 0, 0
    
    # If any reason vote increment fails... then undo reasonVote._setVote() and all reason vote increments via transaction.
    reasonRecord = None
    prosInc = 0
    consInc = 0
    for incReasonId, voteCountIncrement in voteCountIncrements.iteritems():
        incReasonRecord = _incrementVoteCount( incReasonId, voteCountIncrement )  # Contested lightly
        if str(incReasonRecord.key.id()) == reasonId:  reasonRecord = incReasonRecord

        if incReasonRecord.proOrCon == conf.PRO:  prosInc += voteCountIncrement
        elif incReasonRecord.proOrCon == conf.CON:  consInc += voteCountIncrement

    return True, reasonRecord, voteRecord, prosInc, consInc


# Increment vote count, inside another transaction.
# Returns updated Reason record, or throws transaction Conflict exception.
def _incrementVoteCount( reasonId, amount ):
    reasonRecord = Reason.get_by_id( int(reasonId) )
    reasonRecord.voteCount += amount
    reasonRecord.score = voteCountToScore( reasonRecord.voteCount, reasonRecord.content )
    reasonRecord.put()
    return reasonRecord

