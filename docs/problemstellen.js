"use strict";

let psGlobal = {};

psGlobal.markerLayerLowZoom = L.layerGroup(); // layer group holding all markers (viewed at lower zoom levels) - typically just dots
psGlobal.markerLayerHighZoom = L.layerGroup(); // layer group holding all markers (viewed at higher zoom levels)
var psLinesFeatureGroup = null;
psGlobal.styleFunction = updateLineStyles;
psGlobal.psGeoJsons = []; // array holding all problemStellen geojsons (lines)
psGlobal.problemStellenFile = null;
psGlobal.psTypes = {}; // after first parsing holds all available types - if empty, all should be shown. if not empty, types-checkboxes should be considered.

function initializePS() {
    console.log("Initializing PS Module");
    initializePSIcons();
    var psControl = L.control({position: 'topleft'});
    psControl.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'command');
        div.id = "psCommandDiv";
        return div;
    };
    psControl.addTo(rkGlobal.leafletMap);
    updatePSControl();

    var psControlSub = L.control({position: 'topleft'});
    psControlSub.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'command');
        div.id = "psCommandSubDiv";
        return div;
    };
    psControlSub.addTo(rkGlobal.leafletMap);
}

function updatePSControl() {
    var div = document.getElementById("psCommandDiv");
    if (rkGlobal.rkShown === undefined) {
        rkGlobal.rkShown = false;
    }
    let rkChecked = rkGlobal.rkShown;
    let html = '<form><input id="rkToggleCheckbox" type="checkbox" ' + (rkChecked ? "checked" : "") + ' onClick="rkToggleCheckboxClicked()"/>Radlkarte';
    if ((psGlobal.problemStellenFile != null) && (psGlobal.problemStellenFile.length !== 0)) {
        html += '&nbsp;<input id="psToggleCheckbox" type="checkbox" checked onClick="psToggleCheckboxClicked()"/>Problemstellen ';
    } else {
        setPSSubControlHidden(true);
    }
    // statistics about ratings:
    html += '&nbsp;<input id="psDisplayRatings" type="button" value="Top 10" onClick="psTop10Clicked()"/>';
    div.innerHTML = html + "<form/>";
}

function psTop10Clicked() {
    // dummy data for local test:
    // let json = JSON.parse('{"status":"success","results":[{"item":"LUECKE-99","average":"5","ratings":"1","lastupdate":"2021-03-27 20:38:10"},{"item":"LUECKE-15","average":"5","ratings":"1","lastupdate":"2021-03-27 20:50:22"},{"item":"LUECKE-46","average":"4","ratings":"1","lastupdate":"2021-03-27 20:12:40"},{"item":"LUECKE-41","average":"4","ratings":"1","lastupdate":"2021-03-27 20:38:06"},{"item":"LUECKE-24","average":"2","ratings":"1","lastupdate":"2021-03-27 20:12:42"},{"item":"LUECKE-72","average":"2","ratings":"1","lastupdate":"2021-03-27 20:38:09"}]}');
    // showTop10(json);

    $.getJSON( "ratekit/api/statistics.php?max=500" )
        .done(function( json ) {
            showTop10(json);
        })
        .fail(function( jqxhr, textStatus, error ) {
            var err = textStatus + ", " + error;
            console.log( "Request Failed: " + err );
        });

}

function showTop10(json) {
    console.log("Opening Top 10 "+JSON.stringify(json));
    if (json.status==="success") {
        for (let i=0; i<10; i++) {
            let probIdText;
            let probTypText;
            let probTitleText;
            let probRatingText;
            if (Array.isArray(json.results) && (i<json.results.length)) {
                let probId = json.results[i].item;
                let openLink = createPermanentLink("open", probId);
                probIdText = "<a href='" + openLink + "'>" + probId + "</a>";
                //psGlobal.psGeoJsons[i].properties
                let globalPropsRun = 0;
                while ((globalPropsRun < psGlobal.psGeoJsons.length) && (psGlobal.psGeoJsons[globalPropsRun].properties.Id !== probId)) {
                    globalPropsRun++;
                }
                if ((globalPropsRun < psGlobal.psGeoJsons.length) && (psGlobal.psGeoJsons[globalPropsRun].properties.Id===probId)) {
                    probTypText = psGlobal.psGeoJsons[globalPropsRun].properties.Typ;
                    probTitleText = psGlobal.psGeoJsons[globalPropsRun].properties.Titel;
                } else {
                    probTypText = "Nicht geladen";
                    probTitleText = "Nicht geladen";
                }
                probRatingText = json.results[i].average;
            } else {
                probIdText = "&nbsp;";
                probTypText= "&nbsp;";
                probTitleText= "&nbsp;";
                probRatingText = "&nbsp;";
            }
            var t1 = document.getElementById("table-top-" + (i+1) + "-1");
            var t2 = document.getElementById("table-top-" + (i+1) + "-2");
            var t3 = document.getElementById("table-top-" + (i+1) + "-3");
            var t4 = document.getElementById("table-top-" + (i+1) + "-4");
            t1.innerHTML = probIdText;
            t2.innerHTML = probTypText;
            t3.innerHTML = probTitleText;
            t4.innerHTML = probRatingText;

        }
    }
    var modal = document.getElementById("myModalTableDiv");
    var captionText = document.getElementById("myModalTableCaption");
    modal.style.display = "block";
    captionText.innerHTML = "BenutzerInnen-Bewertung: Top-10";
}

