"use strict";

const ImagePrefix = "img/";

const lueckeLineStyleDefault = {
    color: '#ee1d39',
    opacity: '0.8'
};

const lueckeLineStyleHighlight = {
    color: '#3862fd',
    opacity: '0.8'
};

const texts = {
    luecke: 'Lücke'
};

function getPSLineWeight(zoom) {
    var lineWeight = zoom - 10;
    lineWeight = (lineWeight <= 0 ? 1 : lineWeight) * 1.4;
    return lineWeight;
}

function getPSDashStyle(lineWeight) {
    return lineWeight + " " + lineWeight * 1.5;
}

function getPSLineStyle(zoom) {
    var st = lueckeLineStyleDefault;
    st.weight = getPSLineWeight(zoom);
    st.dashArray = getPSDashStyle(Math.max(2, st.weight));
    return st;
}


function getLatLongFromGeometry(geometry) {
    if (geometry.type === "LineString") {
        let point = geometry.coordinates[Math.floor(geojson.geometry.coordinates.length / 2)];
        return point[1] + "," + point[0];
    } else if (geometry.type === "Point") {
        return geometry.coordinates[1] + "," + geometry.coordinates[0];
    }
    return "";
}

function getVonBisFromGeometry(geometry) {
    if (geometry.type === "LineString") {
        return {
            von: geometry.coordinates[0][1] + "," + geometry.coordinates[0][0],
            bis: geometry.coordinates[geometry.coordinates.length - 1][1] + "," + geometry.coordinates[geometry.coordinates.length - 1][0],
        };
    } else if (geometry.type === "Point") {
        return {
            von: geometry.coordinates[1] + "," + geometry.coordinates[0],
            bis: null
        };
    }
    return "";
}

function getLueckeTexts(geometry, properties) {
    const typeText = properties.Typ;

    let lage = properties.Lage;
    if (lage === "") {
        "Ca. bei Position " + getLatLongFromGeometry(geometry);
    }

    let von = properties.von;
    let bis = properties.bis;
    let richtung = properties.Fahrtrichtung;
    if (richtung != null) {
        richtung = ", Fahrtrichtung: " + richtung;
    }
    let vorschlag = properties.Vorschlag;
    let id = properties.Id;

    let zwischen = "";
    if (von != null) {
        if (bis != null) {
            zwischen = "zwischen " + von + " und " + bis;
        } else {
            zwischen = "ab " + von;
        }
    } else {
        if (geometry.type === "LineString") {
            let positions = getVonBisFromGeometry(geometry);
            zwischen = "zwischen " + positions.von + " und " + positions.bis;
        }
    }

    let photoUrl = psGlobal.icons[properties.Typ].options.iconUrl;
    if (properties.Fotos != null) {
        if (properties.Fotos.length > 0) {
            photoUrl = ImagePrefix + "thumb-" + properties.Fotos[0];
        }
    }

    let point;
    if (geometry.type === "LineString") {
        point = geometry.coordinates[Math.floor(geometry.coordinates.length/2)];
    } else if (geometry.type === "Point") {
        point = geometry.coordinates[0];
    } else {
        // ?
    }
    // todo Für LineString können wir uns Richtung von Streetview ausrechnen: https://stackoverflow.com/questions/387942/google-street-view-url
    let streetViewUrl = "http://maps.google.com/maps?q=&layer=c&cbll="+point[1]+","+point[0];

    let popup = "<div style='margin-top:25px;'><div style='float:left; width:50%;'><var><b>" + typeText + "</b></var></div>" +
        "<div style='margin-left:50%; text-align: right;margin-bottom:5px;'><var>" + id + "</var></div>" +
        "<div style='margin-bottom:5px'><b>" + properties.Titel + "</b></div>" +
        "<div style='margin-bottom:5px'>" + lage + ", " + zwischen + richtung +
        "<div style='margin-top:5px'><b> Vorschlag:<br/>" + vorschlag + "</b></div>" +
        "<img id='myId123' src='" + photoUrl + "' style='margin:20px;' class='thumbImage' onclick='enlargeImg();'/></div>" +
        "<div style='text-align: center; font-size: smaller;'><a href='"+streetViewUrl+"' target='_blank'>Neues Fenster mit Google Streetview</a></div>";

    let tooltip =
        "<div style='float:left; width:50%;'><b>" + typeText + "</b></div>" +
        "<div style='margin-left:50%; text-align: right;margin-bottom:5px;'><var>" + id + "</var></div>" +
        "<div>" + properties.Titel + "</div>";
    return {
        "popup": popup,
        "tooltip": tooltip
    }
}

function enlargeImg() {
    // Get the modal
    var modal = document.getElementById("myModal");// Get the image and insert it inside the modal - use its "alt" text as a caption
    console.log("Found " + modal);
    var img = document.getElementById("myId123");
    console.log("Found " + img);
    var modalImg = document.getElementById("img01");
    console.log("Found " + modalImg);
    var captionText = document.getElementById("caption");
    modal.style.display = "block";
    modalImg.src = img.src.replace("thumb-", "");
    captionText.innerHTML = img.alt;
}