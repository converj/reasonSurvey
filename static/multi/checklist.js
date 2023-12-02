// Displays based on ElementWrap

// Checklist-question with edit/view/result-states, which can retrieve data and update cached structs


/////////////////////////////////////////////////////////////////////////////////
// Display for option

        function
    ChecklistOptionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.resultDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=CheckboxOptionDisplay id=Option> ',
            //  Edit
            '   <div class=Edit> ',
            '       <div class=EditRow> ',
            '           <div> ',
            '               <input class=OptionContentInput id=OptionContentInput placeholder="" ',
            '                   onblur=handleEditOptionSave oninput=handleEditOptionInput /> ',
            '           </div><div class=OptionDeleteButtonCell> ',
            '               <button class=OptionDeleteButton id=OptionDeleteButton title="Delete" onclick=handleDeleteClick> X </button> ',
            '           </div> ',
            '       </div> ',
            '   </div> ',
            //  View
            '   <div class=View> ',
            '       <div for=CheckboxInput id=CheckboxLabel class=CheckboxLabel></div> ',
            '       <div class=CheckboxInputWrap> ',
            '           <input type=checkbox class=CheckboxInput id=CheckboxInput title="Yes" oninput=onCheckboxInput /> ',
            '       </div> ',
            '       <button class=CheckboxIncrementButton id=CheckboxUpButton onclick=checkboxUpClick onfocus=onReasonInputFocus onblur=onReasonInputBlur > Yes </button> ',
            '       <div class=ReasonCell> ',
            '           <textarea class=ReasonInput id=ReasonInput title="Reason" placeholder="Because..." oninput=handleReasonInput ',
            '               onfocus=onReasonInputFocus onblur=onReasonInputBlur ></textarea/> ',
            '       </div> ',
            '       <button class=CheckboxIncrementButton id=CheckboxDownButton onclick=checkboxDownClick onfocus=onReasonInputFocus onblur=onReasonInputBlur> No </button> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '       <details> ',
            '           <summary> ',
            '               <div id=OptionResultContent class=OptionResultContent></div> ',
            '               <div id=OptionResultAverage class=OptionResultAverage></div> ',
            '           </summary> ',
            '           <div id=OptionCheckboxResults class=OptionCheckboxResults></div> ',
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
    ChecklistOptionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        ChecklistOptionDisplay.prototype.
    setInitialData = RatingOptionDisplay.prototype.setInitialData;

        ChecklistOptionDisplay.prototype.
    setData = RatingOptionDisplay.prototype.setData;

    // Update this.element
        ChecklistOptionDisplay.prototype.
    dataUpdated = function( ){
        this.checkboxInput = this.getSubElement('CheckboxInput');
        this.reasonInput = this.getSubElement('ReasonInput');

        this.messagesUpdated();

        // Edit
        this.setProperty( 'OptionContentInput', 'defaultValue', this.option.title );
        this.setProperty( 'OptionContentInput', 'disabled', ! this.questionDisplay.isQuestionValid() );
        this.setProperty( 'OptionDeleteButton', 'disabled', ! this.questionDisplay.isQuestionValid() );

        // View
        this.setInnerHtml( 'CheckboxLabel', this.option.title );
        this.setProperty( 'CheckboxInput', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'CheckboxUpButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'ReasonInput', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'CheckboxDownButton', 'disabled', ! this.questionDisplay.allowInput() );

        // Set suggestions
        let hasSuggestUp = this.suggest  &&  this.suggest.up  &&  this.suggest.up.lastSubkey;
        if ( hasSuggestUp  &&  ! this.checkboxInput.checked ){
            let suggestUpText = '&uarr; ' + this.suggest.up.lastSubkey;
            displayHighlightedContent( storedTextToHtml(suggestUpText), this.highlightWords, this.getSubElement('CheckboxUpButton') );
            this.setStyle( 'CheckboxUpButton', 'display', null );
        }
        else {  this.setStyle( 'CheckboxUpButton', 'display', 'none' );  }

        let hasSuggestDown = this.suggest  &&  this.suggest.down  &&  this.suggest.down.lastSubkey;
        if ( hasSuggestDown  &&  this.checkboxInput.checked ){
            let suggestDownText = '&darr; ' + this.suggest.down.lastSubkey;
            displayHighlightedContent( storedTextToHtml(suggestDownText), this.highlightWords, this.getSubElement('CheckboxDownButton') );
            this.setStyle( 'CheckboxDownButton', 'display', null );
        }
        else {  this.setStyle( 'CheckboxDownButton', 'display', 'none' );  }

        let thisCopy = this;
        setTimeout( () => fitTextAreaToText(thisCopy.reasonInput) , 100 );
        this.checkboxInput.defaultChecked = Boolean( this.answer  &&  this.answer.content );
        this.reasonInput.defaultValue = ( this.answer )?  this.answer.reason  :  '';

        // Result
        this.setInnerHtml( 'OptionResultContent', this.option.title );
        let yesResult = ( this.results )?  this.results.find( r => (r.rating == '1') )  :  null;
        let yesCount = ( yesResult && yesResult.votes )?  yesResult.votes  :  0;
        this.setInnerHtml(  'OptionResultAverage' , ( this.questionDisplay.voterCount ? Math.floor(100 * yesCount / this.questionDisplay.voterCount) : 0 ) + '%'  );

        // Subdisplays for results
        this.resultDisplays.data = this.results || [];
        this.resultDisplays.data.forEach(  r => { r.key = String(r.rating) }  );  // Ensure each data has a key string
        let optionVotes = this.totalVotes();
        this.updateSubdisplays( this.resultDisplays, this.getSubElement('OptionCheckboxResults') ,
            ( optionCheckboxResult ) =>
                new RatingResultDisplay( thisCopy.surveyDisplay.link.id, thisCopy.questionDisplay.question.id, thisCopy.option.id, optionCheckboxResult.checkbox )
                .setInitialData( thisCopy )
        );
        if ( this.resultDisplays.displays ){   this.resultDisplays.displays.forEach(  (r,i) => {
            r.isBoolean = true;
            r.setData( thisCopy.results[i], optionVotes );
        }  );   }
    };

        ChecklistOptionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('optionMessage') );
        this.moreMessage = showMessageStruct( this.moreMessage, this.getSubElement('moreMessage') );
        this.getSubElement('OptionContentInput').setCustomValidity( this.optionValidity || '' );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    }

        ChecklistOptionDisplay.prototype.
    totalVotes = RatingOptionDisplay.prototype.totalVotes;

        ChecklistOptionDisplay.prototype.
    setMode = function( newMode ){  this.mode = newMode;  this.dataUpdated();  };

        ChecklistOptionDisplay.prototype.
    handleEditOptionInput = RatingOptionDisplay.prototype.handleEditOptionInput;

        ChecklistOptionDisplay.prototype.
    handleEditOptionCancelClick = RatingOptionDisplay.prototype.handleEditOptionCancelClick;

        ChecklistOptionDisplay.prototype.
    handleEditOptionSave = RatingOptionDisplay.prototype.handleEditOptionSave;


        ChecklistOptionDisplay.prototype.
    onCheckboxInput = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Delay changes to display, to avoid up/down button jumping 
        if ( this.checkboxChangeTimer ){
            clearTimeout( this.checkboxChangeTimer );
            this.checkboxChangeTimer = null;
        }
        let thisCopy = this;
        this.checkboxChangeTimer = setTimeout( function(){
            // Check that input value is an integer, and changed 
            let input = thisCopy.checkboxInput;
            let inputChanged = ( input.getAttribute('defaultValue') != input.value );
            thisCopy.storeCheckbox( input.value );
        } , 1000 );
    };


        ChecklistOptionDisplay.prototype.
    handleDeleteClick = RatingOptionDisplay.prototype.handleDeleteClick;


        ChecklistOptionDisplay.prototype.
    onReasonInputFocus = function( event ){
        clearTimeout( this.timerBlurCheckboxInput );
        // Set attribute directly, since dataUpdated() can interfere with button click events
        this.setAttribute( 'Option', 'reasonInputFocused', TRUE );
        return true;
    };

        ChecklistOptionDisplay.prototype.
    onReasonInputBlur = function( event ){
        // Delay updating display for blur, since another input control may be focused after blur
        clearTimeout( this.timerBlurCheckboxInput );
        this.timerBlurCheckboxInput = setTimeout(  () => {
            this.setAttribute( 'Option', 'reasonInputFocused', FALSE );
            this.storeCheckbox();
        } , 1000  );
        return true;
    };

        ChecklistOptionDisplay.prototype.
    checkboxUpClick = function( event ){
        let checkboxValue = this.checkboxInput.checked;

        // Apply suggested reason
        if ( this.suggest && this.suggest.up ){  this.reasonInput.value = this.suggest.up.lastSubkey;  }

        // Modify checkbox
        this.checkboxInput.checked = true;
        this.dataUpdated();
        return true;
    };

        ChecklistOptionDisplay.prototype.
    checkboxDownClick = function( event ){
        let checkboxValue = this.checkboxInput.checked;

        // Apply suggested reason
        if ( this.suggest && this.suggest.down ){  this.reasonInput.value = this.suggest.down.lastSubkey;  }

        // Modify checkbox
        this.checkboxInput.checked = false;
        this.dataUpdated();
        return true;
    };

        ChecklistOptionDisplay.prototype.
    storeCheckbox = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Require that checkbox or reason changed
        let checkboxValue = ( this.checkboxInput.checked )? 1 : 0;
        let reasonValue = this.reasonInput.value;
        if ( this.answer  &&  (checkboxValue == this.answer.content)  &&  (reasonValue == this.answer.reason) ){  return;  }
        if ( ! this.answer  &&  (! checkboxValue)  &&  (! reasonValue) ){  return;  }

        // Require that reason is valid
        this.checkReasonInput();
        if ( (checkboxValue && this.reasonTooShort)  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.dataUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving checkmark...' };
        this.dataUpdated();

        // Save to server
        let url = '/multi/answerChecklistQuestion';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , optionId:this.option.id ,
            rating:checkboxValue , reason:reasonValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                thisCopy.message = { color:GREEN, text:'Saved checkmark', ms:3000 };
                thisCopy.dataUpdated();
                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );
            }
            else {
                let message = 'Failed to save checkmark';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  thisCopy.reasonValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                    if ( receiveData.message == UNCHANGED ){  message = null;  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
                thisCopy.dataUpdated();
            }
        } );
    };

        ChecklistOptionDisplay.prototype.
    handleReasonInput = RatingOptionDisplay.prototype.handleReasonInput;

        ChecklistOptionDisplay.prototype.
    checkReasonInput = RatingOptionDisplay.prototype.checkReasonInput;

        ChecklistOptionDisplay.prototype.
    retrieveSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }
        this.retrieveSuggestionsImp( this.option.id, (this.checkboxInput.checked ? 1 : 0), this.reasonInput.value );
    };

        ChecklistOptionDisplay.prototype.
    retrieveSuggestionsImp = RatingOptionDisplay.prototype.retrieveSuggestionsImp;

        ChecklistOptionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;

        ChecklistOptionDisplay.prototype.
    onMoreReasonsClick = RatingOptionDisplay.prototype.onMoreReasonsClick;


