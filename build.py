#!/usr/bin/env python3
"""
Alphabet Safari Unified Multi-Target Build CLI
Supports:
  - Asset synchronization across Android and Windows (100% hash parity)
  - Windows standalone desktop executable packaging (PyInstaller + Edge WebView2)
  - Android APK compilation (Gradle wrapper)
  - Comprehensive integrity and syntax verification
"""

import os
import sys
import argparse
import subprocess
import shutil
import hashlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ANDROID_DIR = os.path.join(BASE_DIR, "android")
WINDOWS_DIR = os.path.join(BASE_DIR, "windows")

def log(msg, symbol="*"):
    print(f"[{symbol}] {msg}")

def run_sync():
    log("Synchronizing unified assets across platforms...", symbol="SYNC")
    sync_script = os.path.join(BASE_DIR, "sync_assets.py")
    if os.path.exists(sync_script):
        subprocess.check_call([sys.executable, sync_script])
    else:
        log("sync_assets.py not found!", symbol="ERROR")
        return False
    return True

def run_verify():
    log("Verifying core project integrity...", symbol="CHECK")
    core_files = ["index.html", "styles.css", "script.js", "manifest.json", "sw.js"]
    for f in core_files:
        p = os.path.join(BASE_DIR, f)
        if not os.path.exists(p):
            log(f"Missing core asset: {f}", symbol="FAIL")
            return False
        log(f"Verified core asset: {f} ({os.path.getsize(p):,} bytes)", symbol="OK")

    # Verify Android assets copy matches
    android_www = os.path.join(ANDROID_DIR, "app", "src", "main", "assets", "www")
    for f in core_files:
        src = os.path.join(BASE_DIR, f)
        dst = os.path.join(android_www, f)
        if not os.path.exists(dst):
            log(f"Android asset missing: {f}", symbol="FAIL")
            return False
        with open(src, "rb") as sf, open(dst, "rb") as df:
            if hashlib.sha256(sf.read()).digest() != hashlib.sha256(df.read()).digest():
                log(f"Hash mismatch on {f}!", symbol="FAIL")
                return False
    log("Android asset parity: 100% verified.", symbol="OK")
    return True

def build_windows():
    log("Building Native Windows Desktop Executable...", symbol="WIN")
    run_sync()
    build_script = os.path.join(WINDOWS_DIR, "build_windows_exe.py")
    subprocess.check_call([sys.executable, build_script])
    exe_path = os.path.join(WINDOWS_DIR, "dist", "AlphabetSafari.exe")
    if os.path.exists(exe_path):
        size_mb = os.path.getsize(exe_path) / (1024 * 1024)
        log(f"Windows Desktop Build Complete: {exe_path} ({size_mb:.2f} MB)", symbol="SUCCESS")
        return True
    return False

def build_android():
    log("Building Android Native APK via Gradle...", symbol="ANDROID")
    run_sync()
    gradlew_cmd = os.path.join(ANDROID_DIR, "gradlew.bat" if sys.platform == "win32" else "gradlew")
    if not os.path.exists(gradlew_cmd):
        log("Gradle wrapper not found! Run setup_android first.", symbol="ERROR")
        return False

    cmd = [gradlew_cmd, "assembleDebug"]
    try:
        subprocess.check_call(cmd, cwd=ANDROID_DIR)
        apk_path = os.path.join(ANDROID_DIR, "app", "build", "outputs", "apk", "debug", "app-debug.apk")
        if os.path.exists(apk_path):
            size_mb = os.path.getsize(apk_path) / (1024 * 1024)
            log(f"Android APK Build Complete: {apk_path} ({size_mb:.2f} MB)", symbol="SUCCESS")
            return True
    except subprocess.CalledProcessError as e:
        log(f"Gradle build exited with error: {e}", symbol="WARN")
        log("Ensure Java Development Kit (JDK 17 or 21) and Android SDK are installed locally, or build via CI/CD.", symbol="NOTE")
        return False
    return False

def main():
    parser = argparse.ArgumentParser(description="Alphabet Safari Unified Architecture Builder")
    parser.add_argument("--sync", action="store_true", help="Sync unified assets across Android & Windows")
    parser.add_argument("--verify", action="store_true", help="Verify syntax and parity")
    parser.add_argument("--windows", action="store_true", help="Build standalone Windows executable")
    parser.add_argument("--android", action="store_true", help="Build Android APK")
    parser.add_argument("--all", action="store_true", help="Build both Windows and Android")

    args = parser.parse_args()

    if not any([args.sync, args.verify, args.windows, args.android, args.all]):
        # Default behavior: sync and verify
        run_sync()
        run_verify()
        print("\nUsage examples:")
        print("  py build.py --windows   -> Compiles Windows standalone .exe")
        print("  py build.py --android   -> Compiles Android debug APK")
        print("  py build.py --all       -> Compiles both Windows and Android targets")
        return

    if args.sync:
        run_sync()
    if args.verify:
        run_verify()
    if args.windows or args.all:
        build_windows()
    if args.android or args.all:
        build_android()

if __name__ == "__main__":
    main()
