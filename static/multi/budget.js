// Displays based on ElementWrap

// Budget question with edit/view/result-states

// Separate option-displays for editing suggestions, editing budget-items, and viewing results,
// because there are very different sets of options for edit/view/result, not a consistent set that change appearance


const ALLOCATION_INCREMENT = 5;

/////////////////////////////////////////////////////////////////////////////////
// Display for option editing

        function
    BudgetOptionEditDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=BudgetOptionEditDisplay id=Option>',
            '   <div class=EditRow> ',
            '       <div> ',
            '           <input class=OptionContentInput id=OptionContentInput placeholder="" ',
            '               onblur=handleEditOptionSave oninput=handleEditOptionInput /> ',
            '       </div><div class=OptionDeleteCell> ',
            '           <button class=OptionDeleteButton id=OptionDeleteButton title="Delete" onclick=handleDeleteClick> X </button> ',
            '       </div> ',
            '   </div> ',
            '   <div class=MessageWrap> ',
            '       <div class="Message" id=message aria-live=polite></div> ',
            '   </div> ',
            ' </div> '
        ].join('\n') );
    }
    BudgetOptionEditDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        BudgetOptionEditDisplay.prototype.
    setInitialData = function( optionData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( optionData );
        return this;
    };

        BudgetOptionEditDisplay.prototype.
    setData = function( optionData ){
        this.option = optionData; 
        this.dataUpdated();
    };

    // Update this.element
        BudgetOptionEditDisplay.prototype.
    dataUpdated = function( ){
        this.contentInput = this.getSubElement('OptionContentInput');
        this.deleteButton = this.getSubElement('OptionDeleteButton');

        this.messagesUpdated();

        // Edit
        this.contentInput.defaultValue = this.option.title;
        this.contentInput.disabled = this.questionDisplay.allowInput() ?  null  :  true;
        this.deleteButton.disabled = this.questionDisplay.allowInput() ?  null  :  true;

        translateScreen( this.getSubElement('Option') );  // Options seem to be re-updated after top-level translation, so need re-translation
    };

        BudgetOptionEditDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('message') );
        this.contentInput.setCustomValidity( this.optionValidity || '' );
    };

        BudgetOptionEditDisplay.prototype.
    handleEditOptionInput = RatingOptionDisplay.prototype.handleEditOptionInput;

        BudgetOptionEditDisplay.prototype.
    handleEditOptionCancelClick = RatingOptionDisplay.prototype.handleEditOptionCancelClick;

        BudgetOptionEditDisplay.prototype.
    handleEditOptionSave = RatingOptionDisplay.prototype.handleEditOptionSave;

        BudgetOptionEditDisplay.prototype.
    handleDeleteClick = RatingOptionDisplay.prototype.handleDeleteClick;



