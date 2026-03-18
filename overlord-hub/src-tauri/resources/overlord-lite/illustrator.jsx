// host/illustrator.jsx - v11.0
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
    if (!col) return null;
    try {
        if (col.typename === "NoColor") return null;
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
    return null;
}

function getPathDataXY(pi, cx, cy) {
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
    if (item.typename === "PathItem") { var p = getPathDataXY(item, cx, cy); if (p) paths.push(p); }
    else if (item.typename === "CompoundPathItem") { for (var i = 0; i < item.pathItems.length; i++) { var p = getPathDataXY(item.pathItems[i], cx, cy); if (p) paths.push(p); } }
    if (!paths.length) return null;
    var res = { paths: paths, opacity: item.opacity };
    var fillC = safeGetColor(item.fillColor);
    var strokeC = safeGetColor(item.strokeColor);
    if (item.filled && fillC) res.fill = { type: "solid", color: fillC };
    if (item.stroked && strokeC) { res.stroke = { type: "solid", color: strokeC }; res.strokeWidth = item.strokeWidth; }
    return res;
}

function exportLayers(aeScriptPath, mode) {
    try {
        if (!app.documents.length) return '{"error":"Doc não aberto"}';
        var doc = app.activeDocument;
        var sel = doc.selection;
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        var cx = (ab[0] + ab[2]) / 2;
        var cy = (ab[1] + ab[3]) / 2;

        if (mode === "merged") {
            // THE NEW PERFECT LOGIC FOR LAYER GROUP
            function buildTree(item) {
                if (item.hidden || (item.typename === "PathItem" && item.clipping)) return null;
                if (item.typename === "TextFrame") {
                    try {
                        var dup = item.duplicate();
                        var tempOutline = dup.createOutline();
                        var result = buildTree(tempOutline);
                        tempOutline.remove();
                        return result;
                    } catch(e) { return null; }
                }
                if (item.typename === "SymbolItem" || item.typename === "PluginItem") {
                    try {
                        var dup = item.duplicate();
                        if(dup.breakLink) dup.breakLink();
                        var result = buildTree(dup);
                        dup.remove();
                        return result;
                    } catch(e) { return null; }
                }
                
                if (item.typename === "GroupItem") {
                    var groupData = { type: "group", name: item.name || "Grupo", items: [] };
                    if (item.opacity !== undefined) groupData.opacity = item.opacity;
                    if (item.blendingMode) groupData.blendMode = item.blendingMode.toString();
                    for (var i = 0; i < item.pageItems.length; i++) {
                        var childData = buildTree(item.pageItems[i]);
                        if (childData) groupData.items.push(childData);
                    }
                    if (groupData.items.length > 0) return groupData;
                    return null;
                } else {
                    var paths = [];
                    var hasFill = item.filled;
                    var fillColObj = item.fillColor;
                    var hasStroke = item.stroked;
                    var strokeColObj = item.strokeColor;
                    var strokeWidth = item.strokeWidth;

                    if (item.typename === "PathItem") { 
                        var p = getPathDataXY(item, cx, cy); 
                        if (p) paths.push(p); 
                    } else if (item.typename === "CompoundPathItem") { 
                        for (var i = 0; i < item.pathItems.length; i++) { 
                            var childP = item.pathItems[i];
                            var p = getPathDataXY(childP, cx, cy); 
                            if (p) paths.push(p); 
                            
                            if (!hasFill && childP.filled) { hasFill = true; fillColObj = childP.fillColor; }
                            if (!hasStroke && childP.stroked) { hasStroke = true; strokeColObj = childP.strokeColor; strokeWidth = childP.strokeWidth; }
                        }
                    }
                    if (paths.length === 0) return null;

                    var shapeData = { type: "shape", name: item.name || "Vetor", paths: paths };
                    if (item.opacity !== undefined) shapeData.opacity = item.opacity;
                    if (item.blendingMode) shapeData.blendMode = item.blendingMode.toString();
                    
                    var fillCol = safeGetColor(fillColObj);
                    var strokeCol = safeGetColor(strokeColObj);
                    
                    if (hasFill && fillCol !== null) shapeData.fill = { color: fillCol };
                    if (hasStroke && strokeCol !== null) shapeData.stroke = { color: strokeCol, width: strokeWidth }; 
                    return shapeData;
                }
            }
            
            var rootItems = [];
            for (var i = 0; i < sel.length; i++) {
                var node = buildTree(sel[i]);
                if (node) rootItems.push(node);
            }
            return sendViaBT({ items: rootItems, abWidth: Math.abs(ab[2]-ab[0]), abHeight: Math.abs(ab[1]-ab[3]), command: mode }, aeScriptPath);
        } else {
            // ORIGINAL LOGIC FOR SPLIT LAYER
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
        }
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
