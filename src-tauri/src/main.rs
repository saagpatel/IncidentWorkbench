#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use incident_workbench_lib::{BackendPort, SidecarProcess};
use std::{fs, sync::Mutex};
use tauri::{Manager, State};
use tauri_plugin_shell::ShellExt;

fn configured_backend_port() -> u16 {
    std::env::var("WORKBENCH_BACKEND_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8765)
}

fn dev_mode_enabled() -> bool {
    matches!(std::env::var("DEV_MODE").ok().as_deref(), Some("1" | "true" | "TRUE"))
}

#[tauri::command]
fn get_backend_port(state: State<BackendPort>) -> Result<u16, String> {
    state
        .0
        .lock()
        .map_err(|e| format!("Failed to lock backend port: {e}"))?
        .ok_or_else(|| "Backend port not yet set".to_string())
}

#[tauri::command]
fn reset_credentials_vault(app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to locate app data directory: {e}"))?;
    let snapshot_path = app_dir.join("credentials.stronghold");

    if snapshot_path.exists() {
        fs::remove_file(&snapshot_path)
            .map_err(|e| format!("Failed to delete credentials vault: {e}"))?;
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_stronghold::Builder::new(|_| vec![]).build())
        .plugin(tauri_plugin_shell::init())
        .manage(BackendPort(Mutex::new(None)))
        .manage(SidecarProcess(Mutex::new(None)))
        .setup(|app| {
            let backend_port = app.state::<BackendPort>();
            let sidecar_process = app.state::<SidecarProcess>();
            let configured_port = configured_backend_port();

            if dev_mode_enabled() {
                if let Ok(mut port) = backend_port.0.lock() {
                    *port = Some(configured_port);
                }
                println!("Development mode detected; using external backend on port {configured_port}");
                return Ok(());
            }

            // Spawn the Python FastAPI sidecar
            let sidecar_command = app
                .shell()
                .sidecar("incident-workbench-api")?
                .args(["--port", &configured_port.to_string()]);

            // In development, the sidecar might not exist yet - that's okay
            // Production builds will have it bundled
            match sidecar_command.spawn() {
                Ok((_rx, child)) => {
                    println!("Sidecar spawned successfully");

                    if let Ok(mut port) = backend_port.0.lock() {
                        *port = Some(configured_port);
                    }

                    // Store child process for cleanup on shutdown
                    if let Ok(mut proc) = sidecar_process.0.lock() {
                        *proc = Some(child);
                    }
                }
                Err(e) => {
                    eprintln!("Warning: Could not spawn sidecar: {}. This is expected in development mode.", e);

                    // In dev mode, assume the backend is running separately on the configured port.
                    if let Ok(mut port) = backend_port.0.lock() {
                        *port = Some(configured_port);
                    }
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Clean up sidecar process on window close
                if let Some(sidecar_state) = window.try_state::<SidecarProcess>() {
                    if let Ok(mut proc) = sidecar_state.0.lock() {
                        if let Some(child) = proc.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_backend_port,
            reset_credentials_vault
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
