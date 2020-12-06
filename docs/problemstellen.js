"use strict";

var problemstellenGroup = null;

const lueckeLineStyleDefault = {
    color: '#990000',
    opacity: '1',
    weight: 4
};

const lueckeLineStyleHighlight = {
    color: '#ee0000',
    opacity: '1',
    weight: 6
};

var suppressMouseOverHighlight = false;

function highlightLine(key) {
    console.log("Highlighting line " + key);
    problemstellenGroup.eachLayer(function (layer) {
        if (layer.key === key) {
            layer.setStyle(lueckeLineStyleHighlight);
        }
    });
}

function unhighlightLine(key) {
    console.log("Unhighlighting line " + key);
    problemstellenGroup.eachLayer(function (layer) {
        if (layer.key === key) {
            layer.setStyle(lueckeLineStyleDefault);
        }
    });
}

function removeProblemstellenSegments() {
    console.log("Removing Layer " + problemstellenGroup);
    if (problemstellenGroup != null) {
        problemstellenGroup.clearLayers();

    }
    rkGlobal.problemstellenSegments.length = 0;
}

function updateProblemstellenStyles() {
    rkGlobal.leafletMap.createPane('problemstellen');
    if (problemstellenGroup == null) {
        problemstellenGroup = L.featureGroup().addTo(rkGlobal.leafletMap);
    }
    for (let i = 0; i < rkGlobal.problemstellenSegments.length; i++) {
        let line = L.geoJson(rkGlobal.problemstellenSegments[i], {pane: "problemstellen"});
        line.key = rkGlobal.problemstellenSegments[i].properties.key;
        line.setStyle(lueckeLineStyleDefault);
        line.addTo(problemstellenGroup);
        line.on('mouseover', function (e) {
            if (!suppressMouseOverHighlight) {
                var layer = e.target;
                layer.setStyle(lueckeLineStyleHighlight);
            }
        });
        line.on('mouseout', function (e) {
            if (!suppressMouseOverHighlight) {
                var layer = e.target;
                layer.setStyle(lueckeLineStyleDefault);
            }
        });
        line.on('click', function (e) {
            console.log("Open popup!");
        });

        // TODO align with other popup
		const icons = {
			danger: 'achtung.svg',
			slow: 'snail.svg',
			luecke: 'css/luecke.png'
		};
		const iconUrl = icons[rkGlobal.problemstellenSegments[i].properties.type];

		const texts = {
			luecke: 'Lücke'
		};
		const text = texts[rkGlobal.problemstellenSegments[i].properties.type];

		let von = rkGlobal.problemstellenSegments[i].properties.LueckeVon;
		let bis = rkGlobal.problemstellenSegments[i].properties.LueckeBis;
        let richtung = rkGlobal.problemstellenSegments[i].properties.LueckeFahrtrichtung;
        let abk = rkGlobal.problemstellenSegments[i].properties.LueckeAbk;
		var description = "Zwischen " + von + " und "+ bis+ "<br/>Fahrtrichtung: "+richtung+"<br/>Geforderte Radinfrastruktur: "+abk;

		line.bindPopup("<b>" + text + ": </b><br/>" + description + "<br/><img src='css/luecke.png' style='max-width: 200px;max-height: 200px;'/>",
			{
				autoClose: false,
				closeOnClick: true,
				closeButton: true,
				closeOnEscapeKey: true
			}).on('popupopen', function (popup) {
			highlightLine(popup.sourceTarget.feature.properties.key);
			suppressMouseOverHighlight = true;
			console.log("popup opened !", popup);
		}).on('popupclose', function (popup) {
			unhighlightLine(popup.sourceTarget.feature.properties.key);
			suppressMouseOverHighlight = false;
			console.log("popup closed !", popup);
		});
    }

}

