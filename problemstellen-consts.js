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

function createPermanentLink(queryKey, id) {
    let baseURL = window.location.protocol + window.location.hostname + ":" + window.location.port + window.location.pathname;
    return new URL("?" + queryKey + "=" + encodeURIComponent(id), baseURL);
}

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
    // assuming all fields are "" if not set, no nulls
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
    let problem = properties.Problem;
    let id = properties.Id;

    // zwischen
    let zwischen = "";
    if (von !== "") {
        if (bis !== "") {
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

    let imageList = "";
    if ((properties.Fotos != null) && (properties.Fotos.length > 0)) {
        for (let i = 0; i < properties.Fotos.length; i++) {
            let photoUrl = ImagePrefix + "thumb-" + properties.Fotos[i];
            let stringFotos = JSON.stringify(properties.Fotos);
            imageList += "<img id='myId123' src='" + photoUrl + "' style='margin:10px;' class='thumbImage' onclick='enlargeImg(this," + stringFotos + ", " + i + ");'/>";
        }
    } else {
        let photoUrl = psGlobal.icons[properties.Typ].options.iconUrl;
        imageList = "<img id='myId123' src='" + photoUrl + "' style='margin:20px;' class='thumbImage' onclick='enlargeImg(this, [], 0);'/>";
    }

    let point;
    if (geometry.type === "LineString") {
        point = geometry.coordinates[Math.floor(geometry.coordinates.length / 2)];
    } else if (geometry.type === "Point") {
        point = geometry.coordinates[0];
    } else {
        // ?
    }
    // todo Für LineString könnten wir uns Richtung von Streetview ausrechnen: https://stackoverflow.com/questions/387942/google-street-view-url
    let streetViewUrl = "http://maps.google.com/maps?q=&layer=c&cbll=" + point[1] + "," + point[0];


    // todo from const, or from jira or by naming convention for every Typ on Radlobby Linz Homepage?
    let relatedTopicArticle = "";
    if (properties.Typ === "Dooring") {
        relatedTopicArticle = "https://www.radlobby.at/alarmierende-studie-zur-dooring-gefahr";
    } else if (properties.Typ === "Lücke") {
        relatedTopicArticle = "http://ooe.radlobby.at/cms/index.php?id=265";
    }

    let relatedHomepageArticle = "";
    if (properties.HomepageArtikel !== "") {
        relatedHomepageArticle = properties.HomepageArtikel;
    }
    let relatedArticles = "";
    if ((relatedHomepageArticle !== "") || (relatedTopicArticle !== "")) {
        relatedArticles = "<div style='margin-top:5px;padding-left:5px;'>";
        if (relatedHomepageArticle !== "") {
            relatedArticles += "<a href='" + relatedHomepageArticle + "' target='_blank'>Mehr zur Problemstelle</a>&nbsp;";
        } else if (relatedTopicArticle !== "") { // only if no concrete article
            relatedArticles += "<a href='" + relatedTopicArticle + "' target='_blank'>Mehr zum Thema</a>";
        }
        relatedArticles += "</div>"
    }


    let zoomLink = createPermanentLink("zoom", properties.Id);
    let openLink = createPermanentLink("open", properties.Id);
    let mailLink = "mailTo:linz@radlobby.at?subject="+encodeURIComponent("Problemstelle "+properties.Id)+"&body="+encodeURIComponent(openLink);
    let popup = "<div style='margin-top:25px;'>" +
        "<div style='background: #dddddd;padding: 5px;'><div style='float:left; width:50%;'><var><b>" + typeText + "</b></var></div>" +
        "<div style='margin-left:50%; text-align: right;'>" +
        "<a onclick='copyToClipboard(\"" + zoomLink + "\")' title='Zoom-Link (Klicken, um zu kopieren)'><i class='fa fa-search-plus' style='margin-right:5px;'></i></a>" +
        "<a onclick='copyToClipboard(\"" + openLink + "\")' title='Info-Link (Klicken, um zu kopieren)'><i class='fa fa-link' style='margin-right:5px;'></i></a>" +
        "<a href='" + mailLink + "' title='Info-Link (Klicken, um zu kopieren)'><i class='fa fa-envelope' style='margin-right:5px;'></i></a>" +
        "<a href='" + openLink + "' title='Info-Link'><var>" + id + "</var></a></div></div>" +
        "<div style='padding-left:5px;padding-top:5px;padding-right:5px; background: #ffffff'><b>" + properties.Titel + "</b></div>" +
        //"<div style='margin-bottom:5px'>" + lage + ", " + zwischen + richtung +
        (problem.length > 0 ? "<div style='padding:5px; max-height:75px;overflow-y:auto'>" + problem + "</div>" : "") +
        (vorschlag.length > 0 ? "<div style='padding:5px;margin-top:5px;max-height:75px;overflow-y:auto'>Vorschlag: " + vorschlag + "</div>" : "") +
        relatedArticles +
        "<div id='myScrollMenu' class='scrollmenu'>" +
        imageList +
        "</div>" +
        "<div style='text-align: center; font-size: smaller;'><a href='" + streetViewUrl + "' target='_blank'>Neues Fenster mit Google Street View</a></div>";

    let tooltip =
        "<div style='float:left; width:50%;'><b>" + typeText + "</b></div>" +
        "<div style='margin-left:50%; text-align: right;margin-bottom:5px;'><var>" + id + "</var></div>" +
        "<div>" + properties.Titel + "</div>";
    return {
        "popup": popup,
        "tooltip": tooltip
    }
}

function copyToClipboard(text) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(text).select();
    document.execCommand("copy");
    $temp.remove();
}


