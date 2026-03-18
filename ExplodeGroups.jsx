(function explodeShapeGroups() {
    app.beginUndoGroup("Explodir Grupos de Shape");

    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Abra uma composição.");
        return;
    }

    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
        alert("Selecione a camada de Vetor.");
        return;
    }

    for (var i = 0; i < selectedLayers.length; i++) {
        var mainLayer = selectedLayers[i];
        if (!(mainLayer instanceof ShapeLayer)) continue;

        var contents = mainLayer.property("Contents");
        var numTotalGroups = contents.numProperties;

        // Vamos criar uma cópia da camada para cada grupo
        for (var g = 1; g <= numTotalGroups; g++) {
            var groupName = contents.property(g).name;
            
            // Duplica a camada inteira
            var newLayer = mainLayer.duplicate();
            newLayer.name = groupName;
            
            var newContents = newLayer.property("Contents");
            
            // Remove todos os grupos QUE NÃO SÃO o grupo atual (g)
            // Precisamos fazer o loop invertido para não perder o índice
            for (var k = newContents.numProperties; k >= 1; k--) {
                if (k !== g) {
                    newContents.property(k).remove();
                }
            }
            
            newLayer.moveBefore(mainLayer);
        }

        // Esconde a original
        mainLayer.enabled = false;
        mainLayer.label = 0;
    }

    app.endUndoGroup();
    alert("Explosão concluída com sucesso!");
})();
