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

function createPermanentLink(queryKey, id) {
    let baseURL = window.location.protocol + window.location.hostname + ":" + window.location.port + window.location.pathname;
    return new URL("?" + queryKey + "=" + encodeURIComponent(id), baseURL);
}

function createJiraLink(id) {
    return "https://radlobbylinz.atlassian.net/browse/" + encodeURIComponent(id);
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
        let point = geometry.coordinates[Math.floor(geometry.coordinates.length / 2)];
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

// creates a streeview url with the given point p, heading to pNext
function createStreetViewUrl(p, pNext) {
    // todo Für LineString könnten wir uns Richtung von Streetview ausrechnen: https://stackoverflow.com/questions/387942/google-street-view-url
    var bearing = turf.bearing(p, pNext);
    //return "http://maps.google.com/maps?q=&layer=c&cbll=" + p[1] + "," + p[0]+"&cbl=,"+bearing;
    return "http://www.google.com/maps?layer=c&cbll="+p[1]+","+p[0]+"&cbp=,"+bearing+",,,0";
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

/*    // zwischen
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
*/

    let laenge = "";
    if (geometry.type === "LineString") {
        let len = turf.length(geometry, {units: 'kilometers'});
        if (len<1.0) {
            laenge = "ca. " + (turf.round(len, 2)*1000) + " Meter";
        } else {
            laenge = "ca. " + turf.round(len, 1) + " Kilometer";
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

    let streetViewString = "";
    if (geometry.type === "LineString") {
        if (geometry.coordinates.length>1) {
            let p0 = geometry.coordinates[0];
            let options = {units: 'meters'};
            let len = turf.length(geometry, options);
            let p2 = turf.along(geometry, len / 2, options).geometry.coordinates;
            let p2Next = turf.along(geometry, len / 2 + 1, options).geometry.coordinates;

            let s0 = createStreetViewUrl(geometry.coordinates[0], geometry.coordinates[1]);
            let s2 = createStreetViewUrl(p2, p2Next);
            let sN = createStreetViewUrl(geometry.coordinates[geometry.coordinates.length - 1], geometry.coordinates[geometry.coordinates.length - 2]);
            streetViewString = "<div style='text-align: center; font-size: smaller;' title='Öffnet neues Fenster mit Street View bei Beginn, Mitte oder Ende der Problemstelle'>Google Street View: <a href='" + s0 + "' target='_blank'>Beginn</a> | " +
                "<a href='" + s2 + "' target='_blank'>Mitte</a> | " +
                "<a href='" + sN + "' target='_blank'>Ende</a>" +
                "</div>";
        } else {  // linestring with one coordinate? ok...
            let p0 = geometry.coordinates[0];
            let streetViewUrl =  "http://maps.google.com/maps?q=&layer=c&cbll=" + p0[1] + "," + p0[0];
            streetViewString = "<div style='text-align: center; font-size: smaller;' title='Öffnet neues Fenster mit Street View bei der Problemstelle'><a href='" + streetViewUrl + "' target='_blank'>Google Street View</a></div>";
        }
    } else if (geometry.type === "Point") {
        let p0 = geometry.coordinates[0];
        let streetViewUrl =  "http://maps.google.com/maps?q=&layer=c&cbll=" + p0[1] + "," + p0[0];
        streetViewString = "<div style='text-align: center; font-size: smaller;' title='Öffnet neues Fenster mit Street View bei der Problemstelle'><a href='" + streetViewUrl + "' target='_blank'>Google Street View</a></div>";
    } else {
        // ?
    }


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
            relatedArticles += "<a href='" + relatedTopicArticle + "' target='_blank'>Mehr zum Thema " + typeText + "</a>";
        }
        relatedArticles += "</div>"
    }

    let cookies = document.cookie;
    console.log("Cookies: " + cookies);
    let showJiraButton = cookies.indexOf("jirabutton=true") !== -1;
    let jiraLink = createJiraLink(properties.Id);


    let zoomLink = createPermanentLink("zoom", properties.Id);
    let openLink = createPermanentLink("open", properties.Id);
    let mailLink = "mailTo:linz@radlobby.at?subject=" + encodeURIComponent("Problemstelle " + properties.Id) + "&body=" + encodeURIComponent(openLink);
    let popup = "<div style='margin-top:25px;'>" +
        "<div style='background: #dddddd;padding: 5px;'><div style='float:left; width:50%;'>" +
        "<var><b>" + typeText + "</b></var>" +
        (showJiraButton ? "&nbsp;&nbsp;<a href='" + jiraLink + "' title='Klicken, um in Jira zu editieren...' target='_blank'>" + id + "<i class='fa fa-edit' style='margin-left:2px;'></i></a>" : "") +
        "</div>" +
        "<div style='margin-left:50%; text-align: right;'>" +
        "<a onclick='copyToClipboard(\"" + zoomLink + "\")' title='Positions-Link der Problemstelle \nKlicken, um zu kopieren...'><i class='fa fa-search-plus' style='margin-right:10px;'></i></a>" +
        "<a onclick='copyToClipboard(\"" + openLink + "\")' title='Details-Link der Problemstelle \nKlicken, um zu kopieren...'><i class='fa fa-link' style='margin-right:10px;'></i></a>" +
        "<a href='" + mailLink + "' title='Link zur Problemstelle mailen'><i class='fa fa-envelope' style='margin-right:10px;'></i></a>" +
        "<a href='" + openLink + "' title='Details-Link der Problemstelle'><var>" + id + "</var></a></div></div>" +
        "<div style='padding-left:5px;padding-top:5px;padding-right:5px; background: #ffffff'><b>" + properties.Titel + "</b></div>" +
        //"<div style='margin-bottom:5px'>" + lage + ", " + zwischen + richtung +
        (laenge.length > 0 ? "<div style='padding:5px;margin-top:5px;'>Länge: " + laenge + "</div>" : "") +
        (problem.length > 0 ? "<div style='padding:5px; max-height:75px;overflow-y:auto'>" + problem + "</div>" : "") +
        (vorschlag.length > 0 ? "<div style='padding:5px;margin-top:5px;max-height:75px;overflow-y:auto'>Vorschlag: " + vorschlag + "</div>" : "") +
        relatedArticles +
        "<div id='myScrollMenu' class='scrollmenu'>" +
        imageList +
        "</div>" +
        streetViewString;

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