// all problemstelle image list and full screen image helper functions below...

function scrollMenuScrollWheel(evt) {
    evt.preventDefault();
    let scrollMenu = document.getElementById("myScrollMenu");
    if (scrollMenu != null) {
        if (scrollMenu.deltaX === undefined) {
            // save it to the div for later usage
            scrollMenu.deltaX = 0;
        }
        let delta = evt.deltaY;
        if (evt.deltaY !== 0) {
            if (evt.deltaY < 0) delta = -100; else delta = 100; // scroll delta is different in each browser. let's scroll by fixed value.
        }
        scrollMenu.deltaX += delta;
        if (scrollMenu.deltaX < 0) {
            //console.log("Resetting to 0");
            scrollMenu.deltaX = 0;
        }
        let MAXW = scrollMenu.scrollWidth - 180;
        if (scrollMenu.deltaX > MAXW) {
            //console.log("Resetting to width of " + MAXW);
            scrollMenu.deltaX = MAXW;
        }
        //console.log("Scrolling by " + evt.deltaY + ". New saved deltaY=" + scrollMenu.deltaX);
        scrollMenu.scroll(scrollMenu.deltaX, 0);
    }
}

function updateModalArrows() {
    var modalImg = document.getElementById("img01");
    var leftVisible = false;
    var rightVisible = false;
    if (modalImg != null) {
        let allFotos = modalImg.Fotos;
        let currIndex = modalImg.currIndex;
        if ((allFotos != null) && (allFotos.length)) {
            leftVisible = currIndex > 0;
            rightVisible = currIndex + 1 < allFotos.length;
        }
    }
    var leftA = document.getElementById("modalLeftArrow");
    if (leftA != null) {
        leftA.hidden = !leftVisible;
    }
    var rightA = document.getElementById("modalRightArrow");
    if (rightA != null) {
        rightA.hidden = !rightVisible;
    }


}

function changeModalImage(delta) {
    var modalImg = document.getElementById("img01");
    let allFotos = modalImg.Fotos;
    let currIndex = modalImg.currIndex;
    let newIndex = modalImg.currIndex + delta;
    if (newIndex < 0) {
        newIndex = 0;
    }
    if (newIndex > allFotos.length - 1) {
        newIndex = allFotos.length - 1;
    }
    modalImg.src = ImagePrefix + allFotos[newIndex];
    modalImg.currIndex = newIndex;
    updateModalArrows();
    //var captionText = document.getElementById("caption");
    //captionText.innerHTML = img.alt;
}

function modalImageRightClick() {
    //console.log("click right");
    changeModalImage(+1);
}

function modalImageLeftClick() {
    //console.log("click left");
    changeModalImage(-1);
}


function modalImageScrollWheel(evt) {
    evt.preventDefault();
    if (evt.deltaY > 0) {
        modalImageRightClick();
    } else if (evt.deltaY < 0) {
        modalImageLeftClick();
    }
}

function enlargeImg(img, allFotos, currIndex) {
    let modalImageElem = document.getElementById("img01");
    if (modalImageElem != null) {
        console.log("Adding wheel handler for modal image");
        modalImageElem.onwheel = modalImageScrollWheel;
    } else {
        console.log("modal image not found for adding wheel handler");
    }

    console.log("Fotos: " + allFotos);
    console.log("Index: " + currIndex);
    var modal = document.getElementById("myModal");// Get the image and insert it inside the modal
    var modalImg = document.getElementById("img01");
    var captionText = document.getElementById("caption");
    modal.style.display = "block";
    modalImg.src = img.src.replace("thumb-", "");
    modalImg.Fotos = allFotos;
    modalImg.currIndex = currIndex;
    //updateArrows();
    captionText.innerHTML = img.alt;
    updateModalArrows();
}
