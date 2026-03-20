// AE_IMPORT_NULOS.jsx
(function() {
    var tempFile = new File(Folder.temp.fsName + "/overlord_tree_nulos.json");
    if (!tempFile.exists) return alert("Arquivo não encontrado!\nRode o script no Illustrator primeiro.");
    tempFile.open("r"); var jsonStr = tempFile.read(); tempFile.close();
    
    var data;
    try { data = eval("(" + jsonStr + ")"); } catch(e) { return alert("Erro ao ler JSON."); }

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return alert("Abra uma Composição!");

    app.beginUndoGroup("Importar Nulos Magicamente Centrados");

    try {
        function getAeBlendMode(modeStr) {
            if(!modeStr) return BlendingMode.NORMAL;
            var bm = modeStr.replace("BlendMode.", "").replace("BlendModes.", "");
            if (bm === "MULTIPLY") return BlendingMode.MULTIPLY;
            if (bm === "SCREEN") return BlendingMode.SCREEN;
            if (bm === "OVERLAY") return BlendingMode.OVERLAY;
            if (bm === "DARKEN") return BlendingMode.DARKEN;
            if (bm === "LIGHTEN") return BlendingMode.LIGHTEN;
            if (bm === "COLORDODGE") return BlendingMode.COLOR_DODGE;
            if (bm === "COLORBURN") return BlendingMode.COLOR_BURN;
            if (bm === "HARDLIGHT") return BlendingMode.HARD_LIGHT;
            if (bm === "SOFTLIGHT") return BlendingMode.SOFT_LIGHT;
            if (bm === "DIFFERENCE") return BlendingMode.DIFFERENCE;
            if (bm === "EXCLUSION") return BlendingMode.EXCLUSION;
            if (bm === "HUE") return BlendingMode.HUE;
            if (bm === "SATURATION") return BlendingMode.SATURATION;
            if (bm === "COLORBLEND") return BlendingMode.COLOR;
            if (bm === "LUMINOSITY") return BlendingMode.LUMINOSITY;
            return BlendingMode.NORMAL;
        }

        function applyFillOrStroke(shapeGroup, data, isStroke) {
            if (!data) return;
            var type = isStroke ? "ADBE Vector Graphic - Stroke" : "ADBE Vector Graphic - Fill";
            var gType = isStroke ? "ADBE Vector Graphic - G-Stroke" : "ADBE Vector Graphic - G-Fill";
            
            if (data.type === "gradient") {
                var contents = shapeGroup.property("Contents") || shapeGroup.property("Conteúdo");
                var fill = contents.addProperty(gType);
                if (data.gType) {
                    try { fill.property("Type").setValue(data.gType); } catch(e) {
                        try { fill.property("ADBE Vector Grad Type").setValue(data.gType); } catch(e){}
                    }
                }
                
                var numStops = data.stops.length;
                var aeColors = [numStops];
                for (var i = 0; i < numStops; i++) {
                    var s = data.stops[i];
                    var mid = (s.midPoint !== undefined) ? s.midPoint : 0.5;
                    aeColors.push(s.offset, s.color[0], s.color[1], s.color[2], mid, 1);
                }
                aeColors.push(numStops);
                for (var i = 0; i < numStops; i++) {
                    var s = data.stops[i];
                    aeColors.push(s.offset, (s.opacity !== undefined ? s.opacity : 1.0), 0.5, 1);
                }

                var pCores = fill.property("ADBE Vector Grad Colors") || fill.property("Colors") || fill.property("Cores");
                if (pCores) {
                    try {
                        var dna = aeColors.join(" ") + " ";
                        var clipData = "Adobe After Effects 8.0 Keyframe Data\r\n\tUnits Per Second\t30\r\n" + pCores.name + "\t1\r\n\t\tFrame\t0\t" + dna + "\r\nEnd of Keyframe Data";
                        var tempFile = new File(Folder.temp.fsName + "/overlord_dna.txt");
                        tempFile.open("w"); tempFile.encoding = "UTF-8"; tempFile.write(clipData); tempFile.close();
                        system.callSystem('powershell -NoProfile -Command "Get-Content -Raw \'' + tempFile.fsName + '\' | Set-Clipboard"');
                        $.sleep(100); pCores.selected = true; app.executeCommand(20); pCores.selected = false;
                    } catch(e) { try { pCores.setValue(aeColors); } catch(e2) {} }
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
            } else {
                var fill = shapeGroup.property("Contents").addProperty(type);
                try { fill.property("Color").setValue(data.color); } catch(e) {}
            }
            if (isStroke && data.strokeWidth) {
                try {
                    fill.property("ADBE Vector Stroke Width").setValue(data.strokeWidth);
                } catch(e) {
                    try { fill.property("Stroke Width").setValue(data.strokeWidth); } catch(e2){}
                }
            }
        }

        function safeSetWidth(propParent, val) {
            try { propParent.property("ADBE Vector Stroke Width").setValue(val); return; } catch(e){}
            try { propParent.property("Stroke Width").setValue(val); return; } catch(e){}
            try { propParent.property("Largura do traçado").setValue(val); return; } catch(e){}
            for(var i=1; i<=propParent.numProperties; i++) {
                var p = propParent.property(i);
                if(p.propertyValueType === 6214 || p.propertyValueType === PropertyValueType.OneD) { 
                    if(p.matchName.indexOf("Width") !== -1 || p.name.indexOf("Width") !== -1 || p.name.indexOf("Largura") !== -1) { try { p.setValue(val); return; } catch(e){} }
                }
            }
            try { propParent.property(4).setValue(val); return; } catch(e){}
        }

        var ccX = comp.width / 2;
        var ccY = comp.height / 2;

        function processNodeToLayers(node, comp, inheritedMask, inheritedOpacity) {
            var currentOpacity = (inheritedOpacity !== undefined) ? inheritedOpacity : 100;
            if (node.type === "group" || node.type === "merged_group") {
                var nullLayer = comp.layers.addShape();
                nullLayer.name = node.name ? node.name : "Grupo";
                nullLayer.guideLayer = true;
                nullLayer.label = 11;
                nullLayer.property("Position").setValue([ccX, ccY]); 
                
                // Calcula a opacidade real combinada do grupo
                var combinedOpacity = currentOpacity;
                if (node.opacity !== undefined) combinedOpacity = (combinedOpacity * (node.opacity / 100));

                if (node.blendMode) {
                    try { nullLayer.blendingMode = getAeBlendMode(node.blendMode); } catch(e){}
                }

                var childLayers = [];
                var activeMask = null;

                // LOOP INVERTIDO (N até 0)
                for (var i = node.items.length - 1; i >= 0; i--) {
                    var cData = node.items[i];
                    // Passa a opacidade combinada para baixo!
                    var cL = processNodeToLayers(cData, comp, inheritedMask, combinedOpacity);
                    if (cL) {
                        childLayers.push(cL);
                        if (cData.isMask) {
                            activeMask = cL;
                            cL.enabled = false;
                            cL.guideLayer = true;
                            cL.label = 5; 
                        } else if (activeMask) {
                            try { cL.setTrackMatte(activeMask, TrackMatteType.ALPHA); } catch(e){}
                        }
                    }
                }

                if (childLayers.length > 0) {
                    var minX = 99999, minY = 99999, maxX = -99999, maxY = -99999;
                    for (var c=0; c<childLayers.length; c++) {
                        var cPos = childLayers[c].property("Position").value;
                        if (cPos[0] < minX) minX = cPos[0];
                        if (cPos[1] < minY) minY = cPos[1];
                        if (cPos[0] > maxX) maxX = cPos[0];
                        if (cPos[1] > maxY) maxY = cPos[1];
                    }
                    var midX = (minX + maxX) / 2;
                    var midY = (minY + maxY) / 2;
                    
                    if (minX !== 99999) {
                        nullLayer.property("Position").setValue([midX, midY]);
                        for (var c=0; c<childLayers.length; c++) {
                            childLayers[c].parent = nullLayer;
                        }
                    }
                }
                return nullLayer;

            } else if (node.type === "shape") {
                var shapeLayer = comp.layers.addShape();
                shapeLayer.name = node.name || "Vetor";
                shapeLayer.label = 4; 
                shapeLayer.property("Position").setValue([ccX, ccY]);
                
                var contents = shapeLayer.property("ADBE Root Vectors Group");
                var mainGroup = contents.addProperty("ADBE Vector Group");
                mainGroup.name = "Conteúdo";
                var mainContents = mainGroup.property("ADBE Vectors Group");

                for (var j = 0; j < node.paths.length; j++) {
                    var p = node.paths[j];
                    var pathGroup = mainContents.addProperty("ADBE Vector Shape - Group");
                    var shapeObj = new Shape();
                    var verts = [], inTan = [], outTan = [];
                    for (var k = 0; k < p.pts.length; k++) {
                        verts.push([p.pts[k].a[0], p.pts[k].a[1]]);
                        inTan.push([p.pts[k].i[0], p.pts[k].i[1]]);
                        outTan.push([p.pts[k].o[0], p.pts[k].o[1]]);
                    }
                    shapeObj.vertices = verts; shapeObj.inTangents = inTan; shapeObj.outTangents = outTan; shapeObj.closed = p.closed;
                    try { pathGroup.property("ADBE Vector Shape").setValue(shapeObj); } catch(e){}
                }

                if (node.stroke) applyFillOrStroke(mainGroup, node.stroke, true);
                if (node.fill) applyFillOrStroke(mainGroup, node.fill, false);

                // Aplica a opacidade final (Herdada do Grupo * Opacidade do Próprio Vetor)
                var finalOpacity = currentOpacity;
                if (node.opacity !== undefined) finalOpacity = (finalOpacity * (node.opacity / 100));
                
                try { shapeLayer.property("Opacity").setValue(finalOpacity); } catch(e){}

                if (node.blendMode) {
                    try { shapeLayer.blendingMode = getAeBlendMode(node.blendMode); } catch(e){}
                }
                if (inheritedMask) {
                    try { shapeLayer.setTrackMatte(inheritedMask, TrackMatteType.ALPHA); } catch(e){}
                }

                return shapeLayer;
            }
            return null;
        }

        var rootChildLayers = [];
        // LOOP INVERTIDO (N até 0) na raiz
        for (var i = data.items.length - 1; i >= 0; i--) {
            var rL = processNodeToLayers(data.items[i], comp, null, 100);
            if (rL) rootChildLayers.push(rL);
        }

        var masterNull = comp.layers.addShape();
        masterNull.name = "MASTER";
        masterNull.guideLayer = true;
        masterNull.label = 13; 

        if (rootChildLayers.length > 0) {
            var minX = 99999, minY = 99999, maxX = -99999, maxY = -99999;
            for (var c=0; c<rootChildLayers.length; c++) {
                var cPos = rootChildLayers[c].property("Position").value;
                if (cPos[0] < minX) minX = cPos[0];
                if (cPos[1] < minY) minY = cPos[1];
                if (cPos[0] > maxX) maxX = cPos[0];
                if (cPos[1] > maxY) maxY = cPos[1];
            }
            var mX = (minX + maxX) / 2;
            var mY = (minY + maxY) / 2;
            if (minX !== 99999) {
                masterNull.property("Position").setValue([mX, mY]);
                for (var c=0; c<rootChildLayers.length; c++) {
                    rootChildLayers[c].parent = masterNull;
                }
            }
        } else {
            masterNull.property("Position").setValue([ccX, ccY]); 
        }

        for (var x = 1; x <= comp.numLayers; x++) comp.layer(x).selected = false;

        alert("SUCESSO TOTAL!");
    } catch(err) { alert("Falha:\n" + err.toString()); }
    app.endUndoGroup();
})();
