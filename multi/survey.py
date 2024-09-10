# Data-record class

# External modules
from google.appengine.ext import ndb
import logging
import re
# Application modules
import common
from multi.configMulti import conf
from text import LogMessage


KEY_ID = 'id'
KEY_TYPE = 'type'
KEY_TITLE = 'title'
KEY_DETAIL = 'detail'
KEY_RATING_MIN = 'minRating'
KEY_RATING_MAX = 'maxRating'
KEY_RATING_MIN_LABEL = 'minRatingLabel'
KEY_RATING_MAX_LABEL = 'maxRatingLabel'
KEY_OPTIONS = 'options'
KEY_BUDGET_TOTAL = 'maxTotal'
KEY_MAX_ITEMS = 'maxItems'
KEY_REQUIRE_REASON = 'requireReason'
KEY_IMAGE_ID = 'imageId'

TYPE_INFO = 'info'
TYPE_RATE = 'rate'
TYPE_RANK = 'rank'
TYPE_CHECKLIST = 'checklist'
TYPE_TEXT = 'text'
TYPE_BUDGET = 'budget'
TYPE_LIST = 'list'
TYPE_PROPOSAL = 'proposal'
TYPE_REQUEST_SOLUTIONS = 'solutions'
TYPE_REQUEST_PROBLEMS = 'problems'
QUESTION_TYPES = [ TYPE_INFO, TYPE_RATE, TYPE_RANK, TYPE_CHECKLIST, TYPE_TEXT, TYPE_BUDGET, TYPE_LIST,
    TYPE_PROPOSAL, TYPE_REQUEST_SOLUTIONS, TYPE_REQUEST_PROBLEMS ]


