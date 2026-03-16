// AE_Reset_Gradiente.jsx
function resetGradiente() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada!"); return; }

    var layer = comp.selectedLayers[0];
    var contents = layer.property("ADBE Root Vectors Group");
    
    // Procura o grupo onde o gradiente está
    function findAndReset(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            
            // Se achou um Gradiente, vamos tentar "Resetar"
            if (p.matchName === "ADBE Vector Graphic - G-Fill") {
                var parent = p.parentProperty;
                p.remove(); // DELETA O GRADIENTE CINZA
                
                // ADICIONA UM NOVO DO ZERO
                var newFill = parent.addProperty("ADBE Vector Graphic - G-Fill");
                return newFill.property("ADBE Vector Grad Colors");
            }

            if (p.numProperties > 0) {
                var res = findAndReset(p);
                if (res) return res;
            }
        }
        return null;
    }

    app.beginUndoGroup("Reset Total de Gradiente");

    var pCores = findAndReset(contents);
    if (!pCores) { 
        // Se nao achou gradiente pra deletar, tenta apenas criar um no primeiro grupo
        try {
            var g = contents.property(1).property("ADBE Vectors Group");
            var newFill = g.addProperty("ADBE Vector Graphic - G-Fill");
            pCores = newFill.property("ADBE Vector Grad Colors");
        } catch(e) {
            alert("Nao consegui criar um novo Gradiente.");
            return;
        }
    }

    // AGORA TENTA A INJEÇÃO DE CLIPBOARD NOVO (9.0)
    var file = new File(Folder.temp.fsName + "/overlord_lite/cor_dna.txt");
    if (!file.exists) { alert("Scanner do AI nao rodou!"); return; }
    file.open("r");
    var dna = file.read();
    file.close();

    var header = "Adobe After Effects 9.0 Keyframe Data\r\n\r\n" +
                 "\tUnits Per Second\t30\r\n" +
                 "\tSource Width\t1\r\n" +
                 "\tSource Height\t1\r\n" +
                 "\tSource Pixel Aspect Ratio\t1\r\n" +
                 "\tComp Pixel Aspect Ratio\t1\r\n\r\n" +
                 "ADBE Vector Grad Colors\r\n" + 
                 "\tFrame\t0\t" + dna + "\r\n\r\n" + 
                 "End of Keyframe Data";

    var tempFile = new File(Folder.temp.fsName + "/dna_nuclear.txt");
    tempFile.open("w");
    tempFile.write(header);
    tempFile.close();

    var psCmd = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'' + tempFile.fsName.replace(/'/g, "''") + '\' | Set-Clipboard"';
    system.callSystem(psCmd);
    
    $.sleep(400); 

    pCores.selected = true;
    app.executeCommand(20); // PASTE no gradiente novo

    app.endUndoGroup();
    alert("GRADIENTE RE-CRIADO!\nSe ele continua cinza, o After 2026 mudou o DNA dos numeros.");
}
resetGradiente();
