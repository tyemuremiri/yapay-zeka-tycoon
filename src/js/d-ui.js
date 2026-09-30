
  /* ---------- Pencereler (modal) ---------- */
  const modalOpen = id => !$(id).hidden;
  function openModal(id) {
    $(id).hidden = false;
    setTimeout(() => { const f = $(id).querySelector('button:not([disabled])'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { /* yok */ } } }, 50);
  }
  function closeModal(id) { $(id).hidden = true; }
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['feedSheet', 'settings'].forEach(id => { if (modalOpen(id)) closeModal(id); });
  });
  ['feedSheet', 'settings'].forEach(id => $(id).addEventListener('click', e => { if (e.target === $(id)) closeModal(id); }));

  /* ---------- Ayarlar ---------- */
  const THEMES = ['auto', 'dark', 'light'];
  function buildSettings() {
    const lr = $('langRow');
    LANG_IDS.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pill-btn'; b.dataset.lang = id;
      b.textContent = LANGS[id].meta.name;
      b.lang = id; if (LANGS[id].meta.dir === 'rtl') b.dir = 'rtl';
      lr.appendChild(b);
    });
    const tr = $('themeRow');
    THEMES.forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill-btn'; b.dataset.theme = k; tr.appendChild(b); });
    const row = $('skinRow');
    SKINS.forEach(k => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pill-btn'; b.dataset.skin = k;
      b.innerHTML = '<span class="sw" style="background:var(--' + k + ')"></span><span class="nm"></span>';
      row.appendChild(b);
    });
    const cr = $('cosRow');
    Object.keys(COSTUMES).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill-btn'; b.dataset.cos = k; cr.appendChild(b); });
    cr.addEventListener('click', e => {
      const b = e.target.closest('[data-cos]');
      if (!b || b.disabled) return;
      state.cos = b.dataset.cos;
      syncSettings(); save();
      say(TX().costumes[state.cos].line, 'wow', 1600);
    });
    lr.addEventListener('click', e => {
      const b = e.target.closest('[data-lang]');
      if (!b) return;
      state.opt.lang = b.dataset.lang;
      applyLang(b.dataset.lang);
      Snd.init(); Snd.click();
      save();
    });
    tr.addEventListener('click', e => {
      const b = e.target.closest('[data-theme]');
      if (!b) return;
      state.opt.theme = b.dataset.theme;
      applyTheme(); syncSettings(); save();
    });
    syncSettings();
  }
  function syncSettings() {
    document.querySelectorAll('#langRow [data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG.meta.id)));
    setText($('langAuto'), state.opt.lang ? t('set.langManual') : t('set.langAuto'));
    document.querySelectorAll('#themeRow [data-theme]').forEach(b => { setText(b, t('theme.' + b.dataset.theme)); b.setAttribute('aria-pressed', String(state.opt.theme === b.dataset.theme)); });
    document.querySelectorAll('#notRow [data-not]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.not === 'sci') === !!state.opt.sci)));
    setText($('notTr'), dec('1.25') + LANG.meta.sp + LANG.meta.suf[2]);
    document.querySelectorAll('#skinRow [data-skin]').forEach(b => {
      const k = b.dataset.skin, has = !!state.skins[k];
      setText(b.querySelector('.nm'), TX().skins[k]);
      b.disabled = !has;
      b.title = has ? '' : k === 'sky' ? t('skin.howF') : k === 'coral' ? t('skin.howH') : t('skin.howEv');
      b.setAttribute('aria-pressed', String(state.skin === k));
    });
    bot.style.setProperty('--skin', 'var(--' + state.skin + ')');
    document.querySelectorAll('#cosRow [data-cos]').forEach(b => {
      const k = b.dataset.cos, has = COSTUMES[k](), x = TX().costumes[k];
      setText(b, x.n);
      b.disabled = !has;
      b.title = has ? '' : x.how;
      b.setAttribute('aria-pressed', String(state.cos === k));
    });
    bot.dataset.cos = COSTUMES[state.cos] && COSTUMES[state.cos]() ? state.cos : 'none';
    [['sndBtn', 'sound'], ['musBtn', 'music'], ['hapBtn', 'haptic']].forEach(p => $(p[0]).setAttribute('aria-pressed', String(!!state.opt[p[1]])));
    $('ecoBtn').setAttribute('aria-pressed', String(eco()));
  }
  $('notRow').addEventListener('click', e => {
    const b = e.target.closest('[data-not]');
    if (!b) return;
    state.opt.sci = b.dataset.not === 'sci';
    syncSettings(); upKey = ''; updateAll(); save();
  });
  $('skinRow').addEventListener('click', e => {
    const b = e.target.closest('[data-skin]');
    if (!b || b.disabled) return;
    state.skin = b.dataset.skin;
    syncSettings(); save();
    say(t('skin.new'), 'wow', 1500);
  });
  $('expBtn').addEventListener('click', () => {
    save();
    let txt = '';
    try { txt = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); } catch (e) { toast(t('save.expFail')); return; }
    const box = $('saveBox');
    box.value = txt;
    const fallback = () => { box.focus(); box.select(); toast(t('save.selected')); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast(t('save.copied')), fallback);
      else fallback();
    } catch (e) { fallback(); }
  });
  $('impBtn').addEventListener('click', () => {
    const raw = $('saveBox').value.trim();
    if (!raw) { toast(t('save.pasteFirst')); return; }
    let json = '';
    try { json = decodeURIComponent(escape(atob(raw))); JSON.parse(json); } catch (e) { toast(t('save.bad')); return; }
    const opt = state.opt, prev = JSON.stringify(state);
    Object.keys(state).forEach(k => { delete state[k]; });
    Object.assign(state, defaults());
    state.opt = opt;
    if (!loadFrom(json)) { Object.keys(state).forEach(k => { delete state[k]; }); Object.assign(state, JSON.parse(prev)); brainDirty(); toast(t('save.badKept')); return; }
    state.last = Date.now();
    upKey = ''; taskKey = ''; lastTier = tierIdx(); viruses = []; combo = 0;
    ensureDaily(); ensureEvent(); syncAlignLook(); syncSettings(); checkAch(true);
    applyLang(state.opt.lang || detectLang());
    rebuild(); updateAll(); save();
    $('saveBox').value = '';
    toast(t('save.loaded'));
  });
  const resetBtn = $('resetBtn');
  twoStep(resetBtn, 'arm.reset', () => { resetBtn._t = undefined; setText(resetBtn, t('set.reset')); }, () => {
    const opt = state.opt;
    Object.assign(state, defaults());
    state.opt = opt;
    try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + '-yedek'); } catch (e) { /* kayıt kapalı */ }
    resetRun();
    taskKey = '';
    ensureDaily();
    ensureEvent();
    syncAlignLook();
    syncSettings();
    closeModal('settings');
    say(t('reset.done'), 'happy');
    rebuild();
    updateAll();
  });
  function syncOpts() { syncSettings(); applyEco(); }
  $('sndBtn').addEventListener('click', () => { state.opt.sound = !state.opt.sound; Snd.init(); syncOpts(); Snd.buy(); save(); });
  $('hapBtn').addEventListener('click', () => { state.opt.haptic = !state.opt.haptic; syncOpts(); buzz(20); save(); });
  $('ecoBtn').addEventListener('click', () => {
    state.opt.eco = !eco();
    syncOpts();
    layoutBrain(true);
    toast(t(eco() ? 'eco.on' : 'eco.off'));
    save();
  });
  $('gearBtn').addEventListener('click', () => { Snd.init(); syncSettings(); openModal('settings'); });

  /* ---------- Lo-fi müzik (kodla üretilir, dosya yok) ---------- */
  const Music = {
    timer: 0, step: 0, nextT: 0, bus: null, noise: null,
    start() {
      const c = Snd.ctx;
      if (!c || this.timer || !state.opt.music || document.hidden) return;
      if (c.state === 'suspended') c.resume();
      if (!this.bus) {
        this.bus = c.createGain(); this.bus.gain.value = 0.55;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
        this.bus.connect(lp); lp.connect(c.destination);
        const buf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        this.noise = buf;
      }
      this.nextT = c.currentTime + 0.15;
      this.timer = setInterval(() => this.sched(), 300);
    },
    stop() { clearInterval(this.timer); this.timer = 0; },
    note(m, t0, dur, type, vol, att) {
      const c = Snd.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + att);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.bus); o.start(t0); o.stop(t0 + dur + 0.05);
    },
    sched() {
      const c = Snd.ctx;
      if (!c) return;
      const stepDur = 60 / 72 / 2;
      while (this.nextT < c.currentTime + 0.7) { this.play(this.step, this.nextT, stepDur); this.nextT += stepDur; this.step++; }
    },
    play(i, t0, sd) {
      const dark = alignment() === 'h';
      const CH = dark ? [[45, 48, 52, 55], [41, 45, 48, 52], [43, 46, 50, 53], [40, 43, 47, 50]]
        : [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
      const bar = Math.floor(i / 8) % 4, s = i % 8, ch = CH[bar];
      if (s === 0) ch.forEach((m, k) => this.note(m + 12, t0 + k * 0.03, sd * 8.5, 'triangle', 0.016, 0.35));
      if (s === 0 || s === 5) this.note(ch[0] - 12, t0, sd * 2, 'sine', 0.06, 0.02);
      if (s % 2 === 1 && !eco()) {
        const n = Snd.ctx.createBufferSource(), g = Snd.ctx.createGain();
        n.buffer = this.noise; g.gain.value = s === 3 || s === 7 ? 0.018 : 0.009;
        n.connect(g); g.connect(this.bus); n.start(t0);
      }
      if ((s === 2 || s === 4 || s === 7) && Math.random() < 0.45) {
        const scale = dark ? [69, 72, 74, 76, 79] : [72, 74, 76, 79, 81];
        this.note(pick(scale), t0, sd * 1.6, 'sine', 0.022, 0.01);
      }
    }
  };
  function syncMusic() { if (state.opt.music) Music.start(); else Music.stop(); $('musBtn').setAttribute('aria-pressed', String(state.opt.music)); }
  $('musBtn').addEventListener('click', () => {
    state.opt.music = !state.opt.music;
    Snd.init();
    syncMusic();
    save();
  });

  /* ---------- Zekâ Akışı (parodi haber akışı; her dilin kendi parodileri) ---------- */
  const BUFF_MAP = { turbo10: 'tap', gpu5: 'src', cay5: 'data' };
  const AVA = ['--sun', '--teal', '--sky', '--grape', '--coral', '--pink', '--lime'];
  let feedKey = '', nextPostAt = Date.now() + 8000, lastNews = [];
  const FEEDL = () => TX().feed;
  const vars = () => ({ tier: tierName(tierIdx()), lab: labText().n, mode: t('align.short.' + (alignment() === 'h' ? 'h' : 'f')) });
  function addPost(i, v) {
    const p = FEEDL()[i];
    let b = p[4] ? (BUFF_MAP[p[4]] || p[4]) : null;
    if (!b && p[3] === 'news' && Math.random() < 0.25) b = pick(['tap', 'src', 'crit', 'data']);
    state.feed.unshift({ i: i, at: Date.now(), b: BUFFS[b] ? b : null, liked: false, v: v || null });
    state.feed = state.feed.slice(0, 20);
    state.feedLang = LANG.meta.id;
    feedKey = '';
    renderFeed();
  }
  function postNews() {
    const futureOk = tierIdx() >= 7;
    const pool = [];
    FEEDL().forEach((p, i) => { if ((p[3] === 'news' || (futureOk && p[3] === 'future')) && lastNews.indexOf(i) < 0) pool.push(i); });
    if (!pool.length) { lastNews = []; return; }
    const i = pick(pool);
    lastNews.push(i);
    if (lastNews.length > 30) lastNews.shift();
    addPost(i);
  }
  function postReact(tag) {
    const pool = [];
    FEEDL().forEach((p, i) => { if (p[3] === tag) pool.push(i); });
    if (!pool.length) return;
    addPost(pick(pool), vars());
  }
  function postText(x) {
    const P = FEEDL()[x.i] || FEEDL()[0], v = x.v || vars();
    const f = s => s.replace(/\{tier\}/g, v.tier).replace(/\{lab\}/g, v.lab).replace(/\{mode\}/g, v.mode);
    return { t: f(P[2]), w: f(P[0]), h: P[1] };
  }
  function ago(ms) { const s = Math.max(0, (Date.now() - ms) / 1000); return s < 60 ? t('ago.now') : s < 3600 ? t('u.m', { n: Math.floor(s / 60) }) : s < 86400 ? t('u.h', { n: Math.floor(s / 3600) }) : t('u.d', { n: Math.floor(s / 86400) }); }
  const postsEl = $('posts');
  function renderFeed() {
    const key = state.feed.map(x => x.i + ':' + x.liked + ':' + (Date.now() - x.at > LIKE_MS)).join(',') + LANG.meta.id;
    if (key !== feedKey && modalOpen('feedSheet')) {
      feedKey = key;
      postsEl.innerHTML = '';
      state.feed.forEach((x, k) => {
        const tx = postText(x);
        const el = document.createElement('article');
        el.className = 'post' + ((LANG.meta.me || []).indexOf(tx.h) >= 0 ? ' me' : '');
        const ava = document.createElement('div');
        ava.className = 'ava';
        let hsh = 0;
        for (let j = 0; j < tx.h.length; j++) hsh = (hsh * 31 + tx.h.charCodeAt(j)) >>> 0;
        ava.style.setProperty('--c', 'var(' + AVA[hsh % AVA.length] + ')');
        ava.textContent = tx.w.charAt(0).toLocaleUpperCase(LANG.meta.id);
        const body = document.createElement('div');
        body.style.minWidth = '0';
        body.innerHTML = '<div class="pmeta"><b></b><span class="hd"></span><span class="tm"></span></div><p class="ptext"></p>';
        body.querySelector('b').textContent = tx.w;
        body.querySelector('.hd').textContent = tx.h;
        body.querySelector('.tm').textContent = '· ' + ago(x.at);
        body.querySelector('.ptext').textContent = tx.t;
        if (x.b) {
          const act = document.createElement('div');
          act.className = 'pact';
          const lb = document.createElement('button');
          lb.type = 'button';
          lb.className = 'like btn';
          lb.dataset.like = k;
          const old = Date.now() - x.at > LIKE_MS;
          lb.disabled = x.liked || old;
          lb.textContent = x.liked ? '♥ ' + t('feed.liked') : old ? t('feed.old') : '♥ ' + t('feed.like', { b: t('buff.n.' + x.b) });
          act.appendChild(lb);
          body.appendChild(act);
        }
        el.appendChild(ava); el.appendChild(body);
        postsEl.appendChild(el);
      });
    } else if (modalOpen('feedSheet')) {
      postsEl.querySelectorAll('.tm').forEach((el, k) => { if (state.feed[k]) setText(el, '· ' + ago(state.feed[k].at)); });
    }
    const top = state.feed[0];
    if (top) {
      const tx = postText(top), tk = $('ticker');
      setText($('tickText'), tx.t);
      setText($('tkWho'), tx.w);
      setText($('tkAva'), tx.w.charAt(0).toLocaleUpperCase(LANG.meta.id));
      let hsh = 0;
      for (let j = 0; j < tx.h.length; j++) hsh = (hsh * 31 + tx.h.charCodeAt(j)) >>> 0;
      $('tkAva').style.setProperty('--c', 'var(' + AVA[hsh % AVA.length] + ')');
      const live = !!top.b && !top.liked && Date.now() - top.at < LIKE_MS;
      setText($('tkRw'), live ? '♥ ' + t('buff.s.' + top.b) : '');
      tk.classList.toggle('live', live);
      if (tk._at !== top.at) {
        const first = tk._at == null;
        tk._at = top.at;
        if (!first && !eco()) { tk.classList.remove('fresh'); void tk.offsetWidth; tk.classList.add('fresh'); }
      }
    }
  }
  postsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-like]');
    if (!b || b.disabled) return;
    const x = state.feed[Number(b.dataset.like)];
    if (!x || x.liked || !x.b || Date.now() - x.at > LIKE_MS) return;
    x.liked = true;
    Snd.init(); Snd.packet(); buzz(12);
    if (x.b === 'data') { const r = Math.max(50, dps(true) * 120); addData(r); toast(t('feed.gotData', { n: fmt(r) })); }
    else { state.buffs[x.b] = Math.max(Date.now(), state.buffs[x.b] || 0) + BUFFS[x.b].ms; toast(t('feed.gotBuff', { b: t('buff.n.' + x.b) })); }
    feedKey = '';
    renderFeed();
    updateAll();
  });
  $('ticker').addEventListener('click', () => { Snd.init(); feedKey = ''; openModal('feedSheet'); renderFeed(); });

  /* ---------- Hikâye penceresi ---------- */
  let storyNext = null;
  function showStory(eyebrow, title, text, then) {
    setText($('stEyebrow'), eyebrow);
    setText($('stTitle'), title);
    $('stText').textContent = text;
    storyNext = then || null;
    openModal('story');
  }
  $('stOk').addEventListener('click', () => {
    closeModal('story');
    const f = storyNext; storyNext = null;
    if (f) f();
    else if (pendingTier()) setTimeout(openChoice, 300);
  });

  /* ---------- Kasa (çiple alınan kalıcı eşyalar) ---------- */
  const kasaEl = $('kasa');
  const kasaCost = k => kv(k.id) + 1;
  KASA.forEach(k => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'node btn';
    b.dataset.kasa = k.id;
    b.innerHTML = '<b></b><span></span><em></em>';
    kasaEl.appendChild(b);
  });
  kasaEl.addEventListener('click', e => {
    const b = e.target.closest('[data-kasa]');
    if (!b) return;
    const k = KASA.find(x => x.id === b.dataset.kasa);
    if (!k || kv(k.id) >= k.max || state.chips < kasaCost(k)) { Snd.nope(); return; }
    state.chips -= kasaCost(k);
    state.kasa[k.id] = kv(k.id) + 1;
    brainDirty();
    Snd.init(); Snd.buy(); buzz(12);
    toast(t('kasa.lv', { n: TX().kasa[k.id].n, l: kv(k.id) }));
    updateAll(); save();
  });
  function updateKasa() {
    setText($('chipSum'), t('kasa.chips', { n: state.chips }));
    kasaEl.querySelectorAll('[data-kasa]').forEach(b => {
      const k = KASA.find(x => x.id === b.dataset.kasa), lv = kv(k.id), max = lv >= k.max, x = TX().kasa[k.id];
      setText(b.querySelector('b'), x.n);
      setText(b.querySelector('span'), x.d);
      b.classList.toggle('own', max);
      b.disabled = max || state.chips < kasaCost(k);
      setText(b.querySelector('em'), t('kasa.lvl', { a: lv, b: k.max }) + (max ? '' : ' · ' + t('kasa.cost', { n: kasaCost(k) })));
    });
    const nl = labText((state.runs + 1) % LABS.length), L = labText();
    setText($('labNote'), t('lab.note', { a: L.n, l: loopN() ? ' ' + t('lab.loopMult', { n: loopN() + 1, x: Math.pow(2, loopN()) }) : '', d: L.d, b: nl.n, e: nl.d }));
  }

  /* ---------- Nöro'nun gezisi (gerçek zamanlı görevler) ---------- */
  const misList = $('misList');
  let misKey = '';
  function updateMissions() {
    const m = state.mission, now = Date.now();
    const key = (m ? m.k + (now >= m.until ? 'done' : 'run') : 'idle') + LANG.meta.id;
    if (key !== misKey) {
      misKey = key;
      misList.innerHTML = '';
      const list = m ? MISSIONS.filter(x => x.k === m.k) : MISSIONS;
      list.forEach(x => {
        const el = document.createElement('div');
        el.className = 'task';
        el.innerHTML = '<div><div class="t1"></div><div class="t2"></div></div><button type="button" class="claim btn"></button>' + (m ? '<div class="track"><i></i></div>' : '');
        el.querySelector('.t1').textContent = TX().missions[x.k].n;
        el.querySelector('.t2').textContent = TX().missions[x.k].d;
        el.querySelector('button').dataset.mis = x.k;
        misList.appendChild(el);
      });
    }
    misList.querySelectorAll('button[data-mis]').forEach(b => {
      if (!m) { setText(b, t('mis.send')); b.disabled = false; return; }
      const done = now >= m.until;
      setText(b, done ? t('btn.claim') : leftText(m.until - now));
      b.disabled = !done;
      const x = MISSIONS.find(q => q.k === m.k), bar = misList.querySelector('.track i');
      if (bar && x) bar.style.width = (Math.min(1, 1 - (m.until - now) / x.ms) * 100).toFixed(1) + '%';
    });
    setText($('misLeft'), t(m ? (now >= m.until ? 'mis.back' : 'mis.away') : 'mis.home'));
  }
  misList.addEventListener('click', e => {
    const b = e.target.closest('button[data-mis]');
    if (!b || b.disabled) return;
    const x = MISSIONS.find(q => q.k === b.dataset.mis);
    Snd.init();
    if (!state.mission) {
      state.mission = { k: x.k, until: Date.now() + x.ms };
      Snd.buy();
      say(t('mis.go'), 'wow', 2200);
    } else if (Date.now() >= state.mission.until) {
      const r = Math.max(500, dps(true) * x.sec);
      addData(r);
      state.chips += x.chips;
      state.missions++;
      state.mission = null;
      progress('trip', 1);
      Snd.ach(); buzz([15, 40, 15]);
      toast(t('mis.got', { n: fmt(r) }) + (x.chips ? ' · ' + t('mis.chips', { n: x.chips }) : ''));
      say(pick(TX().tripLines), 'wow', 2600);
    }
    misKey = '';
    updateMissions();
    updateAll();
    save();
  });

  /* ---------- Müşteri projeleri ----------
     Her teklifte iki yol: Hızlı (3 dk, bu tura veri) ya da Özenli (30 dk, çip + kalıcı referans).
     Kalite yıldızı kurduğun yapıya bağlı: Hızlı yol kaynak çeşitliliğini, Özenli yol nöron ağını ödüllendirir.
     Kısa oturumda ya da eşiğe yakınken Hızlı, uzun ayrılıkta ya da uzun vadede Özenli mantıklıdır. */
  const PMODE = [{ ms: 180000, cost: 60 }, { ms: 1800000, cost: 300 }];
  function projOpen() { return state.bestTier >= 2 || state.projDone > 0; }
  function projQuality(a) {
    if (a === 0) {
      const kinds = state.gen.filter(n => n > 0).length;
      return 1 + (kinds >= 4 ? 1 : 0) + (state.gen.some(n => n >= 100) ? 1 : 0);
    }
    return 1 + (maxLevel() >= tierIdx() + 3 ? 1 : 0) + (synCap() > 0 && state.syn.length >= synCap() ? 1 : 0);
  }
  const qHint = a => a === 0 ? t('pr.hintA') : t('pr.hintB', { n: tierIdx() + 3 });
  const stars = n => '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
  const projCost = a => Math.max(50, dps(true) * PMODE[a].cost);
  const projData = q => Math.max(500, dps(true) * 720 * [1, 1.5, 2][q - 1]);
  const firstStory = x => x.story && state.projStory[x.id] !== 1;
  function nextOffer() {
    const st = PROJ.filter(p => p.story && !state.projStory[p.id] && state.projDone >= p.at && (!p.req || state.projStory[p.req] === 1));
    if (st.length) return st[0].id;
    // Hızlı yolla geçilen hikâye projeleri havuza döner: hediyeyi kaçıran oyuncu sonra Özenli yolla alabilir.
    const last = state.projOffer ? state.projOffer.id : '';
    const pool = PROJ.filter(p => (!p.story || state.projStory[p.id] === 'f') && p.id !== last);
    return pick(pool).id;
  }
  function ensureOffer() { if (projOpen() && !state.proj && !state.projOffer) state.projOffer = { id: nextOffer() }; }
  const projBox = $('projBox');
  let projKey = '';
  function projCard(html) { const d = document.createElement('div'); d.className = 'pcard'; d.innerHTML = html; return d; }
  const rewardB = (q, x) => t('pr.rwB', { c: q + (firstStory(x) ? 2 : 0) }) + (firstStory(x) && x.cos ? ' + ' + t('pr.gift') : '');
  function updateProj() {
    ensureOffer();
    const now = Date.now(), P = state.proj, O = state.projOffer;
    setText($('projSum'), t('pr.sum', { d: state.projDone, r: state.refs, p: Math.round(state.refs * BAL.refBonus * 100) }));
    setText($('projNote'), t(projOpen() ? 'pr.note' : 'pr.locked'));
    const key = (!projOpen() ? 'lock' : P ? 'run' + P.id + P.a + (now >= P.until) : 'off' + (O && O.id)) + LANG.meta.id;
    if (key !== projKey) {
      projKey = key;
      projBox.innerHTML = '';
      if (!projOpen()) return;
      if (P) {
        const x = PROJ_BY[P.id], X = projText(P.id), ap = P.a ? X.B : X.A;
        const c = projCard('<div class="pc-h"><span class="ava"></span><div><b class="pc-c"></b><small class="pc-t"></small></div></div><p class="pc-d"></p><div class="track"><i></i></div><div class="acts"><button type="button" class="claim btn" data-pdo="deliver"></button><button type="button" class="pill-btn" data-pdo="cancel"></button></div>');
        c.querySelector('.pc-c').textContent = X.c; c.querySelector('.pc-t').textContent = X.t + ' · ' + t(P.a ? 'pr.slow' : 'pr.fast');
        c.querySelector('.pc-d').textContent = ap.n + '. ' + t('pr.q', { s: stars(P.q) }) + ' ' + (P.a ? t('pr.rw', { r: rewardB(P.q, x) }) : t('pr.rwA', { n: fmt(projData(P.q)) }));
        c.querySelector('.ava').textContent = X.c.charAt(0);
        c.querySelector('[data-pdo="cancel"]').textContent = t('pr.cancel');
        projBox.appendChild(c);
      } else if (O) {
        const x = PROJ_BY[O.id], X = projText(O.id);
        const c = projCard('<div class="pc-h"><span class="ava"></span><div><b class="pc-c"></b><small class="pc-t"></small></div></div><p class="pc-d"></p><div class="cards pc-opts"></div><div class="acts"><button type="button" class="pill-btn" data-pdo="skip"></button></div>');
        c.querySelector('.pc-c').textContent = X.c + (x.story ? ' · ' + t('pr.story') : '');
        c.querySelector('.pc-t').textContent = X.t;
        c.querySelector('.pc-d').textContent = X.d;
        c.querySelector('.ava').textContent = X.c.charAt(0);
        [X.A, X.B].forEach((ap, a) => {
          const st = a ? x.B : x.A;
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'choice btn popt ' + (a ? 'slow' : 'fast'); b.dataset.pgo = a;
          b.innerHTML = '<span class="tag"></span><b></b><span class="d"></span><span class="st"></span><span class="rw"></span><span class="go"></span>';
          b.querySelector('.tag').textContent = t(a ? 'pr.slowTag' : 'pr.fastTag');
          b.querySelector('b').textContent = ap.n;
          b.querySelector('.d').textContent = ap.d;
          b.querySelector('.st').textContent = t('pr.stars', { a: stars(st[0]), b: stars(st[1]), c: stars(st[2]) });
          c.querySelector('.pc-opts').appendChild(b);
        });
        projBox.appendChild(c);
      }
    }
    if (!projOpen()) return;
    if (P) {
      const done = now >= P.until, bar = projBox.querySelector('.track i'), b = projBox.querySelector('[data-pdo="deliver"]');
      if (bar) bar.style.width = (Math.min(1, 1 - (P.until - now) / PMODE[P.a].ms) * 100).toFixed(1) + '%';
      if (b) { setText(b, done ? t('pr.deliver') : leftText(P.until - now)); b.disabled = !done; }
      const cb = projBox.querySelector('[data-pdo="cancel"]'); if (cb) cb.hidden = done;
    } else if (O) {
      const x = PROJ_BY[O.id];
      projBox.querySelectorAll('[data-pgo]').forEach(b => {
        const a = Number(b.dataset.pgo), q = projQuality(a), cost = projCost(a);
        setText(b.querySelector('.rw'), t('pr.cost', { n: fmt(cost) }) + ' · ' + (a ? rewardB(q, x) : t('pr.rwA', { n: fmt(projData(q)) })));
        setText(b.querySelector('.go'), t('pr.est', { s: stars(q) }) + (q < 3 ? ' · ' + qHint(a) : ''));
        b.disabled = state.data < cost;
      });
      const sk = projBox.querySelector('[data-pdo="skip"]');
      if (sk) { const w = state.projSkipAt - now; setText(sk, w > 0 ? t('pr.skipWait', { t: leftText(w) }) : t('pr.skip')); sk.disabled = w > 0 || (x.story && !state.projStory[O.id]); }
    }
  }
  projBox.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    Snd.init();
    const now = Date.now();
    if (b.dataset.pgo != null && state.projOffer && !state.proj) {
      const a = Number(b.dataset.pgo), cost = projCost(a);
      if (state.data < cost) { Snd.nope(); return; }
      state.data -= cost;
      state.proj = { id: state.projOffer.id, a: a, until: now + PMODE[a].ms, q: projQuality(a) };
      state.projOffer = null;
      Snd.buy(); buzz(12);
      say(t(a ? 'pr.goSlow' : 'pr.goFast'), 'wow', 2200);
    } else if (b.dataset.pdo === 'cancel' && state.proj) {
      state.projOffer = { id: state.proj.id };
      state.proj = null;
      toast(t('pr.canceled'));
    } else if (b.dataset.pdo === 'skip' && state.projOffer && now >= state.projSkipAt) {
      state.projSkipAt = now + 600000;
      state.projOffer = { id: nextOffer() };
    } else if (b.dataset.pdo === 'deliver' && state.proj && now >= state.proj.until) {
      const P = state.proj, x = PROJ_BY[P.id], X = projText(P.id);
      let msg;
      if (P.a) {
        const first = firstStory(x), ch = P.q + (first ? 2 : 0);
        state.chips += ch; state.refs++;
        if (first) { state.projStory[x.id] = 1; if (x.cos) { state.cos = x.cos; syncSettings(); } }
        msg = t('pr.gotB', { c: ch, p: Math.round(BAL.refBonus * 100) });
        showStory(X.c, X.t, X.eB + (first && x.cos ? '\n\n' + t('pr.newCos', { n: TX().costumes[x.cos].n }) : ''));
      } else {
        const v = projData(P.q);
        addData(v);
        if (x.story && !state.projStory[x.id]) state.projStory[x.id] = 'f';
        msg = t('pr.gotA', { n: fmt(v) });
        say(X.eA, 'wow', 3200);
      }
      state.projDone++;
      state.proj = null;
      state.projOffer = { id: nextOffer() };
      progress('proj', 1);
      Snd.ach(); buzz([15, 40, 15]);
      toast(t('pr.delivered', { m: msg }));
    }
    projKey = '';
    updateAll(); save();
  });

  /* ---------- Reklam kancası (yalnızca mobil uygulama sürümü için) ----------
     Web sürümünde reklam yoktur. İleride yerel bir uygulama window.YZAds.show() sağlarsa
     yalnızca oyuncunun kendi seçtiği ödüllü reklamlar (ör. 30 dk ×2, günde en fazla 5) açılacak. */
  const Ads = window.YZAds && typeof window.YZAds.show === 'function' ? window.YZAds : null;

  /* ---------- Sekmeler ---------- */
  let curTab = 'gen';
  // Kompakt sahne: Kaynaklar dışındaki sekmelerde ya da liste aşağı kaydırılınca beyin küçülür, liste büyür.
  const appEl = document.querySelector('.app'), panelsEl = $('panels');
  function syncCompact() {
    const st = panelsEl.scrollTop, on = appEl.classList.contains('compact');
    const want = curTab !== 'gen' || (on ? st > 8 : st > 60);
    if (want !== on) appEl.classList.toggle('compact', want);
  }
  panelsEl.addEventListener('scroll', syncCompact, { passive: true });
  function selectTab(id) {
    curTab = id;
    state.opt.tab = id;
    document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== 'panel-' + id; });
    $('panels').scrollTop = 0;
    syncCompact();
    updatePanel(true);
  }
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { Snd.init(); selectTab(b.dataset.tab); }));
  function selectSub(id) {
    state.opt.msub = id;
    document.querySelectorAll('#msub [data-msub]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.msub === id)));
    document.querySelectorAll('#panel-model [data-sub]').forEach(d => { d.hidden = d.dataset.sub !== id; });
    updatePanel(true);
  }
  $('msub').addEventListener('click', e => { const b = e.target.closest('[data-msub]'); if (b) selectSub(b.dataset.msub); });

  /* ---------- Göstergeler ---------- */
  let lastTier = -1;
  function updateTop() {
    setText($('data'), fmt(state.data));
    setText($('dps'), t('hud.rate', { n: fmt(dps()) }));
    setText($('brainPow'), t('hud.power', { n: fmt(brainPower()) }));
    setText($('multAll'), '×' + fmt(globalMult() * srcGlobal()));
    setText($('tapNote'), '+' + fmt(tapValue()) + ' ' + t('hud.perTap'));
    const idx = tierIdx();
    setText($('tierName'), tierName(idx));
    setText($('labChip'), state.ch ? '⚑ ' + TX().chal[state.ch.id].n : labText().n + (loopN() ? ' · ' + t('lab.short', { n: loopN() + 1 }) : ''));
    if (idx < TIERS.length - 1) {
      const lo = idx === 0 ? 0 : Math.log10(TIERS[idx].at), hi = Math.log10(TIERS[idx + 1].at);
      const pct = Math.max(0, Math.min(1, (Math.log10(1 + state.run) - lo) / (hi - lo)));
      $('tierBar').style.width = (pct * 100).toFixed(1) + '%';
      setText($('tierNext'), t('hud.next', { t: tierName(idx + 1), n: fmt(TIERS[idx + 1].at) }));
    } else {
      $('tierBar').style.width = '100%';
      setText($('tierNext'), t('hud.max'));
    }
    if (lastTier >= 0 && idx > lastTier) {
      state.bestTier = Math.max(state.bestTier, idx);
      rebuild();
      for (let i = 0; i < 6; i++) setTimeout(() => { const n = pick(state.neurons); if (n) fire(n.s, 'grape'); }, i * 80);
      const rn = REG[idx] ? regName(idx) : tierName(idx);
      sayA('tier.up', { r: rn, t: tierName(idx) }, 'wow', 2600);
      postReact(alignment() === 'h' ? 'react-h' : alignment() === 'f' ? 'react-f' : 'react-n');
      setTimeout(openChoice, 700);
    }
    lastTier = idx;
  }
  function updateBadges() {
    const affordableUps = availUps().filter(u => state.data >= upCost(u)).length;
    setText($('upBadge'), affordableUps ? String(affordableUps) : '');
    const cl = claimable() + (state.mission && Date.now() >= state.mission.until ? 1 : 0);
    setText($('goalBadge'), cl ? String(cl) : '');
    setText($('modelBadge'), prestRec() ? '!' : '');
    setText($('projBadge'), state.proj && Date.now() >= state.proj.until ? '!' : '');
    $('tab-proj').classList.toggle('locked', !projOpen());
  }
  function updatePanel(force) {
    if (curTab === 'gen') { updateGens(); if (force || tickN % 8 === 0) updateAutoUi(); }
    else if (curTab === 'up') updateUpgrades();
    else if (curTab === 'proj') updateProj();
    else if (curTab === 'goal') { updateEvent(); updateMissions(); updateTasks(); }
    else if (state.opt.msub === 'kasa') updateKasa();
    else if (state.opt.msub === 'stats') updateStats(force);
    else { updateModel(force); updateTek(); updateChal(); }
  }
  function updateAll() {
    updateTop();
    updateBrainBar();
    updatePanel();
    updateTurbo();
    updateBadges();
    updateGoal();
  }

  /* ---------- Sıradaki adım: ekranda hep duran tek satır hedef ---------- */
  // İlk turda sıralı öğretici adımlar; sonra hazır ödül, proje, eğitim ya da sıradaki seviye.
  const STEPS = [
    { k: 'tap', done: () => state.clicks >= 10, p: () => state.clicks / 10, v: () => ({ n: Math.min(10, state.clicks) }), go: 'brainBtn' },
    { k: 'n1', done: () => state.nBought >= 1, p: () => state.data / neuronCost(), v: () => ({ b: t('n.buy') }), go: 'nBuy' },
    { k: 'merge', done: () => state.merges >= 1, v: () => ({ b: t('n.merge') }), go: 'nMerge' },
    { k: 'gen1', done: () => totalGen() >= 1, p: () => state.data / costFor(0, 1), v: () => ({ g: gName(0) }), go: 'tab:gen' },
    { k: 'up1', done: () => state.upgBought >= 1, skip: () => !availUps().length, go: 'tab:up' },
    { k: 'gen10', done: () => state.gen[0] >= 10, p: () => state.gen[0] / 10, v: () => ({ g: gName(0) }), go: 'tab:gen' },
    { k: 'gen2', done: () => state.gen[1] >= 1, v: () => ({ g: gName(1) }), go: 'tab:gen' },
    { k: 'syn', done: () => state.synMade >= 1, skip: () => synCap() < 1, v: () => ({ b: t('n.link') }), go: 'nSyn' },
    { k: 'task', done: () => state.taskClaims >= 1, skip: () => !claimable(), go: 'tab:goal' },
    { k: 'proj', done: () => state.projDone >= 1, skip: () => !projOpen(), go: 'tab:proj' }
  ];
  let goalGo = null;
  function curStep() {
    if (state.runs === 0 && !state.tek) {
      const st = STEPS.find(x => !x.done() && !(x.skip && x.skip()));
      if (st) return { txt: t('step.' + st.k, st.v ? st.v() : null), p: st.p ? st.p() : 0, go: st.go };
    }
    if (claimable()) return { txt: t('step.rw', { n: claimable() }), p: 1, go: 'tab:goal' };
    if (state.proj && Date.now() >= state.proj.until) return { txt: t('step.projR'), p: 1, go: 'tab:proj' };
    if (prestRec()) return { txt: t('step.prest', { g: gain() }), p: 1, go: 'tab:model' };
    const ti = tierIdx(), nx = TIERS[ti + 1];
    if (nx && !state.ch && ti < 7) return { txt: t('step.tier', { t: tierName(ti + 1) }), p: Math.log10(1 + state.run) / Math.log10(1 + nx.at), go: null };
    if (state.ch) return { txt: t('ch.goal', { g: fmt(CHAL_BY[state.ch.id].goal) }), p: state.run / CHAL_BY[state.ch.id].goal, go: 'tab:model' };
    return { txt: t('step.prestTo', { g: gain(), r: recGain() }), p: gain() / recGain(), go: 'tab:model' };
  }
  function updateGoal() {
    const s = curStep();
    setText($('gbText'), s.txt);
    $('gbBar').style.width = (Math.max(0, Math.min(1, s.p || 0)) * 100).toFixed(1) + '%';
    goalGo = s.go;
    $('goalBar').classList.toggle('go', !!s.go);
  }
  $('goalBar').addEventListener('click', () => {
    Snd.init(); Snd.click();
    if (!goalGo) return;
    if (goalGo.indexOf('tab:') === 0) {
      const tb = goalGo.slice(4);
      if (tb === 'model') { selectSub('train'); }
      selectTab(tb);
      return;
    }
    const el = $(goalGo);
    if (!el) return;
    el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint');
    setTimeout(() => el.classList.remove('hint'), 2400);
  });

  /* ---------- İpuçları ---------- */
  function tips() {
    const s = state.seen;
    if (!s.n1 && state.data >= neuronCost() && state.nBought === 0) { s.n1 = 1; say(t('tip.n1'), 'wow', 2200); return; }
    if (!s.t15 && state.data >= 15 && totalGen() === 0 && state.nBought > 0) { s.t15 = 1; say(t('tip.t15', { g: gName(0) }), 'wow', 2200); return; }
    if (!s.up && availUps().length > 0 && state.run > 40) { s.up = 1; say(t('tip.up'), 'wow', 2000); return; }
    if (!s.combo && combo >= 10) { s.combo = 1; say(t('tip.combo'), 'wow', 2000); return; }
    if (!s.turbo && state.run > 300 && turboReady()) { s.turbo = 1; say(t('tip.turbo'), 'happy'); return; }
    if (!s.goal && state.life > 800) { s.goal = 1; say(t('tip.goal'), 'happy'); return; }
    if (!s.prest && prestRec()) { s.prest = 1; say(t('tip.prest'), 'wow', 2200); return; }
    if (mood !== 'sleep' && Date.now() > nextQuip && Date.now() - lastSayAt > 25000 && Date.now() - lastAct < 45000) {
      const a = alignment(), Q = TX().quips, pool = a === 'n' ? Q.n : Q[a].concat(Q[a], Q.n);
      say(pick(pool), 'happy', 0, 0);
      nextQuip = Date.now() + 55000 + Math.random() * 35000;
      return;
    }
    if (mood !== 'sleep' && Date.now() - lastAct > 45000 && !cur) {
      say(t('nero.sleep.' + alignment()), 'sleep', 0, 0);
      clearTimeout(moodTimer);
    }
  }

  /* ---------- Döngü ---------- */
  let tickTimer = 0, tickN = 0, ambientAt = 0, botAcc = 0, autoMergeAt = 0, autoBuyAt = 0;
  // Otomatik alıcı: "Verimli" = maliyet / eklenen üretim en düşük olan (eşik ×2'si dahil);
  // "Eşiğe tamamla" = bir sonraki ×2 eşiğine en ucuz ulaşılan kaynak; "Seçili" = yalnız seçtiğin kaynak.
  function genGain(i) {
    const n = state.gen[i], m = srcMult(i), hit = BAL.miles.indexOf(n + 1) >= 0;
    return G[i].r * ((n + 1) * m * (hit ? 2 : 1) - n * m);
  }
  function autoPick() {
    const a = state.auto, open = G.map((_, i) => genBuyable(i));
    if (a.mode === 'sel') return open[a.sel] ? a.sel : -1;
    let best = -1, bv = Infinity, bestA = -1, bvA = Infinity;
    G.forEach((g, i) => {
      if (!open[i]) return;
      let v;
      if (a.mode === 'mile') { const nm = BAL.miles.find(x => x > state.gen[i]); v = nm ? costFor(i, nm - state.gen[i]) : Infinity; }
      else v = costFor(i, 1) / genGain(i);
      if (v < bv) { bv = v; best = i; }
      if (costFor(i, 1) <= state.data && v < bvA) { bvA = v; bestA = i; }
    });
    if (best < 0) return -1;
    if (costFor(best, 1) <= state.data) return best;
    const d = dps(true);
    return d > 0 && (costFor(best, 1) - state.data) / d > 30 ? bestA : -1;
  }
  function autoBuy(times) {
    let k = 0;
    for (; k < times; k++) {
      const i = autoPick();
      if (i < 0 || costFor(i, 1) > state.data) break;
      state.data -= costFor(i, 1);
      state.gen[i]++;
      progress('buy', 1);
    }
    return k;
  }
  function tick() {
    const now = Date.now();
    // Zamanlayıcı uzun süre durduysa (cihaz uykusu vb.) o boşluk çevrimdışı gibi işlenir; tek bir yol, tek sefer kazanç.
    if (now - state.last > 5000) catchUp();
    let dt = (now - state.last) / 1000;
    state.last = now;
    if (dt < 0) dt = 0;
    state.played += dt;
    const d = dps();
    if (d > 0) addData(d * dt);
    tapRateTick(now);
    if (perk('botnet') && !chIs('pasif')) {
      botAcc += 3 * dt;
      let k = 0;
      while (botAcc >= 1 && k++ < 12) { botAcc--; collect(null, null, null, true); }
      if (botAcc > 12) botAcc = 0;
    }
    if (combo > 0 && performance.now() - lastTapAt > 900) { combo = Math.max(0, combo - BAL.comboDecay * labM('combo', 1) * dt); updateCombo(); }
    // Virüsler: yaşarken veriyi emer
    if (viruses.length) {
      state.data = Math.max(0, state.data * Math.pow(0.98, dt * viruses.length));
      viruses = viruses.filter(v => {
        if (now - v.born < v.life) return true;
        const n = pick(state.neurons);
        say(t('virus.escaped'), 'wow', 2000);
        if (n) fire(n.s, 'coral');
        return false;
      });
      render(performance.now());
    }
    if (state.karma < 0 && !choiceOpen) {
      if (!nextVirus) planVirus();
      else if (now >= nextVirus) { spawnVirus(); planVirus(); }
    }
    ensureDaily();
    ensureEvent();
    evAdd('time', dt / 60);
    if (now >= nextPostAt) { postNews(); nextPostAt = now + 45000 + Math.random() * 30000; }
    if (tickN % 20 === 0) renderFeed();
    if (autoMergeOpen() && state.auto.merge && now - autoMergeAt > (state.tree.amerge ? 2000 : 8000)) { autoMergeAt = now; mergeLowest(true, state.auto.protect); }
    if (autoBuyOpen() && state.auto.buy && now - autoBuyAt > (state.tree.abuy ? 1000 : 4000)) { autoBuyAt = now; autoBuy(state.tree.abuy ? 10 : 1); }
    updateAll();
    if (++tickN % (eco() ? 2 : 4) === 0) { checkAch(false); tips(); checkChal(); }
    if (!eco() && d > 0 && now - ambientAt > 2600 && state.neurons.length) {
      ambientAt = now;
      fire(pick(state.neurons).s, 'teal');
    }
  }
  function restartTick() {
    clearInterval(tickTimer);
    if (!document.hidden) tickTimer = setInterval(tick, eco() ? 500 : 250);
  }
  const offRate = () => perk('medical') || state.tree.dream || labM('off', 0) ? 1 : Math.min(1, BAL.offline + kv('hafiza') * 0.08);
  const offCap = () => (state.tree.dream ? 86400 : BAL.offlineCap) + (chWon('pasif') ? 43200 : 0);
  // Çevrimdışı: yalnız pasif kaynak üretimi, geçici güçlendirmeler hariç. Kısa yokluklar (≤60 sn) doğrudan eklenir,
  // uzunlar "Topla" kutusuna birikir. Eğitim/Tekillik öncesi kutu otomatik toplanır (bankOffline).
  function catchUp() {
    const now = Date.now(), el = Math.max(0, (now - state.last) / 1000), rate = dps(true);
    state.last = now;
    if (el < 1 || rate <= 0) return;
    const tt = Math.min(el, offCap()), v = rate * tt * offRate();
    state.played += tt;
    if (el <= 60) { addData(v); return; }
    state.pendingOff += v;
    showOffline(el);
  }
  function bankOffline() {
    if (state.pendingOff <= 0) return;
    const v = state.pendingOff;
    state.pendingOff = 0;
    addData(v);
    closeModal('offline');
  }
  function showOffline(el) {
    if (state.pendingOff <= 0) return;
    $('offText').textContent = t('off.text', { t: el ? fmtTime(el) : '—', n: fmt(state.pendingOff), p: Math.round(offRate() * 100), h: Math.round(offCap() / 3600) });
    // Qayıdış yekunu: sen yokken hazır olan işler (dokununca oraya gider)
    const L = $('offList'), now = Date.now(), items = [];
    if (state.proj && now >= state.proj.until) items.push([t('sum.proj', { c: projText(state.proj.id).c }), 'proj']);
    if (state.mission && now >= state.mission.until) items.push([t('sum.trip'), 'goal']);
    if (claimable()) items.push([t('sum.tasks', { n: claimable() }), 'goal']);
    if (prestRec()) items.push([t('sum.prest'), 'model']);
    L.innerHTML = '';
    items.forEach(it => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sumitem'; b.dataset.go = it[1];
      b.textContent = '▸ ' + it[0];
      L.appendChild(b);
    });
    L.hidden = !items.length;
    $('offX2').hidden = !turboReady();
    openModal('offline');
  }
  function claimOffline(x2) {
    let v = state.pendingOff;
    if (v <= 0) { closeModal('offline'); return; }
    if (x2) { if (!turboReady()) return; v *= 2; state.turboReadyAt = Date.now() + turboCd(); state.turbos++; }
    state.pendingOff = 0;
    addData(v);
    closeModal('offline');
    Snd.init(); Snd.packet(); buzz(15);
    toast(t('off.got', { n: fmt(v) }));
    say(t('off.hi'), 'happy');
    updateAll();
  }
  $('offOk').addEventListener('click', () => claimOffline(false));
  $('offList').addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    claimOffline(false);
    if (b.dataset.go === 'model') selectSub('train');
    selectTab(b.dataset.go);
  });
  $('offX2').addEventListener('click', () => claimOffline(true));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (mg) mgEnd(true);
      save();
      clearInterval(tickTimer);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      Music.stop();
      if (Snd.ctx && Snd.ctx.state === 'running') Snd.ctx.suspend();
    } else {
      catchUp();
      if (Snd.ctx) syncMusic();
      pulses.length = 0; pops.length = 0; flashes.clear();
      render(performance.now());
      restartTick();
      updateAll();
    }
  });
  window.addEventListener('pagehide', save);
  if (navigator.getBattery) {
    navigator.getBattery().then(b => {
      const check = () => {
        const low = b.level <= 0.2 && !b.charging;
        if (low !== batteryLow) {
          batteryLow = low;
          if (state.opt.eco === null) { applyEco(); syncSettings(); if (low) say(t('eco.battery'), 'wow', 2200); }
        }
      };
      check();
      b.addEventListener('levelchange', check);
      b.addEventListener('chargingchange', check);
    }).catch(() => { /* pil bilgisi yok */ });
  }

  /* ---------- Tema, dil ve boyut ---------- */
  function applyTheme() {
    const r = document.documentElement;
    if (state.opt.theme === 'auto') { if (r.dataset.theme && r._ours) { delete r.dataset.theme; } r._ours = false; }
    else { r._ours = true; r.dataset.theme = state.opt.theme; }
    onTheme();
  }
  function onTheme() { readColors(); rebuild(); if (curTab === 'model' && state.opt.msub === 'stats') drawChart(); }
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', onTheme);
  }
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.ResizeObserver) new ResizeObserver(() => layoutBrain()).observe(brainBtn);
  else window.addEventListener('resize', () => layoutBrain());

  // Japonca/Çince yazı tipi yalnız o dil seçilince yüklenir (diğer dillerin açılışı ağırlaşmasın).
  const CJK_FONT = { ja: 'Noto+Sans+JP:wght@400;500;700', zh: 'Noto+Sans+SC:wght@400;500;700' };
  function loadCjkFont(id) {
    if (!CJK_FONT[id] || document.getElementById('font-' + id)) return;
    const l = document.createElement('link');
    l.id = 'font-' + id; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + CJK_FONT[id] + '&display=swap';
    l.onload = () => { readColors(); layoutBrain(true); };
    document.head.appendChild(l);
  }
  function applyLang(id) {
    LANG = LANGS[id] || LANGS.en || LANGS.tr;
    loadCjkFont(LANG.meta.id);
    const r = document.documentElement;
    r.lang = LANG.meta.id; r.dir = LANG.meta.dir;
    document.title = LANG.meta.title;
    state.langsSeen[LANG.meta.id] = 1;
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); el._t = undefined; });
    document.querySelectorAll('[data-ta]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.ta)); el.title = t(el.dataset.ta); });
    document.querySelectorAll('[data-tp]').forEach(el => { el.placeholder = t(el.dataset.tp); });
    upKey = ''; taskKey = ''; misKey = ''; projKey = ''; chKey = ''; evIcoKey = ''; feedKey = '';
    clearSay();
    $('perkList')._k = '';
    rows.forEach(rw => { rw.lang = ''; });
    achTexts();
    if (state.feedLang !== LANG.meta.id) { state.feed = []; lastNews = []; postNews(); }
    readColors();
    rebuild();
    syncAlignLook();
    syncSettings();
    if (choiceOpen) { const c = choiceOpen; choiceOpen = 0; closeModal('choice'); openChoice(c); }
    renderFeed();
    updateAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { readColors(); rebuild(); });
  }

  /* ---------- Açılış ---------- */
  function start(data) {
    const had = (data && typeof data.s === 'string') ? loadFrom(data.s) : load();
    LANG = LANGS[state.opt.lang || detectLang()] || LANGS.en || LANGS.tr;
    ensureDaily();
    ensureEvent();
    buildSettings();
    applyTheme();
    applyLang(LANG.meta.id);
    checkAch(true);
    syncOpts();
    if (had) {
      catchUp();
      if (modalOpen('offline') === false) { if (state.pendingOff > 0) showOffline(0); else if (state.life > 0) say(t('hello.back'), 'happy'); }
    } else { state.last = Date.now(); say(t('hello.new'), 'happy'); }
    lastTier = tierIdx();
    selectTab(state.opt.tab || 'gen');
    selectSub(state.opt.msub || 'train');
    layoutBrain(true);
    updateAll();
    restartTick();
    setInterval(() => { if (!document.hidden) save(); }, 5000);
    scheduleBonus(true);
    blinkLoop();
    if (pendingTier()) setTimeout(openChoice, 600);
  }
  if (location.hash === '#debug') window.__bot = function (taps, pol) {
    pol = pol || {};
    if (modalOpen('story')) $('stOk').click();
    if (choiceOpen) choose(pol.side || 'f');
    if (modalOpen('quiz')) { const b = $('qOpts').querySelector('button'); if (b) b.click(); }
    for (let i = 0; i < taps; i++) collect(null, null, null, false);
    let guard = 0;
    while (mergeLowest(true) && guard++ < 40) { /* birleştir */ }
    const s = freeSlot();
    if (s >= 0 && neuronCost() <= state.data * 0.3) { state.data -= neuronCost(); state.nBought++; state.neurons.push({ s: s, l: 1 }); brainDirty(); }
    UP.filter(u => !state.upg[u.id] && u.ok() && upCost(u) <= state.data).sort((a, b) => a.cost - b.cost).forEach(u => {
      if (upCost(u) <= state.data) { state.data -= upCost(u); state.upg[u.id] = true; state.upgBought++; brainDirty(); }
    });
    for (let k = 0; k < 80; k++) {
      let best = -1, bv = Infinity, bestA = -1, bvA = Infinity;
      const d = Math.max(1e-9, dps());
      G.forEach((g, i) => {
        if (!genBuyable(i)) return;
        const c = costFor(i, 1), v = c / (g.r * srcMult(i));
        if (v < bv) { bv = v; best = i; }
        if (c <= state.data && v < bvA) { bvA = v; bestA = i; }
      });
      if (best < 0) break;
      if (costFor(best, 1) <= state.data) { state.data -= costFor(best, 1); state.gen[best]++; continue; }
      if ((costFor(best, 1) - state.data) / d < 30 || bestA < 0) break;
      state.data -= costFor(bestA, 1); state.gen[bestA]++;
    }
    if (state.syn.length < synCap() && state.neurons.length > 1) {
      const ns = state.neurons.slice().sort((a, b) => b.l - a.l);
      for (let i = 0; i < ns.length && state.syn.length < synCap(); i++) for (let j = i + 1; j < ns.length && state.syn.length < synCap(); j++) {
        if (synIndex(ns[i].s, ns[j].s) < 0) { state.syn.push(synKey(ns[i].s, ns[j].s)); brainDirty(); }
      }
    }
    if (turboReady() && pol.turbo !== false) startTurbo(true);
    const pk = document.querySelector('.packet'); if (pk && pol.packets !== false) pk.click();
    const g = gain();
    if (g >= Math.max(pol.firstPrestige || 5, state.params * (pol.prestigeRatio || 1))) {
      state.params += g; state.chips += 1 + Math.floor(Math.sqrt(g)); state.runs++; resetRun(); return 'prestige:' + g;
    }
    return '';
  };
  if (location.hash === '#debug') window.__tick = tick;
  if (location.hash === '#debug') window.__yz = { state: state, B: B, rebuild: rebuild, updateAll: updateAll, spawnVirus: spawnVirus, openChoice: openChoice, tapValue: tapValue, dps: dps, openQuiz: openQuiz,
    spawnSurprise: spawnSurprise, updateTek: updateTek, tierIdx: tierIdx, gain: gain, catchUp: catchUp, save: save, loadFrom: loadFrom, chEnter: chEnter, chExit: chExit, powerOf: powerOf,
    autoBuy: autoBuy, tick: tick, KEY: KEY, applyLang: applyLang, LANGS: LANGS, t: t, showStory: showStory, postNews: postNews, say: say };
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) { try { hot.snapshot(() => ({ s: JSON.stringify(state) })); } catch (e) { /* yok */ } }
  if (hot && hot.ready) hot.ready(start);
  else start((hot && hot.data) || {});
