// AI_EXPORT_NULOS.jsx
(function() {
    if (app.documents.length === 0 || app.selection.length === 0) {
        alert("Selecione os vetores no Illustrator primeiro!");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

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
                var cyan = col.cyan / 100;
                var magenta = col.magenta / 100;
                var yellow = col.yellow / 100;
                var black = col.black / 100;
                var r = (1 - cyan) * (1 - black);
                var g = (1 - magenta) * (1 - black);
                var b = (1 - yellow) * (1 - black);
                return [r, g, b];
            }
            if (col.typename === "GrayColor") { var g = 1 - (col.gray/100); return [g, g, g]; }
            if (col.typename === "SpotColor") return safeGetColor(col.spot.color);
        } catch(e){}
        return null;
    }

    function safeGetFill(col, item) {
        if (!col) return null;
        try {
            if (col.typename === "NoColor") return null;
            if (col.typename === "GradientColor") {
                var g = col.gradient;
                var res = { 
                    type: "gradient", 
                    stops: [],
                    gType: (g.type === GradientType.LINEAR ? 1 : 2),
                    absOrigin: [col.origin[0], col.origin[1]],
                    angle: col.angle,
                    length: col.length
                };
                for (var i = 0; i < g.gradientStops.length; i++) {
                    var s = g.gradientStops[i];
                    var sc = safeGetColor(s.color);
                    if (sc === null) sc = [0,0,0];
                    res.stops.push({
                        offset: s.rampPoint / 100,
                        color: sc,
                        opacity: s.opacity / 100,
                        midPoint: s.midPoint / 100
                    });
                }
                return res;
            }
            var solidC = safeGetColor(col);
            if (solidC === null) return null;
            return { type: "solid", color: solidC };
        } catch(e){}
        return null;
    }

    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var cx = (ab[0] + ab[2]) / 2;
    var cy = (ab[1] + ab[3]) / 2;

    function getPathData(pi) {
        if (!pi.pathPoints || pi.pathPoints.length < 2) return null;
        var pts = [];
        for (var p = 0; p < pi.pathPoints.length; p++) {
            var pt = pi.pathPoints[p];
            pts.push({ 
                // Todos ancorados absolutamente ao centro da prancheta!
                a: [pt.anchor[0] - cx, cy - pt.anchor[1]], 
                i: [pt.leftDirection[0] - pt.anchor[0], pt.anchor[1] - pt.leftDirection[1]], 
                o: [pt.rightDirection[0] - pt.anchor[0], pt.anchor[1] - pt.rightDirection[1]] 
            });
        }
        return { pts: pts, closed: pi.closed };
    }

    function buildTree(item) {
        if (item.hidden) return null;
        // Se for uma path de recorte puramente invisível, marcamos ela
        var isClippingPath = (item.typename === "PathItem" && item.clipping);
        
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
            if (item.clipped) groupData.isClipped = true;

            for (var i = 0; i < item.pageItems.length; i++) {
                var childData = buildTree(item.pageItems[i]);
                if (childData) {
                    if (item.clipped && i === 0) childData.isMask = true; // O primeiro item do grupo é o recorte
                    groupData.items.push(childData);
                }
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
                var p = getPathData(item); 
                if (p) paths.push(p); 
            } else if (item.typename === "CompoundPathItem") { 
                for (var i = 0; i < item.pathItems.length; i++) { 
                    var childP = item.pathItems[i];
                    var p = getPathData(childP); 
                    if (p) paths.push(p); 
                    
                    if (!hasFill && childP.filled) {
                        hasFill = true;
                        fillColObj = childP.fillColor;
                    }
                    if (!hasStroke && childP.stroked) {
                        hasStroke = true;
                        strokeColObj = childP.strokeColor;
                        strokeWidth = childP.strokeWidth;
                    }
                }
            }
            if (paths.length === 0) return null;

            var shapeData = { type: "shape", name: item.name || "Vetor", paths: paths };
            if (item.opacity !== undefined) shapeData.opacity = item.opacity;
            if (item.blendingMode) shapeData.blendMode = item.blendingMode.toString();
            
            // Marcar se é uma máscara de recorte real
            if (isClippingPath || item.isMask === true) shapeData.isMask = true;

            // Só exportamos cores se NÃO for uma máscara puramente de recorte
            if (!isClippingPath) {
                if (hasFill) {
                    shapeData.fill = safeGetFill(fillColObj, item);
                    if (shapeData.fill && shapeData.fill.type === "gradient") {
                        shapeData.fill.cx = cx; shapeData.fill.cy = cy;
                    }
                }
                if (hasStroke) {
                    shapeData.stroke = safeGetFill(strokeColObj, item);
                    if (shapeData.stroke && shapeData.stroke.type === "gradient") {
                        shapeData.stroke.cx = cx; shapeData.stroke.cy = cy;
                    }
                    shapeData.strokeWidth = strokeWidth;
                }
            }
            return shapeData;
        }
    }

    var rootItems = [];
    for (var i = 0; i < sel.length; i++) {
        var node = buildTree(sel[i]);
        if (node) rootItems.push(node);
    }

    var outputData = {
        docName: doc.name,
        width: Math.abs(ab[2]-ab[0]),
        height: Math.abs(ab[1]-ab[3]),
        items: rootItems
    };

    var jsonStr = stringify(outputData);
    var tempFile = new File(Folder.temp.fsName + "/overlord_tree_nulos.json");
    tempFile.encoding = "UTF-8";
    tempFile.open("w");
    tempFile.write(jsonStr);
    tempFile.close();

    alert("VETORES EXPORTADOS P/ TESTE NULOS!\nAgora rode o AE_IMPORT_NULOS.jsx");

})();
