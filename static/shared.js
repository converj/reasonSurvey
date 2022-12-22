///////////////////////////////////////////////////////////////////////////////////////
// Constants

const EDIT = 'edit';
const TRUE = 'true';
const FALSE = 'false';

const EVENT_NAMES = ['click', 'focus', 'blur', 'keydown', 'keyup', 'paste', 'input', 'invalid', 'mousedown', 'mouseup'];
const RED = 'red';
const BLACK = 'black';
const GREEN = 'green';
const GREY = 'grey';

const MESSAGE_NO_COOKIE = 'No user identity found. Try reloading the page.';
const MESSAGE_BAD_CRUMB = 'User action unverified. Please retry.';

const KEY_CODE_ENTER = 13;
const KEY_NAME_ENTER = 'Enter'
const KEY_NAME_ESCAPE = 'Escape'
const KEY_NAME_SPACE = ' '


///////////////////////////////////////////////////////////////////////////////////////
// Data structures

    function 
incrementMapValue( map, key, increment ){
    let oldCount = map[ key ];
    let newCount = ( oldCount )?  oldCount + increment  :  increment;
    map[ key ] = newCount;
    return newCount;
}

    function 
getOrInsert( map, key, defaultValue ){
    let value = map[ key ];
    if ( value === undefined ){
        map[ key ] = defaultValue;
        return defaultValue;
    }
    return value;
}

    function
unique( arrayValues ){
    // Maintains original order
    if ( ! arrayValues ){  return [];  }
    let valueSet = { };
    uniqueValues = [ ];
    for ( let i = 0;  i < arrayValues.length;  ++i ){
        let value = arrayValues[ i ];
        if ( !(value in valueSet) ){
            uniqueValues.push( value );
            valueSet[ value ] = true;
        }
    }
    return uniqueValues;
}

    function
defaultTo( value, defaultValue ){  return value ? value : defaultValue;  }


///////////////////////////////////////////////////////////////////////////////////////
// Logging

// Useful for viewing logs without debugger, such as on mobile
    function
logOnScreen( ...arguments ){
    let argsJson = arguments.map( JSON.stringify );
    document.getElementById('log').appendChild( html('div').innerHtml(argsJson.join(' ')).build() );
}

    function
logOnScreenReplace( ...arguments ){
    clearChildren( document.getElementById('log') );
    let argsJson = arguments.map( JSON.stringify );
    document.getElementById('log').appendChild( html('div').innerHtml(argsJson.join(' ')).build() );
}



///////////////////////////////////////////////////////////////////////////////////////
// Html element changes

        function
    fitTextAreaToText( textArea ){
        textArea.style.height = '15px';
        textArea.style.height = textArea.scrollHeight + 'px';
    }


        function
    addAndAppear( element, parentElement ){
        var elementJquery = jQuery( element ).hide();
        var parentJquery = jQuery( parentElement ).append( elementJquery );
        elementJquery.slideToggle();
    }


        function
    scrollToHtmlElement( htmlElement, margin=20 ){
        var elementJquery = jQuery( htmlElement );
        jQuery('html, body').animate( {
            scrollTop: ( elementJquery.offset().top - margin ) + 'px'   // Scroll so a little margin shows above the target
        }, 'fast' );
    }




///////////////////////////////////////////////////////////////////////////////////////
// Element access

    function
elementWithId( id ){  return document.getElementById( id );  }

    function
elementsWithClass( className ){  return document.getElementsByClassName( className );  }

                

///////////////////////////////////////////////////////////////////////////////////////
// URL Fragments

    function
setFragmentFields( newKeyToValue ){
    // Merge with existing fragment.
    oldKeyToValue = parseFragment();
    mergedKeyToValue = {};
    for (var key in oldKeyToValue) {
        mergedKeyToValue[key] = oldKeyToValue[key];
    }
    for (var key in newKeyToValue) {
        var value = newKeyToValue[key];
        if ( value === null  &&  key in mergedKeyToValue ){  delete mergedKeyToValue[key];  }
        else if ( value !== null ){  mergedKeyToValue[key] = value;  }
    }
    setWholeFragment( mergedKeyToValue );
}

    function
setWholeFragment( keyToValue ){
    // Join keys and values with URI encoding.
    var encoded = '';
    for (var key in keyToValue) {
        var value = keyToValue[key];
        var keyValueStr = key + '=' + value;
        if ( encoded !== '' ){  encoded += '&';  }
        encoded += keyValueStr;
    }
    window.location.hash = encoded;
}

    function
parseFragment( ){
    // Split key-value pairs by '&'
    // Split each key-value pair by '='
    keyToValue = {};
    var encoded = window.location.hash;
    encoded = encoded.replace( new RegExp('^#'), '' );  // Trim leading '#'.
    if ( ! encoded ){  return keyToValue;  }
    keyValueStrings = encoded.split('&');
    for ( var k = 0;  k < keyValueStrings.length;  ++k ){
        var keyAndValue = keyValueStrings[k].split('=');
        var key = keyAndValue[0];
        var value = keyAndValue[1];
        keyToValue[key] = value;
    }
    return keyToValue;
}


    function
objectsEqual( obj1, obj2, ignoreKeys ){
    if ( obj1 == obj2 ){  return true;  }
    for ( key in obj1 ){
        if ( ignoreKeys.includes(key) ){  continue;  }
        if ( !(key in obj2) ){  return false;  }
        if ( obj1[key] != obj2[key] ){  return false;  }
    }
    for ( key in obj2 ){
        if ( ignoreKeys.includes(key) ){  continue;  }
        if ( !(key in obj1) ){  return false;  }
    }
    return true;
}



///////////////////////////////////////////////////////////////////////////////////////
// HTML construction by builder

        function
    tag( t ){  return new HtmlBuilder( t );  }

        function
    html( tag ){  return new HtmlBuilder( tag );  }

        function
    HtmlBuilder( tag ){
        if ( ! tag ){  throw new Error('tag is required by HtmlBuilder');  }
        this.element = document.createElement( tag );
    }

    HtmlBuilder.prototype.id = function( id ){  this.element.id = id;  return this;  };

    HtmlBuilder.prototype.class = function( className ){
        if ( className ){  this.element.classList.add( className );  }
        return this;
    };

    HtmlBuilder.prototype.attribute = function( name, value ){
        this.element.setAttribute( name, value );
        return this;
    };

    HtmlBuilder.prototype.property = function( name, value ){
        this.element[ name ] = value;
        return this;
    };

    HtmlBuilder.prototype.innerHtml = function( innerHtml ){  this.element.innerHTML = innerHtml;  return this;  };

    HtmlBuilder.prototype.children = function( childVarArgs ){
        for ( var c = 0;  c < arguments.length;  ++c ) {
            if ( arguments[c] ){
                this.element.appendChild( arguments[c] );
            }
        }
        return this;
    };

    HtmlBuilder.prototype.style = function( javascriptStyleName, value ){
        this.element.style[ javascriptStyleName ] = value;
        return this;
    };

    HtmlBuilder.prototype.build = function( ){  return this.element;  };



///////////////////////////////////////////////////////////////////////////////////////
// HTML construction by text

    function
htmlToElement( html ){
    var tempDiv = document.createElement('div');
    if ( html ){  tempDiv.innerHTML = html;  }
    var element = ( tempDiv.children.length == 1 )?  tempDiv.children[0]  :  tempDiv;
    return element;
}

    function
applyIdSuffix( element, suffix ){
    if ( element.id ){  element.id = toId( element.id, suffix );  }

    // Point labels/etc to correct html-element-id within same element-object
    if ( element.htmlFor ){  element.htmlFor = toId( element.htmlFor, suffix );  }

    let inputDatalist = element.getAttribute ?  element.getAttribute('list')  :  null;
    if ( inputDatalist ){  element.setAttribute( 'list', toId(inputDatalist, suffix) );  }

    let ariaControls = element.getAttribute ?  element.getAttribute('aria-controls')  :  null;
    if ( ariaControls ){  element.setAttribute( 'aria-controls', toId(ariaControls, suffix) );  }

    for ( var c = 0;  c < element.childNodes.length;  ++c ){
        applyIdSuffix( element.childNodes[c], suffix );
    }
}

    function
toId( idBase, idSuffix ){
    return idBase + '-' + idSuffix;
}

    function
setChildren( element, newChildren ){
    clearChildren( element );
    if ( newChildren ){
        for ( var c = 0;  c < newChildren.length;  ++c ){
            element.appendChild( newChildren[c] );
        }
    }
}

    function
moveChildren( oldParent, newParent ){
    while ( oldParent.firstChild ){
        newParent.appendChild( oldParent.firstChild );
    }
}

    function
clearChildren( element ){
    while ( element.firstChild ){
        element.removeChild( element.firstChild );
    }
}


///////////////////////////////////////////////////////////////////////////////////////
// Element wrapper class, for easy creating and updating html values.

    function
ElementWrap( ){ }

ElementWrap.prototype.createFromBuilder = function( idSuffix, htmlBuilder ){
    return this.createFromElement( idSuffix, htmlBuilder.build() );
};

ElementWrap.prototype.createFromHtml = function( idSuffix, htmlText ){
    return this.createFromElement( idSuffix, htmlToElement(htmlText) );
};

ElementWrap.prototype.createFromElement = function( idSuffix, htmlElement ){
    this.element = htmlElement;
    this.idSuffix = idSuffix;
    this.indexIds( this.element );
    this.attachHandlers( this.element );
    applyIdSuffix( this.element, this.idSuffix );  // Make IDs specific to this reason instance. 
    this.attachSubelements( this.element );  // Attach sub-elements last, so they do not get double-suffixed nor attach wrong handlers.
    return this.element;  // Return DOM element so that it can be added to webpage. 
};

