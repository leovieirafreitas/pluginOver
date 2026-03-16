// AI_DEBUG_CORES.jsx
function debugCores() {
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
    if (!col) { alert("ERRO: Nao achei cor de gradiente nessa selecao!"); return; }

    var stops = col.gradient.gradientStops;
    var aeData = [stops.length];
    var debugTxt = "CORES DETECTADAS:\n";

    for (var i=0; i<stops.length; i++) {
        var s = stops[i];
        var r = Math.round(s.color.red || 0);
        var g = Math.round(s.color.green || 0);
        var b = Math.round(s.color.blue || 0);
        debugTxt += "Stop " + i + ": RGB(" + r + "," + g + "," + b + ") em " + Math.round(s.rampPoint) + "%\n";
        aeData.push(s.rampPoint/100, r/255, g/255, b/255, s.midPoint/100, 1);
    }
    aeData.push(stops.length);
    for (var i=0; i<stops.length; i++) {
        aeData.push(stops[i].rampPoint/100, stops[i].opacity/100, stops[i].midPoint/100, 1);
    }

    var finalDNA = aeData.join("\t");

    // SALVA O ARQUIVO (Sem usar o Windows Clipboard)
    var f = new File("C:/Users/Public/overlord_DNA_REAL.txt");
    f.open("w");
    f.write(finalDNA);
    f.close();

    alert(debugTxt + "\nARQUIVO SALVO EM: C:\\Users\\Public\\overlord_DNA_REAL.txt\n\nAgora rode o script no After Effects.");
}
debugCores();
