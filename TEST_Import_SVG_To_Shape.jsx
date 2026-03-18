// TEST_Import_SVG_To_Shape.jsx - VERSÃO FINAL (Busca ID por Nome)
(function() {
    var tempPath = Folder.temp.fsName + "/overlord_transfer.ai";
    var file = new File(tempPath);
    
    if (!file.exists) { 
        alert("Arquivo não encontrado em: " + tempPath + "\nRode o script no Illustrator primeiro!"); 
        return; 
    }

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) { 
        alert("Por favor, clique na Janela da Timeline antes de rodar."); 
        return; 
    }

    app.beginUndoGroup("Conversion via Menu Search");

    try {
        // 1. Importa .AI
        var io = new ImportOptions(file);
        var footage = app.project.importFile(io);
        var aiLayer = comp.layers.add(footage);
        aiLayer.moveToBeginning();
        
        // 2. Seleciona e foca
        for (var i=1; i<=comp.layers.length; i++) comp.layers[i].selected = false;
        aiLayer.selected = true;
        comp.openInViewer();

        // 3. Espera o AE respirar
        $.sleep(800);

        // 4. Busca o ID dinamicamente baseada no seu sistema (Português)
        var cmdName = "Criar formas a partir da camada de vetor";
        var cmdId = app.findMenuCommandId(cmdName);
        
        // Se falhar o nome em PT, tenta em EN ou usa o ID fixo
        if (cmdId === 0) cmdId = app.findMenuCommandId("Create Shapes from Vector Layer");
        if (cmdId === 0) cmdId = 3981; 

        // 5. MÁGICA
        app.executeCommand(cmdId);

        // 6. Verifica sucesso
        $.sleep(500);
        if (comp.selectedLayers.length > 0 && comp.selectedLayers[0] !== aiLayer) {
            aiLayer.remove(); // Sucesso, removemos o original
            alert("CONSEGUIMOS! Gradiente e Vetor 100% editáveis no After.");
        } else {
            alert("Importou o AI, mas a conversão automática falhou.\n\nClique com o botão direito no layer '" + aiLayer.name + "' e escolha:\nCriar > Criar formas a partir da camada de vetor.");
        }

    } catch(e) {
        alert("Falha: " + e.toString());
    }

    app.endUndoGroup();
})();
