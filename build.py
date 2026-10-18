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
import re
import sys
import argparse
import shutil
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ANDROID_DIR = os.path.join(BASE_DIR, "android")
WINDOWS_DIR = os.path.join(BASE_DIR, "windows")
ALLOWED_ANDROID_PERMISSIONS = {"android.permission.VIBRATE"}

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

# Google Play's limits, in characters. Play rejects a listing or release over them.
PLAY_TEXT_LIMITS = {"title.txt": 30, "short_description.txt": 80, "full_description.txt": 4000}
PLAY_RELEASE_NOTES_LIMIT = 500


def verify_play_listing():
    """Store listing text in fastlane/metadata/android/<locale>/ is present and within limits."""
    from sync_assets import PLAY_LISTING_DIR, PLAY_LOCALES

    ok = True
    for locale in PLAY_LOCALES:
        folder = os.path.join(PLAY_LISTING_DIR, locale)
        files = dict(PLAY_TEXT_LIMITS, **{os.path.join("changelogs", "default.txt"): PLAY_RELEASE_NOTES_LIMIT})
        for name, limit in files.items():
            path = os.path.join(folder, name)
            text = open(path, encoding="utf-8").read().strip() if os.path.exists(path) else ""
            if not text or len(text) > limit:
                log(f"Play listing {locale}/{name}: {len(text)} characters (must be 1-{limit})", symbol="FAIL")
                ok = False
    if ok:
        log(f"Play listing text present and within limits ({', '.join(PLAY_LOCALES)}).", symbol="OK")
    return ok


PRIVATE_USE = "[" + chr(0xE000) + "-" + chr(0xF8FF) + "]"  # built with chr(): editors may turn escapes into the characters


def verify_no_invisible_pictures():
    """The app's own pictures sit at Private Use code points (U+E000...), which editors show as
    nothing at all: source must spell them as escapes ("\\uE000") so they can't look missing."""
    skip_dirs = {".git", "node_modules", "_site", "build", "dist", ".gradle", "DerivedData", "__pycache__"}
    text_types = (".js", ".mjs", ".html", ".css", ".py", ".swift", ".json", ".md", ".kt", ".yml", ".txt")
    found = []
    for dirpath, dirnames, filenames in os.walk(BASE_DIR):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for name in filenames:
            if name.endswith(text_types):
                path = os.path.join(dirpath, name)
                try:
                    text = open(path, encoding="utf-8").read()
                except (UnicodeDecodeError, OSError):
                    continue
                if re.search(PRIVATE_USE, text):
                    found.append(os.path.relpath(path, BASE_DIR))
    for rel in found:
        log(f"Invisible Private Use character in {rel}: write it as an escape, e.g. \\uE000", symbol="FAIL")
    if not found:
        log("No invisible Private Use characters in the source (pictures are written as escapes).", symbol="OK")
    return not found


