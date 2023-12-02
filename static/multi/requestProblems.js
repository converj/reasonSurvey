// Displays based on ElementWrap
// Request-for-problems question with edit/view/result-states


/////////////////////////////////////////////////////////////////////////////////
// Display for solution-reason

        function
    SolutionReasonDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.mode = VIEW;

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=SolutionReasonDisplay id=Reason> ',
            //  Edit
            '   <div class=Edit> ',
            '       <span class=ContentTag id=ReasonInputLabelPro translate=yes> Pro </span> ',
            '       <span class=ContentTag id=ReasonInputLabelCon translate=yes> Con </span> ',
            '       <textarea class=ReasonContentInput id=ReasonContentInput title="Reason" oninput=onEditReasonInput placeholder="I agree because..."></textarea> ',
            '       <div class=SaveOrCancelButtons> ',
            '           <button class=SaveButton id=SaveButton translate=yes onclick=onEditSaveClick> Save </button> ',
            '           <button class=CancelButton id=CancelButton translate=yes onclick=onEditCancelClick> Cancel </button> ',
            '       </div> ',
            '   </div> ',
            //  View
            '   <div class=View> ',
            '       <div class=ContentViewWrap> ',
            '           <span class=ContentTag id=ContentTagPro translate=yes> Pro </span> ',
            '           <span class=ContentTag id=ContentTagCon translate=yes> Con </span> ',
            '           <span class=ReasonViewContent id=ReasonViewContent></span> ',
            '       </div> ',
            '       <div class=ReasonViewButtons> ',
            '           <div class=ReasonVoteWrap> ',
            '               <label for=VoteCheckbox translate=yes> Vote </label> ',
            '               <input type=checkbox class=VoteCheckbox id=VoteCheckbox onclick=onReasonVoteCheckboxClick /> ',
            '           </div> ',
            '           <button class=ReasonEditButton id=ReasonEditButton onclick=onReasonEditClick translate=yes> Edit </button> ',
            '       </div> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '       <div> ',
            '           <span class=ContentTag id=ContentTagResultPro translate=yes> Pro </span> ',
            '           <span class=ContentTag id=ContentTagResultCon translate=yes> Con </span> ',
            '           <span class=ReasonContentResult id=ReasonContentResult></span> ',
            '       </div> ',
            '       <div class=VoteCountResult id=VoteCountResult></div> ',
            '   </div> ',
            '   <div class=Message id=message aria-live=polite></div> ',
            ' </div> '
        ].join('\n') );
    }
    SolutionReasonDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        SolutionReasonDisplay.prototype.
    setInitialData = function( reasonData, solutionDisplay, problemDisplay, questionDisplay, surveyDisplay ){
        this.solutionDisplay = solutionDisplay;
        this.problemDisplay = problemDisplay;
        this.questionDisplay = questionDisplay;
        this.surveyDisplay = surveyDisplay;
        this.setData( reasonData, null );  // Calls dataUpdated()
        return this;
    };

        SolutionReasonDisplay.prototype.
    setData = function( reasonData, answerData, highlightWords ){
        this.reason = reasonData;
        this.highlightWords = highlightWords;
        this.setAnswer( answerData );  // Calls dataUpdated()
    };

        SolutionReasonDisplay.prototype.
    setAnswer = function( answerData ){
        this.answer = answerData;
        this.dataUpdated();
    };

    // Update from data to html
        SolutionReasonDisplay.prototype.
    dataUpdated = function( ){
        let thisCopy = this;
        this.reasonInput = this.getSubElement('ReasonContentInput');
        this.voteCheckbox = this.getSubElement('VoteCheckbox');

        this.messagesUpdated();
        this.attributesUpdated();

        // Edit
        this.setStyle( 'ReasonInputLabelPro', 'display', (this.reason.proOrCon == PRO)? null : 'none' );
        this.setStyle( 'ReasonInputLabelCon', 'display', (this.reason.proOrCon == CON)? null : 'none' );
        this.reasonInput.defaultValue = this.reason.content;

        // View
        this.setStyle( 'ContentTagPro', 'display', (this.reason.proOrCon == PRO)? null : 'none' );
        this.setStyle( 'ContentTagCon', 'display', (this.reason.proOrCon == CON)? null : 'none' );
        displayHighlightedContent( storedTextToHtml(this.reason.content), this.highlightWords, this.getSubElement('ReasonViewContent') );
        this.voteCheckbox.checked = this.isVoted();

        // Result
        this.setStyle( 'ContentTagResultPro', 'display', (this.reason.proOrCon == PRO)? null : 'none' );
        this.setStyle( 'ContentTagResultCon', 'display', (this.reason.proOrCon == CON)? null : 'none' );
        this.setInnerHtml( 'ReasonContentResult', this.reason.content );
        this.setInnerHtml( 'VoteCountResult', this.reason.votes || 0 );



        translateScreen( this.getSubElement('Reason') );  // Reason content is updated after top-level translation, so need re-translation
    };

        SolutionReasonDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('message') );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    };

        SolutionReasonDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'Reason', 'mine', (this.reason.mine ? TRUE : FALSE) );
        this.setAttribute( 'Reason', 'mode', this.mode );
        this.setAttribute( 'Reason', 'procon', this.reason.proOrCon );
        this.setAttribute( 'Reason', 'allowedit', (this.reason.mine && ! this.reason.hasResponse)? TRUE : FALSE );

        this.reasonInput.disabled = ! this.questionDisplay.allowInput();
        this.setProperty( 'SaveButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'CancelButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'ReasonEditButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'VoteCheckbox', 'disabled', ! this.questionDisplay.allowInput() );
    };

        SolutionReasonDisplay.prototype.
    isVoted = function( ){  return this.answer && this.reason && ( this.answer.content == this.reason.id );  };

        SolutionReasonDisplay.prototype.
    setMode = function( newMode ){
        this.mode = newMode;
        this.attributesUpdated();
    };

        SolutionReasonDisplay.prototype.
    onReasonEditClick = function( ){
        this.setMode( EDIT );
        fitTextAreaToText( this.reasonInput );
    };

        SolutionReasonDisplay.prototype.
    onEditReasonInput = function( ){
        fitTextAreaToText( this.reasonInput );
        this.checkReasonInput();
    };

        SolutionReasonDisplay.prototype.
    onEditCancelClick = function( ){
        this.reasonInput.value = this.reason.content;
        this.setMode( VIEW );
    };

        SolutionReasonDisplay.prototype.
    onEditSaveClick = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let reasonValue = this.reasonInput.value;

        // Require that reason is valid
        this.checkReasonInput();
        if ( this.reasonTooShort  ||  this.reasonTooLong ){
            let message = ( this.reasonTooShort )?  'Reason is too short'  :  'Reason is too long';
            this.message = { color:RED, text:message };
            this.reasonValidity = message;
            this.messagesUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving reason...' };
        this.messagesUpdated();

        // Save to server
        let url = '/multi/editSolutionReason';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:this.getProblemId() , solutionId:this.solutionDisplay.solution.id , reasonId:this.reason.id , reason:reasonValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.reason ){
                thisCopy.message = { color:GREEN, text:'Saved reason', ms:5000 };
                thisCopy.reason = receiveData.reason;
                thisCopy.onEditCancelClick();
                thisCopy.solutionDisplay.updateReasons( [receiveData.reason] );
            }
            else {
                let message = 'Failed to save reason';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  thisCopy.reasonValidity = message;  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Reason is too long';  thisCopy.reasonValidity = message;  }
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit survey created by someone else';  }
                    if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit reason that already has votes';  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
            }
            thisCopy.dataUpdated();
        } );
    };

        SolutionReasonDisplay.prototype.
    checkReasonInput = function( ){
        let reasonValue = this.reasonInput.value;

        let reasonTooShortPrev = this.reasonTooShort;
        let reasonTooLongPrev = this.reasonTooLong;
        this.reasonTooShort =  (! reasonValue)  ||  ( reasonValue.length < minLengthReason );
        this.reasonTooLong =  reasonValue  &&  ( maxLengthReason < reasonValue.length );

        if ( (reasonTooShortPrev || reasonTooLongPrev)  &&  ! (this.reasonTooShort || this.reasonTooLong) ){
            this.message = { text:'' };
            this.reasonValidity = '';
            this.messagesUpdated();
        }
    };

        SolutionReasonDisplay.prototype.
    onReasonVoteCheckboxClick = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Checkbox is temporarily changed, even if preventDefault() is called, so store changed value
        let vote = this.voteCheckbox.checked;

        // Require vote changed
        if ( vote == this.isVoted() ){  return;  }

        this.message = {  color:GREY , text:'Saving vote...'  };
        this.messagesUpdated();

        // Save to server
        let url = '/multi/voteSolutionReason';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:this.getProblemId() , solutionId:this.solutionDisplay.solution.id , reasonId:this.reason.id , vote:vote
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                let message = ( vote )?  'Saved vote. Limit is 1 vote per proposal.'  :  'Saved. 1 vote available.';
                thisCopy.message = {  color:GREEN , text:message , ms:5000  };
                thisCopy.messagesUpdated();

                if ( receiveData.reason ){  thisCopy.reason = receiveData.reason;  thisCopy.dataUpdated();  }
                thisCopy.solutionDisplay.updateReasons( [receiveData.reason, receiveData.reasonOld] );
                thisCopy.surveyDisplay.setAnswerData( receiveData.answers );
            }
            else {
                thisCopy.voteCheckbox.checked = thisCopy.isVoted();
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

        SolutionReasonDisplay.prototype.
    getProblemId = function( ){  return ( this.problemDisplay )?  this.problemDisplay.problem.id  :  null;  }




/////////////////////////////////////////////////////////////////////////////////
// Display for solution / proposal

        function
    SolutionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.mode = VIEW;
        this.idToReason = {};
        this.reasonDisplays = { data:[] };
        this.reasonIdToVotes = { };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=SolutionDisplay id=Solution> ',
            '   <details id=Expander ontoggle=onExpanderToggle> ',
            '       <summary id=ExpanderSummary> ',
            //          Edit
            '           <div class=Edit> ',
            '               <span class=ContentTag translate=yes> Solution </span> ',
            '               <textarea class=SolutionContentInput id=SolutionContentInput title="Solution" oninput=onEditSolutionInput placeholder="I suggest..."></textarea> ',
            '               <div class=SaveOrCancelButtons> ',
            '                   <button class=SaveButton id=SaveButton translate=yes onclick=onEditSolutionSaveClick> Save </button> ',
            '                   <button class=CancelButton id=CancelButton translate=yes onclick=onEditSolutionCancelClick> Cancel </button> ',
            '               </div> ',
            '           </div> ',
            //          View
            '           <div class=View> ',
            '               <div class=ContentViewWrap> ',
            '                   <span class=ContentTag translate=yes> Solution </span> ',
            '                   <span class=SolutionViewContent id=SolutionViewContent></span> ',
            '               </div> ',
            '               <div class=SolutionViewButtons> ',
            '                   <button class=SolutionEditButton id=SolutionEditButton onclick=onSolutionEditClick translate=yes> Edit </button> ',
            '               </div> ',
            '           </div> ',
            //          Result
            '           <div class=Result> ',
            '               <div> ',
            '                   <span class=ContentTag translate=yes> Solution </span> ',
            '                   <span id=SolutionResultContent class=SolutionResultContent></span> ',
            '               </div> ',
            '           </div> ',
            '           <div class=Message id=Message aria-live=polite></div> ',
            '       </summary> ',
            //      Reasons
            '       <div class=View> ',
            '           <div class=NewReasonWrap> ',
            '               <label for=NewReasonInput translate=yes> Add or find reason to agree or disagree </label> ',
            '               <textarea class=NewSolutionReasonInput id=NewReasonInput placeholder="I agree because..." oninput=onNewReasonInput></textarea> ',
            '               <div class=SaveOrCancelButtons> ',
            '                   <button class=SaveButton id=SaveProButton translate=yes onclick=onNewProSaveClick> Save pro </button> ',
            '                   <button class=SaveButton id=SaveConButton translate=yes onclick=onNewConSaveClick> Save con </button> ',
            '                   <button class=CancelButton id=CancelButton translate=yes onclick=onNewReasonCancelClick> Cancel </button> ',
            '               </div> ',
            '           </div> ',
            '           <div class=ReasonViewHeadings1Column id=ReasonViewHeadings1Column> <h4 translate=yes>Reasons</h4> </div> ',  // Only for narrow-screen in edit/view-mode
            '           <div class=ReasonViewHeadings2Column id=ReasonViewHeadings2Column> <h4 translate=yes>Pro</h4> <h4 translate=yes>Con</h4> </div> ',
            '       </div> ',
            '       <div class=Result> ',
            '           <div class=ReasonResultHeadings1Column id=ReasonResultHeadings1Column> ',
            '               <h4> <span translate=yes>Pro</span>: <span id=ResultVotesPro1></span> ',
            '                   <span translate=yes style="margin-left:2em;">Con</span>: <span id=ResultVotesCon1></span> </h4> ',
            '               <h4 translate=yes>Votes</h4> ',
            '           </div> ',
            '           <div class=ReasonResultHeadings2Column id=ReasonResultHeadings2Column> ',
            '               <h4 translate=yes>Pro</h4> <h4 class=ResultVotes><span translate=yes>Votes</span>: <span id=ResultVotesPro2></span> </h4> ',
            '               <h4 translate=yes>Con</h4> <h4 class=ResultVotes><span translate=yes>Votes</span>: <span id=ResultVotesCon2></span> </h4> ',
            '           </div> ',
            '       </div> ',
            '       <div class=Reasons id=Reasons></div> ',
            '   </details> ',
            ' </div>'
        ].join('\n') );
    }
    SolutionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        SolutionDisplay.prototype.
    setInitialData = function( solutionData, problemDisplay, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.problemDisplay = problemDisplay;
        this.setData( solutionData, null );
        return this;
    };

        SolutionDisplay.prototype.
    setData = function( solutionData, solutionAnswer, highlightWords ){
        this.solution = solutionData;
        this.highlightWords = highlightWords;
        this.setAnswer( solutionAnswer );
    };

        SolutionDisplay.prototype.
    setAnswer = function( solutionAnswer ){
        this.answer = solutionAnswer;
        this.dataUpdated();
    };

    // Update from data to html
        SolutionDisplay.prototype.
    dataUpdated = function( ){
        let thisCopy = this;
        this.solutionInput = this.getSubElement('SolutionContentInput');
        this.reasonInput = this.getSubElement('NewReasonInput');

        this.messagesUpdated();
        this.attributesUpdated();

        // Edit
        this.solutionInput.defaultValue = this.solution.content;
        // View
        displayHighlightedContent( storedTextToHtml(this.solution.content), this.highlightWords, this.getSubElement('SolutionViewContent') );
        setTimeout( () => fitTextAreaToText(thisCopy.reasonInput) , 200 );
        // Result
        this.setInnerHtml( 'ResultVotesPro1', this.solution.pros || 0 );
        this.setInnerHtml( 'ResultVotesCon1', this.solution.cons || 0 );
        this.setInnerHtml( 'ResultVotesPro2', this.solution.pros || 0 );
        this.setInnerHtml( 'ResultVotesCon2', this.solution.cons || 0 );
        this.setInnerHtml( 'SolutionResultContent', this.solution.content );

        // Separate reasons into pros and cons
        let hasSuggestionMatches = this.suggestions  &&  ( 0 < this.suggestions.length );
        let hasReasons =  ( ! isEmpty(this.pros) )  ||  ( ! isEmpty(this.cons) )  ||  hasSuggestionMatches;
        this.setAttribute( 'Solution', 'hasreasons', (hasReasons ? TRUE : FALSE) );
        if ( hasSuggestionMatches  &&  (this.mode == VIEW) ){
            this.reasonDisplays.data = this.suggestions;
        }
        else {
            // Merge pros & cons
            this.reasonDisplays.data = [];
            for (  let i = 0;  ( this.pros && (i < this.pros.length) )  ||  ( this.cons && (i < this.cons.length) );  ++i ){
                if ( i < this.pros.length ){  this.reasonDisplays.data.push( this.pros[i] );  }
                if ( i < this.cons.length ){  this.reasonDisplays.data.push( this.cons[i] );  }
            }
        }

        // Ensure each data has a key-string, ensure displays exist in-order for each data, update data to displays
        this.reasonDisplays.data.forEach( r => {r.key = String(r.id);} );
        this.updateSubdisplays( this.reasonDisplays, this.getSubElement('Reasons'),
            (reasonData) => new SolutionReasonDisplay( reasonData.id )
                .setInitialData( reasonData, thisCopy, thisCopy.problemDisplay, thisCopy.questionDisplay, thisCopy.surveyDisplay )
        );
        this.reasonDisplays.displays.forEach( (d,i) => d.setData(thisCopy.reasonDisplays.data[i], thisCopy.answer, thisCopy.highlightWordsForReasons) );
        this.setReasonModes( this.mode );
    };

        SolutionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.solutionInput.setCustomValidity( this.solutionValidity || '' );
        this.reasonInput.setCustomValidity( this.reasonValidity || '' );
    };

        SolutionDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'Solution', 'mine', (this.solution.mine ? TRUE : FALSE) );
        this.setAttribute( 'Solution', 'mode', this.mode );
        this.setAttribute( 'Solution', 'hasnewreasoninput', (this.reasonInput.value ? TRUE : FALSE) );
        this.setAttribute( 'Solution', 'allowedit', (this.solution.mine && !this.solution.hasResponse && isEmpty(this.pros) && isEmpty(this.cons))? TRUE : FALSE );

        this.reasonInput.disabled = ! this.questionDisplay.allowInput();
        this.setProperty( 'SaveProButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'SaveConButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'CancelButton', 'disabled', ! this.questionDisplay.allowInput() );

        let hasSuggestionMatches = this.suggestions  &&  ( 0 < this.suggestions.length );
        this.setAttribute( 'Solution', 'hassuggestions', (hasSuggestionMatches ? TRUE : FALSE) );
    };

        SolutionDisplay.prototype.
    hasReasons = function( ){  return !( isEmpty(this.suggestions) && isEmpty(this.pros) && isEmpty(this.cons) );  };

        SolutionDisplay.prototype.
    setMode = function( newMode ){  this.mode = newMode;  this.attributesUpdated();  this.setReasonModes( newMode );  }

        SolutionDisplay.prototype.
    setReasonModes = function( newMode ){
        if ( newMode == EDIT ){  return;  }
        this.reasonDisplays.displays.forEach( d => d.setMode(newMode) );
    };

        SolutionDisplay.prototype.
    collapse = function( ){  this.getSubElement('Expander').open = false;  }

        SolutionDisplay.prototype.
    expand = function( ){  this.getSubElement('Expander').open = true;  }

        SolutionDisplay.prototype.
    onExpanderToggle = function( event ){
        let expander = this.getSubElement('Expander');
        let summary = this.getSubElement('ExpanderSummary');
        if ( expander.open ){
            if ( (this.pros == null) && (this.cons == null) ){  this.retrieveReasons();  }
            this.getParentDisplay().collapseOtherSolutions( this );
            if ( isPartlyOffScreen(summary) ){  scrollToHtmlElement( summary );  }
        }
    };
    
        SolutionDisplay.prototype.
    getParentDisplay = function( ){  return this.problemDisplay || this.questionDisplay;  }

        SolutionDisplay.prototype.
    retrieveReasons = function( ){
        // Retrieve top reasons from server
        let url = '/multi/topSolutionReasons/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id +
            '/' + (this.getProblemId() || 'x') + '/' + this.solution.id;
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                // Collect map{ id -> reason }
                if ( receiveData.pros ){   receiveData.pros.forEach(  r => { if (r.id) thisCopy.idToReason[r.id] = r; }  )   }
                if ( receiveData.cons ){   receiveData.cons.forEach(  r => { if (r.id) thisCopy.idToReason[r.id] = r; }  )   }
                // Separate pros and cons
                thisCopy.pros = Object.values( thisCopy.idToReason ).filter( r => (r.proOrCon == PRO) );
                thisCopy.cons = Object.values( thisCopy.idToReason ).filter( r => (r.proOrCon == CON) );

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

        SolutionDisplay.prototype.
    updateReasons = function( reasonDatas ){
        if ( ! reasonDatas ){  return;  }

        // Replace existing reason-data with matching ID
        [ this.pros, this.cons ].forEach( reasons => {
            if ( reasons ){
                for ( let r = 0;  r < reasons.length;  ++r ){
                    reasonDatas.forEach( reasonData => {
                        if ( reasonData && (reasons[r].id == reasonData.id) ){
                            reasons[r] = reasonData;
                        }
                    } );
                }
            }
        } );
    };

        SolutionDisplay.prototype.
    onSolutionEditClick = function( ){  this.setMode( EDIT );  };

        SolutionDisplay.prototype.
    onEditSolutionInput = function( ){
        fitTextAreaToText( this.solutionInput );
        this.checkSolutionInput();
    };

        SolutionDisplay.prototype.
    onEditSolutionCancelClick = function( ){
        this.solutionInput.value = this.solution.content;
        this.setMode( VIEW );
    };

        SolutionDisplay.prototype.
    onEditSolutionSaveClick = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let solutionValue = this.solutionInput.value;

        // Require that solution is valid
        this.checkSolutionInput();
        if ( this.solutionTooShort  ||  this.solutionTooLong ){
            let message = ( this.solutionTooShort )?  'Solution is too short'  :  'Solution is too long';
            this.message = { color:RED, text:message };
            this.solutionValidity = message;
            this.messagesUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving solution...' };
        this.messagesUpdated();

        // Save to server
        let url = '/multi/editSolution';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:this.getProblemId() , solutionId:this.solution.id , solution:solutionValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.solution ){
                thisCopy.message = { color:GREEN, text:'Saved solution', ms:5000 };
                thisCopy.solution = receiveData.solution;
                thisCopy.onEditSolutionCancelClick();
                thisCopy.getParentDisplay().updateSolution( receiveData.solution );
                thisCopy.getParentDisplay().updateSolution( receiveData.solutionOld );
            }
            else {
                let message = 'Failed to save solution';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Solution is too short';  thisCopy.solutionValidity = message;  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Solution is too long';  thisCopy.solutionValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                    if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit solution that already has responses';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
            }
            thisCopy.dataUpdated();
        } );
    };

        SolutionDisplay.prototype.
    checkSolutionInput = function( ){
        let solutionValue = this.solutionInput.value;

        let solutionTooShortPrev = this.solutionTooShort;
        let solutionTooLongPrev = this.solutionTooLong;
        this.solutionTooShort =  (! solutionValue)  ||  ( solutionValue.length < minLengthReason );
        this.solutionTooLong =  solutionValue  &&  ( maxLengthReason < solutionValue.length );

        if ( (solutionTooShortPrev || solutionTooLongPrev)  &&  ! (this.solutionTooShort || this.solutionTooLong) ){
            this.message = { text:'' };
            this.solutionValidity = '';
            this.messagesUpdated();
        }
    };


        SolutionDisplay.prototype.
    onNewReasonFocus = function( event ){  this.newReasonInputFocused = true;  };

        SolutionDisplay.prototype.
    onNewReasonBlur = function( ){  this.newReasonInputFocused = false;  }

        SolutionDisplay.prototype.
    onNewReasonInput = function( event ){
        fitTextAreaToText( this.reasonInput );
        this.attributesUpdated();
        this.checkNewReasonInput();
        // If user cleared input... show top reasons
        if ( ! this.reasonInput.value.trim() ){
            this.suggestions = null;
            this.highlightWordsForReasons = null;
            this.dataUpdated();
            return;
        }
        // If user typed SPACE... retrieve suggestions 
        if ( event.data == ' ' ){  this.retrieveReasonSuggestions();  }
    };

        SolutionDisplay.prototype.
    retrieveReasonSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Retrieve suggestions only for first N words
        let reasonValue = this.reasonInput.value;
        let words = removeStopWords( tokenize(reasonValue) ).slice( 0, MAX_WORDS_INDEXED )  ||  [];

        // Suggest only if input is changed since last suggestion 
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;  }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve reasons, from server
        let url = '/multi/solutionReasonsForPrefix';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:this.getProblemId() , solutionId:this.solution.id , inputStart:contentStart
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
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
                thisCopy.highlightWordsForReasons = ( thisCopy.suggestions )?  contentStart  :  null;

                thisCopy.dataUpdated();
            }
        } );
    };

        SolutionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;

        SolutionDisplay.prototype.
    onNewReasonCancelClick = function( ){
        this.reasonInput.value = '';
        this.highlightWordsForReasons = null;
        this.suggestions = null;
        this.message = { text:'' };
        this.reasonValidity = '';
        this.dataUpdated();
    };

        SolutionDisplay.prototype.
    onNewProSaveClick = function( ){  this.saveNewReason( PRO );  };

        SolutionDisplay.prototype.
    onNewConSaveClick = function( ){  this.saveNewReason( CON );  };

        SolutionDisplay.prototype.
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
        let url = '/multi/newSolutionReason';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:this.getProblemId() , solutionId:this.solution.id , reason:reasonValue , proOrCon:proOrCon
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.reason ){
                thisCopy.message = { color:GREEN, text:'Saved reason', ms:3000 };

                if ( thisCopy.pros == null ){  thisCopy.pros = [];  }
                if ( thisCopy.cons == null ){  thisCopy.cons = [];  }
                if ( receiveData.reason.proOrCon == PRO ){  thisCopy.pros.push( receiveData.reason );  }
                else {  thisCopy.cons.push( receiveData.reason );  }

                thisCopy.reasonInput.value = '';
                thisCopy.highlightWordsForReasons = null;
                thisCopy.suggestions = null;
            }
            else {
                let message = 'Failed to save reason';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  thisCopy.reasonValidity = message;  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Reason is too long';  thisCopy.reasonValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
            }
            thisCopy.dataUpdated();
        } );
    };

        SolutionDisplay.prototype.
    checkNewReasonInput = RatingOptionDisplay.prototype.checkReasonInput;

        SolutionDisplay.prototype.
    getProblemId = function( ){  return ( this.problemDisplay )?  this.problemDisplay.problem.id  :  null;  }



