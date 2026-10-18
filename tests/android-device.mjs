// Device test: drives the installed Android app on an emulator or phone, through adb and
// the WebView's DevTools socket (debug builds only expose it).
//
//   node tests/android-device.mjs [path/to/app-debug.apk]
//
// adb comes from $ADB, $ANDROID_HOME/platform-tools, or PATH. Screenshots and the logcat go
// to $DEVICE_TEST_OUT (default device-test-output/). CI runs this on an API 36 emulator.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { _android as android } from 'playwright';

const PKG = 'com.alphabetsafari.app';
const OUT = path.resolve(process.env.DEVICE_TEST_OUT || 'device-test-output');
const ADB = process.env.ADB || (process.env.ANDROID_HOME
  ? path.join(process.env.ANDROID_HOME, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
  : 'adb');

// A failure outside a check (boot, install, attaching to the app) still says why in the CI summary.
process.on('uncaughtException', err => {
  console.error(err);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Device test could not run::${String(err.message).split('\n')[0]}`);
  process.exit(1);
});

const adb = (...args) => execFileSync(ADB, args, { encoding: 'utf8' }).trim();
const shell = (cmd) => adb('shell', cmd);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(what, fn, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      const value = await fn();
      if (value) return value;
    } catch { /* not ready yet */ }
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(500);
  }
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false });
    console.log(`  FAIL  ${name}\n        ${err.message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=Device test failed::${name}: ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const isResumed = () => /topResumedActivity.*com\.alphabetsafari\.app|mResumedActivity.*com\.alphabetsafari\.app/
  .test(shell('dumpsys activity activities'));

// (Re)start the app and attach to its WebView. Returns the page. Matching on the new process
// id means a restart can't attach to the old, dead WebView. A cold CI emulator can take most
// of a minute to start the WebView the first time, so the limits are generous and a launch
// that still doesn't attach is tried once more.
async function launch({ fresh = false } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      shell(`am force-stop ${PKG}`);
      if (fresh) shell(`pm clear ${PKG}`);
      shell(`am start -W -n ${PKG}/.MainActivity`);
      const pid = Number(await waitFor('the app process', () => shell(`pidof ${PKG}`)));
      const webview = await waitFor('the app WebView', () => device.webViews().find(w => w.pid() === pid), 60000);
      const page = await Promise.race([webview.page(), sleep(60000).then(() => { throw new Error('WebView page did not attach'); })]);
      await page.waitForSelector('#letters-grid .grid-letter-card', { timeout: 45000 });
      return page;
    } catch (err) {
      if (attempt >= 2) throw err;
      console.log(`  (launch attempt ${attempt} failed: ${err.message.split('\n')[0]}; retrying)`);
    }
  }
}

async function passParentGate(page) {
  await page.click('#btn-parents');
  const question = await page.locator('#gate-target-num').textContent();
  const [a, b] = question.split('+').map(n => parseInt(n, 10));
  await page.locator('#gate-options .gate-btn', { hasText: new RegExp(`^${a + b}$`) }).click();
}

function screenshot(name) {
  fs.writeFileSync(path.join(OUT, `${name}.png`), execFileSync(ADB, ['exec-out', 'screencap', '-p']));
}

fs.mkdirSync(OUT, { recursive: true });
await waitFor('the device to finish booting', () => shell('getprop sys.boot_completed') === '1', 120000);
if (process.argv[2]) adb('install', '-r', '-t', process.argv[2]);
// Talks to the adb server started above; the WebView is driven over its DevTools socket.
const [device] = await android.devices({ omitDriverInstall: true });
assert(device, 'no device or emulator attached');
// Windows that would take focus (and the Back press) from the app: Android's one-time "swipe
// down from the top to exit full screen" hint, and the "System UI isn't responding" dialog
// that slow emulators show. App crashes still reach the crash log checked at the end.
shell('settings put secure immersive_mode_confirmations confirmed');
shell('settings put global hide_error_dialogs 1');
for (const scale of ['window_animation_scale', 'transition_animation_scale', 'animator_duration_scale']) {
  shell(`settings put global ${scale} 0`);
}
shell('am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS');
adb('logcat', '-c');

let page = await launch({ fresh: true });

await check('the app loads its bundled page with all 26 letters', async () => {
  assert(await page.locator('#letters-grid .grid-letter-card').count() === 26, 'expected 26 letter cards');
  screenshot('01-explore-portrait');
});

await check('the native bridge is wired up and the web install button is hidden', async () => {
  assert(await page.evaluate(() => window.AndroidBridge.getPlatform()) === 'android', 'AndroidBridge.getPlatform() is not "android"');
  assert(await page.evaluate(() => document.documentElement.classList.contains('native-app')), 'page did not detect the native app');
  assert(!(await page.locator('#btn-android-app').isVisible()), 'the "install the app" button shows inside the app');
});

await check('recorded clips and bundled fonts load from inside the app', async () => {
  const duration = await page.evaluate(() => new Promise((resolve, reject) => {
    const audio = new Audio('assets/audio/en/boy/A.mp3');
    audio.oncanplaythrough = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error(`audio error ${audio.error && audio.error.code}`));
    setTimeout(() => reject(new Error('clip did not load in 10s')), 10000);
    audio.load();
  }));
  assert(duration > 0.2, `clip duration ${duration}`);
  const faces = await page.evaluate(async () => (await document.fonts.load('48px Fredoka', 'A')).length +
    (await document.fonts.load('48px "Safari Emoji"', '🪼')).length);
  assert(faces >= 2, 'Fredoka or the bundled emoji font did not load');
  // The app's own pomegranate (U+E000) is a colour font glyph: count its red pixels.
  const redPixels = await page.evaluate(async () => {
    await document.fonts.load('64px "Safari Emoji"', '');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.font = '64px "Safari Emoji"';
    ctx.textBaseline = 'top';
    ctx.fillText('', 8, 8);
    const d = ctx.getImageData(0, 0, 96, 96).data;
    let red = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] > 150 && d[i + 1] < 100 && d[i + 2] < 100) red++;
    return red;
  });
  assert(redPixels > 500, `the drawn pomegranate is not in colour in the WebView (${redPixels} red pixels)`);
});

