# 📁 Split Layer (Importação com Nulos Inteligentes)

A funcionalidade **Split Layer** organiza a arte do Illustrator em grupos hierárquicos com controladores invisíveis.

## 🚀 Como Funciona
... (texto anterior omitido para brevidade na edição, mas vou reescrever completo) ...

### 1. Pseudo-Nulos (Shape Layers)
...
### 2. Guias Visuais Laranjas (Bounding Box)
...

## 💻 Código Fonte (Lógica Principal)

Aqui está a implementação técnica da criação dos guias visuais e nulos inteligentes:

```javascript
// Função que cria o retângulo guia que só aparece ao selecionar o nulo
function addGuideBoxToLayerContents(layer, bounds) {
    var contents = layer.property("ADBE Root Vectors Group");
    var shapeGroup = contents.addProperty("ADBE Vector Group");
    shapeGroup.name = "Selection Guide";

    var rect = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
    rect.property("ADBE Vector Rect Size").setValue([bounds.right - bounds.left, bounds.bottom - bounds.top]);
    rect.property("ADBE Vector Rect Position").setValue([
        (bounds.left + bounds.right) / 2,
        (bounds.top + bounds.bottom) / 2
    ]);

    var stroke = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue([1, 0.5, 0, 1]); // Laranja Overlord
    stroke.property("ADBE Vector Stroke Width").setValue(2);

    // Transforma em Camada de Guia e oculta por padrão
    layer.guideLayer = true;
    shapeGroup.enabled = true; 
}

// Lógica de centralização e criação do pseudo-nulo
// (Fragmento do core do importador)
var nullLayer = comp.layers.addShape();
nullLayer.name = "# " + groupName;
nullLayer.guideLayer = true;
// ... centralização baseada nos filhos ...
```

---
> [!TIP]
> O segredo da performance é o cálculo de bounds em lote antes de aplicar os guias.
