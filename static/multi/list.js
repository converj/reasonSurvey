// Displays based on ElementWrap

// List question with edit/view/result-states

// Separate option-displays for editing suggestions, editing list-items, and viewing results,
// because there are different sets of options for edit/view/result, not a consistent set that change appearance



/////////////////////////////////////////////////////////////////////////////////
// Display for answering list-item
// Dont allow changing budget-item content, for simpler, less redundant, user-interface
// Only show reason-suggestions when adding an item

        function
    ListItemViewDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=ListItemViewDisplay id=Option>',
            '   <div class=ViewRow> ',
            '       <div class=Content id=Content></div> ',
            '       <div class=ReasonCell> ',
            '           <textarea class=ReasonInput id=ReasonInput title="Reason" placeholder="Because..." ',
            '               oninput=onReasonInput onfocus=onReasonInputFocus onblur=onReasonInputBlur ></textarea/> ',
            '       </div> ',
            '       <div class=DeleteCell> ',
            '           <button class=DeleteButton id=DeleteButton title="Delete" onclick=handleDeleteClick> X </button> ',
            '       </div> ',
            '   </div> ',
            '   <div class="Message" id=message aria-live=polite></div> ',
            ' </div> '
        ].join('\n') );
    }
    ListItemViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods



        ListItemViewDisplay.prototype.
    setInitialData = function( itemAnswer, questionDisplay, surveyDisplay ){
        this.questionDisplay = questionDisplay;
        this.surveyDisplay = surveyDisplay;
        this.setData( itemAnswer, null );
        return this;
    };

        ListItemViewDisplay.prototype.
    setData = function( itemAnswer, wordsToHighlight ){
        this.answer = itemAnswer;
        this.highlightWords = wordsToHighlight;
        this.dataUpdated();
    };

    // Update this.element
        ListItemViewDisplay.prototype.
    dataUpdated = function( ){
        this.reasonInput = this.getSubElement('ReasonInput');

        this.messagesUpdated();
        this.attributesUpdated();

        // Set content
        this.setInnerHtml( 'Content', (this.answer ? this.answer.content : '') );
        this.reasonInput.defaultValue = this.answer.reason;
        let thisCopy = this;
        setTimeout( () => fitTextAreaToText(thisCopy.reasonInput) );
    };

        ListItemViewDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('message') );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    };

        ListItemViewDisplay.prototype.
    attributesUpdated = function( ){
        let disabled = ! this.questionDisplay.allowInput();
        this.setProperty( 'ReasonInput', 'disabled', disabled );
        this.setProperty( 'DeleteButton', 'disabled', disabled );
    };



        ListItemViewDisplay.prototype.
    onReasonInput = function( event ){
        fitTextAreaToText( this.reasonInput );
        this.checkReasonInput();
    };

        ListItemViewDisplay.prototype.
    onReasonInputFocus = function( event ){ };

        ListItemViewDisplay.prototype.
    onReasonInputBlur = function( event ){
        // Require that reason changed
        let reasonValue = this.reasonInput.value;
        if ( this.answer  &&  (reasonValue == this.answer.reason) ){  return;  }

        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Require that reason is valid
        this.checkReasonInput();
        if ( this.reasonTooShort  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.messagesUpdated();
            return;
        }

        this.storeListItem( this.answer.content, reasonValue );
    };

        ListItemViewDisplay.prototype.
    checkReasonInput = RatingOptionDisplay.prototype.checkReasonInput;

        ListItemViewDisplay.prototype.
    handleDeleteClick = function( event ){
        if (  ! confirm( translate('Delete list item?') )  ){  return false;  }
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }
        this.storeListItem( null, null );
    };

        ListItemViewDisplay.prototype.
    storeListItem = function( contentValue, reasonValue ){
        // Display with showMessageStruct(), because calling dataUpdated() here causes a flash of the old amount-value
        let deleting = ! contentValue;
        let messageText = deleting ? 'Deleting list item...' : 'Saving list item...';
        this.message = showMessageStruct( {color:GREY, text:messageText} , this.getSubElement('message') );

        // Save to server
        let url = '/multi/voteListItem';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id ,
            contentOld:this.answer.content , contentNew:contentValue , reasonNew:reasonValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'ListItemViewDisplay.storeListItem()', 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );
                if ( deleting ){
                    thisCopy.questionDisplay.message = {  color:GREEN , text:'Deleted list item' , ms:5000  };
                    thisCopy.questionDisplay.messagesUpdated();
                }
                else {
                    thisCopy.message = {  color:GREEN , text:translate('Saved list item. Remaining items allowed:') + ' ' + thisCopy.questionDisplay.itemsRemaining() , ms:5000  };
                    thisCopy.messagesUpdated();
                }
            }
            else {
                let message = ( contentValue == null )?  'Failed to delete list item'  :  'Failed to save list item';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  thisCopy.reasonValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                    if ( receiveData.message == UNCHANGED ){  message = null;  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.messagesUpdated();
            }
        } );
    };



