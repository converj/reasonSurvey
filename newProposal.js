
    // Find elements
    var buttonSubmitNewProposal = document.getElementById('buttonSubmitNewProposal');
    var newProposalInputTitle = document.getElementById('newProposalInputTitle');
    var newProposalInputDetail = document.getElementById('newProposalInputDetail');
    var loginRequiredForProposalCheckbox = document.getElementById('loginRequiredForProposal');
    var newProposalSubmitMessage = document.getElementById('newProposalSubmitMessage');

        function
    newProposalHandleLoad( ){
        newProposalInputTitle.value = '';
        newProposalInputDetail.value = '';
        loginRequiredForProposalCheckbox.checked = false;

        newProposalInputTitle.setCustomValidity('');
        newProposalInputDetail.setCustomValidity('');
        loginRequiredForProposalCheckbox.setCustomValidity('');
        showMessage( '', GREY, null, newProposalSubmitMessage );

        newProposalHandleInput();
    }

    // handle typing, to guide user to next input
        function
    newProposalHandleInput( ){
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
        if ( loginRequiredForProposalCheckbox.checked  &&  ! requireLogin() ){  return;  }
    };


    // handle submit
    buttonSubmitNewProposal.onclick = function(){

        // check proposal length
        if ( newProposalInputTitle.value.length + newProposalInputDetail.value.length < minLengthProposal ){
            var message = 'Proposal is too short.';
            showMessage( message, RED, null, newProposalSubmitMessage );
            newProposalInputTitle.setCustomValidity( message );
            newProposalInputDetail.setCustomValidity( message );
            return false;
        }

        // If login is required... use existing login or request login 
        if ( loginRequiredForProposalCheckbox.checked  &&  ! requireLogin() ){  return false;  }
        saveNewProposal();
        
        return false;
    };


        function
    saveNewProposal( ){
        // save via ajax
        showMessage( 'Saving proposal...', GREY, null, newProposalSubmitMessage );
        newProposalInputTitle.setCustomValidity('');
        newProposalInputDetail.setCustomValidity('');
        var dataSend = { 
            crumb:crumb , fingerprint:fingerprint ,
            loginRequired:loginRequiredForProposalCheckbox.checked ,
            title:newProposalInputTitle.value , detail:newProposalInputDetail.value 
        };
        var url = 'newProposal';
        ajaxPost( dataSend, url, function(error, status, data){
            if ( error  ||  !data ){  
                showMessage( 'Failed: '+error, RED, null, newProposalSubmitMessage );
                newProposalInputTitle.setCustomValidity('Failed to save proposal');
                newProposalInputDetail.setCustomValidity('Failed to save proposal');
            }
            else if ( ! data.success  &&  data.message == TOO_SHORT ){
                var message = 'Proposal is too short.';
                showMessage( message, RED, null, newProposalSubmitMessage );
                newProposalInputTitle.setCustomValidity( message );
                newProposalInputDetail.setCustomValidity( message );
            }
            else if ( ! data.success ){
                var message = 'Failed to save proposal.';
                showMessage( message, RED, null, newProposalSubmitMessage );
                newProposalInputTitle.setCustomValidity( message );
                newProposalInputDetail.setCustomValidity( message );
            }
            else if ( data.proposal ){
                showMessage( 'Saved proposal', GREEN, null, newProposalSubmitMessage );
                newProposalInputTitle.setCustomValidity('');
                newProposalInputDetail.setCustomValidity('');
                // navigate to proposal view page
                setWholeFragment( {page:FRAG_PAGE_ID_PROPOSAL, link:data.linkKey.id} );
            }
            else {
                var message = 'Failed to save proposal.';
                showMessage( message, RED, null, newProposalSubmitMessage );
                newProposalInputTitle.setCustomValidity( message );
                newProposalInputDetail.setCustomValidity( message );
            }
        } );
	}

    
    buttonSubmitNewProposal.onkeyup = function(event){  if ( event.key == KEY_NAME_ENTER ){ buttonSubmitNewProposal.onclick(); }  };

