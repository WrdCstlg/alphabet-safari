# 📱 Android App Installation & Parent Guide

Welcome to **Alphabet Safari Kids (English & Arabic)**! This app is specially designed for toddlers and preschoolers (Ages 2 to 5) to learn both the English and Arabic alphabets through joyful visual and auditory stimulation.

---

## 🌟 Method 1: Instant 1-Tap Install (Recommended for Parents)
Parents can install Alphabet Safari onto **any Android phone or tablet** directly without needing Android Studio or complex command-line tools.

### Steps:
1. Open Google Chrome (or Samsung Internet) on your Android tablet or phone.
2. Navigate to the web app address (or local Wi-Fi IP when running locally, e.g., `http://<your-computer-ip>:8000`).
3. Tap the **"📱 App"** button at the top right of the screen (or tap the 3-dot menu `⋮` in Chrome).
4. Tap **"Install app"** or **"Add to Home Screen"**.
5. Tap **"Install"**.

🎉 **Done!** The *Alphabet Safari* icon with Leo the Lion and Noor the Bunny will appear on your device's home screen. When tapped, it opens in full-screen immersion mode with full offline functionality and sound effects!

---

## 🛠️ Method 2: Standalone Android APK (Android Studio Project)

For developers or parents who want to compile a signed `.apk` file:

### Project Location:
The complete native Android project is located in:
```
Children's Arabic and English Alphabet/android/
```

### Features included in the Android Wrapper:
- **Full-Screen Immersive Sticky Mode**: Automatically hides the Android navigation buttons and status bar so toddler fingers cannot accidentally close the app.
- **Hardware Acceleration**: Smooth animations, balloon pops, and sparkle brushes powered by Android hardware acceleration.
- **Pre-bundled Assets**: The entire app runs from `file:///android_asset/www/` with 0 external network dependencies.
- **Audio Enabled**: Hardware media autoplay without user gesture constraints for instant sound feedback.

### How to Build & Run with Android Studio:
1. Open **Android Studio** (Hedgehog, Iguana, Jellyfish, or newer).
2. Select **Open** and choose the `android` folder inside this project directory.
3. Allow Gradle to sync.
4. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate `app-debug.apk`.
5. Connect your Android tablet or phone via USB (with USB Debugging enabled) and click **Run** (Green play button ▶).
6. The APK will be installed directly on your device.

---

## 🚀 Releasing to Google Play

Play takes an Android App Bundle (`.aab`) signed with your **upload key**. Play App Signing
then re-signs it for devices, so a lost upload key can be reset through Play support. The
app signing key itself never leaves Google.

### 1. Create the upload key (once)
Keep the `.jks` file and both passwords somewhere safe outside the repo (a password manager).
`*.jks` and `android/keystore.properties` are git-ignored.
```bash
keytool -genkeypair -v -keystore alphabet-safari-upload.jks -alias upload \
  -keyalg RSA -keysize 4096 -validity 10000
```

### 2a. Build a signed bundle locally
Create `android/keystore.properties`:
```properties
storeFile=C:/path/to/alphabet-safari-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```
Then:
```bash
cd android
./gradlew bundleRelease -PversionCode=2   # every upload needs a higher versionCode
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

### 2b. Or let CI sign it
Add these repository secrets (GitHub → Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 alphabet-safari-upload.jks` (PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("alphabet-safari-upload.jks"))`) |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | the key password |

Every CI run then publishes an `AlphabetSafari-Play-Bundle-signed` artifact whose versionCode is
the commit count, ready to upload to a Play testing track. Without the secrets the bundle is
built unsigned (`...-unsigned`), which still proves the release build works.

### 3. Publish
Accounts, the first upload, Play Console's forms and the `Release to Google Play` workflow are
covered step by step in [docs/google-play/README.md](docs/google-play/README.md).

### Testing on a device
`npm run device -- android/app/build/outputs/apk/debug/app-debug.apk` drives the debug app on a
connected phone or emulator (adb on PATH or `ANDROID_HOME` set): the native bridge, recorded
clips, speech, the privacy policy, Back, restarts, rotation and the camera cutout. CI runs it on
an API 36 emulator.

---

## 🧸 Educational Highlights for Kids under 5:
- **Dual Alphabet Explorer**: 26 English letters (A-Z) and 28 Arabic letters (أ - ي) with accurate phonics and Harakat vowels.
- **Auditory Speech & Synth**: Native speech synthesis with child-friendly speed and Web Audio musical chimes.
- **Finger Tracing Board**: Interactive canvas with rainbow sparkles that reinforces fine motor skills.
- **Balloon Pop Mini-Game**: Trains auditory recognition and letter identification with balloon pop effects.
- **Memory Flip Safari**: Builds visual memory and bilingual associations.
- **Parental Gate**: Keeps toddler fingers away from app settings with simple number challenges.