class MultipleQuestionSurvey( ndb.Model ):

    # Content
    title = ndb.StringProperty()
    detail = ndb.StringProperty()
    questions = ndb.JsonProperty( default=[] )  # series[ question:{id, title, detail, type, options?} ] , using array because order matters
    questionInstanceCount = ndb.IntegerProperty( default=0 )
    optionInstanceCount = ndb.IntegerProperty( default=0 )

    # Status
    timeCreated = ndb.IntegerProperty( default=0 )
    creator = ndb.StringProperty()
    freezeUserInput = ndb.BooleanProperty( default=False )
    adminHistory = ndb.JsonProperty( default=[] )  # group[ {text:conf.CHANGE*, time:seconds} ]

    # For cleaning up unused records
    timeModified = ndb.DateTimeProperty( auto_now=True )
    hasResponses = ndb.BooleanProperty( default=False )  # Set when first answer is created by participant


    #########################################################################
    # Methods for surveys

    @staticmethod
    def retrieve( surveyId ):  return MultipleQuestionSurvey.get_by_id( int(surveyId) )

    def allowEdit( self ):  return not self.hasResponses


    #########################################################################
    # Methods for questions

    def addQuestion( self, title=None, detail=None, type=TYPE_INFO ):
        self.questionInstanceCount += 1
        # Prepend a letter to ID, to ensure it is always treated as a string
        # Do not create ID from hash of content nor from question-position, because these may change
        # Question counter is ok because increments are not contended
        newQuestion = { KEY_ID:'q{}'.format(self.questionInstanceCount), KEY_TITLE:title, KEY_DETAIL:detail, KEY_TYPE:type }
        self._setQuestionType( newQuestion, type )
        self.questions.append( newQuestion )
        return newQuestion

    @staticmethod
    def isValidQuestionId( questionId ):  return re.match( r'^q\d+$', questionId )

    def questionIdExists( self, questionId ):
        questionsWithId = [ q  for q in self.questions  if q[KEY_ID] == questionId ]
        return ( 0 < len(questionsWithId) )

    def getQuestionOptionIds( self, questionId ):
        question = self.getQuestion( questionId )
        return [ q[KEY_ID] for q in question[KEY_OPTIONS] ]  if KEY_OPTIONS in question  else []

    def getQuestionType( self, questionId ):
        question = self.getQuestion( questionId )
        return question[ KEY_TYPE ]

    def getQuestionRequiresReason( self, questionId ):  return self.getQuestion( questionId ).get( KEY_REQUIRE_REASON, True )

    def setQuestionContent( self, questionId, title, detail ):
        question = self.getQuestion( questionId )
        question[ KEY_TITLE ] = title
        question[ KEY_DETAIL ] = detail

    def setQuestionImageId( self, questionId, imageId ):
        question = self.getQuestion( questionId )
        question[ KEY_IMAGE_ID ] = imageId

    def getQuestionImageId( self, questionId ):
        question = self.getQuestion( questionId )
        return question.get( KEY_IMAGE_ID, None )

    def setQuestionType( self, questionId, newType ):
        if newType not in QUESTION_TYPES:  raise KeyError( 'newType not in QUESTION_TYPES' )
        question = self.getQuestion( questionId )
        self._setQuestionType( question, newType )

    def _setQuestionType( self, question, newType ):
        question[ KEY_TYPE ] = newType
        if ( newType == TYPE_RATE ):
            if ( question.get(KEY_RATING_MIN, None) == None ):  question[ KEY_RATING_MIN ] = 1
            if ( question.get(KEY_RATING_MAX, None) == None ):  question[ KEY_RATING_MAX ] = 5

    def setQuestionRequiresReason( self, questionId, required ):
        self.getQuestion( questionId )[ KEY_REQUIRE_REASON ] = required

    def getQuestion( self, questionId ):
        questionsWithId = [ q  for q in self.questions  if q[KEY_ID] == questionId ]
        if ( len(questionsWithId) != 1 ):  raise KeyError(  'Found {} records for questionId={}'.format( len(questionsWithId), questionId )  )
        return questionsWithId[ 0 ]

    def deleteQuestion( self, questionId ):
        self.questions = [ q  for q in self.questions  if q[KEY_ID] != questionId ]

    def getQuestionIds( self ):  return [ q[KEY_ID] for q in self.questions ]

    def getIdToQuestion( self ):  return { q[KEY_ID] : q  for q in self.questions }

    # Validate answer based on question constraints, for rating, ranking
    # Other question-types require different types of validation
    #  Example: budget total, existing proposal reason ID
    def isAnswerInBounds( self, questionId, answer ):
        if answer is None:  return False
        question = self.getQuestion( questionId )
        questionType = question[ KEY_TYPE ]
        if questionType == TYPE_RATE:
            ratingMin = question[ KEY_RATING_MIN ]
            ratingMax = question[ KEY_RATING_MAX ]
            return ( ratingMin <= answer ) and ( answer <= ratingMax )
        elif questionType == TYPE_RANK:
            # Ranks are 1-based, for less conversion logic
            options = question.get( KEY_OPTIONS, [] )
            return ( 0 < answer ) and ( answer <= len(options) )
        elif questionType == TYPE_CHECKLIST:
            return answer in [ 0, 1 ]
        elif questionType == TYPE_BUDGET:
            return ( 5 <= answer ) and ( answer <= 100 )
        else:
            return False


    #########################################################################
    # Methods for rating-question options

    def addOption( self, questionId, content ):
        self.optionInstanceCount += 1
        question = self.getQuestion( questionId )
        if KEY_OPTIONS not in question:  question[ KEY_OPTIONS ] = []
        newOption = { KEY_ID:'o{}'.format(self.optionInstanceCount) , KEY_TITLE:content }
        question[ KEY_OPTIONS ].append( newOption )
        return newOption

    @staticmethod
    def isValidOptionId( optionId ):  return re.match( r'^o\d+$', optionId )

    def setOptionContent( self, questionId, optionId, content ):
        option = self.getQuestionOption( questionId, optionId )
        option[ KEY_TITLE ] = content

    def setOptionImageId( self, questionId, optionId, imageId ):
        option = self.getQuestionOption( questionId, optionId )
        option[ KEY_IMAGE_ID ] = imageId

    def getOptionImageId( self, questionId, optionId ):
        option = self.getQuestionOption( questionId, optionId )
        return option.get( KEY_IMAGE_ID, None )

    def getQuestionOption( self, questionId, optionId ):
        question = self.getQuestion( questionId )
        optionsMatchingId = [ o  for o in question[KEY_OPTIONS]  if o[KEY_ID] == optionId ]
        if ( len(optionsMatchingId) != 1 ):  raise KeyError(  'Found {} records for questionId={} optionId={}'.format( len(optionsMatchingId), questionId, optionId )  )
        return optionsMatchingId[ 0 ]

    def reorderQuestionOptions( self, questionId, optionIdsOrdered ):
        question = self.getQuestion( questionId )
        idToOption = { option[KEY_ID] : option  for option in question[KEY_OPTIONS] }
        question[ KEY_OPTIONS ] = [ idToOption[o]  for o in optionIdsOrdered ]


    def deleteQuestionOption( self, questionId, optionId ):
        question = self.getQuestion( questionId )
        question[ KEY_OPTIONS ] = [ o  for o in question[KEY_OPTIONS]  if o[KEY_ID] != optionId ]


    #########################################################################
    # Methods to filter for client display

    def toClient( self, userId ):
        jsonData = {
            'id': str( self.key.id() ) ,
            'timeCreated': self.timeCreated ,
            'title': self.title ,
            'detail': self.detail ,
            'mine': ( userId == self.creator ) ,
            'allowEdit': ( userId == self.creator ) and self.allowEdit() ,
            'freezeUserInput': self.freezeUserInput ,
            'adminHistory': common.decodeChangeHistory( self.adminHistory ) ,
            'questions': [ self.questionToClient(q, userId)  for q in self.questions ] ,
        }
        return jsonData

    def questionToClient( self, surveyQuestion, userId ):
        questionType = surveyQuestion.get( KEY_TYPE, None )
        questionStruct = {
            'id': str(  surveyQuestion[ KEY_ID ]  ) ,
            'type': questionType ,
            'title': surveyQuestion.get( KEY_TITLE, None ) ,
            'detail': surveyQuestion.get( KEY_DETAIL, None ) ,
            'options': [ self.optionToClient(o, userId)  for o in surveyQuestion.get(KEY_OPTIONS, []) ] ,
            'requireReason': surveyQuestion.get( KEY_REQUIRE_REASON, True ) ,
        }

        imageId = surveyQuestion.get( KEY_IMAGE_ID, None )
        if imageId is not None:  questionStruct['image'] = imageId

        if ( questionType == TYPE_RATE ):
            questionStruct['ratingMin'] = surveyQuestion.get( KEY_RATING_MIN, None )
            questionStruct['ratingMax'] = surveyQuestion.get( KEY_RATING_MAX, None )
            questionStruct['ratingMinLabel'] = surveyQuestion.get( KEY_RATING_MIN_LABEL, None )
            questionStruct['ratingMaxLabel'] = surveyQuestion.get( KEY_RATING_MAX_LABEL, None )
        if ( questionType == TYPE_BUDGET ):
            questionStruct['maxTotal'] = surveyQuestion.get( KEY_BUDGET_TOTAL, None )
        if ( questionType == TYPE_LIST ):
            questionStruct['maxItems'] = surveyQuestion.get( KEY_MAX_ITEMS, 5 )

        return questionStruct

    def optionToClient( self, surveyQuestionOption, userId ):
        jsonData = {
            'id': str(  surveyQuestionOption[ KEY_ID ]  ) ,
            'title': surveyQuestionOption.get( KEY_TITLE, None ) ,
        }

        imageId = surveyQuestionOption.get( KEY_IMAGE_ID, None )
        if imageId is not None:  jsonData['image'] = imageId

        return jsonData

