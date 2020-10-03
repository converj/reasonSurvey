# Assumes that user can vote for only 1 reason per proposal -- uses proposalId as part of primary key.
#     If multiple votes allowed, have to key by reasonId, and count user's votes before flipping vote.
# 
# Parent key: userId ?
#     + To retrieve all user votes for a proposal/request?  No, use key-properties instead.
#     + To ensure that we get a consistent set of user votes for a proposal/request?  No, consistency not needed.


# Import external modules.
from google.appengine.ext import ndb
# Import app modules.
import configuration
import logging



class ReasonVote(ndb.Model):
    # Primary key: proposal x user, because only 1 reason vote allowed per proposal.
    proposalId = ndb.StringProperty()
    userId = ndb.StringProperty()
    
    requestId = ndb.StringProperty()   # Search index.  Needed to retrieve all votes for request.

    reasonId = ndb.StringProperty()   # A reason from proposalId
    voteUp = ndb.BooleanProperty( default=False )



# Set vote flag only if flag is flippable.
# Not for direct use in web-services -- instead use reason.vote()
# Parameters: voteUp:boolean
# Returns success:boolean, voteCountIncrements:map[reasonId->integer], ReasonVote
def _setVote( requestId, proposalId, reasonId, userId, voteUp ):

    voteCountIncrements = {}   # map[reasonId->integer]

    # Retrieve vote record.
    # Could use ReasonVote.get_or_insert(), but we do not discover if record is new.
    # Use get() with specific key string = proposalId+userId, because query() does not work in transaction.
    voteId = '{}-{}'.format( proposalId, userId )
    logging.debug( 'voteId=' + voteId )
    
    voteRecord = ReasonVote.get_by_id( voteId )
    logging.debug( 'voteRecord=' + str(voteRecord) )
        
    if voteRecord is None:
        voteRecord = ReasonVote( id=voteId, requestId=requestId, proposalId=proposalId, userId=userId )

    # If no change... update fails.
    if voteRecord.reasonId == reasonId  and  voteRecord.voteUp == voteUp:
        logging.debug( 'voteRecord no change' )
        return False, voteCountIncrements, voteRecord

    # Collect vote count change.
    voteCountInc = int(voteUp) - int(voteRecord.voteUp)   # Assumes False=0, True=1
    logging.debug( 'voteCountInc=' + str(voteCountInc) )
        
    # Collect reason vote-count increments.
    if voteRecord.reasonId == reasonId:
        voteCountIncrements[ voteRecord.reasonId ] = voteCountInc
    elif voteUp:
        if voteRecord.voteUp:  voteCountIncrements[ voteRecord.reasonId ] = -1
        voteCountIncrements[ reasonId ] = 1
    else:
        logging.debug( 'voteRecord voting-down unvoted reason' )
        return False, voteCountIncrements, voteRecord

    # Modify vote record.
    voteRecord.reasonId = reasonId
    voteRecord.voteUp = voteUp
    voteRecord.put()
    return True, voteCountIncrements, voteRecord



