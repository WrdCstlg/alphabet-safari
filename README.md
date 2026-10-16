# 🦁🎈 Alphabet Safari (English & Arabic)

**Alphabet Safari** is an educational, interactive bilingual learning application designed for toddlers and preschoolers (ages 2 to 5) to learn both the English and Arabic alphabets through auditory and visual immersion.

The application is built on a **Unified Multi-Target Architecture**, sharing identical core phonics, voice synthesis, companion profile state, and interactive mini-games across **Native Android**, **Native Windows Desktop**, and **Web / PWA / GitHub Pages**.

---

## 🏛️ Unified Architecture Overview

```mermaid
flowchart TD
    Core[Unified Core Engine<br/>index.html | styles.css | script.js | assets]
    Bridge[Platform Bridge<br/>Haptics | Fullscreen | Shortcuts | Audio]
    Core --> Bridge

    Bridge --> Android[Android Native Target<br/>Kotlin WebView + Immersive Sticky<br/>android/app/build/outputs/apk/debug/app-debug.apk]
    Bridge --> Windows[Windows Desktop Target<br/>Edge WebView2 + PyInstaller<br/>windows/dist/AlphabetSafari.exe]
    Bridge --> Web[Cloud & PWA Target<br/>GitHub Pages + Docker Container<br/>wrdcstlg.github.io/alphabet-safari]
```

### Key Architectural Pillars:
1. **Single Source of Truth (`index.html`, `styles.css`, `script.js`)**:
   - 100% hash parity maintained across targets via `sync_assets.py`.
   - Preschool Boy/Girl companion profile picker (Leo the Lion & Noor the Bunny) with 8 custom avatars.
   - Dual phonics engine: 26 English letters (A-Z) and 28 Arabic letters (أ - ي) with authentic child-friendly audio and Harakat vowels.
2. **Unified `PlatformBridge`**:
   - **Android**: Native haptic vibration via `AndroidBridge`, full-screen sticky immersive mode (status bar and navigation bar hidden for toddler safety).
   - **Windows Desktop**: Microsoft Edge WebView2 Chromium runtime, F11 kiosk fullscreen toggle, Spacebar speech repeat, and Escape modal exit.
   - **Web / PWA**: Service Worker caching (`sw.js`) and Web App Manifest (`manifest.json`) for 1-tap installation to home screen.

---

## 🚀 Building & Running

### 1. Unified Multi-Target CLI (`build.py` / `build.bat`)
Run the unified build CLI from the root folder:

```powershell
# Sync assets and verify integrity across all targets
py build.py --sync --verify

# Compile standalone Windows desktop executable
py build.py --windows

# Compile native Android debug APK
py build.py --android

# Build both platforms simultaneously
py build.py --all
```

---

### 2. Windows Native Desktop

#### Instant 1-Click Launch:
Double-click `Launch_Alphabet_Safari_Windows.bat` or run:
```powershell
py windows/alphabet_safari_app.py
```

#### Standalone Executable:
- Pre-packaged standalone `.exe` built with PyInstaller:
  ```
  windows/dist/AlphabetSafari.exe (~16.8 MB)
  ```
- Features:
  - Letters, recorded phonics clips and games work fully offline.
  - Dynamic phrases (praise, the child's name, game prompts) use Microsoft neural voices via
    `edge-tts` when online, cached in `%LOCALAPPDATA%\AlphabetSafari\tts_cache`; offline they fall
    back to the installed Windows voices.
  - Progress (stars, stickers, settings) is kept between launches: the app uses a fixed local
    port (48127) and persistent WebView2 storage in `%LOCALAPPDATA%\AlphabetSafari\webview`.
  - Multi-resolution mascot icon (`assets/mascot.ico`).

---

### 3. Android Native App

#### Project Location:
The complete Kotlin Android project resides in `android/`.

#### Build via Gradle Wrapper:
```bash
cd android
./gradlew assembleDebug
```
Output APK is generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Dynamic phrases are spoken with the device's TextToSpeech engine through `AndroidBridge.speak`
(Android WebView has no Web Speech API). Recorded phonics clips play from the bundled assets.

---

### 4. Web & Cloud Hosting

- **Live Production Deployment**: [https://wrdcstlg.github.io/alphabet-safari/](https://wrdcstlg.github.io/alphabet-safari/)
- **Local Docker Stack**:
  ```powershell
  docker compose up -d
  # Access at http://localhost:8085
  ```

---

## ✏️ Editing Letters, Words & Voices

All letters, picture words, emoji and spoken phrases live in **`content.js`**, the single
source of truth shared by the app, the audio generator and the validator. After editing it:

```powershell
py generate_studio_audio.py   # re-records only the clips whose phrase or voice changed
py build.py --sync --verify   # copies to Android and checks parity + content + audio
```

`tools/validate_content.py` fails if a phrase never says its on-screen word (e.g. the picture
shows a yo-yo but the voice says "yacht"), a field is missing, or a clip is missing or stale.
`assets/audio/manifest.json` records which phrase each clip was recorded from.

## 🧪 Checks

```powershell
npm ci                                  # dev tooling only; the app has no build step
npm run lint                            # ESLint, including no-undef
$env:BROWSER_CHANNEL="msedge"; npm run smoke   # drives every mode in a real browser
py build.py --verify                    # asset parity + content/audio validation
```

## 🤖 GitHub Actions Automated CI/CD

The repository includes end-to-end continuous integration and deployment workflows:

1. **`ci.yml`**:
   - `Core Web & Asset Parity Validation`: ESLint, syntax checks, manifest validation, Android asset parity, and content/audio validation.
   - `Browser Smoke Test`: Playwright drives every mode in headless Chromium.
   - `Android Native APK Build`: Ubuntu runner with JDK 17 compiles `app-debug.apk` and uploads it as an artifact.
   - `Windows Standalone Desktop Build`: Windows runner compiles `AlphabetSafari.exe` and uploads it as an artifact.
   - `Docker Web Server Live Verification`: Docker build and live endpoint curl assertion.
2. **`deploy.yml`**:
   - Automatic live deployment to GitHub Pages on every push to `main`.
