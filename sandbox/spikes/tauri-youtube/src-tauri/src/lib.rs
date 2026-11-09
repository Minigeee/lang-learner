use std::io::Write;

/// Appends one line to a report file in the temp folder, so a GUI build with no console can be read.
#[tauri::command]
fn report(line: String) {
  println!("REPORT {line}");
  let path = std::env::temp_dir().join("tauri-youtube-report.txt");
  if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
    let _ = writeln!(f, "{line}");
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![report])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