function setPSSubControlHidden(hidden) {
    var div = document.getElementById("psCommandSubDiv");
    if (div != null) {
        div.hidden = hidden;
    }
}

function updatePSSubControl() {
    var div = document.getElementById("psCommandSubDiv");
    var types = Object.keys(psGlobal.psTypes);

    if (types.length === 0) {
        div.innerHTML = "";
    } else {
        var cbs = "";
        for (let i = 0; i < types.length; i++) {
            let typ = types[i];
            console.log("Rendering " + typ);
            let sum = 0;
            for (let i=0; i<psGlobal.psGeoJsons.length; i++) {
                if (psGlobal.psGeoJsons[i].properties.Typ === typ) {
                    sum++;
                }
            }

            cbs = cbs + '<input id="psToggleCheckbox' + typ + '" type="checkbox" checked onClick="psSubToggleCheckboxClicked()"/> ' + typ + ' (' + sum + ')&nbsp;';
        }
        div.innerHTML =
            '<div style="margin-left: 20px;"><form>' + cbs + '<form/></div>';
    }
}

function psSubToggleCheckboxClicked() {
    loadProblemstellenGeojson();
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
        setPSSubControlHidden(false);
        loadProblemstellenGeojson();
    } else {
        setPSSubControlHidden(true);
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

function showTyp(Typ) {
    let checkBox = document.getElementById("psToggleCheckbox" + Typ);
    return (checkBox == null) || checkBox.checked;
}


function initializePSIcons() {
    psGlobal.icons = {};
    psGlobal.icons.redDot = L.icon({
        iconUrl: 'css/reddot.svg',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        popupAnchor: [0, -5]
    });
    psGlobal.icons.nophoto = L.icon({
        iconUrl: 'css/keinfoto.svg',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        popupAnchor: [0, -5]
    });
    psGlobal.icons["Lücke"] = L.icon({
        iconUrl: 'css/luecke.svg',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        opacity: 0.5
    });
    psGlobal.icons["Dooring"] = L.icon({
        iconUrl: 'css/dooring.svg',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        opacity: 0.5
    });
    psGlobal.icons["Allgemein"] = L.icon({
        iconUrl: 'css/warning.svg',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        opacity: 0.5
    });
    psGlobal.icons["None"] = L.icon({
        iconUrl: 'css/warning.svg',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        opacity: 0.5
    });
}

// mouseover and clicking support: highlighting lines, showing tool tips

var suppressMouseOverHighlight = false;

function openTooltip(id) {
    let found = false;
    psLinesFeatureGroup.eachLayer(function (layer) {
        if (layer.id === id) {
            found = true;
            layer.openTooltip();
        }
    });
    if (!found) {
        psGlobal.markerLayerHighZoom.eachLayer(function (layer) {
            if (layer.options.id === id) {
                found = true;
                layer.openTooltip();
            }
        });
        if (!found) {
            psGlobal.markerLayerLowZoom.eachLayer(function (layer) {
                if (layer.options.id === id) {
                    layer.openTooltip();
                }
            });
        }
    }
}

function openPopup(id) {
    let found = false;
    psLinesFeatureGroup.eachLayer(function (layer) {
        if (layer.id === id) {
            found = true;
            layer.openPopup();
        }
    });
    if (!found) {
        psGlobal.markerLayerHighZoom.eachLayer(function (layer) {
            if (layer.options.id === id) {
                found = true;
                layer.openPopup();
            }
        });
        if (!found) {
            psGlobal.markerLayerLowZoom.eachLayer(function (layer) {
                if (layer.options.id === id) {
                    layer.openPopup();
                }
            });
        }
    }
}


function closeTooltip(id) {
    psLinesFeatureGroup.eachLayer(function (layer) {
        if (layer.id === id) {
            layer.closeTooltip();
        }
    });
}


function flyTo(id) {
    if (psGlobal.initialZoom) {  // if zoom, then try to zoom to line first
        psLinesFeatureGroup.eachLayer(function (layer) {
            console.log("Checking lines, " + layer.id);
            if (layer.id === id) {
                rkGlobal.leafletMap.fitBounds(layer.getBounds());  // flyto does not work with immediately opening popup. lets use fitBounds!
                return;
            }
        });
    }
    psGlobal.markerLayerHighZoom.eachLayer(function (layer) {
        console.log("Checking markers high, " + layer.options.id);
        if (layer.options.id === id) {
            rkGlobal.leafletMap.panTo(layer.getLatLng());  // flyto does not work with immediately opening popup. lets use fitBounds!
            return;
        }
    });
    psGlobal.markerLayerLowZoom.eachLayer(function (layer) {
        console.log("Checking markers low, " + layer.id);
        if (layer.options.id === id) {
            rkGlobal.leafletMap.panTo(layer.getLatLng());  // flyto does not work with immediately opening popup. lets use fitBounds!
            return;
        }
    });
}

function highlightLine(id) {
    if (!suppressMouseOverHighlight) {
        psLinesFeatureGroup.eachLayer(function (layer) {
            if (layer.id === id) {
                layer.setStyle(lueckeLineStyleHighlight);
            }
        });
    }
}

function unhighlightLine(id) {
    if (!suppressMouseOverHighlight) {
        psLinesFeatureGroup.eachLayer(function (layer) {
            if (layer.id === id) {
                layer.setStyle(lueckeLineStyleDefault);
            }
        });
    }
}


function onMarkerClick(e) {
    let id = e.sourceTarget.options.id;
    console.log("Opening popup for line " + id);
    psLinesFeatureGroup.eachLayer(function (layer) {
        if (layer.id === id) {
            console.log(layer);
            layer.fireEvent('click');
        }
    });
}

function onPSMarkerMouseOver(e) {
    openTooltip(e.sourceTarget.options.id);
    highlightLine(e.sourceTarget.options.id);
}

function onPSMarkerMouseOut(e) {
    closeTooltip(e.sourceTarget.options.id);
    unhighlightLine(e.sourceTarget.options.id);
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
        line.id = psGlobal.psGeoJsons[i].properties.Id;
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

        var texts = getLueckeTexts(psGlobal.psGeoJsons[i].geometry, psGlobal.psGeoJsons[i].properties);

        line.bindPopup(texts.popup,
            {
                autoClose: false,
                closeOnClick: true,
                closeButton: true,
                closeOnEscapeKey: true
            }).on('popupopen', function (popup) {
            rkGlobal.sidebar.close();
            highlightLine(popup.sourceTarget.feature.properties.Id);
            suppressMouseOverHighlight = true;
            let scrollMenu = document.getElementById("myScrollMenu");
            if (scrollMenu != null) {
                console.log("Adding wheel handler for popup");
                scrollMenu.onwheel = scrollMenuScrollWheel;
            } else {
                console.log("myScrollMenu not found in popup");

            }
            $(rateKitFunc());
        }).bindTooltip(texts.tooltip)
            .on('popupclose', function (popup) {
                suppressMouseOverHighlight = false;
                unhighlightLine(popup.sourceTarget.feature.properties.Id);
                clearInitialOpenFromUrl();
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
    if (psGlobal.initialOpen != null) {
        let id = psGlobal.initialOpen;
        flyTo(psGlobal.initialOpen, false);
        rkGlobal.leafletMap.once('moveend', openOrZoomAfterFlyTo);
    }
}


function openOrZoomAfterFlyTo() {
    if (!psGlobal.initialZoom) {  // only if open, not on zoom
        openPopup(psGlobal.initialOpen);
    } else {
        highlightLine(psGlobal.initialOpen);
        suppressMouseOverHighlight = true;
        openTooltip(psGlobal.initialOpen);
        rkGlobal.leafletMap.once('click', closeAfterZoom);
    }
    psGlobal.initialOpen = null;
}

function closeAfterZoom() {
    suppressMouseOverHighlight = false;
    psLinesFeatureGroup.eachLayer(function (layer) {
        layer.closeTooltip();
        unhighlightLine(layer.id);
    });
    clearInitialOpenFromUrl();
}

function clearInitialOpenFromUrl() {
    let oldUrl = window.location + "";
    if ((oldUrl.indexOf("open=") > 0) || (oldUrl.indexOf("zoom=") > 0)) {
        // to avoid focussing that position on reload, city switch, etc.
        // todo full clear
        let newUrl = oldUrl.replace("open=", "xxx=").replace("zoom=", "xxx=");
        window.location = newUrl;
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

function createProblemstellenMarkerLayers(geojsonPoint, callForMarker) {
    let markers = {
        lowZoom: L.marker(L.geoJSON(geojsonPoint).getLayers()[0].getLatLng(), {
            icon: psGlobal.icons.redDot,
            id: geojsonPoint.properties.Id
        }),
        highZoom: L.marker(L.geoJSON(geojsonPoint).getLayers()[0].getLatLng(), {
            icon: psGlobal.icons[geojsonPoint.properties.Typ],
            id: geojsonPoint.properties.Id
        })
    };
    callForMarker(markers.lowZoom);
    callForMarker(markers.highZoom);
    return markers;
}


// called by radlkarte
function setProblemstellenGeojson(problemStellenFile) {


    // check permalink
    const urlParams = new URLSearchParams(window.location.search);
    let openId = "";

    let openParam = urlParams.get('open');
    if (openParam != null) {
        console.log("URL param open=" + openParam);
        openId = openParam;
        psGlobal.initialZoom = false;  // open the popup
    } else {
        let zoomParam = urlParams.get('zoom');
        console.log("URL param zoom=" + zoomParam);
        openId = zoomParam;
        psGlobal.initialZoom = true; // just zoom
    }

    psGlobal.initialOpen = openId;
    psGlobal.psTypes = {};
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

        let firstParse = Object.keys(psGlobal.psTypes).length === 0;

        for (var i = 0; i < data.features.length; i++) {
            var geojson = data.features[i];

            //console.log('Handling a Problemstellen-GeoJson ' + JSON.stringify(geojson));

            if (geojson.type == 'Feature' && geojson.properties != undefined || geojson.geometry != undefined) {
                psGlobal.psTypes[geojson.properties.Typ] = "dummy";

                if (firstParse || showTyp(geojson.properties.Typ)) {
                    if (geojson.geometry.type === 'LineString') {
                        // lines will be added to map in style function
                        psGlobal.psGeoJsons.push(geojson);
                        // If we got a linestring, the following will add additional marker "in the middle" of the LineString
                        let options = {units: 'meters'};
                        let len = turf.length(geojson, options);
                        let p2Coord = turf.along(geojson, len/2, options).geometry.coordinates;
                        //let p2Coord = geojson.geometry.coordinates[Math.floor(geojson.geometry.coordinates.length / 2)];  // fast: just take middle point in coord array
                        let markerLayers = createProblemstellenMarkerLayers({
                            "geometry": {
                                "coordinates": p2Coord,
                                "type": "Point"
                            },
                            "properties": geojson.properties,
                            "type": "Feature"
                        }, function (markerLayer) {
                            markerLayer.on('click', onMarkerClick);
                            markerLayer.on('mouseover', onPSMarkerMouseOver);
                            markerLayer.on('mouseout', onPSMarkerMouseOut);
                        });
                        if (markerLayers != null) {
                            psGlobal.markerLayerLowZoom.addLayer(markerLayers.lowZoom);
                            psGlobal.markerLayerHighZoom.addLayer(markerLayers.highZoom);
                        }
                    } else if (geojson.geometry.type === 'Point') {
                        var texts = getLueckeTexts(geojson.geometry, geojson.properties);
                        let markerLayers = createProblemstellenMarkerLayers({
                            "geometry": geojson.geometry,
                            "properties": geojson.properties,
                            "type": "Feature"
                        }, function (markerLayer) {
                            markerLayer.bindPopup(texts.popup,
                                {
                                    autoClose: false,
                                    closeOnClick: true,
                                    closeButton: true,
                                    closeOnEscapeKey: true
                                }).bindTooltip(texts.tooltip);
                        });
                        if (markerLayers != null) {
                            psGlobal.markerLayerLowZoom.addLayer(markerLayers.lowZoom);
                            psGlobal.markerLayerHighZoom.addLayer(markerLayers.highZoom);
                        } else {
                            console.log("Unknown geojson.geometry " + geojson.geometry.type);
                        }
                    }
                }
            }

        }
        if (firstParse) {
            updatePSSubControl();
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