use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let sidecar_command = app
                .shell()
                .sidecar("binaries/whisper-backend")
                .expect("failed to find whisper-backend sidecar")
                .args(["--port", "8765"]);

            let (_rx, _child) = sidecar_command.spawn().expect("failed to spawn sidecar");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
