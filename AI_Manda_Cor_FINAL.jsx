// AI_Manda_Cor_FINAL.jsx
function mandar() {
    if (app.documents.length === 0) return;
    var sel = app.activeDocument.selection;
    if (sel.length === 0) { alert("Selecione o item colorido!"); return; }

    function findGrad(item) {
        if (item.typename === "PathItem" && item.filled && item.fillColor.typename === "GradientColor") return item.fillColor;
        if (item.typename === "CompoundPathItem" && item.pathItems.length > 0) return item.pathItems[0].fillColor;
        if (item.typename === "GroupItem") {
            for (var i=0; i<item.pageItems.length; i++) {
                var res = findGrad(item.pageItems[i]);
                if (res) return res;
            }
        }
        return null;
    }

    var col = findGrad(sel[0]);
    if (!col) { alert("Nao achei gradiente colorido!"); return; }

    var stops = col.gradient.gradientStops;
    var aeData = [stops.length];

    for (var i=0; i<stops.length; i++) {
        var s = stops[i];
        aeData.push(s.rampPoint/100, (s.color.red||0)/255, (s.color.green||0)/255, (s.color.blue||0)/255, s.midPoint/100, 1);
    }
    aeData.push(stops.length);
    for (var i=0; i<stops.length; i++) {
        var s = stops[i];
        aeData.push(s.rampPoint/100, s.opacity/100, s.midPoint/100, 1);
    }

    var dna = aeData.join("\t");
    
    // SALVANDO NUM LUGAR FIXO: C:\Users\Public
    var dnaFile = new File("C:/Users/Public/overlord_dna.txt");
    dnaFile.open("w");
    dnaFile.write(dna);
    dnaFile.close();

    alert("COR SALVA COM SUCESSO!\nCaminho: C:\\Users\\Public\\overlord_dna.txt\n\nAgora rode o script no After Effects.");
}
mandar();
