//JS for TweetPin

//ONE GLOBAL OBJECT
var global = new Global();

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}

function Global() {
    this.horizontalMargin = 15;
    this.pinBoolean = false;


    this.nextKey = function() {
        this.nextKeyValue++;
        return new Number(this.nextKeyValue).toString();
    }

    this.addItem = function(item) {
        this.addMarker(item.marker);
        this.addContent(item.content);
    }

    this.addMarker = function(marker) {
        this.markers.push(marker);
    }
    this.addContent = function(con) {
        this.content.push(con);
        
    }

    this.resetItems = function() {
        this.content = new Array();
        this.removeMarkers();
        this.nextKeyValue = 0;
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

    this.setMarkers = function(markerArray){
        this.markers = markerArray;
    }

    this.setContent = function(contentArray) {
        this.content = contentArray;
    }

    this.setSearchURL = function(URLString) {
        this.searchURL = URLString;
    }

    this.removeMarkers = function() {
        if (this.markers) {
            for (i=0;i<this.markers.length;i++) {
                this.markers[i].setMap(null);//removes from map
            }
        }
        this.markers = new Array();
    }
};

//CLASS EXTENTION
String.prototype.tweetEncode = function() {

    var forReturn = this;
    //var URLArrMatch = forReturn.match(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/g);//links
    var encodeLink = function(str,ptrn,hrefPrefix,startingIndex) {
        var index = str.search(ptrn);

        if (index != -1) {
            var tagged = str.match(ptrn)[0];
            return (str.substring(0,index) + '<a href="'+hrefPrefix+encodeURIComponent(tagged.toString().substring(startingIndex,tagged.length))+'" target="_blank">'+tagged+'</a>' + encodeLink(str.substring(index+tagged.length,str.length),ptrn,hrefPrefix,startingIndex));
        } else {
            return str;
        }
    };

    forReturn = encodeLink(forReturn,/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,'',0);
    forReturn = encodeLink(forReturn,/#\w+/,'http://twitter.com/#!/search/',0);
    forReturn = encodeLink(forReturn,/@\w+/,'http://twitter.com/#!/',1);

    return forReturn;
};

//SYNCHRONOUS FUNCTIONS
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



function populateCaption() {
    $.each(global.content,function(i) {
        $('#caption').append(
            '<div class="captionDiv caption'+this.key+'"><div class="captionLetter">'+this.key+'</div><a class="captionPic" href="http://twitter.com/#!/'+this.user+'" target="_blank"><img width="48" height="48" src="'+this.img+'"/></a><div class="captionContent">'+this.text.tweetEncode()+' <em>'+TwitterDateConverter(this.time)+'</em></div></div>'
        );
    });

    $('.below').css('margin',0);

    $('.captionLetter').click( function() {
        var new_position = $('#MapLabel').offset();

        global.map.setCenter(global.markers[$(this).text().trim().charCodeAt()-65].position);
        highlight(global.markers[$(this).text().trim().charCodeAt()-65]);

        window.scrollTo(new_position.left,new_position.top);
    });
};

function postLoadFormat() {
    $('.canvas').width($('#wrapper').width()-$('#sidebar').outerWidth(true)-global.horizontalMargin*2);
    $('.canvasText').css('padding-left',global.horizontalMargin+'px');
    $('.canvasText').css('padding-right',global.horizontalMargin+'px');
    $('#Map').css('left',global.horizontalMargin + 'px');
    $('.captionContent').width($('.captionDiv').width()-$('.captionLetter').outerWidth(true)-$('.captionPic').outerWidth(true)-5);
    $('#loader').hide();
};

function zoomExtents(markers,map){
    if (markers.length == 1) {
        var zoomService = new google.maps.MaxZoomService();

        map.setCenter(markers[0].position);
        zoomService.getMaxZoomAtLatLng(map.getCenter(), function(MaxZoomResult){
            map.setZoom(Math.min(18,MaxZoomResult.zoom));//asynchronous callback
        });
    } else if (global.pin) {
        map.setCenter(global.pin.position);
        map.setZoom(10);//should make dynamic
    } else {
        var bounds = new google.maps.LatLngBounds();

        for(i=0;i<markers.length;i++){
            bounds.extend(markers[i].position);
        }
        map.fitBounds(bounds);
    }
};

function changeCanvas(canvasID){
    $('.'+$('#'+canvasID).attr('class').match(/\w+/)).hide();
    $('#'+canvasID).show();

    $($('#'+canvasID+'Label').parent().children()).each(function () {
        $(this).css('font-weight','normal');
    });
    $('#'+canvasID+'Label').css('font-weight','bold');
};

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

function getAPIURL(){

    var APIString = 'http://search.twitter.com/search.json?callback=?&rpp=10';
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

function highlight(marker) {

    var maxZIndex = -999999;

    changeCanvas('Result');

    $.each(global.content,function() {
        this.setIcon('images/blue_Marker' + String.fromCharCode(parseInt(this.key)+65) +'.png');
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
        if (this.key == marker.key) {
            $('#Result').append(
                '<div class="search"><div class="sidebarContentTitle"><a href="http://twitter.com/#!/'+this.user+'"  target="_blank">@'+this.user+'</a> tweeted,</div><div class="sidebarContent">'+this.text.tweetEncode()+'</div><div class="sidebarContentTime">'+TwitterDateConverter(this.time)+'</div></div>'
            );
        }
    });
};

function unhighlight() {
    $.each(global.content,function() {
        this.setIcon('images/blue_Marker' + String.fromCharCode(parseInt(this.key)+65) +'.png');
    })
    $('#caption').children().css('font-weight','normal');
    $('#resultText').html('<div class="sidebarContentTitle">Select a marker on the map to see the content of its Tweet.</div>');
};

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
                            'draggable': true
                        }
                    )
                );
                global.map.setOptions({ draggableCursor: null });
            }
        )
    );
};

