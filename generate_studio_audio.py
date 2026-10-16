"""
Generate the studio-quality phonics clips in assets/audio/ from content.js.

Each clip is recorded with Microsoft Edge neural voices (edge-tts). A manifest
(assets/audio/manifest.json) stores a hash of the voice + phrase behind every
clip, so editing a phrase in content.js re-records exactly the clips it affects.

Usage:
  py generate_studio_audio.py                  # record missing or changed clips
  py generate_studio_audio.py --force          # re-record everything
  py generate_studio_audio.py --adopt-existing # trust existing files, just write the manifest
  py generate_studio_audio.py --check          # exit 1 if any clip is missing or stale (no network)
"""
import argparse
import asyncio
import hashlib
import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(BASE_DIR, "assets", "audio")
MANIFEST_PATH = os.path.join(AUDIO_DIR, "manifest.json")
CONTENT_PATH = os.path.join(BASE_DIR, "content.js")
CONTENT_PREFIX = "\nwindow.ALPHABET_CONTENT = "


def load_content(path=CONTENT_PATH):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    start = text.index(CONTENT_PREFIX) + len(CONTENT_PREFIX)
    return json.loads(text[start:].strip().rstrip(";"))


def planned_clips(content):
    """Yield (relative_path, voice, text) for every clip the app expects."""
    voices = content["voices"]
    for gender in ("boy", "girl"):
        for item in content["en"]:
            yield f"en/{gender}/{item['audio']}.mp3", voices["en"][gender], item["phrase"]
        for item in content["ar"]:
            yield f"ar/{gender}/{item['audio']}.mp3", voices["ar"][gender], item["phrase"][gender]


def clip_hash(voice, text):
    return hashlib.sha256(f"{voice}\n{text}".encode("utf-8")).hexdigest()[:16]


def load_manifest():
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_manifest(manifest):
    with open(MANIFEST_PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(dict(sorted(manifest.items())), f, indent=1)
        f.write("\n")


def is_current(rel, h, manifest):
    path = os.path.join(AUDIO_DIR, rel)
    return manifest.get(rel) == h and os.path.exists(path) and os.path.getsize(path) > 1000


async def record(rel, voice, text, sem):
    import edge_tts

    out_path = os.path.join(AUDIO_DIR, rel)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    async with sem:
        tmp_path = out_path + ".part"
        await edge_tts.Communicate(text, voice).save(tmp_path)
        os.replace(tmp_path, out_path)
    print(f"  [Studio Audio] {rel} OK")


async def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--adopt-existing", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    clips = list(planned_clips(load_content()))
    manifest = load_manifest()

    if args.adopt_existing:
        for rel, voice, text in clips:
            if os.path.exists(os.path.join(AUDIO_DIR, rel)):
                manifest[rel] = clip_hash(voice, text)
        save_manifest(manifest)
        print(f"Adopted {len(manifest)} existing clips into the manifest.")
        return 0

    todo = [c for c in clips if args.force or not is_current(c[0], clip_hash(c[1], c[2]), manifest)]

    if args.check:
        for rel, _, _ in todo:
            print(f"  [STALE] {rel}")
        print(f"{len(clips) - len(todo)}/{len(clips)} clips up to date.")
        return 1 if todo else 0

    print(f"=== Recording {len(todo)} of {len(clips)} studio clips ===")
    sem = asyncio.Semaphore(4)
    results = await asyncio.gather(*(record(rel, v, t, sem) for rel, v, t in todo), return_exceptions=True)

    failures = 0
    for (rel, voice, text), result in zip(todo, results):
        if isinstance(result, Exception):
            failures += 1
            print(f"  [Studio Audio ERROR] {rel}: {result}")
        else:
            manifest[rel] = clip_hash(voice, text)
    save_manifest(manifest)
    print("=== Audio generation complete ===" if not failures else f"=== {failures} clip(s) failed ===")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
