// AE_Ponte_Magica.jsx
function ponteMagica() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada!"); return; }

    var layer = comp.selectedLayers[0];
    function findCores(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Grad Colors") return p;
            if (p.numProperties > 0) {
                var res = findCores(p);
                if (res) return res;
            }
        }
        return null;
    }

    var pCores = findCores(layer);
    if (!pCores) { alert("Nao achei 'Cores'!"); return; }

    app.beginUndoGroup("Ponte Magica");

    try {
        // ESSA É A ÚLTIMA TENTATIVA TÉCNICA:
        // Vamos aplicar uma EXPRESSÃO que define a cor.
        // Se a expressão funcionar, o After é obrigado a mostrar a cor.
        
        // Exemplo: Gradiente do seu Logo (Azul e Amarelo aproximado)
        // O formato da expressão pro 2026 é uma lista de números.
        var exp = "[2, 0, 0, 0, 0.29, 0.54, 0.5, 1, 1, 0, 0, 0, 0.5, 1, 2, 0, 1, 0.5, 1, 1, 1, 0.5, 1]";
        
        pCores.expression = exp;
        
        alert("EXPRESSÃO APLICADA!\n\nA cor mudou para o Azul/Amarelo?\n(Se mudou, eu consigo automatizar isso!)");

    } catch(e) {
        alert("ATÉ A EXPRESSÃO FALHOU!\r\nO After 2026 trancou tudo mesmo.\r\nErro: " + e.toString());
    }

    app.endUndoGroup();
}
ponteMagica();
