// AE_DNA_Gigante_2026.jsx
function dnaGigante() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var f = new File("C:/Users/Public/dna_premium.txt");
    if (!f.exists) { alert("Rode o script do AI primeiro!"); return; }
    f.open("r");
    var dna = f.read();
    f.close();

    var layer = comp.selectedLayers[0];
    
    app.beginUndoGroup("Injecao Gigante 2026");

    function findAndPaste(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Grad Colors") {
                
                p.selected = true;

                // O DNA GIGANTE (64 slots) - O After 2026 as vezes exige esse buffer cheio
                var fullDna = dna.split("\t");
                while(fullDna.length < 64) { fullDna.push(0); }
                var finalDnaStr = fullDna.join("\t");

                var header = "Adobe After Effects 9.0 Keyframe Data\r\n\r\n" +
                             "\tUnits Per Second\t30\r\n" +
                             "\tSource Width\t1\r\n" +
                             "\tSource Height\t1\r\n" +
                             "\tSource Pixel Aspect Ratio\t1\r\n" +
                             "\tComp Pixel Aspect Ratio\t1\r\n\r\n" +
                             "Cores\r\n" + 
                             "\tFrame\t0\t" + finalDnaStr + "\r\n\r\n" + 
                             "End of Keyframe Data";

                var tempF = new File("C:/Users/Public/clip_gigante.txt");
                tempF.open("w");
                tempF.write(header);
                tempF.close();

                var ps = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'C:\\Users\\Public\\clip_gigante.txt\' | Set-Clipboard"';
                system.callSystem(ps);
                
                $.sleep(500);
                app.executeCommand(20); // PASTE

                return true;
            }
            if (p.numProperties > 0) {
                if (findAndPaste(p)) return true;
            }
        }
        return false;
    }

    findAndApplyRecursive(layer.property("ADBE Root Vectors Group"));

    function findAndApplyRecursive(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Grad Colors") {
                p.selected = true;
                app.executeCommand(20); 
                return true;
            }
            if (p.numProperties > 0) {
                if (findAndApplyRecursive(p)) return true;
            }
        }
        return false;
    }

    app.endUndoGroup();
    alert("Injeção Gigante finalizada.\nO azul apareceu ou só criou outro keyframe?");
}
dnaGigante();
function findAndApplyRecursive(prop) {
    for (var i = 1; i <= prop.numProperties; i++) {
        var p = prop.property(i);
        if (p.matchName === "ADBE Vector Grad Colors") {
            p.selected = true;
            app.executeCommand(20); 
            return true;
        }
        if (p.numProperties > 0) {
            if (findAndApplyRecursive(p)) return true;
        }
    }
    return false;
}
