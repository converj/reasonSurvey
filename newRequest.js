
    // Find elements
    var buttonSubmit = document.getElementById('buttonSubmit');
    var newRequestInputTitle = document.getElementById('newRequestInputTitle');
    var newRequestInputDetail = document.getElementById('newRequestInputDetail');
    var loginRequiredForRequestCheckbox = document.getElementById('loginRequiredForRequest');
    var newRequestSubmitMessage = document.getElementById('newRequestSubmitMessage');



        function
    newRequestHandleLoad( ){
        newRequestInputTitle.value = '';
        newRequestInputDetail.value = '';
        loginRequiredForRequestCheckbox.checked = false;
        showMessage( '', GREY, null, newRequestSubmitMessage );
        newRequestInputTitle.setCustomValidity( '' );
        newRequestInputDetail.setCustomValidity( '' );
        loginRequiredForRequestCheckbox.setCustomValidity( '' );
        newRequestHandleInput();
    }



    // handle typing, to guide user to next input
        function
    newRequestHandleInput( ){
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


    // handle submit
    buttonSubmit.onclick = function(){

        // Check request-for-proposals length
        if ( newRequestInputTitle.value.length + newRequestInputDetail.value.length < minLengthRequest ){
            var message = 'Request is too short.';
            showMessage( message, RED, null, newRequestSubmitMessage );
            newRequestInputTitle.setCustomValidity( message );
            newRequestInputDetail.setCustomValidity( message );
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
        var dataSend = {
            crumb:crumb , fingerprint:fingerprint ,
            title:newRequestInputTitle.value , detail:newRequestInputDetail.value ,
            loginRequired:loginRequiredForRequestCheckbox.checked
        };
        var url = 'newRequest';
        ajaxPost( dataSend, url, function(error, status, data){
            if ( error  ||  !data ){
                var message = 'Failed to save request';
                showMessage( 'Failed: '+error, RED, null, newRequestSubmitMessage );
                newRequestInputTitle.setCustomValidity( message );
                newRequestInputDetail.setCustomValidity( message );
            }
            else if ( ! data.success  &&  data.message == NO_COOKIE ){
                var message = 'No cookie present';
                showMessage( MESSAGE_NO_COOKIE, RED, null, newRequestSubmitMessage );
                newRequestInputTitle.setCustomValidity( message );
                newRequestInputDetail.setCustomValidity( message );
            }
            else if ( ! data.success  &&  data.message == BAD_CRUMB ){
                var message = 'No crumb present';
                showMessage( MESSAGE_BAD_CRUMB, RED, null, newRequestSubmitMessage );
                newRequestInputTitle.setCustomValidity( message );
                newRequestInputDetail.setCustomValidity( message );
            }
            else if ( ! data.success  &&  data.message == TOO_SHORT ){
                var message = 'Request is too short.';
                showMessage( message, RED, null, newRequestSubmitMessage );
                newRequestInputTitle.setCustomValidity( message );
                newRequestInputDetail.setCustomValidity( message );
            }
            else if ( ! data.success ){
                var message = 'Failed to save request.';
                showMessage( message, RED, null, newRequestSubmitMessage );
                newRequestInputTitle.setCustomValidity( message );
                newRequestInputDetail.setCustomValidity( message );
            }
            else if ( data.request ){
                showMessage( 'Saved request for proposals', GREEN, null, newRequestSubmitMessage );
                newRequestInputTitle.setCustomValidity('');
                newRequestInputDetail.setCustomValidity('');
                // navigate to request view page
                setWholeFragment( {page:FRAG_PAGE_ID_REQUEST, link:data.linkKey.id} );
            }
            else {  
                var message = 'Failed to save request.';
                showMessage( message, RED, null, newRequestSubmitMessage );
                newRequestInputTitle.setCustomValidity( message );
                newRequestInputDetail.setCustomValidity( message );
            }
        } );
    }


    buttonSubmit.onkeyup = function(event){  if ( event.key == KEY_NAME_ENTER ){ buttonSubmit.onclick(); }  };

    
