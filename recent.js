
    // Constants
    const MAX_DETAIL_LENGTH = 100;

    // Find elements
    var recentContent = document.getElementById('recentContent');
    var recentMessage = document.getElementById('recentMessage');

        function
    recentHandleLoad( ){
        clearChildren( recentContent );

        // retrieve via ajax
        // Could retrieve from cookie, but link key collection is too long, and need supplemental data (summaries).
        var dataSend = { };
        var url = 'getRecent';
        ajaxGet( dataSend, url, function(error, status, dataReceive){

            if ( dataReceive.success  &&  dataReceive.recents  &&  Array.isArray(dataReceive.recents) ){
                // For each linkKey... build html with html builder object, or html->element function?
                for ( var s = 0;  s < dataReceive.recents.length;  ++s ){
                    var recent = dataReceive.recents[s];
                    var detailSample = recent.detail.substring( 0, MAX_DETAIL_LENGTH );
                    detailSample.replace( '\n', ' ' );
                    var linkTypeToPageId = { 'RequestForProposals':FRAG_PAGE_ID_REQUEST, 'Proposal':FRAG_PAGE_ID_PROPOSAL };
                    var pageId = linkTypeToPageId[ recent.type ];
                    var recentDiv = htmlToElement( [
                        '<a href="#page=' + pageId + '&link=' + recent.linkKey  + '" class=recentRequestLink>',
                        '<div class=recentRequest tabindex=0>',
                        '    <div class=recentRequestTitle>' + recent.title + '</div>',
                        '    <div class=recentRequestDetail>' + detailSample + '</div>',
                        '    <div class=recentRequestTime>' + recent.time + '</div>',
                        '</div>',
                        '</a>'
                    ].join('\n') );

                    // Make ENTER key activate link
                    recentDiv.onkeyup = function(event){
                        if( event.key == KEY_NAME_ENTER ){  event.currentTarget.click();  }
                    };
                    
                    recentContent.appendChild( recentDiv );
                }
            }
            else {
                showMessage( 'Failed to load recent requests and proposals.', RED, null, recentMessage );
            }
        } );

	    return false;
	};
    
