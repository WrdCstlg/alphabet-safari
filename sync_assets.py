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
CORE_FILES = ["index.html", "styles.css", "content.js", "script.js", "manifest.json", "sw.js", "privacy.html"]
# Never shipped inside the app: runtime caches, generator bookkeeping, and the full-size
# source images (the app uses the small icon-*.png / *-256.webp renditions made from them).
ASSET_IGNORE = shutil.ignore_patterns("cache_audio", "manifest.json", "*.part", ".DS_Store", "Thumbs.db",
                                      "mascot.jpg", "star_badge.jpg")
ANDROID_RES_DIR = os.path.join(BASE_DIR, "android", "app", "src", "main", "res")
DENSITY_SCALE = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


PLAY_LISTING_DIR = os.path.join(BASE_DIR, "fastlane", "metadata", "android")
PLAY_LOCALES = ["en-US", "ar"]


IOS_APP_ICON = os.path.join(BASE_DIR, "ios", "AlphabetSafari", "Assets.xcassets", "AppIcon.appiconset", "AppIcon.png")
PNG_COLOUR_TYPES = {"RGB": 2, "RGBA": 6}  # IHDR colour type


def launcher_icon_specs():
    """(path, pixel size, required colour or None) of every generated app icon: the 48dp
    legacy launcher icons, the 108dp adaptive icon layer (mipmap-anydpi-v26/ic_launcher.xml
    uses it), the 512px Google Play listing icon, which must be a 32-bit PNG (RGBA), and the
    1024px iOS app icon, which the App Store rejects if it has an alpha channel (RGB)."""
    for density, scale in DENSITY_SCALE.items():
        folder = os.path.join(ANDROID_RES_DIR, f"mipmap-{density}")
        yield os.path.join(folder, "ic_launcher.png"), int(48 * scale), None
        yield os.path.join(folder, "ic_launcher_round.png"), int(48 * scale), None
        yield os.path.join(folder, "ic_launcher_background.png"), int(108 * scale), None
    for locale in PLAY_LOCALES:
        yield os.path.join(PLAY_LISTING_DIR, locale, "images", "icon.png"), 512, "RGBA"
    yield IOS_APP_ICON, 1024, "RGB"


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


def is_png(path, size=None, colour=None):
    """True if `path` is a real PNG (optionally of `size` x `size` pixels, optionally of a
    colour type, "RGB" or "RGBA"). Reads the header only; no Pillow needed."""
    try:
        with open(path, "rb") as f:
            head = f.read(26)
    except OSError:
        return False
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return False
    if colour and head[25] != PNG_COLOUR_TYPES[colour]:
        return False
    return size is None or (int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")) == (size, size)


def update_launcher_icons():
    """Render the Android launcher icons from mascot.jpg at each density's size.

    These used to be copies of the 1024px JPEG renamed to .png: ten of them, 6.5 MB in the
    APK, and not valid PNGs, which release builds reject when they crunch PNGs.
    """
    src_img = os.path.join(BASE_DIR, "assets", "mascot.jpg")
    if not os.path.exists(src_img):
        return
    stale = [(path, size) for path, size, colour in launcher_icon_specs()
             if not is_png(path, size, colour) or os.path.getmtime(src_img) > os.path.getmtime(path)]
    if not stale:
        return
    try:
        from PIL import Image, ImageDraw, ImageFilter

        art = Image.open(src_img).convert("RGBA")
        for path, size in stale:
            name = os.path.basename(path)
            if name == "ic_launcher_background.png":
                # Launchers mask the middle 72dp of this 108dp layer and move it for effects.
                # The art fills 76dp, so a mask shows ~95% of it; the blurred copy around it
                # only shows while the icon animates.
                layer = art.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(size / 30))
                inner = round(size * 76 / 108)
                layer.paste(art.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2,) * 2)
                layer.convert("RGB").save(path, format="PNG", optimize=True)
            elif path == IOS_APP_ICON:
                # iOS rounds the corners itself; App Store icons must not be transparent.
                os.makedirs(os.path.dirname(path), exist_ok=True)
                art.resize((size, size), Image.LANCZOS).convert("RGB").save(path, format="PNG", optimize=True)
            elif name == "icon.png":
                # Play adds its own rounded mask and shadow, so the full square art goes in.
                os.makedirs(os.path.dirname(path), exist_ok=True)
                art.resize((size, size), Image.LANCZOS).save(path, format="PNG", optimize=True)
            elif name == "ic_launcher_round.png":
                # Draw the circle mask 4x larger and scale it down for a smooth edge.
                icon = art.resize((size, size), Image.LANCZOS)
                mask = Image.new("L", (size * 4, size * 4), 0)
                ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
                icon.putalpha(mask.resize((size, size), Image.LANCZOS))
                icon.save(path, format="PNG", optimize=True)
            else:
                art.resize((size, size), Image.LANCZOS).convert("RGB").save(path, format="PNG", optimize=True)
        print(f"  [Icon] App icons regenerated ({len(stale)} files).")
    except Exception as e:  # Pillow missing: keep the committed icons; --verify reports bad ones
        print("  [Icon Warning]", e)


def sync():
    print("=== Alphabet Safari: Unified Asset Synchronization ===")
    os.makedirs(ANDROID_WWW_DIR, exist_ok=True)
    os.makedirs(WINDOWS_DIR, exist_ok=True)

    update_icon()
    update_launcher_icons()

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
