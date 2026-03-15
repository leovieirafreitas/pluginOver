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
        if (c.typename === "CMYKColor") {
            var cyan = c.cyan / 100;
            var magenta = c.magenta / 100;
            var yellow = c.yellow / 100;
            var black = c.black / 100;
            var r = (1 - cyan) * (1 - black);
            var g = (1 - magenta) * (1 - black);
            var b = (1 - yellow) * (1 - black);
            return [r, g, b];
        }
        if (c.typename === "GrayColor") return [1-(c.gray/100), 1-(c.gray/100), 1-(c.gray/100)];
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
                gType: (g.type === GradientType.LINEAR ? 1 : 2),
                absOrigin: [col.origin[0], col.origin[1]],
                angle: col.angle,
                length: col.length,
                highlightAngle: col.highlightAngle,
                highlightLength: col.highlightLength
            };
            for (var i = 0; i < g.gradientStops.length; i++) {
                var s = g.gradientStops[i];
                res.stops.push({
                    offset: s.rampPoint / 100,
                    color: safeGetColor(s.color),
                    opacity: s.opacity / 100,
                    midPoint: s.midPoint / 100
                });
            }
            return res;
        }
        return { type: "solid", color: safeGetColor(col) };
    } catch(e){}
    return { type: "solid", color: [0.5, 0.5, 0.5] };
}

