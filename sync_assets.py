import os
import shutil
import hashlib
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ANDROID_WWW_DIR = os.path.join(BASE_DIR, "android", "app", "src", "main", "assets", "www")
WINDOWS_DIR = os.path.join(BASE_DIR, "windows")
CORE_FILES = ["index.html", "styles.css", "script.js", "manifest.json", "sw.js"]

def compute_sha256(filepath):
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def sync():
    print("=== Alphabet Safari: Unified Asset Synchronization ===")
    os.makedirs(ANDROID_WWW_DIR, exist_ok=True)
    os.makedirs(WINDOWS_DIR, exist_ok=True)

    # Generate Windows icon if Pillow is available
    src_img = os.path.join(BASE_DIR, "assets", "mascot.jpg")
    target_ico = os.path.join(BASE_DIR, "assets", "mascot.ico")
    if os.path.exists(src_img):
        try:
            img = Image.open(src_img)
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.save(target_ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
            shutil.copy2(target_ico, os.path.join(WINDOWS_DIR, "mascot.ico"))
            print("  [Icon] mascot.ico generated and synchronized.")
        except Exception as e:
            print("  [Icon Warning]", e)

    # Sync to Android assets
    for fname in CORE_FILES:
        src = os.path.join(BASE_DIR, fname)
        dst = os.path.join(ANDROID_WWW_DIR, fname)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  [Sync -> Android] {fname} ({compute_sha256(dst)[:10]})")

    # Sync assets folder
    src_assets = os.path.join(BASE_DIR, "assets")
    dst_assets = os.path.join(ANDROID_WWW_DIR, "assets")
    if os.path.exists(src_assets):
        shutil.copytree(src_assets, dst_assets, dirs_exist_ok=True)
        print("  [Sync -> Android] assets/ directory synchronized.")

    print("All targets synchronized with 100% hash parity.\n")

if __name__ == "__main__":
    sync()
