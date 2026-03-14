// ----------------------------------------------------
// host/aftereffects.jsx - V4.6 (Hierarchy Pull + Selection Comp Fix)
// ----------------------------------------------------

function applyFillOrStroke(shapeGroup, data, isStroke) {
    if (!data) return;
    var type = isStroke ? "ADBE Vector Graphic - Stroke" : "ADBE Vector Graphic - Fill";
    var gType = isStroke ? "ADBE Vector Graphic - G-Stroke" : "ADBE Vector Graphic - G-Fill";
    
    if (data.type === "gradient") {
        var fill = shapeGroup.property("Contents").addProperty(gType);
        if (data.gType) {
            try { fill.property("Type").setValue(data.gType); } catch(e) {
                try { fill.property("ADBE Vector Grad Type").setValue(data.gType); } catch(e){}
            }
        }
        
        var aeColors = [];
        var numStops = data.stops.length;
        for (var i = 0; i < numStops; i++) {
            var s = data.stops[i];
            aeColors.push(s.offset, s.color[0], s.color[1], s.color[2]);
        }
        for (var i = 0; i < numStops; i++) {
            var s = data.stops[i];
            aeColors.push(s.offset, s.opacity !== undefined ? s.opacity : 1.0);
        }

        try { fill.property("Colors").setValue(aeColors); } catch(e) {
            try { fill.property("ADBE Vector Grad Colors").setValue(aeColors); } catch(e) {}
        }

        if (data.absOrigin && data.cx !== undefined) {
             var startX = data.absOrigin[0] - data.cx;
             var startY = (data.cy - data.absOrigin[1]);
             try { fill.property("Start Point").setValue([startX, startY]); } catch(e) {}
             
             var rad = (data.angle || 0) * (Math.PI / 180);
             var endX = startX + Math.cos(-rad) * data.length;
             var endY = startY + Math.sin(-rad) * data.length;
             try { fill.property("End Point").setValue([endX, endY]); } catch(e) {}
        }

        if (isStroke && data.strokeWidth) {
            try { fill.property("Stroke Width").setValue(data.strokeWidth); } catch(e) {}
            if (data.strokeCap) try { fill.property("Line Cap").setValue(data.strokeCap); } catch(e) {}
            if (data.strokeJoin) try { fill.property("Line Join").setValue(data.strokeJoin); } catch(e) {}
        }
    } else {
        var fill = shapeGroup.property("Contents").addProperty(type);
        try { fill.property("Color").setValue(data.color); } catch(e) {
            try { fill.property("ADBE Vector Fill Color").setValue(data.color); } catch(e2) {
                try { fill.property("ADBE Vector Stroke Color").setValue(data.color); } catch(e3) {}
            }
        }
        if (isStroke && data.strokeWidth) {
            try { fill.property("Stroke Width").setValue(data.strokeWidth); } catch(e) {}
            if (data.strokeCap) try { fill.property("Line Cap").setValue(data.strokeCap); } catch(e) {}
            if (data.strokeJoin) try { fill.property("Line Join").setValue(data.strokeJoin); } catch(e) {}
        }
    }
}

