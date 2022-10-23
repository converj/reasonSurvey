/////////////////////////////////////////////////////////////////////////////////
// Suggestion viewing display

        function
    SuggestionViewDisplay( suggestionId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap

        // Create HTML element, store it in this.element
        this.createFromHtml( suggestionId, '\n\n' + [
            '<div class=Suggestion id=Suggestion role=suggestion onclick=handleSuggestionClick></div>'
        ].join('\n') );
    }
    SuggestionViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap


        SuggestionViewDisplay.prototype.
    setAllData = function( suggestionData, topDisp, sliceDisplay ){
        this.suggestion = suggestionData;
        this.sliceDisplay = sliceDisplay;
        this.topDisp = topDisp;
        this.dataUpdated();
    }

    // Update this.element
        SuggestionViewDisplay.prototype.
    dataUpdated = function( ){
        this.setAttribute( 'Suggestion', 'empty', (this.suggestion ? null : TRUE) );

        // Append spans highlighting keywords matched by slice title/reason inputs
        let suggestionDiv = this.getSubElement('Suggestion');
        clearChildren( suggestionDiv );
        if ( this.suggestion == null ){  return;  }
        let suggestionInput = this.sliceDisplay.getSubElement('TitleInput').value + ' ' +
                              this.sliceDisplay.getSubElement('ReasonInput').value;
        let spanElements = keywordsToHighlightSpans( suggestionInput, this.suggestion.title );
        for ( let s = 0;  s < spanElements.length;  ++s ){
            spanElements[s].setAttribute('aria-hidden', 'true');
            suggestionDiv.appendChild( spanElements[s] );
        }
        let reasonLabelSpan = html('span').class('SuggestionReasonLabel').innerHtml('Reason: ').attribute('aria-hidden','true').build();
        suggestionDiv.appendChild( reasonLabelSpan );
        spanElements = keywordsToHighlightSpans( suggestionInput, this.suggestion.reason );
        for ( let s = 0;  s < spanElements.length;  ++s ){
            spanElements[s].setAttribute('aria-hidden', 'true');
            suggestionDiv.appendChild( spanElements[s] );
        }

        let readerContent = 'Suggestion: ' + this.suggestion.title + '.\n Reason: ' + this.suggestion.reason;
        this.setAttribute('Suggestion', 'aria-label', readerContent );
    };

        SuggestionViewDisplay.prototype.
    handleSuggestionClick = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        if ( this.suggestion == null ){  return false;  }
        this.sliceDisplay.setTitleAndReason( this.suggestion.title, this.suggestion.reason );
    };
    



