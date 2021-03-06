/*jQuery.ajaxPrefilter(function(options) {
    if (options.crossDomain) {
        options.url = "https://w3.scripts.mit.edu/proxy?uri=" + encodeURIComponent(options.url);
    }
});
*/
var OriginalSource = document.children ? [0].outerHTML : // Chrome
            document.childNodes[1].outerHTML; // Safari
            
jQuery(document).ready(function() {


    
    //////////////////////////////////////////////

    var kb = tabulator.kb;
    var fetcher = tabulator.sf;
    var dom = document;

    var ICAL = $rdf.Namespace('http://www.w3.org/2002/12/cal/ical#');
    var SCHED = $rdf.Namespace('http://www.w3.org/ns/pim/schedule#');
    var DC = $rdf.Namespace('http://purl.org/dc/elements/1.1/');
    var UI = $rdf.Namespace('http://www.w3.org/ns/ui#');
    var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
    
    var uri = window.location.href;
    var base = window.document.title = uri.slice(0, uri.lastIndexOf('/')+1);
    var subject_uri = base  + 'details.ttl#event1';
    var forms_uri = window.document.title = base+ 'forms.ttl';

    var subject = kb.sym(subject_uri);
    var detailsDoc = kb.sym(subject_uri.split('#')[0]);
         
    var resultsDoc = $rdf.sym(base + 'results.ttl');
    
    
    // kb.fetcher.nowOrWhenLoaded(kb.sym(data_uri2), undefined, function(ok, body) {
    // });
        
    var form1 = kb.sym(forms_uri + '#form1');
    var form2 = kb.sym(forms_uri + '#form2');
    var form3 = kb.sym(forms_uri + '#form3');
    
    // tabulator.outline.GotoSubject(subject, true, undefined, true, undefined);
    
    var div = document.getElementById('FormTarget');
    
    var say = function(message) {
    };
    
    var complainIfBad = function(ok, message) {
        if (!ok) {
            div.appendChild(tabulator.panes.utils.errorMessageBlock(dom, message, 'pink'));
        }
    };
    

    var loginOutButton = tabulator.panes.utils.loginStatusBox(dom, function(webid){
        // sayt.parent.removeChild(sayt);
        if (webid) {
            tabulator.preferences.set('me', webid);
            console.log("(Logged in as "+ webid+")")
            me = kb.sym(webid);
        } else {
            tabulator.preferences.set('me', '');
            console.log("(Logged out)")
            me = null;
        }
    });
    loginOutButton.setAttribute('style', 'float: right'); // float the beginning of the end
    div.appendChild(loginOutButton);


    var getForms = function (div) {
        fetcher.nowOrWhenFetched(forms_uri, undefined, function(ok, body){
            if (!ok) return complainIfBad(ok, body);
            getDetails(div);
        });
    };
    
    var getDetails = function(div) {
        fetcher.nowOrWhenFetched(detailsDoc.uri, undefined, function(ok, body){
            if (!ok) return complainIfBad(ok, body);
            showAppropriateDisplay(div);
        });
    };
    
    var showAppropriateDisplay = function(div) {
        
        var me_uri = tabulator.preferences.get('me');
        var me = me_uri? kb.sym(me_uri) : null;
        var author = kb.any(subject, DC('author'));
        if (me && (!author || me.sameTerm(author))) { // Allow  editing of tuff  was: && author && me.sameTerm(author)
            showForms(div);
        } else { // no editing not author
            getResults(div);
        }
    };
          

    var showForms = function(div) {

        var wizard = true;
        if (wizard) {
        
            forms = [ form1, form2, form3 ];
            divs = [];
            var d;
            for (var f=0; f<forms.length; f++) {
                d = dom.createElement('div');
                tabulator.panes.utils.appendForm(document, d, {}, subject, forms[f], detailsDoc, complainIfBad);
                divs.push(d);
                if (f>0) {
                    var ff = function(d) {
                        var prev =  divs[f-1];
                        // prevs.next = d;
                        // f.previous = prev;
                        
                        var b1 = dom.createElement('button');
                        b1.textContent = "previous";
                        b1.addEventListener('click', function(e) {
                            div.removeChild(d);
                            div.appendChild(prev);
                        }, false);
                        //clearElement(naviLeft);
                        //naviLeft.appendChild(b1);
                        d.appendChild(b1);

                        var b2 = dom.createElement('button');
                        b2.textContent = "next >";
                        b2.style = 'float:right;';
                        b2.addEventListener('click', function(e) {
                            div.removeChild(prev);
                            div.appendChild(d);
                        }, false);

                        clearElement(naviLeft);
                        naviLeft.appendChild(b1);
                        prev.appendChild(b2);
                    };
                    ff(d);
                }
            }
            div.appendChild(divs[0]);
            
        } else { // not wizard one big form
            // @@@ create the initial config doc if not exist
            var table = div.appendChild(dom.createElement('table'));
            div.appendChild(table);
            tabulator.panes.utils.appendForm(document, table, {}, subject, form1, detailsDoc, complainIfBad);
            //table.appendChild(dom.createElement('p')).textContent = "Pick some dates which would work for you.";
            tabulator.panes.utils.appendForm(document, table, {}, subject, form2, detailsDoc, complainIfBad);
            //table.appendChild(dom.createElement('p')).textContent = "Who will you invite to attend the event? Give their email addresses.";
            tabulator.panes.utils.appendForm(document, table, {}, subject, form3, detailsDoc, complainIfBad);
        }
        // @@@  link config to results
        
        insertables = [];
        insertables.push($rdf.st(subject, SCHED('availabilityOptions'), SCHED('YesNoMaybe'), detailsDoc));
        insertables.push($rdf.st(subject, SCHED('ready'), new Date(), detailsDoc));
        
        var b1 = dom.createElement('button');
        b1.textContent = "Done";
        b1.addEventListener('click', function(e) {
            tabulator.sparql.update([], insertables, function(uri,success,error_body){
                if (!success) {
                    complainIfBad(success, error_body);
                } else {
                    getResults(div);
                }
            });

        }, false);
        div.appendChild(b1);
    } // showForms
    
    
 
    var clearElement = function(ele) {
        while (ele.firstChild) {
            ele.removeChild(ele.firstChild);
        }
    }
          
    // Read or create empty results file
    
    var getResults = function (div) {
        fetcher.nowOrWhenFetched(resultsDoc.uri, undefined, function(ok, body){
            if (!ok) {   
                if (true) { /// @@@@@@@ Check explictly for 404 error
                    updater.put(resultsDoc, [], 'text/turtle', function(uri2, ok, message) {
                        if (ok) {
                            clearElement(div);
                            showResults(div);
                        } else {
                            complainIfBad(ok, "FAILED to create results file at: "+ resultsDoc.uri +' : ' + message);
                            console.log("FAILED to craete results file at: "+ resultsDoc.uri +' : ' + message);
                        };
                    });
                } else { // Other error, not 404
                    complainIfBad(ok, "FAILED to read results file: " + body)
                }
            } else { // Happy read
                clearElement(div);
                showResults(div);
            }
        });
    };
    




    
    var showResults = function(div) {
    
        //       Now the form for responsing to the poll
        //

        // div.appendChild(dom.createElement('hr'))
        
        var invitation = subject;
        var title = kb.any(invitation, DC('title'));
        var location = kb.any(invitation, ICAL('location'));
        
        if (title) div.appendChild(dom.createElement('h3')).textContent = title;
        var author = kb.any(invitation, DC('author'));
        if (author) {
            var authorName = kb.any(author, FOAF('name'));
            if (authorName) {
                div.appendChild(dom.createElement('p')).textContent = authorName;
            }
        }
         

        var query = new $rdf.Query('Responses');
        var v = {};
        ['time', 'author', 'value', 'resp', 'cell'].map(function(x){
             query.vars.push(v[x]=$rdf.variable(x))});
        query.pat.add(invitation, SCHED('response'), v.resp);
        query.pat.add(v.resp, DC('author'), v.author);
        query.pat.add(v.resp, SCHED('cell'), v.cell);
        query.pat.add(v.cell, SCHED('availabilty'), v.value);
        query.pat.add(v.cell, ICAL('dtstart'), v.time);
        
        // Sort by by person @@@
        
        
        var options = {};
        options.set_x = kb.each(subject, SCHED('option')); // @@@@@ option -> dtstart in future
        options.set_x = options.set_x.map(function(opt){return kb.any(opt, ICAL('dtstart'))});

        options.set_y = kb.each(subject, SCHED('response'));
        options.set_y = options.set_y.map(function(resp){return kb.any(resp, DC('author'))});

        var possibleTimes = kb.each(invitation, SCHED('option'))
            .map(function(opt){return kb.any(opt, ICAL('dtstart'))});

         var displayTheMatrix = function() {
            var matrix = div.appendChild(tabulator.panes.utils.matrixForQuery(
                dom, query, v.time, v.author, v.value, options, function(){})); 
            
            matrix.setAttribute('class', 'matrix');
            
            var refreshButton = dom.createElement('button');
            refreshButton.textContent = "refresh";
            refreshButton.addEventListener('click', function(e) {
                refreshButton.disabled = true;
                tabulator.sf.nowOrWhenFetched(subject_uri.split('#')[0], undefined, function(ok, body){
                    if (!ok) {
                        console.log("Cant refresh matrix" + body);
                    } else {
                        matrix.refresh();
                        refreshButton.disabled = false;
                    };
                });
            }, false);
            
            clearElement(naviCenter);
            naviCenter.appendChild(refreshButton);
        };

        // @@ Give other combos too-- see schedule ontology
        var possibleAvailabilities = [ SCHED('No'), SCHED('Maybe'), SCHED('Yes')];
 
        var me_uri = tabulator.preferences.get('me');
        var me = me_uri? kb.sym(me_uri) : null;
        
        var dataPointForNT = [];
        
        if (me) {
            var doc = resultsDoc;
            options.set_y = options.set_y.filter(function(z){ return (! z.sameTerm(me))});
            options.set_y.push(me); // Put me on the end

            options.cellFunction = function(cell, x, y, value) {
            
                var refreshColor = function() {
                    var bg = kb.any(value, UI('backgroundColor'));
                    if (bg) cell.setAttribute('style', 'text-align: center; background-color: ' + bg + ';');                    
                };
                if (value !== null) {
                    kb.fetcher.nowOrWhenFetched(value.uri.split('#')[0], undefined, function(uri, ok, error){
                        refreshColor();
                    });
                } 
                if (y.sameTerm(me)) {
                    var callback = function() { refreshColor(); }; //  @@ may need that
                    var selectOptions = {};
                    var predicate = SCHED('availabilty');
                    var cellSubject = dataPointForNT[x.toNT()];
                    var selector = tabulator.panes.utils.makeSelectForOptions(dom, kb, cellSubject, predicate,
                            possibleAvailabilities, selectOptions, resultsDoc, callback);
                    cell.appendChild(selector);
                } else if (value !== null) {
                    
                    cell.textContent = tabulator.Util.label(value);
                }
            
            };

            var responses = kb.each(invitation, SCHED('response'));
            var myResponse = null;
            responses.map(function(r){
                if (kb.holds(r, DC('author'), me)) {
                    myResponse = r;
                }
            });

            var insertables = [];  // list of statements to be stored
            
            var id = tabulator.panes.utils.newThing(doc).uri
            if (myResponse === null) {
                myResponse = $rdf.sym(id + '_response' );
                insertables.push($rdf.st(invitation, SCHED('response'), myResponse, doc));
                insertables.push($rdf.st(myResponse, DC('author'), me, doc));
            } else {
                var dps = kb.each(myResponse, SCHED('cell'));
                dps.map(function(dataPoint){
                    var time = kb.any(dataPoint, ICAL('dtstart'));
                    dataPointForNT[time.toNT()] = dataPoint;
                });
            }
            for (var j=0; j < possibleTimes.length; j++) {
                if (dataPointForNT[possibleTimes[j].toNT()]) continue;
                var dataPoint = $rdf.sym(id + '_' + j);
                insertables.push($rdf.st(myResponse, SCHED('cell'), dataPoint, doc));
                insertables.push($rdf.st(dataPoint, ICAL('dtstart'), possibleTimes[j], doc)); // @@
                dataPointForNT[possibleTimes[j].toNT()] = dataPoint;
            }
            if (insertables.length) {
                tabulator.sparql.update([], insertables, function(uri,success,error_body){
                    if (!success) {
                        complainIfBad(success, error_body);
                    } else {
                        displayTheMatrix();
                    }
                });
                
            } else { // no insertables
                displayTheMatrix();
            };
            
        } else {
            // pass me not defined
        }
        
        
        var editButton = dom.createElement('button');
        editButton.textContent = "(Edit poll)";
        editButton.addEventListener('click', function(e) {
            clearElement(div);
            showForms(div);
        }, false);
        
        clearElement(naviLeft);
        naviLeft.appendChild(editButton);
        
        // div.appendChild(editButton);
  
        
        
        clearElement(naviRight);
        naviRight.appendChild(newInstanceButton());
    
    }; // showResults
    
    ////////////////////////////////////////  Reproduction
    


    var newInstanceButton = function(thisInstance) {
        return tabulator.panes.utils.newAppInstance(dom, "Schedule another event", function(ws){

            var appPathSegment = 'app-when-can-we.w3.org'; // how to allocate this string and connect to 
            var here = $rdf.sym(thisInstance.uri.split('#')[0]);

            var sp = tabulator.ns.space;
            var kb = tabulator.kb;
            
            var base = kb.any(ws, sp('uriPrefix')).value;
            if (base.slice(-1) !== '/') {
                $rdf.log.error(appPathSegment + ": No / at end of uriPrefix " + base ); // @@ paramater?
                base = base + '/';
            }
            base += appPathSegment + '/id'+ now.getTime() + '/'; // unique id 
            
            newDetailsDoc = kb.sym(base + 'details.ttl');
            newResultsDoc = kb.sym(base + 'results.ttl');
            newIndexDoc = kb.sym(base + 'index.html');
            
            newInstance = kb.sym(newDetailsDoc + '#event');
            kb.add(newInstance, RDFS('type'), SCHED('SchedulableEvent'), newDetailsDoc);
            if (me) {
                kb.add(newInstance, DC('author'), me, newDetailsDoc);
            }
            
            kb.add(newInstance, DC('created'), new Date(), newDetailsDoc);
            kb.add(newInstance, SCHED('resultsDocument'), newDetailsDoc);
            
            // Keep a paper trail   @@ Revisit when we have non-public ones @@ Privacy
            kb.add(newInstance, tabulator.ns.space('inspiration'), thisInstance, detailsDoc);            
            kb.add(newInstance, tabulator.ns.space('inspiration'), thisInstance, newDetailsDoc);
            
            // $rdf.log.debug("\n Ready to put " + kb.statementsMatching(undefined, undefined, undefined, there)); //@@


            agenda = [];
            agenda.push(function createDetailsFile(){
                updater.put(
                    newDetailsDoc,
                    kb.statementsMatching(undefined, undefined, undefined, newDetailsDoc),
                    'text/turtle',
                    function(uri2, ok, message) {
                        if (ok) {
                            agenda.shift()();
                        } else {
                            complainIfBad(ok, "FAILED to save new scheduler at: "+ there.uri +' : ' + message);
                            console.log("FAILED to save new scheduler at: "+ there.uri +' : ' + message);
                        };
                    }
                );
            });


            agenda.push(function createResultsFile(){
                updater.put(newResultsDoc, [], 'text/turtle', function(uri2, ok, message) {
                        if (ok) {
                            agenda.shift()();
                        } else {
                            complainIfBad(ok, "FAILED to create results store at: "+ there.uri +' : ' + message);
                            console.log("FAILED to create results store at: "+ there.uri +' : ' + message);
                        };
                    }
                );
            });

            agenda.push(function createHTMLFile(){
                updater.put(newResultsDoc, OriginalSource, 'text/html', function(uri2, ok, message) {
                        if (ok) {
                            agenda.shift()();
                        } else {
                            complainIfBad(ok, "FAILED to create HTML file at: "+ there.uri +' : ' + message);
                            console.log("FAILED to create HTML file at: "+ there.uri +' : ' + message);
                        };
                    }
                );
            });

            agenda.push(function(){  // give the user links to the new app
            
            var p = div.appendChild(dom.createElement('p'));
            p.innerHTML = 
                "Your <a href='" + newIndexDoc.uri + "'>new scheduler</a> is ready. ";
            });
            
            agenda.shift()();
            
            // Created new data files.
            // @@ Now create initial files - html skin, (Copy of mashlib, css?)
            // What about forms?  -- somewhere central like github
            // @@ Now create form to edit configuation parameters
            // @@ Optionally link new instance to list of instances -- both ways? and to child/parent?
            // @@ Set up access control for new config and store. 
            
        }); // callback to newAppInstance

        
    }; // newInstanceButton


    var structure = div.appendChild(dom.createElement('table'));
    structure.setAttribute('style', 'background-color: white;');
    var naviTop = structure.appendChild(dom.createElement('tr'));
    var naviMain = naviTop.appendChild(dom.createElement('td'));
    naviMain.setAttribute('colspan', '3');

    var naviMenu = structure.appendChild(dom.createElement('tr'));
    naviMenu.setAttribute('class', 'naviMenu');
//    naviMenu.setAttribute('style', 'margin-top: 3em;');
    var naviLeft = naviMenu.appendChild(dom.createElement('td'));
    var naviCenter = naviMenu.appendChild(dom.createElement('td'));
    var naviRight = naviMenu.appendChild(dom.createElement('td'));

    getForms(naviMain);

});


