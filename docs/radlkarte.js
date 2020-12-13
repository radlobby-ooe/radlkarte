"use strict";

var rkGlobal = {}; // global variable for radlkarte properties / data storage
rkGlobal.leafletMap = undefined; // the main leaflet map
rkGlobal.hash = undefined; // leaflet-hash object, contains the currently active region
rkGlobal.leafletLayersControl = undefined; // leaflet layer-control
rkGlobal.geocodingControl = undefined;
rkGlobal.segments = {}; // object holding all linestring and decorator layers (the key represents the properties)
rkGlobal.markerLayerLowZoom = L.layerGroup(); // layer group holding all icons to be viewed at lower zoom levels
rkGlobal.markerLayerHighZoom = L.layerGroup(); // layer group holding all icons to be viewed at higher zoom levels
rkGlobal.priorityStrings = ["Überregional", "Regional", "Lokal"]; // names of all different levels of priorities (ordered descending by priority)
rkGlobal.stressStrings = ["Ruhig", "Durchschnittlich", "Stressig"];
rkGlobal.debug = true; // debug output will be logged if set to true
rkGlobal.fullWidthThreshold = 768;

// style: stress = color, priority = line width
rkGlobal.styleFunction = updateStyles;
rkGlobal.tileLayerOpacity = 1;
rkGlobal.priorityFullVisibleFromZoom = [0, 14, 15];
rkGlobal.priorityReducedVisibilityFromZoom = [0, 12, 14];
rkGlobal.onewayIconThreshold = 12;
rkGlobal.iconZoomThresholds = [12, 14];
rkGlobal.lineWidthFactor = [1.4, 0.5, 0.5];
rkGlobal.arrowWidthFactor = [2, 3, 3];
rkGlobal.opacity = 0.62;
rkGlobal.colors = ['#004B67', '#51A4B6', '#FF6600']; // dark blue - light blue - orange

rkGlobal.autoSwitchDistanceMeters = 55000;
rkGlobal.defaultRegion = 'linz';
rkGlobal.defaultZoom = 14;
rkGlobal.configurations = {
	'linz' : {
		centerLatLng: L.latLng(48.30, 14.285),
		geocodingBounds: '13.999,48.171,14.644,48.472',
		geoJsonFile: 'data/radlkarte-linz.geojson',
		geoJsonProblemstellenFile: 'data/problemstellen-linz.geojson?12'
	}
};

function debug(obj) {
	if(rkGlobal.debug) {
		console.log(obj);
	}
}

var firstLoad = true;
/**
 * set the currently active region.
 * called from rkGlobal.hash (when region is changed e.g. via hyperlink or by changing the URL)
 */
function updateRadlkarteRegion(region) {
	var configuration = rkGlobal.configurations[region];
	if(configuration === undefined) {
		console.warn('ignoring unknown region ' + region);
		return;
	}

	removeAllSegmentsAndMarkers();
	if (!firstLoad) {
		loadGeoJson(configuration.geoJsonFile);
		firstLoad = false;
	}
	rkGlobal.currentGeoJsonFile = configuration.geoJsonFile;

	setProblemstellenGeojson(configuration.geoJsonProblemstellenFile);

	rkGlobal.geocodingControl.options.geocoder.options.geocodingQueryParams.bounds = configuration.geocodingBounds;

	// virtual page hit in google analytics
	//ga('set', 'page', '/' + region);
	//ga('send', 'pageview');
}

function removeAllSegmentsAndMarkers() {
	for(const key of Object.keys(rkGlobal.segments)) {
		rkGlobal.leafletMap.removeLayer(rkGlobal.segments[key].lines);
		if(rkGlobal.leafletMap.hasLayer(rkGlobal.segments[key].steepLines)) {
			rkGlobal.leafletMap.removeLayer(rkGlobal.segments[key].steepLines);
		}
		rkGlobal.leafletMap.removeLayer(rkGlobal.segments[key].decorators);
	}
	rkGlobal.segments = {};

	rkGlobal.leafletMap.removeLayer(rkGlobal.markerLayerLowZoom);
	rkGlobal.markerLayerLowZoom.clearLayers();
	rkGlobal.leafletMap.removeLayer(rkGlobal.markerLayerHighZoom);
	rkGlobal.markerLayerHighZoom.clearLayers();
}

