"use strict";

var problemstellenGroup = null;

const lueckeLineStyleDefault = {
    color: '#991913',
    opacity: '1',
    weight: 4
};

const lueckeLineStyleHighlight = {
    color: '#ee0000',
    opacity: '1',
    weight: 8
};

var suppressMouseOverHighlight = false;

function highlightLine(key) {
    //console.log("Highlighting line " + key);
    problemstellenGroup.eachLayer(function (layer) {
        if (layer.key === key) {
            layer.setStyle(lueckeLineStyleHighlight);
        }
    });
}

function unhighlightLine(key) {
    //console.log("Unhighlighting line " + key);
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
        var description = "Zwischen " + von + " und " + bis + "<br/>Fahrtrichtung: " + richtung + "<br/>Geforderte Radinfrastruktur: " + abk;

        line.bindPopup("<b>" + text + ": </b><br/>" + description + "<br/><img src='css/luecke.png' style='max-width: 200px;max-height: 200px;'/>",
            {
                autoClose: false,
                closeOnClick: true,
                closeButton: true,
                closeOnEscapeKey: true
            }).on('popupopen', function (popup) {
            highlightLine(popup.sourceTarget.feature.properties.key);
            suppressMouseOverHighlight = true;
            //console.log("popup opened !", popup);
        }).on('popupclose', function (popup) {
            unhighlightLine(popup.sourceTarget.feature.properties.key);
            suppressMouseOverHighlight = false;
            //console.log("popup closed !", popup);
        });
    }

}

function createProblemstellenMarkerLayersIncludingPopup(geojsonPoint) {
    //console.log(geojsonPoint);
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

    /*
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
    */
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
    let key = e.sourceTarget.options.key;
    console.log("Opening popup for line " + key);
    problemstellenGroup.eachLayer(function (layer) {
        if (layer.key === key) {
            console.log(layer);
            layer.fireEvent('click');
        }
    });
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
                    } else {
                    }
                } else {
                    console.warn("ignoring invalid object (not a proper linestring feature): " + JSON.stringify(geojson));
                }
                continue;
            }

            if (geojson.properties.type == "luecke") {
                var g1 = createProblemstellePoint(geojson, geojson.geometry.coordinates[Math.floor(geojson.geometry.coordinates.length / 2)]);
                let markerLayers = createProblemstellenMarkerLayersIncludingPopup(g1);
                if (markerLayers != null) {
                    rkGlobal.markerLayerLowZoom.addLayer(markerLayers.lowZoom);
                    rkGlobal.markerLayerHighZoom.addLayer(markerLayers.highZoom);
                }
                markerLayers.lowZoom.on('click', onMarkerClick);
                markerLayers.highZoom.on('click', onMarkerClick);
                markerLayers.lowZoom.on('mouseover', onMarkerMouseOver);
                markerLayers.highZoom.on('mouseout', onMarkerMouseOut);
            }
            rkGlobal.problemstellenSegments.push(geojson);

        }
        rkGlobal.styleFunction();

    });
}