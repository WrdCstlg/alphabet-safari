// In-app self-test for the iOS app: the counterpart of tests/android-device.mjs. The UI test
// (AlphabetSafariUITests.swift) prepends `const PHASE = '...';` and the debug app runs this as
// the body of an async function in the page (WKWebView.callAsyncJavaScript). It returns one
// line: "PASS n/n: <checks>" or "FAIL k/n: <check> -> <why> | ...".

const results = [];
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const $ = (selector) => document.querySelector(selector);

async function check(name, fn) {
  try {
    await fn();
    results.push([name, null]);
  } catch (e) {
    results.push([name, String((e && e.message) || e)]);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function waitFor(what, fn, ms) {
  const end = Date.now() + ms;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(200);
  }
}

function click(selector) {
  const el = $(selector);
  if (!el) throw new Error(`no ${selector}`);
  el.click();
}

async function openParentsCorner() {
  click('#btn-parents');
  await sleep(300);
  const [a, b] = $('#gate-target-num').textContent.split('+').map(n => parseInt(n, 10));
  const answer = [...document.querySelectorAll('#gate-options .gate-btn')].find(btn => btn.textContent.trim() === String(a + b));
  assert(answer, 'no button with the right answer');
  answer.click();
  await sleep(300);
  assert($('#parents-settings-view').offsetParent !== null, 'Parents Corner did not open');
}

// Header buttons on screen, tabs not overlapping, no sideways scroll, tracing toolbar in its card.
async function layoutProblems() {
  const problems = [];
  for (const b of document.querySelectorAll('.app-header button')) {
    const r = b.getBoundingClientRect();
    if (b.offsetParent !== null && (r.left < -1 || r.right > innerWidth + 1)) problems.push(`${b.id} off screen`);
  }
  for (const tab of document.querySelectorAll('.mode-tab')) {
    if (tab.scrollWidth > tab.clientWidth + 1) problems.push(`${tab.dataset.mode} tab overflows`);
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('page scrolls sideways');
  click('.mode-tab[data-mode="trace"]');
  await sleep(400);
  const card = $('.trace-container').getBoundingClientRect();
  for (const b of document.querySelectorAll('.trace-toolbar button')) {
    const r = b.getBoundingClientRect();
    if (r.left < card.left - 1 || r.right > card.right + 1) problems.push(`trace ${b.id || b.title} cut off`);
  }
  click('.mode-tab[data-mode="explore"]');
  await sleep(300);
  return problems;
}

await waitFor('the letter cards', () => document.querySelectorAll('#letters-grid .grid-letter-card').length > 0, 20000);

if (PHASE === 'first-launch') {
  if (document.documentElement.dir === 'rtl') {
    click('#btn-lang-en');
    await sleep(500);
  }

  await check('26 English letters, no script errors', async () => {
    assert(document.querySelectorAll('#letters-grid .grid-letter-card').length === 26, 'expected 26 letter cards');
    assert((window.__appErrors || []).length === 0, `script errors: ${(window.__appErrors || []).join(' / ')}`);
  });

  await check('the iOS NativeBridge is used and the web install button is hidden', async () => {
    assert(window.NativeBridge && window.NativeBridge.getPlatform() === 'ios', 'no iOS NativeBridge');
    const classes = document.documentElement.className;
    assert(/native-app/.test(classes) && /platform-ios/.test(classes), `classes: ${classes}`);
    assert($('#btn-android-app').offsetParent === null, 'the "install the app" button shows inside the app');
  });

  await check('a recorded clip loads and decodes', async () => {
    const duration = await new Promise((resolve, reject) => {
      const audio = new Audio('assets/audio/en/boy/A.mp3');
      audio.oncanplaythrough = () => resolve(audio.duration);
      audio.onerror = () => reject(new Error(`audio error ${audio.error && audio.error.code}`));
      setTimeout(() => reject(new Error('clip did not load in 10s')), 10000);
      audio.load();
    });
    assert(duration > 0.2, `clip duration ${duration}`);
  });

  await check('bundled fonts load and the pomegranate draws in colour', async () => {
    assert((await document.fonts.load('48px Fredoka', 'A')).length > 0, 'Fredoka did not load');
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
    assert(red > 500, `${red} red pixels`);
  });

  await check('speech through AVSpeechSynthesizer is really spoken', async () => {
    const started = Date.now();
    const outcome = await new Promise(resolve => {
      const original = window.AlphabetSafariSpeechDone;
      window.AlphabetSafariSpeechDone = (id, ok) => {
        if (id !== 'selftest') return original && original(id, ok);
        window.AlphabetSafariSpeechDone = original;
        resolve(ok ? 'spoken' : 'no-voice');
      };
      window.NativeBridge.speak('Hello', 'en-US', 1, 'selftest', false);
      setTimeout(() => resolve('timeout'), 20000);
    });
    assert(outcome === 'spoken', `English speech: ${outcome}`);
    // Reported done at once would mean cancelled, not said.
    assert(Date.now() - started > 250, `"Hello" was over after ${Date.now() - started} ms`);
  });

  if (NETWORK_ONLINE) {
    await check('no internet: requests leaving the app are blocked', async () => {
      const loaded = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 10000);
        img.src = `https://www.apple.com/favicon.ico?selftest=${Date.now()}`;
      });
      assert(!loaded, 'an image loaded from the internet');
    });
  } else {
    results.push(['(no-internet check skipped: the test machine was offline too)', null]);
  }

  await check('the privacy policy opens behind the parent gate and names no other platform', async () => {
    await openParentsCorner();
    // privacy.html posts its visible text to the page it's framed in (file frames can't read
    // each other directly).
    const text = await new Promise(resolve => {
      const onMessage = (e) => {
        if (!e.data || typeof e.data.privacyPolicy !== 'string') return;
        removeEventListener('message', onMessage);
        resolve(e.data.privacyPolicy);
      };
      addEventListener('message', onMessage);
      setTimeout(() => resolve(null), 10000);
      click('#btn-privacy-policy');
    });
    assert(text, 'privacy.html did not load in its frame');
    assert(/does not collect, share or sell/.test(text), 'policy text missing');
    // App Store review asks apps not to name other platforms.
    const others = text.match(/Android|Windows|Google|Microsoft|أندرويد|ويندوز/g);
    assert(!others, `the in-app policy names ${[...new Set(others)].join(', ')}`);
    click('#modal-privacy .modal-close-btn');
    click('#modal-parents [data-close="modal-parents"]');
    await sleep(300);
  });

  await check('portrait layout fits', async () => {
    const problems = await layoutProblems();
    assert(problems.length === 0, problems.join(', '));
  });

  // Checked after the relaunch.
  click('#btn-lang-ar');
  await sleep(500);
} else if (PHASE === 'relaunch') {
  await check('Arabic was kept across closing and reopening the app', async () => {
    assert(document.documentElement.dir === 'rtl', 'not right-to-left');
    assert(document.querySelectorAll('#letters-grid .grid-letter-card').length === 28, 'expected 28 Arabic letters');
  });
  click('#btn-lang-en');
  await sleep(500);
} else if (PHASE === 'landscape') {
  await check('landscape layout fits', async () => {
    await waitFor('landscape', () => innerWidth > innerHeight, 10000);
    const problems = await layoutProblems();
    assert(problems.length === 0, problems.join(', '));
  });
} else if (PHASE === 'erase') {
  localStorage.setItem('alpha_child_name', 'Mira');
  localStorage.setItem('alpha_stars', '7');
  await check('Parents Corner opens behind the parent gate', openParentsCorner);
  // The UI test answers the confirmation this raises, then checks the result after a relaunch.
  setTimeout(() => click('#btn-forget-child'), 500);
} else if (PHASE === 'after-erase') {
  await check("Erase Everything removed the child's name and progress", async () => {
    assert(localStorage.getItem('alpha_child_name') === null, "the child's name is still stored");
    assert(localStorage.getItem('alpha_stars') === null, 'the stars are still stored');
  });
}

const failed = results.filter(r => r[1]);
return (failed.length ? 'FAIL' : 'PASS') + ` ${results.length - failed.length}/${results.length}: ` +
  (failed.length ? failed.map(r => `${r[0]} -> ${r[1]}`).join(' | ') : results.map(r => r[0]).join('; '));