//////////////////////////////////////////////////////////////////////////////////////////////////
// Slice viewing display

        function
    SliceViewDisplay( sliceId ){
        // User-interface state variables (not persistent data)
        this.lastInputForSuggestions = { };  // [ title, reason, size ]
        ElementWrap.call( this );  // Inherit member data

        this.createFromHtml( sliceId, '\n\n' + [
            '<div class=Slice id=Slice>' ,

            '   <div class=SliceSize>' ,
            '       <h2 class=SliceSizeDisplay id=SliceSizeDisplay onclick=handleSizeDisplayClick></h2>' ,
            '   </div>' ,

            '   <div class=SliceDescription id=SliceDescription>' ,
            '       <div class=Message id=Message aria-live=polite></div>' ,

            '       <ul class=Suggestions id=Suggestions></ul>' ,
            '       <div class=Message id=messageForDescription aria-live=polite></div>' ,

            // Slices are always editable, because they are only viewed by their own creator/voter
            '       <div class=SliceInputs>' ,
            '           <div class=TitleEdit>' ,
            '               <label for=TitleInput> Title </label>' ,
            '               <input class=SliceTitleInput id=TitleInput placeholder="Type your budget item title, or choose a suggested title" ' ,
            '                   onfocus=handleFocus oninput=handleInput onkeydown=handleTitleKey onblur=handleInputBlur />' ,
            '           </div>' ,
            '           <div class=ReasonEdit>' ,
            '               <label class=SliceReasonLabel for=ReasonInput> Reason </label>' ,
            '               <textarea class=SliceReasonInput id=ReasonInput placeholder="Type your budget item reason, or choose a suggested reason" ' ,
            '                   onfocus=handleFocus oninput=handleInput onkeydown=handleReasonKey onblur=handleInputBlur ></textarea>' ,
            '           </div>' ,

            '           <div class=SizeEdit>' ,
            '               <label for=SizeInput> Percent of budget </label>' ,
            '               <input type=number class=SizeInput id=SizeInput  min=5 max=100 step=5 placeholder=10 ' ,
            '                   onfocus=handleFocus onclick=handleSizeClick onkeydown=handleSizeKey oninput=handleSizeInput onblur=handleSizeBlur />' ,
            '               <div class=Message id=messageForSize aria-live=polite></div>' ,
            '               <div class=ReasonForResize id=ReasonForBigger onclick=handleSizeBigger>' ,
            '                   <div class=SuggestionLabel> Larger reason: </div>' ,
            '                   <div class=SuggestionContent id=SuggestionContentBigger></div>' ,
            '               </div>' ,
            '               <div class=ReasonForResize id=ReasonForSmaller onclick=handleSizeSmaller>' ,
            '                   <div class=SuggestionLabel> Smaller reason: </div>' ,
            '                   <div class=SuggestionContent id=SuggestionContentSmaller></div>' ,
            '               </div>' ,
            '           </div>' ,

            '           <button class=SliceDeleteButton id=SliceDelete onclick=handleDelete aria-label="Delete"> X </button>' ,
            '       </div>' ,
            '   </div>' ,

            '</div>'
        ].join('\n') );
    }
    SliceViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

    // Set all data
        SliceViewDisplay.prototype.
    setAllData = function( sliceData, topDisp ){
        this.slice = sliceData;
        this.suggestions = [ ];
        this.suggestionDisplays = [ ];
        this.topDisp = topDisp;
        this.dataUpdated();
    };
    
    // Update html from data
        SliceViewDisplay.prototype.
    dataUpdated = function( ){
        // Messages
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.messageForDescription = showMessageStruct( this.messageForDescription, this.getSubElement('messageForDescription') );
        this.messageForSize = showMessageStruct( this.messageForSize, this.getSubElement('messageForSize') );
        let titleInput = this.getSubElement('TitleInput');
        let reasonInput = this.getSubElement('ReasonInput');
        let sizeInput = this.getSubElement('SizeInput');
        titleInput.setCustomValidity( this.titleValidity ? this.titleValidity : '' );
        reasonInput.setCustomValidity( this.reasonValidity ? this.reasonValidity : '' );
        sizeInput.setCustomValidity( this.sizeValidity ? this.sizeValidity : '' );

        // Set attributes
        this.setAttribute( 'TitleInput', 'disabled', (topDisp.isFrozen() ? TRUE : null) );
        this.setAttribute( 'ReasonInput', 'disabled', (topDisp.isFrozen() ? TRUE : null) );
        this.setAttribute( 'SizeInput', 'disabled', (topDisp.isFrozen() ? TRUE : null) );
        this.setAttribute( 'SliceDelete', 'disabled', (topDisp.isFrozen() ? TRUE : null) );

        let hasFocus =  this.topDisp  &&  (this.topDisp.lastFocusedSlice == this);
        this.setAttribute( 'Slice', 'hasFocus', ( hasFocus? TRUE : FALSE ) );

        // Set HTML content
        this.setInnerHtml( 'SuggestionContentSmaller', this.reasonSmaller );
        this.setInnerHtml( 'SuggestionContentBigger', this.reasonBigger );
        this.setStyle( 'ReasonForSmaller', 'display', (this.reasonSmaller ? null : 'none') );
        this.setStyle( 'ReasonForBigger', 'display', (this.reasonBigger ? null : 'none') );

        // Set title and reason-inputs
        titleInput.defaultValue = ( this.slice.title )?  this.slice.title  :  '';
        reasonInput.defaultValue = ( this.slice.reason )?  this.slice.reason  :  '';
        setTimeout(  function(){ fitTextAreaToText( reasonInput ); }  );

        // Set size-input value
        let sizeRemaining = 100 - this.topDisp.totalUsed;
        let defaultSize = Math.min( 10, sizeRemaining );
        sizeInput.defaultValue = ( this.slice.size )?  this.slice.size  :  defaultSize;
        this.setInnerHtml( 'SliceSizeDisplay', '' + sizeInput.value + '%' );

        // For each suggestion-data... ensure suggestion-display exists
        let suggestionsDiv = this.getSubElement('Suggestions');
        for ( let s = 0;  s < this.suggestions.length;  ++s ) {
            if ( ! this.suggestionDisplays[s] ){
                let suggestionDisplay = new SuggestionViewDisplay( s );  // Use index as display-id, because suggestion may change slice-id
                this.suggestionDisplays[s] = suggestionDisplay;
                suggestionsDiv.appendChild( suggestionDisplay.element );
            }
        }
        // For each suggestion-display... update suggestion-data
        for ( let s = 0;  s < this.suggestionDisplays.length;  ++s ){
            this.suggestionDisplays[s].setAllData( this.suggestions[s], this.topDisp, this );
        }

        setTimeout( alignRows, 300 );
    };


        SliceViewDisplay.prototype.
    setInputFocusAtEnd = function(  ){
        let titleInput = this.getSubElement('TitleInput');
        let reasonInput = this.getSubElement('ReasonInput');
        let lastInput = ( (! this.topDisp.areReasonsHidden()) && (reasonInput.value.length > 0) )?  reasonInput  :  titleInput;
        lastInput.focus();
        lastInput.selectionStart = lastInput.value.length;
        lastInput.selectionEnd = lastInput.value.length;
    };

        SliceViewDisplay.prototype.
    focusTitleInput = function( event ){  this.getSubElement('TitleInput').focus();  };


        SliceViewDisplay.prototype.
    handleTitleKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key... focus reason input
        if ( event.keyCode === KEY_CODE_ENTER ) {
            event.preventDefault();
            if ( this.topDisp.areReasonsHidden() ){  this.getSubElement('SizeInput').focus();  }
            else                                  {  this.getSubElement('ReasonInput').focus();  }
            return false;
        }
    };

        SliceViewDisplay.prototype.
    handleReasonKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key...
        if ( event.keyCode === KEY_CODE_ENTER ) {
            event.preventDefault();
            // Save slice
            let reasonInput = this.getSubElement('ReasonInput');
            reasonInput.blur();
            // Focus next slice input
            this.getSubElement('SizeInput').focus();
            return false;
        }
    };
    
        SliceViewDisplay.prototype.
    handleInput = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        fitTextAreaToText( this.getSubElement('ReasonInput') );

        // Set input-validity
        let titleInputValue = this.getSubElement('TitleInput').value;
        let reasonInputValue = this.getSubElement('ReasonInput').value;
        // Clear too-short messages 
        if ( this.titleTooShort  &&  (minLengthSliceTitle <= titleInputValue.length) ){
            this.messageForDescription = { text:'' };
            this.titleValidity = '';
            this.titleTooShort = false;
            this.dataUpdated();
        }
        if ( this.reasonTooShort  &&  (minLengthSliceReason <= reasonInputValue.length) ){
            this.messageForDescription = { text:'' };
            this.reasonValidity = '';
            this.reasonTooShort = false;
            this.dataUpdated();
        }

        // Suggest only if title+reason has at least 3 words, and just finished a word
        let titleWords = removeStopWords( tokenize( titleInputValue ) ).slice( 0, MAX_WORDS_INDEXED );
        let reasonWords = removeStopWords( tokenize( reasonInputValue ) ).slice( 0, Math.max(0, MAX_WORDS_INDEXED - titleWords.length) );
        let words = titleWords.concat( reasonWords );
        if ( !words  ||  words.length < 1  ||  MAX_WORDS_INDEXED < words.length ){  return;  }
        if ( !event  ||  !event.data  ||  ! event.data.match( /[\s\p{P}]/u ) ){  return;  }  // Require that current input is whitespace or punctuation

        // Suggest only if input is changed since last suggestion
        let content = words.join(' ');
        if ( content == this.lastContentStartRetrieved ){  return;   }
        this.lastContentStartRetrieved = content;

        // Retrieve top matching titles 
        this.retrieveSuggestions( titleWords, reasonWords, content );
    };


        SliceViewDisplay.prototype.
    handleInputBlur = function( ){  this.saveTitleAndReason();  };


        SliceViewDisplay.prototype.
    handleSizeDisplayClick = function( ){
        scrollToHtmlElement( this.getSubElement('SliceDescription') );
    };

        SliceViewDisplay.prototype.
    handleSizeClick = function( ){  };

        SliceViewDisplay.prototype.
    handleSizeKey = function( ){
        // ENTER key... blur, causing save
        if ( event.keyCode === KEY_CODE_ENTER ) {
            event.preventDefault();
            this.topDisp.focusNextSliceInput( this );
            return false;
        }
    };

        SliceViewDisplay.prototype.
    handleSizeBigger = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        let sizeInput = this.getSubElement('SizeInput')
        sizeInput.value = 5 + Number( sizeInput.value );
        this.handleSizeInput();
    };

        SliceViewDisplay.prototype.
    handleSizeSmaller = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        let sizeInput = this.getSubElement('SizeInput')
        sizeInput.value = -5 + Number( sizeInput.value );
        this.handleSizeInput();
    };

        SliceViewDisplay.prototype.
    handleSizeInput = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Delay so that save happens only for last keystroke in sequence, because adjustments may come fast
        clearTimeout( this.saveSizeTimer );
        let thisCopy = this;
        this.saveSizeTimer = setTimeout( function(){
            thisCopy.saveSize();
            thisCopy.delayRetrieveSizeSuggestions();
        } , 1000 );
    };

        SliceViewDisplay.prototype.
    delayRetrieveSizeSuggestions = function( ){
        // Retrieve suggested title/reasons
        // Delay retrieve, so that retrieve happens only for last keystroke in sequence
        clearTimeout( this.retrieveSuggestionsTimer );
        let thisCopy = this;
        this.retrieveSuggestionsTimer = setTimeout( function(){
            thisCopy.retrieveSizeSuggestions();
        } , 1000 );
    };

        SliceViewDisplay.prototype.
    handleFocus = function( ){
        let thisCopy = this;
        setTimeout( function(){
            thisCopy.topDisp.setLastFocusedSlice( thisCopy );
        } , 100 );
    };

        SliceViewDisplay.prototype.
    handleSizeBlur = function( ){
        this.saveSize();
    };

        SliceViewDisplay.prototype.
    hasFocus = function( ){
        let titleInput = this.getSubElement('TitleInput');
        let reasonInput = this.getSubElement('ReasonInput');
        let sizeInput = this.getSubElement('SizeInput');
        return (  0 <= [ titleInput, reasonInput, sizeInput ].indexOf( document.activeElement )  );
    };

        SliceViewDisplay.prototype.
    saveSize = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let sizeInput = this.getSubElement('SizeInput');
        let sizeInputValue = Number( sizeInput.value );

        // Enforce total-size limit by forcing value back into valid range
        let sizeDiff = sizeInputValue - this.slice.size;
        let newTotal = sizeDiff + this.topDisp.totalUsed;
        if ( 100 < newTotal ){
            this.messageForSize = { text:'Used 100% of budget', color:RED, ms:5000 };
            let sizeCorrection = 100 - newTotal;
            sizeInput.value = sizeInputValue + sizeCorrection;
            this.dataUpdated();
            return;
        }

        // Enforce slice-size limits, but allow temporarily invalid number for editing flexibility
        this.messageForSize = null;
        this.sizeValidity = '';
        let message = null;
        if ( sizeInputValue < 5 ){  message = 'Minimum amount is 5%';  }
        else if ( 100 < sizeInputValue ){  message = 'Maximum amount is 100%';  }
        else if ( sizeInputValue % 5 != 0 ){  message = 'Amounts must be a multiple of 5%';  }
        if ( message ){
            this.messageForSize = { text:message, color:RED, ms:5000 };
            this.sizeValidity = message;
            this.dataUpdated();
            return;
        }

        // If slice unchanged... do nothing
        if ( this.slice.size == sizeInputValue ){  return;  }

        // Save slice size, via ajax
        this.messageForSize = { text:'Saving size', color:GREY };
        this.dataUpdated();
        let thisCopy = this;
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.topDisp.linkKey.id ,
            sliceId:this.slice.id , size:sizeInputValue
        };
        let url = '/budget/sliceSetSize';
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData &&  receiveData.success ){
                if ( receiveData.vote ){
                    // Update size fields
                    thisCopy.slice.size = receiveData.vote.slices[ thisCopy.slice.id ];
                    thisCopy.topDisp.sliceSizeChanged( receiveData.vote.total );
                    thisCopy.messageForSize = { text:'Total allocated: ' + receiveData.vote.total + '%', color:GREEN, ms:5000 };
                }
            }
            else {
                let message = 'Failed to save budget slice size.';
                if ( receiveData  &&  receiveData.message == OVER_BUDGET ){
                    message = 'Over budget';
                }
                thisCopy.messageForSize = { color:RED, text:message };
            }
            thisCopy.dataUpdated();
        } );
    };


        SliceViewDisplay.prototype.
    retrieveSuggestions = function( titleWords, reasonWords, content ){

        titleWordsStr = titleWords.join(' ');
        reasonWordsStr = reasonWords.join(' ');

        // Request via ajax
        let thisCopy = this;
        let sendData = { title:titleWordsStr, reason:reasonWordsStr };
        let url = '/budget/slicesForPrefix/' + this.topDisp.linkKey.id;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){

                // Update slice suggestions
                let suggestionsChanged = false;
                if ( receiveData.slices ){
                    // Collect new suggestion & increment stats 
                    if ( ! thisCopy.suggestionToData ){  thisCopy.suggestionToData = { };  }  // { suggestionText:{ content:title+reason , matchScore:? , totalScore:? , ... } }
                    for ( let s = 0;  s < receiveData.slices.length;  ++s ){
                        let suggestionNew = receiveData.slices[s];
                        suggestionNew.content = [ suggestionNew.title, suggestionNew.reason ].filter(Boolean).join(' ');
                        if ( ! suggestionNew.content ){  continue;  }
                        if ( !(suggestionNew.content in thisCopy.suggestionToData) ){
                            thisCopy.topDisp.incrementWordCounts( suggestionNew.content );
                        }
                        thisCopy.suggestionToData[ suggestionNew.content ] = suggestionNew;
                    }
                    // Recompute all suggestion-scores in this question, with new IDF-weights
                    // Store scores inside suggestion-objects
                    for ( const suggestion in thisCopy.suggestionToData ){
                        let suggestionData = thisCopy.suggestionToData[ suggestion ];
                        suggestionData.scoreMatch = thisCopy.topDisp.wordMatchScore( content, suggestion );
                        suggestionData.scoreTotal =  suggestionData.score * suggestionData.scoreMatch;  // Vote-score * match-score
                    }
                    // Find top-scored suggestions
                    let topSuggestions = Object.values( thisCopy.suggestionToData ).sort( (a,b) => (b.scoreTotal - a.scoreTotal) ).slice( 0, 3 );

                    // Check whether top-suggestions changed: old-suggestion not found in new-suggestions 
                    suggestionsChanged = ( thisCopy.suggestions.length != topSuggestions.length );
                    thisCopy.suggestions.map(  suggestionOld  =>  ( 
                        suggestionsChanged |=  ! topSuggestions.find(suggestionNew => (suggestionNew.content == suggestionOld.content)) )  );

                    thisCopy.suggestions = topSuggestions;
                }

                // Alert screen-reader user that suggestions updated
                if ( suggestionsChanged  &&  thisCopy.suggestionsRetrieved ){
                    thisCopy.messageForDescription = { text:'Suggestions updated', color:GREY, ms:3000 };
                }
                thisCopy.suggestionsRetrieved = true;
                thisCopy.dataUpdated();
            }
        } );
    };


        SliceViewDisplay.prototype.
    retrieveSizeSuggestions = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        if ( this.sizeValidity ){  return;  }  // Do not suggest when size is invalid

        let titleInputValue = this.getSubElement('TitleInput').value.trim();
        let sizeInputValue = Number( this.getSubElement('SizeInput').value );

        // Suggest only if input changed since last suggestion
        if ( this.lastInputForSuggestions
             && (titleInputValue == this.lastInputForSuggestions.title)
             && (sizeInputValue == this.lastInputForSuggestions.size) ){
            return;
        }
        this.lastInputForSuggestions.title = titleInputValue;
        this.lastInputForSuggestions.size = sizeInputValue;

        // Request via ajax
        let thisCopy = this;
        let sendData = {  title:titleInputValue , size:sizeInputValue  };
        let url = '/budget/sliceSizeReasons/' + this.topDisp.linkKey.id;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData && receiveData.success ){
                // Update size suggestions
                thisCopy.reasonSmaller = ( receiveData.sliceSmaller )? receiveData.sliceSmaller.reason  :  '';
                thisCopy.reasonBigger = ( receiveData.sliceBigger )?  receiveData.sliceBigger.reason  :  '';
                thisCopy.dataUpdated();
            }
        } );
    };

        SliceViewDisplay.prototype.
    setTitleAndReason = function( title, reason ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInput = this.getSubElement('TitleInput');
        let reasonInput = this.getSubElement('ReasonInput');
        titleInput.value = title;
        reasonInput.value = reason;

        this.saveTitleAndReason();
    };

        SliceViewDisplay.prototype.
    saveTitleAndReason = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInputValue = this.getSubElement('TitleInput').value.trim();
        let reasonInputValue = this.getSubElement('ReasonInput').value.trim();
        let sizeInputValue = Number( this.getSubElement('SizeInput').value );

        // If slice unchanged... do nothing
        if ( (this.slice.title == titleInputValue) && (this.slice.reason == reasonInputValue) ){  return;  }

        // If title is duplicate... warn, do not save
        if ( 1 < this.topDisp.titleDisplayCount( titleInputValue ) ){
            this.messageForDescription = { color:RED, text:'Another slice with the same title already exists' };
            this.titleValidity = this.messageForDescription.text;
            this.dataUpdated();
            return;
        }

        // Check title and reason lengths
        if ( titleInputValue.length < minLengthSliceTitle ){
            this.messageForDescription = { color:RED, text:'Title is too short' };
            this.titleValidity = this.messageForDescription.text;
            this.titleTooShort = true;
            this.dataUpdated();
            return;
        }
        if ( (!this.topDisp.areReasonsHidden()) && (reasonInputValue.length < minLengthSliceReason) ){
            this.messageForDescription = { color:RED, text:'Reason is too short' };
            this.reasonValidity = this.messageForDescription.text;
            this.reasonTooShort = true;
            this.dataUpdated();
            return;
        }

        // Save via ajax
        this.messageForDescription = { color:GREY, text:'Saving budget item...' };
        this.titleValidity = '';
        this.reasonValidity = '';
        this.dataUpdated();
        let thisCopy = this;
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.topDisp.linkKey.id , sliceId:this.slice.id ,
            title:titleInputValue , reason:reasonInputValue , size:sizeInputValue
        };
        let url = '/budget/sliceVote';
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                if ( receiveData.slice ){
                    thisCopy.slice.title = receiveData.slice.title;
                    thisCopy.slice.reason = receiveData.slice.reason;
                    thisCopy.slice.id = receiveData.slice.id;
                    // Slice changes id, but slice/budget displays use old id
                }
                thisCopy.messageForDescription = { color:GREEN, text:'Saved budget item', ms:3000 };
            }
            else {
                let message = 'Failed to save budget slice';
                if ( receiveData  &&  receiveData.message == OVER_BUDGET ){  message = 'Over budget';  }
                thisCopy.messageForDescription = { color:RED, text:message };
                thisCopy.titleValidity = message;
                thisCopy.reasonValidity = message;
            }
            thisCopy.dataUpdated();
        } );
    };


        SliceViewDisplay.prototype.
    handleDelete = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        if ( this.slice.id == null ){  this.topDisp.sliceDeleted( this );  return;  }

        // Delete slice, via ajax
        this.message = { color:GREY, text:'Deleting budget slice...' };
        this.dataUpdated();
        let thisCopy = this;
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.topDisp.linkKey.id , sliceId:this.slice.id
        };
        let url = '/budget/sliceDelete';
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.message = { color:GREEN, text:'Deleted budget item', ms:3000 };
                thisCopy.dataUpdated();
                thisCopy.topDisp.sliceDeleted( thisCopy );  // Delete by display-object, not slice-id because it keeps changing
                if ( receiveData.vote ){
                    thisCopy.topDisp.sliceSizeChanged( receiveData.vote.total );
                }
            }
            else {
                let message = 'Failed to delete budget item';
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };

    

