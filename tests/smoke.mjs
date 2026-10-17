// End-to-end smoke test: serves the app and drives it in a real browser.
//
//   npm run smoke                        (Playwright's bundled Chromium; CI)
//   BROWSER_CHANNEL=msedge npm run smoke (installed Microsoft Edge; no browser download)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(process.env.SMOKE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
};

function serve() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
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
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || undefined,
  args: ['--autoplay-policy=no-user-gesture-required']
});
const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
const page = await context.newPage();

const pageErrors = [];
page.on('pageerror', err => pageErrors.push(err.message));
page.on('console', msg => {
  // The static test server has no desktop TTS endpoint, so that probe 404 is expected.
  if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) pageErrors.push(msg.text());
});
page.on('dialog', d => d.accept());
const clipResponses = [];
page.on('response', res => {
  if (res.url().includes('/assets/audio/')) clipResponses.push({ url: res.url(), status: res.status() });
});

// Pretend to be the Windows desktop host (which has a cloud TTS endpoint) and record every
// phrase sent to it, so the test can prove the child's name never leaves the device.
const ttsTexts = [];
await page.route('**/api/health', route => route.fulfill({ json: { tts: true } }));
await page.route('**/api/tts?*', route => {
  ttsTexts.push(new URL(route.request().url()).searchParams.get('text'));
  return route.fulfill({ status: 404 });
});

const stars = () => page.$eval('#star-count', el => parseInt(el.textContent, 10));
const store = (key) => page.evaluate(k => localStorage.getItem(k), key);

await page.goto(`${base}/index.html`);
await page.waitForSelector('#letters-grid .grid-letter-card');

await check('loads English alphabet without script errors', async () => {
  assert(await page.locator('#letters-grid .grid-letter-card').count() === 26, 'expected 26 letter cards');
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
});

await check('tapping Next plays the recorded clip for the new letter', async () => {
  await page.click('#btn-next-letter');
  await page.waitForTimeout(400);
  const clip = clipResponses.find(r => r.url.endsWith('/assets/audio/en/boy/B.mp3'));
  assert(clip && clip.status === 200, `clip responses: ${JSON.stringify(clipResponses)}`);
});

await check('Y shows the yo-yo and its phrase says yo-yo', async () => {
  const y = await page.evaluate(() => window.ALPHABET_CONTENT.en.find(i => i.char === 'Y'));
  assert(y.word === 'Yo-yo' && /yo-yo/i.test(y.phrase), JSON.stringify(y));
});

await check('profile save closes the modal, persists, and treats the name as text', async () => {
  await page.click('#btn-gender');
  await page.click('.gender-card-option[data-gender="girl"]');
  await page.fill('#input-child-name', '<img src=x>Noor');
  await page.click('#btn-save-gender');
  await page.waitForTimeout(200);
  assert(!(await page.locator('#modal-gender').evaluate(el => el.classList.contains('open'))), 'modal still open');
  assert(await store('alpha_gender') === 'girl', 'gender not saved');
  const badge = await page.locator('#gender-badge-title').textContent();
  assert(badge.includes('<img src=x>Noor'), `badge text: ${badge}`);
  assert(await page.locator('#gender-badge-title img').count() === 0, 'name was injected as HTML');
});

await check("the child's name is never sent to the cloud TTS endpoint", async () => {
  ttsTexts.length = 0;
  await page.click('#interactive-mascot'); // greeting that includes the name
  await page.waitForTimeout(600);
  await page.click('.mode-tab[data-mode="match"]'); // a nameless prompt, which may use the cloud
  await page.waitForTimeout(600);
  assert(ttsTexts.length > 0, 'the TTS route was never used, so this check proves nothing');
  const leaked = ttsTexts.filter(t => t.includes('Noor'));
  assert(leaked.length === 0, `name sent to TTS: ${JSON.stringify(leaked)}`);
  await page.click('.mode-tab[data-mode="explore"]');
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

await check('parent gate asks a sum and settings persist across reloads', async () => {
  await page.click('#btn-parents');
  const question = await page.locator('#gate-target-num').textContent();
  const [a, b] = question.split('+').map(n => parseInt(n, 10));
  await page.locator('#gate-options .gate-btn', { hasText: new RegExp(`^${a + b}$`) }).click();
  assert(await page.locator('#parents-settings-view').isVisible(), 'settings not shown after correct answer');
  await page.selectOption('#setting-voice-speed', '0.75');
  await page.reload();
  await page.waitForSelector('#letters-grid .grid-letter-card');
  assert(await page.locator('#speed-icon').textContent() === '🐢', 'voice speed not restored');
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

await check('no script errors during the whole session', async () => {
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

await check('works offline once the service worker has cached it', async () => {
  const swContext = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const swPage = await swContext.newPage();
  await swPage.goto(`${base}/index.html`);
  await swPage.evaluate(() => navigator.serviceWorker.ready);
  await swPage.reload(); // now controlled by the service worker
  await swPage.waitForSelector('#letters-grid .grid-letter-card');
  await swContext.setOffline(true);
  await swPage.reload();
  await swPage.waitForSelector('#letters-grid .grid-letter-card', { timeout: 10000 });
  assert(await swPage.locator('#letters-grid .grid-letter-card').count() > 0, 'no letters offline');
  await swContext.close();
});

await browser.close();
server.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} smoke checks passed.`);
process.exit(failed ? 1 : 0);