def run_verify():
    from sync_assets import CORE_FILES, ANDROID_WWW_DIR, compute_sha256, iter_asset_files

    log("Verifying core project integrity...", symbol="CHECK")
    ok = True
    for f in CORE_FILES:
        p = os.path.join(BASE_DIR, f)
        if not os.path.exists(p):
            log(f"Missing core asset: {f}", symbol="FAIL")
            return False
        log(f"Verified core asset: {f} ({os.path.getsize(p):,} bytes)", symbol="OK")

    # Every app file and asset must be byte-identical in the Android bundle.
    src_assets = os.path.join(BASE_DIR, "assets")
    pairs = [(os.path.join(BASE_DIR, f), os.path.join(ANDROID_WWW_DIR, f)) for f in CORE_FILES]
    pairs += [(os.path.join(src_assets, rel), os.path.join(ANDROID_WWW_DIR, "assets", rel))
              for rel in iter_asset_files(src_assets)]
    for src, dst in pairs:
        rel = os.path.relpath(src, BASE_DIR)
        if not os.path.exists(dst):
            log(f"Android copy missing: {rel} (run `py build.py --sync`)", symbol="FAIL")
            ok = False
        elif compute_sha256(src) != compute_sha256(dst):
            log(f"Android copy out of date: {rel} (run `py build.py --sync`)", symbol="FAIL")
            ok = False
    if ok:
        log(f"Android asset parity verified ({len(pairs)} files).", symbol="OK")

    # Release builds (the Play bundle) refuse launcher icons that aren't real PNGs.
    from sync_assets import launcher_icon_specs, is_png
    bad_icons = [(os.path.relpath(p, BASE_DIR), size, colour) for p, size, colour in launcher_icon_specs()
                 if not is_png(p, size, colour)]
    for rel, size, colour in bad_icons:
        log(f"Icon is not a {size}x{size} {colour or ''} PNG: {rel} (run `py build.py --sync`)", symbol="FAIL")
    if bad_icons:
        ok = False
    else:
        log("App icons are valid PNGs: Android launcher, Play (RGBA) and App Store (RGB, no alpha).", symbol="OK")

    ok = verify_play_listing() and ok
    ok = verify_no_invisible_pictures() and ok

    # privacy.html and the Play Data safety answers say the Android app can't reach the
    # internet and asks only for vibration. A new permission must update those first.
    manifest = os.path.join(ANDROID_DIR, "app", "src", "main", "AndroidManifest.xml")
    with open(manifest, encoding="utf-8") as f:
        permissions = set(re.findall(r'<uses-permission\s+android:name="([^"]+)"', f.read()))
    if permissions != ALLOWED_ANDROID_PERMISSIONS:
        log(f"Android permissions changed: {sorted(permissions)}. Update privacy.html and "
            "docs/google-play/README.md (Data safety), then ALLOWED_ANDROID_PERMISSIONS in build.py.", symbol="FAIL")
        ok = False
    else:
        log("Android permissions match the privacy policy (vibration only, no internet).", symbol="OK")

    log("Validating content.js against the recorded audio...", symbol="CHECK")
    if subprocess.call([sys.executable, os.path.join(BASE_DIR, "tools", "validate_content.py")]) != 0:
        ok = False
    return ok

def build_site(out_dir=None):
    """Stage exactly what the web app needs into _site/ (for GitHub Pages).

    Publishing the repo root would also ship android/, windows/, tools/, tests/ and build
    scripts; this uses the same file list and asset filter as the native targets.
    """
    from sync_assets import CORE_FILES, ASSET_IGNORE

    out_dir = out_dir or os.path.join(BASE_DIR, "_site")
    shutil.rmtree(out_dir, ignore_errors=True)
    os.makedirs(out_dir, exist_ok=True)
    for f in CORE_FILES:
        shutil.copy2(os.path.join(BASE_DIR, f), out_dir)
    shutil.copytree(os.path.join(BASE_DIR, "assets"), os.path.join(out_dir, "assets"), dirs_exist_ok=True, ignore=ASSET_IGNORE)
    count = sum(len(files) for _, _, files in os.walk(out_dir))
    log(f"Web site staged in {out_dir} ({count} files)", symbol="SITE")
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
    parser.add_argument("--site", action="store_true", help="Stage the web app into _site/ for GitHub Pages")
    parser.add_argument("--site-dir", metavar="DIR",
                        help="Stage the web app into DIR instead (the iOS app's build phase uses this)")

    args = parser.parse_args()

    if not any([args.sync, args.verify, args.windows, args.android, args.all, args.site, args.site_dir]):
        # Default behavior: sync and verify
        run_sync()
        verified = run_verify()
        print("\nUsage examples:")
        print("  py build.py --windows   -> Compiles Windows standalone .exe")
        print("  py build.py --android   -> Compiles Android debug APK")
        print("  py build.py --all       -> Compiles both Windows and Android targets")
        sys.exit(0 if verified else 1)

    if args.sync:
        run_sync()
    if args.verify and not run_verify():
        sys.exit(1)
    # A failed build must fail the command, or CI goes green without an artifact.
    ok = True
    if args.site or args.site_dir:
        ok = build_site(args.site_dir) and ok
    if args.windows or args.all:
        ok = build_windows() and ok
    if args.android or args.all:
        ok = build_android() and ok
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
