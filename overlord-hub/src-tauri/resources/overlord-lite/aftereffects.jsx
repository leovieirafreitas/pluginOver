// AE v11.0 - Perfect Sync with Tree Support
function receiveFromOverlordLite(encoded) {
    app.beginUndoGroup("Overlord Lite Import");
    try {
        var data = eval("(" + decodeURIComponent(encoded) + ")");
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return;

        // Ultrafault tolerant sets
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

        function safeSetOpacity(propParent, val) {
            try { propParent.property("ADBE Vector Group Opacity").setValue(val); return; } catch(e){}
            try { propParent.property("Opacity").setValue(val); return; } catch(e){}
            try { propParent.property("Opacidade").setValue(val); return; } catch(e){}
            try { propParent.property(11).setValue(val); return; } catch(e){}
        }

        function safeSetPath(propParent, shapeObj) {
            try { propParent.property("ADBE Vector Shape").setValue(shapeObj); return; } catch(e){}
            try { propParent.property("Path").setValue(shapeObj); return; } catch(e){}
            try { propParent.property("Caminho").setValue(shapeObj); return; } catch(e){}
            try { propParent.property(2).setValue(shapeObj); return; } catch(e){}
        }

        function safeSetBlendMode(propParent, modeStr) {
            if(!modeStr) return;
            var bm = modeStr.replace("BlendMode.", "");
            var modeInt = 1;
            if (bm === "MULTIPLY") modeInt = 2; else if (bm === "SCREEN") modeInt = 3; else if (bm === "OVERLAY") modeInt = 4;
            else if (bm === "DARKEN") modeInt = 5; else if (bm === "LIGHTEN") modeInt = 6; else if (bm === "COLORDODGE") modeInt = 7;
            else if (bm === "COLORBURN") modeInt = 8; else if (bm === "HARDLIGHT") modeInt = 9; else if (bm === "SOFTLIGHT") modeInt = 10;
            else if (bm === "DIFFERENCE") modeInt = 11; else if (bm === "EXCLUSION") modeInt = 12; else if (bm === "HUE") modeInt = 13;
            else if (bm === "SATURATION") modeInt = 14; else if (bm === "COLORBLEND") modeInt = 15; else if (bm === "LUMINOSITY") modeInt = 16;
            if (modeInt !== 1) {
                try { propParent.property("ADBE Vector Blend Mode").setValue(modeInt); } catch(e){}
                try { propParent.property("Blend Mode").setValue(modeInt); } catch(e){}
                try { propParent.property("Modo de mesclagem").setValue(modeInt); } catch(e){}
            }
        }

        if (data.command === "merged") {
            // NEW PERFECT LOGIC
            var shapeLayer = comp.layers.addShape();
            shapeLayer.name = "OBJECTS";
            shapeLayer.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width/2, comp.height/2]);
            var layerContents = shapeLayer.property("ADBE Root Vectors Group");

            function processNodeTree(node, parentGroupContents) {
                if (node.type === "group") {
                    var newGroup = parentGroupContents.addProperty("ADBE Vector Group");
                    if (node.name) newGroup.name = node.name;
                    var childContents = newGroup.property("ADBE Vectors Group");
                    for (var i = 0; i < node.items.length; i++) processNodeTree(node.items[i], childContents);
                    
                    var transform = newGroup.property("ADBE Vector Transform Group");
                    if (node.opacity !== undefined && node.opacity < 100) safeSetOpacity(transform, node.opacity);
                    if (node.blendMode) safeSetBlendMode(newGroup, node.blendMode);
                } else if (node.type === "shape") {
                    var newGroup = parentGroupContents.addProperty("ADBE Vector Group");
                    if (node.name) newGroup.name = node.name;
                    var childContents = newGroup.property("ADBE Vectors Group");

                    for (var j = 0; j < node.paths.length; j++) {
                        var p = node.paths[j];
                        var pathShp = childContents.addProperty("ADBE Vector Shape - Group");
                        pathShp.name = "Caminho " + (j + 1);
                        var shapeObj = new Shape();
                        var verts = [], inTan = [], outTan = [];
                        for (var k = 0; k < p.pts.length; k++) {
                            verts.push([p.pts[k].a[0], p.pts[k].a[1]]);
                            inTan.push([p.pts[k].i[0], p.pts[k].i[1]]);
                            outTan.push([p.pts[k].o[0], p.pts[k].o[1]]);
                        }
                        shapeObj.vertices = verts; shapeObj.inTangents = inTan; shapeObj.outTangents = outTan; shapeObj.closed = p.closed;
                        safeSetPath(pathShp, shapeObj);
                    }

                    if (node.stroke) {
                        var stroke = childContents.addProperty("ADBE Vector Graphic - Stroke");
                        safeSetColor(stroke, node.stroke.color);
                        var w = node.stroke.width !== undefined ? node.stroke.width : 1;
                        safeSetWidth(stroke, w);
                        try { stroke.property("ADBE Vector Stroke Width").expression = "try{ value / (thisLayer.transform.scale[0] / 100); }catch(e){ value; }"; } catch(e){}
                        try { stroke.property("Stroke Width").expression = "try{ value / (thisLayer.transform.scale[0] / 100); }catch(e){ value; }"; } catch(e){}
                        try { stroke.property("Largura do traçado").expression = "try{ value / (thisLayer.transform.scale[0] / 100); }catch(e){ value; }"; } catch(e){}
                        try { stroke.property(4).expression = "try{ value / (thisLayer.transform.scale[0] / 100); }catch(e){ value; }"; } catch(e){}
                    }
                    if (node.fill) {
                        var fill = childContents.addProperty("ADBE Vector Graphic - Fill");
                        safeSetColor(fill, node.fill.color);
                    }
                    if (node.opacity !== undefined && node.opacity < 100) {
                        var transform = newGroup.property("ADBE Vector Transform Group");
                        safeSetOpacity(transform, node.opacity);
                    }
                    if (node.blendMode) safeSetBlendMode(newGroup, node.blendMode);
                }
            }

            for (var i = 0; i < data.items.length; i++) processNodeTree(data.items[i], layerContents);
        } else {
            // ORIGINAL LOGIC (split_layer etc)
            var layersMap = {};
            for (var i = 0; i < data.layers.length; i++) {
                var item = data.layers[i];
                var l;
                if (item.type === "null") {
                    l = comp.layers.addNull(); l.guideLayer = true; l.name = item.name;
                    l.position.setValue([item.x, item.y]); layersMap[item.id] = l;
                } else if (item.type === "shape") {
                    l = comp.layers.addShape(); l.name = item.name;
                    if (item.parentId && layersMap[item.parentId]) l.parent = layersMap[item.parentId];
                    l.position.setValue([item.x, item.y]);
                    var g = l.property("Contents").addProperty("ADBE Vector Group");
                    for (var j = 0; j < item.paths.length; j++) {
                        var p = item.paths[j];
                        var shp = g.property("Contents").addProperty("ADBE Vector Shape - Group");
                        var shape = new Shape();
                        var v=[], it=[], ot=[];
                        for (var k=0; k<p.pts.length; k++) { v.push(p.pts[k].a); it.push(p.pts[k].i); ot.push(p.pts[k].o); }
                        shape.vertices = v; shape.inTangents = it; shape.outTangents = ot; shape.closed = p.closed;
                        shp.property("Path").setValue(shape);
                    }
                    if (item.fill) g.property("Contents").addProperty("ADBE Vector Graphic - Fill").property("Color").setValue(item.fill.color);
                    if (item.stroke) {
                        var s = g.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
                        s.property("Color").setValue(item.stroke.color);
                        s.property("Stroke Width").setValue(item.strokeWidth);
                    }
                    if (item.opacity !== undefined) l.property("Opacity").setValue(item.opacity);
                }
            }
        }
    } catch(e) { alert("Overlord Lite ERRO AE: " + e.toString()); }
    finally { app.endUndoGroup(); }
}
