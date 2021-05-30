
    // Find elements
    let newSurveySubmitButton = document.getElementById('newSurveySubmitButton');
    let newSurveyTitleInput = document.getElementById('newSurveyTitleInput');
    let newSurveyIntroInput = document.getElementById('newSurveyIntroInput');
    let newSurveySubmitMessage = document.getElementById('newSurveySubmitMessage');
    let loginRequiredForAutocompleteCheckbox = document.getElementById('loginRequiredForAutocompleteCheckbox');
    let experimentalPasswordForAutocomplete = document.getElementById('experimentalPasswordForAutocomplete');
    let hideReasonsForAutocomplete = document.getElementById('hideReasonsForAutocomplete');


        function
    newSurveyHandleLoad( experimentUrlFragment ){
        // Clear form inputs
        newSurveyTitleInput.value = '';
        newSurveyTitleInput.setCustomValidity('');
        experimentalPasswordForAutocomplete.value = '';
        hideReasonsForAutocomplete.checked = false;

        // Clear messages
        newSurveyIntroInput.value = '';
        newSurveyIntroInput.setCustomValidity('');
        loginRequiredForAutocompleteCheckbox.checked = false;
        loginRequiredForAutocompleteCheckbox.setCustomValidity('');
        newSurveySubmitMessage.innerHTML = '';

        // Show experimental options
        let experimentalInputsDiv = document.getElementById('experimentalInputsForAutocomplete');
        experimentalInputsDiv.style.display = ( experimentUrlFragment == TRUE )?  'block'  :  'none'

        newSurveyHandleInput();
    }


        function
    newSurveyHandleInput( ){

        // Clear validity if length is sufficient
        if ( newSurveyTitleInput.value.length + newSurveyIntroInput.value.length >= minLengthQuestion ){
            newSurveyTitleInput.setCustomValidity('');
            newSurveyIntroInput.setCustomValidity('');
        }

        fitTextAreaToText( newSurveyIntroInput );
    }
    newSurveyTitleInput.oninput = newSurveyHandleInput;
    newSurveyIntroInput.oninput = newSurveyHandleInput;


    loginRequiredForAutocompleteCheckbox.onclick = function(){
        if ( loginRequiredForAutocompleteCheckbox.checked  &&  ! requireLogin() ){  return;  }
    };


        function
    newAutocompleteExperimentalOptionsInput( ){
        if ( hideReasonsForAutocomplete.checked  &&  (! experimentalPasswordForAutocomplete.value) ){
            let message = 'Experimental password required';
            experimentalPasswordForAutocomplete.setCustomValidity( message );
        }
        else {
            experimentalPasswordForAutocomplete.setCustomValidity('');
            showMessage( '', GREY, null, newSurveySubmitMessage );
        }
    }
    experimentalPasswordForAutocomplete.oninput = newAutocompleteExperimentalOptionsInput;
    hideReasonsForAutocomplete.onclick = newAutocompleteExperimentalOptionsInput;


    newSurveyTitleInput.onkeydown = function( event ){
        // ENTER key: focus introduction input
        if ( event.keyCode === KEY_CODE_ENTER ) {
            newSurveyIntroInput.focus();
            return false;
        }
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
        if ( newSurveyTitleInput.value.length + newSurveyIntroInput.value.length < minLengthQuestion ){
            let message = 'Question is too short.';
            showMessage( message, RED, 3000, newSurveySubmitMessage );
            newSurveyIntroInput.setCustomValidity( message );
            return false;
        }

        // Require experiment-password for experiment-options like hide-reasons
        if ( hideReasonsForAutocomplete.checked  &&  (! experimentalPasswordForAutocomplete.value) ){
            let message = 'Experimental password required';
            showMessage( message, RED, null, newSurveySubmitMessage );
            experimentalPasswordForAutocomplete.setCustomValidity( message );
            return false;
        }

        // Check login
        if ( loginRequiredForAutocompleteCheckbox.checked  &&  ! requireLogin() ){  return false;  }

        // save via ajax
        showMessage( 'Saving survey...', GREY, null, newSurveySubmitMessage );
        newSurveyTitleInput.setCustomValidity('');
        newSurveyIntroInput.setCustomValidity('');
        let dataSend = {
            crumb:crumb , fingerprint:fingerprint ,
            title: newSurveyTitleInput.value ,
            introduction:newSurveyIntroInput.value ,
            loginRequired:loginRequiredForAutocompleteCheckbox.checked ,
            experimentalPassword:experimentalPasswordForAutocomplete.value , hideReasons:hideReasonsForAutocomplete.checked
        };
        let url = '/autocomplete/newSurvey';
        ajaxPost( dataSend, url, function(error, status, data){
            if ( !error  &&  data  &&  data.success  &&  data.survey ){
                showMessage( 'Saved survey', GREEN, null, newSurveySubmitMessage );
                // Navigate to question view page
                setWholeFragment( {page:FRAG_PAGE_EDIT_AUTOCOMPLETE, link:data.linkKey.id} );
            }
            else {
                let message = 'Failed to save survey';

                if ( data  &&  data.message == TOO_SHORT ){
                    message = 'Survey introduction is too short.';
                    newSurveyIntroInput.setCustomValidity( message );
                }
                else if ( data  &&  data.message == EXPERIMENT_NOT_AUTHORIZED ){
                    message = 'Experimental password required';
                    experimentalPasswordForAutocomplete.setCustomValidity( message );
                }

                showMessage( message, RED, null, newSurveySubmitMessage );
            }
        } );

	    return false;
	};
    newSurveySubmitButton.onclick = newSurveySubmit;
    
