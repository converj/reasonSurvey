// Displays based on ElementWrap

// Text-answer ("multiple choice") question with edit/view/result-states

// Separate option-displays for editing suggestions, clicking suggestions, and viewing results,
// because there are very different sets of options for edit/view/result, not a consistent set that change appearance


/////////////////////////////////////////////////////////////////////////////////
// Display for option editing

        function
    TextOptionEditDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=TextOptionEditDisplay id=Option>',
            '   <div class=EditRow> ',
            '       <div> ',
            '           <input class=OptionContentInput id=OptionContentInput placeholder="" ',
            '               onblur=handleEditOptionSave oninput=handleEditOptionInput /> ',
            '       </div><div class=OptionDeleteButtonCell> ',
            '           <button class=OptionDeleteButton id=OptionDeleteButton title="Delete" onclick=handleDeleteClick> X </button> ',
            '       </div> ',
            '   </div> ',
            '   <div class=MessageWrap> ',
            '       <div class="Message" id=message aria-live=polite></div> ',
            '   </div> ',
            ' </div> '
        ].join('\n') );
    }
    TextOptionEditDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        TextOptionEditDisplay.prototype.
    setInitialData = function( optionData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( optionData );
        return this;
    };

        TextOptionEditDisplay.prototype.
    setData = function( optionData ){
        this.option = optionData; 
        this.dataUpdated();
    };

    // Update this.element
        TextOptionEditDisplay.prototype.
    dataUpdated = function( ){
        this.contentInput = this.getSubElement('OptionContentInput');

        this.messagesUpdated();

        this.contentInput.defaultValue = this.option.title;
        this.contentInput.disabled = ! this.questionDisplay.allowInput();
        this.setProperty( 'OptionDeleteButton', 'disabled', ! this.questionDisplay.allowInput() );
    };

        TextOptionEditDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('message') );
        this.contentInput.setCustomValidity( this.optionValidity || '' );
    }

        TextOptionEditDisplay.prototype.
    handleEditOptionInput = RatingOptionDisplay.prototype.handleEditOptionInput;

        TextOptionEditDisplay.prototype.
    handleEditOptionCancelClick = RatingOptionDisplay.prototype.handleEditOptionCancelClick;

        TextOptionEditDisplay.prototype.
    handleEditOptionSave = RatingOptionDisplay.prototype.handleEditOptionSave;

        TextOptionEditDisplay.prototype.
    handleDeleteClick = RatingOptionDisplay.prototype.handleDeleteClick;



/////////////////////////////////////////////////////////////////////////////////
// Display for viewing suggestion

        function
    TextOptionViewDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=TextOptionViewDisplay id=Option>',
            '   <button class=TextOptionButton id=TextOptionButton onclick=onClickOption> ',
            '       <span class=ContentSpan id=ContentSpan></span> ',
            '       <span class=ReasonDelimiter id=ReasonDelimiter><span translate=yes> Reason</span>: </span> ',
            '       <span class=ReasonSpan id=ReasonSpan></span> ',
            '   </button> ',
            '   <div class="Message" id=message aria-live=polite></div> ',
            ' </div> '
        ].join('\n') );
    }
    TextOptionViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        TextOptionViewDisplay.prototype.
    setInitialData = function( optionData, questionDisplay ){
        this.questionDisplay = questionDisplay;
        this.setData( optionData, null );
        return this;
    };

        TextOptionViewDisplay.prototype.
    setData = function( optionData, wordsToHighlight ){
        this.option = optionData;
        this.highlightWords = wordsToHighlight;
        this.dataUpdated();
    };

    // Update this.element
        TextOptionViewDisplay.prototype.
    dataUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('message') );

        // Set attributes
        this.setProperty( 'TextOptionButton', 'disabled', ! this.questionDisplay.allowInput() );

        // Set content
        displayHighlightedContent( storedTextToHtml(this.option.content), this.highlightWords, this.getSubElement('ContentSpan') );
        displayHighlightedContent( storedTextToHtml(this.option.reason), this.highlightWords, this.getSubElement('ReasonSpan') );
        this.setStyle( 'ReasonDelimiter', 'display', ( this.option.reason ?  'inline-block'  :  'none' ) );


        translateScreen( this.getSubElement('Option') );  // Options seem to be re-updated after top-level translation, so need re-translation
    };

        TextOptionViewDisplay.prototype.
    onClickOption = function( event ){  this.questionDisplay.onClickOption(this);  };




/////////////////////////////////////////////////////////////////////////////////
// Display for option result

        function
    TextReasonResultDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data 

        // User-interface state variables (not persistent) 

        // Create html element, store it in this.element 
        this.createFromHtml( displayId, '\n\n' + [
            ' <div id=TextReasonResult class=TextReasonResult>',
            '   <li id=Reason class=TextReason></li> ',
            '   <div class=VoteCount id=VoteCountNumber></div> ',
            ' </div> '
        ].join('\n') );
    }
    TextReasonResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods 

        TextReasonResultDisplay.prototype.
    setData = function( reasonResultData ){
        this.reason = reasonResultData;
        this.dataUpdated();
        return this;
    };

    // Update this.element 
        TextReasonResultDisplay.prototype.
    dataUpdated = function( ){
        this.setInnerHtml( 'Reason', this.reason.reason );
        this.setInnerHtml( 'VoteCountNumber', this.reason.votes );
    };



        function
    TextOptionResultDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.reasonResultDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=TextOptionResultDisplay id=Option> ',
            '   <details id=ReasonsExpander ontoggle=onReasonsToggle> ',
            '       <summary> ',
            '           <div id=OptionResultContent class=OptionResultContent></div> ',
            '           <div id=VoteCount class=VoteCount><span id=VoteCountNumber class=VoteCountNumber></span></div> ',
            '       </summary> ',
            '       <div id=OptionReasonResults class=OptionReasonResults></div> ',
            '   </details> ',
            '   <div class="Message" id=message aria-live=polite></div> ',
            ' </div> '
        ].join('\n') );
    }
    TextOptionResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        TextOptionResultDisplay.prototype.
    setInitialData = function( optionResult, questionDisplay, surveyDisplay ){
        this.option = optionResult;
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( optionResult, null );
        return this;
    };

        TextOptionResultDisplay.prototype.
    setData = function( optionResult, voteCountForAllOptions ){
        this.option = optionResult;
        this.voteCountForAllOptions = voteCountForAllOptions;
        this.dataUpdated();
    };

        TextOptionResultDisplay.prototype.
    dataUpdated = function( ){  // Update data to html
        // Show messages
        this.message = showMessageStruct( this.message, this.getSubElement('message') );

        // Set attributes

        // Set content
        this.setInnerHtml( 'OptionResultContent', this.option.answer );
        this.setInnerHtml( 'VoteCountNumber', this.option.votes );
        this.getSubElement('VoteCount').style.width = (100 * this.option.votes / this.voteCountForAllOptions) + 'px';

        // Subdisplays for reason results
        let thisCopy = this;
        this.reasonResultDisplays.data = this.reasons || [];
        this.reasonResultDisplays.data.forEach(  r => { r.key = r.key || r.reasonId }  );  // Ensure each data has a key string
        this.updateSubdisplays( this.reasonResultDisplays, this.getSubElement('OptionReasonResults') ,
            ( optionReasonResult ) => new TextReasonResultDisplay( 
                [thisCopy.questionDisplay.question.id, thisCopy.option.id, optionReasonResult.reasonId].join('-') )
                .setData( optionReasonResult )
         );
        if ( this.reasonResultDisplays.displays ){   this.reasonResultDisplays.displays.forEach(  (r,i) => r.setData( thisCopy.reasons[i] )  );   }
    };

        TextOptionResultDisplay.prototype.
    onReasonsToggle = function( event ){
        let reasonsExpander = this.getSubElement('ReasonsExpander');
        if ( reasonsExpander.open && (this.reasons == null) ){  this.retrieveResults();  }
    };

        TextOptionResultDisplay.prototype.
    retrieveResults = function( ){
        // Retrieve results from server
        let url = '/multi/questionAnswerTopReasons/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id + '/' + this.option.answerId;
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.reasons ){
                // Sort by votes
                thisCopy.reasons = receiveData.reasons.sort( (a,b) => b.votes - a.votes );
                thisCopy.dataUpdated();
            }
        } );
    };




/////////////////////////////////////////////////////////////////////////////////
// Display for ranking-question

        function
    TextQuestionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        let thisCopy = this;
        this.editOptionDisplays = { data:[] };
        this.viewOptionDisplays = { data:[] };
        this.resultOptionDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=TextQuestionDisplay id=TextQuestionDisplay> ',
            '   <div class=Message id=Message aria-live=polite></div> ',
            //  Edit
            '   <div class=Edit> ',
            '       <div class=RatingLimitsWrap> ',
            '           <div class=RatingLimitWrap> ',
            '               <label for=RequireReasonInput translate=yes> Require reasons </label> ',
            '               <input id=RequireReasonInput class=RequireReasonInput type=checkbox checked oninput=onRequireReasonInput /> ',
            '           </div> ',
            '       </div> ',
            '       <div class=EditHeadings id=EditHeadings><div translate=yes> Suggestion </div><div translate=yes> Delete </div></div> ',
            '       <div class=Options id=EditOptions></div> ',
            '       <div class=NewOptionWrap> ',
            '           <label for=NewOptionInput translate=yes> Add suggestion </label> ',
            '           <input class=NewOptionInput id=NewOptionInput placeholder="..." oninput=handleNewOptionInput /> ',
            '           <div class=SaveOrCancelButtons> ',
            '               <button class=SaveButton id=SaveButton translate=yes onclick=handleNewOptionSaveClick> Save </button> ',
            '               <button class=CancelButton id=CancelButton translate=yes onclick=handleNewOptionCancelClick> Cancel </button> ',
            '           </div> ',
            '       </div> ',
            '   </div> ',
            //  View
            '   <div class=View> ',
            '       <div class=ViewHeadings id=ViewHeadings><h4 translate=yes> Suggestions </h4></div> ',
            '       <div class=Options id=ViewOptions></div> ',
            '       <label for=AnswerInput translate=yes> Answer </label> ',
            '       <input class=AnswerInput id=AnswerInput placeholder="..." onfocus=onAnswerFocus onblur=onAnswerBlur oninput=onAnswerInput /> ',
            '       <label for=ReasonInput translate=yes> Reason </label> ',
            '       <textarea class=ReasonInput id=ReasonInput placeholder="Because..." onfocus=onAnswerFocus onblur=onAnswerBlur oninput=onAnswerInput></textarea> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '       <div class=ResultHeadings><div translate=yes> Answer and reasons </div><div translate=yes> Votes </div></div> ',
            '       <div class=Options id=ResultOptions></div> ',
            '       <div class=BottomButtons id=BottomButtons> ',
            '           <button class=MoreReasonsButton id=MoreAnswersButton translate=yes onclick=onMoreResultsClick> More results </button> ',
            '           <div class=Message id=moreMessage></div> ',
            '       </div> ',
            '   </div> ',
            ' </div>'
        ].join('\n') );
    }
    TextQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        TextQuestionDisplay.prototype.
    setInitialData = function( questionData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( questionData, null );
        return this;
    };

        TextQuestionDisplay.prototype.
    setData = function( questionData, questionAnswer ){
        this.question = questionData;
        this.answer = questionAnswer;
        this.dataUpdated();
    };


    // Update from data to html
        TextQuestionDisplay.prototype.
    dataUpdated = function( ){
        this.answerInput = this.getSubElement('AnswerInput');
        this.reasonInput = this.getSubElement('ReasonInput');

        this.messagesUpdated();

        // Attributes 
        this.setAttribute( 'TextQuestionDisplay', 'mode', this.mode );
        this.setAttribute( 'TextQuestionDisplay', 'hasnewoptioninput', (this.getSubElement('NewOptionInput').value ? TRUE : FALSE) );
        this.setProperty( 'NewOptionInput', 'disabled', ! this.isQuestionValid() );
        this.setProperty( 'SaveButton', 'disabled', ! this.isQuestionValid() );
        this.setProperty( 'CancelButton', 'disabled', ! this.isQuestionValid() );
        this.setProperty( 'AnswerInput', 'disabled', ! this.allowInput() );
        this.setProperty( 'ReasonInput', 'disabled', ! this.allowInput() );
        this.setStyle( 'EditHeadings', 'display', (0 < this.question.options.length ? 'grid' : 'none') );

        // Content
        this.getSubElement('RequireReasonInput').checked = this.question.requireReason;

        let thisCopy = this;
        if ( this.mode == EDIT ){
            // Edit
            this.editOptionDisplays.data = this.question.options.slice() || [];
            this.editOptionDisplays.data.forEach( o => {o.key = o.key || String(o.id);} );  // Ensure each data has a key string, derived from id
            this.updateSubdisplays( this.editOptionDisplays, this.getSubElement('EditOptions'),  // Ensure displays exist and match data order
                (optionData) => new TextOptionEditDisplay( optionData.id ).setInitialData( optionData, thisCopy, thisCopy.surveyDisplay )
             );
            this.editOptionDisplays.displays.forEach(  (d,i) => d.setData( thisCopy.question.options[i] )  );
        }
        else if ( this.mode == VIEW ){
            // View
            this.answerInput.defaultValue = ( this.answer )?  this.answer.content || ''  :  '';
            this.reasonInput.defaultValue = ( this.answer )?  this.answer.reason || ''  :  '';

            // Merge in question-options as suggestions... only if user has typed a word & suggestions were retrieved
            let suggestions = ( this.suggestions )?  Object.values( this.suggestions )  :  null;
            if ( suggestions ){   suggestions.forEach(  s => { s.content = s.parentSubkey;  s.reason = s.lastSubkey; }  );   }
            this.question.options.forEach(  o => { o.content = o.title;  o.reason = ''; }  );  // Ensure suggestions and options have same content fields
            this.viewOptionDisplays.data = ( suggestions )?  suggestions.concat( this.question.options )  :  [];
            this.setStyle( 'ViewHeadings', 'display', (this.viewOptionDisplays.data.length == 0 ?  'none'  :  'block') );
            this.viewOptionDisplays.data = this.viewOptionDisplays.data.slice( 0, 3 );
            this.viewOptionDisplays.data.forEach( o => {o.key = o.key || String(o.id);} );  // Ensure each data has a key string, derived from id
            this.updateSubdisplays( this.viewOptionDisplays, this.getSubElement('ViewOptions'),
                (optionData) => new TextOptionViewDisplay( optionData.id ).setInitialData( optionData, thisCopy )
            );
            this.viewOptionDisplays.displays.forEach(  (d,i) => {
                d.setData( this.viewOptionDisplays.data[i], thisCopy.highlightWords );
            }  );
        }
        else if ( this.mode == RESULT ){
            // Result
            this.resultOptionDisplays.data = ( this.results )?  Object.values( this.results )  :  [];
            this.resultOptionDisplays.data.forEach( o => {o.key = o.id = String(o.answerId);} );  // Ensure each data has a key string
            this.updateSubdisplays( this.resultOptionDisplays, this.getSubElement('ResultOptions'),
                (optionData) => new TextOptionResultDisplay( optionData.id ).setInitialData( optionData, thisCopy, thisCopy.surveyDisplay )
            );
            let totalVoteCount = this.totalVotes();
            this.resultOptionDisplays.displays.forEach(  (d,i) => {
                d.setData( thisCopy.results[i], totalVoteCount );
            }  );
        }
    };

        TextQuestionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.moreMessage = showMessageStruct( this.moreMessage, this.getSubElement('moreMessage') );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    };

        TextQuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.surveyDisplay.isFrozen() );  };
    
        TextQuestionDisplay.prototype.
    isQuestionValid = function( ){  return this.questionDisplay.isQuestionValid();  };

        TextQuestionDisplay.prototype.
    focusInitialInput = function( event ){
        focusAtEnd( this.getSubElement('NewOptionInput') );
    };

        TextQuestionDisplay.prototype.
    setMode = RatingQuestionDisplay.prototype.setMode;

        TextQuestionDisplay.prototype.
    retrieveData = function( ){  };

        TextQuestionDisplay.prototype.
    totalVotes = RatingOptionDisplay.prototype.totalVotes;


        TextQuestionDisplay.prototype.
    onRequireReasonInput = RatingQuestionDisplay.prototype.onRequireReasonInput;

        TextQuestionDisplay.prototype.
    handleNewOptionInput = function( ){
        this.setAttribute( 'TextQuestionDisplay', 'hasnewoptioninput', (this.getSubElement('NewOptionInput').value ? TRUE : FALSE) );
    };

        TextQuestionDisplay.prototype.
    handleNewOptionCancelClick = RatingQuestionDisplay.prototype.handleNewOptionCancelClick;

        TextQuestionDisplay.prototype.
    handleNewOptionSaveClick = RatingQuestionDisplay.prototype.handleNewOptionSaveClick;



        TextQuestionDisplay.prototype.
    onAnswerFocus = function( event ){
        clearTimeout( this.answerInputBlurTimer );
        this.answerInputFocused = true;
    };

        TextQuestionDisplay.prototype.
    onAnswerBlur = function( event ){
        clearTimeout( this.answerInputBlurTimer );
        this.answerInputBlurTimer = setTimeout( () => {
            this.answerInputFocused = false;
            this.dataUpdated();
            // And save answer to server
            this.saveAnswerToServer();
        } , 300 );
    };

        TextQuestionDisplay.prototype.
    onAnswerInput = function( event ){
        this.checkAnswerInput();
        // If user typed SPACE... retrieve suggestions
        if ( event.data == ' ' ){  this.retrieveSuggestions();  }
    };

        TextQuestionDisplay.prototype.
    checkAnswerInput = RatingOptionDisplay.prototype.checkReasonInput;

        TextQuestionDisplay.prototype.
    retrieveSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let answerValue = this.answerInput.value;
        let reasonValue = this.reasonInput.value;
        let answerContent = [ answerValue, reasonValue ].join(' ');

        // If no user-input... hide matching-answers, show top-answers
        if ( ! answerContent.trim() ){  this.suggestions = {};  this.dataUpdated();  }

        // Retrieve suggestions only for first N words
        let words = removeStopWords( tokenize(answerContent) ).slice( 0, MAX_WORDS_INDEXED )  ||  [];
        if ( (! words) || (words.length < 1) ){  return;  }  // Require that user type something

        // Suggest only if input is changed since last suggestion 
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;  }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve reasons to rate higher / lower, via ajax 
        let url = '/multi/answersAndReasonsForPrefix';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , inputStart:contentStart
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.suggestions ){
                // Collect suggestions and calculate IDF weights across reason words 
                if ( ! thisCopy.suggestionTextToData ){  thisCopy.suggestionTextToData = {};  }  // map{ suggestionText -> {scoreMatch, scoreTotal...} }
                for ( let s = 0;  s < receiveData.suggestions.length;  ++s ){
                    let suggestionNew = receiveData.suggestions[ s ];
                    let suggestionContent = [ suggestionNew.parentSubkey, suggestionNew.lastSubkey ].join(' ');
                    if ( suggestionContent  &&  ! (suggestionContent in thisCopy.suggestionTextToData) ){
                        thisCopy.surveyDisplay.incrementWordCounts( suggestionContent );
                    }
                    thisCopy.suggestionTextToData[ suggestionContent ] = suggestionNew;
                }

                // Find top-scored suggestions 
                thisCopy.scoreMatches( contentStart );
                thisCopy.suggestions = Object.values( thisCopy.suggestionTextToData )
                    .sort( (a,b) => (b.scoreTotal - a.scoreTotal) );
                thisCopy.highlightWords = ( thisCopy.suggestions )?  contentStart  :  null;

                thisCopy.dataUpdated();
            }
        } );
    };

        TextQuestionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;


        TextQuestionDisplay.prototype.
    onClickOption = function( optionDisplay ){

        if ( ! this.surveyDisplay.confirmUseSuggestion() ){  return false;  }

        this.answerInput.value = ( optionDisplay.option.content == null )?  ''  :  optionDisplay.option.content;
        this.reasonInput.value = ( optionDisplay.option.reason == null )?  ''  :  optionDisplay.option.reason;
        this.reasonInput.focus();
        this.saveAnswerToServer();
    };

        TextQuestionDisplay.prototype.
    saveAnswerToServer = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Require that ranking or reason changed
        let answerValue = this.answerInput.value;
        let reasonValue = this.reasonInput.value;
        if ( this.answer  &&  (answerValue == this.answer.content)  &&  (reasonValue == this.answer.reason) ){  return;  }

        // Require that reason is valid
        this.checkAnswerInput();
        if ( this.reasonTooShort  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.dataUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving answer...' };
        this.dataUpdated();

        // Save to server
        let url = '/multi/answerQuestion';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , answer:answerValue , reason:reasonValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                thisCopy.message = { color:GREEN, text:'Saved answer', ms:3000 };
                thisCopy.dataUpdated();
                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );  // Reorders option displays
            }
            else {
                let message = 'Failed to save answer';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  thisCopy.reasonValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                    if ( receiveData.message == UNCHANGED ){  message = null;  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };



        TextQuestionDisplay.prototype.
    retrieveResults = function( ){
        let initial = true;
        this.retrieveResultsImp( initial );
    };

        TextQuestionDisplay.prototype.
    onMoreResultsClick = function( ){
        let initial = false;
        this.retrieveResultsImp( initial );
    };

        TextQuestionDisplay.prototype.
    retrieveResultsImp = function( initial ){

        if ( this.cursorResultsDone ){
            this.moreMessage = { color:GREY, text:'No more results yet', ms:5000 };
            this.messagesUpdated();
            return;
        }

        if ( ! initial ){
            this.moreMessage = { color:GREY, text:'Retrieving results...', ms:5000 };
            this.messagesUpdated();
        }

        // Retrieve results from server
        let url = '/multi/questionTopAnswers/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id
        let sendData = {  crumb:crumb , fingerprint:fingerprint , cursor:this.cursorResults };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){

                let newAnswers = receiveData.answers || [];
                thisCopy.results = ( thisCopy.results )?  thisCopy.results.concat( newAnswers )  :  newAnswers;
                thisCopy.cursorResults = receiveData.cursor;
                thisCopy.cursorResultsDone = ! receiveData.more;

                if ( ! initial  &&  isEmpty(receiveData.answers) ){
                    thisCopy.moreMessage = { color:GREY, text:'No more results yet', ms:5000 };
                    thisCopy.messagesUpdated();
                    return;
                }

                thisCopy.moreMessage = { color:GREEN, text:'Retrieved results', ms:3000 };
                thisCopy.messagesUpdated();

                thisCopy.dataUpdated();
            }
        } );
    };


