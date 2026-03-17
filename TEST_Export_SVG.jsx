// TEST_Export_SVG.jsx - Agora usando formato .ai (mais robusto)
(function() {
    if (app.documents.length === 0 || app.selection.length === 0) {
        alert("Selecione algo no Illustrator!");
        return;
    }

    var doc = app.activeDocument;
    var tempFile = new File(Folder.temp.fsName + "/overlord_transfer.ai");
    
    app.copy();
    var tempDoc = app.documents.add(DocumentColorSpace.RGB, doc.width, doc.height);
    app.paste();
    
    // Configurações de salvamento para After Effects ler
    var saveOptions = new IllustratorSaveOptions();
    saveOptions.pdfCompatible = true; 
    saveOptions.compatibility = Compatibility.ILLUSTRATOR17; // CC
    
    try {
        tempDoc.saveAs(tempFile, saveOptions);
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);
        alert("Vetor exportado como AI temporário!\nAgora rode o script no After Effects.");
    } catch(e) {
        alert("Erro ao salvar AI: " + e.toString());
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);
    }
})();
