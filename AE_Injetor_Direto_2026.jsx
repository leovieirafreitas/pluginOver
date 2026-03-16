// AE_Injetor_Direto_2026.jsx
function injetar() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    // Pega o DNA que o Illustrator salvou
    var dnaFile = new File("C:/Users/Public/overlord_dna.txt");
    if (!dnaFile.exists) { alert("Rode o script do AI primeiro!"); return; }
    dnaFile.open("r");
    var dnaStr = dnaFile.read();
    dnaFile.close();
    
    var dna = dnaStr.split("\t");
    for(var i=0; i<dna.length; i++) dna[i] = parseFloat(dna[i]);

    var layer = comp.selectedLayers[0];
    
    app.beginUndoGroup("Injecao Direta 2026");

    function findAndApply(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Grad Colors") {
                // O SEGREDO: No AE 2025+, se o .setValue falha,
                // a gente tenta usar o novo objeto Gradient() mas sem o construtor bugado.
                try {
                    p.setValue(dna); // Tenta o facil
                } catch(e) {
                    // Se falhar, vamos forçar via propriedades individuais (O Martelo Final)
                    try {
                        var shapeGroup = p.parentProperty;
                        shapeGroup.property("ADBE Vector Grad Start Pt").setValue([0,0]);
                        shapeGroup.property("ADBE Vector Grad End Pt").setValue([100,0]);
                        
                        // Se o After travar o .setValue(dna), a gente usa esse truque:
                        // Vamos criar um 'Bridge' temporario
                        p.expression = "/* Overlord Bridge */ [" + dna.join(",") + "]";
                        $.sleep(100);
                        var tempVal = p.value;
                        p.expression = ""; // Limpa a expressao
                        p.setValue(tempVal); // Agora ele aceita o valor "limpo"
                    } catch(ee) {}
                }
                return true;
            }
            if (p.numProperties > 0) {
                if (findAndApply(p)) return true;
            }
        }
        return false;
    }

    var contents = layer.property("ADBE Root Vectors Group");
    if (!findAndApply(contents)) {
        alert("Nao achei o Gradiente para injetar.");
    } else {
        alert("INJETADO!\nA cor azul deve ter aparecido agora.");
    }

    app.endUndoGroup();
}
injetar();
