/////////////////////////////////////////////////////////////////////////////////
// Answer viewing display

        function
    AnswerViewDisplay( answerId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap.

        // Create html element, store it in this.element
        this.createFromHtml( answerId, '\n\n' + [
            '<div class=Answer id=Answer onmousedown=handleAnswerClick>',
            '    <input type=radio class=AnswerCheckbox id=AnswerCheckbox onkeyup=handleRadioKey />',
            '    <label class=AnswerContent id=AnswerContent for=AnswerCheckbox />',
            '</div>'
        ].join('\n') );
    }
    AnswerViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap.


        AnswerViewDisplay.prototype.
    setAllData = function( answerData, topDisp, questionDisplay ){
        this.answer = answerData;
        this.questionDisplay = questionDisplay;
        this.topDisp = topDisp;
        this.dataUpdated();
    }

    // Update this.element
        AnswerViewDisplay.prototype.
    dataUpdated = function( ){

        this.getSubElement('AnswerCheckbox').name = 'input-' + this.questionDisplay.question.id;

        this.setAttribute( 'AnswerCheckbox', 'checked', (this.answer.selected ? 'checked' : null) );

        // Highlight matching words from question answer input.
        let answerSuggestion = this.answer.content;
        let answerContentDiv = this.getSubElement('AnswerContent');
        let answerInput = this.questionDisplay.getAnswerInput();

        // Split answer and reason, highlight each, append with delimiter
        let suggestionAndReasonArray = parseAnswerAndReason( answerSuggestion );
        let spanElements = keywordsToHighlightSpans( answerInput, suggestionAndReasonArray[0] );
        for ( let s = 0;  s < spanElements.length;  ++s ){
            answerContentDiv.appendChild( spanElements[s] );
        }
        answerContentDiv.appendChild( html('span').class('suggestionReasonSeparator').innerHtml('Reason:').build() );
        spanElements = keywordsToHighlightSpans( answerInput, suggestionAndReasonArray[1] );
        for ( let s = 0;  s < spanElements.length;  ++s ){
            answerContentDiv.appendChild( spanElements[s] );
        }
    };

        AnswerViewDisplay.prototype.
    handleAnswerClick = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        this.questionDisplay.handleAnswerClick( this.answer.content );
    };
    
        AnswerViewDisplay.prototype.
    handleRadioKey = function( event ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        if ( event.key == KEY_NAME_SPACE ){  this.handleAnswerClick();  }
        if ( event.key == KEY_NAME_ENTER ){  this.handleAnswerClick();  }
    };



