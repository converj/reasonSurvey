
    // Find elements
    let buttonSubmitNewProposal = document.getElementById('buttonSubmitNewProposal');
    let newProposalInputTitle = document.getElementById('newProposalInputTitle');
    let newProposalInputDetail = document.getElementById('newProposalInputDetail');
    let loginRequiredForProposalCheckbox = document.getElementById('loginRequiredForProposal');
    let newProposalSubmitMessage = document.getElementById('newProposalSubmitMessage');
    let experimentalPasswordForProposal = document.getElementById('experimentalPasswordForProposal');
    let hideReasonsForProposal = document.getElementById('hideReasonsForProposal');


        function
    newProposalHandleLoad( experimentUrlFragment ){
        // Clear form inputs
        newProposalInputTitle.value = '';
        newProposalInputDetail.value = '';
        loginRequiredForProposalCheckbox.checked = false;
        experimentalPasswordForProposal.value = '';
        hideReasonsForProposal.checked = false;

        // Clear messages
        newProposalInputTitle.setCustomValidity('');
        newProposalInputDetail.setCustomValidity('');
        loginRequiredForProposalCheckbox.setCustomValidity('');
        showMessage( '', GREY, null, newProposalSubmitMessage );

        // Show experimental options
        let experimentalInputsDiv = document.getElementById('experimentalInputsForProposal');
        experimentalInputsDiv.style.display = ( experimentUrlFragment == TRUE )?  'block'  :  'none'

        newProposalHandleInput();
    }

    // Handle typing, to guide user to next input
        function
    newProposalHandleInput( ){
        if ( newProposalInputTitle.value.length + newProposalInputDetail.value.length >= minLengthProposal ){
            newProposalInputTitle.setCustomValidity('');
            newProposalInputDetail.setCustomValidity('');
        }

        if ( newProposalInputTitle.value == '' ){
            newProposalInputTitle.style.color = GREEN;
            newProposalInputDetail.style.color = BLACK;
        }
        else if ( newProposalInputDetail.value == '' ){
            newProposalInputTitle.style.color = BLACK;
            newProposalInputDetail.style.color = GREEN;
        }
        else {
            newProposalInputTitle.style.color = BLACK;
            newProposalInputDetail.style.color = BLACK;
        }
    }
    newProposalInputTitle.oninput = newProposalHandleInput;
    newProposalInputDetail.oninput = newProposalHandleInput;


    loginRequiredForProposalCheckbox.onclick = function(){
        if ( loginRequiredForProposalCheckbox.checked  &&  ! requireLogin() ){  return false;  }
    };


        function
    newProposalExperimentalOptionsInput( ){
        if ( hideReasonsForProposal.checked  &&  (! experimentalPasswordForProposal.value) ){
            let message = 'Experimental password required';
            experimentalPasswordForProposal.setCustomValidity( message );
        }
        else {
            experimentalPasswordForProposal.setCustomValidity('');
            showMessage( '', GREY, null, newProposalSubmitMessage );
        }
    }
    experimentalPasswordForProposal.oninput = newProposalExperimentalOptionsInput;
    hideReasonsForProposal.onclick = newProposalExperimentalOptionsInput;


    // Handle form-submit
    buttonSubmitNewProposal.onclick = function(){

        // Check proposal length
        if ( newProposalInputTitle.value.length + newProposalInputDetail.value.length < minLengthProposal ){
            let message = 'Proposal is too short';
            showMessage( message, RED, null, newProposalSubmitMessage );
            newProposalInputTitle.setCustomValidity( message );
            newProposalInputDetail.setCustomValidity( message );
            return false;
        }

        // Require experiment-password for experiment-options like hide-reasons
        if ( hideReasonsForProposal.checked  &&  (! experimentalPasswordForProposal.value) ){
            let message = 'Experimental password required';
            showMessage( message, RED, null, newProposalSubmitMessage );
            experimentalPasswordForProposal.setCustomValidity( message );
            return false;
        }

        // If login is required... use existing login or request login 
        if ( loginRequiredForProposalCheckbox.checked  &&  ! requireLogin() ){  return false;  }
        saveNewProposal();
        
        return false;
    };


        function
    saveNewProposal( ){
        // Save via ajax
        showMessage( 'Saving proposal...', GREY, null, newProposalSubmitMessage );
        newProposalInputTitle.setCustomValidity('');
        newProposalInputDetail.setCustomValidity('');
        let dataSend = { 
            crumb:crumb , fingerprint:fingerprint ,
            loginRequired:loginRequiredForProposalCheckbox.checked ,
            title:newProposalInputTitle.value , detail:newProposalInputDetail.value ,
            experimentalPassword:experimentalPasswordForProposal.value , hideReasons:hideReasonsForProposal.checked
        };
        let url = 'newProposal';
        ajaxPost( dataSend, url, function(error, status, data){
            if ( !error  &&  data  &&  data.success  &&  data.proposal ){
                showMessage( 'Saved proposal', GREEN, null, newProposalSubmitMessage );
                newProposalInputTitle.setCustomValidity('');
                newProposalInputDetail.setCustomValidity('');
                // navigate to proposal view page
                setWholeFragment( {page:FRAG_PAGE_ID_PROPOSAL, link:data.linkKey.id} );
            }
            else {
                let message = 'Failed to save proposal';

                if ( data  &&  data.message == NO_COOKIE ){  message = 'No cookie present';  }
                else if ( data  &&  data.message == BAD_CRUMB ){  message = 'No crumb present';  }
                else if ( data  &&  data.message == TOO_SHORT ){
                    message = 'Proposal is too short';
                    newProposalInputTitle.setCustomValidity( message );
                    newProposalInputDetail.setCustomValidity( message );
                }
                else if ( data  &&  data.message == EXPERIMENT_NOT_AUTHORIZED ){
                    message = 'Experimental password required';
                    experimentalPasswordForProposal.setCustomValidity( message );
                }

                showMessage( message, RED, null, newProposalSubmitMessage );
            }
        } );
	}

    
    buttonSubmitNewProposal.onkeyup = function(event){  if ( event.key == KEY_NAME_ENTER ){ buttonSubmitNewProposal.onclick(); }  };

