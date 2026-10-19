// End-to-end smoke test: serves the app and drives it in a real browser.
//
//   npm run smoke                        (Playwright's bundled Chromium; CI)
//   BROWSER=webkit npm run smoke         (WebKit: the engine of Safari and every iOS app; CI)
//   BROWSER_CHANNEL=msedge npm run smoke (installed Microsoft Edge; no browser download)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium, webkit } from 'playwright';

const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const ROOT = path.resolve(process.env.SMOKE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff2': 'font/woff2'
};

function serve() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    // As real hosts do: Content-Length (without it, WebKit on Linux can't tell an MP3's duration)
    // and byte ranges, which audio elements ask for (GitHub Pages answers them with 206).
    const size = fs.statSync(file).size;
    const type = MIME[path.extname(file)] || 'application/octet-stream';
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && (range[1] !== '' || range[2] !== '')) {
      const start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
      const end = range[1] !== '' && range[2] !== '' ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const results = [];
async function check(name, fn) {
  try {
    // Earning stars can unlock a sticker, whose celebration modal covers the page; dismiss it.
    if (typeof page !== 'undefined') await page.keyboard.press('Escape');
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.log(`  FAIL  ${name}\n        ${e.message.split('\n')[0]}`);
    // In GitHub Actions, also raise an annotation so the failing check is visible on the
    // commit/PR without opening the logs.
    if (process.env.GITHUB_ACTIONS) {
      // Workflow-command escaping: the message escapes %, CR, LF; a property (title) also , and :
      const msg = (t) => t.slice(0, 500).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
      const prop = (t) => msg(t).replace(/:/g, '%3A').replace(/,/g, '%2C');
      console.log(`::error title=${prop(`Smoke check failed: ${name}`)}::${msg(e.message)}`);
    }
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const isWebKit = process.env.BROWSER === 'webkit';
const browser = isWebKit
  ? await webkit.launch()
  : await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
// Every URL the app hands to new Audio(): recorded clips and, on the Windows desktop host, cloud
// speech. Recorded in the page because WebKit's media loads don't show up as Playwright requests.
await context.addInitScript(() => {
  const NativeAudio = window.Audio;
  window.__audioUrls = [];
  window.Audio = function Audio(src) {
    if (src !== undefined) window.__audioUrls.push(new URL(src, location.href).href);
    return new NativeAudio(src);
  };
  window.Audio.prototype = NativeAudio.prototype;
});
const page = await context.newPage();

const pageErrors = [];
page.on('pageerror', err => pageErrors.push(err.message));
page.on('console', msg => {
  // The static test server has no desktop TTS endpoint, so that probe 404 is expected.
  if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) pageErrors.push(msg.text());
});
page.on('dialog', d => d.accept());

// Pretend to be the Windows desktop host (which has a cloud TTS endpoint) and collect every
// phrase the app asks it to speak, so the test can prove the child's name never leaves the device.
await page.route('**/api/health', route => route.fulfill({ json: { tts: true } }));
await page.route('**/api/tts?*', route => route.fulfill({ status: 404 }));
const audioUrls = () => page.evaluate(() => window.__audioUrls);
const ttsTextsSince = async (from) => (await audioUrls()).slice(from)
  .filter(u => u.includes('/api/tts?')).map(u => new URL(u).searchParams.get('text'));

const stars = () => page.$eval('#star-count', el => parseInt(el.textContent, 10));
const store = (key) => page.evaluate(k => localStorage.getItem(k), key);

await page.goto(`${base}/index.html`);
await page.waitForSelector('#letters-grid .grid-letter-card');

await check('loads English alphabet without script errors', async () => {
  assert(await page.locator('#letters-grid .grid-letter-card').count() === 26, 'expected 26 letter cards');
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
});

// Windows 10 and Android 7-9 have no glyph for e.g. the jellyfish or giraffe, so the app
// ships a small Noto Color Emoji subset for exactly those code points.
await check('bundled emoji font loads for the newer animal emoji', async () => {
  const faces = await page.evaluate(async () => (await document.fonts.load('48px "Safari Emoji"', '🪼🦒')).length);
  assert(faces > 0, 'the Safari Emoji face did not load');
});

// Unicode has no pomegranate, so ر (رُمَّان) uses a picture drawn for the app (U+E000,
// tools/build_picture_font.py). Without colour-font support it would draw as a black shape.
await check('ر shows the app\'s own pomegranate, drawn in colour', async () => {
  const emoji = await page.evaluate(() => window.ALPHABET_CONTENT.ar.find(i => i.char === 'ر').emoji);
  assert(emoji === '\uE000', `ر picture is ${JSON.stringify(emoji)}, not the drawn pomegranate`);
  const redPixels = await page.evaluate(async () => {
    await document.fonts.load('64px "Safari Emoji"', '\uE000');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.font = '64px "Safari Emoji"';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    ctx.fillText('\uE000', 8, 8);
    const d = ctx.getImageData(0, 0, 96, 96).data;
    let red = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] > 150 && d[i + 1] < 100 && d[i + 2] < 100) red++;
    return red;
  });
  assert(redPixels > 500, `the pomegranate did not draw in colour (${redPixels} red pixels)`);
});