/////////////////////////////////////////////////////////////////////////////////
// Display for problem

        function
    ProblemDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.mode = VIEW;
        this.idToSolution = { };
        this.solutionDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=ProblemDisplay id=Problem> ',
            '   <details id=Expander ontoggle=onExpanderToggle> ',
            '       <summary id=ExpanderSummary> ',
            //          Edit
            '           <div class=Edit> ',
            '               <span class=ContentTag translate=yes> Problem </span> ',
            '               <textarea class=ProblemContentInput id=ProblemContentInput title="Problem" placeholder="" ',
            '                   oninput=onEditProblemInput></textarea> ',
            '               <div class=SaveOrCancelButtons> ',
            '                   <button class=SaveButton id=SaveButton translate=yes onclick=onEditProblemSaveClick> Save </button> ',
            '                   <button class=CancelButton id=CancelButton translate=yes onclick=onEditProblemCancelClick> Cancel </button> ',
            '               </div> ',
            '           </div> ',
            //          View
            '           <div class=View> ',
            '               <div class=ContentViewWrap> ',
            '                   <span class=ContentTag translate=yes> Problem </span> ',
            '                   <span class=ProblemContent id=ProblemContent></span> ',
            '               </div> ',
            '               <div class=ProblemViewButtons> ',
            '                   <button class=ProblemEditButton id=ProblemEditButton onclick=onProblemEditClick translate=yes> Edit </button> ',
            '               </div> ',
            '           </div> ',
            //          Result
            '           <div class=Result> ',
            '               <div> ',
            '                   <span class=ContentTag translate=yes> Problem </span> ',
            '                   <span id=ProblemResultContent class=ProblemResultContent></span> ',
            '               </div> ',
            '           </div> ',
            '           <div class="Message" id=message aria-live=polite></div> ',
            '       </summary> ',
            //      Solutions
            '       <div class=View> ',
            '           <div class=NewSolutionWrap> ',
            '               <label for=NewSolutionInput translate=yes> Add or find solution </label> ',
            '               <textarea class=NewSolutionInput id=NewSolutionInput placeholder="I suggest..." oninput=onNewSolutionInput></textarea> ',
            '               <div class=SaveOrCancelButtons> ',
            '                   <button class=SaveButton id=SaveButton translate=yes onclick=onNewSolutionSaveClick> Save </button> ',
            '                   <button class=CancelButton id=CancelButton translate=yes onclick=onNewSolutionCancelClick> Cancel </button> ',
            '               </div> ',
            '           </div> ',
            '       </div> ',
            '       <div id=Solutions class=Solutions></div> ',
            '   </details> ',
            ' </div> '
        ].join('\n') );
    }
    ProblemDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        ProblemDisplay.prototype.
    setInitialData = RatingQuestionDisplay.prototype.setInitialData;

        ProblemDisplay.prototype.
    setData = RatingQuestionDisplay.prototype.setData;

        ProblemDisplay.prototype.
    setInitialData = function( problemData, questionDisplay, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.questionDisplay = questionDisplay;
        this.setData( problemData, null );
        return this;
    };

        ProblemDisplay.prototype.
    setData = function( problemData, problemAnswer, highlightWords ){
        this.problem = problemData;
        this.highlightWords = highlightWords;
        this.setAnswer( problemAnswer );
    };

        ProblemDisplay.prototype.
    setAnswer = function( problemAnswer ){
        this.answer = problemAnswer;
        this.dataUpdated();
    };


    // Update this.element
        ProblemDisplay.prototype.
    dataUpdated = function( ){
        let thisCopy = this;
        this.problemInput = this.getSubElement('ProblemContentInput');
        this.solutionInput = this.getSubElement('NewSolutionInput');

        this.messagesUpdated();
        this.attributesUpdated();

        // Edit
        this.setProperty( 'ProblemContentInput', 'defaultValue', this.problem.content );

        // View
        displayHighlightedContent( storedTextToHtml(this.problem.content), this.highlightWords, this.getSubElement('ProblemContent') );
        setTimeout( () => fitTextAreaToText(thisCopy.solutionInput) , 200 );

        // Result
        this.setInnerHtml( 'ProblemResultContent', this.problem.content );

        // Subdisplays for solutions
        // Update collection of subdisplays: set data & keys, create/reorder displays, update displays
        let hasSuggestionMatches = ! isEmpty( this.suggestions );
        if ( hasSuggestionMatches  &&  (this.mode == VIEW) ){  this.solutionDisplays.data = this.suggestions;  }
        else {  this.solutionDisplays.data = isEmpty( this.solutions )?  []  :  this.solutions.slice();  }
        this.solutionDisplays.data.forEach(  s => { s.key = String(s.id) }  );
        if ( this.mode == RESULT ){
            this.solutionDisplays.data = this.solutionDisplays.data.sort( (a,b) => b.score - a.score );  // Order problem results by net pros
        }
        this.updateSubdisplays( this.solutionDisplays, this.getSubElement('Solutions') ,
            ( solutionData ) =>
                new SolutionDisplay( solutionData.id )
                .setInitialData( solutionData, thisCopy, thisCopy.questionDisplay, thisCopy.surveyDisplay )
        );
        if ( this.solutionDisplays.displays ){   this.solutionDisplays.displays.forEach(  (s,i) => {
            let solutionAnswer = ( thisCopy.answer )?  thisCopy.answer[ s.key ]  :  null;
            s.setData( thisCopy.solutionDisplays.data[i], solutionAnswer, thisCopy.highlightWordsForSolutions );
        }  );   }
        this.setSolutionModes( this.mode );
    };

        ProblemDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('message') );
        this.problemInput.setCustomValidity( this.problemValidity || '' );
        this.solutionInput.setCustomValidity( this.solutionValidity || '' );
    };

        ProblemDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'Problem', 'mine', (this.problem.mine ? TRUE : FALSE) );
        this.setAttribute( 'Problem', 'mode', this.mode );
        this.setAttribute( 'Problem', 'hasnewsolutioninput', (this.solutionInput.value ? TRUE : FALSE) );
        this.setAttribute( 'Problem', 'allowedit', (this.problem.mine && !this.problem.hasResponse && isEmpty(this.solutions))? TRUE : FALSE );

        this.problemInput.disabled = ! this.questionDisplay.allowInput();
        this.setProperty( 'SaveButton', 'disabled', ! this.questionDisplay.allowInput() );
        this.setProperty( 'CancelButton', 'disabled', ! this.questionDisplay.allowInput() );
    };

        ProblemDisplay.prototype.
    setMode = function( newMode ){  this.mode = newMode;  this.attributesUpdated();  this.setSolutionModes( newMode );  };

        ProblemDisplay.prototype.
    setSolutionModes = function( newMode ){
        if ( newMode == EDIT ){  return;  }
        this.solutionDisplays.displays.forEach( d => d.setMode(newMode) );
    };

        ProblemDisplay.prototype.
    collapseOtherSolutions = function( expandedSolutionDisplay ){
        this.solutionDisplays.displays.forEach( s => {
            if ( s != expandedSolutionDisplay ){  s.collapse();  }
        } );
    };

        ProblemDisplay.prototype.
    collapse = function( ){  this.getSubElement('Expander').open = false;  }

        ProblemDisplay.prototype.
    expand = function( ){  this.getSubElement('Expander').open = true;  }

        ProblemDisplay.prototype.
    onExpanderToggle = function( event ){
        let expander = this.getSubElement('Expander');
        let summary = this.getSubElement('ExpanderSummary');
        if ( expander.open ){
            if ( this.solutions == null ){  this.retrieveSolutions();  }
            this.questionDisplay.collapseOtherProblems( this );
            if ( isPartlyOffScreen(summary) ){  scrollToHtmlElement( summary );  }
        }
    };

        ProblemDisplay.prototype.
    retrieveSolutions = function( ){
        // Retrieve top solutions from server
        let url = '/multi/topSolutions/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id + '/' + this.problem.id;
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                // Collect map{ id -> solution }
                if ( receiveData.solutions ){   receiveData.solutions.forEach(  s => { if (s.id) thisCopy.idToSolution[s.id] = s; }  )   }
                thisCopy.solutions = Object.values( thisCopy.idToSolution );
                thisCopy.dataUpdated();
            }
            else {
                let message = 'Failed to load solutions';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Solution is too short';  thisCopy.solutionValidity = message;  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Solution is too long';  thisCopy.solutionValidity = message;  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };

        ProblemDisplay.prototype.
    updateSolution = function( solutionData ){
        if ( ! solutionData ){  return;  }

        // Replace existing solution-data with matching ID
        for ( let s = 0;  s < this.solutions.length;  ++s ){
            if ( this.solutions[s].id == solutionData.id ){
                this.solutions[ s ] = solutionData;
            }
        }
    };


        ProblemDisplay.prototype.
    onProblemEditClick = function( ){  this.setMode( EDIT );  };

        ProblemDisplay.prototype.
    onEditProblemInput = function( ){
        fitTextAreaToText( this.problemInput );
        this.checkProblemInput();
    };

        ProblemDisplay.prototype.
    onEditProblemCancelClick = function( ){
        this.problemInput.value = this.problem.content;
        this.setMode( VIEW );
    };

        ProblemDisplay.prototype.
    onEditProblemSaveClick = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Require that problem changed
        let problemValue = this.problemInput.value;
        if ( problemValue == this.problem.content ){  this.setMode( VIEW );  return;  }

        // Require that problem is valid
        this.checkProblemInput();
        if ( this.problemTooShort  ||  this.problemTooLong ){
            let message = ( this.problemTooShort )?  'Problem is too short'  :  'Problem is too long';
            this.message = { color:RED, text:message };
            this.problemValidity = message;
            this.messagesUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving problem...' };
        this.messagesUpdated();

        // Save to server
        let url = '/multi/editProblem';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:this.problem.id , problem:problemValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.problem ){
                thisCopy.message = { color:GREEN, text:'Saved problem', ms:5000 };
                thisCopy.problem = receiveData.problem;
                thisCopy.onEditProblemCancelClick();
                thisCopy.questionDisplay.updateProblem( receiveData.problem );
                thisCopy.questionDisplay.updateProblem( receiveData.problemOld );
            }
            else {
                let message = 'Failed to save problem';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Problem is too short';  thisCopy.problemValidity = message;  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Problem is too long';  thisCopy.problemValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                    if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit problem that already has responses';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
            }
            thisCopy.dataUpdated();
        } );
    };

        ProblemDisplay.prototype.
    checkProblemInput = function( ){
        let problemValue = this.problemInput.value;

        let problemTooShortPrev = this.problemTooShort;
        let problemTooLongPrev = this.problemTooLong;
        this.problemTooShort =  (! problemValue)  ||  ( problemValue.length < minLengthReason );
        this.problemTooLong =  problemValue  &&  ( maxLengthReason < problemValue.length );

        if ( (problemTooShortPrev || problemTooLongPrev)  &&  ! (this.problemTooShort || this.problemTooLong) ){
            this.message = { text:'' };
            this.problemValidity = '';
            this.messagesUpdated();
        }
    };

        ProblemDisplay.prototype.
    onNewSolutionInput = function( event ){
        fitTextAreaToText( this.solutionInput );
        this.attributesUpdated();
        this.checkNewSolutionInput();
        // If user cleared input... show top solutions
        if ( ! this.solutionInput.value.trim() ){
            this.suggestions = null;
            this.highlightWordsForSolutions = null;
            this.dataUpdated();
            return;
        }
        // If user typed SPACE... retrieve suggestions 
        if ( event.data == ' ' ){  this.retrieveSolutionSuggestions();  }
    };

        ProblemDisplay.prototype.
    checkNewSolutionInput = function( event ){
        let solutionValue = this.solutionInput.value;

        let solutionTooShortPrev = this.solutionTooShort;
        let solutionTooLongPrev = this.solutionTooLong;
        this.solutionTooShort =  (! solutionValue)  ||  ( solutionValue.length < minLengthReason );
        this.solutionTooLong =  solutionValue  &&  ( maxLengthReason < solutionValue.length );

        if ( (solutionTooShortPrev || solutionTooLongPrev)  &&  ! (this.solutionTooShort || this.solutionTooLong) ){
            this.message = { text:'' };
            this.solutionValidity = '';
            this.messagesUpdated();
        }
    };

        ProblemDisplay.prototype.
    retrieveSolutionSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Retrieve suggestions only for first N words
        let inputValue = this.solutionInput.value;
        let words = removeStopWords( tokenize(inputValue) ).slice( 0, MAX_WORDS_INDEXED )  ||  [];

        // Suggest only if input is changed since last suggestion 
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;  }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve solutions, from server
        let url = '/multi/solutionsForPrefix';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:this.problem.id , inputStart:contentStart
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.suggestions ){
                // Collect suggestions and calculate IDF weights across words 
                if ( ! thisCopy.suggestionTextToData ){  thisCopy.suggestionTextToData = {};  }
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
                thisCopy.highlightWordsForSolutions = ( thisCopy.suggestions )?  contentStart  :  null;

                thisCopy.dataUpdated();
            }
        } );
    };

        ProblemDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;

        ProblemDisplay.prototype.
    onNewSolutionCancelClick = function( ){
        this.solutionInput.value = '';
        this.highlightWordsForSolutions = null;
        this.suggestions = null;
        this.message = { text:'' };
        this.solutionValidity = '';
        this.dataUpdated();
    };

        ProblemDisplay.prototype.
    onNewSolutionSaveClick = function( ){  this.saveNewSolution();  }

        ProblemDisplay.prototype.
    saveNewSolution = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let solutionValue = this.solutionInput.value;

        // Require that solution is valid
        this.checkNewSolutionInput();
        if ( this.solutionTooShort  ||  this.solutionTooLong ){
            let message = ( this.solutionTooShort )?  'Solution is too short'  :  'Solution is too long';
            this.message = { color:RED, text:message };
            this.solutionValidity = message;
            this.messagesUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving solution...' };
        this.messagesUpdated();

        // Save to server
        let url = '/multi/newSolution';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:this.problem.id , solution:solutionValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.solution ){
                thisCopy.message = { color:GREEN, text:'Saved solution', ms:3000 };

                if ( thisCopy.solutions == null ){  thisCopy.solutions = [];  }
                thisCopy.solutions.push( receiveData.solution );

                thisCopy.solutionInput.value = '';
                thisCopy.highlightWordsForSolutions = null;
                thisCopy.suggestions = null;

                thisCopy.dataUpdated();
                last( thisCopy.solutionDisplays.displays ).expand();
            }
            else {
                let message = 'Failed to save solution';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Solution is too short';  thisCopy.solutionValidity = message;  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Solution is too long';  thisCopy.solutionValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
                thisCopy.messagesUpdated();
            }
        } );
    };