/////////////////////////////////////////////////////////////////////////////////
// Display for answering budget-item
// Dont allow changing budget-item content, for simpler, less redundant, user-interface

        function
    BudgetAllocationViewDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=BudgetAllocationViewDisplay id=Option>',
            '   <div class=ViewRow> ',
            '       <div class=Content id=Content></div> ',
            '       <div class=AmountCell> ',
            '           <input type=number class=AmountInput id=AmountInput title="Amount" min=5 max=5 step=5 placeholder="5%" oninput=onAmountInput /> ',
            '       </div> ',
            '       <div class=AmountAbsolute id=AmountAbsolute></div> ',
            '       <div class=ReasonCell> ',
            '           <button class=AmountIncrementButton id=AmountUpButton ',
            '               onclick=onAmountUpClick onfocus=onReasonInputFocus onblur=onReasonInputBlur > ',
            '               &uarr; <span class=ReasonSpan id=ReasonUpSpan translate=yes></span> ',
            '           </button> ',
            '           <textarea class=ReasonInput id=ReasonInput title="Reason" placeholder="Because..." ',
            '               oninput=onReasonInput onfocus=onReasonInputFocus onblur=onReasonInputBlur ></textarea/> ',
            '           <button class=AmountIncrementButton id=AmountDownButton ',
            '               onclick=onAmountDownClick onfocus=onReasonInputFocus onblur=onReasonInputBlur> ',
            '               &darr; <span class=ReasonSpan id=ReasonDownSpan translate=yes></span> ',
            '           </button> ',
            '       </div> ',
            '       <div class=DeleteCell> ',
            '           <button class=DeleteButton id=DeleteButton title="Delete" onclick=handleDeleteClick> X </button> ',
            '       </div> ',
            '   </div> ',
            '   <div class="Message" id=message aria-live=polite></div> ',
            ' </div> '
        ].join('\n') );
    }
    BudgetAllocationViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        BudgetAllocationViewDisplay.prototype.
    setInitialData = function( optionAnswer, questionDisplay, surveyDisplay ){
        this.questionDisplay = questionDisplay;
        this.surveyDisplay = surveyDisplay;
        this.setData( optionAnswer, null );
        return this;
    };

        BudgetAllocationViewDisplay.prototype.
    setData = function( optionAnswer, wordsToHighlight ){
        this.storedRatingChanged =  Boolean(  optionAnswer  &&  ! ( this.answer && (this.answer.content == optionAnswer.content) )  );
        this.answer = optionAnswer;
        this.highlightWords = wordsToHighlight;
        this.dataUpdated();
    };

    // Update this.element
        BudgetAllocationViewDisplay.prototype.
    dataUpdated = function( ){
        this.amountInput = this.getSubElement('AmountInput');
        this.reasonInput = this.getSubElement('ReasonInput');

        this.messagesUpdated();
        this.attributesUpdated();

        // Set content
        this.setInnerHtml( 'Content', (this.answer ? this.answer.content : '') );
        if ( this.storedRatingChanged ){
            this.amountInput.value = this.answer.amount;
        }
        this.amountUpdated();
        this.reasonInput.defaultValue = this.answer.reason;
        let thisCopy = this;
        setTimeout( () => fitTextAreaToText(thisCopy.reasonInput) );
        
        // Set suggestion buttons
        let hasSuggestUp = this.suggest  &&  this.suggest.up  &&  this.suggest.up.lastSubkey;
        if (  hasSuggestUp  &&  ( this.amountInput.value < parseInt(this.suggest.up.parentSubkey) )  ){
            displayHighlightedContent( storedTextToHtml(this.suggest.up.lastSubkey) , this.highlightWords, this.getSubElement('ReasonUpSpan') );
            this.setStyle( 'AmountUpButton', 'display', null );
        }
        else {
            this.setStyle( 'AmountUpButton', 'display', 'none' );
        }

        let hasSuggestDown = this.suggest  &&  this.suggest.down  &&  this.suggest.down.lastSubkey;
        if (  hasSuggestDown  &&  ( parseInt(this.suggest.down.parentSubkey) < this.amountInput.value )  ){
            displayHighlightedContent( storedTextToHtml(this.suggest.down.lastSubkey) , this.highlightWords, this.getSubElement('ReasonDownSpan') );
            this.setStyle( 'AmountDownButton', 'display', null );
        }
        else {
            this.setStyle( 'AmountDownButton', 'display', 'none' );
        }
    };


        BudgetAllocationViewDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('message') );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    };

        BudgetAllocationViewDisplay.prototype.
    attributesUpdated = function( ){
        this.amountInput.max = this.questionDisplay.amountRemaining() + this.answer.amount;
        this.setAttribute( 'Option', 'data-reasonInputFocused', this.reasonInputFocused ? TRUE : FALSE );

        let disabled = ! this.questionDisplay.allowInput();
        this.setProperty( 'AmountUpButton', 'disabled', disabled );
        this.setProperty( 'AmountDownButton', 'disabled', disabled );
        this.setProperty( 'AmountInput', 'disabled', disabled );
        this.setProperty( 'ReasonInput', 'disabled', disabled );
        this.setProperty( 'DeleteButton', 'disabled', disabled );
    };

        BudgetAllocationViewDisplay.prototype.
    amountUpdated = function( ){
        this.setInnerHtml( 'AmountAbsolute', '% = ' + Math.floor(this.amountInput.value * this.questionDisplay.question.maxTotal) / 100 );
    };

        BudgetAllocationViewDisplay.prototype.
    focusAmountInput = function( event ){  this.amountInput.focus();  };


        BudgetAllocationViewDisplay.prototype.
    onAmountInput = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        this.amountUpdated();

        // Delay after typing, to allow typing a 2-digit number without being corrected prematurely
        let thisCopy = this;
        clearTimeout( this.timerAmountInput );
        this.timerAmountInput = setTimeout( () => thisCopy.onAmountInputDelayed() , 1000 );
    };

        BudgetAllocationViewDisplay.prototype.
    onAmountInputDelayed = function( event ){
        // Force amount to a valid size
        let amountValue = this.amountInput.value;
        amountValue = Math.floor( amountValue / 5 ) * 5;
        amountValue = Math.max( 5, amountValue );
        let maxAmount = this.questionDisplay.amountRemaining() + this.answer.amount;
        amountValue = Math.min( amountValue , maxAmount );
        this.amountInput.value = amountValue;

        // Require that content or amount or reason changed
        let reasonValue = this.reasonInput.value;
        if ( this.answer  &&  (amountValue == this.answer.amount)  &&  (reasonValue == this.answer.reason) ){  return;  }

        // Require that reason is valid
        this.checkReasonInput();
        if ( this.reasonTooShort  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.messagesUpdated();
            return;
        }

        this.storeAllocation( amountValue, reasonValue );
    };

        BudgetAllocationViewDisplay.prototype.
    handleDeleteClick = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }
        this.storeAllocation( 0, null );
    };

        BudgetAllocationViewDisplay.prototype.
    storeAllocation = function( amountValue, reasonValue ){
        // Display with showMessageStruct(), because calling dataUpdated() here causes a flash of the old amount-value
        let messageText = (amountValue <= 0) ? 'Deleting budget item...' : 'Saving budget item...';
        this.message = showMessageStruct( {color:GREY, text:messageText} , this.getSubElement('message') );

        // Save to server
        let url = '/multi/voteBudgetAllocation';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id ,
            contentOld:this.answer.content , 
            contentNew:this.answer.content , amountNew:amountValue , reasonNew:reasonValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'BudgetAllocationViewDisplay.storeAllocation()', 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );
                if ( amountValue <= 0 ){
                    thisCopy.questionDisplay.message = {  color:GREEN , text:'Deleted budget item' , ms:5000  };
                    thisCopy.questionDisplay.dataUpdated();
                }
                else {
                    thisCopy.message = {  color:GREEN , text:translate('Saved budget item. Budget remaining:') + ' ' + thisCopy.questionDisplay.amountRemaining() + '%' , ms:5000  };
                    thisCopy.dataUpdated();
                    thisCopy.focusAmountInput();
                }
            }
            else {
                let message = ( amountValue <= 0 )?  'Failed to delete budget item'  :  'Failed to save budget item';
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

        BudgetAllocationViewDisplay.prototype.
    onAmountUpClick = function( event ){
        // Enforce amount range
        let amountValue = ( this.amountInput.value )?  parseInt( this.amountInput.value )  :  0;
        if ( (amountValue === null)  ||  (amountValue === '')  ||  (100 < amountValue + ALLOCATION_INCREMENT)  ||
                (this.questionDisplay.amountRemaining() < ALLOCATION_INCREMENT) ){
            return;
        }

        // Apply suggested reason
        if ( this.suggest && this.suggest.up ){  this.reasonInput.value = this.suggest.up.lastSubkey;  }

        // Modify amount
        this.amountInput.value = parseInt( amountValue ) + ALLOCATION_INCREMENT;
        this.dataUpdated();
        return true;
    };

        BudgetAllocationViewDisplay.prototype.
    onAmountDownClick = function( event ){
        // Enforce amount range
        let amountValue = ( this.amountInput.value )?  parseInt( this.amountInput.value )  :  0;
        if ( (amountValue === null)  ||  (amountValue === '')  ||  (amountValue < ALLOCATION_INCREMENT) ){  return;  }

        // Apply suggested reason
        if ( this.suggest && this.suggest.down ){  this.reasonInput.value = this.suggest.down.lastSubkey;  }

        // Modify amount
        this.amountInput.value = parseInt( amountValue ) - ALLOCATION_INCREMENT;
        this.dataUpdated();
        return true;
    };

        BudgetAllocationViewDisplay.prototype.
    onReasonInputFocus = function( event ){
        clearTimeout( this.timerBlurReasonInput );
        // dataUpdated() can interfere with button click events, so only update on first focus
        let wasFocused = Boolean( this.reasonInputFocused );
        this.reasonInputFocused = true;
        if ( ! wasFocused ){  this.dataUpdated();  }
        return true;
    };

        BudgetAllocationViewDisplay.prototype.
    onReasonInputBlur = function( event ){
        // Delay updating display for blur, since another input control may be focused after blur
        clearTimeout( this.timerBlurReasonInput );
        this.timerBlurReasonInput = setTimeout(  () => { this.reasonInputFocused = false;  this.attributesUpdated();  this.onAmountInputDelayed(); } , 1000  );
        return true;
    };

        BudgetAllocationViewDisplay.prototype.
    checkReasonInput = RatingOptionDisplay.prototype.checkReasonInput;

        BudgetAllocationViewDisplay.prototype.
    onReasonInput = function( event ){
        fitTextAreaToText( this.reasonInput );
        this.checkReasonInput();
        // If user typed SPACE... retrieve suggestions
        if ( event && (event.data == ' ') ){  this.retrieveSuggestions();  }
    };

       BudgetAllocationViewDisplay.prototype.
    retrieveSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }
        let isBudget = true;
        this.retrieveSuggestionsImp( this.answer.content, this.amountInput.value, this.reasonInput.value, isBudget );
    };

        BudgetAllocationViewDisplay.prototype.
    retrieveSuggestionsImp = RatingOptionDisplay.prototype.retrieveSuggestionsImp;

        BudgetAllocationViewDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;



