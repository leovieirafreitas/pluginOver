// ----------------------------------------------------
// host/illustrator/illustrator.jsx - V5.5 (Robust JSON Engine)
// ----------------------------------------------------

function stringify(obj) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (typeof obj === "string") return '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    if (typeof obj === "number" || typeof obj === "boolean") return obj.toString();
    if (obj instanceof Array) {
        var res = "[";
        for (var i=0; i<obj.length; i++) { res += stringify(obj[i]); if (i < obj.length - 1) res += ","; }
        return res + "]";
    }
    if (typeof obj === "object") {
        var res = "{", first = true;
        for (var k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                if (!first) res += ",";
                res += '"' + k + '":' + stringify(obj[k]);
                first = false;
            }
        }
        return res + "}";
    }
    return '""';
}

function safeGetColor(col) {
    if (!col) return [1, 1, 1];
    try {
        var c = col;
        if (col.typename === "SpotColor") c = col.spot.color;
        if (col.typename === "GradientColor") {
            if (col.gradient && col.gradient.gradientStops.length > 0) {
                return safeGetColor(col.gradient.gradientStops[0].color);
            }
        }
        if (c.typename === "RGBColor") return [c.red/255, c.green/255, c.blue/255];
        if (c.typename === "CMYKColor") {
            var r = (1 - c.cyan/100) * (1 - c.black/100);
            var g = (1 - c.magenta/100) * (1 - c.black/100);
            var b = (1 - c.yellow/100) * (1 - c.black/100);
            return [r, g, b];
        }
    } catch(e){}
    return [0.5, 0.5, 0.5];
}

function safeGetFill(col) {
    if (!col) return null;
    try {
        if (col.typename === "GradientColor") {
            var g = col.gradient;
            var res = { 
                type: "gradient", 
                stops: [], 
                angle: col.angle || 0,
                origin: [col.origin[0], col.origin[1]],
                matrix: [col.matrix.mValueA, col.matrix.mValueB, col.matrix.mValueC, col.matrix.mValueD, col.matrix.mValueTX, col.matrix.mValueTY]
            };
            for (var i = 0; i < g.gradientStops.length; i++) {
                var s = g.gradientStops[i];
                res.stops.push({ pos: s.rampPoint / 100, color: safeGetColor(s.color) });
            }
            return res;
        }
        return { type: "solid", color: safeGetColor(col) };
    } catch(e){}
    return null;
}

function exportLayersIllustrator(aeScriptPath) {
    if (app.documents.length === 0 || app.selection.length === 0) {
        alert("Selecione pelo menos um objeto.");
        return '{"error":"Seleção vazia"}';
    }

    var doc = app.activeDocument;
    var abIdx = doc.artboards.getActiveArtboardIndex();
    var abRect = doc.artboards[abIdx].artboardRect;
    var abCenter = [(abRect[0] + abRect[2])/2, (abRect[1] + abRect[3])/2];

    function extractItem(item) {
        if (!item || item.hidden || item.locked) return null;
        var tn = item.typename;
        
        if (tn === "GroupItem") {
            var gData = { name: item.name || "Group", type: "group", children: [] };
            for (var i = 0; i < item.pageItems.length; i++) {
                var child = extractItem(item.pageItems[i]);
                if (child) gData.children.push(child);
            }
            if (gData.children.length === 0) return null;
            return gData;
        }

        if (tn === "PathItem" || tn === "CompoundPathItem" || tn === "TextFrame") {
            var data = { name: item.name || tn, type: (tn === "TextFrame" ? "text" : "shape"), paths: [] };
            var b = item.geometricBounds;
            data.x = ((b[0] + b[2])/2) - abCenter[0];
            data.y = abCenter[1] - ((b[1] + b[3])/2);

            if (tn === "TextFrame") {
                data.text = item.contents;
                var attrs = item.textRange.characterAttributes;
                data.font = attrs.textFont.name;
                data.size = attrs.size;
                data.fill = { type: "solid", color: safeGetColor(attrs.fillColor) };
                return data;
            }

            var paths = (tn === "CompoundPathItem") ? item.pathItems : [item];
            for (var j = 0; j < paths.length; j++) {
                var pItem = paths[j];
                var pts = [];
                var cx = (b[0] + b[2])/2;
                var cy = (b[1] + b[3])/2;
                for (var p = 0; p < pItem.pathPoints.length; p++) {
                    var pt = pItem.pathPoints[p];
                    pts.push({
                        anchor: [pt.anchor[0] - cx, cy - pt.anchor[1]],
                        in: [pt.leftDirection[0] - pt.anchor[0], pt.anchor[1] - pt.leftDirection[1]],
                        out: [pt.rightDirection[0] - pt.anchor[0], pt.anchor[1] - pt.rightDirection[1]]
                    });
                }
                data.paths.push({ points: pts, closed: pItem.closed });
            }
            
            var ref = (tn === "CompoundPathItem") ? item.pathItems[0] : item;
            if (ref.filled) data.fill = safeGetFill(ref.fillColor);
            if (ref.stroked) {
                data.stroke = { 
                    color: safeGetColor(ref.strokeColor), 
                    width: ref.strokeWidth,
                    cap: ref.strokeCap.toString().replace("StrokeCap.",""),
                    join: ref.strokeJoin.toString().replace("StrokeJoin.","")
                };
            }
            return data;
        }
        return null;
    }

    var resultLayers = [];
    for (var i = 0; i < app.selection.length; i++) {
        var res = extractItem(app.selection[i]);
        if (res) resultLayers.push(res);
    }

    var bt = new BridgeTalk();
    bt.target = "aftereffects";
    var payload = stringify({ layers: resultLayers });
    
    var aeScriptFile = new File(aeScriptPath);
    var aeScriptContent = "";
    if (aeScriptFile.open("r")) { aeScriptContent = aeScriptFile.read(); aeScriptFile.close(); }

    bt.body = aeScriptContent + "\nreceiveFromOverlordLite('" + encodeURIComponent(payload).replace(/'/g, "\\'") + "');";
    bt.send();
    
    return stringify({ layers: resultLayers });
}
