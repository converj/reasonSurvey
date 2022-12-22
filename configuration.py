# Import external modules
import logging
import os
import sys
# Import app modules
from constants import Constants


# Call this during unit-tests, to configure visible logs
def logForUnitTest():
    logging.basicConfig( stream=sys.stdout, level=logging.DEBUG, format='%(filename)s %(funcName)s():  %(message)s' )


# Constants
const = Constants()

const.pythonVersion = sys.version_info[0]

const.isDev = os.path.isfile('configurationDev.py')  or  ( not os.getenv('GAE_ENV', '').startswith('standard') )
if const.isDev:  import configurationDev

if const.isDev:  logging.getLogger().setLevel( logging.DEBUG )
else:            logging.getLogger().setLevel( logging.WARNING )

const.SITE_NAME = 'Converj'

const.COOKIE_FIELD_SIGNATURE = 'signature'
const.COOKIE_FIELD_BROWSER_ID = 'identity'
const.COOKIE_FIELD_VOTER_ID = 'voterId'
const.COOKIE_FIELD_VOTER_CITY = 'voterCity'
const.COOKIE_FIELD_RECENTS = 'recent'

const.PRO = 'pro'
const.CON = 'con'

const.CHANGE_CREATE_SURVEY = 'CHANGE_CREATE_SURVEY'
const.CHANGE_FREEZE_USER_INPUT = 'CHANGE_FREEZE_USER_INPUT'
const.CHANGE_THAW_USER_INPUT = 'CHANGE_THAW_USER_INPUT'
const.CHANGE_FREEZE_NEW_PROPOSALS = 'CHANGE_FREEZE_NEW_PROPOSALS'
const.CHANGE_THAW_NEW_PROPOSALS = 'CHANGE_THAW_NEW_PROPOSALS'


# Login parameters
const.LOGIN_URL = 'https://openvoterid.net/login'
const.VOTER_ID_TIMEOUT_SEC = 600   # 10 minutes
const.VOTER_ID_LOGIN_SIG_LENGTH = 30
const.VOTER_ID_LOGIN_REQUEST_ID_LENGTH = 30

# Minimum content lengths
const.minLengthRequest = 30
const.minLengthProposal = 30
const.minLengthReason = 20

const.recentRequestsMax = 10

const.MAX_TOP_REASONS = 6

# HTTP/JSON request response codes
const.TOO_SHORT = 'TOO_SHORT'
const.REASON_TOO_SHORT = 'REASON_TOO_SHORT'
const.DUPLICATE = 'DUPLICATE'
const.BAD_CRUMB = 'BAD_CRUMB'
const.NO_COOKIE = 'NO_COOKIE'
const.NO_LOGIN = 'NO_LOGIN'
const.BAD_LINK = 'BAD_LINK'
const.NOT_OWNER = 'NOT_OWNER'
const.NOT_HOST = 'NOT_HOST'
const.HAS_RESPONSES = 'HAS_RESPONSES'
const.FROZEN = 'FROZEN'
const.EXPERIMENT_NOT_AUTHORIZED = 'EXPERIMENT_NOT_AUTHORIZED'

# Persistent record class names
const.REQUEST_CLASS_NAME = 'RequestForProposals'
const.REASON_CLASS_NAME = 'Reason'
const.PROPOSAL_CLASS_NAME = 'Proposal'
const.USER_CLASS_NAME = 'User'
const.LINK_KEY_CLASS_NAME = 'LinkKey'

# Survey types
const.SURVEY_TYPE_REQUEST_PROPOSALS = 'SURVEY_TYPE_REQUEST_PROPOSALS' 
const.SURVEY_TYPE_PROPOSAL = 'SURVEY_TYPE_PROPOSAL' 
const.SURVEY_TYPE_AUTOCOMPLETE = 'SURVEY_TYPE_AUTOCOMPLETE' 
const.SURVEY_TYPE_BUDGET = 'SURVEY_TYPE_BUDGET' 

# Environment variable names
const.REQUEST_LOG_ID = 'REQUEST_LOG_ID'


const.MAX_WORDS_INDEXED = 20

const.STOP_WORDS = [
    "a",
    "about",
    "above",
    "after",
    "again",
    "against",
    "all",
    "am",
    "an",
    "and",
    "any",
    "are",
    "aren't",
    "as",
    "at",
    "be",
    "because",
    "been",
    "before",
    "being",
    "below",
    "between",
    "both",
    "but",
    "by",
    "can't",
    "cannot",
    "could",
    "couldn't",
    "did",
    "didn't",
    "do",
    "does",
    "doesn't",
    "doing",
    "don't",
    "down",
    "during",
    "each",
    "few",
    "for",
    "from",
    "further",
    "had",
    "hadn't",
    "has",
    "hasn't",
    "have",
    "haven't",
    "having",
    "he",
    "he'd",
    "he'll",
    "he's",
    "her",
    "here",
    "here's",
    "hers",
    "herself",
    "him",
    "himself",
    "his",
    "how",
    "how's",
    "i",
    "i'd",
    "i'll",
    "i'm",
    "i've",
    "if",
    "in",
    "into",
    "is",
    "isn't",
    "it",
    "it's",
    "its",
    "itself",
    "let's",
    "me",
    "more",
    "most",
    "mustn't",
    "my",
    "myself",
    "nor",
    "not",
    "of",
    "off",
    "on",
    "once",
    "only",
    "or",
    "other",
    "ought",
    "our",
    "ours",
    "ourselves",
    "out",
    "over",
    "own",
    "same",
    "shan't",
    "she",
    "she'd",
    "she'll",
    "she's",
    "should",
    "shouldn't",
    "so",
    "some",
    "such",
    "than",
    "that",
    "that's",
    "the",
    "their",
    "theirs",
    "them",
    "themselves",
    "then",
    "there",
    "there's",
    "these",
    "they",
    "they'd",
    "they'll",
    "they're",
    "they've",
    "this",
    "those",
    "through",
    "to",
    "too",
    "under",
    "until",
    "up",
    "very",
    "was",
    "wasn't",
    "we",
    "we'd",
    "we'll",
    "we're",
    "we've",
    "were",
    "weren't",
    "what",
    "what's",
    "when",
    "when's",
    "where",
    "where's",
    "which",
    "while",
    "who",
    "who's",
    "whom",
    "why",
    "why's",
    "with",
    "won't",
    "would",
    "wouldn't",
    "you",
    "you'd",
    "you'll",
    "you're",
    "you've",
    "your",
    "yours",
    "yourself",
    "yourselves"
]

const.STOP_WORDS_SET = set( const.STOP_WORDS )

