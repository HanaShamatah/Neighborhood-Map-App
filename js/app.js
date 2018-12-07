var map;
var markers = [];

// initiate Google map //
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
    center: locations[0].location, // set the first marker coordination as a center
    zoom: 8,
    styles: styles, // link the determined style to the map
    mapTypeControl: true  // to allow us change the map type to road, terrain, satellite etc. disabling it to false
    });
    ko.applyBindings(new viewModel());
}

// ViewModel //
var viewModel = function() {
    var self= this;
    var contentString = '';

    this.markerslist = ko.observableArray([]);
    this.filter = ko.observable("");
    this.bounds = new google.maps.LatLngBounds();
    this.infoWindow = new google.maps.InfoWindow();

    // make a marker for each location
    locations.forEach(function(item) {
        var marker = makeMarker(item, self.bounds, markers);
        // open info window by clicking on marker icon
        marker.addListener('click', function() {
            INFOWindow(this, self.infoWindow, contentString);
        });
    });

    // open infowindow when clicking on list markers
    this.listselect = function() {
        INFOWindow(this, self.infoWindow, contentString);
    };
    
    // filter the appeared markers and list items
    this.filteredItems = ko.computed(function() {
        var filter = this.filter().toLowerCase();
        // all markers appear without filtering
        if (!filter) {
            console.log("number of markers: " + markers.length);
            self.markerslist([]);
            markers.forEach(function(mar) {
                mar.setVisible(true);
                self.markerslist.push(mar);
            });
            map.fitBounds(this.bounds);
        }
        // control the appeared markers and location names by filter input
        else {
            self.markerslist([]);
            markers.forEach(function(mar) {
                if (mar.title.toLowerCase().indexOf(filter) ==! -1) {
                    console.log(mar.title);
                    self.markerslist.push(mar);
                }
                else {
                    mar.setVisible(false);
                }
            });
        }
    }, this);
};


// Markers creation function for an inserted location item
function makeMarker(item,bounds, markers) {
    var position = item.location;
    var title = item.title;
    var marker = new google.maps.Marker({
        position: position,
        title: title,
        animation: google.maps.Animation.DROP,
        draggable: true,
        map: map
    });
    
    bounds.extend(marker.position);

    marker.setVisible(false); // set the visibility to false to modify it as a function of filter input

    markers.push(marker);

    return marker;
}


// infowindow function for specifying info for each marker
function INFOWindow(marker, infowindow, contentString) {
    if (infowindow.marker != marker) {
        infowindow.marker = marker;
        infowindow.setContent('');
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
            marker.setAnimation(null);
        });

        // Use Wikipedia API as a third party info of markers
        var wikiUrl = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' +
            marker.title + '&format=json&callback=wikiCallback';
        // call wikiArticle function to request a wiki links for the marker
        wikiArticle()

        function wikiArticle() {
            // request wiki article using ajax with done and fail situations
            var wikirequest = $.ajax({
                cach: false,
                url: wikiUrl,
                dataType: "jsonp"
            })
            // when request is succeed
            wikirequest.done(function(response) {
                var articleName = response[1][0];
                var articleLink = response[3][0];
                console.log(articleName);
                console.log(articleLink);
                // update contentString to disply in marker infowindow
                if (articleName) {
                    contentString = contentString + '<div id="WIKI">Wikipedia Article: <a id="wiki" href="'
                    + articleLink + '" data-bind="wiki">' + articleName + '</a></div>';
                }
                else {
                    contentString = contentString + '<div>No related Wikipedia articles</div>'
                }
                // Call the streetview service to get the closest streetview image within 50 meters of the markers position
                streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
            });
            // when request is failed update contentString to notify the user about the error
            wikirequest.fail(function(jqXHR, textStatus) {
                contentString = contentString + '<div>failed to get wikiprdia resources</div>';
                streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
            });
        }

        // Add panorama
        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;

        // In case the status is OK, which means the pano was found, compute the position of the streetview image, then calculate the heading, then get a panorama from that and set the options
        function getStreetView(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                    nearStreetViewLocation, marker.position);
                // Add location name, panorama to contentString
                contentString = '<div id="info_title">' + marker.title
                + '</div><div id="pano" data-bind="pano"></div>' + contentString;
                infowindow.setContent(contentString)
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 30
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                    this.pano, panoramaOptions);
            }
            else {
                contentString = '<div id="info_title">' + marker.title + '</div>'
                + '<div>No Street View Found</div>' + contentString;
                infowindow.setContent(contentString)
            }
        }
        marker.setAnimation(google.maps.Animation.BOUNCE);
        infowindow.open(map, marker);
    }
    // in case of click on the same marker, close infowindow an stop animation
    else {
        infowindow.marker = null;
        infowindow.close();
        marker.setAnimation(null);
    }
    setTimeout(marker.setAnimation(null), 50); // set here to stop animation
}


// Google map error
googleError = function googleError() {
    alert('Google Maps did not load. Please refresh the page and try again!');
};
