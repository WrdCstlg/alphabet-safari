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

## 🧸 Educational Highlights for Kids under 5:
- **Dual Alphabet Explorer**: 26 English letters (A-Z) and 28 Arabic letters (أ - ي) with accurate phonics and Harakat vowels.
- **Auditory Speech & Synth**: Native speech synthesis with child-friendly speed and Web Audio musical chimes.
- **Finger Tracing Board**: Interactive canvas with rainbow sparkles that reinforces fine motor skills.
- **Balloon Pop Mini-Game**: Trains auditory recognition and letter identification with balloon pop effects.
- **Memory Flip Safari**: Builds visual memory and bilingual associations.
- **Parental Gate**: Keeps toddler fingers away from app settings with simple number challenges.
