var cs = new CSInterface();

// Detect current app
var appName = cs.hostEnvironment.appName;
if (appName === "PHXS") appName = "Photoshop";
else if (appName === "ILST") appName = "Illustrator";
else if (appName === "AEFT") appName = "AfterEffects";

function loadHostScript(fileName) {
    var extensionPath = cs.getSystemPath(SystemPath.EXTENSION);
    var filePath = extensionPath + "/host/" + fileName;
    cs.evalScript('$.evalFile("' + filePath.replace(/\\/g, "/") + '")');
}

// Initial loads
if (appName === "Illustrator") loadHostScript("illustrator.jsx");
else if (appName === "AfterEffects") loadHostScript("aftereffects.jsx");

function executeExport(mode) {
    var statusDiv = document.getElementById("status");
    statusDiv.innerHTML = "Processing...";
    
    var extensionPath = cs.getSystemPath(SystemPath.EXTENSION);
    // Para AE we don't usually push from here, but for ILST:
    var aeScriptPath = extensionPath + "/host/aftereffects.jsx";
    
    // Chamamos a função no host (Illustrator ou Photoshop)
    var scriptCall = 'exportLayers("' + aeScriptPath.replace(/\\/g, "/") + '", "' + mode + '")';
    
    cs.evalScript(scriptCall, function(result) {
        try {
            var data = JSON.parse(result);
            if (data.error) {
                statusDiv.innerHTML = "Error: " + data.error;
            } else if (data.command) {
                statusDiv.innerHTML = "Comp created in AE!";
            } else if (data.layers) {
                statusDiv.innerHTML = (mode==="merged" ? "Merged Shape" : "Sent " + data.layers.length + " layers") + " to AE!";
            }
        } catch (e) {
            statusDiv.innerHTML = "Action complete!";
        }
        setTimeout(function() { statusDiv.innerHTML = "Ready for Action"; }, 3000);
    });
}

// Button Listeners
document.getElementById("pushIndividual").onclick = function() {
    if (appName === "AfterEffects") {
        alert("This feature pushes layers TO After Effects. Use in Illustrator.");
        return;
    }
    executeExport("normal");
};

document.getElementById("pushMerged").onclick = function() {
    if (appName === "AfterEffects") return;
    executeExport("merged");
};

var btnCompAb = document.getElementById("createCompAb");
if (btnCompAb) {
    btnCompAb.onclick = function() {
        if (appName === "AfterEffects") return;
        executeExport("comp_artboard");
    };
}

var btnCompSel = document.getElementById("createCompSel");
if (btnCompSel) {
    btnCompSel.onclick = function() {
        if (appName === "AfterEffects") {
            var extensionPath = cs.getSystemPath(SystemPath.EXTENSION);
            var aeScriptPath = extensionPath + "/host/aftereffects.jsx";
            cs.evalScript('try { $.evalFile("' + aeScriptPath.replace(/\\/g, "/") + '"); createCompFromAeSelection(); } catch(e) { alert(e); }');
            return;
        }
        executeExport("comp_selection");
    };
}

var btnRaster = document.getElementById("rasterizeBtn");
if (btnRaster) {
    btnRaster.onclick = function() {
        if (appName === "AfterEffects") return;
        executeExport("rasterize");
    };
}

var btnPrecompNull = document.getElementById("precompNullBtn");
if (btnPrecompNull) {
    btnPrecompNull.onclick = function() {
        var extensionPath = cs.getSystemPath(SystemPath.EXTENSION);
        var aeScriptPath = extensionPath + "/host/aftereffects.jsx";
        if (appName !== "AfterEffects") {
            var evalCommand = 'try { $.evalFile("' + aeScriptPath.replace(/\\/g, "/") + '"); executePrecompNulls(); } catch(e) { alert(e); };';
            var btCommand = 'var bt = new BridgeTalk(); bt.target = "aftereffects"; bt.body = \'' + evalCommand + '\'; bt.send();';
            cs.evalScript(btCommand);
        } else {
            cs.evalScript('try { $.evalFile("' + aeScriptPath.replace(/\\/g, "/") + '"); executePrecompNulls(); } catch(e) {};');
        }
    };
}

document.getElementById("pullAe").onclick = function() {
    triggerPull();
};

function triggerPull() {
    var statusDiv = document.getElementById("status");
    statusDiv.innerHTML = "Pulling from AE...";
    
    var extensionPath = cs.getSystemPath(SystemPath.EXTENSION);
    var aiScriptPath = extensionPath + "/host/illustrator.jsx";
    var aeScriptPath = extensionPath + "/host/aftereffects.jsx";

    var evalCommand = 'try { $.evalFile("' + aeScriptPath.replace(/\\/g, "/") + '"); exportToAi("' + aiScriptPath.replace(/\\/g, "/") + '"); } catch(e) { "Error: " + e.toString(); };';
    var btCommand = 'var bt = new BridgeTalk(); bt.target = "aftereffects"; bt.body = ' + JSON.stringify(evalCommand) + '; bt.send();';
    
    cs.evalScript(btCommand, function(result) {
        if (result && result.indexOf("Error") === 0) {
            statusDiv.innerHTML = result;
        } else {
            statusDiv.innerHTML = "Pull request sent!";
            setTimeout(function() { statusDiv.innerHTML = "Check Illustrator!"; }, 2000);
        }
    });
}
