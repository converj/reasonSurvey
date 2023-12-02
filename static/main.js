// Script for main single-webpage app
// Mostly changes which sub-page is displayed, and initializes data-structures used by the app


////////////////////////////////////////////////////////////////////////////////
// Constants

const FRAG_PAGE_MULTI_QUESTION_SURVEY = 'multi';

const FRAG_PAGE_ID_NEW_REQUEST = 'newRequest';
const FRAG_PAGE_ID_NEW_PROPOSAL = 'newProposal';
const FRAG_PAGE_ID_REQUEST = 'request';
const FRAG_PAGE_ID_PROPOSAL_FROM_REQUEST = 'proposalFromRequest';
const FRAG_PAGE_ID_PROPOSAL = 'proposal';
const FRAG_PAGE_ID_RECENT = 'recent';
const FRAG_PAGE_TO_INFO = {
    glossary:{ div:'pageGlossary', title:'Terminology' } ,
    apps:{ div:'pageCivicApps', title:'Civic Participation Applications' } ,
};

const FRAG_PAGE_NEW_AUTOCOMPLETE = 'newAutocomplete';
const FRAG_PAGE_EDIT_AUTOCOMPLETE = 'editAutocomplete';
const FRAG_PAGE_VIEW_AUTOCOMPLETE = 'autocomplete';
const FRAG_PAGE_AUTOCOMPLETE_RESULTS = 'results';
const FRAG_PAGE_QUESTION_RESULTS = 'questionResults';

const FRAG_PAGE_BUDGET_NEW    = 'budgetNew';
const FRAG_PAGE_BUDGET_EDIT   = 'budgetEdit';
const FRAG_PAGE_BUDGET_VIEW   = 'budget';
const FRAG_PAGE_BUDGET_RESULT = 'budgetResult';
const FRAG_PAGE_BUDGET_SLICE_RESULT = 'budgetSliceResult';
const DIV_ID_BUDGET_NEW  = 'pageBudgetNew';
const DIV_ID_BUDGET_EDIT = 'pageBudgetEdit';
const DIV_ID_BUDGET_VIEW = 'pageBudgetView';
const DIV_ID_BUDGET_RESULTS = 'pageBudgetResult';

const FRAG_PAGE_ID_HOME = 'home';
const FRAG_PAGE_ID_ABOUT = 'about';



////////////////////////////////////////////////////////////////////////////////
// Global variables

let reqPropData = null;
let proposalData = null;

let topDisp = null;  // Only for debugging
let surveyResultsDisplay = null;  // Cache whole display, because it contains several separate fields: questions, questionIds, survey

let loginRequestKey = null;

let app = { };  // Global data for the app.  All the global-variables above should move inside app-object.

clearData();


////////////////////////////////////////////////////////////////////////////////
// Handle page changes

$(document).ready( function(){

    console.log('Document ready');
    
    // Show initial page, before cookie set
    window.onhashchange();
    requestInitialCookie( function(){
        updateMenuForScreenChange();
        updateWaitingLogin();
        window.onhashchange();

        // Set menu handlers that change URL fragment sub-fields
        document.getElementById('menuItemLinkEdit').onclick = function(e){
            e.preventDefault();
            let fragKeyToValue = parseFragment();
            if ( fragKeyToValue.page == FRAG_PAGE_VIEW_AUTOCOMPLETE ){
                setFragmentFields( {page:FRAG_PAGE_EDIT_AUTOCOMPLETE} );
            }
            else if ( fragKeyToValue.page == FRAG_PAGE_BUDGET_VIEW ){
                setFragmentFields( {page:FRAG_PAGE_BUDGET_EDIT} );
            }
            else {
                return false;
            }
        };
        document.getElementById('menuItemLinkView').onclick = function(e){
            e.preventDefault();
            let fragKeyToValue = parseFragment();
            if ( fragKeyToValue.page == FRAG_PAGE_AUTOCOMPLETE_RESULTS ){
                setFragmentFields( {page:FRAG_PAGE_VIEW_AUTOCOMPLETE} );
            }
            else if ( fragKeyToValue.page == FRAG_PAGE_BUDGET_RESULT ){
                setFragmentFields( {page:FRAG_PAGE_BUDGET_VIEW} );
            }
            else {
                return false;
            }
        };

        // When user re-visits the page... retrieve data from server (periodic update is too demanding)
        jQuery(window).bind( 'focus', function(event){
            // Retrieve login cookie
            // Do not overlap updating display & login, because display-data-cookies may overwrite login-cookie, without voter-id
            updateWaitingLogin( updateDisplayData );
        });

        // Initialize language
        initializeLanguage();
        showCurrentLanguage();
        let languageLinkSelect = document.getElementById('languageLinkSelect');
        if ( languageLinkSelect ){
            languageLinkSelect.oninput =  ( event ) => {
                let newLangCode = event.target.value;
                currentLanguageCode = newLangCode;
                setFragmentFields( {lang:newLangCode} );
                document.cookie = 'A=' + newLangCode;  // Only change cookie when user explicitly chooses language from select-list, not from URL-fragment
                translateScreen();
            };
        }
    });
});

    function
