// AI_Manda_DNA_2026.jsx
function mandar() {
    if (app.documents.length === 0) return;
    var sel = app.activeDocument.selection;
    if (sel.length === 0) { alert("Selecione o logo no Illustrator!"); return; }

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
    if (!col) { alert("Selecione um item com gradiente colorido."); return; }

    var stops = col.gradient.gradientStops;
    var aeData = [];

    // SEÇÃO DE COR (Formatado para 24 números no After 2026)
    aeData.push(stops.length);
    for (var i=0; i<stops.length; i++) {
        var s = stops[i];
        aeData.push(s.rampPoint/100, (s.color.red||0)/255, (s.color.green||0)/255, (s.color.blue||0)/255, s.midPoint/100, 1);
    }
    
    // SEÇÃO DE OPACIDADE
    aeData.push(stops.length);
    for (var i=0; i<stops.length; i++) {
        var s = stops[i];
        aeData.push(s.rampPoint/100, s.opacity/100, s.midPoint/100, 1);
    }

    // O PULO DO GATO: Se tiver só 2 stops, o After 2026 às vezes quer o 23º e 24º número como redundância
    while (aeData.length < 24) { aeData.push(1); }

    var finalDNA = aeData.join("\t");

    var f = new File("C:/Users/Public/dna_premium.txt");
    f.open("w");
    f.write(finalDNA);
    f.close();

    alert("DNA PREMIUM SALVO!\nRGB: " + Math.round(stops[0].color.red) + "," + Math.round(stops[0].color.green) + "\n\nAgora rode o Recebe no After.");
}
mandar();
