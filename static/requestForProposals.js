/////////////////////////////////////////////////////////////////////////////////
// Constants

    const PRO = 'pro';
    const CON = 'con';
    const PROPOSAL_COLLAPSE_HEIGHT = 200;  // Must match css max-height for class Collapseable
    const LOAD_INCREMENTAL = true;


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
            '       <div class=ReasonProOrCon id=ReasonProOrConViewing translate=true></div>',
            '       <div class=ReasonVote id=Vote onclick=handleVoteClick title="Vote" ',
            '           role=button title=Vote tabindex=0 onkeyup=handleVoteKeyUp ',
            '           aria-controls=ReasonEditing >',
            '           <div class=ReasonVoteArrowBody></div>',
            '           <div class=ReasonVoteArrowHead></div>',
            '           <div class=ReasonVoteCount id=ReasonVoteCount></div>',
            '           <div class=ReasonScore id=score></div>',
            '       </div>',
            '       <div class=EditIcon id=EditIcon role=button title="Edit" tabindex=0 onkeyup=onEditReasonKeyUp ',
            '           onclick=handleEditReasonClick aria-controls=ReasonEditing ',
            '           ><img class=EditIconImage role=button src="edit.png" alt="edit" /></div>',
            '       <div class=ReasonText id=ReasonText onclick=handleEditReasonClick aria-controls=ReasonEditing ></div>',
            '   </div>',
            // Editing
            '    <div class=ReasonEditing id=ReasonEditing>', 
            '        <div class=ReasonProOrCon id=ReasonProOrConEditing></div>',
            '        <div class=ReasonEdit>', 
            '            <textarea class=ReasonEditInput id=Content placeholder="I agree because..." ',
            '                onblur=handleEditReasonBlur oninput=onInput></textarea>',
            '        </div>',
            '        <div class=ReasonEditingButtons>',
            '            <button class=ReasonSaveButton onclick=handleEditReasonSave ',
            '               onblur=handleEditReasonBlur translate=true> Save </button>',
            '            <button class=ReasonCancelButton onclick=handleEditReasonCancel ',
            '               onblur=handleEditReasonBlur onkeyup=onEditReasonCancelKeyUp translate=true> Cancel </button>',
            '        </div>',
            '    </div>',
            '    <div class="Message ReasonEditMessage" id=ReasonEditMessage aria-live=polite></div>' ,
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

        let reasonType = ( this.data.proOrCon == PRO )? 'agree' : 'disagree';
        this.setInnerHtml( 'ReasonProOrConViewing', reasonType );
        this.setInnerHtml( 'ReasonProOrConEditing', reasonType );

        // Message
        this.message = showMessageStruct( this.message, this.getSubElement('ReasonEditMessage') );
        let contentInput = this.getSubElement('Content');
        contentInput.setCustomValidity( defaultTo(this.contentValidity, '') );

        // Editing vs viewing
        this.setAttribute( 'Reason', 'editing', this.editing );
        this.setAttribute( 'Reason', 'frozen', this.topDisp.isFrozen() );
        // Editing aria state
        let ariaExpanded = null;
        if ( this.editable() ){  ariaExpanded = ( this.editing == EDIT ) ? TRUE : FALSE;  }
        this.setAttribute( 'EditIcon', 'aria-expanded', ariaExpanded );
        this.setAttribute( 'ReasonText', 'aria-expanded', ariaExpanded );
        // Editing onClick handler: For screen reader, if not editable, remove onClick handler
        if ( this.editHandlerHide == null ){  this.editHandlerHide = this.getSubElement('EditIcon').onclick;  }
        let clickHandler = ( this.editable() )?  this.editHandlerHide  :  null;
        this.setRequiredMember( 'EditIcon', 'onclick', clickHandler );
        this.setRequiredMember( 'ReasonText', 'onclick', clickHandler );

        // Voting click-handler: For screen reader, if frozen, remove click-handler
        if ( this.voteHandlerHide == null ){  this.voteHandlerHide = this.getSubElement('Vote').onclick;  }
        this.setRequiredMember( 'Vote', 'onclick', (this.topDisp.isFrozen() ? null : this.voteHandlerHide) );

        // Editing
        contentInput.defaultValue = this.data.content;
        // Viewing
        this.setAttribute( 'Reason', 'allowedit', (this.editable() ? TRUE : null) );
        this.setAttribute( 'Reason', 'highlight', this.data.highlight );
        this.setAttribute( 'Reason', 'firstreason', this.data.isFirstReason );
        this.setAttribute( 'Reason', 'myvote', (this.data.myVote ? TRUE : FALSE) );
        this.setInnerHtml( 'ReasonVoteCount', this.data.voteCount );
        this.setAttribute( 'Vote', 'aria-pressed', (this.data.myVote ? TRUE : FALSE) );
        this.setAttribute( 'Vote', 'aria-label', 
            this.data.voteCount + (this.data.voteCount == 1 ? ' vote' : ' votes') );
        this.setInnerHtml( 'score', 'score='+ this.data.score );

        // Viewing: content, possibly highlighted
        let match = displayHighlightedContent( storedTextToHtml(this.data.content), this.highlightWords, this.getSubElement('ReasonText') );
        this.setAttribute( 'Reason', 'show', (match? TRUE : FALSE) );
    };

        ReasonDisplay.prototype.
    editable = function(){  return this.data.allowEdit && !this.topDisp.isFrozen();  };

        ReasonDisplay.prototype.
    onInput = function( ){
        // Reset validity if reason is long enough now
        let contentInput = this.getSubElement('Content');
        if ( this.tooShort  &&  minLengthReason <= contentInput.value.length ){
            this.tooShort = false;
            this.contentValidity = '';
            this.message = {  text:''  };
            this.dataUpdated();
        }

        this.topDisp.topInputHandler();
    };

        ReasonDisplay.prototype.
    handleVoteClick = function( ){
        let reasonData = this.data;
        let proposalDisplay = this.proposalDisplay;
        let proposalData = this.proposalDisplay.proposal;

        if ( this.proposalDisplay.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        // presume vote succeeds, and show vote result
        let myNewVote = (reasonData.myVote === true)? false : true;
        // save old vote state
        let oldReasonVoteCounts = proposalData.reasons.map( function(r){ return r.voteCount; } );
        let oldMyVotes = proposalData.reasons.map( function(r){ return r.myVote; } );
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
        let thisCopy = this;
        let sendData = { crumb:crumb , fingerprint:fingerprint ,
            reasonId:reasonData.id , vote:reasonData.myVote , 
            linkKey:this.proposalDisplay.linkKey.id };
        let url = 'submitVote';
        ajaxSendAndUpdate( sendData, url, this.topDisp, function(error, status, receiveData){
            if ( receiveData  &&  receiveData.success ){
                let hint = ( myNewVote  &&  ! proposalDisplay.areReasonsHidden() )?  '. (Limit 1 vote per proposal.)'  :  '';
                let message = 'Saved vote' + hint;
                thisCopy.message = { text:message, color:GREEN, ms:3000 };
                // update vote count (includes votes from other users since last data refresh)
                let newVoteCount = ( receiveData.reason && receiveData.reason.voteCount )?  parseInt( receiveData.reason.voteCount )  :  0;
                reasonData.voteCount = newVoteCount;
                reasonData.score = ( receiveData.reason )?  receiveData.reason.score  :  null;
                reasonData.allowEdit = receiveData.reason.allowEdit;
            }
            else {
                // revert my vote & vote count
                // proposal.reasons is still sorted in same order as old reason votes, because we only sort on page load.
                if ( error ){  thisCopy.message = { text:'Failed: '+error, color:RED, ms:10000 };  }
                else {  thisCopy.message = { text:'Failed to save vote.', color:RED, ms:10000 };  }
                proposalData.reasons.map( function(r,i){ r.voteCount = oldReasonVoteCounts[i]; r.myVote = oldMyVotes[i]; } );
            }
            thisCopy.topDisp.dataUpdated();
            thisCopy.onInput();
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

        let contentInput = this.getSubElement('Content');
        let inputValue = contentInput.value;
        let reasonData = this.data;

        // Check reason length
        if ( inputValue.length < minLengthReason ){
            this.tooShort = true;
            this.contentValidity = 'Reason is too short';
            this.message = {  text:this.contentValidity , color:RED  };
            this.dataUpdated();
            return;
        }

        // save via ajax
        this.message = { text:'Saving changes...', color:GREY };
        this.contentValidity = '';
        this.dataUpdated();
        let sendData = { crumb:crumb , fingerprint:fingerprint ,
            reasonId:reasonData.id , inputContent:inputValue , 
            linkKey:this.proposalDisplay.linkKey.id };
        let url = 'editReason';
        let thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this.topDisp, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.message = { text:'Saved reason', color:GREEN, ms:3000 };
                // Update data
                reasonData.content = receiveData.reason.content;
                reasonData.allowEdit = receiveData.reason.allowEdit;
                thisCopy.stopEditing();  // calls dataUpdated()
            }
            else {
                let message = null;
                let millisec = null;
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short.';  thisCopy.tooShort = true;  }
                    else if ( receiveData.message == REASON_TOO_SHORT ){  message = 'Reason is too short.';  thisCopy.tooShort = true;  }
                    else if ( receiveData.message == DUPLICATE ){  message = 'Reason already exists.';  }
                }
                if ( message ){  thisCopy.contentValidity = message;  }

                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  
                        thisCopy.handleEditReasonCancel();
                        message = 'Cannot edit reason created by someone else.';
                    }
                    else if ( receiveData.message == HAS_RESPONSES ){  
                        thisCopy.handleEditReasonCancel();
                        message = 'Cannot edit reason that already has votes';
                    }
                }
                if ( message ){  millisec = 10000;  }
                else {  message == 'Error saving';  }

                thisCopy.message = { text:message, color:RED, ms:millisec };
                thisCopy.dataUpdated();
            }
        } );
    };

        ReasonDisplay.prototype.
    handleEditReasonCancel = function( ){ 
        this.stopEditing();
    };

        ReasonDisplay.prototype.
    stopEditing = function( ){ 
        this.editing = FALSE;
        this.wordToCount = null;

        let contentInput = this.getSubElement('Content');
        contentInput.defaultValue = this.data.content;
        contentInput.value = contentInput.defaultValue;
        contentInput.setSelectionRange(0, 0);

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
            '       <h2 class=Title id=Title onclick=handleEditTitleClick aria-controls=TitleAndDetailEditing ></h2>',
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
            '               onblur=handleEditBlur translate=true> Save </button>',
            '           <button class=TitleAndDetailCancelButton onclick=handleCancel ',
            '               onblur=handleEditBlur translate=true> Cancel </button>',
            '       </div>',
            '   </div>',
            // Message
            '   <div class="Message TitleAndDetailMessage" id=Message aria-live=polite></div>' ,
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
        let ariaExpanded = null;
        if ( this.editable() ){  ariaExpanded = ( this.editing == EDIT ) ? TRUE : FALSE;  }
        this.setAttribute( 'EditIcon', 'aria-expanded', ariaExpanded );
        this.setAttribute( 'Title', 'aria-expanded', ariaExpanded );
        this.setAttribute( 'Detail', 'aria-expanded', ariaExpanded );
        // Set editing click-handler: For screen reader, if not editable, remove onClick handler
        if ( this.onClickHide == null ){  this.onClickHide = this.getSubElement('Title').onclick;  }
        let clickHandler = this.editable() ?  this.onClickHide  :  null;
        this.setRequiredMember( 'EditIcon', 'onclick', clickHandler );
        this.setRequiredMember( 'Title', 'onclick', clickHandler );
        this.setRequiredMember( 'Detail', 'onclick', clickHandler );

        // Set editable state on edit icon.
        this.setAttribute( 'TitleAndDetail', 'allowedit', (this.editable() ? TRUE : null) );
        let titleClickToEdit = this.editable() ?  'Edit'  :  null;
        this.setProperty( 'EditIcon', 'title', titleClickToEdit );
        // Title
        this.setProperty( 'TitleInput', 'defaultValue', this.data.title );
        this.setProperty( 'TitleInput', 'placeholder', this.data.titlePlaceholder );
        let titleText = this.loaded() ?  this.data.title  :  'Loading...';
        this.setInnerHtml( 'Title', titleText );
        this.setProperty( 'Title', 'title', titleClickToEdit );
        // Detail
        // Do not set title because it overrides content for screen-reader.
        // Do not set aria-label, because it stops screen-reader traversal inside.
        this.setProperty( 'DetailInput', 'defaultValue', this.data.detail );
        this.setProperty( 'DetailInput', 'placeholder', this.data.detailPlaceholder );
        this.setInnerHtml( 'Detail', storedTextToHtml(this.data.detail) );
        // Message
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        let titleInput = this.getSubElement('TitleInput');
        let detailInput = this.getSubElement('DetailInput');
        titleInput.setCustomValidity( defaultTo(this.contentValidity, '') );
        detailInput.setCustomValidity( defaultTo(this.contentValidity, '') );

        this.match = false;
        this.match |= displayHighlightedContent( titleText, this.highlightWords, this.getSubElement('Title') );
        this.match |= displayHighlightedContent( storedTextToHtml(this.data.detail), this.highlightWords, this.getSubElement('Detail') );

        translateScreen( this.getSubElement('TitleAndDetail') );
    };


        TitleAndDetailDisplay.prototype.
    loaded = function(){  return  this.data  &&  ( this.data.linkOk || this.data.title || this.data.detail );  }

        TitleAndDetailDisplay.prototype.
    editable = function(){  return this.data.allowEdit && !this.topDisp.isFrozen();  }


    // Sets highlighted content into parentDiv. Returns match:boolean=true if has matches or highlighted-words is empty.
        function
    displayHighlightedContent( content, highlightWords, parentDiv ){

        if ( highlightWords ){
            // Convert content string to html-elements, then highlight elements
            let contentElementsParent = html('span').innerHtml( content ).build();  // Do not create extra div, only a span, to not change text layout
            var highlightedSpans = highlightNode( contentElementsParent, highlightWords, '' );

            setChildren( parentDiv , highlightedSpans );
            for ( var h = 0;  h < highlightedSpans.length;  ++h ){
                var highlightedDescendants = highlightedSpans[h].getElementsByClassName('Highlight');
                if ( highlightedDescendants.length > 0 ){  return true;  }
            }
            return false;
        }
        else {
            parentDiv.innerHTML = defaultTo( content, '' );
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
        // Check title/detail length
        let titleInput = this.getSubElement('TitleInput');
        let detailInput = this.getSubElement('DetailInput');
        if ( !this.data.minLength  ||  (this.data.minLength <= titleInput.value.length + detailInput.value.length) ){
            this.contentValidity = '';
            this.message = {  text:''  };
            this.dataUpdated();
        }

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
        detailInput.value = detailInput.defaultValue;
        detailInput.setSelectionRange(0, 0);
        // stop editing
        this.stopEditing();
    };

        TitleAndDetailDisplay.prototype.
    handleSave = function( ){
        // Check title/detail length
        let titleInput = this.getSubElement('TitleInput');
        let detailInput = this.getSubElement('DetailInput');
        let minLengthMessage = defaultTo( this.data.minLengthMessage, 'Too short' );
        if ( this.data.minLength  &&  (titleInput.value.length + detailInput.value.length < this.data.minLength) ){
            this.setMessageAndUpdate( minLengthMessage, false );
            return;
        }

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
    //
    // Simpler to pass expandOrCollapseForEditing() as a callback in TitleAndDetailDisplay.data ?

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
        ElementWrap.call( this );  // Inherit member data
        this.messageColor = GREY;
        this.create( proposalId );
    }
    ProposalDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

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
            '    <h1 class=title id=PageTitle role=status translate=true> Proposal </h1>' ,
            '    <div id=Message class="Message ProposalMessage" aria-live=polite></div>' ,
            '    <div class=loginStatus id=loginStatus translate=true></div>' ,
            '    <div class=hideReasonsStatus id=hideReasonsStatus translate=true></div>' ,
            '   <div id=freezeUserInput class=freezeUserInput> ',
            '       <label for=freezeUserInputCheckbox oninput=clickFreezeUserInput translate=true> Block all input </label> ',
            '       <input id=freezeUserInputCheckbox type=checkbox oninput=clickFreezeUserInput /> ',
            '       <div id=freezeUserInputMessage class=Message></div> ',
            '   </div> ',
            '    <div class=ProposalContentReasonsNew id=ProposalContentReasonsNew>' ,
            '       <div class=Collapseable id=Collapseable>' ,  // No longer needed
            // Title and detail
            '           <div class=ProposalContentWrap>' ,
            '               <div class=ProposalContentCover id=ProposalContentCover onclick=clickProposalContent></div>' ,
            '               <div class=ProposalContent id=ProposalContent subdisplay=titleAndDetailDisp></div>' ,
            '           </div>' ,
            // New reason form
            '           <div class=NewReasonForm id=NewReasonForm role=form >' ,
            '               <div class="Message NewReasonMessage" id=NewReasonMessage aria-live=polite></div>' ,
            '               <div class=NewReason>' ,
            '                   <label for=NewReasonInput translate=true> Find or add reason to dis/agree with the proposal </label>' ,
            '                   <textarea class=NewReasonInput id=NewReasonInput placeholder="I agree because..." ' ,
            '                       oninput=onInput onfocus=handleNewReasonClick onblur=handleNewReasonBlur ' ,
            '                       aria-expanded=false aria-controls=NewReasonButtons ></textarea>' ,
            '               </div>' ,
            '               <div class=NewReasonButtons id=NewReasonButtons>' ,
            '                   <button class=NewReasonButton id=NewReasonButtonPro onclick=handleNewPro onblur=handleNewReasonBlur translate=true> Agree </button>' ,
            '                   <button class=NewReasonButton id=NewReasonButtonCon onclick=handleNewCon onblur=handleNewReasonBlur translate=true> Disagree </button>' ,
            '               </div>' ,
            '           </div>' ,
            // Vote counts for proposal
            '           <div class=ProposalVoteSums id=ProposalVotes>' ,
            '               <div class=ProposalVotePro><span class=VoteSumLabel><span translate=true>Votes pro</span>:</span><span id=ProposalVotePro></span></div>' ,
            '               <div class=ProposalVoteCon><span class=VoteSumLabel><span translate=true>Votes con</span>:</span><span id=ProposalVoteCon></span></div>' ,
            '           </div>' ,
            // Reasons
            '           <div class=ReasonsWrap> ' ,  // Allow setting max-height on reasons, which cannot use max-height because it is a table
            '               <div class=Reasons id=reasons>' ,
            '                   <div class=ReasonsPro id=ReasonsPro></div>' ,
            '                   <div class=ReasonsCon id=ReasonsCon></div>' ,
            '               </div>' ,
            '           </div> ' ,
            '       </div>' ,  // end Collapseable
            //      Button to go to single-proposal-page
            '       <div class=ProposalExpandBottomRelative>' ,   // relative-absolute positioning for enclosed elements
            '           <div class=ProposalExpandBottomWrap>' ,  // crop shadow overflow
            '               <div class=ProposalExpandBottom onclick=handleExpandSeparatePage>' ,  // generates shadow, has hover-highlight and background arrows
            '                   <button id=expandButton translate=true> More reasons </button>' ,
            '               </div>' ,
            '           </div>' ,
            '       </div>' ,
            //      Button to load more reasons on single-proposal-page
            '       <div class=moreReasonsDiv><button id=moreReasonsButton aria-live=polite onclick=retrieveMoreReasons> More reasons </button></div>' ,
            '   </div>' ,  // end ProposalContentReasonsNew
            '   <div class=backButtonDiv><button class=backButton id=backButton onclick=onClickBack onkeyup=onKeyUpBack> &larr; <span translate=true>Back to proposals</span> </button></div>' ,
            // Admin change history
            '   <details class=adminHistory id=adminHistory> ',
            '       <summary class=adminHistoryLast id=adminHistoryLast></summary> ',
            '       <div class=adminHistoryFull id=adminHistoryFull></div> ',
            '   </details> ',
            '</div>' ,
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
        let thisCopy = this;
        let titleAndDetailData = {
            title: proposalData.title,
            detail: proposalData.detail,
            minLength: minLengthProposal,
            minLengthMessage: 'Proposal is too short',
            titlePlaceholder: 'I suggest...' ,
            detailPlaceholder: 'More details of my suggestion...' ,
            allowEdit: proposalData.allowEdit,
            loginRequired: linkKey.loginRequired,
            onSave: function(){ thisCopy.handleEditProposalSave(); }
        };
        this.titleAndDetailDisp.setAllData( titleAndDetailData, topDisp );

        this.setStyle( 'PageTitle', 'display', (this.proposal.fromRequest? 'none' : 'block') );

        // If single-proposal page... this proposal is always first and only proposal.
        if ( this.proposal.singleProposal ){
            this.proposal.firstProposal = TRUE;
            this.proposal.firstProposalWithReasons = TRUE;
        }

        this.dataUpdated();
    };

    
    // Update html from data.
        ProposalDisplay.prototype.
    dataUpdated = function( redisplayReasons=false ){
        let width = jQuery(window).width();
        let use1Column = ( width <= MAX_WIDTH_1_COLUMN ) && ( ! this.proposal.hideReasons );
        let columnsChanged = ( use1Column !== this.use1Column );
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
                this.setStyle( 'ProposalContentReasonsNew', 'display', null );
                this.setStyle( 'NewReasonForm', 'display', null );
            }
            else {
                this.message = { color:RED, text:'Invalid link.' };
                this.setStyle( 'ProposalContentReasonsNew', 'display', 'none' );
                this.setStyle( 'NewReasonForm', 'display', 'none' );
            }
        }

        // Message
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.newReasonMessage = showMessageStruct( this.newReasonMessage, this.getSubElement('NewReasonMessage') );
        let reasonInput = this.getSubElement('NewReasonInput');
        reasonInput.setCustomValidity( defaultTo(this.newReasonValidity, '') );
        this.setInnerHtml( 'hideReasonsStatus', ((this.proposal.singleProposal && this.proposal.hideReasons) ? 'Reasons hidden' : null) );
        this.moreReasonsMessage = showMessageStruct( this.moreReasonsMessage, this.getSubElement('moreReasonsButton') );

        // Set attributes
        this.setAttribute( 'Proposal', 'editingnewreason', (this.editingNewReason == EDIT ? TRUE : null) );
        this.setAttribute( 'NewReasonInput', 'aria-expanded', (this.editingNewReason == EDIT ? TRUE : FALSE) );
        this.setAttribute( 'Proposal', 'firstproposal', this.proposal.firstProposal );
        this.setAttribute( 'Proposal', 'hasfirstreason', this.proposal.firstProposalWithReasons );
        this.setAttribute( 'Proposal', 'use1column', (this.use1Column ? TRUE : FALSE) );
        this.setAttribute( 'Proposal', 'frozen', (this.isFrozen() ? TRUE : null) );
        this.setAttribute( 'Proposal', 'fromRequest', (this.proposal.fromRequest ? TRUE : FALSE) );
        this.setAttribute( 'Proposal', 'singleProposal', (this.proposal.singleProposal ? TRUE : null) );
        this.setAttribute( 'Proposal', 'mine', (this.proposal.mine ? TRUE : null) );
        this.setAttribute( 'Proposal', 'mysurvey', (this.proposal.mySurvey ? TRUE : null) );
        this.setAttribute( 'Proposal', 'hidereasons', (this.proposal.hideReasons ? TRUE : FALSE) );
        let hasVoteCount = (this.proposal.numPros != undefined)  ||  (this.proposal.numCons != undefined);
        this.setAttribute( 'Proposal', 'votecounts', (hasVoteCount ? TRUE : null ) );
        this.setInnerHtml( 'expandButton', (this.proposal.hideReasons ? 'More proposal details' : 'More reasons') );

        // Show freeze-message in freeze button
        // Freeze-message text display (next to button) may be better for accessibility and maintainability
        this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeUserInputMessage') );
        this.getSubElement('freezeUserInputCheckbox').checked = ( this.proposal.freezeUserInput == true );

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

        displayAdminHistory( this.proposal.adminHistory, this.getSubElement('adminHistoryLast'), this.getSubElement('adminHistoryFull') );

        // Display vote-counts
        this.setInnerHtml( 'ProposalVotePro', this.proposal.numPros );
        this.setInnerHtml( 'ProposalVoteCon', this.proposal.numCons );

        // Either display suggested-reasons or top-reasons
        let hasMatches =  this.suggestions  &&  ( 0 < this.suggestions.length );
        this.reasonsToShow =  hasMatches ?  this.suggestions  :  this.proposal.reasons;

        // Mark first reason
        let pros = this.reasonsToShow.filter( r => (r.proOrCon == PRO) );
        let firstReason = ( pros.length > 0 )?  pros[0]  :  this.reasonsToShow[0];
        this.reasonsToShow.map(  r => ( r.isFirstReason = (r == firstReason)? TRUE : FALSE )  );

        // For each reason data...
        for ( let r = 0;  r < this.reasonsToShow.length;  ++r ) { 
            let reason = this.reasonsToShow[ r ];
            // Try to find reason in existing reason displays.
            let reasonDisp = this.reasonIdToDisp[ reason.id ];
            // If reason display exists... update reason display... else... create reason display.
            if ( reasonDisp ){
                reasonDisp.setAllData( reason, this.topDisp, this );
            }
            else {
                this.addReasonDisp( reason );
                columnsChanged = true;
            }
        }

        this.setAttribute( 'reasons', 'hasmatches', (hasMatches ? TRUE : null) );
        if ( ! hasMatches ){  this.highlightReasonMatches( null );  }

        // If reason matches changed... re-sort reasons
        // Keep reasons before input, for mobile.  Put best match closest to new-reason input, sorting matches by match-score ascending.
        // Only re-sort reasons if necessary.  dataUpdated() may run many times between ordering by vote-score vs by match-score.
        if ( hasMatches ){  this.sortReasonsByMatchScore();  columnsChanged = true;  }
        else if ( this.hadMatches || redisplayReasons ) {  this.sortReasonsByVoteScore();  columnsChanged = true;  }
        this.hadMatches = hasMatches;

        // Rearrange reason displays in columns.
        if ( columnsChanged ){
            let reasonsProDiv = this.getSubElement('ReasonsPro');
            let reasonsConDiv = this.getSubElement('ReasonsCon');
            if ( use1Column ) {
                // interleave pros/cons in single column
                for ( let r = 0;  r < Math.max( this.proDisplays.length, this.conDisplays.length );  ++r ){
                    if ( r < this.proDisplays.length ){  reasonsProDiv.appendChild( this.proDisplays[r].element );  }
                    if ( r < this.conDisplays.length ){  reasonsProDiv.appendChild( this.conDisplays[r].element );  }
                }
            }
            else {
                // separate columns for pros/cons
                for ( let r = 0;  r < this.proDisplays.length;  ++r ){
                    reasonsProDiv.appendChild( this.proDisplays[r].element );
                }
                for ( let r = 0;  r < this.conDisplays.length;  ++r ){
                    reasonsConDiv.appendChild( this.conDisplays[r].element );
                }
            }
        }

        // Only if single-proposal page... update field highlights  (dont want every proposal updating request highlights)
        if ( this.proposal.singleProposal ){
            this.colorNextInput();
        }
        
        // Set collapse properties
        this.setAttribute( 'Proposal', 'collapse', this.collapse );

        translateScreen( this.getSubElement('Proposal') );
    };


        ProposalDisplay.prototype.
    clickProposalContent = function( e ){
        e.stopPropagation();
        app.startEdit = true;
        this.handleExpandSeparatePage();
    };


        ProposalDisplay.prototype.
    onClickBack = function( e ){
        e.preventDefault();
        setFragmentFields( {page:FRAG_PAGE_ID_REQUEST, proposal:null} );
    };

        ProposalDisplay.prototype.
    onKeyUpBack = enterToClick;


        ProposalDisplay.prototype.
    editable = function(){  return this.proposal.allowEdit && !this.topDisp.isFrozen();  };

        ProposalDisplay.prototype.
    areReasonsHidden = function(){  return this.proposal.hideReasons;  };

        ProposalDisplay.prototype.
    isFrozen = function(){
        // How can we know that proposal-from-request is frozen, when request-display is not present?
        // Need to retrieve frozen-flag with proposal?
        return ( this.proposal.fromRequest )?  (reqPropData && reqPropData.request && reqPropData.request.freezeUserInput)  :  this.proposal.freezeUserInput;
    };

        ProposalDisplay.prototype.
    clickFreezeUserInput = function( ){

        if ( this.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        // Save via ajax
        let checkbox = this.getSubElement('freezeUserInputCheckbox');
        let freeze =  checkbox.checked;
        this.freezeMessage = {  color:GREY , text:(freeze ? 'Freezing' : 'Unfreezing')  };
        this.dataUpdated();
        let sendData = {  crumb:crumb , fingerprint:fingerprint , linkKey:this.linkKey.id , proposalId:this.proposal.id , freezeUserInput:freeze  };
        let url = 'freezeProposal';
        let thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this, function(error, status, receiveData){
            if ( !error  &&  receiveData &&  receiveData.success ){
                updateProposal( thisCopy.proposal, receiveData.proposal );
                let freezeLabel = thisCopy.proposal.freezeUserInput ? 'Frozen' : 'Unfrozen';
                thisCopy.freezeMessage = { color:GREEN , text:freezeLabel , ms:5000 };
            }
            else {
                let message = 'Failed to ' + (freeze ? 'freeze' : 'unfreeze');
                if ( !error && receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot un/freeze proposal created by someone else.';  }
                }
                thisCopy.freezeMessage = { color:RED , text:message , ms:5000 };
            }
            thisCopy.dataUpdated();
        } );
    };


        ProposalDisplay.prototype.
    sortReasonsByVoteScore = function( ){
        // Give priority to new reasons, just added in the current display
        this.proDisplays.sort(  (a,b) => compareInOrder( [(a.isMyNewReason? 1 : 0), (b.isMyNewReason? 1 : 0)] , [a.data.score, b.data.score] )  );
        this.conDisplays.sort(  (a,b) => compareInOrder( [(a.isMyNewReason? 1 : 0), (b.isMyNewReason? 1 : 0)] , [a.data.score, b.data.score] )  );
    };

        ProposalDisplay.prototype.
    sortReasonsByMatchScore = function( ){
        this.proDisplays.sort(  (a,b) => compareInOrder( [(a.isMyNewReason? 1 : 0), (b.isMyNewReason? 1 : 0)] , [a.data.matchScore, b.data.matchScore] )  );
        this.conDisplays.sort(  (a,b) => compareInOrder( [(a.isMyNewReason? 1 : 0), (b.isMyNewReason? 1 : 0)] , [a.data.matchScore, b.data.matchScore] )  );
    };

    // Inputs series[ pair(a,b) , pair(a,b) ... ], and outputs { negative if a sorts first, zero if equal, positive if b sorts first }
        function
    compareInOrder( ){
        for ( let p = 0;  p < arguments.length;  ++p ){
            let pair = arguments[ p ];
            let valueA = defaultTo( pair[0], 0 );
            let valueB = defaultTo( pair[1], 0 );
            if ( valueA != valueB ){  return valueB - valueA;  }
        }
        return 0;
    }


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
    };

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
    refreshCollapse = function( ){
        // Recollapse because of new reasons
        if ( this.collapse == TRUE ){  this.handleCollapse();  }
    };

        ProposalDisplay.prototype.
    expandForEditingTitle = function( ){
        this.maxPropHeight = null;
        this.collapse = 'edit-title';
        this.dataUpdated();
    };

        ProposalDisplay.prototype.
    scrollToProposal = function( ){  scrollToHtmlElement( this.element, 200 );  };

        ProposalDisplay.prototype.
    handleEditProposalSave = function( ){

        if ( this.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        let titleInput = this.titleAndDetailDisp.getSubElement('TitleInput');
        let detailInput = this.titleAndDetailDisp.getSubElement('DetailInput');

        // save via ajax
        this.titleAndDetailDisp.setMessageAndUpdate( 'Saving changes...', null, null );
        let sendData = { crumb:crumb , fingerprint:fingerprint ,
            proposalId:this.proposal.id , linkKey:this.linkKey.id , 
            title:titleInput.value , detail:detailInput.value };
        let url = 'editProposal';
        let thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this.topDisp, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
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
            else if ( receiveData  &&  receiveData.message == DUPLICATE ){
                thisCopy.titleAndDetailDisp.setMessageAndUpdate( 'Identical proposal already exists', false, 10000 );
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

        // Check that new-reason is non-empty
        let reasonInput = this.getSubElement('NewReasonInput');
        let errorMessage = null;
        if ( ! reasonInput.value ){
            errorMessage = '';
        }
        // Check new-reason length
        else if ( reasonInput.value.length < minLengthReason ){
            errorMessage = 'Reason is too short';
        }
        // Check that new-reason matches pro/con button
        else if ( (proOrCon == CON)  &&  reasonInput.value.match( /^\s*I\s+agree\b/ ) ){
            errorMessage = 'The reason says "I agree" -- did you mean to click the "disagree" button?';
        }
        else if ( (proOrCon == PRO)  &&  reasonInput.value.match( /^\s*I\s+disagree\b/ ) ){
            errorMessage = 'The reason says "I disagree" -- did you mean to click the "agree" button?';
        }
        // Display error message
        if ( errorMessage != null ){
            this.newReasonValidity = errorMessage;
            this.newReasonMessage = {  color:RED , text:errorMessage  };
            this.dataUpdated();
            return;
        }

        // Save via ajax
        let proposalData = this.proposal;
        this.newReasonMessage = { color:GREY, text:'Saving changes...' };
        this.newReasonValidity = '';
        this.dataUpdated();
        let sendData = {
            crumb:crumb , fingerprint:fingerprint ,
            linkKey:this.linkKey.id ,
            proposalId:proposalData.id , proOrCon:proOrCon , reasonContent:reasonInput.value
        };
        let url = 'newReason';
        let thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this.topDisp, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.newReasonMessage = { color:GREEN, text:'' };  // Do not show saved-message here, but rather by the new reason
                // Update data
                let newReason = receiveData.reason;
                if ( ! newReason.voteCount ) {  newReason.voteCount = 0;  }
                proposalData.reasons.push( newReason );
                if ( thisCopy.allReasons ){
                    thisCopy.allReasons.push( newReason );
                }
                // clear form, stop editing
                reasonInput.value = '';
                this.suggestions = [ ];
                thisCopy.editingNewReason = FALSE;
                thisCopy.onInput();  // Clear keyword match highlights
                thisCopy.dataUpdated();
                // Flag newly added reasons, but only store flag in display, so flag expires when page changes
                // This only works for proposal-page, not when request-page jumps to proposal-page
                let newReasonDisplay = thisCopy.reasonIdToDisp[ newReason.id ];
                if ( newReasonDisplay ){  newReasonDisplay.isMyNewReason = true;  }
                thisCopy.dataUpdated( true ); // redisplayReasons=true
                if ( thisCopy.isProposalInRequest() ){
                    app.scrollToReasonId = newReason.id;
                    thisCopy.handleExpandSeparatePage();
                }
                else {
                    thisCopy.scrollToReasonId( newReason.id );
                }
            }
            else {
                let message = null;
                let millisec = null;
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Reason is too short';  }
                    else if ( receiveData.message == REASON_TOO_SHORT ){  message = 'Reason is too short';  }
                    else if ( receiveData.message == DUPLICATE ){  message = 'Identical reason already exists';  }
                }

                if ( message ){  thisCopy.newReasonValidity = message;  millisec = 10000;  }
                else {  message = 'Error saving';  }

                thisCopy.newReasonMessage = { color:RED, text:message, ms:millisec };  
                thisCopy.dataUpdated();
            }
        } );
    };

    // Scroll to new reason, so that reason-creator votes for their own reason, and considers existing reasons
        ProposalDisplay.prototype.
    scrollToReasonId = function( reasonId ){
        let reasonDisplay = this.reasonDisplays.find( (r) => (r.data  &&  r.data.id == reasonId) );
        if ( reasonDisplay && reasonDisplay.element ){
            scrollToHtmlElement( reasonDisplay.element, 100 );
            reasonDisplay.message = { color:GREEN, text:'Saved reason. Now vote for the best reason.', ms:3000 };
            reasonDisplay.dataUpdated();
        }
    };

        ProposalDisplay.prototype.
    isProposalInRequest = function( ){
        return ( this.proposal.fromRequest  &&  ! this.proposal.singleProposal );
    };


        ProposalDisplay.prototype.
    onInput = function( event ){
        // Remove new-reason length-error
        let reasonInput = this.getSubElement('NewReasonInput');
        if ( minLengthReason <= reasonInput.value.length ){
            this.newReasonValidity = '';
            this.newReasonMessage = {  text:''  };
            this.dataUpdated();
        }

        // If no user-input... hide suggested-proposals, show top-proposals
        if ( ! reasonInput.value.trim() ){  this.suggestions = [ ];  this.dataUpdated();  }

        // Suggest proposal only for first N words, and only if just finished a word
        let words = removeStopWords( tokenize( reasonInput.value ) ).slice( 0, MAX_WORDS_INDEXED );
        if ( !words  ||  words.length < 1  ||  MAX_WORDS_INDEXED < words.length ){  return;  }
        if ( !event  ||  !event.data  ||  ! event.data.match( /[\s\p{P}]/u ) ){  return;  }  // Require that current input is whitespace or punctuation

        // Suggest only if input is changed since last suggestion
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;   }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve top matching titles 
        this.retrieveReasonSuggestions( words, contentStart );
    };


        ProposalDisplay.prototype.
    retrieveReasonSuggestions = function( words, contentStart ){
        // Request via ajax
        let thisCopy = this;
        let sendData = { content:contentStart };
        let url = '/suggestReasons/' + this.linkKey.id;
        if ( this.proposal.fromRequest ){  url += '/' + this.proposal.id;  }
        ajaxPost( sendData, url, function(error, status, receiveData){

            if ( !error  &&  receiveData  &&  receiveData.success ){
                // Update reason suggestions
                let suggestionsChanged = false;
                if ( receiveData.reasons ){

                    // Collect new suggestion & increment stats 
                    if ( ! thisCopy.suggestionToData ){  thisCopy.suggestionToData = { };  }  // { suggestionText:{ matchScore:? , totalScore:? , ... } }
                    for ( let s = 0;  s < receiveData.reasons.length;  ++s ){
                        let suggestionNew = receiveData.reasons[ s ];
                        if ( ! suggestionNew.content ){  continue;  }
                        if ( !(suggestionNew.content in thisCopy.suggestionToData) ){
                            thisCopy.topDisp.incrementWordCounts( suggestionNew.content );
                        }
                        thisCopy.suggestionToData[ suggestionNew.content ] = suggestionNew;
                    }
                    // Find top-scored suggestions
                    thisCopy.scoreMatches( contentStart );
                    let topSuggestions = Object.values( thisCopy.suggestionToData ).filter( s => (0 < s.scoreMatch) )
                        .sort( (a,b) => (b.scoreTotal - a.scoreTotal) ).slice( 0, 3 );

                    // Check whether top-suggestions changed: old-suggestion not found in new-suggestions
                    suggestionsChanged = ( thisCopy.suggestions == null ) ^ ( topSuggestions == null );
                    if ( thisCopy.suggestions  &&  topSuggestions ){
                        suggestionsChanged |= ( thisCopy.suggestions.length != topSuggestions.length );
                        thisCopy.suggestions.map(  suggestionOld  =>  ( 
                            suggestionsChanged |=  ! topSuggestions.find( suggestionNew => (suggestionNew.content == suggestionOld.content) )  )   );
                    }
                    thisCopy.suggestions = topSuggestions;
                }

                // Alert screen-reader user that suggestions updated
                let hasMatches =  thisCopy.suggestions  &&  ( 0 < thisCopy.suggestions.length );
                if ( suggestionsChanged  &&  hasMatches ){
                    thisCopy.newReasonMessage = { text:'' + thisCopy.suggestions.length + ' matches' , color:GREY , ms:5000 };
                }
                // Update which reasons are displayed
                thisCopy.dataUpdated();
                // Highlight matches in displayed reasons
                let highlightWords = ( hasMatches )?  contentStart  :  null;
                thisCopy.highlightReasonMatches( highlightWords );
                thisCopy.dataUpdated();
            }
        } );
    };


        ProposalDisplay.prototype.
    scoreMatches = function( contentStart ){
        // Update suggestion-scores, with new IDF-weights and new user-input
        for ( const suggestion in this.suggestionToData ){
            let suggestionData = this.suggestionToData[ suggestion ];
            suggestionData.scoreMatch = this.topDisp.wordMatchScore( contentStart, suggestion );
            suggestionData.scoreTotal =  suggestionData.score * suggestionData.scoreMatch;  // Vote-score * match-score
        }
    };

        ProposalDisplay.prototype.
    incrementWordCounts = function( suggestion ){  
        if ( ! this.wordToCount ){  this.wordToCount = { };  }
        return incrementWordCounts( suggestion, this.wordToCount );
    };

        ProposalDisplay.prototype.
    wordMatchScore = function( input, suggestion ){
        if ( ! this.wordToCount ){  return 0;  }
        return wordMatchScore( input, suggestion, this.wordToCount );
    };


    // Interface function for top-level proposal and request displays
        ProposalDisplay.prototype.
    topInputHandler = function( ){
        this.colorNextInput();
    };
    

        ProposalDisplay.prototype.
    highlightReasonMatches = function( highlightWords ){
        // For each reason-display... de/highlight new-reason keyword matches
        for ( let r = 0;  r < this.reasonDisplays.length;  ++r ){
            let reasonDisp = this.reasonDisplays[r];
            reasonDisp.highlightWords = highlightWords;
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
        // Do not update, because re-ordering is confusing, and updating votes/counts is not important in a single browser-login
    };

        ProposalDisplay.prototype.
    retrieveData = function( onlyTopReasons=false ){
        let nextPage = false;
        retrieveProposalReasons( this, onlyTopReasons, nextPage );
    };

        ProposalDisplay.prototype.
    retrieveMoreReasons = function( ){
        this.moreReasonsMessage = { color:GREY, text:'Loading reasons...' };
        this.dataUpdated();

        let onlyTopReasons = false;
        let nextPage = true;
        retrieveProposalReasons( this, onlyTopReasons, nextPage );
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
        ElementWrap.call( this );  // Inherit member data
        this.messageColor = GREY;
        this.create( requestId );
    }
    RequestForProposalsDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

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
            '   <h1 class=title role=status translate=true> Request For Proposals </h1>' ,
            '   <div class="Message RequestMessage" id=RequestMessage aria-live=polite></div>' ,
            '   <div class=loginStatus id=loginStatus translate=true></div>',
            '   <div class=hideReasonsStatus id=hideReasonsStatus translate=true></div>' ,
            '   <div class=doneLink><div class=doneLinkLabel> Done link: </div><a id=doneLinkUrl></a></div> ',
            '   <div id=freezeUserInput class=freezeUserInput> ',
            '       <label for=freezeUserInputCheckbox oninput=clickFreezeUserInput translate=true> Block all input </label> ',
            '       <input id=freezeUserInputCheckbox type=checkbox oninput=clickFreezeUserInput /> ',
            '       <div id=freezeUserInputMessage class=Message></div> ',
            '   </div> ',
            '   <div id=freezeNewProposals class=freezeNewProposals> ',
            '       <label for=freezeNewProposalsCheckbox oninput=clickFreezeNewProposals translate=true> Block new proposals </label> ',
            '       <input id=freezeNewProposalsCheckbox type=checkbox oninput=clickFreezeNewProposals /> ',
            '       <div id=freezeProposalsMessage class=Message></div> ',
            '   </div> ',
            // Request
            '    <div class=Request id=Request subdisplay=titleAndDetailDisp></div>',
            //   New/find proposal form.  Do not use TitleAndDetailDisplay because need customizations like initial reasons.
            '    <div class=NewProposalForm id=NewProposalForm>',
            '        <div class=NewProposalSectionTitle translate=true> Find or Add Proposal </div>',
            //       Insert a few new-proposal match summary snippets before new-proposal input, because
            //       filtered proposals are too distant from new-proposal input (because of reasons).
            '        <div id=matches class="Matches matches" aria-live=polite></div>',
            '        <div class=Message id=matchesMessage></div>',
            '        <label class=NewProposalTitleLabel for=NewProposalTitle translate=true>Title</label>',
            '        <div class=Title>',
            '            <input class=TitleInput id=NewProposalTitle',
            '                onclick=startEditingNewProposal onblur=handleEditBlur oninput=onInput onkeyup=onNewProposalKey',
            '                placeholder="I suggest..." aria-required=true />',
            '        </div>',
            '        <label class=NewProposalDetailLabel for=NewProposalDetail translate=true>Detail</label>',
            //      Use focus-handler, because screen-reader cannot focus this textarea with click-handler
            //      Attaching click-handler to parent-div also works
            '        <div class=Detail>',
            '            <textarea class=DetailInput id=NewProposalDetail',
            '               onfocus=startEditingNewProposal onblur=handleEditBlur oninput=onInput' ,
            '                placeholder="More details of my suggestion..." aria-required=true ></textarea>',
            '        </div>',
            '        <label class=NewProposalReasonLabel for=NewProposalInitialReasonInput1 translate=true> Supporting Reasons </label>',
            '        <div class=NewProposalInitialReasons>',
            '            <div class=NewProposalInitialReasonDiv>',
            '                <textarea class=NewProposalInitialReasonInput id=NewProposalInitialReasonInput1',
            '                   onfocus=startEditingNewProposal onblur=handleEditBlur oninput=onInput' ,
            '                    placeholder="Because..."></textarea>',
            '            </div>',
            '            <div class=NewProposalInitialReasonDiv>',
            '                <textarea class=NewProposalInitialReasonInput id=NewProposalInitialReasonInput2',
            '                   onfocus=startEditingNewProposal onblur=handleEditBlur oninput=onInput' ,
            '                    placeholder="More reasons to agree... (optional)"></textarea>',
            '            </div>',
            '            <div class=NewProposalInitialReasonDiv>',
            '                <textarea class=NewProposalInitialReasonInput id=NewProposalInitialReasonInput3',
            '                   onfocus=startEditingNewProposal onblur=handleEditBlur oninput=onInput' ,
            '                    placeholder="More reasons to agree... (optional)"></textarea>',
            '            </div>',
            '        </div>',
            '        <div class=TitleAndDetailEditButtons>',
            '            <button type=button class=TitleAndDetailSaveButton onclick=handleSaveNewProposal translate=true> Save </button>',
            '        </div>',
            '        <div class="Message TitleAndDetailMessage" id=newProposalMessage aria-live=polite></div>' ,
            '    </div>',
            // Proposals
            '    <div class=Proposals id=Proposals></div>',
            '    <div class=MoreProposalsWrap>',
            '        <button id=MoreProposals onclick=clickMoreProposals aria-live=polite translate=true> More proposals </button>',
            '    </div>',
            '   <a id=doneLinkForParticipants class=doneLinkForParticipants><div> This step is done. Go to next step... </div></a> ',
            // Admin change history
            '   <details class=adminHistory id=adminHistory> ',
            '       <summary class=adminHistoryLast id=adminHistoryLast></summary> ',
            '       <div class=adminHistoryFull id=adminHistoryFull></div> ',
            '   </details> ',
            '</div>'
        ].join('\n') );
    };


        RequestForProposalsDisplay.prototype.
    setAllData = function( reqPropData ){
        // Set proposals data. No need to create/update proposal display here, because dataUpdated() will do it.
        this.reqPropData = reqPropData;

        // Set title and detail.
        let thisCopy = this;
        let titleAndDetailData = {
            title: reqPropData.request.title,
            detail: reqPropData.request.detail,
            minLength: minLengthRequest,
            minLengthMessage: 'Request is too short',
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
    dataUpdated = function( retrieveReasons=false, addProposalFirst=false ){
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
        
        // Show request-message
        this.message = showMessageStruct( this.message, this.getSubElement('RequestMessage') );
        this.newProposalMessage = showMessageStruct( this.newProposalMessage, this.getSubElement('newProposalMessage') );
        this.moreProposalsMessage = showMessageStruct( this.moreProposalsMessage, this.getSubElement('MoreProposals') );
        this.matchesMessage = showMessageStruct( this.matchesMessage, this.getSubElement('matchesMessage') );
        this.getSubElement('NewProposalTitle').setCustomValidity( defaultTo(this.newProposalValidity, '') );
        this.getSubElement('NewProposalDetail').setCustomValidity( defaultTo(this.newProposalValidity, '') );
        let newProposalInitialReasonInput1 = this.getSubElement('NewProposalInitialReasonInput1');
        let newProposalInitialReasonInput2 = this.getSubElement('NewProposalInitialReasonInput2');
        let newProposalInitialReasonInput3 = this.getSubElement('NewProposalInitialReasonInput3');
        this.newProposalValidity = defaultTo( this.newProposalValidity, '' );
        newProposalInitialReasonInput1.setCustomValidity( newProposalInitialReasonInput1.value ? this.newProposalValidity : '' );
        newProposalInitialReasonInput2.setCustomValidity( newProposalInitialReasonInput2.value ? this.newProposalValidity : '' );
        newProposalInitialReasonInput3.setCustomValidity( newProposalInitialReasonInput3.value ? this.newProposalValidity : '' );

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
        this.setAttribute( 'RequestForProposals', 'freezenewproposals', (this.reqPropData.request.freezeNewProposals ? TRUE : null) );
        this.setAttribute( 'RequestForProposals', 'mine', (this.reqPropData.request.mine ? TRUE : null) );
        this.setAttribute( 'RequestForProposals', 'mysurvey', (this.reqPropData.request.mine ? TRUE : null) );
        this.setAttribute( 'RequestForProposals', 'hidereasons', (this.reqPropData.request.hideReasons ? TRUE : null) );
        this.setAttribute( 'RequestForProposals', 'hasdonelink', (this.reqPropData.request.doneLink ? TRUE : null) );
        this.setAttribute( 'RequestForProposals', 'done', (this.isSurveyDone() ? TRUE : null) );

        // Show freeze-message
        this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeUserInputMessage') );
        this.getSubElement('freezeUserInputCheckbox').checked = ( this.reqPropData.request.freezeUserInput == true );

        this.freezeProposalsMessage = showMessageStruct( this.freezeProposalsMessage, this.getSubElement('freezeProposalsMessage') );
        this.getSubElement('freezeNewProposalsCheckbox').checked = ( this.reqPropData.request.freezeNewProposals == true );

        this.setInnerHtml( 'hideReasonsStatus', (this.reqPropData.request.hideReasons ? 'Reasons hidden' : null) );
        this.getSubElement('doneLinkUrl').href = this.reqPropData.request.doneLink;
        this.setInnerHtml( 'doneLinkUrl', this.reqPropData.request.doneLink );
        this.getSubElement('doneLinkForParticipants').href = this.reqPropData.request.doneLink;

        displayAdminHistory( this.reqPropData.request.adminHistory, this.getSubElement('adminHistoryLast'), this.getSubElement('adminHistoryFull') );

        // Populate new-proposal inputs, if returning from single-proposal-page
        this.ensureNewProposalStructExists();
        this.setProperty( 'NewProposalTitle', 'defaultValue', this.reqPropData.newProposalInput.title );
        this.setProperty( 'NewProposalDetail', 'defaultValue', this.reqPropData.newProposalInput.detail );
        this.setProperty( 'NewProposalInitialReasonInput1', 'defaultValue', this.reqPropData.newProposalInput.reason1 );
        this.setProperty( 'NewProposalInitialReasonInput2', 'defaultValue', this.reqPropData.newProposalInput.reason2 );
        this.setProperty( 'NewProposalInitialReasonInput3', 'defaultValue', this.reqPropData.newProposalInput.reason3 );

        // For each proposal data...
        let proposals = this.reqPropData.proposals;
        for ( let p = 0;  p < proposals.length;  ++p ) { 
            // Try to find proposal in existing proposal displays.
            let proposalData = proposals[p];
            // If proposal display exists... update its data... otherwise create proposal display.
            let proposalDisp = this.proposalIdToDisp[ proposalData.id ];
            if ( proposalDisp ){
                proposalDisp.setAllData( proposalData, this.reqPropData.reasons, this, this.reqPropData.linkKey );
            }
            else {
                this.addProposalDisplay( proposalData, addProposalFirst );
            }
        }

        if ( retrieveReasons ){  this.loadNewProposalReasons();  }

        // For each proposal sub-display...
        let foundReason = false;
        for ( let p = 0;  p < this.proposalDisplays.length;  ++p ){
            let proposalDisp = this.proposalDisplays[p];
            let proposalData = proposalDisp.proposal;
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
        // Create displays for suggested-proposals only when suggestion is clicked, to avoid disorienting insertion of unused suggestions
        let hasMatches =  this.suggestions  &&  ( 0 < this.suggestions.length );
        let matchesDiv = this.getSubElement('matches');
        clearChildren( matchesDiv );
        if ( this.suggestions  &&  (0 < this.suggestions.length) ){
            let suggestions = this.suggestions.sort( (a, b) => a.scoreTotal - b.scoreTotal );
            let thisCopy = this;
            for ( let s = 0;  s < suggestions.length;  ++s ){
                let suggestion = suggestions[s];
                let suggestionText = [ suggestion.title, suggestion.detail ].filter(Boolean).join(' ');
                let matchDiv = html('div').class('match').build();
                displayHighlightedContent( suggestionText.substring(0,200)+'...' , this.highlightWords , matchDiv );
                matchDiv.onclick = function(){
                    // Ensure suggested-proposal is in proposal-data-collection
                    let proposalDataExisting = thisCopy.reqPropData.proposals.find( p => (p.id == suggestion.id) );
                    if ( ! proposalDataExisting ){  thisCopy.reqPropData.proposals.push( suggestion );  }
                    // Ensure suggested-proposal is in proposal-displays
                    let proposalDisplay = thisCopy.proposalIdToDisp[ suggestion.id ];
                    if ( ! proposalDisplay ){
                        proposalDisplay = thisCopy.addProposalDisplay( suggestion );
                    }
                    // Scroll to proposal
                    proposalDisplay.scrollToProposal();
                };
                matchesDiv.appendChild( html('a').class('matchLink').children(matchDiv).build() );
            }
        }

        translateScreen( this.getSubElement('RequestForProposals') );

        this.colorNextInput();  // Update input field highlights.
    };

        RequestForProposalsDisplay.prototype.
    isSurveyDone = function( ){
        // Are there zero proposals without a vote?
        return  ! this.reqPropData.proposals.find( p => ! p.reasons.find(r => r.myVote) );
    };

        RequestForProposalsDisplay.prototype.
    editable = function(){  return this.reqPropData.request.allowEdit && !this.isFrozen();  }

        RequestForProposalsDisplay.prototype.
    areReasonsHidden = function(){  return this.reqPropData.request.hideReasons;  }

        RequestForProposalsDisplay.prototype.
    isFrozen = function(){  return this.reqPropData.request.freezeUserInput;  }


        RequestForProposalsDisplay.prototype.
    addProposalDisplay = function( proposalData, addProposalFirst=false ){  // returns ProposalDisplay
        // Create display
        proposalData.fromRequest = true;
        if ( proposalData.reasons == null ){  proposalData.reasons = [ ];  }
        proposalDisp = new ProposalDisplay( proposalData.id );
        proposalDisp.setAllData( proposalData, this.reqPropData.reasons, this, this.reqPropData.linkKey );
        // Collect and index display
        this.proposalDisplays.push( proposalDisp );
        this.proposalIdToDisp[ proposalData.id ] = proposalDisp;
        // Add display DOM element to layout
        // Insert user's newly-added reasons first
        let proposalsDiv = this.getSubElement('Proposals');
        if ( addProposalFirst ){
            proposalsDiv.prepend( proposalDisp.element );
        }
        else {
            proposalsDiv.appendChild( proposalDisp.element );
        }

        proposalDisp.handleCollapse();
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
    clickFreezeUserInput = function( ){

        if ( this.reqPropData.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        // Save via ajax
        let checkbox = this.getSubElement('freezeUserInputCheckbox');
        let freeze =  checkbox.checked;
        this.freezeMessage = { color:GREY, text:(freeze ? 'Freezing' : 'Unfreezing') };
        this.dataUpdated();
        let sendData = {  crumb:crumb , fingerprint:fingerprint , linkKey:this.reqPropData.linkKey.id , freezeUserInput:freeze  };
        let url = 'freezeRequest';
        let thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.reqPropData.request = receiveData.request;
                let message = thisCopy.reqPropData.request.freezeUserInput ? 'Frozen' : 'Unfrozen';
                thisCopy.freezeMessage = { color:GREEN , text:message , ms:5000 };
            }
            else {
                let message = 'Failed to ' + (freeze ? 'freeze' : 'unfreeze');
                if ( !error  &&  receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot un/freeze request created by someone else.';  }
                }
                thisCopy.freezeMessage = { color:RED , text:message , ms:5000 };
            }
            thisCopy.dataUpdated();
        } );
    };


        RequestForProposalsDisplay.prototype.
    clickFreezeNewProposals = function( ){

        if ( this.reqPropData.linkKey.loginRequired  &&  ! requireLogin() ){  return;  }

        // Save via ajax
        let checkbox = this.getSubElement('freezeNewProposalsCheckbox');
        let freeze =  checkbox.checked;
        this.freezeProposalsMessage = { color:GREY, text:(freeze ? 'Freezing' : 'Unfreezing') };
        this.dataUpdated();
        let sendData = { crumb:crumb , fingerprint:fingerprint , linkKey:this.reqPropData.linkKey.id , freezeNewProposals:freeze };
        let url = 'freezeNewProposals';
        let thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.reqPropData.request = receiveData.request;
                let message = thisCopy.reqPropData.request.freezeNewProposals ? 'Frozen' : 'Unfrozen';
                thisCopy.freezeProposalsMessage = { color:GREEN , text:message , ms:5000 };
            }
            else {
                let message = 'Failed to ' + (freeze ? 'freeze' : 'unfreeze');
                if ( !error  &&  receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot un/freeze request created by someone else.';  }
                }
                thisCopy.freezeProposalsMessage = { color:RED , text:message , ms:5000 };
            }
            thisCopy.dataUpdated();
        } );
    };


        RequestForProposalsDisplay.prototype.
    clickMoreProposals = function( ){
        if ( this.reqPropData.maxProposals ){  this.reqPropData.maxProposals += 5;  }
        this.moreProposalsMessage = { color:GREY, text:'Loading more proposals...' };
        this.dataUpdated();
        let getReasons = ! LOAD_INCREMENTAL;
        let nextPage = true;
        this.retrieveData( getReasons, nextPage );
    }

        RequestForProposalsDisplay.prototype.
    collapseNewProposals = function( focusedProposalId ){
        // Start collapsed, using approximate height
        this.collapseAllProposals( focusedProposalId );

        // Delay then re-collapse, to give reasons time to display and layout and adjust height
        let thisCopy = this;
        setTimeout( function(){
            thisCopy.collapseAllProposals( focusedProposalId );
        } , 1000 );
    };

        RequestForProposalsDisplay.prototype.
    collapseAllProposals = function( focusedProposalId ){
        for ( let p = 0;  p < this.proposalDisplays.length;  ++p ){
            this.proposalDisplays[p].handleCollapse();
        }
        let proposalToFocus = this.proposalIdToDisp[ focusedProposalId ];
        if ( proposalToFocus ){  proposalToFocus.scrollToProposal();  }
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

        let titleInput = this.getSubElement('NewProposalTitle');
        let detailInput = this.getSubElement('NewProposalDetail');
        let reasonInput1 = this.getSubElement('NewProposalInitialReasonInput1');
        let reasonInput2 = this.getSubElement('NewProposalInitialReasonInput2');
        let reasonInput3 = this.getSubElement('NewProposalInitialReasonInput3');

        // Check new-proposal length
        if ( titleInput.value.length + detailInput.value.length < minLengthProposal ){
            this.newProposalValidity = 'Proposal is too short';
            this.newProposalMessage = { color:RED, text:this.newProposalValidity };
            this.dataUpdated();
            return;
        }
        if ( (reasonInput1.value  &&  reasonInput1.value.length < minLengthReason)  &&
             (reasonInput2.value  &&  reasonInput2.value.length < minLengthReason)  &&
             (reasonInput3.value  &&  reasonInput3.value.length < minLengthReason)
        ){
            this.newProposalValidity = 'Supporting reason is too short';
            this.newProposalMessage = { color:RED, text:this.newProposalValidity };
            this.dataUpdated();
            return;
        }

        // save via ajax
        this.newProposalMessage = { color:GREY, text:'Saving proposal...' };
        this.newProposalValidity = '';
        this.dataUpdated();

        let sendData = {
            crumb: crumb , fingerprint:fingerprint ,
            requestId: this.reqPropData.linkKey.id ,
            title: titleInput.value ,
            detail: detailInput.value ,
            initialReason1: reasonInput1.value ? reasonInput1.value : null ,
            initialReason2: reasonInput2.value ? reasonInput2.value : null ,
            initialReason3: reasonInput3.value ? reasonInput3.value : null
        };
        let url = 'newProposalForRequest';
        let thisCopy = this;
        ajaxSendAndUpdate( sendData, url, this, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.newProposalMessage = { color:GREEN, text:'Saved proposal', ms:3000 };
                // Update data
                let newProposal = receiveData.proposal;
                newProposal.reasons = [];
                if ( receiveData.reasons ){
                    newProposal.reasons = receiveData.reasons;
                    for ( r in receiveData.reasons ){  thisCopy.reqPropData.reasons.push( receiveData.reasons[r] );  }
                }
                // Cause new proposal-display to be first
                thisCopy.reqPropData.proposals.push( newProposal );
                 // Proposal-displays are never re-ordered, so only need to cause the new proposal-display to insert first, once
                thisCopy.dataUpdated( false, true );  // retrieveReasons=false, addProposalFirst=true
                // Scroll to newly added proposal
                proposalDisp = thisCopy.proposalIdToDisp[ newProposal.id ];
                if ( proposalDisp ){  proposalDisp.scrollToProposal();  }
                let hint = ( thisCopy.areReasonsHidden() )?  'Now vote for or against proposals.'  :  'Now add a reason to agree with your proposal, and vote for the best reason.';
                proposalDisp.message = { color:GREEN, text:hint, ms:9000 }
                // clear form 
                titleInput.value = '';
                detailInput.value = '';
                reasonInput1.value = '';
                reasonInput2.value = '';
                reasonInput3.value = '';
                thisCopy.clearNewProposalStruct();
                thisCopy.onInput();
                // stop editing
                thisCopy.editingNewProposal = FALSE;
                thisCopy.dataUpdated();
            }
            else {
                let message = null;
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Proposal is too short.';  }
                    else if ( receiveData  &&  receiveData.message == REASON_TOO_SHORT ){  message = 'Supporting reason is too short.';  }
                    else if ( receiveData  &&  receiveData.message == DUPLICATE ){  message = 'Identical proposal exists';  }
                }

                if ( message ){  thisCopy.newProposalValidity = message;  }
                else {  message = 'Could not save proposal';  }

                thisCopy.newProposalMessage = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };


        RequestForProposalsDisplay.prototype.
    onNewProposalKey = function( event ){
        if ( event.key == KEY_NAME_ENTER ){  this.getSubElement('NewProposalDetail').focus();  }
    };

    // Interface function for top-level proposal and request displays
        RequestForProposalsDisplay.prototype.
    topInputHandler = function( ){
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
    onInput = function( ){
        // Remove too-short messages
        let titleInput = this.getSubElement('NewProposalTitle');
        let detailInput = this.getSubElement('NewProposalDetail');
        let reasonInput1 = this.getSubElement('NewProposalInitialReasonInput1');
        let reasonInput2 = this.getSubElement('NewProposalInitialReasonInput2');
        let reasonInput3 = this.getSubElement('NewProposalInitialReasonInput3');
        if ( (minLengthProposal <= titleInput.value.length + detailInput.value.length)  &&
             (! reasonInput1.value  ||  minLengthReason <= reasonInput1.value.length)  &&
             (! reasonInput2.value  ||  minLengthReason <= reasonInput2.value.length)  &&
             (! reasonInput3.value  ||  minLengthReason <= reasonInput3.value.length) 
        ){
            this.newProposalValidity = '';
            this.newProposalMessage = { text:'' };
            this.dataUpdated();  
        }

        // Copy new-reason input to restore after visiting single-proposal-page
        this.reqPropData.newProposalInput = { title:titleInput.value, detail:detailInput.value, reason1:reasonInput1.value, reason2:reasonInput2.value, reason3:reasonInput3.value };

        // If no user-input... hide suggested-proposals
        let rawInput = [ titleInput, detailInput, reasonInput1, reasonInput2, reasonInput3 ].map( i => i.value.trim() ).filter( Boolean ).join(' ');
        if ( ! rawInput ){  this.suggestions = [ ];  }
        this.highlightWords = rawInput;
        this.dataUpdated();

        // Suggest only if title+reason has at least 3 words, and just finished a word
        let words = removeStopWords( tokenize(rawInput) ).slice( 0, MAX_WORDS_INDEXED );
        if ( !words  ||  words.length < 1  ||  MAX_WORDS_INDEXED < words.length ){  return;  }
        if ( !event  ||  !event.data  ||  ! event.data.match( /[\s\p{P}]/u ) ){  return;  }  // Require that current input is whitespace or punctuation

        // Suggest only if input is changed since last suggestion
        let contentStart = words.join(' ');
        if ( contentStart == this.lastContentStartRetrieved ){  return;   }
        this.lastContentStartRetrieved = contentStart;

        // Retrieve top matching titles 
        this.retrieveProposalSuggestions( words, contentStart );
    };

        RequestForProposalsDisplay.prototype.
    clearNewProposalStruct = function( ){
        this.reqPropData.newProposalInput = null;
        this.ensureNewProposalStructExists();
    };

        RequestForProposalsDisplay.prototype.
    ensureNewProposalStructExists = function( ){
        if ( ! this.reqPropData.newProposalInput ){
            this.reqPropData.newProposalInput = { title:'', detail:'', reason1:'', reason2:'', reason3:'' };
        }
    };

        RequestForProposalsDisplay.prototype.
    retrieveProposalSuggestions = function( words, contentStart ){
        // Request via ajax
        if ( ! this.reqPropData  ||  ! this.reqPropData.linkKey  ||  ! this.reqPropData.linkKey.id ){  return;  }
        let thisCopy = this;
        let sendData = { content:contentStart };
        let url = '/suggestProposals/' + this.reqPropData.linkKey.id;
        ajaxPost( sendData, url, function(error, status, receiveData){

            if ( !error  &&  receiveData  &&  receiveData.success ){
                // Update proposal suggestions
                let suggestionsChanged = false;
                if ( receiveData.proposals ){
                    // Collect new suggestion & increment stats 
                    if ( ! thisCopy.suggestionToData ){  thisCopy.suggestionToData = { };  }  // { suggestionText:{ matchScore:? , totalScore:? , ... } }
                    for ( let s = 0;  s < receiveData.proposals.length;  ++s ){
                        let suggestionNew = receiveData.proposals[ s ];
                        suggestionNew.content = [ suggestionNew.title, suggestionNew.detail ].filter( Boolean ).join(' ');
                        if ( ! suggestionNew.content ){  continue;  }
                        if ( !(suggestionNew.content in thisCopy.suggestionToData) ){
                            thisCopy.incrementWordCounts( suggestionNew.content );
                        }
                        thisCopy.suggestionToData[ suggestionNew.content ] = suggestionNew;
                    }
                    // Find top-scored suggestions
                    thisCopy.scoreMatches( contentStart );
                    let topSuggestions = Object.values( thisCopy.suggestionToData )
                        .filter( s => (0 < s.scoreMatch) )
                        .sort( (a,b) => (b.scoreTotal - a.scoreTotal) )
                        .slice( 0, 3 );

                    // Check whether top-suggestions changed: old-suggestion not found in new-suggestions
                    suggestionsChanged = ( thisCopy.suggestions == null ) ^ ( topSuggestions == null );
                    if ( thisCopy.suggestions  &&  topSuggestions ){
                        suggestionsChanged |= ( thisCopy.suggestions.length != topSuggestions.length );
                        thisCopy.suggestions.map(  suggestionOld  =>  ( 
                            suggestionsChanged |=  ! topSuggestions.find( suggestionNew => (suggestionNew.content == suggestionOld.content) )  )   );
                    }
                    thisCopy.suggestions = topSuggestions;
                }

                // Alert screen-reader user that suggestions updated
                let hasMatches =  thisCopy.suggestions  &&  ( 0 < thisCopy.suggestions.length );
                if ( suggestionsChanged  &&  hasMatches ){
                    thisCopy.matchesMessage = { text:'' + thisCopy.suggestions.length + ' matches' , color:GREY , ms:5000 };
                }
                // Update which proposals are displayed
                thisCopy.dataUpdated();
                // Highlight matches in displayed proposals
                let highlightWords = ( hasMatches )?  contentStart  :  null;
                thisCopy.dataUpdated();
            }
        } );
    };


        RequestForProposalsDisplay.prototype.
    scoreMatches = function( contentStart ){
        // Update suggestion-scores, with new IDF-weights and new user-input
        for ( const suggestion in this.suggestionToData ){
            let suggestionData = this.suggestionToData[ suggestion ];
            suggestionData.scoreMatch = this.wordMatchScore( contentStart, suggestion );
            suggestionData.scoreTotal =  defaultTo(suggestionData.score, 0) * suggestionData.scoreMatch;  // Vote-score * match-score
        }
    };

        RequestForProposalsDisplay.prototype.
    incrementWordCounts = function( suggestion ){  
        if ( ! this.wordToCount ){  this.wordToCount = { };  }
        return incrementWordCounts( suggestion, this.wordToCount );
    };

        RequestForProposalsDisplay.prototype.
    wordMatchScore = function( input, suggestion ){
        if ( ! this.wordToCount ){  return 0;  }
        return wordMatchScore( input, suggestion, this.wordToCount );
    };


        RequestForProposalsDisplay.prototype.
    retrieveDataUpdate = function( ){
        // Do not update, because re-ordering is confusing, and updating votes/counts is not important in a single browser-login
    };

        RequestForProposalsDisplay.prototype.
    retrieveData = function( getReasons, nextPage ){
        retrieveRequestProposalsAndReasons( this, getReasons, nextPage );
    };



/////////////////////////////////////////////////////////////////////////////////
// Data retrieval

        function
    retrieveRequestProposalsAndReasons( reqPropDisp, getReasons=false, nextPage=false ){
        // getReasons:boolean

        console.log( 'retrieveRequestProposalsAndReasons() getReasons=', getReasons );

        // proposals:series[proposal] , modified
        // reasons:series[reason] , modified
        let reqPropData = reqPropDisp.reqPropData;
        let request = reqPropData.request;
        let proposals = reqPropData.proposals;
        let reasons = reqPropData.reasons;

        // request via ajax
        let sendData = { };
        let url = 'getRequestData/' + reqPropData.linkKey.id;
        let urlParams = [];
        if ( ! getReasons ){  urlParams.push( 'getReasons=false' );  }
        let cursor = reqPropData.cursor;
        if ( nextPage  &&  cursor ){  urlParams.push('cursor=' + cursor);  }
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
                        request.freezeNewProposals = data.request.freezeNewProposals;
                        request.adminHistory = data.request.adminHistory;
                        request.mine = data.request.mine;
                        request.hideReasons = data.request.hideReasons;
                        request.doneLink = data.request.doneLink;
                    }
                    // Update each proposal
                    let hasNewProposals = false;
                    if ( data.proposals ){
                        for ( let p = 0;  p < data.proposals.length;  ++p ){
                            let updatedProposal = data.proposals[p];
                            let existingProposal = proposals.find( function(e){ return e.id == updatedProposal.id; } );
                            if ( existingProposal ){
                                updateProposal( existingProposal, updatedProposal );
                            }
                            else {
                                updatedProposal.reasons = [];
                                proposals.push( updatedProposal );
                                hasNewProposals = true;
                            }
                        }
                    }
                    // Let user know that there are no new proposals
                    if ( ! hasNewProposals ){
                        reqPropDisp.moreProposalsMessage = { color:GREY, text:'No more proposals yet', ms:9000, textDefault:'More proposals' };
                    }
                    // update each reason
                    if ( data.reasons ){
                        updateReasons( proposals, reasons, data.reasons );
                    }
                    // Update display
                    reqPropData.cursor = data.cursor;
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
    retrieveProposalReasons( proposalDisp, onlyTopReasons=false, nextPage=false ){
        // reasons:series[reason] , modified
        let proposalData = proposalDisp.proposal;

        // request via ajax
        let sendData = { };
        let url = 'topReasons/' + proposalDisp.linkKey.id;
        if ( proposalData.fromRequest ){  url += '/' + proposalDisp.proposal.id;  }
        let urlParams = [ ]
        if ( onlyTopReasons ){  urlParams.push('preview');  }
        if ( nextPage ){
            if ( proposalDisp.cursorPro ){  urlParams.push('cursorPro=' + proposalDisp.cursorPro);  }
            if ( proposalDisp.cursorCon ){  urlParams.push('cursorCon=' + proposalDisp.cursorCon);  }
        }
        if ( 0 < urlParams.length ){  url += '?' + urlParams.join('&');  }

        ajaxGet( sendData, url, function(error, status, receiveData){
            console.log( 'ajaxGet() error=', error, '  status=', status, '  receiveData=', receiveData );
            proposalDisp.moreReasonsMessage = { color:BLACK, text:'More reasons' };
            if ( !error  &&  receiveData ){
                if ( receiveData.success ){
                    let hasNewReasons = false;
                    proposalData.linkOk = true;
                    if ( ! proposalData.linkKey ){  proposalData.linkKey = {};  }
                    if ( receiveData.linkKey ){  proposalData.linkKey.loginRequired = receiveData.linkKey.loginRequired;  }
                    // update proposal
                    if ( receiveData.proposal ){
                        updateProposal( proposalData, receiveData.proposal );
                    }
                    // update each reason
                    if ( receiveData.reasons ){
                        hasNewReasons = updateReasons( [proposalData], proposalDisp.allReasons, receiveData.reasons );
                        proposalDisp.dataUpdated();  // Add new reasons to proposal-display
                        proposalDisp.refreshCollapse();  // Resize proposal preview
                    }
                    proposalDisp.cursorPro = receiveData.cursorPro;
                    proposalDisp.cursorCon = receiveData.cursorCon;

                    // Let user know if no new reasons are available
                    if ( nextPage  &&  ! hasNewReasons ){
                        proposalDisp.moreReasonsMessage = { color:GREY, text:'No more reasons yet', ms:9000, textDefault:'More reasons' };
                    }

                    // Guide user to next action
                    if ( app.startEdit ){
                        // Start editing newly-added reason
                        app.startEdit = false;
                        proposalDisp.titleAndDetailDisp.handleEditTitleClick();
                    }
                    else if ( app.scrollToReasonId ){
                        // Flag new-reason
                        let newReasonDisplay = proposalDisp.reasonIdToDisp[ app.scrollToReasonId ];
                        if ( newReasonDisplay ){
                            newReasonDisplay.isMyNewReason = true;
                            newReasonDisplay.message = { color:GREEN, text:'Saved reason. Now vote for the best reason.', ms:5000 };
                        }
                        // Force reasons re-sort, with new-reason first
                        proposalDisp.dataUpdated( true );
                        // Scroll to new-reason
                        proposalDisp.scrollToReasonId( app.scrollToReasonId );
                        app.scrollToReasonId = null;
                    }
                }
                else if ( receiveData.message == BAD_LINK ){
                    proposalData.linkOk = false;
                }
            }
            proposalDisp.topDisp.dataUpdated();
        } );
    }

        function
    updateReasons( proposals, reasons, newReasons ){
        // Returns hasNewReasons:boolean
        let hasNewReasons = false;

        // For each new reason data... 
        for ( let r = 0;  r < newReasons.length;  ++r ){
            let updatedReason = newReasons[r];
            // Clean up new-reason fields
            if ( ! updatedReason.voteCount ){  updatedReason.voteCount = 0;  }
            if ( ! updatedReason.score ){  updatedReason.score = 0;  }

            // Merge new reason with existing reasons
            let existingReason = reasons.find( e => (e.id == updatedReason.id) );
            if ( existingReason ){
                // Update existing reason
                existingReason.content = updatedReason.content;
                existingReason.allowEdit = updatedReason.allowEdit;
                existingReason.myVote = updatedReason.myVote;
                existingReason.voteCount = updatedReason.voteCount;
                existingReason.score = updatedReason.score;
            }
            else {
                // Collect new reason
                reasons.push( updatedReason );
                hasNewReasons = true;
            }

            // Collect reason in existing proposal
            let existingProposal = proposals.find( e => (e.id == updatedReason.proposalId) );
            if ( existingProposal ) {
                // More efficient lookup if each proposal has a map[ reason id -> reason data ]
                // But map provides less stable ordering for display
                let existingReasonInProposal = existingProposal.reasons.find( e => (e.id == updatedReason.id) );
                if ( ! existingReasonInProposal ){  existingProposal.reasons.push( updatedReason );  }
            }
        }
        return hasNewReasons;
    }

        function
    updateProposal( existingProposal, updatedProposal ){
        existingProposal.title = updatedProposal.title;
        existingProposal.detail = updatedProposal.detail;
        existingProposal.allowEdit = updatedProposal.allowEdit;
        existingProposal.mine = updatedProposal.mine;
        existingProposal.mySurvey = updatedProposal.mySurvey;
        existingProposal.id = updatedProposal.id;  // Need linkKey to load proposal data.
        existingProposal.loginRequired = updatedProposal.loginRequired;
        existingProposal.freezeUserInput = updatedProposal.freezeUserInput;
        existingProposal.adminHistory = updatedProposal.adminHistory;
        existingProposal.hideReasons = updatedProposal.hideReasons;
        existingProposal.numPros = updatedProposal.numPros;
        existingProposal.numCons = updatedProposal.numCons;
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


        function
    displayAdminHistory( adminHistory, divAdminHistoryLast, divAdminHistoryFull ){
        if ( adminHistory ){
            // Last change
            let lastChange = adminHistory.reduce( (agg, c) => (agg['time'] < c['time'])? c : agg , {time:0} );
            let lastChangeText = ( lastChange && lastChange['time'] )?  toLocalDateTimeString(lastChange['time']) + ' &nbsp; ' + lastChange['text']  :  '';
            divAdminHistoryLast.innerHTML = '<span translate=true>Last admin change</span>: ' + lastChangeText;
            // All changes
            let changesDescending = adminHistory.sort( (a, b) => b['time'] - a['time'] );
            let changeDivs = changesDescending.map(  c  =>  html('div').class('change').innerHtml( toLocalDateTimeString(c['time']) + ' &nbsp; ' + c['text'] ).build()  );
            setChildren( divAdminHistoryFull, changeDivs );
        }
        else {
            divAdminHistoryLast.innerHTML = '';
            divAdminHistoryFull.innerHTML = '';
        }
    }

        function
    toLocalDateTimeString( timeSeconds ){
        return new Date( timeSeconds * 1000 ).toLocaleString();
    }