/////////////////////////////////////////////////////////////////////////////////
// Display for option result

        function
    BudgetReasonResultDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data 

        // User-interface state variables (not persistent) 

        // Create html element, store it in this.element 
        this.createFromHtml( displayId, '\n\n' + [
            ' <div id=BudgetReasonResult class=BudgetReasonResult>',
            '   <div></div> ',
            '   <li id=ReasonAmount class=ReasonAmount></li> ',
            '   <div id=Reason class=BudgetReason></div> ',
            '   <div id=VoteCount class=VoteCount></div> ',
            ' </div> '
        ].join('\n') );
    }
    BudgetReasonResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods 

        BudgetReasonResultDisplay.prototype.
    setData = function( reasonResultData ){
        this.reason = reasonResultData;
        this.dataUpdated();
        return this;
    };

    // Update this.element 
        BudgetReasonResultDisplay.prototype.
    dataUpdated = function( ){
        this.setInnerHtml( 'ReasonAmount', (this.reason ? this.reason.amount + '%' : '') );
        this.setInnerHtml( 'Reason', (this.reason ? this.reason.reason : '') );
        this.setInnerHtml( 'VoteCount', (this.reason ? this.reason.votes : '') );
    };



        function
    BudgetOptionResultDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.reasonResultDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=BudgetOptionResultDisplay id=Option> ',
            '   <details id=ReasonsExpander ontoggle=onReasonsToggle> ',
            '       <summary> ',
            '           <div id=Amount class=Amount></div> ',
            '           <div id=OptionResultContent class=OptionResultContent></div> ',
            '           <div id=VoteCount class=VoteCount></div> ',
            '       </summary> ',
            '       <div id=OptionReasonResults class=OptionReasonResults></div> ',
            '   </details> ',
            '   <div class="Message" id=message aria-live=polite></div> ',
            ' </div> '
        ].join('\n') );
    }
    BudgetOptionResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        BudgetOptionResultDisplay.prototype.
    setInitialData = function( optionResult, questionDisplay, surveyDisplay ){
        this.option = optionResult;
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( optionResult, null );
        return this;
    };

        BudgetOptionResultDisplay.prototype.
    setData = function( optionResult, voteCountForAllOptions ){
        this.option = optionResult;
        this.voteCountForAllOptions = voteCountForAllOptions;
        this.dataUpdated();
    };

        BudgetOptionResultDisplay.prototype.
    dataUpdated = function( ){  // Update data to html
        // Show messages
        this.message = showMessageStruct( this.message, this.getSubElement('message') );

        // Set content
        this.setInnerHtml( 'OptionResultContent', this.option.answer );
        // Not actually a vote-count, but rather the median allocation size for this budget-item
        this.setInnerHtml(  'Amount', '' + this.option.medianSize + '% = ' + 
            ( Math.floor(this.option.medianSize * this.questionDisplay.question.maxTotal) / 100 )  );
        this.getSubElement('Amount').style.width = this.option.medianSize + 'px';
        this.setInnerHtml( 'VoteCount', this.option.votes );

        // Subdisplays for reason results
        let thisCopy = this;
        this.reasonResultDisplays.data = this.reasons || [];
        this.reasonResultDisplays.data.forEach(  r => { r.key = r.reasonId + '-' + r.amount }  );  // Ensure each data has a key string
        this.updateSubdisplays( this.reasonResultDisplays, this.getSubElement('OptionReasonResults') ,
            ( optionReasonResult ) => new BudgetReasonResultDisplay( 
                [thisCopy.questionDisplay.question.id, thisCopy.option.id, optionReasonResult.reasonId].join('-') )
                .setData( optionReasonResult )
         );
        if ( this.reasonResultDisplays.displays ){   this.reasonResultDisplays.displays.forEach(  (r,i) => r.setData( thisCopy.reasonResultDisplays.data[i] )  );   }
    };

        BudgetOptionResultDisplay.prototype.
    onReasonsToggle = function( event ){
        let reasonsExpander = this.getSubElement('ReasonsExpander');
        if ( reasonsExpander.open && (this.reasons == null) ){  this.retrieveResults();  }
    };

        BudgetOptionResultDisplay.prototype.
    retrieveResults = function( ){
        // Retrieve results from server
        let url = '/multi/budgetItemTopReasons/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id + '/' + this.option.answerId;
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            console.log( 'BudgetOptionResultDisplay.retrieveResults() receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.reasons ){
                // Sort by votes
                thisCopy.reasons = receiveData.reasons.sort( (a,b) => b.votes - a.votes );
                thisCopy.dataUpdated();
            }
        } );
    };




