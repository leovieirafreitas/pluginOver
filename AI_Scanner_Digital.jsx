// AI_Scanner_Digital.jsx
function scan() {
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
    if (!col) { alert("ERRO: Nao achei gradiente colorido!"); return; }

    var stops = col.gradient.gradientStops;
    var data = [stops.length];
    for (var i=0; i<stops.length; i++) {
        var s = stops[i];
        data.push(s.rampPoint/100, (s.color.red||0)/255, (s.color.green||0)/255, (s.color.blue||0)/255, s.midPoint/100, 1);
    }
    data.push(stops.length);
    for (var i=0; i<stops.length; i++) {
        data.push(stops[i].rampPoint/100, stops[i].opacity/100, stops[i].midPoint/100, 1);
    }

    var dna = data.join("\t");
    
    // Salva o arquivo mestre
    var f = new File("C:/Users/Public/overlord_final.txt");
    f.open("w");
    f.write(dna);
    f.close();

    alert("DNA CAPTURADO!\n\n" + dna.substring(0,50) + "...\n\nArquivo salvo em C:\\Users\\Public\\overlord_final.txt");
}
scan();
