// ----------------------------------------------------
// host/illustrator.jsx - v6.4 (Syntax Fixed & Stability)
// ----------------------------------------------------

function stringify(obj) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (typeof obj === "string") return '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\n') + '"'; 
    if (typeof obj === "number" || typeof obj === "boolean") return obj.toString();
    if (obj instanceof Array) {
        var res = "[";
        for (var i=0; i<obj.length; i++) { res += stringify(obj[i]); if (i < obj.length - 1) res += ","; }
        return res + "]";
    }
    if (typeof obj === "object") {
        var res = "{", first = true;
        for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) { if (!first) res += ","; res += '"' + k + '":' + stringify(obj[k]); first = false; } }
        return res + "}";
    }
    return '""';
}

function safeGetColor(col) {
    if (!col) return [0,0,0];
    try {
        if (col.typename === "RGBColor") return [col.red/255, col.green/255, col.blue/255];
        if (col.typename === "CMYKColor") {
            var r = (1 - col.cyan/100) * (1 - col.black/100);
            var g = (1 - col.magenta/100) * (1 - col.black/100);
            var b = (1 - col.yellow/100) * (1 - col.black/100);
            return [r, g, b];
        }
        if (col.typename === "GrayColor") { var g = 1 - (col.gray/100); return [g, g, g]; }
        if (col.typename === "SpotColor") return safeGetColor(col.spot.color);
    } catch(e){}
    return [0,0,0];
}

function getPathData(pi, cx, cy) {
    if (!pi.pathPoints || pi.pathPoints.length < 2) return null;
    var pts = [];
    for (var p = 0; p < pi.pathPoints.length; p++) {
        var pt = pi.pathPoints[p];
        pts.push({ a: [pt.anchor[0] - cx, cy - pt.anchor[1]], i: [pt.leftDirection[0] - pt.anchor[0], pt.anchor[1] - pt.leftDirection[1]], o: [pt.rightDirection[0] - pt.anchor[0], pt.anchor[1] - pt.rightDirection[1]] });
    }
    return { pts: pts, closed: pi.closed };
}

function extractShapeData(item, cx, cy) {
    if (item.clipping) return null;
    var paths = [];
    if (item.typename === "PathItem") { var p = getPathData(item, cx, cy); if (p) paths.push(p); }
    else if (item.typename === "CompoundPathItem") { for (var i = 0; i < item.pathItems.length; i++) { var p = getPathData(item.pathItems[i], cx, cy); if (p) paths.push(p); } }
    if (!paths.length) return null;
    var res = { paths: paths, opacity: item.opacity };
    if (item.filled) res.fill = { type: "solid", color: safeGetColor(item.fillColor) };
    if (item.stroked) { res.stroke = { type: "solid", color: safeGetColor(item.strokeColor) }; res.strokeWidth = item.strokeWidth; }
    return res;
}

function exportLayers(aeScriptPath, mode) {
    try {
        if (!app.documents.length) return '{"error":"Doc não aberto"}';
        var doc = app.activeDocument;
        var sel = doc.selection;
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        function toAeX(x) { return x - ab[0]; }
        function toAeY(y) { return ab[1] - y; }

        var layers = [];
        function process(item, parentId) {
            if (item.hidden || (item.typename === "PathItem" && item.clipping)) return;
            if (item.typename === "GroupItem") {
                var gid = "g" + Math.random().toString(36).substr(2, 5);
                var b = item.geometricBounds;
                layers.push({ type: "null", id: gid, parentId: parentId, name: item.name || "Nulo", x: toAeX((b[0]+b[2])/2), y: toAeY((b[1]+b[3])/2) });
                for (var i = item.pageItems.length - 1; i >= 0; i--) process(item.pageItems[i], gid);
            } else {
                var b = item.geometricBounds;
                var d = extractShapeData(item, (b[0]+b[2])/2, (b[1]+b[3])/2);
                if (d) { d.type = "shape"; d.parentId = parentId; d.name = item.name || "Vetor"; d.x = toAeX((b[0]+b[2])/2); d.y = toAeY((b[1]+b[3])/2); layers.push(d); }
            }
        }
        for (var i = sel.length - 1; i >= 0; i--) process(sel[i], null);
        return sendViaBT({ layers: layers, abWidth: Math.abs(ab[2]-ab[0]), abHeight: Math.abs(ab[1]-ab[3]), command: mode }, aeScriptPath);
    } catch(e) { return '{"error":"' + e.toString() + '"}'; }
}

function sendViaBT(data, aeScriptPath) {
    try {
        var bt = new BridgeTalk(); 
        bt.target = "aftereffects"; 
        var f = new File(aeScriptPath); 
        if (f.open("r")) { 
            var aeScript = f.read();
            f.close(); 
            bt.body = aeScript + '\n\nreceiveFromOverlordLite("' + encodeURIComponent(stringify(data)) + '");'; 
            bt.send(); 
            return stringify(data);
        }
    } catch(e) { return '{"error":"BT Error"}'; }
    return "{}";
}
