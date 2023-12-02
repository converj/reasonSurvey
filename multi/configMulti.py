# Import from parent directory requires that this file has a different name from file in parent dir
import configuration


# Add to the parent-directory constants
conf = configuration.const

conf.MAX_LENGTH_SURVEY_INTRO = 3000
conf.MIN_OPTION_LENGTH = 1
conf.MAX_OPTION_LENGTH = 300

conf.MULTI_SURVEY_CLASS_NAME = 'MultipleQuestionSurvey'

conf.MAX_QUESTIONS = 10   # Too many questions / options is bad for participants
conf.MAX_OPTIONS = 10

conf.MIN_RATING = -10
conf.MAX_RATING =  10

conf.MAX_WORDS_TO_INDEX = 20
conf.MAX_COMPOUND_WORD_LENGTH = 2


