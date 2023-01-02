"use strict";

let mGlobal = {};
mGlobal.editableLayers = null;
mGlobal.drawControl = null;

function initializeMelden() {
    console.log("Initializing Melden Module");

    mGlobal.editableLayers = new L.FeatureGroup();
    rkGlobal.leafletMap.addLayer(mGlobal.editableLayers);

    var drawPluginOptions = {
        position: 'bottomleft',
        draw: {
            polyline: {
                shapeOptions: {
                    color: '#f357a1',
                    weight: 10
                },
                showLength: true,
                metric: true
            },
            polygon: false,
            circle: false,
            rectangle: false,
            marker: true,
            circlemarker: true,
            point: true
        },
        edit: {
            featureGroup: mGlobal.editableLayers, //REQUIRED!!
            remove: true
        }
    };

    // Initialise the draw control and pass it the FeatureGroup of editable layers
    mGlobal.drawControl = new L.Control.Draw(drawPluginOptions);
    L.drawLocal = {
        // format: {
        // 	numeric: {
        // 		delimiters: {
        // 			thousands: ',',
        // 			decimal: '.'
        // 		}
        // 	}
        // },
        draw: {
            toolbar: {
                // #TODO: this should be reorganized where actions are nested in actions
                // ex: actions.undo  or actions.cancel
                actions: {
                    title: 'Zeichnen abbrechen.',
                    text: 'Abbrechen'
                },
                finish: {
                    title: 'Zeichnen abschließen.',
                    text: 'Fertig'
                },
                undo: {
                    title: 'Zuletzt gezeichneten Punkt löschen',
                    text: 'Letzten Punkt löschen'
                },
                buttons: {
                    polyline: 'Neue Strecke für Meldung einer Problemstelle zeichnen.',
                    polygon: 'Draw a polygon',
                    rectangle: 'Draw a rectangle',
                    circle: 'Draw a circle',
                    marker: 'Neuen Punkt für Meldung einer Problemstelle zeichnen.',
                    circlemarker: 'Draw a circlemarker'
                }
            },
            handlers: {
                circle: {
                    tooltip: {
                        start: 'Click and drag to draw circle.'
                    },
                    radius: 'Radius'
                },
                circlemarker: {
                    tooltip: {
                        start: 'Click map to place circle marker.'
                    }
                },
                marker: {
                    tooltip: {
                        start: 'Click map to place marker.'
                    }
                },
                polygon: {
                    tooltip: {
                        start: 'Click to start drawing shape.',
                        cont: 'Click to continue drawing shape.',
                        end: 'Click first point to close this shape.'
                    }
                },
                polyline: {
                    error: '<strong>Error:</strong> shape edges cannot cross!',
                    tooltip: {
                        start: 'Klicken, um die Strecke zu beginnen.',
                        cont: 'Klicken, um den die Strecke weiterzuzeichnen.',
                        end: 'Klicken Sie den letzten Punkt, um die Strecke abzuschließen.'
                    }
                },
                rectangle: {
                    tooltip: {
                        start: 'Click and drag to draw rectangle.'
                    }
                },
                simpleshape: {
                    tooltip: {
                        end: 'Release mouse to finish drawing.'
                    }
                }
            }
        },
        edit: {
            toolbar: {
                actions: {
                    save: {
                        title: 'Änderungen speichern.',
                        text: 'Ok'
                    },
                    cancel: {
                        title: 'Abbrechen und derzeitige Änderungen verwerfen.',
                        text: 'Abbrechen'
                    },
                    clearAll: {
                        title: 'Alles Selbstgezeichnete löschen.',
                        text: 'Alles löschen.'
                    }
                },
                buttons: {
                    edit: 'Hier können Sie Ihre Strecken nochmals ändern, bevor Sie damit Problemstellen melden.',
                    editDisabled: 'Hier können Sie Ihre Strecken nochmals ändern, bevor Sie damit Problemstellen melden.',
                    remove: 'Ihre Strecken löschen.',
                    removeDisabled: 'Ihre Strecken löschen.'
                }
            },
            handlers: {
                edit: {
                    tooltip: {
                        text: 'Sie können die selbstgezeichneten Strecken nun bearbeiten.',
                        subtext: 'Drücken Sie Abbrechen, um Ihre Änderungen zu verwerfen.'
                    }
                },
                remove: {
                    tooltip: {
                        text: 'Klicken Sie auf eine selbstgezeichnete Strecke, um sie zu löschen.'
                    }
                }
            }
        }
    };
    rkGlobal.leafletMap.addControl(mGlobal.drawControl);

    rkGlobal.leafletMap.on('draw:created', function (e) {
        let type = e.layerType,
            layer = e.layer;

        let texts = getDrawTexts(type);
        layer.bindPopup(texts.popup,
            {
                autoClose: false,
                closeOnClick: true,
                closeButton: true,
                closeOnEscapeKey: true
            }).on('popupopen', function (popup) {
            setDrawGeometry(popup.sourceTarget.toGeoJSON());
            document.getElementById('describeGF').onclick = function () {
                let pos = encodeURIComponent(JSON.stringify(getDrawGeometry().geometry));
                let newUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdGOOoSioi46-auNoHvbUVyhrNDCR35rlVl8KHV5Rw9NtgpgQ/viewform?usp=pp_url&entry.1646312533=' + pos;
                window.open(newUrl);
            };
            document.getElementById('describeF').onclick = function () {
                let pos = encodeURIComponent(JSON.stringify(getDrawGeometry().geometry));
                let newUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSe6LSipRxsvMv4fpCy5COBmJ4Cd1wVbQyoPZHttpXJQUfQrLA/viewform?usp=pp_url&entry.1646312533=' + pos;
                window.open(newUrl);
            };
            document.getElementById('describeM').onclick = function () {
                let pos = encodeURIComponent(JSON.stringify(getDrawGeometry().geometry));
                window.open('mailto:linz@radlobby.at?subject=Problemstelle melden bei (Bitte Straße angeben)&body=(Bitte Problem beschreiben) GPS-Position ' + pos);
            };

        }).bindTooltip(texts.tooltip)
            .on('popupclose', function (popup) {
            });

        mGlobal.editableLayers.addLayer(layer);
    });


}

