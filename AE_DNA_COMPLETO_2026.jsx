// AE_DNA_COMPLETO_2026.jsx
function dnaCompleto() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var f = new File("C:/Users/Public/overlord_DNA_REAL.txt");
    if (!f.exists) { alert("Rode o script do AI primeiro!"); return; }
    
    f.open("r");
    var dnaStr = f.read();
    f.close();

    var layer = comp.selectedLayers[0];
    
    app.beginUndoGroup("Injeção de Grupo Completo");

    // MONTA O DNA DO GRUPO INTEIRO (G-Fill)
    // Isso é o que o After 2026 espera para aceitar os dados
    var header = "Adobe After Effects 9.0 Keyframe Data\r\n\r\n" +
                 "\tUnits Per Second\t30\r\n" +
                 "\tSource Width\t1\r\n" +
                 "\tSource Height\t1\r\n" +
                 "\tSource Pixel Aspect Ratio\t1\r\n" +
                 "\tComp Pixel Aspect Ratio\t1\r\n\r\n" +
                 "ADBE Vector Graphic - G-Fill\t1\r\n" + // O Grupo Inteiro!
                 "\tADBE Vector Grad Colors\r\n" + 
                 "\t\tFrame\t0\t" + dnaStr + "\r\n\r\n" + 
                 "\tADBE Vector Grad Type\r\n" +
                 "\t\tFrame\t0\t1\r\n\r\n" + // 1 = Linear
                 "\tADBE Vector Grad Start Pt\r\n" +
                 "\t\tFrame\t0\t-100\t0\r\n\r\n" +
                 "\tADBE Vector Grad End Pt\r\n" +
                 "\t\tFrame\t0\t100\t0\r\n\r\n" +
                 "End of Keyframe Data";

    var tempF = new File("C:/Users/Public/clip_grupo.txt");
    tempF.open("w");
    tempF.write(header);
    tempF.close();

    // PowerShell para injetar no sistema
    var ps = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'C:\\Users\\Public\\clip_grupo.txt\' | Set-Clipboard"';
    system.callSystem(ps);
    $.sleep(500);

    // Seleciona o grupo "Conteúdo" para colar o novo preenchimento dentro
    var contents = layer.property("ADBE Root Vectors Group");
    contents.selected = true;
    
    // Deleta o gradiente antigo pra não acumular
    function limparAntigo(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Graphic - G-Fill") {
                p.remove();
                return;
            }
            if (p.numProperties > 0) limparAntigo(p);
        }
    }
    limparAntigo(contents);

    // COLA O NOVO!
    app.executeCommand(20); // PASTE

    app.endUndoGroup();
    alert("GRUPO RE-CRIADO!\nO azul apareceu agora?\n(Se aparecer, matamos a charada!)");
}
dnaCompleto();
