// ----------------------------------------------------
// host/illustrator.jsx - V4.3 (Robust Text + Artboard Scaling)
// ----------------------------------------------------

function stringify(obj) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (typeof obj === "string") {
        return '"' + obj.replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"')
                        .replace(/\n/g, '\\n')
                        .replace(/\r/g, '\\n')
                        .replace(/\x03/g, '\\n') 
                        .replace(/[\x00-\x1F\x7F-\x9F]/g, "") + '"'; 
    }
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
    if (!col) return [0.5,0.5,0.5];
    try {
        var c = col;
        if (col.typename === "SpotColor") c = col.spot.color;
        if (c.typename === "RGBColor") return [c.red/255, c.green/255, c.blue/255];
        if (c.typename === "CMYKColor") return [(1-c.cyan/100)*(1-c.black/100), (1-c.magenta/100)*(1-c.black/100), (1-c.yellow/100)*(1-c.black/100)];
        if (c.typename === "GrayColor") return [1-(c.gray/100), 1-(c.gray/100), 1-(c.gray/100)];
    } catch(e){}
    return [0.5, 0.5, 0.5];
}

function safeGetFill(col) {
    if (!col) return null;
    try {
        if (col.typename === "GradientColor") {
            var g = col.gradient;
            var res = { type: "gradient", stops: [] };
            for (var i = 0; i < g.gradientStops.length; i++) {
                var s = g.gradientStops[i];
                res.stops.push({
                    offset: s.rampPoint / 100,
                    color: safeGetColor(s.color)
                });
            }
            return res;
        }
        return { type: "solid", color: safeGetColor(col) };
    } catch(e){}
    return { type: "solid", color: [0.5, 0.5, 0.5] };
}

