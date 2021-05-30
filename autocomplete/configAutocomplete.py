import configuration as baseConf  # Import from parent directory requires that this file has a different name from file in parent dir.


const = baseConf.const   # Callers can import only this file and get both base and local constants via "const" variable

const.minLengthSurveyIntro = 30
const.minLengthQuestion = 30
const.minLengthAnswer = 1

const.SURVEY_CLASS_NAME = 'Survey'
const.QUESTION_CLASS_NAME = 'Question'
const.ANSWER_CLASS_NAME = 'Answer'

const.ERROR_DUPLICATE = 'ERROR_DUPLICATE'

