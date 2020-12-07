"use strict";

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


function getLueckeTexts(properties) {
    const texts = {
        luecke: 'Lücke'
    };
    const typeText = texts[properties.type];

    let lage = properties.LueckeLage;
    let von = properties.LueckeVon;
    let bis = properties.LueckeBis;
    let richtung = properties.LueckeFahrtrichtung;
    let abk = properties.LueckeAbk;
    let id = properties.key;
    let popup = "<div style='margin-top:25px;'><div style='float:left; width:50%;'><b>" + typeText + "</b></div>" +
        "<div style='margin-left:50%; text-align: right;margin-bottom:5px;'><var>" + id + "</var></div>" +
        "<div style='margin-bottom:5px'><b>" + lage + "</b></div>" +
        "<div style='margin-bottom:5px'>Zwischen " + von + " und " + bis + "</div>" +
        "Fahrtrichtung: " + richtung + "<br/>Geforderte Radinfrastruktur: " + abk +
        "<br/><img src='css/luecke.svg' style='max-width: 100px;max-height: 100px;margin:20px;'/></div>";

    let tooltip =
        "<div style='float:left; width:50%;'><b>" + typeText + "</b></div>" +
        "<div style='margin-left:50%; text-align: right;margin-bottom:5px;'><var>" + id + "</var></div>" +
        "<div>"+properties.description+"</div>";
    return {
        "popup": popup,
        "tooltip": tooltip
    }

}