// AE_Mestre_De_Obras.jsx
function mestre() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var f = new File("C:/Users/Public/overlord_final.txt");
    if (!f.exists) { alert("Rode o script do AI primeiro!"); return; }
    f.open("r");
    var dna = f.read();
    f.close();

    var layer = comp.selectedLayers[0];
    app.beginUndoGroup("Restaurar Gradiente");

    // MONTA O "PACOTE" PARA O AFTER 2026 BRASILEIRO
    var header = "Adobe After Effects 9.0 Keyframe Data\r\n\r\n" +
                 "\tUnits Per Second\t30\r\n\r\n" +
                 "Preenchimento de gradiente 1\t1\r\n" + 
                 "\tCores\r\n" + 
                 "\t\tFrame\t0\t2\t0\t0\t0\t" + dna + "\r\n\r\n" + // Adicionado prefixo '2 0 0 0' comum no 2026
                 "\tTipo\r\n" + 
                 "\t\tFrame\t0\t1\r\n\r\n" + 
                 "\tPonto inicial\r\n" + 
                 "\t\tFrame\t0\t-100\t0\r\n\r\n" + 
                 "\tPonto final\r\n" + 
                 "\t\tFrame\t0\t100\t0\r\n\r\n" + 
                 "End of Keyframe Data";

    var tempF = new File("C:/Users/Public/cola_final.txt");
    tempF.open("w");
    tempF.write(header);
    tempF.close();

    // PowerShell para injetar no Clipboard
    var ps = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'C:\\Users\\Public\\cola_final.txt\' | Set-Clipboard"';
    system.callSystem(ps);
    $.sleep(500);

    // Tenta achar o grupo "Conteúdo" para colar
    var contents = layer.property("ADBE Root Vectors Group");
    
    // Se o gradiente sumiu, vamos selecionar o Conteudo do Grupo 1
    try {
        var group1 = contents.property(1).property("ADBE Vectors Group");
        group1.selected = true;
    } catch(e) {
        contents.selected = true;
    }

    // COLA!
    app.executeCommand(20); 

    app.endUndoGroup();
    alert("OBRA FINALIZADA!\nO gradiente azul voltou para o logo?");
}
mestre();
