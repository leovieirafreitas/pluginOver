# Documentação: O Código Perfeito do BOTÃO "LAYER GROUP"

**Descrição:** 
Essa é a nossa obra-prima da engenharia que revolucionou o funcionamento do formato **Layer Group** (`mode === "merged"`) no `OverLabPro`. 
Ao contrário dos exportadores convencionais antigos que transformavam tudo em uma lista *flat* e perdiam bordas dos vetores vazados, essa inteligência usa o conceito de **Árvore Recursiva (Tree)** em JSON, varrendo as máscaras de corte, os caminhos compostos e até mesmo gerando "Outlines" de textos vivos instantaneamente, antes de montar a hierarquia pura perfeitamente dentro do After Effects em uma mescla inteligente.

---

## 1. O Motor do Illustrator (Dentro de `host/illustrator.jsx`)

Este código reside exatamente dentro de `executeExport` quando o usuário optou por "Layer Group" (`mode === 'merged'`).
Sua especialidade é o método **`buildTree()`** que extrai os Shapes, Compound Paths, Textos, e Symbols usando a profundidade total:

```javascript
// ====== EXPORTAÇÃO NATIVA (host/illustrator.jsx) ======
if (mode === "merged") {
    var abCenterX = (abRect[0] + abRect[2]) / 2;
    var abCenterY = (abRect[1] + abRect[3]) / 2;

    function getPathDataXY(pi) {
        if (!pi.pathPoints || pi.pathPoints.length < 2) return null;
        var pts = [];
        for (var p = 0; p < pi.pathPoints.length; p++) {
            var pt = pi.pathPoints[p];
            pts.push({ 
                a: [pt.anchor[0] - abCenterX, abCenterY - pt.anchor[1]], 
                i: [pt.leftDirection[0] - pt.anchor[0], pt.anchor[1] - pt.leftDirection[1]], 
                o: [pt.rightDirection[0] - pt.anchor[0], pt.anchor[1] - pt.rightDirection[1]] 
            });
        }
        return { pts: pts, closed: pi.closed };
    }

    function localSafeGetColor(col) {
        if (!col) return null;
        try {
            if (col.typename === "NoColor") return null;
            if (col.typename === "RGBColor") return [col.red/255, col.green/255, col.blue/255];
            if (col.typename === "CMYKColor") {
                var r = (1 - col.cyan/100) * (1 - col.black/100);
                var g = (1 - col.magenta/100) * (1 - col.black/100);
                var b = (1 - col.yellow/100) * (1 - col.black/100);
                return [r, g, b];
            }
            if (col.typename === "GrayColor") { var g = 1 - (col.gray/100); return [g, g, g]; }
            if (col.typename === "SpotColor") return localSafeGetColor(col.spot.color);
        } catch(e){}
        return null;
    }

    /* 🌲 A MÁGICA RECURSIVA OCORRE AQUI: */
    function buildTree(item) {
        if (item.hidden || (item.typename === "PathItem" && item.clipping)) return null;
        
        // 1. Textos vivos: Duplica e transforma em Path para não perder 1 pixel!
        if (item.typename === "TextFrame") {
            try {
                var dup = item.duplicate();
                var tempOutline = dup.createOutline();
                var result = buildTree(tempOutline);
                tempOutline.remove();
                return result;
            } catch(e) { return null; }
        }
        
        // 2. Simbolos e Plugins: Rompe o link mantendo os atributos puros
        if (item.typename === "SymbolItem" || item.typename === "PluginItem") {
            try {
                var dup = item.duplicate();
                if(dup.breakLink) dup.breakLink();
                var result = buildTree(dup);
                dup.remove();
                return result;
            } catch(e) { return null; }
        }
        
        // 3. Grupos: Varre a hierarquia mantendo Opacidade e BlendModes
        if (item.typename === "GroupItem") {
            var groupData = { type: "group", name: item.name || "Grupo", items: [] };
            if (item.opacity !== undefined) groupData.opacity = item.opacity;
            if (item.blendingMode) groupData.blendMode = item.blendingMode.toString();
            for (var i = 0; i < item.pageItems.length; i++) {
                var childData = buildTree(item.pageItems[i]);
                if (childData) groupData.items.push(childData);
            }
            if (groupData.items.length > 0) return groupData;
            return null;
        } else {
            // 4. Objetos Primitivos Finais:
            var paths = [];
            var hasFill = item.filled;
            var fillColObj = item.fillColor;
            var hasStroke = item.stroked;
            var strokeColObj = item.strokeColor;
            var strokeWidth = item.strokeWidth;

            if (item.typename === "PathItem") { 
                var p = getPathDataXY(item); 
                if (p) paths.push(p); 
            } else if (item.typename === "CompoundPathItem") { 
                // ✨ FIX HISTÓRICO: Puxa Bordas Ocultas em Formas Vazadas!
                for (var i = 0; i < item.pathItems.length; i++) { 
                    var childP = item.pathItems[i];
                    var p = getPathDataXY(childP); 
                    if (p) paths.push(p); 
                    
                    if (!hasFill && childP.filled) { hasFill = true; fillColObj = childP.fillColor; }
                    if (!hasStroke && childP.stroked) { hasStroke = true; strokeColObj = childP.strokeColor; strokeWidth = childP.strokeWidth; }
                }
            }
            if (paths.length === 0) return null;

            var shapeData = { type: "shape", name: item.name || "Vetor", paths: paths };
            if (item.opacity !== undefined) shapeData.opacity = item.opacity;
            if (item.blendingMode) shapeData.blendMode = item.blendingMode.toString();
            
            var fillCol = localSafeGetColor(fillColObj);
            var strokeCol = localSafeGetColor(strokeColObj);
            
            if (hasFill && fillCol !== null) shapeData.fill = { color: fillCol };
            if (hasStroke && strokeCol !== null) shapeData.stroke = { color: strokeCol, width: strokeWidth }; 
            return shapeData;
        }
    }

    var rootItems = [];
    for (var i = 0; i < sel.length; i++) {
        var node = buildTree(sel[i]);
        if (node) rootItems.push(node);
    }
    
    payload.command = "merged";
    payload.items = rootItems; // Transporta de forma separada de payload.layers
}
```

