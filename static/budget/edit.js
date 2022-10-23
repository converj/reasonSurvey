/////////////////////////////////////////////////////////////////////////////////
// Slice editing display

        function
    SliceEditDisplay( displayId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap
        this.messageColor = GREY;

        // Create html element, store it in this.element
        this.createFromHtml( displayId, '\n\n' + [
            '   <div class=Slice id=Slice>' ,
            '       <label for=SliceTitleInput> Budget Item </label>' ,
            '       <input class=SliceTitleInput id=SliceTitleInput placeholder="" ' ,
            '           onblur=handleEditTitleBlur oninput=handleEditInput onkeydown=handleTitleKey />' ,
            '       <label class=SliceReasonLabel for=SliceReasonInput> Reason </label>' ,
            '       <textarea class=SliceReasonInput id=SliceReasonInput placeholder="" ' ,
            '           onblur=handleEditReasonBlur oninput=handleEditInput onkeydown=handleReasonKey></textarea>' ,
            '       <button class=SliceDeleteButton title="delete" onmousedown=handleSliceDelete> X </button>' ,
            '       <div class=Message id=message aria-live=polite></div>' ,
            '   </div>'
        ].join('\n') );
    }
    SliceEditDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap

        SliceEditDisplay.prototype.
    setAllData = function( sliceData, topDisp, budgetDisplay ){
        this.slice = sliceData;
        this.topDisp = topDisp;
        this.budgetDisplay = budgetDisplay;
        this.dataUpdated();
    }

    // Update this.element
        SliceEditDisplay.prototype.
    dataUpdated = function( ){
        // Update messages
        this.message = showMessageStruct( this.message, this.getSubElement('message') );
        this.getSubElement('SliceTitleInput').setCustomValidity( this.sliceValidity ? this.sliceValidity : '' );
        this.getSubElement('SliceReasonInput').setCustomValidity( this.reasonValidity ? this.reasonValidity : '' );

        // Update content input
        this.getSubElement('SliceTitleInput').defaultValue = ( this.slice.title ?  this.slice.title  :  '' );  // defaultValue must be a string, not null
        this.getSubElement('SliceReasonInput').defaultValue = ( this.slice.reason ?  this.slice.reason  :  '' );

        let thisCopy = this;
        setTimeout(  function(){ thisCopy.fitSlice(); } , 100  );
    };


        SliceEditDisplay.prototype.
    setInputFocusAtEnd = function(  ){
        let titleInput = this.getSubElement('SliceTitleInput');
        let reasonInput = this.getSubElement('SliceReasonInput');
        let lastInput = ( reasonInput.value.length > 0 )?  reasonInput  :  titleInput;
        lastInput.focus();
        lastInput.selectionStart = lastInput.value.length;
        lastInput.selectionEnd = lastInput.value.length;
    };


        SliceEditDisplay.prototype.
    handleEditInput = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInput = this.getSubElement('SliceTitleInput');
        let reasonInput = this.getSubElement('SliceReasonInput');
        this.titleInputValue = titleInput.value;
        this.reasonInputValue = reasonInput.value;
        this.fitSlice();

        // Clear too-short message
        if ( (this.titleInputValue.length >= minLengthSliceTitle) && this.sliceValidity ){
            this.message = { text:'' };
            this.sliceValidity = '';
            this.dataUpdated();
        }
        if ( (this.reasonInputValue.length >= minLengthSliceReason) && this.reasonValidity ){
            this.message = { text:'' };
            this.reasonValidity = '';
            this.dataUpdated();
        }
    };

        SliceEditDisplay.prototype.
    handleTitleKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key on title: focus slice-reason input
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            this.getSubElement('SliceReasonInput').focus();
            return false;
        }
    };

        SliceEditDisplay.prototype.
    handleEditTitleBlur = function( event ){  this.handleEditSliceSave( event );  };

        SliceEditDisplay.prototype.
    handleReasonKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key: focus new-slice input, saves on blur
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            this.budgetDisplay.focusNewSliceInput();
            return false;
        }
    };

        SliceEditDisplay.prototype.
    fitSlice = function( ){  fitTextAreaToText( this.getSubElement('SliceReasonInput') );  };

        SliceEditDisplay.prototype.
    handleEditReasonBlur = function( event ){  this.handleEditSliceSave( event );  };

        SliceEditDisplay.prototype.
    handleEditSliceSave = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // If same slice exists elsewhere in the list... still save, because
        // need server-side slice standardization, to ensure records did not collide.

        let inputTitle = this.getSubElement('SliceTitleInput');
        let inputReason = this.getSubElement('SliceReasonInput');
        if ( inputTitle.value.length < minLengthSliceTitle ){
            this.message = { color:RED, text:'Budget-item title is too short' };
            this.sliceValidity = this.message.text;
            this.dataUpdated();
            return;
        }
        if ( ( ! this.topDisp.areReasonsHidden() )  &&  ( inputReason.value.length < minLengthSliceReason ) ){
            this.message = { color:RED, text:'Reason is too short' };
            this.reasonValidity = this.message.text;
            this.dataUpdated();
            return;
        }
        
        // If unchanged... skip saving
        if ( (inputTitle.value == this.slice.title) && (inputReason.value == this.slice.reason) ){  return;  }

        // Save slice title/reason, via ajax
        let thisCopy = this;
        this.message = { color:GREY, text:'Saving changes...' };
        this.sliceValidity = '';
        this.reasonValidity = '';
        this.dataUpdated();
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.topDisp.linkKey.id ,
            budgetId:this.budgetDisplay.budget.id , sliceId:this.slice.id ,
            title:inputTitle.value , reason:inputReason.value
        };
        let url = '/budget/sliceCreatorEdit';
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                if ( receiveData.slice ){
                    // Do not need to handle multiple slices in response -- only new-slice input should handle batch-input
                    // Update data and display
                    thisCopy.slice.id = receiveData.slice.id;
                    thisCopy.slice.title = receiveData.slice.title;
                    thisCopy.slice.reason = receiveData.slice.reason;
                    thisCopy.message = { color:GREEN, text:'Saved slice', ms:5000 };
                } else {
                    thisCopy.message = { color:GREEN, text:'' };
                }

            } else {
                let message = 'Failed to save slice';
                if ( receiveData ){ 
                    if ( receiveData.message == TOO_SHORT ){
                        message = 'Title is too short.';
                        thisCopy.sliceValidity = message;
                    }
                    else if ( receiveData.message == REASON_TOO_SHORT ){
                        message = 'Reason is too short.';
                        thisCopy.reasonValidity = message;
                    }
                    else if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit slice created by someone else.';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit slice that already has votes.';  }
                    else if ( receiveData.message == ERROR_DUPLICATE ){  message = 'Duplicate slice.';  }
                }
                thisCopy.message = { color:RED, text:message };
            }
            thisCopy.dataUpdated();
        } );
    } , 

        SliceEditDisplay.prototype.
    handleSliceDelete = function(e){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
    
        if ( this.slice.id == null ){
            this.budgetDisplay.sliceDeleted( this );
            return;
        }

        let inputTitle = this.getSubElement('SliceTitleInput');
        let inputReason = this.getSubElement('SliceReasonInput');

        // Delete slice, via ajax
        let thisCopy = this;
        this.message = { color:GREY, text:'Deleting...' };
        this.sliceValidity = '';
        this.reasonValidity = '';
        this.dataUpdated();
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.topDisp.linkKey.id ,
            budgetId:this.budgetDisplay.budget.id , sliceId:this.slice.id
        };
        let url = '/budget/sliceCreatorDelete';
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                let message = 'Deleted slice';
                thisCopy.message = { color:GREEN, text:message, ms:3000 };
                thisCopy.dataUpdated();
                // Remove data & display from budget
                thisCopy.budgetDisplay.sliceDeleted( thisCopy );
            }
            else {
                let message = 'Failed to delete slice.';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit slice created by someone else.';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit slice that already has votes.';  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };



