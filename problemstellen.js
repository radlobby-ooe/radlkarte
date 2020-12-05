"use strict";

function createProblemstellenMarkerLayersIncludingPopup(geojsonPoint) {
    console.log(geojsonPoint);
	// var icons = getIcons(geojsonPoint.properties);
	// if(icons == null) {
	// 	return undefined;
	// }

	const icons = {
		danger: 'achtung.svg',
		slow: 'snail.svg'
	};
	const iconUrl = icons[geojsonPoint.properties.type];

	var description = geojsonPoint.properties && geojsonPoint.properties.description;
	const marker = L.marker(L.geoJSON(geojsonPoint).getLayers()[0].getLatLng(), {
		icon: L.icon({
			iconUrl: iconUrl,
			iconSize: [31, 26],
			iconAnchor: [31, 14],
		}),
		alt: description,
	});

	const markers = {
		lowZoom: marker,
		highZoom: marker,
	};

	markers.lowZoom.bindPopup(description, {closeButton: false});
	markers.lowZoom.on('mouseover', function() { markers.lowZoom.openPopup(); });
	markers.lowZoom.on('mouseout', function() { markers.lowZoom.closePopup(); });

	markers.highZoom.bindPopup(description, {closeButton: false});
	markers.highZoom.on('mouseover', function() { markers.highZoom.openPopup(); });
	markers.highZoom.on('mouseout', function() { markers.highZoom.closePopup(); });

//	 var key, marker;
//	 for (key in markers) {
//		 marker = markers[key];
//		 marker.bindPopup(description, {closeButton: false});  //, offset: L.point(0, -10)});
//		 marker.on('mouseover', function() { marker.openPopup(); });
//		 marker.on('mouseout', function() { marker.closePopup(); }); // FIXME why is mouseover/out not working for lowZoom?
//		 break;
//	 }

	return markers;
}

function loadProblemstellenGeojson() {

    var file = 'data/problemstellen-linz.geojson';
	// get rid of "XML Parsing Error: not well-formed" during $.getJSON
	$.ajaxSetup({
		beforeSend: function (xhr) {
			if (xhr.overrideMimeType) {
				xhr.overrideMimeType("application/json");
			}
		}
	});
	$.getJSON(file, function(data) {
		if(data.type != "FeatureCollection") {
			console.error("expected a GeoJSON FeatureCollection. no radlkarte network can be displayed.");
			return;
        }
        
        console.log('problemstellen length ' + data.features.length);

		for (var i=0; i<data.features.length; i++) {
			var geojson = data.features[i];
			if(geojson.type != 'Feature' || geojson.properties == undefined || geojson.geometry == undefined || geojson.geometry.type != 'LineString' || geojson.geometry.coordinates.length < 2) {
				if(geojson.geometry.type == 'Point') {
                    var markerLayers = createProblemstellenMarkerLayersIncludingPopup(geojson);
                    console.log(markerLayers);
					if(markerLayers != null) {
						rkGlobal.markerLayerLowZoom.addLayer(markerLayers.lowZoom);
						rkGlobal.markerLayerHighZoom.addLayer(markerLayers.highZoom);
						//++poiCount;
					} else {
						//++ignoreCount;
					}
				} else {
					console.warn("ignoring invalid object (not a proper linestring feature): " + JSON.stringify(geojson));
					//++ignoreCount;
				}
				continue;
			}

			// var priority = parseInt(geojson.properties.priority, 10);
			// var stress = parseInt(geojson.properties.stress, 10);
			// if(isNaN(priority) || isNaN(stress)) {
			// 	console.warn("ignoring invalid object (priority / stress not set): " + JSON.stringify(geojson));
			// 	++ignoreCount;
			// 	continue;
			// }

			// // collect linestrings by category
			// addSegmentToObject(categorizedLinestrings, geojson);

			// ++goodCount;
		}
		// debug("processed " + goodCount + " valid LineString features, " + poiCount + " Point features, and " + ignoreCount + " ignored features.");

		// merge geojson linestring features
		// with the same properties into a single multilinestring
		// and then put them in a leaflet layer
		// for(const key of Object.keys(categorizedLinestrings)) {
		// 	var multilinestringFeatures = turf.combine(turf.featureCollection(categorizedLinestrings[key]));
		// 	var properties = JSON.parse(key);
		// 	multilinestringFeatures.properties = properties;

		// 	var decoratorCoordinates = [];
		// 	for(const linestring of categorizedLinestrings[key]) {
		// 		decoratorCoordinates.push(turf.flip(linestring).geometry.coordinates);
		// 	}

		// 	// separate panes to allow setting zIndex, which is not possible on
		// 	// the geojson layers themselves
		// 	// see https://stackoverflow.com/q/39767499/1648538
		// 	rkGlobal.leafletMap.createPane(key);
		// 	rkGlobal.leafletMap.getPane(key).style.zIndex = getSegmentZIndex(properties);
		// 	rkGlobal.segments[key] = {
		// 		'lines': L.geoJSON(multilinestringFeatures, {pane: key}),
		// 		'steepLines': properties.steep === 'yes' ? L.geoJSON(multilinestringFeatures, {pane: key}) : undefined,
		// 		'decorators': L.polylineDecorator(decoratorCoordinates)
		// 	};
		// }

		// adds layers (if the zoom levels requires it)
		rkGlobal.styleFunction();

		rkGlobal.leafletMap.on('zoomend', function(ev) {
			//debug("zoom level changed to " + rkGlobal.leafletMap.getZoom() + ".. enqueueing style change");
			$("#map").queue(function() {
				rkGlobal.styleFunction();
				$(this).dequeue();
			});
		});
	});
}