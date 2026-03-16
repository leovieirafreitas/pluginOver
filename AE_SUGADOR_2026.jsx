// AE_SUGADOR_2026.jsx
function sugar() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var f = new File("C:/Users/Public/overlord_DNA_REAL.txt");
    if (!f.exists) { alert("ERRO: O arquivo do Illustrator nao foi criado!"); return; }
    
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
                app.beginUndoGroup("Injecao Brutal");
                
                // O TRUQUE: Ponte de Expressao para destravar o NO_VALUE
                p.expression = "[" + dnaArr.join(",") + "]";
                $.sleep(200);
                var val = p.value;
                p.expression = ""; 
                p.setValue(val);
                
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
        alert("Nao achei a propriedade de cor.");
    } else {
        alert("SUCESSO! A cor foi sugada do arquivo!");
    }
}
sugar();