await check('speaking through the Android TextToSpeech bridge reports back to the page', async () => {
  const outcome = await page.evaluate(() => new Promise(resolve => {
    const original = window.AlphabetSafariSpeechDone;
    window.AlphabetSafariSpeechDone = (id, ok) => {
      if (id !== 'device-test') return original && original(id, ok);
      window.AlphabetSafariSpeechDone = original;
      resolve(ok ? 'spoken' : 'no-voice');
    };
    window.AndroidBridge.speak('Hello', 'en-US', 1, 'device-test', false);
    setTimeout(() => resolve('timeout'), 15000);
  }));
  // An emulator image may have no speech engine ('no-voice'); the round trip is what matters.
  assert(outcome !== 'timeout', 'no completion callback from the native speech bridge');
});

await check('the privacy policy opens inside the app, behind the parent gate', async () => {
  await passParentGate(page);
  await page.click('#btn-privacy-policy');
  const text = await page.frameLocator('#privacy-frame').locator('#en').textContent({ timeout: 10000 });
  assert(text.includes('does not collect, share or sell any personal information'), 'policy text missing');
  screenshot('02-privacy-policy');
});

await check('Back closes the open dialog first, then leaves the app', async () => {
  shell('input keyevent KEYCODE_BACK');
  await waitFor('the dialogs to close', () => page.evaluate(() => !document.querySelector('.modal-overlay.open')), 5000);
  assert(isResumed(), 'the app left the foreground while a dialog was open');
  shell('input keyevent KEYCODE_BACK');
  await waitFor('the app to leave the foreground', () => !isResumed(), 5000);
});