function createProblemstellenMarkerLayersIncludingPopup(geojsonPoint) {
    console.log(geojsonPoint);
    // var icons = getIcons(geojsonPoint.properties);
    // if(icons == null) {
    // 	return undefined;
    // }

    const icons = {
        danger: 'achtung.svg',
        slow: 'snail.svg',
        luecke: 'css/luecke.png'
    };
    const iconUrl = icons[geojsonPoint.properties.type];

    const texts = {
        luecke: 'Lücke'
    };
    const text = texts[geojsonPoint.properties.type];

    var description = geojsonPoint.properties && geojsonPoint.properties.description;
    const marker = L.marker(L.geoJSON(geojsonPoint).getLayers()[0].getLatLng(), {
        icon: L.icon({
            iconUrl: iconUrl,
            iconSize: [, 26],
            iconAnchor: [, 13],
        }),
        key: geojsonPoint.properties.key,
        alt: description,
    });

    const markers = {
        lowZoom: marker,
        highZoom: marker,
    };

	markers.lowZoom.bindPopup("<b>" + text + ": </b><br/>" + description + "<br/><img src='css/luecke.png' style='max-width: 200px;max-height: 200px;'/>",
		{
			autoClose: false,
			closeOnClick: true,
			closeButton: true,
			closeOnEscapeKey: true
		}).on('popupopen', function (popup) {
		highlightLine(popup.sourceTarget.options.key);
		suppressMouseOverHighlight = true;
		console.log("popup opened !", popup);
	}).on('popupclose', function (popup) {
		unhighlightLine(popup.sourceTarget.options.key);
		suppressMouseOverHighlight = false;
		console.log("popup closed !", popup);
	});

    markers.highZoom.bindPopup("<b>" + text + ": </b><br/>" + description + "<br/><img src='css/luecke.png' style='max-width: 200px;max-height: 200px;'/>",
        {
            autoClose: false,
            closeOnClick: true,
            closeButton: true,
            closeOnEscapeKey: true
        }).on('popupopen', function (popup) {
        highlightLine(popup.sourceTarget.options.key);
        suppressMouseOverHighlight = true;
        console.log("popup opened !", popup);
    }).on('popupclose', function (popup) {
        unhighlightLine(popup.sourceTarget.options.key);
        suppressMouseOverHighlight = false;
        console.log("popup closed !", popup);
    });

    return markers;
}

function createProblemstellePoint(geojson, coordinates) {
    return {
        "geometry": {"coordinates": coordinates, "type": "Point"},
        "properties": geojson.properties,
        "type": "Feature"
    };
}


function onMarkerClick(e) {
//	highlightLine(e.sourceTarget.options.key);
}

function onMarkerMouseOver(e) {
    if (!suppressMouseOverHighlight) {
        highlightLine(e.sourceTarget.options.key);
    }
}

function onMarkerMouseOut(e) {
    if (!suppressMouseOverHighlight) {
        unhighlightLine(e.sourceTarget.options.key);
    }
}

function loadProblemstellenGeojson(problemStellenFile) {
    console.log("=== loadProblemstellenGeojson with " + problemStellenFile);

    // get rid of "XML Parsing Error: not well-formed" during $.getJSON
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType("application/json");
            }
        }
    });
    $.getJSON(problemStellenFile, function (data) {
        if (data.type != "FeatureCollection") {
            console.error("expected a GeoJSON FeatureCollection. no radlkarte network can be displayed.");
            return;
        }

        console.log('problemstellen length ' + data.features.length);

        for (var i = 0; i < data.features.length; i++) {
            var geojson = data.features[i];

            if (geojson.type != 'Feature' || geojson.properties == undefined || geojson.geometry == undefined || geojson.geometry.type != 'LineString' || geojson.geometry.coordinates.length < 2) {
                if (geojson.geometry.type == 'Point') {
                    var markerLayers = createProblemstellenMarkerLayersIncludingPopup(geojson);
                    console.log(markerLayers);
                    if (markerLayers != null) {
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

            if (geojson.properties.type == "luecke") {
                var g1 = createProblemstellePoint(geojson, geojson.geometry.coordinates[Math.floor(geojson.geometry.coordinates.length/2)]);
                let markerLayers = createProblemstellenMarkerLayersIncludingPopup(g1);
                if (markerLayers != null) {
                    rkGlobal.markerLayerLowZoom.addLayer(markerLayers.lowZoom);
                    rkGlobal.markerLayerHighZoom.addLayer(markerLayers.highZoom);
                }
                markerLayers.lowZoom.on('click', onMarkerClick);
                markerLayers.highZoom.on('click', onMarkerClick);
                markerLayers.lowZoom.on('mouseover', onMarkerMouseOver);
                markerLayers.highZoom.on('mouseout', onMarkerMouseOut);
                /*var g2 = createProblemstellePoint(geojson, geojson.geometry.coordinates[geojson.geometry.coordinates.length - 1]);
                let markerLayers2 = createProblemstellenMarkerLayersIncludingPopup(g2);
                if (markerLayers2 != null) {
                    rkGlobal.markerLayerLowZoom.addLayer(markerLayers2.lowZoom);
                    rkGlobal.markerLayerHighZoom.addLayer(markerLayers2.highZoom);
                }
                markerLayers2.lowZoom.on('click', onMarkerClick);
                markerLayers2.highZoom.on('click', onMarkerClick);
                markerLayers2.lowZoom.on('mouseover', onMarkerMouseOver);
                markerLayers2.highZoom.on('mouseout', onMarkerMouseOut);*/
            }
            rkGlobal.problemstellenSegments.push(geojson);

            //geojson.properties.priority=0;
            //geojson.properties.stress=0;

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

    });
}