function removePin() {
    if (global.pin) {
        global.pin.setMap(null);
        global.pin = null;
    }

    if (global.pinListener) {
        google.maps.event.removeListener(global.pinListener);
    }

    global.map.setOptions({ draggableCursor: null })
    $('#pinButton').css('background-color','#FFC400');
};

//THIRD-LEVEL SYNCHRONOUS FUNCTION

function resetMap(map) {
    changeCanvas('Search');
    changeCanvas('Map');
    global.resetItems();
}

function addToMap(map, result) {

    function findSameLoc(content) {
        for (i = 0; i < global.content; i++) {
                cur_content = global.content[i];
                if (cur_content == content) {continue;}
                if (cur_content.lat == content.lat && cur_content.lng == content.lng) {return cur_content;}
            }
        return false;

    }

    content = {
                        'key': '',
                        'text':result.text,
                        'lat':result.geo_info.lat,
                        'lng':result.geo_info.lng,
                        'img':result.profile_image_url,
                        'user':result.from_user,
                        'marker': null,
                        'time':result.created_at
                    }
    repeat = findSameLoc(content);
    if (repeat) {
        content.key = repeat.key;
        content.marker = repeat.marker;
        repeat.marker.title = "Multiple Tweets";
    }
    else {
        content.key = global.nextKey();
        marker = new google.maps.Marker(
                                {
                                    'position': new google.maps.LatLng(content.lat,content.lng),
                                    'map': map,
                                    'place': result.place,
                                    'icon': 'images/blue_Marker' + String.fromCharCode(65+parseInt(content.key)) +'.png',
                                    'title': TwitterDateConverter(result.created_at),
                                    'key': content.key
                                }//marker array
                            );
        google.maps.event.addListener(marker, 'click', function() {
                        highlight(this);
                    });
        content.marker = marker;
        global.addMarker(marker);
    }
    global.addContent(content);

    $('#caption').append(
            '<div class="captionDiv caption'+content.key+'"><div class="captionLetter">'+content.key+'</div><a class="captionPic" href="http://twitter.com/#!/'+content.user+'" target="_blank"><img width="48" height="48" src="'+content.img+'"/></a><div class="captionContent">'+content.text.tweetEncode()+' <em>'+TwitterDateConverter(content.time)+'</em></div></div>'
    );
    if (global.markers.length > 0) {zoomExtents(global.markers,map);}
    postLoadFormat();

    return '#Map';
}



