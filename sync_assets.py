"""
Copy the web app (the single source in the repo root) into the Android and Windows targets.

CORE_FILES is the one list of app files; build.py and windows/build_windows_exe.py import it.
"""
import os
import shutil
import hashlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ANDROID_WWW_DIR = os.path.join(BASE_DIR, "android", "app", "src", "main", "assets", "www")
WINDOWS_DIR = os.path.join(BASE_DIR, "windows")
CORE_FILES = ["index.html", "styles.css", "content.js", "script.js", "manifest.json", "sw.js"]
# Runtime caches and generator bookkeeping that should never ship inside the app.
ASSET_IGNORE = shutil.ignore_patterns("cache_audio", "manifest.json", "*.part", ".DS_Store", "Thumbs.db")


def compute_sha256(filepath):
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def iter_asset_files(root):
    """Yield asset paths relative to `root`, applying the same ignore rules as the copy."""
    for dirpath, dirnames, filenames in os.walk(root):
        ignored = ASSET_IGNORE(dirpath, dirnames + filenames)
        dirnames[:] = [d for d in dirnames if d not in ignored]
        for name in filenames:
            if name not in ignored:
                yield os.path.relpath(os.path.join(dirpath, name), root)


def update_icon():
    """Regenerate the Windows .ico only when the mascot image is newer than it."""
    src_img = os.path.join(BASE_DIR, "assets", "mascot.jpg")
    target_ico = os.path.join(BASE_DIR, "assets", "mascot.ico")
    if not os.path.exists(src_img):
        return
    if not os.path.exists(target_ico) or os.path.getmtime(src_img) > os.path.getmtime(target_ico):
        try:
            from PIL import Image

            img = Image.open(src_img).convert("RGB")
            img.save(target_ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
            print("  [Icon] mascot.ico regenerated.")
        except Exception as e:  # Pillow missing or image unreadable: keep the committed icon
            print("  [Icon Warning]", e)
    shutil.copy2(target_ico, os.path.join(WINDOWS_DIR, "mascot.ico"))


def sync():
    print("=== Alphabet Safari: Unified Asset Synchronization ===")
    os.makedirs(ANDROID_WWW_DIR, exist_ok=True)
    os.makedirs(WINDOWS_DIR, exist_ok=True)

    update_icon()

    for fname in CORE_FILES:
        src = os.path.join(BASE_DIR, fname)
        dst = os.path.join(ANDROID_WWW_DIR, fname)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  [Sync -> Android] {fname} ({compute_sha256(dst)[:10]})")

    src_assets = os.path.join(BASE_DIR, "assets")
    dst_assets = os.path.join(ANDROID_WWW_DIR, "assets")
    if os.path.exists(src_assets):
        shutil.copytree(src_assets, dst_assets, dirs_exist_ok=True, ignore=ASSET_IGNORE)
        print(f"  [Sync -> Android] assets/ ({sum(1 for _ in iter_asset_files(src_assets))} files)")

    print("Sync complete. Run `py build.py --verify` to confirm parity.\n")


if __name__ == "__main__":
    sync()