/////////////////////////////////////////////////////////////////////////////////
// Display for request-for-problems question

        function
    RequestProblemsQuestionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.idToProblem = { };
        this.problemDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=RequestProblemsQuestionDisplay id=RequestProblemsQuestionDisplay> ',
            '   <div class=Message id=Message aria-live=polite></div> ',
            //  View
            '   <div class=View> ',
            '       <div class=NewProblemWrap> ',
            '           <label for=NewProblemInput translate=yes> Add or find problem </label> ',
            '           <textarea class=NewProblemInput id=NewProblemInput placeholder="..." oninput=onNewProblemInput></textarea> ',
            '           <div class=SaveOrCancelButtons> ',
            '               <button class=SaveButton id=SaveButton translate=yes onclick=onNewProblemSaveClick> Save </button> ',
            '               <button class=CancelButton id=CancelButton translate=yes onclick=onNewProblemCancelClick> Cancel </button> ',
            '           </div> ',
            '       </div> ',
            '   </div> ',
            //  Result
            '   <div class=Result> ',
            '   </div> ',
            //  Problems
            '   <div class=Problems id=Problems></div> ',
            ' </div>'
        ].join('\n') );
    }
    RequestProblemsQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        RequestProblemsQuestionDisplay.prototype.
    setInitialData = ProposalQuestionDisplay.prototype.setInitialData;

        RequestProblemsQuestionDisplay.prototype.
    setData = ProposalQuestionDisplay.prototype.setData;

        RequestProblemsQuestionDisplay.prototype.
    setAnswer = ProposalQuestionDisplay.prototype.setAnswer;


    // Update from data to html
        RequestProblemsQuestionDisplay.prototype.
    dataUpdated = function( ){
        let thisCopy = this;
        this.problemInput = this.getSubElement('NewProblemInput');

        this.messagesUpdated();
        this.attributesUpdated();

        setTimeout( () => fitTextAreaToText(thisCopy.problemInput) , 200 );

        // Update collection of subdisplays: set data & keys, create/reorder displays, update displays
        let hasSuggestionMatches = ! isEmpty( this.suggestions );
        if ( hasSuggestionMatches  &&  (this.mode == VIEW) ){
            this.problemDisplays.data = this.suggestions;
        }
        else {
            this.problemDisplays.data = isEmpty( this.problems )?  []  :  this.problems.slice();
        }
        this.problemDisplays.data.forEach( p => p.key = String(p.id) );
        if ( this.mode == RESULT ){
            this.problemDisplays.data = this.problemDisplays.data.sort( (a,b) => b.score - a.score );  // Order problem results by net pros
        }
        this.updateSubdisplays( this.problemDisplays , this.getSubElement('Problems') ,
            (problemData) => new ProblemDisplay( problemData.id ).setInitialData( problemData, thisCopy, thisCopy.surveyDisplay )
        );
        this.problemDisplays.displays.forEach(  (d, i) => {
            let problemAnswer = ( thisCopy.answer )?  thisCopy.answer[ d.key ]  :  null;
            d.setData( thisCopy.problemDisplays.data[i] , problemAnswer , thisCopy.highlightWords );
        }  );
        this.setProblemModes( this.mode );
    };

        RequestProblemsQuestionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.problemInput.setCustomValidity( this.problemValidity || '' );
    };

        RequestProblemsQuestionDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'RequestProblemsQuestionDisplay', 'mode', this.mode );
        this.setAttribute( 'RequestProblemsQuestionDisplay', 'hasnewprobleminput', (this.getSubElement('NewProblemInput').value ? TRUE : FALSE) );
        this.setProperty( 'NewProblemInput', 'disabled', ! this.isQuestionValid() );
        this.setProperty( 'SaveButton', 'disabled', ! this.isQuestionValid() );
        this.setProperty( 'CancelButton', 'disabled', ! this.isQuestionValid() );
    };

        RequestProblemsQuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.surveyDisplay.isFrozen() );  };

        RequestProblemsQuestionDisplay.prototype.
    isQuestionValid = function( ){  return this.questionDisplay.isQuestionValid();  };

        RequestProblemsQuestionDisplay.prototype.
    setMode = function( newMode ){  this.mode = newMode;  this.attributesUpdated();  this.setProblemModes( newMode );  };

        RequestProblemsQuestionDisplay.prototype.
    setProblemModes = function( newMode ){
        if ( newMode == EDIT ){  return;  }
        this.problemDisplays.displays.forEach( d => d.setMode(newMode) );
    };

        RequestProblemsQuestionDisplay.prototype.
    collapseOtherProblems = function( expandedProblemDisplay ){
        this.problemDisplays.displays.forEach( p => {
            if ( p != expandedProblemDisplay ){  p.collapse();  }
        } );
    };

        RequestProblemsQuestionDisplay.prototype.
    focusInitialInput = function( event ){  };

        RequestProblemsQuestionDisplay.prototype.
    retrieveData = function( ){  this.retrieveProblems();  };

        RequestProblemsQuestionDisplay.prototype.
    retrieveProblems = function( ){
        // Retrieve top problems from server
        let url = '/multi/topProblems/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id;
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                // Collect map{ id -> problem }
                if ( receiveData.problems ){   receiveData.problems.forEach(  p => { if (p.id) thisCopy.idToProblem[p.id] = p; }  )   }
                thisCopy.problems = Object.values( thisCopy.idToProblem );
                thisCopy.dataUpdated();
            }
            else {
                let message = 'Failed to load problems';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Problem is too short';  thisCopy.problemValidity = message;  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };

        RequestProblemsQuestionDisplay.prototype.
    updateProblem = function( problemData ){
        if ( ! problemData ){  return;  }

        // Replace existing problem-data with matching ID
        for ( let p = 0;  p < this.problems.length;  ++p ){
            if ( this.problems[ p ].id == problemData.id ){
                this.problems[ p ] = problemData;
            }
        }
        this.dataUpdated();
    };


        RequestProblemsQuestionDisplay.prototype.
    onNewProblemInput = function( event ){
        fitTextAreaToText( this.problemInput );
        this.attributesUpdated();
        this.checkNewProblemInput();
        // If user cleared input... show top problems
        if ( ! this.problemInput.value.trim() ){  this.suggestions = null;  this.highlightWords = null;  this.dataUpdated();  return;  }
        // If user typed SPACE... retrieve suggestions 
        if ( event.data == ' ' ){  this.retrieveProblemSuggestions();  }
    };

        RequestProblemsQuestionDisplay.prototype.
    checkNewProblemInput = function( event ){
        let problemValue = this.problemInput.value;

        let problemTooShortPrev = this.problemTooShort;
        let problemTooLongPrev = this.problemTooLong;
        this.problemTooShort =  (! problemValue)  ||  ( problemValue.length < minLengthReason );
        this.problemTooLong =  problemValue  &&  ( maxLengthReason < problemValue.length );

        if ( (problemTooShortPrev || problemTooLongPrev)  &&  ! (this.problemTooShort || this.problemTooLong) ){
            this.message = { text:'' };
            this.problemValidity = '';
            this.messagesUpdated();
        }
    };

        RequestProblemsQuestionDisplay.prototype.
    retrieveProblemSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Retrieve suggestions only for first N words
        let inputValue = this.problemInput.value;
        let words = removeStopWords( tokenize(inputValue) ).slice( 0, MAX_WORDS_INDEXED )  ||  [];

        // Suggest only if input is changed since last suggestion 
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;  }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve problems, from server
        let url = '/multi/problemsForPrefix';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            inputStart:contentStart
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.suggestions ){
                // Collect suggestions and calculate IDF weights across words 
                if ( ! thisCopy.suggestionTextToData ){  thisCopy.suggestionTextToData = {};  }
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

        RequestProblemsQuestionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;

        RequestProblemsQuestionDisplay.prototype.
    onNewProblemCancelClick = function( ){
        this.problemInput.value = '';
        this.highlightWords = null;
        this.suggestions = null;
        this.message = { text:'' };
        this.problemValidity = '';
        this.dataUpdated();
    };

        RequestProblemsQuestionDisplay.prototype.
    onNewProblemSaveClick = function( ){  this.saveNewProblem();  }

        RequestProblemsQuestionDisplay.prototype.
    saveNewProblem = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let problemValue = this.problemInput.value;

        // Require that problem is valid
        this.checkNewProblemInput();
        if ( this.problemTooShort  ||  this.problemTooLong ){
            let message = ( this.problemTooShort )?  'Problem is too short'  :  'Problem is too long';
            this.message = { color:RED, text:message };
            this.problemValidity = message;
            this.messagesUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving problem...' };
        this.messagesUpdated();

        // Save to server
        let url = '/multi/newProblem';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problem:problemValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.problem ){
                thisCopy.message = { color:GREEN, text:'Saved problem', ms:3000 };

                if ( thisCopy.problems == null ){  thisCopy.problems = [];  }
                thisCopy.problems.push( receiveData.problem );

                thisCopy.problemInput.value = '';
                thisCopy.highlightWords = null;
                thisCopy.suggestions = null;

                thisCopy.dataUpdated();
                last( thisCopy.problemDisplays.displays ).expand();
            }
            else {
                let message = 'Failed to save problem';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Problem is too short';  thisCopy.problemValidity = message;  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Problem is too long';  thisCopy.problemValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
                thisCopy.messagesUpdated();
            }
        } );
    };




