/////////////////////////////////////////////////////////////////////////////////
// Answer editing display

        function
    AnswerEditDisplay( displayId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data
        this.messageColor = GREY;

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            '<div class=Answer id=Answer>',
            '   <div class=AnswerEdit>' , 
            '       <label for=AnswerContentInput translate=true> Suggested Answer </label>' ,
            '       <input class=AnswerContentInput id=AnswerContentInput placeholder="" ' ,
            '           onblur=handleEditAnswerBlur oninput=handleEditAnswerInput onkeydown=handleAnswerKey />' ,
            '       <label class=AnswerReasonLabel for=AnswerReasonInput translate=true> Reason </label>' ,
            '       <textarea class=AnswerReasonInput id=AnswerReasonInput placeholder="" ' ,
            '           onblur=handleEditAnswerBlur oninput=handleEditAnswerInput onkeydown=handleReasonKey></textarea>' ,
            '       <div class="Message AnswerEditMessage" id=AnswerEditMessage aria-live=polite></div>' ,
            '   </div>',
            '   <div class=AnswerEditingButtons>',
            '       <button class=AnswerDeleteButton title="delete" onmousedown=handleEditAnswerDelete> X </button>',
            '   </div>',
            '</div>'
        ].join('\n') );
    }
    AnswerEditDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        AnswerEditDisplay.prototype.
    setAllData = function( answerData, topDisp, questionDisplay ){
        this.answer = answerData;
        this.topDisp = topDisp;
        this.questionDisplay = questionDisplay;
        this.dataUpdated();
    }

    // Update this.element
        AnswerEditDisplay.prototype.
    dataUpdated = function( ){
        this.editMessage = showMessageStruct( this.editMessage, this.getSubElement('AnswerEditMessage') );
        this.getSubElement('AnswerContentInput').setCustomValidity( this.answerValidity ? this.answerValidity : '' );
        this.getSubElement('AnswerReasonInput').setCustomValidity( this.reasonValidity ? this.reasonValidity : '' );

        // Update content input
        var contentValue = ( this.contentInputValue )?  this.contentInputValue  :  this.answer.content;
        var answerAndReasonArray = parseAnswerAndReason( contentValue );
        this.setProperty( 'AnswerContentInput', 'value', answerAndReasonArray[0] );
        this.setProperty( 'AnswerReasonInput', 'value', answerAndReasonArray[1] );

        this.setProperty( 'AnswerContentInput', 'disabled', ! this.questionDisplay.isQuestionValid() );
        this.setProperty( 'AnswerReasonInput', 'disabled', ! this.questionDisplay.isQuestionValid() );

        var thisCopy = this;
        setTimeout( function(){
            thisCopy.fitAnswer(); 
        } , 100 );

        translateScreen( this.getSubElement('Answer') );  // Answers seem to be re-updated after top-level translation, so need re-translation
    };


        AnswerEditDisplay.prototype.
    setInputFocusAtEnd = function(  ){
        var contentInput = this.getSubElement('AnswerContentInput');
        contentInput.focus();
        contentInput.selectionStart = contentInput.value.length;
        contentInput.selectionEnd = contentInput.value.length;
    };


        AnswerEditDisplay.prototype.
    parseAndSetContentInputValue = function( answerAndReasonStr ){
        var answerAndReasonArray = parseAnswerAndReason( answerAndReasonStr );
        this.setContentInputValue( answerAndReasonArray[0], answerAndReasonArray[1] );
    };

        AnswerEditDisplay.prototype.
    setContentInputValue = function( answer, reason ){
        if ( answer || reason ){  this.contentInputValue = serializeAnswerAndReason( answer, reason );  }
        else                   {  this.contentInputValue = null;  }
    };


        AnswerEditDisplay.prototype.
    handleEditAnswerInput = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let contentInput = this.getSubElement('AnswerContentInput');
        let reasonInput = this.getSubElement('AnswerReasonInput');
        this.setContentInputValue( contentInput.value, reasonInput.value );
        this.fitAnswer();

        // Clear too-short messages
        if ( this.answerTooShort  &&  (minLengthAnswer <= contentInput.value.length) ){
            this.editMessage = { text:'' };
            this.answerValidity = '';
            this.answerTooShort = false;
            this.dataUpdated();
        }
        if ( this.reasonTooShort  &&  (0 < reasonInput.value.length) ){
            this.editMessage = { text:'' };
            this.reasonValidity = '';
            this.reasonTooShort = false;
            this.dataUpdated();
        }
    };

        AnswerEditDisplay.prototype.
    handleAnswerKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key on answer: focus answer-reason input
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            if ( this.topDisp.areReasonsHidden() ){
                this.questionDisplay.focusNewAnswerInput();
            }
            else {
                this.getSubElement('AnswerReasonInput').focus();
            }
            return false;
        }
    };

        AnswerEditDisplay.prototype.
    handleReasonKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key: save answer and focus new-answer input
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            this.handleEditAnswerSave( event );
            this.questionDisplay.focusNewAnswerInput();
            return false;
        }
    };

        AnswerEditDisplay.prototype.
    fitAnswer = function( ){
        // Stretch textarea to fit content
        var contentInput = this.getSubElement('AnswerReasonInput');
        contentInput.style.height = '';
        contentInput.style.height = (contentInput.scrollHeight - 10) + 'px';
    };

        AnswerEditDisplay.prototype.
    handleEditAnswerBlur = function( event ){
        this.handleEditAnswerSave( event );
    };

        AnswerEditDisplay.prototype.
    handleEditAnswerSave = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        var contentInput = this.getSubElement('AnswerContentInput');
        var inputReason = this.getSubElement('AnswerReasonInput');
        var inputValue = serializeAnswerAndReason( contentInput.value, inputReason.value );

        // If same answer exists elsewhere in the list... still save, because
        // need server-side answer standardization, to ensure records did not collide.

        // Question must exist
        if ( ! this.questionDisplay.question.id ){
            var message = 'Question not yet saved';
            this.editMessage = { color:RED, text:message };
            this.answerValidity = message;
            this.dataUpdated();
            return;
        }

        // Require that answer is long enough
        if ( contentInput.value.length < minLengthAnswer ){
            this.editMessage = { color:RED, text:ANSWER_TOO_SHORT_MESSAGE };
            this.answerValidity = ANSWER_TOO_SHORT_MESSAGE;
            this.answerTooShort = true;
            this.dataUpdated();
            return;
        }

        // Require that answer/reason changed
        if ( inputValue == this.answer.content ){  return;  }

        var answerData = this.answer;
        // save via ajax
        this.editMessage = { color:GREY, text:'Saving changes...' };
        this.answerValidity = '';
        this.reasonValidity = '';
        this.dataUpdated();
        var sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            questionId:this.questionDisplay.question.id,
            answerId:answerData.id ,
            content:inputValue ,
            linkKey:this.topDisp.linkKey.id
        };
        var url = '/autocomplete/editAnswer';
        var thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                if ( receiveData.answers  &&  receiveData.answers.length > 0 ){
                    // Update data and display
                    answerData.id = receiveData.answers[0].id;
                    answerData.content = receiveData.answers[0].content;
                    thisCopy.editMessage = { color:GREEN, text:'Saved answer', ms:5000 };
                    thisCopy.answerValidity = '';
                    thisCopy.reasonValidity = '';
                    thisCopy.setContentInputValue( null, null );
                    thisCopy.dataUpdated();

                    // Update this answer data held by question
                    thisCopy.questionDisplay.answerDataUpdated( answerData );

                    // Add more answers data to question
                    for ( var a = 1;  a < receiveData.answers.length;  ++a ){
                        thisCopy.questionDisplay.updateAnswerDisp( receiveData.answers[a] );
                    }
                } else {
                    thisCopy.editMessage = { color:GREEN, text:'' };
                    thisCopy.answerValidity = '';
                    thisCopy.reasonValidity = '';
                    thisCopy.setContentInputValue( null, null );
                    thisCopy.dataUpdated();
                }
            }
            else {
                let message = null;
                if ( receiveData  &&  receiveData.message == TOO_SHORT ){
                    message = 'Answer is too short.';
                    thisCopy.answerTooShort = true;
                }
                else if ( receiveData  &&  receiveData.message == NOT_OWNER ){  message = 'Cannot edit answer created by someone else.';  }
                else if ( receiveData  &&  receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit answer that already has votes.';  }
                else if ( receiveData  &&  receiveData.message == ERROR_DUPLICATE ){  message = 'Duplicate answer.';  }
                if ( message ){  thisCopy.answerValidity = message;  }

                if ( receiveData  &&  receiveData.message == REASON_TOO_SHORT ){
                    message = 'Reason is too short.';
                    thisCopy.reasonTooShort = true;
                    thisCopy.reasonValidity = message;
                }

                if ( ! message ){  message = 'Failed to save answer';  }
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    } , 

        AnswerEditDisplay.prototype.
    handleEditAnswerDelete = function(e){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
    
        if ( this.answer.id == null ){
            this.questionDisplay.answerDeleted( this.answer );
            return;
        }

        var contentInput = this.getSubElement('AnswerContentInput');
        var inputReason = this.getSubElement('AnswerReasonInput');
        var inputValue = serializeAnswerAndReason( contentInput.value, inputReason.value );

        var answerData = this.answer;
        // save via ajax
        this.editMessage = { color:GREY, text:'Deleting...' };
        this.answerValidity = '';
        this.reasonValidity = '';
        this.dataUpdated();
        var sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            questionId:this.questionDisplay.question.id,
            answerId:answerData.id ,
            linkKey:this.topDisp.linkKey.id
        };
        var url = '/autocomplete/deleteAnswer';
        var thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( error ){
                var message = 'Failed to delete answer';
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.success ){
                var message = 'Deleted answer';
                thisCopy.editMessage = { color:GREEN, text:message, ms:3000 };
                thisCopy.dataUpdated();
                // update data
                thisCopy.questionDisplay.answerDeleted( answerData );
            }
            else if ( receiveData  &&  receiveData.message == NOT_OWNER ){  
                var message = 'Cannot edit answer created by someone else.';
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == HAS_RESPONSES ){  
                var message = 'Cannot edit answer that already has votes.';
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
            else {
                var message = 'Failed to delete answer.';
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };




/////////////////////////////////////////////////////////////////////////////////
// Question editing display
//
// Do not bother having separate view/edit states when editing.
//     Separate states is less immediate, no easier to preview.
//     Edit-cancel can be just browser undo.
//     Only 1 editor, so not contended.
//     Editing stage must end once answering starts.
// 
// Do not add a new empty answer when last empty answer is filled; keep a separate new-answer input (without "add" button).
//

        function
    QuestionEditDisplay( questionId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data
        this.messageColor = GREY;

        this.createFromHtml( questionId, '\n\n' + [
            '<div class=Question id=Question>',
            // Question
            '    <div class=QuestionEdit id=QuestionEdit>', 
            '        <label for=QuestionPosition id=QuestionPositionLabel translate=true> Question </label>',
            '        <input type=number min=1 max=1000 class=QuestionPositionInput id=QuestionPositionInput ',
            '            required oninput=handlePositionInput />',
            '        <textarea class=QuestionEditInput id=QuestionContentInput placeholder="" ',
            '            onkeydown=handleEditQuestionKey oninput=handleEditQuestionInput onblur=handleEditQuestionSave></textarea>',
            '    </div>',
            '    <button class=QuestionDeleteButton title="delete" onmousedown=handleQuestionDelete> X </button>',
            '    <div class="Message QuestionEditMessage" id=QuestionEditMessage aria-live=polite></div>',
            // Answers
            '    <div class=Answers id=Answers></div>',
            '    <div class=NewAnswer>', 
            '        <label for=NewAnswerInput translate=true> Suggest Answer </label>',
            '        <textarea class=NewAnswerInput id=NewAnswerInput placeholder="" ',
            '            oninput=handleNewAnswerInput></textarea>',
            '    </div>',
            '</div>'
        ].join('\n') );
    }
    QuestionEditDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        QuestionEditDisplay.prototype.
    setAllData = function( questionData, topDisp ){
        this.question = questionData;  // Question data will have answers updated already.
        this.topDisp = topDisp;
        if ( this.answerDisplays == null ){  this.answerDisplays = [];  }
        this.dataUpdated();
    };


    // Update html from data.
        QuestionEditDisplay.prototype.
    dataUpdated = function( ){

        this.editMessage = showMessageStruct( this.editMessage, this.getSubElement('QuestionEditMessage') );
        this.getSubElement('QuestionContentInput').setCustomValidity( this.questionValidity? this.questionValidity : '' );

        // Update question input
        var currentQuestionInput = ( this.questionInput )?  this.questionInput  :  this.question.content;
        this.setProperty( 'QuestionContentInput', 'value', currentQuestionInput );
        var questionInputEle = this.getSubElement('QuestionContentInput');
        setTimeout(  function(){ fitTextAreaToText( questionInputEle ); } , 100  );

        // Update position input
        var currentPositionInput = ( this.positionInput )?  this.positionInput  :  this.question.positionInSurvey + 1;
        this.setProperty( 'QuestionPositionInput', 'value', currentPositionInput );

        // For each answer data... ensure display exists and update its data
        for ( var r = 0;  r < this.question.answers.length;  ++r ) { 
            var answer = this.question.answers[r];
            this.updateAnswerDisp( answer );
        }

        // Ensure answers are disabled if question is invalid
        // For each unsaved new answer (id==null) ... update display
        for ( var d = 0;  this.answerDisplays  &&  d < this.answerDisplays.length;  ++d ){
            var answerDisplay = this.answerDisplays[d];
            if ( answerDisplay.answer.id == null ){  answerDisplay.dataUpdated();  }
        }
        this.setProperty( 'NewAnswerInput', 'disabled', ! this.isQuestionValid() );
    };
    
        QuestionEditDisplay.prototype.
    isQuestionValid = function( ){
        var contentInput = this.getSubElement('QuestionContentInput');
        return ( contentInput.value.length >= minLengthQuestion );
    };

        QuestionEditDisplay.prototype.
    focusFirstAnswerInput = function( ){
        if ( this.answerDisplays  &&  this.answerDisplays.length > 0 ){
            this.answerDisplays[0].setInputFocusAtEnd();
        }
        else {
            var newAnswerInput = this.getSubElement('NewAnswerInput');
            newAnswerInput.focus();
        }
    };
    
        QuestionEditDisplay.prototype.
    focusNewAnswerInput = function( ){
        var newAnswerInput = this.getSubElement('NewAnswerInput');
        newAnswerInput.focus();
    };
    
        QuestionEditDisplay.prototype.
    handleNewAnswerInput = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        var newAnswerInput = this.getSubElement('NewAnswerInput');
        if ( newAnswerInput.value.length > 0 ){
            // Clear and hide new-answer input
            var input = newAnswerInput.value;
            newAnswerInput.value = '';
            var newAnswerInputJquery = jQuery( newAnswerInput );
            newAnswerInputJquery.hide();

            // Parse multi-line answers by newline
            // For each line... create new answer data display, and save it.
            var lines = input.split('\n');
            for ( var l = 0;  l < lines.length;  ++l ){
                var line = lines[l];
                if ( ! line ){  continue;  }
            
                // Add new answer display containing start of answer content, and focus it.
                // Not necessary to collect this temporary answer data in this.question.answers,
                // because answer display will later send new saved answer data to question display for collection.
                // Call updateAnswerDisp() -- not createAnswerDisp(), this.answerDisplays.push, and dataUpdated() -- 
                // because this new answer/display exists only in display state, not data.
                var newAnswerData = { id:null };
                var answerDisp = this.updateAnswerDisp( newAnswerData );
                answerDisp.parseAndSetContentInputValue( line );  // Initialize answer input field
                answerDisp.dataUpdated();

                // For last / only answer-line... do not save until blur / ENTER.
                if ( l+1 == lines.length ){  answerDisp.setInputFocusAtEnd();  }
                else {  answerDisp.handleEditAnswerSave();  }
            }

            // Transition in new-answer input, as if it were newly added to page
            newAnswerInputJquery.slideToggle();
        }
    };

    // Should only be used by dataUpdated()
        QuestionEditDisplay.prototype.
    updateAnswerDisp = function( answerData ){
        var answerDisp = this.answerIdToDisplay( answerData.id );
        if ( answerDisp ){
            answerDisp.setAllData( answerData, this.topDisp, this );
        }
        else {
            // Create display object
            answerDisp = new AnswerEditDisplay( this.newDisplayId() );
            answerDisp.setAllData( answerData, this.topDisp, this );
            this.answerDisplays.push( answerDisp );
            // Add display DOM element
            var answersDiv = this.getSubElement('Answers');
            addAndAppear( answerDisp.element, answersDiv );
        }
        return answerDisp;
    };

        QuestionEditDisplay.prototype.
    answerIdToDisplay = function( answerId ){
        var answerDisp = this.answerDisplays.find(  function(d){ return d.answer.id == answerId; }  );
        return answerDisp;
    };

        QuestionEditDisplay.prototype.
    newDisplayId = function( ){
        return this.question.id + '-answer-' + this.answerDisplays.length;
    };
    
        QuestionEditDisplay.prototype.
    setInputFocusAtEnd = function( ){
        var contentInput = this.getSubElement('QuestionContentInput');
        contentInput.focus();
        contentInput.selectionStart = contentInput.value.length;
        contentInput.selectionEnd = contentInput.value.length;
    };


        QuestionEditDisplay.prototype.
    handlePositionInput = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Delay display changes at least 300ms, and handle only last input value, to avoid up/down button jumping.
        if ( this.positionInputChangeTimer ){
            clearTimeout( this.positionInputChangeTimer );
            this.positionInputChangeTimer = null;
        }
        var thisCopy = this;
        this.positionInputChangeTimer = setTimeout( function(){

            var input = thisCopy.getSubElement('QuestionPositionInput');
            var inputChanged = (thisCopy.positionInput != input.value);
            thisCopy.positionInput = input.value;

            // If input value is an integer, and different than before...
            var newValue = parseInt( input.value );
            if ( newValue < input.min  ||  newValue > input.max  ||  newValue.toString() != input.value.trim() ){  newValue = null;  }
            if ( newValue ){  input.classList.remove('invalid');  } else {  input.classList.add('invalid');  }
            if ( ! newValue  ||  newValue < 1  ||  ! inputChanged ){  return;  }
            // Notify topDisp to re-order question displays
            thisCopy.topDisp.reorderQuestions( thisCopy, newValue - 1 );

            // Up/down buttons do not focus the position input, so blur does not happen. 
            // Just save here, but with longer (1 second) delay, to avoid transitional typing.
            thisCopy.topDisp.saveQuestionOrder( thisCopy );

        } , 1000 );

    };

        QuestionEditDisplay.prototype.
    handleEditQuestionKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key: save question and focus next existing / new answer input
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            this.handleEditQuestionSave();
            this.focusFirstAnswerInput();
            return false;
        }
    };

        QuestionEditDisplay.prototype.
    handleEditQuestionInput = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        var oldQuestionInput = this.questionInput;
        var contentInput = this.getSubElement('QuestionContentInput');
        this.questionInput = contentInput.value;

        fitTextAreaToText( contentInput );
        
        var oldQuestionTooShort = ( ! oldQuestionInput )  ||  ( oldQuestionInput.length < minLengthQuestion );
        if ( contentInput.value.length >= minLengthQuestion  &&  oldQuestionTooShort ){
            this.editMessage = { text:'' };
            this.questionValidity = '';
            this.dataUpdated();
        }
    };

        QuestionEditDisplay.prototype.
    handleEditQuestionSave = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        var contentInput = this.getSubElement('QuestionContentInput');

        if ( contentInput.value.length < minLengthQuestion ){
            var message = 'Question is too short.';
            this.editMessage = { color:RED, text:message };
            this.questionValidity = message;
            this.dataUpdated();
            return;
        }

        if ( contentInput.value == this.question.content ){
            this.editMessage = { color:GREY, text:'Unchanged', ms:3000 };
            this.questionValidity = '';
            this.dataUpdated();
            return;
        }

        // save via ajax
        this.editMessage = { color:GREY, text:'Saving changes...' };
        this.questionValidity = '';
        this.dataUpdated();
        var sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            questionId:this.question.id ,  // If question is new, then question.id is null, but editQuestion service can handle null and create question.
            linkKey:this.topDisp.linkKey.id ,
            content:contentInput.value
        };
        var url = '/autocomplete/editQuestion';
        var thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( error ){
                var message = 'Failed to save question.';
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.questionValidity = message;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.success ){
                // update data
                thisCopy.question.content = receiveData.question.content;  // Dont overwrite thisCopy.question because receiveData is missing question.answers
                thisCopy.question.id = receiveData.question.id;
                thisCopy.editMessage = { color:GREEN, text:'Saved question', ms:5000 };
                thisCopy.questionValidity = '';
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == TOO_SHORT ){  
                var message = 'Question is too short.';
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.questionValidity = message;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == NOT_OWNER ){  
                var message = 'Cannot edit question created by someone else.';
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.questionValidity = message;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == HAS_RESPONSES ){  
                var message = 'Cannot edit question that already has answers.';
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.questionValidity = message;
                thisCopy.dataUpdated();
            }
            else {
                var message = 'Failed to save question.';
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.questionValidity = message;
                thisCopy.dataUpdated();
            }
        } );
    };

        QuestionEditDisplay.prototype.
    retrieveData = function( ){

        // request via ajax
        var thisCopy = this;
        var sendData = { };
        var url = '/autocomplete/getQuestion/' + this.topDisp.linkKey.id + '/' + this.question.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    questionData.linkOk = true;
                    if ( receiveData.question ){
                        thisCopy.question.content = receiveData.question.content;
                    }
                    thisCopy.dataUpdated();
                    thisCopy.retrieveAnswers();
                }
            }
        } );
    };

        QuestionEditDisplay.prototype.
    retrieveAnswers = function( ){

        // answers:series[answer] , modified
        var questionData = this.question;
        var answers = questionData.answers;
        var thisCopy = this;

        // request via ajax
        var sendData = { };
        var url = '/autocomplete/getQuestionAnswersFromCreator/' + this.topDisp.linkKey.id + '/' + this.question.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    questionData.linkOk = true;
                    // update each answer
                    if ( receiveData.answers ){
                        questionData.answers = receiveData.answers;
                    }
                    // update display
                    thisCopy.dataUpdated();
                }
                else if ( receiveData.message == BAD_LINK ){
                    questionData.linkOk = false;
                    thisCopy.dataUpdated();
                }
            }
        } );
    };

        QuestionEditDisplay.prototype.
    handleQuestionDelete = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        if ( this.question.id == null ){
            this.topDisp.questionDeleted( this );
            return;
        }

        if ( ! confirm('Delete this question and all its answers?') ){  return;  }
    
        var contentInput = this.getSubElement('QuestionContentInput');
        var inputValue = contentInput.value;
        // save via ajax
        this.editMessage = { color:GREY, text:'Deleting...' };
        this.questionValidity = '';
        this.dataUpdated();
        var sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            questionId:this.question.id ,
            linkKey:this.topDisp.linkKey.id
        };
        var url = '/autocomplete/deleteQuestion';
        var thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( error ){
                thisCopy.editMessage = { color:RED, text:'Failed: '+error };
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.success ){
                thisCopy.editMessage = { color:GREEN, text:'Saved question', ms:3000 };
                // update data
                thisCopy.topDisp.questionDeleted( thisCopy );
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == NOT_OWNER ){  
                thisCopy.editMessage = { color:RED, text:'Cannot edit question created by someone else.' };
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == HAS_RESPONSES ){  
                thisCopy.editMessage = { color:RED, text:'Cannot edit question that already has votes.' };
                thisCopy.dataUpdated();
            }
            else {
                thisCopy.editMessage = { color:RED, text:'Failed to delete question.' };
                thisCopy.dataUpdated();
            }
        } );
    };

        QuestionEditDisplay.prototype.
    answerDataUpdated = function( answerData ){
        var existingAnswer = this.question.answers.find(  function(a){ return a.id == answerData.id; }  );
        // If answer exists, answer display updates the answer data.
        if ( ! existingAnswer ){
            this.question.answers.push( answerData );
        }
        this.dataUpdated();
    };


        QuestionEditDisplay.prototype.
    answerDeleted = function( oldAnswerData ){
        oldAnswerDisp = this.answerIdToDisplay( oldAnswerData.id );
        if ( oldAnswerDisp ){
            var answersDiv = this.getSubElement('Answers');
            answersDiv.removeChild( oldAnswerDisp.element );
            this.answerDisplays = this.answerDisplays.filter( a => (a != oldAnswerDisp) )
        }
        this.question.answers = this.question.answers.filter( a => (a.id != oldAnswerData.id) );
    };




/////////////////////////////////////////////////////////////////////////////////
// Survey editing display

        function
    SurveyEditDisplay( surveyId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member-data
        
        this.createFromHtml( surveyId, '\n\n' + [
            '<h1 class=title translate=true> Edit Survey </h1>',
            '<div class=Survey id=Survey>',
            '    <div class="Message SurveyLinkMessage" id=SurveyLinkMessage aria-live=polite translate=true></div>',
            '    <div class=loginStatus id=loginStatus translate=true></div>',
            '    <div class=hideReasonsStatus id=hideReasonsStatus translate=true></div>' ,
            '    <div> ' ,
            '        <button class=freezeButton id=freezeButton onclick=clickFreezeButton translate=true></button>' ,
            '        <div class="Message freezeMessage" id=freezeMessage translate=true></div>' ,
            '    </div> ' ,
            '    <div class=SurveyEdit>', 
            '        <label for=SurveyTitleInput translate=true> Survey title </label>',
            '        <input type=text class="SurveyEditInput SurveyTitleInput" id=SurveyTitleInput placeholder="title..." ',
            '            onkeydown=handleEditTitleKey oninput=handleEditTitleInput onblur=handleEditSurveySave></textarea>',
            '        <label for=SurveyIntroInput translate=true> Survey introduction </label>',
            '        <textarea class=SurveyEditInput id=SurveyIntroInput placeholder="introduction..." ',
            '            onkeydown=handleEditIntroKey oninput=handleEditIntroInput onblur=handleEditSurveySave></textarea>',
            '        <div class="Message SurveyEditMessage" id=SurveyEditMessage aria-live=polite></div> ',
            '    </div>',
            '    <h2 translate=true> Questions </h2>' ,
            '    <p translate=true> Add survey questions here. </p>' ,
            '    <p translate=true> You can suggest answers here.  Participants will also be able to enter any answer they want, or copy each other\'s answers. </p>' ,
            '    <div class=Questions id=Questions></div>',
            '    <div class=NewQuestion>', 
            '        <label for=NewQuestionInput translate=true> New question </label>',
            '        <textarea class=NewQuestionInput id=NewQuestionInput placeholder="" ',
            '            oninput=handleNewQuestionInput></textarea>',
            '    </div>',
            '    <div class=SurveyViewButtonBar><button class=SurveyViewButton id=SurveyViewButton onclick=onViewSurvey translate=true> View Survey </button></div>' ,
            '</div>'
        ].join('\n') );
    }
    SurveyEditDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        SurveyEditDisplay.prototype.
    setAllData = function( surveyData, topDisp ){
        this.survey = surveyData;  // Survey data will have questions updated already.
        this.topDisp = topDisp;

        this.questionDisplays = [];
        this.dataUpdated();
    };


    // Update html from data.
        SurveyEditDisplay.prototype.
    dataUpdated = function( ){

        if ( ! this.survey.allowEdit ){  this.onViewSurvey();  }   // Enforce editing permission

        // Set message contents
        if ( this.survey  &&  this.survey.linkOk ) {
            // No message necessary
        }
        else {
            this.linkMessage = { color:RED, text:'Invalid link' };
            this.linkMessage = showMessageStruct( this.linkMessage, this.getSubElement('SurveyLinkMessage') );
        }
        this.editMessage = showMessageStruct( this.editMessage, this.getSubElement('SurveyEditMessage') );
        this.getSubElement('SurveyTitleInput').setCustomValidity( this.surveyTitleValidity? this.surveyTitleValidity : '' );
        this.getSubElement('SurveyIntroInput').setCustomValidity( this.surveyIntroValidity? this.surveyIntroValidity : '' );

        if ( this.topDisp.linkKey.loginRequired ){
            this.setInnerHtml( 'loginStatus', 'Voter login required' );
        }
        else {
            this.setInnerHtml( 'loginStatus', (this.survey.mine ? 'Browser login only' : null) );
        }
        this.setInnerHtml( 'hideReasonsStatus', (this.survey.hideReasons ? 'Reasons hidden' : null) );

        // Show freeze-message, freeze-button label
        this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeMessage') );
        this.setInnerHtml( 'freezeButton' , (this.isFrozen() ? 'Frozen' : 'Unfrozen') );

        // Set survey attributes
        this.setAttribute( 'Survey' , 'frozen' , (this.isFrozen() ? TRUE : null) );
        this.setAttribute( 'Survey', 'mine', (this.survey.mine ? TRUE : null) );
        this.setAttribute( 'Survey', 'hidereasons', (this.survey.hideReasons ? TRUE : null) );

        // Set title
        this.setProperty( 'SurveyTitleInput', 'defaultValue', this.survey.title );
        // Set introduction
        this.setProperty( 'SurveyIntroInput', 'defaultValue', this.survey.introduction );
        var surveyIntroInput = this.getSubElement('SurveyIntroInput');
        setTimeout(  function(){ fitTextAreaToText( surveyIntroInput ); } , 100  );

        // For each question data...
        for ( var q = 0;  q < this.survey.questions.length;  ++q ) {
            var question = this.survey.questions[q];
            this.updateQuestionDisp( question );
        }

        // Add question displays in order of questionIds (unless display html already in that index position),
        // while skipping insert index past the moving question's target index?
        // Simpler than using pre/next links, and saves equal work?
        // No work done for elements outside range of source to target index.

        translateScreen();
    };

        SurveyEditDisplay.prototype.
    updateQuestionDisp = function( questionData ){
        var questionDisp = this.questionIdToDisplay( questionData.id );
        if ( questionDisp ){
            questionDisp.setAllData( questionData, this.topDisp );
        }
        else {
            // Create and collect display object
            questionDisp = new QuestionEditDisplay( this.newDisplayId() );
            questionDisp.setAllData( questionData, this.topDisp );
            this.questionDisplays.push( questionDisp );

            // Add display DOM element
            var questionsDiv = this.getSubElement('Questions');
            addAndAppear( questionDisp.element, questionsDiv );
        }
        return questionDisp;
    };

        SurveyEditDisplay.prototype.
    questionIdToDisplay = function( questionId ){
        var questionDisp = this.questionDisplays.find(  function(d){ return d.question.id == questionId; }  );
        return questionDisp;
    };

        SurveyEditDisplay.prototype.
    newDisplayId = function( ){
        return this.survey.id + '-question-' + this.questionDisplays.length;
    };


        SurveyEditDisplay.prototype.
    areReasonsHidden = function(){  return this.survey.hideReasons;  }


        SurveyEditDisplay.prototype.
    isFrozen = function( ){  return this.survey && this.survey.freezeUserInput;  }

        SurveyEditDisplay.prototype.
    clickFreezeButton = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Update freeze message
        var freeze =  ! this.isFrozen();
        this.freezeMessage = {  color:GREY , text:(freeze ? 'Freezing' : 'Unfreezing')  };
        this.dataUpdated();

        // save via ajax
        this.dataUpdated();
        var sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.topDisp.linkKey.id , 
            freeze:freeze
        };
        var url = '/autocomplete/freezeSurvey';
        var thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                thisCopy.freezeMessage = { color:GREEN , text:(freeze ? 'Froze' : 'Unfroze') + ' survey' , ms:7000 };
                thisCopy.survey.freezeUserInput = receiveData.survey.freezeUserInput;
            }
            else if ( ! error  &&  receiveData  &&  receiveData.message == NOT_OWNER ){  
                thisCopy.freezeMessage = { color:RED , text:'Cannot ' +  (freeze ? 'freeze' : 'unfreeze') + ' survey created by someone else' };
            }
            else {
                thisCopy.freezeMessage = { color:RED , text:'Failed to ' + (freeze ? 'freeze' : 'unfreeze') + ' survey' , ms:7000 };
            }
            thisCopy.dataUpdated();
        } );
    };


        SurveyEditDisplay.prototype.
    handleEditTitleKey = function( event ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        // if ENTER key... focus introduction-input, then blur causes save
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            this.getSubElement('SurveyIntroInput').focus();
            return false;
        }
    };

        SurveyEditDisplay.prototype.
    handleEditTitleInput = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        var titleInput = this.getSubElement('SurveyTitleInput');
        this.titleInput = titleInput.value;
    };


        SurveyEditDisplay.prototype.
    handleEditIntroKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key...
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            // Focus next existing / new question input, then blur causes save
            if ( this.questionDisplays  &&  this.questionDisplays.length > 0 ){
                this.questionDisplays[0].setInputFocusAtEnd();
            }
            else {
                var newQuestionInput = this.getSubElement('NewQuestionInput');
                newQuestionInput.focus();
            }
            return false;
        }
    };

        SurveyEditDisplay.prototype.
    handleEditIntroInput = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        var introInput = this.getSubElement('SurveyIntroInput');
        this.introInput = introInput.value;
        fitTextAreaToText( introInput );
    };


        SurveyEditDisplay.prototype.
    handleNewQuestionInput = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        var newQuestionInput = this.getSubElement('NewQuestionInput');
        if ( newQuestionInput.value.length > 0 ){
            // Clear and hide new-question input
            var input = newQuestionInput.value;
            newQuestionInput.value = '';
            var newQuestionInputJquery = jQuery( newQuestionInput );
            newQuestionInputJquery.hide();
            
            // Add new question display containing start of question content, and focus it
            var newQuestionData = { id:null, answers:[], positionInSurvey:this.questionDisplays.length };
            this.survey.questions.push( newQuestionData );
            var questionDisp = this.updateQuestionDisp( newQuestionData );
            questionDisp.questionInput = input;
            questionDisp.dataUpdated();
            questionDisp.setInputFocusAtEnd();

            // Transition in new-question input, as if it were newly added to page
            newQuestionInputJquery.slideToggle();
        }
    };
    

        SurveyEditDisplay.prototype.
    retrieveDataUpdate = function( ){  return this.retrieveData();  }

        SurveyEditDisplay.prototype.
    retrieveData = function( ){
        // request via ajax
        var thisCopy = this;
        var sendData = { surveyId:this.survey.id };
        var url = '/autocomplete/getSurvey/' + this.topDisp.linkKey.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    thisCopy.survey.linkOk = true;
                    if ( receiveData.survey ){
                        thisCopy.survey.id = receiveData.survey.id;
                        thisCopy.survey.title = receiveData.survey.title;
                        thisCopy.survey.introduction = receiveData.survey.introduction;
                        thisCopy.survey.allowEdit = receiveData.survey.allowEdit;
                        thisCopy.survey.freezeUserInput = receiveData.survey.freezeUserInput;
                        thisCopy.survey.mine = receiveData.survey.mine;
                        thisCopy.survey.hideReasons = receiveData.survey.hideReasons;
                    }
                    if ( receiveData.linkKey ){
                        thisCopy.linkKey.loginRequired = receiveData.linkKey.loginRequired;
                    }
                    thisCopy.dataUpdated();
                    thisCopy.retrieveQuestions();
                }
                else if ( receiveData.message == BAD_LINK ){
                    thisCopy.survey.linkOk = false;
                    thisCopy.dataUpdated();
                }
            }
        } );
    };
    
    
        SurveyEditDisplay.prototype.
    retrieveQuestions = function( ){
        // request via ajax
        var thisCopy = this;
        var sendData = { };
        var url = '/autocomplete/getSurveyQuestions/' + this.topDisp.linkKey.id;

        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    thisCopy.survey.linkOk = true;
                    // Update each question's data
                    if ( receiveData.questions ){
                        // For each question... do a field-level merge, to keep already retrieved answer data
                        var questionIdToData = {};
                        for ( var q = 0;  q < thisCopy.survey.questions.length;  ++q ){
                            var questionOldData = thisCopy.survey.questions[q];
                            questionIdToData[ questionOldData.id ] = questionOldData;
                        }
                        for ( var q = 0;  q < receiveData.questions.length;  ++q ){
                            var questionNewData = receiveData.questions[q];
                            var questionOldData = questionIdToData[ questionNewData.id ];
                            if ( questionOldData ){
                                questionOldData.content = questionNewData.content;
                            }
                            else {
                                if ( ! questionNewData.answers ){  questionNewData.answers = [];  }
                                thisCopy.survey.questions.push( questionNewData );
                            }
                        }
                    }
                    thisCopy.dataUpdated();

                    // For each question display... retrieve question's answer data
                    for ( var q = 0;  q < thisCopy.questionDisplays.length;  ++q ){
                        var questionDisp = thisCopy.questionDisplays[q];
                        questionDisp.retrieveAnswers();
                    }
                }
                else if ( receiveData.message == BAD_LINK ){
                    thisCopy.survey.linkOk = false;
                    thisCopy.dataUpdated();
                }
            }
        } );
    };


        SurveyEditDisplay.prototype.
    handleEditSurveySave = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInput = this.getSubElement('SurveyTitleInput');
        let introInput = this.getSubElement('SurveyIntroInput');
        if ( (titleInput.value == this.survey.title) && (introInput.value == this.survey.introduction) ){  return;  }

        // save via ajax
        this.editMessage = { color:GREY, text:'Saving changes...' };
        this.surveyIntroValidity = '';
        this.dataUpdated();
        let sendData = { 
            crumb:crumb , fingerprint:fingerprint ,
            linkKey:this.topDisp.linkKey.id , 
            title:titleInput.value ,
            introduction:introInput.value
        };
        let url = '/autocomplete/editSurvey';
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            // Success
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                thisCopy.editMessage = { color:GREEN, text:'Saved survey', ms:7000 };
                thisCopy.surveyIntroValidity = '';
                thisCopy.dataUpdated();
                // Update data
                thisCopy.survey.title = receiveData.survey.title;
                thisCopy.survey.introduction = receiveData.survey.introduction;
                thisCopy.dataUpdated();
                return;
            }
            // Show error message
            let message = 'Failed to save survey';
            if ( receiveData ){
                if ( receiveData.message == TOO_SHORT ){  message = 'Survey is too short';  }
                else if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit survey created by someone else';  }
                else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit survey that already has answers';  }
            }
            thisCopy.editMessage = { color:RED, text:message };
            thisCopy.surveyIntroValidity = message;
            thisCopy.dataUpdated();
        } );
    };


        SurveyEditDisplay.prototype.
    onViewSurvey = function( ){
        setFragmentFields( {page:FRAG_PAGE_VIEW_AUTOCOMPLETE} );
    };
    
        SurveyEditDisplay.prototype.
    questionDeleted = function( oldQuestionDisp ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Remove question display from webpage and from survey display
        var questionsDiv = this.getSubElement('Questions');
        questionsDiv.removeChild( oldQuestionDisp.element );
        this.questionDisplays = this.questionDisplays.filter( q => (q != oldQuestionDisp) )
        // Remove question data
        this.survey.questions = this.survey.questions.filter( a => (a.id != oldQuestionDisp.question.id) );

        this.renumberQuestionDisplays();
    };

    
        SurveyEditDisplay.prototype.
    reorderQuestionDisplays = function( focusedQuestionDisp ){

        // Keep focus in same place in input, by removing and re-inserting other question DOM elements.
        // Enforce order by comparing element before current, not by comparing indexes, because this helps preserve stable subsequences.

        // Insert elements in front of and after the focused element
        // For each question data, from focused question data to last question data...
        var lastInsertedQuestionDiv = focusedQuestionDisp.element;
        var questionIdToDisp = this.collectQuestionIdToDisplay();
        var questionsDiv = this.getSubElement('Questions');
        var focusedQuestionDataIndex = this.survey.questions.findIndex(  function(q){ return q.id == focusedQuestionDisp.question.id; }  );
        for ( var q = focusedQuestionDataIndex + 1;  q < this.survey.questions.length;  ++q ){
            var questionData = this.survey.questions[q];
            var questionDisp = questionIdToDisp[ questionData.id ];
            if ( questionDisp == null ){  continue;  }
            // Insert question html element after focused element
            if ( lastInsertedQuestionDiv.nextElementSibling != questionDisp.element ){
                insertHtmlElementAfter( questionsDiv, questionDisp.element, lastInsertedQuestionDiv );
            }
            lastInsertedQuestionDiv = questionDisp.element;
        }
        // For each question data, from focused question data to first question data...
        lastInsertedQuestionDiv = focusedQuestionDisp.element;
        for ( var q = focusedQuestionDataIndex - 1;  q >= 0;  --q ){
            var questionData = this.survey.questions[q];
            var questionDisp = questionIdToDisp[ questionData.id ];
            if ( questionDisp == null ){  continue;  }
            // Insert question html element in front of focused element
            if ( lastInsertedQuestionDiv.previousElementSibling != questionDisp.element ){
                questionsDiv.insertBefore( questionDisp.element, lastInsertedQuestionDiv );
            }
            lastInsertedQuestionDiv = questionDisp.element;
        }

        // Recenter focused question display
        scrollToHtmlElement( focusedQuestionDisp.element );
    };
    
        function
    insertHtmlElementAfter( parent, newChild, prevChild ){
        if ( prevChild.nextElementSibling ){  parent.insertBefore( newChild, prevChild.nextElementSibling );  }
        else                               {  parent.appendChild( newChild );  }
    }
    
        SurveyEditDisplay.prototype.
    collectQuestionIdToDisplay = function( ){
        var questionIdToDisp = { };
        for ( var q = 0;  q < this.questionDisplays.length;  ++q ){
            var questionDisplay = this.questionDisplays[q];
            questionIdToDisp[ questionDisplay.question.id ] = questionDisplay;
        }
        return questionIdToDisp;
    };

        SurveyEditDisplay.prototype.
    collectQuestionIdToData = function( ){
        var questionIdToData = { };
        for ( var q = 0;  q < this.survey.questions.length;  ++q ){
            var questionData = this.survey.questions[q];
            questionIdToData[ questionData.id ] = questionData;
        }
        return questionIdToData;
    };


        SurveyEditDisplay.prototype.
    reorderQuestions = function( focusedQuestionDisp, newQuestionIndex ){
        // Re-order question data
        var oldQuestionDataIndex = this.survey.questions.findIndex(  function(q){ return q.id == focusedQuestionDisp.question.id; }  );

        this.survey.questions.splice( oldQuestionDataIndex, 1 );  // Remove moving question
        this.survey.questions.splice( newQuestionIndex, 0, focusedQuestionDisp.question );  // Re-insert moving question at new position

        this.renumberQuestionDisplays();
        this.reorderQuestionDisplays( focusedQuestionDisp );
    };

        SurveyEditDisplay.prototype.
    renumberQuestionDisplays = function( ){
        // For each question data... set position
        for ( var q = 0;  q < this.survey.questions.length;  ++q ){
            var questionData = this.survey.questions[q];
            questionData.positionInSurvey = q;
        }
        // For each question display... update display
        for ( var q = 0;  q < this.questionDisplays.length;  ++q ){
            var questionDisp = this.questionDisplays[q];
            questionDisp.positionInput = null;  // Discard user input, reset position input to value from question data
            questionDisp.dataUpdated();
        }
    };

        SurveyEditDisplay.prototype.
    saveQuestionOrder = function( focusedQuestionDisplay ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // save via ajax
        focusedQuestionDisplay.editMessage = { color:GREY, text:'Saving changes...' };
        focusedQuestionDisplay.questionValidity = '';
        focusedQuestionDisplay.dataUpdated();
        var questionIds = this.survey.questions.map(  function(q){ return q.id; }  );
        var sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            linkKey:this.topDisp.linkKey.id , questionIds:questionIds
        };
        var url = '/autocomplete/reorderSurveyQuestions';
        var thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( error ){
                var message = 'Failed to save question order';
                focusedQuestionDisplay.editMessage = { color:RED, text:message };
                focusedQuestionDisplay.questionValidity = message;
                focusedQuestionDisplay.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.success ){
                // Update questionData positions
                // For each received question id...
                var questionIdToData = thisCopy.collectQuestionIdToData();
                for ( var q = 0;  q < receiveData.survey.questionIds.length;  ++q ){
                    var questionId = receiveData.survey.questionIds[q];
                    // Try to find existing question data and update its position
                    var questionData = questionIdToData[ questionId ];
                    if ( questionData ){  questionData.positionInSurvey = q;  }
                }
                // Order questionDatas by positions
                thisCopy.survey.questions.sort(  function(a,b){ return (a.positionInSurvey - b.positionInSurvey); }  );
                // Renumber and reorder question displays
                thisCopy.renumberQuestionDisplays();
                thisCopy.reorderQuestionDisplays( focusedQuestionDisplay );

                focusedQuestionDisplay.editMessage = { color:GREEN, text:'Saved question order', ms:7000 };
                focusedQuestionDisplay.questionValidity = '';
                focusedQuestionDisplay.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == NOT_OWNER ){  
                var message = 'Cannot edit survey created by someone else';
                focusedQuestionDisplay.editMessage = { color:RED, text:message };
                focusedQuestionDisplay.questionValidity = message;
                focusedQuestionDisplay.dataUpdated();
            }
            else {
                var message = 'Failed to save question order';
                focusedQuestionDisplay.editMessage = { color:RED, text:message };
                focusedQuestionDisplay.questionValidity = message;
                focusedQuestionDisplay.dataUpdated();
            }
        } );

    };
    

