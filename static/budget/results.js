
/////////////////////////////////////////////////////////////////////////////////
// Slice results

    const REASON_SAMPLE_LENGTH = 30;


        function
    SliceResultDisplay( sliceId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data

        this.createFromElement( sliceId, 
            html('div').class('Slice').id('Slice').children(
                html('h1').class('PageTitle').class('title').innerHtml('Budget Item Results').build() ,
                html('div').class('SliceSizeDisplay').id('SliceSizeDisplay').attribute('onclick','handleSizeDisplayClick').build() ,
                html('div').class('SliceDescription').id('SliceDescription').children(
                        html('div').id('Title').class('SliceTitle').build() ,
                        html('div').class('Size').id('Size').children(
                            html('input').class('SizeInput').id('SizeInput').build() ,  // For size bar display
                            html('span').attribute('translate','true').innerHtml('Budget Amount').build() ,
                            html('span').innerHtml(':').build() ,
                            html('span').class('SliceSizePercent').id('SliceSizePercent').build() ,
                            html('span').class('SliceSizeAbsolute').id('SliceSizeAbsolute').build()
                        ).build() ,
                        html('div').class('SliceVotes').id('SliceVotes').children(
                            html('span').attribute('translate','true').innerHtml('Votes').build() ,
                            html('span').innerHtml(':').build() ,
                            html('span').class('SliceVotesNumber').id('SliceVotesNumber').build() ,
                        ).build() ,
                        html('div').id('Message').class('Message').build() ,
                        html('div').id('Reasons').build() ,
                        html('button').id('SliceResultsButton').innerHtml('More reasons')
                            .attribute('onclick','onSliceResultsClick').build()
                ).build()
            ).build()
        );
    }
    SliceResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        SliceResultDisplay.prototype.
    setAllData = function( sliceData, topDisp ){
        this.slice = sliceData;
        this.topDisp = topDisp;
        this.reasons = [ ];
        this.dataUpdated();

        // Retrieve frequent reasons, async
        if ( ! this.singleSlicePage() ){  this.retrieveReasons();  }
    };
    
    // Update html from data
        SliceResultDisplay.prototype.
    dataUpdated = function( ){

        this.message = showMessageStruct( this.message, this.getSubElement('Message') );

        // Set html content
        this.setInnerHtml( 'Title', (this.slice.title ? this.slice.title : this.title) );
        let medianSize = ( this.slice.medianSize ?  this.slice.medianSize  :  this.medianSize );
        this.getSubElement('SizeInput').value = medianSize;
        this.setInnerHtml( 'SliceSizeDisplay', medianSize + '%' );
        this.setInnerHtml( 'SliceSizePercent', medianSize + '% = ' );
        let totalBudget = ( this.topDisp.budget ?  this.topDisp.budget.total  :  this.totalBudget );
        this.setInnerHtml( 'SliceSizeAbsolute', (medianSize * 0.01 * totalBudget) );
        this.setInnerHtml( 'SliceVotesNumber', this.slice.votes );

        this.setAttribute( 'Slice', 'singleslice', ( this.singleSlicePage() ? TRUE : FALSE ) );

        this.setStyle( 'SliceResultsButton', 'display', ( this.hasMoreReasons ? 'inline-block' : 'none' )  );

        // Order reasons by vote-count
        this.reasons.sort( (a,b) => b.score - a.score );

        let reasonsDiv = this.getSubElement('Reasons');
        let adjustOpacity = true;
        let showBars = true;
        let collapse = false;
        clearChildren( reasonsDiv );
        reasonsDiv.appendChild(  this.reasonsDataToHtml( this.reasons, adjustOpacity, showBars, collapse )  );
    };


        SliceResultDisplay.prototype.
    singleSlicePage = function( ){  return ( this == this.topDisp );  }


        SliceResultDisplay.prototype.
    reasonsDataToHtml = function( reasons, adjustOpacity, showBars, collapse ){

        let sumReasonCounts = reasons.reduce( (agg, reason) => agg + reason.voteCount ,  0 );

        // Build table-row using html-builder, because text-to-html fails on partial table
        let reasonsTable = html('table').class('BudgetResultSliceReasons').build();
        for ( let r = 0;  r < reasons.length;  ++r ){
            let reason = reasons[r];
            let voteFrac = reason.voteCount / sumReasonCounts;
            let opacityFrac = adjustOpacity ?  (voteFrac * 1.5) + 0.25  :  1.0;

            let barDiv = null;
            if ( showBars ){
                barDiv = 
                    html('td').class('AnswerCountBarBack').children(
                        html('div').class('AnswerCountBar').style('width', parseInt(voteFrac * 100) + '%').innerHtml('&nbsp;').build()
                    ).build();
            }

            let reasonContent =
                html('div').class('ReasonContent').attribute('aria-expanded','false').innerHtml(reason.reason).build();
            reasonContent.onclick = function(){
                reasonContent.setAttribute( 'aria-expanded', (reasonContent.getAttribute('aria-expanded')=='false' ? 'true' : 'false') );
                alignRows();
            }
            if ( collapse  &&  (reason.reason.length > REASON_SAMPLE_LENGTH) ){
                reasonContent = html('details').attribute('open','closed').children(
                    html('summary').innerHtml( reason.reason.substring(0, REASON_SAMPLE_LENGTH) + '...' ).build() ,
                    reasonContent
                ).build();
            }

            reasonsTable.appendChild(
                html('tr').class('BudgetResultSliceReason').children(
                    barDiv ,
                    html('td').class('BudgetResultSliceReasonCount').innerHtml( reason.voteCount ).build() ,
                    html('td').class('BudgetResultSliceReasonText').style('opacity', opacityFrac).children(
                        reasonContent
                    ).build()
                ).build()
            );
        }
        return reasonsTable;
    };


        SliceResultDisplay.prototype.
    handleSizeDisplayClick = function( ){
        scrollToHtmlElement( this.getSubElement('SliceDescription') );
    };

        SliceResultDisplay.prototype.
    onSliceResultsClick = function( ){
        setFragmentFields( {page:FRAG_PAGE_BUDGET_SLICE_RESULT, slice:this.slice.id} );
    };



    // Standard interface method for top-display
        SliceResultDisplay.prototype.
    retrieveData = function( ){  this.retrieveReasons();  }

        SliceResultDisplay.prototype.
    retrieveReasons = function( ){

        if ( ! this.singleSlicePage()  &&  this.topDisp.areReasonsHidden() ){  alignRows();  return;  }

        // Retrieve reasons, via ajax
        let thisCopy = this;
        let sendData = { };
        let url = '/budget/sliceReasonResults/' + this.topDisp.link.id + '/' + this.slice.id;
        if ( this.singleSlicePage() ){  url += '?page=1';  }
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                // Update data
                if ( receiveData.slices ){
                    thisCopy.reasons = receiveData.slices;
                    thisCopy.hasMoreReasons = receiveData.hasMoreReasons
                    thisCopy.totalBudget = receiveData.totalBudget;
                    thisCopy.medianSize = receiveData.medianSize;
                    // Use first slice-reason title as slice-title
                    if ( (! thisCopy.title)  &&  (0 < receiveData.slices.length) ){
                        thisCopy.title = receiveData.slices[0].title;
                    }
                    thisCopy.dataUpdated();
                    alignRows();
                }
            }
            else {
                thisCopy.message = { color:RED, text:'Could not retrieve reasons' };
                thisCopy.dataUpdated();
            }
        } );
    };
    



