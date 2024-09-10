// Displays based on ElementWrap

// Proposal question with pros & cons

// Proposal-questions are different from other question-types in that reasons can be browsed,
// not just suggested, even if those reasons have no votes.


/////////////////////////////////////////////////////////////////////////////////
// Display for proposal reason

        function
    ProposalReasonDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.mode = VIEW;

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=ProposalReasonDisplay id=Reason>',
            //  Edit
            '   <div class=ReasonEdit> ',
            '       <label class=ReasonInputLabel id=ReasonInputLabel for=ReasonInput translate=yes> I agree because... </label> ',
            '       <textarea class=ReasonContentInput id=ReasonContentInput oninput=handleReasonInput placeholder="..."></textarea> ',
            '       <div class=SaveOrCancelButtons> ',
            '           <button class=SaveButton id=SaveButton translate=yes onclick=onEditReasonSaveClick> Save </button> ',
            '           <button class=CancelButton id=CancelButton translate=yes onclick=onEditReasonCancelClick> Cancel </button> ',
            '       </div> ',
            '   </div> ',
            //  View
            '   <div class=ReasonView> ',
            '       <div class=ReasonViewContent> ',
            '           <span class=ProOrConViewSpan id=ProOrConViewSpan translate=yes> Agree </span> ',
            '           <span class=ReasonContentView id=ReasonContentView></span> ',
            '       </div> ',
            '       <div class=ReasonViewButtons> ',
            '           <button class=ReasonEditButton id=ReasonEditButton onclick=onReasonEditClick translate=yes> Edit </button> ',
            '           <button class=ReasonVoteButton id=ReasonVoteButton onclick=onReasonVoteClick title="Upvote"> ',
            '               <div translate=yes> Vote </div> ',
            '               <input type=checkbox class=VoteCheckbox id=VoteCheckbox onclick=onReasonVoteCheckboxClick /> ',
            '           </button> ',
            '       </div> ',
            '   </div> ',
            //  Result
            '   <div class=ReasonResult> ',
            '       <div class=ReasonContentResult id=ReasonContentResult></div> ',
            '       <div class=VoteCountResult id=VoteCountResult></div> ',
            '   </div> ',
            '   <div class="Message" id=message aria-live=polite></div> ',
            ' </div> '
        ].join('\n') );
    }
    ProposalReasonDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        ProposalReasonDisplay.prototype.
    setInitialData = function( reasonData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( reasonData, null );
        return this;
    };

        ProposalReasonDisplay.prototype.
    setData = function( reasonData, answer, highlightWords ){
        this.reason = reasonData;
        this.answer = answer;
        this.highlightWords = highlightWords;
        this.dataUpdated();
    }

    // Update this.element
        ProposalReasonDisplay.prototype.
    dataUpdated = function( ){
        this.reasonInput = this.getSubElement('ReasonContentInput');
        this.voteCheckbox = this.getSubElement('VoteCheckbox');

        this.messagesUpdated();
        this.attributesUpdated();

        // Edit
        this.setInnerHtml( 'ReasonInputLabel', (this.reason.proOrCon == PRO ? 'I agree because...' : 'I disagree because...') );
        this.reasonInput.defaultValue = this.reason.content;

        // View
        this.setInnerHtml( 'ProOrConViewSpan', (this.reason.proOrCon == PRO ? 'Agree' : 'Disagree') );
        displayHighlightedContent( storedTextToHtml(this.reason.content), this.highlightWords, this.getSubElement('ReasonContentView') );
        this.voteCheckbox.checked = this.isVoted();

        // Result
        this.setInnerHtml( 'ReasonContentResult', this.reason.content );
        this.setInnerHtml( 'VoteCountResult', this.reason.voteCount );

        translateScreen( this.getSubElement('Reason') );  // Reason content is updated after top-level translation, so need re-translation
    };

        ProposalReasonDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('message') );
        this.reasonInput.setCustomValidity( this.contentValidity || '' );
    };

        ProposalReasonDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'Reason', 'mode', this.mode );
        this.setAttribute( 'Reason', 'mine', (this.reason.mine ? TRUE : FALSE) );

        this.setProperty( 'SaveButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'CancelButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'ReasonEditButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'ReasonVoteButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'VoteCheckbox', 'disabled', ! this.questionDisplay.allowInput() );
    };

        ProposalReasonDisplay.prototype.
    isVoted = function( ){  return this.answer && this.reason && ( this.answer.content == this.reason.id );  }

        ProposalReasonDisplay.prototype.
    setMode = function( newMode ){
        this.mode = newMode;
        this.attributesUpdated();
    };

        ProposalReasonDisplay.prototype.
    onReasonEditClick = function( ){
        this.reasonInput.value = this.reason.content;
        this.setMode( EDIT );
    };

        ProposalReasonDisplay.prototype.
    onEditReasonCancelClick = function( ){  this.setMode( VIEW );  };

        ProposalReasonDisplay.prototype.
    handleReasonInput = function( event ){
        fitTextAreaToText( this.reasonInput );
        this.checkReasonInput();
    };

        ProposalReasonDisplay.prototype.
    onEditReasonSaveClick = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        this.checkReasonInput();
        let contentValue = this.reasonInput.value;

        // Save to server
        let url = '/multi/editProposalReason';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , reasonId:this.reason.id , proOrCon:this.reason.proOrCon , reasonContent:contentValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'ProposalReasonDisplay.onEditReasonSaveClick()', 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.reason ){
                thisCopy.reasonInput.value = '';
                thisCopy.message = { color:GREEN, text:'Reason saved', ms:5000 };
                thisCopy.questionDisplay.updateReason( receiveData.reason );  // Sync reason-data to data in proposal-question
                thisCopy.setMode( VIEW );
            }
            else {
                let message = 'Failed to save reason';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit survey created by someone else';  }
                    if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit reason that already has votes';  }
                    if ( receiveData.message == TOO_MANY_OPTIONS ){  message = 'Question has too many options';  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
            }
            thisCopy.dataUpdated();
        } );
    };

        ProposalReasonDisplay.prototype.
    checkReasonInput = RatingOptionDisplay.prototype.checkReasonInput;


        ProposalReasonDisplay.prototype.
    onReasonVoteCheckboxClick = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }
        // Do not allow click to redundantly hit the button
        event.preventDefault();
        event.stopPropagation();
        // Checkbox is temporarily changed, even if preventDefault() is called, so store changed value
        this.storeVote( this.voteCheckbox.checked );
    };

        ProposalReasonDisplay.prototype.
    onReasonVoteClick = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }
        this.storeVote( ! this.voteCheckbox.checked );
    };
        
        ProposalReasonDisplay.prototype.
    storeVote = function( vote ){
        // Require vote changed
        if ( vote == this.isVoted() ){  return;  }

        this.message = {  color:GREY , text:'Saving vote...'  };
        this.messagesUpdated();

        // Save to server
        let url = '/multi/voteProposalReason';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , reasonId:this.reason.id , vote:vote
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'ProposalReasonDisplay.storeVote()', 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                let message = ( vote )?  'Saved vote. Limit is 1 vote per proposal.'  :  'Saved. 1 vote available.';
                thisCopy.message = {  color:GREEN , text:message , ms:5000  };
                thisCopy.messagesUpdated();

                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );
                thisCopy.questionDisplay.proposal = receiveData.proposal;
                thisCopy.questionDisplay.updateReason( receiveData.reason );
                thisCopy.questionDisplay.updateReason( receiveData.reasonOld );
            }
            else {
                let message = 'Failed to save vote';
                if ( receiveData ){
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                    else if ( receiveData.message == UNCHANGED ){  message = 'Vote not changed';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
                thisCopy.dataUpdated();
            }
        } );
    };