await check('tapping Next plays the recorded clip for the new letter', async () => {
  const from = (await audioUrls()).length;
  await page.click('#btn-next-letter');
  await page.waitForTimeout(400);
  const clip = (await audioUrls()).slice(from).find(u => u.endsWith('/assets/audio/en/boy/B.mp3'));
  assert(clip, `clips asked for: ${JSON.stringify((await audioUrls()).slice(from))}`);
  // ...and this browser can actually load and decode it.
  const duration = await page.evaluate(url => new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.oncanplaythrough = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error(`clip failed to load (error ${audio.error && audio.error.code})`));
    setTimeout(() => reject(new Error('clip did not load in 10s')), 10000);
    audio.load();
  }), clip);
  // WebKit on Linux (GStreamer, in CI) loads the clip without measuring it; real iOS WebKit is
  // checked by the iOS app's self-test on a simulator, which requires a real duration.
  assert(duration > 0.2 || (isWebKit && duration === 0), `clip duration ${duration}`);
});

await check('Y shows the yo-yo and its phrase says yo-yo', async () => {
  const y = await page.evaluate(() => window.ALPHABET_CONTENT.en.find(i => i.char === 'Y'));
  assert(y.word === 'Yo-yo' && /yo-yo/i.test(y.phrase), JSON.stringify(y));
});

await check('profile save closes the modal, persists, and treats the name as text', async () => {
  await page.click('#btn-gender');
  await page.click('.gender-card-option[data-gender="girl"]');
  // Not "Noor" or "Leo"/"Zayd": those are the companions' own names and appear in phrases anyway.
  await page.fill('#input-child-name', '<img src=x>Mira');
  await page.click('#btn-save-gender');
  await page.waitForTimeout(200);
  assert(!(await page.locator('#modal-gender').evaluate(el => el.classList.contains('open'))), 'modal still open');
  assert(await store('alpha_gender') === 'girl', 'gender not saved');
  const badge = await page.locator('#gender-badge-title').textContent();
  assert(badge.includes('<img src=x>Mira'), `badge text: ${badge}`);
  assert(await page.locator('#gender-badge-title img').count() === 0, 'name was injected as HTML');
});

await check("the child's name is never sent to the cloud TTS endpoint", async () => {
  const from = (await audioUrls()).length;
  await page.click('#interactive-mascot'); // greeting that includes the name
  await page.waitForTimeout(600);
  await page.click('.mode-tab[data-mode="match"]'); // a nameless prompt, which may use the cloud
  await page.waitForTimeout(600);
  const ttsTexts = await ttsTextsSince(from);
  assert(ttsTexts.length > 0, 'the TTS route was never used, so this check proves nothing');
  const leaked = ttsTexts.filter(t => t.includes('Mira'));
  assert(leaked.length === 0, `name sent to TTS: ${JSON.stringify(leaked)}`);
  await page.click('.mode-tab[data-mode="explore"]');
});

