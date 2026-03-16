// AE_Recebe_DNA_2026.jsx
function receber() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var f = new File("C:/Users/Public/dna_premium.txt");
    if (!f.exists) { alert("ERRO: O DNA do Illustrator nao foi achado!"); return; }
    
    f.open("r");
    var dnaStr = f.read();
    f.close();
    
    var dnaArr = dnaStr.split("\t");
    for(var i=0; i<dnaArr.length; i++) dnaArr[i] = parseFloat(dnaArr[i]);

    var layer = comp.selectedLayers[0];
    
    function findAndApply(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Grad Colors") {
                app.beginUndoGroup("Cura do Gradiente 2026");
                
                try {
                    // TÉCNICA SUPREMA: Se o setValue falha, a gente cria um keyframe.
                    // O After é obrigado a aceitar o valor no Keyframe.
                    p.addKey(0);
                    p.setValueAtTime(0, dnaArr);
                    
                    // Se você não quiser o keyframe, a gente deleta ele logo depois:
                    // p.removeKey(1); 
                } catch(e) {
                    alert("O After 2026 recusou o DNA de 24 numeros tbm. Erro: " + e.toString());
                }
                
                app.endUndoGroup();
                return true;
            }
            if (p.numProperties > 0) {
                if (findAndApply(p)) return true;
            }
        }
        return false;
    }

    if (!findAndApply(layer.property("ADBE Root Vectors Group"))) {
        alert("Nao achei a propriedade 'Cores'.");
    } else {
        alert("SUCESSO! O DNA Premium foi injetado.");
    }
}
receber();
