try {
    var aeApp = new ActiveXObject('AfterEffects.Application');
    aeApp.NewProject();
    var comp = aeApp.Project.Items.AddComp('Test', 1920, 1080, 1, 10, 30);
    var layer = comp.Layers.AddShape();
    var grp = layer.property("Contents").addProperty("ADBE Vector Group");
    var gFill = grp.property("Contents").addProperty("ADBE Vector Graphic - G-Fill");
    var val = gFill.property("ADBE Vector Grad Colors").value;
    
    var fso = new ActiveXObject('Scripting.FileSystemObject');
    var f = fso.CreateTextFile('ae_colors_out.txt', true);
    f.WriteLine('Length: ' + val.length);
    for(var i=0; i<val.length; i++){
        f.WriteLine('val['+i+'] = ' + val[i]);
    }
    f.Close();
} catch(e) {
    var fso = new ActiveXObject('Scripting.FileSystemObject');
    var f = fso.CreateTextFile('ae_colors_out.txt', true);
    f.WriteLine('Error AE: ' + e.message);
    f.Close();
}