// Which path the check above takes depends on the machine: with on-device voices the name
// stays local; without them (e.g. CI's Linux) the greeting falls back to a nameless version.
// Force the second case so both paths are covered on every OS.
await check('with no on-device voice, the greeting is spoken without the name', async () => {
  const from = (await audioUrls()).length;
  // (A browser without speech synthesis, like Playwright's WebKit, has no voices already.)
  await page.evaluate(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices = () => [];
    window.speechSynthesis.onvoiceschanged();
  });
  await page.click('#interactive-mascot');
  await page.waitForTimeout(600);
  const ttsTexts = await ttsTextsSince(from);
  const greeting = ttsTexts.find(t => /safari buddy/.test(t));
  assert(greeting, `nameless greeting never reached the TTS route: ${JSON.stringify(ttsTexts)}`);
  assert(!greeting.includes('Mira') && /^Hello!/.test(greeting), `unexpected fallback text: ${greeting}`);
});

await check('a child who opens the parent gate can always get back out', async () => {
  assert(await page.locator('#modal-parents').evaluate(el => el.inert), 'closed dialog is not inert');
  await page.click('#btn-parents');
  await page.click('.gate-back-btn');
  await page.waitForTimeout(300);
  assert(!(await page.locator('#modal-parents').evaluate(el => el.classList.contains('open'))), 'gate still open');
});

await check('Escape closes an open modal', async () => {
  await page.click('#btn-parents');
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#modal-parents').evaluate(el => el.classList.contains('open'))), 'parents modal still open');
});

await check('match game: double tap on the right answer scores once', async () => {
  await page.click('.mode-tab[data-mode="match"]');
  const before = await stars();
  const target = await page.evaluate(() => document.getElementById('match-quest-word').textContent);
  const correctChar = await page.evaluate(
    w => window.ALPHABET_CONTENT.en.find(i => i.word === w).char, target);
  const btn = page.locator('.match-choice-btn', { hasText: correctChar }).first();
  await btn.click();
  await btn.click({ force: true });
  assert(await stars() === before + 2, `stars went ${before} -> ${await stars()}`);
});

await check('balloons: every round has targets, and the letter shown is the letter scored', async () => {
  await page.click('.mode-tab[data-mode="balloon"]');
  for (let round = 0; round < 3; round++) {
    const info = await page.evaluate(() => {
      const target = document.getElementById('balloon-target-letter').textContent;
      const balloons = [...document.querySelectorAll('#balloon-sky .flying-balloon')];
      return {
        target,
        targets: balloons.filter(b => b.dataset.char === target).length,
        consistent: balloons.every(b => b.textContent === b.dataset.char)
      };
    });
    assert(info.targets >= 2, `round ${round}: only ${info.targets} target balloons`);
    assert(info.consistent, `round ${round}: balloon text and data disagree`);
    const score = await page.$eval('#balloon-score', el => +el.textContent);
    await page.evaluate(t => {
      [...document.querySelectorAll('#balloon-sky .flying-balloon')].find(b => b.dataset.char === t).click();
    }, info.target);
    assert(await page.$eval('#balloon-score', el => +el.textContent) === score + 1, 'score did not increase');
    await page.waitForTimeout(1600);
  }
});

const correctMatchChar = () => page.evaluate(() => {
  const word = document.getElementById('match-quest-word').textContent;
  const all = [...window.ALPHABET_CONTENT.en, ...window.ALPHABET_CONTENT.ar];
  return all.find(i => i.word === word).char;
});

await check('find letter: hint hidden until two misses, then a wrong choice is removed', async () => {
  await page.click('.mode-tab[data-mode="match"]');
  assert(await page.locator('#match-quest-hint').evaluate(el => el.classList.contains('is-hidden')), 'hint shown up front');
  const answer = await correctMatchChar();
  for (let i = 0; i < 2; i++) {
    await page.locator('.match-choice-btn:not(.eliminated)').filter({ hasNotText: answer }).first().click();
    await page.waitForTimeout(200);
  }
  assert(!(await page.locator('#match-quest-hint').evaluate(el => el.classList.contains('is-hidden'))), 'hint still hidden');
  assert(await page.locator('.match-choice-btn.eliminated').count() === 1, 'no wrong choice was removed');
});

