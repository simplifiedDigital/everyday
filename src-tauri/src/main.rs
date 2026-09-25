#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{collections::{HashMap, HashSet}, io::{BufRead, BufReader, Write}, path::PathBuf, process::{Command, Stdio}, sync::Mutex};
use tauri::{Emitter, Manager};
use tauri_plugin_opener::OpenerExt;
use serde_json::{json, Value};

#[derive(Default)]
struct Jobs { cancel: Mutex<HashMap<String, PathBuf>>, outputs: Mutex<HashSet<String>> }

#[tauri::command]
async fn run_job(app: tauri::AppHandle, request: Value, job_id: String) -> Result<Value, String> {
    if job_id.len() > 80 || !job_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') { return Err("Invalid job".into()); }
    tauri::async_runtime::spawn_blocking(move || {
        let mut req = request;
        let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&cache).map_err(|e| e.to_string())?;
        let flag = cache.join(format!("{}.cancel", job_id));
        let outputs = app.path().download_dir().map_err(|e| e.to_string())?.join("Everyday");
        req["output_dir"] = json!(outputs);
        req["model_dir"] = json!(app.path().app_data_dir().map_err(|e| e.to_string())?.join("models"));
        req["cancel_file"] = json!(flag);
        app.state::<Jobs>().cancel.lock().unwrap().insert(job_id.clone(), flag.clone());
        let mut command;
        if cfg!(debug_assertions) {
            let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().to_path_buf();
            let python = if cfg!(windows) { root.join(".venv/Scripts/python.exe") } else { root.join(".venv/bin/python") };
            command = Command::new(python); command.arg(root.join("engine/worker.py"));
        } else {
            let resource = app.path().resource_dir().map_err(|e| e.to_string())?;
            command = Command::new(resource.join(if cfg!(windows) { "engine/everyday-engine.exe" } else { "engine/everyday-engine" }));
        }
        #[cfg(windows)] { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
        command.env("PYTHONIOENCODING", "utf-8").stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null());
        let task = (|| {
            let mut child = command.spawn().map_err(|e| format!("The local tools could not start: {}", e))?;
            writeln!(child.stdin.take().unwrap(), "{}", req).map_err(|e| e.to_string())?;
            let mut result = None;
            for line in BufReader::new(child.stdout.take().unwrap()).lines() {
                if let Ok(line) = line { if let Ok(mut value) = serde_json::from_str::<Value>(&line) {
                    value["jobId"] = json!(job_id);
                    if value["event"] == "result" || value["event"] == "error" { result = Some(value); }
                    else { let _ = app.emit("job-progress", value); }
                } }
            }
            child.wait().map_err(|e| e.to_string())?;
            let result = result.ok_or("The task stopped unexpectedly. Please try again.".to_string())?;
            if result["event"] == "result" {
                let state = app.state::<Jobs>(); let mut paths = state.outputs.lock().unwrap();
                if let Some(files) = result["files"].as_array() { for file in files { if let Some(s) = file.as_str() { paths.insert(s.to_owned()); } } }
                if let Some(s) = result["folder"].as_str() { paths.insert(s.to_owned()); }
            }
            Ok(result)
        })();
        app.state::<Jobs>().cancel.lock().unwrap().remove(&job_id); let _ = std::fs::remove_file(flag);
        task
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn cancel_job(app: tauri::AppHandle, job_id: String) -> Result<(), String> {
    if let Some(path) = app.state::<Jobs>().cancel.lock().unwrap().get(&job_id) { std::fs::write(path, b"cancel").map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
fn open_output(app: tauri::AppHandle, path: String, reveal: bool) -> Result<(), String> {
    if !app.state::<Jobs>().outputs.lock().unwrap().contains(&path) { return Err("Unknown output file".into()); }
    if reveal { app.opener().open_path(path, None::<&str>).map_err(|e| e.to_string()) }
    else { app.opener().open_path(path, None::<&str>).map_err(|e| e.to_string()) }
}

fn main() {
    tauri::Builder::default().manage(Jobs::default())
        .plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                for flag in window.state::<Jobs>().cancel.lock().unwrap().values() { let _ = std::fs::write(flag, b"cancel"); }
            }
        })
        .invoke_handler(tauri::generate_handler![run_job, cancel_job, open_output])
        .run(tauri::generate_context!()).expect("Could not start Everyday");
}
