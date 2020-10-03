////////////////////////////////////////////////////////////////////////////////
// Constants

const FRAG_PAGE_ID_NEW_REQUEST = 'newRequest';
const FRAG_PAGE_ID_NEW_PROPOSAL = 'newProposal';
const FRAG_PAGE_ID_REQUEST = 'request';
const FRAG_PAGE_ID_PROPOSAL_FROM_REQUEST = 'proposalFromRequest';
const FRAG_PAGE_ID_PROPOSAL = 'proposal';
const FRAG_PAGE_ID_RECENT = 'recent';
const FRAG_PAGE_ID_ABOUT = 'about';
const FRAG_PAGE_SITE_LIST = 'sites';

const FRAG_PAGE_IDS_WITH_TOP_DISPLAY = [ FRAG_PAGE_ID_REQUEST, FRAG_PAGE_ID_PROPOSAL_FROM_REQUEST, FRAG_PAGE_ID_PROPOSAL ];



////////////////////////////////////////////////////////////////////////////////
// Global variables

var reqPropData = null;
var proposalData = null;
clearData();

var topDisp = null;  // Only for debugging

var loginRequestKey = null;



////////////////////////////////////////////////////////////////////////////////
// Handle page / fragment changes

$(document).ready( function(){

    console.log('Document ready');

    requestInitialCookie( function(){
        updateMenuForScreenChange();
        updateWaitingLogin();
        window.onhashchange();

        // When user re-visits the page... retrieve data from server (periodic update is too demanding)
        jQuery(window).bind( 'focus', function(event){
            // Retrieve login cookie
            // Do not overlap updating display & login, because display-data-cookies may overwrite login-cookie, without voter-id
            updateWaitingLogin(  function(){ updateDisplayData() }  );
        });
    });
});

    function
updateDisplayData(){
    var fragKeyToValue = parseFragment();
    var page = fragKeyToValue.page;
    if ( topDisp  &&  0 <= FRAG_PAGE_IDS_WITH_TOP_DISPLAY.indexOf(page) ){
        topDisp.retrieveDataUpdate();
    }
}


