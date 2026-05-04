use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::Mutex;

use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct Backend {
    child: Mutex<Option<std::process::Child>>,
    port: Mutex<u16>,
}

fn do_request(port: u16, method: &str, path: &str) -> Result<String, String> {
    let url = format!("http://127.0.0.1:{port}{path}");
    let mut res = match method {
        "GET" => ureq::get(&url).call(),
        "POST" => ureq::post(&url).send_empty(),
        "DELETE" => ureq::delete(&url).call(),
        _ => return Err(format!("Unsupported method: {method}")),
    }
    .map_err(|e| e.to_string())?;
    res.body_mut().read_to_string().map_err(|e| e.to_string())
}

#[tauri::command]
fn proxy_get(backend: tauri::State<Backend>, path: String) -> Result<String, String> {
    let port = *backend.port.lock().unwrap();
    do_request(port, "GET", &path)
}

#[tauri::command]
fn proxy_post(backend: tauri::State<Backend>, path: String) -> Result<String, String> {
    let port = *backend.port.lock().unwrap();
    do_request(port, "POST", &path)
}

#[tauri::command]
fn proxy_delete(backend: tauri::State<Backend>, path: String) -> Result<String, String> {
    let port = *backend.port.lock().unwrap();
    do_request(port, "DELETE", &path)
}

#[tauri::command]
fn get_backend_port(backend: tauri::State<Backend>) -> u16 {
    *backend.port.lock().unwrap()
}

fn resolve_sidecar_path(resource_dir: &std::path::Path) -> Option<std::path::PathBuf> {
    let sidecar_name = format!(
        "binaries/whisper-backend-{}{}",
        tauri::utils::platform::target_triple().unwrap_or_default(),
        std::env::consts::EXE_SUFFIX
    );
    let primary = resource_dir.join(&sidecar_name);
    if primary.exists() {
        return Some(primary);
    }
    let fallback = resource_dir.join("whisper-backend.exe");
    if fallback.exists() {
        return Some(fallback);
    }
    None
}

fn parse_ready_port(line: &str) -> Option<u16> {
    let line = line.trim();
    line.strip_prefix("READY http://")?
        .rsplit(':')
        .next()?
        .trim()
        .parse()
        .ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Backend {
            child: Mutex::new(None),
            port: Mutex::new(0),
        })
        .invoke_handler(tauri::generate_handler![proxy_get, proxy_post, proxy_delete, get_backend_port])
        .setup(|app| {
            let resource_dir = match app.path().resource_dir() {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("Warning: cannot resolve resource dir: {e}");
                    return Ok(());
                }
            };

            let target = match resolve_sidecar_path(&resource_dir) {
                Some(p) => p,
                None => {
                    eprintln!("Warning: no sidecar binary found");
                    return Ok(());
                }
            };

            eprintln!("Starting backend: {}", target.display());

            let mut cmd = Command::new(&target);
            cmd.arg("--port").arg("0")
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);

            let mut child = match cmd.spawn() {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("Warning: failed to spawn backend: {e}");
                    return Ok(());
                }
            };

            // Read lines from stdout until we find READY
            let stdout = child.stdout.take().expect("no stdout");
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line) {
                    Ok(0) => {
                        eprintln!("Warning: backend stdout closed before READY");
                        break;
                    }
                    Ok(_) => {
                        let trimmed = line.trim();
                        if trimmed.is_empty() {
                            continue;
                        }
                        if let Some(port) = parse_ready_port(trimmed) {
                            eprintln!("Backend started on port {port}");
                            let backend = app.state::<Backend>();
                            *backend.port.lock().unwrap() = port;
                            break;
                        }
                        eprintln!("[backend:out] {}", trimmed);
                    }
                    Err(e) => {
                        eprintln!("Warning: failed to read backend output: {e}");
                        break;
                    }
                }
            }

            // Read stderr in background
            let _ = std::thread::spawn(move || {
                let mut reader = BufReader::new(child.stderr.take().unwrap());
                let mut line = String::new();
                loop {
                    line.clear();
                    match reader.read_line(&mut line) {
                        Ok(0) | Err(_) => break,
                        _ => {
                            let trimmed = line.trim();
                            if !trimmed.is_empty() {
                                eprintln!("[backend] {}", trimmed);
                            }
                        }
                    }
                }
            });

            // Store child for cleanup
            {
                let backend = app.state::<Backend>();
                *backend.child.lock().unwrap() = Some(child);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(backend) = window.try_state::<Backend>() {
                    if let Ok(mut c) = backend.child.lock() {
                        if let Some(ref mut proc) = *c {
                            let _ = proc.kill();
                            let _ = proc.wait();
                        }
                    }
                }
                std::process::exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
