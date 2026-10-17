/**
 * ALPHABET SAFARI - Children's Arabic & English Alphabet Interactive Engine
 * Designed for Toddlers & Preschoolers (Ages 2-5)
 * Dual-language, Web Audio synth, Web Speech API, Canvas Tracing, Mini-Games, PWA
 */

(function () {
  'use strict';

  // ==========================================================================
  // DATASETS: ENGLISH & ARABIC ALPHABETS
  // ==========================================================================

  // Letters, words and spoken phrases live in content.js, which is shared with
  // generate_studio_audio.py and tools/validate_content.py so they cannot drift apart.
  const ENGLISH_ALPHABET = window.ALPHABET_CONTENT.en;
  const ARABIC_ALPHABET = window.ALPHABET_CONTENT.ar;

  const STICKERS_LIST = [
    { id: 's1', emoji: '🦁', title: 'Leo the Lion', cost: 0 },
    { id: 's2', emoji: '🐰', title: 'Noor the Bunny', cost: 2 },
    { id: 's3', emoji: '⭐', title: 'Golden Star', cost: 4 },
    { id: 's4', emoji: '🎈', title: 'Magic Balloon', cost: 6 },
    { id: 's5', emoji: '🦄', title: 'Rainbow Unicorn', cost: 8 },
    { id: 's6', emoji: '🚀', title: 'Space Rocket', cost: 10 },
    { id: 's7', emoji: '👑', title: 'Royal Crown', cost: 12 },
    { id: 's8', emoji: '🐬', title: 'Happy Dolphin', cost: 14 },
    { id: 's9', emoji: '🍓', title: 'Sweet Berry', cost: 16 },
    { id: 's10', emoji: '🎨', title: 'Artist Palette', cost: 18 }
  ];

  // ==========================================================================
  // APP STATE
  // ==========================================================================

  // localStorage can throw (private mode, blocked storage) or hold corrupted values;
  // a toddler app must never fail to start because of either.
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    getJSON(key, fallback) {
      try {
        const v = JSON.parse(this.get(key, 'null'));
        return v === null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (e) {}
    },
    // "Erase Everything" in Parents Corner: every key this app has written.
    clearAll() {
      try {
        Object.keys(localStorage).filter(k => k.startsWith('alpha_')).forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
  };

  const savedSettings = store.getJSON('alpha_settings', {});
  const savedStickers = store.getJSON('alpha_stickers', ['s1']);

  const state = {
    lang: store.get('alpha_lang', 'en') === 'ar' ? 'ar' : 'en',
    gender: store.get('alpha_gender', 'boy') === 'girl' ? 'girl' : 'boy',
    childName: store.get('alpha_child_name', '').slice(0, 18),
    avatar: store.get('alpha_avatar', '👦'),
    mode: 'explore', // 'explore', 'trace', 'balloon', 'match', 'memory', 'stickers'
    currentIndex: 0,
    caseMode: 'both', // 'both', 'upper'
    soundEnabled: savedSettings.soundEnabled !== false,
    voiceSpeed: typeof savedSettings.voiceSpeed === 'number' ? savedSettings.voiceSpeed : 0.95,
    showHarakat: savedSettings.showHarakat !== false,
    showTranslit: savedSettings.showTranslit !== false,
    stars: Math.max(0, parseInt(store.get('alpha_stars', '0'), 10) || 0),
    unlockedStickers: Array.isArray(savedStickers) ? savedStickers : ['s1'],
    jukeboxPlaying: false,
    jukeboxTimer: null,
    deferredPrompt: null // For PWA install
  };

  function saveSettings() {
    store.set('alpha_settings', {
      soundEnabled: state.soundEnabled,
      voiceSpeed: state.voiceSpeed,
      showHarakat: state.showHarakat,
      showTranslit: state.showTranslit
    });
  }

  // Pick the boy/girl variant of a phrase for the active child profile.
  function g(boyText, girlText) {
    return state.gender === 'girl' ? girlText : boyText;
  }

  // Bumped whenever the screen changes (mode, language, game restart). Delayed callbacks
  // scheduled with laterInView() do nothing once the child has moved on, so a timer from
  // an old round can't swap the question on a new one.
  let viewEpoch = 0;
  function laterInView(fn, ms) {
    const epoch = viewEpoch;
    return setTimeout(() => {
      if (epoch === viewEpoch) fn();
    }, ms);
  }

  // Helper getters
  function getActiveAlphabet() {
    return state.lang === 'en' ? ENGLISH_ALPHABET : ARABIC_ALPHABET;
  }

  // Fisher-Yates; `array.sort(() => Math.random() - 0.5)` is noticeably biased.
  function shuffleInPlace(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function getCurrentItem() {
    const list = getActiveAlphabet();
    return list[state.currentIndex % list.length];
  }

  // ==========================================================================
  // REAL-TIME AUDIO SYNTHESIZER (Web Audio API)
  // No external assets required, 100% offline, zero delay
  // ==========================================================================

  let audioCtx = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Marimba/Xylophone musical notes for every letter
  const PENTATONIC_SCALE = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    1046.50 // C6
  ];

  function playMarimbaTone(index) {
    if (!state.soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const freq = PENTATONIC_SCALE[index % PENTATONIC_SCALE.length];
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.65);
    } catch (e) {
      console.warn('Audio note error:', e);
    }
  }

  function playPopSound() {
    if (!state.soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);
    } catch (e) {}
  }

  function playSparkleSound() {
    if (!state.soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.06);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.06);
        osc.stop(audioCtx.currentTime + i * 0.06 + 0.3);
      });
    } catch (e) {}
  }

  function playFanfareSound() {
    if (!state.soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      const chords = [
        { f: 523.25, t: 0.0, d: 0.15 },
        { f: 659.25, t: 0.15, d: 0.15 },
        { f: 783.99, t: 0.30, d: 0.15 },
        { f: 1046.50, t: 0.45, d: 0.5 }
      ];

      chords.forEach(c => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(c.f, audioCtx.currentTime + c.t);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime + c.t);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + c.t + c.d);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + c.t);
        osc.stop(audioCtx.currentTime + c.t + c.d + 0.05);
      });
    } catch (e) {}
  }

  // Soft two-note bell used for profile and avatar choices.
  function playChimeSound() {
    if (!state.soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
      [[880.0, 0], [1318.51, 0.09]].forEach(([freq, t]) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + t);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.55);
      });
    } catch (e) {}
  }

  // ==========================================================================
  // SPEECH SYNTHESIS & NATURAL AUDIO ENGINE
  // ==========================================================================

  let voices = [];
  function populateVoices() {
    if ('speechSynthesis' in window) {
      voices = window.speechSynthesis.getVoices();
    }
  }
  populateVoices();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  // Callers add the Arabic vocative particle themselves (`يَا ${voc}`), so it is not included here.
  function getChildVocative() {
    if (state.childName) return state.childName;
    if (state.lang === 'en') {
      return g('little hero', 'little princess');
    }
    return g('بَطَلِي الصَّغِير', 'أَمِيرَتِي الصَّغِيرَة');
  }

  function getNaturalPraise() {
    const name = state.childName;
    if (state.lang === 'en') {
      const boyPraises = [
        name ? `Woohoo! You did it, ${name}! You are a superhero!` : 'Woohoo! You did it, my brave champion!',
        'Awesome job! You kept trying and you got it!',
        'High five, buddy! Look at you go!',
        'That was magnificent! You are an alphabet master!'
      ];
      const girlPraises = [
        name ? `Yay! You did it, ${name}! You shine so bright!` : 'Yay! You did it, my sweet little princess!',
        'Fantastic job! You listened so carefully!',
        'Hooray! Look at you go, sweet star!',
        'That was pure magic! You are an alphabet star!'
      ];
      const list = state.gender === 'boy' ? boyPraises : girlPraises;
      return list[Math.floor(Math.random() * list.length)];
    } else {
      const boyPraisesAr = [
        name ? `أَحْسَنْتَ يَا ${name}! أَنْتَ بَطَلٌ خَارِق!` : 'أَحْسَنْتَ يَا بَطَلَ الأَبْطَال! رَائِعٌ جِدًّا!',
        'مَا شَاءَ الله عَلَيْكَ يَا بَطَلِي الذَّكِيّ!',
        'مُمْتَازٌ يَا حَبِيبِي! أَنْتَ نَجْمُ السَّفَارِي!',
        'عَمَلٌ رَائِعٌ جِدًّا! أَنَا فَخُورٌ بِكَ!'
      ];
      const girlPraisesAr = [
        name ? `أَحْسَنْتِ يَا ${name}! أَنْتِ أَمِيرَةٌ سَاحِرَة!` : 'أَحْسَنْتِ يَا أَمِيرَتِي الحُلْوَة! رَائِعَةٌ جِدًّا!',
        'مَا شَاءَ الله عَلَيْكِ يَا شَاطِرَة!',
        'مُمْتَازَةٌ يَا حَبِيبَتِي! أَنْتِ نَجْمَةُ السَّفَارِي!',
        'إِبْدَاعٌ جَمِيلٌ جِدًّا! أَنَا فَخُورَةٌ بِكِ!'
      ];
      const list = state.gender === 'boy' ? boyPraisesAr : girlPraisesAr;
      return list[Math.floor(Math.random() * list.length)];
    }
  }

  function getNaturalLetterSentence(item) {
    if (state.lang === 'en') return item.phrase;
    return g(item.phrase.boy, item.phrase.girl);
  }

  // Bilingual helper for the celebration card, which shows text in the active language.
  function tr(en, ar) {
    return state.lang === 'en' ? en : ar;
  }


  // ==========================================================================
  // GENDER CONFIGURATION & COMPANION CONTROLLER
  // ==========================================================================

  // Builds <span class="eng-text">…</span><span class="ar-text">…</span> without innerHTML,
  // because the text can include the child's typed name.
  function setBilingualText(el, en, ar) {
    const enSpan = document.createElement('span');
    enSpan.className = 'eng-text';
    enSpan.textContent = en;
    const arSpan = document.createElement('span');
    arSpan.className = 'ar-text';
    arSpan.textContent = ar;
    el.replaceChildren(enSpan, arSpan);
  }

  function applyGenderUI() {
    document.body.setAttribute('data-gender', state.gender);

    // Header badge elements
    const avatarBadge = document.getElementById('gender-avatar-badge');
    const badgeTitle = document.getElementById('gender-badge-title');
    const pillTag = document.getElementById('gender-pill-tag');
    const compAvatar = document.getElementById('companion-avatar');
    const compNameTag = document.getElementById('companion-name-tag');

    const isBoy = state.gender === 'boy';
    const activeAvatar = state.avatar || (isBoy ? '👦' : '👧');

    if (avatarBadge) avatarBadge.textContent = activeAvatar;
    if (pillTag) pillTag.textContent = isBoy ? 'Boy' : 'Girl';

    const name = state.childName;
    if (badgeTitle) {
      const titleEn = name ? `${name} • ${g('Boy', 'Girl')}` : g('Little Boy', 'Little Girl');
      const titleAr = name ? `${name} • ${g('بطل', 'أميرة')}` : g('البطل الصغير', 'الأميرة الصغيرة');
      setBilingualText(badgeTitle, titleEn, titleAr);
    }

    if (compAvatar) compAvatar.textContent = activeAvatar;
    if (compNameTag) {
      const displayEn = name ? `${name} • ${g('Hero', 'Star')}` : g('Leo • Hero', 'Noor • Star');
      const displayAr = name ? `${name} • ${g('البطل', 'الأميرة')}` : g('زيد • البطل', 'نور • الأميرة');
      setBilingualText(compNameTag, displayEn, displayAr);
    }

    // Modal selection highlight
    document.querySelectorAll('.gender-card-option').forEach(card => {
      card.classList.toggle('selected', card.dataset.gender === state.gender);
    });

    // Modal avatar highlight
    document.querySelectorAll('.avatar-choice-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.avatar === activeAvatar);
    });

    const nameInput = document.getElementById('input-child-name');
    if (nameInput) nameInput.value = state.childName;
  }

  function setGender(newGender, avatar, name) {
    state.gender = newGender;
    if (avatar) state.avatar = avatar;
    if (name !== undefined) state.childName = name.trim().slice(0, 18);

    store.set('alpha_gender', state.gender);
    store.set('alpha_avatar', state.avatar);
    store.set('alpha_child_name', state.childName);

    applyGenderUI();
    playChimeSound();

    // Welcome voice announcement
    const voc = getChildVocative();
    if (state.lang === 'en') {
      const msg = state.gender === 'boy' 
        ? `Awesome! Welcome, ${voc}! Let's go on our safari adventure!` 
        : `Wonderful! Welcome, ${voc}! Let's go on our magical safari!`;
      speakText(msg);
      updateCompanionBubble(msg);
    } else {
      const msgAr = state.gender === 'boy'
        ? `أَهْلًا وَسَهْلًا بِكَ يَا ${voc}! هَيَّا بِنَا نَبْدَأُ المَغَامَرَةَ فِي عَالَمِ الحُرُوف!`
        : `أَهْلًا وَسَهْلًا بِكِ يَا ${voc}! هَيَّا بِنَا نَبْدَأُ المَغَامَرَةَ السَّاحِرَةَ مَعَ الحُرُوف!`;
      speakText(msgAr);
      updateCompanionBubble(msgAr);
    }
  }

  function updateCompanionBubble(text) {
    const bubbleText = document.getElementById('mascot-bubble-text');
    if (bubbleText) {
      bubbleText.textContent = text;
    }
  }

  function bounceCompanion() {
    const comp = document.getElementById('companion-avatar');
    if (comp) {
      comp.classList.remove('bouncy');
      void comp.offsetWidth;
      comp.classList.add('bouncy');
    }
  }

  let focusBeforeModal = null;

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (!document.querySelector('.modal-overlay.open')) focusBeforeModal = document.activeElement;
    modal.inert = false;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    const focusTarget = modal.querySelector('.modal-close-btn, button');
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.inert = true; // out of the tab order and the accessibility tree
    if (!document.querySelector('.modal-overlay.open') && focusBeforeModal && focusBeforeModal.focus) {
      focusBeforeModal.focus({ preventScroll: true });
      focusBeforeModal = null;
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.open').forEach(modal => closeModal(modal.id));
  }

  function openGenderModal() {
    applyGenderUI();
    openModal('modal-gender');
    playSparkleSound();
  }

  function speakCompanionGreeting() {
    bounceCompanion();
    playSparkleSound();
    const voc = getChildVocative();
    const phrase = state.lang === 'en'
      ? g(`Hi ${voc}! I'm Leo, your safari buddy! Tap any letter to hear its story!`,
          `Hello ${voc}! I'm Noor, your safari buddy! Tap any letter to hear its magical story!`)
      : g(`مَرْحَبًا يَا ${voc}! أَنَا صَدِيقُكَ اللَّطِيف، اِضْغَطْ عَلَى أَيِّ حَرْفٍ لِنَسْتَمِعَ إِلَى قِصَّتِهِ الرَّائِعَة!`,
          `مَرْحَبًا يَا ${voc}! أَنَا صَدِيقَتُكِ اللَّطِيفَة، اِضْغَطِي عَلَى أَيِّ حَرْفٍ لِنَسْتَمِعَ إِلَى قِصَّتِهِ السَّاحِرَة!`);
    updateCompanionBubble(phrase);
    speakText(phrase);
  }

  // Every speech call returns a Promise that settles with how it finished:
  // 'ended' | 'failed' | 'stopped' | 'muted'. Only one clip or utterance plays at a time;
  // starting a new one settles the previous one as 'stopped'.
  let activeAudio = null;
  let activeDone = null;
  let nativeUtteranceSeq = 0;
  const nativePending = {};

  function settleActive(result) {
    const done = activeDone;
    activeDone = null;
    activeAudio = null;
    if (done) done(result);
  }

  function hasNativeTTS() {
    return !!(window.AndroidBridge && typeof window.AndroidBridge.speak === 'function');
  }

  // Called by MainActivity (Android) when a native TextToSpeech utterance finishes.
  window.AlphabetSafariSpeechDone = function (id, ok) {
    const resolve = nativePending[id];
    if (resolve) {
      delete nativePending[id];
      resolve(ok === false ? 'failed' : 'ended');
    }
  };

  function stopAllSpeechAndAudio() {
    if (activeAudio) {
      try {
        activeAudio.pause();
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (hasNativeTTS() && typeof window.AndroidBridge.stopSpeaking === 'function') {
      try {
        window.AndroidBridge.stopSpeaking();
      } catch (e) {}
    }
    Object.keys(nativePending).forEach(id => window.AlphabetSafariSpeechDone(id, true));
    settleActive('stopped');
  }

  // Studio clips were recorded at a natural pace; scale them relative to the "Natural" setting.
  function clipPlaybackRate() {
    return Math.min(1.25, Math.max(0.7, state.voiceSpeed / 0.95));
  }

  function playAudioUrl(url) {
    if (!state.soundEnabled) return Promise.resolve('muted');
    stopAllSpeechAndAudio();

    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.playbackRate = clipPlaybackRate();
      activeAudio = audio;
      activeDone = resolve;
      const finish = (result) => {
        if (activeAudio === audio) settleActive(result);
      };
      audio.onended = () => finish('ended');
      audio.onerror = () => finish('failed');
      const playPromise = audio.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => finish('failed'));
      }
    });
  }

  // The Windows desktop app serves neural TTS at api/tts. Probe once instead of
  // requesting it (and getting a 404) on every phrase when hosted elsewhere.
  let ttsServerProbe = null;
  function hasTtsServer() {
    if (!window.location.protocol.startsWith('http')) return Promise.resolve(false);
    if (!ttsServerProbe) {
      ttsServerProbe = fetch('api/health', { cache: 'no-store' })
        .then(res => (res.ok ? res.json() : null))
        .then(info => !!(info && info.tts))
        .catch(() => false);
    }
    return ttsServerProbe;
  }

  function getBestVoice(targetLang, gender, localOnly) {
    if (!voices || voices.length === 0) return null;

    const isArabic = targetLang.startsWith('ar');
    const isEnglish = targetLang.startsWith('en');
    const isBoy = gender === 'boy';

    // localOnly: voices that synthesize on the device (network voices would upload the text).
    const langVoices = voices.filter(v => {
      if (localOnly && !v.localService) return false;
      if (isArabic) return v.lang.toLowerCase().startsWith('ar');
      if (isEnglish) return v.lang.toLowerCase().startsWith('en');
      return true;
    });
    if (langVoices.length === 0) return null;

    // Prioritize natural neural voices, penalize robotic legacy SAPI voices
    const scored = langVoices.map(v => {
      let score = 0;
      const name = v.name.toLowerCase();

      if (name.includes('natural')) score += 100;
      if (name.includes('online')) score += 80;
      if (name.includes('neural')) score += 80;
      if (name.includes('google')) score += 70;
      if (name.includes('siri') || name.includes('premium')) score += 70;

      if (isEnglish) {
        if (isBoy) {
          if (name.includes('ana')) score += 60;
          if (name.includes('guy') || name.includes('christopher') || name.includes('eric')) score += 40;
          if (name.includes('male') || name.includes('boy')) score += 20;
        } else {
          if (name.includes('jenny')) score += 60;
          if (name.includes('aria') || name.includes('samantha')) score += 40;
          if (name.includes('female') || name.includes('girl')) score += 20;
        }
      } else if (isArabic) {
        if (isBoy) {
          if (name.includes('hamed') || name.includes('shakir') || name.includes('maged')) score += 60;
          if (name.includes('male')) score += 20;
        } else {
          if (name.includes('zariyah') || name.includes('salma')) score += 60;
          if (name.includes('female') || name.includes('hoda') || name.includes('zeina')) score += 40;
        }
      }

      // Penalize legacy robotic Windows desktop voices
      if (name.includes('david')) score -= 80;
      if (name.includes('zira')) score -= 80;
      if (name.includes('mark')) score -= 80;
      if (name.includes('desktop')) score -= 60;

      return { voice: v, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.voice || langVoices[0];
  }

  async function speakText(text, langOverride, genderOverride) {
    if (!state.soundEnabled) return 'muted';
    if (!text || !text.trim()) return 'failed';

    const targetLang = langOverride || (state.lang === 'en' ? 'en-US' : 'ar-SA');
    const gender = genderOverride || state.gender;
    // The child's name is only ever spoken by on-device voices, never sent to a cloud
    // service. If no on-device voice is available, the same phrase is said without the name.
    const personal = containsChildName(text);

    let result;
    if (hasNativeTTS()) {
      result = await speakNative(text, targetLang, personal);
    } else {
      if (!personal && await hasTtsServer()) {
        const ttsUrl = `api/tts?text=${encodeURIComponent(text)}&lang=${targetLang}&gender=${gender}`;
        result = await playAudioUrl(ttsUrl);
        if (result !== 'failed') return result;
      }
      result = await speakWithBrowser(text, targetLang, gender, personal);
    }
    if (result === 'failed' && personal) {
      return speakText(withoutChildName(text), langOverride, genderOverride);
    }
    return result;
  }

  function containsChildName(text) {
    return !!state.childName && text.includes(state.childName);
  }

  // "Hi Noor! ..." -> "Hi! ...", "مرحبا يا نور! ..." -> "مرحبا! ..."
  function withoutChildName(text) {
    return text.split(state.childName).join('')
      .replace(/(^|\s)يَا\s*(?=[!?.,،؟])/g, '$1')
      .replace(/\s+([!?.,،؟])/g, '$1')
      .replace(/[,،]([!?.؟])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function speakNative(text, targetLang, localOnly) {
    stopAllSpeechAndAudio();
    const id = `u${++nativeUtteranceSeq}`;
    return new Promise((resolve) => {
      nativePending[id] = resolve;
      try {
        window.AndroidBridge.speak(text, targetLang, state.voiceSpeed, id, !!localOnly);
      } catch (e) {
        window.AlphabetSafariSpeechDone(id, false);
      }
    });
  }

  function speakWithBrowser(text, targetLang, gender, localOnly) {
    if (!('speechSynthesis' in window)) return Promise.resolve('failed');
    const bestVoice = getBestVoice(targetLang, gender, localOnly);
    if (localOnly && !bestVoice) return Promise.resolve('failed');
    stopAllSpeechAndAudio();

    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = targetLang;
      utter.rate = state.voiceSpeed;
      // Natural pitch: shifting browser voices introduces a metallic, robotic ring.
      utter.pitch = 1.0;

      if (bestVoice) utter.voice = bestVoice;

      activeDone = resolve;
      const finish = (result) => {
        if (activeDone === resolve) settleActive(result);
      };
      utter.onend = () => finish('ended');
      utter.onerror = () => finish('failed');
      window.speechSynthesis.speak(utter);
    });
  }

  function speakCurrentLetter() {
    const item = getCurrentItem();
    const sentence = getNaturalLetterSentence(item);

    updateCompanionBubble(sentence);
    bounceCompanion();

    const clip = `assets/audio/${state.lang}/${state.gender}/${item.audio}.mp3`;
    return playAudioUrl(clip).then(result => (result === 'failed' ? speakText(sentence) : result));
  }

  function speakArabicVowel(vowelType) {
    const item = getCurrentItem();
    if (state.lang !== 'ar') return;

    const charWithVowel = item[vowelType] || item.char;
    let label;
    if (vowelType === 'fatha') label = `${charWithVowel}... فَتحَة`;
    else if (vowelType === 'damma') label = `${charWithVowel}... ضَمَّة`;
    else if (vowelType === 'kasra') label = `${charWithVowel}... كَسرَة`;
    else label = `${charWithVowel}... سُكون`;

    speakText(label, 'ar-SA');
  }


  // ==========================================================================
  // CELEBRATION CONFETTI
  // ==========================================================================

  const confettiCanvas = document.getElementById('confetti-canvas');
  let confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
  let confettiParticles = [];
  let confettiAnimId = null;

  function resizeConfetti() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfetti);
  resizeConfetti();

  function triggerConfetti() {
    playFanfareSound();
    if (!confettiCanvas || !confettiCtx) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    confettiParticles = [];
    const colors = ['#FF4757', '#FFA502', '#2ED573', '#1E90FF', '#7158E2', '#FF6B8B', '#FFD32A'];
    
    for (let i = 0; i < 90; i++) {
      confettiParticles.push({
        x: confettiCanvas.width / 2 + (Math.random() * 200 - 100),
        y: confettiCanvas.height / 3 + (Math.random() * 100 - 50),
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 1.2) * 14,
        size: Math.random() * 10 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 12,
        alpha: 1
      });
    }

    if (!confettiAnimId) {
      animateConfetti();
    }
  }

  function animateConfetti() {
    if (!confettiCtx) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      const p = confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // gravity
      p.rotation += p.spin;
      p.alpha -= 0.012;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.globalAlpha = Math.max(p.alpha, 0);
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      confettiCtx.restore();

      if (p.alpha <= 0 || p.y > confettiCanvas.height + 20) {
        confettiParticles.splice(i, 1);
      }
    }

    if (confettiParticles.length > 0) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      confettiAnimId = null;
    }
  }

  // ==========================================================================
  // REWARDS: STARS & STICKERS
  // ==========================================================================

  function addStars(num) {
    state.stars += num;
    store.set('alpha_stars', state.stars.toString());

    const newlyUnlocked = STICKERS_LIST.filter(stk =>
      state.stars >= stk.cost && !state.unlockedStickers.includes(stk.id));
    if (newlyUnlocked.length) {
      newlyUnlocked.forEach(stk => state.unlockedStickers.push(stk.id));
      store.set('alpha_stickers', state.unlockedStickers);
      // One celebration even if a big reward unlocks several stickers at once.
      const emojis = newlyUnlocked.map(stk => stk.emoji).join(' ');
      showCelebrateModal(tr(
        `You unlocked a new sticker: ${emojis}!`,
        `${g('فَتَحْتَ', 'فَتَحْتِ')} مُلْصَقًا جَدِيدًا: ${emojis}!`
      ));
    }
    updateStarUI();
  }

  function updateStarUI() {
    const countEl = document.getElementById('star-count');
    if (countEl) countEl.textContent = state.stars;
    renderStickerTray();
  }

  function showCelebrateModal(msg) {
    triggerConfetti();
    bounceCompanion();
    const msgEl = document.getElementById('celebrate-text');
    const naturalPraise = getNaturalPraise();
    if (msgEl) msgEl.textContent = msg ? (msg + ' ' + naturalPraise) : naturalPraise;
    openModal('modal-celebrate');

    // Natural celebratory speech with short delay after fanfare
    setTimeout(() => {
      speakText(naturalPraise);
    }, 350);
  }

  // ==========================================================================
  // UI RENDERERS: EXPLORE MODE
  // ==========================================================================

  function renderExploreView() {
    const list = getActiveAlphabet();
    const item = getCurrentItem();

    // Index tag
    const idxEl = document.getElementById('spotlight-index');
    if (idxEl) {
      if (state.lang === 'en') {
        idxEl.textContent = `Letter ${state.currentIndex + 1} of ${list.length}`;
      } else {
        idxEl.textContent = `الحرف ${state.currentIndex + 1} من ${list.length}`;
      }
    }

    // Phonics tag
    const phonicsEl = document.getElementById('spotlight-phonics');
    if (phonicsEl) phonicsEl.textContent = `${tr('Sound', 'الصوت')}: ${item.phonics}`;

    // Translit tag
    const translitEl = document.getElementById('spotlight-translit');
    if (translitEl) {
      if (state.lang === 'ar' && state.showTranslit) {
        translitEl.style.display = 'inline-block';
        translitEl.textContent = `${item.name} (${item.translit})`;
      } else {
        translitEl.style.display = 'none';
      }
    }

    // Big Letter
    const bigLetterEl = document.getElementById('spotlight-letter');
    if (bigLetterEl) {
      if (state.lang === 'en') {
        bigLetterEl.textContent = state.caseMode === 'upper' ? item.char : `${item.char} ${item.lower}`;
      } else {
        bigLetterEl.textContent = item.char;
      }
    }

    // Arabic Vowel Bar
    const vowelBar = document.getElementById('arabic-vowels-bar');
    if (vowelBar) {
      if (state.lang === 'ar' && state.showHarakat) {
        vowelBar.style.display = 'flex';
        document.getElementById('vowel-fatha').textContent = item.fatha || item.char;
        document.getElementById('vowel-damma').textContent = item.damma || item.char;
        document.getElementById('vowel-kasra').textContent = item.kasra || item.char;
        document.getElementById('vowel-sukun').textContent = item.sukun || item.char;
      } else {
        vowelBar.style.display = 'none';
      }
    }

    // Object & Illustration
    const illEl = document.getElementById('spotlight-illustration');
    if (illEl) illEl.textContent = item.emoji;

    const wordEl = document.getElementById('spotlight-word');
    if (wordEl) wordEl.textContent = item.word;

    const meanEl = document.getElementById('spotlight-word-meaning');
    if (meanEl) meanEl.textContent = item.meaning;

    // Render Full Grid
    renderLettersGrid();

    // Update Mascot Speech Bubble
    updateMascotCheer(item);
  }

  function renderLettersGrid() {
    const grid = document.getElementById('letters-grid');
    if (!grid) return;
    const hadFocus = grid.contains(document.activeElement);
    grid.innerHTML = '';

    const list = getActiveAlphabet();
    list.forEach((item, idx) => {
      const card = document.createElement('button');
      card.className = `grid-letter-card ${idx === state.currentIndex ? 'active' : ''}`;
      card.setAttribute('aria-label', `${item.char}, ${item.word}`);

      const charSpan = document.createElement('span');
      charSpan.className = 'grid-char';
      charSpan.textContent = state.lang === 'en' && state.caseMode !== 'upper' ? `${item.char}${item.lower}` : item.char;

      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'grid-emoji';
      emojiSpan.textContent = item.emoji;

      card.appendChild(charSpan);
      card.appendChild(emojiSpan);

      card.addEventListener('click', () => {
        state.currentIndex = idx;
        renderExploreView();
        speakCurrentLetter();
      });

      grid.appendChild(card);
    });
    // Rebuilding the grid would otherwise drop keyboard focus back to <body>.
    if (hadFocus && grid.children[state.currentIndex]) {
      grid.children[state.currentIndex].focus({ preventScroll: true });
    }
  }

  function updateMascotCheer(item) {
    const textEl = document.getElementById('mascot-bubble-text');
    if (!textEl) return;

    if (state.lang === 'en') {
      const cheers = [
        `Look, it's "${item.char}"! Can you say ${item.word}? 🌟`,
        `Super! "${item.char}" is for ${item.word} ${item.emoji}!`,
        `Tap the letter "${item.char}" to hear it speak!`
      ];
      textEl.textContent = cheers[state.currentIndex % cheers.length];
    } else {
      const cheers = [
        `${g('انظر يا بطل', 'انظري يا أميرة')}، هذا حرف "${item.char}"! مثل ${item.word} ${item.emoji}!`,
        `${g('أحسنت! اضغط', 'أحسنتِ! اضغطي')} على الحرف "${item.char}" ${g('لتسمع', 'لتسمعي')} صوته الجميل!`,
        `ما شاء الله! هل ${g('تحب', 'تحبين')} ${item.word}؟ لنقل معاً: ${item.char}!`
      ];
      textEl.textContent = cheers[state.currentIndex % cheers.length];
    }
  }

  // ==========================================================================
  // MODE 2: MAGIC LETTER TRACING
  // ==========================================================================

  let isTracing = false;
  let traceBrushColor = 'rainbow';
  let rainbowHue = 0;
  let moveCount = 0;
  let traceAwarded = false; // one reward per letter attempt
  let traceSamples = null;  // sample points used to score how well the letter was traced
  let activePointerId = null; // one finger draws; a resting palm or second finger is ignored

  const TRACE_BRUSH_WIDTH = 26;
  const TRACE_SAMPLE_STEP = 8;
  const TRACE_PASS_COVERAGE = 0.6;  // share of the letter's body the child painted over
  const TRACE_PASS_PRECISION = 0.55; // share of the child's paint that stayed near the letter

  const guideCanvas = document.getElementById('trace-guide-canvas');
  const userCanvas = document.getElementById('trace-user-canvas');
  const guideCtx = guideCanvas ? guideCanvas.getContext('2d') : null;
  const userCtx = userCanvas ? userCanvas.getContext('2d', { willReadFrequently: true }) : null;

  function initTracingMode() {
    renderTraceLetterRibbon();
    setupCanvas();
    drawGuideLetter();
    // The guide uses web fonts; redraw once they are ready so the outline matches the real glyph.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (state.mode === 'trace') drawGuideLetter();
      });
    }
  }

  function setupCanvas() {
    if (!userCanvas || !guideCanvas) return;

    const wrapper = document.getElementById('canvas-wrapper');
    const width = wrapper.clientWidth || 550;
    const height = wrapper.clientHeight || 400;

    userCanvas.width = width;
    userCanvas.height = height;
    guideCanvas.width = width;
    guideCanvas.height = height;

    clearUserDrawing();
  }

  let traceResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(traceResizeTimer);
    traceResizeTimer = setTimeout(() => {
      if (state.mode !== 'trace') return;
      // Many devices fire resize without a size change (e.g. toolbars); keep the drawing then.
      const wrapper = document.getElementById('canvas-wrapper');
      if (wrapper && userCanvas && wrapper.clientWidth === userCanvas.width &&
          wrapper.clientHeight === userCanvas.height) return;
      setupCanvas();
      drawGuideLetter();
    }, 150);
  });

  function clearUserDrawing() {
    if (userCtx && userCanvas) {
      userCtx.clearRect(0, 0, userCanvas.width, userCanvas.height);
    }
    moveCount = 0;
    traceAwarded = false;
  }

  // Fit the glyph to the canvas so wide letters (ص, ض, W) don't overflow on phones.
  function letterFont() {
    const w = guideCanvas ? guideCanvas.width : 550;
    const h = guideCanvas ? guideCanvas.height : 400;
    const size = Math.round(Math.min(state.lang === 'en' ? 240 : 280, h * 0.68, w * 0.62));
    return state.lang === 'en' ? `800 ${size}px Fredoka, sans-serif` : `800 ${size}px "Baloo 2", sans-serif`;
  }

  function letterOrigin(canvas) {
    return { x: canvas.width / 2, y: canvas.height / 2 + 30 };
  }

  function drawGuideLetter() {
    if (!guideCtx || !guideCanvas) return;
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

    const item = getCurrentItem();
    const charEl = document.getElementById('trace-current-char');
    if (charEl) charEl.textContent = item.char;

    const { x: centerX, y: centerY } = letterOrigin(guideCanvas);

    // Draw Large Dashed Outline Letter
    guideCtx.save();
    guideCtx.textAlign = 'center';
    guideCtx.textBaseline = 'middle';
    guideCtx.font = letterFont();

    // Soft background fill
    guideCtx.fillStyle = 'rgba(224, 231, 255, 0.5)';
    guideCtx.fillText(item.char, centerX, centerY);

    // Dashed stroke guide
    guideCtx.lineWidth = 14;
    guideCtx.strokeStyle = '#818CF8';
    guideCtx.setLineDash([16, 14]);
    guideCtx.lineCap = 'round';
    guideCtx.lineJoin = 'round';
    guideCtx.strokeText(item.char, centerX, centerY);
    guideCtx.restore();

    traceSamples = buildTraceSamples(item.char);
  }

  // Render the letter off-screen twice: its solid body (what should be painted) and a
  // brush-widened halo (where paint still counts as "on the letter"), then keep a grid
  // of sample points so each check is a cheap lookup.
  function buildTraceSamples(char) {
    if (!guideCanvas) return null;
    const w = guideCanvas.width;
    const h = guideCanvas.height;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    const { x, y } = letterOrigin(off);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = letterFont();

    ctx.fillText(char, x, y);
    const body = ctx.getImageData(0, 0, w, h).data;

    ctx.lineWidth = TRACE_BRUSH_WIDTH * 2;
    ctx.lineJoin = 'round';
    ctx.strokeText(char, x, y);
    const halo = ctx.getImageData(0, 0, w, h).data;

    const points = [];
    for (let py = 0; py < h; py += TRACE_SAMPLE_STEP) {
      for (let px = 0; px < w; px += TRACE_SAMPLE_STEP) {
        const a = (py * w + px) * 4 + 3;
        points.push({ a, inBody: body[a] > 128, nearLetter: halo[a] > 0 });
      }
    }
    return { w, h, points };
  }

  function scoreTracing() {
    if (!userCtx || !traceSamples || traceSamples.w !== userCanvas.width) return { coverage: 0, precision: 0 };
    const painted = userCtx.getImageData(0, 0, traceSamples.w, traceSamples.h).data;
    let body = 0, bodyPainted = 0, paint = 0, paintNear = 0;
    traceSamples.points.forEach(p => {
      const isPainted = painted[p.a] > 0;
      if (p.inBody) {
        body++;
        if (isPainted) bodyPainted++;
      }
      if (isPainted) {
        paint++;
        if (p.nearLetter) paintNear++;
      }
    });
    return {
      coverage: body ? bodyPainted / body : 0,
      precision: paint ? paintNear / paint : 0
    };
  }

  function tracingPassed() {
    const { coverage, precision } = scoreTracing();
    return coverage >= TRACE_PASS_COVERAGE && precision >= TRACE_PASS_PRECISION;
  }

  function celebrateTracing() {
    traceAwarded = true;
    addStars(2);
    triggerConfetti();
    praiseTracing();
  }

  function praiseTracing() {
    speakText(state.lang === 'en'
      ? 'Super job! You traced the letter!'
      : g('أَحْسَنْتَ يَا بَطَل! رَسْمٌ رَائِعٌ لِلْحَرْف!', 'أَحْسَنْتِ يَا أَمِيرَة! رَسْمٌ رَائِعٌ لِلْحَرْف!'));
  }

  function checkTracing() {
    if (traceAwarded) {
      // Already rewarded for this letter: praise again, but no more stars.
      praiseTracing();
      return;
    }
    if (tracingPassed()) {
      celebrateTracing();
    } else {
      speakText(state.lang === 'en'
        ? 'Almost there! Keep following the dotted letter!'
        : g('اِقْتَرَبْتَ! تَابِعِ الرَّسْمَ عَلَى الخُطُوطِ المُنَقَّطَة!', 'اِقْتَرَبْتِ! تَابِعِي الرَّسْمَ عَلَى الخُطُوطِ المُنَقَّطَة!'));
    }
  }

  function renderTraceLetterRibbon() {
    const ribbon = document.getElementById('trace-letter-ribbon');
    if (!ribbon) return;
    ribbon.innerHTML = '';

    const list = getActiveAlphabet();
    list.forEach((item, idx) => {
      const chip = document.createElement('button');
      chip.className = `trace-chip ${idx === state.currentIndex ? 'active' : ''}`;
      chip.textContent = item.char;
      chip.addEventListener('click', () => {
        state.currentIndex = idx;
        renderTraceLetterRibbon();
        drawGuideLetter();
        clearUserDrawing();
        speakCurrentLetter();
      });
      ribbon.appendChild(chip);
    });
  }

  // Pointer events cover mouse, touch and stylus (Windows touch screens and Android alike).
  function handleTraceStart(e) {
    if (!userCtx || activePointerId !== null) return;
    e.preventDefault();
    initAudioContext();
    isTracing = true;
    activePointerId = e.pointerId;
    try {
      userCanvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    const promptOverlay = document.getElementById('trace-prompt-overlay');
    if (promptOverlay) promptOverlay.style.display = 'none';

    const pos = getCanvasPos(e);
    userCtx.beginPath();
    userCtx.moveTo(pos.x, pos.y);
    drawTraceSparkle(pos.x, pos.y);
  }

  function handleTraceMove(e) {
    if (!isTracing || !userCtx || e.pointerId !== activePointerId) return;
    e.preventDefault();

    const pos = getCanvasPos(e);
    rainbowHue = (rainbowHue + 4) % 360;

    userCtx.lineWidth = TRACE_BRUSH_WIDTH;
    userCtx.lineCap = 'round';
    userCtx.lineJoin = 'round';
    userCtx.strokeStyle = traceBrushColor === 'rainbow' ? `hsl(${rainbowHue}, 90%, 55%)` : traceBrushColor;

    // Stroke each segment separately so the rainbow hue changes along the line.
    userCtx.lineTo(pos.x, pos.y);
    userCtx.stroke();
    userCtx.beginPath();
    userCtx.moveTo(pos.x, pos.y);

    drawTraceSparkle(pos.x, pos.y);
    moveCount++;
    if (moveCount % 15 === 0) {
      playSparkleSound();
    }
  }

  function handleTraceEnd(e) {
    if (!isTracing || (e && e.pointerId !== activePointerId)) return;
    isTracing = false;
    activePointerId = null;
    // Reward automatically as soon as the letter is well covered, once per attempt.
    if (!traceAwarded && tracingPassed()) {
      celebrateTracing();
    }
  }

  function getCanvasPos(e) {
    const rect = userCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (userCanvas.width / rect.width),
      y: (e.clientY - rect.top) * (userCanvas.height / rect.height)
    };
  }

  function drawTraceSparkle(x, y) {
    if (!userCtx) return;
    userCtx.save();
    userCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    userCtx.beginPath();
    userCtx.arc(x + (Math.random() * 20 - 10), y + (Math.random() * 20 - 10), Math.random() * 6 + 2, 0, Math.PI * 2);
    userCtx.fill();
    userCtx.restore();
  }

  if (userCanvas) {
    userCanvas.style.touchAction = 'none';
    userCanvas.addEventListener('pointerdown', handleTraceStart);
    userCanvas.addEventListener('pointermove', handleTraceMove);
    userCanvas.addEventListener('pointerup', handleTraceEnd);
    userCanvas.addEventListener('pointercancel', handleTraceEnd);
  }

  // ==========================================================================
  // MODE 3: POP BALLOONS MINI-GAME
  // ==========================================================================

  let balloonTarget = null;
  let balloonScore = 0;
  let balloonStreak = 0;
  let balloonRoundLocked = false; // ignore taps while a correct pop is being celebrated

  const BALLOON_COLORS = [
    'linear-gradient(135deg, #FF4757, #FF6B8B)',
    'linear-gradient(135deg, #1E90FF, #70A1FF)',
    'linear-gradient(135deg, #2ED573, #7BED9F)',
    'linear-gradient(135deg, #FFA502, #ECCC68)',
    'linear-gradient(135deg, #7158E2, #9B59B6)'
  ];
  const BALLOON_MIN_TARGETS = 2; // of 5 balloons, so every round is winnable

  function initBalloonGame() {
    viewEpoch++;
    balloonScore = 0;
    balloonStreak = 0;
    balloonRoundLocked = false;
    updateBalloonStats();
    chooseBalloonTarget();
    startBalloonSpawner();
    speakBalloonPrompt();
  }

  function updateBalloonStats() {
    const sc = document.getElementById('balloon-score');
    const st = document.getElementById('balloon-streak');
    if (sc) sc.textContent = balloonScore;
    if (st) st.textContent = balloonStreak;
  }

  function chooseBalloonTarget() {
    const list = getActiveAlphabet();
    let next;
    do {
      next = randomItem(list);
    } while (balloonTarget && next.char === balloonTarget.char && list.length > 1);
    balloonTarget = next;

    const letterEl = document.getElementById('balloon-target-letter');
    if (letterEl) letterEl.textContent = balloonTarget.char;
  }

  function speakBalloonPrompt() {
    if (!balloonTarget) return;
    if (state.lang === 'en') {
      speakText(`Can you pop the letter... ${balloonTarget.name}?`);
    } else {
      speakText(`أين حرف... ${balloonTarget.name}؟`);
    }
  }

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomDistractor() {
    const list = getActiveAlphabet().filter(item => item.char !== balloonTarget.char);
    return randomItem(list);
  }

  // Give every balloon a letter for the current target, guaranteeing some targets.
  function letterAllBalloons() {
    const balloons = Array.from(document.querySelectorAll('#balloon-sky .flying-balloon'));
    const targetSlots = new Set();
    while (targetSlots.size < Math.min(BALLOON_MIN_TARGETS, balloons.length)) {
      targetSlots.add(Math.floor(Math.random() * balloons.length));
    }
    balloons.forEach((balloon, idx) => {
      const isTarget = targetSlots.has(idx) || Math.random() < 0.2;
      setBalloonLetter(balloon, isTarget ? balloonTarget : randomDistractor());
    });
  }

  function setBalloonLetter(balloon, item) {
    balloon.dataset.char = item.char;
    balloon.textContent = item.char;
    balloon.style.background = randomItem(BALLOON_COLORS);
  }

  function startBalloonSpawner() {
    const sky = document.getElementById('balloon-sky');
    if (!sky) return;
    sky.innerHTML = '';

    // 5 persistent floating balloons with staggered negative delays, spread across the width
    const delays = [0, -1.8, -3.6, -5.4, -7.2];
    const xOffsets = [15, 32, 50, 68, 85];

    delays.forEach((delay, idx) => {
      createBalloon(sky, delay, xOffsets[idx]);
    });
    letterAllBalloons();
  }

  function createBalloon(sky, delaySec, xPercent) {
    const balloon = document.createElement('div');
    balloon.className = 'flying-balloon';
    balloon.style.left = `${xPercent}%`;
    balloon.style.animationDelay = `${delaySec}s, ${Math.random() * 1.5}s`;
    sky.appendChild(balloon);

    balloon.addEventListener('click', (e) => {
      e.stopPropagation();
      if (balloonRoundLocked || !balloonTarget) return;
      playPopSound();

      // Read the letter the balloon shows right now; balloons are re-lettered every round.
      const item = getActiveAlphabet().find(it => it.char === balloon.dataset.char);
      if (!item) return;

      if (item.char === balloonTarget.char) {
        balloonRoundLocked = true;
        balloonScore++;
        balloonStreak++;
        addStars(1);
        triggerConfetti();
        balloon.classList.add('popped');

        speakText(state.lang === 'en'
          ? `Yay! You popped ${balloonTarget.name}!`
          : `رائع! حرف ${balloonTarget.name}!`);

        laterInView(() => {
          balloon.classList.remove('popped');
          chooseBalloonTarget();
          letterAllBalloons();
          balloonRoundLocked = false;
          speakBalloonPrompt();
        }, 1400);
      } else {
        balloonStreak = 0;
        // Independent scale/rotate properties compose with the sway animation, which owns
        // `transform`; setting transform here was silently overridden and never showed.
        balloon.style.scale = '0.85';
        balloon.style.rotate = '-15deg';
        speakText(state.lang === 'en'
          ? `That's ${item.name}! Find ${balloonTarget.name}!`
          : `هذا حرف ${item.name}! ${g('ابحث', 'ابحثي')} عن ${balloonTarget.name}!`);
        setTimeout(() => {
          balloon.style.scale = '';
          balloon.style.rotate = '';
        }, 600);
      }
      updateBalloonStats();
    });
  }

  // ==========================================================================
  // MODE 4: FIND LETTER / PICTURE MATCH
  // ==========================================================================

  let matchTarget = null;
  let matchSolved = false; // stops a double tap on the right answer from scoring twice
  let matchMisses = 0;

  function initMatchGame() {
    viewEpoch++;
    pickNewMatchQuest();
  }

  // Letters whose keyword holds them at the end (X in "fox") can't be asked as
  // "which letter starts the word"; they still appear as distractors.
  function startsItsKeyword(item) {
    return item.keywordPosition !== 'end';
  }

  function pickNewMatchQuest() {
    const list = getActiveAlphabet();
    matchTarget = randomItem(list.filter(startsItsKeyword));
    matchSolved = false;
    matchMisses = 0;

    const iconEl = document.getElementById('match-quest-icon');
    const wordEl = document.getElementById('match-quest-word');
    const hintEl = document.getElementById('match-quest-hint');
    const feedbackEl = document.getElementById('match-feedback-text');

    if (iconEl) iconEl.textContent = matchTarget.emoji;
    if (wordEl) wordEl.textContent = matchTarget.word;
    if (hintEl) {
      hintEl.textContent = state.lang === 'en'
        ? `"${matchTarget.char}... ${matchTarget.word}!"`
        : `"${matchTarget.char}... ${matchTarget.word}!"`;
      // The written hint gives the answer away, so it waits until the child needs help;
      // with sound off it is the only prompt, so it shows straight away.
      hintEl.classList.toggle('is-hidden', state.soundEnabled);
    }
    if (feedbackEl) {
      feedbackEl.textContent = state.lang === 'en' ? 'Tap the letter that starts the word!' : g('المس الحرف الأول من الكلمة!', 'المسي الحرف الأول من الكلمة!');
    }

    // Build 3 options (1 correct, 2 random)
    const options = [matchTarget];
    while (options.length < 3) {
      const r = list[Math.floor(Math.random() * list.length)];
      if (!options.some(o => o.char === r.char)) {
        options.push(r);
      }
    }
    // Shuffle options
    shuffleInPlace(options);

    renderMatchOptions(options);
    speakMatchPrompt();
  }

  // After two misses: show the written hint, take away one wrong choice and ask again.
  function revealMatchHelp(grid) {
    const hintEl = document.getElementById('match-quest-hint');
    if (hintEl) hintEl.classList.remove('is-hidden');
    const wrongChoices = [...grid.querySelectorAll('.match-choice-btn:not(.eliminated)')]
      .filter(b => b.textContent !== matchTarget.char);
    if (wrongChoices.length > 1) randomItem(wrongChoices).classList.add('eliminated');
    laterInView(speakMatchPrompt, 1800);
  }

  function speakMatchPrompt() {
    if (!matchTarget) return;
    if (state.lang === 'en') {
      speakText(`Which letter starts... ${matchTarget.word}?`);
    } else {
      speakText(`ما هو الحرف الذي تبدأ به كلمة... ${matchTarget.word}؟`);
    }
  }

  function renderMatchOptions(options) {
    const grid = document.getElementById('match-options-grid');
    if (!grid) return;
    grid.innerHTML = '';

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'match-choice-btn';
      btn.textContent = opt.char;

      btn.addEventListener('click', () => {
        if (matchSolved) return;
        if (opt.char === matchTarget.char) {
          matchSolved = true;
          // Success!
          btn.classList.add('correct');
          playFanfareSound();
          addStars(2);
          triggerConfetti();

          const feedbackEl = document.getElementById('match-feedback-text');
          if (feedbackEl) {
            feedbackEl.textContent = state.lang === 'en' ? '🌟 Super Job! That is right!' : '🌟 ممتاز! إجابة صحيحة!';
          }

          if (state.lang === 'en') {
            speakText(`Yes! ${matchTarget.char} is for ${matchTarget.word}!`);
          } else {
            speakText(`نعم! ${matchTarget.char} مثل ${matchTarget.word}! ${g('أحسنت', 'أحسنتِ')}!`);
          }

          laterInView(pickNewMatchQuest, 1800);
        } else {
          // Wrong
          btn.classList.add('wrong');
          playPopSound();
          if (state.lang === 'en') {
            speakText(`That is ${opt.name}! Try again!`);
          } else {
            speakText(`هذا حرف ${opt.name}! ${g('حاول', 'حاولي')} مرة أخرى!`);
          }
          setTimeout(() => btn.classList.remove('wrong'), 800);
          matchMisses++;
          if (matchMisses === 2) revealMatchHelp(grid);
        }
      });

      grid.appendChild(btn);
    });
  }

  // ==========================================================================
  // MODE 5: MEMORY CARDS
  // ==========================================================================

  let memoryCards = [];
  let flippedCards = [];
  let matchedPairsCount = 0;
  let memoryPairsCount = 3; // 6 cards easy mode for toddlers
  let memoryRound = 0; // timers from an abandoned round must not touch the new one

  function initMemoryGame() {
    memoryRound++;
    flippedCards = [];
    matchedPairsCount = 0;
    const list = getActiveAlphabet();

    // Pick random items
    const shuffled = shuffleInPlace(list.filter(startsItsKeyword)).slice(0, memoryPairsCount);
    const deck = [];

    shuffled.forEach((item, id) => {
      deck.push({ id: `letter-${id}`, pairId: id, type: 'letter', val: item.char, item });
      deck.push({ id: `pic-${id}`, pairId: id, type: 'pic', val: item.emoji, item });
    });

    shuffleInPlace(deck);
    memoryCards = deck;

    renderMemoryGrid();
  }

  function renderMemoryGrid() {
    const grid = document.getElementById('memory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    memoryCards.forEach((card, idx) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'memory-card';
      cardEl.dataset.idx = idx;

      cardEl.innerHTML = `
        <div class="memory-card-inner">
          <div class="memory-back">❓</div>
          <div class="memory-front">
            ${card.type === 'letter'
              ? `<span class="memory-val-letter">${card.val}</span>`
              : `<span class="memory-val-pic">${card.val}</span>`
            }
          </div>
        </div>
      `;

      cardEl.addEventListener('click', () => handleMemoryCardClick(card, cardEl));
      grid.appendChild(cardEl);
    });
  }

  function handleMemoryCardClick(card, cardEl) {
    if (flippedCards.length >= 2 || cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) {
      return;
    }

    cardEl.classList.add('flipped');
    playMarimbaTone(card.pairId + 2);
    flippedCards.push({ card, cardEl });

    if (card.type === 'letter') {
      speakText(card.item.name);
    } else {
      speakText(card.item.word);
    }

    if (flippedCards.length === 2) {
      const [c1, c2] = flippedCards;
      const round = memoryRound;
      if (c1.card.pairId === c2.card.pairId) {
        // MATCH!
        setTimeout(() => {
          if (round !== memoryRound) return;
          c1.cardEl.classList.add('matched');
          c2.cardEl.classList.add('matched');
          playSparkleSound();
          addStars(2);
          matchedPairsCount++;

          if (matchedPairsCount === memoryPairsCount) {
            setTimeout(() => {
              if (round !== memoryRound) return;
              showCelebrateModal(tr('You found all the matching cards!', g('وَجَدْتَ كُلَّ البِطَاقَاتِ المُتَشَابِهَة!', 'وَجَدْتِ كُلَّ البِطَاقَاتِ المُتَشَابِهَة!')));
            }, 600);
          }
          flippedCards = [];
        }, 500);
      } else {
        // NO MATCH
        setTimeout(() => {
          if (round !== memoryRound) return;
          c1.cardEl.classList.remove('flipped');
          c2.cardEl.classList.remove('flipped');
          flippedCards = [];
        }, 1200);
      }
    }
  }

  // ==========================================================================
  // MODE 6: STICKER PARK
  // ==========================================================================

  function renderStickerTray() {
    const tray = document.getElementById('sticker-tray');
    if (!tray) return;
    tray.innerHTML = '';

    STICKERS_LIST.forEach(stk => {
      const isUnlocked = state.unlockedStickers.includes(stk.id);
      const item = document.createElement('div');
      item.className = `sticker-item ${isUnlocked ? '' : 'locked'}`;
      item.textContent = stk.emoji;
      item.title = isUnlocked ? stk.title : tr(`Needs ${stk.cost} stars to unlock`, `يحتاج ${stk.cost} نجوم`);

      if (isUnlocked) {
        item.addEventListener('click', () => {
          placeStickerOnPlayground(stk.emoji);
        });
      }

      tray.appendChild(item);
    });
  }

  function placeStickerOnPlayground(emoji) {
    const layer = document.getElementById('placed-stickers-layer');
    if (!layer) return;

    const playground = document.getElementById('sticker-playground');
    const pw = playground.clientWidth - 80;
    const ph = playground.clientHeight - 80;

    const sticker = document.createElement('div');
    sticker.className = 'placed-sticker';
    sticker.textContent = emoji;

    const x = Math.max(20, Math.floor(Math.random() * pw));
    const y = Math.max(40, Math.floor(Math.random() * ph));
    sticker.style.left = `${x}px`;
    sticker.style.top = `${y}px`;

    // Make placed sticker draggable with finger/mouse
    makeDraggable(sticker);

    layer.appendChild(sticker);
    playPopSound();
  }

  // Pointer capture keeps the drag on this sticker without global listeners,
  // so placing many stickers does not pile up window handlers.
  function makeDraggable(el) {
    let startX = 0, startY = 0, origX = 0, origY = 0;
    let dragging = false;

    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = el.offsetLeft;
      origY = el.offsetTop;
      el.style.zIndex = '99';
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {}
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      el.style.left = `${origX + e.clientX - startX}px`;
      el.style.top = `${origY + e.clientY - startY}px`;
    });

    const endDrag = () => {
      dragging = false;
      el.style.zIndex = '1';
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  // ==========================================================================
  // JUKEBOX AUTO-PLAY SLIDESHOW
  // ==========================================================================

  function toggleJukebox() {
    state.jukeboxPlaying = !state.jukeboxPlaying;
    const icon = document.getElementById('jukebox-icon');
    const textEn = document.getElementById('jukebox-text');
    const textAr = document.getElementById('jukebox-text-ar');

    if (state.jukeboxPlaying) {
      if (icon) icon.textContent = '⏸️';
      if (textEn) textEn.textContent = 'Pause';
      if (textAr) textAr.textContent = 'إيقاف';
      playJukeboxStep();
    } else {
      if (icon) icon.textContent = '▶️';
      if (textEn) textEn.textContent = 'Auto Play';
      if (textAr) textAr.textContent = 'تشغيل تلقائي';
      clearTimeout(state.jukeboxTimer);
      jukeboxStep++;
    }
  }

  const JUKEBOX_MIN_DWELL_MS = 2500; // keeps each letter on screen even when muted
  const JUKEBOX_MAX_WAIT_MS = 15000; // safety net if a speech engine never reports "ended"
  const JUKEBOX_GAP_MS = 1200;
  let jukeboxStep = 0;

  // Advance only after the clip finishes, so long phrases are never cut off mid-sentence.
  function playJukeboxStep() {
    if (!state.jukeboxPlaying) return;
    const step = ++jukeboxStep;
    renderExploreView();

    const startedAt = Date.now();
    const timeout = new Promise(resolve => setTimeout(resolve, JUKEBOX_MAX_WAIT_MS));
    Promise.race([speakCurrentLetter(), timeout]).then((result) => {
      if (!state.jukeboxPlaying || step !== jukeboxStep) return;
      // 'stopped' means the child tapped something else: let them explore, pause Auto Play.
      if (result === 'stopped') {
        toggleJukebox();
        return;
      }
      const wait = Math.max(JUKEBOX_GAP_MS, JUKEBOX_MIN_DWELL_MS - (Date.now() - startedAt));
      state.jukeboxTimer = setTimeout(() => {
        if (!state.jukeboxPlaying || step !== jukeboxStep) return;
        state.currentIndex = (state.currentIndex + 1) % getActiveAlphabet().length;
        playJukeboxStep();
      }, wait);
    });
  }

  // ==========================================================================
  // PARENT GATE & SETTINGS
  // ==========================================================================

  let gateTarget = 3;

  // An addition question (sums 11-18) that pre-readers can't answer by matching digits.
  function initParentGate() {
    const a = Math.floor(Math.random() * 5) + 5;
    const b = Math.floor(Math.random() * 5) + 5;
    gateTarget = a + b;
    const targetEl = document.getElementById('gate-target-num');
    if (targetEl) targetEl.textContent = `${a} + ${b}`;

    const optWrap = document.getElementById('gate-options');
    if (!optWrap) return;
    optWrap.innerHTML = '';

    const nums = [gateTarget];
    while (nums.length < 4) {
      const r = gateTarget + Math.floor(Math.random() * 7) - 3;
      if (r > 0 && !nums.includes(r)) nums.push(r);
    }
    shuffleInPlace(nums);

    nums.forEach(n => {
      const btn = document.createElement('button');
      btn.className = 'gate-btn';
      btn.textContent = n;
      btn.addEventListener('click', () => {
        if (n === gateTarget) {
          // Gate passed! Show settings
          document.getElementById('parents-gate-view').style.display = 'none';
          document.getElementById('parents-settings-view').style.display = 'block';
        } else {
          // Failed gate: a short pause stops random tapping from cycling through questions.
          playPopSound();
          optWrap.querySelectorAll('.gate-btn').forEach(b => { b.disabled = true; });
          setTimeout(initParentGate, 1500);
        }
      });
      optWrap.appendChild(btn);
    });
  }

  // ==========================================================================
  // PWA & ANDROID INSTALL HANDLING
  // ==========================================================================

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // Keep the prompt for the parent's install button, but don't pulse it at the child.
    state.deferredPrompt = e;
  });

  function triggerPWAInstall() {
    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      state.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the Android PWA installation');
        }
        state.deferredPrompt = null;
      });
    } else {
      alert('To install on Android: Tap Chrome menu (three dots ⋮) and tap "Install app" or "Add to Home Screen".');
    }
  }

  // ==========================================================================
  // EVENT LISTENERS & SETUP
  // ==========================================================================

  function bindEvents() {
    // Gender Profile Button
    const btnGender = document.getElementById('btn-gender');
    if (btnGender) {
      btnGender.addEventListener('click', () => {
        openGenderModal();
      });
    }

    // Interactive Mascot Tap to Speak
    const interactiveMascotBtn = document.getElementById('interactive-mascot');
    if (interactiveMascotBtn) {
      interactiveMascotBtn.addEventListener('click', speakCompanionGreeting);
    }

    // Gender Modal Card Selections
    document.querySelectorAll('.gender-card-option').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-voice-preview')) return;
        const chosen = card.dataset.gender;
        document.querySelectorAll('.gender-card-option').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        // Suggest the matching default avatar; nothing is applied until Save.
        const defaultAv = chosen === 'boy' ? '👦' : '👧';
        document.querySelectorAll('.avatar-choice-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.avatar === defaultAv);
        });
        playChimeSound();
      });
    });

    // Voice preview buttons inside gender modal
    document.querySelectorAll('.btn-voice-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const previewGender = btn.dataset.preview;
        if (state.lang === 'en') {
          const sample = (previewGender === 'boy')
            ? "Hello little explorer! Let's learn the alphabet together!"
            : "Hello sweet star! Let's discover magical letters together!";
          speakText(sample, null, previewGender);
        } else {
          const sampleAr = (previewGender === 'boy')
            ? "مَرْحَبًا يَا بَطَل! هَيَّا بِنَا نَتَعَلَّمُ الحُرُوفَ العَرَبِيَّةَ مَعًا!"
            : "مَرْحَبًا يَا أَمِيرَة! هَيَّا بِنَا نَكْتَشِفُ الحُرُوفَ العَرَبِيَّةَ الجَمِيلَة!";
          speakText(sampleAr, null, previewGender);
        }
      });
    });

    // Avatar pickers inside modal
    document.querySelectorAll('.avatar-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-choice-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playChimeSound();
      });
    });

    // Save Gender Button
    const btnSaveGender = document.getElementById('btn-save-gender');
    if (btnSaveGender) {
      btnSaveGender.addEventListener('click', () => {
        const selectedOption = document.querySelector('.gender-card-option.selected');
        const chosen = selectedOption ? selectedOption.dataset.gender : state.gender;
        const nameInput = document.getElementById('input-child-name');
        const name = nameInput ? nameInput.value : '';
        const activeAvBtn = document.querySelector('.avatar-choice-btn.active');
        const av = activeAvBtn ? activeAvBtn.dataset.avatar : state.avatar;

        closeModal('modal-gender');
        setGender(chosen, av, name);
      });
    }

    // Language Toggle
    const btnEn = document.getElementById('btn-lang-en');
    const btnAr = document.getElementById('btn-lang-ar');

    if (btnEn) btnEn.addEventListener('click', () => setLanguage('en', true));
    if (btnAr) btnAr.addEventListener('click', () => setLanguage('ar', true));

    // Mode Tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        switchMode(mode);
      });
    });

    // Explore Spotlight Nav
    const prevBtn = document.getElementById('btn-prev-letter');
    const nextBtn = document.getElementById('btn-next-letter');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const list = getActiveAlphabet();
        state.currentIndex = (state.currentIndex - 1 + list.length) % list.length;
        renderExploreView();
        speakCurrentLetter();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const list = getActiveAlphabet();
        state.currentIndex = (state.currentIndex + 1) % list.length;
        renderExploreView();
        speakCurrentLetter();
      });
    }

    // Letter Box and Object Box click
    const letterBox = document.getElementById('spotlight-letter-box');
    if (letterBox) {
      letterBox.addEventListener('click', () => {
        speakCurrentLetter();
      });
    }

    const objBox = document.getElementById('spotlight-object-box');
    if (objBox) {
      objBox.addEventListener('click', () => {
        const item = getCurrentItem();
        speakText(item.word);
        playSparkleSound();
      });
    }

    // Play All Sound action
    const playAllBtn = document.getElementById('btn-play-all-sound');
    if (playAllBtn) {
      playAllBtn.addEventListener('click', () => {
        speakCurrentLetter();
      });
    }

    // Trace Jump button
    const jumpTraceBtn = document.getElementById('btn-jump-trace');
    if (jumpTraceBtn) {
      jumpTraceBtn.addEventListener('click', () => {
        switchMode('trace');
      });
    }

    // Jukebox
    const jukeboxBtn = document.getElementById('btn-jukebox');
    if (jukeboxBtn) {
      jukeboxBtn.addEventListener('click', toggleJukebox);
    }

    // Case Toggle
    const caseBtn = document.getElementById('btn-case-toggle');
    if (caseBtn) {
      caseBtn.addEventListener('click', () => {
        state.caseMode = state.caseMode === 'both' ? 'upper' : 'both';
        renderExploreView();
      });
    }

    // Arabic Vowel Buttons
    document.querySelectorAll('.vowel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        speakArabicVowel(btn.dataset.vowel);
      });
    });

    // Tracing Actions
    const traceSoundBtn = document.getElementById('btn-trace-sound');
    if (traceSoundBtn) {
      traceSoundBtn.addEventListener('click', speakCurrentLetter);
    }

    const traceClearBtn = document.getElementById('btn-trace-clear');
    if (traceClearBtn) {
      traceClearBtn.addEventListener('click', clearUserDrawing);
    }

    const traceCheckBtn = document.getElementById('btn-trace-check');
    if (traceCheckBtn) {
      traceCheckBtn.addEventListener('click', checkTracing);
    }

    const traceNextBtn = document.getElementById('btn-trace-next');
    if (traceNextBtn) {
      traceNextBtn.addEventListener('click', () => {
        const list = getActiveAlphabet();
        state.currentIndex = (state.currentIndex + 1) % list.length;
        renderTraceLetterRibbon();
        drawGuideLetter();
        clearUserDrawing();
        speakCurrentLetter();
      });
    }

    // Brush Colors
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        traceBrushColor = dot.dataset.color;
      });
    });

    // Balloon Restart & Target Click
    const balloonRestart = document.getElementById('btn-balloon-restart');
    if (balloonRestart) {
      balloonRestart.addEventListener('click', initBalloonGame);
    }

    const balloonTargetBadge = document.getElementById('balloon-target-badge');
    if (balloonTargetBadge) {
      balloonTargetBadge.addEventListener('click', speakBalloonPrompt);
    }

    // Match Quest Sound
    const matchSound = document.getElementById('btn-match-quest-sound');
    if (matchSound) {
      matchSound.addEventListener('click', speakMatchPrompt);
    }

    // Memory Reset & Difficulty
    const memReset = document.getElementById('btn-memory-reset');
    if (memReset) {
      memReset.addEventListener('click', initMemoryGame);
    }

    const memDiff = document.getElementById('btn-memory-difficulty');
    if (memDiff) {
      memDiff.addEventListener('click', () => {
        memoryPairsCount = memoryPairsCount === 3 ? 4 : 3;
        const lbl = document.getElementById('memory-diff-label');
        if (lbl) lbl.textContent = memoryPairsCount === 3 ? '6 Cards (Easy)' : '8 Cards (Fun)';
        initMemoryGame();
      });
    }

    // Clear Stickers Board
    const clearStk = document.getElementById('btn-clear-stickers-board');
    if (clearStk) {
      clearStk.addEventListener('click', () => {
        const layer = document.getElementById('placed-stickers-layer');
        if (layer) layer.innerHTML = '';
        playPopSound();
      });
    }

    const speakBubbleBtn = document.getElementById('btn-speak-bubble');
    if (speakBubbleBtn) {
      speakBubbleBtn.addEventListener('click', () => {
        const txt = document.getElementById('mascot-bubble-text');
        if (txt) speakText(txt.textContent);
      });
    }

    // Header Tools: Sound Toggle
    const soundToggle = document.getElementById('btn-sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => setSoundEnabled(!state.soundEnabled));
    }

    // Voice Speed Toggle
    const speedBtn = document.getElementById('btn-voice-speed');
    if (speedBtn) {
      speedBtn.addEventListener('click', () => {
        const idx = VOICE_SPEEDS.findIndex(sp => sp.rate === state.voiceSpeed);
        setVoiceSpeed(VOICE_SPEEDS[(idx + 1) % VOICE_SPEEDS.length].rate);
        playMarimbaTone(4);
      });
    }

    // Android App Info Modal
    const androidBtn = document.getElementById('btn-android-app');
    if (androidBtn) {
      androidBtn.addEventListener('click', () => openModal('modal-android'));
    }

    // Parents Modal
    const parentsBtn = document.getElementById('btn-parents');
    if (parentsBtn) {
      parentsBtn.addEventListener('click', () => {
        document.getElementById('parents-gate-view').style.display = 'flex';
        document.getElementById('parents-settings-view').style.display = 'none';
        initParentGate();
        openModal('modal-parents');
      });
    }

    // Rewards Button
    const rewardsBtn = document.getElementById('btn-rewards');
    if (rewardsBtn) {
      rewardsBtn.addEventListener('click', () => {
        switchMode('stickers');
      });
    }

    // Trigger PWA Install Button
    const triggerInstallBtn = document.getElementById('btn-trigger-pwa-install');
    if (triggerInstallBtn) {
      triggerInstallBtn.addEventListener('click', triggerPWAInstall);
    }

    // Tapping the dimmed backdrop closes a dialog too.
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal.id);
      });
    });

    // <div role="button"> controls need Enter/Space like real buttons.
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"]:not(button)')) {
        e.preventDefault();
        e.target.click();
      }
    });

    const btnForget = document.getElementById('btn-forget-child');
    if (btnForget) {
      btnForget.addEventListener('click', () => {
        if (!confirm("Erase the child's name, profile, settings and progress from this device?")) return;
        store.clearAll();
        window.location.reload();
      });
    }

    // Close Modals
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    // Parent Settings inputs
    const speedSelect = document.getElementById('setting-voice-speed');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => setVoiceSpeed(parseFloat(e.target.value)));
    }

    const setArabicVowels = document.getElementById('setting-arabic-vowels');
    if (setArabicVowels) {
      setArabicVowels.addEventListener('change', (e) => {
        state.showHarakat = e.target.checked;
        saveSettings();
        renderExploreView();
      });
    }

    const setTranslit = document.getElementById('setting-translit');
    if (setTranslit) {
      setTranslit.addEventListener('change', (e) => {
        state.showTranslit = e.target.checked;
        saveSettings();
        renderExploreView();
      });
    }

    const setSound = document.getElementById('setting-sound-effects');
    if (setSound) {
      setSound.addEventListener('change', (e) => setSoundEnabled(e.target.checked));
    }

    const btnReset = document.getElementById('btn-reset-progress');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Reset stars and stickers progress?')) {
          state.stars = 0;
          state.unlockedStickers = ['s1'];
          store.set('alpha_stars', '0');
          store.set('alpha_stickers', state.unlockedStickers);
          updateStarUI();
        }
      });
    }
  }

  const VOICE_SPEEDS = [
    { rate: 0.75, icon: '🐢' },
    { rate: 0.95, icon: '🐶' },
    { rate: 1.15, icon: '🐆' }
  ];

  function setVoiceSpeed(rate) {
    state.voiceSpeed = VOICE_SPEEDS.some(sp => sp.rate === rate) ? rate : 0.95;
    saveSettings();
    syncSettingsControls();
  }

  function setSoundEnabled(on) {
    if (!on) stopAllSpeechAndAudio();
    state.soundEnabled = on;
    saveSettings();
    syncSettingsControls();
  }

  // Header buttons and the parents' settings panel control the same values; keep both in step.
  function syncSettingsControls() {
    const speed = VOICE_SPEEDS.find(sp => sp.rate === state.voiceSpeed) || VOICE_SPEEDS[1];
    const speedIcon = document.getElementById('speed-icon');
    if (speedIcon) speedIcon.textContent = speed.icon;
    const speedSelect = document.getElementById('setting-voice-speed');
    if (speedSelect) speedSelect.value = String(speed.rate);

    const soundIcon = document.getElementById('sound-icon');
    if (soundIcon) soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
    const soundBox = document.getElementById('setting-sound-effects');
    if (soundBox) soundBox.checked = state.soundEnabled;

    const vowelsBox = document.getElementById('setting-arabic-vowels');
    if (vowelsBox) vowelsBox.checked = state.showHarakat;
    const translitBox = document.getElementById('setting-translit');
    if (translitBox) translitBox.checked = state.showTranslit;
  }

  function applyLanguageChrome() {
    const isEn = state.lang === 'en';
    document.documentElement.setAttribute('dir', isEn ? 'ltr' : 'rtl');
    document.documentElement.setAttribute('lang', state.lang);
    const btnEn = document.getElementById('btn-lang-en');
    const btnAr = document.getElementById('btn-lang-ar');
    if (btnEn) btnEn.classList.toggle('active', isEn);
    if (btnAr) btnAr.classList.toggle('active', !isEn);
  }

  function setLanguage(lang, announce) {
    if (state.lang === lang) return;
    state.lang = lang;
    store.set('alpha_lang', lang);
    applyLanguageChrome();
    state.currentIndex = 0;
    switchMode(state.mode);
    if (announce) {
      speakText(lang === 'en' ? 'English Alphabet Safari!' : 'مرحباً بك في سفاري الحروف العربية!');
    }
  }

  function switchMode(newMode) {
    viewEpoch++;
    if (state.jukeboxPlaying && newMode !== 'explore') {
      toggleJukebox();
    }
    state.mode = newMode;

    // Update Tab UI
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === newMode);
    });

    // Update Views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    const activeView = document.getElementById(`view-${newMode}`);
    if (activeView) activeView.classList.add('active');

    // Init specific mode logic
    if (newMode === 'explore') {
      renderExploreView();
    } else if (newMode === 'trace') {
      initTracingMode();
    } else if (newMode === 'balloon') {
      initBalloonGame();
    } else if (newMode === 'match') {
      initMatchGame();
    } else if (newMode === 'memory') {
      initMemoryGame();
    } else if (newMode === 'stickers') {
      renderStickerTray();
    }

    playSparkleSound();
  }

  // ==========================================================================
  // UNIFIED PLATFORM BRIDGE (Android, Windows Desktop & Web/PWA)
  // ==========================================================================
  const PlatformBridge = {
    isAndroid: !!(window.AndroidBridge || /Android/i.test(navigator.userAgent) || navigator.userAgent.includes('wv')),
    // pywebview injects window.pywebview after this script runs, so check at use time.
    get isWindowsDesktop() {
      return !!(window.pywebview || /AlphabetSafariWin/i.test(navigator.userAgent));
    },
    isPWA: window.matchMedia && window.matchMedia('(display-mode: standalone)').matches,

    init() {
      if (this.isAndroid) document.documentElement.classList.add('platform-android');
      if (this.isWindowsDesktop) document.documentElement.classList.add('platform-windows');
      if (window.AndroidBridge || this.isWindowsDesktop) document.documentElement.classList.add('native-app');
      window.addEventListener('pywebviewready', () => {
        document.documentElement.classList.add('platform-windows', 'native-app');
      });
      if (this.isPWA) document.documentElement.classList.add('platform-pwa');

      this.setupHaptics();
      this.setupDesktopShortcuts();
      console.log(`[PlatformBridge] Initialized on: ${this.getPlatformName()}`);
    },

    getPlatformName() {
      if (this.isWindowsDesktop) return 'Windows Desktop (WebView2)';
      if (this.isAndroid) return 'Android Native (WebView)';
      if (this.isPWA) return 'PWA Standalone';
      return 'Web Browser';
    },

    vibrate(pattern = [25]) {
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
          window.AndroidBridge.vibrate(pattern[0] || 25);
        } else if (navigator.vibrate) {
          navigator.vibrate(pattern);
        }
      } catch (e) {
        // Haptics optional
      }
    },

    setupHaptics() {
      document.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.grid-letter-card, .flying-balloon, .action-btn, .match-choice-btn, .memory-card, .trace-chip, #companion-avatar')) {
          this.vibrate([20]);
        }
      }, { passive: true });
    },

    setupDesktopShortcuts() {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'F11' && this.isWindowsDesktop) {
          e.preventDefault();
          if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
            window.pywebview.api.toggle_fullscreen();
          }
        }
        if (e.code === 'Space' && e.target === document.body) {
          e.preventDefault();
          if (state.mode === 'explore') speakCurrentLetter();
          else speakCompanionGreeting();
        }
        // Arrow keys browse letters in Explore (direction follows the reading direction).
        if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && state.mode === 'explore' && e.target === document.body) {
          const forward = (e.key === 'ArrowRight') === (state.lang === 'en');
          const list = getActiveAlphabet();
          state.currentIndex = (state.currentIndex + (forward ? 1 : -1) + list.length) % list.length;
          renderExploreView();
          speakCurrentLetter();
        }
        if (e.key === 'Escape') {
          closeAllModals();
        }
      });
    }
  };

  window.PlatformBridge = PlatformBridge;

  // Native hooks. Android's Back button asks whether the page handled it (closing a dialog);
  // the app is paused when it goes to the background.
  window.AlphabetSafariBack = function () {
    if (document.querySelector('.modal-overlay.open')) {
      closeAllModals();
      return true;
    }
    return false;
  };
  window.AlphabetSafariPause = function () {
    stopAllSpeechAndAudio();
    if (state.jukeboxPlaying) toggleJukebox();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.AlphabetSafariPause();
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  function init() {
    if (!VOICE_SPEEDS.some(sp => sp.rate === state.voiceSpeed)) state.voiceSpeed = 0.95;
    document.querySelectorAll('.modal-overlay:not(.open)').forEach(modal => { modal.inert = true; });
    PlatformBridge.init();
    applyLanguageChrome();
    applyGenderUI();
    syncSettingsControls();
    updateStarUI();
    bindEvents();
    renderExploreView();
    hasTtsServer(); // start the probe early so the first phrase isn't delayed

    // Service workers only run over http(s); the Android app loads from file://.
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
          console.log('SW registration note:', err);
        });
      });
    }
  }

  // Start on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
