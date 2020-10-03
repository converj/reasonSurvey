/////////////////////////////////////////////////////////////////////////////////
// Constants

    const EDIT = 'edit';
    const PRO = 'pro';
    const CON = 'con';
    const PROPOSAL_COLLAPSE_HEIGHT = 200;  // Must match css max-height for class Collapseable
    const TRUE = 'true';
    const FALSE = 'false';
    const LOAD_INCREMENTAL = true;


/////////////////////////////////////////////////////////////////////////////////
// Data initialization


    // Not used, because data comes sorted by server

        function
    initializeProposals( reqPropData ) {
        // modifies reqPropData
        
        if ( reqPropData.initialized ){  return;  }
        
        // proposals:series[proposal] , modified
        // reasons:series[reason] , modified
        var request = reqPropData.request;
        var proposals = reqPropData.proposals;
        var reasons = reqPropData.reasons;
        
        // group reasons under proposals
        proposals.map(  function(p){ p.reasons = []; }  );
        for ( var r = 0;  r < reasons.length;  ++r ){
            var reason = reasons[r];
            var proposal = proposals.find( function(p){ return (p.id == reason.proposalId); } );
            if ( proposal ){
                proposal.reasons.push( reason );
                if ( ! reason.voteCount ) {  reason.voteCount = 0;  }
                if ( ! reason.score ) {  reason.score = 0;  }
            }
        }

        // join votes to reasons
        joinReasonVotes( reqPropData.reasonVotes, reqPropData.myVotes, reqPropData );
        
        // order reasons by score
        for ( var p = 0;  p < proposals.length;  ++p ) { 
            var proposal = proposals[p];
            if ( ! proposal.reasons ){  proposal.reasons = [];  }
            proposal.reasons.sort(  function(a,b){ return (b.score - a.score); }  );
        }

        // order proposals by pro votes - con votes
        proposals.map( function(p){
            p.numPros = 0;
            p.numCons = 0;
            p.reasons.map( function(r){ 
                if ( r.proOrCon == PRO ){  p.numPros += r.voteCount;  }
                else if ( r.proOrCon == CON ){  p.numCons += r.voteCount;  }
            } );
        } );
        proposals.sort(  function(a,b){ return ((b.numPros-b.numCons) - (a.numPros-a.numCons)); }  );

        reqPropData.initialized = true;
    }




