# Shared functions for all http request service classes

# Import external modules
import json
import logging
# Import app modules
import common
from budget.configBudget import const as conf
import linkKey
from budget import slice
import user


########################################################################
# Filtering / transforming persistent record fields for display

def budgetToDisplay( budgetRecord, userId ):
    display = {
        'id': str(budgetRecord.key.id()) ,
        'timeCreated': budgetRecord.timeCreated ,
        'title': budgetRecord.title ,
        'introduction': budgetRecord.introduction ,
        'total': budgetRecord.total ,
        'mine': (budgetRecord.creator == userId) ,
        'allowEdit': (userId == budgetRecord.creator) and budgetRecord.allowEdit ,
        'freezeUserInput': budgetRecord.freezeUserInput ,
        'adminHistory': common.decodeChangeHistory( budgetRecord.adminHistory ) ,
    }
    # Only set if used
    if budgetRecord.hideReasons:  display['hideReasons'] = budgetRecord.hideReasons
    return display

def sliceToDisplay( sliceRecord, userId ):
    return {
        'id': str( sliceRecord.key.id() ) ,
        'title': sliceRecord.title ,
        'reason': sliceRecord.reason ,
        'mine': (sliceRecord.creator == userId) ,
        'voteCount': sliceRecord.voteCount ,
        'score': sliceRecord.score
    }

def sliceVotesToDisplay( sliceVotesRecord, userId ):
    return {
        'mine': sliceVotesRecord and (sliceVotesRecord.userId == userId) ,
        'slices': sliceVotesRecord.slices  if sliceVotesRecord  else [] ,
        'total': sliceVotesRecord.slicesTotalSize()  if sliceVotesRecord  else 0 ,
    } 