//////////////////////////////////////////////////////////////////////////////////////////////////
// Question viewing display

        function
    QuestionViewDisplay( questionId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap.

        this.createFromHtml( questionId, '\n\n' + [
            '<form class=Question id=Question>',
            '    <div class=Message id=Message aria-live=polite></div>',
            '    <h2 for=QuestionContent id=QuestionPosition> Question </h2>',
            '    <div class=QuestionContent id=QuestionContent></div>',
            '    <ul class=Answers id=Answers></ul>',
            '    <div class=Message id=suggestionsMessage aria-live=polite></div>',
            // Answer input
            '   <div class="Message NewAnswerMessage" id=NewAnswerMessage aria-live=polite></div>',
            '   <div class=NewAnswer>',
            '       <label for=NewAnswerInput> Answer </label>',
            '       <input class=NewAnswerInput id=NewAnswerInput placeholder="Type your answer, or choose a suggested answer" ',
            '           oninput=handleInput onkeydown=handleNewAnswerKey onblur=handleInputBlur />',
            '       <label class=NewReasonLabel for=NewReasonInput> Reason </label>',
            '       <textarea class=NewReasonInput id=NewReasonInput placeholder="Type your reason, or choose a suggested answer and reason" ',
            '           oninput=handleInput onkeydown=handleNewReasonKey onblur=handleInputBlur ></textarea>',
            '    </div>',
            '</form>'
        ].join('\n') );
    }
    QuestionViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap.

    // Set all data.
        QuestionViewDisplay.prototype.
    setAllData = function( questionData, topDisp ){
        this.question = questionData;
        this.answers = [ ];
        this.topDisp = topDisp;
        this.dataUpdated();
    };
    
        QuestionViewDisplay.prototype.
    setAnswerData = function( answerContent ){
        this.userAnswer = answerContent;
    };

    
    // Update html from data.
        QuestionViewDisplay.prototype.
    dataUpdated = function( ){

        // Messages
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.suggestionsMessage = showMessageStruct( this.suggestionsMessage, this.getSubElement('suggestionsMessage') );
        this.newAnswerMessage = showMessageStruct( this.newAnswerMessage, this.getSubElement('NewAnswerMessage') );
        this.getSubElement('NewAnswerInput').setCustomValidity( this.answerValidity ? this.answerValidity : '' );
        this.getSubElement('NewReasonInput').setCustomValidity( this.reasonValidity ? this.reasonValidity : '' );

        // Set attributes
        this.setAttribute( 'NewAnswerInput', 'disabled', (topDisp.isFrozen() ? TRUE : null) );
        this.setAttribute( 'NewReasonInput', 'disabled', (topDisp.isFrozen() ? TRUE : null) );

        // Set HTML content
        this.setInnerHtml( 'QuestionContent', storedTextToHtml(this.question.content) );
        this.setInnerHtml( 'QuestionPosition', 'Question ' + (this.question.positionInSurvey + 1) );
        let answerAndReasonArray = parseAnswerAndReason( this.userAnswer );
        this.setProperty( 'NewAnswerInput', 'defaultValue', answerAndReasonArray[0] );
        this.setProperty( 'NewReasonInput', 'defaultValue', answerAndReasonArray[1] );

        let reasonInput = this.getSubElement('NewReasonInput');
        setTimeout(  function(){ fitTextAreaToText( reasonInput ); }  );

        // For each answer data... re-create answer display
        let answerInputValue = this.getAnswerInput();
        let answersDiv = this.getSubElement('Answers');
        clearChildren( answersDiv );
        this.answerDisplays = [];
        for ( let r = this.answers.length - 1;  r >= 0;  --r ) { 
            let answerData = this.answers[r];
            answerData.selected = ( answerData.content == answerInputValue );
            this.addAnswerDisp( answerData );
        }
    };

        QuestionViewDisplay.prototype.
    getAnswerInput = function( answerAndReasonStr ){
        let newAnswerInput = this.getSubElement('NewAnswerInput');
        let newReasonInput = this.getSubElement('NewReasonInput');
        return serializeAnswerAndReason( newAnswerInput.value, newReasonInput.value );
    };

        QuestionViewDisplay.prototype.
    addAnswerDisp = function( answerData ){   // returns AnswerDisplay
        // Create display
        var answerDisp = new AnswerViewDisplay( answerData.id );
        answerDisp.setAllData( answerData, this.topDisp, this );
        // Collect display
        this.answerDisplays.push( answerDisp );
        // Add to webpage
        var answersDiv = this.getSubElement('Answers');
        answersDiv.appendChild( answerDisp.element );
    };
    
        QuestionViewDisplay.prototype.
    handleInput = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let newAnswerInput = this.getSubElement('NewAnswerInput');
        let newReasonInput = this.getSubElement('NewReasonInput');
        let answerInputValue = serializeAnswerAndReason( newAnswerInput.value, newReasonInput.value );

        fitTextAreaToText( newReasonInput );

        // Clear too-short messages
        if ( this.answerTooShort  &&  (minLengthAnswer <= newAnswerInput.value.length) ){
            this.newAnswerMessage = { text:'' };
            this.answerValidity = '';
            this.answerTooShort = false;
            this.dataUpdated();
        }
        if ( this.reasonTooShort  &&  (0 < newReasonInput.value.length) ){
            this.newAnswerMessage = { text:'' };
            this.reasonValidity = '';
            this.reasonTooShort = false;
            this.dataUpdated();
        }

        // Suggest only if answer+reason has at least 3 words, and just finished a word
        let words = removeStopWords( tokenize(answerInputValue) ).slice( 0, MAX_WORDS_INDEXED );
        if ( !words  ||  words.length < 1  ||  MAX_WORDS_INDEXED < words.length ){  return;  }
        if ( !event  ||  !event.data  ||  ! event.data.match( /[\s\p{P}]/u ) ){  return;  }  // Require that current input is whitespace or punctuation

        // Suggest only if answer input is changed since last suggestion
        let answerInputValueTrimmed = words.join(' ');
        if ( answerInputValueTrimmed == this.lastAnswerStartRetrieved ){  return;   }
        this.lastAnswerStartRetrieved = answerInputValueTrimmed;
        // Retrieve top matching answers
        this.retrieveAnswers( answerInputValue );
    };

        QuestionViewDisplay.prototype.
    handleNewAnswerKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key... focus reason input
        if ( event.keyCode === KEY_CODE_ENTER ) {
            event.preventDefault();
            this.getSubElement('NewReasonInput').focus();
            return false;
        }
    };
    
        QuestionViewDisplay.prototype.
    handleNewReasonKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key...
        if ( event.keyCode === KEY_CODE_ENTER ) {
            event.preventDefault();
            // Save answer
            var newReasonInput = this.getSubElement('NewReasonInput');
            newReasonInput.blur();
            // Focus next question answer input
            this.topDisp.focusNextQuestionAnswerInput( this );
            return false;
        }
    };
    
        QuestionViewDisplay.prototype.
    focusNewAnswerInput = function( event ){
        var newAnswerInput = this.getSubElement('NewAnswerInput');
        newAnswerInput.focus();
    };

        QuestionViewDisplay.prototype.
    handleInputBlur = function( ){
        this.handleAnswer();
    };

        QuestionViewDisplay.prototype.
    handleAnswerClick = function( answerContent ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let answerAndReasonArray = parseAnswerAndReason( answerContent );
        this.setProperty( 'NewAnswerInput', 'value', answerAndReasonArray[0] );
        this.setProperty( 'NewReasonInput', 'value', answerAndReasonArray[1] );
        this.handleAnswer();
    };

        QuestionViewDisplay.prototype.
    handleAnswer = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let newAnswerInput = this.getSubElement('NewAnswerInput');
        let newReasonInput = this.getSubElement('NewReasonInput');
        let answerInputValue = serializeAnswerAndReason( newAnswerInput.value, newReasonInput.value );

        // If answer unchanged... do nothing
        if ( this.userAnswer == answerInputValue ){  return;  }

        // Require that answer exists if reason exists
        if ( (newAnswerInput.value.length < minLengthAnswer)  &&  (0 < newReasonInput.value.length) ){
            this.newAnswerMessage = { color:RED, text:ANSWER_TOO_SHORT_MESSAGE };
            this.answerValidity = ANSWER_TOO_SHORT_MESSAGE;
            this.answerTooShort = true;
            this.dataUpdated();
            return;
        }
        // Require that answer has reason
        if ( (0 < newAnswerInput.value.length)  &&  (newReasonInput.value.length <= 0)  &&  (! this.topDisp.areReasonsHidden()) ){
            this.newAnswerMessage = { color:RED, text:REASON_TOO_SHORT_MESSAGE };
            this.reasonValidity = REASON_TOO_SHORT_MESSAGE;
            this.reasonTooShort = true;
            this.dataUpdated();
            return;
        }

        // save via ajax
        this.newAnswerMessage = { color:GREY, text:'Saving answer...' };
        this.answerValidity = '';
        this.reasonValidity = '';
        this.dataUpdated();
        let thisCopy = this;
        let sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            questionId:this.question.id , content:answerInputValue , linkKey:this.topDisp.linkKey.id 
        };
        let url = '/autocomplete/setAnswer';
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.userAnswer = ( receiveData.answerContent )?  receiveData.answerContent  :  '';
                thisCopy.newAnswerMessage = { color:GREEN, text:'Saved answer', ms:3000 };
                thisCopy.answerValidity = '';
                thisCopy.reasonValidity = '';
                thisCopy.dataUpdated();
                thisCopy.topDisp.answerUpdated();
            }
            else {
                let message = 'Failed to save answer.';
                if ( receiveData  &&  receiveData.message == TOO_SHORT ){
                    message = 'Answer is too short.';
                    thisCopy.answerValidity = message;
                    thisCopy.answerTooShort = true;
                }
                else if ( receiveData  &&  receiveData.message == REASON_TOO_SHORT ){
                    message = 'Reason is too short.';
                    thisCopy.reasonValidity = message;
                    thisCopy.reasonTooShort = true;
                }
                else {
                    thisCopy.answerValidity = message;
                }
                thisCopy.newAnswerMessage = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };

        QuestionViewDisplay.prototype.
    retrieveAnswers = function( answerStart ){
        // Request via ajax
        let thisCopy = this;
        let sendData = { answerStart:answerStart };
        let url = '/autocomplete/getQuestionAnswersForPrefix/' + this.topDisp.linkKey.id + '/' + this.question.id;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData ){
                if ( receiveData.success ){
                    thisCopy.question.linkOk = true;

                    // Update answer suggestions
                    let suggestionsChanged = false;
                    if ( receiveData.answers ){
                        // Collect new suggestion & increment stats
                        if ( ! thisCopy.suggestionToData ){  thisCopy.suggestionToData = { };  }  // { suggestionText:{ voteScore:? , score:? , ... } }
                        let suggestionToData = thisCopy.suggestionToData;  // For readability
                        for ( let s = 0;  s < receiveData.answers.length;  ++s ){
                            let suggestionNew = receiveData.answers[s];
                            if ( ! suggestionNew.content ){  continue;  }
                            if ( !(suggestionNew.content in suggestionToData) ){
                                thisCopy.topDisp.incrementWordCounts( suggestionNew.content );
                            }
                            suggestionToData[ suggestionNew.content ] = suggestionNew;
                        }
                        // Recompute all suggestion-scores in this question, with new IDF-weights
                        // Store scores inside suggestion-objects
                        for ( const suggestion in suggestionToData ){
                            let suggestionData = suggestionToData[ suggestion ];
                            suggestionData.scoreMatch = thisCopy.topDisp.wordMatchScore( answerStart, suggestion );
                            suggestionData.scoreTotal =  suggestionData.score * suggestionData.scoreMatch;  // Vote-score * match-score
                        }
                        // Find top-scored suggestions
                        let topSuggestions = Object.values( suggestionToData ).sort( (a,b) => (b.scoreTotal - a.scoreTotal) ).slice( 0, 3 );

                        // Check whether top-suggestions changed: old-answer not found in new-suggestions
                        suggestionsChanged = ( thisCopy.answers.length != topSuggestions.length );
                        thisCopy.answers.map(  a  =>  ( suggestionsChanged |=  ! topSuggestions.find(s => (s.content == a.content)) )  );

                        thisCopy.answers = topSuggestions;
                    }

                    // Alert screen-reader user that answers updated
                    if ( suggestionsChanged  &&  thisCopy.answersRetrieved ){
                        thisCopy.suggestionsMessage = { text:'Suggestions updated', color:GREY, ms:3000 };
                    }
                    thisCopy.answersRetrieved = true;
                    thisCopy.dataUpdated();
                }
                else if ( receiveData.message == BAD_LINK ){
                    thisCopy.question.linkOk = false;
                    thisCopy.dataUpdated();
                }
            }
        } );
    };