await check('find letter: leaving and returning mid-celebration keeps the new question', async () => {
  await page.click('.mode-tab[data-mode="match"]');
  await page.locator('.match-choice-btn', { hasText: await correctMatchChar() }).first().click();
  await page.keyboard.press('Escape');
  await page.click('.mode-tab[data-mode="explore"]');
  await page.click('.mode-tab[data-mode="match"]');
  const word = await page.locator('#match-quest-word').textContent();
  await page.waitForTimeout(2300); // past the old round's 1.8s "next question" timer
  assert(await page.locator('#match-quest-word').textContent() === word, 'an old timer replaced the question');
});

await check('tracing: empty or scribbled canvas earns nothing, a traced letter earns stars', async () => {
  await page.click('.mode-tab[data-mode="trace"]');
  await page.waitForTimeout(300);
  const before = await stars();
  await page.click('#btn-trace-check');
  assert(await stars() === before, 'empty canvas was rewarded');

  await page.evaluate(() => {
    const c = document.getElementById('trace-user-canvas');
    c.getContext('2d').fillRect(0, 0, c.width, c.height);
  });
  await page.click('#btn-trace-check');
  assert(await stars() === before, 'filling the whole canvas was rewarded');

  await page.click('#btn-trace-clear');
  await page.evaluate(() => {
    const c = document.getElementById('trace-user-canvas');
    c.getContext('2d').drawImage(document.getElementById('trace-guide-canvas'), 0, 0);
  });
  await page.click('#btn-trace-check');
  assert(await stars() === before + 2, `traced letter: stars ${before} -> ${await stars()}`);

  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.click('#btn-trace-check');
  }
  assert(await stars() === before + 2, `repeat taps kept paying: ${before} -> ${await stars()}`);
});

await check('tracing: a resting second finger does not draw', async () => {
  await page.click('#btn-trace-clear');
  const painted = await page.evaluate(() => {
    const c = document.getElementById('trace-user-canvas');
    const r = c.getBoundingClientRect();
    const at = (fx, fy) => ({ clientX: r.left + r.width * fx, clientY: r.top + r.height * fy });
    const fire = (type, id, p) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, bubbles: true, cancelable: true, ...p }));
    fire('pointerdown', 1, at(0.1, 0.1));          // drawing finger
    fire('pointerdown', 2, at(0.9, 0.9));          // resting palm
    for (let k = 1; k <= 10; k++) fire('pointermove', 2, at(0.9 - k * 0.03, 0.9));
    fire('pointerup', 2, at(0.6, 0.9));
    fire('pointerup', 1, at(0.1, 0.1));
    const x = Math.round(c.width * 0.75), y = Math.round(c.height * 0.9);
    return c.getContext('2d').getImageData(x, y, 1, 1).data[3];
  });
  assert(painted === 0, 'the second pointer drew on the canvas');
});

await check('memory game deals 6 cards', async () => {
  await page.click('.mode-tab[data-mode="memory"]');
  assert(await page.locator('#memory-grid .memory-card').count() === 6, 'expected 6 cards');
});

await check('memory cards have role=button, tabindex=0, and flip via keyboard Enter', async () => {
  await page.click('.mode-tab[data-mode="memory"]');
  const firstCard = page.locator('#memory-grid .memory-card').first();
  assert(await firstCard.getAttribute('role') === 'button', 'missing role=button');
  assert(await firstCard.getAttribute('tabindex') === '0', 'missing tabindex=0');
  assert(await firstCard.getAttribute('aria-label') !== null, 'missing aria-label');
  await firstCard.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  assert(await firstCard.evaluate(el => el.classList.contains('flipped')), 'card did not flip on Enter');
});

await check('balloons have role=button, tabindex=0, and aria-label for accessibility', async () => {
  await page.click('.mode-tab[data-mode="balloon"]');
  const balloon = page.locator('#balloon-sky .flying-balloon').first();
  assert(await balloon.getAttribute('role') === 'button', 'missing role=button');
  assert(await balloon.getAttribute('tabindex') === '0', 'missing tabindex=0');
  const label = await balloon.getAttribute('aria-label');
  assert(label && label.includes('Balloon letter'), `unexpected label: ${label}`);
});

await check('clicking brand logo returns to explore mode', async () => {
  await page.click('.mode-tab[data-mode="stickers"]');
  assert(await page.locator('#view-stickers').evaluate(el => el.classList.contains('active')), 'not in stickers mode');
  await page.click('#brand-logo');
  assert(await page.locator('#view-explore').evaluate(el => el.classList.contains('active')), 'did not return to explore view');
});

await check('arrow keys navigate explore letters even when a button had focus', async () => {
  await page.click('.mode-tab[data-mode="explore"]');
  await page.locator('#btn-next-letter').focus();
  const beforeChar = await page.locator('#spotlight-letter').textContent();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const afterChar = await page.locator('#spotlight-letter').textContent();
  assert(beforeChar !== afterChar, `letter did not change: ${beforeChar} -> ${afterChar}`);
});

await check('arrow keys do not change the letter behind an open dialog', async () => {
  const before = await page.locator('#spotlight-letter').textContent();
  await page.click('#btn-gender');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  const after = await page.locator('#spotlight-letter').textContent();
  assert(before === after, `letter changed behind the dialog: ${before} -> ${after}`);
});

async function passParentGate() {
  await page.click('#btn-parents');
  const question = await page.locator('#gate-target-num').textContent();
  const [a, b] = question.split('+').map(n => parseInt(n, 10));
  await page.locator('#gate-options .gate-btn', { hasText: new RegExp(`^${a + b}$`) }).click();
}

await check('parent gate asks a sum and settings persist across reloads', async () => {
  await passParentGate();
  assert(await page.locator('#parents-settings-view').isVisible(), 'settings not shown after correct answer');
  await page.selectOption('#setting-voice-speed', '0.75');
  await page.reload();
  await page.waitForSelector('#letters-grid .grid-letter-card');
  assert(await page.locator('#speed-icon').textContent() === '🐢', 'voice speed not restored');
});

// The Play listing links to privacy.html; the app shows the same page behind the parent gate.
await check('privacy policy: only behind the parent gate, shows the policy, closes back to settings', async () => {
  await page.click('#btn-parents');
  assert(!(await page.locator('#btn-privacy-policy').isVisible()), 'policy button visible before the gate');
  await page.keyboard.press('Escape');
  await passParentGate();
  await page.click('#btn-privacy-policy');
  const policy = page.frameLocator('#privacy-frame').locator('#en');
  await policy.locator('h1').waitFor();
  const text = await policy.textContent();
  assert(text.includes('does not collect, share or sell any personal information'), 'policy summary missing');
  assert(text.includes('no internet permission'), 'policy no longer states the Android app has no internet permission');
  await page.click('#modal-privacy .modal-close-btn');
  assert(await page.locator('#parents-settings-view').isVisible(), 'closing the policy did not return to Parents Corner');
  await page.keyboard.press('Escape');
});

await check('Arabic: 28 letters, RTL, د shows the dolphin, language persists', async () => {
  await page.click('#btn-lang-ar');
  assert(await page.locator('#letters-grid .grid-letter-card').count() === 28, 'expected 28 letter cards');
  assert(await page.evaluate(() => document.documentElement.dir) === 'rtl', 'not RTL');
  await page.locator('#letters-grid .grid-letter-card').nth(7).click();
  const word = await page.locator('#spotlight-word').textContent();
  assert(word === 'دَلْفِين', `د word: ${word}`);
  await page.reload();
  await page.waitForSelector('#letters-grid .grid-letter-card');
  assert(await page.locator('#letters-grid .grid-letter-card').count() === 28, 'language not restored');
});

