// AE_Injetor_Triplo.jsx
function injetor() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada!"); return; }

    var file = new File(Folder.temp.fsName + "/overlord_lite/cor_dna.txt");
    if (!file.exists) { alert("Rode o Scanner no AI primeiro."); return; }
    file.open("r");
    var dna = file.read();
    file.close();

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
    if (!pCores) { alert("Crie um gradiente na camada primeiro."); return; }

    function tentar(versao, nomeProp) {
        var header = "Adobe After Effects " + versao + " Keyframe Data\r\n\r\n" +
                     "\tUnits Per Second\t30\r\n\r\n" +
                     nomeProp + "\r\n" + 
                     "\tFrame\t0\t" + dna + "\r\n\r\n" + 
                     "End of Keyframe Data";

        var tempFile = new File(Folder.temp.fsName + "/dna_teste.txt");
        tempFile.open("w");
        tempFile.write(header);
        tempFile.close();

        var psCmd = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'' + tempFile.fsName.replace(/'/g, "''") + '\' | Set-Clipboard"';
        system.callSystem(psCmd);
        $.sleep(300);

        pCores.selected = true;
        app.executeCommand(20); // PASTE
        return header;
    }

    app.beginUndoGroup("Tentativa Tripla");
    
    // TENTATIVA 1: Tradicional 8.0
    tentar("8.0", "ADBE Vector Grad Colors");
    
    // TENTATIVA 2: Nova Versao 9.0 (Que voce descobriu no Notepad)
    $.sleep(500);
    tentar("9.0", "ADBE Vector Grad Colors");

    // TENTATIVA 3: Localizada (Português)
    $.sleep(500);
    tentar("9.0", "Cores");

    app.endUndoGroup();

    alert("Tentei os 3 formatos!\nA cor azul apareceu agora?");
}
injetor();
