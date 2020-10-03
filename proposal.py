# Import external modules.
from google.appengine.api import memcache
from google.appengine.ext import ndb
import logging
import random
import time
# Import local modules.
from configuration import const as conf
from constants import Constants


const = Constants()
const.MAX_RETRY = 3
const.MIN_REAGGREGATE_DELAY_SEC = 60


# Parent key: RequestForProposals?   No, use KeyProperty instead.
class Proposal(ndb.Model):
    requestId = ndb.StringProperty()   # May be null

    title = ndb.StringProperty()
    detail = ndb.StringProperty()
    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty()
    freezeUserInput = ndb.BooleanProperty( default=False )
    
    voteAggregateStartTime = ndb.IntegerProperty()
    numPros = ndb.IntegerProperty( default=0 )
    numCons = ndb.IntegerProperty( default=0 )
    netPros = ndb.IntegerProperty( default=0 )   # numPros - numCons
    lastSumUpdateTime = ndb.IntegerProperty( default=0 )


@ndb.transactional( retries=const.MAX_RETRY )
def setEditable( proposalId, editable ):
    proposalRecord = Proposal.get_by_id( int(proposalId) )
    proposalRecord.allowEdit = editable
    proposalRecord.put()



#####################################################################################
# Use tasklets for async counting pros/cons per proposal.

# @ndb.tasklet
# def maybeUpdateProConAggs( proposalId ):
#     allowAgg = yield __setVoteAggStartTime()   # Async, transaction
#     if allowAgg:
#         __updateVoteAggs( proposalId )
# 
# # If enough delay since voteAggregateStartTime... updates voteAggregateStartTime and returns flag.
# @ndb.transactional( retries=const.MAX_RETRY )
# def __setVoteAggStartTime( proposalId ):
#     proposalRecord = Proposal.get_by_id( int(proposalId) )
#     now = int( time.time() )
#     if proposalRecord.voteAggregateStartTime + const.MIN_REAGGREGATE_DELAY_SEC > now:
#         return False
#     proposalRecord.voteAggregateStartTime = now
#     proposalRecord.put()
#     return True
# 
# # Retrieves all reason vote counts for a proposal, sums their pro/con counts, and updates proposal pro/con counts.
# @ndb.tasklet
# def __updateVoteAggs( proposalId ):
#     reasons = yield Reason.query( Reason.proposalId==proposalId ).fetch_async()   # Async
#     numPros = sum( reason.voteCount for reason in reasons  if reason.proOrCon == conf.PRO )
#     numCons = sum( reason.voteCount for reason in reasons  if reason.proOrCon == conf.CON )
#     __setNumProsAndCons( proposalId, numPros, numCons )    # Transaction



#####################################################################################
# Use sharded counter to count pros/cons per proposal.

const.NUM_SHARDS = 10
const.SHARD_KEY_TEMPLATE = '{}-{}'   # proposalId, shardNum
const.COUNTER_CACHE_SEC = 10


class ProposalShard( ndb.Model ):
    requestId = ndb.StringProperty()
    proposalId = ndb.StringProperty()
    numPros = ndb.IntegerProperty( default=0 )
    numCons = ndb.IntegerProperty( default=0 )


@ndb.tasklet
def incrementTasklet( requestId, proposalId, prosInc, consInc ):
    logging.debug( 'proposal.incrementAsync() proposalId={}'.format(proposalId) )

    yield __incrementShard( requestId, proposalId, prosInc, consInc )   # Pause and wait for async transaction

    # Cache sums in Proposal record, to make top proposals queryable by score.
    # Rate-limit updates to Proposal, by storing last-update time
    now = int( time.time() )
    updateNow = yield __checkAndSetLastSumTime( proposalId, now )  # Pause and wait for async transaction
    logging.debug( 'proposal.incrementAsync() updateNow=' + str(updateNow) )

    if updateNow:
        shardRecords = yield __getProposalShardsAsync( proposalId )   # Pause and wait for async
        numPros = sum( s.numPros for s in shardRecords  if s )
        numCons = sum( s.numCons for s in shardRecords  if s )
        logging.debug( 'proposal.incrementAsync() numPros=' + str(numPros) + ' numCons=' + str(numCons) )

        yield __setNumProsAndConsAsync( proposalId, numPros, numCons )   # Pause and wait for async transaction
        logging.debug( 'proposal.incrementAsync() __setNumProsAndCons() done' )


@ndb.transactional_async( retries=const.MAX_RETRY )
def __incrementShard( requestId, proposalId, prosInc, consInc ):
    shardNum = random.randint( 0, const.NUM_SHARDS - 1 )
    shardKeyString = const.SHARD_KEY_TEMPLATE.format( proposalId, shardNum )
    shardRec = ProposalShard.get_by_id( shardKeyString )
    if shardRec is None:
        shardRec = ProposalShard( id=shardKeyString, requestId=requestId, proposalId=proposalId )
    shardRec.numPros += prosInc
    shardRec.numCons += consInc
    shardRec.put()


# Returns whether update is required now
@ndb.transactional_async( retries=const.MAX_RETRY )
def __checkAndSetLastSumTime( proposalId, now ):
    logging.debug( 'proposal.__checkAndSetLastSumTime() proposalId={}'.format(proposalId) )

    proposalRecord = Proposal.get_by_id( int(proposalId) )
    logging.debug( 'proposal.__checkAndSetLastSumTime() proposalRecord={}'.format(proposalRecord) )

    if proposalRecord.lastSumUpdateTime + const.COUNTER_CACHE_SEC < now:
        proposalRecord.lastSumUpdateTime = now
        proposalRecord.put()
        return True
    else:
        return False


def __getProposalShardsAsync( proposalId ):
    shardKeyStrings = [ const.SHARD_KEY_TEMPLATE.format(proposalId, s) for s in range(const.NUM_SHARDS) ]
    logging.debug( 'proposal.__getProposalShardsAsync() shardKeyStrings=' + str(shardKeyStrings) )

    shardKeys = [ ndb.Key(ProposalShard, s) for s in shardKeyStrings ]
    return ndb.get_multi_async( shardKeys )


@ndb.transactional_async( retries=const.MAX_RETRY )
def __setNumProsAndConsAsync( proposalId, numPros, numCons ):
    __setNumProsAndConsImp( proposalId, numPros, numCons )

@ndb.transactional( retries=const.MAX_RETRY )
def __setNumProsAndCons( proposalId, numPros, numCons ):
    __setNumProsAndConsImp( proposalId, numPros, numCons )

def __setNumProsAndConsImp( proposalId, numPros, numCons ):
    proposalRecord = Proposal.get_by_id( int(proposalId) )
    proposalRecord.numPros = numPros
    proposalRecord.numCons = numCons
    proposalRecord.netPros = numPros - numCons
    proposalRecord.put()