function receiveFromOverlordLite(uriEncodedPayload) {
    app.beginUndoGroup("Overlord Lite Import");
    try {
        var jsonString = decodeURIComponent(uriEncodedPayload);
        var data;
        try { data = eval("(" + jsonString + ")"); } catch(e) {
            alert("Erro Invalido JSON: " + e.toString());
            app.endUndoGroup(); return;
        }

        var targetComp = app.project.activeItem;

        if (data.command === "comp_artboard" || data.command === "comp_selection") {
            var compName = data.name || "Composição (Overlord)";
            var compW = Math.max(10, Math.round(data.abWidth));
            var compH = Math.max(10, Math.round(data.abHeight));
            targetComp = app.project.items.addComp(compName, compW, compH, 1, 10, 30);
            targetComp.openInViewer();
            if (!data.layers) {
                app.endUndoGroup(); return;
            }
        }

        if (!targetComp || !(targetComp instanceof CompItem)) {
            alert("⚠ Abra uma composição no After Effects.");
            app.endUndoGroup(); return;
        }

        var nulls = {}; 
        var activeMasks = {};
        var builtItems = [];

        function buildLayer(item, comp) {
            if (!item) return null;
            var layer;

            if (item.type === "group_parent") {
                layer = comp.layers.addNull();
                layer.name = item.name || (item.isClippingMask ? "Clipping Mask" : "Grupo");
                try { layer.property("Anchor Point").setValue([50, 50]); } catch(e){}
                layer.property("Position").setValue([item.x, item.y]);
                layer.label = item.isClippingMask ? 5 : 0;
                nulls[item.id] = layer;
            } 
            else if (item.type === "text") {
                layer = comp.layers.addText(item.text || "");
                layer.name = item.name || "Texto";
                layer.property("Position").setValue([item.x, item.y]);
                var textProp = layer.property("Source Text");
                if (textProp) {
                    var textDoc = textProp.value;
                    if (item.textSize) textDoc.fontSize = item.textSize;
                    if (item.textFill) textDoc.fillColor = item.textFill;
                    if (item.textFont) try { textDoc.font = item.textFont; } catch(e) {}
                    if (item.justification) {
                        if (item.justification.indexOf("CENTER") !== -1) textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
                        else if (item.justification.indexOf("RIGHT") !== -1) textDoc.justification = ParagraphJustification.RIGHT_JUSTIFY;
                        else textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;
                    }
                    textProp.setValue(textDoc);
                }
            }
            else if (item.type === "file" && item.filePath) {
                var file = new File(item.filePath);
                if (file.exists) {
                    try {
                        var importOptions = new ImportOptions(file);
                        var footage = app.project.importFile(importOptions);
                        layer = comp.layers.add(footage);
                        layer.name = item.name || "Imagem";
                        layer.property("Position").setValue([item.x, item.y]);
                    } catch(e) {}
                }
            }
            else if (item.type === "merged_shape_layer") {
                layer = comp.layers.addShape();
                layer.name = item.name || "Logo Mesclado";
                layer.property("Position").setValue([item.x, item.y]);

                function buildMergedContents(parentElement, contentsArr) {
                    for (var i = 0; i < contentsArr.length; i++) {
                        var it = contentsArr[i];
                        if (it.type === "merged_group") {
                            var grp = parentElement.property("Contents").addProperty("ADBE Vector Group");
                            grp.name = it.name || "Grupo";
                            buildMergedContents(grp, it.items);
                        } else if (it.type === "shape") {
                            var grp = parentElement.property("Contents").addProperty("ADBE Vector Group");
                            grp.name = it.name || "Vetor";
                            for (var p = 0; p < it.paths.length; p++) {
                                var pData = it.paths[p];
                                var pathGroup = grp.property("Contents").addProperty("ADBE Vector Shape - Group");
                                var shapeShape = new Shape();
                                var inT = [], outT = [], verts = [];
                                for (var k = 0; k < pData.pts.length; k++) {
                                    verts.push(pData.pts[k].a);
                                    inT.push(pData.pts[k].i);
                                    outT.push(pData.pts[k].o);
                                }
                                shapeShape.vertices = verts;
                                shapeShape.inTangents = inT;
                                shapeShape.outTangents = outT;
                                shapeShape.closed = pData.closed;
                                pathGroup.property("Path").setValue(shapeShape);
                            }
                            applyFillOrStroke(grp, it.fill, false);
                            applyFillOrStroke(grp, it.stroke, true);
                        }
                    }
                }
                if (item.items) buildMergedContents(layer, item.items);
            }
            else if (item.type === "shape") {
                layer = comp.layers.addShape();
                layer.name = item.name || "Vetor";
                layer.property("Position").setValue([item.x, item.y]);

                if (item.paths) {
                    var grp = layer.property("Contents").addProperty("ADBE Vector Group");
                    for (var i = 0; i < item.paths.length; i++) {
                        var pData = item.paths[i];
                        var pathGroup = grp.property("Contents").addProperty("ADBE Vector Shape - Group");
                        var shapeShape = new Shape();
                        var inT = [], outT = [], verts = [];
                        for (var p = 0; p < pData.pts.length; p++) {
                            verts.push(pData.pts[p].a);
                            inT.push(pData.pts[p].i);
                            outT.push(pData.pts[p].o);
                        }
                        shapeShape.vertices = verts;
                        shapeShape.inTangents = inT;
                        shapeShape.outTangents = outT;
                        shapeShape.closed = pData.closed;
                        pathGroup.property("Path").setValue(shapeShape);
                    }
                    applyFillOrStroke(grp, item.fill, false);
                    applyFillOrStroke(grp, item.stroke, true);
                }
            }

            if (layer && item.isMask) {
                activeMasks[item.parentId || "root"] = layer;
                layer.enabled = false;
                layer.label = 5; 
            }

            if (layer && item.opacity !== undefined) {
                try { layer.property("Opacity").setValue(item.opacity); } catch(e) {}
            }
            if (layer && item.blendingMode) {
                var modeMap = { "MULTIPLY": 3, "SCREEN": 4, "OVERLAY": 5, "SOFT_LIGHT": 8, "HARD_LIGHT": 9 };
                if (modeMap[item.blendingMode]) try { layer.blendingMode = modeMap[item.blendingMode]; } catch(e) {}
            }
            return layer;
        }

        if (data.layers && data.layers.length > 0) {
            for (var k = data.layers.length - 1; k >= 0; k--) {
                var it = data.layers[k];
                var l = buildLayer(it, targetComp);
                if (l) builtItems.push({ layer: l, data: it });
            }
            for (var i = 0; i < builtItems.length; i++) {
                var b = builtItems[i];
                var layer = b.layer;
                var item = b.data;
                if (item.parentId && nulls[item.parentId]) layer.parent = nulls[item.parentId];
                if (!item.isMask && item.parentId && activeMasks[item.parentId]) {
                    try { layer.setTrackMatte(activeMasks[item.parentId], TrackMatteType.ALPHA); } catch(e) {}
                }
            }
        }
    } catch(globalE) {
        alert("AE ERROR: " + globalE);
    } finally {
        app.endUndoGroup();
    }
}

