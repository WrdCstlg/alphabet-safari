"""
Validate content.js against the recorded audio.

Catches the class of bug where the picture on screen and the spoken clip disagree
(e.g. the card shows a yo-yo while the voice says "yacht"), missing phrases, and
clips that are missing or were recorded from an older phrase.

Usage: py tools/validate_content.py   (exit code 1 on any error)
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import generate_studio_audio as gen  # noqa: E402

REQUIRED = {
    "en": ["char", "lower", "name", "phonics", "word", "emoji", "meaning", "audio", "phrase"],
    "ar": ["char", "name", "translit", "phonics", "word", "wordTranslit", "emoji", "meaning",
           "fatha", "damma", "kasra", "sukun", "audio", "phrase"],
}
EXPECTED_COUNT = {"en": 26, "ar": 28}
HARAKAT = re.compile(r"[ً-ْٰـ]")  # tashkeel, superscript alif, tatweel


def normalize_ar(s):
    s = HARAKAT.sub("", s)
    return re.sub("[أإآ]", "ا", s)


def main():
    content = gen.load_content()
    errors, warnings = [], []

    for lang in ("en", "ar"):
        items = content[lang]
        if len(items) != EXPECTED_COUNT[lang]:
            errors.append(f"{lang}: expected {EXPECTED_COUNT[lang]} letters, found {len(items)}")
        for field in ("char", "audio"):
            values = [i.get(field) for i in items]
            dupes = {v for v in values if values.count(v) > 1}
            if dupes:
                errors.append(f"{lang}: duplicate {field} values {sorted(dupes)}")
        emojis = [i.get("emoji") for i in items]
        for e in {e for e in emojis if emojis.count(e) > 1}:
            warnings.append(f"{lang}: emoji {e} used by more than one letter")

        for item in items:
            label = f"{lang}:{item.get('char')}"
            missing = [f for f in REQUIRED[lang] if not item.get(f)]
            if missing:
                errors.append(f"{label} missing fields {missing}")
                continue
            phrases = [item["phrase"]] if lang == "en" else [item["phrase"].get("boy"), item["phrase"].get("girl")]
            for phrase in phrases:
                if not phrase:
                    errors.append(f"{label} missing a gendered phrase")
                    continue
                if lang == "en":
                    word = item["word"].lower().replace("-", "")
                    ok = word in phrase.lower().replace("-", "")
                else:
                    ok = normalize_ar(item["word"]) in normalize_ar(phrase)
                if not ok:
                    errors.append(f"{label} phrase never says the on-screen word '{item['word']}': {phrase}")

    manifest = gen.load_manifest()
    for rel, voice, text in gen.planned_clips(content):
        if not gen.is_current(rel, gen.clip_hash(voice, text), manifest):
            errors.append(f"audio {rel} is missing or stale; run `py generate_studio_audio.py`")

    for w in warnings:
        print(f"  [WARN] {w}")
    for e in errors:
        print(f"  [FAIL] {e}")
    print(f"Content validation: {len(errors)} error(s), {len(warnings)} warning(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
