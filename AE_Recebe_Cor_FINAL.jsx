// AE_Recebe_Cor_FINAL.jsx
function receber() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var dnaFile = new File("C:/Users/Public/overlord_dna.txt");
    if (!dnaFile.exists) { alert("ERRO: Nao achei o arquivo do Illustrator!\nVerifique se o script do AI rodou primeiro."); return; }
    
    dnaFile.open("r");
    var dna = dnaFile.read();
    dnaFile.close();

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
    if (!pCores) { alert("Ops! Selecione uma camada que tenha Gradiente."); return; }

    // DESSALECIONA PRA NÃO DAR ERRO
    for(var i=0; i<comp.selectedProperties.length; i++) comp.selectedProperties[i].selected = false;

    // MONTA O CLIPBOARD PARA AE 2026 BRASILEIRO (Cores\t1)
    var header = "Adobe After Effects 9.0 Keyframe Data\r\n\r\n" +
                 "\tUnits Per Second\t30\r\n\r\n" +
                 "Cores\t1\r\n" + 
                 "\tFrame\t0\t" + dna + "\r\n\r\n" + 
                 "End of Keyframe Data";

    var tempFile = new File("C:/Users/Public/clip_ae.txt");
    tempFile.open("w");
    tempFile.write(header);
    tempFile.close();

    // PowerShell injetando o DNA (CTRL+C AUTOMÁTICO)
    var psCmd = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'C:\\Users\\Public\\clip_ae.txt\' | Set-Clipboard"';
    system.callSystem(psCmd);
    
    $.sleep(300); 

    pCores.selected = true;
    app.executeCommand(20); // PASTE (CTRL+V AUTOMÁTICO)

    alert("INJETADO!\r\nA cor do logo deve ter aparecido agora no After Effects.");
}
receber();
