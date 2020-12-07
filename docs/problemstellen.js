"use strict";

let psGlobal = {};

psGlobal.markerLayerLowZoom = L.layerGroup(); // layer group holding all markers (viewed at lower zoom levels) - typically just dots
psGlobal.markerLayerHighZoom = L.layerGroup(); // layer group holding all markers (viewed at higher zoom levels)
var psLinesFeatureGroup = null;
psGlobal.styleFunction = updateLineStyles;
psGlobal.psGeoJsons = []; // array holding all problemStellen geojsons (lines)
psGlobal.problemStellenFile = null;

function initializePS() {
    console.log("Initializing PS Module");
    initializePSIcons();
    var psControl = L.control({position: 'topleft'});
    psControl.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'command');
        div.id = "psCommandDiv"
        return div;
    };
    psControl.addTo(rkGlobal.leafletMap);
    updatePSControl();
}

function updatePSControl() {
    var div = document.getElementById("psCommandDiv");
    if ((psGlobal.problemStellenFile == null) || (psGlobal.problemStellenFile.length === 0)) {
        div.innerHTML = "";
    } else {
        if (rkGlobal.rkShown === undefined) {
            rkGlobal.rkShown = true;
        }
        let rkChecked = rkGlobal.rkShown;
        div.innerHTML =
            '<form><input id="rkToggleCheckbox" type="checkbox" ' + (rkChecked ? "checked" : "") + ' onClick="rkToggleCheckboxClicked()"/>Radlkarte' +
            '<input id="psToggleCheckbox" type="checkbox" onClick="psToggleCheckboxClicked()"/>Problemstellen<form/>';
    }
}

function isPsToggleCheckboxChecked() {
    let checkBox = document.getElementById("psToggleCheckbox");
    return (checkBox != null) && checkBox.checked;
}

function isRkToggleCheckboxChecked() {
    let checkBox = document.getElementById("rkToggleCheckbox");
    return (checkBox != null) && checkBox.checked;
}

function psToggleCheckboxClicked() {
    if (isPsToggleCheckboxChecked()) {
        loadProblemstellenGeojson();
    } else {
        removeProblemstellenSegmentsAndMarkers();
    }
}

function rkToggleCheckboxClicked() {
    if (isRkToggleCheckboxChecked()) {
        loadGeoJson(rkGlobal.currentGeoJsonFile);
    } else {
        removeAllSegmentsAndMarkers();
    }
}

function initializePSIcons() {
    psGlobal.icons = {};
    psGlobal.icons.redDot = L.icon({
        iconUrl: 'css/reddot.svg',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        popupAnchor: [0, -5]
    });
    psGlobal.icons.luecke = L.icon({
        iconUrl: 'css/luecke.svg',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        opacity: 0.5
    });
}

// mouseover and clicking support: highlighting lines, showing tool tips

var suppressMouseOverHighlight = false;

function openTooltip(key) {
    psLinesFeatureGroup.eachLayer(function (layer) {
        if (layer.key === key) {
            layer.openTooltip();
        }
    });
}

function closeTooltip(key) {
    psLinesFeatureGroup.eachLayer(function (layer) {
        if (layer.key === key) {
            layer.closeTooltip();
        }
    });
}

function highlightLine(key) {
    if (!suppressMouseOverHighlight) {
        //console.log("Highlighting line " + key);
        psLinesFeatureGroup.eachLayer(function (layer) {
            if (layer.key === key) {
                layer.setStyle(lueckeLineStyleHighlight);
            }
        });
    }
}

function unhighlightLine(key) {
    if (!suppressMouseOverHighlight) {
        //console.log("Unhighlighting line " + key);
        psLinesFeatureGroup.eachLayer(function (layer) {
            if (layer.key === key) {
                layer.setStyle(lueckeLineStyleDefault);
            }
        });
    }
}


function onMarkerClick(e) {
    let key = e.sourceTarget.options.key;
    console.log("Opening popup for line " + key);
    psLinesFeatureGroup.eachLayer(function (layer) {
        if (layer.key === key) {
            console.log(layer);
            layer.fireEvent('click');
        }
    });
}

function onPSMarkerMouseOver(e) {
    openTooltip(e.sourceTarget.options.key);
    highlightLine(e.sourceTarget.options.key);
}

function onPSMarkerMouseOut(e) {
    closeTooltip(e.sourceTarget.options.key);
    unhighlightLine(e.sourceTarget.options.key);
}

