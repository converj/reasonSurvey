
    // Find elements
    let buttonSubmit = document.getElementById('buttonSubmit');
    let newRequestInputTitle = document.getElementById('newRequestInputTitle');
    let newRequestInputDetail = document.getElementById('newRequestInputDetail');
    let loginRequiredForRequestCheckbox = document.getElementById('loginRequiredForRequest');
    let newRequestSubmitMessage = document.getElementById('newRequestSubmitMessage');
    let experimentalPasswordForRequest = document.getElementById('experimentalPasswordForRequest');
    let hideReasonsForRequest = document.getElementById('hideReasonsForRequest');
    let doneLinkInput = document.getElementById('doneLinkInput');



        function
    newRequestHandleLoad( experimentUrlFragment ){
        // Clear form inputs
        newRequestInputTitle.value = '';
        newRequestInputDetail.value = '';
        loginRequiredForRequestCheckbox.checked = false;
        experimentalPasswordForRequest.value = '';
        hideReasonsForRequest.checked = false;
        doneLinkInput.value = '';

        // Clear messages
        showMessage( '', GREY, null, newRequestSubmitMessage );
        newRequestInputTitle.setCustomValidity( '' );
        newRequestInputDetail.setCustomValidity( '' );
        loginRequiredForRequestCheckbox.setCustomValidity( '' );

        // Show experimental options
        let experimentalInputsDiv = document.getElementById('experimentalInputsForRequest');
        experimentalInputsDiv.style.display = ( experimentUrlFragment == TRUE )?  'block'  :  'none';

        newRequestHandleInput();
    }



    // Handle typing, to guide user to next input
        function
    newRequestHandleInput( ){
        if ( newRequestInputTitle.value.length + newRequestInputDetail.value.length >= minLengthRequest ){
            newRequestInputTitle.setCustomValidity('');
            newRequestInputDetail.setCustomValidity('');
        }

        if ( newRequestInputTitle.value == '' ){
            newRequestInputTitle.style.color = GREEN;
            newRequestInputDetail.style.color = BLACK;
        }
        else if ( newRequestInputDetail.value == '' ){
            newRequestInputTitle.style.color = BLACK;
            newRequestInputDetail.style.color = GREEN;
        }
        else {
            newRequestInputTitle.style.color = BLACK;
            newRequestInputDetail.style.color = BLACK;
        }
    }
    newRequestInputTitle.oninput = newRequestHandleInput;
    newRequestInputDetail.oninput = newRequestHandleInput;


    loginRequiredForRequestCheckbox.onclick = function(){
        if ( loginRequiredForRequestCheckbox.checked  &&  ! requireLogin() ){  return;  }
    };


        function
    newRequestExperimentalOptionsInput( ){
        let isExperiment = doneLinkInput.value  ||  hideReasonsForRequest.checked;
        if ( isExperiment  &&  ! experimentalPasswordForRequest.value ){
            let message = 'Experimental password required';
            experimentalPasswordForRequest.setCustomValidity( message );
        }
        else {
            experimentalPasswordForRequest.setCustomValidity('');
            showMessage( '', GREY, null, newRequestSubmitMessage );
        }
    }
    experimentalPasswordForRequest.oninput = newRequestExperimentalOptionsInput;
    hideReasonsForRequest.onclick = newRequestExperimentalOptionsInput;
    doneLinkInput.oninput = newRequestExperimentalOptionsInput;



    // Handle form-submit
    buttonSubmit.onclick = function(){

        // Check request-for-proposals length
        if ( newRequestInputTitle.value.length + newRequestInputDetail.value.length < minLengthRequest ){
            let message = 'Request is too short';
            showMessage( message, RED, null, newRequestSubmitMessage );
            newRequestInputTitle.setCustomValidity( message );
            newRequestInputDetail.setCustomValidity( message );
            return false;
        }

        // Require experiment-password for experiment-options like hide-reasons
        let isExperiment = doneLinkInput.value  ||  hideReasonsForRequest.checked;
        if ( isExperiment  &&  ! experimentalPasswordForRequest.value ){
            let message = 'Experimental password required';
            showMessage( message, RED, null, newRequestSubmitMessage );
            experimentalPasswordForRequest.setCustomValidity( message );
            return false;
        }

        // If login is required... use existing login or request login
        if ( loginRequiredForRequestCheckbox.checked  &&  ! requireLogin() ){  return false;  }
        saveNewRequest();

        return false;
    };


        function
    saveNewRequest( ){
        // save via ajax
        showMessage( 'Saving request for proposals...', GREY, null, newRequestSubmitMessage );
        newRequestInputTitle.setCustomValidity('');
        newRequestInputDetail.setCustomValidity('');
        let dataSend = {
            crumb:crumb , fingerprint:fingerprint ,
            title:newRequestInputTitle.value , detail:newRequestInputDetail.value ,
            loginRequired:loginRequiredForRequestCheckbox.checked ,
            experimentalPassword:experimentalPasswordForRequest.value , hideReasons:hideReasonsForRequest.checked ,
            doneLink:doneLinkInput.value
        };
        let url = 'newRequest';
        ajaxPost( dataSend, url, function(error, status, data){
            if ( !error  &&  data   &&  data.success  &&  data.request ){
                showMessage( 'Saved request for proposals', GREEN, null, newRequestSubmitMessage );
                newRequestInputTitle.setCustomValidity('');
                newRequestInputDetail.setCustomValidity('');
                // Navigate to request view page
                setWholeFragment( {page:FRAG_PAGE_ID_REQUEST, link:data.linkKey.id} );
            }
            else {
                let message = 'Failed to save request';

                if ( data  &&  data.message == NO_COOKIE ){  message = 'No cookie present';  }
                else if ( data  &&  data.message == BAD_CRUMB ){  message = 'No crumb present';  }
                else if ( data  &&  data.message == TOO_SHORT ){
                    message = 'Request is too short.';
                    newRequestInputTitle.setCustomValidity( message );
                    newRequestInputDetail.setCustomValidity( message );
                }
                else if ( data  &&  data.message == EXPERIMENT_NOT_AUTHORIZED ){
                    message = 'Experimental password required';
                    experimentalPasswordForProposal.setCustomValidity( message );
                }

                showMessage( message, RED, null, newRequestSubmitMessage );
            }
        } );
    }


    buttonSubmit.onkeyup = function(event){  if ( event.key == KEY_NAME_ENTER ){ buttonSubmit.onclick(); }  };

    
