/////////////////////////////////////////////////////////////////////////////////
// Constants

    const EDIT = 'edit';
    const TRUE = 'true';
    const FALSE = 'false';
    const ANSWER_TOO_SHORT_MESSAGE = 'Answer is too short'
    const KEY_CODE_ENTER = 13;
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

        function
    fitTextAreaToText( textArea ){
        textArea.style.height = '';
        textArea.style.height = textArea.scrollHeight + 'px';
    }


        function 
    addAndAppear( element, parentElement ){  
        var elementJquery = jQuery( element ).hide();
        var parentJquery = jQuery( parentElement ).append( elementJquery );
        elementJquery.slideToggle();
    }


        function
    scrollToHtmlElement( htmlElement ){
        var elementJquery = jQuery( htmlElement );
        jQuery('html, body').animate( {
            scrollTop: $(elementJquery).offset().top + 'px'
        }, 'fast' );
    }

