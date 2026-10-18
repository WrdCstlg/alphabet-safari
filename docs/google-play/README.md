# Publishing Alphabet Safari on Google Play

Everything the repository can do is automated and checked in CI. This page covers what needs a
person (accounts, keys, Play Console forms) and the answers to give in Play Console.

## What is ready

| Area | Where | Checked by |
|---|---|---|
| Signed, R8-minified release bundle (`.aab`), targetSdk 36 | `android/` | CI `Android Build & Emulator Test` |
| App runs on Android 16: bridge, clips, fonts, speech, Back, restart, rotation, camera cutout | `tests/android-device.mjs` | CI, on an API 36 emulator |
| Only the vibration permission ships; no internet, no advertising ID | merged manifest | CI `Check Shipped Permissions`, `build.py --verify` |
| Privacy policy, English and Arabic, in the app (behind the parent gate) and online | `privacy.html` | smoke test |
| Store listing text, English and Arabic, within Play's length limits | `fastlane/metadata/android/` | `build.py --verify` |
| Icon (512px, 32-bit), feature graphic (1024x500) | same folder | `build.py --verify` |
| Phone, 7" and 10" tablet screenshots, English and Arabic | CI artifact `AlphabetSafari-Play-Listing`, or `npm run store-assets` | rendered from the real app |
| Upload to a Play track with release notes and the R8 mapping file | `.github/workflows/release.yml` | `actionlint` |

## Steps only you can do, in order

1. **Developer account.** Sign up at <https://play.google.com/console> (one-time US$25 fee,
   identity verification). A *personal* account created after 13 November 2023 must run a
   **closed test with at least 12 testers, opted in for 14 days in a row**, before it can apply
   for production. Start that clock as early as possible. An *organization* account (needs a
   D-U-N-S number) skips that requirement.
2. **Upload key and CI secrets.** Follow [README-ANDROID.md](../../README-ANDROID.md#-releasing-to-google-play).
   After that, every CI run on `main` produces `AlphabetSafari-Play-Bundle-signed`.
3. **Create the app** in Play Console: name *Alphabet Safari: ABC & Arabic*, default language
   English (United States), App, Free.
4. **First upload by hand.** Play's API can't upload the first build of a new app. Download the
   signed bundle from a green CI run on `main` and upload it under *Test and release > Internal
   testing > Create new release*. Accept Google-managed app signing. This fixes the package name
   `com.alphabetsafari.app` for good.
5. **App content** declarations: use the answers below.
6. **Store listing**: paste the text from `fastlane/metadata/android/en-US/` and add the Arabic
   (`ar`) translation from `fastlane/metadata/android/ar/`. Upload `icon.png`,
   `featureGraphic.jpg` and the screenshots. Category: **Education**. Contact email: required
   and shown publicly; consider also adding it to the *Changes and contact* section of `privacy.html`.
7. **Service account for automatic uploads** (optional, for later builds):
   1. In Google Cloud, create a project, enable the *Google Play Android Developer API*, create a
      service account and download a JSON key.
   2. In Play Console, *Users and permissions > Invite new users*: the service account's email,
      with *Release apps to testing tracks* (and *Release to production* if wanted) for this app.
   3. Save the JSON as the repository (or `google-play` environment) secret `PLAY_SERVICE_ACCOUNT_JSON`.
   4. Then: *Actions > Release to Google Play > Run workflow*. Use status `draft` until the app's
      first release has been published, `completed` after.
8. **Closed test → production.** Promote the build to a closed track, invite at least 12 testers,
   keep them opted in for 14 days, then apply for production access from the dashboard.

## Answers for Play Console

**Privacy policy URL**: <https://wrdcstlg.github.io/alphabet-safari/privacy.html> (published by the
`Deploy to GitHub Pages` job; check that it loads before submitting).

**Ads**: No, the app does not contain ads.

**App access**: All functionality is available without special access. (Parents Corner asks an
on-screen sum; it is a parental gate, not a login.)

**Content rating** (IARC questionnaire): pick the educational/reference category if offered,
otherwise *All other app types*. Answer **No** to violence, fear, sexual content, language,
controlled substances, gambling and crude humour; **No** to user interaction, sharing of user
content, sharing location and digital purchases. Expect *Everyone* / PEGI 3 / USK 0.

**Target audience and content**: ages **5 and under** (optionally also 6–8). The app is designed
for children, so the Families policy applies; it already meets the parts that matter here: no
ads or ad SDKs, no data collection, no location, no links out of the app, settings behind a parental gate.

**Data safety**:
- Does your app collect or share any of the required user data types? **No.**
- Why that is accurate: the Android app has no internet permission (enforced in CI), so it cannot
  send anything. The optional name, avatar, settings, stars and stickers are stored on the device
  only, which Play does not count as collection. Phrases that contain the child's name are only
  spoken by on-device voices. Android's cloud backup includes none of this.
- If the form asks: no account creation; deletion is in Parents Corner (*Erase Everything*) or by
  uninstalling.

**Advertising ID**: No, the app does not use an advertising ID.

**Government, financial, health, news apps**: No / none.

## Check on real phones during the closed test

The emulator test can't cover these:
- Speech is **audible** on an Android 16 phone. (The emulator logged Android 16's
  "AudioHardening" notice for the speech engine; playback worked, but there's no speaker to hear it.)
- Arabic phrases on a phone without an Arabic speech voice: letter sounds are recorded clips and
  always play; spoken praise needs a voice (*Settings > Text-to-speech*).
- The first launch shows Android's own "swipe down to exit full screen" hint once; Back works after it.
- A tablet in both orientations, and an older, low-memory phone.

## Versions

- `versionCode` = number of commits on the built commit, in CI and in `release.yml`, so a later
  commit always uploads over an earlier one.
- `versionName` stays `1.0.0` unless the release workflow is given one (e.g. `1.0.1`).
- Release notes for the next upload: `fastlane/metadata/android/<locale>/changelogs/default.txt`
  (500 characters at most; `build.py --verify` checks).
