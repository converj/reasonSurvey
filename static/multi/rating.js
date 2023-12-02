// Displays based on ElementWrap

// Rating-question with edit/view/result-states, which can retrieve data and update cached structs

/////////////////////////////////////////////////////////////////////////////////
// Display for option-rating-reason result

        function
    RatingReasonResultDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div id=RatingReasonResult class=RatingReasonResult>',
            '       <li id=Reason class=RatingReason></li> ',
            '       <div class=VoteCount id=VoteCountNumber></div> ',
            '   </div> ',
            ' </div> '
        ].join('\n') );
    }
    RatingReasonResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        RatingReasonResultDisplay.prototype.
    setData = function( reasonResultData, ratingVotes ){
        this.reason = reasonResultData;
        this.ratingVotes = ratingVotes;
        this.dataUpdated();
        return this;
    };

    // Update this.element
        RatingReasonResultDisplay.prototype.
    dataUpdated = function( ){
        this.setInnerHtml( 'Reason', this.reason.reason );
        this.setInnerHtml( 'VoteCountNumber', this.reason.votes );
        // Only show rating vote-bars, not reason vote-bars, to avoid mixing 2 different bar charts
    };


/////////////////////////////////////////////////////////////////////////////////
// Display for option-rating result

        function
    RatingResultDisplay( surveyLink, questionId, optionId, rating ){
        ElementWrap.call( this );  // Inherit member data

        let displayId = [ questionId, optionId, rating ].join('-');
        this.surveyLink = surveyLink;
        this.questionId = questionId;
        this.optionId = optionId;

        // User-interface state variables (not persistent)
        let thisCopy = this;
        this.reasonDisplays = { data:[] , display:[] ,
            creator:(reasonData)=>new RatingReasonResultDisplay(displayId + '-' + reasonData.reasonId).setData(reasonData, thisCopy.rating.votes) };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=RatingResult id=RatingResult>',
            '       <details id=ReasonsExpander ontoggle=handleReasonsToggle> ',
            '           <summary> ',
            '               <div id=Rating class=Rating></div> ',
            '               <div id=VoteCount class=VoteCount><span id=VoteCountNumber class=VoteCountNumber></span></div> ',
            '           </summary> ',
            '           <div id=Reasons class=Reasons></div> ',
            '       </details> ',
            '   </div> ',
            ' </div> '
        ].join('\n') );
    }
    RatingResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        RatingResultDisplay.prototype.
    setInitialData = function( optionDisplay ){
        this.optionDisplay = optionDisplay;
        return this;
    };

        RatingResultDisplay.prototype.
    setData = function( optionRatingData, optionVotes ){
        this.rating = optionRatingData;
        this.optionVotes = optionVotes;
        this.dataUpdated();
        return this;
    };

    // Update this.element
        RatingResultDisplay.prototype.
    dataUpdated = function( ){
        let ratingLabel = ( this.isBoolean )?  (this.rating.rating == 1 ? 'Yes' : 'No')  :  this.rating.rating;
        this.setInnerHtml( 'Rating', ratingLabel );
        this.setInnerHtml( 'VoteCountNumber', this.rating.votes );
        this.getSubElement('VoteCount').style.width = (100 * this.rating.votes / this.optionVotes) + 'px';

        this.reasonDisplays.data = this.reasons || [];
        this.reasonDisplays.data.forEach(  r => { r.key = r.key || String(r.reasonId) }  );  // Ensure each data has a key string
        this.updateSubdisplays( this.reasonDisplays, this.getSubElement('Reasons') );
        let thisCopy = this;
        if ( this.reasonDisplays.displays ){  this.reasonDisplays.displays.forEach( (r,i) =>
            r.setData(thisCopy.reasonDisplays.data[i], thisCopy.rating.votes)
        );  }
    };


        RatingResultDisplay.prototype.
    handleReasonsToggle = function( event ){
        let reasonsExpander = this.getSubElement('ReasonsExpander');
        if ( reasonsExpander.open && (this.reasons == null) ){  this.retrieveResults( true );  }
    };

        RatingResultDisplay.prototype.
    retrieveResults = function( initial ){

        if ( this.cursorReasonsDone ){
            this.optionDisplay.moreMessage = { color:GREY, text:'No more reasons yet', ms:5000 };
            this.optionDisplay.messagesUpdated();
            return;
        }

        if ( ! initial ){
            this.optionDisplay.moreMessage = { color:GREY, text:'Retrieving reasons...', ms:5000 };
            this.optionDisplay.messagesUpdated();
        }

        // Retrieve results from server
        let url = '/multi/ratingTopReasons/' + this.surveyLink + '/' + this.questionId + '/' + this.optionId + '/' + this.rating.rating;
        let sendData = {  crumb:crumb , fingerprint:fingerprint , cursor:this.cursorReasons  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                // Sort by votes
                let newReasons = receiveData.reasons || [];
                thisCopy.reasons = ( thisCopy.reasons )?  thisCopy.reasons.concat( newReasons )  :  newReasons;
                thisCopy.cursorReasons = receiveData.cursor;
                thisCopy.cursorReasonsDone = ! receiveData.more;

                if ( ! initial ){
                    if ( isEmpty(receiveData.reasons) ){
                        thisCopy.optionDisplay.moreMessage = { color:GREY, text:'No more reasons yet', ms:5000 };
                        thisCopy.optionDisplay.messagesUpdated();
                        return;
                    }
                    thisCopy.optionDisplay.moreMessage = { color:GREEN, text:'Retrieved reasons', ms:5000 };
                    thisCopy.optionDisplay.messagesUpdated();
                }

                thisCopy.dataUpdated();
            }
        } );
    };




