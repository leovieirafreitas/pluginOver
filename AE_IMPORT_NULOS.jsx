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
        function safeSetColor(propParent, val) {
            try { propParent.property("ADBE Vector Stroke Color").setValue(val); return; } catch(e){}
            try { propParent.property("ADBE Vector Fill Color").setValue(val); return; } catch(e){}
            try { propParent.property("Color").setValue(val); return; } catch(e){}
            try { propParent.property("Cor").setValue(val); return; } catch(e){}
            for(var i=1; i<=propParent.numProperties; i++) {
                var p = propParent.property(i);
                if(p.propertyValueType === 6212 || p.propertyValueType === PropertyValueType.COLOR) { try { p.setValue(val); return; } catch(e){} }
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
        function safeSetPath(propParent, shapeObj) {
            try { propParent.property("ADBE Vector Shape").setValue(shapeObj); return; } catch(e){}
            try { propParent.property("Path").setValue(shapeObj); return; } catch(e){}
            try { propParent.property("Caminho").setValue(shapeObj); return; } catch(e){}
            try { propParent.property(2).setValue(shapeObj); return; } catch(e){}
        }

        function addGuideBox(parentLayer, comp) {
            if(!(parentLayer instanceof ShapeLayer)) return;
            var children = [];
            for (var i = 1; i <= comp.layers.length; i++) {
                if (comp.layers[i].parent === parentLayer) children.push(comp.layers[i]);
            }
            if (children.length === 0) return;
            
            var bounds = null;
            for (var i = 0; i < children.length; i++) {
                var l = children[i];
                var r = l.sourceRectAtTime(0, false);
                var p = l.property("Position").value;
                var s = l.property("Scale").value;
                var lLeft = p[0] + r.left * (s[0]/100);
                var lTop = p[1] + r.top * (s[1]/100);
                var lRight = lLeft + r.width * (s[0]/100);
                var lBottom = lTop + r.height * (s[1]/100);

                if (!bounds) bounds = { left: lLeft, top: lTop, right: lRight, bottom: lBottom };
                else {
                    bounds.left = Math.min(bounds.left, lLeft);
                    bounds.top = Math.min(bounds.top, lTop);
                    bounds.right = Math.max(bounds.right, lRight);
                    bounds.bottom = Math.max(bounds.bottom, lBottom);
                }
            }
            if (bounds) {
                var w = bounds.right - bounds.left;
                var h = bounds.bottom - bounds.top;
                if (w > 0 && h > 0) {
                    var rect = parentLayer.property("Contents").addProperty("ADBE Vector Shape - Rect");
                    rect.name = "CAMPO DE GRUPO";
                    rect.property("Size").setValue([w, h]);
                    rect.property("Position").setValue([bounds.left + w/2, bounds.top + h/2]);
                }
            }
        }

        var ccX = comp.width / 2;
        var ccY = comp.height / 2;

        function processNodeToLayers(node, comp) {
            if (node.type === "group" || node.type === "merged_group") {
                // Instancia o Sub-Pseudo-Nulo sem parentesco inicialmente
                var nullLayer = comp.layers.addShape();
                nullLayer.name = node.name ? node.name : "Grupo";
                nullLayer.guideLayer = true;
                nullLayer.label = 11;
                nullLayer.property("Position").setValue([ccX, ccY]); 
                
                if (node.opacity !== undefined && node.opacity < 100) {
                    try { nullLayer.property("Opacity").setValue(node.opacity); } catch(e){}
                }

                // Cria todos os filhos (Eles retornarão ancorados perfeitamente no espaço absoluto do AE)
                var childLayers = [];
                for (var i = node.items.length - 1; i >= 0; i--) {
                    var cL = processNodeToLayers(node.items[i], comp);
                    if (cL) childLayers.push(cL);
                }

                // CENTRAMENTO DO NULO: Com todos os filhos criados absolutamente, achamos a média exata deles.
                if (childLayers.length > 0) {
                    var minX = 99999, minY = 99999, maxX = -99999, maxY = -99999;
                    for (var c=0; c<childLayers.length; c++) {
                        var cPos = childLayers[c].property("Position").value; // Pegamos a Position Absoluta (sem parent)
                        if (cPos[0] < minX) minX = cPos[0];
                        if (cPos[1] < minY) minY = cPos[1];
                        if (cPos[0] > maxX) maxX = cPos[0];
                        if (cPos[1] > maxY) maxY = cPos[1];
                    }
                    var midX = (minX + maxX) / 2;
                    var midY = (minY + maxY) / 2;

                    // Movemos o Nulo em espaço Absoluto
                    nullLayer.property("Position").setValue([midX, midY]);
                    
                    // SÓ AGORA atrelamos os filhos! O AE converte automaticamente as absolutas deles para espaço Relativo sutilmente.
                    for (var c=0; c<childLayers.length; c++) {
                        childLayers[c].parent = nullLayer;
                    }
                    addGuideBox(nullLayer, comp);
                }

                return nullLayer;

            } else if (node.type === "shape") {
                var shapeLayer = comp.layers.addShape();
                shapeLayer.name = node.name || "Vetor";
                shapeLayer.label = 4; 
                shapeLayer.property("Position").setValue([ccX, ccY]);
                
                var contents = shapeLayer.property("ADBE Root Vectors Group");
                for (var j = 0; j < node.paths.length; j++) {
                    var p = node.paths[j];
                    var pathGroup = contents.addProperty("ADBE Vector Shape - Group");
                    pathGroup.name = "Caminho " + (j + 1);
                    var shapeObj = new Shape();
                    var verts = [], inTan = [], outTan = [];
                    for (var k = 0; k < p.pts.length; k++) {
                        verts.push([p.pts[k].a[0], p.pts[k].a[1]]);
                        inTan.push([p.pts[k].i[0], p.pts[k].i[1]]);
                        outTan.push([p.pts[k].o[0], p.pts[k].o[1]]);
                    }
                    shapeObj.vertices = verts; shapeObj.inTangents = inTan; shapeObj.outTangents = outTan; shapeObj.closed = p.closed;
                    safeSetPath(pathGroup, shapeObj);
                }

                if (node.stroke) {
                    var strokeProp = contents.addProperty("ADBE Vector Graphic - Stroke");
                    safeSetColor(strokeProp, node.stroke.color);
                    var w = node.stroke.width !== undefined ? node.stroke.width : 1;
                    safeSetWidth(strokeProp, w);
                    var exp = "try{ value / (transform.scale[0] / 100); }catch(e){ value; }";
                    try { strokeProp.property("ADBE Vector Stroke Width").expression = exp; } catch(e){}
                    try { strokeProp.property("Stroke Width").expression = exp; } catch(e){}
                    try { strokeProp.property("Largura do traçado").expression = exp; } catch(e){}
                    try { strokeProp.property(4).expression = exp; } catch(e){}
                }
                if (node.fill) {
                    var fillProp = contents.addProperty("ADBE Vector Graphic - Fill");
                    safeSetColor(fillProp, node.fill.color);
                }

                // CENTRAMENTO MÁGICO DA SHAPE LAYER 
                var rect = shapeLayer.sourceRectAtTime(0, false);
                if (rect.width > 0 && rect.height > 0) {
                    var anchorX = rect.left + rect.width / 2;
                    var anchorY = rect.top + rect.height / 2;
                    shapeLayer.property("Anchor Point").setValue([anchorX, anchorY]);
                    var currentPos = shapeLayer.property("Position").value;
                    shapeLayer.property("Position").setValue([currentPos[0] + anchorX, currentPos[1] + anchorY]);
                }

                if (node.opacity !== undefined && node.opacity < 100) {
                    try { shapeLayer.property("Opacity").setValue(node.opacity); } catch(e){}
                }
                
                // Retorna ABSOLUTA, pronta pra ser guiada depois.
                return shapeLayer;
            }
            return null;
        }

        var rootChildLayers = [];
        for (var i = data.items.length - 1; i >= 0; i--) {
            var rL = processNodeToLayers(data.items[i], comp);
            if (rL) rootChildLayers.push(rL);
        }

        // CRIAR O PAI DE TODOS!
        var masterNull = comp.layers.addShape();
        masterNull.name = "MASTER (Pai de Todos)";
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
            var midX = (minX + maxX) / 2;
            var midY = (minY + maxY) / 2;

            masterNull.property("Position").setValue([midX, midY]);
            
            for (var c=0; c<rootChildLayers.length; c++) {
                rootChildLayers[c].parent = masterNull;
            }
            addGuideBox(masterNull, comp);
        } else {
            masterNull.property("Position").setValue([ccX, ccY]); 
        }

        // REMOVE A SELEÇÃO MASSIVA (Isso limpa a tela para não ofuscar com caixas laranjas!)
        for (var x = 1; x <= comp.numLayers; x++) {
            comp.layer(x).selected = false;
        }

        alert("SUCESSO IMPLACÁVEL!\nMatemática Pura! Dê um clique em qualquer pasta agora para ver a mágica do Anchor Point perfeitamente centrado.");

    } catch(err) { 
        alert("Falha:\n" + err.toString()); 
    }
    
    app.endUndoGroup();
})();