function loadGeoJson(file) {
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

		// collect geojson linestring features (and marker points)
		var ignoreCount = 0;
		var goodCount = 0;
		var poiCount = 0;
		var categorizedLinestrings = {};
		for (var i=0; i<data.features.length; i++) {
			var geojson = data.features[i];
			if(geojson.type != 'Feature' || geojson.properties == undefined || geojson.geometry == undefined || geojson.geometry.type != 'LineString' || geojson.geometry.coordinates.length < 2) {
				if(geojson.geometry.type == 'Point') {
					var markerLayers = createMarkerLayersIncludingPopup(geojson);
					if(markerLayers != null) {
						rkGlobal.markerLayerLowZoom.addLayer(markerLayers.lowZoom);
						rkGlobal.markerLayerHighZoom.addLayer(markerLayers.highZoom);
						++poiCount;
					} else {
						++ignoreCount;
					}
				} else {
					console.warn("ignoring invalid object (not a proper linestring feature): " + JSON.stringify(geojson));
					++ignoreCount;
				}
				continue;
			}

			var priority = parseInt(geojson.properties.priority, 10);
			var stress = parseInt(geojson.properties.stress, 10);
			if(isNaN(priority) || isNaN(stress)) {
				console.warn("ignoring invalid object (priority / stress not set): " + JSON.stringify(geojson));
				++ignoreCount;
				continue;
			}

			// collect linestrings by category
			addSegmentToObject(categorizedLinestrings, geojson);

			++goodCount;
		}
		debug("processed " + goodCount + " valid LineString features, " + poiCount + " Point features, and " + ignoreCount + " ignored features.");

		// merge geojson linestring features
		// with the same properties into a single multilinestring
		// and then put them in a leaflet layer
		for(const key of Object.keys(categorizedLinestrings)) {
			var multilinestringFeatures = turf.combine(turf.featureCollection(categorizedLinestrings[key]));
			var properties = JSON.parse(key);
			multilinestringFeatures.properties = properties;

			var decoratorCoordinates = [];
			for(const linestring of categorizedLinestrings[key]) {
				decoratorCoordinates.push(turf.flip(linestring).geometry.coordinates);
			}

			// separate panes to allow setting zIndex, which is not possible on
			// the geojson layers themselves
			// see https://stackoverflow.com/q/39767499/1648538
			rkGlobal.leafletMap.createPane(key);
			rkGlobal.leafletMap.getPane(key).style.zIndex = getSegmentZIndex(properties);
			rkGlobal.segments[key] = {
				'lines': L.geoJSON(multilinestringFeatures, {pane: key}),
				'steepLines': properties.steep === 'yes' ? L.geoJSON(multilinestringFeatures, {pane: key}) : undefined,
				'decorators': L.polylineDecorator(decoratorCoordinates)
			};
		}

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

/**
 * Get a zIndex based on priority and stress
 * where low-stress high-priority is on the top
 */
function getSegmentZIndex(properties) {
	// 400 is the default zIndex for overlayPanes, stay slightly below this level
	var index = 350;
	index += 10 * (rkGlobal.priorityStrings.length - properties.priority);
	index += 1 * (rkGlobal.stressStrings.length - properties.stress);
	return index;
}

function addSegmentToObject(object, geojsonLinestring) {
	var key = getSegmentKey(geojsonLinestring);
	var keyString = JSON.stringify(key);
	if(object[keyString] === undefined) {
		object[keyString] = [];
	}
	object[keyString].push(geojsonLinestring);
}

/*
 * Get a JSON object as key for a segment linestring.
 * This object explicitly contains all values to be used in styling
 */
function getSegmentKey(geojsonLinestring) {
	var properties = geojsonLinestring.properties;
	return {
		"priority": properties.priority,
		"stress": properties.stress,
		"oneway": properties.oneway === undefined ? 'no' : properties.oneway,
		"unpaved": properties.unpaved === undefined ? 'no' : properties.unpaved,
		"steep": properties.steep === undefined ? 'no' : properties.steep
	};
}

/**
 * Updates the styles of all layers. Takes current zoom level into account.
 * Special styles for unpaved, steep, oneway arrows are matched, take care in future adapations
 */
function updateStyles() {
	var zoom = rkGlobal.leafletMap.getZoom();
	for(const key of Object.keys(rkGlobal.segments)) {
		var properties = JSON.parse(key);
		var showFull = zoom >= rkGlobal.priorityFullVisibleFromZoom[properties.priority];
		var showMinimal = zoom < rkGlobal.priorityFullVisibleFromZoom[properties.priority] && zoom >= rkGlobal.priorityReducedVisibilityFromZoom[properties.priority];

		var lineStyle;
		if(showFull) {
			lineStyle = getLineStyle(zoom, properties);
		} else if(showMinimal) {
			lineStyle = getLineStyleMinimal(properties);
		}

		var lines = rkGlobal.segments[key].lines;
		if(showFull || showMinimal) {
			lines.setStyle(lineStyle);
			rkGlobal.leafletMap.addLayer(lines);
		} else {
			rkGlobal.leafletMap.removeLayer(lines);
		}

		// steep lines are drawn twice, once regular,
		// a second time as bristles (that's what this copy is for)
		var steepLines = rkGlobal.segments[key].steepLines;
		if(steepLines !== undefined) {
			if(showFull || showMinimal) {
				var steepLineStyle;
				if(showFull) {
					steepLineStyle = getSteepLineStyle(zoom, properties);
				} else {
					steepLineStyle = getSteepLineStyleMinimal(properties);
				}
				steepLines.setStyle(steepLineStyle);
				rkGlobal.leafletMap.addLayer(steepLines);
			} else {
				rkGlobal.leafletMap.removeLayer(steepLines);
			}
		}

		var decorators = rkGlobal.segments[key].decorators;
		if((showFull || showMinimal) && zoom >= rkGlobal.onewayIconThreshold && properties.oneway === 'yes') {
			decorators.setPatterns(getOnewayArrowPatterns(zoom, properties, lineStyle.weight));
			rkGlobal.leafletMap.addLayer(decorators);
		} else {
			rkGlobal.leafletMap.removeLayer(decorators);
		}
	}

	if(zoom >= rkGlobal.iconZoomThresholds[1]) {
		rkGlobal.leafletMap.removeLayer(rkGlobal.markerLayerLowZoom);
		rkGlobal.leafletMap.addLayer(rkGlobal.markerLayerHighZoom);
	} else if(zoom >= rkGlobal.iconZoomThresholds[0]) {
		rkGlobal.leafletMap.removeLayer(rkGlobal.markerLayerHighZoom);
		rkGlobal.leafletMap.addLayer(rkGlobal.markerLayerLowZoom);
	} else {
		rkGlobal.leafletMap.removeLayer(rkGlobal.markerLayerHighZoom);
		rkGlobal.leafletMap.removeLayer(rkGlobal.markerLayerLowZoom);
	}
}

function getLineStyle(zoom, properties) {
	var lineWeight = getLineWeight(zoom, properties.priority);
	return _getLineStyle(lineWeight, properties);
}

function getLineStyleMinimal(properties) {
	var lineWeight = 1;
	return _getLineStyle(lineWeight, properties);
}

function _getLineStyle(lineWeight, properties) {
	var style = {
		color: rkGlobal.colors[properties.stress],
		weight: lineWeight,
		opacity: rkGlobal.opacity
	};
	if(properties.unpaved === 'yes') {
		style.dashArray = getUnpavedDashStyle(Math.max(2, lineWeight));
	}
	return style;
}

function getSteepLineStyle(zoom, properties) {
	var lineWeight = getLineWeight(zoom, properties.priority);
	return _getSteepLineStyle(lineWeight, properties);
}

function getSteepLineStyleMinimal(properties) {
	var lineWeight = 1;
	return _getSteepLineStyle(lineWeight, properties);
}

function _getSteepLineStyle(lineWeight, properties) {
	var steepBristleLength = 2;
	return {
		color: rkGlobal.colors[properties.stress],
		weight: lineWeight * 2,
		opacity: rkGlobal.opacity,
		lineCap: 'butt',
		dashArray: getSteepDashStyle(Math.max(2, lineWeight), steepBristleLength),
		dashOffset: Math.max(2, lineWeight) * -0.5 + steepBristleLength / 2
	};
}

/**
 * weight aka width of a line
 */
function getLineWeight(zoom, priority) {
	var lineWeight = zoom - 10;
	lineWeight = (lineWeight <= 0 ? 1 : lineWeight) * 1.4;
	lineWeight *= rkGlobal.lineWidthFactor[priority];
	return lineWeight;
}

function getUnpavedDashStyle(lineWeight) {
	return lineWeight + " " + lineWeight * 1.5;
}

function getSteepDashStyle(lineWeight, steepBristleLength) {
	return steepBristleLength + " " + (lineWeight * 2.5 - steepBristleLength);
}

/**
 * @return an array of patterns as expected by L.PolylineDecorator.setPatterns
 */
function getOnewayArrowPatterns(zoom, properties, lineWeight) {
	var arrowWidth = Math.max(5, lineWeight * rkGlobal.arrowWidthFactor[properties.priority]);
	return [{
		offset: arrowWidth-2,
		repeat: Math.max(2, lineWeight) * 5,
		symbol: L.Symbol.arrowHead({
			pixelSize: arrowWidth,
			headAngle: 90,
			pathOptions: {
				color: rkGlobal.colors[properties.stress],
				fillOpacity: rkGlobal.opacity,
				weight: 0
			}
		})
	}];
}

function loadLeaflet() {
	rkGlobal.leafletMap = L.map('map', { 'zoomControl' : false } );

	// avoid troubles with min/maxZoom from our layer group, see https://github.com/Leaflet/Leaflet/issues/6557
	var minMaxZoomLayer = L.gridLayer({
		minZoom: 0,
		maxZoom: 19
	});
	var cartodbPositronLowZoom = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: 'abcd',
		minZoom: 0,
		maxZoom: 15
	});
	var osmHiZoom = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		minZoom: 16,
		maxZoom: 19,
		attribution: 'map data &amp; imagery &copy; <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors'
	});
	var mixed = L.layerGroup([minMaxZoomLayer, cartodbPositronLowZoom, osmHiZoom]);

	var basemapAtOrthofoto = L.tileLayer('https://maps{s}.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.{format}', {
		maxZoom: 18, // up to 20 is possible
		attribution: 'Datenquelle: <a href="https://www.basemap.at">basemap.at</a>',
		subdomains: ["", "1", "2", "3", "4"],
		format: 'jpeg',
		bounds: [[46.35877, 8.782379], [49.037872, 17.189532]]
	});
	var ocm = L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=ab5e4b2d24854fefb139c538ef5187a8', {
		minZoom: 0,
		maxZoom: 18,
		attribution: 'map data &copy; <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors, imagery &copy; <a href="https://www.thunderforest.com" target="_blank">Thunderforest</a>'
	});
	var empty = L.tileLayer('', {attribution: ''});

	/*var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		minZoom: 0,
		maxZoom: 18,
		attribution: 'map data &amp; imagery &copy; <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors'
	});*/

	var baseMaps = {
		"Straßenkarte": mixed,
		"Luftbild": basemapAtOrthofoto,
		"OpenCycleMap": ocm,
		//"OpenStreetMap": osm,
		"Weiß": empty,
	};
	var overlayMaps = {};

	mixed.addTo(rkGlobal.leafletMap);
	rkGlobal.leafletLayersControl = L.control.layers(baseMaps, overlayMaps, { 'position' : 'topright', 'collapsed' : true } ).addTo(rkGlobal.leafletMap);

	rkGlobal.geocodingControl = L.Control.geocoder({
		position: 'topright',
		placeholder: 'Adresssuche',
		errorMessage: 'Leider nicht gefunden',
		geocoder: L.Control.Geocoder.opencage("657bf10308f144c7a9cbb7675c9b0d36", {
			geocodingQueryParams: {
				countrycode: 'at',
				language: 'de'
				// bounds are set later via updateRadlkarteRegion (min lon, min lat, max lon, max lat)
			}
		}),
		defaultMarkGeocode: false
	}).on('markgeocode', function(e) {
		var result = e.geocode || e;
// 		var bbox = result.bbox;
// 		var poly = L.polygon([
// 			bbox.getSouthEast(),
// 			bbox.getNorthEast(),
// 			bbox.getNorthWest(),
// 			bbox.getSouthWest()
// 		]);
// 		rkGlobal.leafletMap.fitBounds(poly.getBounds(), {maxZoom: 17});
		debug(result);
		var resultCenter = L.latLng(result.center.lat, result.center.lng);
		rkGlobal.leafletMap.panTo(resultCenter);
		var resultText = result.name;
		resultText = resultText.replace(/, Österreich$/, "").replace(/, /g, "<br/>");

		var popup = L.popup({
			autoClose: false,
			closeOnClick: false,
			closeButton: true
		}).setLatLng(e.geocode.center).setContent(resultText).openOn(rkGlobal.leafletMap);
	}).addTo(rkGlobal.leafletMap);

	var locateControl = L.control.locate({
		position: 'topright',
		setView: 'untilPanOrZoom',
		flyTo: true,
		//markerStyle: { weight: 5 },
		locateOptions: {
			enableHighAccuracy: true,
			watch: true,
			maxZoom: 16
		},
		strings: {
			title: 'Verfolge Position'
		}
	}).addTo(rkGlobal.leafletMap);

	L.control.zoom({position: 'topright'}).addTo(rkGlobal.leafletMap);

	var sidebar = L.control.sidebar({
		container: 'sidebar',
		position: 'left'
	}).addTo(rkGlobal.leafletMap);
	rkGlobal.sidebar = sidebar;
	// open sidebar,if no permalink
	if (window.location.search.length===0) {
		// todo and if no hash
		rkGlobal.sidebar.open('psmain');
	}

	if(window.innerWidth < rkGlobal.fullWidthThreshold) {
		sidebar.close();
	}

	initializeIcons();
	initializePS();

	// initialize hash, this causes loading of the default region
	// and positioning of the map
	rkGlobal.hash = new L.Hash(rkGlobal.leafletMap);
}