await check('Arabic: Parents Corner and the privacy policy are in Arabic', async () => {
  await passParentGate();
  const erase = await page.locator('#btn-forget-child').innerText();
  assert(erase.trim() === 'مسح كل شيء', `erase button not Arabic: ${erase}`);
  const speed = await page.locator('#setting-voice-speed option[value="0.75"]').textContent();
  assert(speed.startsWith('بطيء'), `speed option not Arabic: ${speed}`);
  await page.click('#btn-privacy-policy');
  assert((await page.locator('#privacy-frame').getAttribute('src')).endsWith('#ar'), 'policy did not open at the Arabic text');
  await page.frameLocator('#privacy-frame').locator('#ar h1').waitFor();
  await page.keyboard.press('Escape');
});

await check('Arabic: no case toggle, Arabic memory label, celebration title matches a girl', async () => {
  assert(!(await page.locator('#btn-case-toggle').isVisible()), 'upper/lower-case toggle shown for Arabic');
  await page.click('.mode-tab[data-mode="memory"]');
  const label = await page.locator('#memory-diff-label').textContent();
  assert(/بطاقات/.test(label), `memory label not Arabic: ${label}`);

  // Win the round: pair each letter card with the card showing its picture. DOM clicks, since
  // a sticker unlocked on the way opens its own celebration over the grid.
  const pairs = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#memory-grid .memory-card')];
    return cards.filter(c => c.querySelector('.memory-val-letter')).map(l => {
      const char = l.querySelector('.memory-val-letter').textContent.trim();
      const item = window.ALPHABET_CONTENT.ar.find(i => i.char === char);
      return [cards.indexOf(l), cards.findIndex(c => c.querySelector('.memory-val-pic')?.textContent.trim() === item.emoji)];
    });
  });
  for (const pair of pairs) {
    await page.evaluate(([a, b]) => {
      const cards = document.querySelectorAll('#memory-grid .memory-card');
      cards[a].click();
      cards[b].click();
    }, pair);
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(800);
  assert(await page.locator('#modal-celebrate').evaluate(el => el.classList.contains('open')), 'no celebration after winning');
  const title = await page.locator('#modal-celebrate .celebrate-title').textContent();
  assert(title.includes('بَطَلَة'), `title is not the feminine form: ${title}`);
});

await check('no script errors during the whole session', async () => {
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

// Phone landscape and 10" tablet portrait sit between the phone and desktop layouts; a long
// child's name widens the profile badge.
await check('layout from phone to desktop, any name: header, tabs and tracing toolbar all fit', async () => {
  const problems = [];
  for (const [width, height] of [[375, 740], [640, 360], [800, 380], [915, 412], [800, 1280], [1024, 768], [1280, 800]]) {
    for (const lang of ['en', 'ar']) {
      const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      await p.addInitScript(l => {
        localStorage.setItem('alpha_lang', l);
        localStorage.setItem('alpha_child_name', 'Alexandrina-Maria');
      }, lang);
      await p.goto(`${base}/index.html`);
      await p.waitForSelector('#letters-grid .grid-letter-card');
      const found = await p.evaluate(() => {
        const out = [];
        for (const b of document.querySelectorAll('.app-header button')) {
          const r = b.getBoundingClientRect();
          if (b.offsetParent !== null && (r.left < -1 || r.right > innerWidth + 1)) out.push(`${b.id} off screen`);
        }
        for (const tab of document.querySelectorAll('.mode-tab')) {
          if (tab.scrollWidth > tab.clientWidth + 1) out.push(`${tab.dataset.mode} tab content overflows`);
        }
        if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page scrolls sideways');
        return out;
      });
      // Tracing toolbar: every colour and button inside its card, labels on one line.
      await p.click('.mode-tab[data-mode="trace"]');
      found.push(...await p.evaluate(() => {
        const card = document.querySelector('.trace-container').getBoundingClientRect();
        const out = [];
        for (const b of document.querySelectorAll('.trace-toolbar button')) {
          const r = b.getBoundingClientRect();
          if (r.left < card.left - 1 || r.right > card.right + 1) out.push(`trace ${b.id || b.title} cut off`);
          if (b.classList.contains('btn-sm-fun') && r.height > 64) out.push(`trace ${b.id} label wraps`);
        }
        return out;
      }));
      problems.push(...found.map(f => `${width}x${height} ${lang}: ${f}`));
      await ctx.close();
    }
  }
  assert(problems.length === 0, problems.slice(0, 6).join('; '));
});

await check('phone (375px): header buttons fit on screen, trace strip keeps the letter in view', async () => {
  const phone = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, serviceWorkers: 'block' });
  const p = await phone.newPage();
  // WebKit dropped this page twice on Windows mid-run (not reproducible alone); say so if it recurs.
  p.on('crash', () => console.log('        (the phone page crashed)'));
  try {
    await p.goto(`${base}/index.html`);
    await p.waitForSelector('#letters-grid .grid-letter-card');
    const offscreen = await p.evaluate(() => [...document.querySelectorAll('.header-right button')]
      .filter(b => b.offsetParent !== null)
      .filter(b => { const r = b.getBoundingClientRect(); return r.left < 0 || r.right > window.innerWidth; })
      .map(b => b.id || b.className));
    assert(offscreen.length === 0, `header buttons off screen: ${offscreen.join(', ')}`);

    const activeChipInView = () => p.evaluate(() => {
      const ribbon = document.getElementById('trace-letter-ribbon');
      const r = ribbon.getBoundingClientRect();
      const c = ribbon.querySelector('.trace-chip.active').getBoundingClientRect();
      return { overflows: ribbon.scrollWidth > ribbon.clientWidth, inView: c.left >= r.left - 1 && c.right <= r.right + 1 };
    });
    await p.locator('#letters-grid .grid-letter-card').nth(22).click(); // W, chosen in Explore
    await p.click('.mode-tab[data-mode="trace"]');
    const fromExplore = await activeChipInView();
    assert(fromExplore.overflows, 'the strip fits on screen, so this check proves nothing');
    assert(fromExplore.inView, 'W picked in Explore is scrolled out of the strip');
    await p.locator('#trace-letter-ribbon .trace-chip').nth(12).click(); // M
    assert((await activeChipInView()).inView, 'the tapped letter scrolled out of the strip');
  } finally {
    await phone.close();
  }
});

