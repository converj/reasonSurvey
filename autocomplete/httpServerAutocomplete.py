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
    return {
        'id': str(surveyRecord.key.id()),
        'introduction': surveyRecord.introduction,
        'mine': (surveyRecord.creator == userId),
        'allowEdit': (userId == surveyRecord.creator) and surveyRecord.allowEdit ,
        'freezeUserInput': surveyRecord.freezeUserInput
    }

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

