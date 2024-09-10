# Call AI services in g-cloud vertex-ai

import configuration
# Import external modules
import json
import logging
import requests
import subprocess
# Import application modules
import secrets
from text import LogMessage


__gcloudAuth = subprocess.run( ['gcloud','auth','print-access-token'] , stdout=subprocess.PIPE ).stdout.decode( 'utf-8' ).strip()


def classifyInsult( text ):
    url = 'https://us-central1-aiplatform.googleapis.com/ui/projects/{secrets.projectId}/locations/us-central1/endpoints/{secrets.endpointId}:predict'
    bodyStruct = {  "instances": { "mimeType":"text/plain", "content":text }  }

    try:
        responseString = __postRequest( url, bodyStruct, auth=__gcloudAuth )
        responseStruct = json.loads( responseString )
        logging.debug(LogMessage( 'responseStruct=', responseStruct ))

        predictions = responseStruct['predictions'][ 0 ]
        confidences = predictions['confidences']
        predictionIndex = __argmax( confidences )
        predictionName = int( predictions['displayNames'][predictionIndex] )
        predictionConfidence = confidences[ predictionIndex ]
        logging.debug(LogMessage( 'predictionName=', predictionName, 'predictionConfidence=', predictionConfidence ))
        return predictionConfidence  if predictionName  else 0

    except Exception as e:
        return None

# Send data, return result data
def __postRequest( url, bodyStruct, auth=None ):
    response = requests.post( url, json=bodyStruct, headers={'Authorization': f'Bearer {auth}'} )
    logging.debug(LogMessage( 'response.status_code=', response.status_code, 'response.reason=', response.reason ))
    if response.status_code != 200:  raise Exception( '__postRequest() response.status_code != 200' )
    return response.text

# Argmax without depending on numpy
def __argmax( numbers ):
    if not numbers:  return None

    maxIndex = None
    maxNumber = None

    for i,n in enumerate( numbers ):
        if ( maxNumber is None ) or ( maxNumber < n ):
            maxIndex = i
            maxNumber = n
    return maxIndex



#################################################################################
# Unit test

if __name__ == '__main__':

    import unittest

    class TestAI( unittest.TestCase ):

        def test_1( self ):
            self.assertEqual(  0 , classifyInsult( 'You are wonderful, thank you for your message.' )  )
            self.assertLess(  0 , classifyInsult( 'Your ideas are garbage!  Eat a poop, butthead!' )  )

    configuration.logForUnitTest()
    unittest.main()

