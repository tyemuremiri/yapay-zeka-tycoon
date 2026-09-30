
  /* ---------- Kayıt ---------- */
  // state.last yalnızca üretim hesabının saati: kayıt onu ASLA ilerletmez (yoksa arka planda kayıt, çevrimdışı kazancı silerdi).
  let saveFailShown = false, backupAt = 0;
  function save() {
    try {
      const raw = JSON.stringify(state);
      if (Date.now() - backupAt > 300000) {
        backupAt = Date.now();
        const prev = localStorage.getItem(KEY);
        if (prev) localStorage.setItem(KEY + '-yedek', prev);
      }
      localStorage.setItem(KEY, raw);
      saveFailShown = false;
      return true;
    } catch (e) {
      if (!saveFailShown) { saveFailShown = true; toast(t('save.fail')); }
      return false;
    }
  }
  // Yükleme ya tamamen olur ya hiç olmaz: hata çıkarsa eski durum geri konur.
  function loadFrom(raw) {
    const before = JSON.stringify(state);
    const ok = loadInto(raw);
    if (!ok) { const b = JSON.parse(before); Object.keys(state).forEach(k => { delete state[k]; }); Object.assign(state, b); brainDirty(); }
    return ok;
  }
  function loadInto(raw) {
    try {
      const o = JSON.parse(raw);
      // Yalnız gerçek bir oyun kaydı kabul edilir; '{}', '[]' ya da eksik alanlı metin mevcut oyunu silmez.
      if (!o || typeof o !== 'object' || Array.isArray(o) || (o.ver != null && typeof o.ver !== 'number')) return false;
      if (!Array.isArray(o.gen) || o.gen.length < 1 || typeof o.data !== 'number' || !Array.isArray(o.neurons) || !o.neurons.length) return false;
      // Temiz bir durumdan başla: önceki oyundan yükseltme/başarım vb. sızmasın (cihaz ayarları korunur).
      const keepOpt = Object.assign({}, state.opt);
      Object.keys(state).forEach(k => { delete state[k]; });
      Object.assign(state, defaults());
      state.opt = keepOpt;
      const num = (v, d) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);
      ['data', 'run', 'life', 'clicks', 'runs', 'merges', 'synMade', 'crits', 'comboTop', 'viruses', 'bestTier', 'nBought', 'turboUntil', 'turboReadyAt',
        'played', 'packets', 'turbos', 'upgBought', 'taskClaims', 'perfectDays', 'pendingOff',
        'bilinc', 'tek', 'medals', 'mgReadyAt', 'mgBest', 'mgPlays', 'halluLeft', 'inspireUntil', 'quizOk', 'chips', 'missions']
        .forEach(k => { state[k] = num(o[k], 0); });
      state.params = Math.floor(num(o.params, 0));
      state.maxLvEver = Math.max(1, num(o.maxLvEver, 1));
      state.last = num(o.last, Date.now());
      state.karma = typeof o.karma === 'number' && isFinite(o.karma) ? Math.max(-7, Math.min(7, o.karma)) : 0;
      if (Array.isArray(o.gen)) G.forEach((_, i) => { state.gen[i] = Math.floor(num(o.gen[i], 0)); });
      if (o.upg && typeof o.upg === 'object') UP.forEach(u => { if (o.upg[u.id]) state.upg[u.id] = true; });
      if (o.ach && typeof o.ach === 'object') ACH.forEach(a => { if (o.ach[a.id]) state.ach[a.id] = true; });
      if (o.seen && typeof o.seen === 'object') state.seen = Object.assign({}, o.seen);
      if (o.choices && typeof o.choices === 'object') { state.choices = {}; Object.keys(o.choices).forEach(k => { if (o.choices[k] === 'f' || o.choices[k] === 'h') state.choices[k] = o.choices[k]; }); }
      const total = REG.reduce((a, r) => a + r.k, 0);
      if (Array.isArray(o.neurons)) {
        const used = {};
        state.neurons = o.neurons.filter(n => n && Number.isInteger(n.s) && n.s >= 0 && n.s < total && !used[n.s] && (used[n.s] = true))
          .map(n => ({ s: n.s, l: Math.max(1, Math.min(30, Math.floor(num(n.l, 1)))) }));
        if (!state.neurons.length) state.neurons = [{ s: 0, l: 1 }];
      }
      if (Array.isArray(o.syn)) state.syn = o.syn.filter(p => Array.isArray(p) && p.length === 2 && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] !== p[1]);
      if (o.daily && typeof o.daily === 'object' && o.daily.v === 2 && Array.isArray(o.daily.tasks)) state.daily = o.daily;
      if (o.kasa && typeof o.kasa === 'object') KASA.forEach(k => { const v = Math.floor(num(o.kasa[k.id], 0)); if (v) state.kasa[k.id] = Math.min(k.max, v); });
      if (typeof o.cos === 'string' && COSTUMES[o.cos]) state.cos = o.cos;
      ['storySeen', 'endings', 'langsSeen'].forEach(k => { if (o[k] && typeof o[k] === 'object') state[k] = Object.assign({}, o[k]); });
      state.feedLang = typeof o.feedLang === 'string' ? o.feedLang : '';
      if (Array.isArray(o.feed)) state.feed = o.feed.filter(x => x && Number.isInteger(x.i) && x.i >= 0).slice(0, 20)
        .map(x => ({ i: x.i, at: num(x.at, Date.now()), b: typeof x.b === 'string' ? x.b : null, liked: !!x.liked, v: typeof x.v === 'object' && x.v ? x.v : null }));
      if (o.mission && typeof o.mission === 'object' && typeof o.mission.k === 'string') state.mission = { k: o.mission.k, until: num(o.mission.until, 0) };
      state.buffs = {};
      if (o.buffs && typeof o.buffs === 'object') Object.keys(BUFFS).forEach(k => { const v = num(o.buffs[k], 0); if (v) state.buffs[k] = v; });
      else if (o.news && typeof o.news === 'object' && BUFFS[o.news.k]) state.buffs[o.news.k] = num(o.news.until, 0);
      if (o.tree && typeof o.tree === 'object') TREE.forEach(n => { if (o.tree[n.id]) state.tree[n.id] = 1; });
      // Sürüm 5'te harcanan Bilinç bonusu düşürüyordu: toplam kazanılan Bilinç = kalan + ağaçta harcanan.
      state.bilincAll = typeof o.bilincAll === 'number' ? num(o.bilincAll, 0) : state.bilinc + TREE.reduce((a, n) => a + (state.tree[n.id] ? n.c : 0), 0);
      state.perm2x = o.perm2x === true;
      state.refs = Math.floor(num(o.refs, 0)); state.projDone = Math.floor(num(o.projDone, 0)); state.projSkipAt = num(o.projSkipAt, 0);
      if (o.projStory && typeof o.projStory === 'object') state.projStory = Object.assign({}, o.projStory);
      if (o.proj && typeof o.proj === 'object' && PROJ_BY[o.proj.id] && (o.proj.a === 0 || o.proj.a === 1)) state.proj = { id: o.proj.id, a: o.proj.a, until: num(o.proj.until, 0), q: Math.max(1, Math.min(3, Math.floor(num(o.proj.q, 1)))) };
      if (o.projOffer && typeof o.projOffer === 'object' && PROJ_BY[o.projOffer.id]) state.projOffer = { id: o.projOffer.id };
      if (o.auto && typeof o.auto === 'object') {
        state.auto.buy = o.auto.buy !== false; state.auto.merge = o.auto.merge !== false; state.auto.protect = o.auto.protect !== false;
        state.auto.mode = ['eff', 'mile', 'sel'].indexOf(o.auto.mode) >= 0 ? o.auto.mode : 'eff';
        state.auto.sel = Math.max(0, Math.min(G.length - 1, Math.floor(num(o.auto.sel, 0))));
      }
      if (o.chDone && typeof o.chDone === 'object') CHAL.forEach(c => { if (o.chDone[c.id]) state.chDone[c.id] = 1; });
      if (o.ch && typeof o.ch === 'object' && CHAL_BY[o.ch.id] && o.chSaved && typeof o.chSaved === 'object') { state.ch = { id: o.ch.id }; state.chSaved = o.chSaved; }
      if (o.skins && typeof o.skins === 'object') SKINS.forEach(k => { if (o.skins[k]) state.skins[k] = 1; });
      if (typeof o.skin === 'string' && state.skins[o.skin]) state.skin = o.skin;
      if (o.ev && typeof o.ev === 'object' && typeof o.ev.wk === 'number') state.ev = { wk: o.ev.wk, pts: num(o.ev.pts, 0), got: Math.min(3, Math.floor(num(o.ev.got, 0))), join: o.ev.join === true };
      if (o.opt && typeof o.opt === 'object') {
        state.opt.sound = o.opt.sound !== false;
        state.opt.haptic = o.opt.haptic !== false;
        state.opt.eco = typeof o.opt.eco === 'boolean' ? o.opt.eco : null;
        state.opt.sci = o.opt.sci === true;
        state.opt.music = o.opt.music !== false;
        state.opt.tab = ['gen', 'up', 'proj', 'goal', 'model'].indexOf(o.opt.tab) >= 0 ? o.opt.tab : 'gen';
        state.opt.msub = ['train', 'kasa', 'stats'].indexOf(o.opt.msub) >= 0 ? o.opt.msub : 'train';
        state.opt.lang = LANG_IDS.indexOf(o.opt.lang) >= 0 ? o.opt.lang : null;
        state.opt.theme = ['auto', 'dark', 'light'].indexOf(o.opt.theme) >= 0 ? o.opt.theme : 'auto';
      }
      state.buyMode = [10, 25, 100, 'max', 'next'].indexOf(o.buyMode) >= 0 ? o.buyMode : 1;
      brainDirty();
      return true;
    } catch (e) { return false; }
  }
  function load() {
    let raw = null, bak = null;
    try { raw = localStorage.getItem(KEY); bak = localStorage.getItem(KEY + '-yedek'); } catch (e) { return false; }
    if (raw && loadFrom(raw)) return true;
    if (bak && loadFrom(bak)) { setTimeout(() => toast(t('save.bak')), 1500); return true; }
    return false;
  }

  /* ---------- Bildirim ve Nöro ---------- */
  let toastTimer = 0;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  const bot = $('bot'), bubble = $('bubble');
  let moodTimer = 0, mood = 'happy', lastAct = Date.now(), bubbleTimer = 0;
  function setMood(m) {
    mood = m;
    bot.classList.remove('mood-wow', 'mood-sleep');
    if (m !== 'happy') { void bot.getBoundingClientRect(); bot.classList.add('mood-' + m); }
  }
  let lastSayAt = 0, nextQuip = Date.now() + 70000;
  // Konuşma balonu: dokunana kadar (en fazla 30 sn) kalır. Önemli mesajlar sıraya girer, sohbet (prio 0) önemli mesajı ezmez.
  const bubbleTxt = $('bubbleTxt'), bubbleMore = $('bubbleMore');
  const sayQ = [];
  let cur = null;
  function showMsg(m) {
    cur = m; m.at = Date.now();
    setText(bubbleTxt, m.text);
    bubble.classList.remove('gone');
    syncMore();
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(nextMsg, 30000);
  }
  function nextMsg() {
    clearTimeout(bubbleTimer);
    // Sırada 2 dakikadan uzun bekleyen sıradan mesajlar artık bayat: atlanır.
    while (sayQ.length && sayQ[0].prio < 2 && Date.now() - sayQ[0].q > 120000) sayQ.shift();
    if (sayQ.length) { showMsg(sayQ.shift()); return; }
    cur = null;
    bubble.classList.add('gone');
    syncMore();
  }
  function syncMore() { setText(bubbleMore, sayQ.length ? '▸ ' + sayQ.length : ''); }
  function clearSay() { sayQ.length = 0; nextMsg(); }
  function say(text, m, hold, prio) {
    if (prio == null) prio = 1;
    lastSayAt = Date.now();
    const msg = { text: text, prio: prio, q: Date.now() };
    if (!cur || prio >= 2 && cur.prio < 2 || cur.prio === 0 || prio === 3) showMsg(msg);
    else if (prio > 0 && cur.text !== text && !sayQ.some(x => x.text === text)) { sayQ.push(msg); if (sayQ.length > 6) sayQ.shift(); syncMore(); }
    else if (prio > 0) return;
    else return;
    setMood(m || 'happy');
    clearTimeout(moodTimer);
    if (m && m !== 'happy') moodTimer = setTimeout(() => setMood('happy'), hold || 2500);
  }
  bubble.addEventListener('click', () => { Snd.init(); Snd.click(); nextMsg(); });
  // Karaktere göre konuşma: anahtar + '.f' / '.n' / '.h'
  const sayA = (k, v, m, hold) => say(t(k + '.' + alignment(), v), m, hold);
  function syncAlignLook() {
    const a = alignment();
    bot.classList.toggle('evil', a === 'h');
    bot.classList.toggle('kind', a === 'f');
    document.body.classList.toggle('darkai', a === 'h');
    document.body.classList.toggle('lightai', a === 'f');
    const chip = $('alignChip');
    chip.className = 'chip align-' + a;
    setText(chip, t('align.' + a));
  }
  function blinkLoop() {
    setTimeout(() => {
      if (!document.hidden && !eco() && mood === 'happy') {
        bot.classList.add('blink');
        setTimeout(() => bot.classList.remove('blink'), 140);
      }
      blinkLoop();
    }, 2800 + Math.random() * 3500);
  }
  let factIdx = Math.floor(Math.random() * 9);
  $('mascot').addEventListener('click', () => {
    Snd.init();
    touchAct();
    factIdx++;
    if (sayQ.length) { nextMsg(); return; }
    const Q = TX().quips, pool = Q[alignment()].concat(Q.n), F = TX().facts;
    say(factIdx % 2 ? F[factIdx % F.length] : pick(pool), 'wow', 1800, 3);
    Snd.tone(700, 0.08, 'sine', 0.05, 0, 1.4);
  });
  function touchAct() {
    lastAct = Date.now();
    if (mood === 'sleep') say(t('nero.wake'), 'wow', 1500, 0);
  }

  /* ---------- Beyin sahnesi (canvas) ---------- */
  const canvas = $('brain'), ctx = canvas.getContext('2d');
  const B = { w: 0, h: 0, dpr: 1, box: null, slots: [], nr: 10, sig: '', stat: null, adj: {}, path: null };
  const col = {};
  const pulses = [], pops = [], flashes = new Map();
  let viruses = [];
  let raf = 0, lastFrame = 0, drag = null;
  const OUT = [[0.06, 0.50], [0.07, 0.36], [0.13, 0.22], [0.25, 0.11], [0.40, 0.05], [0.56, 0.04], [0.71, 0.08], [0.84, 0.17], [0.93, 0.30], [0.96, 0.44], [0.93, 0.57],
    [0.87, 0.65], [0.87, 0.76], [0.81, 0.87], [0.70, 0.92], [0.62, 0.87], [0.59, 0.93], [0.57, 1.0], [0.49, 1.0], [0.49, 0.89], [0.41, 0.83], [0.27, 0.81], [0.16, 0.75], [0.09, 0.64]];
  const LVCOL = ['sun', 'teal', 'sky', 'grape', 'coral', 'pink', 'lime'];
  const lvColor = l => col[LVCOL[(l - 1) % LVCOL.length]];

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    ['ink', 'edge', 'sun', 'teal', 'sky', 'grape', 'coral', 'pink', 'lime', 'fg', 'surface', 'muted', 'brain', 'brain-f', 'brain-h', 'brain-line', 'virus', 'on', 'glow', 'bg']
      .forEach(k => { col[k] = cs.getPropertyValue('--' + k).trim(); });
    col.dark = cs.getPropertyValue('--is-dark').trim() === '1';
    col.font = cs.getPropertyValue('--display').trim() || 'sans-serif';
    col.body = cs.getPropertyValue('--body').trim() || 'sans-serif';
  }
  function layoutBrain(force) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, eco() ? 1.5 : 2);
    const sig = w + 'x' + h + '|' + dpr;
    if (!force && sig === B.sig) return;
    if (B.w !== w || B.h !== h || B.dpr !== dpr) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    B.sig = sig; B.w = w; B.h = h; B.dpr = dpr;
    const aspect = 1.3;
    let bw = w - 24, bh = bw / aspect;
    if (bh > h - 20) { bh = h - 20; bw = bh * aspect; }
    // Kamera: başta çekirdeğe yakın ve iri, beyin büyüdükçe uzaklaşır (B.cam tween ile yumuşak geçer).
    const c = B.cam || (B.cam = camFor(tierIdx()));
    bw *= c.z; bh *= c.z;
    B.box = { x: w / 2 - c.fx * bw, y: h / 2 + 2 - c.fy * bh, w: bw, h: bh };
    B.slots = [];
    REG.forEach((r, ri) => {
      for (let k = 0; k < r.k; k++) {
        const a = k * 2.39996 + ri * 0.7, rad = r.R * Math.sqrt((k + 0.5) / r.k) * B.box.w;
        B.slots.push({ x: B.box.x + r.x * B.box.w + Math.cos(a) * rad, y: B.box.y + r.y * B.box.h + Math.sin(a) * rad, ri: ri });
      }
    });
    B.nr = Math.max(7, Math.min(19, B.box.w * 0.024));
    B.path = new Path2D();
    const P = OUT.map(p => [B.box.x + p[0] * B.box.w, B.box.y + p[1] * B.box.h]);
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(P[P.length - 1], P[0]);
    B.path.moveTo(m0[0], m0[1]);
    for (let i = 0; i < P.length; i++) { const m = mid(P[i], P[(i + 1) % P.length]); B.path.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); }
    B.path.closePath();
    rebuild();
  }
  const CAMZ = [1.75, 1.45, 1.2, 1.08, 1, 1, 1, 1];
  function camFor(tier) {
    const z = CAMZ[Math.min(tier, 7)], upto = Math.min(REG.length - 1, tier + 1);
    let fx = 0, fy = 0;
    for (let i = 0; i <= upto; i++) { fx += REG[i].x; fy += REG[i].y; }
    fx /= upto + 1; fy /= upto + 1;
    const k = Math.min(1, (z - 1) / 1.1);
    return { z: z, fx: 0.5 + (fx - 0.5) * k, fy: 0.5 + (fy - 0.5) * k };
  }
  let camRaf = 0;
  function camStep() {
    camRaf = 0;
    const tg = camFor(tierIdx()), c = B.cam;
    if (!c) return;
    const done = Math.abs(c.z - tg.z) < 0.004 && Math.abs(c.fx - tg.fx) < 0.002 && Math.abs(c.fy - tg.fy) < 0.002;
    if (done || eco() || document.hidden) { B.cam = tg; layoutBrain(true); return; }
    c.z += (tg.z - c.z) * 0.14; c.fx += (tg.fx - c.fx) * 0.14; c.fy += (tg.fy - c.fy) * 0.14;
    layoutBrain(true);
    camRaf = requestAnimationFrame(camStep);
  }
  function camCheck() {
    if (camRaf || !B.cam) return;
    const tg = camFor(tierIdx());
    if (Math.abs(B.cam.z - tg.z) > 0.004 || Math.abs(B.cam.fx - tg.fx) > 0.002 || Math.abs(B.cam.fy - tg.fy) > 0.002) camRaf = requestAnimationFrame(camStep);
  }
  const nRad = l => B.nr * (0.85 + 0.06 * Math.min(l, 9));
  function brainTint() { const a = alignment(); return a === 'f' ? col['brain-f'] : a === 'h' ? col['brain-h'] : col['brain-line']; }
  // Statik katman (beyin silueti, bölgeler, bağlar, nöronlar) yalnız değişince çizilir; animasyonlar üstüne biner.
  function rebuild() {
    if (!B.box) return;
    brainDirty();
    const s = B.stat || (B.stat = document.createElement('canvas'));
    s.width = canvas.width; s.height = canvas.height;
    const g = s.getContext('2d');
    g.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    g.clearRect(0, 0, B.w, B.h);
    const bx = B.box, tier = tierIdx(), line = brainTint();
    // Siluet: koyu dolgu + parlayan kontur
    g.fillStyle = col.brain; g.globalAlpha = col.dark ? 0.55 : 0.9; g.fill(B.path); g.globalAlpha = 1;
    g.save();
    if (col.dark && !eco()) { g.shadowColor = line; g.shadowBlur = 14; }
    g.lineWidth = 1.6 + Math.min(tier, 7) * 0.2; g.strokeStyle = line; g.stroke(B.path);
    g.restore();
    // Kıvrımlar
    g.save(); g.clip(B.path);
    g.lineCap = 'round'; g.lineWidth = 1.5; g.strokeStyle = line; g.globalAlpha = 0.28;
    const L = (pts) => { g.beginPath(); g.moveTo(bx.x + pts[0] * bx.w, bx.y + pts[1] * bx.h); for (let i = 2; i < pts.length; i += 4) g.quadraticCurveTo(bx.x + pts[i] * bx.w, bx.y + pts[i + 1] * bx.h, bx.x + pts[i + 2] * bx.w, bx.y + pts[i + 3] * bx.h); g.stroke(); };
    L([0.20, 0.66, 0.36, 0.52, 0.60, 0.53]);
    L([0.53, 0.05, 0.47, 0.25, 0.49, 0.42]);
    L([0.12, 0.30, 0.20, 0.24, 0.30, 0.28]);
    L([0.70, 0.12, 0.76, 0.24, 0.72, 0.36]);
    L([0.84, 0.50, 0.76, 0.56, 0.80, 0.64]);
    L([0.66, 0.80, 0.73, 0.84, 0.80, 0.80]);
    g.restore();
    g.globalAlpha = 1;
    stageDeco(g, bx, tier, line);
    // Açık bölgeler ve sıradaki kilitli bölge
    REG.forEach((r, ri) => {
      const cx = bx.x + r.x * bx.w, cy = bx.y + r.y * bx.h, R = r.R * bx.w + B.nr * 0.9;
      if (ri <= tier) {
        g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.fillStyle = line; g.globalAlpha = 0.08; g.fill(); g.globalAlpha = 1;
      } else if (ri === tier + 1) {
        g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.setLineDash([3, 5]); g.lineWidth = 1.5; g.strokeStyle = col.muted; g.stroke(); g.setLineDash([]);
        g.font = '600 10px ' + col.body; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col.muted;
        g.fillText(t('brain.locked'), cx, cy - 7); g.fillText(TX().tiersShort[ri], cx, cy + 7);
      }
    });
    // Boş yuvalar
    B.slots.forEach((p, i) => {
      if (p.ri > tier || neuronAt(i)) return;
      g.fillStyle = col.muted; g.globalAlpha = 0.5; g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); g.globalAlpha = 1;
    });
    // Dendritler: her nöron en yakın 2 komşusuna
    B.adj = {};
    const ns = state.neurons;
    const link = (a, b) => { (B.adj[a] = B.adj[a] || []).indexOf(b) < 0 && B.adj[a].push(b); (B.adj[b] = B.adj[b] || []).indexOf(a) < 0 && B.adj[b].push(a); };
    ns.forEach(n => {
      const p = B.slots[n.s];
      ns.filter(m => m !== n).map(m => ({ m: m, d: Math.hypot(B.slots[m.s].x - p.x, B.slots[m.s].y - p.y) }))
        .sort((a, b) => a.d - b.d).slice(0, 2).forEach(o => link(n.s, o.m.s));
    });
    g.lineCap = 'round'; g.lineWidth = 1.2; g.strokeStyle = col.edge;
    g.beginPath();
    Object.keys(B.adj).forEach(a => B.adj[a].forEach(b => { if (+a < b) { g.moveTo(B.slots[a].x, B.slots[a].y); g.lineTo(B.slots[b].x, B.slots[b].y); } }));
    g.stroke();
    // Sinapslar
    state.syn.forEach(pr => {
      const a = neuronAt(pr[0]), b = neuronAt(pr[1]);
      if (!a || !b) return;
      link(a.s, b.s);
      const A = B.slots[a.s], Bp = B.slots[b.s];
      g.save();
      if (col.dark && !eco()) { g.shadowColor = a.l === b.l ? col.sun : col.grape; g.shadowBlur = 8; }
      g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(Bp.x, Bp.y);
      g.lineWidth = 3; g.strokeStyle = a.l === b.l ? col.sun : col.grape; g.stroke();
      g.restore();
    });
    // Nöronlar
    ns.forEach(n => drawNeuron(g, B.slots[n.s].x, B.slots[n.s].y, n.l, 1));
    render(performance.now());
    camCheck();
  }
  // Her model aşaması beyne görünür bir iz ekler (statik katmanda, pil dostu).
  function stageDeco(g, bx, tier, line) {
    const RC = i => [bx.x + REG[i].x * bx.w, bx.y + REG[i].y * bx.h, REG[i].R * bx.w];
    g.save();
    if (tier >= 2) { // Evrişim: görme korteksinde çekirdek ızgarası
      const [cx, cy, R] = RC(2), k = R * 0.42;
      g.strokeStyle = col.sky; g.globalAlpha = 0.35; g.lineWidth = 1;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) g.strokeRect(cx + i * k - k / 2 + R * 1.25, cy + j * k - k / 2 - R * 0.9, k * 0.9, k * 0.9);
    }
    if (tier >= 3) { // LSTM: hafızada kapalı döngüler
      const [cx, cy, R] = RC(3);
      g.strokeStyle = col.grape; g.globalAlpha = 0.4; g.lineWidth = 1.5; g.setLineDash([2, 4]);
      [1.35, 1.7].forEach(m => { g.beginPath(); g.arc(cx, cy, R * m + B.nr, 0.3, 5.9); g.stroke(); });
      g.setLineDash([]);
    }
    if (tier >= 4) { // Transformer: bölgeler arası dikkat yayları
      const n = Math.min(tier, REG.length - 1);
      g.strokeStyle = col.sun; g.globalAlpha = 0.22; g.lineWidth = 1.2;
      for (let i = 0; i <= n; i++) for (let j = i + 1; j <= n; j++) {
        const a = RC(i), b = RC(j), mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - bx.h * 0.12;
        g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(mx, my, b[0], b[1]); g.stroke();
      }
    }
    if (tier >= 5) { // Dil modeli: dil merkezinde harfler
      const [cx, cy, R] = RC(5), gl = ['a', 'ə', 'Я', 'ß', 'ñ', 'ع', 'ğ'];
      g.fillStyle = col.teal; g.globalAlpha = 0.5; g.font = '700 ' + Math.round(B.nr * 0.9) + 'px ' + col.font; g.textAlign = 'center'; g.textBaseline = 'middle';
      gl.forEach((ch, i) => { const a = i / gl.length * 6.283 + 0.4; g.fillText(ch, cx + Math.cos(a) * (R + B.nr * 2.2), cy + Math.sin(a) * (R + B.nr * 2.2) * 0.7); });
    }
    if (tier >= 6) { // Çok modlu: siluet çevresinde duyu noktaları
      g.fillStyle = col.pink; g.globalAlpha = 0.6;
      OUT.forEach((p, i) => { if (i % 2) return; const x = bx.x + (0.5 + (p[0] - 0.5) * 1.07) * bx.w, y = bx.y + (0.5 + (p[1] - 0.5) * 1.07) * bx.h; g.beginPath(); g.arc(x, y, 2.2, 0, 6.2832); g.fill(); });
    }
    if (tier >= 7) { // YGZ: ikinci, parlak kabuk
      g.globalAlpha = 0.5; g.lineWidth = 1.5; g.strokeStyle = line;
      if (col.dark && !eco()) { g.shadowColor = line; g.shadowBlur = 18; }
      g.translate(bx.x + bx.w / 2, bx.y + bx.h / 2); g.scale(1.06, 1.06); g.translate(-(bx.x + bx.w / 2), -(bx.y + bx.h / 2));
      g.stroke(B.path);
    }
    g.restore();
    g.globalAlpha = 1;
  }
  function drawNeuron(g, x, y, l, scale) {
    const r = nRad(l) * scale, c = lvColor(l);
    g.save();
    if (col.dark && !eco()) { g.shadowColor = c; g.shadowBlur = 10; }
    g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fillStyle = col.bg; g.fill();
    g.lineWidth = 2; g.strokeStyle = c; g.stroke();
    g.restore();
    g.beginPath(); g.arc(x, y, r * 0.62, 0, 6.2832); g.fillStyle = c; g.globalAlpha = 0.9; g.fill(); g.globalAlpha = 1;
    if (l > LVCOL.length) { g.beginPath(); g.arc(x, y, r + 3, 0, 6.2832); g.lineWidth = 1; g.strokeStyle = c; g.stroke(); }
    g.fillStyle = col.bg; g.font = '700 ' + Math.round(r * 0.95) + 'px ' + col.font;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(l), x, y + r * 0.06);
  }
  function fire(slot, color) {
    if (!B.slots[slot] || pulses.length > 24) return;
    const now = performance.now(), ms = 170, a = B.slots[slot];
    const n1 = (B.adj[slot] || []).slice().sort(() => Math.random() - 0.5).slice(0, 3);
    n1.forEach(s1 => {
      const b = B.slots[s1];
      pulses.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, t0: now, ms: ms, col: color, to: s1 });
      const n2 = (B.adj[s1] || []).filter(x => x !== slot);
      if (n2.length) {
        const s2 = n2[Math.floor(Math.random() * n2.length)], c = B.slots[s2];
        pulses.push({ ax: b.x, ay: b.y, bx: c.x, by: c.y, t0: now + ms, ms: ms, col: color, to: s2 });
      }
    });
    flashes.set(slot, now);
    wake();
  }
  function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const minDt = eco() ? 48 : 31; // ~20 / ~30 kare/sn üst sınır
    if (now - lastFrame < minDt) { raf = requestAnimationFrame(frame); return; }
    lastFrame = now;
    if (render(now)) raf = requestAnimationFrame(frame);
  }
  function render(now) {
    if (!B.stat || !B.w) return false;
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(B.stat, 0, 0);
    g.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    g.lineCap = 'round';
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i], tt = (now - p.t0) / p.ms;
      if (tt < 0) continue;
      if (tt >= 1) { flashes.set(p.to, now); pulses.splice(i, 1); continue; }
      const x = p.ax + (p.bx - p.ax) * tt, y = p.ay + (p.by - p.ay) * tt;
      g.lineWidth = 2.5; g.strokeStyle = col[p.col];
      g.beginPath(); g.moveTo(p.ax, p.ay); g.lineTo(x, y); g.stroke();
      g.beginPath(); g.arc(x, y, 3.5, 0, 6.2832); g.fillStyle = col.fg; g.fill();
    }
    flashes.forEach((t0, slot) => {
      const tt = Math.max(0, now - t0) / 300, n = neuronAt(slot), p = B.slots[slot];
      if (tt >= 1 || !n || !p) { flashes.delete(slot); return; }
      const e = 1 - tt;
      drawNeuron(g, p.x, p.y, n.l, 1 + 0.25 * e);
      g.globalAlpha = e * 0.8;
      g.beginPath(); g.arc(p.x, p.y, nRad(n.l) * (1.2 + tt * 1.2), 0, 6.2832); g.lineWidth = 2; g.strokeStyle = col.teal; g.stroke();
      g.globalAlpha = 1;
    });
    if (mg) { mgStep(now); if (mg) drawMg(g, now); }
    viruses.forEach(v => {
      const wob = eco() ? 0 : Math.sin(now / 90) * 2;
      const r = 13 + wob, left = Math.max(0, 1 - (Date.now() - v.born) / v.life);
      g.beginPath();
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.2832 + now / 700, rr = k % 2 ? r : r + 6; g.lineTo(v.x + Math.cos(a) * rr, v.y + Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = col.virus; g.fill(); g.lineWidth = 1.5; g.strokeStyle = col.fg; g.stroke();
      g.fillStyle = col.bg; g.beginPath(); g.arc(v.x - 4, v.y - 2, 2.6, 0, 6.2832); g.arc(v.x + 4, v.y - 2, 2.6, 0, 6.2832); g.fill();
      g.beginPath(); g.arc(v.x, v.y, r + 11, -1.5708, -1.5708 + left * 6.2832); g.lineWidth = 2; g.strokeStyle = col.virus; g.stroke();
    });
    if (edit.mode) [edit.a, edit.b].forEach((s, k) => {
      const n = s != null ? neuronAt(s) : null, p = n && B.slots[s];
      if (!p) return;
      g.setLineDash([4, 3]); g.lineWidth = 2.5; g.strokeStyle = k ? col.grape : col.coral;
      g.beginPath(); g.arc(p.x, p.y, nRad(n.l) + 7, 0, 6.2832); g.stroke(); g.setLineDash([]);
    });
    if (drag && drag.active) {
      const a = B.slots[drag.from.s];
      g.setLineDash([6, 6]); g.lineWidth = 2; g.strokeStyle = col.fg;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(drag.x, drag.y); g.stroke(); g.setLineDash([]);
      const tg = hitNeuron(drag.x, drag.y);
      if (tg && tg !== drag.from) {
        const p = B.slots[tg.s], same = tg.l === drag.from.l;
        g.beginPath(); g.arc(p.x, p.y, nRad(tg.l) + 7, 0, 6.2832); g.lineWidth = 2.5; g.strokeStyle = same ? col.sun : col.grape; g.stroke();
        label(g, same ? t('brain.mergeTo', { n: tg.l + 1 }) : synLabel(drag.from, tg), p.x, p.y - nRad(tg.l) - 16);
      }
      drawNeuron(g, drag.x, drag.y, drag.from.l, 0.8);
    }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i], tt = Math.max(0, now - p.t0) / (p.big ? 1000 : 750);
      if (tt >= 1) { pops.splice(i, 1); continue; }
      const y = p.y - (p.big ? 56 : 42) * tt;
      g.font = '700 ' + (p.big ? 20 : 15) + 'px ' + col.font;
      g.globalAlpha = tt < 0.7 ? 1 : (1 - tt) / 0.3;
      g.lineWidth = 4; g.strokeStyle = col.bg; g.strokeText(p.text, p.x, y);
      g.fillStyle = p.big ? col.sun : col.teal; g.fillText(p.text, p.x, y);
      g.globalAlpha = 1;
    }
    return !!mg || pulses.length > 0 || flashes.size > 0 || pops.length > 0 || (viruses.length > 0 && !eco()) || !!(drag && drag.active);
  }
  function label(g, text, x, y) {
    g.font = '600 12px ' + col.body;
    const w = g.measureText(text).width + 14;
    x = Math.max(w / 2 + 4, Math.min(B.w - w / 2 - 4, x));
    y = Math.max(14, y);
    g.fillStyle = col.surface; g.strokeStyle = col.teal; g.lineWidth = 1;
    g.beginPath(); g.rect(x - w / 2, y - 11, w, 22); g.fill(); g.stroke();
    g.fillStyle = col.fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 1);
  }
  const synKey = (a, b) => a < b ? [a, b] : [b, a];
  const synIndex = (a, b) => { const k = synKey(a, b); return state.syn.findIndex(p => p[0] === k[0] && p[1] === k[1]); };
  function synLabel(a, b) { return synIndex(a.s, b.s) >= 0 ? t('brain.synDel') : state.syn.length < synCap() ? t('brain.synAdd') : t('brain.synNone'); }
  function hitNeuron(x, y) {
    let best = null, bd = 1e9;
    state.neurons.forEach(n => { const p = B.slots[n.s]; if (!p) return; const d = Math.hypot(p.x - x, p.y - y); if (d < nRad(n.l) + 12 && d < bd) { bd = d; best = n; } });
    return best;
  }

  /* ---------- Dokunma, kombo, Aha! ---------- */
  const brainBtn = $('brainBtn'), brainWrap = $('brainWrap');
  let combo = 0, lastTapAt = 0;
  const comboX = () => 1 + (comboCap() - 1) * Math.min(1, combo / BAL.comboSteps);
  function collect(x, y, slot, auto) {
    const now = performance.now();
    if (!auto) {
      touchAct();
      combo = Math.min(BAL.comboSteps, combo + 1);
      lastTapAt = now;
      if (combo >= BAL.comboSteps && !state.comboTopRun) { state.comboTopRun = 1; state.comboTop = 1; }
    }
    const crit = Math.random() < critChance();
    let v = tapValue() * (auto ? 1 : comboX()), hallu = false;
    if (crit) v *= critMult();
    if (!auto && state.halluLeft > 0) {
      const HR = [0.1, 0.3, 1, 2, 5, 15];
      v *= HR[Math.floor(Math.random() * HR.length)];
      hallu = true;
      if (--state.halluLeft === 0) setTimeout(() => say(t('hallu.end'), 'happy'), 400);
    }
    if (!auto) evAdd('tap', 1);
    addData(v);
    tapAcc += v;
    state.clicks++;
    progress('tap', 1);
    if (crit) { state.crits++; progress('aha', 1); evAdd('aha', 1); }
    if (x == null) {
      const n = pick(state.neurons);
      slot = n.s; x = B.slots[n.s] ? B.slots[n.s].x : B.w / 2; y = B.slots[n.s] ? B.slots[n.s].y : B.h / 2;
    } else if (slot == null) {
      let bd = 1e9;
      state.neurons.forEach(n => { const p = B.slots[n.s]; if (!p) return; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; slot = n.s; } });
    }
    if (!auto || Math.random() < 0.34) fire(slot, crit ? 'coral' : auto ? 'grape' : 'teal');
    if (!auto && pops.length < 12) pops.push({ x: Math.max(34, Math.min(B.w - 34, x)), y: y - 8, text: (crit ? t('pop.aha') + ' +' : hallu ? '?! +' : '+') + fmt(v), t0: now, big: crit || hallu });
    wake();
    if (!auto) {
      if (crit) {
        Snd.crit(); buzz([12, 30, 25]);
        if (!eco() && !reduceMotion) { brainWrap.classList.remove('shake'); void brainWrap.offsetWidth; brainWrap.classList.add('shake'); }
        if (!state.seen.aha) { state.seen.aha = 1; say(t('tip.aha', { n: critMult() }), 'wow', 2000); }
      } else { Snd.tap(Math.min(1, combo / BAL.comboSteps)); buzz(8); }
      updateCombo();
      updateTop();
    }
  }
  function updateCombo() {
    const el = $('combo');
    el.hidden = combo < 3;
    if (el.hidden) return;
    setText($('comboX'), '×' + dec(comboX().toFixed(1)));
    $('comboBar').style.width = (Math.min(1, combo / BAL.comboSteps) * 100).toFixed(0) + '%';
    el.classList.toggle('hot', combo >= BAL.comboSteps);
  }
  function localPt(e) { const rc = canvas.getBoundingClientRect(); return { x: e.clientX - rc.left, y: e.clientY - rc.top }; }
  brainBtn.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    Snd.init();
    const pt = localPt(e);
    if (mg) { mgHit(pt.x, pt.y); wake(); return; }
    const vi = viruses.findIndex(v => Math.hypot(v.x - pt.x, v.y - pt.y) < 30);
    if (vi >= 0) { killVirus(vi); return; }
    const n = hitNeuron(pt.x, pt.y);
    if (edit.mode) editTap(n);
    else collect(pt.x, pt.y, n ? n.s : null, false);
    if (n && !drag) {
      drag = { id: e.pointerId, from: n, sx: pt.x, sy: pt.y, x: pt.x, y: pt.y, active: false };
      try { brainBtn.setPointerCapture(e.pointerId); } catch (err) { /* yok */ }
    }
  });
  brainBtn.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const pt = localPt(e);
    drag.x = pt.x; drag.y = pt.y;
    if (!drag.active && Math.hypot(pt.x - drag.sx, pt.y - drag.sy) > 14) drag.active = true;
    if (drag.active) wake();
  });
  function endDrag(e, cancel) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!cancel && d.active) {
      edit.a = edit.b = null;
      const tg = hitNeuron(d.x, d.y);
      if (tg && tg !== d.from) {
        if (tg.l === d.from.l) mergeInto(d.from, tg);
        else toggleSyn(d.from, tg);
      }
    }
    render(performance.now());
    updateEdit();
  }
  brainBtn.addEventListener('pointerup', e => endDrag(e, false));
  brainBtn.addEventListener('pointercancel', e => endDrag(e, true));
  brainBtn.addEventListener('click', e => { if (e.detail === 0 && !mg) collect(null, null, null, false); });
  brainBtn.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- Nöronlar: üret, birleştir, sinaps ---------- */
  function freeSlot() {
    const n = unlockedSlots();
    for (let s = 0; s < n; s++) if (!neuronAt(s)) return s;
    return -1;
  }
  $('nBuy').addEventListener('click', () => {
    Snd.init();
    const c = neuronCost(), s = freeSlot();
    if (s < 0) { Snd.nope(); say(t('n.full'), 'wow', 2000); return; }
    if (state.data < c) { Snd.nope(); return; }
    state.data -= c;
    state.nBought++;
    state.neurons.push({ s: s, l: 1 });
    Snd.buy(); buzz(10);
    rebuild();
    fire(s, 'teal');
    if (!state.seen.n2) { state.seen.n2 = 1; say(t('tip.n2'), 'wow', 3200); }
    updateAll();
  });
  function mergeInto(src, dst, quiet) {
    if (src.l !== dst.l || src === dst) return;
    state.neurons.splice(state.neurons.indexOf(src), 1);
    state.syn = state.syn.filter(p => p[0] !== src.s && p[1] !== src.s);
    dst.l++;
    state.merges++;
    state.maxLvEver = Math.max(state.maxLvEver, dst.l);
    progress('merge', 1);
    evAdd('merge', 1);
    rebuild();
    if (quiet) { fire(dst.s, 'grape'); return; }
    Snd.merge(dst.l); buzz([10, 30, 10]);
    const p = B.slots[dst.s];
    pops.push({ x: p.x, y: p.y - 14, text: t('pop.level', { n: dst.l }), t0: performance.now(), big: true });
    fire(dst.s, 'grape');
    if (!state.seen.merge) { state.seen.merge = 1; say(t('tip.merge'), 'wow', 2600); }
    else if (dst.l >= 5 && !state.seen['lv' + dst.l]) { state.seen['lv' + dst.l] = 1; say(t('tip.bigLevel', { n: dst.l }), 'wow', 2000); }
    updateAll();
  }
  // protect: sinapsı olan nöron asla "giden" taraf olmaz (kurduğun ağ bozulmaz)
  // [giden, kalan] ya da null
  function lowestPair(protect) {
    const by = {};
    state.neurons.forEach(n => { (by[n.l] = by[n.l] || []).push(n); });
    const ok = l => by[l].length >= 2 && (!protect || by[l].some(n => !synDeg(n.s)));
    const lv = Object.keys(by).map(Number).sort((a, b) => a - b).find(ok);
    if (lv == null) return null;
    const pair = by[lv].sort((a, b) => synDeg(b.s) - synDeg(a.s) || a.s - b.s);
    return [pair[pair.length - 1], pair[0]];
  }
  function mergeLowest(quiet, protect) {
    const pr = lowestPair(protect);
    if (!pr) return false;
    mergeInto(pr[0], pr[1], quiet);
    if (quiet) updateAll();
    return true;
  }
  function mergePreview(A, Bn) {
    const ns = state.neurons.filter(n => n.s !== A.s).map(n => n.s === Bn.s ? { s: n.s, l: n.l + 1 } : n);
    const sy = state.syn.filter(p => p[0] !== A.s && p[1] !== A.s);
    return { ns: ns, sy: sy, lost: state.syn.length - sy.length, worse: powerOf(ns, sy) < brainPower() };
  }
  const synDeg = s => state.syn.filter(p => p[0] === s || p[1] === s).length;
  function toggleSyn(a, b) {
    const i = synIndex(a.s, b.s);
    if (i >= 0) { state.syn.splice(i, 1); toast(t('syn.removed')); rebuild(); updateAll(); return; }
    if (state.syn.length >= synCap()) {
      Snd.nope();
      toast(synCap() ? t('syn.noSlot') : t('syn.locked'));
      return;
    }
    state.syn.push(synKey(a.s, b.s));
    state.synMade++;
    Snd.syn(); buzz(12);
    rebuild();
    fire(a.s, a.l === b.l ? 'sun' : 'grape');
    if (!state.seen.syn) { state.seen.syn = 1; say(t('tip.syn'), 'wow', 2600); }
    updateAll();
  }

  /* ---------- Düzenleme modları: iki nörona dokun, sonucu gör, onayla ---------- */
  const edit = { mode: null, a: null, b: null };
  function setEditMode(m) {
    edit.mode = edit.mode === m ? null : m;
    edit.a = edit.b = null;
    $('nMerge').setAttribute('aria-pressed', String(edit.mode === 'merge'));
    $('nSyn').setAttribute('aria-pressed', String(edit.mode === 'link'));
    render(performance.now());
    updateEdit();
  }
  function editTap(n) {
    Snd.init();
    if (!n) { edit.a = edit.b = null; }
    else if (edit.a == null || edit.b != null) { edit.a = n.s; edit.b = null; Snd.tone(620, 0.06, 'triangle', 0.05); }
    else if (n.s === edit.a) { edit.a = null; }
    else { edit.b = n.s; Snd.tone(780, 0.06, 'triangle', 0.05); }
    render(performance.now());
    updateEdit();
  }
  const pctTxt = (a, b) => (b >= a ? '+' : '') + dec(((b / a - 1) * 100).toFixed(Math.abs(b / a - 1) < 0.1 ? 1 : 0)) + '%';
  function previewTxt(ns, sy) {
    const p0 = brainPower(), p1 = powerOf(ns, sy);
    const d0 = tapAt(p0), d1 = tapAt(p1);
    return t('edit.preview', { a: fmt(p0), b: fmt(p1), p: pctTxt(p0, p1), i: pctTxt(idleAt(p0), idleAt(p1)), d: d0 > 0 ? pctTxt(d0, d1) : '0%' });
  }
  function editBtn(txt, fn, go) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pill-btn' + (go ? ' go' : ''); b.textContent = txt;
    b.addEventListener('click', fn);
    $('editActs').appendChild(b);
  }
  function updateEdit() {
    const bar = $('editBar');
    bar.hidden = !edit.mode;
    if (!edit.mode) return;
    $('editActs').innerHTML = '';
    const A = edit.a != null ? neuronAt(edit.a) : null, Bn = edit.b != null ? neuronAt(edit.b) : null;
    let s;
    if (edit.mode === 'merge') {
      if (!A) {
        s = t('edit.m0');
        // Hızlı birleştirme de önce sonucu gösterir; güç düşecekse uyarır.
        const pr = lowestPair(true) || lowestPair(false);
        if (pr) {
          const pv = mergePreview(pr[0], pr[1]);
          s += ' ' + t('edit.lowPrev', { a: pr[0].l, b: pr[0].l + 1 }) + ' ' + previewTxt(pv.ns, pv.sy) + '.' + (pv.lost ? ' ' + t('edit.lost', { n: pv.lost }) : '') + (pv.worse ? ' ' + t('edit.worse') : '');
          editBtn(t(pv.worse ? 'edit.lowestAnyway' : 'edit.lowest'), () => { mergeInto(pr[0], pr[1]); updateEdit(); }, !pv.worse);
        }
      } else if (!Bn) s = t('edit.m1', { n: A.l });
      else if (A.l !== Bn.l) s = t('edit.mDiff', { a: A.l, b: Bn.l });
      else {
        const pv = mergePreview(A, Bn);
        s = t('edit.m2', { a: A.l, b: A.l + 1 }) + ' ' + previewTxt(pv.ns, pv.sy) + '. ' + (pv.lost ? t('edit.lost', { n: pv.lost }) : t('edit.free')) + (pv.worse ? ' ' + t('edit.worse') : '');
        editBtn(t('edit.doMerge'), () => { mergeInto(A, Bn); edit.a = edit.b = null; updateEdit(); }, true);
      }
    } else {
      if (!synCap()) s = t('syn.locked');
      else if (!A) s = t('edit.l0', { a: state.syn.length, b: synCap() });
      else if (!Bn) s = t('edit.l1', { n: A.l });
      else {
        const i = synIndex(A.s, Bn.s);
        if (i >= 0) {
          const sy = state.syn.filter((_, k) => k !== i);
          s = t('edit.lDel') + ' ' + previewTxt(state.neurons, sy) + '.';
          editBtn(t('brain.synDel'), () => { toggleSyn(A, Bn); edit.a = edit.b = null; updateEdit(); }, true);
        } else if (state.syn.length >= synCap()) s = t('edit.lFull', { a: state.syn.length, b: synCap() });
        else {
          s = (A.l === Bn.l ? t('edit.res') : t('edit.syn')) + ' ' + previewTxt(state.neurons, state.syn.concat([synKey(A.s, Bn.s)]));
          editBtn(t('edit.doLink'), () => { toggleSyn(A, Bn); edit.a = edit.b = null; updateEdit(); }, true);
        }
      }
    }
    if (edit.a != null) editBtn(t('edit.clear'), () => { edit.a = edit.b = null; render(performance.now()); updateEdit(); });
    editBtn(t('edit.done'), () => setEditMode(edit.mode));
    setText($('editText'), s);
  }
  $('nMerge').addEventListener('click', () => setEditMode('merge'));
  $('nSyn').addEventListener('click', () => setEditMode('link'));
  // Telefonda beynin boş yerinde parmak kaydırmak sayfayı kaydırmaz (tek ekran); nörona dokununca sürükleme çalışır.
  brainBtn.addEventListener('touchstart', e => { if (e.cancelable && (mg || edit.mode || e.touches.length === 1)) e.preventDefault(); }, { passive: false });
  function updateBrainBar() {
    const c = neuronCost(), s = freeSlot();
    setText($('nBuyCost'), s < 0 ? t('n.noRoom') : fmt(c));
    $('nBuy').disabled = s < 0 || state.data < c;
    const by = {};
    state.neurons.forEach(n => { by[n.l] = (by[n.l] || 0) + 1; });
    const pairs = Object.keys(by).reduce((a, l) => a + Math.floor(by[l] / 2), 0);
    setText($('nMergeN'), t('n.pairs', { n: pairs }));
    $('nMerge').disabled = pairs === 0 && edit.mode !== 'merge';
    $('nSyn').disabled = !synCap() && edit.mode !== 'link';
    setText($('nSynN'), state.syn.length + '/' + synCap());
  }
