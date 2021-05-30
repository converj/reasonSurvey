
    // Find elements
    let newBudgetSubmitButton = document.getElementById('newBudgetSubmitButton');
    let newBudgetTitleInput = document.getElementById('newBudgetTitleInput');
    let newBudgetIntroInput = document.getElementById('newBudgetIntroInput');
    let newBudgetTotalInput = document.getElementById('newBudgetTotalInput');
    let newBudgetSubmitMessage = document.getElementById('newBudgetSubmitMessage');
    let newBudgetLoginRequiredCheckbox = document.getElementById('newBudgetLoginRequiredCheckbox');
    let experimentalPasswordForBudget = document.getElementById('experimentalPasswordForBudget');
    let hideReasonsForBudget = document.getElementById('hideReasonsForBudget');

        function
    newBudgetHandleLoad( experimentUrlFragment ){
        // Clear inputs
        newBudgetTitleInput.value = '';
        newBudgetIntroInput.value = '';
        newBudgetTotalInput.value = '';
        newBudgetLoginRequiredCheckbox.checked = false;
        experimentalPasswordForBudget.value = '';
        hideReasonsForBudget.checked = false;

        // Clear messsages
        newBudgetResetValidity();
        newBudgetSubmitMessage.innerHTML = '';

        // Show experimental options
        let experimentalInputsDiv = document.getElementById('experimentalInputsForBudget');
        experimentalInputsDiv.style.display = ( experimentUrlFragment == TRUE )?  'block'  :  'none';
        
        newBudgetHandleInput();
    }
    
        function
    newBudgetResetValidity( ){
        newBudgetTitleInput.setCustomValidity('');
        newBudgetIntroInput.setCustomValidity('');
        newBudgetTotalInput.setCustomValidity('');
        newBudgetLoginRequiredCheckbox.setCustomValidity('');
    }


    // Handle typing, to guide user to next input
        function
    newBudgetHandleInput( ){
        // Clear intro-validity if length is sufficient
        if ( newBudgetTitleInput.value.length + newBudgetIntroInput.value.length >= minLengthQuestion ){
            newBudgetTitleInput.setCustomValidity('');
            newBudgetIntroInput.setCustomValidity('');
        }

        // Clearn total-budget-validity if provided
        let totalInputNumber = ( newBudgetTotalInput.value ?  Number(newBudgetTotalInput.value)  :  0 );
        if ( totalInputNumber > 0 ){
            newBudgetTotalInput.setCustomValidity('');
        }

        fitTextAreaToText( newBudgetIntroInput );
    }
    newBudgetTitleInput.oninput = newBudgetHandleInput;
    newBudgetIntroInput.oninput = newBudgetHandleInput;


    newBudgetLoginRequiredCheckbox.onclick = function(){
        if ( newBudgetLoginRequiredCheckbox.checked  &&  ! requireLogin() ){  return;  }
    };


        function
    newBudgetExperimentalOptionsInput( ){
        if ( hideReasonsForBudget.checked  &&  (! experimentalPasswordForBudget.value) ){
            let message = 'Experimental password required';
            experimentalPasswordForBudget.setCustomValidity( message );
        }
        else {
            experimentalPasswordForBudget.setCustomValidity('');
            showMessage( '', GREY, null, newBudgetSubmitMessage );
        }
    }
    experimentalPasswordForBudget.oninput = newBudgetExperimentalOptionsInput;
    hideReasonsForBudget.onclick = newBudgetExperimentalOptionsInput;



    newBudgetTitleInput.onkeydown = function( event ){
        // ENTER key: focus introduction input
        if ( event.keyCode === KEY_CODE_ENTER ) {
            newBudgetIntroInput.focus();
            return false;
        }
    };
    newBudgetIntroInput.onkeydown = function( event ){
        // ENTER key: focus total-budget input
        if ( event.keyCode === KEY_CODE_ENTER ) {
            newBudgetTotalInput.focus();
            return false;
        }
    };
    newBudgetTotalInput.onkeydown = function( event ){
        // ENTER key: save answer and focus new-answer input
        if ( event.keyCode === KEY_CODE_ENTER ) {  
            event.preventDefault();
            newBudgetSubmit();
            return false;
        }
    };


    // Handle submit
        function
    newBudgetSubmit( ){

        // Check budget introduction length
        if ( newBudgetTitleInput.value.length + newBudgetIntroInput.value.length < minLengthBudgetIntro ){
            let message = 'Title and introduction is too short';
            showMessage( message, RED, 5000, newBudgetSubmitMessage );
            newBudgetResetValidity();
            newBudgetIntroInput.setCustomValidity( message );
            return false;
        }

        // Check budget total
        let totalInputNumber = ( newBudgetTotalInput.value ?  Number(newBudgetTotalInput.value)  :  0 );
        if ( totalInputNumber <= 0 ){
            let message = 'Budget total-amount must be a positive number';
            showMessage( message, RED, 5000, newBudgetSubmitMessage );
            newBudgetResetValidity();
            newBudgetTotalInput.setCustomValidity( message );
            return false;
        }

        // Require experiment-password for experiment-options like hide-reasons
        if ( hideReasonsForBudget.checked  &&  (! experimentalPasswordForBudget.value) ){
            let message = 'Experimental password required';
            showMessage( message, RED, null, newBudgetSubmitMessage );
            experimentalPasswordForBudget.setCustomValidity( message );
            return false;
        }


        // Check login
        if ( newBudgetLoginRequiredCheckbox.checked  &&  ! requireLogin() ){  return false;  }

        // Save via ajax
        showMessage( 'Saving budget...', GREY, null, newBudgetSubmitMessage );
        newBudgetResetValidity();
        let dataSend = {
            crumb:crumb , fingerprint:fingerprint ,
            title: newBudgetTitleInput.value ,
            introduction:newBudgetIntroInput.value ,
            total:newBudgetTotalInput.value ,
            loginRequired:newBudgetLoginRequiredCheckbox.checked ,
            experimentalPassword:experimentalPasswordForBudget.value , hideReasons:hideReasonsForBudget.checked
        };
        let url = '/budget/budgetNew';
        ajaxPost( dataSend, url, function(error, status, data){
            if ( ! error  &&  data  &&  data.success  &&  data.budget ){
                showMessage( 'Saved budget', GREEN, null, newBudgetSubmitMessage );
                // navigate to question view page
                setWholeFragment( {page:FRAG_PAGE_BUDGET_EDIT, link:data.linkKey.id} );
            }
            else {  
                let message = 'Failed to save budget.';

                if ( data  &&  data.message == TOO_SHORT ){
                    message = 'Budget introduction is too short.';
                    newBudgetIntroInput.setCustomValidity( message );
                }
                else if ( data  &&  data.message == EXPERIMENT_NOT_AUTHORIZED ){
                    message = 'Experimental password required';
                    experimentalPasswordForBudget.setCustomValidity( message );
                }

                showMessage( message, RED, null, newBudgetSubmitMessage );  
            }
        } );

	    return false;
	};
    newBudgetSubmitButton.onclick = newBudgetSubmit;
    