/////////////////////////////////////////////////////////////////////////////////
// Reason display

    // Class that creates and updates a reason div.
        function
    ReasonDisplay( reasonId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap.
        this.messageColor = GREY;
        this.create( reasonId );
    }
    ReasonDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap.

    // Create html element object, store it in this.element
        ReasonDisplay.prototype.
    create = function( reasonId ){
        this.createFromHtml( reasonId, '\n\n' + [
            '<div class=Reason id=Reason>',
            // Viewing
            '   <div class=ReasonViewing>',
            '       <div class=ReasonProOrCon id=ReasonProOrConViewing></div>',
            '       <div class=ReasonVote id=Vote onclick=handleVoteClick title="Click to vote" ',
            '           role=button title=Vote tabindex=0 onkeyup=handleVoteKeyUp ',
            '           aria-controls=ReasonEditing >',
            '           <div class=ReasonVoteArrowBody></div>',
            '           <div class=ReasonVoteArrowHead></div>',
            '           <div class=ReasonVoteCount id=ReasonVoteCount></div>',
            '           <div class=ReasonScore id=score></div>',
            '       </div>',
            '       <div class=EditIcon id=EditIcon role=button title="Click to edit" tabindex=0 onkeyup=onEditReasonKeyUp ',
            '           onclick=handleEditReasonClick aria-controls=ReasonEditing ',
            '           ><img class=EditIconImage role=button src="edit.png" alt="edit" /></div>',
            '       <div class=ReasonText id=ReasonText onclick=handleEditReasonClick aria-controls=ReasonEditing ></div>',
            '   </div>',
            // Editing
            '    <div class=ReasonEditing id=ReasonEditing>', 
            '        <div class=ReasonProOrCon id=ReasonProOrConEditing></div>',
            '        <div class=ReasonEdit>', 
            '            <textarea class=ReasonEditInput id=Content placeholder="reason text" ',
            '                onblur=handleEditReasonBlur oninput=onInput></textarea>',
            '        </div>',
            '        <div class=ReasonEditingButtons>',
            '            <button class=ReasonSaveButton onclick=handleEditReasonSave ',
            '               onblur=handleEditReasonBlur> Save </button>',
            '            <button class=ReasonCancelButton onclick=handleEditReasonCancel ',
            '               onblur=handleEditReasonBlur onkeyup=onEditReasonCancelKeyUp> Cancel </button>',
            '        </div>',
            '    </div>',
            '    <div class="Message ReasonEditMessage" id=ReasonEditMessage role=alert ></div>',
            '</div>'
        ].join('\n') );
    };
    
        ReasonDisplay.prototype.
    handleVoteKeyUp = function( event ){
        if ( event.key == KEY_NAME_ENTER ){  this.handleVoteClick();  }
    };

        ReasonDisplay.prototype.
    setAllData = function( reasonData, topDisp, proposalDisplay ){
        this.data = reasonData;
        this.wordToCount = null;
        this.topDisp = topDisp;
        this.proposalDisplay = proposalDisplay;
        this.dataUpdated();
    };

    // Update this.element
        ReasonDisplay.prototype.
    dataUpdated = function( ){

        this.setInnerHtml( 'ReasonProOrConViewing', this.data.proOrCon );
        this.setInnerHtml( 'ReasonProOrConEditing', this.data.proOrCon );
        // Message
        this.message = showMessageStruct( this.message, this.getSubElement('ReasonEditMessage') );
        var contentInput = this.getSubElement('Content');
        contentInput.setCustomValidity( defaultTo(this.contentValidity, '') );

        // Editing vs viewing
        this.setAttribute( 'Reason', 'editing', this.editing );
        this.setAttribute( 'Reason', 'frozen', this.topDisp.isFrozen() );
        // Editing aria state
        var ariaExpanded = null;
        if ( this.editable() ){  ariaExpanded = ( this.editing == EDIT ) ? TRUE : FALSE;  }
        this.setAttribute( 'EditIcon', 'aria-expanded', ariaExpanded );
        this.setAttribute( 'ReasonText', 'aria-expanded', ariaExpanded );
        // Editing onClick handler: For screen reader, if not editable, remove onClick handler
        if ( this.editHandlerHide == null ){  this.editHandlerHide = this.getSubElement('EditIcon').onclick;  }
        var clickHandler = ( this.editable() )?  this.editHandlerHide  :  null;
        this.setRequiredMember( 'EditIcon', 'onclick', clickHandler );
        this.setRequiredMember( 'ReasonText', 'onclick', clickHandler );

        // Voting click-handler: For screen reader, if frozen, remove click-handler
        if ( this.voteHandlerHide == null ){  this.voteHandlerHide = this.getSubElement('Vote').onclick;  }
        this.setRequiredMember( 'Vote', 'onclick', (this.topDisp.isFrozen() ? null : this.voteHandlerHide) );

        // Editing
        var content = ( this.inputValue )?  this.inputValue  :  this.data.content;
        this.setProperty( 'Content', 'value', content );
        // Viewing
        this.setAttribute( 'Reason', 'allowedit', (this.editable() ? TRUE : null) );
        this.setAttribute( 'Reason', 'highlight', this.data.highlight );
        this.setAttribute( 'Reason', 'firstreason', this.data.isFirstReason );
        this.setAttribute( 'Reason', 'myvote', (this.data.myVote ? TRUE : FALSE) );
        this.setInnerHtml( 'ReasonVoteCount', this.data.voteCount );
        this.setAttribute( 'Vote', 'aria-label', 
            this.data.voteCount + (this.data.voteCount == 1 ? ' vote' : ' votes') );
        this.setInnerHtml( 'score', 'score='+ this.data.score );

        // Viewing: content, possibly highlighted
        var match = displayHighlightedContent( storedTextToHtml(this.data.content), this.highlightWords, this.getSubElement('ReasonText') );
        this.setAttribute( 'Reason', 'show', (match? TRUE : FALSE) );
    };

        ReasonDisplay.prototype.
    editable = function(){  return this.data.allowEdit && !this.topDisp.isFrozen();  }

        ReasonDisplay.prototype.
    onInput = function( ){
        // Save input edited value in a display variable to prevent dataUpdated() from resetting input value.
        // Have to save before any event when display might update -- everything -- so save after every input event.
        var contentInput = this.getSubElement('Content');
        this.inputValue = contentInput.value;
        this.topDisp.topInputHandler();
    };

        ReasonDisplay.prototype.
    handleVoteClick = function( ){
        var reasonData = this.data;
        var proposalDisplay = this.proposalDisplay;
        var proposalData = this.proposalDisplay.proposal;

        if ( this.proposalDisplay.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        // presume vote succeeds, and show vote result
        var myNewVote = (reasonData.myVote === true)? false : true;
        // save old vote state
        var oldReasonVoteCounts = proposalData.reasons.map( function(r){ return r.voteCount; } );
        var oldMyVotes = proposalData.reasons.map( function(r){ return r.myVote; } );
        // clear my votes for all reasons of proposal
        proposalData.reasons.map( function(r){
            if ( r.myVote === true  &&  r.voteCount >= 1 ){  r.voteCount -= 1;  }
            r.myVote = false;
            r.score = null;
        } );
        // update my vote & vote count
        reasonData.myVote = myNewVote;
        if ( reasonData.myVote === true ){  reasonData.voteCount += 1;  }
        proposalDisplay.dataUpdated();
        this.onInput();   // Update next-step highlighting.

        // save via ajax
        this.message = { text:'Saving vote...' , color:GREY, };
        this.dataUpdated()
        var thisCopy = this;
        var sendData = { crumb:crumb , fingerprint:fingerprint ,
            reasonId:reasonData.id , vote:reasonData.myVote , 
            linkKey:this.proposalDisplay.linkKey.id };
        var url = 'submitVote';
        ajaxSendAndUpdate( sendData, url, this.topDisp, function(error, status, receiveData){
            if ( receiveData  &&  receiveData.success ){
                thisCopy.message = { text:'Saved vote', color:GREEN, ms:3000 };
                // update vote count (includes votes from other users since last data refresh)
                var newVoteCount = ( receiveData.reason && receiveData.reason.voteCount )?  parseInt( receiveData.reason.voteCount )  :  0;
                reasonData.voteCount = newVoteCount;
                reasonData.score = ( receiveData.reason )?  receiveData.reason.score  :  null;
                reasonData.allowEdit = receiveData.reason.allowEdit;
                proposalDisplay.dataUpdated();
                thisCopy.onInput();
            }
            else {
                // revert my vote & vote count
                // proposal.reasons is still sorted in same order as old reason votes, because we only sort on page load.
                if ( error ){  thisCopy.message = { text:'Failed: '+error, color:RED, ms:10000 };  }
                else {  thisCopy.message = { text:'Failed to save vote.', color:RED, ms:10000 };  }
                proposalData.reasons.map( function(r,i){ r.voteCount = oldReasonVoteCounts[i]; r.myVote = oldMyVotes[i]; } );
                proposalDisplay.dataUpdated();
                thisCopy.onInput();
            }
        } );
    };

        ReasonDisplay.prototype.
    onEditReasonKeyUp = function( event ){
        if ( event.key == KEY_NAME_ENTER ){  this.handleEditReasonClick();  }
    };

        ReasonDisplay.prototype.
    handleEditReasonClick = function( ){
        if ( this.proposalDisplay.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        this.editing = EDIT;
        this.dataUpdated();
        this.proposalDisplay.expandOrCollapseForEditing();

        // Set input focus.
        var contentInput = this.getSubElement('Content');
        contentInput.focus();
    };

        ReasonDisplay.prototype.
    handleEditReasonBlur = function( ){
        // After delay... if focus is not on editing input nor buttons, and no changes made... stop editing
        var thisCopy = this;
        var contentInput = this.getSubElement('Content');
        var reasonEditing = this.getSubElement('ReasonEditing');
        setTimeout( function(){
            var editingFocused = containsFocus( reasonEditing );
            var contentChanged = ( contentInput.value != thisCopy.data.content );
            if ( ! editingFocused  &&  ! contentChanged ) {
                thisCopy.stopEditing();
            }
        } , 1000 );
    };

        ReasonDisplay.prototype.
    onEditReasonCancelKeyUp = function( event ){ 
        if ( event.key == KEY_NAME_ENTER ){  this.handleEditReasonCancel();  }
    };

        ReasonDisplay.prototype.
    handleEditReasonSave = function(e){ 
        if ( this.proposalDisplay.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        var contentInput = this.getSubElement('Content');
        var inputValue = contentInput.value;
        var reasonData = this.data;
        // save via ajax
        this.message = { text:'Saving changes...', color:GREY };
        this.contentValidity = '';
        this.dataUpdated();
        var sendData = { crumb:crumb , fingerprint:fingerprint ,
            reasonId:reasonData.id , inputContent:inputValue , 
            linkKey:this.proposalDisplay.linkKey.id };
        var url = 'editReason';
        var thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this.topDisp, function(error, status, receiveData){
            if ( error ){
                var message = 'Error saving';
                thisCopy.message = { text:message, color:RED };
                thisCopy.contentValidity = message;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.success ){
                thisCopy.message = { text:'Saved reason', color:GREEN, ms:3000 };
                thisCopy.contentValidity = '';
                thisCopy.dataUpdated();
                // update data
                reasonData.content = receiveData.reason.content;
                reasonData.allowEdit = receiveData.reason.allowEdit;
                thisCopy.stopEditing();
            }
            else if ( receiveData  &&  receiveData.message == TOO_SHORT ){  
                var message = 'Reason is too short.'
                thisCopy.message = { text:message, color:RED, ms:10000 };
                thisCopy.contentValidity = message;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == NOT_OWNER ){  
                thisCopy.handleEditReasonCancel();
                var message = 'Cannot edit reason created by someone else.';
                thisCopy.message = { text:message, color:RED, ms:10000 };
                thisCopy.contentValidity = message;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == HAS_RESPONSES ){  
                thisCopy.handleEditReasonCancel();
                var message = 'Cannot edit reason that already has votes.';
                thisCopy.message = { text:message, color:RED, ms:10000 };
                thisCopy.contentValidity = message;
                thisCopy.dataUpdated();
            }
            else {
                var message = 'Error saving';
                thisCopy.message = { text:message, color:RED };
                thisCopy.contentValidity = message;
                thisCopy.dataUpdated();
            }
        } );
    } , 

        ReasonDisplay.prototype.
    handleEditReasonCancel = function( ){ 
        this.stopEditing();
    };

        ReasonDisplay.prototype.
    stopEditing = function( ){ 
        this.editing = FALSE;
        this.inputValue = null;
        this.wordToCount = null;
        this.dataUpdated();
        this.proposalDisplay.expandOrCollapseForEditing();
    };




/////////////////////////////////////////////////////////////////////////////////
// Title and detail display, used in both proposal and request-for-proposals displays.

        function
    TitleAndDetailDisplay( instanceId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap.
        this.messageColor = GREY;
        this.create( instanceId );
    }
    TitleAndDetailDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap.

    // Create html element object, store it in this.element
        TitleAndDetailDisplay.prototype.
    create = function( instanceId ){
        this.createFromHtml( instanceId, '\n\n' + [
            '<div class=TitleAndDetail id=TitleAndDetail>',
            // Viewing
            '   <div class=TitleAndDetailViewing id=TitleAndDetailViewing>',
            '       <div class=EditIcon id=EditIcon onclick=handleEditTitleClick tabindex=0 onkeyup=onEditKeyUp ',
            '           aria-controls=TitleAndDetailEditing',
            '           ><img class=EditIconImage role=button src="edit.png" alt="edit" /></div>',
            '       <h1 class=Title id=Title onclick=handleEditTitleClick aria-controls=TitleAndDetailEditing ></h1>',
            '       <div class=Detail id=Detail onclick=handleEditDetailClick aria-controls=TitleAndDetailEditing ></div>',
            '   </div>',
            // Editing
            '   <div class=TitleAndDetailEditing id=TitleAndDetailEditing role=form>',
            '       <div class=TitleInputDiv>',
            '           <input class=TitleInput id=TitleInput onclick=handleEditTitleClick onfocus=handleEditTitleClick ',
            '               onblur=handleEditBlur oninput=onInput />',
            '       </div>',
            '       <div class=DetailInputDiv>',
            '           <textarea class=DetailInput id=DetailInput onclick=handleEditDetailClick onfocus=handleEditDetailClick ',
            '               onblur=handleEditBlur oninput=onInput></textarea>',
            '       </div>',
            '       <div class=TitleAndDetailEditButtons>',
            '           <button class=TitleAndDetailSaveButton onclick=handleSave ',
            '               onblur=handleEditBlur> Save </button>',
            '           <button class=TitleAndDetailCancelButton onclick=handleCancel ',
            '               onblur=handleEditBlur> Cancel </button>',
            '       </div>',
            '   </div>',
            // Message
            '   <div class=TitleAndDetailMessage id=Message role=alert ></div>',
            '</div>'
        ].join('\n') );
    };

        TitleAndDetailDisplay.prototype.
    setAllData = function( data, topDisp ){
        this.data = data;
        this.topDisp = topDisp;
        this.dataUpdated();
    }

    // Update this.element
        TitleAndDetailDisplay.prototype.
    dataUpdated = function( ){
        // Set editing state on element
        this.setAttribute( 'TitleAndDetail', 'editing', this.editing );
        // Set editing aria expand/collapse state
        var ariaExpanded = null;
        if ( this.editable() ){  ariaExpanded = ( this.editing == EDIT ) ? TRUE : FALSE;  }
        this.setAttribute( 'EditIcon', 'aria-expanded', ariaExpanded );
        this.setAttribute( 'Title', 'aria-expanded', ariaExpanded );
        this.setAttribute( 'Detail', 'aria-expanded', ariaExpanded );
        // Set editing click-handler: For screen reader, if not editable, remove onClick handler
        if ( this.onClickHide == null ){  this.onClickHide = this.getSubElement('Title').onclick;  }
        var clickHandler = this.editable() ?  this.onClickHide  :  null;
        this.setRequiredMember( 'EditIcon', 'onclick', clickHandler );
        this.setRequiredMember( 'Title', 'onclick', clickHandler );
        this.setRequiredMember( 'Detail', 'onclick', clickHandler );

        // Set editable state on edit icon.
        this.setAttribute( 'TitleAndDetail', 'allowedit', (this.editable() ? TRUE : null) );
        var titleClickToEdit = this.editable() ?  'Click to edit'  :  null;
        this.setProperty( 'EditIcon', 'title', titleClickToEdit );
        // Title
        var titleInputContent = ( this.titleInputValue )?  this.titleInputValue  :  this.data.title;  // Title from data or from current editing text input.
        this.setProperty( 'TitleInput', 'value', titleInputContent );
        this.setProperty( 'Title', 'placeholder', this.data.titlePlaceholder );
        this.setInnerHtml( 'Title', this.data.title );
        this.setProperty( 'Title', 'title', titleClickToEdit );
        // Detail
        // Do not set title because it overrides content for screen-reader.
        // Do not set aria-label, because it stops screen-reader traversal inside.
        var detailInputContent = ( this.detailInputValue )?  this.detailInputValue  :  this.data.detail;  // Detail from data or from current editing text input.
        this.setProperty( 'DetailInput', 'value', detailInputContent );
        this.setProperty( 'DetailInput', 'placeholder', this.data.detailPlaceholder );
        this.setInnerHtml( 'Detail', storedTextToHtml(this.data.detail) );
        // Message
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        var titleInput = this.getSubElement('TitleInput');
        var detailInput = this.getSubElement('DetailInput');
        titleInput.setCustomValidity( defaultTo(this.contentValidity, '') );
        detailInput.setCustomValidity( defaultTo(this.contentValidity, '') );

        this.match = false;
        this.match |= displayHighlightedContent( this.data.title, this.highlightWords, this.getSubElement('Title') );
        this.match |= displayHighlightedContent( storedTextToHtml(this.data.detail), this.highlightWords, this.getSubElement('Detail') );
    };


        TitleAndDetailDisplay.prototype.
    editable = function(){  return this.data.allowEdit && !this.topDisp.isFrozen();  }


    // Sets highlighted content into parentDiv. Returns match:boolean=true if has matches or highlighted-words is empty.
        function
    displayHighlightedContent( content, highlightWords, parentDiv ){

        if ( highlightWords ){
            // Convert content string to html-elements, then highlight elements
            var contentElementsParent = htmlToElement( content );
            var highlightedSpans = highlightNode( contentElementsParent, highlightWords, '' );

            setChildren( parentDiv , highlightedSpans );
            for ( var h = 0;  h < highlightedSpans.length;  ++h ){
                var highlightedDescendants = highlightedSpans[h].getElementsByClassName('Highlight');
                if ( highlightedDescendants.length > 0 ){  return true;  }
            }
            return false;
        }
        else {
            parentDiv.innerHTML = content;
            return true;
        }
    }

    // Returns series[node]
        function
    highlightNode( node, highlightWords, indent ){

        if ( node.nodeName == '#text' ){
            var highlightedTextSpans = keywordsToHighlightSpans( highlightWords, node.textContent );
            return highlightedTextSpans;
        } else {

            // For each child node...
            for ( var c = node.childNodes.length - 1;  c >= 0;  --c ){
                var child = node.childNodes[c];
                // Get highlighted nodes
                var highlightedChildren = highlightNode( child, highlightWords, indent+'  ' );

                // Replace child with array of highlighted nodes
                node.removeChild( child );
                for ( var h = highlightedChildren.length - 1;  h >= 0;  --h ){
                    node.insertBefore( highlightedChildren[h], node.childNodes[c] );
                }

            }
            return [ node ];
        }
    }



        TitleAndDetailDisplay.prototype.
    onInput = function( ){
        // Save editing contents in case display updates before save completes, or in case save fails.
        // Example: TitleAndDetailDisplayForReqProposal.handleEditBlur() calls handleCollapse() calls dataUpdated(),
        // which wipes input values before save-click.
        // Have to save before any event when display might update -- everything.  So save after every input event.
        var titleInput = this.getSubElement('TitleInput');
        var detailInput = this.getSubElement('DetailInput');
        this.titleInputValue = titleInput.value;
        this.detailInputValue = detailInput.value;
        this.topDisp.topInputHandler();
    };

        TitleAndDetailDisplay.prototype.
    onEditKeyUp = function( event ){
        if ( event.key == KEY_NAME_ENTER ){  this.handleEditTitleClick();  }
    };

        TitleAndDetailDisplay.prototype.
    handleEditTitleClick = function( ){
        if ( this.data.loginRequired  &&  ! requireLogin() ){  return;  }

        this.editing = EDIT;  
        this.dataUpdated();
        this.getSubElement('TitleInput').focus();
    };

        TitleAndDetailDisplay.prototype.
    handleEditDetailClick = function( ){
        this.editing = EDIT;  
        this.dataUpdated();
        this.getSubElement('DetailInput').focus();
    };


        TitleAndDetailDisplay.prototype.
    handleEditBlur = function( ){
        // After delay... if focus is not on editing input nor buttons, and no changes made... stop editing
        var thisCopy = this;
        var titleInput = this.getSubElement('TitleInput');
        var detailInput = this.getSubElement('DetailInput');
        var titleAndDetailEditing = this.getSubElement('TitleAndDetailEditing');
        setTimeout( function(){
            var editingFocused = containsFocus( titleAndDetailEditing );
            var contentChanged = ( titleInput.value != thisCopy.data.title ) ||  ( detailInput.value != thisCopy.data.detail );
            if ( ! editingFocused  &&  ! contentChanged ) {
                thisCopy.stopEditing();
            }
        } , 1000 );
    };

        TitleAndDetailDisplay.prototype.
    stopEditing = function( ){ 
        this.editing = FALSE;
        this.titleInputValue = null;
        this.detailInputValue = null;
        this.message = '';
        this.contentValidity = '';
        this.dataUpdated();
    };

    // Sets message and content-validity, then re-displays
        TitleAndDetailDisplay.prototype.
    setMessageAndUpdate = function( message, success, milliseconds ){
        this.message = { text:message };

        if ( milliseconds ){  this.message.ms = milliseconds;  }

        if ( success === false ){  this.contentValidity = message;  this.message.color = RED;  }
        else if ( success === true ){  this.contentValidity = '';  this.message.color = GREEN;  }
        else {  this.contentValidity = '';  this.message.color = GREY;  }

        this.dataUpdated();
    };

        TitleAndDetailDisplay.prototype.
    handleCancel = function( ){ 
        // revert form
        var titleInput = this.getSubElement('TitleInput');
        var detailInput = this.getSubElement('DetailInput');
        titleInput.value = this.data.title;
        detailInput.value = storedTextToHtml(this.data.detail);
        // stop editing
        this.stopEditing();
    };

        TitleAndDetailDisplay.prototype.
    handleSave = function( ){
        this.data.onSave();
    };




/////////////////////////////////////////////////////////////////////////////////
// Proposal display
// Implements "top display" interface with topInputHandler() and retrieveData().


    // Class TitleAndDetailDisplayForReqProposal TitleAndDetailDisplay event handlers for proposal title/detail,
    // to expand/collapse proposal when editing proposal title/detail.
    // Better user experience to expand proposal in-place for editing, removing max-height to accomodate full content.
    //     Do not change to single-proposal page, because editable proposal has no reasons, so single-proposal page is empty / redundant.
    //     Do not hide reasons while editing proposal, because it is confusing to user.
    // What about editing reason?  Also in-place, expand max-height for reasons to accomodate save buttons.
    // 
    // For in-place, also have to re-collapse proposal when editing ends (if in a request-for-proposals).

        function
    TitleAndDetailDisplayForReqProposal( instanceId, proposalId, proposalDisp ){
        TitleAndDetailDisplay.call( this, instanceId );  // Inherit member data.
        this.proposalId = proposalId;
        this.proposalDisp = proposalDisp;
    }
    TitleAndDetailDisplayForReqProposal.prototype = Object.create( TitleAndDetailDisplay.prototype );  // Inherit methods.

        TitleAndDetailDisplayForReqProposal.prototype.
    handleEditTitleClick = function( ){
        if ( ! this.data.allowEdit ){  return;  }
        TitleAndDetailDisplay.prototype.handleEditTitleClick.call( this );
        this.proposalDisp.expandOrCollapseForEditing();
    };

        TitleAndDetailDisplayForReqProposal.prototype.
    handleEditDetailClick = function( ){
        TitleAndDetailDisplay.prototype.handleEditDetailClick.call( this );
        this.proposalDisp.expandOrCollapseForEditing();
    };

        TitleAndDetailDisplayForReqProposal.prototype.
    stopEditing = function( ){
        TitleAndDetailDisplay.prototype.stopEditing.call( this );
        this.proposalDisp.expandOrCollapseForEditing();
    };

        TitleAndDetailDisplayForReqProposal.prototype.
    handleSave = function( ){
        TitleAndDetailDisplay.prototype.handleSave.call( this );
        this.proposalDisp.expandOrCollapseForEditing();
    };



        function
    ProposalDisplay( proposalId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap.
        this.messageColor = GREY;
        this.create( proposalId );
    }
    ProposalDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap.

    // Create html element object, store it in this.element
        ProposalDisplay.prototype.
    create = function( proposalId ){
        // Title and detail sub-displays
        this.titleAndDetailDisp = new TitleAndDetailDisplayForReqProposal( 'proposal-' + proposalId, proposalId, this );
        // Reason sub-displays
        this.reasonDisplays = [];
        this.reasonIdToDisp = {};
        this.proDisplays = [];
        this.conDisplays = [];

        this.createFromHtml( proposalId, '\n\n' + [
            '<div class=Proposal id=Proposal>',
            '    <div id=Message class=ProposalMessage role=alert ></div>',
            '    <div class=loginStatus id=loginStatus></div>' ,
            '    <button class=freezeButton id=freezeButton onclick=clickFreezeButton></button>' ,
            '    <div class=freezeText id=freezeText>Frozen</div>' ,
            // Collapseable
            '    <div class=ProposalCollapseableWrapTable id=ProposalCollapseableWrapTable>',
            '        <div class=ProposalCollapseableWrapRow>',
            '            <div class=ProposalCollapseRail onclick=handleCollapseAndScrollToProposal></div>',
            '            <div class=ProposalCollapseableWrapCell>',
            '                <div class=Collapseable id=Collapseable>',
            // Title and detail
            '                   <div class=ProposalContent id=ProposalContent subdisplay=titleAndDetailDisp></div>',
            // Reasons
            '                   <div class=Reasons id=reasons>',
            '                       <div class=ReasonsPro id=ReasonsPro></div>',
            '                       <div class=ReasonsCon id=ReasonsCon></div>',
            '                   </div>',
            '                </div>',
            '            </div>',
            '        </div>',
            '    </div>',
            '    <div class=ProposalExpandBottomRelative>',   // relative-absolute positioning for enclosed elements
            '        <div class=ProposalExpandBottomWrap>',  // crop shadow overflow
            '            <div class=ProposalExpandBottom onclick=handleExpandSeparatePage>',  // generates shadow, has hover-highlight and background arrows
            '                <button> More reasons </button>',
            '            </div>',
            '        </div>',
            '    </div>',
            // New reason form
            '    <div class=NewReasonForm id=NewReasonForm role=form >',
            '        <div class=NewReason>',
            '           <textarea class=NewReasonInput id=NewReasonInput placeholder="new reason pro or con" ',
            '               oninput=onInput onfocus=handleNewReasonClick onblur=handleNewReasonBlur ',
            '               aria-expanded=false aria-controls=NewReasonButtons ></textarea>',
            '        </div>',
            '        <div class=NewReasonButtons id=NewReasonButtons>',
            '            <button class=NewReasonButton id=NewReasonButtonPro onclick=handleNewPro ',
            '               onblur=handleNewReasonBlur> Save Pro </button>',
            '            <button class=NewReasonButton id=NewReasonButtonCon onclick=handleNewCon ',
            '               onblur=handleNewReasonBlur> Save Con </button>',
            '        </div>',
            '        <div class=NewReasonMessage id=NewReasonMessage role=alert ></div>',
            '    </div>',
            '</div>'
        ].join('\n') );
    };

    // Set all data.
        ProposalDisplay.prototype.
    setAllData = function( proposalData, allReasonsData, topDisp, linkKey ){
        this.proposal = proposalData;  // Proposal data will have reasons updated already.
        this.topDisp = topDisp;
        this.allReasons = allReasonsData;
        this.linkKey = linkKey;

        // Update title and detail.
        var thisCopy = this;
        var titleAndDetailData = {
            title: proposalData.title,
            detail: proposalData.detail,
            titlePlaceholder: "new proposal title",
            detailPlaceholder: "new proposal detail",
            allowEdit: proposalData.allowEdit,
            loginRequired: linkKey.loginRequired,
            onSave: function(){ thisCopy.handleEditProposalSave(); }
        };
        this.titleAndDetailDisp.setAllData( titleAndDetailData, topDisp );

        // If single-proposal page... this proposal is always first and only proposal.
        if ( this.proposal.singleProposal ){
            this.proposal.firstProposal = TRUE;
            this.proposal.firstProposalWithReasons = TRUE;
        }

        this.dataUpdated();
    };

    
    // Update html from data.
        ProposalDisplay.prototype.
    dataUpdated = function( ){
        var width = jQuery(window).width();
        var use1Column = ( width <= MAX_WIDTH_1_COLUMN );
        var columnsChanged = ( use1Column !== this.use1Column );
        this.use1Column = use1Column;

        // Set page title
        if ( this.proposal.singleProposal ){
            document.title = SITE_TITLE + ': Proposal: ' + this.proposal.title;
        }

        // Set the message content.
        if ( this.proposal.singleProposal  &&  ! this.proposal.fromRequest ){
            if ( this.proposal  &&  this.proposal.linkOk ) {
                this.message = { color:GREEN, text:(this.proposal.mine ? 'Your proposal is created.  You can email this webpage\'s link to participants.' : '') };
                if ( this.messageShown ){  this.message = null;  }
                if ( this.message  &&  this.message.text ){  this.messageShown = true;  }
                this.setStyle( 'ProposalCollapseableWrapTable', 'display', null );
                this.setStyle( 'NewReasonForm', 'display', null );
            }
            else {
                this.message = { color:RED, text:'Invalid link.' };
                this.setStyle( 'ProposalCollapseableWrapTable', 'display', 'none' );
                this.setStyle( 'NewReasonForm', 'display', 'none' );
            }
        }

        // Message
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.newReasonMessage = showMessageStruct( this.newReasonMessage, this.getSubElement('NewReasonMessage') );
        var reasonInput = this.getSubElement('NewReasonInput');
        reasonInput.setCustomValidity( defaultTo(this.newReasonValidity, '') );

        // Set attributes
        this.setAttribute( 'Proposal', 'editingnewreason', (this.editingNewReason == EDIT ? TRUE : null) );
        this.setAttribute( 'NewReasonInput', 'aria-expanded', (this.editingNewReason == EDIT ? TRUE : FALSE) );
        this.setAttribute( 'Proposal', 'firstproposal', this.proposal.firstProposal );
        this.setAttribute( 'Proposal', 'hasfirstreason', this.proposal.firstProposalWithReasons );
        this.setAttribute( 'Proposal', 'use1column', (this.use1Column ? TRUE : FALSE) );
        this.setAttribute( 'Proposal', 'frozen', (this.isFrozen() ? TRUE : null) );
        this.setAttribute( 'Proposal', 'fromRequest', (this.proposal.fromRequest ? TRUE : null) );
        this.setAttribute( 'Proposal', 'singleProposal', (this.proposal.singleProposal ? TRUE : null) );
        this.setAttribute( 'Proposal', 'mine', (this.proposal.mine ? TRUE : null) );

        // Show freeze-message in freeze button
        // Freeze-message text display (next to button) may be better for accessibility and maintainability
        if ( this.freezeMessage ){  this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeButton') );  }
        else {  this.setInnerHtml( 'freezeButton' , (this.proposal.freezeUserInput ? 'Frozen' : 'Unfrozen') );  }

        // Update title and detail.
        this.titleAndDetailDisp.data.title = this.proposal.title;
        this.titleAndDetailDisp.data.detail = this.proposal.detail;
        this.titleAndDetailDisp.data.allowEdit = this.proposal.allowEdit;

        this.titleAndDetailDisp.highlightWords = this.highlightWords;
        this.titleAndDetailDisp.data.loginRequired = this.linkKey.loginRequired;
        this.titleAndDetailDisp.dataUpdated();

        // Show login status
        if ( this.linkKey.loginRequired ){
            this.setInnerHtml( 'loginStatus', 'Voter login required' );
        }
        else {
            this.setInnerHtml( 'loginStatus', (this.proposal.mine ? 'Browser login only' : null) );
        }

        // Find first reason
        var propReasons = this.proposal.reasons;
        var pros = propReasons.filter( function(r){ return r.proOrCon=='pro'; } );
        var firstReason = ( pros.length > 0 )?  pros[0]  :  propReasons[0];
        propReasons.map(  function(r){ r.isFirstReason = (r == firstReason)? TRUE : FALSE; }  );

        // For each reason data...
        for ( var r = 0;  r < this.proposal.reasons.length;  ++r ) { 
            // Try to find reason in existing reason displays.
            var reason = this.proposal.reasons[r];
            var reasonDisp = this.reasonIdToDisp[ reason.id ];
            // If reason display exists... update reason display... else... create reason display.
            if ( reasonDisp ){
                reasonDisp.setAllData( reason, this.topDisp, this );
            }
            else {
                this.addReasonDisp( reason );
                columnsChanged = true;
            }
        }

        this.setAttribute( 'reasons', 'hasmatches', (this.hasMatches ? TRUE : null) );

        // If reason matches changed... re-sort reasons
        // Keep reasons before input, for mobile.  Put best match closest to new-reason input, sorting matches by match-score ascending.
        // Only re-sort reasons if necessary.  dataUpdated() may run many times between ordering by vote-score vs by match-score.
        if ( this.hasMatches ){  this.sortReasonsByMatchScore();  columnsChanged = true;  }
        else if ( this.hadMatches ) {  this.sortReasonsByVoteScore();  columnsChanged = true;  }
        console.log( 'dataUpdated() this.hasMatches=', this.hasMatches, 'this.hadMatches=', this.hadMatches, 'columnsChanged=', columnsChanged );
        this.hadMatches = this.hasMatches;

        // Rearrange reason displays in columns.
        if ( columnsChanged ){
            var reasonsProDiv = this.getSubElement('ReasonsPro');
            var reasonsConDiv = this.getSubElement('ReasonsCon');
            if ( use1Column ) {
                // interleave pros/cons in single column
                for ( var r = 0;  r < Math.max( this.proDisplays.length, this.conDisplays.length );  ++r ){
                    if ( r < this.proDisplays.length ){  reasonsProDiv.appendChild( this.proDisplays[r].element );  }
                    if ( r < this.conDisplays.length ){  reasonsProDiv.appendChild( this.conDisplays[r].element );  }
                }
            }
            else {
                // separate columns for pros/cons
                for ( var r = 0;  r < this.proDisplays.length;  ++r ){
                    reasonsProDiv.appendChild( this.proDisplays[r].element );
                }
                for ( var r = 0;  r < this.conDisplays.length;  ++r ){
                    reasonsConDiv.appendChild( this.conDisplays[r].element );
                }
            }
        }

        // Only if single-proposal page... update field highlights  (dont want every proposal updating request highlights)
        if ( this.proposal.singleProposal ){
            this.colorNextInput();
        }
        
        // Set collapse properties
        this.setStyle( 'ProposalContent', 'maxHeight', this.maxPropHeight );
        this.setAttribute( 'Proposal', 'collapse', this.collapse );
    };

        ProposalDisplay.prototype.
    editable = function(){  return this.proposal.allowEdit && !this.topDisp.isFrozen();  }

        ProposalDisplay.prototype.
    isFrozen = function(){
        // How can we know that proposal-from-request is frozen, when request-display is not present?
        // Need to retrieve frozen-flag with proposal?
        return this.proposal.freezeUserInput  ||  (reqPropData && reqPropData.request && reqPropData.request.freezeUserInput);
    }

        ProposalDisplay.prototype.
    clickFreezeButton = function( ){

        if ( this.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        // save via ajax
        var freeze =  ! this.proposal.freezeUserInput;
        this.freezeMessage = {  color:GREY , text:(freeze ? 'Freezing' : 'Unfreezing')  };
        this.dataUpdated();
        var sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.linkKey.id , proposalId:this.proposal.id ,
            freezeUserInput:freeze
        };
        var url = 'freezeProposal';
        var thisCopy = this;
        var freezeMessageDefault = this.proposal.freezeUserInput ? 'Frozen' : 'Unfrozen';
        var freezeMessageMillisec = 5000;
        ajaxSendAndUpdate( sendData, url, this, function(error, status, receiveData){
            if ( error ){
                thisCopy.freezeMessage = { color:RED , text:'Failed to ' + (freeze ? 'freeze' : 'unfreeze') , textDefault:freezeMessageDefault , ms:freezeMessageMillisec };
            }
            else if ( receiveData &&  receiveData.success ){
                // update data
                thisCopy.proposal.title = receiveData.proposal.title;  // Dont overwrite thisCopy.proposal because receiveData is missing proposal.reasons
                thisCopy.proposal.detail = receiveData.proposal.detail;
                thisCopy.proposal.freezeUserInput = receiveData.proposal.freezeUserInput;
                var freezeLabel = thisCopy.proposal.freezeUserInput ? 'Frozen' : 'Unfrozen';
                thisCopy.freezeMessage = { color:GREEN , text:freezeLabel , textDefault:freezeLabel , ms:freezeMessageMillisec };
            }
            else if ( receiveData  &&  receiveData.message == NOT_OWNER ){
                thisCopy.freezeMessage = { color:RED , text:'Cannot un/freeze proposal created by someone else.' , textDefault:freezeMessageDefault , ms:freezeMessageMillisec };
            }
            else {
                thisCopy.freezeMessage = { color:RED , text:'Failed to freeze proposal.' , textDefault:freezeMessageDefault , ms:freezeMessageMillisec };
            }
            thisCopy.dataUpdated();
        } );

    }

        ProposalDisplay.prototype.
    sortReasonsByVoteScore = function( ){
        console.log( 'sortReasonsByVoteScore()' );
        this.proDisplays.sort(  function(a,b){ return (b.data.score - a.data.score); }  );
        this.conDisplays.sort(  function(a,b){ return (b.data.score - a.data.score); }  );
    };

        ProposalDisplay.prototype.
    sortReasonsByMatchScore = function( ){
        console.log( 'sortReasonsByMatchScore()' );
        this.proDisplays.sort(  function(a,b){ return (a.matchScore - b.matchScore); }  );
        this.conDisplays.sort(  function(a,b){ return (a.matchScore - b.matchScore); }  );
    };


        ProposalDisplay.prototype.
    addReasonDisp = function( reasonData ){   // returns ReasonDisplay
        // Create display
        var reasonDisp = new ReasonDisplay( reasonData.id );
        reasonDisp.setAllData( reasonData, this.topDisp, this );
        // Collect and index display
        this.reasonDisplays.push( reasonDisp );
        this.reasonIdToDisp[ reasonData.id ] = reasonDisp;
        if      ( reasonData.proOrCon == PRO ){  this.proDisplays.push( reasonDisp );  }
        else if ( reasonData.proOrCon == CON ){  this.conDisplays.push( reasonDisp );  }
        return reasonDisp;
    };

        ProposalDisplay.prototype.
    expandOrCollapseForEditing = function( ){

        if ( ! this.isProposalInRequest() ){  return;  }

        // Find sub-display in editing state.
        var isSubdisplayEditing = ( this.titleAndDetailDisp.editing == EDIT )
            ||  this.reasonDisplays.find( function(r){ return (r.editing == EDIT); } );
        
        // Expand or collapse based on editing status.
        if ( isSubdisplayEditing ){  this.expandForEditingTitle();  }
        else {  this.handleCollapse();  }
    };

        ProposalDisplay.prototype.
    handleExpandSeparatePage = function( ){
        if ( ! this.singleProposal ){
            setFragmentFields( {page:FRAG_PAGE_ID_PROPOSAL_FROM_REQUEST, proposal:this.proposal.id} );
        }
    };

        ProposalDisplay.prototype.
    handleExpandInPage = function( ){  
        this.maxPropHeight = null;
        this.collapse = FALSE;
        this.dataUpdated();
    };

        ProposalDisplay.prototype.
    handleCollapseAndScrollToProposal = function(){
        this.handleCollapse();
        // Scroll proposal onto screen (because long proposal may become off-screen when collapsed).
        this.scrollToProposal();
    }

        ProposalDisplay.prototype.
    handleCollapse = function( ){
        // Proposal and reasons can each use half of PROPOSAL_COLLAPSE_HEIGHT, plus any surplus from the other.
        var reasonsDiv = jQuery('#'+this.getId('reasons'));  // Get jquery element
        var reasonsHeight = reasonsDiv.height();
        this.maxPropHeight = Math.max(PROPOSAL_COLLAPSE_HEIGHT/2, PROPOSAL_COLLAPSE_HEIGHT - reasonsHeight) + 'px';
        this.collapse = TRUE;
        this.dataUpdated();
    };

        ProposalDisplay.prototype.
    expandForEditingTitle = function( ){
        this.maxPropHeight = null;
        this.collapse = 'edit-title';
        this.dataUpdated();
    };

        ProposalDisplay.prototype.
    scrollToProposal = function( ){
        var proposalObj = jQuery('#'+this.getId('Proposal'));
        jQuery('html, body').animate({
            scrollTop: $(proposalObj).offset().top + 'px'
        }, 'fast');
    };

        ProposalDisplay.prototype.
    handleEditProposalSave = function( ){

        if ( this.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        var titleInput = this.titleAndDetailDisp.getSubElement('TitleInput');
        var detailInput = this.titleAndDetailDisp.getSubElement('DetailInput');

        // save via ajax
        this.titleAndDetailDisp.setMessageAndUpdate( 'Saving changes...', null, null );
        var sendData = { crumb:crumb , fingerprint:fingerprint ,
            proposalId:this.proposal.id , linkKey:this.linkKey.id , 
            title:titleInput.value , detail:detailInput.value };
        var url = 'editProposal';
        var thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this.topDisp, function(error, status, receiveData){
            if ( error ){
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Failed to save', false, null );
            }
            else if ( receiveData  &&  receiveData.success ){
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Saved proposal', true, 3000 );
                // update data
                thisCopy.proposal.title = receiveData.proposal.title;  // Dont overwrite thisCopy.proposal because receiveData is missing proposal.reasons
                thisCopy.proposal.detail = receiveData.proposal.detail;
                // stop editing display
                thisCopy.titleAndDetailDisp.editing = FALSE;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == TOO_SHORT ){
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Proposal is too short.', false, 10000 );
            }
            else if ( receiveData  &&  receiveData.message == NOT_OWNER ){
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Cannot edit proposal created by someone else.', false, 10000 );
            }
            else if ( receiveData  &&  receiveData.message == HAS_RESPONSES ){  
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Cannot edit proposal that already has reasons.', false, 10000 );
            }
            else {
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Failed to save proposal.', false, null );
            }
        } );
    };

        ProposalDisplay.prototype.
    handleNewReasonClick = function( ){

        if ( this.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        this.editingNewReason = EDIT;
        this.dataUpdated();
    };

        ProposalDisplay.prototype.
    handleNewReasonBlur = function( ){
        // After delay... if focus is not on editing input nor buttons, and no changes made... stop editing
        var thisCopy = this;
        var newReasonInput = this.getSubElement('NewReasonInput');
        var newReasonForm = this.getSubElement('NewReasonForm');
        setTimeout( function(){
            var editingFocused = containsFocus( newReasonForm );
            var contentChanged = ( newReasonInput.value != '' );
            if ( ! editingFocused  &&  ! contentChanged ) {
                thisCopy.editingNewReason = FALSE;
                thisCopy.dataUpdated();
            }
        } , 1000 );
    };

        ProposalDisplay.prototype.
    handleNewPro = function( event ){  this.handleNewReason( event, PRO );  };

        ProposalDisplay.prototype.
    handleNewCon = function( event ){  this.handleNewReason( event, CON );  };

        ProposalDisplay.prototype.
    handleNewReason = function( event, proOrCon ){
        event.preventDefault();

        if ( this.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        var reasonInput = this.getSubElement('NewReasonInput');
        if ( reasonInput.value == '' ){
            this.newReasonValidity = '';
            this.dataUpdated();
            return;
        }

        // save via ajax
        var proposalData = this.proposal;
        this.newReasonMessage = { color:GREY, text:'Saving changes...' };
        this.newReasonValidity = '';
        this.dataUpdated();
        var sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            linkKey:this.linkKey.id ,
            proposalId:proposalData.id , proOrCon:proOrCon , reasonContent:reasonInput.value
        };
        var url = 'newReason';
        var thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this.topDisp, function(error, status, receiveData){
            if ( error ){  
                var message = 'Error saving';
                thisCopy.newReasonMessage = { color:RED, text:message };  
                thisCopy.newReasonValidity = message;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.success ){
                thisCopy.newReasonMessage = { color:GREEN, text:'Saved reason', ms:3000 };
                thisCopy.newReasonValidity = '';
                thisCopy.dataUpdated();
                // update data
                var newReason = receiveData.reason;
                if ( ! newReason.voteCount ) {  newReason.voteCount = 0;  }
                proposalData.reasons.push( newReason );
                if ( thisCopy.allReasons ){
                    thisCopy.allReasons.push( newReason );
                }
                // clear form, stop editing
                reasonInput.value = '';
                thisCopy.editingNewReason = FALSE;
                thisCopy.onInput();  // Clear keyword match highlights
                thisCopy.dataUpdated();
                if ( thisCopy.isProposalInRequest() ){
                    thisCopy.handleExpandSeparatePage();
                }
            }
            else if ( receiveData  &&  receiveData.message == TOO_SHORT ){
                var message = 'Reason is too short.';
                thisCopy.newReasonMessage = { color:RED, text:message, ms:10000 };
                thisCopy.newReasonValidity = message;
                thisCopy.dataUpdated();
            }
            else {
                var message = 'Error saving';
                thisCopy.newReasonMessage = { color:RED, text:message };
                thisCopy.newReasonValidity = message;
                thisCopy.dataUpdated();
            }
        } );
    };

        ProposalDisplay.prototype.
    isProposalInRequest = function( ){
        return ( this.proposal.fromRequest  &&  ! this.proposal.singleProposal );
    };


        ProposalDisplay.prototype.
    onInput = function( ){
        deduplicate( 300, this, this.onInputDeduplicated );
    };

    // Interface function for top-level proposal and request displays
        ProposalDisplay.prototype.
    topInputHandler = function( ){
        this.colorNextInput();
    };
    
        ProposalDisplay.prototype.
    onInputDeduplicated = function( ){

        // For each reason-display... find new-reason keyword matches
        var newReasonInput = this.getSubElement('NewReasonInput');
        var numMatchingReasonDisplays = 0;
        if ( newReasonInput.value ){
            numMatchingReasonDisplays = this.reasonDisplays.reduce( function(count, reasonDisp){
                var matchIntervals = keywordMatchIntervals( newReasonInput.value, reasonDisp.data.content );
                var matches = matchIntervals.filter( function(i){return i.match} );
                return ( matches  &&  matches.length > 0 )?  count+1  :  count;
            } , 0 );
        }
        this.hasMatches = ( numMatchingReasonDisplays > 0 );

        // Display match count
        this.newReasonMessage = { color:GREY, text:''+numMatchingReasonDisplays+' matches' };

        // For each reason-display... de/highlight new-reason keyword matches
        var highlightWords = this.hasMatches ?  newReasonInput.value  :  null;
        for ( var r = 0;  r < this.reasonDisplays.length;  ++r ){
            var reasonDisp = this.reasonDisplays[r];
            reasonDisp.highlightWords = highlightWords;
            reasonDisp.dataUpdated();
        }

        // Compute reason match score with new-reason input.
        // Dont want to re-count all document words for each input character typed.
        // Store word->count inside each reasonDisplay.
        // Clear counts when reason edited or retrieved.
        // Recompute counts when new reason character typed if counts are null.
        // Store invDocFreq weights in topDisp, and force update when data retrieved.

        // Compute word frequencies, then match scores
        var updated = this.updateWordCounts();
        if ( updated ){
            topDisp.wordToInvDocFrequency = wordCountsToInvDocFreq( this.wordToDocCount ); 
        }

        computeMatchScores( newReasonInput.value , topDisp.wordToInvDocFrequency, this.reasonDisplays , function(r){return r.data.score} );

        this.dataUpdated();
        this.colorNextInput();
    };

        ProposalDisplay.prototype.
    setHighlightWords = function( highlightWords ){
        this.highlightWords = highlightWords;
        // For each reason-display... de-highlight new-reason keyword matches
        for ( var r = 0;  r < this.reasonDisplays.length;  ++r ){
            var reasonDisp = this.reasonDisplays[r];
            reasonDisp.highlightWords = null;
            reasonDisp.dataUpdated();
        }
    };

        ProposalDisplay.prototype.
    updateWordCounts = function( ){
        var updated = false;

        // For each reason and proposal itself... if word counts nulled... recompute and set updated=true
        for ( var d = 0;  d < this.reasonDisplays.length;  ++d ){
            var reasonDisplay = this.reasonDisplays[d];
            updated |= updateWordCounts( reasonDisplay , reasonDisplay.data.content );
        }
        updated |= updateWordCounts( this, this.proposal.title + ' ' + this.proposal.detail );

        if ( ! updated ){  return false;  }

        // For each document... sum map[ word -> document count ]
        this.wordToDocCount = {};
        for ( var d = 0;  d < this.reasonDisplays.length;  ++d ){
            var reasonDisplay = this.reasonDisplays[d];
            for ( var word in reasonDisplay.wordToCount ){
                incrementMapValue( this.wordToDocCount, word, 1 );
            }
        }
        for ( var word in this.wordToCount ){
            incrementMapValue( this.wordToDocCount, word, 1 );
        }
        
        return true;
    };

    // Guide user to next input, by coloring input fields.
    // Used only on single-proposal page.
        ProposalDisplay.prototype.
    colorNextInput = function( ){

        var reasons = this.proposal.reasons;

        // de-colorize
        var proposalDiv = this.element;
        proposalDiv.setAttribute( 'nextinput', null );

        // if user needs to enter first reason... colorize reason input
        if ( reasons.length == 0 ){
            var firstReasonInput = this.getSubElement('NewReasonInput');
            if ( firstReasonInput  &&  firstReasonInput.value == '' ){  
                proposalDiv.setAttribute( 'nextinput', 'reason' );
            }
        }
        // if user needs to enter first vote... colorize first vote button
        else {
            var numMyVotes = reasons.reduce( function(agg,r){ return agg + (r.myVote? 1 : 0); } , 0 );
            if ( numMyVotes == 0 ){
                proposalDiv.setAttribute( 'nextinput', 'vote');
            }
        }
    };


        ProposalDisplay.prototype.
    retrieveDataUpdate = function(){
        var onlyTopReasons = false;
        retrieveProposalReasons( this, onlyTopReasons );
    };

        ProposalDisplay.prototype.
    retrieveData = function( onlyTopReasons ){
        retrieveProposalReasons( this, onlyTopReasons );
    };

        ProposalDisplay.prototype.
    voteScore = function( ){
        var numPros = this.numPros? this.numPros : 0;
        var numCons = this.numCons? this.numCons : 0;
        return (numPros - numCons);
    };



/////////////////////////////////////////////////////////////////////////////////
// Request-for-proposals display
// Implements "top display" interface with topInputHandler() and retrieveData().

        function
    RequestForProposalsDisplay( requestId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap.
        this.messageColor = GREY;
        this.create( requestId );
    }
    RequestForProposalsDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap.

    // Create html element object, store it in this.element
        RequestForProposalsDisplay.prototype.
    create = function( requestId ){
        // Title and detail sub-displays
        this.titleAndDetailDisp = new TitleAndDetailDisplay( 'request-' + requestId );
        // Proposal sub-displays
        this.proposalDisplays = [];
        this.proposalIdToDisp = {};

        this.createFromHtml( requestId, '\n' + [
            '<div class=ReqProp id=RequestForProposals>',
            // Status messages
            '    <div class=RequestMessage id=RequestMessage role=alert ></div>',
            '    <div class=loginStatus id=loginStatus></div>',
            '    <button class=freezeButton id=freezeButton onclick=clickFreezeButton></button>' ,
            '    <div class=freezeText id=freezeText>Frozen</div>' ,
            // Request and proposals
            '    <div class=Request id=Request subdisplay=titleAndDetailDisp></div>',
            '    <div class=Proposals id=Proposals></div>',
            '    <div class=MoreProposalsWrap>',
            '        <button id=MoreProposals onclick=clickMoreProposals> More proposals </button>',
            '    </div>',
            //   New proposal form.  Do not use TitleAndDetailDisplay because need customizations like initial reasons.
            '    <div class=NewProposalForm id=NewProposalForm>',
            '        <div class=NewProposalSectionTitle> New Proposal </div>',
            //       Insert a few new-proposal match summary snippets before new-proposal input, because
            //       filtered proposals are too distant from new-proposal input (because of reasons).
            '        <div id=matches class=matches></div>',
            '        <div id=matchesMessage></div>',
            '        <label class=NewProposalTitleLabel for=NewProposalTitle>Title</label>',
            '        <div class=Title>',
            '            <input class=TitleInput id=NewProposalTitle',
            '                onclick=startEditingNewProposal onblur=handleEditBlur oninput=onInput',
            '                placeholder="new proposal title" aria-required=true />',
            '        </div>',
            '        <label class=NewProposalDetailLabel for=NewProposalDetail>Detail</label>',
            '        <div class=Detail>',
            '            <textarea class=DetailInput id=NewProposalDetail',
            '                onclick=startEditingNewProposal onblur=handleEditBlur oninput=onInput',
            '                placeholder="new proposal detail" aria-required=true ></textarea>',
            '        </div>',
            '        <label class=NewProposalReasonLabel for=NewProposalInitialReasonInput1> Supporting Reasons </label>',
            '        <div class=NewProposalInitialReasons>',
            '            <div class=NewProposalInitialReasonDiv>',
            '                <textarea class=NewProposalInitialReasonInput id=NewProposalInitialReasonInput1',
            '                    onclick=startEditingNewProposal onblur=handleEditBlur oninput=onInput',
            '                    placeholder="supporting reason"></textarea>',
            '            </div>',
            '            <div class=NewProposalInitialReasonDiv>',
            '                <textarea class=NewProposalInitialReasonInput id=NewProposalInitialReasonInput2',
            '                    onclick=startEditingNewProposal onblur=handleEditBlur oninput=onInput',
            '                    placeholder="more supporting reasons"></textarea>',
            '            </div>',
            '            <div class=NewProposalInitialReasonDiv>',
            '                <textarea class=NewProposalInitialReasonInput id=NewProposalInitialReasonInput3',
            '                    onclick=startEditingNewProposal onblur=handleEditBlur oninput=onInput',
            '                    placeholder="more supporting reasons"></textarea>',
            '            </div>',
            '        </div>',
            '        <div class=TitleAndDetailEditButtons>',
            '            <button type=button class=TitleAndDetailSaveButton onclick=handleSaveNewProposal> Save </button>',
            '        </div>',
            '        <div class=TitleAndDetailMessage id=newProposalMessage role=alert ></div>',
            '    </div>',
            '</div>'
        ].join('\n') );
    };


    // Set all data.
        RequestForProposalsDisplay.prototype.
    setAllData = function( reqPropData ){

        // Set proposals data. No need to create/update proposal display here, because dataUpdated() will do it.
        this.reqPropData = reqPropData;

        // Set title and detail.
        var thisCopy = this;
        var titleAndDetailData = {
            title: reqPropData.request.title,
            detail: reqPropData.request.detail,
            titlePlaceholder: 'request for proposals title',
            detailPlaceholder: 'request for proposals detail',
            allowEdit: reqPropData.request.allowEdit,
            loginRequired: reqPropData.linkKey.loginRequired,
            onSave: function(){ thisCopy.handleEditRequestSave(); }
        };
        this.titleAndDetailDisp.setAllData( titleAndDetailData, this );
        this.wordToCount = null;
        
        this.dataUpdated();
    };

    
    // Update html from data.
        RequestForProposalsDisplay.prototype.
    dataUpdated = function( retrieveReasons ){
        // retrieveReasons:boolean, default false

        document.title = SITE_TITLE + ': Request for Proposals: ' + this.reqPropData.request.title;

        // Set request-message content
        if ( this.reqPropData  &&  this.reqPropData.linkOk ) {
            this.message = { color:GREEN, text:(this.reqPropData.request.mine ? 'Your request is created.  You can email this webpage\'s link to request participants.' : '') };
            if ( this.messageShown ){  this.message = null;  }
            if ( this.message  &&  this.message.text ){  this.messageShown = true;  }
            this.setStyle( 'Request', 'display', null );
            this.setStyle( 'Proposals', 'display', null );
            this.setStyle( 'NewProposalForm', 'display', null );
        }
        else {
            this.message = { color:RED, text:'Invalid link.' };
            this.setStyle( 'Request', 'display', 'none' );
            this.setStyle( 'Proposals', 'display', 'none' );
            this.setStyle( 'NewProposalForm', 'display', 'none' );
        }
        this.setProperty( 'NewProposalTitle', 'defaultValue', this.title );
        this.setProperty( 'NewProposalDetail', 'defaultValue', this.detail );
        this.setProperty( 'NewProposalInitialReasonInput1', 'defaultValue', '' );
        this.setProperty( 'NewProposalInitialReasonInput2', 'defaultValue', '' );
        this.setProperty( 'NewProposalInitialReasonInput3', 'defaultValue', '' );
        
        // Show request-message
        this.message = showMessageStruct( this.message, this.getSubElement('RequestMessage') );
        this.newProposalMessage = showMessageStruct( this.newProposalMessage, this.getSubElement('newProposalMessage') );
        this.moreProposalsMessage = showMessageStruct( this.moreProposalsMessage, this.getSubElement('MoreProposals') );
        this.matchesMessage = showMessageStruct( this.matchesMessage, this.getSubElement('matchesMessage') );
        this.getSubElement('NewProposalTitle').setCustomValidity( defaultTo(this.newProposalValidity, '') );
        this.getSubElement('NewProposalDetail').setCustomValidity( defaultTo(this.newProposalValidity, '') );

        // Show title and detail.
        this.titleAndDetailDisp.data.title = this.reqPropData.request.title;
        this.titleAndDetailDisp.data.detail = this.reqPropData.request.detail;
        this.titleAndDetailDisp.data.allowEdit = this.reqPropData.request.allowEdit;
        this.titleAndDetailDisp.dataUpdated();

        // Show login status
        if ( this.reqPropData.linkKey.loginRequired ){
            this.setInnerHtml( 'loginStatus', 'Voter login required' );
        }
        else {
            this.setInnerHtml( 'loginStatus', (this.reqPropData.request.mine ? 'Browser login only' : null) );
        }

        // Set request-for-proposals attributes
        this.setAttribute( 'RequestForProposals', 'frozen', (this.reqPropData.request.freezeUserInput ? TRUE : null) );
        this.setAttribute( 'RequestForProposals', 'mine', (this.reqPropData.request.mine ? TRUE : null) );

        // Show freeze-message
        if ( this.freezeMessage ){  this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeButton') );  }
        else {  this.setInnerHtml( 'freezeButton' , (this.reqPropData.request.freezeUserInput ? 'Frozen' : 'Unfrozen') );  }

        // For each proposal data...
        var proposals = this.reqPropData.proposals;
        for ( var p = 0;  p < proposals.length;  ++p ) { 
            // Try to find proposal in existing proposal displays.
            var proposalData = proposals[p];
            // If proposal display exists... update its data... otherwise create proposal display.
            var proposalDisp = this.proposalIdToDisp[ proposalData.id ];
            if ( proposalDisp ){
                proposalDisp.setAllData( proposalData, this.reqPropData.reasons, this, this.reqPropData.linkKey );
            }
            else {
                this.addProposalDisplay( proposalData );
            }
        }

        if ( retrieveReasons ){  this.loadNewProposalReasons();  }

        // For each proposal sub-display...
        var foundReason = false;
        for ( var p = 0;  p < this.proposalDisplays.length;  ++p ){
            var proposalDisp = this.proposalDisplays[p];
            var proposalData = proposalDisp.proposal;
            // Set flags for first proposal with reasons.
            proposalData.firstProposal = ( p == 0 )?  TRUE  :  FALSE;
            if ( ! foundReason  &&  proposalData.reasons.length > 0 ){
                proposalData.firstProposalWithReasons = TRUE;
                foundReason = true;
            }
            else {
                proposalData.firstProposalWithReasons = FALSE;
            }
            // Update proposal display.
            proposalDisp.dataUpdated();
        }

        // Display new-proposal matches
        var matchesDiv = this.getSubElement('matches');
        clearChildren( matchesDiv );
        if ( this.hasMatches ){
            this.sortProposalsByMatchScore();
            for ( var p = 0;  p < this.proposalDisplays.length;  ++p ){
                var proposalDisplay = this.proposalDisplays[p];
                var matchLink = htmlToElement( '<a class=matchLink></a>' );
                var matchDiv = htmlToElement( '<div class=match></div>' );
                var proposalText = proposalDisplay.proposal.title + ' ' + proposalDisplay.proposal.detail;
                displayHighlightedContent( proposalText.substring(0,200)+'...' , this.highlightWords , matchDiv );
                matchDiv.onclick = function(p){  return function(){ p.scrollToProposal() }  }(proposalDisplay);  // Create callback containing loop variable
                matchLink.appendChild( matchDiv );
                matchesDiv.appendChild( matchLink );
            }
        }

        this.colorNextInput();  // Update input field highlights.
    };


        RequestForProposalsDisplay.prototype.
    editable = function(){  return this.reqPropData.request.allowEdit && !this.isFrozen();  }

        RequestForProposalsDisplay.prototype.
    isFrozen = function(){  return this.reqPropData.request.freezeUserInput;  }


    // Sort by match-score ascending
        RequestForProposalsDisplay.prototype.
    sortProposalsByMatchScore = function( ){
        this.proposalDisplays.sort(  function(a,b){ return (a.matchScore - b.matchScore); }  );
    };


        RequestForProposalsDisplay.prototype.
    addProposalDisplay = function( proposalData ){  // returns ProposalDisplay
        // Create display
        proposalData.fromRequest = true;
        proposalDisp = new ProposalDisplay( proposalData.id );
        proposalDisp.setAllData( proposalData, this.reqPropData.reasons, this, this.reqPropData.linkKey );
        // Collect and index display
        this.proposalDisplays.push( proposalDisp );
        this.proposalIdToDisp[ proposalData.id ] = proposalDisp;
        // Add display DOM element to layout
        var proposalsDiv = this.getSubElement('Proposals');
        proposalsDiv.appendChild( proposalDisp.element );
        return proposalDisp;
    };


    // Both for initial page load and for more-proposals load, but not for page-update because page-update can be slower.
        RequestForProposalsDisplay.prototype.
    loadNewProposalReasons = function( ){
        var delayMsPerProposal = 100;
        var numNewProposals = 0;
        // For each new proposal...
        this.proposalDisplays.map( function(proposalDisp){
            if ( proposalDisp.reasonsLoaded ){  return;  }
            proposalDisp.reasonsLoaded = true;

            // Schedule a delayed call to load proposal reasons.
            var delayMs = numNewProposals * delayMsPerProposal;
            setTimeout( function(){
                var onlyTopReasons = true;
                proposalDisp.retrieveData( onlyTopReasons );
            } , delayMs );
            ++ numNewProposals;
        } );
    };


        RequestForProposalsDisplay.prototype.
    clickFreezeButton = function( ){

        if ( this.reqPropData.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        // save via ajax
        var freeze =  ! this.reqPropData.request.freezeUserInput;
        this.freezeMessage = { color:GREY, text:(freeze ? 'Freezing' : 'Unfreezing') };
        this.dataUpdated();
        var sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.reqPropData.linkKey.id ,
            freezeUserInput:freeze
        };
        var url = 'freezeRequest';
        var thisCopy = this;
        var freezeMessageDefault = this.reqPropData.request.freezeUserInput ? 'Frozen' : 'Unfrozen';
        var freezeMessageMillisec = 5000;
        ajaxSendAndUpdate( sendData, url, this, function(error, status, receiveData){
            if ( error ){
                thisCopy.freezeMessage = { color:RED , text:'Failed to ' + (freeze ? 'freeze' : 'unfreeze') , textDefault:freezeMessageDefault , ms:freezeMessageMillisec };
            }
            else if ( receiveData &&  receiveData.success ){
                // update data
                thisCopy.reqPropData.request = receiveData.request;
                var freezeLabel = thisCopy.reqPropData.request.freezeUserInput ? 'Frozen' : 'Unfrozen';
                thisCopy.freezeMessage = { color:GREEN , text:freezeLabel , textDefault:freezeLabel , ms:freezeMessageMillisec };
            }
            else if ( receiveData  &&  receiveData.message == NOT_OWNER ){
                thisCopy.freezeMessage = { color:RED , text:'Cannot un/freeze request created by someone else.' , textDefault:freezeMessageDefault , ms:freezeMessageMillisec };
            }
            else {
                thisCopy.freezeMessage = { color:RED , text:'Failed to freeze request.' , textDefault:freezeMessageDefault , ms:freezeMessageMillisec };
            }
            thisCopy.dataUpdated();
        } );

    }

        RequestForProposalsDisplay.prototype.
    clickMoreProposals = function( ){
        if ( this.reqPropData.maxProposals ){  this.reqPropData.maxProposals += 5;  }
        this.moreProposalsMessage = { color:GREY, text:'Loading more proposals...' };
        this.dataUpdated();
        var getReasons = ! LOAD_INCREMENTAL;
        this.retrieveData( getReasons );
    }

        RequestForProposalsDisplay.prototype.
    collapseNewProposals = function( focusedProposalId ){
        // Delay before collapse, to give reasons time to display and layout
        var thisCopy = this;
        setTimeout( function(){
            for ( var p = 0;  p < thisCopy.proposalDisplays.length;  ++p ){
                var proposalDisp = thisCopy.proposalDisplays[p];
                proposalDisp.handleCollapse();
            }
            // Refocus proposal after collapsing is done
            var proposalToFocus = thisCopy.proposalIdToDisp[ focusedProposalId ];
            if ( proposalToFocus ){  proposalToFocus.scrollToProposal();  }
        } , 1000 );
    };

        RequestForProposalsDisplay.prototype.
    startEditingNewProposal = function( ){

        if ( this.reqPropData.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        this.editingNewProposal = EDIT;
        this.dataUpdated();
    };

        RequestForProposalsDisplay.prototype.
    handleEditBlur = function( ){
        var titleInput = this.getSubElement('NewProposalTitle');
        var detailInput = this.getSubElement('NewProposalDetail');
        var reasonInput1 = this.getSubElement('NewProposalInitialReasonInput1');
        var reasonInput2 = this.getSubElement('NewProposalInitialReasonInput2');
        var reasonInput3 = this.getSubElement('NewProposalInitialReasonInput3');
        // if editing and no changes made...
        if ( this.editingNewProposal == EDIT  &&
            titleInput.value == ''  &&  detailInput.value == ''  &&
            reasonInput1.value == ''  &&  reasonInput2.value == ''  &&  reasonInput3.value == '' ) {

            this.editingNewProposal = FALSE;
            // wait for handleEdit*Click() to maybe continue editing in other title/detail field
            var thisCopy = this;
            setTimeout( function(){
                // stop editing
                if ( thisCopy.editingNewProposal != EDIT ){
                    thisCopy.message = '';
                    thisCopy.wordToCount = null;
                    thisCopy.dataUpdated();
                }
            } , 1000 );
        }
    };

        RequestForProposalsDisplay.prototype.
    handleEditRequestSave = function( ){

        if ( this.reqPropData.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        var titleInput = this.titleAndDetailDisp.getSubElement('TitleInput');
        var detailInput = this.titleAndDetailDisp.getSubElement('DetailInput');

        // save via ajax
        this.titleAndDetailDisp.setMessageAndUpdate( 'Saving changes...', null, null );
        var sendData = { 
            crumb:crumb , fingerprint:fingerprint ,
            linkKey:this.reqPropData.linkKey.id , 
            inputTitle:titleInput.value , 
            inputDetail:detailInput.value 
        };
        var url = 'editRequest';
        var thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this, function(error, status, receiveData){
            if ( error ){  
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Failed to save', false, null );
            }
            else if ( receiveData &&  receiveData.success ){
                // update data
                thisCopy.reqPropData.request = receiveData.request;
                // stop editing display
                thisCopy.titleAndDetailDisp.editing = FALSE;
                thisCopy.dataUpdated();
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Saved request for proposals', true, 3000 );
            }
            else if ( receiveData  &&  receiveData.message == TOO_SHORT ){
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Request is too short.', false, 10000 );
            }
            else if ( receiveData  &&  receiveData.message == NOT_OWNER ){  
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Cannot edit request created by someone else.', false, 10000 );
                thisCopy.titleAndDetailDisp.handleCancel();
            }
            else if ( receiveData  &&  receiveData.message == HAS_RESPONSES ){
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Cannot edit request that already has proposals.', false, 10000 );
                thisCopy.titleAndDetailDisp.handleCancel();
            }
            else {
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Failed to save request.', false, null );
            }
        } );
    };

        RequestForProposalsDisplay.prototype.
    handleSaveNewProposal = function( event ){

        if ( this.reqPropData.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        var titleInput = this.getSubElement('NewProposalTitle');
        var detailInput = this.getSubElement('NewProposalDetail');
        var reasonInput1 = this.getSubElement('NewProposalInitialReasonInput1');
        var reasonInput2 = this.getSubElement('NewProposalInitialReasonInput2');
        var reasonInput3 = this.getSubElement('NewProposalInitialReasonInput3');

        // save via ajax
        this.newProposalMessage = { color:GREY, text:'Saving proposal...' };
        this.newProposalValidity = '';
        this.dataUpdated();

        var sendData = {
            crumb: crumb , fingerprint:fingerprint ,
            requestId: this.reqPropData.linkKey.id ,
            title: titleInput.value ,
            detail: detailInput.value ,
            initialReason1: reasonInput1.value ? reasonInput1.value : null ,
            initialReason2: reasonInput2.value ? reasonInput2.value : null ,
            initialReason3: reasonInput3.value ? reasonInput3.value : null
        };
        var url = 'newProposalForRequest';
        var thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this, function(error, status, receiveData){
            if ( error ){  
                var message = 'Failed to save';
                thisCopy.newProposalMessage = { color:RED, text:message };
                thisCopy.newProposalValidity = message;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.success ){
                thisCopy.newProposalMessage = { color:GREEN, text:'Saved proposal', ms:3000 };
                thisCopy.newProposalValidity = '';
                thisCopy.dataUpdated();
                // update data
                var newProposal = receiveData.proposal;
                newProposal.reasons = [];
                if ( receiveData.reasons ){
                    newProposal.reasons = receiveData.reasons;
                    for ( r in receiveData.reasons ){  thisCopy.reqPropData.reasons.push( receiveData.reasons[r] );  }
                }

                thisCopy.reqPropData.proposals.push( newProposal );
                thisCopy.dataUpdated();
                // clear form 
                titleInput.value = '';
                detailInput.value = '';
                reasonInput1.value = '';
                reasonInput2.value = '';
                reasonInput3.value = '';
                thisCopy.onInput();
                // stop editing
                thisCopy.editingNewProposal = FALSE;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == TOO_SHORT ){
                var message = 'Proposal is too short.';
                thisCopy.newProposalMessage = { color:RED, text:message };
                thisCopy.newProposalValidity = message;
                thisCopy.dataUpdated();
            }
            else if ( receiveData  &&  receiveData.message == REASON_TOO_SHORT ){
                var message = 'Supporting reason is too short.';
                thisCopy.newProposalMessage = { color:RED, text:message };
                thisCopy.newProposalValidity = message;
                thisCopy.dataUpdated();
            }
            else {
                var message = 'Could not save proposal.';
                thisCopy.newProposalMessage = { color:RED, text:message };
                thisCopy.newProposalValidity = message;
                thisCopy.dataUpdated();
            }
        } );
    };


        RequestForProposalsDisplay.prototype.
    onInput = function( ){  
        deduplicate( 300, this, this.onInputDeduplicated );
    };

    // Interface function for top-level proposal and request displays
        RequestForProposalsDisplay.prototype.
    topInputHandler = function( ){
        this.colorNextInput();
    };

        RequestForProposalsDisplay.prototype.
    onInputDeduplicated = function( ){

        // For each proposal-display... find new-proposal keyword matches
        var newProposalTitle = this.getSubElement('NewProposalTitle');
        var newProposalDetail = this.getSubElement('NewProposalDetail');
        var newProposalText = ( newProposalTitle.value ? newProposalTitle.value+' ' : '' ) + 
                          ( newProposalDetail.value ? newProposalDetail.value : '' );
        var numMatches = 0;
        if ( newProposalText ){
            numMatches = this.proposalDisplays.reduce( function(count, p){
                var matchIntervals = keywordMatchIntervals( newProposalText, p.proposal.title + ' ' + p.proposal.detail );
                var matches = matchIntervals.filter( function(i){return i.match} );
                return ( matches  &&  matches.length > 0 ) ?  count+1  :  count;
            } , 0 );
        }
        this.hasMatches = ( numMatches > 0 );
        this.highlightWords = newProposalText;

        // Display match count
        this.matchesMessage = { color:GREY, text:''+numMatches+' matches' };

        // For each proposal ... update word counts
        var updatedWordCounts = false;
        for ( var p = 0;  p < this.proposalDisplays.length;  ++p ){
            var proposalDisp = this.proposalDisplays[p];
            updatedWordCounts |= proposalDisp.updateWordCounts();
        }
        updatedWordCounts |= updateWordCounts( this, this.reqPropData.request.title + ' ' + this.reqPropData.request.detail );

        // Update total word counts, recompute inverse-document-frequency
        if ( updatedWordCounts ){
            // For each proposal, and this request ... sum map[ word -> document count ]
            this.wordToDocCount = {};
            for ( var p = 0;  p < this.proposalDisplays.length;  ++p ){
                var proposalDisp = this.proposalDisplays[p];
                for ( var word in proposalDisp.wordToCount ){
                    incrementMapValue( this.wordToDocCount, word, 1 );
                }
            }
            for ( var word in this.wordToCount ){
                incrementMapValue( this.wordToDocCount, word, 1 );
            }

            topDisp.wordToInvDocFrequency = wordCountsToInvDocFreq( this.wordToDocCount ); 
        }

        // Score proposal matches
        computeMatchScores( newProposalText , topDisp.wordToInvDocFrequency, this.proposalDisplays , function(p){return p.voteScore()} );

        this.dataUpdated();
        this.colorNextInput();
    };


    // Guide user to next input, by highlight-coloring input fields.
    // For button-presses that cause rendering, set data attributes and use css to highlight.
    // For input typing, which does not re-render components, override attributes.
        RequestForProposalsDisplay.prototype.
    colorNextInput = function( ){

        var reqPropDisp = this;
        var reqPropData = reqPropDisp.reqPropData;
        var request = reqPropData.request;
        var proposals = reqPropData.proposals;
        var reasons = reqPropData.reasons;

        // de-highlight
        var reqPropDiv = reqPropDisp.element;
        reqPropDiv.setAttribute( 'nextinput', null );

        var newProposalReasonInputs = [
            reqPropDisp.getSubElement('NewProposalInitialReasonInput1'),
            reqPropDisp.getSubElement('NewProposalInitialReasonInput2'),
            reqPropDisp.getSubElement('NewProposalInitialReasonInput3')
        ];

        // if user needs to enter first proposal... highlight proposal inputs
        if ( proposals.length == 0 ){
            var newProposalTitleInput = reqPropDisp.getSubElement('NewProposalTitle');
            var newProposalDetailInput = reqPropDisp.getSubElement('NewProposalDetail');
            if ( newProposalTitleInput  &&  newProposalTitleInput.value == '' ){
                reqPropDiv.setAttribute( 'nextinput', 'proposalTitle' );
            }
            else if ( newProposalDetailInput  &&  newProposalDetailInput.value == '' ){
                reqPropDiv.setAttribute( 'nextinput', 'proposalDetail' );
            }
            else if ( newProposalReasonInputs  &&  newProposalReasonInputs[0]  &&  newProposalReasonInputs[0].value == '' ){
                reqPropDiv.setAttribute( 'nextinput', 'proposalInitialReason' );
            }
        }
        // if user needs to enter first reason... highlight reason input
        else if ( reasons.length == 0 ){
            var firstReasonInput = reqPropDisp.proposalDisplays[0].getSubElement('NewReasonInput');
            if ( firstReasonInput  &&  firstReasonInput.value == '' ){  
                reqPropDiv.setAttribute( 'nextinput', 'reason' );
            }
        }
        // if user needs to enter first vote... highlight first vote button
        else {
            var numMyVotes = reasons.reduce( function(agg,r){ return agg + (r.myVote? 1 : 0); } , 0 );
            if ( numMyVotes == 0 ){
                reqPropDiv.setAttribute( 'nextinput', 'vote');
            }
        }

        // Show new proposal initial reason inputs
        var hasValue = [
            newProposalReasonInputs[0] && newProposalReasonInputs[0].value != '' ,
            newProposalReasonInputs[1] && newProposalReasonInputs[1].value != '' ,
            newProposalReasonInputs[2] && newProposalReasonInputs[2].value != ''
        ];
        if ( newProposalReasonInputs[1] ){
            newProposalReasonInputs[1].style.display = ( hasValue[1] || hasValue[0] )? 'block' : 'none';
        }
        if ( newProposalReasonInputs[2] ){
            newProposalReasonInputs[2].style.display = ( hasValue[2] || hasValue[1] )? 'block' : 'none';
        }
    };

        RequestForProposalsDisplay.prototype.
    retrieveDataUpdate = function( ){
        var getReasons = true;
        retrieveRequestProposalsReasons( this, getReasons );
    };

        RequestForProposalsDisplay.prototype.
    retrieveData = function( getReasons ){
        retrieveRequestProposalsReasons( this, getReasons );
    };



/////////////////////////////////////////////////////////////////////////////////
// Data retrieval

        function
    retrieveRequestProposalsReasons( reqPropDisp, getReasons ){
        // getReasons:boolean

        console.log( 'retrieveRequestProposalsReasons() getReasons=', getReasons );

        // proposals:series[proposal] , modified
        // reasons:series[reason] , modified
        var reqPropData = reqPropDisp.reqPropData;
        var request = reqPropData.request;
        var proposals = reqPropData.proposals;
        var reasons = reqPropData.reasons;

        // request via ajax
        var sendData = { };
        var url = 'getRequestData/' + reqPropData.linkKey.id;
        var urlParams = [];
        if ( reqPropData.maxProposals ){  urlParams.push( 'maxProposals=' + reqPropData.maxProposals );  }
        if ( ! getReasons ){  urlParams.push( 'getReasons=false' );  }
        if ( urlParams.length > 0 ){  url += '?' + urlParams.join('&');  }
        ajaxGet( sendData, url, function(error, status, data){
            console.log( 'ajaxGet() error=', error, '  status=', status, '  data=', data );

            reqPropDisp.moreProposalsMessage = { color:BLACK, text:'More proposals' };
            reqPropDisp.dataUpdated();
            if ( data ){
                if ( data.success ){
                    reqPropData.linkOk = true;
                    reqPropData.linkKey.loginRequired = data.linkKey.loginRequired;
                    reqPropData.maxProposals = data.maxProposals;
                    // update request -- both data and display state
                    if ( data.request ){
                        request.title = data.request.title;
                        request.detail = data.request.detail;
                        request.allowEdit = data.request.allowEdit;
                        request.freezeUserInput = data.request.freezeUserInput;
                        request.mine = data.request.mine;
                    }
                    // update each proposal
                    if ( data.proposals ){
                        for ( var p = 0;  p < data.proposals.length;  ++p ){
                            var updatedProposal = data.proposals[p];
                            var existingProposal = proposals.find( function(e){ return e.id == updatedProposal.id; } );
                            if ( existingProposal ){
                                updateProposal( existingProposal, updatedProposal );
                            }
                            else {
                                updatedProposal.reasons = [];
                                proposals.push( updatedProposal );
                            }
                        }
                    }
                    // update each reason
                    if ( data.reasons ){
                        updateReasons( proposals, reasons, data.reasons );
                    }
                    // update display
                    reqPropDisp.dataUpdated( ! getReasons );
                    reqPropDisp.collapseNewProposals();
                }
                else if ( data.message == BAD_LINK ){
                    reqPropData.linkOk = false;
                    reqPropDisp.dataUpdated();
                }
            }
        } );
    }

        function
    retrieveProposalReasons( proposalDisp, onlyTopReasons ){

        console.log( 'retrieveProposalReasons() onlyTopReasons=', onlyTopReasons );

        // reasons:series[reason] , modified
        var proposalData = proposalDisp.proposal;
        var reasons = proposalData.reasons;

        // request via ajax
        var sendData = { };
        var url = proposalData.fromRequest ?
            'getProposalData/' + proposalDisp.linkKey.id + '/' + proposalDisp.proposal.id :
            'getProposalData/' + proposalDisp.linkKey.id;
        if ( onlyTopReasons ){  url += '?onlyTop=true';  }
        ajaxGet( sendData, url, function(error, status, receiveData){
            console.log( 'ajaxGet() error=', error, '  status=', status, '  receiveData=', receiveData );
            if ( receiveData ){
                if ( receiveData.success ){
                    proposalData.linkOk = true;
                    if ( ! proposalData.linkKey ){  proposalData.linkKey = {};  }
                    if ( receiveData.linkKey ){  proposalData.linkKey.loginRequired = receiveData.linkKey.loginRequired;  }
                    // update proposal
                    if ( receiveData.proposal ){
                        updateProposal( proposalData, receiveData.proposal );
                    }
                    // update each reason
                    if ( receiveData.reasons ){
                        updateReasons( [proposalData], reasons, receiveData.reasons );
                    }
                    // update display
                    proposalDisp.dataUpdated();
                }
                else if ( receiveData.message == BAD_LINK ){
                    proposalData.linkOk = false;
                    proposalDisp.dataUpdated();
                }
            }
        } );
    }
    
        function
    updateReasons( proposals, reasons, newReasons ){
        // for each new reason data... 
        for ( var r = 0;  r < newReasons.length;  ++r ){
            var updatedReason = newReasons[r];
            // if new reason already exists... update reason
            var existingReason = reasons.find( function(e){ return e.id == updatedReason.id; } );
            var existingProposal = proposals.find( function(e){ return e.id == updatedReason.proposalId; } );
            if ( existingReason ){
                existingReason.content = updatedReason.content;
                existingReason.allowEdit = updatedReason.allowEdit;
                existingReason.myVote = updatedReason.myVote;
                existingReason.voteCount = updatedReason.voteCount;
                existingReason.score = updatedReason.score;
            }
            // if matching proposal exists... add reason to existing proposal
            else if ( existingProposal ) {
                // push() calls are redundant if reasons come from a single proposal.
                // More efficient for each proposal to have a map of reason id -> reason data. But less stable ordering for display.
                reasons.push( updatedReason );
                var existingReasonInProposal = existingProposal.reasons.find( function(e){ return e.id == updatedReason.id; } );
                if ( ! existingReasonInProposal ){  existingProposal.reasons.push( updatedReason );  }
                if ( ! updatedReason.voteCount ){  updatedReason.voteCount = 0;  }
                if ( ! updatedReason.score ){  updatedReason.score = 0;  }
            }
        }
    }
    
        function
    updateProposal( existingProposal, updatedProposal ){
        existingProposal.title = updatedProposal.title;
        existingProposal.detail = updatedProposal.detail;
        existingProposal.allowEdit = updatedProposal.allowEdit;
        existingProposal.mine = updatedProposal.mine;
        existingProposal.id = updatedProposal.id;  // Need linkKey to load proposal data.
        existingProposal.loginRequired = updatedProposal.loginRequired;
        existingProposal.freezeUserInput = updatedProposal.freezeUserInput;
    }

        function
    ajaxSendAndUpdate( sendData, url, topDisp, callback ){

        console.log( 'ajaxSendAndUpdate() url=', url, 'sendData=', sendData, 'topDisp=', topDisp );

        var topDispCopy = topDisp;
        ajaxPost( sendData, url, function(error, status, data){
            console.log( 'ajaxPost() callback error=', error, '  status=', status, '  data=', data );
            callback( error, status, data );

            // Delay before global update, to allow server data cache to update.
            setTimeout( function(){
                topDispCopy.retrieveDataUpdate();
            } , 3000 );
        } );
    }



/////////////////////////////////////////////////////////////////////////////////
// global functions

    // Returns map[ word -> inverse document frequency ] , or null if no recompute needed.
    // Sets wordToCount in each documentObject.
        function
    computeInvDocFreq( documentObjects, documentTextAccessor ){

        // Aggregate counts of documents with term
        var recomputeInvDocFreq = false;
        // For each document...
        for ( var d = 0;  d < documentObjects.length;  ++d ){
            var documentObject = documentObjects[d];
            var updated = updateWordCounts( documentObject, documentTextAccessor(documentObject) );
            recomputeInvDocFreq |= updated;
        }

        if ( ! recomputeInvDocFreq ){  return null;  }

        // For each document... sum map[ word -> document count ]
        var wordToDocCount = {};
        for ( var d = 0;  d < documentObjects.length;  ++d ){
            var documentObject = documentObjects[d];
            // Increment map[ word -> document count ]
            for ( var word in documentObject.wordToCount ){
                incrementMapValue( wordToDocCount, word, 1 );
            }
        }

        return wordCountsToInvDocFreq( wordToDocCount );
    }


    // Sets documentObject.wordToCount , returns updated:boolean
        function
    updateWordCounts( documentObject, documentText ){
        if ( documentObject.wordToCount ){  return false;  }

        recomputeInvDocFreq = true;
        var documentWordArray = tokenize( documentText );

        // Collect document map[ word -> count ]
        var documentWordToCount = {};
        for ( var w = 0;  w < documentWordArray.length;  ++w ){
            var word = documentWordArray[w];
            if ( word in STOP_WORDS ){  continue;  }
            incrementMapValue( documentWordToCount, word, 1 );
        }

        // Store documentWordToCount in documentObject
        documentObject.wordToCount = documentWordToCount;
        return true;
    }

        function
    wordCountsToInvDocFreq( wordToDocCount ){
        // Convert word document counts to inverse-document-frequency
        var wordToInvDocFrequency = {}
        for ( word in wordToDocCount ){
            wordToInvDocFrequency[ word ] = 1 / wordToDocCount[word];
        }
        return wordToInvDocFrequency;
    }


    // Reads each documentObject.wordToCount, sets each documentObject.matchScore
        function
    computeMatchScores( queryText , wordToInvDocFrequency, documentObjects , documentScoreAccessor ){

        // Collect query-word weights
        var queryWords = tokenize( queryText );
        var queryWordsToWeights = {};
        for ( var q = 0;  q < queryWords.length;  ++q ){
            var word = queryWords[q];
            var weight = wordToInvDocFrequency[ word ];
            if ( weight ){  queryWordsToWeights[ word ] = weight;  }
        }
        // For each document... compute match score from word-match weights, and from score from number of votes and content length
        for ( var d = 0;  d < documentObjects.length;  ++d ){
            var documentObject = documentObjects[d];
            var weightSum = 0.0;

            // For each term in query and in document...
            if ( documentObject.wordToCount ){
                for ( var word in queryWordsToWeights ){
                    var weight = queryWordsToWeights[ word ];
                    var count = documentObject.wordToCount[word];
                    if ( ! count ){  continue;  }
                    weightSum += count * weight;
                }
            }
            // Combine invDocFreq score and vote-score (plus 1 to avoid zero-vote problems)
            documentObject.matchScore = ( 1 + weightSum ) * ( 1 + documentScoreAccessor(documentObject) );
        }
    }

