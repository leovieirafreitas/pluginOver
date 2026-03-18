# 🧙‍♂️ Precomp Selection (Seleção Inteligente)

A função **Precomp Selection** cria composições "sob medida" para os vetores selecionados, mantendo tudo agrupado e no local exato.

## 🚀 Como Funciona
Diferente do After Effects nativo, o **Precomp Selection** aplica um Crop automático e centraliza o Anchor Point de forma Turbo.

---

## 💻 Código Fonte (Lógica Principal)

Abaixo está a implementação otimizada que resolve os problemas de posição e hierarquia (Parenting):

```javascript
/**
 * Otimizado para After Effects 2024-2025
 * Resolve erro de NaN e lento processamento de Parenting
 */
function executePrecompNulls() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return;
    var sel = comp.selectedLayers;
    if (sel.length === 0) return;
    app.beginUndoGroup("Precomp Selection");

    try {
        var idxs = [];
        var parentsMap = [];
        
        // 1. Coleta Posição ABSOLUTA (Truque Turbo de Performance)
        for (var i = 0; i < sel.length; i++) {
            var l = sel[i];
            idxs.push(l.index);
            parentsMap.push(l.parent);
            l.parent = null; // Torna a Position Absoluta para leitura correta
        }
        
        var bounds = null;
        for (var i = 0; i < sel.length; i++) {
            var l = sel[i];
            var rect = l.sourceRectAtTime(0, false);
            var lPos = l.property("Position").value;
            var lAnchor = l.property("Anchor Point").value;
            var lScale = l.property("Scale").value;
            
            // Cálculo absoluto levando em conta Scale e Anchor Point
            var left = lPos[0] + (rect.left - lAnchor[0]) * (lScale[0]/100);
            var top = lPos[1] + (rect.top - lAnchor[1]) * (lScale[1]/100);
            var right = left + rect.width * (lScale[0]/100);
            var bottom = top + rect.height * (lScale[1]/100);
            
            if (isNaN(left) || isNaN(top)) continue;

            if (!bounds) bounds = { left: left, top: top, right: right, bottom: bottom };
            else {
                bounds.left = Math.min(bounds.left, left);
                bounds.top = Math.min(bounds.top, top);
                bounds.right = Math.max(bounds.right, right);
                bounds.bottom = Math.max(bounds.bottom, bottom);
            }
        }
        
        // 2. Restaura a Hierarquia Original
        for (var i = 0; i < sel.length; i++) {
            sel[i].parent = parentsMap[i];
        }

        if (!bounds) return;
        
        var w = Math.max(10, Math.round(bounds.right - bounds.left));
        var h = Math.max(10, Math.round(bounds.bottom - bounds.top));
        
        // 3. Precomposição com Atributos Movidos
        var newCompComp = comp.layers.precompose(idxs, sel[0].name + " Comp", true);
        newCompComp.width = w;
        newCompComp.height = h;
        
        // 4. Ajuste Interno (Apenas Root Layers para evitar erro cumulativo)
        for (var i = 1; i <= newCompComp.numLayers; i++) {
            var l = newCompComp.layer(i);
            if (!l.parent) {
                var p = l.property("Position").value;
                if (!isNaN(p[0])) {
                    l.property("Position").setValue([p[0] - bounds.left, p[1] - bounds.top]);
                }
            }
        }
        
        // 5. Centraliza o novo Precomp na Comp Master
        var layerInMaster = comp.layer(newCompComp.name);
        if (layerInMaster) {
            layerInMaster.property("Anchor Point").setValue([w/2, h/2]);
            layerInMaster.property("Position").setValue([bounds.left + w/2, bounds.top + h/2]);
            layerInMaster.collapseTransformation = true;
        }
    } catch(err) { 
        alert("PRECOMP ERROR: " + err); 
    } finally { 
        app.endUndoGroup(); 
    }
}
```

---
> [!IMPORTANT]
> O uso do `l.parent = null` temporário garante que o cálculo dos `bounds` seja preciso e imune a erros de hierarquia.