/////////////////////////////////////////////////////////////////////////////////
// Display for proposal pro/con question

        function
    ProposalQuestionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        let thisCopy = this;
        this.idToReason = {};
        this.pros = [];
        this.cons = [];
        this.proDisplays = { data:[] };
        this.conDisplays = { data:[] };
        this.reasonDisplays = { data:[] };
        this.reasonIdToVotes = { };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=ProposalQuestionDisplay id=ProposalQuestionDisplay> ',
            '   <div class=NewReasonWrap> ',
            '       <h4 translate=yes> Add or find reason to agree or disagree </h4> ',
            '       <input class=NewReasonInput id=NewReasonInput placeholder="I agree because..." oninput=onNewReasonInput /> ',
            '       <div class=SaveOrCancelButtons> ',
            '           <button class=SaveButton id=SaveProButton translate=yes onclick=onNewProSaveClick> Save pro </button> ',
            '           <button class=SaveButton id=SaveConButton translate=yes onclick=onNewConSaveClick> Save con </button> ',
            '           <button class=CancelButton id=CancelButton translate=yes onclick=onNewReasonCancelClick> Cancel </button> ',
            '       </div> ',
            '   </div> ',
            '   <div class=Message id=Message aria-live=polite></div> ',
            '   <h4 class=ReasonViewHeadings id=ReasonViewHeadings translate=yes> Reasons </h4> ',
            '   <div class=ReasonViewHeadings2Column id=ReasonViewHeadings2Column><h4 translate=yes> Agree </h4><h4 translate=yes> Disagree </h4></div> ',
            '   <div class=ResultVotes> ',
            '       <div translate=yes> Agree </div><div><span translate=yes> Votes </span>: </div><div id=ResultVotesPro></div> ',
            '       <div translate=yes> Disagree </div><div><span translate=yes> Votes </span>: </div><div id=ResultVotesCon></div> ',
            '   </div> ',
            '   <div class=Reasons id=Reasons></div> ',
            '   <div class=Reasons2Column> ',
            '       <div class=ReasonsPro id=ReasonsPro></div> ',
            '       <div class=ReasonsCon id=ReasonsCon></div> ',
            '   </div> ',
            '   <div class=BottomButtons id=BottomButtons> ',
            '       <button class=MoreReasonsButton id=MoreReasonsButton translate=yes onclick=onMoreReasonsClick> More reasons </button> ',
            '       <div class=Message id=moreMessage></div> ',
            '   </div> ',
            ' </div>'
        ].join('\n') );
    }
    ProposalQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        ProposalQuestionDisplay.prototype.
    setInitialData = function( questionData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( questionData, null );
        return this;
    };

        ProposalQuestionDisplay.prototype.
    setData = function( questionData, questionAnswer ){
        this.question = questionData;
        this.setAnswer( questionAnswer );
    };

        ProposalQuestionDisplay.prototype.
    setAnswer = function( questionAnswer ){
        this.answer = questionAnswer;
        this.dataUpdated();
    };

    // Update from data to html
        ProposalQuestionDisplay.prototype.
    dataUpdated = function( ){
        this.reasonInput = this.getSubElement('NewReasonInput');

        this.messagesUpdated();
        this.attributesUpdated();

        // Content
        let totalProVotes = ( this.proposal )?  this.proposal.numPros  :  0;
        let totalConVotes = ( this.proposal )?  this.proposal.numCons  :  0;
        this.setInnerHtml( 'ResultVotesPro', totalProVotes );
        this.setInnerHtml( 'ResultVotesCon', totalConVotes );

        // Separate reasons into pros and cons
        let width = jQuery(window).width();
        let use1Column = ( width <= MAX_WIDTH_1_COLUMN ) && (this.mode == VIEW);
        this.setAttribute( 'ProposalQuestionDisplay', 'data-width', (use1Column ? 'narrow' : 'wide') );
        let hasSuggestionMatches = this.suggestions  &&  ( 0 < this.suggestions.length );
        let hasReasons =  ( ! isEmpty(this.pros) )  ||  ( ! isEmpty(this.cons) )  ||  hasSuggestionMatches;
        this.setStyle( 'ReasonViewHeadings', 'display', (hasReasons ? null : 'none') );
        this.setStyle( 'ReasonViewHeadings2Column', 'display', (hasReasons ? null : 'none') );

        if ( use1Column ){
            this.proDisplays.data = [];
            this.conDisplays.data = [];
            if ( hasSuggestionMatches  &&  (this.mode == VIEW) ){
                this.reasonDisplays.data = this.suggestions;
            }
            else {
                // Merge pros & cons
                this.reasonDisplays.data = [];
                for ( let i = 0;  i < this.pros.length  ||  i < this.cons.length;  ++i ){
                    if ( i < this.pros.length ){  this.reasonDisplays.data.push( this.pros[i] );  }
                    if ( i < this.cons.length ){  this.reasonDisplays.data.push( this.cons[i] );  }
                }
            }
        }
        else {  // 2 columns
            this.reasonDisplays.data = [];
            if ( hasSuggestionMatches  &&  (this.mode == VIEW) ){
                this.proDisplays.data = this.suggestions.filter( s => (s.proOrCon == PRO) );
                this.conDisplays.data = this.suggestions.filter( s => (s.proOrCon == CON) );
            }
            else {
                // Keep pros & cons separate
                this.proDisplays.data = this.pros;
                this.conDisplays.data = this.cons;
            }
        }

        // Update sub-displays
        let thisCopy = this;
        if ( ! this.reasonDisplayCreator ){
            this.reasonDisplayCreator = 
                (reasonData) => new ProposalReasonDisplay( reasonData.id ).setInitialData( reasonData, thisCopy, thisCopy.surveyDisplay );
        }
        // Ensure each data has a key-string, ensure displays exist in-order for each data, update data to displays
        this.proDisplays.data.forEach( r => {r.key = String(r.id);} );  
        this.updateSubdisplays( this.proDisplays, this.getSubElement('ReasonsPro'), this.reasonDisplayCreator );
        this.proDisplays.displays.forEach(  (d,i) => { d.setData(thisCopy.proDisplays.data[i], thisCopy.answer, thisCopy.highlightWords); }  );

        this.conDisplays.data.forEach( r => {r.key = String(r.id);} );
        this.updateSubdisplays( this.conDisplays, this.getSubElement('ReasonsCon'), this.reasonDisplayCreator );
        this.conDisplays.displays.forEach(  (d,i) => { d.setData(thisCopy.conDisplays.data[i], thisCopy.answer, thisCopy.highlightWords); }  );

        this.reasonDisplays.data.forEach( r => {r.key = String(r.id);} );
        this.updateSubdisplays( this.reasonDisplays, this.getSubElement('Reasons'), this.reasonDisplayCreator );
        this.reasonDisplays.displays.forEach(  (d,i) => { d.setData(thisCopy.reasonDisplays.data[i], thisCopy.answer, thisCopy.highlightWords); }  );

        this.setReasonModes( this.mode );
    };

        ProposalQuestionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.moreMessage = showMessageStruct( this.moreMessage, this.getSubElement('moreMessage') );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    };

        ProposalQuestionDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'ProposalQuestionDisplay', 'mode', this.mode );
        this.setAttribute( 'ProposalQuestionDisplay', 'hasnewreasoninput', (this.reasonInput.value ? TRUE : FALSE) );
        this.reasonInput.disabled = ! this.allowInput();
        this.setProperty( 'SaveProButton', 'disabled', ! this.allowInput() );
        this.setProperty( 'SaveConButton', 'disabled', ! this.allowInput() );
        this.setProperty( 'CancelButton', 'disabled', ! this.allowInput() );

        let hasSuggestionMatches = this.suggestions  &&  ( 0 < this.suggestions.length );
        this.setAttribute( 'ProposalQuestionDisplay', 'hassuggestions', (hasSuggestionMatches ? TRUE : FALSE) );
        this.setStyle(  'BottomButtons', 'display', ( this.mode!=EDIT && this.hasReasons()? 'block' : 'none' )  );
    };


        ProposalQuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.surveyDisplay.isFrozen() );  };

        ProposalQuestionDisplay.prototype.
    isQuestionValid = function( ){  return this.questionDisplay.isQuestionValid();  };

        ProposalQuestionDisplay.prototype.
    hasReasons = function( ){  return (this.suggestions && 0 < this.suggestions.length) || (this.pros && 0 < this.pros.length) || (this.cons && 0 < this.cons.length);  };

        ProposalQuestionDisplay.prototype.
    focusInitialInput = function( event ){
    };

        ProposalQuestionDisplay.prototype.
    setMode = function( newMode ){
        let oldMode = this.mode;
        this.mode = newMode;
        this.dataUpdated();

        this.setReasonModes( newMode )
    };

        ProposalQuestionDisplay.prototype.
    setReasonModes = function( newMode ){
        [ this.reasonDisplays, this.proDisplays, this.conDisplays ].forEach( s => {
            if ( s.displays ){
                s.displays.forEach( d => d.setMode(newMode) );
            }
        } );
    };

        ProposalQuestionDisplay.prototype.
    retrieveData = function( ){
        let initial = true;
        this.retrieveReasons( initial );
    };

        ProposalQuestionDisplay.prototype.
    updateReason = function( reasonData ){
        if ( ! reasonData ){  return;  }

        // Replace existing reason-data with matching ID
        [ this.pros, this.cons ].forEach( reasons => {
            if ( reasons ){
                for ( let r = 0;  r < reasons.length;  ++r ){
                    if ( reasons[r].id == reasonData.id ){
                        reasons[r] = reasonData;
                    }
                }
            }
        } );
        this.dataUpdated();
    }

        ProposalQuestionDisplay.prototype.
    updateVoteAggregate = function( reasonVoteAggregate ){
        this.reasonIdToVotes[ reasonVoteAggregate.parentSubkey ] = reasonVoteAggregate;
        this.dataUpdated();
    }



        ProposalQuestionDisplay.prototype.
    onNewReasonFocus = function( event ){  this.newReasonInputFocused = true;  };

        ProposalQuestionDisplay.prototype.
    onNewReasonBlur = function( ){  this.newReasonInputFocused = false;  }

        ProposalQuestionDisplay.prototype.
    onNewReasonInput = function( event ){
        fitTextAreaToText( this.reasonInput );
        this.checkNewReasonInput();
        this.setAttribute( 'ProposalQuestionDisplay', 'hasnewreasoninput', (this.reasonInput.value ? TRUE : FALSE) );
        // If user cleared input... show top reasons
        if ( ! this.reasonInput.value.trim() ){  this.suggestions = null;  this.highlightWords = null;  this.dataUpdated();  return;  }
        // If user typed SPACE... retrieve suggestions 
        if ( event.data == ' ' ){  this.retrieveSuggestions();  }
    };

        ProposalQuestionDisplay.prototype.
    retrieveSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Retrieve suggestions only for first N words
        let reasonValue = this.reasonInput.value;
        let words = removeStopWords( tokenize(reasonValue) ).slice( 0, MAX_WORDS_INDEXED )  ||  [];

        // Suggest only if input is changed since last suggestion 
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;  }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve reasons, from server
        let url = '/multi/proposalReasonsForPrefix';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , inputStart:contentStart
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'ProposalQuestionDisplay.retrieveSuggestions() receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.suggestions ){
                // Collect suggestions and calculate IDF weights across reason words 
                if ( ! thisCopy.suggestionTextToData ){  thisCopy.suggestionTextToData = {};  }  // map{ suggestionProposal -> {scoreMatch, scoreTotal...} }
                for ( let s = 0;  s < receiveData.suggestions.length;  ++s ){
                    let suggestionNew = receiveData.suggestions[ s ];
                    let suggestionContent = suggestionNew.content;
                    if ( suggestionContent  &&  ! (suggestionContent in thisCopy.suggestionTextToData) ){
                        thisCopy.surveyDisplay.incrementWordCounts( suggestionContent );
                    }
                    thisCopy.suggestionTextToData[ suggestionContent ] = suggestionNew;
                }

                // Find top-scored suggestions with at least some matching keyword
                thisCopy.scoreMatches( contentStart );
                thisCopy.suggestions = Object.values( thisCopy.suggestionTextToData )
                    .filter( s => (0 < s.scoreMatch) )
                    .sort( (a,b) => (b.scoreTotal - a.scoreTotal) );
                thisCopy.highlightWords = ( thisCopy.suggestions )?  contentStart  :  null;

                thisCopy.dataUpdated();
            }
        } );
    };

        ProposalQuestionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;



        ProposalQuestionDisplay.prototype.
    onNewReasonCancelClick = function( ){
        this.reasonInput.value = '';
        this.highlightWords = null;
        this.suggestions = null;
        this.message = { text:'' };
        this.reasonValidity = '';
        this.dataUpdated();
    };

        ProposalQuestionDisplay.prototype.
    onNewProSaveClick = function( ){  this.saveNewReason( PRO );  };

        ProposalQuestionDisplay.prototype.
    onNewConSaveClick = function( ){  this.saveNewReason( CON );  };

        ProposalQuestionDisplay.prototype.
    saveNewReason = function( proOrCon ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let reasonValue = this.reasonInput.value;

        // Require that reason is valid
        this.checkNewReasonInput();
        if ( this.reasonTooShort  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.dataUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving reason...' };
        this.dataUpdated();

        // Save to server
        let url = '/multi/newProposalReason';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id ,
            questionId:this.questionDisplay.question.id , reason:reasonValue , proOrCon:proOrCon
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'ProposalQuestionDisplay.saveNewReason() error=', error, 'status=', status, 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.reason ){
                thisCopy.message = { color:GREEN, text:'Saved reason', ms:3000 };

                if ( proOrCon == PRO ){  thisCopy.pros.push( receiveData.reason );  }
                else {  thisCopy.cons.push( receiveData.reason );  }

                thisCopy.reasonInput.value = '';
                thisCopy.highlightWords = null;
                thisCopy.suggestions = null;
            }
            else {
                let message = 'Failed to save reason';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  thisCopy.reasonValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
            }
            thisCopy.dataUpdated();
        } );
    };

        ProposalQuestionDisplay.prototype.
    checkNewReasonInput = RatingOptionDisplay.prototype.checkReasonInput;


        ProposalQuestionDisplay.prototype.
    onMoreReasonsClick = function( ){
        let initial = false;
        this.retrieveReasons( initial );
    };


        ProposalQuestionDisplay.prototype.
    retrieveReasons = function( initial ){
        if ( this.cursorProDone  &&  this.cursorConDone ){
            this.moreMessage = { color:GREY, text:'No more reasons yet', ms:5000 };
            this.messagesUpdated();
            return;
        }

        if ( ! initial ){
            this.moreMessage = { color:GREY, text:'Retrieving reasons...', ms:5000 };
            this.messagesUpdated();
        }

        // Retrieve top reasons from server
        let url = '/multi/proposalTopReasons/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id;
        let sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            cursorPro:this.cursorPro , cursorCon:this.cursorCon // , cursorProDone:this.cursorProDone , cursorConDone:this.cursorConDone
        };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            console.log( 'ProposalQuestionDisplay.retrieveReasons() receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success ){

                if ( ! initial  &&  isEmpty(receiveData.pros)  &&  isEmpty(receiveData.cons) ){
                    thisCopy.moreMessage = { color:GREY, text:"No more reasons yet", ms:5000 };
                    thisCopy.dataUpdated();
                    return;
                }

                thisCopy.moreMessage = { color:GREEN, text:'Retrieved reasons', ms:3000 };
                thisCopy.dataUpdated();

                // Collect map{ id -> reason }
                if ( receiveData.pros ){   receiveData.pros.forEach(  r => { if (r.id) thisCopy.idToReason[r.id] = r; }  )   }
                if ( receiveData.cons ){   receiveData.cons.forEach(  r => { if (r.id) thisCopy.idToReason[r.id] = r; }  )   }
                // Separate pros and cons
                thisCopy.pros = Object.values( thisCopy.idToReason ).filter( r => (r.proOrCon == PRO) );
                thisCopy.cons = Object.values( thisCopy.idToReason ).filter( r => (r.proOrCon == CON) );
                // Pro & con cursors reach end at different times, so track whether each has reached the end
                thisCopy.cursorPro = receiveData.cursorPro;
                thisCopy.cursorCon = receiveData.cursorCon;
                thisCopy.cursorProDone = ! receiveData.cursorProMore;
                thisCopy.cursorConDone = ! receiveData.cursorConMore;

                thisCopy.proposal = receiveData.proposal;
                thisCopy.dataUpdated();
            }
            else {
                let message = 'Failed to load reasons';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  thisCopy.reasonValidity = message;  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };


