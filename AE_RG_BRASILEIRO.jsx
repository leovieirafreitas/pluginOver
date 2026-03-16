// AE_RG_BRASILEIRO.jsx
function rgBrasileiro() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    // LÊ O AZUL QUE O AI SALVOU
    var f = new File("C:/Users/Public/overlord_DNA_REAL.txt");
    if (!f.exists) { alert("Rode o script do AI primeiro!"); return; }
    f.open("r");
    var dnaStr = f.read();
    f.close();

    var layer = comp.selectedLayers[0];
    app.beginUndoGroup("Colar Brasileiro");

    // MONTA O CLIPBOARD COM O NOME QUE O SEU AFTER ADORA
    var header = "Adobe After Effects 9.0 Keyframe Data\r\n\r\n" +
                 "\tUnits Per Second\t30\r\n" +
                 "\tSource Width\t1\r\n" +
                 "\tSource Height\t1\r\n" +
                 "\tSource Pixel Aspect Ratio\t1\r\n" +
                 "\tComp Pixel Aspect Ratio\t1\r\n\r\n" +
                 "Preenchimento de gradiente 1\t1\r\n" + // NOME EM PORTUGUÊS!
                 "\tCores\r\n" + // NOME DA PROPRIEDADE EM PORTUGUÊS!
                 "\t\tFrame\t0\t" + dnaStr + "\r\n\r\n" + 
                 "\tTipo\r\n" +
                 "\t\tFrame\t0\t1\r\n\r\n" + 
                 "\tPonto inicial\r\n" +
                 "\t\tFrame\t0\t-100\t0\r\n\r\n" +
                 "\tPonto final\r\n" +
                 "\t\tFrame\t0\t100\t0\r\n\r\n" +
                 "End of Keyframe Data";

    var tempF = new File("C:/Users/Public/clip_pt.txt");
    tempF.open("w");
    tempF.write(header);
    tempF.close();

    // Injeta no Clipboard do Windows
    var ps = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Content -Raw \'C:\\Users\\Public\\clip_pt.txt\' | Set-Clipboard"';
    system.callSystem(ps);
    $.sleep(500);

    // Tenta achar o grupo "Conteúdo" para colar
    var contents = layer.property("ADBE Root Vectors Group");
    contents.selected = true;

    // COLA! (Como se você desse Ctrl+V na mão)
    app.executeCommand(20); 

    app.endUndoGroup();
    alert("Tentei colar com nomes em Português!\nO gradiente azul apareceu agora?");
}
rgBrasileiro();