function initializeMap(map,data,geocodedLatLng){

    var markerIndex = 0;
    var tweetMarkers = new Array();
    var tweetContent = new Array();

    //must be on top. API does not work if map is hidden
    changeCanvas('Search');
    changeCanvas('Map');

    if (data.results.length==0) {
        changeCanvas('no_results');
        $('#loader').hide();
        return '#no_results';
    } else {
        console.log(geocodedLatLng);
        for (i=0;i<geocodedLatLng.length;i++) {

            if(geocodedLatLng[i].valid){

                var alreadyMarked = false;

                for (j=0;j<tweetContent.length;j++) {
                    if (tweetContent[j]['lat'] == geocodedLatLng[i].lat && tweetContent[j]['lng'] == geocodedLatLng[i].lng) {
                        alreadyMarked = true;
                        break;
                    }
                }

                tweetContent.push(
                    {
                        'key': '',
                        'text':data.results[i].text,
                        'lat':geocodedLatLng[i].lat,
                        'lng':geocodedLatLng[i].lng,
                        'img':data.results[i].profile_image_url,
                        'user':data.results[i].from_user,
                        'time':data.results[i].created_at
                    }
                );

                if (alreadyMarked) {

                    tweetContent[tweetContent.length-1].key = tweetContent[j].key;

                    tweetMarkers[tweetContent[j].key.charCodeAt()-65].title = 'Multiple Tweets';

                } else {

                    tweetContent[tweetContent.length-1].key = String.fromCharCode(markerIndex+65),

                        tweetMarkers.push(
                            new google.maps.Marker(
                                {
                                    'position': new google.maps.LatLng(geocodedLatLng[i].lat,geocodedLatLng[i].lng),
                                    'map': map,
                                    'place': data.results[i].place,
                                    'icon': 'images/blue_Marker' + String.fromCharCode(markerIndex+65) +'.png',
                                    'title': TwitterDateConverter(data.results[i].created_at),
                                    'key': String.fromCharCode(markerIndex+65)
                                }//marker array
                            )
                        );//marker constructor

                    google.maps.event.addListener(tweetMarkers[markerIndex], 'click', function() {
                        highlight(this);
                    });

                    markerIndex++;

                }
            }
        }//big for

        if (tweetMarkers.length == 0) {
            changeCanvas('no_location');
            $('#loader').hide();
            return '#no_location';
        }

        tweetContent.sort(function(a, b){
            return a.key[0].charCodeAt()-b.key[0].charCodeAt();
        })

    }

    //call helper functions
    global.setMarkers(tweetMarkers);
    global.setContent(tweetContent);
    zoomExtents(tweetMarkers,map);
    populateCaption();

    //formatting after scroll is established
    postLoadFormat();

    return '#Map';

};//initialize

function noResults() {
    changeCanvas('no_results');
        $('#loader').hide();
        return '#no_results';
}