showCurrentLanguage( ){
    if ( currentLanguageCode ){
        let languageLinkSelect = document.getElementById('languageLinkSelect');
        if ( languageLinkSelect ){  languageLinkSelect.value = currentLanguageCode;  }
    }
}


    function
updateDisplayData( loggedIn ){
    let fragKeyToValue = parseFragment();
    let page = fragKeyToValue.page;
    if ( topDisp  &&  topDisp.retrieveDataUpdate ){  topDisp.retrieveDataUpdate();  }
}


// Set scroll handler
jQuery(document).scroll(  () => { if (typeof alignRows === "function"){alignRows()} }  );




////////////////////////////////////////////////////////////////////////////////
// Handle URL-fragment changes

    function
initializeLanguage( ){
    // Handle language URL-fragment field
    let fragKeyToValue = parseFragment();
    if ( fragKeyToValue.lang ){
        document.getElementById('languageLinkSelect').value = fragKeyToValue.lang;
        currentLanguageCode = fragKeyToValue.lang;
        // Only user-chosen language sticks, not language from link provided by other users
        translateScreen();
    }
    // Set language from cookie, setting language URL-fragment field
    else {
        let languageCookie = document.cookie.split(';').find(  c => ( c.split('=')[0].trim() == 'A' )  );
        let languageFromCookie = ( languageCookie )?  languageCookie.split('=')[1]  :  null;
        languageFromCookie = ( languageFromCookie )?  languageFromCookie.trim()  :  null;
        if ( languageFromCookie ){
            currentLanguageCode = languageFromCookie;
            translateScreen();
        }
    }

}

