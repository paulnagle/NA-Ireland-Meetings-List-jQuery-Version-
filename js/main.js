// Dont forget to comment all of this
var map = null;
var myLatLng = new L.latLng(53.341318, -6.270205); // Irish Service Office
var circle = null;
var currentLocationMarker = null;
var searchRadius = 25;  // default to 25km
var markerClusterer = null; 


// Extend the Default marker class
// Each one of these markers on the map represents a meeting
//var NaIcon = L.Icon.Default.extend({
//	options: {
//		iconUrl: 'img/marker-icon-red.png' // photoshop this image to add an approximation of the NA symbol
//	}
//});
//var naIcon = new NaIcon();
var naIcon = L.MakiMarkers.icon({
	icon: "star",
	color: "#f00",
	size: "l"
});

// https://www.mapbox.com/maki/
// There should only be one of these markers on the map, representing where the meeting search
// is centered.
var markerIcon = L.MakiMarkers.icon({
	icon: "marker",
	color: "#0a0",
	size: "m"
});

// This function cleans up and deletes any old Maps
function deleteMap() {
	console.log("****Running deleteMap()***");
	if (circle) {
		delete circle;
	}

	if (currentLocationMarker) {
		delete currentLocationMarker;
	}
	
	// Remove the markerClusterer layer from the map
	if (markerClusterer) {
		map.removeLayer(markerClusterer);	
	}
	
	if (map) {
	console.log("****Running map.remove()***");
		delete map;	
		map.remove();
	}

	// now delete the old Map container
	var oldMapContainer = document.getElementById("map_canvas");
	var mapContainerParent = oldMapContainer.parentNode;
	mapContainerParent.removeChild(oldMapContainer);

	// recreate this <div id="map_canvas" style="width: 100%"></div>
	var newMapContainer = document.createElement('div');
	newMapContainer.setAttribute("id", "map_canvas");
	newMapContainer.style.cssText = 'width: 100%';
	mapContainerParent.appendChild(newMapContainer);

	var headerHeight = document.getElementById('map-header').clientHeight;
	var footerHeight = document.getElementById('map-footer').clientHeight;
	var newHeight = window.innerHeight - (headerHeight + footerHeight) ;
	document.getElementById("map_canvas").style.height = newHeight + "px";	
	
	var $mapSwitch = $( "#map-switch" ),
        $listSwitch = $( "#list-switch" ),
        $map_div = $( "#map_canvas" ),
        $list_div = $( "#list_canvas" );
	$list_div.hide();
	$map_div.show();

    $mapSwitch.on( "click", function( e ){
        $map_div.show();
        $list_div.hide();
    });
    $listSwitch.on( "click", function( e ){
        $list_div.show();
        $map_div.hide();
    });
}

// This function creates a new map, adds the Circle, the current location marker and
// then runs a new search.
function newMap() {
	console.log("Running newMap()");
	
	var headerHeight = document.getElementById('map-header').clientHeight;
	var footerHeight = document.getElementById('map-footer').clientHeight;
	var newHeight = window.innerHeight - (headerHeight + footerHeight) ;
	document.getElementById("map_canvas").style.height = newHeight + "px";	

	console.log("*==Creating Map");
	map = L.map('map_canvas'); // Create new map 
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
	map.setView(myLatLng, 9);
}

function fillMap() {
	console.log("Running fillMap()");
	deleteMap();	// Delete all traces of any previous maps

	map = L.map('map_canvas'); // Create new map 
		
	map.on('load', function(e) {  // This is called when the map center and zoom are set
		console.log("****map load event****");

		circle = L.circle(myLatLng, searchRadius * 1000, {fillOpacity: 0.1});
		circle.addTo(map);
		var circleBounds = new L.LatLngBounds;
		circleBounds = circle.getBounds();
		map.fitBounds(circleBounds);  		
	
		currentLocationMarker = new L.marker(myLatLng, {draggable: true, icon: markerIcon}).addTo(map);
		currentLocationMarker.bindPopup("This is where you are searching from. Drag this marker to search in another location", {className: 'custom-popup'});
		currentLocationMarker.on('dragend', function(e){
			myLatLng = e.target.getLatLng();
			fillMap();
		}); 
		runSearch();
	});
		
	console.log("****Adding tile Layer to Map****");	
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
	}).addTo(map);

	console.log("****map.setView****" + myLatLng);		
	map.setView(myLatLng, 9);
}


$( document ).on( "pagecontainershow", function ( event, ui ) {
	console.log("*=pagecontainershow Event");
	var pageId = $('body').pagecontainer('getActivePage').prop('id');
	if (pageId == "search-map") {
		console.log("*==pageId = search-map");
		map.invalidateSize(false);
		fillMap();
	}
});