function initializeIcons() {
	rkGlobal.icons = {};
	rkGlobal.icons.dismount = L.icon({
		iconUrl: 'css/dismount.svg',
		iconSize: [33, 29],
		iconAnchor: [16.5, 14.5],
		popupAnchor: [0, -14.5]
	});
	rkGlobal.icons.warning = L.icon({
		iconUrl: 'css/warning.svg',
		iconSize: [33, 29],
		iconAnchor: [16.5, 14.5],
		popupAnchor: [0, -14.5]
	});
	rkGlobal.icons.noCargo = L.icon({
		iconUrl: 'css/nocargo.svg',
		iconSize: [29, 29],
		iconAnchor: [14.5, 14.5],
		popupAnchor: [0, -14.5]
	});
	rkGlobal.icons.noCargoAndDismount = L.icon({
		iconUrl: 'css/nocargo+dismount.svg',
		iconSize: [57.7, 29],
		iconAnchor: [28.85, 14.5],
		popupAnchor: [0, -14.5]
	});
	rkGlobal.icons.redDot = L.icon({
		iconUrl: 'css/reddot.svg',
		iconSize: [10, 10],
		iconAnchor: [5, 5],
		popupAnchor: [0, -5]
	});
	rkGlobal.icons.swimming = L.icon({
		iconUrl: 'css/swimming.svg',
		iconSize: [29, 29],
		iconAnchor: [14.5, 14.5],
		popupAnchor: [0, -14.5]
	});
	rkGlobal.icons.swimmingSmall = L.icon({
		iconUrl: 'css/swimming_small.svg',
		iconSize: [10, 10],
		iconAnchor: [5, 5],
		popupAnchor: [0, -5]
	});
}

