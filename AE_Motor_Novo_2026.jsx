// AE_Motor_Novo_2026.jsx
function motorNovo() {
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) { alert("Selecione a camada no After!"); return; }

    var layer = comp.selectedLayers[0];
    function findCores(prop) {
        for (var i = 1; i <= prop.numProperties; i++) {
            var p = prop.property(i);
            if (p.matchName === "ADBE Vector Grad Colors") return p;
            if (p.numProperties > 0) {
                var res = findCores(p);
                if (res) return res;
            }
        }
        return null;
    }

    var pCores = findCores(layer);
    if (!pCores) { alert("Nao achei 'Cores'!"); return; }

    app.beginUndoGroup("Teste Motor Novo");

    try {
        // ESSA É A NOVA TECNOLOGIA DA ADOBE (AE 2024.1+)
        // Vamos tentar criar um gradiente VERDE e VERMELHO pra testar
        var meuGradiente = new Gradient();
        
        // Formato: [Posicao, R, G, B, ...]
        meuGradiente.colorStops = [
            0, 0, 1, 0,   // Inicio (0%): Verde (0,1,0)
            1, 1, 0, 0    // Fim (100%): Vermelho (1,0,0)
        ];
        
        meuGradiente.opacityStops = [
            0, 1, 0.5,    // 0%, Opacidade 100%, Midpoint 50%
            1, 1, 0.5     // 100%, Opacidade 100%, Midpoint 50%
        ];

        // Tenta aplicar direto!
        pCores.setValue(meuGradiente);
        
        alert("CONSEGUI! O After 2026 aceitou o Novo Motor!\r\nA cor deve ter mudado para Verde e Vermelho.");

    } catch(e) {
        alert("FALHOU: O seu After ainda nao aceita 'new Gradient()'.\r\nErro: " + e.toString());
    }

    app.endUndoGroup();
}
motorNovo();
