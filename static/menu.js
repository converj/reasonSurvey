////////////////////////////////////////////////////////////////////////////////
// Handle page changes

$(document).ready( function(){
    console.log('Document ready');
    updateMenuForScreenChange();
});

jQuery(window).resize( function(){
    if ( (typeof topDisp != 'undefined')  &&  topDisp ){  topDisp.dataUpdated();  }
    updateMenuForScreenChange();
} );

    function
updateMenuForScreenChange(){
    toggleMenu( isMenuAlwaysOn() );
}


////////////////////////////////////////////////////////////////////////////////
// Handle menu clicks and key-presses

// menuLink does not need to toggle menu on, because summary click does that automatically
    function
toggleMenu( showMenu ){
    let menuMobile = document.getElementById('menuMobile');

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
jQuery('#menuItemLinkBackProposals').click(  function(e){ e.preventDefault(); setFragmentFields( {page:FRAG_PAGE_ID_REQUEST} ); }  );
jQuery('#menuItemLinkBackResults').click(  e => {
    e.preventDefault();
    let fragKeyToValue = parseFragment();
    if ( fragKeyToValue.page == FRAG_PAGE_QUESTION_RESULTS ){
        setFragmentFields( {page:FRAG_PAGE_AUTOCOMPLETE_RESULTS} );
    }
    else if ( fragKeyToValue.page == FRAG_PAGE_BUDGET_SLICE_RESULT ){
        setFragmentFields( {page:FRAG_PAGE_BUDGET_RESULT} );
    }
    else {
        return false;
    }
}  );
jQuery('#menuItemLinkBackProposals').keyup( enterToClick );
jQuery('#menuItemLinkBackResults').keyup( enterToClick );

document.getElementById('menuLink').onclick = function(){  toggleMenu();  };
jQuery('.menuItemLink').keyup( enterToClick );


// Content-cover click always closes menu.
let contentCover = document.getElementById('contentCover');
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