window.onhashchange = function(){

    let fragKeyToValue = parseFragment();
    console.log( 'onhashchange() fragKeyToValue=', fragKeyToValue );
    let linkKey = fragKeyToValue.link;
    let page = fragKeyToValue.page;
    
    // Remove menu items
    document.body.removeAttribute( 'menubackproposals' );
    document.body.removeAttribute( 'menubackresults' );
    document.body.removeAttribute( 'menuview' );
    document.body.removeAttribute( 'menuedit' );

    // Handle page fragment field
    // Page: multi-question survey
    if ( page == FRAG_PAGE_MULTI_QUESTION_SURVEY ){
        showPage( DIV_ID_MULTI_QUESTION_SURVEY, SITE_TITLE + ': Survey' );

        // If link-key is changed... create survey data
        const TEMPORARY_SURVEY_ID = 'new';
        let haveOldSurveyData =  Boolean(  linkKey  &&  app.linkKey  &&  ( linkKey == app.linkKey.id )  &&  app.surveyData  );
        console.log( 'window.onhashchange() haveOldSurveyData=', haveOldSurveyData );
        if ( ! haveOldSurveyData ){
            app.linkKey = { id:linkKey };
            app.surveyData = { id:TEMPORARY_SURVEY_ID , questions:[] , allowEdit:true , mine:true };
        }
        console.log( 'window.onhashchange() app=', app );

        // Create survey display
        // Use linkKey as display id, because linkKey is available before data is retrieved
        app.surveyDisplay = new SurveyDisplay( app.linkKey.id || TEMPORARY_SURVEY_ID ).setInitialData( app.surveyData, app.linkKey );
        app.surveyDisplay.dataUpdated();
        // First onhashchange() is called before requestInitialCookie()
        // Check crumb to ensure cookie is available for retrieveData()
        if ( app.linkKey.id  &&  crumb  &&  ! (haveOldSurveyData && app.surveyDisplay.retrievedAnswers) ){
            app.surveyDisplay.retrieveData();
        }
        topDisp = app.surveyDisplay;

        // Replace survey display
        showPage( DIV_ID_MULTI_QUESTION_SURVEY, SITE_TITLE + ': Survey' );
        let pageDiv = document.getElementById( DIV_ID_MULTI_QUESTION_SURVEY );
        replaceChildren( pageDiv, app.surveyDisplay.element );

        // If previous page was question sub-page... scroll to focus question
        if ( haveOldSurveyData  &&  app.questionId ){
            app.surveyDisplay.scrollToQuestion( app.questionId );
        }
    }

    // Page: new request for proposals
    else if ( FRAG_PAGE_ID_NEW_REQUEST == page ){
        clearData();
        showPage( DIV_ID_NEW_REQUEST, SITE_TITLE + ': New Request for Proposals' );
        newRequestHandleLoad( fragKeyToValue.experiment );
    }
    // Page: new proposal
    else if ( FRAG_PAGE_ID_NEW_PROPOSAL == page ){
        clearData();
        showPage( DIV_ID_NEW_PROPOSAL, SITE_TITLE + ': New Proposal' );
        newProposalHandleLoad( fragKeyToValue.experiment );
    }
    // Page: request for proposals
    else if ( FRAG_PAGE_ID_REQUEST == page ){

        // If link-key is unchanged...
        const DUMMY_REQUEST_ID = 'REQUEST_ID';
        let haveOldReqData = ( linkKey  &&  reqPropData  &&  reqPropData.linkKey  &&  (reqPropData.linkKey.id == linkKey)  &&  reqPropData.request  &&
            ('title' in reqPropData.request) );
        if ( haveOldReqData ){
            // Re-use request data when returning from proposal to request.
            // (Later, copy updated proposal/reason data from proposal back to request, when returning from proposal to request.)
            proposalData.singleProposal = false;
        }
        else {
            reqPropData = { linkKey:{id:linkKey}, linkOk:true, request:{id:DUMMY_REQUEST_ID}, proposals:[], reasons:[] };
        }
        console.log( 'window.onhashchange() haveOldReqData=', haveOldReqData );

        // Create request display.
        // Use linkKey as display id, because linkKey is needed as display id before retrieveData() runs.
        let reqPropDisp = new RequestForProposalsDisplay( reqPropData.linkKey.id );
        reqPropDisp.setAllData( reqPropData );
        if ( ! haveOldReqData ){
            let getReasons = ! LOAD_INCREMENTAL;
            reqPropDisp.retrieveData( getReasons );  // Async
        }
        topDisp = reqPropDisp;

        // Show request display
        showPage( DIV_ID_REQUEST, SITE_TITLE + ': Request for Proposals' );
        let pageDiv = document.getElementById( DIV_ID_REQUEST );
        replaceChildren( pageDiv, reqPropDisp.element );  // Remove old request, add new request.

        // If previous page was sub-proposal... find sub-proposal display, and scroll to focus sub-proposal.
        if ( haveOldReqData ){
            reqPropDisp.collapseNewProposals( proposalData.id );
            let proposalDisp = reqPropDisp.proposalIdToDisp ?  reqPropDisp.proposalIdToDisp[ proposalData.id ]  :  null;
            if ( proposalDisp ){  proposalDisp.scrollToProposal();  }
        }
    }
    // Page: proposal from request-for-proposals
    else if ( FRAG_PAGE_ID_PROPOSAL_FROM_REQUEST == page ){

        document.body.setAttribute( 'menubackproposals', 'true' );
        
        let proposalId = fragKeyToValue.proposal;
        proposalData = { linkKey:{id:linkKey}, linkOk:true, id:proposalId, reasons:[], fromRequest:true, singleProposal:true };

        // Re-use proposal/reason data from request-for-proposals, when viewing proposal from request.
        if ( linkKey  &&  reqPropData  &&  reqPropData.request  &&  linkKey == reqPropData.linkKey.id  &&  reqPropData.reasons ){
            let proposalFromReqProp = reqPropData.proposals.find(  function(p){ return p.id == proposalId; }  );
            if ( proposalFromReqProp ){
                proposalData = proposalFromReqProp;
                proposalData.linkOk = true;
                proposalData.fromRequest = true;
                proposalData.singleProposal = true;
                // Pass login-required flag through top-request to inner-proposals / etc
                proposalData.linkKey = { id:linkKey, loginRequired:reqPropData.linkKey.loginRequired };
            }
        }

        // Create new proposal display
        let proposalDisp = new ProposalDisplay( linkKey );
        proposalDisp.setAllData( proposalData, proposalData.reasons, proposalDisp, proposalData.linkKey );
        proposalDisp.retrieveData();  // Async
        topDisp = proposalDisp;

        // Show proposal page.
        showPage( DIV_ID_PROPOSAL, SITE_TITLE + ': Proposal' );
        let pageDiv = document.getElementById( DIV_ID_PROPOSAL );
        replaceChildren( pageDiv, proposalDisp.element );  // Remove old proposal, add new proposal.
        proposalDisp.scrollToProposal();
    }
    // Page: proposal
    else if ( FRAG_PAGE_ID_PROPOSAL == page ){
        proposalData = { linkKey:{id:linkKey}, linkOk:true, id:'PROPOSAL_ID', reasons:[], singleProposal:true };
        let proposalDisp = new ProposalDisplay( linkKey );
        proposalDisp.setAllData( proposalData, proposalData.reasons, proposalDisp, proposalData.linkKey );
        proposalDisp.retrieveData();

        showPage( DIV_ID_PROPOSAL, SITE_TITLE + ': Proposal' );
        let pageDiv = document.getElementById( DIV_ID_PROPOSAL );
        replaceChildren( pageDiv, proposalDisp.element );  // Remove old proposal, add new proposal.

        topDisp = proposalDisp;
    }



    // Page: auto-complete: new question
    else if ( page == FRAG_PAGE_NEW_AUTOCOMPLETE ){
        showPage( DIV_ID_NEW_AUTOCOMPLETE, SITE_TITLE + ': New Auto-complete Survey' );
        newSurveyHandleLoad( fragKeyToValue.experiment );
    }
    // Page: auto-complete: edit survey
    else if ( FRAG_PAGE_EDIT_AUTOCOMPLETE == page ){
        let surveyData = { linkKey:{ id:linkKey }, linkOk:true, questions:[], allowEdit:true };
        let surveyDisp = new SurveyEditDisplay( linkKey );
        topDisp = surveyDisp;
        topDisp.linkKey = surveyData.linkKey;
        surveyDisp.setAllData( surveyData, topDisp );
        surveyDisp.retrieveData();

        showPage( DIV_ID_EDIT_AUTOCOMPLETE, SITE_TITLE + ': Edit Survey' );
        let pageDiv = document.getElementById( DIV_ID_EDIT_AUTOCOMPLETE );
        replaceChildren( pageDiv, surveyDisp.element );  // Remove old display, add new display.
    }
    // Page: auto-complete: view survey
    else if ( FRAG_PAGE_VIEW_AUTOCOMPLETE == page ){
        let surveyData = { linkKey:{ id:linkKey }, linkOk:true, questions:[], allowEdit:true };
        let surveyDisp = new SurveyViewDisplay( linkKey );
        topDisp = surveyDisp;
        topDisp.linkKey = surveyData.linkKey;
        surveyDisp.setAllData( surveyData, topDisp );
        surveyDisp.retrieveData();

        showPage( DIV_ID_VIEW_AUTOCOMPLETE, SITE_TITLE + ': View Survey' );
        let pageDiv = document.getElementById( DIV_ID_VIEW_AUTOCOMPLETE );
        replaceChildren( pageDiv, surveyDisp.element );  // Remove old display, add new display.
    }
    // Page: auto-complete: survey results
    else if ( FRAG_PAGE_AUTOCOMPLETE_RESULTS == page ){
        // Get survey display from cache, or create it
        let wasCached = false;
        if ( surveyResultsDisplay == null  ||  surveyResultsDisplay.linkKey != linkKey ){
            // Create survey result display
            surveyResultsDisplay = new SurveyResultDisplay( linkKey );
        }
        else {
            wasCached = true;
            // Clear sub-displays
            for ( let q in surveyResultsDisplay.questions ){
                surveyResultsDisplay.questions[q].display = null;
            }
        }

        topDisp = surveyResultsDisplay;
        topDisp.linkKey = { id:linkKey };
        
        // Retrieve data, if not cached
        if ( ! wasCached ){
            surveyResultsDisplay.setAllData( {}, [], {}, topDisp );
            surveyResultsDisplay.retrieveData();
        }

        // Replace html elements
        showPage( DIV_ID_AUTOCOMPLETE_RESULTS, SITE_TITLE + ': Survey Results' );
        let pageDiv = document.getElementById( DIV_ID_AUTOCOMPLETE_RESULTS );
        replaceChildren( pageDiv, surveyResultsDisplay.element );
        document.body.setAttribute( 'menuview', 'true' );
    }
    // Page: auto-complete: question results
    else if ( FRAG_PAGE_QUESTION_RESULTS == page ){

        // Create display
        let questionDisp = new QuestionResultDisplay( linkKey );
        questionDisp.singleQuestionPage = true;
        topDisp = questionDisp;
        topDisp.linkKey = { id:linkKey };

        // Retrieve data from link
        let questionId = fragKeyToValue.question;
        questionDisp.setAllData( { id:questionId }, topDisp );
        questionDisp.retrieveData();

        // Replace html elements
        showPage( DIV_ID_AUTOCOMPLETE_RESULTS, SITE_TITLE + ': Survey Question Results' );
        let pageDiv = document.getElementById( DIV_ID_AUTOCOMPLETE_RESULTS );
        replaceChildren( pageDiv, questionDisp.element );
        document.body.setAttribute( 'menubackresults', 'true' );
    }



    // Page: budget: new question
    else if ( page == FRAG_PAGE_BUDGET_NEW ){
        showPage( DIV_ID_BUDGET_NEW, SITE_TITLE + ': New Budget' );
        newBudgetHandleLoad( fragKeyToValue.experiment );
    }
    // Page: budget: edit survey
    else if ( FRAG_PAGE_BUDGET_EDIT == page ){
        // Create display
        let budgetData = { allowEdit:true };
        let budgetDisp = new BudgetEditDisplay( linkKey );
        topDisp = budgetDisp;
        budgetDisp.linkKey = { id:linkKey, ok:true };
        budgetDisp.setAllData( budgetData, topDisp );
        budgetDisp.retrieveData();
        // Show display
        showPage( DIV_ID_BUDGET_EDIT, SITE_TITLE + ': Edit Budget' );
        let pageDiv = document.getElementById( DIV_ID_BUDGET_EDIT );
        replaceChildren( pageDiv, budgetDisp.element );
    }
    // Page: budget: view survey
    else if ( FRAG_PAGE_BUDGET_VIEW == page ){
        // Create display
        let budgetData = { linkKey:{ id:linkKey }, linkOk:true, slices:[], allowEdit:true };
        let budgetDisp = new BudgetViewDisplay( linkKey );
        topDisp = budgetDisp;
        budgetDisp.linkKey = budgetData.linkKey;
        budgetDisp.doAlignBudgetSliceRows = true;
        budgetDisp.setAllData( budgetData, topDisp );
        budgetDisp.retrieveData();
        // Show display
        showPage( DIV_ID_BUDGET_VIEW, SITE_TITLE + ': Budget' );
        let pageDiv = document.getElementById( DIV_ID_BUDGET_VIEW );
        replaceChildren( pageDiv, budgetDisp.element );
    }
    // Page: budget: results
    else if ( FRAG_PAGE_BUDGET_RESULT == page ){
        // Get cached budget-results, or create
        if ( surveyResultsDisplay  &&  surveyResultsDisplay.linkKey  &&  surveyResultsDisplay.linkKey.id == linkKey ){
            // Clear cached sub-displays
            for ( let s = 0;  s < surveyResultsDisplay.slices.length;  ++s ){
                surveyResultsDisplay.slices[s].display = null;
            }
        } else {
            // Create display
            surveyResultsDisplay = new BudgetResultDisplay( linkKey );
            let linkData = { id:linkKey, ok:true };
            let budgetData = { allowEdit:true };
            // Retrieve data
            surveyResultsDisplay.setAllData( linkData, budgetData, surveyResultsDisplay );
            surveyResultsDisplay.doAlignBudgetSliceRows = true;
            surveyResultsDisplay.retrieveData();
        }
        topDisp = surveyResultsDisplay;
        
        // Replace html elements
        showPage( DIV_ID_BUDGET_RESULTS, SITE_TITLE + ': Budget Results' );
        let pageDiv = document.getElementById( DIV_ID_BUDGET_RESULTS );
        replaceChildren( pageDiv, surveyResultsDisplay.element );
        document.body.setAttribute( 'menuview', 'true' );
    }
    // Page: budget: slice results
    else if ( FRAG_PAGE_BUDGET_SLICE_RESULT == page ){

        // Create display
        let sliceDisp = new SliceResultDisplay( linkKey );
        topDisp = sliceDisp;
        topDisp.link = { id:linkKey };

        // Retrieve data from link
        let sliceId = fragKeyToValue.slice;
        sliceDisp.setAllData( { id:sliceId }, topDisp );
        sliceDisp.retrieveData();

        // Replace html elements
        showPage( DIV_ID_BUDGET_RESULTS, SITE_TITLE + ': Budget Item Results' );
        let pageDiv = document.getElementById( DIV_ID_BUDGET_RESULTS );
        replaceChildren( pageDiv, sliceDisp.element );
        document.body.setAttribute( 'menubackresults', 'true' );
    }



    // Page: recent
    else if ( FRAG_PAGE_ID_RECENT == page ){
        clearData();
        showPage( DIV_ID_RECENT, SITE_TITLE + ': Recent' );
        recentHandleLoad();
    }
    // Page: about
    else if ( FRAG_PAGE_ID_ABOUT == page ){
        clearData();
        showPage( DIV_ID_ABOUT, SITE_TITLE + ': About' );
    }
    // Miscellaneous pages
    else if ( FRAG_PAGE_TO_INFO[page]  &&  FRAG_PAGE_TO_INFO[page].div ){
        let divId = FRAG_PAGE_TO_INFO[ page ].div;
        let title = FRAG_PAGE_TO_INFO[ page ].title  ||  '';
        clearData();
        showPage( divId, SITE_TITLE + (title ? ': '+title : '') );
    }
    // Page: home
    else {
        clearData();
        showPage( DIV_ID_HOME, 'Converj' );
    }

    initializeLanguage();
}

    function
showPage( pageDivId, title ){
    $('.Page').removeAttr('show');   // Hide all pages
    let pageDiv = document.getElementById( pageDivId );
    if ( pageDiv ){  pageDiv.setAttribute('show', 'true');  }
    document.title = title;
    updateMenuForScreenChange();
}

    function
replaceChildren( element, newChild ){
    clearChildren( element );
    element.appendChild( newChild );
}

    function
clearData( ){
    reqPropData = { linkKey:{id:'REQUEST_LINK_KEY'}, request:{id:'REQUEST_ID'}, proposals:[], reasons:[] };
    proposalData = { linkKey:{id:'PROPOSAL_LINK_KEY'}, id:'PROPOSAL_ID', reasons:[] };
    topDisp = null;
}