// axe-core, the usual WCAG checker, over every screen in both languages: no critical or serious
// problems (unlabelled controls, low contrast, controls nested in controls).
await check('accessibility: no critical or serious axe-core findings on any screen', async () => {
  const problems = [];
  async function scan(label, lang, setup) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' });
    await ctx.addInitScript(l => localStorage.setItem('alpha_lang', l), lang);
    const p = await ctx.newPage();
    try {
      await p.goto(`${base}/index.html`);
      await p.waitForSelector('#letters-grid .grid-letter-card');
      if (setup) await setup(p);
      await p.waitForTimeout(400);
      await p.addScriptTag({ path: AXE });
      const found = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations
        .filter(v => v.impact === 'critical' || v.impact === 'serious')
        .map(v => `${v.id} (${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')})`));
      problems.push(...found.map(f => `${label}: ${f}`));
    } finally {
      await ctx.close();
    }
  }
  const mode = m => async p => p.click(`.mode-tab[data-mode="${m}"]`);
  for (const lang of ['en', 'ar']) await scan(`explore ${lang}`, lang);
  for (const m of ['trace', 'balloon', 'match', 'memory', 'stickers']) await scan(m, 'en', mode(m));
  await scan('parents corner', 'en', async p => {
    await p.click('#btn-parents');
    const [a, b] = (await p.locator('#gate-target-num').textContent()).split('+').map(n => parseInt(n, 10));
    await p.locator('#gate-options .gate-btn', { hasText: new RegExp(`^${a + b}$`) }).click();
  });
  await scan('profile', 'en', async p => p.click('#btn-gender'));
  assert(problems.length === 0, problems.slice(0, 6).join('; '));
});