/////////////////////////////////////////////////////////////////////////////////
// Display for option

        function
    RatingOptionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        let thisCopy = this;
        this.resultDisplays = {  data:[]  };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=RatingOptionDisplay id=Option>',
            //  Edit
            '   <div class=Edit> ',
            '       <div class=EditRow> ',
            '           <div> ',
            '               <input class=OptionContentInput id=OptionContentInput placeholder="" ',
            '                   onblur=handleEditOptionSave oninput=handleEditOptionInput /> ',
            '           </div><div> ',
            '               <input type=number min=1 max=30 class=OptionPositionInput id=OptionPositionInput title="Position" required oninput=onPositionInput /> ',
            '           </div><div class=OptionDeleteButtonCell> ',
            '               <button class=OptionDeleteButton id=OptionDeleteButton title="Delete" onclick=handleDeleteClick> X </button> ',
            '           </div> ',
            '       </div> ',
            '   </div> ',
            //  View
            '   <div class=View> ',
            '       <div for=RatingInput id=RatingLabel class=RatingLabel></div> ',
            '       <div class=RatingInputWrap> ',
            '           <select class=RatingInput id=RatingInput title="Rating" oninput=handleRatingInput></select> ',
            '       </div> ',
            '       <button class=RatingIncrementButton id=RatingUpButton title="Reason" onclick=ratingUpClick onfocus=onReasonInputFocus onblur=onReasonInputBlur > &uarr; </button> ',
            '       <div class=ReasonCell> ',
            '           <textarea ',
            '               class=ReasonInput id=ReasonInput title="Reason" placeholder="Because..." oninput=handleReasonInput ',
            '               onfocus=onReasonInputFocus onblur=onReasonInputBlur ',
            '           ></textarea/> ',
            '       </div> ',
            '       <button class=RatingIncrementButton id=RatingDownButton onclick=ratingDownClick onfocus=onReasonInputFocus onblur=onReasonInputBlur> &darr; </button> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '       <details> ',
            '           <summary> ',
            '               <div class=OptionResultContent id=OptionResultContent ></div> ',
            '               <div id=OptionResultMedian class=OptionResultMedian></div> ',
            '           </summary> ',
            '           <div id=OptionRatingResults class=OptionRatingResults></div> ',
            '           <div class=BottomButtons id=BottomButtons> ',
            '               <button class=MoreReasonsButton id=MoreReasonsButton translate=yes onclick=onMoreReasonsClick> More reasons </button> ',
            '               <div class=Message id=moreMessage></div> ',
            '           </div> ',
            '       </details> ',
            '   </div> ',
            //  Message
            '   <div class=MessageWrap> ',
            '       <div class="Message" id=optionMessage aria-live=polite></div> ',
            '   </div> ',
            ' </div> '
        ].join('\n') );
    }
    RatingOptionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        RatingOptionDisplay.prototype.
    setInitialData = function( optionData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( optionData, null, null, null );
        return this;
    };

        RatingOptionDisplay.prototype.
    setData = function( optionData, optionAnswer, optionResults, optionIndex, ratingDistribution ){
        this.option = optionData;
        this.index = optionIndex;
        this.storedRatingChanged =  Boolean(  optionAnswer  &&  ! ( this.answer && (this.answer.content == optionAnswer.content) )  );
        this.answer = optionAnswer;
        this.results = optionResults;
        this.distribution = ratingDistribution;
        this.dataUpdated();
    };

    // Update this.element
        RatingOptionDisplay.prototype.
    dataUpdated = function( ){
        this.ratingInput = this.getSubElement('RatingInput');
        this.reasonInput = this.getSubElement('ReasonInput');

        this.messagesUpdated();

        // Set attributes
        this.ratingInput.min = this.questionDisplay.question.ratingMin;
        this.ratingInput.max = this.questionDisplay.question.ratingMax;
        this.setAttribute( 'Option', 'ratingInputFocused', (this.ratingInputFocused ? TRUE : null) );

        // Edit
        this.setProperty( 'OptionContentInput', 'defaultValue', this.option.title );
        this.setProperty( 'OptionContentInput', 'disabled', ! this.questionDisplay.isQuestionValid() );
        this.setProperty( 'OptionPositionInput', 'value', this.index + 1 );
        this.setProperty( 'OptionPositionInput', 'disabled', ! this.questionDisplay.isQuestionValid() );
        this.setProperty( 'OptionDeleteButton', 'disabled', ! this.questionDisplay.isQuestionValid() );

        // View
        this.setInnerHtml( 'RatingLabel', this.option.title );
        let hasSuggestUp = this.suggest  &&  this.suggest.up  &&  this.suggest.up.lastSubkey;
        if (  hasSuggestUp  &&  ( this.ratingInput.value < parseInt(this.suggest.up.parentSubkey) )  ){
            let suggestUpText = '&uarr; ' + this.suggest.up.lastSubkey;
            displayHighlightedContent( storedTextToHtml(suggestUpText), this.highlightWords, this.getSubElement('RatingUpButton') );
            this.setStyle( 'RatingUpButton', 'display', null );
        }
        else {  this.setStyle( 'RatingUpButton', 'display', 'none' );  }

        let hasSuggestDown = this.suggest  &&  this.suggest.down  &&  this.suggest.down.lastSubkey;
        if (  hasSuggestDown  &&  ( parseInt(this.suggest.down.parentSubkey) < this.ratingInput.value )  ){
            let suggestDownText = '&darr; ' + this.suggest.down.lastSubkey;
            displayHighlightedContent( storedTextToHtml(suggestDownText), this.highlightWords, this.getSubElement('RatingDownButton') );
            this.setStyle( 'RatingDownButton', 'display', null );
        }
        else {  this.setStyle( 'RatingDownButton', 'display', 'none' );  }

        this.setProperty( 'RatingInput', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'RatingUpButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'ReasonInput', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'RatingDownButton', 'disabled', ! this.questionDisplay.allowInput() );

        // Ensure rating-number-options exist
        let rangeLength = ( this.questionDisplay.question.ratingMax - this.questionDisplay.question.ratingMin ) + 2;
        if ( this.ratingInput.options.length < rangeLength ){
            // Clear old options
            this.resetRatingRange();
            // Add empty option and all available rating options
            this.ratingInput.add( html('option').property('value','').property('text','').build() );
            for ( let r = this.questionDisplay.question.ratingMin;  r <= this.questionDisplay.question.ratingMax;  ++r ){
                let label = r;
                if ( r == this.questionDisplay.question.ratingMin ){  label += ' ' + (this.questionDisplay.question.ratingMinLabel || '');  }
                if ( r == this.questionDisplay.question.ratingMax ){  label += ' ' + (this.questionDisplay.question.ratingMaxLabel || '');  }
                this.ratingInput.add( html('option').property('value',r).property('text',label).build() );
            }
        }
        let thisCopy = this;
        setTimeout( () => fitTextAreaToText( thisCopy.reasonInput ) , 100 );
        // For select-input, setting value discards unsaved input
        // Setting defaultValue does not initialize
        // So set value, but only when initializing, or when stored answer changes
        if ( this.storedRatingChanged ){
            this.ratingInput.value = ( this.answer )?  this.answer.content  :  '';
        }
        this.reasonInput.defaultValue = ( this.answer )?  this.answer.reason  :  '';

        // Result
        this.setInnerHtml( 'OptionResultContent', this.option.title );
        this.setInnerHtml( 'OptionResultMedian', (this.distribution && this.distribution.median)? this.distribution.median : '' );

        // Subdisplays for results
        let optionVotes = this.totalVotes();
        this.resultDisplays.data = ( this.results )?  this.results.filter( r => r.votes )  :  [];
        this.resultDisplays.data.forEach(  r => { r.key = r.key || String(r.rating) }  );  // Ensure each data has a key string
        this.updateSubdisplays( this.resultDisplays, this.getSubElement('OptionRatingResults') , 
            (optionRatingResult) => {
                return new RatingResultDisplay( thisCopy.surveyDisplay.link.id, thisCopy.questionDisplay.question.id, thisCopy.option.id, optionRatingResult.rating )
                    .setInitialData( thisCopy )
            }
        );
        if ( this.resultDisplays.displays ){   this.resultDisplays.displays.forEach(  (r,i) => { r.setData(thisCopy.results[i], optionVotes); }  );   }
    };

        RatingOptionDisplay.prototype.
    resetRatingRange = function( ){
        // Remove rating drop-down options
        for ( let r = this.ratingInput.options.length - 1;  0 <= r;  --r ){
            this.ratingInput.remove( r );
        }
    };

        RatingOptionDisplay.prototype.
    messagesUpdated = function(){
        this.message = showMessageStruct( this.message, this.getSubElement('optionMessage') );
        this.moreMessage = showMessageStruct( this.moreMessage, this.getSubElement('moreMessage') );
        this.getSubElement('OptionContentInput').setCustomValidity( this.optionValidity || '' );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    };

        RatingOptionDisplay.prototype.
    totalVotes = function(){
        return ( this.results )?  this.results.reduce( (aggregate, value) => aggregate + value.votes , 0 )  :  0;
    };

        RatingOptionDisplay.prototype.
    setMode = function( newMode ){  this.mode = newMode;  this.dataUpdated();  };

        RatingOptionDisplay.prototype.
    setInputFocusAtEnd = function(  ){
        let contentInput = this.getSubElement('OptionContentInput');
        contentInput.focus();
        contentInput.selectionStart = contentInput.value.length;
        contentInput.selectionEnd = contentInput.value.length;
    };

        RatingOptionDisplay.prototype.
    handleEditOptionInput = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let contentInput = this.getSubElement('OptionContentInput');

        // Clear too-short messages
        if ( this.optionTooShort  &&  (MIN_OPTION_LENGTH <= contentInput.value.length) ){
            this.message = { text:'' };
            this.optionValidity = '';
            this.optionTooShort = false;
            this.dataUpdated();
        }
    };

        RatingOptionDisplay.prototype.
    handleEditOptionCancelClick = function( ){
        this.getSubElement('OptionContentInput').value = '';
        this.dataUpdated();
    };

        RatingOptionDisplay.prototype.
    handleEditOptionSave = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Require that option changed
        let contentInput = this.getSubElement('OptionContentInput');
        let inputValue = contentInput.value;
        if ( inputValue == this.option.title ){  return;  }

        // If same option exists elsewhere in the list... still save, because
        // need server-side option standardization, to ensure records did not collide.

        // Require that option is long enough
        if ( inputValue.length < MIN_OPTION_LENGTH ){
            let message = 'Option is too short';
            this.message = { color:RED, text:message };
            this.optionValidity = message;
            this.optionTooShort = true;
            this.dataUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving changes...' };
        this.optionValidity = '';
        this.dataUpdated();

        // Save via ajax
        let url = '/multi/setQuestionOption';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , optionId:this.option.id , content:inputValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                thisCopy.message = { color:GREEN, text:'Saved option', ms:5000 };
                thisCopy.dataUpdated();
                thisCopy.surveyDisplay.setSurveyData( receiveData.survey );
            }
            else {
                let message = 'Failed to save option';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){
                        message = 'Option is too short.';
                        thisCopy.optionTooShort = true;
                    }
                    else if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit option created by someone else.';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit option that already has votes.';  }
                    else if ( receiveData.message == ERROR_DUPLICATE ){  message = 'Duplicate option.';  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };


        RatingOptionDisplay.prototype.
    onPositionInput = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Delay changes to display, to avoid up/down button jumping 
        if ( this.positionInputChangeTimer ){
            clearTimeout( this.positionInputChangeTimer );
            this.positionInputChangeTimer = null;
        }
        let thisCopy = this;
        this.positionInputChangeTimer = setTimeout( function(){
            // Check that input value is an integer, and changed 
            let input = thisCopy.getSubElement('OptionPositionInput');
            let inputChanged = ( input.getAttribute('defaultValue') != input.value );
            let newValue = parseInt( input.value );
            if ( newValue < input.min  ||  input.max < newValue  ||  newValue.toString() != input.value.trim() ){  newValue = null;  }
            if ( newValue ){  input.classList.remove('invalid');  } else {  input.classList.add('invalid');  }
            if ( ! newValue  ||  newValue < 1  ||  ! inputChanged ){  return;  }

            thisCopy.moveOption( newValue - 1);

        } , 1000 );
    };



        RatingOptionDisplay.prototype.
    moveOption = function( newIndex ){
        this.message = { color:GREY, text:'Moving...' };
        this.dataUpdated();

        // Save via ajax
        let url = '/multi/reorderQuestionOptions';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , optionId:this.option.id , newIndex:newIndex
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                let message = 'Moved option';
                thisCopy.message = { color:GREEN, text:message, ms:3000 };
                thisCopy.dataUpdated();
                thisCopy.surveyDisplay.setSurveyData( receiveData.survey );
                thisCopy.getSubElement('OptionPositionInput').focus();
            }
            else {
                let message = 'Failed to move option';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit option created by someone else.';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit option that already has votes.';  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };


        RatingOptionDisplay.prototype.
    handleDeleteClick = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }
    
        this.message = { color:GREY, text:'Deleting...' };
        this.dataUpdated();

        // Save via ajax
        let url = '/multi/deleteQuestionOption';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , optionId:this.option.id
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                let message = 'Deleted option';
                thisCopy.questionDisplay.message = { color:GREEN, text:message, ms:3000 };
                thisCopy.questionDisplay.dataUpdated();
                thisCopy.surveyDisplay.setSurveyData( receiveData.survey );
            }
            else {
                let message = 'Failed to delete option';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit option created by someone else.';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit option that already has votes.';  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };


        RatingOptionDisplay.prototype.
    onReasonInputFocus = function( event ){
        clearTimeout( this.timerBlurRatingInput );
        let wasFocused = Boolean( this.ratingInputFocused );
        this.ratingInputFocused = true;
        if ( ! wasFocused ){  this.dataUpdated();  }  // dataUpdated() can interfere with button click events, so only update on first focus
        return true;
    };

        RatingOptionDisplay.prototype.
    onReasonInputBlur = function( event ){
        // Delay updating display for blur, since another input control may be focused after blur
        clearTimeout( this.timerBlurRatingInput );
        this.timerBlurRatingInput = setTimeout(  () => { this.ratingInputFocused = false; this.dataUpdated(); this.handleRatingInput(); } , 1000  );
        return true;
    };

        RatingOptionDisplay.prototype.
    ratingUpClick = function( event ){
        // Enforce rating range
        let ratingValue = this.ratingInput.value;
        if ( (ratingValue === null)  ||  (ratingValue === '')  ||  (this.questionDisplay.question.ratingMax <= ratingValue) ){  return;  }

        // Apply suggested reason
        if ( this.suggest && this.suggest.up ){  this.reasonInput.value = this.suggest.up.lastSubkey;  }

        // Modify rating
        this.ratingInput.value = parseInt( ratingValue ) + 1;
        this.dataUpdated();
        return true;
    };

        RatingOptionDisplay.prototype.
    ratingDownClick = function( event ){
        // Enforce rating range
        let ratingValue = this.ratingInput.value;
        if ( (ratingValue === null)  ||  (ratingValue === '')  ||  (ratingValue <= this.questionDisplay.question.ratingMin) ){  return;  }

        // Apply suggested reason
        if ( this.suggest && this.suggest.down ){  this.reasonInput.value = this.suggest.down.lastSubkey;  }

        // Modify rating
        this.ratingInput.value = parseInt( ratingValue ) - 1;
        this.dataUpdated();
        return true;
    };

        RatingOptionDisplay.prototype.
    handleRatingInput = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Require that rating or reason changed
        let ratingValue = this.ratingInput.value;
        let reasonValue = this.reasonInput.value;
        if ( this.answer  &&  (ratingValue == this.answer.content)  &&  (reasonValue == this.answer.reason) ){  return;  }

        // Require that reason is valid
        this.checkReasonInput();
        if ( this.reasonTooShort  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.dataUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving rating...' };
        this.dataUpdated();

        // Save to server
        let url = '/multi/rateQuestionOption';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , optionId:this.option.id ,
            rating:ratingValue , reason:reasonValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                thisCopy.message = { color:GREEN, text:'Saved rating', ms:3000 };
                thisCopy.dataUpdated();
                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );
            }
            else {
                let message = 'Failed to save rating';
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

        RatingOptionDisplay.prototype.
    handleReasonInput = function( event ){
        fitTextAreaToText( this.reasonInput );
        this.checkReasonInput();

        // If user typed SPACE... retrieve suggestions
        if ( event.data == ' ' ){  this.retrieveSuggestions();  }
    };

        RatingOptionDisplay.prototype.
    checkReasonInput = function( event ){
        let reasonValue = this.reasonInput.value;

        let reasonTooShortPrev = this.reasonTooShort;
        let reasonTooLongPrev = this.reasonTooLong;
        this.reasonTooShort =  this.questionDisplay.question.requireReason  &&  ( (! reasonValue) || (reasonValue.length < minLengthReason) );
        this.reasonTooLong =  reasonValue  &&  ( maxLengthReason < reasonValue.length );

        if ( (reasonTooShortPrev || reasonTooLongPrev)  &&  ! (this.reasonTooShort || this.reasonTooLong) ){
            this.message = { text:'' };
            this.reasonValidity = '';
            this.messagesUpdated();
        }
    };

        RatingOptionDisplay.prototype.
    retrieveSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }
        this.retrieveSuggestionsImp( this.option.id, this.ratingInput.value, this.reasonInput.value );
    };

        RatingOptionDisplay.prototype.
    retrieveSuggestionsImp = function( optionId, numericAnswer, reasonValue, isBudget=false ){
        // If no user-input... hide matching-reasons, show top-reasons
        if ( ! reasonValue ){  this.suggest = {};  this.dataUpdated();  }

        // Retrieve suggestions only for first N words
        let words = removeStopWords( tokenize(reasonValue) ).slice( 0, MAX_WORDS_INDEXED )  ||  [];

        // Retrieve only if input is changed since last suggestion
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;  }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve reasons to rate higher / lower, via ajax
        let url = '/multi/getRatingReasonsForPrefix';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , optionId:optionId ,
            rating:numericAnswer , reasonStart:contentStart
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.suggestions ){
                // Collect suggestions and calculate IDF weights across reason words
                if ( ! thisCopy.suggestionTextToData ){  thisCopy.suggestionTextToData = {};  }  // map{ suggestionText -> {scoreMatch, scoreTotal...} }
                for ( let s = 0;  s < receiveData.suggestions.length;  ++s ){
                    let suggestionNew = receiveData.suggestions[ s ];
                    let suggestionText = ( isBudget ? suggestionNew.grandparentSubkey : '' ) + ' ' + suggestionNew.lastSubkey;
                    suggestionText = suggestionText.trim();
                    if ( suggestionText  &&  ! (suggestionText in thisCopy.suggestionTextToData) ){
                        thisCopy.surveyDisplay.incrementWordCounts( suggestionText );
                    }
                    thisCopy.suggestionTextToData[ suggestionText ] = suggestionNew;
                }

                // Find top-scored suggestions
                thisCopy.scoreMatches( contentStart );
                if ( thisCopy.suggest == null ){  thisCopy.suggest = {};  }
                thisCopy.suggest.up = Object.values( thisCopy.suggestionTextToData )
                    .filter( s => (numericAnswer < parseInt(s.parentSubkey)) )
                    .sort( (a,b) => (b.scoreTotal - a.scoreTotal) )[ 0 ];
                thisCopy.suggest.down = Object.values( thisCopy.suggestionTextToData )
                    .filter( s => (parseInt(s.parentSubkey) < numericAnswer) )
                    .sort( (a,b) => (b.scoreTotal - a.scoreTotal) )[ 0 ];

                let hasMatches =  thisCopy.suggest.up  ||  thisCopy.suggest.down;
                thisCopy.highlightWords = ( hasMatches )?  contentStart  :  null;

                thisCopy.dataUpdated();
            }
        } );
    };


        RatingOptionDisplay.prototype.
    scoreMatches = function( contentStart ){
        // Update suggestion-scores, with new IDF-weights and new user-input
        for ( const suggestion in this.suggestionTextToData ){
            let suggestionData = this.suggestionTextToData[ suggestion ];
            suggestionData.scoreMatch = this.surveyDisplay.wordMatchScore( contentStart, suggestion );
            suggestionData.scoreTotal =  suggestionData.score * suggestionData.scoreMatch;  // Vote-score * match-score
        }
    };


        RatingOptionDisplay.prototype.
    onMoreReasonsClick = function( ){
        if ( (! this.resultDisplays)  ||  isEmpty(this.resultDisplays.displays) ){
            this.moreMessage = { color:GREY, text:'No more reasons yet', ms:5000 };
            this.messagesUpdated();
            return;
        }
    
        // For each result-display... retrieve more reasons 
        if ( this.resultDisplays && this.resultDisplays.displays ){  this.resultDisplays.displays.forEach( r => {
            r.retrieveResults( false );
        } );  }
    };