function exportToAi(aiScriptPath) {
    if (!app.project) return "Error: No project open";
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "Error: No active Comp";
    var sel = comp.selectedLayers;
    if (sel.length === 0) return "Error: No selection";

    var layersData = [];

    function extractLayerData(layer) {
        var item = { name: layer.name, x: layer.property("Position").value[0], y: layer.property("Position").value[1], opacity: layer.property("Opacity").value };
        if (layer instanceof TextLayer) {
            item.type = "text";
            item.text = layer.property("Source Text").value.text;
            item.textSize = layer.property("Source Text").value.fontSize;
            var c = layer.property("Source Text").value.fillColor;
            item.textFill = [c[0], c[1], c[2]];
        } else if (layer instanceof ShapeLayer) {
            item.type = "shape";
            item.paths = [];
            try {
                var contents = layer.property("Contents");
                for (var g = 1; g <= contents.numProperties; g++) {
                    var group = contents.property(g);
                    if (group.matchName === "ADBE Vector Group") {
                        var grpCont = group.property("Contents");
                        for (var p = 1; p <= grpCont.numProperties; p++) {
                            var prop = grpCont.property(p);
                            if (prop.matchName === "ADBE Vector Shape - Group") {
                                var shape = prop.property("Path").value;
                                var pts = [];
                                for (var k = 0; k < shape.vertices.length; k++) {
                                    pts.push({ a: shape.vertices[k], i: shape.inTangents[k], o: shape.outTangents[k] });
                                }
                                item.paths.push({ pts: pts, closed: shape.closed });
                            }
                        }
                    }
                }
            } catch(e) {}
        }
        return item;
    }

    var itemsById = {};
    for (var i = 0; i < sel.length; i++) {
        var layer = sel[i];
        var data = extractLayerData(layer);
        data.aeId = layer.index;
        itemsById[layer.index] = data;
    }

    var rootItems = [];
    for (var i = 0; i < sel.length; i++) {
        var layer = sel[i];
        var data = itemsById[layer.index];
        if (layer.parent && itemsById[layer.parent.index]) {
            var pData = itemsById[layer.parent.index];
            if (!pData.items) { pData.items = []; pData.type = "group"; }
            pData.items.push(data);
        } else {
            rootItems.push(data);
        }
    }

    var payload = { layers: rootItems };
    var jsonStr = (function(obj) {
        if (typeof obj === "string") return '"' + obj.replace(/"/g, '\\"') + '"';
        if (typeof obj === "number" || typeof obj === "boolean") return obj.toString();
        if (obj instanceof Array) {
            var r = "[";
            for(var j=0; j<obj.length; j++) { r += arguments.callee(obj[j]); if(j<obj.length-1) r+=","; }
            return r + "]";
        }
        var res = "{";
        for (var k in obj) { res += '"' + k + '":' + arguments.callee(obj[k]) + ","; }
        return res.replace(/,$/, "") + "}";
    })(payload);

    try { BridgeTalk.launch("illustrator"); } catch(e){}
    var bt = new BridgeTalk();
    bt.target = "illustrator";
    var encPayload = encodeURIComponent(jsonStr).replace(/\+/g, "%20");
    bt.body = "try { $.evalFile('" + aiScriptPath.replace(/\\/g,"/") + "'); receiveFromAe('" + encPayload + "'); } catch(e) { alert(e); }";
    bt.send();
    return "Sent " + sel.length + " layers";
}

function executePrecompNulls() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return;
    var sel = comp.selectedLayers;
    if (sel.length === 0) return;
    app.beginUndoGroup("Precomp Selection");
    try {
        var idxs = [];
        for (var i = 0; i < sel.length; i++) idxs.push(sel[i].index);
        
        var baseName = sel[0].name;
        for (var i = 0; i < sel.length; i++) {
           if (sel[i].name && sel[i].name.toLowerCase().indexOf("null") === -1 && sel[i].name !== "Grupo") {
               baseName = sel[i].name; 
               break;
           }
        }
        var novaComp = comp.layers.precompose(idxs, baseName + " Comp", true);
        var lComp = comp.layer(novaComp.name); 
        if (lComp) lComp.collapseTransformation = true;
    } catch(err) {} finally { app.endUndoGroup(); }
}