function geocodeTweetsJack(map,data) {
    var geocodedData = new Object();
    var geocoder = new google.maps.Geocoder();
    var results = data.results;
    var regexp = /\-*\d+[.,]\d+/g;
    if (results.length == 0) {
        noResults();
        return;
    }
    resetMap();
    $.each(results, geocodeTweet);
    function geocodeTweet(ind,result) {
        if (result.geo) {geotagResult(result); return;}
        if (checkForDuplicateUN(result)) {return;}
        ajaxResult(result);
    }
    function geotagResult(result) {
        result.geo_info = {
            'valid':true,
            'exact':true,
            'lat':result.geo.coordinates[0],
            'lng':result.geo.coordinates[1],
            'waiting': false
        };
        addToMap(map,result);
    }
    function checkForDuplicateUN(result) {
        for (i = 0; i < results.length; i++) {
            comp_result = results[i];
            if (result == comp_result) {return false;}
            if (result.from_user == comp_result.from_user && !comp_result.geo_info.exact) {
                result.geo_info = comp_result.geo_info;
                if (!result.geo_info.waiting) {addToMap(map,result);}
                return true;
            }
        }
        return false;
    }
    function checkForWaiting(result) {
        $.each(results,function () {
            if (!this.geo_info || this == result || !this.geo_info.waiting) {return;}
            if (this.from_user == result.from_user) {
                this.geo_info = result.geo_info;
                addToMap(map,this);
            }
        })
    }
    function ajaxResult(result) {
        function onSuccess(data) {
            function gotCoords(lat,lng) {
                result.geo_info.lat = lat;
                result.geo_info.lng = lng;
                result.waiting = false;
                addToMap(map,result);
                checkForWaiting(result);
            }
            if  (data.length>0) {
                if ((data[0].user.location == null) ? false :(data[0].user.location.search(regexp) == -1) ? false : (data[0].user.location.match(regexp).length != 2) ? false : (data[0].user.location.match(regexp)[0] >= -90 && data[0].user.location.match(regexp)[0] <=90 && data[0].user.location.match(regexp)[1] >= -180 && data[0].user.location.match(regexp)[1] <= 180)) {
                    gotCoords(data[0].user.location.match(regexp)[0],data[0].user.location.match(regexp)[1]);
                } else {
                    geocoder.geocode( { 'address': data[0].user.location }, function(results, status) {
                        if (status == google.maps.GeocoderStatus.OK) {
                            gotCoords(results[0].geometry.location.lat(),results[0].geometry.location.lng())
                        }
                    });
                }
            }
        }
        result.geo_info = {'valid':true,'exact':false,'lat':false,'lng':false,'waiting': true};
        $.ajax('http://twitter.com/statuses/user_timeline.json?callback=?&count=5&id='+result.from_user, {
            crossDomain:true,
            dataType: 'jsonp',
            timeout:5000,
            error: function() {
                changeCanvas('breached');
                $('#MapLabel').click(function() {
                    changeCanvas('breached');
                });
                postLoadFormat();
            },
            success:onSuccess
        });
    }

}

//SECOND-LEVEL ASYNCHRONOUS FUNCTION
function geocodeTweets(map,data) {

    var geocodedLatLng = new Array();
    var geocoder = new google.maps.Geocoder();
    var searched = new Object();
    searched.name = new Array();
    searched.latLng = new Array();

    var geocode = function(n) { //recursive
        if (n>0) {

            var userName = data.results[n-1].from_user;
            var regexp = /\-*\d+[.,]\d+/g;

            if (data.results[n-1].geo) {
                geocodedLatLng.unshift(
                    {
                        'valid':true,
                        'exact':true,
                        'lat':data.results[n-1].geo.coordinates[0],
                        'lng':data.results[n-1].geo.coordinates[1]
                    }
                );
                geocode(n-1);//needs to be repeated because asynchronous
            } else if (searched.name.contains(userName)) {
                geocodedLatLng.unshift(searched.latLng[searched.name.indexOf(userName)]);
                geocode(n-1);//needs to be repeated because asynchronous
            } else {
                $.ajax('http://twitter.com/statuses/user_timeline.json?callback=?&count=5&id='+data.results[n-1].from_user, {
                    crossDomain:true,
                    dataType: 'jsonp',
                    timeout:5000,
                    error: function() {
                        changeCanvas('breached');
                        $('#MapLabel').click(function() {
                            changeCanvas('breached');
                        });
                        postLoadFormat();
                    },
                    success:function(data) {
                        searched.name.unshift(userName);//to avoid searching multiple times for the same user
                        if  (data.length>0) {
                            console.log(data[0].user.location);
                            if ((data[0].user.location == null) ? false :(data[0].user.location.search(regexp) == -1) ? false : (data[0].user.location.match(regexp).length != 2) ? false : (data[0].user.location.match(regexp)[0] >= -90 && data[0].user.location.match(regexp)[0] <=90 && data[0].user.location.match(regexp)[1] >= -180 && data[0].user.location.match(regexp)[1] <= 180)) {//for ubertwitter
                                geocodedLatLng.unshift(
                                    {
                                        'valid':true,
                                        'exact':false,
                                        'lat':(data[0].user.location.match(regexp)[0]),
                                        'lng':(data[0].user.location.match(regexp)[1])
                                    }
                                );
                                searched.latLng.unshift(geocodedLatLng[0]);//needs to be repeated because asynchronous
                                geocode(n-1);//needs to be repeated because asynchronous
                            } else {
                                geocoder.geocode( { 'address': data[0].user.location }, function(results, status) {
                                    if (status == google.maps.GeocoderStatus.OK) {
                                        geocodedLatLng.unshift(
                                            {
                                                'valid':true,
                                                'exact':false,
                                                'lat':results[0].geometry.location.lat(),
                                                'lng':results[0].geometry.location.lng()
                                            }
                                        );
                                        searched.latLng.unshift(geocodedLatLng[0]);//needs to be repeated because asynchronous
                                        geocode(n-1);//needs to be repeated because asynchronous
                                    } else {
                                        geocodedLatLng.unshift(
                                            {
                                                'valid':false
                                            }
                                        );
                                        searched.latLng.unshift(geocodedLatLng[0]);//needs to be repeated because asynchronous
                                        geocode(n-1);//needs to be repeated because asynchronous
                                    }
                                });
                            }
                        } else {
                            geocodedLatLng.unshift(
                                {
                                    'valid':false
                                }
                            );
                            searched.latLng.unshift(geocodedLatLng[0]);//needs to be repeated because asynchronous
                            geocode(n-1);//needs to be repeated because asynchronous
                        }
                    }
                });
            }
        } else {
            $('#MapLabel').click(function() {
                changeCanvas('Map');
            });
            initializeMap(map,data,geocodedLatLng);
        }
    };

    if (data.results) {
        geocode(data.results.length);
    } else {
        changeCanvas('no_results');
        $('#loader').hide();
    }
}