/////////////////////////////////////////////////////////////////////////////////
// Display for checklist-question

        function
    ChecklistQuestionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.options = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=ChecklistQuestionDisplay id=ChecklistQuestionDisplay> ',
            //  Edit
            '   <div class=Edit> ',
            '       <div class=RatingLimitsWrap> ',
            '           <div class=RatingLimitWrap> ',
            '               <label for=RequireReasonInput translate=yes> Require reasons </label> ',
            '               <input id=RequireReasonInput class=RequireReasonInput type=checkbox checked oninput=onRequireReasonInput /> ',
            '           </div> ',
            '       </div> ',
            '       <div class=EditHeadings id=EditHeadings><div translate=yes> Option </div><div translate=yes> Delete </div></div> ',
            '   </div> ',
            //  View
            '   <div class=View> ',
            '       <div class=ViewHeadings><div translate=yes> Option </div><div translate=yes> Yes </div><div translate=yes> Reason </div></div> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '       <div class=ResultHeadings> ',
            '           <div translate=yes> Option </div><div class=YesLabel><span translate=yes>Yes</span>%</div><div translate=yes> Reason </div><div translate=yes> Votes </div> ',
            '       </div> ',
            '   </div> ',
            //  Options
            '   <div class=Options id=Options subdisplays=options ></div> ',
            '   <div class=NewOptionWrap> ',
            '       <label for=NewOptionInput translate=yes> Add option </label> ',
            '       <input class=NewOptionInput id=NewOptionInput placeholder="..." oninput=handleNewOptionInput /> ',
            '       <div class=SaveOrCancelButtons> ',
            '           <button class=SaveButton id=SaveButton translate=yes onclick=handleNewOptionSaveClick> Save </button> ',
            '           <button class=CancelButton id=CancelButton translate=yes onclick=handleNewOptionCancelClick> Cancel </button> ',
            '       </div> ',
            '   </div> ',
            '   <div class=Message id=Message aria-live=polite></div> ',
            ' </div>'
        ].join('\n') );
    }
    ChecklistQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        ChecklistQuestionDisplay.prototype.
    setInitialData = RatingQuestionDisplay.prototype.setInitialData;

        ChecklistQuestionDisplay.prototype.
    setData = RatingQuestionDisplay.prototype.setData;

    // Update from data to html
        ChecklistQuestionDisplay.prototype.
    dataUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );

        // Attributes 
        this.setAttribute( 'ChecklistQuestionDisplay', 'mode', this.mode );
        this.setAttribute( 'ChecklistQuestionDisplay', 'hasnewoptioninput', (this.getSubElement('NewOptionInput').value ? TRUE : FALSE) );
        this.setProperty( 'NewOptionInput', 'disabled', ! this.isQuestionValid() );
        this.setProperty( 'SaveButton', 'disabled', ! this.isQuestionValid() );
        this.setProperty( 'CancelButton', 'disabled', ! this.isQuestionValid() );

        // Content
        this.getSubElement('RequireReasonInput').checked = this.question.requireReason;
        this.setStyle( 'EditHeadings', 'display', (0 < this.question.options.length ? 'grid' : 'none') );

        // Update collection of subdisplays: set data & keys, create/reorder displays, update displays
        this.options.data = this.question.options.slice() || [];
        this.options.data.forEach( o => o.key = String(o.id) );
        let thisCopy = this;
        if ( this.mode == RESULT ){
            // Order option results by check percentage
            this.options.data.forEach( o =>  o.average = thisCopy.getAverage(o.key) );
            this.options.data = this.options.data.sort( (a,b) => b.average - a.average );
        }
        this.updateSubdisplays( this.options , this.getSubElement('Options') ,
            (optionData) => new ChecklistOptionDisplay( optionData.id ).setInitialData( optionData, thisCopy, thisCopy.surveyDisplay )
        );
        this.options.displays.forEach(  (d, i) => {
            d.positionInQuestion = i;
            let optionAnswer = ( thisCopy.answers )?  thisCopy.answers[ d.key ]  :  null;
            d.setData( thisCopy.options.data[i] , optionAnswer , (thisCopy.results? thisCopy.results[d.key] : null) , i ,
                (thisCopy.optionToRatingDistribution ? thisCopy.optionToRatingDistribution[d.key] : null) );
        }  );
    };

        ChecklistQuestionDisplay.prototype.
    getAverage = function( optionKey ){
        if ( ! this.optionToRatingDistribution ){  return 0;  }
        let optionDistribution = this.optionToRatingDistribution[ optionKey ];
        let average = ( optionDistribution )?  optionDistribution.average  :  0;
        return ( average == null )?  0  :  average;
    };

        ChecklistQuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.surveyDisplay.isFrozen() );  };

        ChecklistQuestionDisplay.prototype.
    isQuestionValid = function( ){  return this.questionDisplay.isQuestionValid();  };

        ChecklistQuestionDisplay.prototype.
    setMode = RatingQuestionDisplay.prototype.setMode;

        ChecklistQuestionDisplay.prototype.
    focusInitialInput = function( event ){
        focusAtEnd( this.getSubElement('NewOptionInput') );
    };

        ChecklistQuestionDisplay.prototype.
    retrieveData = function( ){  };


        ChecklistQuestionDisplay.prototype.
    onRequireReasonInput = RatingQuestionDisplay.prototype.onRequireReasonInput;

        ChecklistQuestionDisplay.prototype.
    handleNewOptionInput = function( ){
        this.setAttribute( 'ChecklistQuestionDisplay', 'hasnewoptioninput', (this.getSubElement('NewOptionInput').value ? TRUE : FALSE) );
    };

        ChecklistQuestionDisplay.prototype.
    handleNewOptionCancelClick = RatingQuestionDisplay.prototype.handleNewOptionCancelClick;

        ChecklistQuestionDisplay.prototype.
    handleNewOptionSaveClick = RatingQuestionDisplay.prototype.handleNewOptionSaveClick;


        ChecklistQuestionDisplay.prototype.
    retrieveResults = function( ){
        // Retrieve results from server
        let url = '/multi/questionOptionRatings/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.options ){
                thisCopy.results = receiveData.options;
                thisCopy.optionToRatingDistribution = receiveData.optionToRatingDistribution;
                thisCopy.voterCount = ( receiveData.question )?  receiveData.question.voters  :  null;
                thisCopy.dataUpdated();
            }
        } );
    };


