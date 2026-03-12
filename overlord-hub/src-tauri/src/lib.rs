use std::path::{Path, PathBuf};
use std::fs;

#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

use tauri::Manager;

#[tauri::command]
fn install_plugin(app: tauri::AppHandle) -> Result<String, String> {
    let appdata = match std::env::var("APPDATA") {
        Ok(val) => PathBuf::from(val),
        Err(e) => return Err(format!("Could not find APPDATA environment variable: {}", e)),
    };

    let destination = appdata
        .join("Adobe")
        .join("CEP")
        .join("extensions")
        .join("overlord-lite");

    // Get the bundled resource path. 
    // Tauri v2 API: app.path().resolve(...)
    let resource_path = app.path().resolve(
        "resources/overlord-lite",
        tauri::path::BaseDirectory::Resource
    ).map_err(|e| format!("Failed to resolve resource path: {}", e))?;

    if let Err(e) = copy_dir_all(&resource_path, &destination) {
        return Err(format!("Failed to copy plugin: {}", e));
    }

    #[cfg(target_os = "windows")]
    {
        if let Err(e) = enable_player_debug_mode() {
            return Err(format!("Plugin copied, but failed to set registry keys: {}", e));
        }
    }

    Ok("Plugin installed successfully! Please restart your Adobe applications.".to_string())
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn enable_player_debug_mode() -> std::io::Result<()> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    // Add for CSXS versions 5 to 16
    let versions = ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"];
    for v in versions {
        let path = format!("Software\\Adobe\\CSXS.{}", v);
        // ignore errors on individual keys
        if let Ok((key, _)) = hkcu.create_subkey(&path) {
            let _ = key.set_value("PlayerDebugMode", &"1");
        }
    }
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, install_plugin])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