ElementWrap.prototype.getId = function( idBase ){
    return toId( idBase, this.idSuffix );
};

ElementWrap.prototype.getSubElement = function( idBase ){
    var subelement = this.idBaseToElement ?  this.idBaseToElement[idBase]  :  null;
    if ( ! subelement ){  console.log('subelement=null for idBase=', idBase, ' this=', this);  }
    if ( ! subelement ){  throw new Error('subelement=null for idBase=' + idBase + ' this=' + this);  }
    return subelement;
};

// For convenience, and for efficiency to only set property if value changed.
ElementWrap.prototype.setProperty = function( subElementId, propName, value ){
    var subelement = this.getSubElement( subElementId );
    if ( subelement[propName] === value ){  return;  }
    if ( value === null  ||  value === undefined ){  delete subelement[propName];  }
    else {  subelement[propName] = value;  }
};

// Sets member variable that cannot be deleted
ElementWrap.prototype.setRequiredMember = function( subElementId, varName, value ){
    var subelement = this.getSubElement( subElementId );
    if ( subelement[varName] === value ){  
        return;  
    }
    else {  subelement[varName] = value;  }
};

ElementWrap.prototype.setAttribute = function( subElementId, attributeName, value ){
    var subelement = this.getSubElement( subElementId );
    if ( subelement.getAttribute( attributeName ) === value ){  return;  }
    if ( value ){  subelement.setAttribute( attributeName, value );  }
    else {  subelement.removeAttribute( attributeName );  }
};

ElementWrap.prototype.setStyle = function( subElementId, styleVarName, value ){
    var subelement = this.getSubElement( subElementId );
    if ( subelement.style[styleVarName] === value ){  return;  }
    if ( value ){  subelement.style[styleVarName] = value;  }
    else {  subelement.style[styleVarName] = null;  }
};

ElementWrap.prototype.setInnerHtml = function( subElementId, html ){
    var subelement = this.getSubElement( subElementId );
    if ( subelement.innerHTML === html ){  return;  }
    if ( html === undefined  ||  html === null ){  html = '';  }
    subelement.innerHTML = html;
};

ElementWrap.prototype.setClass = function( subElementId, className, isClassTrue ){
    var subelement = this.getSubElement( subElementId );
    if ( isClassTrue ){  subelement.classList.add( className );  }
    else {  subelement.classList.remove( className );  }
};

// Collect idBaseToElement : map[ subelement bare id -> subelement instance object ]
ElementWrap.prototype.indexIds = function( htmlElement, prefix ){
    // Collect subelement object and id
    if ( ! this.idBaseToElement ){  this.idBaseToElement = {};  }
    if ( htmlElement.id ){  this.idBaseToElement[ htmlElement.id ] = htmlElement;  }
    // Recurse on children
    for ( var c = 0;  c < htmlElement.children.length;  ++c ){
        this.indexIds( htmlElement.children[c], prefix + '    ' );
    }
};


// Replace element event-handler function names from literal HTML, with ElementWrap functions.
ElementWrap.prototype.attachHandlers = function( htmlElement ){

    let thisCopy = this;  // Copy for closure of handler functions created below

    // For each event type... if DOM element specifies handler name... replace handler name with handler function from object.
    // for-loop over event names, creating callbacks, requires closure on handlerFunc.
    EVENT_NAMES.map(  function( eventName ){
        let handlerFieldName = 'on' + eventName;
        let handlerFunctionName = htmlElement.getAttribute( handlerFieldName );
        if ( handlerFunctionName ){
            let handlerFunction = thisCopy[ handlerFunctionName ];  // Copy for closure of handler function created below
            // Assign event handler to callback that assigns "this" to display.
            // Could attach with htmlElement.addEventListener(), but still have to replace 'onevent' field with null
            htmlElement[ handlerFieldName ] =  (event) => handlerFunction.call(thisCopy, event);
        }
    } );
    // Recurse on children.
    for ( let c = 0;  c < htmlElement.children.length;  ++c ){
        this.attachHandlers( htmlElement.children[c] );
    }
};

    
// Replace subdisplay tag with contained display-object
ElementWrap.prototype.attachSubelements = function( htmlElement ){
    var subdisplayName = htmlElement.getAttribute('subdisplay');
    if ( subdisplayName ){
        var subdisplay = this[ subdisplayName ];
        htmlElement.appendChild( subdisplay.element );
    }
    // Recurse on children.
    for ( var c = 0;  c < htmlElement.children.length;  ++c ){
        this.attachSubelements( htmlElement.children[c] );
    }
};

ElementWrap.prototype.dataUpdated = null;  // Abstract method



///////////////////////////////////////////////////////////////////////////////////////
// Transitory message display

const MESSAGE_TRANSITION_MS = 2000;  // Match CSS-transition-time for CSS-rule for class=Message

// Returns updated value of struct 
    function
showMessageStruct( struct, div ){
    if ( struct ){
        showMessage( struct.text, struct.color, struct.ms, div, struct.textDefault );
    }
    return null;
}

    function
showMessage( text, color, disappearMs, element, textDefault ){

    stopMessageTimer( element );
    
    // If new message is unchanged... do nothing
    if ( element.innerHTML == text ){  return;  }

    // If new text is empty... clear message
    if ( ! text ){
        clearMessage( element, textDefault );
        return;
    }

    // Set text
    element.innerHTML = text;
    element.style.color = color;

    // Show message
    element.style.opacity = 1.0;  // Requires MESSAGE_TRANSITION_MS
    element.style.height = Math.max( element.scrollHeight, element.offsetHeight ) + 'px';  // scrollHeight may omit borders, and offsetHeight may be zero for plain-text

    // Start to hide message after delay.  Store timer in html-element itself, to ensure 1-to-1 relation.
    if ( disappearMs ){
        element.hideTimer = setTimeout(
            function(){ clearMessage(element, textDefault); } ,
            disappearMs
        );
    }
}

    function
clearMessage( element, textDefault ){
    if ( textDefault ){
        element.innerHTML = textDefault;
        element.style.color = null;
    }
    else {
        hideMessage( element );
    }
}

    function
hideMessage( element ){
    stopMessageTimer( element );
    if ( isHidden( element ) ){  return;  }

    // Start transition
    element.style.opacity = 0.0;  // Requires MESSAGE_TRANSITION_MS
    element.style.height = '0px';
    // Finish hiding message after transition.  Store timer in html-element, to ensure 1-to-1 relation.
    // Could change innerHTML without delay, because transitioning line-height is enough prevent visual jerk
    // Empty the inner-html, to allow re-showing the same message
    element.hideTimer = setTimeout( function(){
        element.innerHTML = '';
    } , MESSAGE_TRANSITION_MS );
}

    function
isHidden( element ){  
    return ( ! element.innerHTML  ||  element.style.visibility == 'hidden' );  
}

    function
stopMessageTimer( element ){
    // Stop existing timer stored in element
    if ( element.hideTimer ){
        clearTimeout( element.hideTimer );
        element.hideTimer = null;
    }
}

// Prevents multiple delayed-calls to f()
// Stores f() delayed-call handle, inside f() itself.
    function
deduplicate( delayMs, obj, f ){
    if ( f.deduplicateTimer ){
        clearTimeout( f.deduplicateTimer );
        f.deduplicateTimer = null;
    }
    f.deduplicateTimer = setTimeout( f.bind(obj) , delayMs );
}



///////////////////////////////////////////////////////////////////////////////////////
// Focus and traversal

// Make ENTER key activate links and buttons
    function
enterToClick( event ){
    if( event.key == KEY_NAME_ENTER ){  event.currentTarget.click();  }
}

    function
containsFocus( containingElement ){
    for ( var ancestor = document.activeElement;  ancestor != null;  ancestor = ancestor.parentElement ){
        if ( ancestor == containingElement ){  return true;  }
    }
    return false;
}

    function
focusNextTabStop( currentElement ){
    // Scan forward to next HTML element with tabstop >= 0
    for ( var e = nextElementOutside( currentElement );  e != null;  e = nextElement(e) ){
        if ( e.tabIndex !== undefined  &&  e.tabIndex !== null  &&  e.tabIndex >= 0 ){
            e.focus();
            return;
        }
    }
}

    function
nextElement( element ){
    if ( ! element ){  return null;  }
    // If element has children... return first child 
    if ( element.children  &&  element.children.length > 0 ){  return element.children[0];  }
    return nextElementOutside( element );
}

    function
nextElementOutside( element ){
    // For each ancestor, starting from element... if ancestor has next sibling... return sibling 
    for ( var ancestor = element;  ancestor != null;  ancestor = ancestor.parentElement ){
        if ( ancestor.nextElementSibling ){
            return ancestor.nextElementSibling;
        }
    }
    return null;
}



///////////////////////////////////////////////////////////////////////////////////////
// AJAX

    function
ajaxPost( sendData, url, callback, synchronous ){
    // callback:f(errorMessage, statusCode, responseData)

    jQuery.ajax( {
        accepts: 'application/json' ,
        async: !synchronous ,
        contentType: 'application/json' ,
        data: JSON.stringify(sendData) ,
        dataType: 'json' ,
        error: function(request, statusCode, errorMessage){
            // nodeJs/Express can return error code + JSON, but jQuery will discard the JSON data.
            var responseData = null;
            try {  responseData = JSON.parse( request.responseText );  } catch(e){  }
            callback(errorMessage, statusCode, responseData);
            } ,
        method: 'POST' ,
        success: function(responseData, statusCode, request){
            if ( responseData ){  callback(null, statusCode, responseData);  }
            else {  callback('data response failed', statusCode, responseData);  }
        } ,
        url: url
    } );

    return false;
}


    function
