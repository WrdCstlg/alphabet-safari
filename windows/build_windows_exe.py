import os
import sys
import subprocess
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WINDOWS_DIR = os.path.join(BASE_DIR, "windows")
DIST_DIR = os.path.join(WINDOWS_DIR, "dist")
BUILD_DIR = os.path.join(WINDOWS_DIR, "build")
ICON_PATH = os.path.join(WINDOWS_DIR, "mascot.ico")

def build_exe():
    print("=== Building Standalone Windows Executable (PyInstaller + WebView2) ===")

    # First synchronize assets
    sync_script = os.path.join(BASE_DIR, "sync_assets.py")
    if os.path.exists(sync_script):
        subprocess.check_call([sys.executable, sync_script])

    app_script = os.path.join(WINDOWS_DIR, "alphabet_safari_app.py")

    # Add core web data files to PyInstaller bundle
    data_files = [
        (os.path.join(BASE_DIR, "index.html"), "."),
        (os.path.join(BASE_DIR, "styles.css"), "."),
        (os.path.join(BASE_DIR, "script.js"), "."),
        (os.path.join(BASE_DIR, "manifest.json"), "."),
        (os.path.join(BASE_DIR, "sw.js"), "."),
        (os.path.join(BASE_DIR, "assets"), "assets"),
    ]

    add_data_args = []
    for src, dst in data_files:
        if os.path.exists(src):
            add_data_args.extend(["--add-data", f"{src};{dst}"])

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",
        "--onefile",
        "--name=AlphabetSafari",
        f"--icon={ICON_PATH}",
        f"--distpath={DIST_DIR}",
        f"--workpath={BUILD_DIR}",
        "--clean",
        "--collect-all=webview",
        *add_data_args,
        app_script
    ]

    print(f"Running PyInstaller command...")
    subprocess.check_call(cmd)

    exe_path = os.path.join(DIST_DIR, "AlphabetSafari.exe")
    if os.path.exists(exe_path):
        size_mb = os.path.getsize(exe_path) / (1024 * 1024)
        print(f"\nSUCCESS: Created Standalone Windows App: {exe_path} ({size_mb:.2f} MB)")
    else:
        print("ERROR: Output executable not found.")

if __name__ == "__main__":
    build_exe()
