//JS for TweetPin

//IE REDIRECT
if (navigator.appName=='Microsoft Internet Explorer' && window.location=='index.html') {
    window.location='PinTweets_ie.html'; //URL to redirect to
}

//ONE GLOBAL OBJECT
var global = new Global();

//ON LOAD
$(document).ready(function(){

    CFInstall.check({
        mode: 'overlay',
        destination: "http://www.waikiki.com"
    });

    //shot ajax loader
    $('#loader').show();

    //initialize jQuery event handlers
    $('#refreshMap').click(function() {
    	
        if (global.pin && !($('#radius').val() > 0)) {
	        $().toastmessage('showToast', {
	             text     : "You must enter a radius in miles if a pin is on the map.",
				 type     : 'warning',
				 stayTime : 4500,  
	             sticky   : false,
	             position : 'middle-center'
	        });        	
        } else {

	        if (global) { 
	        	global.removeMarkers();
	        }
        
	        loadMap(global.map);        	

        }
    });

    $('.date').datepicker({ dateFormat: 'yy-mm-dd' });//initializes date inputs

    $('#pinButton').click(function() {
        global.pinBoolean = !global.pinBoolean
        if (!global.pinBoolean) {
            removePin();
        } else {
            dropPin();
        }
    });

    $(window).bind('keypress', function(e) {
        if((e.keyCode || e.which) == 13){
            if (global) { global.removeMarkers() };
            loadMap(global.map);
        }
    });

    $(window).resize(function() {
        $('.canvas').width($('#wrapper').width()-$('#sidebar').outerWidth(true)-global.horizontalMargin*2);
        $('.captionContent').width($('.captionDiv').width()-$('.captionLetter').outerWidth(true)-$('.captionPic').outerWidth(true)-5);
    });

    //jQuery format
    $($('.topnav').children()).each(function () {
        var text = $(this).text().replace(/\s/g,'').replace(/'/g,'');
        $('#'+text+'Label').click(function() {
            changeCanvas(text);
        });
    });

    $($('.middle').children()).each(function () {
        $(this).width($('#sidebar').width()/2);
    });

	$('.canvas').width($('#wrapper').width()-$('#sidebar').outerWidth(true)-global.horizontalMargin*2);
    $('.captionContent').width($('.captionDiv').width()-$('.captionLetter').outerWidth(true)-$('.captionPic').outerWidth(true)-5);

    //declare map
    var myOptions = {
        zoom: 15,
        center: google.maps.LatLng(13.4125, 103.8667),//angkor wat
        mapTypeId: google.maps.MapTypeId.SATELLITE
    };

    var map = new google.maps.Map(document.getElementById('Map'),myOptions);
    global.setMap(map);

    //start her up
    populateForm();
    loadMap(map);
});

/**
 * container for global variables
 */
function Global() {
    this.horizontalMargin = 15;
    this.pinBoolean = false;
	this.markerKey = 0
	this.firstSearch = true;

    this.nextKey = function() {
        return this.markerKey++;
    }

	this.getKey = function() {
        return this.markerKey;
	}

	this.getKeyAsChar = function() {
        return String.fromCharCode(parseInt(this.markerKey)+65);
	}

    this.addContent = function(con) {
        this.content.push(con);        
    }

    this.resetItems = function() {
        this.content = new Array();
        this.removeMarkers();
        this.markerKey = 0;
    }

    this.setMap = function(mapInstance){
        this.map = mapInstance;
    }

    this.setPin = function(pinInstance){
        this.pin = pinInstance;
    }

    this.setPinListener = function(listener){
        this.pinListener = listener;
    }

    this.setSearchURL = function(URLString) {
        this.searchURL = URLString;
    }

    this.removeMarkers = function() {
        if (this.content) {
            for (i=0;i<this.content.length;i++) {
                this.content[i].marker.setMap(null);//removes from map
            }
        }
    }
};

//PROTOTYPE EXTENTIONS

/**
 * Recuresively parses links hashtags, and mentions in tweets
 */
String.prototype.tweetEncode = function() {

    var forReturn = this;
    //var URLArrMatch = forReturn.match(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/g);//links
    var encodeLink = function(str,ptrn,hrefPrefix,startingIndex,encodeBool) {
        var index = str.search(ptrn);

        if (index != -1) {
            var tagged = str.match(ptrn)[0];
            return (str.substring(0,index) + '<a href="'+hrefPrefix+(encodeBool ? encodeURIComponent(tagged.toString().substring(startingIndex,tagged.length)) : tagged.toString().substring(startingIndex,tagged.length)) +'" target="_blank">'+tagged+'</a>' + encodeLink(str.substring(index+tagged.length,str.length),ptrn,hrefPrefix,startingIndex));
        } else {
            return str;
        }
    };

    forReturn = encodeLink(forReturn,/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,'',0,false);
    forReturn = encodeLink(forReturn,/#\w+/,'http://twitter.com/#!/search/',0,true);
    forReturn = encodeLink(forReturn,/@\w+/,'http://twitter.com/#!/',1,true);

    return forReturn;
};

// Converts numeric degrees to radians 
if (typeof(Number.prototype.toRad) === "undefined") {
	
	/**
	 * Converts numeric degrees to radians
	 */
	Number.prototype.toRad = function() {
		return this * Math.PI / 180;
	}
	
}

//SYNCHRONOUS FUNCTIONS

/**
 * refreshes window with new search
 */
function loadSearch(hashString) {
	window.location.hash = hashString;
	window.location.reload(true);
}


/**
 * changes Map canvas by setting new click listener
 */
function changeMapCanvas(label) {
	changeCanvas(label);
	$('#MapLabel').click(function() {
		changeCanvas(label);
    });	
}

/**
 * populates form from uri 
 */
function populateForm() { //IF ANYONE FEELS GANGSTER MAKE A FULL-ON GRAMMER http://ajaxian.com/archives/jison-build-parsers-in-javascript
    if (window.location.hash) {

        var parameters = new Array();
        var parameterString = window.location.hash.replace(/#/,'');
        var continueFlag = true;
        var elem = document.getElementById('searchForm');

        for (i=1;i<elem.length;i++) {//clear default values
            elem[i].value = '';
        }

        var recursive = function(str) {
            if (str.indexOf('&') == -1) {
                parameters.push(str);
            } else {
                recursive(str.substring(str.indexOf('&')+1, str.length));
            }
        };

        while (continueFlag) {
            recursive(parameterString);//finds last criteria
            if (parameterString.indexOf('&') != -1) {
                parameterString = parameterString.match(/(.)+&/g)[0];
                parameterString = parameterString.substring(0,parameterString.length-1);
            } else {
                continueFlag = false;
            }
        }

        for (i=0;i<parameters.length;i++) {
            var parameterID = parameters[i].match(/.+=/)[0].replace(/=/,'');
            var parameterVal = parameters[i].match(/=.+/)[0].replace(/=/,'')

            if (parameterID != 'geocode') {
                $('#'+parameterID).val(decodeURIComponent(parameterVal));
            } else {
                $('#radius').val(Number(parameterVal.replace(/(.+),(.+),(.+)/,'$3').replace('mi','')));
                $('#pinButton').css('background-color','#C67101');
                global.pinBoolean = true;
                global.setPin(
                    new google.maps.Marker(
                        {
                            'position': new google.maps.LatLng(Number(parameterVal.replace(/(.+),(.+),(.+)/,'$1')),Number(parameterVal.replace(/(.+),(.+),(.+)/,'$2'))),
                            'map': global.map,
                            'icon': 'images/location-marker-th.png',
                            'draggable': true
                        }
                    )
                );
            }
        }
    }
}

/**
 * Populates list of Tweets below map 
 */
function populateCaption() {
    $.each(global.content,function(i) {
        $('#caption').append(
            '<div class="captionDiv caption'+this.key+'"><div class="captionLetter">'+this.key+'</div><a class="captionPic" href="http://twitter.com/#!/'+this.user+'" target="_blank"><img width="48" height="48" src="'+this.img+'"/></a><div class="captionContent">'+this.text.tweetEncode()+' <em>'+TwitterDateConverter(this.time)+'</em></div></div>'
        );
    });

    $('.below').css('margin',0);

    $('.captionLetter').click( function() {
        var new_position = $('#MapLabel').offset();

        global.map.setCenter(global.content[$(this).text().trim().charCodeAt()-65].marker.position);
        highlight(global.content[$(this).text().trim().charCodeAt()-65].marker);

        window.scrollTo(new_position.left,new_position.top);
    });
};

/**
 * Handles formatting after async calls has been retrieved
 */
function postLoadFormat() {
    $('.canvas').width($('#wrapper').width()-$('#sidebar').outerWidth(true)-global.horizontalMargin*2);
    $('.canvasText').css('padding-left',global.horizontalMargin+'px');
    $('.canvasText').css('padding-right',global.horizontalMargin+'px');
    $('#loader').hide();
};

/**
 * changes canvas and canvas labels
 */
function changeCanvas(canvasID){
    $('.'+$('#'+canvasID).attr('class').match(/\w+/)).hide();
    $('#'+canvasID).show();

    $($('#'+canvasID+'Label').parent().children()).each(function () {
        $(this).css('font-weight','normal');
    });
    $('#'+canvasID+'Label').css('font-weight','bold');
};

/**
 * displays date of Tweet relative to present
 */
function TwitterDateConverter(time){//big up http://www.phpmind.com/blog/2011/02/how-to-change-date-formate-of-twitter-field-created_at%E2%80%99/
    var date = new Date(time),
        diff = (((new Date()).getTime() - date.getTime()) / 1000),
        day_diff = Math.floor(diff / 86400);

    if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
        return;

    return day_diff == 0 && (
        diff < 60 && "just now" ||
            diff < 120 && "1 minute ago" ||
            diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
            diff < 7200 && "1 hour ago" ||
            diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
        day_diff == 1 && "Yesterday" ||
        day_diff < 7 && day_diff + " days ago" ||
        day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
};

/**
 * highlights marker and caption
 */
function highlight(marker) {

    var maxZIndex = -999999;

    changeCanvas('Result');

    $.each(global.content,function() {
        this.marker.setIcon('images/blue_Marker' + this.marker.key + '.png');
        maxZIndex = Math.max(maxZIndex, this.marker.ZIndex);
    })
    $('#caption').children().each(function() {
        $(this).css('font-weight','normal')
    });
    marker.setIcon('images/orange_Marker' + marker.key +'.png');
    marker.setZIndex(maxZIndex+1);
    $('.caption'+marker.key).css('font-weight','bold');
    $('#Result').html("");
    $.each(global.content,function() {
        if (this.marker.key == marker.key) {
            $('#Result').append(
                '<div class="search"><div class="sidebarContentTitle"><a href="http://twitter.com/#!/'+this.user+'"  target="_blank">@'+this.user+'</a> tweeted,</div><div class="sidebarContent">'+this.text.tweetEncode()+'</div><div class="sidebarContentTime">'+TwitterDateConverter(this.time)+'</div></div>'
            );
        }
    });
};

/**
 * unhighlights marker and caption
 */
function unhighlight() {
    $.each(global.content,function() {
        this.marker.setIcon('images/blue_Marker' + String.fromCharCode(parseInt(this.key)+65) +'.png');
    })
    $('#caption').children().css('font-weight','normal');
    $('#resultText').html('<div class="sidebarContentTitle">Select a marker on the map to see the content of its Tweet.</div>');
};

/**
 * drops pin and sets listener for click on pin
 */
function dropPin() {
    global.map.setOptions({ draggableCursor: 'crosshair' })
    $('#pinButton').css('background-color','#C67101');

    global.setPinListener(
        google.maps.event.addListenerOnce(global.map, 'click',
            function(event) {
                var selectedLatLng = event.latLng;
                global.setPin(
                    new google.maps.Marker(
                        {
                            'position': selectedLatLng,
                            'map': global.map,
                            'icon': 'images/location-marker-th.png',
                            'draggable': true,
                        }
                    )
                    
                );
                global.map.setOptions({ draggableCursor: null });
            }
        )
    );
};

/**
 * removes pin and its listener
 */
function removePin() {
    if (global.pin) {
        global.pin.setMap(null);
        global.pin = null;
    }

    if (global.pinListener) {
        google.maps.event.removeListener(global.pinListener);
    }

	global.pinBoolean = false;
    global.map.setOptions({ draggableCursor: null })
    $('#pinButton').css('background-color','#FFC400');
    
    
};


//LEVEL 0 ASYNC FUNCTION

/**
 * Gets Tweets from Twitter API
 */
function loadMap(map){
	
	var searchURL = getAPIURL();

    //must be on top. API does not work if map is hidden
	changeCanvas('Search');
	changeCanvas('Map');
	
	$('#loader').show();
    $('#Result').html='<div class="sidebarContentTitle">Select a marker on the map to see the content of its Tweet.</div>'
    $('.below').css('margin-bottom','0');
    $('.wrapper').css('border-bottom',2);
    $('#caption').html('');

    $.ajax(searchURL, {
        crossDomain:true,
        dataType: "jsonp",
        success:function(data){
            geocodeTweets(map,data);
        },
        timeout:15000,
        error: function() {
        	
        	if (global.firstSearch) {
        		
        		changeMapCanvas('timeout');
        		
        	} else {

		        $().toastmessage('showToast', {
		             text     : "The search has timed out. This may be an issue with your Internet connection, you may have breached Twitter's hourly search limit, or Twitter's API may be down. Please try again later. If problems persist, you may want to clear the data in your browser.",
					 type     : 'error',
		             sticky   : true,
		             position : 'middle-center'
		        });
        		
        	}
	        
			$('#loader').hide();	

        }
    });
	
	/**
	 * makes URL to call initial Twitter API and sets global variable accordingly 
	 */
	function getAPIURL(){
		
	    var APIString = 'http://search.twitter.com/search.json?callback=?&rpp=100';
	    var URLString = '#'
	    var elem = document.getElementById('searchForm');
	    var first = true;
	
	    for (i=1;i<elem.length;i++) { //index 0 is fieldset
	        if (elem[i].value != '' && elem[i].id != 'radius'){
	            APIString += (first ? '&q=' : '%20') + encodeURIComponent(((elem[i].id=='tweetContent') ? '' : elem[i].id+':') + ((elem[i].id=='from' || elem[i].id=='to') ? elem[i].value.replace('@',''):elem[i].value));
	            URLString += (first ? '' : '&') + elem[i].id  + '=' + encodeURIComponent((elem[i].id=='from' || elem[i].id=='to') ? elem[i].value.replace('@','') : elem[i].value);
	            first = false;
	        }
	    }
	
	    if (global.pin) {
	        APIString +=  '&geocode='+global.pin.getPosition().lat()+','+global.pin.getPosition().lng()+','+$('#radius').val()+'mi';
	        URLString += (first ? 'geocode=' : '&geocode=')+global.pin.getPosition().lat()+','+global.pin.getPosition().lng()+','+$('#radius').val()+'mi';
	    }
	
	    console.log(APIString);
	    global.setSearchURL(URLString);
	    window.location.hash = global.searchURL;
	
	    return APIString;
	
	};

	/**
	 * Dictates how the geocoding of each Tweet should be handled
	 */
	function geocodeTweets(map,data) {
		
	    var regexp = /\-*\d+[.,]\d+/g;
	    var results = data.results;
		var userNames = '';
	    
		if (!results || results.length == 0) {
	        return noResults();
		} else {
			for (i=0;i<results.length;i++) {
				results[i].waiting = true;
		        results[i].geo_info = {'valid':false,'exact':false,'lat':false,'lng':false};
			}
		} 
			    
	    //reset map
	    changeCanvas('Search');
	    changeCanvas('Map');
	    global.resetItems();
		
		//fork in road
	    $.each(results, function(ind,result) {
	        if (result.geo) {
	        	console.log('geotagging ' + result.from_user + ' directly');
	        	geotagResult(result); 
	        	return;
	        }
	        if (checkForDuplicateUN(result)) {
	        	console.log('duplicate of ' + result.from_user);
	        	return;
	        }
	        userNames += result.from_user + ',';
	    });
	    
	    getLocations(userNames);
		
		/**
		 * Assigns lat-lng to result in case where this information is specified directly by Twitter
		 * @param result with lat-lng recieved from Twitter  
		 */
	    function geotagResult(result) {
	        result.waiting = false;
	        result.geo_info = {
	            'valid':true,
	            'exact':true,
	            'lat':result.geo.coordinates[0],
	            'lng':result.geo.coordinates[1],
	        };
	        addToMap(map,result);
	    }
	
		/**
		 * Checks to see if username is already in the process of being geocoded
		 */
		function checkForDuplicateUN(result) {
	        for (i = 0; i < results.length; i++) {
	            comp_result = results[i];
	            if (result == comp_result) {return false;}
	            if (result.from_user == comp_result.from_user && !comp_result.geo_info.exact) {
	                result.geo_info = comp_result.geo_info;//probably meaningless, but could apply to super-fast call on super-slow computer
	                return true;
	            }
	        }
	        return false;
	    }
	
		//LEVEL 1 ASYNC FUNCTION
		
		/**
		 * Checks for the locations of all outstanding usernames at once, then geocodes them
		 */
	    function getLocations(userNames) {
	    	
	        //http://twitter.com/statuses/user_timeline.json?callback=?&count=5&id=
	        console.log('https://api.twitter.com/1/users/lookup.json?screen_name='+userNames+'&include_entities=false');
	        $.ajax('https://api.twitter.com/1/users/lookup.json?screen_name='+userNames+'&include_entities=false', {
	        	type: "POST",
	            crossDomain:true,
	            dataType: 'jsonp',
	            timeout:15000,
	            //TODO: Handle 400's better
		        error: function() {
		        	
		        	if (global.firstSearch) {
		        		
		        		changeMapCanvas('timeout');
		        		
		        	} else {
		
				        $().toastmessage('showToast', {
				             text     : "The search has timed out. This may be an issue with your Internet connection, you may have breached Twitter's hourly search limit, or Twitter's API may be down. Please try again later. If problems persist, you may want to clear the data in your browser.",
							 type     : 'error',
				             sticky   : true,
				             position : 'middle-center'
				        });
		        		
		        	}
			        
			        $('#loader').hide();	

		        },
	            success: function(users) {
	           	    $.each(users, function(ind,user) {
	           	    	geocodeUser(ind,user);
	           	    });
	            }
	        });

	    	//LEVEL 2 ASYNC FUNCTION
	    	
	    	/**
	    	 * Requests lat-lng from Google and handles response
	    	 */
            function geocodeUser(ind,user) {
            	
	            console.log('user location: ' + user.location);
	            
	            if (!(user.location == null)) {
	                if ((user.location.search(regexp) == -1) ? false : (user.location.match(regexp).length != 2) ? false : (user.location.match(regexp)[0] >= -90 && user.location.match(regexp)[0] <=90 && user.location.match(regexp)[1] >= -180 && user.location.match(regexp)[1] <= 180)) {
	                    gotCoords(user.location.match(regexp)[0],user.location.match(regexp)[1]);
	                } else {
	                	if (!(user.location.replace(/\s/g) == '')) {
		                    new google.maps.Geocoder().geocode( { 'address': user.location }, function(results, status) {
		                        if (status == google.maps.GeocoderStatus.OK) {
		                            gotCoords(results[0].geometry.location.lat(),results[0].geometry.location.lng())
		                        } else {
		                        	didNotGetCoords();
		                        }
		                    });                		
	                	} else {
	                       	didNotGetCoords();
	                	}
	                }
	            } else {
                   	didNotGetCoords();
	            }
                
                /*
                 * Assigns lat-lng to Tweet and any with duplicate user names
                 */
	            function gotCoords(lat,lng) {
	            	
					//CALL TO THOSE DROPPED DURING USERNAME CHECK
			        $.each(results,function () {
			        	
			            if (!this.waiting) {return;}
			            if (this.from_user == user.screen_name) {
			            	
			            	this.geo_info.valid = true;
			                this.geo_info.lat = lat;
			                this.geo_info.lng = lng;
			                addToMap(map,this);
			                
			            }
			            
			        });
				
	            }
	
                /*
                 * Makes sure that Tweet and those with duplicate user names is no longer waiting
                 */
	            function didNotGetCoords() {
	
					//CALL TO THOSE DROPPED DURING USERNAME CHECK
			        $.each(results,function () {
			            if (!this.waiting) {return;}
			            if (this.from_user == user.screen_name) {
			            	
							this.waiting = false;
							
			            }
			        })
	
					checkForDone();
	
	            }
	
            }
	            
	    }
	    
	    //SYNCHRONOUS FUNCTIONS AT END OF ASYNC THREADS	
	    
	    /**
	     * Display no results toast
	     */
		function noResults() {
			
			if (global.firstSearch) {
								
				changeMapCanvas('no_results');
				
			} else {

		        $().toastmessage('showToast', {
		             text     : 'No Tweets found. Please modify your search or try again later.',
					 type     : 'warning',
					 stayTime : 4500,  
		             sticky   : false,
		             position : 'middle-center'
		        });
				
			}
	        
            $('#loader').hide();
	
		}
		
	    /**
	     * Checks to see if all waiting status of all results ar done, and changes canvas accordingly
	     */
		function checkForDone() {
			var done = true;
			var hasResults = false;
			
			for (i=0;i<results.length;i++) {
				if (results[i].waiting) {
					done = false; 
					console.log(i + ' is not done.');
					break;
				} else {
					console.log(i + ' is done.');
				}
				if (results[i].geo_info.valid) {hasResults = true;}
			}
			
			if (done) {
				
				$('#MapLabel').click(function() {
		            changeCanvas('Map');
	            });
			    $('#Map').css('left',global.horizontalMargin + 'px');
			    $('.captionContent').width($('.captionDiv').width()-$('.captionLetter').outerWidth(true)-$('.captionPic').outerWidth(true)-5);
				    
				if (hasResults){
					
					global.firstSearch = false;
					
				    if (global.pin) {
				    	zoom(global.content,global.map,zoomFromPin);
				    } else {
					    zoom(global.content,global.map,zoomExtents);		    	
				    }
				    
				} else {
					
					if (global.firstSearch) {

						changeMapCanvas('no_location');

					} else {
						
				        $().toastmessage('showToast', {
				             text     : 'Tweets found, but none are geocoded. Please modify your search or try again later.',
							 type     : 'warning',
							 stayTime : 4500,  
				             sticky   : false,
				             position : 'middle-center'
				        });
			        						
					}
					
		            $('#loader').hide();
			            
				}
				
				postLoadFormat();
				
			}//if (done)
			
			/**
			 * Sets zoom
			 * @param Tweets found and geocoded
			 * @param Map Google Maps object
			 * @param expansionFunction function used to set latlngbounds
			 */
			function zoom(content,map,expansionFunction){
				
			    var markers = new Array();
			    
			    for (i=0;i<content.length;i++) {
			    	if (markers.indexOf(content[i].marker) == -1) {
			    		markers.push(content[i].marker);
			    	}
			    }
			    
				map.fitBounds(expansionFunction(markers));		    

		        new google.maps.MaxZoomService().getMaxZoomAtLatLng(map.getCenter(), function(MaxZoomResult){
		        	
		        	//asynchronous callback
		        	map.setZoom(Math.min(map.getZoom(),Math.min(18,MaxZoomResult.zoom)));
		        	
		    	});
		    	
			};
			
			/**
			 * Zooms to show all markers, 
			 * @param markers markers to be shown
			 * @return latlngbounds for Google Maps API
			 */
			function zoomExtents(markers) {
			
			    var bounds = new google.maps.LatLngBounds();
			
			    for(i=0;i<markers.length;i++){
					bounds.extend(markers[i].position);
			    }
			        
			    return bounds;
			
			}
			
			/**
			 * Zooms to show markers within 3x radius of pin, and displays toast to mention markers outside this radius 
			 * @param markers markers to be shown
			 * @return latlngbounds for Google Maps API
			 */
			function zoomFromPin(markers) {
			
				/**
				 * Good old copy-and-pasted 3d trig
				 */
			    function haversine(latLngFirst, latLngSecond) {
			    	
			    	var lat1 = latLngFirst.lat()    	
			    	var lon1 = latLngFirst.lng()    	
			    	var lat2 = latLngSecond.lat()    	
			    	var lon2 = latLngSecond.lng()    	
			
			    	var R = 3958.7558657440545; // miles
					var dLat = (lat2-lat1).toRad();
					var dLon = (lon2-lon1).toRad();
					var lat1 = lat1.toRad();
					var lat2 = lat2.toRad();
					
					var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
					        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
					var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
					
					return R * c;
					
			    }    
			
			    var bounds = new google.maps.LatLngBounds();
			    
				var allOutOfBounds = true;
				var oneOutOfBounds = false;
			    
			    for(i=0;i<markers.length;i++){
			    	
			    	var radius = $('#radius').val();
			    	var relaxation = 1;
			    	
			    	//be more relaxed about smaller radii
					if (radius <= 100) {
						relaxation = 3;
					} else if (radius <= 500) {
						relaxation = 2;
					} else if (radius <= 1000) {
						relaxation = 1.5;
					} else {
						relaxation = 1;
					}
			
			    	if (haversine(global.pin.getPosition(), markers[i].position) < radius * relaxation ){
						bounds.extend(markers[i].position);
						allOutOfBounds = false;
			    	} else {
			    		oneOutOfBounds = true;
			    	}
			    }
			    
			   	bounds.extend(global.pin.getPosition());
			    
			    if (allOutOfBounds) {
			    	
			        $().toastmessage('showToast', {
			             text     : 'Cannot find results within the distance specified. Zooming to show Tweets worldwide.',
						 stayTime : 4500,  
			             sticky   : false,
			             position : 'middle-center',
			             type     : 'notice'
			        });
			        
			        //zoom extents if none within radius
			    	return zoomExtents(markers);
			    	
			    } else if (oneOutOfBounds) {
			
			        $().toastmessage('showToast', {
			             text     : 'Zooming to show only results within distance specified. Zoom out to see worldwide results.',
						 stayTime : 4500,  
			             sticky   : false,
			             position : 'middle-center',
			             type     : 'notice'
			        });
			
			    }
			    
			    return bounds;
			    
			}

		}
	
	    /**
	     * Adds result to map
	     */
		function addToMap(map, result) {
		
			/**
			 * Finds results that have been geocoded to same point
			 */
			function findSameLoc(content) {
				for (i = 0; i < global.content.length; i++) {
					var contentCur = global.content[i];
					if (contentCur == content) {continue;}
					if (contentCur.lat == content.lat && contentCur.lng == content.lng) {return contentCur;}
				}
				return false;
			}
		
		    var content = {
			    'text':result.text,
			    'lat':result.geo_info.lat,
			    'lng':result.geo_info.lng,
			    'img':result.profile_image_url,
			    'user':result.from_user,
			    'marker': null,
			    'time':result.created_at
			}
			
		    var repeat = findSameLoc(content);
		
	    	if (global.getKey() < 26) {

			    if (repeat) {
					content.marker = repeat.marker;
					repeat.marker.title = "Multiple Tweets";
			    } else {

			    	var currKey = global.getKeyAsChar();

			        content.marker = new google.maps.Marker(
				        {
				            'position': new google.maps.LatLng(content.lat,content.lng),
				            'map': map,
				            'icon': 'images/blue_Marker' + currKey +'.png',
				            'title': TwitterDateConverter(result.created_at),
				            'key': currKey
				        }//marker array
					);
			        
			        google.maps.event.addListener(content.marker , 'click', function() {
						highlight(this);
					});
					
					global.nextKey();
						
				}
		    	
			    global.addContent(content);
			    
			    $('.below').css('margin-bottom','10px');
			    $('.wrapper').css('border-bottom',1);
			
			    $('#caption').append(
					'<div class="captionDiv caption'+content.marker.key+'"><div class="captionLetter">'+content.marker.key+'</div><a class="captionPic" href="http://twitter.com/#!/'+content.user+'" target="_blank"><img width="48" height="48" src="'+content.img+'"/></a><div class="captionContent">'+content.text.tweetEncode()+' <em>'+TwitterDateConverter(content.time)+'</em></div></div>'
			    );
			    
			    $('.captionLetter').click( function() {
			        var new_position = $('#MapLabel').offset();
			
			        global.map.setCenter(global.content[$(this).text().trim().charCodeAt()-65].marker.position);
			        highlight(global.content[$(this).text().trim().charCodeAt()-65].marker);
			
			        window.scrollTo(new_position.left,new_position.top);
			    });
		    		
		    }
		    			    
			result.waiting = false;	    	
			checkForDone();
			
		}
		
	}
	
};