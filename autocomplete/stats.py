# Import external modules
from collections import Counter
import hashlib
import logging
import random
import re
# Import app modules
from configAutocomplete import const as conf



# Random selection of N elements, with removal
def randomSample( records, maxRecords ):
    if len(records) <= maxRecords:  return list( records )

    recordsWithRemoval = list( records )
    selected = [ ]

    # Repeat maxRecords times...
    for r in range(maxRecords):
        if len(recordsWithRemoval) == 0:  break
        # Do random selection of 1 answer record
        randomIndex = int( random.uniform( 0, len(recordsWithRemoval) ) )
        # Collect and remove selected answer record
        record = recordsWithRemoval[ randomIndex ]
        selected.append( record )
        recordsWithRemoval.remove( record )
    return selected


# Vote-count-weighted random selection of N elements, with removal
def weightedRandom( records, maxRecords, weightAccessor ):
    recordsWithRemoval = list( records )
    sumWeights = sum(  [ weightAccessor(a) for a in recordsWithRemoval ]  )
    selected = [ ]

    # Repeat maxRecords times...
    for r in range(maxRecords):
        if len(recordsWithRemoval) == 0:  break
        
        # Do weighted-random selection of 1 answer record
        randomWeightSum = random.uniform( 0, sumWeights )
        sumWeightsPass2 = 0
        for record in recordsWithRemoval:
            sumWeightsPass2 += weightAccessor(record)
            if sumWeightsPass2 >= randomWeightSum:
                # Collect and remove selected answer record
                selected.append( record )
                recordsWithRemoval.remove( record )
                sumWeights -= weightAccessor(record)
                break
    return selected


def computeInvDocFreq( documentMatches, queryWords ):
    wordToDocCount = Counter()  # count of documents with term
    for documentMatch in documentMatches:
        documentWordSet = set( documentMatch.wordSeq )
        for word in documentWordSet:
            if (word in queryWords) and (word not in conf.STOP_WORDS):
                wordToDocCount[ word ] += 1

    logging.debug( 'wordToDocCount=' + str(wordToDocCount) )

    return { word: 1.0 / float(count)  for word,count in wordToDocCount.iteritems() }




###################################################################################
# Unit test

import unittest


class TestStats(unittest.TestCase):

    def testRandomSample( self ):

        random.seed( 1 )
        records = [ 'a', 'b', 'c', 'd', 'e' ]
        sample = randomSample( records, 3 )
        self.assertEqual(  sample , [ records[0], records[4], records[3] ]  )

        random.seed( 3 )
        sample = randomSample( records, 3 )
        self.assertEqual(  sample , [ records[1], records[3], records[2] ]  )


    def testWeightedRandom( self ):

        random.seed( 1 )
        records = [ ('a', 1), ('b', 3), ('c', 10), ('d', 30), ('e', 100) ]
        sample = weightedRandom( records, 3,  lambda r: r[1]  )
        self.assertEqual(  sample , [ records[3], records[4], records[2] ]  )

        random.seed( 2 )
        sample = weightedRandom( records, 3,  lambda r: r[1]  )
        self.assertEqual(  sample , [ records[4], records[3], records[0] ]  )


    def testInvDocFreq( self ):
        class MockDocumentMatch:
            def __init__( self, wordSeq ):
                self.wordSeq = wordSeq

        documentMatches = [
            MockDocumentMatch( 'the wizard and dorothy in oz'.split(' ') ) ,
            MockDocumentMatch( 'ozma of oz'.split(' ') ) ,
            MockDocumentMatch( 'charlie and the chocolate factory'.split(' ') ) ,
            MockDocumentMatch( 'how to train your dragon'.split(' ') ) ,
            MockDocumentMatch( 'the hitchhikers guide to the galaxy'.split(' ') ) ,
            MockDocumentMatch( 'the prince and the pauper'.split(' ') )
        ]
        invDocFreqs = computeInvDocFreq( documentMatches, 'wizard of oz' )
        self.assertEqual(  invDocFreqs , { 'wizard':1.0/1.0 , 'oz':1.0/2.0 }  )



if __name__ == '__main__':
    unittest.main()

