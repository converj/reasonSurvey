
    // Find elements
    var newSurveySubmitButton = document.getElementById('newSurveySubmitButton');
    var newSurveyIntroInput = document.getElementById('newSurveyIntroInput');
    var newSurveySubmitMessage = document.getElementById('newSurveySubmitMessage');
    var loginRequiredCheckbox = document.getElementById('loginRequiredCheckbox');

        function
    newSurveyHandleLoad( ){
        newSurveyIntroInput.value = '';
        newSurveyIntroInput.setCustomValidity('');
        loginRequiredCheckbox.checked = false;
        loginRequiredCheckbox.setCustomValidity('');
        newSurveySubmitMessage.innerHTML = '';
    }


    // handle typing, to guide user to next input
        function
    newSurveyHandleInput( ){
        fitTextAreaToText( newSurveyIntroInput );
    }
    newSurveyIntroInput.oninput = newSurveyHandleInput;


    loginRequiredCheckbox.onclick = function(){
        if ( loginRequiredCheckbox.checked  &&  ! requireLogin() ){  return;  }
    };


    // Handle ENTER key, advancing to next page
    newSurveyIntroInput.onkeydown = function( event ){
        // ENTER key: save answer and focus new-answer input
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            newSurveySubmit();
            return false;
        }
    };


    // Handle submit
        function
    newSurveySubmit( ){

        // check question length
        if ( newSurveyIntroInput.value.length < minLengthQuestion ){
            var message = 'Question is too short.';
            showMessage( message, RED, 3000, newSurveySubmitMessage );
            newSurveyIntroInput.setCustomValidity( message );
            return false;
        }

        // Check login
        if ( loginRequiredCheckbox.checked  &&  ! requireLogin() ){  return false;  }

        // save via ajax
        showMessage( 'Saving survey...', GREY, null, newSurveySubmitMessage );
        newSurveyIntroInput.setCustomValidity('');
        var dataSend = {
            crumb:crumb , fingerprint:fingerprint ,
            introduction:newSurveyIntroInput.value ,
            loginRequired:loginRequiredCheckbox.checked
        };
        var url = '/autocomplete/newSurvey';
        ajaxPost( dataSend, url, function(error, status, data){
            if ( error  ||  !data ){  
                var message = 'Failed to save survey';
                showMessage( message, RED, null, newSurveySubmitMessage );
                newSurveyIntroInput.setCustomValidity( message );
            }
            else if ( ! data.success  &&  data.message == TOO_SHORT ){
                showMessage( 'Survey introduction is too short.', RED, null, newSurveySubmitMessage );
            }
            else if ( ! data.success ){
                showMessage( 'Failed to save survey.', RED, null, newSurveySubmitMessage );
            }
            else if ( data.survey ){
                showMessage( 'Saved survey', GREEN, null, newSurveySubmitMessage );
                // navigate to question view page
                setWholeFragment( {page:FRAG_PAGE_EDIT_QUESTION, link:data.linkKey.id} );
            }
            else {  
                var message = 'Failed to save survey.';
                showMessage( message, RED, null, newSurveySubmitMessage );  
                newSurveyIntroInput.setCustomValidity( message );
            }
        } );

	    return false;
	};
    newSurveySubmitButton.onclick = newSurveySubmit;
    
