var cs = new CSInterface();
var appName = cs.hostEnvironment.appName;

// On load, execute the appropriate host script based on the application
function loadHostScript() {
    var extensionPath = cs.getSystemPath(SystemPath.EXTENSION);
    var hostScript = "";
    
    if (appName === "PHXS" || appName === "PHSP") {
        hostScript = extensionPath + "/host/photoshop.jsx";
    } else if (appName === "ILST") {
        hostScript = extensionPath + "/host/illustrator.jsx";
    } else if (appName === "AEFT") {
        hostScript = extensionPath + "/host/aftereffects.jsx";
    }

    if (hostScript) {
        // We use evalFile to evaluate the proper JSX
        cs.evalScript('$.evalFile("' + hostScript.replace(/\\\\/g, "/") + '")');
    }
}

// Initialize
loadHostScript();

function exportLayers() {
    executeExport(false);
}

function exportMergedLayers() {
    executeExport(true);
}

function executeExport(merged) {
    var statusDiv = document.getElementById("status");
    statusDiv.innerHTML = "Exporting...";
    
    var extensionPath = cs.getSystemPath(SystemPath.EXTENSION);
    var aeScriptPath = extensionPath + "/host/aftereffects.jsx";
    
    var hostScriptPath = extensionPath + "/host/" + (appName === "PHXS" || appName === "PHSP" ? "photoshop" : (appName === "ILST" ? "illustrator" : "aftereffects")) + ".jsx";

    // Modificado para passar o flag 'merged' para o host
    var evalCommand = 'try { $.evalFile("' + hostScriptPath.replace(/\\/g, "/") + '"); } catch(e) {}; exportLayers("' + aeScriptPath.replace(/\\/g, "/") + '", ' + merged + ');';
    
    cs.evalScript(evalCommand, function(result) {
        console.log("ExtendScript returned:", result);
        
        if (!result || result === "EvalScript error.") {
            statusDiv.innerHTML = "Error: ExtendScript crashed.";
            return;
        }

        try {
            var data = JSON.parse(result);
            if (data.error) {
                statusDiv.innerHTML = "Error: " + data.error;
            } else if (data.layers) {
                statusDiv.innerHTML = (merged ? "Merged Shape" : "Sent " + data.layers.length + " layers") + " to AE!";
            } else {
                statusDiv.innerHTML = "Export complete.";
            }
        } catch (e) {
            statusDiv.innerHTML = "Done!";
        }
    });
}

document.getElementById("send").onclick = function() {
    if (appName === "AEFT") {
        alert("This panel sends layers TO After Effects. Open it in Photoshop or Illustrator to use.");
        return;
    }
    exportLayers();
};

document.getElementById("sendMerged").onclick = function() {
    if (appName === "AEFT") return;
    exportMergedLayers();
};
