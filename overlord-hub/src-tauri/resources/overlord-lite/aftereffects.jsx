// AE v6.3 - Perfect Sync
function receiveFromOverlordLite(encoded) {
    app.beginUndoGroup("Overlord 6.3");
    try {
        var data = eval("(" + decodeURIComponent(encoded) + ")");
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return;

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
    } catch(e) { alert(e); }
    finally { app.endUndoGroup(); }
}
