# Shared functions that do not use ndb library


# Import external modules
import json
import logging
import os
import time
# Import app modules
from configuration import const as conf
import configuration


# Modifies changes:group[text, time]
def appendFreezeInputToHistory( freeze, changes, maxSize=100 ):
    changeText = conf.CHANGE_FREEZE_USER_INPUT  if freeze  else conf.CHANGE_THAW_USER_INPUT
    now = int( time.time() )
    appendChangeToHistory( changeText, now, changes, maxSize=maxSize )

def appendFreezeProposalsToHistory( freeze, changes, maxSize=100 ):
    changeText = conf.CHANGE_FREEZE_NEW_PROPOSALS  if freeze  else conf.CHANGE_THAW_NEW_PROPOSALS
    now = int( time.time() )
    appendChangeToHistory( changeText, now, changes, maxSize=maxSize )

# Modifies changes:group[text, time]
def appendChangeToHistory( changeText, changeTime, changes, maxSize=100 ):
    # Append new change
    changes.append( createChangeStruct(changeText, changeTime=changeTime) )
    # While we have too many values... remove oldest change
    while maxSize < len(changes):
        minChange = min( changes, key=lambda c: c.get('time', 0) )
        changes.remove( minChange )

def initialChangeHistory( changeTime=int(time.time()) ):  return [ createChangeStruct( conf.CHANGE_CREATE_SURVEY, changeTime=changeTime ) ]

def createChangeStruct( changeText, changeTime=int(time.time()) ):  return { 'text':changeText, 'time':changeTime } 


def decodeChangeHistory( changes ):
    codeToText = {
        conf.CHANGE_CREATE_SURVEY: 'Create survey',
        conf.CHANGE_FREEZE_USER_INPUT: 'Freeze user input',
        conf.CHANGE_THAW_USER_INPUT: 'Thaw user input',
        conf.CHANGE_FREEZE_NEW_PROPOSALS: 'Freeze new proposals',
        conf.CHANGE_THAW_NEW_PROPOSALS: 'Thaw new proposals',
    }
    return [  { 'text':codeToText.get(c['text'],c['text']), 'time':c['time'] }  for c in changes  ]


#################################################################################
# Unit test

import unittest

class TestUser(unittest.TestCase):

    def test_appendChangeToHistory( self ):
        changes = [ {'text':'1','time':1} ]
        appendChangeToHistory( '2', 2, changes, maxSize=2 )
        appendChangeToHistory( '3', 3, changes, maxSize=2 )
        appendChangeToHistory( '4', 4, changes, maxSize=2 )
        appendChangeToHistory( '5', 5, changes, maxSize=2 )
        self.assertEqual( 2, len(changes) )
        self.assertEqual( [{'text':'4','time':4} , {'text':'5','time':5}] , changes )
        decodeChangeHistory( changes )

    def test_initialChangeHistory( self ):
        now = 100
        changes = initialChangeHistory( changeTime=now )
        self.assertEqual( [{'text':conf.CHANGE_CREATE_SURVEY, 'time':now}] , changes )
        decodeChangeHistory( changes )

if __name__ == '__main__':
    configuration.logForUnitTest()
    unittest.main()


