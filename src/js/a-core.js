  'use strict';
  const KEY = 'yz-tycoon-v5';
  const $ = id => document.getElementById(id);
  const setText = (el, s) => { if (el && el._t !== s) { el.textContent = s; el._t = s; } };
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  /* ---------- Dil ----------
     Tüm metinler src/lang/*.js dosyalarında. t('anahtar', {degisken}) arayüz metni verir, TX() o dilin içeriğini
     (kaynak adları, espriler, haber akışı, sorular...). Eksik anahtar Türkçeye düşer. */
  const LANG_IDS = ['tr', 'az', 'en', 'ru', 'ar', 'es', 'de', 'ja', 'zh'].filter(k => LANGS[k]);
  function detectLang() {
    const ls = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (let i = 0; i < ls.length; i++) { const k = String(ls[i]).toLowerCase().slice(0, 2); if (LANG_IDS.indexOf(k) >= 0 && LANGS[k]) return k; }
    return 'en';
  }
  let LANG = LANGS.tr;
  const TX = () => LANG.c;
  function t(k, v) {
    let s = LANG.ui[k];
    if (s == null) s = LANGS.tr.ui[k];
    if (s == null) return k;
    if (v) s = s.replace(/\{(\w+)\}/g, (m, x) => (v[x] != null ? v[x] : m));
    return s;
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- Denge ayarları ----------
     Maliyet artışı 1,15; ilk birimin geri ödemesi en fazla ~8 dk; her kaynakta 10/25/50/100/200/300/400/500'de ×2 (srcK bunu dengeler).
     Tempo, sahte saatla oynayan bir botla ölçüldü: aktif oyuncu ilk yeni modele ~40 dk'da, rahat oyuncu ~68 dk'da ulaşır.
     Dokunuş = beyin gücü × dokunuş çarpanı + saniyelik üretimin bir yüzdesi (başta 3-10 sn, ortada 0,3-1 sn üretim). */
  const BAL = {
    growth: 1.15,
    miles: [10, 25, 50, 100, 200, 300, 400, 500], srcK: 0.55,
    tiers: [0, 500, 1e5, 3e7, 1e10, 1e13, 1e16, 1e19], tierStep: 1000, xTier: 1.2, genF: 1.15, genH: 1.25,
    achB: 0.01, alignF: 1.25, alignH: 1.5, gUp: 2, gUpAt: 25, pPow: 1 / 3, tekDiv: 20, tekMin: 100,
    nBase: 10, nGrowth: 1.14,
    levelPow: 3,
    synBonus: 0.3, synRes: 0.6,
    shareK: 0.007, shareCap: 0.10, tapPow: 0.6,
    idleK: 0.04,
    comboSteps: 30, comboDecay: 25,
    critChance: 0.05, critMult: 7,
    prestigeDiv: 1e11, paramBonus: 0.1,
    offline: 0.6, offlineCap: 43200, refBonus: 0.03,
    turboMs: 120000, turboCd: 600000
  };
  if (location.hash === '#debug' && window.__BAL) Object.assign(BAL, window.__BAL);

  /* ---------- Sayı biçimi (dile göre ondalık işareti ve kısaltmalar) ---------- */
  const dec = s => s.replace('.', LANG.meta.dec);
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) n = 0;
    const SUF = LANG.meta.suf, G3 = LANG.meta.grp || 3, BASE = Math.pow(10, G3); // Japonca/Çince 4 haneli grup (万, 億…)
    if (state.opt.sci && n >= 1e6) return dec(n.toExponential(2).replace('e+', 'e'));
    if (n < 1000) return n < 10 ? dec((Math.floor(n * 10 + 1e-9) / 10).toFixed(1)) : String(Math.floor(n));
    if (n < BASE) return String(Math.floor(n));
    let i = Math.floor(Math.log10(n) / G3);
    if (i >= SUF.length) return dec(n.toExponential(2).replace('e+', 'e'));
    let s = (v => v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0))(n / Math.pow(BASE, i));
    if (parseFloat(s) >= BASE && i + 1 < SUF.length) { i++; s = (n / Math.pow(BASE, i)).toFixed(2); }
    return dec(s) + LANG.meta.sp + SUF[i];
  }
  const fmtInt = n => n < 1000 ? String(Math.floor(n)) : fmt(n);
  const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function fmtTime(s) {
    s = Math.floor(s);
    if (s < 60) return t('u.s', { n: s });
    const m = Math.floor(s / 60);
    if (m < 60) return t('u.m', { n: m });
    return t('u.hm', { h: Math.floor(m / 60), m: m % 60 });
  }
  function leftText(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), mi = Math.floor(s % 3600 / 60);
    return h ? t('u.hm', { h: h, m: mi }) : t('u.ms', { m: mi, s: s % 60 });
  }
  // Süre tahmini pasif üretime son saniyelerdeki dokunuş gelirini de ekler (aktif oynayana gerçekçi süre).
  let tapAcc = 0, tapRate = 0, tapAt0 = Date.now();
  function tapRateTick(now) {
    const dt = (now - tapAt0) / 1000;
    if (dt < 1) return;
    tapRate = tapRate * 0.75 + (tapAcc / dt) * 0.25;
    if (tapRate < 1e-9) tapRate = 0;
    tapAcc = 0; tapAt0 = now;
  }
  function eta(cost) {
    const d = dps() + tapRate;
    if (d <= 0) return '';
    const s = (cost - state.data) / d;
    if (s > 86400) return '';
    return '~' + (s < 60 ? t('u.s', { n: Math.ceil(s) }) : s < 3600 ? t('u.m', { n: Math.ceil(s / 60) }) : t('u.h', { n: Math.floor(s / 3600) }));
  }
  function niceNum(x) { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.ceil(x / p) * p; }

  /* ---------- İkonlar ---------- */
  const ICON = {
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.5 3 3.5 15 0 18M12 3c-3.5 3-3.5 15 0 18"/>',
    sensor: '<circle cx="12" cy="18" r="1.8"/><path d="M8.5 14.5a5 5 0 0 1 7 0M5.5 11.5a9 9 0 0 1 13 0M2.5 8.5a13 13 0 0 1 19 0"/>',
    server: '<rect x="4" y="3" width="16" height="7" rx="1"/><rect x="4" y="13" width="16" height="7" rx="1"/><path d="M8 6.5h.01M8 16.5h.01"/>',
    gpu: '<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    atom: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
    neuro: '<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="19" r="2.2"/><circle cx="12" cy="12" r="2.2"/><path d="M7.7 7.5 10.3 10.5M16.3 7.5 13.7 10.5M12 14.2v2.6"/>',
    loop: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    duck: '<path d="M4 14c0 4 3 6 8 6s8-2 8-5-2.5-3.5-5-3"/><circle cx="10" cy="8.5" r="4"/><path d="M6 8.5H2.5"/><path d="M10.8 7.5h.01"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>'
  };
  const svg = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">' + ICON[k] + '</svg>';

  /* ---------- Oyun verisi (metinler dil dosyalarında) ---------- */
  const G = [
    { c: 15, r: 0.1, t: 1.5, i: 'tag', col: '--sun' }, { c: 100, r: 1, t: 3, i: 'web', col: '--sky' }, { c: 1100, r: 8, t: 5, i: 'sensor', col: '--teal' },
    { c: 12000, r: 60, t: 8, i: 'server', col: '--coral' }, { c: 130000, r: 400, t: 12, i: 'gpu', col: '--grape' }, { c: 1.4e6, r: 3000, t: 20, i: 'atom', col: '--sky' },
    { c: 2e7, r: 45000, t: 30, i: 'neuro', col: '--teal' }, { c: 3.3e8, r: 700000, t: 45, i: 'loop', col: '--coral' }
  ];
  // Eşikler sırayla "hız ×2" (döngü yarıya iner) ve "veri ×2" verir; ikisi de saniyelik üretimi ikiye katlar.
  // Veri aslında kesintisiz akar; döngü çubuğu yalnız görsel (denge, çevrimdışı ve kayıt etkilenmez).
  const mileKind = k => k % 2 === 0 ? 'spd' : 'out';
  function cycTime(i) {
    let t = G[i].t;
    for (let k = 0; k < BAL.miles.length && state.gen[i] >= BAL.miles[k]; k++) if (mileKind(k) === 'spd') t /= 2;
    return t;
  }
  function nextMileIdx(n) { for (let k = 0; k < BAL.miles.length; k++) if (BAL.miles[k] > n) return k; return -1; }
  const gName = i => TX().gens[i].n;
  // Seviyeler bu turda toplanan veriye göre açılır; YGZ'den sonra her biri 1000 kat veri ister ve üretime ×1,2 ekler.
  const TIERS = [];
  for (let i = 0; i < 8; i++) TIERS.push({ at: BAL.tiers[i] });
  for (let k = 1; k <= 60; k++) TIERS.push({ at: BAL.tiers[7] * Math.pow(BAL.tierStep, k), x: k });
  function tierName(i) {
    const T = TIERS[i];
    if (!T.x) return TX().tiers[i];
    const xs = TX().xtier, base = xs[(T.x - 1) % xs.length], mk = Math.floor((T.x - 1) / xs.length);
    return base + (mk ? ' ' + t('mk', { n: mk + 1 }) : '');
  }
  // Beyin bölgeleri (yandan görünüm, alın solda). x,y kutu içinde 0-1; R kutu genişliğine oranla.
  const REG = [
    { x: 0.47, y: 0.46, R: 0.09, k: 5 }, { x: 0.21, y: 0.40, R: 0.12, k: 6 }, { x: 0.82, y: 0.43, R: 0.10, k: 6 }, { x: 0.60, y: 0.70, R: 0.075, k: 5 },
    { x: 0.65, y: 0.21, R: 0.09, k: 6 }, { x: 0.30, y: 0.70, R: 0.085, k: 6 }, { x: 0.42, y: 0.18, R: 0.085, k: 6 }, { x: 0.77, y: 0.80, R: 0.07, k: 5 }
  ];
  const regName = i => TX().regions[i];
  // Her yeni seviyede seçilen karakter kartları: [aydınlık, karanlık]
  const CARD_IDS = [null, ['donate', 'cookies'], ['medical', 'faces'], ['opensrc', 'steal'], ['safety', 'botnet'], ['tutor', 'disinfo'], ['partner', 'seize'], ['aligned', 'replicate']];
  const PERKS = {};
  CARD_IDS.forEach((c, tr) => { if (c) { PERKS[c[0]] = { t: tr, side: 'f' }; PERKS[c[1]] = { t: tr, side: 'h' }; } });
  const cardText = (tr, side) => tr <= 7 ? TX().cards[CARD_IDS[tr][side === 'f' ? 0 : 1]] : TX().genCards[side === 'f' ? 0 : 1];

  const UP = [];
  G.forEach((g, i) => UP.push({ id: 'g' + i, gi: i, cost: g.c * 30, ok: () => state.gen[i] >= BAL.gUpAt }));
  UP.push(
    { id: 'c0', cost: 60, ok: () => state.run >= 25 },
    { id: 'c1', cost: 4000, ok: () => state.run >= 2000 },
    { id: 'c2', cost: 4e5, ok: () => state.run >= 2e5 },
    { id: 'c3', cost: 4e8, ok: () => state.run >= 2e8 },
    { id: 'p0', cost: 2000, ok: () => totalGen() >= 10 },
    { id: 'p1', cost: 2e5, ok: () => totalGen() >= 50 },
    { id: 'p2', cost: 2e8, ok: () => totalGen() >= 100 },
    { id: 'p3', cost: 2e11, ok: () => totalGen() >= 200 },
    { id: 'n0', cost: 500, ok: () => state.nBought >= 4 },
    { id: 'n1', cost: 3e4, ok: () => maxLevel() >= 3 },
    { id: 'n2', cost: 3e7, ok: () => maxLevel() >= 5 },
    { id: 's0', cost: 1500, ok: () => tierIdx() >= 1 },
    { id: 's1', cost: 1.5e5, ok: () => tierIdx() >= 2 },
    { id: 's2', cost: 1.5e7, ok: () => tierIdx() >= 3 },
    { id: 'k0', cost: 6000, ok: () => state.run >= 3000 },
    { id: 'a0', cost: 5e4, ok: () => state.run >= 2e4 },
    { id: 'a1', cost: 5e6, ok: () => state.run >= 2e6 },
    { id: 'v0', cost: 1e6, ok: () => state.run >= 3e5 },
    { id: 'v1', cost: 1e9, ok: () => state.run >= 3e8 },
    { id: 'v2', cost: 1e12, ok: () => state.run >= 3e11 }
  );
  const UPMAP = {};
  UP.forEach(u => { UPMAP[u.id] = u; });
  function upText(u) {
    if (u.gi != null) { const g = TX().upGen; return { n: g.n.replace('{g}', gName(u.gi)), e: g.e.replace('{x}', BAL.gUp).replace('{n}', BAL.gUpAt) }; }
    return TX().ups[u.id];
  }

  const totalGen = () => state.gen.reduce((a, b) => a + b, 0);
  const ACH = [
    { id: 'tap1', ok: () => state.clicks >= 1 }, { id: 'tap100', ok: () => state.clicks >= 100 }, { id: 'tap1k', ok: () => state.clicks >= 1000 },
    { id: 'tap10k', ok: () => state.clicks >= 10000 }, { id: 'merge1', ok: () => state.merges >= 1 }, { id: 'lvl5', ok: () => state.maxLvEver >= 5 },
    { id: 'lvl8', ok: () => state.maxLvEver >= 8 }, { id: 'syn1', ok: () => state.synMade >= 1 }, { id: 'combo', ok: () => state.comboTop >= 1 },
    { id: 'aha10', ok: () => state.crits >= 10 }, { id: 'kb', ok: () => state.life >= 1e3 }, { id: 'mb', ok: () => state.life >= 1e6 },
    { id: 'gb', ok: () => state.life >= 1e9 }, { id: 'tb', ok: () => state.life >= 1e12 }, { id: 'gen1', ok: () => totalGen() >= 1 },
    { id: 'gen100', ok: () => totalGen() >= 100 }, { id: 'gpu', ok: () => state.gen[4] >= 1 }, { id: 'qbit', ok: () => state.gen[5] >= 1 },
    { id: 'attn', ok: () => state.bestTier >= 4 }, { id: 'agi', ok: () => state.bestTier >= 7 }, { id: 'friend', ok: () => state.karma >= 3 },
    { id: 'tyrant', ok: () => state.karma <= -3 }, { id: 'virus10', ok: () => state.viruses >= 10 }, { id: 'pk10', ok: () => state.packets >= 10 },
    { id: 'turbo', ok: () => state.turbos >= 1 }, { id: 'run1', ok: () => state.runs >= 1 }, { id: 'run5', ok: () => state.runs >= 5 },
    { id: 'day', ok: () => state.perfectDays >= 1 }, { id: 'quiz3', ok: () => state.quizOk >= 3 }, { id: 'mg20', ok: () => state.mgBest >= 20 },
    { id: 'medal', ok: () => state.medals >= 1 }, { id: 'final', ok: () => Object.keys(state.endings).length >= 1 },
    { id: 'allend', ok: () => Object.keys(state.endings).length >= 3 }, { id: 'lab5', ok: () => state.runs >= 4 }, { id: 'super', ok: () => state.bestTier >= 8 },
    { id: 'trip1', ok: () => state.missions >= 1 }, { id: 'tek1', ok: () => state.tek >= 1 },
    { id: 'proj5', ok: () => state.projDone >= 5 }, { id: 'ch1', ok: () => Object.keys(state.chDone).length >= 1 }, { id: 'poly', ok: () => Object.keys(state.langsSeen).length >= 2 }
  ];

  const SKINS = ['teal', 'sky', 'coral', 'sun', 'pink', 'grape', 'lime'];
  const EVENTS = [{ id: 'gpu', icon: 'gpu', skin: 'sun' }, { id: 'fest', icon: 'box', skin: 'pink' }, { id: 'hack', icon: 'loop', skin: 'grape' }, { id: 'hallu', icon: 'spark', skin: 'lime' }];
  const EV_MILES = [100, 300, 700];
  // Her "yeni model eğit" turu farklı bir laboratuvarda geçer; liste bitince döngü başa sarar ve kalıcı ×2 verir.
  const LABS = [{ m: {} }, { m: { cost: 0.8 } }, { m: { tap: 1.5 } }, { m: { pack: 2, ncost: 1.3 } }, { m: { off: 1 } }, { m: { turbo: 2 } },
    { m: { crit: 2 } }, { m: { src: 2, syn: -1 } }, { m: { all: 1.5 } }, { m: { combo: 0.5, turbo: 2 } }];
  const KASA = [{ id: 'kahve', max: 10 }, { id: 'ekran', max: 10 }, { id: 'ordek', max: 5 }, { id: 'fan', max: 5 }, { id: 'hafiza', max: 5 }, { id: 'jel', max: 5 }, { id: 'burs', max: 5 }, { id: 'klavye', max: 5 }];
  const COSTUMES = {
    none: () => true, papyon: () => state.clicks >= 500, fes: () => state.runs >= 1, gozluk: () => state.crits >= 25, kep: () => state.quizOk >= 5,
    kulak: () => state.mgBest >= 10, sapka: () => state.medals >= 1, tac: () => state.bestTier >= 7,
    cay: () => state.projStory.riza === 1, onluk: () => state.projStory.nezahat === 1, stetoskop: () => state.projStory.hastane === 1
  };
  const TREE = [{ id: 'start', c: 1 }, { id: 'amerge', c: 2 }, { id: 'abuy', c: 2 }, { id: 'syn', c: 2 }, { id: 'turbo', c: 2 }, { id: 'dream', c: 2 }, { id: 'deep', c: 3 }, { id: 'intu', c: 3 }];
  const MISSIONS = [{ k: 'm1', ms: 1800000, sec: 1200, chips: 0 }, { k: 'm2', ms: 7200000, sec: 3600, chips: 2 }, { k: 'm3', ms: 28800000, sec: 14400, chips: 6 }];
  // Proje yıldızları [hız, kalite, güven]; metinler dil dosyasında aynı kimlikle.
  const PROJ = [
    { id: 'riza', story: 1, at: 0, cos: 'cay', A: [3, 1, 1], B: [1, 3, 3] }, { id: 'nezahat', story: 1, at: 2, cos: 'onluk', A: [3, 1, 2], B: [1, 3, 3] },
    { id: 'hastane', story: 1, at: 4, cos: 'stetoskop', A: [3, 2, 1], B: [1, 3, 3] },
    // Hikâyenin devamı: önceki bölüm Özenli yolla bitince açılır.
    { id: 'riza2', story: 1, at: 6, req: 'riza', A: [3, 1, 1], B: [1, 3, 3] }, { id: 'nezahat2', story: 1, at: 8, req: 'nezahat', A: [3, 1, 1], B: [1, 3, 3] },
    { id: 'hastane2', story: 1, at: 10, req: 'hastane', A: [3, 1, 1], B: [1, 3, 3] }, { id: 'riza3', story: 1, at: 13, req: 'riza2', A: [3, 1, 1], B: [1, 3, 3] },
    { id: 'nezahat3', story: 1, at: 16, req: 'nezahat2', A: [3, 1, 1], B: [1, 3, 3] }, { id: 'hastane3', story: 1, at: 19, req: 'hastane2', A: [3, 1, 2], B: [1, 3, 3] },
    { id: 'ozan', A: [3, 1, 1], B: [1, 3, 3] }, { id: 'cemal', A: [3, 1, 1], B: [1, 3, 2] },
    { id: 'belediye', A: [3, 1, 1], B: [1, 3, 2] }, { id: 'simit', A: [3, 2, 1], B: [1, 3, 2] }, { id: 'kiraci', A: [3, 1, 1], B: [1, 3, 3] },
    { id: 'tavla', A: [3, 1, 1], B: [1, 3, 2] }, { id: 'haluk', A: [3, 1, 1], B: [1, 2, 3] }, { id: 'eczane', A: [3, 1, 2], B: [1, 3, 3] }
  ];
  const PROJ_BY = {};
  PROJ.forEach(p => { PROJ_BY[p.id] = p; });
  const projText = id => TX().proj[id];
  // Meydan okuma hedefleri Tekillik açıldığında (~100 parametre) aktif bir oyuncu için ~20-25 dk sürecek şekilde ölçüldü.
  const CHAL = [{ id: 'gpu', goal: 1e12 }, { id: 'kit', goal: 3e14 }, { id: 'pasif', goal: 1.5e15 }];
  const CHAL_BY = {};
  CHAL.forEach(c => { CHAL_BY[c.id] = c; });
  // Beğeni ödülleri: her türün kendi kanalı var, birbirini silmez; aynı tür süreyi uzatır.
  const BUFFS = { tap: { ms: 180000 }, src: { ms: 180000 }, crit: { ms: 120000 }, data: { ms: 0 } };
  const LIKE_MS = 600000;

  function defaults() {
    return {
      data: 0, run: 0, life: 0, params: 0, gen: G.map(() => 0), upg: {},
      neurons: [{ s: 0, l: 1 }], syn: [], nBought: 0, choices: {}, karma: 0,
      clicks: 0, runs: 0, merges: 0, maxLvEver: 1, synMade: 0, crits: 0, comboTop: 0, viruses: 0, bestTier: 0,
      last: Date.now(), turboUntil: 0, turboReadyAt: 0, played: 0, buyMode: 1, pendingOff: 0,
      packets: 0, turbos: 0, upgBought: 0, taskClaims: 0, perfectDays: 0, ach: {}, daily: null, seen: {},
      ver: 7,
      bilinc: 0, bilincAll: 0, tek: 0, tree: {}, skin: 'teal', skins: { teal: 1 }, ev: null, medals: 0,
      mgReadyAt: 0, mgBest: 0, mgPlays: 0, halluLeft: 0, inspireUntil: 0, quizOk: 0,
      mission: null, missions: 0,
      chips: 0, kasa: {}, cos: 'none', storySeen: {}, endings: {}, feed: [], feedLang: '', buffs: {}, perm2x: false,
      auto: { buy: true, mode: 'eff', sel: 0, merge: true, protect: true },
      proj: null, projOffer: null, projDone: 0, refs: 0, projStory: {}, projSkipAt: 0,
      ch: null, chDone: {}, chSaved: null, langsSeen: {},
      opt: { sound: true, music: true, haptic: true, eco: null, sci: false, tab: 'gen', msub: 'train', lang: null, theme: 'auto' }
    };
  }
  const state = defaults();

  /* ---------- Karakter ---------- */
  const perk = id => { const p = PERKS[id]; return !!p && state.choices[p.t] === p.side; };
  const alignment = () => state.karma >= 3 ? 'f' : state.karma <= -3 ? 'h' : 'n';
  const labIdx = () => state.runs % LABS.length;
  const lab = () => LABS[labIdx()];
  const labText = i => TX().labs[i == null ? labIdx() : i];
  const loopN = () => Math.floor(state.runs / LABS.length);
  const labM = (k, d) => (lab().m[k] != null ? lab().m[k] : d);
  const kv = id => state.kasa[id] || 0;
  const newsOn = k => (state.buffs[k] || 0) > Date.now();
  const chIs = id => !!state.ch && state.ch.id === id;
  const chWon = id => !!state.chDone[id];
  const genCount = side => Object.keys(state.choices).filter(k => +k > 7 && state.choices[k] === side).length;
  const weekNo = () => Math.floor((Date.now() / 864e5 + 3) / 7);
  const curEvent = () => EVENTS[weekNo() % EVENTS.length];
  // Haftalık etkinlik isteğe bağlı: katılmayan oyuncunun ekonomisi hiç değişmez.
  const evIs = id => !!state.ev && state.ev.join && curEvent().id === id;
  function ensureEvent() { const wk = weekNo(); if (!state.ev || state.ev.wk !== wk) state.ev = { wk: wk, pts: 0, got: 0, join: false }; }

  /* ---------- Beyin ---------- */
  let brainCache = -1;
  const unlockedSlots = () => REG.slice(0, tierIdx() + 1).reduce((a, r) => a + r.k, 0);
  const maxLevel = () => state.neurons.reduce((m, n) => Math.max(m, n.l), 0);
  function synCap() { return Math.max(0, Math.min(7, tierIdx()) + (state.upg.s0 ? 1 : 0) + (state.upg.s2 ? 2 : 0) + (perk('tutor') ? 1 : 0) + (state.tree.syn ? 2 : 0) + labM('syn', 0)); }
  function neuronAt(s) { for (let i = 0; i < state.neurons.length; i++) if (state.neurons[i].s === s) return state.neurons[i]; return null; }
  function brainPower() {
    if (brainCache >= 0) return brainCache;
    brainCache = powerOf(state.neurons, state.syn);
    return brainCache;
  }
  // Saf hesap: önizleme için kopya nöron/sinaps listesiyle de çağrılır.
  function powerOf(neurons, syns) {
    const synMul = (state.upg.s1 ? 2 : 1) * (perk('partner') ? 2 : 1) * (1 + kv('jel') * 0.2);
    const at = s => { for (let i = 0; i < neurons.length; i++) if (neurons[i].s === s) return neurons[i]; return null; };
    const bonus = {};
    syns.forEach(p => {
      const a = at(p[0]), b = at(p[1]);
      if (!a || !b) return;
      const v = (a.l === b.l ? BAL.synRes : BAL.synBonus) * synMul;
      bonus[a.s] = (bonus[a.s] || 0) + v;
      bonus[b.s] = (bonus[b.s] || 0) + v;
    });
    let B = 0;
    neurons.forEach(n => { B += Math.pow(BAL.levelPow, n.l - 1) * (1 + (bonus[n.s] || 0)); });
    return B * (state.upg.n1 ? 1.5 : 1) * (state.upg.n2 ? 2 : 1);
  }
  const brainDirty = () => { brainCache = -1; };

  /* ---------- Hesaplar ---------- */
  const turboOn = () => Date.now() < state.turboUntil;
  const paramMult = () => 1 + state.params * (state.tree.deep ? 0.15 : BAL.paramBonus);
  const achCount = () => Object.keys(state.ach).length;
  const achMult = () => 1 + achCount() * BAL.achB;
  const alignMult = () => alignment() === 'f' ? BAL.alignF : alignment() === 'h' ? BAL.alignH : 1;
  const inspireOn = () => Date.now() < state.inspireUntil;
  // base = true: turbo, İlham gibi geçici güçlendirmeler hariç (ödül ve çevrimdışı hesapları için)
  const refMult = () => 1 + state.refs * BAL.refBonus;
  const globalMult = base => paramMult() * achMult() * alignMult() * (!base && turboOn() ? 2 : 1) * (perk('replicate') ? 3 : 1)
    * (1 + state.medals * 0.05) * (1 + state.bilincAll * 0.1) * (!base && inspireOn() ? 2 : 1) * refMult() * (chWon('kit') ? 1.5 : 1)
    * Math.pow(BAL.xTier, Math.max(0, tierIdx() - 7)) * Math.pow(BAL.genF, genCount('f')) * Math.pow(BAL.genH, genCount('h'))
    * Math.pow(2, loopN()) * labM('all', 1) * (state.perm2x ? 2 : 1);
  function srcMult(i) {
    let m = state.upg['g' + i] ? BAL.gUp : 1;
    const n = state.gen[i];
    for (let k = 0; k < BAL.miles.length && n >= BAL.miles[k]; k++) m *= 2;
    return m;
  }
  function srcGlobal(base) {
    let m = 1; ['v0', 'v1', 'v2'].forEach(id => { if (state.upg[id]) m *= 2; }); if (perk('cookies')) m *= 1.5;
    return m * labM('src', 1) * (1 + kv('ekran') * 0.1) * (!base && newsOn('src') ? 2 : 1) * (chIs('kit') ? 0.1 : 1) * (chWon('pasif') ? 1.5 : 1);
  }
  const idleAt = p => 1 + BAL.idleK * Math.sqrt(p);
  const brainIdle = () => idleAt(brainPower());
  // *At(p): verilen beyin gücüyle aynı hesap (birleştirme/sinaps önizlemesi gerçek değeri göstersin diye)
  function dpsAt(p, base) {
    let s = 0;
    for (let i = 0; i < G.length; i++) s += state.gen[i] * G[i].r * srcMult(i);
    return s * BAL.srcK * srcGlobal(base) * idleAt(p) * globalMult(base);
  }
  const dps = base => dpsAt(brainPower(), base);
  function clickMult() { let m = 1; ['c0', 'c1', 'c2', 'c3'].forEach(id => { if (state.upg[id]) m *= 3; }); if (perk('faces')) m *= 2; if (evIs('gpu')) m *= 2; return m * labM('tap', 1) * (1 + kv('kahve') * 0.15) * (newsOn('tap') ? 2 : 1); }
  const tapShare = () => tapShareAt(brainPower());
  function tapShareAt(p) {
    let s = Math.min(BAL.shareCap, BAL.shareK * Math.sqrt(p));
    s += (state.upg.p0 ? 0.01 : 0) + (state.upg.p1 ? 0.02 : 0) + (state.upg.p2 ? 0.03 : 0) + (state.upg.p3 ? 0.04 : 0) + (perk('steal') ? 0.05 : 0);
    return s;
  }
  const tapAt = (p, base) => chIs('pasif') ? 0 : Math.pow(p, BAL.tapPow) * clickMult() * globalMult(base) + tapShareAt(p) * dpsAt(p, base);
  const tapValue = base => tapAt(brainPower(), base);
  const comboCap = () => (state.upg.k0 ? 3 : 2) + (evIs('hack') ? 1 : 0) + kv('klavye') * 0.2;
  const critChance = () => (BAL.critChance + (state.upg.a0 ? 0.05 : 0) + (perk('disinfo') ? 0.10 : 0)) * (evIs('hallu') ? 2 : 1) * labM('crit', 1) * (newsOn('crit') ? 3 : 1);
  const critMult = () => (state.upg.a1 ? BAL.critMult * 2 : BAL.critMult) * (state.tree.intu ? 2 : 1);
  function addData(n) { state.data += n; state.run += n; state.life += n; progress('earn', n); }
  // Toplanmamış çevrimdışı veri bu turun parçasıdır: eğitimde önce otomatik toplanır.
  // Tam küp sınırlarında kayan nokta 4,9999… verebilir: tam sayıya çok yakınsa yuvarla.
  function floorNear(v) { const r = Math.round(v); return Math.abs(v - r) < 1e-9 * Math.max(1, r) ? r : Math.floor(v); }
  const gain = () => state.ch ? 0 : floorNear(Math.pow((state.run + state.pendingOff) / BAL.prestigeDiv, BAL.pPow) * (perk('aligned') ? 1.5 : 1));
  // Tövsiye eşiği: ilk eğitimde 5 parametre, sonra mevcut parametrelerin en az yarısı kadar kazanç (en az 5).
  const recGain = () => Math.max(5, Math.ceil(state.params * 0.5));
  const prestRec = () => !state.ch && gain() >= recGain();
  const lossAt = q => 0.35 + 3.8 * Math.exp(-q / 3.2);
  const qNow = () => Math.min(21, Math.log10(1 + state.life));
  function tierIdx() { let idx = 0; for (let i = 0; i < TIERS.length; i++) { if (state.run >= TIERS[i].at) idx = i; else break; } return idx; }

  const evCost = () => (evIs('gpu') ? 1.25 : 1) * labM('cost', 1) * (chWon('gpu') ? 0.9 : 1);
  const costFor = (i, n) => Math.ceil(G[i].c * evCost() * Math.pow(BAL.growth, state.gen[i]) * (Math.pow(BAL.growth, n) - 1) / (BAL.growth - 1));
  function maxAff(i) {
    const c0 = G[i].c * evCost() * Math.pow(BAL.growth, state.gen[i]);
    let n = Math.floor(Math.log(1 + state.data * (BAL.growth - 1) / c0) / Math.log(BAL.growth));
    if (!isFinite(n) || n < 0) n = 0;
    n = Math.min(n, 500);
    while (n > 0 && costFor(i, n) > state.data) n--;
    return n;
  }
  function planBuy(i) {
    if (state.buyMode === 'next') {
      const k = nextMileIdx(state.gen[i]), goal = k >= 0 ? BAL.miles[k] : (Math.floor(state.gen[i] / 100) + 1) * 100;
      const want = goal - state.gen[i], cost = costFor(i, want);
      return { n: want, cost: cost, can: cost <= state.data };
    }
    const n = state.buyMode === 'max' ? maxAff(i) : state.buyMode;
    const show = n > 0 ? n : 1, cost = costFor(i, show);
    return { n: show, cost: cost, can: n > 0 && cost <= state.data };
  }
  const upCost = u => Math.ceil(u.cost * (perk('opensrc') ? 0.75 : 1));
  const neuronCost = () => Math.ceil(BAL.nBase * Math.pow(BAL.nGrowth, state.nBought) * (state.upg.n0 ? 0.75 : 1) * (perk('seize') ? 0.6 : 1) * labM('ncost', 1));
  const genOpen = i => i === 0 || state.gen[i - 1] > 0 || state.gen[i] > 0;
  const genBuyable = i => genOpen(i) && !(chIs('gpu') && i >= 5);
  const autoBuyOpen = () => state.runs >= 1 || state.tek > 0 || !!state.tree.abuy;
  const autoMergeOpen = () => state.runs >= 3 || state.tek > 0 || !!state.tree.amerge;

  /* ---------- Enerji tasarrufu ---------- */
  let batteryLow = false;
  const eco = () => state.opt.eco === null ? (reduceMotion || batteryLow) : state.opt.eco;
  function applyEco() {
    document.body.classList.toggle('eco', eco());
    restartTick();
  }

  /* ---------- Ses ve titreşim ---------- */
  const Snd = {
    ctx: null, lastTap: 0,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { this.ctx = null; }
      if (this.ctx) setTimeout(syncMusic, 0);
    },
    tone(f, dur, type, vol, delay, slide) {
      const c = this.ctx;
      if (!c || !state.opt.sound) return;
      if (c.state === 'suspended') c.resume();
      const t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.06, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    },
    tap(c) { const n = performance.now(); if (n - this.lastTap < 45) return; this.lastTap = n; this.tone(440 + 380 * c + Math.random() * 80, 0.07, 'triangle', 0.05, 0, 1.6); },
    crit() { this.tone(988, 0.08, 'square', 0.035); this.tone(1480, 0.18, 'triangle', 0.06, 0.06, 1.2); },
    buy() { this.tone(620, 0.08, 'triangle', 0.06); this.tone(930, 0.12, 'triangle', 0.06, 0.07); },
    merge(l) { const b = 330 * Math.pow(1.12, l); [1, 1.26, 1.5].forEach((m, i) => this.tone(b * m, 0.12, 'triangle', 0.06, i * 0.06)); },
    syn() { this.tone(520, 0.2, 'sine', 0.05, 0, 1.5); },
    nope() { this.tone(220, 0.1, 'square', 0.025, 0, 0.8); },
    packet() { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'sine', 0.05, i * 0.05)); },
    ach() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.06, i * 0.08)); },
    tier() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, i * 0.07)); },
    evil() { [196, 185, 147].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.03, i * 0.12)); },
    virus() { this.tone(160, 0.3, 'sawtooth', 0.03, 0, 0.6); },
    turbo() { this.tone(200, 0.45, 'sawtooth', 0.03, 0, 4); },
    click() { this.tone(660, 0.05, 'triangle', 0.05); }
  };
  function buzz(p) { if (state.opt.haptic && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* desteklenmiyor */ } } }
