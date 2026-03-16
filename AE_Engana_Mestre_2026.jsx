// AE_Engana_Mestre_2026.jsx
function enganaMestre() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var f = new File("C:/Users/Public/dna_premium.txt");
    if (!f.exists) { alert("Rode o script do AI primeiro!"); return; }
    f.open("r");
    var dna = f.read();
    f.close();

    var layer = comp.selectedLayers[0];
    
    app.beginUndoGroup("Engana Mestre 2026");

    function findAndPaste(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Grad Colors") {
                
                // O SEGREDO DO 2026:
                // Ele so aceita colar se a propriedade estiver selecionada E visível.
                p.selected = true;
                
                // DNA Especial para o 2026 (Baseado em engenharia reversa do 9.0)
                var header = "Adobe After Effects 9.0 Keyframe Data\r\n\r\n" +
                             "\tUnits Per Second\t30\r\n" +
                             "\tSource Width\t1\r\n" +
                             "\tSource Height\t1\r\n" +
                             "\tSource Pixel Aspect Ratio\t1\r\n" +
                             "\tComp Pixel Aspect Ratio\t1\r\n\r\n" +
                             "ADBE Vector Grad Colors\r\n" + 
                             "\tFrame\t0\t2\t0\t0\t0\t" + dna + "\r\n\r\n" + 
                             "End of Keyframe Data";

                var tempF = new File("C:/Users/Public/clip_hacker.txt");
                tempF.open("w");
                tempF.write(header);
                tempF.close();

                // Injeta no Clipboard
                var ps = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'C:\\Users\\Public\\clip_hacker.txt\' | Set-Clipboard"';
                system.callSystem(ps);
                
                $.sleep(500);
                
                // Força o foco na timeline e cola
                app.executeCommand(20); 

                return true;
            }
            if (p.numProperties > 0) {
                if (findAndPaste(p)) return true;
            }
        }
        return false;
    }

    findAndPaste(layer.property("ADBE Root Vectors Group"));

    app.endUndoGroup();
    alert("Injeção Hacker finalizada.\nO azul apareceu?");
}
enganaMestre();