ajaxGet( sendData, url, callback ){
    // callback:f(errorMessage, statusCode, responseData)
    
    const useAjaxFileForTest = false;

    jQuery.ajax( {
        accepts: 'application/json' , 
        async: true ,
        cache: false ,
        data: sendData ,
        dataType: 'json' ,
        error: function(request, statusCode, errorMessage){
            // nodeJs/Express can return error code + JSON, but jQuery will discard the JSON data.
            var responseData = null;
            try {  responseData = JSON.parse( request.responseText );  }  catch(e){  }
            callback(errorMessage, statusCode, responseData);
        } ,
        method: 'GET' ,
        beforeSend:  useAjaxFileForTest ?  function(xhr){ xhr.overrideMimeType('application/json'); }  :  undefined ,
        success: function(responseData, statusCode, request){
            if ( responseData ){  callback(null, statusCode, responseData);  }
            else {  callback('data response failed', statusCode, responseData);  }
        } ,
        url: url
    } );
    return false;
}



///////////////////////////////////////////////////////////////////////////////////////
// Login

    function
setClickHandler( elementId, handler ){
    var element = elementWithId( elementId );
    if ( ! element ){  return;  }
    element.onclick = handler;
}

// Cookies-required dialog buttons
setClickHandler( 'cookiesRequiredDiv', function(event){
    // If click is not inside modelPopupDiv... hide dialog, uncheck login-required-checkbox
    if ( ! $(event.target).parents('.modalPopupDiv').length ){ hide('cookiesRequiredDiv'); uncheckLoginRequired(); }  
} );
setClickHandler( 'cookiesCancelButton', function(){ hide('cookiesRequiredDiv'); uncheckLoginRequired(); } );

// Login-required dialog buttons
setClickHandler( 'loginRequiredDiv', function(event){  
    if ( ! $(event.target).parents('.modalPopupDiv').length ){ hide('loginRequiredDiv'); uncheckLoginRequired(); }  
} );
setClickHandler( 'loginCancelButton', function(){ hide('loginRequiredDiv'); uncheckLoginRequired(); } );
setClickHandler( 'loginButton', function(){  return openLoginPage(); } );

// Logout dialog buttons
setClickHandler( 'logoutDiv', function(event){
    if ( ! $(event.target).parents('.modalPopupDiv').length ){ hide('logoutDiv'); }  
} );
setClickHandler( 'logoutCancelButton', function(){ hide('logoutDiv') } );
setClickHandler( 'logoutButton', function(){  requestLogout( onLoggedOut )  } );

// Login menu buttons
setClickHandler( 'menuItemLogin', requireLogin );
setClickHandler( 'menuItemLogout', function(){  
    document.getElementById('logoutDiv').setAttribute( 'show', null );  
    elementWithId('logoutCancelButton').focus();
} );

    function
uncheckLoginRequired(){
    let loginRequiredCheckboxes = document.getElementsByClassName('loginRequiredCheckbox');
    for ( let l = 0;  l < loginRequiredCheckboxes.length;  ++l ){
        loginRequiredCheckboxes[l].checked = false;
    }
}



    function
requireLogin( ){
    // Returns loggedIn:boolean
    // Optional callback:f( loggedIn:boolean ) , not yet implemented nor used
    //     callback() would have to be invoked on tab-focus, so stored globally or in login-dialog-div
    
    // If login-cookie does not exist...
    //     Pop up login-required dialog, which opens login-tab, retrieves login-request-id & signature, posts to login-site.
    //     When login-site succeeds, login-tab redirects to calling site, and calling site sets login-cookie.
    //     When login-tab disappears & page re-focuses, dismiss login-required dialog, retrieve login-crumb.

    // If browser cookie is not set... show cookies-required dialog
    var cookiesRequiredDiv = document.getElementById('cookiesRequiredDiv');
    if ( document.cookie ){ 
        cookiesRequiredDiv.setAttribute( 'show', 'false' );
    }
    else {
        cookiesRequiredDiv.setAttribute( 'show', null );
        document.getElementById('cookiesCancelButton').focus();
        return false;
    }

    // If not logged in... show login-dialog
    if ( ! haveLoginCookie() ){
        showLoggedOutControls();
        elementWithId('loginRequiredDiv').setAttribute('show', null);
        elementWithId('loginButton').focus();
    }

    return true;
}



    function
openLoginPage( ){

    // Server generates login-request-key, signs login-request using app-secret
    // Because Safari only allows new tab/window from within button onclick={return true} function ...
    //     run AJAX synchronously to retrieve login-request-signature.
    // Alternatively... if browser blocks form submit to new tab via form.submit() ... 
    //     AJAX-retrieve signature before showing dialog, then use login-button to submit to new tab, without javascript.
    //         Risk of undetectable signature timeout before user completes login.
    //             Refresh signature with page refocus + client-side timer?
    //     Or... immediately show dialog, with login-button disabled until signature retrieved async

    var ajaxSync = true;
    var ajaxSuccess = false;
    ajaxPost( {crumb:crumb, fingerprint:fingerprint}, 'signLoginRequest', function(error, status, responseData){

        if ( error  ||  !responseData.success  ||  ! responseData.signature  ||  ! responseData.loginRequestId ){  return;  }

        // In a new tab, post data to voter-login service
        document.getElementById('inputSignature').value = responseData.signature;
        document.getElementById('requestId').value = responseData.loginRequestId;
        ajaxSuccess = true;
    } , ajaxSync );
    
    return ajaxSuccess;
}



    function
updateWaitingLogin( callback=null ){
    // Called on page-focus, to dismiss login-dialog, and try to retrieve login crumb 
    let loggedIn = updateLoginDialog();
    if ( callback ){  callback( loggedIn );  }
}

    function
showingLoginDialog( ){
    var loginRequiredDiv = elementWithId('loginRequiredDiv');
    var show = loginRequiredDiv.getAttribute('show');
    return (show != 'false');
}

    function
updateLoginDialog( ){
    // Will show/hide dialog, but will not try to retrieve login data
    let loggedIn = haveLoginCookie();
    if ( loggedIn ){  showLoggedInControls();  }
    else           {  showLoggedOutControls();  }
    return loggedIn;
}

    function
showLoggedInControls( ){
    elementWithId('loginRequiredDiv').setAttribute('show', 'false');
    elementWithId('menuItemLogin').setAttribute('show', 'false');
    elementWithId('menuItemLogout').setAttribute('show', null);

    var city = loginCity();
    elementWithId('menuItemCity').innerHTML = city;
    elementWithId('menuItemCity').setAttribute( 'show' , (city ? null : 'false') );
}

    function
showLoggedOutControls( requireLogin ){
    elementWithId('menuItemLogin').setAttribute('show', null);
    elementWithId('menuItemLogout').setAttribute('show', 'false');

    elementWithId('menuItemCity').setAttribute('show', 'false');
}

    function
loginCity( ){
    var cookieData = parseCookie();
    if ( ! cookieData ){  return null;  }
    var city = cookieData['city'];
    return city ?  city  :  null;
}

    function
haveLoginCookie( ){
    var cookieData = parseCookie();
    return ( cookieData  &&  cookieData['hasVoterId'] );
}

// Returns data-structure or null
    function