function exportLayers(aeScriptPath, merged) {
    try {
        if (!app.documents || app.documents.length === 0) return '{"error":"Abra um documento!"}';
        var doc = app.activeDocument;
        var sel = doc.selection;
        
        if (!sel || sel.length === undefined || sel.length === 0) {
            return '{"error":"Selecione algo!"}';
        }

        var abIdx = doc.artboards.getActiveArtboardIndex();
        var abRect = doc.artboards[abIdx].artboardRect;
        var abWidth = Math.abs(abRect[2] - abRect[0]);
        var abHeight = Math.abs(abRect[1] - abRect[3]);
        
        function toAeX(x) { return x - abRect[0]; }
        function toAeY(y) { return abRect[1] - y; }

        var allExtracted = [];

        function extractItem(item, parentId) {
            if (!item) return null;
            var data = { name: "Camada" };
            try { data.name = item.name || "Camada"; } catch(e){}
            if (parentId) data.parentId = parentId;
            
            try {
                var tn = item.typename;
                
                if (tn === "TextFrame") {
                    data.type = "text";
                    data.text = item.contents;
                    var b = item.geometricBounds; 
                    data.x = toAeX((b[0] + b[2]) / 2);
                    data.y = toAeY((b[1] + b[3]) / 2);
                    try {
                        if (item.textRange && item.textRange.characterAttributes) {
                            var attrs = item.textRange.characterAttributes;
                            try { data.textFont = attrs.textFont.name; } catch(e){}
                            try { data.textSize = attrs.size; } catch(e){}
                            try { data.textFill = safeGetColor(attrs.fillColor); } catch(e){}
                        }
                    } catch(e) {}
                    return data;
                }
                
                if (tn === "GroupItem") {
                    if (merged) {
                        // Se for exportação Mesclada, ignoramos a estrutura de grupo e pegamos todos os filhos
                        for (var i = 0; i < item.pageItems.length; i++) {
                            var res = extractItem(item.pageItems[i], null);
                            if (res) {
                                if (res instanceof Array) { for(var k=0; k<res.length; k++) allExtracted.push(res[k]); }
                                else { allExtracted.push(res); }
                            }
                        }
                        return null; 
                    } else {
                        var groupId = "grp_" + Math.random().toString().substr(2,6);
                        data.type = "group_parent";
                        data.id = groupId;
                        var b = item.geometricBounds; 
                        data.x = toAeX((b[0] + b[2]) / 2);
                        data.y = toAeY((b[1] + b[3]) / 2);
                        var groupRes = [data];
                        for (var i = 0; i < item.pageItems.length; i++) {
                            var childData = extractItem(item.pageItems[i], groupId);
                            if (childData) {
                                if (childData instanceof Array) { for(var k=0; k<childData.length; k++) groupRes.push(childData[k]); }
                                else { groupRes.push(childData); }
                            }
                        }
                        return groupRes;
                    }
                }

                if (tn === "CompoundPathItem" || tn === "PathItem") {
                    data.type = "shape";
                    data.paths = [];
                    var b = item.geometricBounds;
                    var cx = (b[0] + b[2]) / 2;
                    var cy = (b[1] + b[3]) / 2;
                    data.x = toAeX(cx);
                    data.y = toAeY(cy);
                    
                    var pathsToProcess = [];
                    if (tn === "CompoundPathItem") {
                        for (var i = 0; i < item.pathItems.length; i++) pathsToProcess.push(item.pathItems[i]);
                    } else {
                        pathsToProcess.push(item);
                    }

                    for (var j = 0; j < pathsToProcess.length; j++) {
                        var pathItem = pathsToProcess[j];
                        if (!pathItem.pathPoints || pathItem.pathPoints.length < 2) continue;
                        var pts = [];
                        for (var p = 0; p < pathItem.pathPoints.length; p++) {
                            var pt = pathItem.pathPoints[p];
                            pts.push({
                                a: [pt.anchor[0] - cx, cy - pt.anchor[1]],
                                i: [pt.leftDirection[0] - pt.anchor[0], pt.anchor[1] - pt.leftDirection[1]],
                                o: [pt.rightDirection[0] - pt.anchor[0], pt.anchor[1] - pt.rightDirection[1]]
                            });
                        }
                        data.paths.push({ pts: pts, closed: pathItem.closed });
                    }
                    var refItem = pathsToProcess[0];
                    if (refItem.filled) data.fill = safeGetFill(refItem.fillColor);
                    if (refItem.stroked) {
                        data.stroke = { type: "solid", color: safeGetColor(refItem.strokeColor) };
                        data.strokeWidth = refItem.strokeWidth;
                    }
                    return data;
                }
            } catch(e) {}
            return null;
        }

        for (var i = 0; i < sel.length; i++) {
            var resArr = extractItem(sel[i], null);
            if (resArr) {
                if (resArr instanceof Array) { for(var j=0; j<resArr.length; j++) allExtracted.push(resArr[j]); }
                else { allExtracted.push(resArr); }
            }
        }

        var payload = { layers: [], abWidth: abWidth, abHeight: abHeight };

        if (merged) {
            var mergedShape = {
                type: "shape",
                name: "Logo Mesclado",
                x: toAeX((abRect[0] + abRect[2]) / 2),
                y: toAeY((abRect[1] + abRect[3]) / 2),
                groups: [] 
            };
            for (var m = 0; m < allExtracted.length; m++) {
                var item = allExtracted[m];
                if (item.type === "shape") {
                    for (var pIdx = 0; pIdx < item.paths.length; pIdx++) {
                        var path = item.paths[pIdx];
                        for (var ptIdx = 0; ptIdx < path.pts.length; ptIdx++) {
                            path.pts[ptIdx].a[0] += (item.x - mergedShape.x);
                            path.pts[ptIdx].a[1] += (item.y - mergedShape.y);
                        }
                    }
                    mergedShape.groups.push({
                        paths: item.paths,
                        fill: item.fill,
                        stroke: item.stroke,
                        strokeWidth: item.strokeWidth
                    });
                } else if (item.type === "text") {
                    payload.layers.push(item);
                }
            }
            if (mergedShape.groups.length > 0) payload.layers.push(mergedShape);
        } else {
            payload.layers = allExtracted;
        }

        if (payload.layers.length === 0) return '{"error":"Seleção vazia."}';

        try { BridgeTalk.launch("aftereffects"); } catch(e){}
        var jsonStr = stringify(payload);
        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        var aeScriptContent = "";
        try {
            var f = new File(aeScriptPath);
            if (f.open("r")) { aeScriptContent = f.read(); f.close(); }
        } catch(e){}
        var cleanPayload = encodeURIComponent(jsonStr).replace(/\+/g, "%20");
        bt.body = aeScriptContent + "\n\nif(typeof receiveFromOverlordLite!=='undefined'){receiveFromOverlordLite('" + cleanPayload + "');}else{alert('Erro de injeção.');}";
        bt.send();
        return jsonStr;
    } catch(err) {
        return '{"error":"Erro AI: ' + err.toString() + '"}';
    }
}