/////////////////////////////////////////////////////////////////////////////////
// Display for budget-question

        function
    BudgetSuggestionViewDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=BudgetSuggestionViewDisplay id=Suggestion>',
            '   <button class=SuggestionButton id=SuggestionButton onclick=onClickSuggestion> ',
            '       <span class=ContentSpan id=ContentSpan></span> ',
            '       <span class=ReasonDelimiter id=ReasonDelimiter translate=yes> Reason: </span> ',
            '       <span class=ReasonSpan id=ReasonSpan></span> ',
            '   </button> ',
            '   <div class="Message" id=message aria-live=polite></div> ',
            ' </div> '
        ].join('\n') );
    }
    BudgetSuggestionViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        BudgetSuggestionViewDisplay.prototype.
    setInitialData = function( suggestionData, questionDisplay ){
        this.questionDisplay = questionDisplay;
        this.setData( suggestionData, null );
        return this;
    };

        BudgetSuggestionViewDisplay.prototype.
    setData = function( suggestionData, wordsToHighlight ){
        this.suggestion = suggestionData;
        this.highlightWords = wordsToHighlight;
        this.dataUpdated();
    };

    // Update this.element
        BudgetSuggestionViewDisplay.prototype.
    dataUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('message') );

        // Set attributes

        // Set content
        displayHighlightedContent( storedTextToHtml(this.suggestion.content), this.highlightWords, this.getSubElement('ContentSpan') );
        displayHighlightedContent( storedTextToHtml(this.suggestion.reason), this.highlightWords, this.getSubElement('ReasonSpan') );
        this.setStyle( 'ReasonDelimiter', 'display', ( this.suggestion.reason ?  'inline-block'  :  'none' ) );
    };

        BudgetSuggestionViewDisplay.prototype.
    onClickSuggestion = function( event ){  this.questionDisplay.onClickSuggestion( this );  };




        function
    BudgetQuestionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        let thisCopy = this;
        this.editOptionDisplays = { data:[] };
        this.allocationDisplays = { data:[] };
        this.resultOptionDisplays = { data:[] };
        this.suggestionDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=BudgetQuestionDisplay id=BudgetQuestionDisplay> ',
            '   <div class=Message id=Message aria-live=polite></div> ',
            //  Edit
            '   <div class=Edit> ',
            '       <div class=TotalAmountWrap> ',
            '           <label for=TotalAmountInput translate=yes> Total budget amount </label> ',
            '           <input type=number id=TotalAmountInput required min=1 step=any placeholder="12345..." oninput=onTotalInput /> ',
            '       </div> ',
            '       <div class=RatingLimitsWrap> ',
            '           <div class=RatingLimitWrap> ',
            '               <label for=RequireReasonInput translate=yes> Require reasons </label> ',
            '               <input id=RequireReasonInput class=RequireReasonInput type=checkbox checked oninput=onRequireReasonInput /> ',
            '           </div> ',
            '       </div> ',
            '       <div class=EditHeadings id=EditHeadings><div translate=yes> Suggestions </div></div> ',
            '       <div class=Options id=EditOptions></div> ',
            '       <div class=NewOptionWrap> ',
            '           <label for=NewOptionInput translate=yes> Add suggestion </label> ',
            '           <input class=NewOptionInput id=NewOptionInput placeholder="..." oninput=onNewOptionInput /> ',
            '           <div class=SaveOrCancelButtons> ',
            '               <button class=SaveButton id=SaveButton translate=yes onclick=onNewOptionSaveClick> Save </button> ',
            '               <button class=CancelButton id=CancelButton translate=yes onclick=onNewOptionCancelClick> Cancel </button> ',
            '           </div> ',
            '       </div> ',
            '   </div> ',
            //  View
            '   <div class=View> ',
            '           <div class=Totals> ',
            '               <span class=Amount><span translate=yes> Total budget </span> = <span id=AmountAbsoluteView class=AmountAbsoluteView></span></span> ',
            '               <span class=Used><span translate=yes> Total used </span> = <span id=TotalAllocated></span>% </span> ',
            '           </div> ',
            '       <div class=ViewHeadings id=ViewHeadings> ',
            '           <div translate=yes> Budget Item </div> ',
            '           <div translate=yes> Amount </div> ',
            '           <div translate=yes> Reason </div> ',
            '       </div> ',
            '       <div class=Options id=ViewOptions></div> ',
            '       <div class=NewAllocationWrap> ',
            '           <h4 translate=yes id=ViewSuggestionsHeading> Suggestions </h4> ',
            '           <div class=ViewSuggestions id=ViewSuggestions></div> ',
            '           <h4 translate=yes> Add budget item </h4> ',
            '           <input class=ContentInput id=ContentInput title="Item name" placeholder="..." oninput=onReasonInput /> ',
            '           <label for=ReasonInput class=ReasonLabel translate=yes> Reason </label> ',
            '           <textarea class=ReasonInput id=ReasonInput placeholder="Because..." oninput=onReasonInput ></textarea/> ',
            '           <div class=SaveOrCancelButtons> ',
            '               <button class=SaveButton id=SaveButton translate=yes onclick=onNewAllocationSaveClick> Save </button> ',
            '               <button class=CancelButton id=CancelButton translate=yes onclick=onNewAllocationCancelClick> Cancel </button> ',
            '           </div> ',
            '       </div> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '           <div class=AmountAbsolute> <span translate=yes> Total budget </span> = <span id=AmountAbsoluteResult></span> </div> ',
            '       <div class=ResultHeadings> ',
            '           <div translate=yes> Allocated </div> ',
            '           <div translate=yes> Budget Item </div> ',
            '           <div class=Votes translate=yes> Votes </div> ',
            '       </div> ',
            '       <div class=Options id=ResultOptions></div> ',
            //      No more-button because only need enough budget-items to fill a budget
            '   </div> ',
            ' </div>'
        ].join('\n') );
    }
    BudgetQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        BudgetQuestionDisplay.prototype.
    setInitialData = function( questionData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( questionData, null );
        return this;
    };

        BudgetQuestionDisplay.prototype.
    setData = function( questionData, questionAnswer ){
        this.question = questionData;
        this.answers = questionAnswer;
        this.dataUpdated();
    };


    // Update from data to html
        BudgetQuestionDisplay.prototype.
    dataUpdated = function( ){
        this.totalAmountInput = this.getSubElement('TotalAmountInput');
        this.newOptionInput = this.getSubElement('NewOptionInput');
        this.contentInput = this.getSubElement('ContentInput');
        this.reasonInput = this.getSubElement('ReasonInput');

        this.messagesUpdated();

        // Attributes
        this.setAttribute( 'BudgetQuestionDisplay', 'mode', this.mode );
        this.setAttribute( 'BudgetQuestionDisplay', 'hasnewoptioninput', (this.newOptionInput.value ? TRUE : FALSE) );
        this.setAttribute( 'BudgetQuestionDisplay', 'hasnewallocationinput', (this.contentInput.value || this.reasonInput.value ? TRUE : FALSE) );
        this.newOptionInput.disabled = ! this.isQuestionValid();
        let fullyAllocated = ( this.amountRemaining() < ALLOCATION_INCREMENT );
        this.contentInput.disabled = ( ! this.allowInput() )  ||  fullyAllocated;
        this.reasonInput.disabled = ( ! this.allowInput() )  ||  fullyAllocated;

        this.getSubElement('RequireReasonInput').checked = this.question.requireReason;

        // Subdisplays
        let thisCopy = this;
        if ( this.mode == EDIT ){
            // Edit
            this.totalAmountInput.value = this.question.maxTotal;
            this.setStyle( 'EditHeadings', 'display', isEmpty(this.question.options)? 'none' : 'grid' );
            this.editOptionDisplays.data = this.question.options.slice() || [];
            // Ensure each data has a key, ensure displays exist in data order, update displays
            this.editOptionDisplays.data.forEach( o => {o.key = String(o.id);} );
            this.updateSubdisplays( this.editOptionDisplays, this.getSubElement('EditOptions'),
                (optionData) => new BudgetOptionEditDisplay( thisCopy.question.id + '-' + optionData.id ).setInitialData( optionData, thisCopy, thisCopy.surveyDisplay )
             );
            this.editOptionDisplays.displays.forEach(  (d,i) => d.setData( thisCopy.question.options[i] )  );
        }
        else if ( this.mode == VIEW ){
            // View
            this.setInnerHtml( 'AmountAbsoluteView', this.question.maxTotal );
            this.setInnerHtml( 'TotalAllocated', this.amountAllocated() );
            // Allocations
            this.setStyle( 'ViewHeadings', 'display', isEmpty(this.allocationDisplays.data)? 'none' : null );
            this.allocationDisplays.data = ( this.answers )?  Object.entries( this.answers ).map(  a => { return {content:a[0], amount:a[1].content, reason:a[1].reason, id:a[1].id} }  )  :  [];
            this.allocationDisplays.data = this.allocationDisplays.data.filter( a => (a.id != null) );  // Skip answers created by question-types without answer-IDs
            this.allocationDisplays.data.sort( (a,b) => b.amount - a.amount );  // Sort allocations from large to small
            this.allocationDisplays.data.forEach( o => {o.key = String(o.id)} );
            this.updateSubdisplays( this.allocationDisplays, this.getSubElement('ViewOptions'),
                (optionData) => new BudgetAllocationViewDisplay( thisCopy.question.id + '-' + optionData.id )
                    .setInitialData( optionData, thisCopy, thisCopy.surveyDisplay )
            );
            this.allocationDisplays.displays.forEach(  (d,i) => {
                d.setData( this.allocationDisplays.data[i], thisCopy.highlightWords );
            }  );

            // Merge in question-options as suggestions
            let suggestions = ( this.suggestions )?  Object.values( this.suggestions )  :  null;
            if ( suggestions ){   suggestions.forEach(  s => { s.content = s.grandparentSubkey;  s.reason = s.lastSubkey; }  );   }
            this.question.options.forEach(  o => { o.content = o.title;  o.reason = ''; }  );  // Ensure suggestions and options have same content fields
            this.suggestionDisplays.data = ( suggestions )?  suggestions.concat( this.question.options )  :  [];

            this.setStyle( 'ViewSuggestionsHeading', 'display', isEmpty(this.suggestionDisplays.data)? 'none' : 'block' );

            this.suggestionDisplays.data = this.suggestionDisplays.data.slice( 0, 3 );
            this.suggestionDisplays.data.forEach( o => {o.key = String(o.id);} );
            this.updateSubdisplays( this.suggestionDisplays, this.getSubElement('ViewSuggestions'),
                (optionData) => new BudgetSuggestionViewDisplay( thisCopy.question.id + '-' + optionData.id ).setInitialData( optionData, thisCopy )
            );
            this.suggestionDisplays.displays.forEach(  (d,i) => {
                d.setData( this.suggestionDisplays.data[i], thisCopy.highlightWords );
            }  );
        }
        else if ( this.mode == RESULT ){
            // Result
            this.setInnerHtml( 'AmountAbsoluteResult', this.question.maxTotal );
            this.resultOptionDisplays.data = ( this.results )?  Object.values( this.results ).sort( (a,b) => b.medianSize - a.medianSize )  :  [];
            this.resultOptionDisplays.data = this.resultOptionDisplays.data.filter( o => o.medianSize );
            this.resultOptionDisplays.data.forEach( o => {o.key = o.id = String(o.answerId);} );
            this.updateSubdisplays( this.resultOptionDisplays, this.getSubElement('ResultOptions'),
                (optionData) => new BudgetOptionResultDisplay( thisCopy.question.id + '-' + optionData.id )
                    .setInitialData( optionData, thisCopy, thisCopy.surveyDisplay )
            );
            let totalVotes = this.totalVotes();
            this.resultOptionDisplays.displays.forEach(  (d,i) => {
                d.setData( thisCopy.resultOptionDisplays.data[i], totalVotes );
            }  );
        }
    };

        BudgetQuestionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
        this.totalAmountInput.setCustomValidity( this.totalValidity || '' );
    };

        BudgetQuestionDisplay.prototype.
    amountRemaining = function( ){  return 100 - this.amountAllocated();  };

        BudgetQuestionDisplay.prototype.
    amountAllocated = function( ){
        return ( this.answers )?  Object.values( this.answers ).filter( a => (a.id != null) ).reduce( (agg,i) => agg + parseInt(i.content) , 0 )  :  0;
    };

        BudgetQuestionDisplay.prototype.
    totalVotes = RatingOptionDisplay.prototype.totalVotes;

        BudgetQuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.surveyDisplay.isFrozen() );  };

        BudgetQuestionDisplay.prototype.
    isQuestionValid = function( ){
        return this.questionDisplay.isQuestionValid() && this.question.maxTotal;
    };

        BudgetQuestionDisplay.prototype.
    setMode = RatingQuestionDisplay.prototype.setMode;

        BudgetQuestionDisplay.prototype.
    focusInitialInput = function( event ){
        focusAtEnd( this.getSubElement('TotalAmountInput') );
    };

        BudgetQuestionDisplay.prototype.
    retrieveData = function( ){  };


        BudgetQuestionDisplay.prototype.
    onRequireReasonInput = RatingQuestionDisplay.prototype.onRequireReasonInput;

        BudgetQuestionDisplay.prototype.
    onTotalInput = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Delay after typing, to allow typing a 2-digit number without being corrected prematurely
        let thisCopy = this;
        clearTimeout( this.timerTotalInput );
        this.timerTotalInput = setTimeout( () => thisCopy.onTotalInputDelayed() , 1000 );
    };

        BudgetQuestionDisplay.prototype.
    onTotalInputDelayed = function( ){
        // Require total amount
        let totalValue = this.totalAmountInput.value;
        if ( totalValue ){
            this.message = { color:GREY, text:'Saving total budget amount...' };
            this.totalAmountInput.setCustomValidity( '' );
            this.message = showMessageStruct( this.message , this.getSubElement('Message') );
        }
        else {
            this.message = { color:RED, text:'Total budget amount is required' };
            this.totalAmountInput.setCustomValidity( this.message.text );
            this.message = showMessageStruct( this.message , this.getSubElement('Message') );
            return;
        }

        let url = '/multi/setBudgetMaxTotal';
        let sendData = {
            linkKey:this.surveyDisplay.link.id , crumb:crumb , fingerprint:fingerprint ,
            questionId:this.question.id , total:totalValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                // Update data
                thisCopy.message = { color:GREEN , text:'Saved total budget amount' , ms:5000 };
                thisCopy.dataUpdated();
                thisCopy.surveyDisplay.setSurveyData( receiveData.survey );
                thisCopy.surveyDisplay.dataUpdated();
            }
            else {
                let message = 'Failed to save total budget amount';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit question created by someone else';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has answers';  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    }



        BudgetQuestionDisplay.prototype.
    onNewOptionInput = function( ){
        this.setAttribute( 'BudgetQuestionDisplay', 'hasnewoptioninput', (this.newOptionInput.value ? TRUE : FALSE) );
    };

        BudgetQuestionDisplay.prototype.
    onNewOptionCancelClick = RatingQuestionDisplay.prototype.handleNewOptionCancelClick;

        BudgetQuestionDisplay.prototype.
    onNewOptionSaveClick = RatingQuestionDisplay.prototype.handleNewOptionSaveClick;



        BudgetQuestionDisplay.prototype.
    onReasonInput = function( ){
        fitTextAreaToText( this.reasonInput );
        this.setAttribute( 'BudgetQuestionDisplay', 'hasnewallocationinput', (this.contentInput.value || this.reasonInput.value ? TRUE : FALSE) );
        this.checkAllocationInput();
        // If user typed SPACE... retrieve suggestions
        if ( event.data == ' ' ){  this.retrieveSuggestions();  }
    };

        BudgetQuestionDisplay.prototype.
    retrieveSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let contentValue = this.contentInput.value;
        let reasonValue = this.reasonInput.value;
        let answerContent = [ contentValue, reasonValue ].join(' ');

        // If no user-input... hide matching-answers, show host-options
        if ( ! answerContent.trim() ){  this.suggestions = {};  this.dataUpdated();  }

        // Retrieve suggestions only for first N words
        let words = removeStopWords( tokenize(answerContent) ).slice( 0, MAX_WORDS_INDEXED )  ||  [];
        if ( (! words) || (words.length < 1) ){  return;  }  // Require that user type something

        // Suggest only if input is changed since last suggestion 
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;  }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve top-voted budget-items that match content in progress
        let url = '/multi/answersAndReasonsForPrefix';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , inputStart:contentStart
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.suggestions ){
                console.info( 'BudgetQuestionDisplay.retrieveSuggestions() receiveData.suggestions=', receiveData.suggestions );

                // Collect suggestions and calculate IDF weights across reason words 
                if ( ! thisCopy.suggestionTextToData ){  thisCopy.suggestionTextToData = {};  }  // map{ suggestionText -> {scoreMatch, scoreTotal...} }
                for ( let s = 0;  s < receiveData.suggestions.length;  ++s ){
                    let suggestionNew = receiveData.suggestions[ s ];
                    if ( suggestionNew.words  &&  ! (suggestionNew.words in thisCopy.suggestionTextToData) ){
                        thisCopy.surveyDisplay.incrementWordCounts( suggestionNew.words );
                    }
                    thisCopy.suggestionTextToData[ suggestionNew.words ] = suggestionNew;
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

        BudgetQuestionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;

        BudgetQuestionDisplay.prototype.
    onClickSuggestion = function( suggestionDisplay ){

        if ( ! this.surveyDisplay.confirmUseSuggestion() ){  return false;  }

        this.contentInput.value = ( suggestionDisplay.suggestion.content == null )?  ''  :  suggestionDisplay.suggestion.content;
        this.reasonInput.value = ( suggestionDisplay.suggestion.reason == null )?  ''  :  suggestionDisplay.suggestion.reason;
        this.reasonInput.focus();
        this.dataUpdated();
    };


        BudgetQuestionDisplay.prototype.
    onNewAllocationCancelClick = function( ){
        this.contentInput.value = '';
        this.reasonInput.value = '';
        this.suggestions = null;
        this.dataUpdated();
    };

        BudgetQuestionDisplay.prototype.
    onNewAllocationSaveClick = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let contentValue = this.contentInput.value;
        let reasonValue = this.reasonInput.value;
        if ( ! contentValue ){  return;  }

        // Require that reason is valid
        this.checkAllocationInput();
        if ( this.reasonTooShort  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.dataUpdated();
            return;
        }

        this.message = { color:GREY , text:'Adding budget item...' };
        this.dataUpdated();

        // Save to server
        let url = '/multi/voteBudgetAllocation';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id ,
            contentOld:null , amountOld:null , reasonOld:null ,
            contentNew:contentValue , amountNew:ALLOCATION_INCREMENT , reasonNew:reasonValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'BudgetQuestionDisplay.onNewAllocationSaveClick()', 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                thisCopy.message = { color:GREEN , text:'Created budget item' , ms:5000 };
                thisCopy.dataUpdated();
                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );
                thisCopy.onNewAllocationCancelClick();  // Clear new-allocation input form
                // Focus amount-input for newly created allocation
                let lastDisplay = last( thisCopy.allocationDisplays.displays );
                if ( lastDisplay ){  lastDisplay.focusAmountInput();  }
            }
            else {
                let message = 'Failed to create budget item';
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

        BudgetQuestionDisplay.prototype.
    checkAllocationInput = RatingOptionDisplay.prototype.checkReasonInput;

        BudgetQuestionDisplay.prototype.
    retrieveResults = function( ){
        // Retrieve results from server
        let url = '/multi/budgetTopItems/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            console.log( 'BudgetQuestionDisplay.retrieveResults() receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                thisCopy.results = receiveData.answers;
                thisCopy.dataUpdated();
            }
        } );
    };