/////////////////////////////////////////////////////////////////////////////////
// Budget results

        function
    BudgetResultDisplay( budgetId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data

        this.createFromElement( budgetId,
            html('div').children(
                html('h1').class('title').attribute('translate','true').innerHtml('Budget Results').build() ,
                html('div').class('Budget').id('Budget').children(
                    html('h2').class('Title').id('Title').build() ,
                    html('div').class('Total').id('Total').children(
                        html('span').attribute('translate','true').innerHtml('Total amount').build() ,
                        html('span').innerHtml(':').build() ,
                        html('span').id('TotalValue').build() ,
                    ).build() ,
                    html('div').class('hideReasonsStatus').id('hideReasonsStatus').build() ,
                    html('div').class('Message').class('freezeMessage').id('freezeMessage').build() ,
                ).build() ,
                html('div').class('Message').id('Message').attribute('role','alert').build() ,
                html('div').class('Slices').id('Slices').children(
                    html('div').class('Slice').id('ColumnTitles').children(
                        html('div').class('SliceSizeDisplay').children(
                            html('span').class('AmountWord').attribute('translate','true').innerHtml('Amount').build() ,
                            html('span').class('AmountSymbol').innerHtml('%').build()
                        ).attribute('onclick','SizeColumnTitleClick').build() ,
                        html('div').class('SliceDescription').attribute('translate','true').innerHtml('Budget Item').build()
                    ).build()
                ).build() ,

                htmlToElement( '<svg class=lines id=lines width=100% height=100% ></svg>' )  // HtmlBuilder does not work for this type, probably because it requires namespaced setters

            ).build()
        );
    }
    BudgetResultDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods


        BudgetResultDisplay.prototype.
    setAllData = function( linkData, budgetData, topDisp ){
        // Slice-data passed from caller, so that old cached data can be reused
        this.link = linkData;
        this.budget = budgetData;
        this.slices = [ ];  // sequence[ {id, data, display} ]
        this.topDisp = topDisp;

        this.dataUpdated();
    };
    
    // Update html from data
        BudgetResultDisplay.prototype.
    dataUpdated = function( ){
        // Set messages
        this.message = showMessageStruct( this.message, this.getSubElement('Message') );
        this.setInnerHtml( 'hideReasonsStatus', (this.budget.hideReasons ? 'Reasons hidden' : null) );
        this.freezeMessage = {  color:RED , text:(this.budget.freezeUserInput ? 'Frozen' : null)  };
        this.freezeMessage = showMessageStruct( this.freezeMessage, this.getSubElement('freezeMessage') );

        // Set budget attributes
        this.setAttribute( 'Budget' , 'frozen' , (this.budget.freezeUserInput ? TRUE : null) );
        this.setAttribute( 'Budget', 'mine', (this.budget.mine ? TRUE : null) );
        this.setAttribute( 'Budget', 'hidereasons', (this.budget.hideReasons ? TRUE : null) );

        this.setInnerHtml( 'Title', this.budget.title );
        this.setInnerHtml( 'TotalValue', this.budget.total );

        // For each slice...
        let slicesDiv = this.getSubElement('Slices');
        for ( let s = 0;  s < this.slices.length;  ++s ){
            let slice = this.slices[s];
            // Ensure data has display 
            if ( slice.data  &&  ! slice.display ){
                slice.display = this.addSliceDisplay( slice.data );
            }
            // Remove display without data 
            else if ( slice.display  &&  ! slice.data ){
                slicesDiv.removeChild( slice.display.element );  // Remove from webpage
                slice.display = null;
            }
            // Nullify slice without data 
            if ( ! slice.data ){  this.slices[s] = null;  }
        }
        this.slices = this.slices.filter(s => s);  // Remove nulls 
        // Update sub-displays
        for ( let s = 0;  s < this.slices.length;  ++s ){
            this.slices[s].display.dataUpdated();
        }

        translateScreen();
    };
    
        BudgetResultDisplay.prototype.
    addSliceDisplay = function( sliceData ){
        sliceDisplay = new SliceResultDisplay( sliceData.id );
        sliceDisplay.setAllData( sliceData, this.topDisp, this );
        addAndAppear( sliceDisplay.element, this.getSubElement('Slices') );
        return sliceDisplay;
    };


        BudgetResultDisplay.prototype.
    areReasonsHidden = function(){  return this.budget.hideReasons;  }


        BudgetResultDisplay.prototype.
    SizeColumnTitleClick = function( ){
        scrollToHtmlElement( this.getSubElement('ColumnTitles') );
    };


        BudgetResultDisplay.prototype.
    retrieveDataUpdate = function( ){
        // Do nothing.  Only update on intentional page-reload, not on page re-surface, for better user control.
    };

        BudgetResultDisplay.prototype.
    retrieveData = function( ){
        // Request via ajax
        let thisCopy = this;
        let sendData = { };
        let url = '/budget/budget/' + this.topDisp.link.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    thisCopy.link.ok = true;
                    if ( receiveData.budget ){
                        // Update budget fields
                        thisCopy.budget.title = receiveData.budget.title;
                        thisCopy.budget.introduction = receiveData.budget.introduction;
                        thisCopy.budget.total = receiveData.budget.total;
                        thisCopy.budget.freezeUserInput = receiveData.budget.freezeUserInput;
                        thisCopy.budget.mine = receiveData.budget.mine;
                        thisCopy.budget.hideReasons = receiveData.budget.hideReasons;
                    }
                    // Retrieve slices data, async
                    thisCopy.retrieveSlices();
                    thisCopy.dataUpdated();
                }
            }
        } );
    };
    
        BudgetResultDisplay.prototype.
    retrieveSlices = function( ){
        // Request via ajax
        let thisCopy = this;
        let sendData = { };
        let url = '/budget/sliceTitleResults/' + this.topDisp.link.id;
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( !error  &&  receiveData  &&  receiveData.success ){
                thisCopy.link.ok = true;
                if ( receiveData.titles ){
                    // Mark all old slices un-updated 
                    let sliceIdToSlice = { };
                    for ( let s = 0;  s < thisCopy.slices.length;  ++s ){
                        let slice = thisCopy.slices[s];
                        slice.updated = false;
                        if ( slice.data ){  sliceIdToSlice[ slice.data.id ] = slice;  }
                    }

                    // Sort retrieved-slices by size 
                    let receivedSlicesBySize = Object.values( receiveData.titles );
                    receivedSlicesBySize.sort( (a,b) => (b.medianSize - a.medianSize) );

                    // For each received slice data, ordered by size...
                    for ( let s = 0;  s < receivedSlicesBySize.length;  ++s ){
                        let sliceReceived = receivedSlicesBySize[s];
                        let slice = sliceIdToSlice[ sliceReceived.id ];
                        if ( slice == null ){
                            // Collect slice data 
                            slice = { data:sliceReceived, updated:true };
                            thisCopy.slices.push( slice );
                        }
                        else {
                            // Update slice fields 
                            // Do not replace slice-object, since slice-display shares that reference 
                            slice.data.title = sliceReceived.title;
                            slice.data.reason = sliceReceived.reason;
                            slice.data.medianSize = sliceReceived.medianSize;
                            slice.updated = true;
                        }
                    }
                    // Delete non-updated slice data 
                    for ( let s = 0;  s < thisCopy.slices.length;  ++s ){
                        let slice = thisCopy.slices[ s ];
                        if ( ! slice.updated ){  slice.data = null;  }
                    }

                    thisCopy.dataUpdated();
                }
            }
            else {  // Error
                if ( receiveData  &&  receiveData.message == BAD_LINK ){
                    thisCopy.link.ok = false;
                    thisCopy.dataUpdated();
                }
            }
        } );
    };

