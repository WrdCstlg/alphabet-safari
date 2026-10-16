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

  const ENGLISH_ALPHABET = [
    { char: 'A', lower: 'a', name: 'A', phonics: '/æ/', word: 'Apple', emoji: '🍎', meaning: 'Sweet red fruit', speechHint: 'A is for Apple. Ah, ah, apple!' },
    { char: 'B', lower: 'b', name: 'B', phonics: '/b/', word: 'Bear', emoji: '🐻', meaning: 'Fluffy friendly bear', speechHint: 'B is for Bear. Buh, buh, bear!' },
    { char: 'C', lower: 'c', name: 'C', phonics: '/k/', word: 'Cat', emoji: '🐱', meaning: 'Playful cute kitten', speechHint: 'C is for Cat. Cuh, cuh, cat! Meow!' },
    { char: 'D', lower: 'd', name: 'D', phonics: '/d/', word: 'Duck', emoji: '🦆', meaning: 'Swimming yellow duck', speechHint: 'D is for Duck. Duh, duh, duck! Quack!' },
    { char: 'E', lower: 'e', name: 'E', phonics: '/e/', word: 'Elephant', emoji: '🐘', meaning: 'Big gentle elephant', speechHint: 'E is for Elephant. Eh, eh, elephant!' },
    { char: 'F', lower: 'f', name: 'F', phonics: '/f/', word: 'Frog', emoji: '🐸', meaning: 'Hopping green frog', speechHint: 'F is for Frog. Fuh, fuh, frog! Ribbit!' },
    { char: 'G', lower: 'g', name: 'G', phonics: '/ɡ/', word: 'Giraffe', emoji: '🦒', meaning: 'Tall yellow giraffe', speechHint: 'G is for Giraffe. Juh, juh, giraffe!' },
    { char: 'H', lower: 'h', name: 'H', phonics: '/h/', word: 'Horse', emoji: '🐴', meaning: 'Galloping brown horse', speechHint: 'H is for Horse. Huh, huh, horse!' },
    { char: 'I', lower: 'i', name: 'I', phonics: '/aɪ/', word: 'Ice Cream', emoji: '🍦', meaning: 'Yummy cold ice cream', speechHint: 'I is for Ice Cream. Yummy!' },
    { char: 'J', lower: 'j', name: 'J', phonics: '/dʒ/', word: 'Jellyfish', emoji: '🪼', meaning: 'Floating sea creature', speechHint: 'J is for Jellyfish. Juh, juh, jellyfish!' },
    { char: 'K', lower: 'k', name: 'K', phonics: '/k/', word: 'Kangaroo', emoji: '🦘', meaning: 'Bouncing mother kangaroo', speechHint: 'K is for Kangaroo. Kuh, kuh, kangaroo!' },
    { char: 'L', lower: 'l', name: 'L', phonics: '/l/', word: 'Lion', emoji: '🦁', meaning: 'Brave king lion', speechHint: 'L is for Lion. Luh, luh, lion! Roar!' },
    { char: 'M', lower: 'm', name: 'M', phonics: '/m/', word: 'Monkey', emoji: '🐵', meaning: 'Cheeky banana monkey', speechHint: 'M is for Monkey. Muh, muh, monkey!' },
    { char: 'N', lower: 'n', name: 'N', phonics: '/n/', word: 'Nest', emoji: '🪺', meaning: 'Cozy bird eggs nest', speechHint: 'N is for Nest. Nuh, nuh, nest!' },
    { char: 'O', lower: 'o', name: 'O', phonics: '/ɒ/', word: 'Owl', emoji: '🦉', meaning: 'Wise night owl', speechHint: 'O is for Owl. Ah, ah, owl! Hoot!' },
    { char: 'P', lower: 'p', name: 'P', phonics: '/p/', word: 'Penguin', emoji: '🐧', meaning: 'Cute waddling penguin', speechHint: 'P is for Penguin. Puh, puh, penguin!' },
    { char: 'Q', lower: 'q', name: 'Q', phonics: '/kw/', word: 'Queen', emoji: '👑', meaning: 'Royal sparkling crown', speechHint: 'Q is for Queen. Kwuh, kwuh, queen!' },
    { char: 'R', lower: 'r', name: 'R', phonics: '/r/', word: 'Rainbow', emoji: '🌈', meaning: 'Magic colorful sky', speechHint: 'R is for Rainbow. Ruh, ruh, rainbow!' },
    { char: 'S', lower: 's', name: 'S', phonics: '/s/', word: 'Sun', emoji: '☀️', meaning: 'Warm shining sun', speechHint: 'S is for Sun. Suh, suh, sun!' },
    { char: 'T', lower: 't', name: 'T', phonics: '/t/', word: 'Tiger', emoji: '🐯', meaning: 'Striped jungle tiger', speechHint: 'T is for Tiger. Tuh, tuh, tiger!' },
    { char: 'U', lower: 'u', name: 'U', phonics: '/ʌ/', word: 'Umbrella', emoji: '☂️', meaning: 'Rainy day umbrella', speechHint: 'U is for Umbrella. Uh, uh, umbrella!' },
    { char: 'V', lower: 'v', name: 'V', phonics: '/v/', word: 'Violin', emoji: '🎻', meaning: 'Sweet musical violin', speechHint: 'V is for Violin. Vuh, vuh, violin!' },
    { char: 'W', lower: 'w', name: 'W', phonics: '/w/', word: 'Whale', emoji: '🐳', meaning: 'Giant ocean blue whale', speechHint: 'W is for Whale. Wuh, wuh, whale!' },
    { char: 'X', lower: 'x', name: 'X', phonics: '/ks/', word: 'Xylophone', emoji: '🎼', meaning: 'Rainbow chime instrument', speechHint: 'X is for Xylophone. Ding ding ding!' },
    { char: 'Y', lower: 'y', name: 'Y', phonics: '/j/', word: 'Yo-yo', emoji: '🪀', meaning: 'Spinning toy yo-yo', speechHint: 'Y is for Yo-yo. Yuh, yuh, yo-yo!' },
    { char: 'Z', lower: 'z', name: 'Z', phonics: '/z/', word: 'Zebra', emoji: '🦓', meaning: 'Black and white zebra', speechHint: 'Z is for Zebra. Zzz, zzz, zebra!' }
  ];

  const ARABIC_ALPHABET = [
    { char: 'أ', name: 'أَلِف', translit: 'Alif', phonics: 'A / Ah', word: 'أَرْنَب', wordTranslit: 'Arnab', emoji: '🐰', meaning: 'أرنب يقفز (Rabbit)', fatha: 'أَ', damma: 'أُ', kasra: 'إِ', sukun: 'أْ', speechHint: 'حرف الألف... ألف... أرنب! أَرْنَبْ' },
    { char: 'ب', name: 'بَاء', translit: 'Baa', phonics: 'B / Ba', word: 'بَطَّة', wordTranslit: 'Batta', emoji: '🦆', meaning: 'بطة تسبح (Duck)', fatha: 'بَ', damma: 'بُ', kasra: 'بِ', sukun: 'بْ', speechHint: 'حرف الباء... باء... بطة! بَطَّة' },
    { char: 'ت', name: 'تَاء', translit: 'Taa', phonics: 'T / Ta', word: 'تُفَّاحَة', wordTranslit: 'Tuffaha', emoji: '🍎', meaning: 'تفاحة لذيذة (Apple)', fatha: 'تَ', damma: 'تُ', kasra: 'تِ', sukun: 'تْ', speechHint: 'حرف التاء... تاء... تفاحة! تُفَّاحَة' },
    { char: 'ث', name: 'ثَاء', translit: 'Thaa', phonics: 'Th / Tha', word: 'ثَعْلَب', wordTranslit: "Tha'lab", emoji: '🦊', meaning: 'ثعلب ذكي (Fox)', fatha: 'ثَ', damma: 'ثُ', kasra: 'ثِ', sukun: 'ثْ', speechHint: 'حرف الثاء... ثاء... ثعلب! ثَعْلَبْ' },
    { char: 'ج', name: 'جِيم', translit: 'Jeem', phonics: 'J / Ja', word: 'جَمَل', wordTranslit: 'Jamal', emoji: '🐪', meaning: 'سفينة الصحراء (Camel)', fatha: 'جَ', damma: 'جُ', kasra: 'جِ', sukun: 'جْ', speechHint: 'حرف الجيم... جيم... جمل! جَمَلْ' },
    { char: 'ح', name: 'حَاء', translit: 'Haa', phonics: 'H / Ha', word: 'حِصَان', wordTranslit: 'Hisaan', emoji: '🐴', meaning: 'حصان رشيق (Horse)', fatha: 'حَ', damma: 'حُ', kasra: 'حِ', sukun: 'حْ', speechHint: 'حرف الحاء... حاء... حصان! حِصَانْ' },
    { char: 'خ', name: 'خَاء', translit: 'Khaa', phonics: 'Kh / Kha', word: 'خَرُوف', wordTranslit: 'Kharoof', emoji: '🐑', meaning: 'خروف لطيف (Sheep)', fatha: 'خَ', damma: 'خُ', kasra: 'خِ', sukun: 'خْ', speechHint: 'حرف الخاء... خاء... خروف! خَرُوفْ' },
    { char: 'د', name: 'دَال', translit: 'Daal', phonics: 'D / Da', word: 'دُبّ', wordTranslit: 'Dubb', emoji: '🐻', meaning: 'دب كبير (Bear)', fatha: 'دَ', damma: 'دُ', kasra: 'دِ', sukun: 'دْ', speechHint: 'حرف الدال... دال... دب! دُبّ' },
    { char: 'ذ', name: 'ذَال', translit: 'Dhaal', phonics: 'Dh / Dha', word: 'ذُرَة', wordTranslit: 'Dhurah', emoji: '🌽', meaning: 'ذرة صفراء حلوة (Corn)', fatha: 'ذَ', damma: 'ذُ', kasra: 'ذِ', sukun: 'ذْ', speechHint: 'حرف الذال... ذال... ذرة! ذُرَة' },
    { char: 'ر', name: 'رَاء', translit: 'Raa', phonics: 'R / Ra', word: 'رُمَّان', wordTranslit: 'Rumman', emoji: '🍒', meaning: 'رمان أحمر شهي (Pomegranate)', fatha: 'رَ', damma: 'رُ', kasra: 'رِ', sukun: 'رْ', speechHint: 'حرف الراء... راء... رمان! رُمَّانْ' },
    { char: 'ز', name: 'زَاي', translit: 'Zay', phonics: 'Z / Za', word: 'زَرَافَة', wordTranslit: 'Zarafa', emoji: '🦒', meaning: 'زرافة طويلة (Giraffe)', fatha: 'زَ', damma: 'زُ', kasra: 'زِ', sukun: 'زْ', speechHint: 'حرف الزاي... زاي... زرافة! زَرَافَة' },
    { char: 'س', name: 'سِين', translit: 'Seen', phonics: 'S / Sa', word: 'سَمَكَة', wordTranslit: 'Samaka', emoji: '🐟', meaning: 'سمكة ملونة في الماء (Fish)', fatha: 'سَ', damma: 'سُ', kasra: 'سِ', sukun: 'سْ', speechHint: 'حرف السين... سين... سمكة! سَمَكَة' },
    { char: 'ش', name: 'شِين', translit: 'Sheen', phonics: 'Sh / Sha', word: 'شَمْس', wordTranslit: 'Shams', emoji: '☀️', meaning: 'شمس دافئة مشرقة (Sun)', fatha: 'شَ', damma: 'شُ', kasra: 'شِ', sukun: 'شْ', speechHint: 'حرف الشين... شين... شمس! شَمْس' },
    { char: 'ص', name: 'صَاد', translit: 'Saad', phonics: 'S / Sa', word: 'صَقْر', wordTranslit: 'Saqr', emoji: '🦅', meaning: 'صقر جارح سريع (Falcon)', fatha: 'صَ', damma: 'صُ', kasra: 'صِ', sukun: 'صْ', speechHint: 'حرف الصاد... صاد... صقر! صَقْر' },
    { char: 'ض', name: 'ضَاد', translit: 'Daad', phonics: 'D / Da', word: 'ضِفْدَع', wordTranslit: "Difda'", emoji: '🐸', meaning: 'ضفدع يقفز في البركة (Frog)', fatha: 'ضَ', damma: 'ضُ', kasra: 'ضِ', sukun: 'ضْ', speechHint: 'حرف الضاد... ضاد... ضفدع! ضِفْدَع' },
    { char: 'ط', name: 'طَاء', translit: "Taa'", phonics: 'T / Ta', word: 'طَائِرَة', wordTranslit: "Taa'ira", emoji: '✈️', meaning: 'طائرة تحلق في السماء (Airplane)', fatha: 'طَ', damma: 'طُ', kasra: 'طِ', sukun: 'طْ', speechHint: 'حرف الطاء... طاء... طائرة! طَائِرَة' },
    { char: 'ظ', name: 'ظَاء', translit: "Zhaa'", phonics: 'Zh / Zha', word: 'ظَرْف', wordTranslit: 'Zharf', emoji: '✉️', meaning: 'ظرف رسائل (Envelope)', fatha: 'ظَ', damma: 'ظُ', kasra: 'ظِ', sukun: 'ظْ', speechHint: 'حرف الظاء... ظاء... ظرف! ظَرْف' },
    { char: 'ع', name: 'عَيْن', translit: 'Ayn', phonics: 'Aa / Ayn', word: 'عُصْفُور', wordTranslit: 'Usfoor', emoji: '🐦', meaning: 'عصفور يغرد (Bird)', fatha: 'عَ', damma: 'عُ', kasra: 'عِ', sukun: 'عْ', speechHint: 'حرف العين... عين... عصفور! عُصْفُور' },
    { char: 'غ', name: 'غَيْن', translit: 'Ghayn', phonics: 'Gh / Gha', word: 'غَزَال', wordTranslit: 'Ghazaal', emoji: '🦌', meaning: 'غزال جميل (Gazelle)', fatha: 'غَ', damma: 'غُ', kasra: 'غِ', sukun: 'غْ', speechHint: 'حرف الغين... غين... غزال! غَزَال' },
    { char: 'ف', name: 'فَاء', translit: 'Faa', phonics: 'F / Fa', word: 'فَرَاشَة', wordTranslit: 'Farasha', emoji: '🦋', meaning: 'فراشة بألوان زاهية (Butterfly)', fatha: 'فَ', damma: 'فُ', kasra: 'فِ', sukun: 'فْ', speechHint: 'حرف الفاء... فاء... فراشة! فَرَاشَة' },
    { char: 'ق', name: 'قَاف', translit: 'Qaaf', phonics: 'Q / Qa', word: 'قِطَّة', wordTranslit: 'Qitta', emoji: '🐱', meaning: 'قطة مياو أليفة (Cat)', fatha: 'قَ', damma: 'قُ', kasra: 'قِ', sukun: 'قْ', speechHint: 'حرف القاف... قاف... قطة! قِطَّة' },
    { char: 'ك', name: 'كَاف', translit: 'Kaaf', phonics: 'K / Ka', word: 'كِتَاب', wordTranslit: 'Kitaab', emoji: '📖', meaning: 'كتاب القصص المصورة (Book)', fatha: 'كَ', damma: 'كُ', kasra: 'كِ', sukun: 'كْ', speechHint: 'حرف الكاف... كاف... كتاب! كِتَاب' },
    { char: 'ل', name: 'لَام', translit: 'Laam', phonics: 'L / La', word: 'لَيْمُون', wordTranslit: 'Laymoon', emoji: '🍋', meaning: 'ليمون أصفر منعش (Lemon)', fatha: 'لَ', damma: 'لُ', kasra: 'لِ', sukun: 'لْ', speechHint: 'حرف اللام... لام... ليمون! لَيْمُون' },
    { char: 'م', name: 'مِيم', translit: 'Meem', phonics: 'M / Ma', word: 'مَوْزَة', wordTranslit: 'Mawza', emoji: '🍌', meaning: 'موزة صفراء حلوة (Banana)', fatha: 'مَ', damma: 'مُ', kasra: 'مِ', sukun: 'مْ', speechHint: 'حرف الميم... ميم... موزة! مَوْزَة' },
    { char: 'ن', name: 'نُون', translit: 'Noon', phonics: 'N / Na', word: 'نَجْمَة', wordTranslit: 'Najma', emoji: '⭐', meaning: 'نجمة تلمع في السماء (Star)', fatha: 'نَ', damma: 'نُ', kasra: 'نِ', sukun: 'نْ', speechHint: 'حرف النون... نون... نجمة! نَجْمَة' },
    { char: 'هـ', name: 'هَاء', translit: 'Haa', phonics: 'H / Ha', word: 'هِلَال', wordTranslit: 'Hilaal', emoji: '🌙', meaning: 'هلال مضيء (Crescent Moon)', fatha: 'هَ', damma: 'هُ', kasra: 'هِ', sukun: 'هْ', speechHint: 'حرف الهاء... هاء... هلال! هِلَال' },
    { char: 'و', name: 'وَاو', translit: 'Waaw', phonics: 'W / Wa', word: 'وَرْدَة', wordTranslit: 'Warda', emoji: '🌸', meaning: 'وردة عطرة جميلة (Flower)', fatha: 'وَ', damma: 'وُ', kasra: 'وِ', sukun: 'وْ', speechHint: 'حرف الواو... واو... وردة! وَرْدَة' },
    { char: 'ي', name: 'يَاء', translit: 'Yaa', phonics: 'Y / Ya', word: 'يَد', wordTranslit: 'Yad', emoji: '✋', meaning: 'يد صغيرة تلوح (Hand)', fatha: 'يَ', damma: 'يُ', kasra: 'يِ', sukun: 'يْ', speechHint: 'حرف الياء... ياء... يد! يَد' }
  ];

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

  const state = {
    lang: 'en', // 'en' or 'ar'
    gender: localStorage.getItem('alpha_gender') || 'boy', // 'boy' or 'girl'
    childName: localStorage.getItem('alpha_child_name') || '',
    avatar: localStorage.getItem('alpha_avatar') || '👦',
    mode: 'explore', // 'explore', 'trace', 'balloon', 'match', 'memory', 'stickers'
    currentIndex: 0,
    caseMode: 'both', // 'both', 'upper'
    soundEnabled: true,
    voiceSpeed: 0.82, // Toddler friendly pace
    showHarakat: true,
    showTranslit: true,
    stars: parseInt(localStorage.getItem('alpha_stars') || '0', 10),
    unlockedStickers: JSON.parse(localStorage.getItem('alpha_stickers') || '["s1"]'),
    jukeboxPlaying: false,
    jukeboxTimer: null,
    deferredPrompt: null // For PWA install
  };

  // Helper getters
  function getActiveAlphabet() {
    return state.lang === 'en' ? ENGLISH_ALPHABET : ARABIC_ALPHABET;
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

  // ==========================================================================
  // SPEECH SYNTHESIS ENGINE (Natural bilingual voice)
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

  
  // ==========================================================================
  // NATURAL SPOKEN LANGUAGE & GENDER-AWARE SPEECH LIBRARY
  // ==========================================================================

  const NATURAL_PHONICS_EN = {
    'A': 'A is for Apple! Ah, ah, apple! Crunch, crunch, sweet and juicy red apple!',
    'B': 'B is for Bear! Buh, buh, bear! Big fuzzy teddy bear giving you a warm happy hug!',
    'C': 'C is for Cat! Cuh, cuh, cat! Playful little kitten playing with yarn, meow meow!',
    'D': 'D is for Duck! Duh, duh, duck! Yellow duck swimming happily in the pond, quack quack!',
    'E': 'E is for Elephant! Eh, eh, elephant! Big gentle elephant waving his long swinging trunk!',
    'F': 'F is for Frog! Fuh, fuh, frog! Little green frog hopping on a lily pad, ribbit ribbit!',
    'G': 'G is for Giraffe! Juh, juh, giraffe! Tall friendly giraffe reaching high into the trees!',
    'H': 'H is for Horse! Huh, huh, horse! Galloping horse running freely in the meadow, neigh neigh!',
    'I': 'I is for Ice Cream! I, i, ice cream! Cold, sweet, yummy rainbow ice cream!',
    'J': 'J is for Jellyfish! Juh, juh, jellyfish! Floating gently like magic in the sparkling ocean!',
    'K': 'K is for Kangaroo! Kuh, kuh, kangaroo! Bouncing high through the sunny safari, boing boing!',
    'L': 'L is for Lion! Luh, luh, lion! Brave little lion cub giving a cheerful roar, rawr!',
    'M': 'M is for Monkey! Muh, muh, monkey! Silly little monkey swinging from the trees eating a banana!',
    'N': 'N is for Nest! Nuh, nuh, nest! Cozy little bird nest with warm eggs high in the tree!',
    'O': 'O is for Owl! Ah, ah, owl! Wise night owl sitting under the stars, hoot hoot!',
    'P': 'P is for Penguin! Puh, puh, penguin! Cute little penguin waddling happily on the cold white ice!',
    'Q': 'Q is for Queen! Kwuh, kwuh, queen! Beautiful royal queen wearing a sparkling golden crown!',
    'R': 'R is for Rainbow! Ruh, ruh, rainbow! Magic colorful rainbow smiling across the blue sky!',
    'S': 'S is for Sun! Suh, suh, sun! Big warm golden sun shining down with a warm bright smile!',
    'T': 'T is for Tiger! Tuh, tuh, tiger! Friendly little tiger cub with bright orange and black stripes!',
    'U': 'U is for Umbrella! Uh, uh, umbrella! Bright colorful umbrella keeping us cozy and dry in the rain!',
    'V': 'V is for Violin! Vuh, vuh, violin! Playing sweet, gentle musical melodies!',
    'W': 'W is for Whale! Wuh, wuh, whale! Giant gentle blue whale making big water splashes in the sea!',
    'X': 'X is for Xylophone! Zz, zz, xylophone! Making joyful ding dong music notes!',
    'Y': 'Y is for Yacht! Yuh, yuh, yacht! Sailing smoothly across the calm blue waves!',
    'Z': 'Z is for Zebra! Zz, zz, zebra! Beautiful zebra running freely in the sunny safari!'
  };

  const NATURAL_PHONICS_AR = {
    'أ': { boy: 'حَرْفُ الأَلِفِ.. أَرْنَب! أ، أ، أَرْنَبٌ لَطِيفٌ يَقْفِزُ فَرَحًا يَا بَطَلِي!', girl: 'حَرْفُ الأَلِفِ.. أَرْنَب! أ، أ، أَرْنَبٌ لَطِيفٌ يَقْفِزُ فَرَحًا يَا أَمِيرَتِي!' },
    'ب': { boy: 'حَرْفُ البَاءِ.. بَطَّة! ب، ب، بَطَّةٌ جَمِيلَةٌ تَعُومُ فِي المَاءِ وَتَقُولُ وَاقْ وَاقْ!', girl: 'حَرْفُ البَاءِ.. بَطَّة! ب، ب، بَطَّةٌ جَمِيلَةٌ تَعُومُ فِي المَاءِ وَتَقُولُ وَاقْ وَاقْ!' },
    'ت': { boy: 'حَرْفُ التَّاءِ.. تُفَّاحَة! تَ، تَ، تُفَّاحَةٌ حَمْرَاءُ لَذِيذَةٌ وَمُفِيدَة!', girl: 'حَرْفُ التَّاءِ.. تُفَّاحَة! تَ، تَ، تُفَّاحَةٌ حَمْرَاءُ حُلْوَةٌ مِثْلَكِ!' },
    'ث': { boy: 'حَرْفُ الثَّاءِ.. ثَعْلَب! ثَ، ثَ، ثَعْلَبٌ ذَكِيٌّ وَسَرِيعٌ فِي الغَابَة!', girl: 'حَرْفُ الثَّاءِ.. ثَعْلَب! ثَ، ثَ، ثَعْلَبٌ ذَكِيٌّ وَسَرِيعٌ فِي الغَابَة!' },
    'ج': { boy: 'حَرْفُ الجِيمِ.. جَمَل! جَ، جَ، جَمَلٌ صَبُورٌ فِي الصَّحْرَاءِ الذَّهَبِيَّة!', girl: 'حَرْفُ الجِيمِ.. جَمَل! جَ، جَ، جَمَلٌ صَبُورٌ فِي الصَّحْرَاءِ الذَّهَبِيَّة!' },
    'ح': { boy: 'حَرْفُ الحَاءِ.. حِصَان! حَ، حَ، حِصَانٌ أَصِيلٌ يَرْكُضُ بِسُرْعَةٍ يَا بَطَل!', girl: 'حَرْفُ الحَاءِ.. حِصَان! حَ، حَ، حِصَانٌ أَصِيلٌ يَرْكُضُ بِسُرْعَةٍ يَا أَمِيرَة!' },
    'خ': { boy: 'حَرْفُ الخَاءِ.. خَرُوف! خَ، خَ، خَرُوفٌ لَطِيفٌ صُوفُهُ أَبْيَضُ نَاعِم!', girl: 'حَرْفُ الخَاءِ.. خَرُوف! خَ، خَ، خَرُوفٌ لَطِيفٌ صُوفُهُ أَبْيَضُ نَاعِم!' },
    'د': { boy: 'حَرْفُ الدَّالِ.. دَلْفِين! دَ، دَ، دَلْفِينٌ مَرِحٌ يَقْفِزُ فِي أَمْوَاجِ البَحْر!', girl: 'حَرْفُ الدَّالِ.. دَلْفِين! دَ، دَ، دَلْفِينٌ مَرِحٌ يَقْفِزُ فِي أَمْوَاجِ البَحْر!' },
    'ذ': { boy: 'حَرْفُ الذَّالِ.. ذُرَة! ذَ، ذَ، ذُرَةٌ صَفْرَاءُ حُلْوَةٌ وَشَهِيَّة!', girl: 'حَرْفُ الذَّالِ.. ذُرَة! ذَ، ذَ، ذُرَةٌ صَفْرَاءُ حُلْوَةٌ وَشَهِيَّة!' },
    'ر': { boy: 'حَرْفُ الرَّاءِ.. رُمَّان! رَ، رَ، رُمَّانٌ أَحْمَرُ طَيِّبُ المَذَاق!', girl: 'حَرْفُ الرَّاءِ.. رُمَّان! رَ، رَ، رُمَّانٌ أَحْمَرُ طَيِّبُ المَذَاق!' },
    'ز': { boy: 'حَرْفُ الزَّاي.. زَرَافَة! زَ، زَ، زَرَافَةٌ طَوِيلَةٌ لَطِيفَةٌ عُنُقُهَا جَمِيل!', girl: 'حَرْفُ الزَّاي.. زَرَافَة! زَ، زَ، زَرَافَةٌ طَوِيلَةٌ لَطِيفَةٌ عُنُقُهَا جَمِيل!' },
    'س': { boy: 'حَرْفُ السِّين.. سَمَكَة! سَ، سَ، سَمَكَةٌ مُلَوَّنَةٌ تَلْمَعُ تَحْتَ المَاء!', girl: 'حَرْفُ السِّين.. سَمَكَة! سَ، سَ، سَمَكَةٌ مُلَوَّنَةٌ تَلْمَعُ تَحْتَ المَاء!' },
    'ش': { boy: 'حَرْفُ الشِّين.. شَمْس! شَ، شَ، شَمْسٌ مُشْرِقَةٌ تَمْلأُ الدُّنْيَا دِفْئًا وَنُورًا!', girl: 'حَرْفُ الشِّين.. شَمْس! شَ، شَ، شَمْسٌ مُشْرِقَةٌ تَمْلأُ الدُّنْيَا دِفْئًا وَنُورًا!' },
    'ص': { boy: 'حَرْفُ الصَّاد.. صَقْر! صَ، صَ، صَقْرٌ قَوِيٌّ شُجَاعٌ يُحَلِّقُ عَالِيًا!', girl: 'حَرْفُ الصَّاد.. صَقْر! صَ، صَ، صَقْرٌ قَوِيٌّ جَمِيلٌ يُحَلِّقُ عَالِيًا!' },
    'ض': { boy: 'حَرْفُ الضَّاد.. ضِفْدَع! ضَ، ضَ، ضِفْدَعٌ أَخْضَرُ صَغِيرٌ يَقْفِزُ فِي البِرْكَة!', girl: 'حَرْفُ الضَّاد.. ضِفْدَع! ضَ، ضَ، ضِفْدَعٌ أَخْضَرُ صَغِيرٌ يَقْفِزُ فِي البِرْكَة!' },
    'ط': { boy: 'حَرْفُ الطَّاءِ.. طَائِرَة! طَ، طَ، طَائِرَةٌ بَيْضَاءُ تُسَافِرُ بَيْنَ الغُيُوم!', girl: 'حَرْفُ الطَّاءِ.. طَائِرَة! طَ، طَ، طَائِرَةٌ بَيْضَاءُ تُسَافِرُ بَيْنَ الغُيُوم!' },
    'ظ': { boy: 'حَرْفُ الظَّاءِ.. ظَبْي! ظَ، ظَ، ظَبْيٌ رَشِيقٌ فِي البَرَارِي!', girl: 'حَرْفُ الظَّاءِ.. ظَبْي! ظَ، ظَ، ظَبْيٌ رَشِيقٌ جَمِيلٌ فِي البَرَارِي!' },
    'ع': { boy: 'حَرْفُ العَيْن.. عُصْفُور! عَ، عَ، عُصْفُورٌ صَغِيرٌ يُغَرِّدُ بِأَجْمَلِ الأَلْحَان!', girl: 'حَرْفُ العَيْن.. عُصْفُور! عَ، عَ، عُصْفُورٌ صَغِيرٌ يُغَرِّدُ بِأَجْمَلِ الأَلْحَان!' },
    'غ': { boy: 'حَرْفُ الغَيْن.. غَزَال! غَ، غَ، غَزَالٌ رَقِيقٌ فِي المَرَاعِي الخَضْرَاء!', girl: 'حَرْفُ الغَيْن.. غَزَال! غَ، غَ، غَزَالٌ رَقِيقٌ فِي المَرَاعِي الخَضْرَاء!' },
    'ف': { boy: 'حَرْفُ الفَاءِ.. فَرَاشَة! فَ، فَ، فَرَاشَةٌ بَدِيعَةٌ تَرْقُصُ بَيْنَ الأَزْهَار!', girl: 'حَرْفُ الفَاءِ.. فَرَاشَة! فَ، فَ، فَرَاشَةٌ بَدِيعَةٌ تَرْقُصُ بَيْنَ الأَزْهَار!' },
    'ق': { boy: 'حَرْفُ القَاف.. قِطَّة! قَ، قَ، قِطَّةٌ أَلِيفَةٌ تُحِبُّ اللَّعِبَ وَتَقُولُ مِيَاو!', girl: 'حَرْفُ القَاف.. قِطَّة! قَ، قَ، قِطَّةٌ أَلِيفَةٌ تُحِبُّ اللَّعِبَ وَتَقُولُ مِيَاو!' },
    'ك': { boy: 'حَرْفُ الكَاف.. كِتَاب! كَ، كَ، كِتَابٌ مُفِيدٌ يَحْمِلُ أَحْلَى القِصَص!', girl: 'حَرْفُ الكَاف.. كِتَاب! كَ، كَ، كِتَابٌ مُفِيدٌ يَحْمِلُ أَحْلَى القِصَص!' },
    'ل': { boy: 'حَرْفُ اللَّام.. لَيْمُون! لَ، لَ، لَيْمُونٌ أَصْفَرُ مُنْعِشٌ وَلَذِيذ!', girl: 'حَرْفُ اللَّام.. لَيْمُون! لَ، لَ، لَيْمُونٌ أَصْفَرُ مُنْعِشٌ وَلَذِيذ!' },
    'م': { boy: 'حَرْفُ المِيم.. مَوْزَة! مَ، مَ، مَوْزَةٌ صَفْرَاءُ حُلْوَةٌ يُحِبُّهَا الأَطْفَال!', girl: 'حَرْفُ المِيم.. مَوْزَة! مَ، مَ، مَوْزَةٌ صَفْرَاءُ حُلْوَةٌ يُحِبُّهَا الأَطْفَال!' },
    'ن': { boy: 'حَرْفُ النُّون.. نَجْمَة! نَ، نَ، نَجْمَةٌ سَاطِعَةٌ تَلْمَعُ لَيْلًا فِي السَّمَاء!', girl: 'حَرْفُ النُّون.. نَجْمَة! نَ، نَ، نَجْمَةٌ سَاطِعَةٌ تَلْمَعُ لَيْلًا فِي السَّمَاء!' },
    'هـ': { boy: 'حَرْفُ الهَاءِ.. هِلَال! هَ، هَ، هِلَالٌ فِضِّيٌّ جَمِيلٌ يُضِيءُ لَيَالِينَا!', girl: 'حَرْفُ الهَاءِ.. هِلَال! هَ، هَ، هِلَالٌ فِضِّيٌّ جَمِيلٌ يُضِيءُ لَيَالِينَا!' },
    'و': { boy: 'حَرْفُ الوَاو.. وَرْدَة! وَ، وَ، وَرْدَةٌ حَمْرَاءُ جَمِيلَةٌ رَائِحَتُهَا عَطِرَة!', girl: 'حَرْفُ الوَاو.. وَرْدَة! وَ، وَ، وَرْدَةٌ حَمْرَاءُ جَمِيلَةٌ رَائِحَتُهَا عَطِرَة!' },
    'ي': { boy: 'حَرْفُ اليَاءِ.. يَد! يَ، يَ، يَدٌ صَغِيرَةٌ نَظِيفَةٌ تُلَوِّحُ بِمَحَبَّة!', girl: 'حَرْفُ اليَاءِ.. يَد! يَ، يَ، يَدٌ صَغِيرَةٌ نَظِيفَةٌ تُلَوِّحُ بِمَحَبَّة!' }
  };

  function getChildVocative() {
    if (state.childName) return state.childName;
    if (state.lang === 'en') {
      return state.gender === 'boy' ? 'little hero' : 'little princess';
    } else {
      return state.gender === 'boy' ? 'يا بطلي الصغير' : 'يا أميرتي الصغيرة';
    }
  }

  function getNaturalPraise() {
    const name = state.childName;
    if (state.lang === 'en') {
      const boyPraises = [
        name ? `Woohoo! You did it, ${name}! You are a superhero!` : 'Woohoo! You did it, my brave champion!',
        'Awesome job, superstar! You are so smart!',
        'High five, buddy! Look at you go!',
        'That was magnificent! You are an alphabet master!'
      ];
      const girlPraises = [
        name ? `Yay! You did it, ${name}! You shine so bright!` : 'Yay! You did it, my sweet little princess!',
        'Fantastic job, superstar! You are so talented!',
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
    if (state.lang === 'en') {
      return NATURAL_PHONICS_EN[item.char] || `${item.name} is for ${item.word}! ${item.speechHint}`;
    } else {
      const entry = NATURAL_PHONICS_AR[item.char];
      if (entry) {
        return state.gender === 'boy' ? entry.boy : entry.girl;
      }
      return `${item.name}... ${item.word}! ${item.speechHint}`;
    }
  }


  // ==========================================================================
  // GENDER CONFIGURATION & COMPANION CONTROLLER
  // ==========================================================================

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

    if (badgeTitle) {
      if (isBoy) {
        badgeTitle.innerHTML = '<span class="eng-text">' + (state.childName ? state.childName + ' • Boy' : 'Little Boy') + '</span><span class="ar-text">' + (state.childName ? state.childName + ' • بطل' : 'البطل الصغير') + '</span>';
      } else {
        badgeTitle.innerHTML = '<span class="eng-text">' + (state.childName ? state.childName + ' • Girl' : 'Little Girl') + '</span><span class="ar-text">' + (state.childName ? state.childName + ' • أميرة' : 'الأميرة الصغيرة') + '</span>';
      }
    }

    if (compAvatar) compAvatar.textContent = activeAvatar;
    if (compNameTag) {
      const defaultNameEn = isBoy ? 'Leo • Hero' : 'Noor • Star';
      const defaultNameAr = isBoy ? 'زيد • البطل' : 'نور • الأميرة';
      const displayEn = state.childName ? state.childName + ' • ' + (isBoy ? 'Hero' : 'Star') : defaultNameEn;
      const displayAr = state.childName ? state.childName + ' • ' + (isBoy ? 'البطل' : 'الأميرة') : defaultNameAr;
      compNameTag.innerHTML = '<span class="eng-text">' + displayEn + '</span><span class="ar-text">' + displayAr + '</span>';
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
    if (name !== undefined) state.childName = name.trim();

    localStorage.setItem('alpha_gender', state.gender);
    localStorage.setItem('alpha_avatar', state.avatar);
    localStorage.setItem('alpha_child_name', state.childName);

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

  function openGenderModal() {
    const modal = document.getElementById('modal-gender');
    if (modal) {
      applyGenderUI();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      playSparkleSound();
    }
  }

function speakText(text, langOverride, customPitch, customRate) {
    if (!state.soundEnabled) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop ongoing speech

    const utter = new SpeechSynthesisUtterance(text);
    const targetLang = langOverride || (state.lang === 'en' ? 'en-US' : 'ar-SA');
    utter.lang = targetLang;
    utter.rate = customRate || state.voiceSpeed;

    // Pitch tailored to gender for warm, enthusiastic preschool sound
    if (customPitch) {
      utter.pitch = customPitch;
    } else if (state.gender === 'boy') {
      utter.pitch = (targetLang.startsWith('en')) ? 1.12 : 1.05;
    } else {
      utter.pitch = (targetLang.startsWith('en')) ? 1.30 : 1.25;
    }

    // Select the most natural human voice available on the device
    if (voices.length > 0) {
      const isArabic = targetLang.startsWith('ar');
      const isEnglish = targetLang.startsWith('en');

      let candidate = null;
      if (isEnglish) {
        if (state.gender === 'boy') {
          // Look for warm natural male/boy voices
          candidate = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Guy') || v.name.includes('David') || v.name.includes('George') || v.name.includes('Male')));
          if (!candidate) candidate = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'));
        } else {
          // Look for sweet natural female/girl voices
          candidate = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Jenny') || v.name.includes('Zira') || v.name.includes('Aria') || v.name.includes('Female')));
          if (!candidate) candidate = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'));
        }
        if (!candidate) candidate = voices.find(v => v.lang.startsWith('en'));
      } else if (isArabic) {
        if (state.gender === 'boy') {
          candidate = voices.find(v => v.lang.startsWith('ar') && (v.name.includes('Naayf') || v.name.includes('Maged') || v.name.includes('Tarik') || v.name.includes('Male')));
        } else {
          candidate = voices.find(v => v.lang.startsWith('ar') && (v.name.includes('Salma') || v.name.includes('Hoda') || v.name.includes('Zeina') || v.name.includes('Laila') || v.name.includes('Female')));
        }
        if (!candidate) candidate = voices.find(v => v.lang.startsWith('ar'));
      }

      if (candidate) utter.voice = candidate;
    }

    window.speechSynthesis.speak(utter);
  }

  function speakCurrentLetter() {
    const item = getCurrentItem();
    // Warm natural child-friendly sentence
    const sentence = getNaturalLetterSentence(item);
    speakText(sentence);
    playMarimbaTone(state.currentIndex);

    // Update companion speech bubble with current sentence
    updateCompanionBubble(sentence);
    bounceCompanion();
  }

  function speakCurrentPhonicsPhrase() {
    const item = getCurrentItem();
    const sentence = getNaturalLetterSentence(item);
    speakText(sentence);
    playMarimbaTone(state.currentIndex);
    updateCompanionBubble(sentence);
    bounceCompanion();
  }

  function speakArabicVowel(vowelType) {
    const item = getCurrentItem();
    if (state.lang !== 'ar') return;

    const charWithVowel = item[vowelType] || item.char;
    let label = '';
    if (vowelType === 'fatha') label = `${charWithVowel}... فَتحَة`;
    else if (vowelType === 'damma') label = `${charWithVowel}... ضَمَّة`;
    else if (vowelType === 'kasra') label = `${charWithVowel}... كَسرَة`;
    else label = `${charWithVowel}... سُكون`;

    speakText(label, 'ar-SA');
    playMarimbaTone(state.currentIndex + 2);
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

  function addStars(num, reason) {
    state.stars += num;
    localStorage.setItem('alpha_stars', state.stars.toString());
    updateStarUI();

    // Check sticker unlock
    STICKERS_LIST.forEach(stk => {
      if (state.stars >= stk.cost && !state.unlockedStickers.includes(stk.id)) {
        state.unlockedStickers.push(stk.id);
        localStorage.setItem('alpha_stickers', JSON.stringify(state.unlockedStickers));
        showCelebrateModal(`You unlocked the ${stk.emoji} ${stk.title}!`);
      }
    });
  }

  function updateStarUI() {
    const countEl = document.getElementById('star-count');
    if (countEl) countEl.textContent = state.stars;
    renderStickerTray();
  }

  function showCelebrateModal(msg) {
    triggerConfetti();
    playFanfareSound();
    bounceCompanion();
    const modal = document.getElementById('modal-celebrate');
    const msgEl = document.getElementById('celebrate-text');
    const naturalPraise = getNaturalPraise();
    if (msgEl) msgEl.textContent = msg ? (msg + ' ' + naturalPraise) : naturalPraise;
    if (modal) modal.classList.add('open');

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
    if (phonicsEl) phonicsEl.textContent = `Sound: ${item.phonics}`;

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
        `انظر يا بطل، هذا حرف "${item.char}"! مثل ${item.word} ${item.emoji}!`,
        `أحسنت! اضغط على الحرف "${item.char}" لتسمع صوته الجميل!`,
        `ما شاء الله! هل تحب ${item.word}؟ لنقل معاً: ${item.char}!`
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
  let userStrokesCount = 0;

  const guideCanvas = document.getElementById('trace-guide-canvas');
  const userCanvas = document.getElementById('trace-user-canvas');
  const guideCtx = guideCanvas ? guideCanvas.getContext('2d') : null;
  const userCtx = userCanvas ? userCanvas.getContext('2d') : null;

  function initTracingMode() {
    renderTraceLetterRibbon();
    setupCanvas();
    drawGuideLetter();
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

  function clearUserDrawing() {
    if (userCtx && userCanvas) {
      userCtx.clearRect(0, 0, userCanvas.width, userCanvas.height);
      userStrokesCount = 0;
    }
  }

  function drawGuideLetter() {
    if (!guideCtx || !guideCanvas) return;
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

    const item = getCurrentItem();
    const charEl = document.getElementById('trace-current-char');
    if (charEl) charEl.textContent = item.char;

    const centerX = guideCanvas.width / 2;
    const centerY = guideCanvas.height / 2 + 30;

    // Draw Large Dashed Outline Letter
    guideCtx.save();
    guideCtx.textAlign = 'center';
    guideCtx.textBaseline = 'middle';
    guideCtx.font = state.lang === 'en' ? '800 240px Fredoka, sans-serif' : '800 280px "Baloo 2", sans-serif';

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

    // Cute start guiding dot
    guideCtx.beginPath();
    guideCtx.arc(centerX - 60, centerY - 80, 10, 0, Math.PI * 2);
    guideCtx.fillStyle = '#10B981';
    guideCtx.fill();

    guideCtx.restore();
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

  // Pointer & Touch Tracing Events
  function handleTraceStart(e) {
    e.preventDefault();
    initAudioContext();
    isTracing = true;
    userStrokesCount++;

    const promptOverlay = document.getElementById('trace-prompt-overlay');
    if (promptOverlay) promptOverlay.style.display = 'none';

    const pos = getCanvasPos(e);
    if (!userCtx) return;

    userCtx.beginPath();
    userCtx.moveTo(pos.x, pos.y);
    drawTraceSparkle(pos.x, pos.y);
  }

  function handleTraceMove(e) {
    if (!isTracing || !userCtx) return;
    e.preventDefault();

    const pos = getCanvasPos(e);
    rainbowHue = (rainbowHue + 4) % 360;

    userCtx.lineWidth = 26;
    userCtx.lineCap = 'round';
    userCtx.lineJoin = 'round';

    if (traceBrushColor === 'rainbow') {
      userCtx.strokeStyle = `hsl(${rainbowHue}, 90%, 55%)`;
    } else {
      userCtx.strokeStyle = traceBrushColor;
    }

    userCtx.lineTo(pos.x, pos.y);
    userCtx.stroke();

    drawTraceSparkle(pos.x, pos.y);
    userStrokesCount++;

    if (userStrokesCount % 15 === 0) {
      playSparkleSound();
    }
  }

  function handleTraceEnd() {
    isTracing = false;
    if (userStrokesCount > 55) {
      // Auto check after toddler traced enough!
      addStars(1, 'traced letter');
      triggerConfetti();
      userStrokesCount = 0;
    }
  }

  function getCanvasPos(e) {
    const rect = userCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (userCanvas.width / rect.width),
      y: (clientY - rect.top) * (userCanvas.height / rect.height)
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
    userCanvas.addEventListener('mousedown', handleTraceStart);
    userCanvas.addEventListener('mousemove', handleTraceMove);
    window.addEventListener('mouseup', handleTraceEnd);

    userCanvas.addEventListener('touchstart', handleTraceStart, { passive: false });
    userCanvas.addEventListener('touchmove', handleTraceMove, { passive: false });
    window.addEventListener('touchend', handleTraceEnd);
  }

  // ==========================================================================
  // MODE 3: POP BALLOONS MINI-GAME
  // ==========================================================================

  let balloonTarget = null;
  let balloonScore = 0;
  let balloonStreak = 0;
  let balloonSpawnTimer = null;

  function initBalloonGame() {
    balloonScore = 0;
    balloonStreak = 0;
    updateBalloonStats();
    pickNewBalloonTarget();
    startBalloonSpawner();
  }

  function updateBalloonStats() {
    const sc = document.getElementById('balloon-score');
    const st = document.getElementById('balloon-streak');
    if (sc) sc.textContent = balloonScore;
    if (st) st.textContent = balloonStreak;
  }

  function pickNewBalloonTarget() {
    const list = getActiveAlphabet();
    balloonTarget = list[Math.floor(Math.random() * list.length)];

    const letterEl = document.getElementById('balloon-target-letter');
    if (letterEl) letterEl.textContent = balloonTarget.char;

    speakBalloonPrompt();
  }

  function speakBalloonPrompt() {
    if (!balloonTarget) return;
    if (state.lang === 'en') {
      speakText(`Can you pop the letter... ${balloonTarget.name}?`);
    } else {
      speakText(`أين حرف... ${balloonTarget.name}؟`);
    }
  }

  function startBalloonSpawner() {
    clearInterval(balloonSpawnTimer);
    const sky = document.getElementById('balloon-sky');
    if (!sky) return;
    sky.innerHTML = '';

    // Create 5 persistent floating balloons with staggered negative delays
    const delays = [0, -1.8, -3.6, -5.4, -7.2];
    const xOffsets = [15, 32, 50, 68, 85]; // distributed percentages across width

    delays.forEach((delay, idx) => {
      createBalloon(sky, delay, xOffsets[idx]);
    });
  }

  function createBalloon(sky, delaySec, xPercent) {
    if (!balloonTarget) return;

    const list = getActiveAlphabet();
    // 50% chance of target letter
    const isTarget = Math.random() < 0.5;
    const item = isTarget ? balloonTarget : list[Math.floor(Math.random() * list.length)];

    const balloon = document.createElement('div');
    balloon.className = 'flying-balloon';
    balloon.textContent = item.char;

    const colors = [
      'linear-gradient(135deg, #FF4757, #FF6B8B)',
      'linear-gradient(135deg, #1E90FF, #70A1FF)',
      'linear-gradient(135deg, #2ED573, #7BED9F)',
      'linear-gradient(135deg, #FFA502, #ECCC68)',
      'linear-gradient(135deg, #7158E2, #9B59B6)'
    ];
    balloon.style.background = colors[Math.floor(Math.random() * colors.length)];

    // Position across width
    balloon.style.left = `${xPercent}%`;
    balloon.style.animationDelay = `${delaySec}s, ${Math.random() * 1.5}s`;

    sky.appendChild(balloon);

    // Click handler for pop
    balloon.addEventListener('click', (e) => {
      e.stopPropagation();
      playPopSound();

      if (item.char === balloonTarget.char) {
        // Correct pop!
        balloonScore++;
        balloonStreak++;
        addStars(1, 'popped balloon');
        triggerConfetti();

        balloon.classList.add('popped');

        if (state.lang === 'en') {
          speakText(`Yay! You popped ${balloonTarget.name}!`);
        } else {
          speakText(`رائع! حرف ${balloonTarget.name}!`);
        }

        setTimeout(() => {
          pickNewBalloonTarget();
          respawnBalloon(balloon, sky, xPercent);
        }, 1200);

      } else {
        // Wrong letter
        balloonStreak = 0;
        balloon.style.transform = 'scale(0.85) rotate(-15deg)';
        if (state.lang === 'en') {
          speakText(`That's ${item.name}! Find ${balloonTarget.name}!`);
        } else {
          speakText(`هذا حرف ${item.name}! ابحث عن ${balloonTarget.name}!`);
        }
        setTimeout(() => {
          balloon.style.transform = '';
        }, 600);
      }
      updateBalloonStats();
    });
  }

  function respawnBalloon(balloon, sky, xPercent) {
    balloon.classList.remove('popped');
    const list = getActiveAlphabet();
    const isTarget = Math.random() < 0.55;
    const item = isTarget ? balloonTarget : list[Math.floor(Math.random() * list.length)];
    balloon.textContent = item.char;
  }

  // ==========================================================================
  // MODE 4: FIND LETTER / PICTURE MATCH
  // ==========================================================================

  let matchTarget = null;

  function initMatchGame() {
    pickNewMatchQuest();
  }

  function pickNewMatchQuest() {
    const list = getActiveAlphabet();
    matchTarget = list[Math.floor(Math.random() * list.length)];

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
    }
    if (feedbackEl) {
      feedbackEl.textContent = state.lang === 'en' ? 'Tap the letter that starts the word!' : 'المس الحرف الأول من الكلمة!';
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
    options.sort(() => Math.random() - 0.5);

    renderMatchOptions(options);
    speakMatchPrompt();
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
        if (opt.char === matchTarget.char) {
          // Success!
          btn.classList.add('correct');
          playFanfareSound();
          addStars(2, 'matched letter');
          triggerConfetti();

          const feedbackEl = document.getElementById('match-feedback-text');
          if (feedbackEl) {
            feedbackEl.textContent = state.lang === 'en' ? '🌟 Super Job! That is right!' : '🌟 ممتاز! إجابة صحيحة!';
          }

          if (state.lang === 'en') {
            speakText(`Yes! ${matchTarget.char} is for ${matchTarget.word}!`);
          } else {
            speakText(`نعم! ${matchTarget.char} مثل ${matchTarget.word}! أحسنت!`);
          }

          setTimeout(() => pickNewMatchQuest(), 1800);
        } else {
          // Wrong
          btn.classList.add('wrong');
          playPopSound();
          if (state.lang === 'en') {
            speakText(`That is ${opt.name}! Try again!`);
          } else {
            speakText(`هذا حرف ${opt.name}! حاول مرة أخرى!`);
          }
          setTimeout(() => btn.classList.remove('wrong'), 800);
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

  function initMemoryGame() {
    flippedCards = [];
    matchedPairsCount = 0;
    const list = getActiveAlphabet();

    // Pick random items
    const shuffled = [...list].sort(() => Math.random() - 0.5).slice(0, memoryPairsCount);
    const deck = [];

    shuffled.forEach((item, id) => {
      deck.push({ id: `letter-${id}`, pairId: id, type: 'letter', val: item.char, item });
      deck.push({ id: `pic-${id}`, pairId: id, type: 'pic', val: item.emoji, item });
    });

    deck.sort(() => Math.random() - 0.5);
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
      speakText(card.card ? card.card.item.name : card.item.name);
    } else {
      speakText(card.item.word);
    }

    if (flippedCards.length === 2) {
      const [c1, c2] = flippedCards;
      if (c1.card.pairId === c2.card.pairId) {
        // MATCH!
        setTimeout(() => {
          c1.cardEl.classList.add('matched');
          c2.cardEl.classList.add('matched');
          playSparkleSound();
          addStars(2, 'memory pair');
          matchedPairsCount++;

          if (matchedPairsCount === memoryPairsCount) {
            setTimeout(() => {
              triggerConfetti();
              showCelebrateModal('You found all the matching cards! Fantastic!');
            }, 600);
          }
          flippedCards = [];
        }, 500);
      } else {
        // NO MATCH
        setTimeout(() => {
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
      item.title = isUnlocked ? stk.title : `Needs ${stk.cost} stars to unlock`;

      if (isUnlocked) {
        item.draggable = true;
        item.addEventListener('click', (e) => {
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

  function makeDraggable(el) {
    let isDragging = false;
    let startX = 0, startY = 0, origX = 0, origY = 0;

    function onPointerDown(e) {
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      origX = el.offsetLeft;
      origY = el.offsetTop;
      el.style.zIndex = '99';
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;
      el.style.left = `${origX + dx}px`;
      el.style.top = `${origY + dy}px`;
    }

    function onPointerUp() {
      isDragging = false;
      el.style.zIndex = '1';
    }

    el.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    el.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
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
    }
  }

  function playJukeboxStep() {
    if (!state.jukeboxPlaying) return;
    renderExploreView();
    speakCurrentPhonicsPhrase();

    const list = getActiveAlphabet();
    state.jukeboxTimer = setTimeout(() => {
      state.currentIndex = (state.currentIndex + 1) % list.length;
      playJukeboxStep();
    }, 4200);
  }

  // ==========================================================================
  // PARENT GATE & SETTINGS
  // ==========================================================================

  let gateTarget = 3;

  function initParentGate() {
    gateTarget = Math.floor(Math.random() * 5) + 1;
    const targetEl = document.getElementById('gate-target-num');
    if (targetEl) targetEl.textContent = gateTarget;

    const optWrap = document.getElementById('gate-options');
    if (!optWrap) return;
    optWrap.innerHTML = '';

    const nums = [gateTarget];
    while (nums.length < 3) {
      const r = Math.floor(Math.random() * 6) + 1;
      if (!nums.includes(r)) nums.push(r);
    }
    nums.sort(() => Math.random() - 0.5);

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
          // Failed gate
          playPopSound();
          initParentGate();
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
    state.deferredPrompt = e;
    const installBtn = document.getElementById('btn-android-app');
    if (installBtn) {
      installBtn.classList.add('pulse-anim');
    }
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
      interactiveMascotBtn.addEventListener('click', () => {
        bounceCompanion();
        playSparkleSound();
        const voc = getChildVocative();
        if (state.lang === 'en') {
          const phrase = state.gender === 'boy'
            ? `Hi ${voc}! I'm Leo, your safari buddy! Tap any letter to hear its story!`
            : `Hello ${voc}! I'm Noor, your safari buddy! Tap any letter to hear its magical story!`;
          speakText(phrase);
          updateCompanionBubble(phrase);
        } else {
          const phraseAr = state.gender === 'boy'
            ? `مَرْحَبًا يَا ${voc}! أَنَا صَدِيقُكَ اللَّطِيف، اِضْغَطْ عَلَى أَيِّ حَرْفٍ لِنَسْتَمِعَ إِلَى قِصَّتِهِ الرَّائِعَة!`
            : `مَرْحَبًا يَا ${voc}! أَنَا صَدِيقَتُكِ اللَّطِيفَة، اِضْغَطِي عَلَى أَيِّ حَرْفٍ لِنَسْتَمِعَ إِلَى قِصَّتِهِ السَّاحِرَة!`;
          speakText(phraseAr);
          updateCompanionBubble(phraseAr);
        }
      });
    }

    // Gender Modal Card Selections
    document.querySelectorAll('.gender-card-option').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-voice-preview')) return;
        const g = card.dataset.gender;
        document.querySelectorAll('.gender-card-option').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        // Auto update default avatar if user hasn't picked one
        const defaultAv = (g === 'boy') ? '👦' : '👧';
        state.gender = g;
        state.avatar = defaultAv;
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
        const tempOld = state.gender;
        state.gender = previewGender;
        if (state.lang === 'en') {
          const sample = (previewGender === 'boy')
            ? "Hello little explorer! Let's learn the alphabet together!"
            : "Hello sweet star! Let's discover magical letters together!";
          speakText(sample);
        } else {
          const sampleAr = (previewGender === 'boy')
            ? "مَرْحَبًا يَا بَطَل! هَيَّا بِنَا نَتَعَلَّمُ الحُرُوفَ العَرَبِيَّةَ مَعًا!"
            : "مَرْحَبًا يَا أَمِيرَة! هَيَّا بِنَا نَكْتَشِفُ الحُرُوفَ العَرَبِيَّةَ الجَمِيلَة!";
          speakText(sampleAr);
        }
        state.gender = tempOld;
      });
    });

    // Avatar pickers inside modal
    document.querySelectorAll('.avatar-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-choice-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.avatar = btn.dataset.avatar;
        playChimeSound();
      });
    });

    // Save Gender Button
    const btnSaveGender = document.getElementById('btn-save-gender');
    if (btnSaveGender) {
      btnSaveGender.addEventListener('click', () => {
        const selectedOption = document.querySelector('.gender-card-option.selected');
        const g = selectedOption ? selectedOption.dataset.gender : state.gender;
        const nameInput = document.getElementById('input-child-name');
        const name = nameInput ? nameInput.value : '';
        const activeAvBtn = document.querySelector('.avatar-choice-btn.active');
        const av = activeAvBtn ? activeAvBtn.dataset.avatar : state.avatar;

        setGender(g, av, name);

        const modal = document.getElementById('modal-gender');
        if (modal) {
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
        }
      });
    }

    // Language Toggle
    const btnEn = document.getElementById('btn-lang-en');
    const btnAr = document.getElementById('btn-lang-ar');

    if (btnEn) {
      btnEn.addEventListener('click', () => {
        if (state.lang === 'en') return;
        state.lang = 'en';
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
        btnEn.classList.add('active');
        btnAr.classList.remove('active');
        state.currentIndex = 0;
        switchMode(state.mode);
        speakText('English Alphabet Safari!');
      });
    }

    if (btnAr) {
      btnAr.addEventListener('click', () => {
        if (state.lang === 'ar') return;
        state.lang = 'ar';
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
        btnAr.classList.add('active');
        btnEn.classList.remove('active');
        state.currentIndex = 0;
        switchMode(state.mode);
        speakText('مرحباً بك في سفاري الحروف العربية!');
      });
    }

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
        speakCurrentPhonicsPhrase();
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
      traceCheckBtn.addEventListener('click', () => {
        addStars(2, 'traced letter button');
        triggerConfetti();
        if (state.lang === 'en') {
          speakText('Super job! You traced the letter!');
        } else {
          speakText('أحسنت يا بطل! رسم رائع للحرف!');
        }
      });
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
      soundToggle.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        const icon = document.getElementById('sound-icon');
        if (icon) icon.textContent = state.soundEnabled ? '🔊' : '🔇';
      });
    }

    // Voice Speed Toggle
    const speedBtn = document.getElementById('btn-voice-speed');
    if (speedBtn) {
      speedBtn.addEventListener('click', () => {
        if (state.voiceSpeed === 0.75) {
          state.voiceSpeed = 0.95;
          document.getElementById('speed-icon').textContent = '🐶';
        } else if (state.voiceSpeed === 0.95) {
          state.voiceSpeed = 1.15;
          document.getElementById('speed-icon').textContent = '🐆';
        } else {
          state.voiceSpeed = 0.75;
          document.getElementById('speed-icon').textContent = '🐢';
        }
        playMarimbaTone(4);
      });
    }

    // Android App Info Modal
    const androidBtn = document.getElementById('btn-android-app');
    if (androidBtn) {
      androidBtn.addEventListener('click', () => {
        document.getElementById('modal-android').classList.add('open');
      });
    }

    // Parents Modal
    const parentsBtn = document.getElementById('btn-parents');
    if (parentsBtn) {
      parentsBtn.addEventListener('click', () => {
        document.getElementById('parents-gate-view').style.display = 'flex';
        document.getElementById('parents-settings-view').style.display = 'none';
        initParentGate();
        document.getElementById('modal-parents').classList.add('open');
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

    // Close Modals
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.close;
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('open');
      });
    });

    // Parent Settings inputs
    const setVoiceSpeed = document.getElementById('setting-voice-speed');
    if (setVoiceSpeed) {
      setVoiceSpeed.addEventListener('change', (e) => {
        state.voiceSpeed = parseFloat(e.target.value);
      });
    }

    const setArabicVowels = document.getElementById('setting-arabic-vowels');
    if (setArabicVowels) {
      setArabicVowels.addEventListener('change', (e) => {
        state.showHarakat = e.target.checked;
        renderExploreView();
      });
    }

    const setTranslit = document.getElementById('setting-translit');
    if (setTranslit) {
      setTranslit.addEventListener('change', (e) => {
        state.showTranslit = e.target.checked;
        renderExploreView();
      });
    }

    const setSound = document.getElementById('setting-sound-effects');
    if (setSound) {
      setSound.addEventListener('change', (e) => {
        state.soundEnabled = e.target.checked;
      });
    }

    const btnReset = document.getElementById('btn-reset-progress');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Reset stars and stickers progress?')) {
          state.stars = 0;
          state.unlockedStickers = ['s1'];
          localStorage.setItem('alpha_stars', '0');
          localStorage.setItem('alpha_stickers', '["s1"]');
          updateStarUI();
          alert('Progress reset!');
        }
      });
    }
  }

  function switchMode(newMode) {
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
  // INITIALIZATION
  // ==========================================================================

  function init() {
    applyGenderUI();
    updateStarUI();
    bindEvents();
    renderExploreView();

    // Register Service Worker for offline PWA
    if ('serviceWorker' in navigator) {
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