//////////////////////////////////////////////////////////////////////////////////////////////////
// Survey viewing display

        function
    SurveyViewDisplay( surveyId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap.

        this.createFromHtml( surveyId, '\n\n' + [
            '<h1 class=title> Auto-complete Survey </h1>',
            '<div class=Survey id=Survey>',
            '    <div class=Message id=Message aria-live=polite></div>' ,
            '    <div class=Message id=freezeMessage aria-live=polite></div>' ,
            '    <div class=hideReasonsStatus id=hideReasonsStatus></div>' ,
            '    <div class=loginStatus id=loginStatus></div>',
            '    <h2 class=SurveyTitle id=SurveyTitle></h2>',
            '    <div class=SurveyIntroduction id=SurveyIntroduction></div>',
            '    <div class=Questions id=Questions></div>',
            '    <div class=Message id=bottomMessage aria-live=polite></div>' ,
            '    <button class=SurveyResultsButton id=SurveyResultsButton onclick=onSurveyResults> Survey Results </button>',
            // Admin change history
            '   <details class=adminHistory id=adminHistory> ',
            '       <summary class=adminHistoryLast id=adminHistoryLast></summary> ',
            '       <div class=adminHistoryFull id=adminHistoryFull></div> ',
            '   </details> ',
            '</div>'
        ].join('\n') );
    }
    SurveyViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap.

    // Set all data.
        SurveyViewDisplay.prototype.
    setAllData = function( surveyData, topDisp ){
        this.survey = surveyData;  // Survey data will have questions updated already.
        this.topDisp = topDisp;

        this.questions = { };  // map[ questionId -> { data:{...} , display:{...} } ]

        this.dataUpdated();
    };
    
    // Update html from data.
        SurveyViewDisplay.prototype.
    dataUpdated = function( ){

        document.title = SITE_TITLE + ': ' + this.survey.title;

        // Edit link in menu
        if ( this.survey.allowEdit ){  document.body.setAttribute( 'menuedit', 'true' );  }
        else                        {  document.body.removeAttribute( 'menuedit' );  }

        // Set messages
        if ( this.survey  &&  this.survey.linkOk ) {
            // If link message ok not already shown... show link ok message
            if ( this.survey.mine  &&  ( ! this.linkMessage  ||  ! this.linkMessage.okShown )  ){
                this.linkMessage = { color:GREEN, text:'Your survey is created. You can email this webpage\'s URL to participants.', ms:10000 };
                showMessageStruct( this.linkMessage, this.getSubElement('Message') );
                this.linkMessage.okShown = true;  // Make sure ok-link message does not re-appear every time dataUpdated() runs
            }
        }
        else {
            this.linkMessage = { color:RED, text:'Invalid link' };
            this.linkMessage = showMessageStruct( this.linkMessage, this.getSubElement('Message') );
        }
        var bottomMessageText = ( this.allQuestionsAnswered )?  'Survey complete'  :  '';
        this.bottomMessage = { color:GREEN, text:bottomMessageText };
        this.bottomMessage = showMessageStruct( this.bottomMessage, this.getSubElement('bottomMessage') );

        // Set html-element attributes
        this.setAttribute( 'Survey', 'mine', (this.survey.mine ? TRUE : null) );
        this.setAttribute( 'Survey', 'hidereasons', (this.survey.hideReasons ? TRUE : null) );

        if ( this.topDisp.linkKey.loginRequired ){
            this.setInnerHtml( 'loginStatus', 'Voter login required' );
        }
        else {
            this.setInnerHtml( 'loginStatus', (this.survey.mine ? 'Browser login only' : null) );
        }

        // Set freeze-message and frozen-attribute
        this.freezeMessage = {  color:RED , text:(this.isFrozen() ? 'Frozen' : null)  };
        this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeMessage') );
        this.setAttribute( 'Survey', 'frozen', (this.isFrozen() ? TRUE : null) );
        this.setInnerHtml( 'hideReasonsStatus', (this.survey.hideReasons ? 'Reasons hidden' : null) );

        displayAdminHistory( this.survey.adminHistory, this.getSubElement('adminHistoryLast'), this.getSubElement('adminHistoryFull') );

        // Set content
        this.setInnerHtml( 'SurveyTitle', this.survey.title );
        this.setInnerHtml( 'SurveyIntroduction', storedTextToHtml(this.survey.introduction) );

        // For each question data... ensure question display exists, only for questions with data
        var questionsDiv = this.getSubElement('Questions');
        for ( var questionId in this.questions ){
            var question = this.questions[ questionId ];
            if ( question.data  &&  ! question.display ){
                // Create display
                question.display = new QuestionViewDisplay( question.data.id );
                question.display.setAllData( question.data, this.topDisp, this );
                // Add to webpage
                addAndAppear( question.display.element, questionsDiv );
            }
            else if ( question.display  &&  ! question.data ){
                // Remove from webpage
                questionsDiv.removeChild( question.display.element );
                question.display = null;
            }
        }
    };


        SurveyViewDisplay.prototype.
    areReasonsHidden = function(){  return this.survey.hideReasons;  }


        SurveyViewDisplay.prototype.
    isFrozen = function( ){  return this.survey && this.survey.freezeUserInput;  }

        SurveyViewDisplay.prototype.
    focusNextQuestionAnswerInput = function( questionDisplay ){
    
        if ( ! questionDisplay.element.nextElementSibling ){  return;  }
    
        // For question display that matches nextElementSibling... focus new-answer input
        for ( var questionId in this.questions ){
            var question = this.questions[ questionId ];
            if ( question.display  &&  question.display.element == questionDisplay.element.nextElementSibling ){
                question.display.focusNewAnswerInput();
                break;
            }
        }
    };


        SurveyViewDisplay.prototype.
    incrementWordCounts = function( suggestion ){  
        if ( ! this.wordToCount ){  this.wordToCount = { };  }
        incrementWordCounts( suggestion, this.wordToCount );
    };

        SurveyViewDisplay.prototype.
    wordMatchScore = function( answerStart, suggestion ){
        if ( ! this.wordToCount ){  return 0;  }
        return wordMatchScore( answerStart, suggestion, this.wordToCount );
    };

    
        SurveyViewDisplay.prototype.
    answerUpdated = function( ){
        // Check whether all questions are answered
        var allAnswered = true;
        for ( var questionId in this.questions ){
            var question = this.questions[ questionId ];
            if ( ! question.display  ||  ! question.display.userAnswer ){
                allAnswered = false;
                break;
            }
        }
        // Update display only if allQuestionsAnswered has changed
        var changed = ( allAnswered != this.allQuestionsAnswered );
        this.allQuestionsAnswered = allAnswered;
        if ( changed ){  this.dataUpdated();  }
    };

    
        SurveyViewDisplay.prototype.
    retrieveDataUpdate = function( ){
        console.log('SurveyViewDisplay.retrieveDataUpdate()');
        return this.retrieveData();
    };

        SurveyViewDisplay.prototype.
    retrieveData = function( ){

        // request via ajax
        var thisCopy = this;
        var sendData = { };
        var url = '/autocomplete/getSurvey/' + this.topDisp.linkKey.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    thisCopy.survey.linkOk = true;
                    if ( receiveData.survey ){
                        // Update survey fields
                        thisCopy.survey.title = receiveData.survey.title;
                        thisCopy.survey.introduction = receiveData.survey.introduction;
                        thisCopy.survey.allowEdit = receiveData.survey.allowEdit;
                        thisCopy.survey.adminHistory = receiveData.survey.adminHistory;
                        thisCopy.survey.freezeUserInput = receiveData.survey.freezeUserInput;
                        thisCopy.survey.id = receiveData.survey.id;
                        thisCopy.survey.mine = receiveData.survey.mine;
                        thisCopy.survey.hideReasons = receiveData.survey.hideReasons;
                    }
                    if ( receiveData.linkKey ){
                        thisCopy.linkKey.loginRequired = receiveData.linkKey.loginRequired;
                    }
                    // Retrieve questions data, async
                    thisCopy.retrieveQuestions();
                    thisCopy.dataUpdated();
                }
                else if ( receiveData.message == BAD_LINK ){
                    thisCopy.survey.linkOk = false;
                    thisCopy.dataUpdated();
                }
            }
        } );
    };
    
        SurveyViewDisplay.prototype.
    retrieveQuestions = function( ){

        // request via ajax
        var thisCopy = this;
        var sendData = { };
        var url = '/autocomplete/getSurveyQuestions/' + this.topDisp.linkKey.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    thisCopy.survey.linkOk = true;
                    // update each question
                    if ( receiveData.questions ){
                        // Merge question data fields
                        // Mark all questions un-updated
                        for ( var questionId in thisCopy.questions ){  thisCopy.questions[ questionId ].updated = false;  }
                        // For each received question data...
                        for ( var q = 0;  q < receiveData.questions.length;  ++q ){
                            var questionReceived = receiveData.questions[q];
                            var question = thisCopy.questions[ questionReceived.id ];
                            if ( question == null ){
                                // Collect question data
                                question = {
                                    data:{
                                        content:questionReceived.content,
                                        id:questionReceived.id,
                                        positionInSurvey:questionReceived.positionInSurvey 
                                    } , 
                                    updated:true
                                };
                                thisCopy.questions[ questionReceived.id ] = question;
                            }
                            else {
                                // Update question fields
                                question.data.content = questionReceived.content;
                                question.data.positionInSurvey = questionReceived.positionInSurvey;
                                // Mark question updated
                                question.updated = true;
                            }
                        }
                        // Delete un-updated question data
                        for ( var questionId in thisCopy.questions ){
                            var question = thisCopy.questions[ questionId ];
                            if ( ! question.updated ){  question.data = null;  }
                        }
                    }
                    // Retrieve user answers, async
                    thisCopy.retrieveUserAnswers();
                    thisCopy.dataUpdated();
                }
                else if ( receiveData.message == BAD_LINK ){
                    thisCopy.survey.linkOk = false;
                    thisCopy.dataUpdated();
                }
            }
        } );
    };

        SurveyViewDisplay.prototype.
    retrieveUserAnswers = function(  ){

        // request via ajax
        var thisCopy = this;
        var sendData = { };
        var url = '/autocomplete/getUserAnswers/' + this.topDisp.linkKey.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    // Update user answers
                    if ( receiveData.questionIdToAnswerContent ){
                        // For each updated question...
                        for ( questionId in receiveData.questionIdToAnswerContent ){
                            var receivedAnswer = receiveData.questionIdToAnswerContent[ questionId ];
                            // Update question display's user answer
                            var question = thisCopy.questions[ questionId ];
                            if ( question  &&  question.display ){
                                question.display.setAnswerData( receivedAnswer );
                                question.display.dataUpdated();
                            }
                        }
                        thisCopy.answerUpdated();
                    }
                }
            }
        } );
    };

        SurveyViewDisplay.prototype.
    onSurveyResults = function( ){
        setFragmentFields( {page:FRAG_PAGE_AUTOCOMPLETE_RESULTS} );
    };

    