---

## 2. O Motor do After Effects (Dentro de `host/aftereffects.jsx`)

Este código reside logo após o `eval(json)`. Ele intercede a árvore pura gerada no Illustrator (`data.items`) e se recusa a invocar as matrizes problemáticas nativas do AE. 
Aqui criamos uma macroestrutura **`ADBE Vector Group`** infinita com tratamentos multi-idioma (Português, Inglês, Versão Estrita):

```javascript
// ====== IMPORTAÇÃO NATIVA (host/aftereffects.jsx) ======

if (data.command === "merged" && data.items) {
    var shapeLayer = targetComp.layers.addShape();
    shapeLayer.name = data.name || "Layer Group";
    if (data.name && data.name !== "Composição (Overlord)") shapeLayer.name = data.name;
    else shapeLayer.name = "OBJECTS";
    
    shapeLayer.property("ADBE Transform Group").property("ADBE Position").setValue([targetComp.width/2, targetComp.height/2]);
    var layerContents = shapeLayer.property("ADBE Root Vectors Group");

    //🛡️ As Funções Auxiliares Imortais (Proteção Contra Mudanças de Idiomas da Adobe)
    function safeSetColorLoc(propParent, val) {
        try { propParent.property("ADBE Vector Stroke Color").setValue(val); return; } catch(e){}
        try { propParent.property("ADBE Vector Fill Color").setValue(val); return; } catch(e){}
        try { propParent.property("Color").setValue(val); return; } catch(e){}
        try { propParent.property("Cor").setValue(val); return; } catch(e){}
        for(var i=1; i<=propParent.numProperties; i++) {
            var p = propParent.property(i);
            if(p.propertyValueType === 6212 || p.propertyValueType === PropertyValueType.COLOR) { try { p.setValue(val); return; } catch(e){} }
        }
    }
    function safeSetWidthLoc(propParent, val) {
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
    function safeSetOpacityLoc(propParent, val) {
        try { propParent.property("ADBE Vector Group Opacity").setValue(val); return; } catch(e){}
        try { propParent.property("Opacity").setValue(val); return; } catch(e){}
        try { propParent.property("Opacidade").setValue(val); return; } catch(e){}
        try { propParent.property(11).setValue(val); return; } catch(e){}
    }
    function safeSetPathLoc(propParent, shapeObj) {
        try { propParent.property("ADBE Vector Shape").setValue(shapeObj); return; } catch(e){}
        try { propParent.property("Path").setValue(shapeObj); return; } catch(e){}
        try { propParent.property("Caminho").setValue(shapeObj); return; } catch(e){}
        try { propParent.property(2).setValue(shapeObj); return; } catch(e){}
    }
    function safeSetBlendModeLoc(propParent, modeStr) {
        if(!modeStr) return;
        var bm = modeStr.replace("BlendMode.", "").replace("BlendModes.", "");
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

    /* 🧱 A FABRICAÇÃO DAS SHAPE LAYERS (Nodes) */
    function processNodeTree(node, parentGroupContents) {
        if (node.type === "group" || node.type === "merged_group") {
            var newGroup = parentGroupContents.addProperty("ADBE Vector Group");
            if (node.name) newGroup.name = node.name;
            var childContents = newGroup.property("ADBE Vectors Group");
            for (var i = 0; i < node.items.length; i++) processNodeTree(node.items[i], childContents);
            
            var transform = newGroup.property("ADBE Vector Transform Group");
            if (node.opacity !== undefined && node.opacity < 100) safeSetOpacityLoc(transform, node.opacity);
            if (node.blendMode) safeSetBlendModeLoc(newGroup, node.blendMode);
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
                safeSetPathLoc(pathShp, shapeObj);
            }

            if (node.stroke) {
                var stroke = childContents.addProperty("ADBE Vector Graphic - Stroke");
                safeSetColorLoc(stroke, node.stroke.color);
                var w = node.stroke.width !== undefined ? node.stroke.width : 1;
                safeSetWidthLoc(stroke, w);
                
                // 👀 EXPRESSÃO PROTEGIDA CONTRA ESCALA: Evita linhas mudarem de formato quando aumenta!
                try { stroke.property("ADBE Vector Stroke Width").expression = "try{ value / (thisLayer.transform.scale[0] / 100); }catch(e){ value; }"; } catch(e){}
                try { stroke.property("Stroke Width").expression = "try{ value / (thisLayer.transform.scale[0] / 100); }catch(e){ value; }"; } catch(e){}
                try { stroke.property("Largura do traçado").expression = "try{ value / (thisLayer.transform.scale[0] / 100); }catch(e){ value; }"; } catch(e){}
                try { stroke.property(4).expression = "try{ value / (thisLayer.transform.scale[0] / 100); }catch(e){ value; }"; } catch(e){}
            }
            if (node.fill) {
                var fill = childContents.addProperty("ADBE Vector Graphic - Fill");
                safeSetColorLoc(fill, node.fill.color);
            }
            if (node.opacity !== undefined && node.opacity < 100) {
                var transform = newGroup.property("ADBE Vector Transform Group");
                safeSetOpacityLoc(transform, node.opacity);
            }
            if (node.blendMode) safeSetBlendModeLoc(newGroup, node.blendMode);
        }
    }

    for (var i = 0; i < data.items.length; i++) processNodeTree(data.items[i], layerContents);
    
    // Retorna e interrompe o script antigo, garantindo pureza.
    app.endUndoGroup();
    return; 
}
```

Espero que este MD eternize a grandiosidade de manter nossos Shapes perfeitos!