function exportLayers(aeScriptPath, mode, pngQualityMultiplier) {
    var progressWin = null, pb = null, isCancelled = false;
    try {
        if (!app.documents || app.documents.length === 0) return '{"error":"Abra um documento!"}';
        var doc = app.activeDocument;
        var abIdx = doc.artboards.getActiveArtboardIndex();
        var abRect = doc.artboards[abIdx].artboardRect;
        var abWidth = Math.abs(abRect[2] - abRect[0]);
        var abHeight = Math.abs(abRect[1] - abRect[3]);
        
        function closeProg() {
            if (progressWin) {
                try { progressWin.hide(); } catch(e){}
                try { progressWin.close(); } catch(e){}
                progressWin = null;
            }
        }

        function sendToAe(payloadData) {
            closeProg();
            try { BridgeTalk.launch("aftereffects"); } catch(e){}
            var payloadStr = stringify(payloadData);
            var bt = new BridgeTalk();
            bt.target = "aftereffects";
            var encPayload = encodeURIComponent(payloadStr).replace(/\+/g, "%20");
            // Usando forward slashes para evitar problemas de escape
            var aePath = aeScriptPath.replace(/\\/g, "/");
            bt.body = "try { $.evalFile('" + aePath + "'); receiveFromOverlordLite('" + encPayload + "'); } catch(e) { 'Error: ' + e; }";
            bt.timeout = 10;
            bt.onResult = function(resObj) { /* opcional logic */ };
            bt.send();
            return payloadStr;
        }

        if (mode === "comp_artboard") {
            return sendToAe({ command: "comp_artboard", abWidth: abWidth, abHeight: abHeight, name: doc.name.replace(/\.[^\.]+$/, '') });
        }

        var sel = doc.selection;
        if (!sel || sel.length === undefined || sel.length === 0) {
            return '{"error":"Selecione algo!"}';
        }

        function createProg(msg) {
            if (!progressWin) {
                progressWin = new Window("palette", "Overlord Lite");
                progressWin.margins = 16;
                progressWin.spacing = 10;
                progressWin.alignChildren = ["left","top"];
                progressWin.add("statictext", undefined, msg || "Getting a whole lot of pixels...");
                pb = progressWin.add("progressbar", undefined, 0, sel.length || 1);
                pb.preferredSize.width = 300;
                var btnGroup = progressWin.add("group");
                btnGroup.alignment = "right";
                var cancelBtn = btnGroup.add("button", undefined, "Cancel");
                cancelBtn.onClick = function() {
                    isCancelled = true;
                };
                progressWin.show();
                progressWin.update();
            }
        }
        function updateProg(v) {
            if (progressWin) { try { progressWin.update(); } catch(e){} }
            if (isCancelled) { closeProg(); throw new Error("Cancelado pelo usuário."); }
            if (pb && v !== undefined) pb.value = v;
        }

        if (mode !== "rasterize") createProg();

        if (mode === "comp_selection") {
            var sel = doc.selection;
            if (!sel || sel.length === 0) return '{"error":"Selecione algo!"}';
            var b = [0,0,0,0];
            for(var s=0; s<sel.length; s++) {
                var it = sel[s].geometricBounds;
                if(s===0) b=it;
                else { b[0]=Math.min(b[0], it[0]); b[1]=Math.max(b[1], it[1]); b[2]=Math.max(b[2], it[2]); b[3]=Math.min(b[3], it[3]); }
            }
            var w = Math.abs(b[2] - b[0]);
            var h = Math.abs(b[1] - b[3]);
            
            // Re-use logic to extract layers
            var extracted = [];
            for (var i = 0; i < sel.length; i++) {
                updateProg(i + 1);
                var res = extractItem(sel[i], null);
                if (res) {
                    if (res instanceof Array) { for(var j=0; j<res.length; j++) extracted.push(res[j]); }
                    else extracted.push(res);
                }
            }
            return sendToAe({ command: "comp_selection", abWidth: w, abHeight: h, name: "Comp Seleção", layers: extracted });
        }
        
        var isMerged = (mode === "merged" || mode === "push_selection");

        var abIdx = doc.artboards.getActiveArtboardIndex();
        var abRect = doc.artboards[abIdx].artboardRect;
        var abWidth = Math.abs(abRect[2] - abRect[0]);
        var abHeight = Math.abs(abRect[1] - abRect[3]);
        
        function toAeX(x) { return x - abRect[0]; }
        function toAeY(y) { return abRect[1] - y; }

        var allExtracted = [];

        function extractItem(item, parentId) {
            updateProg();
            if (!item) return null;
            var data = { name: "" };
            try { data.name = item.name || item.typename.replace("Item", ""); } catch(e){}
            if (parentId) data.parentId = parentId;
            
            try {
                var tn = item.typename;
                
                if (tn === "TextFrame") {
                    data.type = "text";
                    data.text = item.contents;
                    var b = item.geometricBounds; 
                    data.x = toAeX((b[0] + b[2]) / 2);
                    data.y = toAeY((b[1] + b[3]) / 2);
                    try { data.opacity = item.opacity; } catch(e){}
                    try {
                        if (item.textRange && item.textRange.characterAttributes) {
                            var attrs = item.textRange.characterAttributes;
                            try { data.textFont = attrs.textFont.name; } catch(e){}
                            try { data.textSize = attrs.size; } catch(e){}
                            try { data.textFill = safeGetColor(attrs.fillColor); } catch(e){}
                            try { data.tracking = attrs.tracking; } catch(e){}
                            try { data.leading = attrs.leading; } catch(e){}
                            try { data.baselineShift = attrs.baselineShift; } catch(e){}
                        }
                        if (item.textRange && item.textRange.paragraphAttributes) {
                            var pAttrs = item.textRange.paragraphAttributes;
                            try { data.justification = pAttrs.justification.toString().replace("Justification.", ""); } catch(e){}
                        }
                    } catch(e) {}
                    return data;
                }
                
                if (tn === "GroupItem") {
                    if (isMerged) {
                        var mGroup = { type: "merged_group", name: item.name || "Grupo", items: [] };
                        try { mGroup.opacity = item.opacity; } catch(e){}
                        try { mGroup.blendingMode = item.blendingMode.toString().replace("BlendModes.", ""); } catch(e){}
                        for (var i = 0; i < item.pageItems.length; i++) {
                            var res = extractItem(item.pageItems[i], null);
                            if (res) {
                                if (res instanceof Array) { for(var k=0; k<res.length; k++) mGroup.items.push(res[k]); }
                                else { mGroup.items.push(res); }
                            }
                        }
                        if (item.clipped) mGroup.isClippingMask = true;
                        return mGroup.items.length > 0 ? mGroup : null;
                    } else {
                        var groupId = "grp_" + Math.random().toString().substr(2,6);
                        data.type = "group_parent";
                        data.id = groupId;
                        var b = item.geometricBounds; 
                        data.x = toAeX((b[0] + b[2]) / 2);
                        data.y = toAeY((b[1] + b[3]) / 2);
                        
                        // Detecção de Clipping Mask
                        if (item.clipped) data.isClippingMask = true;

                        var groupRes = [data];
                        for (var i = 0; i < item.pageItems.length; i++) {
                            var childData = extractItem(item.pageItems[i], groupId);
                            if (childData) {
                                if (item.clipped && i === 0) {
                                    if (childData instanceof Array) childData[0].isMask = true;
                                    else childData.isMask = true;
                                }
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
                    if (refItem.filled) {
                        data.fill = safeGetFill(refItem.fillColor);
                        if (data.fill && data.fill.type === "gradient") {
                             data.fill.cx = cx; data.fill.cy = cy;
                        }
                    }
                    if (refItem.stroked) {
                        data.stroke = safeGetFill(refItem.strokeColor);
                        if (data.stroke && data.stroke.type === "gradient") {
                             data.stroke.cx = cx; data.stroke.cy = cy;
                        }
                        data.strokeWidth = refItem.strokeWidth;
                        try {
                            data.strokeCap = (refItem.strokeCap === StrokeCap.ROUND ? 2 : (refItem.strokeCap === StrokeCap.PROJECTING ? 3 : 1));
                            data.strokeJoin = (refItem.strokeJoin === StrokeJoin.ROUND ? 2 : (refItem.strokeJoin === StrokeJoin.BEVEL ? 3 : 1));
                            data.miterLimit = refItem.miterLimit;
                            if (refItem.dashOffset !== undefined) {
                                data.dashOffset = refItem.dashOffset;
                                data.dashes = refItem.dashArray;
                            }
                        } catch(e){}
                    }
                    try { data.opacity = item.opacity; } catch(e){}
                    try { data.blendingMode = item.blendingMode.toString().replace("BlendModes.", ""); } catch(e){}
                    return data;
                }

                if (tn === "RasterItem" || tn === "PlacedItem") {
                    data.type = "file";
                    var b = item.geometricBounds;
                    data.x = toAeX((b[0] + b[2]) / 2);
                    data.y = toAeY((b[1] + b[3]) / 2);
                    
                    var tempFolder = new Folder(Folder.temp.fsName + "/overlord_lite");
                    if (!tempFolder.exists) tempFolder.create();
                    var tempFile = new File(tempFolder.fsName + "/image_" + new Date().getTime() + "_" + Math.floor(Math.random()*1000) + ".png");
                    
                    // Solo item to export
                    var originalSelection = doc.selection;
                    doc.selection = null;
                    item.selected = true;
                    
                    var exportOptions = new ExportOptionsPNG24();
                    exportOptions.transparency = true;
                    exportOptions.artBoardClipping = false;
                    doc.exportFile(tempFile, ExportType.PNG24, exportOptions);
                    
                    data.filePath = tempFile.fsName.replace(/\\/g, "/");
                    doc.selection = originalSelection;
                    return data;
                }
            } catch(e) {}
            return null;
        }

        var payload = { layers: [], abWidth: abWidth, abHeight: abHeight };
        
        if (mode === "push_selection") {
            for (var i = 0; i < sel.length; i++) {
                updateProg(i + 1);
                var itm = sel[i];
                var extractRes = extractItem(itm, null);
                if (!extractRes) continue;
                var extractedArr = (extractRes instanceof Array) ? extractRes : [extractRes];
                
                var b = itm.geometricBounds;
                var itemCenterX = (b[0] + b[2]) / 2;
                var itemCenterY = (b[1] + b[3]) / 2;
                
                var mShape = {
                    type: "merged_shape_layer",
                    name: itm.name || itm.typename.replace("Item", ""),
                    x: toAeX(itemCenterX),
                    y: toAeY(itemCenterY),
                    items: []
                };
                
                function adjustLocal(nodes, parentItems) {
                    for (var n = 0; n < nodes.length; n++) {
                        var it = nodes[n];
                        if (it.type === "text" || it.type === "file") {
                            payload.layers.push(it);
                        } else if (it.type === "merged_group") {
                            var newGrp = { type: "merged_group", name: it.name, items: [] };
                            if(it.opacity !== undefined) newGrp.opacity = it.opacity;
                            if(it.blendingMode !== undefined) newGrp.blendingMode = it.blendingMode;
                            adjustLocal(it.items, newGrp.items);
                            if (newGrp.items.length > 0) parentItems.push(newGrp);
                        } else if (it.type === "shape") {
                            for (var pIdx = 0; pIdx < it.paths.length; pIdx++) {
                                var path = it.paths[pIdx];
                                for (var ptIdx = 0; ptIdx < path.pts.length; ptIdx++) {
                                    path.pts[ptIdx].a[0] += (it.x - mShape.x);
                                    path.pts[ptIdx].a[1] += (it.y - mShape.y);
                                }
                            }
                            if (it.fill && it.fill.type === "gradient") {
                                it.fill.cx = itemCenterX; it.fill.cy = itemCenterY;
                            }
                            if (it.stroke && it.stroke.type === "gradient") {
                                it.stroke.cx = itemCenterX; it.stroke.cy = itemCenterY;
                            }
                            parentItems.push(it);
                        }
                    }
                }
                adjustLocal(extractedArr, mShape.items);
                if (mShape.items.length > 0) payload.layers.push(mShape);
            }
            return sendToAe(payload);
        }

        for (var i = 0; i < sel.length; i++) {
            updateProg(i + 1);
            var resArr = extractItem(sel[i], null);
            if (resArr) {
                if (resArr instanceof Array) { for(var j=0; j<resArr.length; j++) allExtracted.push(resArr[j]); }
                else { allExtracted.push(resArr); }
            }
        }

        if (mode === "rasterize") {
            var sel = doc.selection;
            if (sel.length === 0) return '{"error":"Selecione algo para rasterizar"}';
            
            var saveFile = File.saveDialog("Salvar Imagem Rasterizada", "PNG:*.png");
            if (!saveFile) return '{"error":"Cancelado pelo usuário."}';
            
            createProg("Rasterizing pixels...");
            if (pb) pb.maxvalue = sel.length || 1;
            
            var b = [0,0,0,0];
            for(var s=0; s<sel.length; s++) {
                updateProg(s + 1);
                var it = sel[s].geometricBounds;
                if(s===0) b=it;
                else { b[0]=Math.min(b[0], it[0]); b[1]=Math.max(b[1], it[1]); b[2]=Math.max(b[2], it[2]); b[3]=Math.min(b[3], it[3]); }
            }

            // High quality rasterize using active artboard temporary resizing
            var originalRect = doc.artboards[abIdx].artboardRect;
            doc.artboards[abIdx].artboardRect = b;
            
            var q = parseFloat(pngQualityMultiplier) || 2;
            var res = 72 * q;

            var exportOptions = new ExportOptionsPNG24();
            exportOptions.transparency = true;
            exportOptions.artBoardClipping = true; 
            exportOptions.antiAliasing = true;
            exportOptions.horizontalResolution = res; 
            exportOptions.verticalResolution = res;
            
            doc.exportFile(saveFile, ExportType.PNG24, exportOptions);
            
            // Restore artboard
            doc.artboards[abIdx].artboardRect = originalRect;
            
            app.activeDocument = doc;

            var rasterPayload = { 
                layers: [{
                    type: "file",
                    name: (sel.length === 1 && sel[0].name) ? sel[0].name : "Seleção Rasterizada",
                    filePath: saveFile.fsName.replace(/\\/g, "/"),
                    x: toAeX((b[0] + b[2]) / 2),
                    y: toAeY((b[1] + b[3]) / 2)
                }]
            };
            return sendToAe(rasterPayload);
        }

        if (mode === "merged") {
            var abCenterX = (abRect[0] + abRect[2]) / 2;
            var abCenterY = (abRect[1] + abRect[3]) / 2;
            var mergedShape = {
                type: "merged_shape_layer",
                name: (sel.length === 1 && sel[0].name) ? sel[0].name : "Logo Mesclado",
                x: toAeX(abCenterX),
                y: toAeY(abCenterY),
                items: [] 
            };
            
            function adjustAndSeparate(nodes, parentItems) {
                for (var i = 0; i < nodes.length; i++) {
                    var it = nodes[i];
                    if (it.type === "text" || it.type === "file") {
                        payload.layers.push(it);
                    } else if (it.type === "merged_group") {
                        var newGrp = { type: "merged_group", name: it.name, items: [] };
                        adjustAndSeparate(it.items, newGrp.items);
                        if (newGrp.items.length > 0) parentItems.push(newGrp);
                    } else if (it.type === "shape") {
                        for (var pIdx = 0; pIdx < it.paths.length; pIdx++) {
                            var path = it.paths[pIdx];
                            for (var ptIdx = 0; ptIdx < path.pts.length; ptIdx++) {
                                path.pts[ptIdx].a[0] += (it.x - mergedShape.x);
                                path.pts[ptIdx].a[1] += (it.y - mergedShape.y);
                            }
                        }
                        if (it.fill && it.fill.type === "gradient") {
                            it.fill.cx = abCenterX; it.fill.cy = abCenterY;
                        }
                        if (it.stroke && it.stroke.type === "gradient") {
                            it.stroke.cx = abCenterX; it.stroke.cy = abCenterY;
                        }
                        parentItems.push(it);
                    }
                }
            }
            adjustAndSeparate(allExtracted, mergedShape.items);
            if (mergedShape.items.length > 0) payload.layers.push(mergedShape);
        } else {
            payload.layers = allExtracted;
        }

        if (payload.layers.length === 0) return '{"error":"Seleção vazia."}';

        return sendToAe(payload);
    } catch(err) {
        if (typeof closeProg === "function") closeProg();
        var errMsg = err.toString();
        if (errMsg.indexOf("Cancelado") !== -1) {
            return '{"error":"Cancelado pelo usuário."}';
        }
        return '{"error":"Erro AI: ' + errMsg + '"}';
    }
}

function receiveFromAe(encPayload) {
    try {
        var json = decodeURIComponent(encPayload);
        var data = eval("(" + json + ")");
        if (!data.layers) return;
        
        var doc = app.activeDocument;
        var abIdx = doc.artboards.getActiveArtboardIndex();
        var abRect = doc.artboards[abIdx].artboardRect;
        
        function fromAeX(x) { return abRect[0] + x; }
        function fromAeY(y) { return abRect[1] - y; }

        function setAiColor(red, green, blue) {
            var c = new RGBColor();
            c.red = red * 255;
            c.green = green * 255;
            c.blue = blue * 255;
            return c;
        }

        function buildAiItem(item, parent) {
            if (item.type === "text") {
                var tf = parent.textFrames.add();
                tf.contents = item.text;
                tf.position = [fromAeX(item.x), fromAeY(item.y)];
                if (item.textSize) tf.textRange.characterAttributes.size = item.textSize;
                if (item.textFill && item.textFill instanceof Array) {
                    try { tf.textRange.characterAttributes.fillColor = setAiColor(item.textFill[0], item.textFill[1], item.textFill[2]); } catch(e){}
                }
            } else if (item.type === "group") {
                var g = parent.groupItems.add();
                g.name = item.name || "Grupo Pull";
                if (item.items) {
                    for (var j=0; j<item.items.length; j++) buildAiItem(item.items[j], g);
                }
            } else if (item.type === "shape") {
                var group = parent.groupItems.add();
                group.name = item.name || "Vetor Pull";
                for (var pIdx = 0; pIdx < item.paths.length; pIdx++) {
                    var pData = item.paths[pIdx];
                    var path = group.pathItems.add();
                    for (var ptIdx = 0; ptIdx < pData.pts.length; ptIdx++) {
                        var pt = pData.pts[ptIdx];
                        var newPt = path.pathPoints.add();
                        newPt.anchor = [fromAeX(item.x + pt.a[0]), fromAeY(item.y + pt.a[1])];
                        newPt.leftDirection = [fromAeX(item.x + pt.a[0] + pt.i[0]), fromAeY(item.y + pt.a[1] - pt.i[1])];
                        newPt.rightDirection = [fromAeX(item.x + pt.a[0] + pt.o[0]), fromAeY(item.y + pt.a[1] - pt.o[1])];
                    }
                    path.closed = pData.closed;
                    try {
                        if (item.fill && item.fill.color) {
                            path.fillColor = setAiColor(item.fill.color[0], item.fill.color[1], item.fill.color[2]);
                            path.filled = true;
                        } else path.filled = false;
                        if (item.strokeWidth) {
                            path.strokeWidth = item.strokeWidth;
                            path.stroked = true;
                            if (item.stroke && item.stroke.color) path.strokeColor = setAiColor(item.stroke.color[0], item.stroke.color[1], item.stroke.color[2]);
                        } else path.stroked = false;
                    } catch(e){}
                }
                if (item.opacity !== undefined) group.opacity = item.opacity;
            }
        }

        for (var i = 0; i < data.layers.length; i++) {
            buildAiItem(data.layers[i], doc);
        }
    } catch(e) {
        alert("AI Pull Error: " + e);
    }
}
