// AE_CONSTRUTOR_BR_2026.jsx
function construtorBR() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var f = new File("C:/Users/Public/dna_premium.txt");
    if (!f.exists) { alert("Rode o script do AI primeiro!"); return; }
    f.open("r");
    var dnaStr = f.read();
    f.close();

    var layer = comp.selectedLayers[0];
    var contents = layer.property("ADBE Root Vectors Group");

    app.beginUndoGroup("Construtor Brasileiro 2026");

    // 1. LIMPA O GRADIENTE VELHO (Cinzento)
    function limpar(prop) {
        for (var i = prop.numProperties; i >= 1; i--) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Graphic - G-Fill") {
                p.remove();
            } else if (p.numProperties > 0) {
                limpar(p);
            }
        }
    }
    limpar(contents);

    // 2. MONTA O "PACOTE" CLIPBOARD EM PORTUGUÊS
    // AE 2026 Brasileiro usa "Preenchimento de gradiente 1" e "Cores"
    var header = "Adobe After Effects 9.0 Keyframe Data\r\n\r\n" +
                 "\tUnits Per Second\t30\r\n" +
                 "\tSource Width\t1\r\n" +
                 "\tSource Height\t1\r\n" +
                 "\tSource Pixel Aspect Ratio\t1\r\n" +
                 "\tComp Pixel Aspect Ratio\t1\r\n\r\n" +
                 "Preenchimento de gradiente 1\t1\r\n" + // O Grupo
                 "\tCores\r\n" + // A Cor
                 "\t\tFrame\t0\t" + dnaStr + "\r\n\r\n" + 
                 "\tTipo\r\n" + 
                 "\t\tFrame\t0\t1\r\n\r\n" + // Linear
                 "\tPonto inicial\r\n" + 
                 "\t\tFrame\t0\t-100\t0\r\n\r\n" + 
                 "\tPonto final\r\n" + 
                 "\t\tFrame\t0\t100\t0\r\n\r\n" + 
                 "End of Keyframe Data";

    var tempF = new File("C:/Users/Public/clip_final_br.txt");
    tempF.open("w");
    tempF.write(header);
    tempF.close();

    // Injeta no Clipboard do Windows
    var ps = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'C:\\Users\\Public\\clip_final_br.txt\' | Set-Clipboard"';
    system.callSystem(ps);
    $.sleep(600); 

    // 3. SELECIONA O CONTEÚDO E COLA
    // Vamos tentar selecionar o Grupo 1 do CompoundPath
    try {
        var target = contents.property(1).property("ADBE Vectors Group");
        target.selected = true;
        app.executeCommand(20); // PASTE
    } catch(e) {
        // Se falhar, tenta no conteudo geral
        contents.selected = true;
        app.executeCommand(20); // PASTE
    }

    app.endUndoGroup();
    alert("O Gradiente foi reconstruído!\nO azul apareceu agora no logo?");
}
construtorBR();
