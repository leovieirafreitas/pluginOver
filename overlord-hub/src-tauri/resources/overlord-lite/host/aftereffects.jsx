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
        
        var numStops = data.stops.length;
        // DNA AE 2026: Exatamente 22 elementos para 2 stops
        var aeColors = [numStops];
        for (var i = 0; i < numStops; i++) {
            var s = data.stops[i];
            // Usa o midpoint real do Illustrator (ou 0.5 default)
            var mid = (s.midPoint !== undefined) ? s.midPoint : 0.5;
            var intp = (s.interp !== undefined) ? s.interp : 1;
            aeColors.push(s.offset, s.color[0], s.color[1], s.color[2], mid, intp);
        }
        aeColors.push(numStops);
        for (var i = 0; i < numStops; i++) {
            var s = data.stops[i];
            var mid = (s.midPoint !== undefined) ? s.midPoint : 0.5;
            var intp = (s.interp !== undefined) ? s.interp : 1;
            aeColors.push(s.offset, (s.opacity !== undefined ? s.opacity : 1.0), mid, intp);
        }

        var pCores = fill.property("ADBE Vector Grad Colors") || fill.property("Colors") || fill.property("Cores");
        if (pCores) {
            try {
                // AE 2025/2026 Fix: Direct Property Injection (The "Laser" Method)
                var colorName = pCores.name; 
                var dna = aeColors.join(" ") + " ";
                
                var clipData = "Adobe After Effects 8.0 Keyframe Data\r\n\r\n" +
                               "\tUnits Per Second\t30\r\n" +
                               "\tSource Width\t1\r\n" +
                               "\tSource Height\t1\r\n" +
                               "\tSource Pixel Aspect Ratio\t1\r\n" +
                               "\tComp Pixel Aspect Ratio\t1\r\n\r\n" +
                               colorName + "\t1\r\n" +
                               "\t\tFrame\t0\t" + dna + "\r\n\r\n" + 
                               "End of Keyframe Data";

                var tempFile = new File(Folder.temp.fsName + "/overlord_dna.txt");
                tempFile.open("w");
                tempFile.encoding = "UTF-8";
                tempFile.write(clipData);
                tempFile.close();

                // Robust PowerShell injection with retry/wait logic
                var psCmd = 'powershell -NoProfile -Command "Get-Content -Raw \'' + tempFile.fsName.replace(/'/g, "''") + '\' | Set-Clipboard"';
                system.callSystem(psCmd);
                
                $.sleep(250); // Aumentado para dar tempo ao Windows/AE

                // MIRAR E ATIRAR: Seleciona e Cola
                pCores.selected = true;
                app.executeCommand(20); // PASTE
                pCores.selected = false;
                
            } catch(e) {
                // Fallback para versoes antigas
                try { pCores.setValue(aeColors); } catch(e2) {}
            }
        }

        if (data.absOrigin && data.cx !== undefined) {
             var startX = data.absOrigin[0] - data.cx;
             var startY = (data.cy - data.absOrigin[1]);
             var pStart = fill.property("ADBE Vector Grad Start Pt") || fill.property("Start Point");
             if (pStart) pStart.setValue([startX, startY]);
             
             var rad = (data.angle || 0) * (Math.PI / 180);
             var endX = startX + Math.cos(-rad) * data.length;
             var endY = startY + Math.sin(-rad) * data.length;
             var pEnd = fill.property("ADBE Vector Grad End Pt") || fill.property("End Point");
             if (pEnd) pEnd.setValue([endX, endY]);
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

        // 🏗 Criação de Comp
        if (data.command === "comp_artboard" || data.command === "comp_selection") {
            var compName = data.name || "Composição (Overlord)";
            var compW = Math.max(10, Math.round(data.abWidth));
            var compH = Math.max(10, Math.round(data.abHeight));
            targetComp = app.project.items.addComp(compName, compW, compH, 1, 10, 30);
            targetComp.openInViewer();
        }

        if (!targetComp || !(targetComp instanceof CompItem)) {
            alert("⚠ Abra uma composição no After Effects.");
            app.endUndoGroup(); return;
        }

        // 🚀 MOTOR DE HIERARQUIA v11.0: Fidelidade Total (True Hierarchy + Order Fix)
        function buildAiBatch(batchData, comp) {
            var file = new File(batchData.filePath);
            if (!file.exists) return null;
            
            var io = new ImportOptions(file);
            var footage = app.project.importFile(io);
            var aiLayer = comp.layers.add(footage);
            aiLayer.moveToBeginning();
            aiLayer.name = batchData.name || "Importando...";
            
            for (var i=1; i<=comp.layers.length; i++) comp.layers[i].selected = false;
            aiLayer.selected = true;
            $.sleep(200);

            var cmdId = app.findMenuCommandId("Criar formas a partir da camada de vetor") || 3981;
            app.executeCommand(cmdId);
            
            $.sleep(1200); 
            var newShape = comp.selectedLayers[0];
            if (newShape === aiLayer) { $.sleep(1000); newShape = comp.selectedLayers[0]; }
            if (!newShape || !(newShape instanceof ShapeLayer)) return null;

            // 🧬 O Isaltor 2.0: Isolamento cirúrgico por caminho de índice
            function isolateByIndexPath(layer, idxPath) {
                var currCont = layer.property("Contents");
                for (var p = 0; p < idxPath.length; p++) {
                    var targetIdx = idxPath[p];
                    for (var d = currCont.numProperties; d >= 1; d--) {
                        if (d !== targetIdx) currCont.property(d).remove();
                    }
                    if (p < idxPath.length - 1) {
                        try { currCont = currCont.property(1).property("Contents"); } catch(e){ break; }
                    }
                }
            }

            // 🌲 O Walker Fiel: 1 Grupo AI = 1 Nulo AE (Invertido para manter a ordem)
            function walkAndExplode(propGroup, parentNull, indexPath) {
                // Percorre de baixo para cima no índice para que o "moveAfter" mantenha a ordem do topo no topo
                for (var g = propGroup.numProperties; g >= 1; g--) {
                    var prop = propGroup.property(g);
                    if (prop.matchName !== "ADBE Vector Group") continue;

                    var subContents = prop.property("Contents");
                    var subPath = indexPath.concat([g]);
                    var cleanName = prop.name.replace(/[0-9]+$/, "");
                    if (cleanName.length < 2) cleanName = prop.name;

                    // 📁 CRIA NULO PARA CADA GRUPO (Controle Total)
                    var subNull = comp.layers.addNull();
                    subNull.name = "📁 " + cleanName;
                    subNull.guideLayer = true; subNull.label = 11; // Laranja
                    subNull.parent = parentNull;
                    subNull.property("Position").setValue([0,0]);
                    subNull.moveAfter(parentNull);

                    // Verifica se tem sub-grupos
                    var hasSubGroups = false;
                    for (var s = 1; s <= subContents.numProperties; s++) {
                        if (subContents.property(s).matchName === "ADBE Vector Group") {
                            hasSubGroups = true;
                            break;
                        }
                    }

                    if (hasSubGroups) {
                        // Se tem sub-grupos, continua a árvore
                        walkAndExplode(subContents, subNull, subPath);
                    } else {
                        // ⭐ OBJETO FINAL (Shape parentada ao seu Nulo dedicado)
                        var sLayer = newShape.duplicate();
                        sLayer.name = cleanName; 
                        sLayer.label = 4; // Ciano
                        sLayer.parent = subNull;
                        isolateByIndexPath(sLayer, subPath);
                        sLayer.property("Position").setValue([0,0]);
                        sLayer.moveAfter(subNull);
                    }
                }
            }

            // Nulo Mestre da Composição
            var masterName = batchData.name || newShape.name;
            var masterNull = comp.layers.addNull();
            masterNull.name = "📁 " + masterName;
            masterNull.guideLayer = true; masterNull.label = 13; // Amarelo
            masterNull.property("Position").setValue(newShape.property("Position").value);
            masterNull.moveBefore(newShape);

            walkAndExplode(newShape.property("Contents"), masterNull, []);
            
            newShape.remove();
            aiLayer.remove();
            footage.remove();
            if (file.exists) file.remove();
            return masterNull;
        }

        // Se for um comando AI puro à moda antiga (root level)
        if (data.transferMode === "ai") {
            buildAiBatch(data, targetComp);
            app.endUndoGroup();
            return;
        }

        var nulls = {}; 
        var activeMasks = {};
        var builtItems = [];

        function buildLayer(item, comp) {
            if (!item) return null;
            var layer;

            if (item.type === "ai_batch") {
                layer = buildAiBatch(item, comp);
            }
            else if (item.type === "group_parent") {
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
            else if (item.type === "ai_transfer" && item.filePath) {
                var file = new File(item.filePath);
                if (file.exists) {
                    try {
                        var io = new ImportOptions(file);
                        var footage = app.project.importFile(io);
                        var aiLayer = comp.layers.add(footage);
                        aiLayer.name = item.name || "Vetor Profissional";
                        aiLayer.property("Position").setValue([item.x, item.y]);
                        
                        // 🚦 PAUSA PARA ESTABILIZAR
                        for (var k=1; k<=comp.layers.length; k++) comp.layers[k].selected = false;
                        aiLayer.selected = true;
                        $.sleep(100); 

                        var cmdId = app.findMenuCommandId("Criar formas a partir da camada de vetor") || 3981;
                        app.executeCommand(cmdId);
                        
                        // 🛰 AGUARDANDO CONVERSÃO
                        $.sleep(400); 
                        
                        var newShape = comp.selectedLayers[0];
                        if (newShape && newShape !== aiLayer) {
                            aiLayer.remove();
                            footage.remove();
                            // SÓ APAGA DO DISCO SE JÁ ESTIVER SEGURO
                            if (file.exists) { $.sleep(100); file.remove(); } 
                            layer = newShape;
                            layer.name = item.name;
                        } else { 
                            layer = aiLayer; 
                        }
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
                        } else if (it.type === "ai_transfer" && it.filePath) {
                            // 🚀 COPIA DE AI PARA MERGED: Importa, converte e rouba os conteúdos
                            var file = new File(it.filePath);
                            if (file.exists) {
                                try {
                                    var io = new ImportOptions(file);
                                    var footage = app.project.importFile(io);
                                    var aiLayer = targetComp.layers.add(footage); 
                                    for (var k=1; k<=targetComp.layers.length; k++) targetComp.layers[k].selected = false;
                                    aiLayer.selected = true;
                                    var cmdId = app.findMenuCommandId("Criar formas a partir da camada de vetor") || 3981;
                                    app.executeCommand(cmdId);
                                    $.sleep(400); // ⏳ Aguarda o motor do AE
                                    var newShape = targetComp.selectedLayers[0];
                                    if (newShape && newShape !== aiLayer) {
                                        var contents = newShape.property("Contents");
                                        for (var c=1; c<=contents.numProperties; c++) {
                                            contents.property(c).copyTo(parentElement.property("Contents"));
                                        }
                                        newShape.remove(); aiLayer.remove(); footage.remove();
                                        if (file.exists) { $.sleep(100); file.remove(); }
                                    }
                                } catch(e) {}
                            }
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