$(document).on("pagecreate","#settings", function() {
	$("#slider-s" ).on( 'change', function( event ) {
		searchRadius = $("#slider-s").val();
	});
	$( "#GPSButton" ).bind( "click", function(event, ui) {
		getCurrentGPSLocation();
	});
	$("#geoLocateBtn").bind("click", function(){
		findAddress($("#textinput-s").val());
	});	
});

$(document).on("pagecreate", "#search-map", function() {
	$(map).on('load', function () {
		console.log("Running map on load event()");
		fillMap();
	});	
});

// This function converts a number to a day of the week	
function dayOfWeekAsString(dayIndex) {
	return ["not a day?", "Sun", "Mon","Tue","Wed","Thu","Fri","Sat"][dayIndex];
}

// This function either starts the AJAX spinner on the map, or stops it.. depending on the flag passed
function spinMap(spinFlag) {	
	if (spinFlag == true ) {
		map.spin(true);
		isMapSpinning = true;
		if (currentLocationMarker) {
			currentLocationMarker.setOpacity(0);
		}
	} else {
		map.spin(false);
		isMapSpinning = false;
		if (currentLocationMarker) {
			currentLocationMarker.setOpacity(1);
		}
	}
}	

// This function uses the browser function to find our current GPS location. If the location
// is found OK, the newMap() function is called with the location.
function getCurrentGPSLocation() {
    console.log("****getCurrentGPSLocation()****");
	navigator.geolocation.getCurrentPosition(setLocation, noLocation);
	
	function setLocation(location) {
	    console.log("****GPS location found");
		myLatLng = L.latLng(location.coords.latitude, location.coords.longitude);
//		fillMap();
//		$.mobile.changePage('#dialog', {'role': 'dialog'});

	}
	
	function noLocation() {
	    console.log("****GPS location NOT found");	
	}
}

// This function reads the address in the locTextBox and does a geocode search for that location
// When the location is found, the function renderGeocode is called
function findAddress(geocodeLocation) {
		// Using my personal key here!
		var geoCodeURL = 'http://open.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluur25ubn0%2Crw%3Do5-9w751f&location=' 
		geoCodeURL += geocodeLocation;
		geoCodeURL +=', Ireland&callback=renderGeocode';
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = geoCodeURL;
		document.body.appendChild(script);
};

// This function is called from findAddress when the search for the location is complete.
// If the search was sucessful, the newMap() function is called with the new location
function renderGeocode(response) {
    var html = '';  
	var geoCodeResult = response.results[0].locations[0];	

	if (geoCodeResult) {
		var d = new Date(); 
		hours = d.getHours(); 
		hours = hours < 10 ? '0'+hours : hours;
		minutes = d.getMinutes();  
		minutes = minutes < 10 ? '0'+minutes : minutes;
		seconds = d.getSeconds(); 
		seconds = seconds < 10 ? '0'+seconds : seconds;
		console.log("Location updated at " + hours + ":" + minutes + ":" + seconds);
//		document.getElementById("geoLocationLegend").innerHTML = "Location updated at " + hours + ":" + minutes + ":" + seconds;	
		myLatLng = L.latLng(geoCodeResult.latLng.lat, geoCodeResult.latLng.lng);
		$.mobile.changePage('#dialog', {'role': 'dialog'});
	} else {
		console.log("Location not found");
	}
}

// This function generates the URL to query the BMLT based on the settings in the Settings Panel
function buildSearchURL () {
	console.log("****Running buildSearchURL()****");	
	search_url = "http://www.nasouth.ie/bmlt/main_server/client_interface/json/";
	search_url += "?switcher=GetSearchResults";
	search_url += "&geo_width_km=" + searchRadius;
	search_url += "&long_val=" + myLatLng.lng;
	search_url += "&lat_val=" + myLatLng.lat;
	search_url += "&sort_key=sort_results_by_distance";
	search_url += "&data_field_key=meeting_name,weekday_tinyint,start_time,location_text,location_street,location_info,distance_in_km,latitude,longitude";	
}