window.onhashchange = function(){

    var fragKeyToValue = parseFragment();
    var linkKey = fragKeyToValue.link;
    var page = fragKeyToValue.page;
    
    // Remove back-links.
    document.body.setAttribute( 'fromrequest', 'false' );

    // Handle page fragment field.
    // Page: new request for proposals
    if ( FRAG_PAGE_ID_NEW_REQUEST == page ){
        clearData();
        showPage( DIV_ID_NEW_REQUEST, SITE_TITLE + ': New Request for Proposals' );
        newRequestHandleLoad();
    }
    // Page: new proposal
    else if ( FRAG_PAGE_ID_NEW_PROPOSAL == page ){
        clearData();
        showPage( DIV_ID_NEW_PROPOSAL, SITE_TITLE + ': New Proposal' );
        newProposalHandleLoad();
    }

    // Page: request for proposals
    else if ( FRAG_PAGE_ID_REQUEST == page ){

        // If link-key is unchanged...
        var sameRequest = false;
        if ( linkKey  &&  reqPropData  &&  reqPropData.linkKey  &&  reqPropData.linkKey.id == linkKey ){
            // Re-use request data when returning from proposal to request.
            // (Later, copy updated proposal/reason data from proposal back to request, when returning from proposal to request.)
            sameRequest = true;
            proposalData.singleProposal = false;
        }
        else {
            reqPropData = { linkKey:{id:linkKey}, linkOk:true, request:{id:'REQUEST_ID'}, proposals:[], reasons:[] };
        }

        // Create request display.
        // Use linkKey as display id, because linkKey is needed as display id before retrieveData() runs.
        var reqPropDisp = new RequestForProposalsDisplay( reqPropData.linkKey.id );
        reqPropDisp.setAllData( reqPropData );
        var getReasons = ! LOAD_INCREMENTAL;
        reqPropDisp.retrieveData( getReasons );  // Async
        topDisp = reqPropDisp;

        // Show request display
        showPage( DIV_ID_REQUEST, SITE_TITLE + ': Request for Proposals' );
        var pageDiv = document.getElementById( DIV_ID_REQUEST );
        replaceChildren( pageDiv, reqPropDisp.element );  // Remove old request, add new request.

        // If previous page was sub-proposal... find sub-proposal display, and scroll to focus sub-proposal.
        if ( sameRequest ){
            reqPropDisp.collapseNewProposals( proposalData.id );
            var proposalDisp = reqPropDisp.proposalIdToDisp ?  reqPropDisp.proposalIdToDisp[ proposalData.id ]  :  null;
            if ( proposalDisp ){  proposalDisp.scrollToProposal();  }
        }
    }

    // Page: proposal from request-for-proposals
    else if ( FRAG_PAGE_ID_PROPOSAL_FROM_REQUEST == page ){

        document.body.setAttribute( 'fromrequest', 'true' );  // Show back-links.
        
        var proposalId = fragKeyToValue.proposal;
        proposalData = { linkKey:{id:linkKey}, linkOk:true, id:proposalId, reasons:[], fromRequest:true, singleProposal:true };

        // Re-use proposal/reason data from request-for-proposals, when viewing proposal from request.
        if ( linkKey  &&  reqPropData  &&  reqPropData.request  &&  linkKey == reqPropData.linkKey.id  &&  reqPropData.reasons ){
            var proposalFromReqProp = reqPropData.proposals.find(  function(p){ return p.id == proposalId; }  );
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
        var proposalDisp = new ProposalDisplay( linkKey );
        proposalDisp.setAllData( proposalData, proposalData.reasons, proposalDisp, proposalData.linkKey );
        proposalDisp.retrieveData();  // Async
        topDisp = proposalDisp;

        // Show proposal page.
        showPage( DIV_ID_PROPOSAL, SITE_TITLE + ': Proposal' );
        var pageDiv = document.getElementById( DIV_ID_PROPOSAL );
        replaceChildren( pageDiv, proposalDisp.element );  // Remove old proposal, add new proposal.
    }

    // Page: proposal
    else if ( FRAG_PAGE_ID_PROPOSAL == page ){
        proposalData = { linkKey:{id:linkKey}, linkOk:true, id:proposalId, reasons:[], singleProposal:true };
        var proposalDisp = new ProposalDisplay( linkKey );
        proposalDisp.setAllData( proposalData, proposalData.reasons, proposalDisp, proposalData.linkKey );
        proposalDisp.retrieveData();

        showPage( DIV_ID_PROPOSAL, SITE_TITLE + ': Proposal' );
        var pageDiv = document.getElementById( DIV_ID_PROPOSAL );
        replaceChildren( pageDiv, proposalDisp.element );  // Remove old proposal, add new proposal.

        topDisp = proposalDisp;
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
    // Page site list
    else if ( FRAG_PAGE_SITE_LIST == page ){
        clearData();
        showPage( DIV_ID_SITE_LIST, 'Site List' );
    }
    // Page: none
    else {
        clearData();
        showPage( DIV_ID_SITE_LIST, 'Site List' );
    }
}

    function
showPage( pageDivId, title ){
    $('.Page').removeAttr('show');   // Hide all pages.
    document.getElementById(pageDivId).setAttribute('show', 'true');
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
}


////////////////////////////////////////////////////////////////////////////////
// Handle page width resize

jQuery(window).resize( function(){
    if ( topDisp ){  topDisp.dataUpdated();  }
    updateMenuForScreenChange();
} );

    function
updateMenuForScreenChange(){
    toggleMenu( isMenuAlwaysOn() );
}



////////////////////////////////////////////////////////////////////////////////
// Handle menu 

// menuLink does not need to toggle menu on, because summary click does that automatically
    function
toggleMenu( showMenu ){
    var menuMobile = document.getElementById('menuMobile');

    // Determine whether to show menu
    if ( showMenu === undefined ){  showMenu = ! menuMobile.hasAttribute('open');  }

    // Display or hide menu
    if ( showMenu ){
        menuMobile.setAttribute('open', '');
    }
    else {
        menuMobile.removeAttribute('open');
    }
}

// Back links go back from proposal to enclosing request.
document.getElementById('backLink').onclick = function(){  window.history.back();  };
document.getElementById('backLink').onkeyup = function(event){  if ( event.key == KEY_NAME_ENTER ){ window.history.back(); }  };
jQuery('#backMenuItem').click(  function(event){ window.history.back(); }  );
jQuery('#backMenuItem').keyup(  function(event){ if (event.key == KEY_NAME_ENTER){window.history.back();} }  );

document.getElementById('menuLink').onclick = function(){  toggleMenu();  };
// Menu links work with ENTER key
jQuery('.menuItemLink').keyup( function(event){
    if( event.key == KEY_NAME_ENTER ){  event.currentTarget.click();  }
} );

// Content-cover click always closes menu.
var contentCover = document.getElementById('contentCover');
contentCover.onclick = function(){  toggleMenu( false );  };


    function
isMenuAlwaysOn( ){  return ( jQuery(window).width() > MAX_WIDTH_POPUP_MENU );  }


document.body.onkeyup = function( event ){
    if ( event.key == 'Escape' ){
        // Hide menu and dialogs
        if ( ! isMenuAlwaysOn() ){  toggleMenu( false );  }
        hide('loginRequiredDiv');
        hide('cookiesRequiredDiv');
        hide('logoutDiv');
    }
};