// line style function
// regularily called e.g. on zoom change
// actually creates the lines from
function updateLineStyles() {
    var zoom = rkGlobal.leafletMap.getZoom();
    rkGlobal.leafletMap.createPane('problemstellen');
    if (psLinesFeatureGroup == null) {
        psLinesFeatureGroup = L.featureGroup().addTo(rkGlobal.leafletMap);
    } else {
        psLinesFeatureGroup.clearLayers();
    }
    for (let i = 0; i < psGlobal.psGeoJsons.length; i++) {
        let line = L.geoJson(psGlobal.psGeoJsons[i], {pane: "problemstellen"});
        line.key = psGlobal.psGeoJsons[i].properties.key;
        line.setStyle(getPSLineStyle(zoom));
        line.addTo(psLinesFeatureGroup);
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

        var texts = getLueckeTexts(psGlobal.psGeoJsons[i].properties);

        line.bindPopup(texts.popup,
            {
                autoClose: false,
                closeOnClick: true,
                closeButton: true,
                closeOnEscapeKey: true
            }).on('popupopen', function (popup) {
            highlightLine(popup.sourceTarget.feature.properties.key);
            suppressMouseOverHighlight = true;
        }).bindTooltip(texts.tooltip)
            .on('popupclose', function (popup) {
                suppressMouseOverHighlight = false;
                unhighlightLine(popup.sourceTarget.feature.properties.key);
            });

    }

    console.log("Zoom check  curr zoom = " + zoom);
    if (zoom >= rkGlobal.iconZoomThresholds[1]) {
        console.log("Changing to HighZoomLayer");
        rkGlobal.leafletMap.removeLayer(psGlobal.markerLayerLowZoom);
        rkGlobal.leafletMap.addLayer(psGlobal.markerLayerHighZoom);
    } else if (zoom >= rkGlobal.iconZoomThresholds[0]) {
        console.log("Changing to LowZoomLayer");
        rkGlobal.leafletMap.removeLayer(psGlobal.markerLayerHighZoom);
        rkGlobal.leafletMap.addLayer(psGlobal.markerLayerLowZoom);
    } else {
        console.log("Changing to LowZoomLayer");
        rkGlobal.leafletMap.removeLayer(psGlobal.markerLayerHighZoom);
        rkGlobal.leafletMap.removeLayer(psGlobal.markerLayerLowZoom);
    }
}

// load geojson functions
// we already create markers in the middle of the lines here, because they do not have dynamic styling like lines

function removeProblemstellenSegmentsAndMarkers() {
    if (psLinesFeatureGroup != null) {
        psLinesFeatureGroup.clearLayers();

    }
    psGlobal.psGeoJsons.length = 0;

    rkGlobal.leafletMap.removeLayer(psGlobal.markerLayerLowZoom);
    psGlobal.markerLayerLowZoom.clearLayers();
    rkGlobal.leafletMap.removeLayer(psGlobal.markerLayerHighZoom);
    psGlobal.markerLayerHighZoom.clearLayers();
}

function createProblemstellenMarkerLayers(geojsonPoint) {
    var markers = {
        lowZoom: L.marker(L.geoJSON(geojsonPoint).getLayers()[0].getLatLng(), {
            icon: psGlobal.icons.redDot,
            key: geojsonPoint.properties.key
        }),
        highZoom: L.marker(L.geoJSON(geojsonPoint).getLayers()[0].getLatLng(), {
            icon: psGlobal.icons[geojsonPoint.properties.type],
            key: geojsonPoint.properties.key
        })
    };
    return markers;
}

function createProblemstellePoint(geojson, coordinates) {
    return {
        "geometry": {"coordinates": coordinates, "type": "Point"},
        "properties": geojson.properties,
        "type": "Feature"
    };
}

// called by radlkarte
function setProblemstellenGeojson(problemStellenFile) {
    if (problemStellenFile === undefined) {
        psGlobal.problemStellenFile = null;
    } else {
        psGlobal.problemStellenFile = problemStellenFile;
    }
    console.log("setProblemstellenGeojson with " + psGlobal.problemStellenFile);
    updatePSControl();
    if (isPsToggleCheckboxChecked()) {
        console.log("checkbox is checked, immediately calling loadProblemstellenGeojson");
        loadProblemstellenGeojson();
    } else {
        console.log("checkbox is not checked, calling removeProblemstellenSegmentsAndMarkers");
        removeProblemstellenSegmentsAndMarkers();
    }
}

function loadProblemstellenGeojson() {
    removeProblemstellenSegmentsAndMarkers();

    console.log("=== loadProblemstellenGeojson with " + psGlobal.problemStellenFile);

    // get rid of "XML Parsing Error: not well-formed" during $.getJSON
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType("application/json");
            }
        }
    });
    $.getJSON(psGlobal.problemStellenFile, function (data) {
        if (data.type != "FeatureCollection") {
            console.error("expected a GeoJSON FeatureCollection. no radlkarte network can be displayed.");
            return;
        }

        console.log('problemstellen length ' + data.features.length);

        for (var i = 0; i < data.features.length; i++) {
            var geojson = data.features[i];

            if (geojson.type == 'Feature' && geojson.properties != undefined || geojson.geometry != undefined) {
                if (geojson.geometry.type == 'LineString') {
                    if (geojson.properties.type == "luecke") {
                        var g1 = createProblemstellePoint(geojson, geojson.geometry.coordinates[Math.floor(geojson.geometry.coordinates.length / 2)]);
                        let markerLayers = createProblemstellenMarkerLayers(g1);
                        if (markerLayers != null) {
                            psGlobal.markerLayerLowZoom.addLayer(markerLayers.lowZoom);
                            psGlobal.markerLayerHighZoom.addLayer(markerLayers.highZoom);
                        }
                        markerLayers.lowZoom.on('click', onMarkerClick);
                        markerLayers.lowZoom.on('mouseover', onPSMarkerMouseOver);
                        markerLayers.lowZoom.on('mouseout', onPSMarkerMouseOut);

                        markerLayers.highZoom.on('click', onMarkerClick);
                        markerLayers.highZoom.on('mouseover', onPSMarkerMouseOver);
                        markerLayers.highZoom.on('mouseout', onPSMarkerMouseOut);

                        // lines will be added to map in style function
                        psGlobal.psGeoJsons.push(geojson);
                    }
                }
            }

        }

        psGlobal.styleFunction();

        rkGlobal.leafletMap.on('zoomend', function (ev) {
            //debug("zoom level changed to " + rkGlobal.leafletMap.getZoom() + ".. enqueueing style change");
            $("#map").queue(function () {
                psGlobal.styleFunction();
                $(this).dequeue();
            });
        });
    });
}