//FIRST-LEVEL ASYNCHRONOUS FUNCTION
function loadMap(map){
    var searchURL = getAPIURL();

    $('#loader').show();
    $('#Result').html='<div class="sidebarContentTitle">Select a marker on the map to see the content of its Tweet.</div>'
    $('#caption').html("");

    $.ajax(searchURL, {
        crossDomain:true,
        dataType: "jsonp",
        success:function(data){
            geocodeTweetsJack(map,data);
        }
    });

};

//ON LOAD
$(document).ready(function(){

    //FOR GCF BRENDAN,CAN YOU HAVE A LOOK?
    CFInstall.check({
        mode: 'overlay',
        destination: "http://www.waikiki.com"
    });

    //shot ajax loader
    $('#loader').show();

    //initialize jQuery event handlers
    $('#refreshMap').click(function() {
        if (global) { global.removeMarkers() };
        loadMap(global.map);
    });

    $('.date').datepicker({ dateFormat: 'yy-mm-dd' });//initializes date inputs

    $('#SearchLabel').click(function() {
        unhighlight();
    });

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

    //declare map
    var myOptions = {
        zoom: 8,//dummy
        center: google.maps.LatLng(0,0),//dummy
        mapTypeId: google.maps.MapTypeId.SATELLITE
    };

    var map = new google.maps.Map(document.getElementById('Map'),myOptions);
    global.setMap(map);

    //jQuery format
    $($('.topnav').children()).each(function () {
        var text = $(this).text().trim();
        $('#'+text+'Label').click(function() {
            changeCanvas(text);
        });
    });

    $($('.middle').children()).each(function () {
        $(this).width($('#sidebar').width()/2);
    });

    $('.canvas').width($('#wrapper').width()-$('#sidebar').outerWidth(true));
    $('.captionContent').width($('.captionDiv').width()-$('.captionLetter').outerWidth(true)-$('.captionPic').outerWidth(true));

    $(window).resize(function() {
        $('.canvas').width($('#wrapper').width()-$('#sidebar').outerWidth(true)-global.horizontalMargin*2);
        $('.captionContent').width($('.captionDiv').width()-$('.captionLetter').outerWidth(true)-$('.captionPic').outerWidth(true)-5);
    });

    //start her up
    populateForm();
    loadMap(map);
});
//IE REDIRECT
if (navigator.appName=='Microsoft Internet Explorer' && window.location=='index.html') {
    window.location='PinTweets_ie.html'; //URL to redirect to
}