# Import external modules
from google.appengine.api import memcache
from google.appengine.ext import ndb
import logging
import random
import time
# Import app modules
from configuration import const as conf
from constants import Constants
import text


# Constants for use only inside this file/module
const = Constants()
const.MAX_RETRY = 3
const.MIN_REAGGREGATE_DELAY_SEC = 60


class Proposal( ndb.Model ):
    requestId = ndb.StringProperty()   # May be null

    title = ndb.StringProperty()
    detail = ndb.StringProperty()

    timeCreated = ndb.IntegerProperty( default=0 )
    creator = ndb.StringProperty()
    allowEdit = ndb.BooleanProperty()
    freezeUserInput = ndb.BooleanProperty( default=False )
    adminHistory = ndb.JsonProperty( default=[] )  # group[ {text:conf.CHANGE*, time:seconds} ]

    # For cleaning up unused records
    timeModified = ndb.DateTimeProperty( auto_now=True )
    hasResponses = ndb.ComputedProperty( lambda record: not record.allowEdit )  # Cannot compute from lastSumUpdateTime, because lastSumUpdateTime only changes if a reason has votes

    voteAggregateStartTime = ndb.IntegerProperty()
    numPros = ndb.IntegerProperty( default=0 )
    numCons = ndb.IntegerProperty( default=0 )
    netPros = ndb.IntegerProperty( default=0 )   # numPros - numCons
    score = ndb.FloatProperty( default=0 )
    lastSumUpdateTime = ndb.IntegerProperty( default=0 )

    words = ndb.StringProperty( repeated=True )

    # Experimental
    hideReasons = ndb.BooleanProperty( default=False )
    # Proposal-ids for empty (hidden) reasons
    emptyProId = ndb.StringProperty()
    emptyConId = ndb.StringProperty()


    def setContent( self, title, detail ):
        self.title = title
        self.detail = detail
        # Index content words 
        words = text.uniqueInOrder(  text.removeStopWords( text.tokenize(title) + text.tokenize(detail) )  )
        words = words[ 0 : conf.MAX_WORDS_INDEXED ]  # Limit number of words indexed 
        self.words = text.tuples( words, maxSize=2 )

    def updateScore( self ):
        contentLen = ( len(self.title) if self.title else 0 ) + ( len(self.detail) if self.detail else 0 )
        self.score = float( self.netPros ) / float( contentLen + 100.0 )



# Returns records, cursor, more-flag
def retrieveTopProposals( requestId, maxProposals, cursor=None ):
    future = retrieveTopProposalsAsync( requestId, maxProposals, cursor=cursor )
    return future.get_result()

# Returns future producing 1 batch of records & next-page-cursor 
def retrieveTopProposalsAsync( requestId, maxProposals, cursor=None ):
    if conf.isDev:  logging.debug( 'retrieveTopProposalsAsync() requestId=' + str(requestId) + ' cursor=' + str(cursor) )
    requestIdStr = str( requestId )
    return Proposal.query( Proposal.requestId==requestIdStr ).order( -Proposal.netPros ).fetch_page_async( maxProposals, start_cursor=cursor )


# Returns series[ proposal-record-future ] 
def retrieveTopProposalsForStart( requestId, proposalStart ):
    requestIdStr = str( requestId )
    inputWords = text.uniqueInOrder(  text.removeStopWords( text.tokenize(proposalStart) )  )
    if conf.isDev:  logging.debug( 'retrieveTopProposalsForStart() inputWords=' + str(inputWords) )

    proposalRecordFutures = []
    if inputWords and ( 0 < len(inputWords) ):
        # Retrieve top-voted proposal-records matching last input-word 
        # Results will be collected & match-scored in client 
        lastWord = inputWords[ -1 ]
        proposalRecordFutures.append(  Proposal.query( Proposal.requestId==requestIdStr, Proposal.words==lastWord
            ).order( -Proposal.score ).fetch_async( 1 )  )
        # Retrieve for last input-word-pair 
        if ( 2 <= len(inputWords) ):
            lastTuple = ' '.join( inputWords[-2:-1] )
            proposalRecordFutures.append(  Proposal.query( Proposal.requestId==requestIdStr, Proposal.words==lastTuple
                ).order( -Proposal.score ).fetch_async( 1 )  )

    # De-duplicate records, since both word & tuple-top-suggestion may be the same 
    recordsUnique = { }
    for f in proposalRecordFutures:
        if f:
            for r in f.get_result():
                if r:
                    recordsUnique[ r.key.id() ] = r
    if conf.isDev:  logging.debug( 'retrieveTopProposalsForStart() recordsUnique=' + str(recordsUnique) )

    return recordsUnique.values()



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
    if conf.isDev:  logging.debug( 'proposal.incrementTasklet() proposalId={}'.format(proposalId) )

    yield __incrementShard( requestId, proposalId, prosInc, consInc )   # Pause and wait for async transaction

    # Cache sums in Proposal record, to make top proposals queryable by score.
    # Rate-limit updates to Proposal, by storing last-update time
    now = int( time.time() )
    updateNow = yield __checkLastSumTime( proposalId, now )  # Pause and wait for async transaction
    if conf.isDev:  logging.debug( 'proposal.incrementTasklet() updateNow=' + str(updateNow) )

    if updateNow:
        shardRecords = yield __getProposalShardsAsync( proposalId )   # Pause and wait for async
        numPros = sum( s.numPros for s in shardRecords  if s )
        numCons = sum( s.numCons for s in shardRecords  if s )
        if conf.isDev:  logging.debug( 'proposal.incrementTasklet() numPros=' + str(numPros) + ' numCons=' + str(numCons) )

        yield __setNumProsAndConsAsync( proposalId, numPros, numCons, now )   # Pause and wait for async transaction
        if conf.isDev:  logging.debug( 'proposal.incrementTasklet() __setNumProsAndConsTransact() done' )


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
def __checkLastSumTime( proposalId, now ):
    if conf.isDev:  logging.debug( 'proposal.__checkLastSumTime() proposalId={}'.format(proposalId) )

    proposalRecord = Proposal.get_by_id( int(proposalId) )
    if conf.isDev:  logging.debug( 'proposal.__checkLastSumTime() proposalRecord={}'.format(proposalRecord) )

    if proposalRecord.lastSumUpdateTime + const.COUNTER_CACHE_SEC < now:
        return True
    else:
        return False


def __getProposalShardsAsync( proposalId ):
    shardKeyStrings = [ const.SHARD_KEY_TEMPLATE.format(proposalId, s) for s in range(const.NUM_SHARDS) ]
    if conf.isDev:  logging.debug( 'proposal.__getProposalShardsAsync() shardKeyStrings=' + str(shardKeyStrings) )

    shardKeys = [ ndb.Key(ProposalShard, s) for s in shardKeyStrings ]
    return ndb.get_multi_async( shardKeys )


@ndb.transactional_async( retries=const.MAX_RETRY )
def __setNumProsAndConsAsync( proposalId, numPros, numCons, now ):
    __setNumProsAndConsImp( proposalId, numPros, numCons, now )

def __setNumProsAndConsImp( proposalId, numPros, numCons, now ):
    proposalRecord = Proposal.get_by_id( int(proposalId) )
    proposalRecord.numPros = numPros
    proposalRecord.numCons = numCons
    proposalRecord.netPros = numPros - numCons
    proposalRecord.updateScore()
    proposalRecord.lastSumUpdateTime = now
    proposalRecord.allowEdit = False  # If votes have been given to proposal's empty / reasons... do not allow editing proposal
    proposalRecord.put()


