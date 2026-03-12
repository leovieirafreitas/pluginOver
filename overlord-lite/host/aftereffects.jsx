// ----------------------------------------------------
// host/aftereffects.jsx - V4.4 (Gradient Support)
// ----------------------------------------------------

function applyFillOrStroke(shapeGroup, data, isStroke) {
    if (!data) return;
    var type = isStroke ? "ADBE Vector Graphic - Stroke" : "ADBE Vector Graphic - Fill";
    var gType = isStroke ? "ADBE Vector Graphic - G-Stroke" : "ADBE Vector Graphic - G-Fill";
    
    if (data.type === "gradient") {
        var fill = shapeGroup.property("Contents").addProperty(gType);
        // data.stops: [{offset: 0, color: [r,g,b]}, ...]
        // AE Colors Array: [pos, r, g, b, ...] (stops) + alpha stops (not supported yet)
        var aeColors = [];
        for (var i = 0; i < data.stops.length; i++) {
            var s = data.stops[i];
            aeColors.push(s.offset, s.color[0], s.color[1], s.color[2]);
        }
        fill.property("Colors").setValue(aeColors);
        // Posicionamento básico do degradê (ajuste visual pode ser necessário)
        fill.property("Start Point").setValue([-50, 0]);
        fill.property("End Point").setValue([50, 0]);
        if (isStroke && data.strokeWidth) fill.property("Stroke Width").setValue(data.strokeWidth);
    } else {
        var fill = shapeGroup.property("Contents").addProperty(type);
        fill.property("Color").setValue(data.color);
        if (isStroke && data.strokeWidth) fill.property("Stroke Width").setValue(data.strokeWidth);
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

        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("⚠ Abra uma composição no After Effects.");
            app.endUndoGroup(); return;
        }

        var nulls = {}; 
        
        function buildLayer(item) {
            if (!item) return;
            var layer;

            if (item.type === "group_parent") {
                layer = comp.layers.addNull();
                layer.name = item.name || "Grupo";
                layer.property("Position").setValue([item.x, item.y]);
                nulls[item.id] = layer;
            } 
            else if (item.type === "text") {
                layer = comp.layers.addText(item.text); 
                layer.name = item.name || "Texto";
                layer.property("Position").setValue([item.x, item.y]);
                var textProp = layer.property("Source Text");
                if (textProp) {
                    var textDoc = textProp.value;
                    if (item.textSize) textDoc.fontSize = item.textSize;
                    // Text fill: data.textFill is now {type: 'solid', color: [r,g,b]} because text doesn't support grad yet
                    if (item.textFill) textDoc.fillColor = item.textFill; 
                    try { if (item.textFont) textDoc.font = item.textFont; } catch(e) {}
                    textProp.setValue(textDoc);
                }
            }
            else if (item.type === "shape") {
                layer = comp.layers.addShape();
                layer.name = item.name || "Vetor";
                layer.property("Position").setValue([item.x, item.y]);

                if (item.groups) {
                    // MODO MERGED
                    for (var g = 0; g < item.groups.length; g++) {
                        var groupData = item.groups[g];
                        var subGroup = layer.property("Contents").addProperty("ADBE Vector Group");
                        for (var i = 0; i < groupData.paths.length; i++) {
                            var pData = groupData.paths[i];
                            var pathGroup = subGroup.property("Contents").addProperty("ADBE Vector Shape - Group");
                            var shapeShape = new Shape();
                            var inTangents = [], outTangents = [], vertices = [];
                            for (var p = 0; p < pData.pts.length; p++) {
                                var pt = pData.pts[p];
                                vertices.push(pt.a);
                                inTangents.push(pt.i);
                                outTangents.push(pt.o);
                            }
                            shapeShape.vertices = vertices;
                            shapeShape.inTangents = inTangents;
                            shapeShape.outTangents = outTangents;
                            shapeShape.closed = pData.closed;
                            pathGroup.property("Path").setValue(shapeShape);
                        }
                        applyFillOrStroke(subGroup, groupData.fill, false);
                        applyFillOrStroke(subGroup, groupData.stroke, true);
                    }
                } else if (item.paths) {
                    // MODO INDIVIDUAL
                    var shapeGroup = layer.property("Contents").addProperty("ADBE Vector Group");
                    for (var i = 0; i < item.paths.length; i++) {
                        var pData = item.paths[i];
                        var pathGroup = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Group");
                        var shapeShape = new Shape();
                        var inTangents = [], outTangents = [], vertices = [];
                        for (var p = 0; p < pData.pts.length; p++) {
                            var pt = pData.pts[p];
                            vertices.push(pt.a);
                            inTangents.push(pt.i);
                            outTangents.push(pt.o);
                        }
                        shapeShape.vertices = vertices;
                        shapeShape.inTangents = inTangents;
                        shapeShape.outTangents = outTangents;
                        shapeShape.closed = pData.closed;
                        pathGroup.property("Path").setValue(shapeShape);
                    }
                    applyFillOrStroke(shapeGroup, item.fill, false);
                    applyFillOrStroke(shapeGroup, item.stroke, true);
                }
            }

            if (layer && item.parentId && nulls[item.parentId]) {
                layer.parent = nulls[item.parentId];
                // Reset local pos if parented (AE logic)
                // Layer pos is already relative to AB center, parent Null is also relative.
            }
        }

        if (data.layers && data.layers.length > 0) {
            for (var k = data.layers.length - 1; k >= 0; k--) {
                buildLayer(data.layers[k]);
            }
        }

    } catch(globalE) {
        alert("AE ERROR: " + globalE);
    } finally {
        app.endUndoGroup();
    }
}