// This function runs the query to the BMLT and displays the results on the map
function runSearch() {
	console.log("****Running runSearch()****");		
	buildSearchURL();
		
	$.getJSON(search_url, function( data) {	
		if (markerClusterer) {
			map.removeLayer(markerClusterer);
		}
		$("#list-results").empty();
		markerClusterer = new L.markerClusterGroup({showCoverageOnHover: false, 
													removeOutsideVisibleBounds: false});	
		var sunCount =0, monCount =0, tueCount = 0, wedCount = 0, thuCount = 0, friCount = 0, satCount = 0;
		var sunExpandLi = "<ul style='padding: 0px !important'><div data-role='collapsible' data-autodividers='true' ><h4 id='sunHead'>Sunday</h4>";		
		var monExpandLi = "<ul style='padding: 0px !important'><div data-role='collapsible' data-autodividers='true' ><h4 id='monHead'>Monday</h4>";
		var tueExpandLi = "<ul style='padding: 0px !important'><div data-role='collapsible' data-autodividers='true' ><h4 id='tueHead'>Tuesday</h4>";
		var wedExpandLi = "<ul style='padding: 0px !important'><div data-role='collapsible' data-autodividers='true' ><h4 id='wedHead'>Wednesday</h4>";
		var thuExpandLi = "<ul style='padding: 0px !important'><div data-role='collapsible' data-autodividers='true' ><h4 id='thuHead'>Thursday</h4>";
		var friExpandLi = "<ul style='padding: 0px !important'><div data-role='collapsible' data-autodividers='true' ><h4 id='friHead'>Friday</h4>";
		var satExpandLi = "<ul style='padding: 0px !important'><div data-role='collapsible' data-autodividers='true' ><h4 id='satHead'>Saturday</h4>";
													
		$.each( data, function( key, val) {

			markerContent = "<li style='list-style-type: none !important'><h4>" + val.meeting_name + "</h4>";
			markerContent += "<p><i>" + dayOfWeekAsString(val.weekday_tinyint) 
			markerContent += "&nbsp;" + val.start_time.substring(0, 5) + "</i>&nbsp;&nbsp;";
			markerContent += val.location_text + "&nbsp;" + val.location_street + "<br>";
			markerContent += "<i>" + val.location_info + "</i></p>";
//			markerContent += "<div class='ui-li-count'><span>" + val.distance_in_km + " kms</span></div>";
			
			fromHere = "'" + myLatLng.lat + ',' + myLatLng.lng + "'";
			toHere   = "'" + val.latitude + ',' + val.longitude + "'";
			markerContent += '<a href="http://maps.google.com/maps?saddr=';
			markerContent += myLatLng.lat + ',' + myLatLng.lng;
			markerContent += '&daddr=' 
			markerContent += val.latitude + ',' + val.longitude;
			markerContent +='">Directions</a></li>';			

			switch (val.weekday_tinyint) {
				case "1": sunCount++; sunExpandLi = sunExpandLi + markerContent; break;
				case "2": monCount++; monExpandLi = monExpandLi + markerContent; break;
				case "3": tueCount++; tueExpandLi = tueExpandLi + markerContent; break;
				case "4": wedCount++; wedExpandLi = wedExpandLi + markerContent; break;
				case "5": thuCount++; thuExpandLi = thuExpandLi + markerContent; break;
				case "6": friCount++; friExpandLi = friExpandLi + markerContent; break;
				case "7": satCount++; satExpandLi = satExpandLi + markerContent; break;
			}
				
			// Add markers to the markerClusterer Layer
			var aMarker = L.marker([val.latitude, val.longitude], {icon: naIcon});
			aMarker.bindPopup(markerContent, {className: 'custom-popup'});
			markerClusterer.addLayer(aMarker);
		});

		sunExpandLi += "</ul>";
		monExpandLi += "</ul>";
		tueExpandLi += "</ul>";
		wedExpandLi += "</ul>";
		thuExpandLi += "</ul>";
		friExpandLi += "</ul>";
		satExpandLi += "</ul>";

		$("#list-results").append(sunExpandLi);
		$("#list-results").append(monExpandLi);
		$("#list-results").append(tueExpandLi);
		$("#list-results").append(wedExpandLi);
		$("#list-results").append(thuExpandLi);
		$("#list-results").append(friExpandLi);
		$("#list-results").append(satExpandLi);
		
		$("#sunHead").text("Sunday (" + sunCount + " meetings)");
		$("#monHead").text("Monday (" + monCount + " meetings)");
		$("#tueHead").text("Tuesday (" + tueCount + " meetings)");
		$("#wedHead").text("Wednesday (" + wedCount + " meetings)");
		$("#thuHead").text("Thursday (" + thuCount + " meetings)");
		$("#friHead").text("Friday (" + friCount + " meetings)");
		$("#satHead").text("Satday (" + satCount + " meetings)");
				
		map.addLayer(markerClusterer);	
		var div = $('#list-results');
		div.enhanceWithin();
	});
}

$( document ).ready(function() {
    console.log( "ready!" );
	newMap();	
	getCurrentGPSLocation();
});