//////////////////////////////////////////////////////////////////////////////////////////////////
// Budget viewing display

        function
    BudgetViewDisplay( budgetId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data

        this.createFromHtml( budgetId, '\n\n' + [
            '   <h1 class=title> Budget </h1>' ,
            '   <div class=Budget id=Budget>' ,
            '       <div class=Message id=Message aria-live=polite></div>' ,
            '       <div class=Message id=freezeMessage aria-live=polite></div>' ,
            '       <div class=loginStatus id=loginStatus></div>' ,
            '       <div class=hideReasonsStatus id=hideReasonsStatus></div>' ,

            '       <div class=BudgetDescription>' ,
            '           <h2 class=Title id=BudgetTitle></h2>' ,
            '           <div class=BudgetIntroduction id=BudgetIntroduction></div>' ,
            '           <div class=TotalAvailable id=TotalAvailable></div>' ,
            '           <div class=TotalUsed id=TotalUsed></div>' ,
            '       </div>' ,

            '       <div class=Slices id=Slices>' ,
            '           <div class="Slice" id=ColumnTitles>' ,
            '               <div class=SliceSizeDisplay onclick=SizeColumnTitleClick' ,
            '                   ><span class=AmountWord>Amount</span><span class=AmountSymbol>%</span></div>' ,
            '               <div class=SliceDescription> Budget Item </div>' ,
            '           </div>' ,
            '           <div class="Slice NewSliceRow" id=NewSliceRow>' ,
            '               <div class=SliceSizeDisplay onclick=NewSliceDisplayClick aria-label="Add budget item">+</div>' ,
            '               <div class=SliceDescription>' ,
            '                   <div class=NewSlice>' ,
            '                       <h3> New budget item </h3>' ,
            '                       <label for=NewSliceTitleInput> Title </label>' ,
            '                       <input type=text class=NewSliceTitleInput id=NewSliceTitleInput placeholder="" ' ,
            '                           oninput=handleNewSliceInput>' ,
            '                   </div>' ,
            '                   <div class=Message id=bottomMessage aria-live=polite></div>' ,
            '               </div>' ,
            '           </div>' ,
            '       </div>' ,
            '       <button class=BudgetResultsButton id=BudgetResultsButton onclick=onBudgetResults> Budget Results </button>' ,

            // Admin change history
            '       <details class=adminHistory id=adminHistory> ',
            '           <summary class=adminHistoryLast id=adminHistoryLast></summary> ',
            '           <div class=adminHistoryFull id=adminHistoryFull></div> ',
            '       </details> ',

            '       <svg class=lines id=lines width=100% height=100% ></svg>' ,
            '   </div>'
        ].join('\n') );
    }
    BudgetViewDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

    // Set all data
        BudgetViewDisplay.prototype.
    setAllData = function( budgetData, topDisp ){
        this.budget = budgetData;
        this.topDisp = topDisp;
        this.slices = [ ];  // sequence[ { id:string, data:{...}, display:{...} } ] 
        this.totalUsed = 0;
        this.dataUpdated();
    };
    
    // Update html from data
        BudgetViewDisplay.prototype.
    dataUpdated = function( ){

        document.title = SITE_TITLE + ': ' + this.budget.title;

        // Edit link in menu
        if ( this.budget.allowEdit ){  document.body.setAttribute( 'menuedit', 'true' );  }
        else                        {  document.body.removeAttribute( 'menuedit' );  }

        // Message
        if ( this.budget  &&  this.budget.linkOk ) {
            // If link message ok not already shown... show link ok message
            if ( this.budget.mine  &&  ( ! this.linkMessage  ||  ! this.linkMessage.okShown )  ){
                this.linkMessage = { color:GREEN, text:'Your budget is created. You can email this webpage\'s URL to participants.', ms:10000 };
                showMessageStruct( this.linkMessage, this.getSubElement('Message') );
                this.linkMessage.okShown = true;  // Make sure ok-link message does not re-appear every time dataUpdated() runs
            }
        }
        else {
            this.linkMessage = { color:RED, text:'Invalid link' };
            this.linkMessage = showMessageStruct( this.linkMessage, this.getSubElement('Message') );
        }
        let bottomMessageText = ( 100 <= this.totalUsed )?  'Budget full'  :  '';
        this.bottomMessage = { color:GREEN, text:bottomMessageText };
        this.bottomMessage = showMessageStruct( this.bottomMessage, this.getSubElement('bottomMessage') );

        if ( this.topDisp.linkKey.loginRequired ){
            this.setInnerHtml( 'loginStatus', 'Voter login required' );
        }
        else {
            this.setInnerHtml( 'loginStatus', (this.budget.mine ? 'Browser login only' : null) );
        }
        this.setInnerHtml( 'hideReasonsStatus', (this.budget.hideReasons ? 'Reasons hidden' : null) );

        // Set freeze-message and frozen-attribute
        this.freezeMessage = {  color:RED , text:(this.isFrozen() ? 'Frozen' : null)  };
        this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeMessage') );
        this.setAttribute( 'Budget', 'frozen', (this.isFrozen() ? TRUE : null) );

        this.setAttribute( 'Budget', 'mine', (this.budget.mine ? TRUE : null) );
        this.setAttribute( 'Budget', 'hidereasons', (this.budget.hideReasons ? TRUE : null) );
        this.setAttribute( 'NewSliceTitleInput', 'disabled', ( this.isFrozen() || (100 <= this.totalUsed) ? TRUE : null) );

        this.setInnerHtml( 'BudgetTitle', this.budget.title );
        this.setInnerHtml( 'BudgetIntroduction', storedTextToHtml(this.budget.introduction) );
        this.setInnerHtml( 'TotalAvailable', 'Total budget: ' + this.budget.total );
        this.setInnerHtml( 'TotalUsed', 'Percent used: ' + (this.totalUsed ?  ''+this.totalUsed+'%'  : '') );

        displayAdminHistory( this.budget.adminHistory, this.getSubElement('adminHistoryLast'), this.getSubElement('adminHistoryFull') );

        // For each slice...
        let slicesDiv = this.getSubElement('Slices');
        for ( let s = 0;  s < this.slices.length;  ++s ){
            let slice = this.slices[s];
            // Ensure data has display 
            if ( slice.data  &&  ! slice.display ){
                slice.display = this.addSliceDisplay( slice.data );
            }
            // Remove display without data 
            else if ( slice.display  &&  ! slice.data ){
                slicesDiv.removeChild( slice.display.element );  // Remove from webpage 
                slice.display = null;
            }
            // Nullify slice without data or display
            if ( ! slice.data  &&  ! slice.display ){  this.slices[s] = null;  }
        }
        this.slices = this.slices.filter(s => s);  // Remove nulls 
        // Update sub-displays
        for ( let s = 0;  s < this.slices.length;  ++s ){
            this.slices[s].display.dataUpdated();
        }
    };

        BudgetViewDisplay.prototype.
    SizeColumnTitleClick = function( ){
        scrollToHtmlElement( this.getSubElement('ColumnTitles') );
    };

        BudgetViewDisplay.prototype.
    NewSliceDisplayClick = function( ){
        scrollToHtmlElement( this.getSubElement('NewSliceRow') );
    };

        BudgetViewDisplay.prototype.
    handleNewSliceInput = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        if ( 100 <= this.totalUsed ){  return;  }  // Cannot add new slice when budget is all used up

        let newSliceTitleInput = this.getSubElement('NewSliceTitleInput');
        if ( newSliceTitleInput.value.length <= 0 ){  return;  }

        // Clear and hide new-slice input 
        let title = newSliceTitleInput.value;
        newSliceTitleInput.value = '';
        let newSliceTitleInputJquery = jQuery( newSliceTitleInput );
        newSliceTitleInputJquery.hide();

        // Add new slice data and display, containing start of slice-title
        // Add display here (versus in dataUpdated()) to also modify display here
        let sliceData = { id:null, title:null, reason:null };
        let sliceDisplay = this.addSliceDisplay( sliceData );
        sliceDisplay.getSubElement('TitleInput').value = title;
        this.slices.push(  { id:sliceData.id , data:sliceData , display:sliceDisplay }  );

        // Initialize display input fields
        sliceDisplay.titleInputValue = title;
        sliceDisplay.dataUpdated();
        sliceDisplay.setInputFocusAtEnd();

        // Transition in new-slice input, as if it were newly added to page 
        newSliceTitleInputJquery.slideToggle();
    };

        BudgetViewDisplay.prototype.
    addSliceDisplay = function( sliceData ){
        // Create display
        sliceDisplay = new SliceViewDisplay( sliceData.id );
        sliceDisplay.setAllData( sliceData, this.topDisp, this );

        // Add display second-to-last in slices-div, before new-slice-form
        let slicesDiv = this.getSubElement('Slices');
        jQuery( sliceDisplay.element ).hide();
        let newSliceRow = this.getSubElement('NewSliceRow');
        jQuery( sliceDisplay.element ).insertBefore( jQuery(newSliceRow) );
        jQuery( sliceDisplay.element ).slideToggle();

        return sliceDisplay;
    };


        BudgetViewDisplay.prototype.
    sliceDeleted = function( sliceDisplay ){
        for ( let s = 0;  s < this.slices.length;  ++s ){
            let slice = this.slices[s];
            if ( sliceDisplay == slice.display ){
                slice.data = null;
            }
        }

        this.dataUpdated();
    };


        BudgetViewDisplay.prototype.
    areReasonsHidden = function(){  return this.budget.hideReasons;  }

        BudgetViewDisplay.prototype.
    isFrozen = function( ){  return this.budget && this.budget.freezeUserInput;  };

        BudgetViewDisplay.prototype.
    focusNextSliceInput = function( sliceDisplay ){
        // If last slice... focus new-slice-input
        if ( sliceDisplay.element.nextElementSibling.classList.contains('NewSliceRow') ){
            this.getSubElement('NewSliceTitleInput').focus();
            return;
        }
        // Find slice display that matches nextElementSibling... focus new-answer input
        for ( let s = 0;  s < this.slices.length;  ++s ){
            let slice = this.slices[s];
            if ( slice.display  &&  (slice.display.element == sliceDisplay.element.nextElementSibling) ){
                slice.display.focusTitleInput();
                break;
            }
        }
    };


        BudgetViewDisplay.prototype.
    titleDisplayCount = function( title ){
        return this.slices.reduce(
            (agg, s) =>  agg += ( s && s.display && (title == s.display.getSubElement('TitleInput').value.trim()) )? 1 : 0 ,
            0  );
    };


        BudgetViewDisplay.prototype.
    setLastFocusedSlice = function( sliceDisplay ){
        this.lastFocusedSlice = sliceDisplay;
        this.dataUpdated();
    };


        BudgetViewDisplay.prototype.
    sliceSizeChanged = function( sizeTotal ){
        this.totalUsed = sizeTotal;
        this.dataUpdated();
    };

    
        BudgetViewDisplay.prototype.
    retrieveDataUpdate = function( ){  return this.retrieveData();  };

        BudgetViewDisplay.prototype.
    retrieveData = function( ){
        // Request via ajax
        let thisCopy = this;
        let sendData = { };
        let url = '/budget/budget/' + this.topDisp.linkKey.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.budget.linkOk = true;
                if ( receiveData.budget ){
                    // Update budget fields
                    thisCopy.budget.title = receiveData.budget.title;
                    thisCopy.budget.introduction = receiveData.budget.introduction;
                    thisCopy.budget.allowEdit = receiveData.budget.allowEdit;
                    thisCopy.budget.adminHistory = receiveData.budget.adminHistory;
                    thisCopy.budget.freezeUserInput = receiveData.budget.freezeUserInput;
                    thisCopy.budget.id = receiveData.budget.id;
                    thisCopy.budget.mine = receiveData.budget.mine;
                    thisCopy.budget.total = receiveData.budget.total;
                    thisCopy.budget.hideReasons = receiveData.budget.hideReasons;
                }
                if ( receiveData.linkKey ){
                    thisCopy.linkKey.loginRequired = receiveData.linkKey.loginRequired;
                }
                // Retrieve slices data, async
                thisCopy.retrieveSlices();
                thisCopy.dataUpdated();
            }
            else {
                if ( receiveData  &&  (receiveData.message == BAD_LINK) ){
                    thisCopy.budget.linkOk = false;
                    thisCopy.dataUpdated();
                }
            }
        } );
    };
    
        BudgetViewDisplay.prototype.
    retrieveSlices = function( ){

        // Request via ajax
        let thisCopy = this;
        let sendData = { };
        let url = '/budget/slicesForUser/' + this.topDisp.linkKey.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                thisCopy.budget.linkOk = true;
                if ( receiveData.slices ){
                    // Mark all old slices un-updated
                    let sliceIdToSlice = { };
                    for ( let s = 0;  s < thisCopy.slices.length;  ++s ){
                        let slice = thisCopy.slices[s];
                        slice.updated = false;
                        if ( slice.data ){  sliceIdToSlice[ slice.data.id ] = slice;  }
                    }

                    // Merge retrieved-slice-vote-sizes into retrieved-slices
                    for ( let sliceId in receiveData.slices ){
                        let sliceReceived = receiveData.slices[ sliceId ];
                        let sliceVote = ( receiveData.votes && receiveData.votes.slices )?  receiveData.votes.slices[ sliceId ]  :  null;
                        sliceReceived.size = sliceVote;
                    }

                    // Sort retrieved-slices by size
                    let receivedSlicesBySize = Object.values( receiveData.slices );
                    receivedSlicesBySize.sort( (a,b) => (b.size - a.size) );

                    // For each received slice data, ordered by size...
                    for ( let s = 0;  s < receivedSlicesBySize.length;  ++s ){
                        let sliceReceived = receivedSlicesBySize[s];
                        let slice = sliceIdToSlice[ sliceReceived.id ];
                        if ( slice == null ){
                            // Collect slice data
                            slice = { data:sliceReceived, updated:true };
                            thisCopy.slices.push( slice );
                        }
                        else {
                            // Update slice fields
                            // Do not replace slice-object, since slice-display shares that reference
                            slice.data.title = sliceReceived.title;
                            slice.data.reason = sliceReceived.reason;
                            slice.data.size = sliceReceived.size;
                            slice.updated = true;
                        }
                    }
                    // Delete non-updated slice data
                    for ( let s = 0;  s < thisCopy.slices.length;  ++s ){
                        let slice = thisCopy.slices[ s ];
                        // Delete slice that was deleted by another client -- but not new slices
                        if ( ! slice.updated  &&  slice.data  &&  slice.data.id ){  slice.data = null;  }
                    }
                }

                if ( receiveData.votes ){
                    thisCopy.totalUsed = receiveData.votes.total;
                }

            } else {
                if ( receiveData && receiveData.message == BAD_LINK ){
                    thisCopy.budget.linkOk = false;
                }
            }
            thisCopy.dataUpdated();
        } );
    };


        BudgetViewDisplay.prototype.
    incrementWordCounts = function( suggestion ){  
        if ( ! this.wordToCount ){  this.wordToCount = { };  }
        return incrementWordCounts( suggestion, this.wordToCount );
    };

        BudgetViewDisplay.prototype.
    wordMatchScore = function( input, suggestion ){
        if ( ! this.wordToCount ){  return 0;  }
        return wordMatchScore( input, suggestion, this.wordToCount );
    };


        BudgetViewDisplay.prototype.
    onBudgetResults = function( ){
        setFragmentFields( {page:FRAG_PAGE_BUDGET_RESULT} );
    };

    



