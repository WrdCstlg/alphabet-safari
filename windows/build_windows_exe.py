import os
import sys
import subprocess
import tempfile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WINDOWS_DIR = os.path.join(BASE_DIR, "windows")
DIST_DIR = os.path.join(WINDOWS_DIR, "dist")
# PyInstaller's scratch tree lives outside the repo: inside a OneDrive-synced folder,
# `--clean` intermittently fails with "Access is denied" on files OneDrive is syncing.
BUILD_DIR = os.path.join(tempfile.gettempdir(), "AlphabetSafari-pyinstaller")
ICON_PATH = os.path.join(WINDOWS_DIR, "mascot.ico")

def build_exe():
    print("=== Building Standalone Windows Executable (PyInstaller + WebView2) ===")

    # First synchronize assets
    sync_script = os.path.join(BASE_DIR, "sync_assets.py")
    if os.path.exists(sync_script):
        subprocess.check_call([sys.executable, sync_script])

    app_script = os.path.join(WINDOWS_DIR, "alphabet_safari_app.py")

    # Bundle the web app: the shared core files plus every asset except runtime caches.
    sys.path.insert(0, BASE_DIR)
    from sync_assets import CORE_FILES, ASSET_IGNORE

    data_files = [(os.path.join(BASE_DIR, f), ".") for f in CORE_FILES]
    assets_dir = os.path.join(BASE_DIR, "assets")
    entries = os.listdir(assets_dir)
    ignored = ASSET_IGNORE(assets_dir, entries)
    for name in entries:
        if name not in ignored:
            src = os.path.join(assets_dir, name)
            data_files.append((src, "assets/" + name if os.path.isdir(src) else "assets"))

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
        "--collect-all=edge_tts",
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
        sys.exit(1)

if __name__ == "__main__":
    build_exe()