parseCookie( logAll ){
    // For each cookie...
    var cookies = document.cookie.split(';');
    var cookieDataForJavascript = null;
    for ( let c = 0;  c < cookies.length;  ++c ){
        let cookie = cookies[c];
        // Parse cookie base-64-encoded JSON
        let cookieNameAndValue = cookie.split('=');
        let cookieName = cookieNameAndValue[0];
        cookieName =  ( cookieName )?  cookieName.trim()  :  null;
        let cookieValue = cookieNameAndValue[1];
        // Skip cookie from login-site, when both sites live in the same server
        if ( cookieName == 'L' ){  continue;  }
        let cookieValue64 = ( cookieValue )?  cookieValue.replace( /"/g, '' ).replace( /\\075/g , '=' )  :  null;
        let cookieValueJson = ( cookieValue64 )?  atob( cookieValue64 )  :  null;
        if ( logAll ){  console.log( 'parseCookie() cookieName=', cookieName, 'cookieValueJson=', cookieValueJson );  }
        let cookieData = ( cookieValueJson )?  JSON.parse( cookieValueJson )  :  null;
        // Only return data from cookie that is intended to be visible to javascript
        if ( cookieName == 'J' ){
            cookieDataForJavascript = cookieData;
            if ( ! logAll ){  break;  }
        }
    }
    return cookieDataForJavascript;
}

    function
requestLogout( callback ){
    // Requests logout
    // Runs callback when logged out
    var sendData = { crumb:crumb , fingerprint:fingerprint };
    ajaxPost( sendData, 'submitLogout', function(error, status, responseData){
        var success = (  !error  &&  responseData  &&  ( responseData.success || responseData.message == NO_LOGIN )  );
        if ( success ){  callback();  }
    } );
}

    function
onLoggedOut( ){
    hide('logoutDiv');
    updateLoginDialog();
    crumbForLogin = null;
}

    function
hide( elementId ){
    elementWithId( elementId ).setAttribute( 'show', 'false' );
}




///////////////////////////////////////////////////////////////////////////////////////
// Text matching


    function
incrementWordCounts( text, wordToCount ){
    let words = removeStopWords(   unique(  removeStems( tokenize(text) )  )   ); 
    words = tuples( words, 2 ); 
 
    // For each unique word/tuple in text... increment word-count 
    for ( let w = 0;  w < words.length;  ++w ){ 
        incrementMapValue( wordToCount, words[w], 1 ); 
    } 
}
 
    function
wordMatchScore( text1, text2, wordToCount ){ 
    if ( ! wordToCount ){  return 0;  } 
    let words1 =  new Set(   tuples(  removeStopWords( unique( removeStems( tokenize(text1) ) ) ) ,  2  )   );
    let words2 =  new Set(   tuples(  removeStopWords( unique( removeStems( tokenize(text2) ) ) ) ,  2  )   );
 
    // For each unique word/tuple in both texts... increment match-score by inverse-document-frequency
    let score = 0;
    for ( let word of words1 ){
        if ( ! words2.has(word) ){  continue;  }
        let count = wordToCount[ word ];
        if ( ! count ){  continue;  }
        score += 1.0 / ( 1 + count );
    }

    return score;
}


    function
keywordsToHighlightSpans( keywordsString, text ){
    var intervals = keywordMatchIntervals( keywordsString, text );
    return intervalsToHighlightSpans( intervals, text );
}

    function
intervalsToHighlightSpans( intervals, text ){
    let spans = [];
    for ( let i = 0;  i < intervals.length;  ++i ){
        let interval = intervals[i];
        let matchText = text.substring( interval.start, interval.end );
        let spanClass = ( interval.match )? 'Highlight' : null;
        spans.push( html('span').class(spanClass).innerHtml(matchText).build() );
    }
    return spans;
}

    function
keywordMatchIntervals( keywordsString, text ){

    var intervals = [];
    if ( ! text ){  return intervals;  }

    // Collect matching words, dropping suffixes
    // Ignore case, stop-words, suffixes ("ed", "s", "ing")
    // Include whitespace between matched words
    var keywordsArray = tokenize( keywordsString );
    keywordsArray = keywordsArray.filter(  function(w){ return (w != '') && !(w in STOP_WORDS); }  );

    var keywordStems = keywordsArray.map( function(w){ return w.replace( /(s|ed|ing)$/ , '' ); } )
    keywordStems = unique( keywordStems );
    keywordStems = keywordStems.filter(  function(w){ return (w != '') && !(w in STOP_WORDS); }  );

    // Construct regex to match answer input word sequences, with filtering and stemming
    var stemsRegexText = keywordStems.join('|');
    var wordsRegexText = '\\b(' + stemsRegexText + ')(s|ed|ing|)\\b';  // Require word boundaries around match

    var wordSeqRegex = new RegExp(  '(' + wordsRegexText + '\\s*)+' , 'ig'  );  // Highlight a sequence of words with space between

    // Loop, for each match, with limit because some regex may match everything ...
    var lastMatchEnd = 0;
    var maxLoops = 30;
    for ( var match = true;  maxLoops > 0  &&   match;  --maxLoops ){
        // Find matching word sequence
        wordSeqRegex.lastIndex = lastMatchEnd;
        match = ( stemsRegexText == '' ) ?  false  :  wordSeqRegex.exec( text );
    
        // Append preceding non-matching span
        var nonMatchingEnd = ( match )?  match.index  :  text.length;
        intervals.push( {start:lastMatchEnd, end:nonMatchingEnd, match:false} );

        // Append collected matching span
        if ( match ){
            lastMatchEnd = match.index + match[0].length;
            intervals.push( {start:match.index, end:lastMatchEnd, match:true} );
        }
    }
    if (maxLoops <= 0){  console.error( 'maxLoops=0' );  }
    
    return intervals;
}

    function
firstTokens( text, charLimit ){
    let tokens = tokenize( text );
    let keptTokens = [ ];
    let charCount = 0;
    for ( let t = 0;  (t < tokens.length) && (charCount < charLimit);  ++t ){
        let token = tokens[t];
        keptTokens.push( token );
        charCount += token.length;
    }
    return keptTokens;
}

    function
tokenize( text ){
    if ( ! text ){  return [];  }
    let ascii = false;
    let tokens = null;
    if ( ascii ){  tokens = text.toLowerCase().split( /[^a-z0-9\-]+/ );  }  // Handles ASCII/english only
    else        {  tokens = text.toLowerCase().split( /[^\p{L}\p{N}]+/u );  }    // Split at unicode non-letters non-numbers
    return tokens.filter( Boolean );  // Remove empty tokens
}

    function
removeStem( word ){  return ( word )?  word.replace( /(s|ed|ing)$/ , '' )  :  '';  }

    function
removeStems( words ){  return ( words )?  words.map( removeStem )  :  [];  }

    function
removeStopWords( words ){  return ( words )?  words.filter(  function(w){ return w && !(w in STOP_WORDS); }  )  :  [];  }

    function
tuples( words, maxSize=2 ){
    let tuples = [];
    if ( (words == null) || (maxSize < 1) ){  return tuples;  }
    // For each word x tuple-length... collect word-sub-sequence
    for ( let w = 0;  w < words.length;  ++w ){
        for ( let s = 0;  s < Math.min( maxSize, words.length - w );  ++s ){
            tuples.push(  words.slice( w, w+s+1 ).join(' ')  );
        }
    }
    return tuples;
}




const AUTO_LINK_URL_HOSTS = [
    'allsides.com' ,
    'axios.com' ,
    'ballotpedia.org' ,
    'bostonglobe.com' ,
    'cbpp.org' ,
    'cbsnews.com' ,
    'childstats.gov' ,
    'cits.ucsb.edu' ,
    'edf.org' ,
    'factcheck.org' ,
    'forbes.com' ,
    'globalchange.gov' ,
    'kansan.com' ,
    'kidscount.org' ,
    'latimes.com' ,
    'medium.com' ,
    'mosieboyd.com' ,
    'nature.com' ,
    'nbcnews.com' ,
    'noaa.gov' ,
    'nymag.com' ,
    'nytimes.com' ,
    'pewresearch.org' ,
    'politifact.com' ,
    'publicintegrity.org' ,
    'reason.com' ,
    'sacbee.com' ,
    'sandiegouniontribune.com' ,
    'snopes.com' ,
    'statista.com' ,
    'thebalance.com' ,
    'thedartmouth.com' ,
    'theflipside.io' ,
    'theguardian.com' ,
    'usatoday.com' ,
    'uscis.gov' ,
    'votersedge.org' ,
    'votesmart.org' ,
    'vox.com' ,
    'washingtonpost.com' ,
    'washingtontimes.com' ,
    'wikipedia.org' ,
    'wired.com'
];

    function  // returns series[string]
storedTextToHtml( storedText ){
    if ( ! storedText ){  return '';  }

    // For each space-delimited word...
    var urlRegex = /(https?:\/\/[^ \n\r\t'"<>]+)/ ;
    var elements = storedText.split( urlRegex );   // series[string]
    elements = elements.map( function(e){
        // Turn whitelisted urls into links
        if ( e.match(urlRegex) ){  
            var url = new URL( e );
            var host = url.host.replace( /^www\./ , '' );  // Strip default sub-domain from host
            if ( AUTO_LINK_URL_HOSTS.indexOf( host ) >= 0 ) {
                return '<a href="'+e+'" target="_blank">'+e+'</a>';
            }
        }
        return e;
    } );

    // turn newline into html break
    var newElements = [ ];
    elements.map( function(e){
        var subElements = e.split( /(\n)/ );
        subElements.map(  function(s){ newElements.push((s == '\n')? '<br/>' : s) }  );
    } );
    elements = newElements;

    // turn tab into 4 spaces
    elements = elements.map(  function(e){
        return e.replace( /\t/g , '    ' );
    } );

    // turn 2spaces into &nbsp;
    newElements = [ ];
    elements.map( function(e){
        var subElements = e.split( /(  )/ );
        subElements.map(  function(s){ newElements.push((s == '  ')? '&nbsp;' : s) }  );
    } );

    return newElements.join('');
}



///////////////////////////////////////////////////////////////////////////////////////
// Browswer fingerprinting for cookie security

var fingerprint = null;

    function
requestInitialCookie( callback ){

    fingerprint = fingerprintBrowser();
   
    var ajaxSync = false;  // This function is called first on page-load, so making it sync is redundant
    ajaxPost( {crumb:crumb, fingerprint:fingerprint}, 'initialCookie', function(error, status, responseData){

        if ( error  ||  !responseData  ||  !responseData.success ){  return;  }

        // Cookie will have been set by http-response
        crumb = responseData.crumb;

        if ( callback ){  callback();  }

    } , ajaxSync );
}


const FONTS = [
    '.Aqua Kana' ,
    '.Helvetica LT MM' ,
    '.Times LT MM' ,
    '18thCentury' ,
    '8514oem' ,
    'AR BERKLEY' ,
    'AR JULIAN' ,
    'AR PL UKai CN' ,
    'AR PL UMing CN' ,
    'AR PL UMing HK' ,
    'AR PL UMing TW' ,
    'AR PL UMing TW MBE' ,
    'Aakar' ,
    'Abadi MT Condensed Extra Bold' ,
    'Abadi MT Condensed Light' ,
    'Abyssinica SIL' ,
    'AcmeFont' ,
    'Adobe Arabic' ,
    'Agency FB' ,
    'Aharoni' ,
    'Aharoni Bold' ,
    'Al Bayan' ,
    'Al Bayan Bold' ,
    'Al Bayan Plain' ,
    'Al Nile' ,
    'Al Tarikh' ,
    'Aldhabi' ,
    'Alfredo' ,
    'Algerian' ,
    'Alien Encounters' ,
    'Almonte Snow' ,
    'American Typewriter' ,
    'American Typewriter Bold' ,
    'American Typewriter Condensed' ,
    'American Typewriter Light' ,
    'Amethyst' ,
    'Andale Mono' ,
    'Andale Mono Version' ,
    'Andalus' ,
    'Angsana New' ,
    'AngsanaUPC' ,
    'Ani' ,
    'AnjaliOldLipi' ,
    'Aparajita' ,
    'Apple Braille' ,
    'Apple Braille Outline 6 Dot' ,
    'Apple Braille Outline 8 Dot' ,
    'Apple Braille Pinpoint 6 Dot' ,
    'Apple Braille Pinpoint 8 Dot' ,
    'Apple Chancery' ,
    'Apple Color Emoji' ,
    'Apple LiGothic Medium' ,
    'Apple LiSung Light' ,
    'Apple SD Gothic Neo' ,
    'Apple SD Gothic Neo Regular' ,
    'Apple SD GothicNeo ExtraBold' ,
    'Apple Symbols' ,
    'AppleGothic' ,
    'AppleGothic Regular' ,
    'AppleMyungjo' ,
    'AppleMyungjo Regular' ,
    'AquaKana' ,
    'Arabic Transparent' ,
    'Arabic Typesetting' ,
    'Arial' ,
    'Arial Baltic' ,
    'Arial Black' ,
    'Arial Bold' ,
    'Arial Bold Italic' ,
    'Arial CE' ,
    'Arial CYR' ,
    'Arial Greek' ,
    'Arial Hebrew' ,
    'Arial Hebrew Bold' ,
    'Arial Italic' ,
    'Arial Narrow' ,
    'Arial Narrow Bold' ,
    'Arial Narrow Bold Italic' ,
    'Arial Narrow Italic' ,
    'Arial Rounded Bold' ,
    'Arial Rounded MT Bold' ,
    'Arial TUR' ,
    'Arial Unicode MS' ,
    'ArialHB' ,
    'Arimo' ,
    'Asimov' ,
    'Autumn' ,
    'Avenir' ,
    'Avenir Black' ,
    'Avenir Book' ,
    'Avenir Next' ,
    'Avenir Next Bold' ,
    'Avenir Next Condensed' ,
    'Avenir Next Condensed Bold' ,
    'Avenir Next Demi Bold' ,
    'Avenir Next Heavy' ,
    'Avenir Next Regular' ,
    'Avenir Roman' ,
    'Ayuthaya' ,
    'BN Jinx' ,
    'BN Machine' ,
    'BOUTON International Symbols' ,
    'Baby Kruffy' ,
    'Baghdad' ,
    'Bahnschrift' ,
    'Balthazar' ,
    'Bangla MN' ,
    'Bangla MN Bold' ,
    'Bangla Sangam MN' ,
    'Bangla Sangam MN Bold' ,
    'Baskerville' ,
    'Baskerville Bold' ,
    'Baskerville Bold Italic' ,
    'Baskerville Old Face' ,
    'Baskerville SemiBold' ,
    'Baskerville SemiBold Italic' ,
    'Bastion' ,
    'Batang' ,
    'BatangChe' ,
    'Bauhaus 93' ,
    'Beirut' ,
    'Bell MT' ,
    'Bell MT Bold' ,
    'Bell MT Italic' ,
    'Bellerose' ,
    'Berlin Sans FB' ,
    'Berlin Sans FB Demi' ,
    'Bernard MT Condensed' ,
    'BiauKai' ,
    'Big Caslon' ,
    'Big Caslon Medium' ,
    'Birch Std' ,
    'Bitstream Charter' ,
    'Bitstream Vera Sans' ,
    'Blackadder ITC' ,
    'Blackoak Std' ,
    'Bobcat' ,
    'Bodoni 72' ,
    'Bodoni MT' ,
    'Bodoni MT Black' ,
    'Bodoni MT Poster Compressed' ,
    'Bodoni Ornaments' ,
    'BolsterBold' ,
    'Book Antiqua' ,
    'Book Antiqua Bold' ,
    'Bookman Old Style' ,
    'Bookman Old Style Bold' ,
    'Bookshelf Symbol 7' ,
    'Borealis' ,
    'Bradley Hand' ,
    'Bradley Hand ITC' ,
    'Braggadocio' ,
    'Brandish' ,
    'Britannic Bold' ,
    'Broadway' ,
    'Browallia New' ,
    'BrowalliaUPC' ,
    'Brush Script' ,
    'Brush Script MT' ,
    'Brush Script MT Italic' ,
    'Brush Script Std' ,
    'Brussels' ,
    'Calibri' ,
    'Calibri Bold' ,
    'Calibri Light' ,
    'Californian FB' ,
    'Calisto MT' ,
    'Calisto MT Bold' ,
    'Calligraphic' ,
    'Calvin' ,
    'Cambria' ,
    'Cambria Bold' ,
    'Cambria Math' ,
    'Candara' ,
    'Candara Bold' ,
    'Candles' ,
    'Carrois Gothic SC' ,
    'Castellar' ,
    'Centaur' ,
    'Century' ,
    'Century Gothic' ,
    'Century Gothic Bold' ,
    'Century Schoolbook' ,
    'Century Schoolbook Bold' ,
    'Century Schoolbook L' ,
    'Chalkboard' ,
    'Chalkboard Bold' ,
    'Chalkboard SE' ,
    'Chalkboard SE Bold' ,
    'ChalkboardBold' ,
    'Chalkduster' ,
    'Chandas' ,
    'Chaparral Pro' ,
    'Chaparral Pro Light' ,
    'Charlemagne Std' ,
    'Charter' ,
    'Chilanka' ,
    'Chiller' ,
    'Chinyen' ,
    'Clarendon' ,
    'Cochin' ,
    'Cochin Bold' ,
    'Colbert' ,
    'Colonna MT' ,
    'Comic Sans MS' ,
    'Comic Sans MS Bold' ,
    'Commons' ,
    'Consolas' ,
    'Consolas Bold' ,
    'Constantia' ,
    'Constantia Bold' ,
    'Coolsville' ,
    'Cooper Black' ,
    'Cooper Std Black' ,
    'Copperplate' ,
    'Copperplate Bold' ,
    'Copperplate Gothic Bold' ,
    'Copperplate Light' ,
    'Corbel' ,
    'Corbel Bold' ,
    'Cordia New' ,
    'CordiaUPC' ,
    'Corporate' ,
    'Corsiva' ,
    'Corsiva Hebrew' ,
    'Corsiva Hebrew Bold' ,
    'Courier' ,
    'Courier 10 Pitch' ,
    'Courier Bold' ,
    'Courier New' ,
    'Courier New Baltic' ,
    'Courier New Bold' ,
    'Courier New CE' ,
    'Courier New Italic' ,
    'Courier Oblique' ,
    'Cracked Johnnie' ,
    'Creepygirl' ,
    'Curlz MT' ,
    'Cursor' ,
    'Cutive Mono' ,
    'DFKai-SB' ,
    'DIN Alternate' ,
    'DIN Condensed' ,
    'Damascus' ,
    'Damascus Bold' ,
    'Dancing Script' ,
    'DaunPenh' ,
    'David' ,
    'Dayton' ,
    'DecoType Naskh' ,
    'Deja Vu' ,
    'DejaVu LGC Sans' ,
    'DejaVu Sans' ,
    'DejaVu Sans Mono' ,
    'DejaVu Serif' ,
    'Deneane' ,
    'Desdemona' ,
    'Detente' ,
    'Devanagari MT' ,
    'Devanagari MT Bold' ,
    'Devanagari Sangam MN' ,
    'Didot' ,
    'Didot Bold' ,
    'Digifit' ,
    'DilleniaUPC' ,
    'Dingbats' ,
    'Distant Galaxy' ,
    'Diwan Kufi' ,
    'Diwan Kufi Regular' ,
    'Diwan Thuluth' ,
    'Diwan Thuluth Regular' ,
    'DokChampa' ,
    'Dominican' ,
    'Dotum' ,
    'DotumChe' ,
    'Droid Sans' ,
    'Droid Sans Fallback' ,
    'Droid Sans Mono' ,
    'Dyuthi' ,
    'Ebrima' ,
    'Edwardian Script ITC' ,
    'Elephant' ,
    'Emmett' ,
    'Engravers MT' ,
    'Engravers MT Bold' ,
    'Enliven' ,
    'Eras Bold ITC' ,
    'Estrangelo Edessa' ,
    'Ethnocentric' ,
    'EucrosiaUPC' ,
    'Euphemia' ,
    'Euphemia UCAS' ,
    'Euphemia UCAS Bold' ,
    'Eurostile' ,
    'Eurostile Bold' ,
    'Expressway Rg' ,
    'FangSong' ,
    'Farah' ,
    'Farisi' ,
    'Felix Titling' ,
    'Fingerpop' ,
    'Fixedsys' ,
    'Flubber' ,
    'Footlight MT Light' ,
    'Forte' ,
    'FrankRuehl' ,
    'Frankfurter Venetian TT' ,
    'Franklin Gothic Book' ,
    'Franklin Gothic Book Italic' ,
    'Franklin Gothic Medium' ,
    'Franklin Gothic Medium Cond' ,
    'Franklin Gothic Medium Italic' ,
    'FreeMono' ,
    'FreeSans' ,
    'FreeSerif' ,
    'FreesiaUPC' ,
    'Freestyle Script' ,
    'French Script MT' ,
    'Futura' ,
    'Futura Condensed ExtraBold' ,
    'Futura Medium' ,
    'GB18030 Bitmap' ,
    'Gabriola' ,
    'Gadugi' ,
    'Garamond' ,
    'Garamond Bold' ,
    'Gargi' ,
    'Garuda' ,
    'Gautami' ,
    'Gazzarelli' ,
    'Geeza Pro' ,
    'Geeza Pro Bold' ,
    'Geneva' ,
    'GenevaCY' ,
    'Gentium' ,
    'Gentium Basic' ,
    'Gentium Book Basic' ,
    'GentiumAlt' ,
    'Georgia' ,
    'Georgia Bold' ,
    'Geotype TT' ,
    'Giddyup Std' ,
    'Gigi' ,
    'Gill' ,
    'Gill Sans' ,
    'Gill Sans Bold' ,
    'Gill Sans MT' ,
    'Gill Sans MT Bold' ,
    'Gill Sans MT Condensed' ,
    'Gill Sans MT Ext Condensed Bold' ,
    'Gill Sans MT Italic' ,
    'Gill Sans Ultra Bold' ,
    'Gill Sans Ultra Bold Condensed' ,
    'Gisha' ,
    'Glockenspiel' ,
    'Gloucester MT Extra Condensed' ,
    'Good Times' ,
    'Goudy' ,
    'Goudy Old Style' ,
    'Goudy Old Style Bold' ,
    'Goudy Stout' ,
    'Greek Diner Inline TT' ,
    'Gubbi' ,
    'Gujarati MT' ,
    'Gujarati MT Bold' ,
    'Gujarati Sangam MN' ,
    'Gujarati Sangam MN Bold' ,
    'Gulim' ,
    'GulimChe' ,
    'GungSeo Regular' ,
    'Gungseouche' ,
    'Gungsuh' ,
    'GungsuhChe' ,
    'Gurmukhi' ,
    'Gurmukhi MN' ,
    'Gurmukhi MN Bold' ,
    'Gurmukhi MT' ,
    'Gurmukhi Sangam MN' ,
    'Gurmukhi Sangam MN Bold' ,
    'Haettenschweiler' ,
    'Hand Me Down S (BRK)' ,
    'Hansen' ,
    'Harlow Solid Italic' ,
    'Harrington' ,
    'Harvest' ,
    'HarvestItal' ,
    'Haxton Logos TT' ,
    'HeadLineA Regular' ,
    'HeadlineA' ,
    'Heavy Heap' ,
    'Hei' ,
    'Hei Regular' ,
    'Heiti SC' ,
    'Heiti SC Light' ,
    'Heiti SC Medium' ,
    'Heiti TC' ,
    'Heiti TC Light' ,
    'Heiti TC Medium' ,
    'Helvetica' ,
    'Helvetica Bold' ,
    'Helvetica CY Bold' ,
    'Helvetica CY Plain' ,
    'Helvetica LT Std' ,
    'Helvetica Light' ,
    'Helvetica Neue' ,
    'Helvetica Neue Bold' ,
    'Helvetica Neue Medium' ,
    'Helvetica Oblique' ,
    'HelveticaCY' ,
    'HelveticaNeueLT Com 107 XBlkCn' ,
    'Herculanum' ,
    'High Tower Text' ,
    'Highboot' ,
    'Hiragino Kaku Gothic Pro W3' ,
    'Hiragino Kaku Gothic Pro W6' ,
    'Hiragino Kaku Gothic ProN W3' ,
    'Hiragino Kaku Gothic ProN W6' ,
    'Hiragino Kaku Gothic Std W8' ,
    'Hiragino Kaku Gothic StdN W8' ,
    'Hiragino Maru Gothic Pro W4' ,
    'Hiragino Maru Gothic ProN W4' ,
    'Hiragino Mincho Pro W3' ,
    'Hiragino Mincho Pro W6' ,
    'Hiragino Mincho ProN W3' ,
    'Hiragino Mincho ProN W6' ,
    'Hiragino Sans GB W3' ,
    'Hiragino Sans GB W6' ,
    'Hiragino Sans W0' ,
    'Hiragino Sans W1' ,
    'Hiragino Sans W2' ,
    'Hiragino Sans W3' ,
    'Hiragino Sans W4' ,
    'Hiragino Sans W5' ,
    'Hiragino Sans W6' ,
    'Hiragino Sans W7' ,
    'Hiragino Sans W8' ,
    'Hiragino Sans W9' ,
    'Hobo Std' ,
    'Hoefler Text' ,
    'Hoefler Text Black' ,
    'Hoefler Text Ornaments' ,
    'Hollywood Hills' ,
    'Hombre' ,
    'Huxley Titling' ,
    'ITC Stone Serif' ,
    'ITF Devanagari' ,
    'ITF Devanagari Marathi' ,
    'ITF Devanagari Medium' ,
    'Impact' ,
    'Imprint MT Shadow' ,
    'InaiMathi' ,
    'Induction' ,
    'Informal Roman' ,
    'Ink Free' ,
    'IrisUPC' ,
    'Iskoola Pota' ,
    'Italianate' ,
    'Jamrul' ,
    'JasmineUPC' ,
    'Javanese Text' ,
    'Jokerman' ,
    'Juice ITC' ,
    'KacstArt' ,
    'KacstBook' ,
    'KacstDecorative' ,
    'KacstDigital' ,
    'KacstFarsi' ,
    'KacstLetter' ,
    'KacstNaskh' ,
    'KacstOffice' ,
    'KacstOne' ,
    'KacstPen' ,
    'KacstPoster' ,
    'KacstQurn' ,
    'KacstScreen' ,
    'KacstTitle' ,
    'KacstTitleL' ,
    'Kai' ,
    'Kai Regular' ,
    'KaiTi' ,
    'Kailasa' ,
    'Kailasa Regular' ,
    'Kaiti SC' ,
    'Kaiti SC Black' ,
    'Kalapi' ,
    'Kalimati' ,
    'Kalinga' ,
    'Kannada MN' ,
    'Kannada MN Bold' ,
    'Kannada Sangam MN' ,
    'Kannada Sangam MN Bold' ,
    'Kartika' ,
    'Karumbi' ,
    'Kedage' ,
    'Kefa' ,
    'Kefa Bold' ,
    'Keraleeyam' ,
    'Keyboard' ,
    'Khmer MN' ,
    'Khmer MN Bold' ,
    'Khmer OS' ,
    'Khmer OS System' ,
    'Khmer Sangam MN' ,
    'Khmer UI' ,
    'Kinnari' ,
    'Kino MT' ,
    'KodchiangUPC' ,
    'Kohinoor Bangla' ,
    'Kohinoor Devanagari' ,
    'Kohinoor Telugu' ,
    'Kokila' ,
    'Kokonor' ,
    'Kokonor Regular' ,
    'Kozuka Gothic Pr6N B' ,
    'Kristen ITC' ,
    'Krungthep' ,
    'KufiStandardGK' ,
    'KufiStandardGK Regular' ,
    'Kunstler Script' ,
    'Laksaman' ,
    'Lao MN' ,
    'Lao Sangam MN' ,
    'Lao UI' ,
    'LastResort' ,
    'Latha' ,
    'Leelawadee' ,
    'Letter Gothic Std' ,
    'LetterOMatic!' ,
    'Levenim MT' ,
    'LiHei Pro' ,
    'LiSong Pro' ,
    'Liberation Mono' ,
    'Liberation Sans' ,
    'Liberation Sans Narrow' ,
    'Liberation Serif' ,
    'Likhan' ,
    'LilyUPC' ,
    'Limousine' ,
    'Lithos Pro Regular' ,
    'LittleLordFontleroy' ,
    'Lohit Assamese' ,
    'Lohit Bengali' ,
    'Lohit Devanagari' ,
    'Lohit Gujarati' ,
    'Lohit Gurmukhi' ,
    'Lohit Hindi' ,
    'Lohit Kannada' ,
    'Lohit Malayalam' ,
    'Lohit Odia' ,
    'Lohit Punjabi' ,
    'Lohit Tamil' ,
    'Lohit Tamil Classical' ,
    'Lohit Telugu' ,
    'Loma' ,
    'Lucida Blackletter' ,
    'Lucida Bright' ,
    'Lucida Bright Demibold' ,
    'Lucida Bright Demibold Italic' ,
    'Lucida Bright Italic' ,
    'Lucida Calligraphy' ,
    'Lucida Calligraphy Italic' ,
    'Lucida Console' ,
    'Lucida Fax' ,
    'Lucida Fax Demibold' ,
    'Lucida Fax Regular' ,
    'Lucida Grande' ,
    'Lucida Grande Bold' ,
    'Lucida Handwriting' ,
    'Lucida Handwriting Italic' ,
    'Lucida Sans' ,
    'Lucida Sans Demibold Italic' ,
    'Lucida Sans Typewriter' ,
    'Lucida Sans Typewriter Bold' ,
    'Lucida Sans Unicode' ,
    'Luminari' ,
    'Luxi Mono' ,
    'MS Gothic' ,
    'MS Mincho' ,
    'MS Outlook' ,
    'MS PGothic' ,
    'MS PMincho' ,
    'MS Reference Sans Serif' ,
    'MS Reference Specialty' ,
    'MS Sans Serif' ,
    'MS Serif' ,
    'MS UI Gothic' ,
    'MT Extra' ,
    'MV Boli' ,
    'Mael' ,
    'Magneto' ,
    'Maiandra GD' ,
    'Malayalam MN' ,
    'Malayalam MN Bold' ,
    'Malayalam Sangam MN' ,
    'Malayalam Sangam MN Bold' ,
    'Malgun Gothic' ,
    'Mallige' ,
    'Mangal' ,
    'Manorly' ,
    'Marion' ,
    'Marion Bold' ,
    'Marker Felt' ,
    'Marker Felt Thin' ,
    'Marlett' ,
    'Martina' ,
    'Matura MT Script Capitals' ,
    'Meera' ,
    'Meiryo' ,
    'Meiryo Bold' ,
    'Meiryo UI' ,
    'MelodBold' ,
    'Menlo' ,
    'Menlo Bold' ,
    'Mesquite Std' ,
    'Microsoft' ,
    'Microsoft Himalaya' ,
    'Microsoft JhengHei' ,
    'Microsoft JhengHei UI' ,
    'Microsoft New Tai Lue' ,
    'Microsoft PhagsPa' ,
    'Microsoft Sans Serif' ,
    'Microsoft Tai Le' ,
    'Microsoft Tai Le Bold' ,
    'Microsoft Uighur' ,
    'Microsoft YaHei' ,
    'Microsoft YaHei UI' ,
    'Microsoft Yi Baiti' ,
    'Minerva' ,
    'MingLiU' ,
    'MingLiU-ExtB' ,
    'MingLiU_HKSCS' ,
    'Minion Pro' ,
    'Miriam' ,
    'Mishafi' ,
    'Mishafi Gold' ,
    'Mistral' ,
    'Modern' ,
    'Modern No. 20' ,
    'Monaco' ,
    'Mongolian Baiti' ,
    'Monospace' ,
    'Monotype Corsiva' ,
    'Monotype Sorts' ,
    'MoolBoran' ,
    'Moonbeam' ,
    'MotoyaLMaru' ,
    'Mshtakan' ,
    'Mshtakan Bold' ,
    'Mukti Narrow' ,
    'Muna' ,
    'Myanmar MN' ,
    'Myanmar MN Bold' ,
    'Myanmar Sangam MN' ,
    'Myanmar Text' ,
    'Mycalc' ,
    'Myriad Arabic' ,
    'Myriad Hebrew' ,
    'Myriad Pro' ,
    'NISC18030' ,
    'NSimSun' ,
    'Nadeem' ,
    'Nadeem Regular' ,
    'Nakula' ,
    'Nanum Barun Gothic' ,
    'Nanum Gothic' ,
    'Nanum Myeongjo' ,
    'NanumBarunGothic' ,
    'NanumGothic' ,
    'NanumGothic Bold' ,
    'NanumGothicCoding' ,
    'NanumMyeongjo' ,
    'NanumMyeongjo Bold' ,
    'Narkisim' ,
    'Nasalization' ,
    'Navilu' ,
    'Neon Lights' ,
    'New Peninim MT' ,
    'New Peninim MT Bold' ,
    'News Gothic MT' ,
    'News Gothic MT Bold' ,
    'Niagara Engraved' ,
    'Niagara Solid' ,
    'Nimbus Mono L' ,
    'Nimbus Roman No9 L' ,
    'Nimbus Sans L' ,
    'Nimbus Sans L Condensed' ,
    'Nina' ,
    'Nirmala UI' ,
    'Nirmala.ttf' ,
    'Norasi' ,
    'Noteworthy' ,
    'Noteworthy Bold' ,
    'Noto Color Emoji' ,
    'Noto Emoji' ,
    'Noto Mono' ,
    'Noto Naskh Arabic' ,
    'Noto Nastaliq Urdu' ,
    'Noto Sans' ,
    'Noto Sans Armenian' ,
    'Noto Sans Bengali' ,
    'Noto Sans CJK' ,
    'Noto Sans Canadian Aboriginal' ,
    'Noto Sans Cherokee' ,
    'Noto Sans Devanagari' ,
    'Noto Sans Ethiopic' ,
    'Noto Sans Georgian' ,
    'Noto Sans Gujarati' ,
    'Noto Sans Gurmukhi' ,
    'Noto Sans Hebrew' ,
    'Noto Sans JP' ,
    'Noto Sans KR' ,
    'Noto Sans Kannada' ,
    'Noto Sans Khmer' ,
    'Noto Sans Lao' ,
    'Noto Sans Malayalam' ,
    'Noto Sans Myanmar' ,
    'Noto Sans Oriya' ,
    'Noto Sans SC' ,
    'Noto Sans Sinhala' ,
    'Noto Sans Symbols' ,
    'Noto Sans TC' ,
    'Noto Sans Tamil' ,
    'Noto Sans Telugu' ,
    'Noto Sans Thai' ,
    'Noto Sans Yi' ,
    'Noto Serif' ,
    'Notram' ,
    'November' ,
    'Nueva Std' ,
    'Nueva Std Cond' ,
    'Nyala' ,
    'OCR A Extended' ,
    'OCR A Std' ,
    'Old English Text MT' ,
    'OldeEnglish' ,
    'Onyx' ,
    'OpenSymbol' ,
    'OpineHeavy' ,
    'Optima' ,
    'Optima Bold' ,
    'Optima Regular' ,
    'Orator Std' ,
    'Oriya MN' ,
    'Oriya MN Bold' ,
    'Oriya Sangam MN' ,
    'Oriya Sangam MN Bold' ,
    'Osaka' ,
    'Osaka-Mono' ,
    'OsakaMono' ,
    'PCMyungjo Regular' ,
    'PCmyoungjo' ,
    'PMingLiU' ,
    'PMingLiU-ExtB' ,
    'PR Celtic Narrow' ,
    'PT Mono' ,
    'PT Sans' ,
    'PT Sans Bold' ,
    'PT Sans Caption Bold' ,
    'PT Sans Narrow Bold' ,
    'PT Serif' ,
    'Padauk' ,
    'Padauk Book' ,
    'Padmaa' ,
    'Pagul' ,
    'Palace Script MT' ,
    'Palatino' ,
    'Palatino Bold' ,
    'Palatino Linotype' ,
    'Palatino Linotype Bold' ,
    'Papyrus' ,
    'Papyrus Condensed' ,
    'Parchment' ,
    'Parry Hotter' ,
    'PenultimateLight' ,
    'Perpetua' ,
    'Perpetua Bold' ,
    'Perpetua Titling MT' ,
    'Perpetua Titling MT Bold' ,
    'Phetsarath OT' ,
    'Phosphate' ,
    'Phosphate Inline' ,
    'Phosphate Solid' ,
    'PhrasticMedium' ,
    'PilGi Regular' ,
    'Pilgiche' ,
    'PingFang HK' ,
    'PingFang SC' ,
    'PingFang TC' ,
    'Pirate' ,
    'Plantagenet Cherokee' ,
    'Playbill' ,
    'Poor Richard' ,
    'Poplar Std' ,
    'Pothana2000' ,
    'Prestige Elite Std' ,
    'Pristina' ,
    'Purisa' ,
    'QuiverItal' ,
    'Raanana' ,
    'Raanana Bold' ,
    'Raavi' ,
    'Rachana' ,
    'Rage Italic' ,
    'RaghuMalayalam' ,
    'Ravie' ,
    'Rekha' ,
    'Roboto' ,
    'Rockwell' ,
    'Rockwell Bold' ,
    'Rockwell Condensed' ,
    'Rockwell Extra Bold' ,
    'Rockwell Italic' ,
    'Rod' ,
    'Roland' ,
    'Rondalo' ,
    'Rosewood Std Regular' ,
    'RowdyHeavy' ,
    'Russel Write TT' ,
    'SF Movie Poster' ,
    'STFangsong' ,
    'STHeiti' ,
    'STIXGeneral' ,
    'STIXGeneral-Bold' ,
    'STIXGeneral-Regular' ,
    'STIXIntegralsD' ,
    'STIXIntegralsD-Bold' ,
    'STIXIntegralsSm' ,
    'STIXIntegralsSm-Bold' ,
    'STIXIntegralsUp' ,
    'STIXIntegralsUp-Bold' ,
    'STIXIntegralsUp-Regular' ,
    'STIXIntegralsUpD' ,
    'STIXIntegralsUpD-Bold' ,
    'STIXIntegralsUpD-Regular' ,
    'STIXIntegralsUpSm' ,
    'STIXIntegralsUpSm-Bold' ,
    'STIXNonUnicode' ,
    'STIXNonUnicode-Bold' ,
    'STIXSizeFiveSym' ,
    'STIXSizeFiveSym-Regular' ,
    'STIXSizeFourSym' ,
    'STIXSizeFourSym-Bold' ,
    'STIXSizeOneSym' ,
    'STIXSizeOneSym-Bold' ,
    'STIXSizeThreeSym' ,
    'STIXSizeThreeSym-Bold' ,
    'STIXSizeTwoSym' ,
    'STIXSizeTwoSym-Bold' ,
    'STIXVariants' ,
    'STIXVariants-Bold' ,
    'STKaiti' ,
    'STSong' ,
    'STXihei' ,
    'SWGamekeys MT' ,
    'Saab' ,
    'Sahadeva' ,
    'Sakkal Majalla' ,
    'Salina' ,
    'Samanata' ,
    'Samyak Devanagari' ,
    'Samyak Gujarati' ,
    'Samyak Malayalam' ,
    'Samyak Tamil' ,
    'Sana' ,
    'Sana Regular' ,
    'Sans' ,
    'Sarai' ,
    'Sathu' ,
    'Savoye LET Plain:1.0' ,
    'Sawasdee' ,
    'Script' ,
    'Script MT Bold' ,
    'Segoe MDL2 Assets' ,
    'Segoe Print' ,
    'Segoe Pseudo' ,
    'Segoe Script' ,
    'Segoe UI' ,
    'Segoe UI Emoji' ,
    'Segoe UI Historic' ,
    'Segoe UI Semilight' ,
    'Segoe UI Symbol' ,
    'Serif' ,
    'Shonar Bangla' ,
    'Showcard Gothic' ,
    'Shree Devanagari 714' ,
    'Shruti' ,
    'SignPainter-HouseScript' ,
    'Silom' ,
    'SimHei' ,
    'SimSun' ,
    'SimSun-ExtB' ,
    'Simplified Arabic' ,
    'Simplified Arabic Fixed' ,
    'Sinhala MN' ,
    'Sinhala MN Bold' ,
    'Sinhala Sangam MN' ,
    'Sinhala Sangam MN Bold' ,
    'Sitka' ,
    'Skia' ,
    'Skia Regular' ,
    'Skinny' ,
    'Small Fonts' ,
    'Snap ITC' ,
    'Snell Roundhand' ,
    'Snowdrift' ,
    'Songti SC' ,
    'Songti SC Black' ,
    'Songti TC' ,
    'Source Code Pro' ,
    'Splash' ,
    'Standard Symbols L' ,
    'Stencil' ,
    'Stencil Std' ,
    'Stephen' ,
    'Sukhumvit Set' ,
    'Suruma' ,
    'Sylfaen' ,
    'Symbol' ,
    'Symbole' ,
    'System' ,
    'System Font' ,
    'TAMu_Kadambri' ,
    'TAMu_Kalyani' ,
    'TAMu_Maduram' ,
    'TSCu_Comic' ,
    'TSCu_Paranar' ,
    'TSCu_Times' ,
    'Tahoma' ,
    'Tahoma Negreta' ,
    'TakaoExGothic' ,
    'TakaoExMincho' ,
    'TakaoGothic' ,
    'TakaoMincho' ,
    'TakaoPGothic' ,
    'TakaoPMincho' ,
    'Tamil MN' ,
    'Tamil MN Bold' ,
    'Tamil Sangam MN' ,
    'Tamil Sangam MN Bold' ,
    'Tarzan' ,
    'Tekton Pro' ,
    'Tekton Pro Cond' ,
    'Tekton Pro Ext' ,
    'Telugu MN' ,
    'Telugu MN Bold' ,
    'Telugu Sangam MN' ,
    'Telugu Sangam MN Bold' ,
    'Tempus Sans ITC' ,
    'Terminal' ,
    'Terminator Two' ,
    'Thonburi' ,
    'Thonburi Bold' ,
    'Tibetan Machine Uni' ,
    'Times' ,
    'Times Bold' ,
    'Times New Roman' ,
    'Times New Roman Baltic' ,
    'Times New Roman Bold' ,
    'Times New Roman Italic' ,
    'Times Roman' ,
    'Tlwg Mono' ,
    'Tlwg Typewriter' ,
    'Tlwg Typist' ,
    'Tlwg Typo' ,
    'TlwgMono' ,
    'TlwgTypewriter' ,
    'Toledo' ,
    'Traditional Arabic' ,
    'Trajan Pro' ,
    'Trattatello' ,
    'Trebuchet MS' ,
    'Trebuchet MS Bold' ,
    'Tunga' ,
    'Tw Cen MT' ,
    'Tw Cen MT Bold' ,
    'Tw Cen MT Italic' ,
    'URW Bookman L' ,
    'URW Chancery L' ,
    'URW Gothic L' ,
    'URW Palladio L' ,
    'Ubuntu' ,
    'Ubuntu Condensed' ,
    'Ubuntu Mono' ,
    'Ukai' ,
    'Ume Gothic' ,
    'Ume Mincho' ,
    'Ume P Gothic' ,
    'Ume P Mincho' ,
    'Ume UI Gothic' ,
    'Uming' ,
    'Umpush' ,
    'UnBatang' ,
    'UnDinaru' ,
    'UnDotum' ,
    'UnGraphic' ,
    'UnGungseo' ,
    'UnPilgi' ,
    'Untitled1' ,
    'Urdu Typesetting' ,
    'Uroob' ,
    'Utkal' ,
    'Utopia' ,
    'Utsaah' ,
    'Valken' ,
    'Vani' ,
    'Vemana2000' ,
    'Verdana' ,
    'Verdana Bold' ,
    'Vijaya' ,
    'Viner Hand ITC' ,
    'Vivaldi' ,
    'Vivian' ,
    'Vladimir Script' ,
    'Vrinda' ,
    'Waree' ,
    'Waseem' ,
    'Waverly' ,
    'Webdings' ,
    'WenQuanYi Bitmap Song' ,
    'WenQuanYi Micro Hei' ,
    'WenQuanYi Micro Hei Mono' ,
    'WenQuanYi Zen Hei' ,
    'Whimsy TT' ,
    'Wide Latin' ,
    'Wingdings' ,
    'Wingdings 2' ,
    'Wingdings 3' ,
    'Woodcut' ,
    'X-Files' ,
    'Year supply of fairy cakes' ,
    'Yu Gothic' ,
    'Yu Mincho' ,
    'Yuppy SC' ,
    'Yuppy SC Regular' ,
    'Yuppy TC' ,
    'Yuppy TC Regular' ,
    'Zapf Dingbats' ,
    'Zapfino' ,
    'Zawgyi-One'
]; 


// Returns a hash of fingerprint data.  Favors stability over uniqueness.
    function
fingerprintBrowser(){
    var fingerprintTexts = [ ];

    var startTime = new Date();

    // Canvas
    var canvasData = '';
    try {
        var canvas = document.createElement('canvas');
        canvas.height = 60;
        canvas.width = 400;
        var canvasContext = canvas.getContext('2d');
        canvas.style.display = 'inline';
        canvasContext.textBaseline = 'alphabetic';

        canvasContext.fillStyle = '#f60';
        canvasContext.fillRect( 125, 1, 62, 20 );

        canvasContext.fillStyle = '#069';
        canvasContext.font = '10pt fake-font-123';
        var testText = 'PWh4A1YnT21ReVk2zDzRiCSEbEnqbLa8I1aVOUHkAoVLnELCir, \uD83D\uDE03'
        canvasContext.fillText( testText, 2, 15 );

        canvasContext.fillStyle = 'rgba(102, 204, 0, 0.7)';
        canvasContext.font = '18pt Arial';
        canvasContext.fillText( testText, 4, 45 );

        canvasData = canvas.toDataURL();

    } catch( e ){  }
    fingerprintTexts.push( 'canvasData:' + canvasData );

    // Fonts
    var defaultFonts = { 'serif':{} , 'sans-serif':{} , 'monospace':{} };  // map[ name -> metrics struct ]
    var fontDiv = document.createElement('font');
    document.body.appendChild( fontDiv );
    var fontSpan = document.createElement('span');
    fontSpan.style.fontSize = '72px';
    fontSpan.innerText = 'X';
    for ( var fontName in defaultFonts ) {
        var fontMetrics = defaultFonts[ fontName ];
        fontSpan.style.fontFamily = fontName;
        fontDiv.appendChild( fontSpan );
        fontMetrics.offsetWidth = fontSpan.offsetWidth;
        fontMetrics.offsetHeight = fontSpan.offsetHeight;
        fontDiv.removeChild( fontSpan );
    }
    fontsFound = [];
    var fontSampleInterval = 5;  // Too slow to check all fonts
    for ( var f = 0;  f < FONTS.length;  f += fontSampleInterval ) {
        var fontName = FONTS[f];
        // Find any default font that has different size than displayed font
        for ( var defaultFontName in defaultFonts ) {
            var defaultFontMetrics = defaultFonts[ defaultFontName ];
            fontSpan.style.fontFamily = '"' + fontName + '",' + defaultFontName;  // Do not enclose defaultFontName in quotes
            fontDiv.appendChild( fontSpan );
            var isDefault = (fontSpan.offsetWidth == defaultFontMetrics.offsetWidth) && (fontSpan.offsetHeight == defaultFontMetrics.offsetHeight);
            fontDiv.removeChild( fontSpan );
            if ( ! isDefault ){  fontsFound.push( fontName );  break;  }
        }
    }
    document.body.removeChild( fontDiv );

    fingerprintTexts.push( 'fonts:' + fontsFound.join(',') );

    // Navigator
    var navigatorSize = 0;
    for ( var n in navigator ){  ++navigatorSize;  }
    var navigatorKeys = [ 'buildID', 'product', 'productSub', 'hardwareConcurrency', 'deviceMemory', 'maxTouchPoints' ];
    for ( var n = 0;  n < navigatorKeys.length;  ++n ){
        var key = navigatorKeys[n];
        var value = navigator[key];
        fingerprintTexts.push( key + ':' + defaultTo(value,'') );
    }
    for ( var p = 0;  p < navigator.plugins.length;  ++p ){  
        var plugin = navigator.plugins[p];
        fingerprintTexts.push( 'plugin:' + [plugin.name, plugin.description, plugin.filename].join(' ') );
    }

    // Screen properties
    //   Unstable if screen rotates, but can standardize orientation to portrait/mobile
    //   Unstable if graphics/desktop settings changed

    // WebGL properties
    var canvas = document.createElement('canvas');
    var webGl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    var webGlRendererVendor = null;
    var webGlRenderer = null;
    if ( webGl  &&  webGl.getSupportedExtensions().indexOf('WEBGL_debug_renderer_info') >= 0) {
        try {
            var webGlRendererExtension = webGl.getExtension('WEBGL_debug_renderer_info');
            webGlRendererVendor = webGl.getParameter( webGlRendererExtension.UNMASKED_VENDOR_WEBGL );
            webGlRenderer = webGl.getParameter( webGlRendererExtension.UNMASKED_RENDERER_WEBGL );
        } catch (e) {
            console.error( 'fingerprintBrowser() exception=', e );
        }
    }
    fingerprintTexts.push( 'webGlRenderer:' + defaultTo(webGlRenderer,'') );
    fingerprintTexts.push( 'webGlRendererVendor:' + defaultTo(webGlRendererVendor,'') )

    var timeTaken = new Date() - startTime;
    console.info( 'fingerprintBrowser() timeTaken=', timeTaken );
    console.info( 'fingerprintTexts=', fingerprintTexts );

    // Hash the fingerprintTexts
    // Alternative:  http://www.webtoolkit.info/javascript-md5.html
    var fingerprintText = fingerprintTexts.join(' ');
    var hash = 0;
    for ( var i = 0;  i < fingerprintText.length;  i++ ) {
        var c = fingerprintText.charCodeAt(i);
        hash = ( (hash << 5) - hash ) + c;
    }
    console.info( 'fingerprintBrowser() hash=', hash );
    return hash;
}


