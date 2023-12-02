// Displays based on ElementWrap

// Ranking-question with edit/view/result-states, which can retrieve data and update cached structs


/////////////////////////////////////////////////////////////////////////////////
// Display for option

        function
    RankingOptionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        let thisCopy = this;
        this.resultDisplays = {  data:[]  };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=RankingOptionDisplay id=Option> ',
            //  Edit
            '   <div class=Edit> ',
            '       <div class=EditRow> ',
            '           <div> ',
            '               <input class=OptionContentInput id=OptionContentInput placeholder="" ',
            '                   onblur=handleEditOptionSave oninput=handleEditOptionInput /> ',
            '           </div><div class=OptionDeleteButtonCell> ',
            '               <button class=OptionDeleteButton title="Delete" onclick=handleDeleteClick> X </button> ',
            '           </div> ',
            '       </div> ',
            '   </div> ',
            //  View
            '   <div class=View> ',
            '       <div for=RankingInput id=RankingLabel class=RankingLabel></div> ',
            '       <div class=RankingInputWrap> ',
            '           <input type=number min=1 max=30 class=OptionPositionInput id=RankingInput title="Rank" required oninput=onPositionInput /> ',
            '       </div> ',
            '       <button class="RankingIncrementButton UpButton" id=RankingUpButton onclick=rankingUpClick onfocus=onReasonInputFocus onblur=onReasonInputBlur > &uarr; </button> ',
            '       <div class=ReasonCell> ',
            '           <textarea ',
            '               class=ReasonInput id=ReasonInput title="Reason" placeholder="Because..." oninput=handleReasonInput ',
            '               onfocus=onReasonInputFocus onblur=onReasonInputBlur ',
            '           ></textarea/> ',
            '       </div> ',
            '       <button class="RankingIncrementButton DownButton" id=RankingDownButton onclick=rankingDownClick onfocus=onReasonInputFocus onblur=onReasonInputBlur> &darr; </button> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '       <details> ',
            '           <summary> ',
            '               <div class=OptionResultContent id=OptionResultContent></div> ',
            '               <div id=OptionResultRank class=OptionResultRank></div> ',
            '           </summary> ',
            '           <div id=OptionRankingResults class=OptionRankingResults></div> ',
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
    RankingOptionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        RankingOptionDisplay.prototype.
    setInitialData = RatingOptionDisplay.prototype.setInitialData;

        RankingOptionDisplay.prototype.
    setData = RatingOptionDisplay.prototype.setData;

    // Update this.element
        RankingOptionDisplay.prototype.
    dataUpdated = function( ){
        this.rankingInput = this.getSubElement('RankingInput');
        this.reasonInput = this.getSubElement('ReasonInput');

        this.messagesUpdated();
        this.attributesUpdated();

        // Edit
        this.setProperty( 'OptionContentInput', 'defaultValue', this.option.title );
        this.setProperty( 'OptionContentInput', 'disabled', ! this.questionDisplay.isQuestionValid() );

        // View
        this.setInnerHtml( 'RankingLabel', this.option.title );
        this.setProperty( 'RankingInput', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'RankingUpButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'ReasonInput', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'RankingDownButton', 'disabled', ! this.questionDisplay.allowInput() );

        let hasSuggestUp = this.suggest  &&  this.suggest.up  &&  this.suggest.up.lastSubkey;
        if (  hasSuggestUp  &&  ( this.rankingInput.value < parseInt(this.suggest.up.parentSubkey) )  ){
            let suggestUpText = '&uarr; ' + this.suggest.up.lastSubkey;
            displayHighlightedContent( storedTextToHtml(suggestUpText), this.highlightWords, this.getSubElement('RankingUpButton') );
            this.setStyle( 'RankingUpButton', 'display', null );
        }
        else {  this.setStyle( 'RankingUpButton', 'display', 'none' );  }

        let hasSuggestDown = this.suggest  &&  this.suggest.down  &&  this.suggest.down.lastSubkey;
        if (  hasSuggestDown  &&  ( parseInt(this.suggest.down.parentSubkey) < this.rankingInput.value )  ){
            let suggestDownText = '&darr; ' + this.suggest.down.lastSubkey;
            displayHighlightedContent( storedTextToHtml(suggestDownText), this.highlightWords, this.getSubElement('RankingDownButton') );
            this.setStyle( 'RankingDownButton', 'display', null );
        }
        else {  this.setStyle( 'RankingDownButton', 'display', 'none' );  }

        // Set min and max based on number of options
        this.rankingInput.min = 1;
        this.rankingInput.max = this.questionDisplay.question.options.length;

        setTimeout( () => fitTextAreaToText(thisCopy.reasonInput) , 100 );

        // Override rank if this option got pushed by another rank change, but not if user temporarily set rank before reason
        let rank = this.index + 1;
        if ( this.storedRatingChanged ){  this.rankingInput.value = rank;  }
        else {  this.rankingInput.defaultValue = rank;  }

        this.reasonInput.defaultValue = ( this.answer )?  ( this.answer.reason || '' )  :  '';

        // Result
        this.setInnerHtml( 'OptionResultRank', this.index + 1 );
        this.setInnerHtml( 'OptionResultContent', this.option.title );

        // Subdisplays for results
        let thisCopy = this;
        this.resultDisplays.data = ( this.results )?  this.results.filter( r => r.votes && (0 < r.votes) ).sort( (a,b) => a.rating - b.rating )  :  [];
        this.resultDisplays.data.forEach(  r => { r.key = String(r.rating) }  );  // Ensure each data has a key string
        this.updateSubdisplays( this.resultDisplays, this.getSubElement('OptionRankingResults') ,
            ( optionRankResult ) => {
                return new RatingResultDisplay( thisCopy.surveyDisplay.link.id, thisCopy.questionDisplay.question.id, thisCopy.option.id, optionRankResult.ranking )
                    .setInitialData( thisCopy )
            }
        );
        let optionVotes = this.totalVotes();
        if ( this.resultDisplays.displays ){   this.resultDisplays.displays.forEach(  (r,i) => { r.setData(thisCopy.resultDisplays.data[i], optionVotes); }  );   }
    };

        RankingOptionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('optionMessage') );
        this.moreMessage = showMessageStruct( this.moreMessage, this.getSubElement('moreMessage') );
        this.getSubElement('OptionContentInput').setCustomValidity( this.optionValidity || '' );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    };

        RankingOptionDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'Option', 'rankingInputFocused', (this.rankingInputFocused ? TRUE : null) );
    };

        RankingOptionDisplay.prototype.
    totalVotes = RatingOptionDisplay.prototype.totalVotes;

        RankingOptionDisplay.prototype.
    setMode = function( newMode ){  this.mode = newMode;  this.storedRatingChanged = true;  this.dataUpdated();  };

        RankingOptionDisplay.prototype.
    handleEditOptionInput = RatingOptionDisplay.prototype.handleEditOptionInput;

        RankingOptionDisplay.prototype.
    handleEditOptionCancelClick = RatingOptionDisplay.prototype.handleEditOptionCancelClick;

        RankingOptionDisplay.prototype.
    handleEditOptionSave = RatingOptionDisplay.prototype.handleEditOptionSave;


        RankingOptionDisplay.prototype.
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
            let input = thisCopy.rankingInput;
            let inputChanged = ( input.getAttribute('defaultValue') != input.value );
            let newValue = parseInt( input.value );
            if ( newValue < input.min  ||  input.max < newValue  ||  newValue.toString() != input.value.trim() ){  newValue = null;  }
            if ( newValue ){  input.classList.remove('invalid');  } else {  input.classList.add('invalid');  }
            if ( ! newValue  ||  newValue < 1  ||  ! inputChanged ){  return;  }

            thisCopy.storeRankAndReason( newValue - 1 );

        } , 1000 );
    };


        RankingOptionDisplay.prototype.
    handleDeleteClick = RatingOptionDisplay.prototype.handleDeleteClick;


        RankingOptionDisplay.prototype.
    onReasonInputFocus = function( event ){
        clearTimeout( this.timerBlurRankingInput );
        this.rankingInputFocused = true;
        this.attributesUpdated();
        return true;
    };

        RankingOptionDisplay.prototype.
    onReasonInputBlur = function( event ){
        // Delay updating display for blur, since another input control may be focused after blur
        clearTimeout( this.timerBlurRankingInput );
        this.timerBlurRankingInput = setTimeout(  () => { this.rankingInputFocused = false; this.attributesUpdated(); this.storeRankAndReason(); } , 1000  );
        return true;
    };

        RankingOptionDisplay.prototype.
    rankingUpClick = function( event ){
        // Enforce ranking range
        let rankingValue = this.rankingInput.value;
        if ( (rankingValue === null)  ||  (rankingValue === '')  ||  (this.questionDisplay.question.options.length <= rankingValue) ){  return;  }

        // Apply suggested reason
        if ( this.suggest && this.suggest.up ){  this.reasonInput.value = this.suggest.up.lastSubkey;  }

        // Modify ranking
        this.rankingInput.value = parseInt( rankingValue ) + 1;
        this.dataUpdated();
        return true;
    };

        RankingOptionDisplay.prototype.
    rankingDownClick = function( event ){
        // Enforce ranking range
        let rankingValue = this.rankingInput.value;
        if ( (rankingValue === null)  ||  (rankingValue === '')  ||  (rankingValue <= 1) ){  return;  }

        // Apply suggested reason
        if ( this.suggest && this.suggest.down ){  this.reasonInput.value = this.suggest.down.lastSubkey;  }

        // Modify ranking
        this.rankingInput.value = parseInt( rankingValue ) - 1;
        this.dataUpdated();
        return true;
    };

        RankingOptionDisplay.prototype.
    storeRankAndReason = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Require that ranking or reason changed
        let rankingValue = this.rankingInput.value;
        let reasonValue = this.reasonInput.value;
        if ( this.answer  &&  (rankingValue == this.answer.content)  &&  (reasonValue == this.answer.reason) ){  return;  }

        // Require that reason is valid
        this.checkReasonInput();
        if ( this.reasonTooShort  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.messagesUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving ranking...' };
        this.messagesUpdated();

        this.questionDisplay.storeRanking( this, rankingValue, reasonValue );
    };

        RankingOptionDisplay.prototype.
    handleReasonInput = RatingOptionDisplay.prototype.handleReasonInput;

        RankingOptionDisplay.prototype.
    checkReasonInput = RatingOptionDisplay.prototype.checkReasonInput;

        RankingOptionDisplay.prototype.
    retrieveSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }
        this.retrieveSuggestionsImp( this.option.id, this.rankingInput.value, this.reasonInput.value );
    };

        RankingOptionDisplay.prototype.
    retrieveSuggestionsImp = RatingOptionDisplay.prototype.retrieveSuggestionsImp;

        RankingOptionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;

        RankingOptionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;

        RankingOptionDisplay.prototype.
    onMoreReasonsClick = RatingOptionDisplay.prototype.onMoreReasonsClick;