/////////////////////////////////////////////////////////////////////////////////
// Budget editing display

        function
    BudgetEditDisplay( budgetId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data

        this.createFromHtml( budgetId, '\n\n' + [
            '<h1 class=title> Edit Budget </h1>' ,
            '   <div class=Budget id=Budget>' ,
            '       <div class="Message BudgetLinkMessage" id=BudgetLinkMessage aria-live=polite></div>' ,
            '       <div class=loginStatus id=loginStatus></div>' ,
            '       <div class=hideReasonsStatus id=hideReasonsStatus></div>' ,
            '       <div>' ,
            '           <button class=freezeButton id=freezeButton onclick=clickFreezeButton></button>' ,
            '           <div class="Message freezeMessage" id=freezeMessage></div>' ,
            '       </div>' ,

            '       <div class=BudgetEdit>' , 
            '           <label for=BudgetTitleInput> Budget Title </label>' ,
            '           <input type=text class="BudgetEditInput BudgetEditTitle" id=BudgetTitleInput placeholder="" ' ,
            '               onkeydown=handleEditTitleKey oninput=handleEditTitleInput onblur=handleEditBudgetSave />' ,
            '           <label for=BudgetIntroInput> Introduction </label>' ,
            '           <textarea class=BudgetEditInput id=BudgetIntroInput placeholder="" ' ,
            '               onkeydown=handleEditIntroKey oninput=handleEditIntroInput onblur=handleEditBudgetSave></textarea>' ,
            '           <label for=BudgetTotalInput> Budget total amount </label>' ,
            '           <input type=number min=0 step=any class=BudgetEditInput id=BudgetTotalInput placeholder="100" ' ,
            '               aria-required=true  value=100 ' ,
            '               onkeydown=handleEditTotalKey oninput=handleEditTotalInput onblur=handleEditBudgetSave />' ,
            '           <div class="Message BudgetEditMessage" id=BudgetEditMessage aria-live=polite></div> ' ,
            '       </div>' ,

            '       <h2> Budget items </h2>' ,
            '       <p> Users can choose from the budget-items that you suggest here, or add their own budget-items. </p>' ,
            '       <div class=Slices id=Slices></div>' ,
            '       <div class=NewSlice>' ,
            '           <h3> New budget item </h3>' ,
            '           <label for=NewSliceTitleInput> Title </label>' ,
            '           <input type=text class=NewSliceTitleInput id=NewSliceTitleInput placeholder="" ' ,
            '               oninput=handleNewSliceInput>' ,
            '       </div>' ,
            '       <div class=BudgetViewButtonBar><button class=BudgetViewButton id=BudgetViewButton onclick=onViewBudget> View Budget </button></div>' ,
            '   </div>'
        ].join('\n') );
    }
    BudgetEditDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        BudgetEditDisplay.prototype.
    setAllData = function( budgetData, topDisp ){
        this.budget = budgetData;
        this.topDisp = topDisp;
        this.slices = [ ];  // sequence[ { id:string, data:{...}, display:{...} } ]
        this.dataUpdated();
    };


    // Update html from data
        BudgetEditDisplay.prototype.
    dataUpdated = function( ){
        if ( ! this.budget.allowEdit ){  this.onViewBudget();  }   // Enforce editing permission

        // Set message contents
        if ( this.linkKey.ok === false ) {
            this.linkMessage = { color:RED, text:'Invalid link' };
            this.linkMessage = showMessageStruct( this.linkMessage, this.getSubElement('BudgetLinkMessage') );
        }
        this.editMessage = showMessageStruct( this.editMessage, this.getSubElement('BudgetEditMessage') );
        this.getSubElement('BudgetTitleInput').setCustomValidity( this.budgetTitleValidity? this.budgetTitleValidity : '' );
        this.getSubElement('BudgetIntroInput').setCustomValidity( this.budgetIntroValidity? this.budgetIntroValidity : '' );
        this.getSubElement('BudgetTotalInput').setCustomValidity( this.budgetTotalValidity? this.budgetTotalValidity : '' );

        if ( this.topDisp.linkKey.loginRequired ){
            this.setInnerHtml( 'loginStatus', 'Voter login required' );
        }
        else {
            this.setInnerHtml( 'loginStatus', (this.budget.mine ? 'Browser login only' : null) );
        }
        this.setInnerHtml( 'hideReasonsStatus', (this.budget.hideReasons ? 'Reasons hidden' : null) );
    
        this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeMessage') );
        this.setInnerHtml( 'freezeButton' , (this.isFrozen() ? 'Frozen' : 'Unfrozen') );

        // Set budget attributes
        this.setAttribute( 'Budget' , 'frozen' , (this.isFrozen() ? TRUE : null) );
        this.setAttribute( 'Budget', 'mine', (this.budget.mine ? TRUE : null) );
        this.setAttribute( 'Budget', 'hidereasons', (this.budget.hideReasons ? TRUE : null) );

        // Set title
        this.getSubElement('BudgetTitleInput').defaultValue = ( this.budget.title ?  this.budget.title  :  '' );
        // Set introduction
        let budgetIntroInput = this.getSubElement('BudgetIntroInput');
        budgetIntroInput.defaultValue = ( this.budget.introduction ?  this.budget.introduction  :  '' );
        setTimeout(  function(){ fitTextAreaToText( budgetIntroInput ); } , 100  );
        // Set total allocatable
        this.getSubElement('BudgetTotalInput').defaultValue = ( this.budget.total ? this.budget.total : 100 );

        // For each slice...
        let slicesDiv = this.getSubElement('Slices');
        let sliceIdsToDelete = [ ];
        for ( let s = 0;  s < this.slices.length;  ++s ){
            let slice = this.slices[s];
            // Ensure data has display
            if ( slice.data  &&  ! slice.display ){
                slice.display = this.addSliceDisplay( slice.data );
            }
            // Remove display without data
            else if ( slice.display  &&  ! slice.data ){
                // Remove from webpage
                slicesDiv.removeChild( slice.display.element );
                slice.display = null;
            }
            // Nullify slice without data
            if ( ! slice.data ){  this.slices[s] = null;  }
        }
        this.slices = this.slices.filter(s => s);  // Remove nulls
    };


        BudgetEditDisplay.prototype.
    areReasonsHidden = function(){  return this.budget.hideReasons;  }

        BudgetEditDisplay.prototype.
    isFrozen = function( ){  return this.budget && this.budget.freezeUserInput;  }

        BudgetEditDisplay.prototype.
    clickFreezeButton = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Update freeze message
        let freeze =  ! this.isFrozen();
        this.freezeMessage = {  color:GREY , text:(freeze ? 'Freezing' : 'Unfreezing')  };
        this.dataUpdated();

        // save via ajax
        this.dataUpdated();
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.topDisp.linkKey.id , 
            freeze:freeze
        };
        let url = '/budget/budgetFreeze';
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                thisCopy.freezeMessage = { color:GREEN , text:(freeze ? 'Froze' : 'Unfroze') + ' budget' , ms:7000 };
                thisCopy.budget.freezeUserInput = receiveData.budget.freezeUserInput;
            }
            else if ( ! error  &&  receiveData  &&  receiveData.message == NOT_OWNER ){
                thisCopy.freezeMessage = { color:RED , text:'Cannot ' +  (freeze ? 'freeze' : 'unfreeze') + ' budget created by someone else' };
            }
            else {
                thisCopy.freezeMessage = { color:RED , text:'Failed to ' + (freeze ? 'freeze' : 'unfreeze') + ' budget' , ms:7000 };
            }
            thisCopy.dataUpdated();
        } );
    };


        BudgetEditDisplay.prototype.
    focusNewSliceInput = function( ){
        this.getSubElement('NewSliceTitleInput').focus();
    };


        BudgetEditDisplay.prototype.
    handleEditTitleInput = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        let titleInput = this.getSubElement('BudgetTitleInput');
        this.titleInput = titleInput.value;
    };

        BudgetEditDisplay.prototype.
    handleEditTitleKey = function( event ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        // if ENTER key... focus introduction-input, then blur causes save
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            this.getSubElement('BudgetIntroInput').focus();
            return false;
        }
    };


        BudgetEditDisplay.prototype.
    handleEditIntroInput = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        let introInput = this.getSubElement('BudgetIntroInput');
        this.introInput = introInput.value;
        fitTextAreaToText( introInput );
    };

        BudgetEditDisplay.prototype.
    handleEditIntroKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // if ENTER key... focus total-input, then blur causes save
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            this.getSubElement('BudgetTotalInput').focus();
            return false;
        }
    };


        BudgetEditDisplay.prototype.
    handleEditTotalInput = function( ){
        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }
        let totalInput = this.getSubElement('BudgetTotalInput');
        this.totalInput = totalInput.value;
    };

        BudgetEditDisplay.prototype.
    handleEditTotalKey = function( event ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // ENTER key...
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            // Focus first/new slice input, then blur causes save
            if ( this.slices  &&  this.slices.length > 0 ){
                this.slices[0].display.setInputFocusAtEnd();
            }
            else {
                let newSliceInput = this.getSubElement('NewSliceTitleInput');
                newSliceInput.focus();
            }
            return false;
        }
    };



        BudgetEditDisplay.prototype.
    handleNewSliceInput = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        let newSliceTitleInput = this.getSubElement('NewSliceTitleInput');
        if ( newSliceTitleInput.value.length <= 0 ){  return;  }

        // Clear and hide new-slice input
        let title = newSliceTitleInput.value;
        newSliceTitleInput.value = '';
        let newSliceTitleInputJquery = jQuery( newSliceTitleInput );
        newSliceTitleInputJquery.hide();

        // Handle slice batch input
        // Parse multi-line answers by newline
        //     Do not have to handle batch of slices pasted into existing slice -- only into new-slice
        // For each line (except last) ... create new slice-display, and save it
        let lines = title.split('\n');
        for ( let l = 0;  l < lines.length;  ++l ){
            let line = lines[l];
            if ( ! line ){  continue;  }
            
            // Add new slice-display containing start of slice-title, and focus it
            // Add display here, not in dataUpdated(), so that display can be initially modified here
            let [title, reason] = line.split('\t');
            let sliceData = { id:null, title:title, reason:reason };
            let sliceDisplay = this.addSliceDisplay( sliceData );
            this.slices.push(  { id:sliceData.id , data:sliceData , display:sliceDisplay }  );
            // Initialize display input fields
            sliceDisplay.titleInputValue = title;
            sliceDisplay.reasonInputValue = reason;
            sliceDisplay.dataUpdated();

            // For last / only slice... do not save until blur / ENTER
            if ( l+1 == lines.length ){  sliceDisplay.setInputFocusAtEnd();  }
            else                      {  sliceDisplay.handleEditSliceSave();  }
        }

        // Transition in new-slice input, as if it were newly added to page
        newSliceTitleInputJquery.slideToggle();
    };
    
        BudgetEditDisplay.prototype.
    addSliceDisplay = function( sliceData ){
        // Create display
        sliceDisplay = new SliceEditDisplay( sliceData.id );
        sliceDisplay.setAllData( sliceData, this.topDisp, this );
        // Add to webpage
        let slicesDiv = this.getSubElement('Slices');
        addAndAppear( sliceDisplay.element, slicesDiv );
        return sliceDisplay;
    };


        BudgetEditDisplay.prototype.
    retrieveDataUpdate = function( ){  return this.retrieveData();  }

        BudgetEditDisplay.prototype.
    retrieveData = function( ){
        // Request via ajax
        let thisCopy = this;
        let sendData = { budgetId:this.budget.id };
        let url = '/budget/budget/' + this.topDisp.linkKey.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.linkKey.ok = true;
                if ( receiveData.budget ){
                    thisCopy.budget.id = receiveData.budget.id;
                    thisCopy.budget.title = receiveData.budget.title;
                    thisCopy.budget.introduction = receiveData.budget.introduction;
                    thisCopy.budget.total = receiveData.budget.total;
                    thisCopy.budget.allowEdit = receiveData.budget.allowEdit;
                    thisCopy.budget.adminHistory = receiveData.budget.adminHistory;
                    thisCopy.budget.freezeUserInput = receiveData.budget.freezeUserInput;
                    thisCopy.budget.mine = receiveData.budget.mine;
                    thisCopy.budget.hideReasons = receiveData.budget.hideReasons;
                }
                if ( receiveData.linkKey ){
                    thisCopy.linkKey.loginRequired = receiveData.linkKey.loginRequired;
                }
                thisCopy.dataUpdated();
                thisCopy.retrieveSlices();
            }
            else {  // Error...
                if ( receiveData  &&  receiveData.message == BAD_LINK ){
                    thisCopy.linkKey.ok = false;
                }
                thisCopy.dataUpdated();
            }
        } );
    };
    
    
        BudgetEditDisplay.prototype.
    retrieveSlices = function( ){
        // Request via ajax
        let thisCopy = this;
        let sendData = { };
        let url = '/budget/slicesFromCreator/' + this.topDisp.linkKey.id;

        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                    // Update each slice's data
                    if ( receiveData.slices ){
                        // For each slice... do a field-level merge, to keep already retrieved slice data
                        let sliceIdToData = { };
                        for ( let s = 0;  s < thisCopy.slices.length;  ++s ){
                            let sliceOldData = thisCopy.slices[s];
                            sliceIdToData[ sliceOldData.id ] = sliceOldData;
                        }
                        for ( let s = 0;  s < receiveData.slices.length;  ++s ){
                            let sliceNewData = receiveData.slices[s];
                            let sliceOldData = sliceIdToData[ sliceNewData.id ];
                            if ( sliceOldData ){
                                sliceOldData.title = sliceNewData.title;
                                sliceOldData.reason = sliceNewData.reason;
                            }
                            else {
                                thisCopy.slices.push(  { id:sliceNewData.id, data:sliceNewData }  );
                            }
                        }
                    }
                    thisCopy.dataUpdated();
            }
            else {
                // Error...
            }
        } );
    };


        BudgetEditDisplay.prototype.
    handleEditBudgetSave = function( ){

        if ( this.topDisp.linkKey.loginRequired  &&  ! requireLogin() ){  return false;  }

        // If budget data did not change... early exit
        let titleInput = this.getSubElement('BudgetTitleInput');
        let introInput = this.getSubElement('BudgetIntroInput');
        let totalInput = this.getSubElement('BudgetTotalInput');
        if ( (titleInput.value == this.budget.title) && 
             (introInput.value == this.budget.introduction)  &&
             (totalInput.value == this.budget.total) ){  
            return;
        }

        // Check budget introduction length 
        if ( titleInput.value.length + introInput.value.length < minLengthBudgetIntro ){
            let message = 'Title and introduction is too short';
            this.editMessage = { color:RED, text:message };
            this.budgetIntroValidity = message;
            this.dataUpdated();
            return;
        }

        // Check budget total 
        let totalInputNumber = ( totalInput.value ?  Number(totalInput.value)  :  0 );
        if ( totalInputNumber <= 0 ){
            let message = 'Budget total-amount must be a positive number';
            this.editMessage = { color:RED, text:message };
            this.budgetTotalValidity = message;
            this.dataUpdated();
            return;
        }

        // Save via ajax
        this.editMessage = { color:GREY, text:'Saving changes...' };
        this.budgetIntroValidity = '';
        this.dataUpdated();
        let sendData = { 
            crumb:crumb , fingerprint:fingerprint , linkKey:this.topDisp.linkKey.id , 
            title:titleInput.value , introduction:introInput.value , total:totalInputNumber
        };
        let url = '/budget/budgetEdit';
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.editMessage = { color:GREEN, text:'Saved budget', ms:7000 };
                thisCopy.budgetTitleValidity = '';
                thisCopy.budgetIntroValidity = '';
                thisCopy.budgetTotalValidity = '';
                thisCopy.dataUpdated();
                // update data
                thisCopy.budget.title = receiveData.budget.title;
                thisCopy.budget.introduction = receiveData.budget.introduction;
                thisCopy.budget.total = receiveData.budget.total;
                thisCopy.dataUpdated();
            }
            else {
                let message = 'Failed to save budget';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){
                        message = 'Title & introduction is too short';
                        thisCopy.budgetIntroValidity = message;
                    }
                    else if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit budget created by someone else';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit budget that already has slices';  }
                }
                thisCopy.editMessage = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };


        BudgetEditDisplay.prototype.
    onViewBudget = function( ){
        setFragmentFields( {page:FRAG_PAGE_BUDGET_VIEW} );
    };
    
        BudgetEditDisplay.prototype.
    sliceDeleted = function( oldSliceDisplay ){
        for ( let s = 0;  s < this.slices.length;  ++s ){
            let slice = this.slices[s];
            if ( slice.display == oldSliceDisplay ){  slice.data = null;  }
        }
        this.dataUpdated();
    };

    
