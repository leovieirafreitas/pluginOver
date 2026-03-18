// SVG_PARA_AFTER_2026.jsx - VERSÃO HIBRIDA (Fidelidade + Explosão)
(function() {
    var downloads = "C:/Users/FELIPE BARROSO/Downloads/";
    var svgPath = downloads + "asdaas.svg";
    var tempAi = Folder.temp.fsName + "/overlord_transfer.ai";
    
    var svgFile = new File(svgPath);
    if (!svgFile.exists) {
        alert("Arquivo não encontrado em Downloads!");
        return;
    }

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return;

    app.beginUndoGroup("Importar SVG com Fidelidade");

    // 1. Usar o Illustrator para garantir a fidelidade (resolve o problema do "null")
    var bt = new BridgeTalk();
    bt.target = "illustrator";
    
    // O script do Illustrator abre o SVG e salva um AI que o After entende perfeitamente
    bt.body = "var d = app.open(new File('" + svgPath + "'));" +
              "var o = new IllustratorSaveOptions(); o.pdfCompatible = true;" +
              "var f = new File('" + tempAi.replace(/\\/g, "/") + "');" +
              "d.saveAs(f, o); d.close(SaveOptions.DONOTSAVECHANGES); f.fsName;";
    
    bt.onResult = function(res) {
        var aiFile = new File(res.body);
        if (aiFile.exists) {
            try {
                // 2. Importar o AI gerado para o After Effects
                var io = new ImportOptions(aiFile);
                var layer = comp.layers.add(app.project.importFile(io));
                layer.moveToBeginning();
                layer.selected = true;

                // 3. Converter em Formas (Shapes)
                var cmdId = app.findMenuCommandId("Criar formas a partir da camada de vetor") || 3981;
                app.executeCommand(cmdId);
                
                var shapeLayer = comp.selectedLayers[0];
                if (shapeLayer && shapeLayer !== layer) {
                    var contents = shapeLayer.property("Contents");
                    var numGroups = contents.numProperties;

                    // 4. EXPLODIR GRUPOS
                    // Percorrer de trás para frente para manter a ordem correta
                    for (var i = numGroups; i >= 1; i--) {
                        var groupName = contents.property(i).name;
                        var newL = shapeLayer.duplicate();
                        newL.name = groupName;
                        
                        var newContents = newL.property("Contents");
                        for (var j = newContents.numProperties; j >= 1; j--) {
                            if (j !== i) newContents.property(j).remove();
                        }
                        newL.moveBefore(shapeLayer);
                    }
                    
                    // Limpeza
                    shapeLayer.remove();
                    layer.remove();
                    if (aiFile.exists) aiFile.remove();
                }
            } catch(e) {
                alert("Erro no After: " + e.toString());
            }
        }
    };
    
    bt.send();
    app.endUndoGroup();
})();