/////////////////////////////////////////////////////////////////////////////////
// Display for option result

        function
    ListItemReasonResultDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data 

        // User-interface state variables (not persistent) 

        // Create html element, store it in this.element 
        this.createFromHtml( displayId, '\n\n' + [
            ' <div id=BudgetReasonResult class=BudgetReasonResult>',
            '   <div></div> ',  // Spacer
            '   <div id=Reason class=BudgetReason></div> ',
            '   <div id=VoteCount class=VoteCount></div> ',
            ' </div> '
        ].join('\n') );
    }
    ListItemReasonResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods 

        ListItemReasonResultDisplay.prototype.
    setData = function( reasonResultData ){
        this.reason = reasonResultData;
        this.dataUpdated();
        return this;
    };

    // Update this.element 
        ListItemReasonResultDisplay.prototype.
    dataUpdated = function( ){
        this.setInnerHtml( 'Reason', (this.reason ? this.reason.reason : '') );
        this.setInnerHtml( 'VoteCount', (this.reason ? this.reason.votes : '') );
    };



        function
    ListItemResultDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.reasonResultDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=ListItemResultDisplay id=ListItem> ',
            '   <details id=ReasonsExpander ontoggle=onReasonsToggle> ',
            '       <summary> ',
            '           <div id=Content class=OptionResultContent></div> ',
            '           <div id=VoteCount class=VoteCount></div> ',
            '       </summary> ',
            '       <div id=ReasonResults class=OptionReasonResults></div> ',
            '   </details> ',
            '   <div class="Message" id=message aria-live=polite></div> ',
            ' </div> '
        ].join('\n') );
    }
    ListItemResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods



        ListItemResultDisplay.prototype.
    setInitialData = function( itemResult, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( itemResult );
        return this;
    };

        ListItemResultDisplay.prototype.
    setData = function( itemResult ){
        this.itemResult = itemResult;
        this.dataUpdated();
    };

        ListItemResultDisplay.prototype.
    dataUpdated = function( ){  // Update data to html
        // Show messages
        this.message = showMessageStruct( this.message, this.getSubElement('message') );

        // Set content
        this.setInnerHtml( 'Content', this.itemResult.answer );
        this.setInnerHtml( 'VoteCount', this.itemResult.votes );

        // Subdisplays for reason results
        let thisCopy = this;
        this.reasonResultDisplays.data = this.reasons || [];
        this.reasonResultDisplays.data.forEach(  r => { r.key = r.reasonId + '-' + r.amount }  );  // Ensure each data has a key string
        this.updateSubdisplays( this.reasonResultDisplays, this.getSubElement('ReasonResults') ,
            ( reasonResult ) => new ListItemReasonResultDisplay( 
                [thisCopy.questionDisplay.question.id, thisCopy.itemResult.id, reasonResult.reasonId].join('-') )
                .setData( reasonResult )
         );
        if ( this.reasonResultDisplays.displays ){   this.reasonResultDisplays.displays.forEach(  (r,i) =>
            r.setData( thisCopy.reasonResultDisplays.data[i] )
        );   }
    };

        ListItemResultDisplay.prototype.
    onReasonsToggle = function( event ){
        let reasonsExpander = this.getSubElement('ReasonsExpander');
        if ( reasonsExpander.open && (this.reasons == null) ){  this.retrieveResults();  }
    };

        ListItemResultDisplay.prototype.
    retrieveResults = function( ){
        // Retrieve results from server
        let url = '/multi/listItemTopReasons/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id + '/' + this.itemResult.answerId;
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            console.log( 'ListItemResultDisplay.retrieveResults() receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.reasons ){
                // Sort by answerId
                thisCopy.reasons = receiveData.reasons.sort( (a,b) => b.answerId - a.answerId );
                thisCopy.dataUpdated();
            }
        } );
    };




