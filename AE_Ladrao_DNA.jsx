// AE_Ladrao_DNA.jsx
function roubar() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada com a cor!"); return; }

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
    if (!pCores) { alert("Nao achei a propriedade 'Cores'!"); return; }

    // DESSALECIONA TUDO
    var selProps = comp.selectedProperties;
    for (var i = 0; i < selProps.length; i++) selProps[i].selected = false;

    // SELECIONA A COR E COPIA (Simula Ctrl+C)
    pCores.selected = true;
    app.executeCommand(19); // COPY (Ctrl+C nativo)
    
    $.sleep(500);

    // Agora vamos no Clipboard ver o que o After escreveu
    var tempPath = Folder.temp.fsName + "/segredo_ae.txt";
    var psCmd = 'powershell -NoProfile -Command "Get-Clipboard | Out-File -FilePath \'' + tempPath + '\' -Encoding UTF8"';
    system.callSystem(psCmd);
    
    $.sleep(300);
    
    var f = new File(tempPath);
    if (f.exists) {
        f.open("r");
        var conteudo = f.read();
        f.close();
        f.execute(); // ABRE O BLOCO DE NOTAS PARA VOCE
        alert("DESCOBERTO!\n\nCopie o texto que abriu no Bloco de Notas e mande aqui.\nEle tem o 'RG' real da cor no After 2026.");
    }
}
roubar();