/////////////////////////////////////////////////////////////////////////////////
// Display for request-for-solutions question

        function
    RequestSolutionsQuestionDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.idToSolution = { };
        this.solutionDisplays = { data:[] };

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            ' <div class=RequestSolutionsQuestionDisplay id=RequestSolutionsQuestionDisplay> ',
            '   <div class=Message id=Message aria-live=polite></div> ',
            //  View
            '   <div class=View> ',
            '       <div class=NewSolutionWrap> ',
            '           <label for=NewSolutionInput translate=yes> Add or find solution </label> ',
            '           <textarea class=NewSolutionInput id=NewSolutionInput placeholder="..." oninput=onNewSolutionInput></textarea> ',
            '           <div class=SaveOrCancelButtons> ',
            '               <button class=SaveButton id=SaveButton translate=yes onclick=onNewSolutionSaveClick> Save </button> ',
            '               <button class=CancelButton id=CancelButton translate=yes onclick=onNewSolutionCancelClick> Cancel </button> ',
            '           </div> ',
            '       </div> ',
            '   </div> ',
            //  Result
            //  Solutions
            '   <div class=Solutions id=Solutions></div> ',
            ' </div>'
        ].join('\n') );
    }
    RequestSolutionsQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        RequestSolutionsQuestionDisplay.prototype.
    setInitialData = ProposalQuestionDisplay.prototype.setInitialData;

        RequestSolutionsQuestionDisplay.prototype.
    setData = ProposalQuestionDisplay.prototype.setData;

        RequestSolutionsQuestionDisplay.prototype.
    setAnswer = ProposalQuestionDisplay.prototype.setAnswer;


    // Update from data to html
        RequestSolutionsQuestionDisplay.prototype.
    dataUpdated = function( ){
        let thisCopy = this;
        this.solutionInput = this.getSubElement('NewSolutionInput');

        this.messagesUpdated();
        this.attributesUpdated();

        setTimeout( () => fitTextAreaToText(thisCopy.solutionInput) , 200 );

        // Update collection of subdisplays: set data & keys, create/reorder displays, update displays
        let hasSuggestionMatches = ! isEmpty( this.suggestions );
        if ( hasSuggestionMatches  &&  (this.mode == VIEW) ){
            this.solutionDisplays.data = this.suggestions;
        }
        else {
            this.solutionDisplays.data = isEmpty( this.solutions )?  []  :  this.solutions.slice();
        }
        this.solutionDisplays.data.forEach( s => s.key = String(s.id) );
        if ( this.mode == RESULT ){
            this.solutionDisplays.data = this.solutionDisplays.data.sort( (a,b) => b.score - a.score );  // Order solution results by net pros
        }
        this.updateSubdisplays( this.solutionDisplays , this.getSubElement('Solutions') ,
            (solutionData) => new SolutionDisplay( solutionData.id ).setInitialData( solutionData, null, thisCopy, thisCopy.surveyDisplay )
        );
        this.solutionDisplays.displays.forEach(  (d, i) => {
            let solutionAnswer = ( thisCopy.answer )?  thisCopy.answer[ d.key ]  :  null;
            d.setData( thisCopy.solutionDisplays.data[i] , solutionAnswer , thisCopy.highlightWords );
        }  );
        this.setSolutionModes( this.mode );
    };

        RequestSolutionsQuestionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.solutionInput.setCustomValidity( this.solutionValidity || '' );
    };

        RequestSolutionsQuestionDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'RequestSolutionsQuestionDisplay', 'mode', this.mode );
        this.setAttribute( 'RequestSolutionsQuestionDisplay', 'hasnewsolutioninput', (this.solutionInput.value ? TRUE : FALSE) );
        this.solutionInput.disabled = ! this.isQuestionValid();
        this.setProperty( 'SaveButton', 'disabled', ! this.isQuestionValid() );
        this.setProperty( 'CancelButton', 'disabled', ! this.isQuestionValid() );
    };

        RequestSolutionsQuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.surveyDisplay.isFrozen() );  };

        RequestSolutionsQuestionDisplay.prototype.
    isQuestionValid = function( ){  return this.questionDisplay.isQuestionValid();  };

        RequestSolutionsQuestionDisplay.prototype.
    setMode = function( newMode ){  this.mode = newMode;  this.attributesUpdated();  this.setSolutionModes( newMode );  };

        RequestSolutionsQuestionDisplay.prototype.
    setSolutionModes = function( newMode ){
        if ( newMode == EDIT ){  return;  }
        this.solutionDisplays.displays.forEach( d => d.setMode(newMode) );
    };

        RequestSolutionsQuestionDisplay.prototype.
    collapseOtherSolutions = function( expandedSolutionDisplay ){
        this.solutionDisplays.displays.filter( s => (s != expandedSolutionDisplay) ).forEach( s => s.collapse() );
    };

        RequestSolutionsQuestionDisplay.prototype.
    focusInitialInput = function( event ){  };

        RequestSolutionsQuestionDisplay.prototype.
    retrieveData = function( ){  this.retrieveSolutions();  };

        RequestSolutionsQuestionDisplay.prototype.
    retrieveSolutions = function( ){
        // Retrieve top solutions from server
        let url = '/multi/topSolutions/' + this.surveyDisplay.link.id + '/' + this.questionDisplay.question.id;
        let sendData = {  crumb:crumb , fingerprint:fingerprint  };
        let thisCopy = this;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                // Collect map{ id -> solution }
                if ( receiveData.solutions ){   receiveData.solutions.forEach(  s => { if (s.id) thisCopy.idToSolution[s.id] = s; }  )   }
                thisCopy.solutions = Object.values( thisCopy.idToSolution );
                thisCopy.dataUpdated();
            }
            else {
                let message = 'Failed to load solutions';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Problem is too short';  thisCopy.solutionValidity = message;  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };

        RequestSolutionsQuestionDisplay.prototype.
    updateSolution = function( solutionData ){
        if ( ! solutionData ){  return;  }

        // Replace existing solution-data with matching ID
        for ( let s = 0;  s < this.solutions.length;  ++s ){
            if ( this.solutions[ s ].id == solutionData.id ){
                this.solutions[ s ] = solutionData;
            }
        }
        this.dataUpdated();
    };


        RequestSolutionsQuestionDisplay.prototype.
    onNewSolutionInput = function( event ){
        fitTextAreaToText( this.solutionInput );
        this.attributesUpdated();
        this.checkNewSolutionInput();
        // If user cleared input... show top solutions
        if ( ! this.solutionInput.value.trim() ){  this.suggestions = null;  this.highlightWords = null;  this.dataUpdated();  return;  }
        // If user typed SPACE... retrieve suggestions 
        if ( event.data == ' ' ){  this.retrieveSolutionSuggestions();  }
    };

        RequestSolutionsQuestionDisplay.prototype.
    checkNewSolutionInput = function( event ){
        let solutionValue = this.solutionInput.value;

        let solutionTooShortPrev = this.solutionTooShort;
        let solutionTooLongPrev = this.solutionTooLong;
        this.solutionTooShort =  (! solutionValue)  ||  ( solutionValue.length < minLengthReason );
        this.solutionTooLong =  solutionValue  &&  ( maxLengthReason < solutionValue.length );

        if ( (solutionTooShortPrev || solutionTooLongPrev)  &&  ! (this.solutionTooShort || this.solutionTooLong) ){
            this.message = { text:'' };
            this.solutionValidity = '';
            this.messagesUpdated();
        }
    };

        RequestSolutionsQuestionDisplay.prototype.
    retrieveSolutionSuggestions = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Retrieve suggestions only for first N words
        let inputValue = this.solutionInput.value;
        let words = removeStopWords( tokenize(inputValue) ).slice( 0, MAX_WORDS_INDEXED )  ||  [];

        // Suggest only if input is changed since last suggestion 
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;  }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve problems, from server
        let url = '/multi/solutionsForPrefix';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:null , inputStart:contentStart
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.suggestions ){
                // Collect suggestions and calculate IDF weights across words 
                if ( ! thisCopy.suggestionTextToData ){  thisCopy.suggestionTextToData = {};  }
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

        RequestSolutionsQuestionDisplay.prototype.
    scoreMatches = RatingOptionDisplay.prototype.scoreMatches;

        RequestSolutionsQuestionDisplay.prototype.
    onNewSolutionCancelClick = function( ){
        this.solutionInput.value = '';
        this.highlightWords = null;
        this.suggestions = null;
        this.message = { text:'' };
        this.solutionValidity = '';
        this.dataUpdated();
    };

        RequestSolutionsQuestionDisplay.prototype.
    onNewSolutionSaveClick = function( ){  this.saveNewSolution();  }

        RequestSolutionsQuestionDisplay.prototype.
    saveNewSolution = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let solutionValue = this.solutionInput.value;

        // Require that problem is valid
        this.checkNewSolutionInput();
        if ( this.solutionTooShort  ||  this.solutionTooLong ){
            let message = ( this.solutionTooShort )?  'Solution is too short'  :  'Solution is too long';
            this.message = { color:RED, text:message };
            this.solutionValidity = message;
            this.messagesUpdated();
            return;
        }

        this.message = { color:GREY, text:'Saving solution...' };
        this.messagesUpdated();

        // Save to server
        let url = '/multi/newSolution';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.surveyDisplay.link.id , questionId:this.questionDisplay.question.id ,
            problemId:null , solution:solutionValue
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.solution ){
                thisCopy.message = { color:GREEN, text:'Saved solution', ms:3000 };

                if ( thisCopy.solutions == null ){  thisCopy.solutions = [];  }
                thisCopy.solutions.push( receiveData.solution );
                thisCopy.solutionInput.value = '';
                thisCopy.highlightWords = null;
                thisCopy.suggestions = null;
                thisCopy.dataUpdated();

                last( thisCopy.solutionDisplays.displays ).expand();
            }
            else {
                let message = 'Failed to save solution';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Solution is too short';  thisCopy.solutionValidity = message;  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Solution is too long';  thisCopy.solutionValidity = message;  }
                    if ( receiveData.message == FROZEN ){  message = 'Survey is frozen';  }
                }
                thisCopy.message = { color:RED, text:message, ms:9000 };
                thisCopy.messagesUpdated();
            }
        } );
    };