/////////////////////////////////////////////////////////////////////////////////
// Display for rating-question

        function
    RatingQuestionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        let thisCopy = this;
        this.options = { data:[] , displays:[] , creator:(optionData)=>thisCopy.createOptionDisplay(optionData) };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=RatingQuestionDisplay id=RatingQuestionDisplay> ',
            //  Edit
            '   <div class=Edit> ',
            '       <div class=RatingLimitsWrap> ',
            '           <div class=RatingLimitWrap> ',
            '               <div class=RatingLimitWrap> ',
            '                   <label for=RatingMinInput><span translate=yes> Minimum rating </span>: </label> ',
            '                   <input id=RatingMinInput class=RatingLimitInput type=number min=-10 max=9 oninput=handleRatingLimitInput value=1 /> ',
            '               </div> ',
            '               <div class=RatingLimitWrap> ',
            '                   <label class=RatingLabelLabel for=RatingMinLabelInput><span translate=yes> Label </span>: </label> ',
            '                   <input id=RatingMinLabelInput class=RatingLabelInput type=text onblur=handleRatingLimitInput placeholder="Worst..." /> ',
            '               </div> ',
            '           </div> ',
            '           <div class=RatingLimitWrap> ',
            '               <div class=RatingLimitWrap> ',
            '                   <label for=RatingMaxInput><span translate=yes> Maximum rating </span>: </label> ',
            '                   <input id=RatingMaxInput class=RatingLimitInput type=number min=-9 max=10 oninput=handleRatingLimitInput value=5 /> ',
            '               </div> ',
            '               <div class=RatingLimitWrap> ',
            '                   <label class=RatingLabelLabel for=RatingMaxLabelInput><span translate=yes> Label </span>: </label> ',
            '                   <input id=RatingMaxLabelInput class=RatingLabelInput type=text onblur=handleRatingLimitInput placeholder="Best..." /> ',
            '               </div> ',
            '           </div> ',
            '       </div> ',
            '       <div class=RatingLimitsWrap> ',
            '           <div class=RatingLimitWrap> ',
            '               <label for=RequireReasonInput translate=yes> Require reasons </label> ',
            '               <input id=RequireReasonInput class=RequireReasonInput type=checkbox checked oninput=onRequireReasonInput /> ',
            '           </div> ',
            '       </div> ',
            '       <div class=EditHeaders id=EditHeaders><div translate=yes> Option </div><div translate=yes> Position </div><div translate=yes> Delete </div></div> ',
            '   </div> ',
            //  View
            '   <div class=View> ',
            '       <div class=OptionColumnHeadings> ',
            '           <div translate=yes> Option </div><div translate=yes> Rating </div><div translate=yes> Reason </div> ',
            '       </div> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '       <div class=OptionResultColumnHeadings> ',
            '           <div translate=yes> Option </div><div translate=yes> Rating </div><div translate=yes> Reason </div><div class=Votes translate=yes> Votes </div> ',
            '       </div> ',
            '   </div> ',
            //  Options
            '   <div class=Options id=Options subdisplays=options ></div> ',
            '   <div class="Edit NewOptionWrap"> ',
            '       <label for=NewOptionInput translate=yes> Add option </label> ',
            '       <input class=NewOptionInput id=NewOptionInput placeholder="..." oninput=handleNewOptionInput /> ',
            '       <div class=SaveOrCancelButtons> ',
            '           <button class=SaveButton id=SaveButton translate=yes onclick=handleNewOptionSaveClick> Save </button> ',
            '           <button class=CancelButton id=CancelButton translate=yes onclick=handleNewOptionCancelClick> Cancel </button> ',
            '       </div> ',
            '       <div class=Message id=Message aria-live=polite></div> ',
            '   </div> ',
            ' </div>'
        ].join('\n') );
    }
    RatingQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        RatingQuestionDisplay.prototype.
    createOptionDisplay = function( optionData ){
        let thisCopy = this;
        return new RatingOptionDisplay( optionData.id ).setInitialData( optionData, thisCopy, thisCopy.surveyDisplay ); 
    };

        RatingQuestionDisplay.prototype.
    setInitialData = function( questionData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( questionData, null );
        return this;
    };

        RatingQuestionDisplay.prototype.
    setData = function( questionData, questionAnswers ){
        this.question = questionData;
        this.answers = questionAnswers;
        this.dataUpdated();
    };

    // Update from data to html
        RatingQuestionDisplay.prototype.
    dataUpdated = function( ){
        this.ratingMinLabelInput = this.getSubElement('RatingMinLabelInput');
        this.ratingMaxLabelInput = this.getSubElement('RatingMaxLabelInput');

        this.messagesUpdated();
        this.attributesUpdated();

        // Content
        this.setProperty( 'RatingMinInput', 'value', this.question.ratingMin );
        this.setProperty( 'RatingMaxInput', 'value', this.question.ratingMax );
        this.ratingMinLabelInput.value = this.question.ratingMinLabel || '';
        this.ratingMaxLabelInput.value = this.question.ratingMaxLabel || '';
        this.getSubElement('RequireReasonInput').checked = this.question.requireReason;

        this.setStyle( 'EditHeaders', 'display', (0 < this.question.options.length ? 'grid' : 'none') );

        // Update collection of subdisplays: set data & keys, create/reorder displays, update displays
        this.options.data = this.question.options || [];
        this.options.data.forEach( q => q.key = q.key || String(q.id) );  // Ensure each data has a key string, derived from id
        this.updateSubdisplays( this.options, this.getSubElement('Options') );
        let thisCopy = this;
        let numOptions = ( this.question && this.question.options )?  this.question.options.length  :  0;
        this.options.displays.forEach(  (d, i) => {
            d.positionInQuestion = i;
            d.numOptions = numOptions;
            let optionAnswer = ( thisCopy.answers )?  thisCopy.answers[ d.key ]  :  null;
            d.setData( thisCopy.options.data[i] , optionAnswer , (thisCopy.results? thisCopy.results[d.key] : null) , i , (thisCopy.optionToRatingDistribution ? thisCopy.optionToRatingDistribution[d.key] : null) );
        }  );
    };

        RatingQuestionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
    };

        RatingQuestionDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'RatingQuestionDisplay', 'mode', this.mode );
        this.setAttribute( 'RatingQuestionDisplay', 'hasnewoptioninput', (this.getSubElement('NewOptionInput').value ? TRUE : FALSE) );
        this.setProperty( 'NewOptionInput', 'disabled', ! this.isQuestionValid() );
    };

        RatingQuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.surveyDisplay.isFrozen() );  };

        RatingQuestionDisplay.prototype.
    isQuestionValid = function( ){  return this.questionDisplay.isQuestionValid();  };

        RatingQuestionDisplay.prototype.
    setMode = function( newMode ){
        if ( (newMode == RESULT) && (this.mode != newMode) && (this.results == null) ){  this.retrieveResults();  }
        this.mode = newMode;
        this.dataUpdated();
        if ( this.options  &&  this.options.displays ){  this.options.displays.forEach( o => o.setMode(newMode) );  }
    };

        RatingQuestionDisplay.prototype.
    retrieveData = function( ){  };


        RatingQuestionDisplay.prototype.
    handleRatingLimitInput = function( ){

        let ratingMinInput = this.getSubElement('RatingMinInput');
        let ratingMaxInput = this.getSubElement('RatingMaxInput');

        // Save via ajax
        let url = '/multi/setRatingQuestionLimits';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id ,
            min:ratingMinInput.value , max:ratingMaxInput.value ,
            minLabel:this.ratingMinLabelInput.value , maxLabel:this.ratingMaxLabelInput.value
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                thisCopy.questionDisplay.message = { color:GREEN, text:'Saved rating limit', ms:5000 };
                thisCopy.questionDisplay.dataUpdated();
                thisCopy.surveyDisplay.setSurveyData( receiveData.survey );
                thisCopy.options.displays.forEach( d => d.resetRatingRange() );
                thisCopy.surveyDisplay.dataUpdated();
            }
            else {
                let message = 'Failed to save rating limit';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit question created by someone else.';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has responses.';  }
                }
                thisCopy.questionDisplay.message = { color:RED, text:message };
                thisCopy.questionDisplay.dataUpdated();
            }
        } );
    };

        RatingQuestionDisplay.prototype.
    onRequireReasonInput = function( ){
        let requireReasonInput = this.getSubElement('RequireReasonInput');
        // Store to server
        let url = '/multi/setQuestionRequireReason';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , require:requireReasonInput.checked
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                thisCopy.questionDisplay.message = { color:GREEN, text:'Saved reason requirement', ms:5000 };
                thisCopy.questionDisplay.messagesUpdated();

                thisCopy.surveyDisplay.setSurveyData( receiveData.survey );
                thisCopy.surveyDisplay.dataUpdated();
            }
            else {
                let message = 'Failed to save reason requirement';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit question created by someone else.';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has responses.';  }
                }
                thisCopy.questionDisplay.message = { color:RED, text:message };
                thisCopy.questionDisplay.messagesUpdated();
            }
        } );
    };

        RatingQuestionDisplay.prototype.
    handleNewOptionInput = function( ){
        this.setAttribute( 'RatingQuestionDisplay', 'hasnewoptioninput', (this.getSubElement('NewOptionInput').value ? TRUE : FALSE) );
    };

        RatingQuestionDisplay.prototype.
    handleNewOptionCancelClick = function( ){
        this.getSubElement('NewOptionInput').value = '';
        this.dataUpdated();
    };

        RatingQuestionDisplay.prototype.
    handleNewOptionSaveClick = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let newOptionInput = this.getSubElement('NewOptionInput');
        let optionValue = newOptionInput.value;
        if ( ! optionValue ){  return;  }

        // Save via ajax 
        let url = '/multi/addQuestionOption';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.question.id , option:optionValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                newOptionInput.value = '';
                thisCopy.message = { color:GREEN, text:'Option created', ms:7000 };
                thisCopy.surveyDisplay.setSurveyData( receiveData.survey );
                thisCopy.getSubElement('NewOptionInput').focus();
            }
            else {
                let message = 'Failed to add option';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit survey created by someone else';  }
                    if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has answers';  }
                    if ( receiveData.message == TOO_MANY_OPTIONS ){  message = 'Question has too many options';  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };

        RatingQuestionDisplay.prototype.
    focusInitialInput = function( event ){
        focusAtEnd( this.getSubElement('NewOptionInput') );
    };


        RatingQuestionDisplay.prototype.
    retrieveResults = function( ){
        // Retrieve results from server
        let url = '/multi/questionOptionRatings/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                // Sort each option's results by rating
                let optionToOrderedResults = { };
                if ( receiveData.options ){
                    for ( optionId in receiveData.options ){
                        optionToOrderedResults[ optionId ] = receiveData.options[ optionId ].filter( o => o.votes )
                                                                .sort( (a,b) => parseInt(a.rating) - parseInt(b.rating) );
                    }
                }
                thisCopy.results = optionToOrderedResults;
                thisCopy.optionToRatingDistribution = receiveData.optionToRatingDistribution;
                thisCopy.dataUpdated();
            }
        } );
    };