await check('the chosen language survives a full restart of the app', async () => {
  page = await launch();
  await page.click('#btn-lang-ar');
  await page.waitForTimeout(500);
  page = await launch();
  assert(await page.locator('#letters-grid .grid-letter-card').count() === 28, 'Arabic was not restored after a restart');
  screenshot('03-arabic-after-restart');
  await page.click('#btn-lang-en');
});

// The app follows the motion sensor (screenOrientation="sensor"), so turn the emulator's.
const isEmulator = adb('get-serialno').startsWith('emulator-');
const tilt = (landscape) => adb('emu', 'sensor', 'set', 'acceleration', landscape ? '9.81:0:0' : '0:9.81:0');

// A restart reloads the page and drops the game in progress, so these must not restart it.
await check('rotating and switching dark mode keep the page running (no reload)', async () => {
  if (!isEmulator) return console.log('        (skipped: needs an emulator to rotate)');
  await page.evaluate(() => { window.__stillHere = true; });
  try {
    tilt(true);
    await waitFor('the landscape layout', () => page.evaluate(() => innerWidth > innerHeight), 15000);
    shell('cmd uimode night yes');
    await sleep(2000);
    assert(await page.evaluate(() => window.__stillHere === true), 'the page reloaded');
  } finally {
    shell('cmd uimode night no');
    tilt(false);
  }
  await waitFor('the portrait layout', () => page.evaluate(() => innerHeight > innerWidth), 15000);
});

// The Pixel 6 profile has a camera hole at the top of the screen (the left side in landscape).
await check('display cutout: the page stays clear of it in portrait and landscape', async () => {
  const cutout = shell('dumpsys display').match(/DisplayCutout\{insets=Rect\((\d+), (\d+) - (\d+), (\d+)\)/);
  const cutoutSize = cutout ? Math.max(...cutout.slice(1).map(Number)) : 0;
  if (cutoutSize === 0) return console.log('        (skipped: this device has no display cutout)');
  const [w, h] = shell('wm size').match(/(\d+)x(\d+)/).slice(1).map(Number);
  const [longSide, shortSide] = [Math.max(w, h), Math.min(w, h)];
  const pageSize = () => page.evaluate(() => [innerWidth, innerHeight].map(v => Math.round(v * devicePixelRatio)));
  const [, portraitHeight] = await pageSize();
  assert(portraitHeight <= longSide - cutoutSize + 3,
    `page is ${portraitHeight}px tall on a ${longSide}px screen with a ${cutoutSize}px cutout: it runs under the cutout`);
  if (!isEmulator) return console.log('        (portrait only: needs an emulator to rotate)');
  try {
    tilt(true);
    const [landscapeWidth] = await waitFor('the landscape layout', async () => {
      const size = await pageSize();
      return size[0] > size[1] && size;
    }, 15000);
    assert(landscapeWidth <= longSide - cutoutSize + 3,
      `page is ${landscapeWidth}px wide on a ${longSide}x${shortSide} screen with a ${cutoutSize}px cutout: it runs under the cutout`);
    await sleep(800);
    screenshot('04-landscape-cutout');
  } finally {
    tilt(false);
  }
});

await check('no crash and no uncaught script errors in the device log', async () => {
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  const crashes = execFileSync(ADB, ['logcat', '-d', '-b', 'crash'], opts).split('\n').filter(l => l.includes(PKG));
  // WebView copies console messages to logcat; keep only the app's own (its files are under /www/).
  const scriptErrors = execFileSync(ADB, ['logcat', '-d', '-s', 'chromium:*'], opts).split('\n')
    .filter(l => /Uncaught/.test(l) && l.includes('/www/'));
  fs.writeFileSync(path.join(OUT, 'logcat.txt'), execFileSync(ADB, ['logcat', '-d'], opts));
  assert(crashes.length === 0, `app crashed: ${crashes.slice(0, 3).join(' | ')}`);
  assert(scriptErrors.length === 0, scriptErrors.slice(0, 3).join(' | '));
});

await device.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} device checks passed. Output: ${OUT}`);
process.exit(failed ? 1 : 0);
