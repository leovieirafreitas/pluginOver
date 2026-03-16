// ----------------------------------------------------
// host/photoshop.jsx - V3.0 (PSD Bridge)
// ----------------------------------------------------

function stringify(obj) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (typeof obj === "string") return '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
    if (typeof obj === "number" || typeof obj === "boolean") return obj.toString();
    if (obj instanceof Array) {
        var res = "[";
        for (var i=0; i<obj.length; i++) { res += stringify(obj[i]); if (i < obj.length - 1) res += ","; }
        return res + "]";
    }
    if (typeof obj === "object") {
        var res = "{", first = true;
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                if (!first) res += ",";
                res += '"' + k + '":' + stringify(obj[k]);
                first = false;
            }
        }
        return res + "}";
    }
    return '""';
}

function exportLayersPhotoshop(aeScriptPath) {
    try {
        if (!app.documents || app.documents.length === 0) {
            return '{"error": "⚠ Abra um arquivo no Photoshop."}';
        }
        
        var doc = app.activeDocument;

        try { BridgeTalk.launch("aftereffects"); } catch(ignore) {}

        // Cria uma cópia inteira do documento mantendo as camadas para o After Effects
        // Em versões completas do Overlord usamos ActionManager para isolar as layers.
        var tempDoc = doc.duplicate("Export_Overlord_" + new Date().getTime(), false);
        
        // Salva documento como .psd num diretório temporário //
        var psdFile = new File(Folder.myDocuments.fsName + "/Export_Overlord_" + new Date().getTime() + ".psd");
        
        var saveOpts = new PhotoshopSaveOptions();
        saveOpts.embedColorProfile = true;
        saveOpts.alphaChannels = true;
        saveOpts.layers = true;
        
        tempDoc.saveAs(psdFile, saveOpts, true, Extension.LOWERCASE);
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);
        
        // Retorna ao doc original
        app.activeDocument = doc;

        // Avisa o AE onde está o arquivo
        var payload = {
            type: "file",
            appName: "photoshop",
            filePath: psdFile.fsName
        };

        var jsonStr = stringify(payload);

        var bt = new BridgeTalk();
        bt.target = "aftereffects";
        
        var aeScriptContent = "";
        try { 
            var f = new File(aeScriptPath);
            if (f.open("r")) { aeScriptContent = f.read(); f.close(); } 
        } catch(e) {}
        
        var payloadEsc = encodeURIComponent(jsonStr).replace(/\+/g, '%20');
        bt.body = aeScriptContent + "\n\ntry{ receiveFromOverlordLite(decodeURIComponent('" + payloadEsc + "')); }catch(e){ alert('OverlordLite AE Error:' + e); }";
        
        bt.send();
        
        return jsonStr;

    } catch(globalErr) {
        return '{"error": "🚨 RUNTIME: ' + globalErr.toString().replace(/"/g, "'") + '"}';
    }
}