// The iOS app injects window.NativeBridge (ios/AlphabetSafari/WebBridge.swift) with the same
// calls as Android's AndroidBridge. Stand in for it here, on an iPhone-sized touch screen.
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
await check('iOS app: speech and haptics go through NativeBridge, the name stays on-device', async () => {
  const ios = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, userAgent: IPHONE_UA, serviceWorkers: 'block' });
  await ios.addInitScript(() => {
    localStorage.setItem('alpha_child_name', 'Mira');
    window.__bridgeCalls = [];
    window.NativeBridge = {
      getPlatform: () => 'ios',
      vibrate: (ms) => window.__bridgeCalls.push({ op: 'vibrate', ms }),
      stopSpeaking: () => window.__bridgeCalls.push({ op: 'stop' }),
      speak: (text, lang, rate, id, localOnly) => {
        window.__bridgeCalls.push({ op: 'speak', text, lang, localOnly });
        setTimeout(() => window.AlphabetSafariSpeechDone(id, true), 20);
      }
    };
  });
  const p = await ios.newPage();
  try {
    await p.goto(`${base}/index.html`);
    await p.waitForSelector('#letters-grid .grid-letter-card');
    const classes = await p.evaluate(() => document.documentElement.className);
    assert(/platform-ios/.test(classes) && /native-app/.test(classes), `classes: ${classes}`);
    assert(!(await p.locator('#btn-android-app').isVisible()), 'the web "install the app" button shows inside the iOS app');
    await p.tap('#interactive-mascot');
    await p.waitForTimeout(400);
    const calls = await p.evaluate(() => window.__bridgeCalls);
    const greeting = calls.find(c => c.op === 'speak' && c.text.includes('Mira'));
    assert(greeting, `no greeting through NativeBridge: ${JSON.stringify(calls)}`);
    assert(greeting.localOnly === true, 'the phrase with the child\'s name was not marked on-device only');
    assert(calls.some(c => c.op === 'vibrate'), 'no haptic tap through NativeBridge');
  } finally {
    await ios.close();
  }
});

await check('iPhone Safari: the install button explains Add to Home Screen', async () => {
  const safari = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, userAgent: IPHONE_UA, serviceWorkers: 'block' });
  const p = await safari.newPage();
  const messages = [];
  p.on('dialog', d => { messages.push(d.message()); d.accept(); });
  try {
    await p.goto(`${base}/index.html`);
    await p.waitForSelector('#letters-grid .grid-letter-card');
    assert(await p.evaluate(() => document.documentElement.classList.contains('platform-ios')), 'iPhone not recognised');
    await p.tap('#btn-android-app');
    await p.tap('#btn-trigger-pwa-install');
    await p.waitForTimeout(200);
    assert(messages.some(m => /Add to Home Screen/.test(m) && /Share/.test(m)), `install hint: ${JSON.stringify(messages)}`);
  } finally {
    await safari.close();
  }
});

// Offline means the letter sounds too: audio elements fetch clips in byte ranges (206), which the
// service worker must turn into a cached copy of the whole clip.
await check('works offline once the service worker has cached it, letter sounds included', async () => {
  const swContext = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const swPage = await swContext.newPage();
  const loadClip = () => swPage.evaluate(url => new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.oncanplaythrough = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error(`clip failed to load (error ${audio.error && audio.error.code})`));
    setTimeout(() => reject(new Error('clip did not load in 10s')), 10000);
    audio.load();
  }), 'assets/audio/en/boy/B.mp3');
  try {
    await swPage.goto(`${base}/index.html`);
    await swPage.evaluate(() => navigator.serviceWorker.ready);
    await swPage.reload(); // now controlled by the service worker
    await swPage.waitForSelector('#letters-grid .grid-letter-card');
    await loadClip(); // heard once online
    if (!isWebKit) {
      // So the offline clip can only come from the service worker, not the browser's HTTP cache.
      await (await swContext.newCDPSession(swPage)).send('Network.clearBrowserCache');
    }
    await swContext.setOffline(true);
    await swPage.reload();
    await swPage.waitForSelector('#letters-grid .grid-letter-card', { timeout: 10000 });
    assert(await swPage.locator('#letters-grid .grid-letter-card').count() > 0, 'no letters offline');
    const duration = await loadClip();
    assert(duration > 0.2 || (isWebKit && duration === 0), `offline clip duration ${duration}`);
  } finally {
    await swContext.close();
  }
});

await browser.close();
server.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} smoke checks passed.`);
process.exit(failed ? 1 : 0);