var selectedDrawGeometry = null;

function setDrawGeometry(geo) {
    selectedDrawGeometry = geo;
}

function getDrawGeometry() {
    return selectedDrawGeometry;
}



let showGeoCopyButton = document.cookie.indexOf("jirabutton=true") !== -1;

function copyGeometry() {
    let clipText = JSON.stringify(getDrawGeometry().geometry);
    navigator.clipboard.writeText(clipText).then(function() {
        rkGlobal.leafletMap.closePopup();
    }, function(err) {
        console.error('Could not copy text: ', err);
        alert(' Could not copy text, please copy manually: '+clipText);
    });
}

let htmlMeldenText = '<div style="margin-top: 10px;width: 300px;">\n' +
    '<div >' +
    '    <div style="align: center; text-align: center;"><b>Problemstelle melden:<br/>Per Google-Formular oder Mail</b><br/>&nbsp;</div>\n' +

    '    <div class="column" style="align: center; text-align: center;">\n' +
    '        <button id="describeGF" style="max-width: 150px;height: 100%" >\n' +
    '            <div><img src="assets/list-g-f.png" height="50px"/></div>\n' +
    '            <div style="align: center; text-align: center;"><b>Formular<br/>mit Foto</br></b></div>\n' +
    '        </button>\n' +
    '    </div>\n' +
    '    <div class="column" style="align: center; text-align: center;">\n' +
    '        <button id="describeF" style="max-width: 150px;height: 100%;opacity: 0.8;" >\n' +
    '            <div><img src="assets/list.png" height="50px"/></div>\n' +
    '            <div style="align: center; text-align: center;">Formular<br/>&nbsp;</div>\n' +
    '        </button>\n' +
    '    </div>\n' +
    '    <div class="column" style="align: center; text-align: center;">\n' +
    '        <button id="describeM" style="max-width: 150px;height: 100%;opacity: 0.8;" >\n' +
    '            <div><img src="assets/mail.png" height="50px"/></div>\n' +
    '            <div style="align: center; text-align: center;">Mail<br/>&nbsp;</div>\n' +
    '        </button>\n' +
    '    </div>\n' +
    (showGeoCopyButton?'<div style="align:center; text-align: center;">&nbsp;<br/><a onclick="copyGeometry()" href="#" title="Klicken, um die Geometrie der gezeichneten Problemstelle in die Zwischenablage zu kopieren.">Geometrie kopieren</a></div>':"")+
    '<div>&nbsp;<br/>' +
    '    <div style="font-size:smaller; text-align: center;">Die von Ihnen gezeichnete Strecke/Stelle bleibt nicht permanent in der Karte. Sie dient nur zur Eingabe an das Meldeformular.</div>\n' +
    '</div>' +
    '</div>';


function getDrawTexts(type) {
    let popup =
        htmlMeldenText;
    let mitText;
    if (type === "LineString") {
        mitText = "Ihrer selbstgezeichneten Strecke";
    } else {
        mitText = "Ihrem selbstgezeichneten Punkt";
    }
    let tooltip =
        "Bitte klicken, um mit " + mitText + " eine Problemstelle zu melden.";
    return {
        "popup": popup,
        "tooltip": tooltip
    }
}