/////////////////////////////////////////////////////////////////////////////////
// Display for list-question

        function
    ListQuestionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        let thisCopy = this;
        this.editOptionDisplays = { data:[] };
        this.itemViewDisplays = { data:[] };
        this.itemResultDisplays = { data:[] };
        this.suggestionDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=ListQuestionDisplay id=ListQuestionDisplay> ',
            '   <div class=Message id=Message aria-live=polite></div> ',
            //  Edit
            '   <div class=Edit> ',
            '       <div class=TotalAmountWrap> ',
            '           <label for=MaxItemsInput translate=yes> Maximum items </label> ',
            '           <input type=number id=MaxItemsInput required min=1 max=10 step=1 placeholder="1..." oninput=onMaxItemsInput value=5 /> ',
            '       </div> ',
            '       <div class=RatingLimitsWrap> ',
            '           <div class=RatingLimitWrap> ',
            '               <label for=RequireReasonInput translate=yes> Require reasons </label> ',
            '               <input id=RequireReasonInput class=RequireReasonInput type=checkbox checked oninput=onRequireReasonInput /> ',
            '           </div> ',
            '       </div> ',
            '       <div class=EditHeadings id=EditHeadings><label translate=yes> Suggestions </label></div> ',
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
            '               <span class=Amount><span translate=yes>Maximum items</span>: <span id=MaxItemsView class=AmountAbsoluteView></span> </span> ',
            '               <span class=Used><span translate=yes>Total items</span>: <span id=TotalItemsView></span> </span> ',
            '           </div> ',
            '       <div class=ViewHeadings id=ViewHeadings> ',
            '           <div translate=yes> Item </div> ',
            '           <div translate=yes> Reason </div> ',
            '       </div> ',
            '       <div class=Options id=ViewOptions></div> ',
            '       <div class=NewAllocationWrap> ',
            '           <h4 translate=yes id=ViewSuggestionsHeading> Suggestions </h4> ',
            '           <div class=ViewSuggestions id=ViewSuggestions></div> ',
            '           <h4 translate=yes> Add list item </h4> ',
            '           <input class=ContentInput id=ContentInput title="Item name" placeholder="..." oninput=onReasonInput /> ',
            '           <label for=ReasonInput class=ReasonLabel translate=yes> Reason </label> ',
            '           <textarea class=ReasonInput id=ReasonInput placeholder="Because..." oninput=onReasonInput ></textarea/> ',
            '           <div class=SaveOrCancelButtons> ',
            '               <button class=SaveButton id=SaveButton translate=yes onclick=onNewItemSaveClick> Save </button> ',
            '               <button class=CancelButton id=CancelButton translate=yes onclick=onNewItemCancelClick> Cancel </button> ',
            '           </div> ',
            '       </div> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '       <div class=ResultHeadings> ',
            '           <div translate=yes> List Item </div> ',
            '           <div translate=yes> Reason </div> ',
            '           <div class=Votes translate=yes> Votes </div> ',
            '       </div> ',
            '       <div class=Options id=ResultOptions></div> ',
            '   </div> ',
            ' </div>'
        ].join('\n') );
    }
    ListQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods



        ListQuestionDisplay.prototype.
    setInitialData = function( questionData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( questionData, null );
        return this;
    };

        ListQuestionDisplay.prototype.
    setData = function( questionData, questionAnswer ){
        this.question = questionData;
        this.answers = questionAnswer;
        this.dataUpdated();
    };

    // Update from data to html
        ListQuestionDisplay.prototype.
    dataUpdated = function( ){
        this.maxItemsInput = this.getSubElement('MaxItemsInput');
        this.newOptionInput = this.getSubElement('NewOptionInput');
        this.contentInput = this.getSubElement('ContentInput');
        this.reasonInput = this.getSubElement('ReasonInput');

        this.messagesUpdated();
        this.attributesUpdated();

        // Content
        this.getSubElement('RequireReasonInput').checked = this.question.requireReason;

        // Subdisplays
        let thisCopy = this;
        if ( this.mode == EDIT ){
            // Edit
            this.maxItemsInput.value = this.question.maxItems;
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
            this.setInnerHtml( 'MaxItemsView', this.question.maxItems );
            this.setInnerHtml( 'TotalItemsView', this.numItems() );
            // Items
            this.setStyle( 'ViewHeadings', 'display', isEmpty(this.itemViewDisplays.data)? 'none' : null );
            this.itemViewDisplays.data = ( this.answers )?  Object.entries( this.answers ).map(  a => { return {content:a[0], reason:a[1].reason, id:a[1].id} }  )  :  [];
            this.itemViewDisplays.data = this.itemViewDisplays.data.filter( a => (a.id != null) );  // Skip answers created for question-types without answer-IDs
            this.itemViewDisplays.data.sort( (a,b) => a.id - b.id );
            this.itemViewDisplays.data.forEach( o => {o.key = String(o.id)} );
            this.updateSubdisplays( this.itemViewDisplays, this.getSubElement('ViewOptions'),
                (optionData) => new ListItemViewDisplay( thisCopy.question.id + '-' + optionData.id )
                    .setInitialData( optionData, thisCopy, thisCopy.surveyDisplay )
            );
            this.itemViewDisplays.displays.forEach(  (d,i) => {
                d.setData( this.itemViewDisplays.data[i], thisCopy.highlightWords );
            }  );

            // Merge in question-options as suggestions
            let suggestions = ( this.suggestions )?  Object.values( this.suggestions )  :  null;
            if ( suggestions ){   suggestions.forEach(  s => { s.content = s.parentSubkey;  s.reason = s.lastSubkey; }  );   }
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
            this.itemResultDisplays.data = ( this.results )?  Object.values( this.results ).sort( (a,b) => b.voteCount - a.voteCount )  :  [];
            this.itemResultDisplays.data = this.itemResultDisplays.data.filter( o => o.answer && !o.answer.match(/^o\d+$/) );
            this.itemResultDisplays.data.forEach( o => {o.key = o.id = String(o.answerId);} );
            this.updateSubdisplays( this.itemResultDisplays, this.getSubElement('ResultOptions'),
                (optionData) => new ListItemResultDisplay( thisCopy.question.id + '-' + optionData.id )
                    .setInitialData( optionData, thisCopy, thisCopy.surveyDisplay )
            );
            this.itemResultDisplays.displays.forEach(  (d,i) => {
                d.setData( thisCopy.itemResultDisplays.data[i] );
            }  );
        }
    };

        ListQuestionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    };

        ListQuestionDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'ListQuestionDisplay', 'mode', this.mode );
        this.setAttribute( 'ListQuestionDisplay', 'hasnewoptioninput', (this.newOptionInput.value ? TRUE : FALSE) );
        this.setAttribute( 'ListQuestionDisplay', 'hasnewiteminput', (this.contentInput.value || this.reasonInput.value ? TRUE : FALSE) );
        this.newOptionInput.disabled = ! this.isQuestionValid();
        let fullyAllocated = ! this.itemsRemaining();
        this.contentInput.disabled = ( ! this.allowInput() )  ||  fullyAllocated;
        this.reasonInput.disabled = ( ! this.allowInput() )  ||  fullyAllocated;
    };

        ListQuestionDisplay.prototype.
    itemsRemaining = function( ){  return this.question.maxItems - this.numItems();  };

        ListQuestionDisplay.prototype.
    numItems = function( ){
        return ( this.answers )?  Object.values( this.answers ).filter( a => (a.id != null) ).length  :  0;
    };

        ListQuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.surveyDisplay.isFrozen() );  };

        ListQuestionDisplay.prototype.
    isQuestionValid = function( ){  return this.questionDisplay.isQuestionValid() && this.maxItemsInput.value;  };

        ListQuestionDisplay.prototype.
    setMode = RatingQuestionDisplay.prototype.setMode;

        ListQuestionDisplay.prototype.
    focusInitialInput = function( ){  focusAtEnd( this.newOptionInput );  };

        ListQuestionDisplay.prototype.
    retrieveData = function( ){  };

        ListQuestionDisplay.prototype.
    onRequireReasonInput = RatingQuestionDisplay.prototype.onRequireReasonInput;

        ListQuestionDisplay.prototype.
    onMaxItemsInput = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Delay after typing, to allow typing a 2-digit number without being corrected prematurely
        let thisCopy = this;
        clearTimeout( this.timerMaxItemsInput );
        this.timerMaxItemsInput = setTimeout( () => thisCopy.onMaxItemsInputDelayed() , 1000 );
    };

        ListQuestionDisplay.prototype.
    onMaxItemsInputDelayed = function( ){
        // Require number
        let maxItemsValue = this.maxItemsInput.value;
        if ( maxItemsValue ){
            this.message = { color:GREY, text:'Saving maximum list items...' };
            this.maxItemsInput.setCustomValidity( '' );
        }
        else {
            this.message = { color:RED, text:'Maximum list items is required' };
            this.maxItemsInput.setCustomValidity( this.message.text );
        }
        this.messagesUpdated();
        this.attributesUpdated();
        if ( ! maxItemsValue ){  return;  }

        // Store to server
        let url = '/multi/setListMaxItems';
        let sendData = {
            linkKey:this.surveyDisplay.link.id , crumb:crumb , fingerprint:fingerprint ,
            questionId:this.question.id , maxItems:maxItemsValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'ListQuestionDisplay.onMaxItemsInputDelayed()', 'error=', error, 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                // Update data
                thisCopy.message = { color:GREEN , text:'Saved maximum items' , ms:5000 };
                thisCopy.dataUpdated();
                thisCopy.surveyDisplay.setSurveyData( receiveData.survey );
                thisCopy.surveyDisplay.dataUpdated();
            }
            else {
                let message = 'Failed to save maximum items';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit question created by someone else';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has answers';  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    }



        ListQuestionDisplay.prototype.
    onNewOptionInput = function( ){
        this.setAttribute( 'ListQuestionDisplay', 'hasnewoptioninput', (this.newOptionInput.value ? TRUE : FALSE) );
    };

        ListQuestionDisplay.prototype.
    onNewOptionCancelClick = RatingQuestionDisplay.prototype.handleNewOptionCancelClick;

        ListQuestionDisplay.prototype.
    onNewOptionSaveClick = RatingQuestionDisplay.prototype.handleNewOptionSaveClick;

        ListQuestionDisplay.prototype.
    onReasonInput = function( ){
        fitTextAreaToText( this.reasonInput );
        this.setAttribute( 'ListQuestionDisplay', 'hasnewiteminput', (this.contentInput.value || this.reasonInput.value ? TRUE : FALSE) );
        this.checkItemInput();
        // If user typed SPACE... retrieve suggestions
        if ( event.data == ' ' ){  this.retrieveSuggestions();  }
    };

        ListQuestionDisplay.prototype.
    retrieveSuggestions = BudgetQuestionDisplay.prototype.retrieveSuggestions;

        ListQuestionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;

        ListQuestionDisplay.prototype.
    onClickSuggestion = BudgetQuestionDisplay.prototype.onClickSuggestion;

        ListQuestionDisplay.prototype.
    onNewItemCancelClick = BudgetQuestionDisplay.prototype.onNewAllocationCancelClick;

        ListQuestionDisplay.prototype.
    onNewItemSaveClick = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let contentValue = this.contentInput.value;
        let reasonValue = this.reasonInput.value;
        if ( ! contentValue ){  return;  }

        // Require that reason is valid
        this.checkItemInput();
        if ( this.reasonTooShort  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.dataUpdated();
            return;
        }

        this.message = { color:GREY , text:'Adding list item...' };
        this.dataUpdated();

        // Save to server
        let url = '/multi/voteListItem';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            contentOld:null , contentNew:contentValue , amountNew:ALLOCATION_INCREMENT , reasonNew:reasonValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'ListQuestionDisplay.onNewItemSaveClick()', 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                thisCopy.message = { color:GREEN , text:'Created list item' , ms:5000 };
                thisCopy.dataUpdated();
                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );
                thisCopy.onNewItemCancelClick();  // Clear new-item input form

                let lastDisplay = last( thisCopy.itemViewDisplays.displays );
                lastDisplay.message = {  color:GREEN , text:translate('Saved list item. Remaining items allowed:') + ' ' + thisCopy.itemsRemaining() , ms:5000  };
                lastDisplay.messagesUpdated();
            }
            else {
                let message = 'Failed to create list item';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  thisCopy.reasonValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                    if ( receiveData.message == DUPLICATE ){  message = 'Item already exists';  }
                    if ( receiveData.message == UNCHANGED ){  message = null;  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
            thisCopy.contentInput.focus();
        } );
    };

        ListQuestionDisplay.prototype.
    checkItemInput = RatingOptionDisplay.prototype.checkReasonInput;

        ListQuestionDisplay.prototype.
    retrieveResults = function( ){
        // Retrieve results from server
        let url = '/multi/listTopItems/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            console.log( 'ListQuestionDisplay.retrieveResults() receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                thisCopy.results = receiveData.answers;
                thisCopy.dataUpdated();
            }
        } );
    };


