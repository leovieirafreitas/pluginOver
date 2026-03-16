// ----------------------------------------------------
// host/aftereffects/aftereffects.jsx - V5.5 (Recursive JSON Engine)
// ----------------------------------------------------

function applyFillOrStroke(group, data, isStroke) {
    if (!data) return;
    var type = isStroke ? "ADBE Vector Graphic - Stroke" : "ADBE Vector Graphic - Fill";
    var gType = isStroke ? "ADBE Vector Graphic - G-Stroke" : "ADBE Vector Graphic - G-Fill";
    
    if (data.type === "gradient") {
        var fill = group.property("Contents").addProperty(gType);
        var aeColors = [];
        var alphaStops = [];
        for (var i = 0; i < data.stops.length; i++) {
            var s = data.stops[i];
            aeColors.push(s.pos, s.color[0], s.color[1], s.color[2]);
            alphaStops.push(s.pos, 1.0);
        }
        var finalArr = aeColors.concat(alphaStops);
        try {
            var p = fill.property("ADBE Vector Grad Colors");
            if(!p) p = fill.property("Colors");
            p.setValue(finalArr);
        } catch(e) {}
        
        // Offset do gradiente (aproximado por enquanto)
        fill.property("ADBE Vector Grad Start Pt").setValue([0, -50]);
        fill.property("ADBE Vector Grad End Pt").setValue([0, 50]);
        
    } else {
        var fill = group.property("Contents").addProperty(type);
        var prop = isStroke ? "ADBE Vector Stroke Color" : "ADBE Vector Fill Color";
        try {
            var pSolid = fill.property(prop);
            if(!pSolid) pSolid = fill.property("Color");
            pSolid.setValue(data.color);
        } catch(e) {}
    }
    
    if (isStroke && data.width) {
        try {
            var strokeGroup = group.property("Contents").property(1); 
            strokeGroup.property("ADBE Vector Stroke Width").setValue(data.width);
            
            if (data.cap === "BUTTENDCAP") strokeGroup.property("ADBE Vector Stroke Line Cap").setValue(1);
            else if (data.cap === "ROUNDCAP") strokeGroup.property("ADBE Vector Stroke Line Cap").setValue(2);
            else if (data.cap === "PROJECTINGCAP") strokeGroup.property("ADBE Vector Stroke Line Cap").setValue(3);
            
            if (data.join === "MITERJOIN") strokeGroup.property("ADBE Vector Stroke Line Join").setValue(1);
            else if (data.join === "ROUNDJOIN") strokeGroup.property("ADBE Vector Stroke Line Join").setValue(2);
            else if (data.join === "BEVELJOIN") strokeGroup.property("ADBE Vector Stroke Line Join").setValue(3);
        } catch(e) {}
    }
}

function buildItem(comp, parentGroup, item) {
    if (!item) return;

    if (item.type === "group") {
        var subGroup = parentGroup.property("Contents").addProperty("ADBE Vector Group");
        subGroup.name = item.name;
        for (var i = 0; i < item.children.length; i++) {
            buildItem(comp, subGroup, item.children[i]);
        }
        return;
    }

    if (item.type === "shape") {
        var shapeGroup = parentGroup.property("Contents").addProperty("ADBE Vector Group");
        shapeGroup.name = item.name;
        for (var p = 0; p < item.paths.length; p++) {
            var pathData = item.paths[p];
            var aePathGroup = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Group");
            var myShape = new Shape();
            var v = [], iT = [], oT = [];
            for (var vIdx = 0; vIdx < pathData.points.length; vIdx++) {
                var pt = pathData.points[vIdx];
                v.push(pt.anchor); iT.push(pt.in); oT.push(pt.out);
            }
            myShape.vertices = v; myShape.inTangents = iT; myShape.outTangents = oT; myShape.closed = pathData.closed;
            aePathGroup.property("ADBE Vector Shape").setValue(myShape);
        }
        if (item.fill) applyFillOrStroke(shapeGroup, item.fill, false);
        if (item.stroke) applyFillOrStroke(shapeGroup, item.stroke, true);
        
        // Posicionamento local se estiver num grupo, ou global se na raiz?
        // No momento, o Illustrator exporta centros mundiais relativos à artboard.
        // Se preservarmos isso, podemos usar Transform da camada.
        shapeGroup.property("Transform").property("Position").setValue([item.x, item.y]);
        return;
    }

    if (item.type === "text") {
        var layer = comp.layers.addText(item.text || " ");
        layer.name = item.name;
        layer.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width/2 + item.x, comp.height/2 + item.y]);
        var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
        if (textProp) {
            var textDoc = textProp.value;
            if (item.font) textDoc.font = item.font;
            if (item.size) textDoc.fontSize = item.size;
            if (item.fill) textDoc.fillColor = item.fill.color;
            textProp.setValue(textDoc);
        }
    }
}

function receiveFromOverlordLite(encodedJSON) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Abra uma composição no After Effects.");
        return;
    }

    app.beginUndoGroup("Overlord Lite Build V5.5");
    try {
        var jsonStr = decodeURIComponent(encodedJSON);
        var data = eval("(" + jsonStr + ")");
        
        for (var l = 0; l < data.layers.length; l++) {
            var item = data.layers[l];
            if (item.type === "text") {
                buildItem(comp, null, item);
            } else {
                var layer = comp.layers.addShape();
                layer.name = item.name;
                layer.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width/2, comp.height/2]); 
                buildItem(comp, layer, item);
                // Se for um shape isolado vindo da raiz:
                if (item.type === "shape") {
                    layer.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width/2 + item.x, comp.height/2 + item.y]);
                    layer.property("Contents").property(1).property("Transform").property("Position").setValue([0,0]);
                }
            }
        }
    } catch(e) {
        alert("AE Error: " + e.toString());
    } finally {
        app.endUndoGroup();
    }
}
