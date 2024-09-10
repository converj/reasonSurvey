// Displays based on ElementWrap

// Multiple-question survey, where each question can have its own type & edit/view/results-state
// Each question-display can independenly retrieve and update its data (ajax-result to cached-struct to html) --
// except question-description and current-user's answers, which are mostly stored per survey


const ADMIN = 'admin';
const VIEW = 'view';
const RESULT = 'result';


/////////////////////////////////////////////////////////////////////////////////
// Empty display for information-only questions

        function
    InfoQuestionDisplay( questionId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)

        // Set initial HTML
        this.createFromHtml( questionId, '\n\n' + [
        ].join('\n') );
    }
    InfoQuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods

        InfoQuestionDisplay.prototype.
    dataUpdated = function( ){  };  // Update from data to HTML

        InfoQuestionDisplay.prototype.
    setMode = function( newMode ){  };

        InfoQuestionDisplay.prototype.
    setData = function( questionData ){  };

        InfoQuestionDisplay.prototype.
    focusInitialInput = function( ){  };

        InfoQuestionDisplay.prototype.
    retrieveData = function( ){  };



/////////////////////////////////////////////////////////////////////////////////
// Question display for edit / view / results

// Shows the header for a question (not collapsed), followed by type-specific question content

        function
    QuestionDisplay( questionId ){
        ElementWrap.call( this );  // Inherit member data

        // User-interface state variables (not persistent)
        this.mode = VIEW;
        this.typeSubdisplayId = questionId + '-inner';
        this.typeSubdisplay = new InfoQuestionDisplay( this.typeSubdisplayId );

        // Set initial HTML
        this.createFromHtml( questionId, '\n\n' + [
            ' <div class=Question id=Question> ',
            //  Message
            '   <div class="Message" id=QuestionMessage aria-live=polite></div> ',
            //  Edit / View / Results panels
            '   <div role=tabpanel id=modeTabPanel> ',
            //      Edit
            '       <div class=Edit> ',
            //          Position
            '           <div class=QuestionPositionWrap> ',
            '               <label for=QuestionPosition class=QuestionPositionLabel translate=yes> Position </label> ',
            '               <input type=number min=1 max=30 class=QuestionPositionInput id=QuestionPositionInput ',
            '                   required oninput=handlePositionInput /> ',
            '           </div> ',
            //          Type
            '           <div class=QuestionTypeWrap> ',
            '               <label for=QuestionTypeSelect class=QuestionTypeLabel translate=yes> Type </label> ',
            '               <select class=QuestionTypeSelect id=QuestionTypeSelect oninput=handleTypeChange> ',
            '                   <option translate=yes value="info"> Instructions </option> ',
            '                   <option translate=yes value="rate"> Rate </option> ',
            '                   <option translate=yes value="rank"> Rank </option> ',
            '                   <option translate=yes value="checklist"> Checklist </option> ',
            '                   <option translate=yes value="text"> Write-in </option> ',
            '                   <option translate=yes value="list"> List </option> ',
            '                   <option translate=yes value="budget"> Budget </option> ',
            '                   <option translate=yes value="proposal"> Proposal </option> ',
            '                   <option translate=yes value="solutions"> Request for Proposals </option> ',
            '                   <option translate=yes value="problems"> Request for Problems </option> ',
            '               </select> ',
            '           </div> ',
            //          Title
            '           <input type=text class=QuestionEditTitle id=QuestionEditTitle placeholder="Question title..." ',
            '               oninput=handleEditQuestionInput onblur=handleEditQuestionSave /> ',
            //          Detail
            '           <textarea class=QuestionEditDetail id=QuestionEditDetail placeholder="More instructions or information..." ',
            '               oninput=handleEditQuestionInput onblur=handleEditQuestionSave ></textarea> ',
                            ImageDisplay.prototype.htmlForImageEdit() ,
            '       </div> ',
            //      View
            '       <div class=View> ',
            '           <h3 class=QuestionTitle> <span id=QuestionPositionNumber></span>: <span id=QuestionTitle></span> </h3> ',
            '           <div class=QuestionDetail id=QuestionDetail></div> ',
                        ImageDisplay.prototype.htmlForImageView() ,
            '       </div> ',
            //      Results
            '       <div class=Result> ',
            '           <h3 class=QuestionTitle> <span id=QuestionPositionNumberResult></span>: <span id=QuestionTitleResult></span> </h3> ',
            '       </div> ',
            '   </div> ',
            //  Mode buttons for edit / view / results
            '   <div class=ModeButtons role=tablist> ',
            '       <button role=tab aria-controls=modeTabPanel class=EditButton title="Edit question" translate=yes onclick=handleEditClick> Edit </button> ',
            '       <button class=QuestionDeleteButton title="Delete question" translate=no onclick=handleQuestionDelete> X </button> ',
            '       <button role=tab aria-controls=modeTabPanel class=ViewButton title="View question" translate=yes onclick=handleViewClick> View </button> ',
            '       <button role=tab aria-controls=modeTabPanel class=ResultButton title="Question results" translate=yes onclick=handleResultClick> Result </button> ',
            '   </div> ',
            //  Question-type sub-display
            '   <div class=QuestionSubclass id=QuestionSubclass subdisplay=typeSubdisplay></div> ',
            ' </div> '
        ].join('\n') );
    }
    QuestionDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        QuestionDisplay.prototype.
    setInitialData = function( questionData, surveyDisplay ){
        this.surveyDisplay = surveyDisplay;
        this.setData( questionData );
        return this;
    };

        QuestionDisplay.prototype.
    setData = function( questionData, questionAnswer ){
        this.question = questionData;
        if ( this.typeSubdisplay ){  this.typeSubdisplay.setData( questionData, questionAnswer );  }
        this.dataUpdated();
    };


    // Update from data to HTML
        QuestionDisplay.prototype.
    dataUpdated = function( ){
        if ( (this.mode == EDIT) && (! this.surveyDisplay.survey.allowEdit) ){  this.mode = VIEW;  }  // Enforce editing permission
        this.typeSubdisplay.setMode( this.mode );

        this.messagesUpdated();
        this.attributesUpdated();
        this.imagesUpdated();

        // Edit
        this.setProperty( 'QuestionEditTitle', 'defaultValue', this.question.title );
        this.setProperty( 'QuestionEditDetail', 'defaultValue', this.question.detail );
        let questionEditDetail = this.getSubElement('QuestionEditDetail');
        setTimeout(  () => fitTextAreaToText( questionEditDetail ) , 100  );
        this.setProperty( 'QuestionPositionInput', 'value', this.positionInSurvey + 1 );
        this.setProperty( 'QuestionPositionInput', 'max', this.numQuestions );
        this.setProperty( 'QuestionPositionInput', 'disabled', !( this.question.id && this.isQuestionValid() ) );
        this.setProperty( 'QuestionTypeSelect', 'value', this.question.type );
        this.setProperty( 'QuestionTypeSelect', 'disabled', !( this.question.id && this.isQuestionValid() ) );

        // View
        this.setInnerHtml( 'QuestionTitle', this.question.title );
        this.setInnerHtml( 'QuestionDetail', storedTextToHtml(this.question.detail) );
        this.setInnerHtml( 'QuestionPositionNumber', this.positionInSurvey + 1 );

        // Result
        this.setInnerHtml( 'QuestionTitleResult', this.question.title );
        this.setInnerHtml( 'QuestionPositionNumberResult', this.positionInSurvey + 1 );

        // Question specialization sub-display
        if ( this.question.type == 'rate' ){
            if ( ! (this.typeSubdisplay instanceof RatingQuestionDisplay) ){
                this.typeSubdisplay = new RatingQuestionDisplay( this.typeSubdisplayId ).setInitialData( this.question, this, this.surveyDisplay );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        else if ( this.question.type == 'rank' ){
            if ( ! (this.typeSubdisplay instanceof RankingQuestionDisplay) ){
                this.typeSubdisplay = new RankingQuestionDisplay( this.typeSubdisplayId ).setInitialData( this.question, this, this.surveyDisplay );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        else if ( this.question.type == 'checklist' ){
            if ( ! (this.typeSubdisplay instanceof ChecklistQuestionDisplay) ){
                this.typeSubdisplay = new ChecklistQuestionDisplay( this.typeSubdisplayId ).setInitialData( this.question, this, this.surveyDisplay );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        else if ( this.question.type == 'text' ){
            if ( ! (this.typeSubdisplay instanceof TextQuestionDisplay) ){
                this.typeSubdisplay = new TextQuestionDisplay( this.typeSubdisplayId ).setInitialData( this.question, this, this.surveyDisplay );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        else if ( this.question.type == 'proposal' ){
            if ( ! (this.typeSubdisplay instanceof ProposalQuestionDisplay) ){
                this.typeSubdisplay = new ProposalQuestionDisplay( this.typeSubdisplayId ).setInitialData( this.question, this, this.surveyDisplay );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        else if ( this.question.type == 'budget' ){
            if ( ! (this.typeSubdisplay instanceof BudgetQuestionDisplay) ){
                this.typeSubdisplay = new BudgetQuestionDisplay( this.typeSubdisplayId ).setInitialData( this.question, this, this.surveyDisplay );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        else if ( this.question.type == 'list' ){
            if ( ! (this.typeSubdisplay instanceof ListQuestionDisplay) ){
                this.typeSubdisplay = new ListQuestionDisplay( this.typeSubdisplayId ).setInitialData( this.question, this, this.surveyDisplay );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        else if ( this.question.type == 'solutions' ){
            if ( ! (this.typeSubdisplay instanceof RequestSolutionsQuestionDisplay) ){
                this.typeSubdisplay = new RequestSolutionsQuestionDisplay( this.typeSubdisplayId ).setInitialData( this.question, this, this.surveyDisplay );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        else if ( this.question.type == 'problems' ){
            if ( ! (this.typeSubdisplay instanceof RequestProblemsQuestionDisplay) ){
                this.typeSubdisplay = new RequestProblemsQuestionDisplay( this.typeSubdisplayId ).setInitialData( this.question, this, this.surveyDisplay );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        else {  // Default to info-only question
            if ( ! (this.typeSubdisplay instanceof InfoQuestionDisplay) ){
                this.typeSubdisplay = new InfoQuestionDisplay( this.typeSubdisplayId );
                setChildren( this.getSubElement('QuestionSubclass'), [this.typeSubdisplay.element] );
            }
        }
        this.typeSubdisplay.dataUpdated();
    };

        QuestionDisplay.prototype.
    messagesUpdated = function( ){
        this.message = showMessageStruct( this.message, this.getSubElement('QuestionMessage') );
        this.getSubElement('QuestionEditDetail').setCustomValidity( this.questionValidity || '' );
    };

        QuestionDisplay.prototype.
    attributesUpdated = function( ){
        this.setAttribute( 'Question', 'mode', this.mode );
        this.setAttribute( 'Question', 'type', this.question.type );
    };


    /////////////////////////////////////////////////////////////////////////////////
    // Methods to get/set properties
    
        QuestionDisplay.prototype.
    setMode = function( newMode ){  this.mode = newMode;  this.typeSubdisplay.setMode( newMode );  this.dataUpdated();  };

        QuestionDisplay.prototype.
    allowInput = function( ){  return this.isQuestionValid() && ( ! this.isFrozen() );  };

        QuestionDisplay.prototype.
    isQuestionValid = function( ){  return !( this.questionTooShort || this.questionTooLong );  };

        QuestionDisplay.prototype.
    isFrozen = function( ){  return this.surveyDisplay && this.surveyDisplay.isFrozen();  };

        QuestionDisplay.prototype.
    setFocusAtFirstInput = function( ){
        let contentInput = this.getSubElement('QuestionEditTitle');
        contentInput.focus();
        contentInput.selectionStart = contentInput.value.length;
        contentInput.selectionEnd = contentInput.value.length;
    };

        QuestionDisplay.prototype.
    setFocusAtPositionInput = function( ){
        let positionInput = this.getSubElement('QuestionPositionInput');
        positionInput.focus();
    };

        QuestionDisplay.prototype.
    focusInitialInput = function( ){
        focusAtEnd( this.getSubElement('QuestionEditDetail') );
        this.typeSubdisplay.focusInitialInput();
    }

        QuestionDisplay.prototype.
    handleEditClick = function( ){  this.setMode( EDIT );  };

        QuestionDisplay.prototype.
    handleViewClick = function( ){  this.setMode( VIEW );  };

        QuestionDisplay.prototype.
    handleResultClick = function( ){  this.setMode( RESULT );  };

        QuestionDisplay.prototype.
    checkContentLength = function( ){
        // Update questionTooShort/Long
        this.handleEditQuestionInput();

        // Update validity
        if ( this.questionTooShort ){
            this.message = { color:RED, text:'Question is too short.' };
            this.questionValidity = this.message.text;
            this.dataUpdated();
        }
        if ( this.questionTooLong ){
            this.message = { color:RED, text:'Question is too long.' };
            this.questionValidity = this.message.text;
            this.dataUpdated();
        }
    };


    /////////////////////////////////////////////////////////////////////////////////
    // Methods to read/write to server
    // Sending ajax request can be done from either question or survey-display, but updated survey data should be merged in survey-display

        QuestionDisplay.prototype.
    handleTypeChange = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let questionTypeSelect = this.getSubElement('QuestionTypeSelect');
        let newType = questionTypeSelect.value;

        this.message = { color:GREY, text:'Saving question type...' };
        this.dataUpdated();
        this.surveyDisplay.changeQuestionType( this, newType );
    };

        QuestionDisplay.prototype.
    handlePositionInput = function( event ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // User may press up/down button a lot, so avoid up/down button jumping by delaying save to server & displaying changes
        if ( this.positionInputChangeTimer ){
            clearTimeout( this.positionInputChangeTimer );
            this.positionInputChangeTimer = null;
        }
        let thisCopy = this;
        this.positionInputChangeTimer = setTimeout( function(){
            // Check that input value is an integer, and changed
            let input = thisCopy.getSubElement('QuestionPositionInput');
            let inputChanged = ( input.getAttribute('defaultValue') != input.value );
            let newValue = parseInt( input.value );
            if ( newValue < input.min  ||  input.max < newValue  ||  newValue.toString() != input.value.trim() ){  newValue = null;  }
            if ( newValue ){  input.classList.remove('invalid');  } else {  input.classList.add('invalid');  }
            if ( ! newValue  ||  newValue < 1  ||  ! inputChanged ){  return;  }

            // Notify surveyDisplay to re-order question displays
            thisCopy.surveyDisplay.moveQuestion( thisCopy, newValue - 1 );

        } , 1000 );
    };

        QuestionDisplay.prototype.
    handleEditQuestionInput = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Resize details-input to fit content
        let questionEditTitle = this.getSubElement('QuestionEditTitle');
        let questionEditDetail = this.getSubElement('QuestionEditDetail');
        fitTextAreaToText( questionEditDetail );

        // Check whether new question content is long enough
        let newQuestionContent = questionEditTitle.value + questionEditDetail.value;
        let newQuestionTooShort = ( ! newQuestionContent )  ||  ( newQuestionContent.length < minLengthQuestion );
        let newQuestionTooLong = newQuestionContent && ( maxLengthQuestion < newQuestionContent.length );
        let oldQuestionTooShort = this.questionTooShort;
        let oldQuestionTooLong = this.questionTooLong;
        this.questionTooShort = newQuestionTooShort;
        this.questionTooLong = newQuestionTooLong;
        
        // If question is changing from too-short to long-enough... clear error messagess
        if ( (oldQuestionTooShort || oldQuestionTooLong)  &&  ! (newQuestionTooShort || newQuestionTooLong) ){
            this.message = { text:'' };
            this.questionValidity = '';
            this.dataUpdated();
        }
        else if ( ! (oldQuestionTooShort || oldQuestionTooLong)  &&  (newQuestionTooShort || newQuestionTooLong) ){
            this.dataUpdated();
        }
    };

        QuestionDisplay.prototype.
    handleEditQuestionSave = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        this.checkContentLength();
        if ( this.questionTooLong ){  return;  }

        let questionEditTitle = this.getSubElement('QuestionEditTitle');
        let questionEditDetail = this.getSubElement('QuestionEditDetail');

        // Check for question unchanged
        if ( (questionEditTitle.value + questionEditDetail.value) == (this.question.title + this.question.detail) ){  return;  }

        this.message = { color:GREY, text:'Saving changes...' };
        this.questionValidity = '';
        this.dataUpdated();
        this.surveyDisplay.editQuestionContent( this, questionEditTitle.value, questionEditDetail.value );
    };

        QuestionDisplay.prototype.
    handleQuestionDelete = function( ){
        if ( this.surveyDisplay.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        if ( ! confirm( translate('Delete this question?') )  ){  return;  }
    
        this.message = { color:GREY, text:'Deleting...' };
        this.questionValidity = '';
        this.dataUpdated();
        this.surveyDisplay.deleteQuestion( this );
    };


    QuestionDisplay.prototype.onInputImage = ImageDisplay.prototype.onInputImage;

    QuestionDisplay.prototype.onClickImageUpload = ImageDisplay.prototype.onClickImageUpload;

    QuestionDisplay.prototype.checkImage = ImageDisplay.prototype.checkImage;

        QuestionDisplay.prototype.
    onClickImageRemove = function( ){
        ImageDisplay.prototype.onClickImageRemove.call( this, this.question );
    };

        QuestionDisplay.prototype.
    storeImage = function( imageFile ){
        let formData = new FormData();
        formData.append( 'image', imageFile );

        let message = imageFile ?  'Saving image...'  :  'Removing image...';
        this.message = { color:GREY, text:message };
        this.messagesUpdated();

        // Send to server 
        const url = '/multi/setQuestionImage';
        formData.append( 'crumb', crumb );
        formData.append( 'fingerprint', fingerprint );
        formData.append( 'linkKey', this.surveyDisplay.link.id );
        formData.append( 'questionId', this.question.id );
        const defaultMessage = 'Failed to change image';
        let thisCopy = this;
        fetch( url, {method:'POST', body:formData} )
        .then( response => response.json() )
        .then( receiveData => {
            if ( receiveData  &&  receiveData.success  &&  receiveData.survey ){
                message = imageFile ?  'Saved image'  :  'Removed image';
                thisCopy.message = { color:GREEN, text:message, ms:5000 };
                thisCopy.messagesUpdated();
                thisCopy.surveyDisplay.setSurveyData( receiveData.survey );
            }
            else {
                let message = defaultMessage;
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit question created by someone else';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has answers';  }
                    else if ( receiveData.message == TOO_LONG ){  message = 'Image is too large';  }
                }
                thisCopy.message = { color:RED, text:message };
                thisCopy.messagesUpdated();
            }
        } )
        .catch( error => {
            thisCopy.message = { color:RED, text:defaultMessage };
            thisCopy.messagesUpdated();
        } );
    };

        QuestionDisplay.prototype.
    imagesUpdated = function( ){
        ImageDisplay.prototype.imagesUpdated.call( this, this.question );
    };




/////////////////////////////////////////////////////////////////////////////////
// Survey display for edit / admin / view

        function
    SurveyDisplay( displayId ){
        ElementWrap.call( this );  // Inherit member-data

        // User-interface state variables (not persistent data)
        this.linkValid = true;
        this.mode = VIEW;
        this.newQuestionCount = 0;
        let thisCopy = this;
        this.questions = { data:[] , displays:[] , creator:(questionData)=>thisCopy.createQuestionDisplay(questionData) };
        
        this.createFromHtml( displayId, '\n\n' + [
            ' <h1 class=title translate=yes> Survey </h1> ',
            ' <div class=MultiQuestionSurvey id=Survey> ',
            //  New survey
            //  Use a separate form & save/cancel-buttons to enter new-survey, or whenever creating new records
            //  This is most necessary when creating a new record in a collection, where a temporary display causes problems re-ordering & deleting
            //  Hides survey view/edit/result buttons, freeze, new-question form until survey is created
            '   <div class=NewMultiQuestionSurvey id=NewMultiQuestionSurvey> ',
            '       <h2 translate=yes> New Survey </h2> ',
            '       <label for=NewSurveyTitleInput translate=yes> Survey Title </label> ',
            '       <input type=text class=NewSurveyTitleInput id=NewSurveyTitleInput placeholder="..." oninput=onNewSurveyInput /> ',
            '       <label for=NewSurveyDetailInput translate=yes> Survey Introduction </label> ',
            '       <textarea class=NewSurveyDetailInput id=NewSurveyDetailInput placeholder="Background information about survey..." oninput=onNewSurveyInput ></textarea> ',
            '       <div class=SaveOrCancelButtons> ',
            '           <button class=SaveButton id=SaveButton translate=yes onclick=onNewSurveySaveClick translate=yes> Continue </button> ',
            '           <button class=CancelButton id=CancelButton translate=yes onclick=onNewSurveyCancelClick translate=yes> Cancel </button> ',
            '       </div> ',
            '       <div class=Message id=messageForNewSurvey aria-live=polite></div> ',
            '   </div> ',
            //  Existing survey
            '   <div class=SavedMultiQuestionSurvey> ',
            '       <div class="Message SurveyLinkMessage" id=SurveyLinkMessage aria-live=polite translate=yes></div> ',
            '       <div class=loginStatus id=loginStatus translate=yes></div> ',
            '       <div class=frozenStatus id=frozenStatus translate=yes></div> ',
            '       <div class=ModeButtons role=tablist> ',
            '           <button role=tab aria-controls=modeTabPanel class=AdminButton title="Administrate survey" translate=yes onclick=handleAdminClick> Administrate </button> ',
            '           <button role=tab aria-controls=modeTabPanel class=EditButton title="Edit survey" translate=yes onclick=handleEditClick> Edit </button> ',
            '           <button role=tab aria-controls=modeTabPanel class=ViewButton title="View survey" translate=yes onclick=handleViewClick> View </button> ',
            '       </div> ',
            '       <div role=tabpanel id=modeTabPanel> ',
            //          Admin
            '           <div class=Admin> ',
            '               <h2 id=SurveyTitleAdmin></h2> ',
            '               <div> You can share this survey webpage\'s URL with participants. </div> ',
            '               <div class=hideReasonsStatus id=hideReasonsStatus translate=yes></div> ',
            '               <div id=freezeUserInput class=freezeUserInput> ',
            '                   <label for=freezeUserInputCheckbox oninput=clickFreeze translate=yes> Freeze user input </label> ',
            '                   <input id=freezeUserInputCheckbox type=checkbox oninput=clickFreeze /> ',
            '                   <div id=freezeMessage class=Message></div> ',
            '               </div> ',
            '           </div> ',
            //          Edit
            '           <div class=Edit> ',
            '               <label for=SurveyTitleInput translate=yes> Survey title </label> ',
            '               <input type=text class="SurveyEditInput SurveyTitleInput" id=SurveyTitleInput placeholder="title..." ',
            '                   oninput=checkSurveyDescription onblur=handleEditSurveySave /> ',
            '               <label for=SurveyDetailInput translate=yes> Survey details </label> ',
            '               <textarea class=SurveyEditInput id=SurveyDetailInput placeholder="introduction..." ',
            '                   oninput=onEditDetailInput onblur=handleEditSurveySave></textarea> ',
            '           </div> ',
            //          View
            '           <div class=View> ',
            '               <h2 id=SurveyTitleView></h2> ',
            '               <div id=SurveyDetailView></div> ',
            '           </div> ',
            //          Result
            '       </div> ',
            '   </div> ',
            '   <div class=Message id=message aria-live=polite></div> ',
            //  Questions
            '   <div class=Questions id=Questions subdisplays=questions ></div> ',
            '   <div class=NewQuestion> ',
            '       <h3 translate=yes> New question </h3> ',
            '       <label for=NewQuestionTitleInput translate=yes> Title </label> ',
            '       <input type=text class=NewQuestionTitleInput id=NewQuestionTitleInput placeholder="..." ',
            '           oninput=handleNewQuestionInput /> ',
            '       <div class=QuestionTypeWrap style="float:none;"> ',
            '           <label for=QuestionTypeSelect class=QuestionTypeLabel translate=yes> Type </label> ',
            '           <select class=QuestionTypeSelect id=QuestionTypeSelect> ',
            '               <option translate=yes value="info"> Instructions </option> ',
            '               <option translate=yes value="rate"> Rate </option> ',
            '               <option translate=yes value="rank"> Rank </option> ',
            '               <option translate=yes value="checklist"> Checklist </option> ',
            '               <option translate=yes value="text"> Write-in </option> ',
            '               <option translate=yes value="list"> List </option> ',
            '               <option translate=yes value="budget"> Budget </option> ',
            '               <option translate=yes value="proposal"> Proposal </option> ',
            '               <option translate=yes value="solutions"> Request for Proposals </option> ',
            '               <option translate=yes value="problems"> Request for Problems </option> ',
            '           </select> ',
            '       </div> ',
            '       <div class=SaveOrCancelButtons> ',
            '           <button class=SaveButton id=SaveButton translate=yes onclick=handleNewQuestionSaveClick> Continue </button> ',
            '           <button class=CancelButton id=CancelButton translate=yes onclick=handleNewQuestionCancelClick> Cancel </button> ',
            '       </div> ',
            '       <div class=Message id=messageForNewQuestion aria-live=polite></div> ',
            '   </div> ',
            //  Admin change history
            '   <details class=adminHistory id=adminHistory> ',
            '       <summary class=adminHistoryLast id=adminHistoryLast></summary> ',
            '       <div class=adminHistoryFull id=adminHistoryFull></div> ',
            '   </details> ',
            ' </div> '
        ].join('\n') );

        // Auto-focus on setting survey title
        setTimeout( () =>{ this.getSubElement('NewSurveyTitleInput').focus(); } , 1000 );
    }
    SurveyDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        SurveyDisplay.prototype.
    setInitialData = function( surveyData, linkData ){
        this.link = linkData;
        this.setSurveyData( surveyData );
        this.answers = [];
        return this;
    };

    // Merging ajax-results into browser survey-struct should only be done in 1 place, the survey-display, here
        SurveyDisplay.prototype.
    setSurveyData = function( surveyData ){
        this.survey = surveyData;
        this.dataUpdated();
    };

        SurveyDisplay.prototype.
    setAnswerData = function( answerData ){
        this.answers = answerData;
        this.dataUpdated();
    };

    // Update data to html
        SurveyDisplay.prototype.
    dataUpdated = function( ){
        let thisCopy = this;
        this.newSurveyDetailInput = this.getSubElement('NewSurveyDetailInput');
        this.questionTypeSelect = this.getSubElement('QuestionTypeSelect');

        if ( (! this.survey.allowEdit)  &&  (! this.survey.mode == ADMIN) ){  this.mode = VIEW;  }   // Enforce editing permission

        // Show messages
        if ( this.link  &&  this.linkValid ) {
            // No message necessary
        }
        else {
            this.linkMessage = { color:RED, text:'Invalid link' };
            this.linkMessage = showMessageStruct( this.linkMessage, this.getSubElement('SurveyLinkMessage') );
        }

        this.message = showMessageStruct( this.message, this.getSubElement('message') );
        this.getSubElement('SurveyTitleInput').setCustomValidity( this.surveyTitleValidity? this.surveyTitleValidity : '' );
        this.getSubElement('SurveyDetailInput').setCustomValidity( this.surveyDetailValidity? this.surveyDetailValidity : '' );

        this.messageForNewSurvey = showMessageStruct( this.messageForNewSurvey, this.getSubElement('messageForNewSurvey') );
        this.getSubElement('NewSurveyDetailInput').setCustomValidity( this.newSurveyDetailValidity || '' );

        this.messageForNewQuestion = showMessageStruct( this.messageForNewQuestion, this.getSubElement('messageForNewQuestion') );
        this.getSubElement('NewQuestionTitleInput').setCustomValidity( this.newQuestionTitleValidity || '' );

        if ( this.link.loginRequired ){
            this.setInnerHtml( 'loginStatus', 'Voter login required' );
        }

        // Show freeze message & checkbox
        this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeMessage') );
        this.setInnerHtml( 'frozenStatus' , (this.isFrozen() ? 'Frozen' : '') );
        this.getSubElement( 'freezeUserInputCheckbox' ).checked = this.isFrozen();

        // Set attributes
        this.setAttribute( 'Survey', 'saved' , (this.isSaved()? TRUE : FALSE) );
        this.setAttribute( 'Survey', 'frozen' , (this.isFrozen() ? TRUE : null) );
        this.setAttribute( 'Survey', 'allowedit', (this.survey.allowEdit ? TRUE : FALSE) );
        this.setAttribute( 'Survey', 'mine', (this.survey.mine ? TRUE : FALSE) );
        this.setAttribute( 'Survey', 'mode', this.mode );
        // Hide new-question form except for title-input, until user starts entering question-title
        this.setAttribute( 'Survey', 'hasNewQuestionInput', (this.hasNewQuestionInput ? TRUE : FALSE) );

        // Show content
        this.setInnerHtml( 'SurveyTitleAdmin', this.survey.title );
        this.setProperty( 'SurveyTitleInput', 'defaultValue', this.survey.title );
        this.setInnerHtml( 'SurveyTitleView', this.survey.title );
        this.setProperty( 'SurveyDetailInput', 'defaultValue', this.survey.detail );
        let surveyDetailInput = this.getSubElement('SurveyDetailInput');
        setTimeout(  () => fitTextAreaToText( surveyDetailInput ) , 100  );
        setTimeout(  () => fitTextAreaToText( thisCopy.newSurveyDetailInput ) , 100  );
        this.setInnerHtml( 'SurveyDetailView', storedTextToHtml(this.survey.detail) );

        displayAdminHistory( this.survey.adminHistory, this.getSubElement('adminHistoryLast'), this.getSubElement('adminHistoryFull') );

        // Rely on ElementWrap to detect missing question displays, create display, order displays, and add to DOM
        this.questions.data = this.survey.questions;
        this.questions.data.forEach( q => q.key = q.key || String(q.id) );  // Ensure each data has a key string, derived from id
        this.updateSubdisplays( this.questions, this.getSubElement('Questions') );  // Specify which subdisplay data goes into which sub-element
        // Update each sub-display
        let numQuestions = ( this.survey && this.survey.questions )?  this.survey.questions.length  :  0;
        this.questions.displays.forEach(  (d, i) => { 
            d.positionInSurvey=i;
            d.numQuestions=numQuestions;
            d.setData( thisCopy.questions.data[i], thisCopy.answers[d.key] );
            d.dataUpdated(); 
        }  );

        translateScreen();
    };

        SurveyDisplay.prototype.
    createQuestionDisplay = function( questionData ){
        return new QuestionDisplay( 'question-' + questionData.id ).setInitialData( questionData, this );
    };



        SurveyDisplay.prototype.
    isSaved = function( ){  return this.survey  &&  this.survey.id  &&  (this.survey.id != 'new');  };

        SurveyDisplay.prototype.
    isFrozen = function( ){  return this.survey && this.survey.freezeUserInput;  };

        SurveyDisplay.prototype.
    confirmUseSuggestion = function( ){
        if ( this.confirmedUseSuggestion ){  return true;  }
        let response = confirm( translate('Clicking this suggestion will replace your answer.') );
        this.confirmedUseSuggestion = true;
        return response;
    };

        SurveyDisplay.prototype.
    handleEditClick = function( ){  this.mode = EDIT;  this.dataUpdated();  };

        SurveyDisplay.prototype.
    handleAdminClick = function( ){  this.mode = ADMIN;  this.dataUpdated();  };

        SurveyDisplay.prototype.
    handleViewClick = function( ){  this.mode = VIEW;  this.dataUpdated();  };

        SurveyDisplay.prototype.
    scrollToQuestion = function( questionId ){
        this.questions.displays.forEach(  q  => { if ( q.question.id == questionId ){scrollToHtmlElement(q.element);} }  );
    };


        SurveyDisplay.prototype.
    incrementWordCounts = function( suggestion ){  
        if ( ! this.wordToCount ){  this.wordToCount = { };  }
        return incrementWordCounts( suggestion, this.wordToCount );
    };

        SurveyDisplay.prototype.
    wordMatchScore = function( input, suggestion ){
        if ( ! this.wordToCount ){  return 0;  }
        return wordMatchScore( input, suggestion, this.wordToCount );
    };



        SurveyDisplay.prototype.
    onNewSurveyCancelClick = function( ){
        this.getSubElement('NewSurveyTitleInput').value = '';
        this.getSubElement('NewSurveyDetailInput').value = '';
        this.messageForNewSurvey = { text:'' };
        this.newSurveyDetailValidity = '';
        this.dataUpdated();
    };

        SurveyDisplay.prototype.
    onNewSurveyInput = function( ){
        fitTextAreaToText( this.getSubElement('NewSurveyDetailInput') );
        this.checkNewSurveyDescription();
    };

        SurveyDisplay.prototype.
    checkNewSurveyDescription = function( ){
        if ( this.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInput = this.getSubElement('NewSurveyTitleInput');
        let detailInput = this.getSubElement('NewSurveyDetailInput');

        // Check whether survey description is long enough
        let oldDescriptionTooShort = this.newSurveyDescriptionTooShort;
        let oldDescriptionTooLong = this.newSurveyDescriptionTooLong;
        let description = titleInput.value + detailInput.value;
        this.newSurveyDescriptionTooShort =  description  &&  ( description.length < minLengthSurveyIntro );
        this.newSurveyDescriptionTooLong =  description  &&  ( maxLengthSurveyIntro < description.length );
        
        // If survey description is changing from too-short to long-enough... clear error messagess
        if ( (oldDescriptionTooShort || oldDescriptionTooLong)  &&  ! (this.newSurveyDescriptionTooShort || this.newSurveyDescriptionTooLong) ){
            this.messageForNewSurvey = { text:'' };
            this.newSurveyDetailValidity = '';
            this.dataUpdated();
        }
    };

        SurveyDisplay.prototype.
    onNewSurveySaveClick = function( ){
        if ( this.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInput = this.getSubElement('NewSurveyTitleInput');
        let detailInput = this.getSubElement('NewSurveyDetailInput');

        // Check whether survey description is long enough
        let description = titleInput.value + detailInput.value;
        this.surveyDescriptionTooShort = ( ! description )  ||  ( description.length < minLengthSurveyIntro );
        if ( this.surveyDescriptionTooShort ){
            this.messageForNewSurvey = { color:RED, text:'Survey description is too short' };
            this.newSurveyDetailValidity = this.messageForNewSurvey.text;
            this.dataUpdated();
            return;
        }

        this.saveSurvey( titleInput.value, detailInput.value );
    };



        SurveyDisplay.prototype.
    clickFreeze = function( ){
        if ( this.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        // Update freeze message
        let freezeCheckbox = this.getSubElement('freezeUserInputCheckbox');
        let freeze = freezeCheckbox.checked;
        this.freezeMessage = {  color:GREY , text:(freeze ? 'Freezing' : 'Unfreezing')  };
        this.dataUpdated();

        // Save via ajax
        this.dataUpdated();
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.link.id , 
            freeze:freeze
        };
        let url = '/multi/freezeSurvey';
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'SurveyDisplay.clickFreeze()', 'error=', error, 'status=', status, 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                thisCopy.freezeMessage = { color:GREEN , text:(freeze ? 'Froze' : 'Thawed') + ' survey' , ms:7000 };
                thisCopy.survey.freezeUserInput = receiveData.survey.freezeUserInput;
            }
            else {
                message:'Failed to ' + (freeze ? 'freeze' : 'unfreeze') + ' survey';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot ' +  (freeze ? 'freeze' : 'unfreeze') + ' survey created by someone else';  }
                }
                thisCopy.freezeMessage = { color:RED , text:'Failed to ' + (freeze ? 'freeze' : 'unfreeze') + ' survey' , ms:7000 };
            }
            thisCopy.dataUpdated();
        } );
    };


        SurveyDisplay.prototype.
    checkSurveyDescription = function( ){
        if ( this.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInput = this.getSubElement('SurveyTitleInput');
        let detailInput = this.getSubElement('SurveyDetailInput');

        // Check whether survey description is long enough
        let oldDescriptionTooShort = this.surveyDescriptionTooShort;
        let description = titleInput.value + detailInput.value;
        this.surveyDescriptionTooShort = ( ! description )  ||  ( description.length < minLengthSurveyIntro );
        
        // If question is changing from too-short to long-enough... clear error messagess
        if ( oldDescriptionTooShort  &&  ! this.surveyDescriptionTooShort ){
            this.message = { text:'' };
            this.surveyDetailValidity = '';
            this.dataUpdated();
        }
    };

        SurveyDisplay.prototype.
    onEditDetailInput = function( ){
        if ( this.link.loginRequired  &&  ! requireLogin() ){  return false;  }
        let detailInput = this.getSubElement('SurveyDetailInput');
        fitTextAreaToText( detailInput );
        this.checkSurveyDescription();
    };


        SurveyDisplay.prototype.
    handleNewQuestionCancelClick = function( ){
        this.getSubElement('NewQuestionTitleInput').value = '';
        this.questionTypeSelect.value = 'info';
        this.hasNewQuestionInput = false;
        this.messageForNewQuestion = { text:'' };
        this.newQuestionDetailValidity = '';
        this.dataUpdated();
    };

        SurveyDisplay.prototype.
    handleNewQuestionInput = function( ){
        this.hasNewQuestionInput = Boolean( this.getSubElement('NewQuestionTitleInput').value );
        this.setAttribute( 'Survey', 'hasNewQuestionInput', (this.hasNewQuestionInput ? TRUE : FALSE) );
        this.checkNewQuestionDescription();
    };

        SurveyDisplay.prototype.
    checkNewQuestionDescription = function( ){
        if ( this.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInput = this.getSubElement('NewQuestionTitleInput');

        // Check whether question description is long enough
        let oldDescriptionTooShort = this.newQuestionDescriptionTooShort;
        let oldDescriptionTooLong = this.newQuestionDescriptionTooLong;
        let description = titleInput.value;
        this.newQuestionDescriptionTooShort =  description  &&  ( description.length < minLengthSurveyIntro );
        this.newQuestionDescriptionTooLong =  description  &&  ( maxLengthSurveyIntro < description.length );
        
        // If question is changing from too-short to long-enough... clear error messagess
        if ( (oldDescriptionTooShort || oldDescriptionTooLong)  &&  ! (this.newQuestionDescriptionTooShort || this.newQuestionDescriptionTooLong) ){
            this.messageForNewQuestion = { text:'' };
            this.newQuestionDetailValidity = '';
            this.dataUpdated();
        }
    };


        SurveyDisplay.prototype.
    handleNewQuestionSaveClick = function( ){
        if ( this.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInput = this.getSubElement('NewQuestionTitleInput');

        // Check for question too long/short
        this.checkNewQuestionDescription();
        if ( this.newQuestionDescriptionTooShort ){
            this.messageForNewQuestion = { color:RED, text:'Question is too short' };
            this.newQuestionDetailValidity = this.messageForNewQuestion.text;
            this.dataUpdated();
            return;
        }
        if ( this.newQuestionDescriptionTooLong ){
            this.messageForNewQuestion = { color:RED, text:'Question is too long' };
            this.newQuestionDetailValidity = this.messageForNewQuestion.text;
            this.dataUpdated();
            return;
        }

        // Save to server
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.link.id ,
            title:titleInput.value , detail:'' , type:this.questionTypeSelect.value
        };
        let url = '/multi/addQuestion';
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            console.log( 'SurveyDisplay.handleNewQuestionSaveClick()', 'error=', error, 'receiveData=', receiveData );
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey  &&  receiveData.newQuestion ){

                thisCopy.handleNewQuestionCancelClick();
                thisCopy.setSurveyData( receiveData.survey );

                // Put new question-display in edit-mode, set and focus input
                let questionDisplay = thisCopy.questions.displays[ thisCopy.questions.displays.length - 1 ];
                questionDisplay.message = { color:GREEN, text:'Question created' };
                questionDisplay.setMode( EDIT );
                questionDisplay.focusInitialInput();
            }
            else {
                let message = 'Failed to add question';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit survey created by someone else';  }
                    if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit survey that already has answers';  }
                    if ( receiveData.message == TOO_MANY_QUESTIONS ){  message = 'Survey has too many questions';  }
                }
                thisCopy.messageForNewQuestion = { color:RED, text:message };
                thisCopy.dataUpdated();
            }
        } );
    };


        SurveyDisplay.prototype.
    retrieveData = function( ){
        // Request from server
        let thisCopy = this;
        let sendData = { surveyId:this.survey.id };
        let url = '/multi/getSurvey/' + this.link.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            console.log( 'SurveyDisplay.retrieveData() error=', error, 'status=', status, 'receiveData=', receiveData );
            if ( receiveData ){
                if ( receiveData.success ){
                    thisCopy.linkValid = Boolean( receiveData.survey );
                    if ( receiveData.survey ){
                        thisCopy.setSurveyData( receiveData.survey );
                    }
                    if ( receiveData.link ){
                        thisCopy.link = receiveData.link;
                    }
                    thisCopy.dataUpdated();

                    // Auto-focus on creating first question
                    if ( (! thisCopy.retrieved)  &&  isEmpty(thisCopy.survey.questions) ){
                        thisCopy.retrieved = true;
                        setTimeout( () =>{ thisCopy.getSubElement('NewQuestionTitleInput').focus(); } , 1000 );
                    }

                    // Retrieve questions specialized data
                    thisCopy.questions.displays.forEach(  d => { d.typeSubdisplay.retrieveData();  d.checkContentLength(); }  );

                    // Retrieve user answers
                    if ( ! crumb ){  return;  }   // Require that user cookie is present
                    let sendData = { crumb:crumb , fingerprint:fingerprint , linkKey:thisCopy.link.id };
                    let url = '/multi/userAnswers/' + thisCopy.link.id;
                    ajaxGet( sendData, url, function(error, status, receiveData){
                        if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.answers ){
                            thisCopy.answers = receiveData.answers;
                            thisCopy.retrievedAnswers = true;  // Prevent redundant retrieveData() calls upon startup
                        } else {
                            let message = "Could not retrieve user's answers";
                            thisCopy.message = { color:RED, text:message };
                        }
                        thisCopy.dataUpdated();
                    } );

                }
                else if ( receiveData.message == BAD_LINK ){
                    thisCopy.linkValid = false;
                    thisCopy.dataUpdated();
                }
            }
        } );
    };
    
    
        SurveyDisplay.prototype.
    handleEditSurveySave = function( ){
        if ( this.link.loginRequired  &&  ! requireLogin() ){  return false;  }

        let titleInput = this.getSubElement('SurveyTitleInput');
        let detailInput = this.getSubElement('SurveyDetailInput');
        if ( (titleInput.value == this.survey.title) && (detailInput.value == this.survey.detail) ){  return;  }

        // Check whether survey description is long enough
        let description = titleInput.value + detailInput.value;
        this.surveyDescriptionTooShort = ( ! description )  ||  ( description.length < minLengthSurveyIntro );
        if ( this.surveyDescriptionTooShort ){
            this.message = { color:RED, text:'Survey description is too short' };
            this.surveyDetailValidity = this.message.text;
            this.dataUpdated();
            return;
        }

        // Check whether description is unchanged
        if ( (titleInput.value == this.survey.title)  &&  (detailInput.value == this.survey.detail) ){
            return;
        }

        this.saveSurvey( titleInput.value, detailInput.value );
    };

        SurveyDisplay.prototype.
    saveSurvey = function( titleInputValue, detailInputValue ){
        // Save via ajax
        this.message = { color:GREY, text:'Saving changes...' };
        this.surveyDetailValidity = '';
        this.dataUpdated();
        let sendData = { 
            crumb:crumb , fingerprint:fingerprint , linkKey:this.link.id , 
            title:titleInputValue , detail:detailInputValue
        };
        let url = '/multi/editSurvey';
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            // Success
            if ( ! error  &&  receiveData  &&  receiveData.success ){
                thisCopy.message = { color:GREEN, text:'Saved survey', ms:7000 };
                thisCopy.surveyDetailValidity = '';
                thisCopy.dataUpdated();
                // Update data
                thisCopy.setSurveyData( receiveData.survey );
                thisCopy.link = receiveData.link;
                setFragmentFields( {link:receiveData.link.id} );
                thisCopy.dataUpdated();
                return;
            } else {
                // Show error message
                let message = 'Failed to save survey';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Survey is too short';  }
                    else if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit survey created by someone else';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit survey that already has answers';  }
                }
                if ( thisCopy.isSaved() ){
                    thisCopy.message = { color:RED, text:message };
                    thisCopy.surveyDetailValidity = message;
                } else {
                    thisCopy.messageForNewSurvey = { color:RED, text:message };
                    thisCopy.newSurveyDetailValidity = message;
                }
                thisCopy.dataUpdated();
            }
        } );
    };

    
        SurveyDisplay.prototype.
    editQuestionContent = function( questionDisplay, title, detail ){
        let thisCopy = this;
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.link.id ,
            questionId:questionDisplay.question.id , title:title, detail:detail
        };
        let url = '/multi/editQuestion';
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                questionDisplay.message = { color:GREEN, text:'Saved question', ms:5000 };
                questionDisplay.questionValidity = '';
                questionDisplay.dataUpdated();
                thisCopy.setSurveyData( receiveData.survey );
            }
            else {
                let message = 'Failed to save question.';
                if ( receiveData ){
                    if ( receiveData.message == TOO_SHORT ){  message = 'Question is too short.';  }
                    if ( receiveData.message == TOO_LONG ){  message = 'Question is too long.';  }
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit question created by someone else';  }
                    if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has answers';  }
                }
                questionDisplay.message = { color:RED, text:message };
                questionDisplay.questionValidity = message;
                questionDisplay.dataUpdated();
            }
        } );
    };


        SurveyDisplay.prototype.
    changeQuestionType = function( questionDisplay, newType ){
        let url = '/multi/changeQuestionType';
        let sendData = {
            linkKey:this.link.id , crumb:crumb , fingerprint:fingerprint ,
            questionId:questionDisplay.question.id , type:newType
        };
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                // Update data
                questionDisplay.message = { color:GREEN , text:'Saved question type' , ms:5000 };
                questionDisplay.dataUpdated();
                thisCopy.setSurveyData( receiveData.survey );
                thisCopy.dataUpdated();
            }
            else {
                let message = 'Failed to save question type.';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit question created by someone else';  }
                    else if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has answers';  }
                }
                questionDisplay.message = { color:RED, text:message };
                questionDisplay.dataUpdated();
            }
        } );
    }


        SurveyDisplay.prototype.
    moveQuestion = function( focusedQuestionDisplay, newQuestionIndex ){
        focusedQuestionDisplay.message = { color:GREY, text:'Moving question...' };
        focusedQuestionDisplay.questionValidity = '';
        focusedQuestionDisplay.dataUpdated();

        // Save to server
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.link.id , 
            questionId:focusedQuestionDisplay.question.id , newIndex:newQuestionIndex
        };
        let url = '/multi/reorderSurveyQuestions';
        let thisCopy = this;
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success ){

                focusedQuestionDisplay.message = { color:GREEN, text:'Saved question order', ms:7000 };
                focusedQuestionDisplay.questionValidity = '';
                focusedQuestionDisplay.dataUpdated();
                thisCopy.setSurveyData( receiveData.survey );
                scrollToHtmlElement( focusedQuestionDisplay.element );
                focusedQuestionDisplay.setFocusAtPositionInput();
            }
            else {
                let message = 'Failed to save question order';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit survey created by someone else';  }
                    if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has answers';  }
                }
                focusedQuestionDisplay.message = { color:RED, text:message };
                focusedQuestionDisplay.questionValidity = message;
                focusedQuestionDisplay.dataUpdated();
            }
        } );
    };


        SurveyDisplay.prototype.
    deleteQuestion = function( questionDisplay ){
        // Save to server
        let thisCopy = this;
        let url = '/multi/deleteQuestion';
        let sendData = {
            crumb:crumb , fingerprint:fingerprint , linkKey:this.link.id ,
            questionId:questionDisplay.question.id
        };
        ajaxPost( sendData, url, function(error, status, receiveData){
            if ( ! error  &&  receiveData  &&  receiveData.success  &&  receiveData.survey ){
                questionDisplay.message = { color:GREEN, text:'Saved question', ms:3000 };
                thisCopy.setSurveyData( receiveData.survey );
            }
            else {
                let message = 'Failed to delete question';
                if ( receiveData ){
                    if ( receiveData.message == NOT_OWNER ){  message = 'Cannot edit question created by someone else';  }
                    if ( receiveData.message == HAS_RESPONSES ){  message = 'Cannot edit question that already has votes';  }
                }
                questionDisplay.message = { color:RED, text:message };
                questionDisplay.dataUpdated();
            }
        } );
    };