//////////////////////////////////////////////////////////////////////////////////////////////////
// Global methods
    
        function
    drawRowConnections( columnsDiv ){
        let rowDivs = columnsDiv.getElementsByClassName('Slice');

        let linesSvg = topDisp.getSubElement('lines');
        if ( linesSvg == null ){  return;  }
        let linesSvgRect = linesSvg.getBoundingClientRect();

        // Redraw everything
        clearChildren( linesSvg );

        // For each row... draw connecting line from quantity to reason
        for ( let r = 0;  r < rowDivs.length;  ++r ){
            let rowDiv = rowDivs[r];
            let quantityDiv = rowDiv.getElementsByClassName('SliceSizeDisplay')[0];
            let reasonDiv = rowDiv.getElementsByClassName('SliceDescription')[0];
            if ( (!quantityDiv) || (!reasonDiv) ){  continue;  }

            let quantityRect = quantityDiv.getBoundingClientRect();
            let reasonRect = reasonDiv.getBoundingClientRect();

            // Get or create vector-graphics polygon
            let polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            linesSvg.appendChild( polygon );
            // Update polygon location
            let margin = 2;
            let point1 = [ quantityRect.right , quantityRect.top + margin - linesSvgRect.top ].join(',');
            let point2 = [ quantityRect.right , quantityRect.bottom - margin - linesSvgRect.top ].join(',');
            let point3 = [ reasonRect.left , reasonRect.bottom - margin - linesSvgRect.top ].join(',');
            let point4 = [ reasonRect.left , reasonRect.top + margin - linesSvgRect.top ].join(',');
            polygon.setAttributeNS( null, 'points', [point1, point2, point3, point4].join(' ') );
            polygon.setAttribute( 'fill', rowToBackgroundColor(r) );

            // Update border lines
            drawLine( '#888888', linesSvg, rowDiv, 'topLine',
                quantityRect.right, quantityRect.top - linesSvgRect.top,
                reasonRect.left, reasonRect.top - linesSvgRect.top );
            if ( r+1 == rowDivs.length ){
                // Bottom border line
                drawLine( '#888888', linesSvg, rowDiv, 'bottomLine',
                    quantityRect.right, quantityRect.bottom - linesSvgRect.top,
                    reasonRect.left, reasonRect.bottom - linesSvgRect.top );
            }

        }
    }

        
        function
    drawLine( color, linesSvg, owner, key, x1, y1, x2, y2 ){
        // Get or create vector-graphics line
        let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute( 'stroke', color );
        linesSvg.appendChild( line );
        // Update line location
        line.setAttribute( 'x1', x1 );
        line.setAttribute( 'y1', y1 );
        line.setAttribute( 'x2', x2 );
        line.setAttribute( 'y2', y2 );
    }


        function
    updateQuantityHeights( columnsDiv, nextCellY, totalQuantity ){

        // For each row... set size and position
        let rowDivs = columnsDiv.getElementsByClassName('Slice');

        let windowHeight = jQuery(window).height();  // More general than window.innerHeight
        let quantityHeight = windowHeight - 50;   // Leave margin for column-titles

        for ( let r = 0;  r < rowDivs.length;  ++r ){
            let rowDiv = rowDivs[r];
            // Set quantity height = quantityInput.value
            let quantityDiv = rowDiv.getElementsByClassName('SliceSizeDisplay')[0];
            let quantityInput = rowDiv.getElementsByClassName('SizeInput')[0];
            let reasonDiv = rowDiv.getElementsByClassName('SliceDescription')[0];
            let height = ( quantityInput && quantityInput.value )?  (0.01 * quantityInput.value * quantityHeight)  :  30;
            if ( rowDiv.classList.contains('NewSliceRow') ){
                height = (100 - totalQuantity) * 0.01 * quantityHeight;
            }
            if ( quantityDiv ){
                quantityDiv.style.height = '' + height + 'px';
                quantityDiv.style.top = '' + nextCellY + 'px';
            }
            // Set quantity position
            nextCellY += parseInt( height );

            let backgroundColor = rowToBackgroundColor( r );
            if ( quantityDiv ){  quantityDiv.style.backgroundColor = backgroundColor;  }
            if ( reasonDiv ){  reasonDiv.style.backgroundColor = backgroundColor;  }
        }

        // Draw quantity-to-reason connecting lines/shapes
        drawRowConnections( columnsDiv );
    }
    
        function
    rowToBackgroundColor( rowNumber ){  return ( rowNumber % 2 == 0 )?  '#eeeeee'  :  '#f8f8f8';  }



    // iOS issues:
    //     There seems to be lag reporting new element positions, preventing lines update (even just on timer)
    //     And scrolling seems to happen just in the viewport, not moving elements

        function
    alignRows( ){
        if ( (typeof topDisp == 'undefined')  ||  (! topDisp)  ||  (! topDisp.doAlignBudgetSliceRows) ){  return;  }

        let columnsDiv = topDisp.getSubElement('Slices');
        if ( columnsDiv == null ){  return;  }
        let columnsRect = columnsDiv.getBoundingClientRect();

        let linesSvg = topDisp.getSubElement('lines');
        let linesRect = linesSvg.getBoundingClientRect();
        let docRect = document.documentElement.getBoundingClientRect();

        // Find total slice-size quantity
        let quantityInputs = columnsDiv.getElementsByClassName('SizeInput');
        let totalQuantity = 0;
        for ( let q = 0;  q < quantityInputs.length;  ++q ){
            totalQuantity += parseInt( quantityInputs[q].value );
        }

        // Align quantity-column to reason-column proportionally
        let documentRect = document.documentElement.getBoundingClientRect()
        let columnsYAbsolute = columnsRect.top - documentRect.top;
        let windowHeight = jQuery(window).height();  // More general than window.innerHeight

        // While table is below mid-screen... Align tops
        // While table is above mid-screen... align bottoms
        // Sizes must travel from top-at-middle to bottom-at-middle in the same distance that descriptions travel those 2 points
        // Sizes travel rate = height(sizes) / height(descriptions)
        let nextCellY = null;  // Style, position relative to document top
        if ( columnsRect.top > windowHeight/2 ){
            // When columns are at bottom of the screen (below the middle)... align column tops
            nextCellY = columnsYAbsolute;
        }
        else if ( columnsRect.bottom < windowHeight/2 ){
            // When columns are at top of the screen (above the middle)... align column bottoms
            nextCellY = columnsRect.top - totalQuantity + columnsRect.height - documentRect.top;
        }
        else {
            // When columns are in the middle of the screen... smoothly scroll columns at different rates
            let amountReasonsScrolled = columnsRect.height - ( columnsRect.bottom - (windowHeight/2) );
            let fractionReasonsScrolled = amountReasonsScrolled / columnsRect.height;
            let amountToScrollQuantities = (totalQuantity - columnsRect.height) * fractionReasonsScrolled;
            nextCellY = columnsRect.top - amountToScrollQuantities - documentRect.top;
        }
        nextCellY = 0;  // Start size-display at top of screen

        updateQuantityHeights( columnsDiv, nextCellY, totalQuantity );
    }



