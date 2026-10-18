"""
Pick the iPhone and iPad simulators for CI: the newest iOS runtime installed, and the largest
models (also the App Store's screenshot sizes). Prints GitHub Actions step outputs:
iphone=<udid>, iphone_name=..., ipad=<udid>, ipad_name=...
"""
import json
import subprocess


def size_rank(name):
    if "Pro Max" in name or "13-inch" in name:
        return 2
    if "Plus" in name or "Pro" in name or "Air" in name:
        return 1
    return 0


def main():
    listing = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "--json"]))
    best = {}
    for runtime, devices in listing["devices"].items():
        if ".iOS-" not in runtime:
            continue
        version = tuple(int(part) for part in runtime.split(".iOS-")[1].split("-"))
        for device in devices:
            name = device["name"]
            kind = "iphone" if name.startswith("iPhone") else "ipad" if name.startswith("iPad") else None
            if kind is None:
                continue
            key = (version, size_rank(name))
            if kind not in best or key > best[kind][0]:
                best[kind] = (key, device["udid"], f"{name} (iOS {'.'.join(map(str, version))})")
    for kind in ("iphone", "ipad"):
        _, udid, label = best[kind]
        print(f"{kind}={udid}")
        print(f"{kind}_name={label}")


if __name__ == "__main__":
    main()
