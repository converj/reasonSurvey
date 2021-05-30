# Shared functions for all http request service classes.

# Import external modules.
import json
import logging
# Import app modules.
from configAutocomplete import const as conf
import linkKey
import user


########################################################################
# Filtering / transforming persistent record fields for display

def surveyToDisplay( surveyRecord, userId ):
    display = {
        'id': str(surveyRecord.key.id()),
        'title': surveyRecord.title ,
        'introduction': surveyRecord.introduction,
        'mine': (surveyRecord.creator == userId),
        'allowEdit': (userId == surveyRecord.creator) and surveyRecord.allowEdit ,
        'freezeUserInput': surveyRecord.freezeUserInput
    }
    # Only set if used
    if surveyRecord.hideReasons:  display['hideReasons'] = surveyRecord.hideReasons
    return display

def questionToDisplay( questionRecord, userId ):
    return {
        'id': str(questionRecord.key.id()),
        'content': questionRecord.content,
        'mine': (questionRecord.creator == userId)
    }

def answerToDisplay( answerRecord, userId ):
    return {
        'questionId': answerRecord.questionId,
        'id': str(answerRecord.key.id()),
        'content': answerRecord.content,
        'mine': (answerRecord.creator == userId),
        'voteCount': answerRecord.voteCount,
        'score': answerRecord.score
    }