function createCompFromAeSelection() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Selecione camadas no After Effects para criar uma composição.");
        return;
    }
    var sel = comp.selectedLayers;
    if (sel.length === 0) {
        alert("Selecione pelo menos uma camada.");
        return;
    }

    app.beginUndoGroup("Criar Comp da Seleção");
    try {
        var bounds = null;
        for (var i = 0; i < sel.length; i++) {
            var l = sel[i];
            var rect = l.sourceRectAtTime(0, false);
            var lPos = l.property("Position").value;
            var lScale = l.property("Scale").value;
            
            var left = lPos[0] + rect.left * (lScale[0]/100);
            var top = lPos[1] + rect.top * (lScale[1]/100);
            var right = left + rect.width * (lScale[0]/100);
            var bottom = top + rect.height * (lScale[1]/100);
            
            if (!bounds) bounds = { left: left, top: top, right: right, bottom: bottom };
            else {
                bounds.left = Math.min(bounds.left, left);
                bounds.top = Math.min(bounds.top, top);
                bounds.right = Math.max(bounds.right, right);
                bounds.bottom = Math.max(bounds.bottom, bottom);
            }
        }
        
        var w = Math.max(10, Math.round(bounds.right - bounds.left));
        var h = Math.max(10, Math.round(bounds.bottom - bounds.top));
        
        var idxs = [];
        for (var i = 0; i < sel.length; i++) idxs.push(sel[i].index);
        
        var newCompComp = comp.layers.precompose(idxs, "Comp Seleção AE", true);
        newCompComp.width = w;
        newCompComp.height = h;
        
        for (var i = 1; i <= newCompComp.numLayers; i++) {
            var l = newCompComp.layer(i);
            var p = l.property("Position").value;
            l.property("Position").setValue([p[0] - bounds.left, p[1] - bounds.top]);
        }
        
        var layerInMaster = comp.layer("Comp Seleção AE");
        if (layerInMaster) {
            layerInMaster.property("Position").setValue([bounds.left + w/2, bounds.top + h/2]);
        }
        
    } catch(e) {
        alert("Erro ao criar comp: " + e);
    } finally {
        app.endUndoGroup();
    }
}
