
        function
    RecentSurveysDisplay( displayId ){
        // User-interface state variables (not persistent data)
        ElementWrap.call( this );  // Inherit member data from ElementWrap.

        this.createFromHtml( displayId, '\n\n' + [
            '<div class=RecentSurveys id=RecentSurveys>',
            '    <h1 class=title> Recent Surveys </h1>',
            '    <div id=Message role=alert></div>',
            '    <div class=Samples id=Samples></div>',
            '</div>'
        ].join('\n') );
    }
    RecentSurveysDisplay.prototype = Object.create( ElementWrap.prototype );  // Inherit methods from ElementWrap.

    // Set all data.
        RecentSurveysDisplay.prototype.
    setAllData = function( surveySamples, topDisp ){
        this.topDisp = topDisp;
        this.surveys = surveySamples;
        this.dataUpdated();
    };
    
    // Update html from data.
        RecentSurveysDisplay.prototype.
    dataUpdated = function( ){

        this.message = showMessageStruct( this.message, this.getSubElement('Message') );

        // For each survey sample data...
        var samplesDiv = this.getSubElement('Samples');
        clearChildren( samplesDiv );
        for ( var s = 0;  s < this.surveys.length;  ++s ) { 
            var surveyData = this.surveys[s];
            var surveyDiv = htmlToElement( '\n' + [
                '   <a class=SurveyLink href="#page=question&link=' + surveyData.linkKey + '">',
                        surveyData.introduction ,
                '   </a>'
            ].join('\n') );
            samplesDiv.appendChild( surveyDiv );

            surveyDiv.onkeyup = enterToClick;
        }
    };


    // For use by single-question results page
        RecentSurveysDisplay.prototype.
    retrieveData = function( ){

        // request via ajax
        var thisCopy = this;
        var sendData = { };  // Dont send crumb via GET call, because it would be observable in URL
        var url = '/autocomplete/getRecent';
        ajaxGet( sendData, url, function(error, status, receiveData){
            if ( receiveData ){
                if ( receiveData.success ){
                    thisCopy.linkOk = true;
                    if ( receiveData.recents ){
                        // Update survey samples
                        thisCopy.surveys = receiveData.recents;
                    }
                    thisCopy.dataUpdated();
                }
            }
        } );
    };
    
