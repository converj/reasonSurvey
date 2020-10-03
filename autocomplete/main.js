////////////////////////////////////////////////////////////////////////////////
// Constants

const FRAG_PAGE_NEW_QUESTION = 'newQuestion';
const FRAG_PAGE_EDIT_QUESTION = 'editQuestion';
const FRAG_PAGE_VIEW_QUESTION = 'question';
const FRAG_PAGE_SURVEY_RESULTS = 'results';
const FRAG_PAGE_QUESTION_RESULTS = 'questionResults';
const FRAG_PAGE_RECENT = 'recent';
const FRAG_PAGE_ABOUT = 'about';


////////////////////////////////////////////////////////////////////////////////
// Global variables

var topDisp = null;

// Cached data
var surveyResultsDisplay = null;  // Cache whole display, because it contains several separate fields: questions, questionIds, survey
var recentSurveyIntros = null;



////////////////////////////////////////////////////////////////////////////////
// Handle page changes

$(document).ready( function(){

    console.log('Document ready');
    
    requestInitialCookie( function(){
        updateMenuForScreenChange();
        updateWaitingLogin();
        window.onhashchange();

        // Set menu handlers that change fragments
        document.getElementById('menuItemLinkEdit').onclick = function(){
            setFragmentFields( {page:FRAG_PAGE_EDIT_QUESTION} );
            return false;
        };
        document.getElementById('menuItemLinkView').onclick = function(){
            setFragmentFields( {page:FRAG_PAGE_VIEW_QUESTION} );
            return false;
        };

        // When user re-visits the page... 
        jQuery(window).bind( 'focus', function(event){
            // Update login, then retrieve data if logged in
            updateWaitingLogin( function(){ 
                if ( topDisp ){  topDisp.retrieveData();  }
            } );
        } );

        // When user logs out... update data
        elementWithId('logoutButton').onclick = function(){
            requestLogout( function(){
                onLoggedOut();
                if ( topDisp ){  topDisp.retrieveData();  }
            } );
        };

    } );
} );

jQuery(window).resize( function(){
    if ( topDisp ){  topDisp.dataUpdated();  }
    updateMenuForScreenChange();
} );



////////////////////////////////////////////////////////////////////////////////
// Handle fragment changes