function createMarkerLayersIncludingPopup(geojsonPoint) {
	var icons = getIcons(geojsonPoint.properties);
	if(icons == null) {
		return undefined;
	}

	var description = getDescriptionText(geojsonPoint.properties);
	var markers = {
		lowZoom: L.marker(L.geoJSON(geojsonPoint).getLayers()[0].getLatLng(), {
			icon: icons.small,
			alt: description
		}),
		highZoom: L.marker(L.geoJSON(geojsonPoint).getLayers()[0].getLatLng(), {
			icon: icons.large,
			alt: description
		})
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

/**
 * @param properties GeoJSON properties of a point
 * @return a small and a large icon or undefined if no icons should be used
 */
function getIcons(properties) {
	if(properties.leisure === 'swimming_pool') {
		return {
			small: rkGlobal.icons.swimmingSmall,
			large: rkGlobal.icons.swimming
		};
	}

	var dismount = properties.dismount === 'yes';
	var nocargo = properties.nocargo === 'yes';
	var warning = properties.warning === 'yes';

	var problemIcon;
	if(dismount && nocargo) {
		problemIcon = rkGlobal.icons.noCargoAndDismount;
	} else if(dismount) {
		problemIcon = rkGlobal.icons.dismount;
	} else if(nocargo) {
		problemIcon = rkGlobal.icons.noCargo;
	} else if(warning) {
		problemIcon = rkGlobal.icons.warning;
	}

	if(problemIcon === undefined) {
		return undefined;
	} else {
		return {
			small: rkGlobal.icons.redDot,
			large: problemIcon
		};
	}
}

/**
 * @param properties GeoJSON properties of a point
 * @return a description string
 */
function getDescriptionText(properties) {
	var dismount = properties.dismount === 'yes';
	var nocargo = properties.nocargo === 'yes';
	var warning = properties.warning === 'yes';

	var descriptionParts = [];

	if(dismount && nocargo) {
		descriptionParts.push('Schiebestelle / untauglich für Spezialräder');
	} else if(dismount) {
		descriptionParts.push('Schiebestelle');
	} else if(nocargo) {
		descriptionParts.push('Untauglich für Spezialräder');
	} else if(warning) {
		descriptionParts.push('Achtung');
	}

	if(properties.description !== undefined) {
		descriptionParts.push(properties.description);
	}

	return '<span class="popup">' + descriptionParts.join(':<br>') + '</span>';
}
