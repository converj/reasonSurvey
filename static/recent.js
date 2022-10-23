
    // Constants
    const MAX_DETAIL_LENGTH = 100;

    // Find elements
    let recentContent = document.getElementById('recentContent');
    let recentMessage = document.getElementById('recentMessage');

        function
    recentHandleLoad( ){
        clearChildren( recentContent );

        const linkTypes = {
            'RequestForProposals': { url:FRAG_PAGE_ID_REQUEST , display:'Request for proposals' } ,
            'Proposal': { url:FRAG_PAGE_ID_PROPOSAL , display:'Proposal pro/con' } ,
            'Survey': { url:'autocomplete' , display:'Auto-complete survey' } ,
            'Budget': { url:'budget' , display:'Participatory budget' }
        };

        // retrieve via ajax
        // Could retrieve from cookie, but link key collection is too long, and need supplemental data (summaries).
        let dataSend = { };
        let url = 'getRecent';
        ajaxGet( dataSend, url, function(error, status, dataReceive){

            if ( !error  &&  dataReceive  &&  dataReceive.success  &&  dataReceive.recents  &&  Array.isArray(dataReceive.recents) ){
                // For each linkKey... build html with html builder object, or html->element function?
                for ( let s = 0;  s < dataReceive.recents.length;  ++s ){
                    let recent = dataReceive.recents[s];
                    let detailSample = recent.detail;
                    if ( MAX_DETAIL_LENGTH < recent.detail.length ){
                        detailSample = detailSample.substring( 0, MAX_DETAIL_LENGTH ) + '...';
                    }
                    detailSample.replace( '\n', ' ' );
                    linkType = linkTypes[ recent.type ];
                    if ( ! linkType ){  continue;  }
                    let recentDiv = htmlToElement( [
                        '<a href="#page=' + linkType.url + '&link=' + recent.linkKey  + '" class=recentRequestLink>',
                        '<div class=recentRequest tabindex=0>',
                        '    <div class=recentRequestType>' + linkType.display + '</div>',
                        '    <div class=recentRequestType>' + (recent.frozen ? '(frozen)' : '') + '</div>',
                        '    <div class=recentRequestType>' + (recent.hideReasons ? '(reasons hidden)' : '') + '</div>',
                        '    <h2 class=recentRequestTitle>' + recent.title + '</h2>',
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
    
