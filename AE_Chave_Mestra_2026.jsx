// AE_Chave_Mestra_2026.jsx
function chaveMestra() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var f = new File("C:/Users/Public/overlord_DNA_REAL.txt");
    if (!f.exists) { alert("ERRO: O arquivo do Illustrator nao foi achado!"); return; }
    
    f.open("r");
    var dnaStr = f.read();
    f.close();
    
    var dnaArr = dnaStr.split("\t");
    for(var i=0; i<dnaArr.length; i++) dnaArr[i] = parseFloat(dnaArr[i]);

    var layer = comp.selectedLayers[0];
    
    function findAndForce(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Grad Colors") {
                app.beginUndoGroup("Chave Mestra 2026");
                
                try {
                    // TÉCNICA 1: Injeção por Keyframe (Pula o erro de NO_VALUE)
                    p.setValuesAtTimes([0], [dnaArr]);
                    
                    // TÉCNICA 2: Se a 1 falhar, tenta o Colar com Nome Localizado (Cores)
                    if (p.numKeys === 0) {
                        var header = "Adobe After Effects 9.0 Keyframe Data\r\n\r\n" +
                                     "\tUnits Per Second\t30\r\n\r\n" +
                                     "Cores\r\n" + 
                                     "\tFrame\t0\t" + dnaStr + "\r\n\r\n" + 
                                     "End of Keyframe Data";

                        var tempF = new File("C:/Users/Public/clip_final.txt");
                        tempF.open("w");
                        tempF.write(header);
                        tempF.close();

                        var ps = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'C:\\Users\\Public\\clip_final.txt\' | Set-Clipboard"';
                        system.callSystem(ps);
                        $.sleep(400);
                        p.selected = true;
                        app.executeCommand(20); // PASTE
                    }

                    alert("Técnica aplicada!\nO azul apareceu agora?");
                } catch(e) {
                    alert("ERRO CRÍTICO: " + e.toString());
                }
                
                app.endUndoGroup();
                return true;
            }
            if (p.numProperties > 0) {
                if (findAndForce(p)) return true;
            }
        }
        return false;
    }

    findAndForce(layer.property("ADBE Root Vectors Group"));
}
chaveMestra();
