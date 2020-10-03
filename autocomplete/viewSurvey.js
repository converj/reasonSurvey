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
        var answerSuggestion = this.answer.content;
        var answerContentDiv = this.getSubElement('AnswerContent');
        var answerInput = this.questionDisplay.answerInput;

        // Split answer and reason, highlight each, append with delimiter
        var suggestionAndReasonArray = parseAnswerAndReason( answerSuggestion );
        var spanElements = keywordsToHighlightSpans( answerInput, suggestionAndReasonArray[0] );
        for ( var s = 0;  s < spanElements.length;  ++s ){
            answerContentDiv.appendChild( spanElements[s] );
        }
        answerContentDiv.appendChild( makeSpan('suggestionReasonSeparator', 'Reason:') );
        spanElements = keywordsToHighlightSpans( answerInput, suggestionAndReasonArray[1] );
        for ( var s = 0;  s < spanElements.length;  ++s ){
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
            '    <div id=Message role=alert></div>',
            '    <label for=QuestionContent id=QuestionPosition> Question </label>',
            '    <div class=QuestionContent id=QuestionContent></div>',
            '    <ul class=Answers id=Answers></ul>',
            '    <div id=suggestionsMessage role=alert></div>',
            // Answer input
            '   <div class=NewAnswerMessage id=NewAnswerMessage role=alert></div>',
            '   <div class=NewAnswer>',
            '       <label for=NewAnswerInput> Answer </label>',
            '       <input class=NewAnswerInput id=NewAnswerInput placeholder="Type your answer, or choose a suggested answer" ',
            '           oninput=handleInput onkeydown=handleNewAnswerKey onblur=handleInputBlur />',
            '       <label for=NewReasonInput> Reason </label>',
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
    setUserAnswer = function( answerContent ){
        this.userAnswer = answerContent;
        this.answerInput = this.userAnswer;
    };

    
    // Update html from data.
        QuestionViewDisplay.prototype.
    dataUpdated = function( ){

        // Messages
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.suggestionsMessage = showMessageStruct( this.suggestionsMessage, this.getSubElement('suggestionsMessage') );
        this.newAnswerMessage = showMessageStruct( this.newAnswerMessage, this.getSubElement('NewAnswerMessage') );
        this.getSubElement('NewAnswerInput').setCustomValidity( this.answerValidity ? this.answerValidity : '' );
        this.getSubElement('NewReasonInput').setCustomValidity( this.answerValidity ? this.answerValidity : '' );

        // Set attributes
        this.setAttribute( 'NewAnswerInput', 'disabled', (topDisp.isFrozen() ? TRUE : null) );
        this.setAttribute( 'NewReasonInput', 'disabled', (topDisp.isFrozen() ? TRUE : null) );

        // Set HTML content
        this.setInnerHtml( 'QuestionContent', this.question.content );
        this.setInnerHtml( 'QuestionPosition', 'Question ' + (this.question.positionInSurvey + 1) );

        var answerInputValue = ( this.answerInput )?  this.answerInput  :  this.userAnswer;
        this.setAnswer( answerInputValue );

        var reasonInput = this.getSubElement('NewReasonInput');
        setTimeout(  function(){ fitTextAreaToText( reasonInput ); }  );

        // For each answer data... re-create answer display
        var answersDiv = this.getSubElement('Answers');
        clearChildren( answersDiv );
        this.answerDisplays = [];
        for ( var r = this.answers.length - 1;  r >= 0;  --r ) { 
            var answerData = this.answers[r];
            answerData.selected = ( answerData.content == answerInputValue );
            this.addAnswerDisp( answerData );
        }
    };

        QuestionViewDisplay.prototype.
    setAnswer = function( answerAndReasonStr ){
        var answerAndReasonArray = parseAnswerAndReason( answerAndReasonStr );
        this.setProperty( 'NewAnswerInput', 'value', answerAndReasonArray[0] );
        this.setProperty( 'NewReasonInput', 'value', answerAndReasonArray[1] );
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
    handleInput = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Update copy of input value
        var newAnswerInput = this.getSubElement('NewAnswerInput');
        var newReasonInput = this.getSubElement('NewReasonInput');
        var answerInputValue = serializeAnswerAndReason( newAnswerInput.value, newReasonInput.value );
        this.answerInput = answerInputValue;

        fitTextAreaToText( newReasonInput );

        // Delay retrieve, so that retrieve happens only for last keystroke in sequence.
        clearTimeout( this.retrieveAnswersTimer );
        var thisCopy = this;
        this.retrieveAnswersTimer = setTimeout( function(){

            // Suggest only if answer input is long enough
            if ( answerInputValue == null  ||  answerInputValue.length < 3 + ANSWER_REASON_DELIMITER.length ){
                return;
            }
            // Suggest only if answer input is changed since last suggestion
            if ( answerInputValue == thisCopy.lastAnswerStartRetrieved ){
                return;
            }
            // Retrieve top matching answers
            thisCopy.retrieveAnswers( answerInputValue );
            thisCopy.lastAnswerStartRetrieved = answerInputValue;
        } , 1000 );
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

        this.setAnswer( answerContent );
        this.answerInput = answerContent;
        this.handleAnswer();
    };

        QuestionViewDisplay.prototype.
    handleAnswer = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        var newAnswerInput = this.getSubElement('NewAnswerInput');
        var newReasonInput = this.getSubElement('NewReasonInput');
        var answerInputValue = serializeAnswerAndReason( newAnswerInput.value, newReasonInput.value );
        // If answer unchanged... do nothing
        if ( this.userAnswer == answerInputValue ){  return;  }

        // save via ajax
        this.newAnswerMessage = { color:GREY, text:'Saving answer...' };
        this.answerValidity = '';
        this.dataUpdated();
        var thisCopy = this;
        var sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            questionId:this.question.id , content:answerInputValue , linkKey:this.topDisp.linkKey.id 
        };
        var url = '/autocomplete/setAnswer';
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.userAnswer = ( receiveData.answerContent )?  receiveData.answerContent  :  '';
                thisCopy.answerInput = null;  // Prevent answer input getting re-filled after empty answer submitted
                thisCopy.newAnswerMessage = { color:GREEN, text:'Saved answer', ms:3000 };
                thisCopy.answerValidity = '';
                thisCopy.dataUpdated();
                thisCopy.topDisp.answerUpdated();
            }
            else {
                var message = 'Failed to save answer.';
                thisCopy.newAnswerMessage = { color:RED, text:message };
                thisCopy.answerValidity = message;
                thisCopy.dataUpdated();
            }
        } );
    };

        QuestionViewDisplay.prototype.
    retrieveAnswers = function( answerStart ){

        // request via ajax
        var thisCopy = this;
        var sendData = { answerStart:answerStart };
        var url = '/autocomplete/getQuestionAnswersForPrefix/' + this.topDisp.linkKey.id + '/' + this.question.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    thisCopy.question.linkOk = true;
                    // update each answer

                    var suggestionsChanged = false;
                    if ( receiveData.answers ){

                        suggestionsChanged |= ( ! thisCopy.answers  ||  thisCopy.answers.length != receiveData.answers.length );
                        for ( var a = 0;  a < thisCopy.answers.length;  a++ ){
                            var oldAnswer = thisCopy.answers[a].content;
                            suggestionsChanged |=  ! receiveData.answers.find(  function(newAnswer){ return (newAnswer.content == oldAnswer); }  );
                        }

                        thisCopy.answers = receiveData.answers;
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
            '<h1 class=title> View Survey </h1>',
            '<div class=Survey id=Survey>',
            '    <div class=Message id=Message role=alert></div>',
            '    <div class=Message id=freezeMessage role=alert></div>' ,
            '    <div class=loginStatus id=loginStatus></div>',
            '    <div class=SurveyIntroduction id=SurveyIntroduction></div>',
            '    <div class=Questions id=Questions></div>',
            '    <div class=Message id=bottomMessage role=alert></div>',
            '    <button class=SurveyResultsButton id=SurveyResultsButton onclick=onSurveyResults> Survey Results </button>',
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

        var surveyIntroStart = ( this.survey && this.survey.introduction )?  ': ' + this.survey.introduction.substr(0, 50)  :  '';
        document.title = SITE_TITLE + ': View Survey' + surveyIntroStart;

        // Edit link in menu
        if ( this.survey.allowEdit ){  document.body.setAttribute( 'menuedit', 'true' );  }
        else                        {  document.body.removeAttribute( 'menuedit' );  }

        // Message
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

        this.setInnerHtml( 'SurveyIntroduction', this.survey.introduction );

        // For each question data... ensure question display exists, only for questions with data
        var questionsDiv = this.getSubElement('Questions');
        for ( var questionId in this.questions ){
            var question = this.questions[ questionId ];
            if ( question.data  &&  ! question.display ){
                // Create display
                question.display = new QuestionViewDisplay( question.data.id );
                question.display.setAllData( question.data, this.topDisp, this );
                question.display.retrieveAnswers();
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
                        thisCopy.survey.introduction = receiveData.survey.introduction;
                        thisCopy.survey.allowEdit = receiveData.survey.allowEdit;
                        thisCopy.survey.freezeUserInput = receiveData.survey.freezeUserInput;
                        thisCopy.survey.id = receiveData.survey.id;
                        thisCopy.survey.mine = receiveData.survey.mine;
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
                                question.display.setUserAnswer( receivedAnswer );
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
        setFragmentFields( {page:FRAG_PAGE_SURVEY_RESULTS} );
    };

    