/////////////////////////////////////////////////////////////////////////////////
// Display for ranking-question

        function
    RankingQuestionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        let thisCopy = this;
        this.options = {
            data:[] , displays:[] ,
            creator: (optionData) => new RankingOptionDisplay( optionData.id ).setInitialData( optionData, thisCopy, thisCopy.surveyDisplay )
        };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=RankingQuestionDisplay id=RankingQuestionDisplay> ',
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
            '       <div class=ViewHeadings><div translate=yes> Option </div><div translate=yes> Ranking </div><div translate=yes> Reason </div></div> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '       <div class=ResultHeadings> ',
            '           <div translate=yes> Option </div><div translate=yes> Rank </div><div translate=yes> Reason </div><div class=Votes translate=yes> Votes </div> ',
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
    RankingQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        RankingQuestionDisplay.prototype.
    setInitialData = RatingQuestionDisplay.prototype.setInitialData;

        RankingQuestionDisplay.prototype.
    setData = RatingQuestionDisplay.prototype.setData;

    // Update from data to html
        RankingQuestionDisplay.prototype.
    dataUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );

        // Attributes 
        this.setAttribute( 'RankingQuestionDisplay', 'mode', this.mode );
        this.setAttribute( 'RankingQuestionDisplay', 'hasnewoptioninput', (this.getSubElement('NewOptionInput').value ? TRUE : FALSE) );
        this.setProperty( 'NewOptionInput', 'disabled', ! this.isQuestionValid() );

        // Content
        this.getSubElement('RequireReasonInput').checked = this.question.requireReason;
        this.setStyle( 'EditHeadings', 'display', (0 < this.question.options.length ? 'grid' : 'none') );

        // Update collection of subdisplays: set data & keys, create/reorder displays, update displays
        this.options.data = this.question.options.slice() || [];
        this.options.data.forEach( q => q.key = String(q.id) );  // Ensure each data has a key string, derived from id

        // Need stable random order for options without answers
        // Whenever question options change, create random-order for all options
        let thisCopy = this;
        let newOptionsArray = this.question.options.map( o => o.id );
        let newOptionsSet = new Set( newOptionsArray );
        if (  ! this.optionsRandomOrder  ||  (this.optionsRandomOrder.length != newOptionsSet.size)  ||  ! this.optionsRandomOrder.every( o => newOptionsSet.has(o) )  ){
            console.log( 'RankingQuestionDisplay.dataUpdated() this.optionsRandomOrder != newOptionsSet' );
            this.optionsRandomOrder = shuffleArray( newOptionsArray );
            this.optionIdToRandomIndex = new Map(  this.optionsRandomOrder.map( (o,i) => [o, i] )  );
        }

        if ( this.mode == VIEW ){
            let optionsWithoutAnswer = this.options.data.filter(  o => 
                (! thisCopy.answers) || (thisCopy.answers[o.id] == null) || (thisCopy.options.data.length < thisCopy.answers[o.id].content) );
            let optionsWithoutAnswerRandOrder = optionsWithoutAnswer.sort( (a,b) => thisCopy.optionIdToRandomIndex.get(a.id) - thisCopy.optionIdToRandomIndex.get(b.id) );

            // Ranked options may be sparse, so randomly slot unranked options into gaps
            let optionIdToData = new Map(  this.options.data.map( o => [o.id, o] )  );
            let rankToOption = [ ];
            if ( this.answers ){
                for ( optionId in this.answers ){
                    rankToOption[ this.answers[optionId].content - 1 ] = optionId;
                }
            }
            for ( let r = 0;  r < this.options.data.length;  ++r ){
                let rankedOptionId = rankToOption[ r ];
                // Find valid answer-rank, or else remaining random option
                this.options.data[ r ] = newOptionsSet.has( rankedOptionId )? optionIdToData.get( rankedOptionId ) : optionsWithoutAnswerRandOrder.pop();
            }
        }
        else if ( this.mode == RESULT ){
            // Each voted option at its median rank, and unranked options nowhere
            this.options.data.forEach(  o => {
                let distribution = thisCopy.optionToRatingDistribution ? thisCopy.optionToRatingDistribution[o.key] : null;
                o.resultRank = distribution && distribution.median ? distribution.median : MAX_OPTIONS;
            }  );
            this.options.data = this.options.data.filter( o => (o.resultRank != null) ).sort( (a,b) => a.resultRank - b.resultRank );
        }
        // Edit option order should be stable, no order editing required
        // So leave options in original order

        this.updateSubdisplays( this.options, this.getSubElement('Options') );  // Ensure displays exist and match data order
        let numOptions = ( this.question && this.question.options )?  this.question.options.length  :  0;
        this.options.displays.forEach(  (d, i) => {
            d.positionInQuestion = i;
            d.numOptions = numOptions;
            let optionAnswer = ( thisCopy.answers )?  thisCopy.answers[ d.key ]  :  null;
            d.setData( thisCopy.options.data[i] , optionAnswer , (thisCopy.results? thisCopy.results[d.key] : null) , i ,
                (thisCopy.optionToRatingDistribution ? thisCopy.optionToRatingDistribution[d.key] : null)
            );
        }  );
    };

        function
    shuffleArray( array ){  // Modifies array
        // For each destination-position, in reverse order... swap in a randomly selected preceding element
        for ( let dest = array.length - 1;  0 < dest;  dest-- ){
            let src = Math.floor( Math.random() * (dest + 1) );
            [ array[dest], array[src] ] = [ array[src], array[dest] ];
        }
        return array;
    }

        RankingQuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.surveyDisplay.isFrozen() );  };

        RankingQuestionDisplay.prototype.
    isQuestionValid = function( ){  return this.questionDisplay.isQuestionValid();  };

        RankingQuestionDisplay.prototype.
    focusInitialInput = function( event ){
        focusAtEnd( this.getSubElement('NewOptionInput') );
    };

        RankingQuestionDisplay.prototype.
    setMode = RatingQuestionDisplay.prototype.setMode;

        RankingQuestionDisplay.prototype.
    retrieveData = function( ){  };


        RankingQuestionDisplay.prototype.
    onRequireReasonInput = RatingQuestionDisplay.prototype.onRequireReasonInput;

        RankingQuestionDisplay.prototype.
    handleNewOptionInput = function( ){
        this.setAttribute( 'RankingQuestionDisplay', 'hasnewoptioninput', (this.getSubElement('NewOptionInput').value ? TRUE : FALSE) );
    };

        RankingQuestionDisplay.prototype.
    handleNewOptionCancelClick = RatingQuestionDisplay.prototype.handleNewOptionCancelClick;

        RankingQuestionDisplay.prototype.
    handleNewOptionSaveClick = RatingQuestionDisplay.prototype.handleNewOptionSaveClick;

        RankingQuestionDisplay.prototype.
    retrieveResults = function( ){
        // Retrieve results from server
        let url = '/multi/questionOptionRatings/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                thisCopy.results = receiveData.options;
                thisCopy.optionToRatingDistribution = receiveData.optionToRatingDistribution;
                thisCopy.dataUpdated();
            }
        } );
    };



        RankingQuestionDisplay.prototype.
    storeRanking = function( optionDisplay, rankingValue, reasonValue ){

        let ranking = this.options.data.map( o => o.id );

        // Save to server
        let url = '/multi/rankQuestionOptions';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , optionId:optionDisplay.option.id ,
            ranking:ranking , rank:rankingValue , reason:reasonValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                optionDisplay.message = { color:GREEN, text:'Saved ranking', ms:5000 };
                optionDisplay.messagesUpdated();

                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );  // Reorders option displays
                optionDisplay.rankingInput.focus();
            }
            else {
                let message = 'Failed to save ranking';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  optionDisplay.reasonValidity = message;  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Reason is too long';  optionDisplay.reasonValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                    if ( receiveData.message == UNCHANGED ){  message = null;  }
                }
                optionDisplay.message = { color:RED, text:message };
                optionDisplay.messagesUpdated();
            }
        } );
    };
