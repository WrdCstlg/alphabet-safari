// Google Play listing graphics, rendered from the real app so they show what it really does:
//
//   npm run store-assets
//
// Writes fastlane/metadata/android/<locale>/images/: phone, 7" and 10" tablet screenshots
// (git-ignored; CI publishes them as an artifact) and featureGraphic.jpg (1024x500). Re-run
// after a visible UI change. The 512px icon.png comes from sync_assets.py with the other icons.
// Math.random is seeded, so an unchanged app renders the same pictures.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'fastlane', 'metadata', 'android');
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2'
};

// Play: 16:9 or 9:16 (up to 2:1), each side 320-3840px, 1080px+ to be eligible for promotion.
const DEVICES = [
  { dir: 'phoneScreenshots', viewport: { width: 360, height: 640 }, scale: 3 },     // 1080x1920
  { dir: 'sevenInchScreenshots', viewport: { width: 600, height: 960 }, scale: 2 }, // 1200x1920
  { dir: 'tenInchScreenshots', viewport: { width: 1280, height: 800 }, scale: 2 }   // 2560x1600
];
// hero: the letter shown in Explore (L = lion; ز = giraffe). The Arabic set uses the girl profile.
const LOCALES = [
  { dir: 'en-US', lang: 'en', gender: 'boy', hero: 11 },
  { dir: 'ar', lang: 'ar', gender: 'girl', hero: 10 }
];

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Runs in the page before the app: a returning child with some progress, inside the Android
// app (so no "install the app" button), silent, and with repeatable randomness.
function appState({ lang, gender }) {
  let seed = 7;
  Math.random = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  localStorage.setItem('alpha_lang', lang);
  localStorage.setItem('alpha_gender', gender);
  // Stars earned on the way unlock a couple more; the last stickers stay locked.
  localStorage.setItem('alpha_stars', '9');
  localStorage.setItem('alpha_stickers', JSON.stringify(['s1', 's2', 's3', 's4', 's5']));
  window.AndroidBridge = {
    getPlatform: () => 'android',
    vibrate() {},
    stopSpeaking() {},
    speak(text, langTag, rate, id) {
      setTimeout(() => window.AlphabetSafariSpeechDone && window.AlphabetSafariSpeechDone(id, true), 30);
    }
  };
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
}

// Wait for the view to settle, then close any celebration (a sticker unlocked on the way).
// On a phone the header, tabs and mascot bar fill the first screen, so the shot starts at the
// active mode's own section; tablets show the whole layout from the top. (<body> is the page's
// scroller: html and body both set overflow-x.)
async function settle(page, ms = 600) {
  await page.waitForTimeout(ms);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    for (const el of [document.scrollingElement, document.body, ...document.querySelectorAll('body *')]) {
      if (el && el.scrollTop > 0) el.scrollTo({ top: 0, behavior: 'instant' });
    }
    if (window.innerHeight < 700) {
      document.querySelector('.app-view.active')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  });
  await page.waitForTimeout(350);
}

// Trace the letter the way a finger would: strokes across the glyph's bounding box.
async function traceLetter(page, lang) {
  const box = await page.evaluate(() => {
    const canvas = document.getElementById('trace-guide-canvas');
    const { width: w, height: h } = canvas;
    const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (data[(y * w + x) * 4 + 3] > 60) {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
    }
    const r = canvas.getBoundingClientRect();
    const sx = r.width / w, sy = r.height / h;
    return { left: r.left + x0 * sx, top: r.top + y0 * sy, width: (x1 - x0) * sx, height: (y1 - y0) * sy };
  });
  const strokes = lang === 'en'
    ? [[[0.5, 0.08], [0.16, 0.9]], [[0.5, 0.08], [0.84, 0.9]], [[0.3, 0.64], [0.7, 0.64]]] // A
    : [[[0.5, 0.3], [0.5, 0.94]], [[0.62, 0.06], [0.42, 0.12], [0.6, 0.2]]];              // أ
  for (const stroke of strokes) {
    const at = ([fx, fy]) => [box.left + fx * box.width, box.top + fy * box.height];
    await page.mouse.move(...at(stroke[0]));
    await page.mouse.down();
    for (const point of stroke.slice(1)) await page.mouse.move(...at(point), { steps: 18 });
    await page.mouse.up();
  }
}

async function screenshots(browser, base, locale, device) {
  const dir = path.join(OUT, locale.dir, 'images', device.dir);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: device.viewport, deviceScaleFactor: device.scale, serviceWorkers: 'block', locale: locale.lang
  });
  await context.addInitScript(appState, locale);
  const page = await context.newPage();
  const shot = name => page.screenshot({ path: path.join(dir, `${name}.jpg`), type: 'jpeg', quality: 90 });
  const mode = m => page.click(`.mode-tab[data-mode="${m}"]`);

  await page.goto(`${base}/index.html`);
  await page.waitForSelector('#letters-grid .grid-letter-card');
  await page.evaluate(() => document.fonts.ready);

  await page.locator('#letters-grid .grid-letter-card').nth(locale.hero).click();
  await settle(page);
  await shot('1_explore');

  await mode('trace');
  await page.locator('#trace-letter-ribbon .trace-chip').first().click();
  await settle(page);
  await traceLetter(page, locale.lang);
  await settle(page, 1200); // a well-traced letter earns stars and a celebration
  await shot('2_trace');

  await mode('balloon');
  await settle(page, 3200); // let the first balloons float up
  await shot('3_balloons');

  await mode('match');
  await settle(page);
  await shot('4_find_letter');

  // Turn over one matching pair (it stays face up) and one more card.
  await mode('memory');
  await settle(page);
  await page.evaluate(lang => {
    const cards = [...document.querySelectorAll('#memory-grid .memory-card')];
    const letterCard = cards.find(c => c.querySelector('.memory-val-letter'));
    const char = letterCard.querySelector('.memory-val-letter').textContent.trim();
    const item = window.ALPHABET_CONTENT[lang].find(i => i.char === char);
    const picture = cards.find(c => c.querySelector('.memory-val-pic')?.textContent.trim() === item.emoji);
    letterCard.click();
    picture.click();
  }, locale.lang);
  await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('#memory-grid .memory-card:not(.matched)')][1].click());
  await settle(page, 500);
  await shot('5_memory');

  await mode('stickers');
  await settle(page);
  await page.evaluate(() => {
    const tray = document.querySelectorAll('#sticker-tray .sticker-item:not(.locked)');
    for (const n of [0, 1, 2, 4, 5]) tray[n]?.click();
  });
  await settle(page, 900);
  await shot('6_stickers');

  await context.close();
}

async function featureGraphic(browser, base, locale) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.goto(`${base}/tools/store/feature-graphic.html?lang=${locale.lang}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, locale.dir, 'images', 'featureGraphic.jpg'), type: 'jpeg', quality: 92 });
  await page.close();
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
try {
  for (const locale of LOCALES) {
    for (const device of DEVICES) {
      await screenshots(browser, base, locale, device);
      console.log(`  ${locale.dir} ${device.dir}: 6 screenshots`);
    }
    await featureGraphic(browser, base, locale);
    console.log(`  ${locale.dir}: featureGraphic.jpg`);
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`Store graphics written to ${path.relative(ROOT, OUT)}/`);