window.onhashchange = function(){
    var fragKeyToValue = parseFragment();
    var linkKey = fragKeyToValue.link;
    var page = fragKeyToValue.page;

    // Remove menu items
    document.body.removeAttribute( 'menuback' );
    document.body.removeAttribute( 'menuview' );
    document.body.removeAttribute( 'menuedit' );

    // Page: edit survey
    if ( FRAG_PAGE_EDIT_QUESTION == page ){
        var surveyData = { linkKey:{ id:linkKey }, linkOk:true, questions:[], allowEdit:true };
        var surveyDisp = new SurveyEditDisplay( linkKey );
        topDisp = surveyDisp;
        topDisp.linkKey = surveyData.linkKey;
        surveyDisp.setAllData( surveyData, topDisp );
        surveyDisp.retrieveData();

        showPage( DIV_ID_EDIT_QUESTION, SITE_TITLE + ': Edit Survey' );
        var pageDiv = document.getElementById( DIV_ID_EDIT_QUESTION );
        replaceChildren( pageDiv, surveyDisp.element );  // Remove old display, add new display.
    }

    // Page: view survey
    else if ( FRAG_PAGE_VIEW_QUESTION == page ){
        var surveyData = { linkKey:{ id:linkKey }, linkOk:true, questions:[], allowEdit:true };
        var surveyDisp = new SurveyViewDisplay( linkKey );
        topDisp = surveyDisp;
        topDisp.linkKey = surveyData.linkKey;
        surveyDisp.setAllData( surveyData, topDisp );
        surveyDisp.retrieveData();

        showPage( DIV_ID_VIEW_QUESTION, SITE_TITLE + ': View Survey' );
        var pageDiv = document.getElementById( DIV_ID_VIEW_QUESTION );
        replaceChildren( pageDiv, surveyDisp.element );  // Remove old display, add new display.
    }

    // Page: survey results
    else if ( FRAG_PAGE_SURVEY_RESULTS == page ){
        // Get survey display from cache, or create it
        var wasCached = false;
        if ( surveyResultsDisplay == null  ||  surveyResultsDisplay.linkKey != linkKey ){
            // Create survey result display
            surveyResultsDisplay = new SurveyResultDisplay( linkKey );
        }
        else {
            wasCached = true;
            // Clear sub-displays
            for ( var q in surveyResultsDisplay.questions ){
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
        showPage( DIV_ID_SURVEY_RESULTS, SITE_TITLE + ': Survey Results' );
        var pageDiv = document.getElementById( DIV_ID_SURVEY_RESULTS );
        replaceChildren( pageDiv, surveyResultsDisplay.element );
        document.body.setAttribute( 'menuview', 'true' );
    }

    // Page: question results
    else if ( FRAG_PAGE_QUESTION_RESULTS == page ){

        // Create display
        var questionDisp = new QuestionResultDisplay( linkKey );
        questionDisp.singleQuestionPage = true;
        topDisp = questionDisp;
        topDisp.linkKey = { id:linkKey };

        // Retrieve data from link
        var questionId = fragKeyToValue.question;
        questionDisp.setAllData( { id:questionId }, topDisp );
        questionDisp.retrieveData();

        // Replace html elements
        showPage( DIV_ID_SURVEY_RESULTS, SITE_TITLE + ': Survey Question Results' );
        var pageDiv = document.getElementById( DIV_ID_SURVEY_RESULTS );
        replaceChildren( pageDiv, questionDisp.element );
        document.body.setAttribute( 'menuback', 'true' );
        document.body.setAttribute( 'menuview', 'true' );
    }

    // Page: recent
    else if ( FRAG_PAGE_RECENT == page ){
        // Create display
        var recentsDisp = new RecentSurveysDisplay( 'RECENTS_DISP_ID' );
        topDisp = recentsDisp;
        
        // Retrieve data from cache, or retrieve it
        if ( ! recentSurveyIntros ){  recentSurveyIntros = [ ];  }
        recentsDisp.setAllData( recentSurveyIntros, topDisp );
        recentsDisp.retrieveData();
        
        // Replace html elements
        showPage( DIV_ID_RECENT, SITE_TITLE + ': Recent' );
        var pageDiv = document.getElementById( DIV_ID_RECENT );
        replaceChildren( pageDiv, recentsDisp.element );
    }

    // Page: about
    else if ( FRAG_PAGE_ABOUT == page ){
        showPage( DIV_ID_ABOUT, SITE_TITLE + ': About' );
    }

    // Page: new question
    else {
        showPage( DIV_ID_NEW_QUESTION, SITE_TITLE + ': New Survey' );
        newSurveyHandleLoad();
    }
}

    function
showPage( pageDivId, title ){
    $('.Page').removeAttr('show');   // Hide all pages
    document.getElementById(pageDivId).setAttribute('show', 'true');
    document.title = title;
    updateMenuForScreenChange();
}

    function
updateMenuForScreenChange(){  
    toggleMenu( jQuery(window).width() > MAX_WIDTH_POPUP_MENU );
}

    function
replaceChildren( element, newChild ){
    clearChildren( element );
    element.appendChild( newChild );
}



////////////////////////////////////////////////////////////////////////////////
// Handle menu 

// Menu link toggles display of menu.
var menuLink = document.getElementById('menuLink');
menuLink.onclick = function(){  toggleMenu();  return false;  };

// Content-cover click always closes menu.
var contentCover = document.getElementById('contentCover');
contentCover.onclick = function(){  toggleMenu( false );  };

// Back links go back from proposal to enclosing request.
jQuery('#menuItemLinkBack').click(  function(event){ window.history.back(); }  );
jQuery('#menuItemLinkBack').keyup( enterToClick );


    function
toggleMenu( menuActiveNew ){
    var menuMobile = document.getElementById('menuMobile');
    if ( menuActiveNew == undefined ){
        menuActiveNew = ! menuMobile.hasAttribute('open');
    }
    if ( menuActiveNew ){  menuMobile.setAttribute('open', '');  }  else {  menuMobile.removeAttribute('open');  }
}

