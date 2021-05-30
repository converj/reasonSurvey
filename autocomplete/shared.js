/////////////////////////////////////////////////////////////////////////////////
// Constants

    const ANSWER_TOO_SHORT_MESSAGE = 'Answer is too short'
    const REASON_TOO_SHORT_MESSAGE = 'Reason is too short'
    const ANSWER_REASON_DELIMITER = '\t'


/////////////////////////////////////////////////////////////////////////////////
// Global functions

        function
    serializeAnswerAndReason( answer, reason ){
        return (answer || '') + ANSWER_REASON_DELIMITER + (reason || '');
    }

        function
    parseAnswerAndReason( answerAndReasonStr ){
        if ( ! answerAndReasonStr ){  return [ null, null ];  }
        var delimIndex = answerAndReasonStr.indexOf( ANSWER_REASON_DELIMITER );
        if ( delimIndex < 0 ){  return [ answerAndReasonStr, '' ];  }
        return [
            answerAndReasonStr.substr(0, delimIndex),
            answerAndReasonStr.substr(delimIndex + ANSWER_REASON_DELIMITER.length)
        ];
    }

