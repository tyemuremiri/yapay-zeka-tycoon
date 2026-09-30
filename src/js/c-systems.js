
  /* ---------- Direniş virüsü (düşman yolu) ---------- */
  let nextVirus = 0;
  function planVirus() {
    const k = Math.max(1, -state.karma);
    nextVirus = Date.now() + Math.max(30, 130 - 12 * k) * 1000 * (perk('replicate') ? 0.5 : 1) * Math.pow(0.85, genCount('h')) * (0.7 + Math.random() * 0.6);
  }
  function spawnVirus() {
    if (!state.neurons.length || viruses.length) return;
    const n = pick(state.neurons), p = B.slots[n.s];
    if (!p) return;
    viruses.push({ x: Math.max(26, Math.min(B.w - 26, p.x + 18)), y: Math.max(26, Math.min(B.h - 26, p.y - 18)), born: Date.now(), life: 12000 });
    Snd.virus(); buzz([40, 40, 40]);
    say(t('virus.come'), 'wow', 2600);
    render(performance.now());
    wake();
  }
  function killVirus(i) {
    viruses.splice(i, 1);
    state.viruses++;
    const r = Math.max(50, dps() * 15);
    addData(r);
    Snd.packet(); buzz(15);
    toast(t('virus.killed', { n: fmt(r) }));
    sayA('virus.gone', null, 'happy');
    render(performance.now());
    updateTop();
  }

  /* ---------- Veri paketi ve sürprizler ---------- */
  function spawnPacket() {
    if (brainWrap.querySelector('.packet') || mg || chIs('pasif')) return;
    const r = Math.random();
    const kind = !state.seen.packet || r < 0.55 ? 'box' : r < 0.7 ? 'quiz' : r < 0.85 ? 'hallu' : 'duck';
    if (kind !== 'box') return spawnSurprise(kind);
    const gift = alignment() === 'f';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'packet' + (gift ? ' gift' : '');
    b.setAttribute('aria-label', t(gift ? 'pk.giftAria' : 'pk.aria'));
    b.innerHTML = svg(gift ? 'heart' : 'box');
    b.style.left = (6 + Math.random() * 72) + '%';
    b.style.top = (14 + Math.random() * 50) + '%';
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      const g = Math.max(25, dps() * 40 + tapValue() * 12) * (gift ? 2 : 1);
      addData(g);
      state.packets++;
      progress('packet', 1);
      evAdd('packet', 1);
      b.remove();
      Snd.init(); Snd.packet(); buzz([10, 40, 10]);
      say(t(gift ? 'pk.gift' : 'pk.got', { n: fmt(g) }), 'wow', 1600);
      for (let i = 0; i < 3; i++) setTimeout(() => { const n = pick(state.neurons); if (n) fire(n.s, 'coral'); }, i * 90);
      updateAll();
    });
    b.addEventListener('pointerdown', ev => ev.stopPropagation());
    b.addEventListener('touchstart', ev => ev.stopPropagation(), { passive: true });
    brainWrap.appendChild(b);
    if (!state.seen.packet) { state.seen.packet = 1; say(t('tip.packet'), 'wow', 2200); }
    setTimeout(() => b.remove(), 9000);
  }
  const SURPRISE = { quiz: { icon: 'quiz', bg: 'var(--sky)' }, hallu: { icon: 'spark', bg: 'var(--pink)' }, duck: { icon: 'duck', bg: 'var(--sun)' } };
  function spawnSurprise(kind) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'packet';
    b.style.setProperty('--pk', SURPRISE[kind].bg);
    b.setAttribute('aria-label', t('pk.' + kind));
    b.innerHTML = svg(SURPRISE[kind].icon);
    b.style.left = (6 + Math.random() * 72) + '%';
    b.style.top = (14 + Math.random() * 50) + '%';
    b.addEventListener('pointerdown', ev => ev.stopPropagation());
    b.addEventListener('touchstart', ev => ev.stopPropagation(), { passive: true });
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      b.remove();
      state.packets++;
      progress('packet', 1);
      evAdd('packet', 1);
      Snd.init(); Snd.packet(); buzz([10, 40, 10]);
      if (kind === 'quiz') openQuiz();
      else if (kind === 'hallu') {
        state.halluLeft = 15;
        say(t('hallu.start'), 'wow', 2400);
      } else {
        const n = viruses.length;
        viruses = [];
        state.turboReadyAt = Math.max(Date.now(), state.turboReadyAt - 60000);
        const g = Math.max(50, dps() * 30);
        addData(g);
        say(t('duck', { n: fmt(g) }) + (n ? ' ' + t('duck.virus') : ''), 'wow', 2600);
        render(performance.now());
      }
      updateAll();
    });
    brainWrap.appendChild(b);
    setTimeout(() => b.remove(), 9000);
  }

  /* ---------- Nöro'nun sorusu ---------- */
  function openQuiz() {
    const q = pick(TX().quiz);
    setText($('qTitle'), q.q);
    const box = $('qOpts');
    box.innerHTML = '';
    q.a.map((a, i) => i).sort(() => Math.random() - 0.5).forEach(i => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'qopt btn';
      b.textContent = q.a[i];
      b.addEventListener('click', () => answer(q, i));
      box.appendChild(b);
    });
    openModal('quiz');
  }
  function answer(q, i) {
    closeModal('quiz');
    if (i === q.c) {
      state.inspireUntil = Date.now() + 60000;
      state.quizOk++;
      Snd.ach(); buzz([15, 40, 15]);
      say(t('quiz.ok', { ok: q.ok }), 'wow', 2400);
    } else {
      Snd.nope();
      say(t('quiz.no', { a: q.a[q.c] }), 'wow', 2400);
    }
    updateAll();
  }
  function scheduleBonus(first) {
    const f = (perk('donate') ? 0.5 : 1) * (evIs('fest') ? 0.34 : 1) / labM('pack', 1) / (1 + kv('ordek') * 0.1);
    setTimeout(() => {
      if (!document.hidden) spawnPacket();
      scheduleBonus(false);
    }, ((first ? 25000 : 45000) + Math.random() * (first ? 10000 : 40000)) * f);
  }

  /* ---------- Kaynaklar ---------- */
  const rows = [];
  const genList = $('genList');
  G.forEach((g, i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.hidden = true;
    row.style.setProperty('--c', 'var(' + g.col + ')');
    row.innerHTML = '<div class="ico">' + svg(g.i) + '<span class="cnt">0</span></div>' +
      '<div class="info"><div class="name"></div><div class="cyc" hidden><i></i><b></b></div><div class="meta"></div><div class="mile"></div></div>' +
      '<button type="button" class="buy btn" data-buy="' + i + '"><span class="b1"></span><span class="b2"></span></button>';
    genList.appendChild(row);
    rows.push({ row: row, ico: row.querySelector('.ico'), cnt: null, name: row.querySelector('.name'),
      meta: row.querySelector('.meta'), mile: row.querySelector('.mile'), btn: row.querySelector('.buy'), b1: row.querySelector('.b1'), b2: row.querySelector('.b2'), locked: null, lang: '',
      cyc: row.querySelector('.cyc'), bar: row.querySelector('.cyc i'), pay: row.querySelector('.cyc b'), dur: 0 });
    // Döngü bitince satırdan "+X" yükselir (yalnız görsel; en fazla saniyede bir).
    row.querySelector('.cyc i').addEventListener('animationiteration', () => {
      const r = rows[i];
      if (eco() || r.dur < 1 || state.opt.tab !== 'gen') return;
      const f = document.createElement('span');
      f.className = 'cyc-pop';
      f.textContent = r.pay.textContent;
      r.cyc.appendChild(f);
      f.addEventListener('animationend', () => f.remove());
    });
  });
  function flashRow(i, big) {
    const r = rows[i].row;
    r.classList.remove('bump', 'mile-up');
    void r.offsetWidth;
    r.classList.add(big ? 'mile-up' : 'bump');
  }
  function buyGen(i) {
    if (!genBuyable(i)) { Snd.nope(); toast(t('ch.embargo')); return; }
    const p = planBuy(i);
    if (!p.can) { Snd.nope(); return; }
    const before = srcMult(i);
    state.data -= p.cost;
    state.gen[i] += p.n;
    progress('buy', p.n);
    Snd.buy(); buzz(12);
    if (srcMult(i) > before) {
      const kinds = {};
      BAL.miles.forEach((m, k) => { if (m > state.gen[i] - p.n && m <= state.gen[i]) kinds[mileKind(k)] = 1; });
      toast(t(kinds.spd && kinds.out ? 'gen.mile' : kinds.spd ? 'gen.mileSpd' : 'gen.mileOut', { g: gName(i) }));
    }
    flashRow(i, srcMult(i) > before);
    const n = pick(state.neurons);
    if (n) fire(n.s, 'teal');
    if (!state.seen.gen1) { state.seen.gen1 = 1; say(t('tip.gen1'), 'wow', 2400); }
    updateAll();
  }
  genList.addEventListener('click', e => {
    const b = e.target.closest('button[data-buy]');
    if (b) { Snd.init(); buyGen(Number(b.dataset.buy)); }
  });
  $('seg').addEventListener('click', e => {
    const b = e.target.closest('button[data-mode]');
    if (!b) return;
    state.buyMode = isNaN(b.dataset.mode) ? b.dataset.mode : Number(b.dataset.mode);
    updateAll();
  });
  const autoSelRow = $('autoSelRow');
  G.forEach((g, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill-btn'; b.dataset.asel = i; autoSelRow.appendChild(b); });
  $('autoBox').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const a = state.auto;
    if (b.dataset.auto) a[b.dataset.auto] = !a[b.dataset.auto];
    else if (b.dataset.amode) a.mode = b.dataset.amode;
    else if (b.dataset.asel != null) { a.sel = Number(b.dataset.asel); a.mode = 'sel'; }
    Snd.init(); Snd.click();
    updateAutoUi(); save();
  });
  function updateAutoUi() {
    const a = state.auto, ob = autoBuyOpen(), om = autoMergeOpen();
    $('autoBox').hidden = state.runs < 1 && !ob && state.life < 1e6;
    setText($('autoNote'), !ob ? t('auto.lockedBuy')
      : t(state.tree.abuy ? 'auto.buyFast' : 'auto.buySlow') + ' ' + (om ? t('auto.merge', { n: state.tree.amerge ? 2 : 8 }) : t('auto.lockedMerge')) + ' ' + t('auto.offline'));
    setText($('autoSum'), ob ? t(a.buy ? 'auto.on' : 'auto.off') : t('auto.locked'));
    document.querySelectorAll('#autoBox [data-auto]').forEach(b => {
      const k = b.dataset.auto, lock = k === 'buy' ? !ob : !om;
      b.disabled = lock;
      b.setAttribute('aria-pressed', String(!!a[k] && !lock));
      setText(b, k === 'protect' ? t('auto.protect') : t(a[k] ? 'sw.on' : 'sw.off'));
    });
    document.querySelectorAll('#autoBox [data-amode]').forEach(b => { b.disabled = !ob; b.setAttribute('aria-pressed', String(a.mode === b.dataset.amode)); });
    $('autoSelRow').hidden = !ob || a.mode !== 'sel';
    document.querySelectorAll('#autoBox [data-asel]').forEach(b => { const i = Number(b.dataset.asel); setText(b, gName(i)); b.hidden = !genOpen(i); b.setAttribute('aria-pressed', String(a.sel === i)); });
  }
  function updateGens() {
    const gm = BAL.srcK * globalMult() * srcGlobal() * brainIdle();
    let shownLocked = false;
    G.forEach((g, i) => {
      const r = rows[i];
      const open = genOpen(i);
      const teaser = !open && !shownLocked;
      if (teaser) shownLocked = true;
      r.row.hidden = !open && !teaser;
      if (r.row.hidden) return;
      if (r.locked !== !open || r.lang !== LANG.meta.id) {
        r.locked = !open; r.lang = LANG.meta.id;
        r.row.classList.toggle('locked', !open);
        r.ico.innerHTML = svg(open ? g.i : 'lock') + '<span class="cnt">0</span>';
        r.cnt = r.ico.querySelector('.cnt'); r.cnt._t = undefined;
        r.name.textContent = open ? gName(i) : '???';
        r.name.title = open ? TX().gens[i].d : '';
      }
      const p = planBuy(i);
      const each = g.r * srcMult(i) * gm;
      setText(r.cnt, String(state.gen[i]));
      setText(r.meta, open ? t('gen.meta', { a: fmt(each), b: fmt(each * state.gen[i]) }) : t('gen.lock'));
      const nk = nextMileIdx(state.gen[i]);
      setText(r.mile, open && nk >= 0 ? t(mileKind(nk) === 'spd' ? 'gen.nextSpd' : 'gen.nextOut', { m: BAL.miles[nk], n: state.gen[i] }) : open ? TX().gens[i].d : '');
      const has = open && state.gen[i] > 0;
      r.cyc.hidden = !has;
      if (has) {
        const d = cycTime(i);
        if (d !== r.dur) { r.dur = d; r.bar.style.animationDuration = d + 's'; r.cyc.classList.toggle('flow', d < 0.5); }
        setText(r.pay, '+' + fmt(each * state.gen[i] * d));
      }
      setText(r.b1, !open ? '' : !genBuyable(i) ? t('ch.embargoShort') : p.can ? '×' + p.n : (eta(p.cost) || '×' + p.n));
      setText(r.b2, fmt(p.cost));
      r.btn.disabled = !open || !p.can || !genBuyable(i);
    });
    document.querySelectorAll('#seg button').forEach(b => b.setAttribute('aria-pressed', String(String(state.buyMode) === b.dataset.mode)));
  }

  /* ---------- Yükseltmeler ---------- */
  let upKey = '';
  const upList = $('upList');
  const availUps = () => UP.filter(u => !state.upg[u.id] && u.ok()).sort((a, b) => a.cost - b.cost);
  let upHold = 0;
  function updateUpgrades() {
    if (Date.now() < upHold) return;
    const avail = availUps().slice(0, 14);
    const key = avail.map(u => u.id).join() + (perk('opensrc') ? 'o' : '') + LANG.meta.id + state.opt.sci;
    if (key !== upKey) {
      upKey = key;
      upList.innerHTML = '';
      if (!avail.length) {
        const p = document.createElement('p');
        p.className = 'empty';
        p.textContent = t('up.empty');
        upList.appendChild(p);
      } else {
        avail.forEach(u => {
          const d = document.createElement('div');
          d.className = 'row up';
          d.innerHTML = '<div class="info"><div class="name"></div><div class="desc"></div></div>' +
            '<button type="button" class="buy btn" data-up="' + u.id + '"><span class="b1"></span><span class="b2"></span></button>';
          const tx = upText(u);
          d.querySelector('.name').textContent = tx.n;
          d.querySelector('.desc').textContent = tx.e;
          d.querySelector('.b2').textContent = fmt(upCost(u));
          upList.appendChild(d);
        });
      }
    }
    upList.querySelectorAll('button[data-up]').forEach(b => {
      const c = upCost(UPMAP[b.dataset.up]), can = state.data >= c;
      b.disabled = !can;
      setText(b.querySelector('.b1'), can ? t('btn.buy') : (eta(c) || t('btn.buy')));
    });
  }
  upList.addEventListener('click', e => {
    const b = e.target.closest('button[data-up]');
    if (!b) return;
    Snd.init();
    const u = UPMAP[b.dataset.up];
    if (!u || state.upg[u.id] || !u.ok() || state.data < upCost(u)) { Snd.nope(); return; }
    state.data -= upCost(u);
    state.upg[u.id] = true;
    state.upgBought++;
    progress('upg', 1);
    upKey = '';
    brainDirty();
    if (!eco()) { b.closest('.row').classList.add('gone'); upHold = Date.now() + 340; setTimeout(updateUpgrades, 360); }
    Snd.buy(); buzz(12);
    toast(t('up.bought', { n: upText(u).n }));
    if (u.id[0] === 's' || u.id[0] === 'n') rebuild();
    updateAll();
  });

  /* ---------- Karakter seçimi ---------- */
  let choiceOpen = 0;
  function pendingTier() {
    const tr = tierIdx();
    for (let i = 1; i <= tr; i++) if (!state.choices[i]) return i;
    return 0;
  }
  function openChoice() {
    const tr = pendingTier();
    if (!tr || choiceOpen || modalOpen('story')) return;
    choiceOpen = tr;
    setText($('chEyebrow'), t('choice.eyebrow', { t: tierName(tr) }) + ' · ' + (REG[tr] ? t('choice.region', { r: regName(tr) }) : t('choice.x')));
    const st = !state.storySeen[tr] && TX().story[tr];
    setText($('chText'), (st ? st.replace(/\n/g, ' ') + ' — ' : '') + t('choice.karma', { k: (state.karma > 0 ? '+' : '') + state.karma }));
    [['chF', 'f'], ['chH', 'h']].forEach(p => {
      const el = $(p[0]), c = cardText(tr, p[1]);
      el.querySelector('b').textContent = c.n;
      el.querySelector('.d').textContent = c.d;
    });
    openModal('choice');
    Snd.tier(); buzz([30, 60, 30]);
  }
  function choose(side) {
    const tr = choiceOpen;
    if (!tr) return;
    const before = alignment();
    state.choices[tr] = side;
    state.karma = Math.max(-7, Math.min(7, state.karma + (side === 'f' ? 1 : -1)));
    choiceOpen = 0;
    closeModal('choice');
    brainDirty();
    const after = alignment();
    syncAlignLook();
    rebuild();
    if (side === 'h') { Snd.evil(); if (state.karma < 0 && !nextVirus) planVirus(); } else Snd.ach();
    if (after !== before && after === 'h') say(t('mode.dark'), 'wow', 3000);
    else if (after !== before && after === 'f') say(t('mode.light'), 'wow', 3000);
    else if (side === 'f') say(t('choice.f', { n: cardText(tr, 'f').n }), 'happy');
    else say(t('choice.h', { n: cardText(tr, 'h').n }), 'wow', 1800);
    state.storySeen[tr] = 1;
    postReact(side === 'h' ? 'react-h' : side === 'f' ? 'react-f' : 'react-n');
    if (tr === 7 && !state.endings[alignment()]) {
      state.endings[alignment()] = 1;
      const e = TX().endings[alignment()];
      setTimeout(() => showStory(t('story.final'), e[0], e[1]), 500);
    } else if (pendingTier()) setTimeout(openChoice, 400);
    updateAll();
    save();
  }
  $('chF').addEventListener('click', () => choose('f'));
  $('chH').addEventListener('click', () => choose('h'));

  /* ---------- Günlük görevler (esnek: her satırda "X veya Y") ----------
     Her satırda bir aktif (dokunma, Aha, paket, birleştirme) ve bir rahat seçenek (veri, alışveriş, gezi, proje) var;
     hangisi önce biterse satır tamamlanır. Günde bir ücretsiz "Değiştir", imkânsız hale gelen satır her zaman ücretsiz değişir. */
  const TASKS = {
    tap: { k: 'a', goal: () => pick([150, 300, 500]), ok: () => !chIs('pasif') },
    aha: { k: 'a', goal: () => 5, ok: () => !chIs('pasif') },
    packet: { k: 'a', goal: () => 2, ok: () => !chIs('pasif') },
    merge: { k: 'a', goal: () => state.merges < 10 ? 3 : 6, ok: () => true },
    earn: { k: 'i', goal: () => niceNum(Math.max(500, dps(true) * 1800 + tapValue(true) * 100)), ok: () => true },
    buy: { k: 'i', goal: () => totalGen() < 30 ? 10 : 25, ok: () => true },
    upg: { k: 'i', goal: () => 2, ok: () => UP.filter(u => !state.upg[u.id]).length >= 4 },
    trip: { k: 'i', goal: () => 1, ok: () => true },
    proj: { k: 'i', goal: () => 1, ok: () => projOpen() },
    turbo: { k: 'i', goal: () => 1, ok: () => true }
  };
  const taskTxt = q => t('task.' + q.t, { g: q.t === 'earn' ? fmt(q.goal) : q.goal });
  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  let taskKey = '';
  const mkTask = k => ({ t: k, goal: TASKS[k].goal(), prog: 0 });
  function pickPair(used) {
    const pool = k => Object.keys(TASKS).filter(x => TASKS[x].k === k && TASKS[x].ok() && used.indexOf(x) < 0);
    const A = pool('a'), I = pool('i');
    const a = A[Math.floor(Math.random() * A.length)] || 'merge', i = I[Math.floor(Math.random() * I.length)] || 'earn';
    used.push(a, i);
    return { a: mkTask(a), b: mkTask(i), claimed: false };
  }
  const slotDone = x => x.a.prog >= x.a.goal || x.b.prog >= x.b.goal;
  const slotValid = x => TASKS[x.a.t].ok() || TASKS[x.b.t].ok();
  function ensureDaily() {
    const k = dayKey();
    if (state.daily && state.daily.v === 2 && state.daily.day === k && state.daily.tasks.every(x => x.a && x.b && TASKS[x.a.t] && TASKS[x.b.t])) return;
    const used = [];
    state.daily = { v: 2, day: k, perfect: false, rerolls: 1, tasks: [pickPair(used), pickPair(used), pickPair(used)] };
    taskKey = '';
  }
  function progress(type, n) {
    if (!state.daily) return;
    state.daily.tasks.forEach(x => {
      if (x.claimed || slotDone(x)) return;
      [x.a, x.b].forEach(q => { if (q.t === type) q.prog = Math.min(q.goal, q.prog + n); });
      if (slotDone(x)) {
        const q = x.a.prog >= x.a.goal ? x.a : x.b;
        say(t('task.done', { t: taskTxt(q) }), 'wow', 2400);
        Snd.ach(); buzz([15, 50, 15]);
        taskKey = '';
      }
    });
  }
  // Ödüller geçici güçlendirmeler (turbo, İlham, beğeni) hariç taban üretime göre hesaplanır.
  const taskReward = () => Math.max(250, dps(true) * 300 + tapValue(true) * 100) * (perk('tutor') ? 3 : 1);
  const taskList = $('taskList');
  const qTxt = q => taskTxt(q) + ' · ' + (q.t === 'earn' ? fmt(q.prog) + '/' + fmt(q.goal) : Math.floor(q.prog) + '/' + q.goal);
  function updateTasks() {
    const d = state.daily;
    const key = d.day + d.rerolls + LANG.meta.id + d.tasks.map(x => x.a.t + x.b.t + (slotDone(x) ? (x.claimed ? 'c' : 'r') : 'o') + slotValid(x)).join('');
    if (key !== taskKey) {
      taskKey = key;
      taskList.innerHTML = '';
      d.tasks.forEach((x, i) => {
        const el = document.createElement('div');
        el.className = 'task' + (x.claimed ? ' done' : '');
        el.innerHTML = '<div><div class="t1"></div><div class="t2 alt"></div><div class="t2"></div></div>' +
          '<div class="tacts"><button type="button" class="claim btn" data-claim="' + i + '"></button>' +
          (!x.claimed && !slotDone(x) && (d.rerolls > 0 || !slotValid(x)) ? '<button type="button" class="pill-btn" data-reroll="' + i + '">' + t('task.reroll') + '</button>' : '') +
          '</div><div class="track"><i></i></div>';
        taskList.appendChild(el);
      });
    }
    taskList.querySelectorAll('.task').forEach((el, i) => {
      const x = d.tasks[i], ready = slotDone(x);
      const t2 = el.querySelectorAll('.t2'), btn = el.querySelector('.claim');
      setText(el.querySelector('.t1'), qTxt(x.a));
      setText(t2[0], t('task.or') + ' ' + qTxt(x.b));
      setText(t2[1], x.claimed ? t('task.claimed') : t('task.reward', { n: fmt(taskReward()) }));
      setText(btn, x.claimed ? t('task.took') : ready ? t('btn.claim') : t('task.cont'));
      btn.disabled = !ready || x.claimed;
      const pr = Math.max(x.a.prog / x.a.goal, x.b.prog / x.b.goal);
      el.querySelector('.track i').style.width = (Math.min(1, pr) * 100).toFixed(1) + '%';
    });
    const now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const left = Math.max(0, Math.floor((mid - now) / 60000));
    setText($('dayLeft'), (d.rerolls ? t('task.free') + ' · ' : '') + t('task.renew', { t: t('u.hm', { h: Math.floor(left / 60), m: left % 60 }) }));
  }
  taskList.addEventListener('click', e => {
    const rr = e.target.closest('button[data-reroll]');
    if (rr) {
      const i = Number(rr.dataset.reroll), x = state.daily.tasks[i];
      if (!x || x.claimed || slotDone(x)) return;
      const free = !slotValid(x);
      if (!free && state.daily.rerolls < 1) return;
      if (!free) state.daily.rerolls--;
      const used = [];
      state.daily.tasks.forEach((y, j) => { if (j !== i) used.push(y.a.t, y.b.t); });
      used.push(x.a.t, x.b.t);
      state.daily.tasks[i] = pickPair(used);
      Snd.init(); Snd.buy();
      taskKey = '';
      updateAll();
      return;
    }
    const b = e.target.closest('button[data-claim]');
    if (!b) return;
    const x = state.daily.tasks[Number(b.dataset.claim)];
    if (!x || x.claimed || !slotDone(x)) return;
    const r = taskReward();
    x.claimed = true;
    state.taskClaims++;
    state.chips++;
    state.data += r; state.run += r; state.life += r;
    Snd.init(); Snd.packet(); buzz(15);
    toast(t('task.got', { n: fmt(r) }));
    if (!state.daily.perfect && state.daily.tasks.every(q => q.claimed)) {
      state.daily.perfect = true;
      state.perfectDays++;
      say(t('task.perfect'), 'wow', 2500);
    }
    taskKey = '';
    updateAll();
  });
  const claimable = () => state.daily ? state.daily.tasks.filter(x => slotDone(x) && !x.claimed).length : 0;

  /* ---------- Başarımlar ---------- */
  const achList = $('achList');
  const achEls = {};
  ACH.forEach(a => {
    const el = document.createElement('div');
    el.className = 'ach';
    el.innerHTML = '<span class="medal">?</span><span><b></b><small></small></span>';
    achList.appendChild(el);
    achEls[a.id] = el;
  });
  function achTexts() {
    ACH.forEach(a => { const el = achEls[a.id], x = TX().ach[a.id]; el.querySelector('b').textContent = x.n; el.querySelector('small').textContent = x.d; });
  }
  function checkAch(quiet) {
    if (state.ach.friend) state.skins.sky = 1;
    if (state.ach.tyrant) state.skins.coral = 1;
    ACH.forEach(a => {
      if (state.ach[a.id] || !a.ok()) return;
      state.ach[a.id] = true;
      state.chips++;
      if (!quiet) {
        Snd.ach(); buzz([20, 60, 20]);
        toast(t('ach.got', { n: TX().ach[a.id].n }));
      }
    });
    ACH.forEach(a => {
      const el = achEls[a.id], got = !!state.ach[a.id];
      if (el._got !== got) { el._got = got; el.classList.toggle('got', got); el.querySelector('.medal').textContent = got ? '★' : '?'; }
    });
    setText($('achSum'), t('ach.sum', { a: achCount(), b: ACH.length, p: Math.round(achCount() * BAL.achB * 100) }));
  }

  /* ---------- Model eğitimi ve sıfırlama ---------- */
  function twoStep(btn, armKey, restore, fn) {
    btn.addEventListener('click', () => {
      if (btn._armed) {
        clearTimeout(btn._timer);
        btn._armed = false; btn._t = undefined;
        restore(); fn();
      } else {
        btn._armed = true;
        btn.textContent = t(armKey); btn._t = undefined;
        btn._timer = setTimeout(() => { btn._armed = false; btn._t = undefined; restore(); }, 4000);
      }
    });
  }
  function resetRun() {
    state.data = kv('burs') ? 100 * Math.pow(10, kv('burs')) : 0; state.run = 0; state.gen = G.map(() => 0); state.upg = {};
    state.neurons = [{ s: 0, l: 1 }]; state.syn = []; state.nBought = 0; state.choices = {}; state.karma = 0;
    if (state.tree.start) for (let i = 1; i <= 4; i++) state.neurons.push({ s: i, l: 2 });
    state.halluLeft = 0; state.pendingOff = 0;
    state.comboTopRun = 0;
    viruses = []; nextVirus = 0; combo = 0;
    upKey = ''; lastTier = 0;
    brainDirty();
  }
  const pBtn = $('pBtn');
  twoStep(pBtn, 'arm.sure', () => updateModel(true), () => {
    bankOffline();
    const g = gain();
    if (g < 1) return;
    const ch = 1 + Math.floor(Math.sqrt(g));
    state.params += g;
    state.chips += ch;
    state.runs++;
    resetRun();
    save();
    Snd.init(); Snd.tier(); buzz([30, 60, 30]);
    syncAlignLook();
    const L = labText();
    showStory(t('lab.new') + (loopN() ? ' · ' + t('lab.loop', { n: loopN() + 1 }) : ''), L.n,
      t('lab.gain', { g: g, c: ch }) + '\n\n' + L.d + (labIdx() === 0 && loopN() ? '\n\n' + t('lab.wrap') : '') + '\n\n' + t('lab.again'));
    postReact('react-n');
    rebuild();
    updateAll();
  });
  let chartAt = 0;
  function updateModel(force) {
    const g = gain();
    setText($('mParams'), String(state.params));
    setText($('mMult'), '×' + dec(paramMult().toFixed(2)));
    setText($('mGain'), g >= 1 ? '+' + g : '0');
    const need = BAL.prestigeDiv * Math.pow(g + 1, 1 / BAL.pPow) / Math.pow(perk('aligned') ? 1.5 : 1, 1 / BAL.pPow);
    const rg = recGain(), needRec = BAL.prestigeDiv * Math.pow(rg, 1 / BAL.pPow) / Math.pow(perk('aligned') ? 1.5 : 1, 1 / BAL.pPow);
    setText($('mHint'), state.ch ? t('m.inCh')
      : g >= 1 ? t('m.gain', { d: fmt(state.run + state.pendingOff), g: g, n: fmt(need) }) + ' ' + (g >= rg ? t('m.rec') : t('m.early', { r: rg, d: fmt(needRec) }))
      : t('m.first', { d: fmt(BAL.prestigeDiv), r: fmt(state.run) }));
    pBtn.classList.toggle('rec', g >= rg && !state.ch);
    const nl = labText((state.runs + 1) % LABS.length), pm = state.tree.deep ? 0.15 : BAL.paramBonus;
    const newLoop = (state.runs + 1) % LABS.length === 0;
    setText($('pGainBox'), (g >= 1 ? t('m.prev', { a: dec(paramMult().toFixed(2)), b: dec((1 + (state.params + g) * pm).toFixed(2)), g: g, c: 1 + Math.floor(Math.sqrt(g)) }) : t('m.noGain'))
      + ' ' + t('m.nextLab', { n: nl.n, d: nl.d }) + (newLoop ? ' ' + t('m.loop') : '')
      + (!autoBuyOpen() ? ' ' + t('m.unlockBuy') : state.runs < 3 && !autoMergeOpen() ? ' ' + t('m.unlockMerge') : ''));
    if (!pBtn._armed) setText(pBtn, g >= 1 ? t('m.btnGain', { g: g }) : t('m.btn'));
    pBtn.disabled = g < 1;
    const a = alignment();
    setText($('alignText'), t('align.' + a) + ' · ' + t('karma', { k: (state.karma > 0 ? '+' : '') + state.karma }));
    $('kDot').style.left = (50 + state.karma / 7 * 46).toFixed(1) + '%';
    setText($('alignNote'), t('alignNote.' + a));
    const pk = Object.keys(state.choices).map(k => state.choices[k] + k).join(',') + LANG.meta.id;
    const pl = $('perkList');
    if (pl._k !== pk) {
      pl._k = pk;
      pl.innerHTML = '';
      const grp = {};
      Object.keys(state.choices).forEach(k => {
        const s = state.choices[k], c = cardText(+k, s);
        if (grp[c.n]) { grp[c.n].k++; grp[c.n].el.textContent = c.n + ' ×' + grp[c.n].k; return; }
        const sp = document.createElement('span');
        sp.className = 'perk ' + s;
        sp.textContent = c.n;
        sp.title = c.d;
        grp[c.n] = { k: 1, el: sp };
        pl.appendChild(sp);
      });
    }
  }
  function updateStats(force) {
    setText($('sLife'), fmt(state.life));
    setText($('sClicks'), fmtInt(state.clicks));
    setText($('sMerges'), fmtInt(state.merges));
    setText($('sCrits'), fmtInt(state.crits));
    setText($('sRuns'), String(state.runs));
    setText($('sTime'), fmtTime(state.played));
    setText($('sProj'), String(state.projDone));
    setText($('sBrain'), fmt(brainPower()));
    const now = Date.now();
    if (force || now - chartAt > 2000) { chartAt = now; drawChart(); }
  }
  const QMAX = 21, LAX = 4.5;
  function drawChart() {
    const c = $('chart'), w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
    const g = c.getContext('2d'), k = col;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const L = 30, R = 14, T = 16, Bt = 24;
    const X = q => L + q / QMAX * (w - L - R);
    const Y = l => T + (1 - l / LAX) * (h - T - Bt);
    g.font = '500 11px ' + k.body;
    g.lineWidth = 1;
    [0, 1, 2, 3, 4].forEach(v => {
      g.strokeStyle = k.edge; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - R, Y(v)); g.stroke();
      g.fillStyle = k.muted; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(String(v), L - 7, Y(v));
    });
    [0, 6, 12, 18].forEach(q => { g.fillStyle = k.muted; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(fmt(Math.pow(10, q)), X(q), h - Bt + 7); });
    const q = qNow();
    g.beginPath();
    for (let s = 0; s <= q + 1e-4; s += 0.1) { const x = X(s), y = Y(lossAt(s)); if (s === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.lineTo(X(q), Y(lossAt(q))); g.lineTo(X(q), Y(0)); g.lineTo(X(0), Y(0)); g.closePath();
    g.globalAlpha = 0.16; g.fillStyle = k.teal; g.fill(); g.globalAlpha = 1;
    g.strokeStyle = k.muted; g.setLineDash([4, 5]);
    g.beginPath();
    for (let s = 0; s <= QMAX + 1e-3; s += 0.25) { const x = X(s), y = Y(lossAt(s)); if (s === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke(); g.setLineDash([]);
    g.strokeStyle = k.teal; g.lineWidth = 2.5; g.lineJoin = 'round';
    g.beginPath();
    for (let s = 0; s <= q + 1e-4; s += 0.1) { const x = X(s), y = Y(lossAt(s)); if (s === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.lineTo(X(q), Y(lossAt(q))); g.stroke();
    const mx = X(q), my = Y(lossAt(q));
    g.fillStyle = k.sun; g.strokeStyle = k.bg; g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, 6, 0, 6.2832); g.fill(); g.stroke();
    g.fillStyle = k.fg; g.font = '700 13px ' + k.font; g.textBaseline = 'bottom';
    const right = mx > w * 0.6;
    g.textAlign = right ? 'right' : 'left';
    g.fillText(t('chart.loss', { n: dec(lossAt(q).toFixed(2)) }), mx + (right ? -10 : 10), my - 8);
  }

  /* ---------- Turbo (ücretsiz) ---------- */
  const turboCd = () => perk('safety') ? 360000 : BAL.turboCd;
  const turboReady = () => !turboOn() && Date.now() >= state.turboReadyAt;
  function startTurbo(quiet) {
    const now = Date.now();
    state.turboUntil = now + ((state.tree.turbo ? 180000 : BAL.turboMs) + kv('fan') * 20000) * labM('turbo', 1);
    state.turboReadyAt = now + turboCd();
    state.turbos++;
    progress('turbo', 1);
    if (!quiet) {
      Snd.init(); Snd.turbo(); buzz([20, 40, 20, 40, 20]);
      say(t('turbo.on'), 'wow', 2000);
      for (let i = 0; i < 5; i++) setTimeout(() => { const n = pick(state.neurons); if (n) fire(n.s, 'coral'); }, i * 80);
    }
  }
  $('turboBtn').addEventListener('click', () => { if (!turboReady()) return; startTurbo(false); updateAll(); });
  function updateTurbo() {
    const now = Date.now(), b = $('turboBtn');
    if (turboOn()) {
      b.disabled = true; b.classList.add('live');
      setText($('turboT1'), t('turbo.live'));
      setText($('turboT2'), mmss((state.turboUntil - now) / 1000));
    } else if (now < state.turboReadyAt) {
      b.disabled = true; b.classList.remove('live');
      setText($('turboT1'), t('turbo.charge'));
      setText($('turboT2'), mmss((state.turboReadyAt - now) / 1000));
    } else {
      b.disabled = false; b.classList.remove('live');
      setText($('turboT1'), t('turbo.name'));
      setText($('turboT2'), t('turbo.ready', { n: state.tree.turbo ? 3 : 2 }));
    }
    $('turboPill').hidden = !turboOn();
    $('inspPill').hidden = !inspireOn();
    const bp = ['tap', 'src', 'crit'].filter(k => newsOn(k)).map(k => t('buff.s.' + k) + ' ' + mmss((state.buffs[k] - now) / 1000));
    const bk = bp.join('|');
    const bpe = $('buffPills');
    if (bpe._k !== bk) { bpe._k = bk; bpe.innerHTML = ''; bp.forEach(s => { const sp = document.createElement('span'); sp.className = 'pill buff'; sp.textContent = s; bpe.appendChild(sp); }); }
    updateMgBtn();
  }

  /* ---------- Mini oyun: Direniş Dalgası / Birlikte Bilim ---------- */
  let mg = null;
  const MG_CD = 1200000;
  const mgUnlocked = () => tierIdx() >= 4 && alignment() !== 'n';
  function updateMgBtn() {
    const b = $('mgBtn');
    b.hidden = !mgUnlocked() && !mg;
    if (b.hidden) return;
    const dark = alignment() === 'h', now = Date.now();
    b.setAttribute('aria-label', t(dark ? 'mg.dark' : 'mg.light'));
    if (mg) { setText($('mgT'), t('mg.on')); b.disabled = true; }
    else if (now < state.mgReadyAt) { setText($('mgT'), mmss((state.mgReadyAt - now) / 1000)); b.disabled = true; }
    else { setText($('mgT'), t(dark ? 'mg.dark' : 'mg.light')); b.disabled = false; }
  }
  $('mgBtn').addEventListener('click', () => {
    if (mg || !mgUnlocked() || Date.now() < state.mgReadyAt || !B.box) return;
    Snd.init();
    const now = performance.now();
    mg = { side: alignment(), t0: now, last: now, dur: 60000, score: 0, lives: 5, tg: [], next: now + 600 };
    state.mgPlays++;
    viruses = [];
    $('mgHud').hidden = false;
    $('tapNote').hidden = true;
    say(t(mg.side === 'h' ? 'mg.introD' : 'mg.introL'), 'wow', 2600);
    wake();
    updateAll();
  });
  function mgSpawn(now) {
    if (!state.neurons.length) return;
    const p = pick(OUT);
    const x = Math.max(12, Math.min(B.w - 12, B.box.x + p[0] * B.box.w)), y = Math.max(12, Math.min(B.h - 12, B.box.y + p[1] * B.box.h));
    const n = pick(state.neurons), tg = B.slots[n.s];
    const sp = 34 + 56 * Math.min(1, (now - mg.t0) / mg.dur);
    const d = Math.hypot(tg.x - x, tg.y - y) || 1;
    mg.tg.push({ x: x, y: y, vx: (tg.x - x) / d * sp, vy: (tg.y - y) / d * sp, tx: tg.x, ty: tg.y, s: n.s, decoy: Math.random() < 0.2 });
  }
  function mgStep(now) {
    const dt = Math.min(0.1, Math.max(0, now - mg.last) / 1000);
    mg.last = now;
    const el = now - mg.t0;
    if (now >= mg.next) { mgSpawn(now); mg.next = now + Math.max(420, 1100 - el / mg.dur * 700); }
    for (let i = mg.tg.length - 1; i >= 0; i--) {
      const q = mg.tg[i];
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (Math.hypot(q.tx - q.x, q.ty - q.y) < 8) {
        mg.tg.splice(i, 1);
        if (!q.decoy) { mg.lives--; flashes.set(q.s, now); buzz(30); Snd.nope(); }
      }
    }
    if (el >= mg.dur || mg.lives <= 0) { const m = mg; setTimeout(() => { if (mg === m) mgEnd(false); }, 0); }
    setText($('mgHud'), t('mg.hud', { s: mg.score, l: Math.max(0, mg.lives), t: Math.max(0, Math.ceil((mg.dur - el) / 1000)) }));
  }
  function drawMg(g, now) {
    const dark = mg.side === 'h';
    mg.tg.forEach(q => {
      g.lineWidth = 1.5; g.strokeStyle = col.fg;
      if (q.decoy) {
        g.beginPath(); g.arc(q.x, q.y, 12, 0, 6.2832); g.fillStyle = dark ? col.surface : col.sky; g.fill(); g.stroke();
        g.fillStyle = dark ? col.coral : col.bg; g.font = '700 13px ' + col.font; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(dark ? '♥' : '☺', q.x, q.y + 1);
      } else if (dark) {
        g.beginPath();
        for (let k = 0; k < 14; k++) { const a = k / 14 * 6.2832 + now / 500, rr = k % 2 ? 11 : 16; g.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr); }
        g.closePath(); g.fillStyle = col.virus; g.fill(); g.stroke();
      } else {
        g.beginPath(); g.ellipse(q.x, q.y, 14, 11, now / 800, 0, 6.2832); g.fillStyle = col.lime; g.fill(); g.stroke();
        g.fillStyle = col.grape; [[-4, -2], [4, 2], [1, -4]].forEach(d => { g.beginPath(); g.arc(q.x + d[0], q.y + d[1], 2, 0, 6.2832); g.fill(); });
      }
    });
  }
  function mgHit(x, y) {
    let best = -1, bd = 34;
    mg.tg.forEach((q, i) => { const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return;
    const q = mg.tg.splice(best, 1)[0], now = performance.now();
    if (q.decoy) { mg.score = Math.max(0, mg.score - 3); Snd.nope(); buzz(40); pops.push({ x: q.x, y: q.y, text: '-3', t0: now, big: true }); }
    else { mg.score++; Snd.tap(Math.min(1, mg.score / 40)); buzz(8); pops.push({ x: q.x, y: q.y, text: '+1', t0: now, big: false }); }
  }
  function mgEnd(quiet) {
    const m = mg;
    if (!m) return;
    mg = null;
    $('mgHud').hidden = true;
    $('tapNote').hidden = false;
    state.mgReadyAt = Date.now() + MG_CD;
    state.mgBest = Math.max(state.mgBest, m.score);
    const r = Math.max(100, (dps() * 20 + tapValue() * 5) * m.score);
    if (m.score > 0) addData(r);
    if (!quiet) {
      Snd.ach(); buzz([20, 50, 20]);
      toast(t('mg.score', { s: m.score, n: fmt(r) }));
      say(t('mg.end.' + m.side + (m.lives > 0 ? 'W' : 'L'), { s: m.score }), 'wow', 2600);
    }
    render(performance.now());
    updateAll();
  }

  /* ---------- Haftalık etkinlik ---------- */
  function evAdd(kind, n) {
    if (!state.ev || !state.ev.join) return;
    const e = curEvent();
    const per = { tap: e.id === 'gpu' ? 0.2 : 0, packet: e.id === 'fest' ? 10 : 0, merge: e.id === 'hack' ? 5 : 0, aha: e.id === 'hallu' ? 3 : 0, time: 1 }[kind] || 0;
    if (!per) return;
    state.ev.pts += per * n;
    while (state.ev.got < 3 && state.ev.pts >= EV_MILES[state.ev.got]) evReward(state.ev.got++);
  }
  function evReward(k) {
    const e = curEvent();
    Snd.ach(); buzz([20, 60, 20]);
    if (k === 0) {
      state.skins[e.skin] = 1;
      syncSettings();
      say(t('ev.skin', { s: TX().skins[e.skin] }), 'wow', 2600);
    } else if (k === 1) {
      state.medals++;
      state.chips += 3;
      toast(t('ev.medal'));
    } else {
      state.medals++;
      const r = Math.max(1000, dps(true) * 1800);
      addData(r);
      toast(t('ev.big', { n: fmt(r) }));
    }
  }
  let evIcoKey = '';
  $('evJoin').addEventListener('click', () => {
    ensureEvent();
    state.ev.join = !state.ev.join;
    Snd.init(); Snd.buy();
    upKey = '';
    toast(state.ev.join ? t('ev.joined', { n: TX().events[curEvent().id].n }) : t('ev.left'));
    updateAll(); save();
  });
  function updateEvent() {
    ensureEvent();
    const e = curEvent(), ev = state.ev, E = TX().events[e.id];
    if (evIcoKey !== e.id + LANG.meta.id) {
      evIcoKey = e.id + LANG.meta.id;
      $('evIco').innerHTML = svg(e.icon);
      const m = $('evMiles');
      m.innerHTML = '';
      [t('ev.m1', { n: EV_MILES[0], s: TX().skins[e.skin] }), t('ev.m2', { n: EV_MILES[1] }), t('ev.m3', { n: EV_MILES[2] })].forEach(s => { const sp = document.createElement('span'); sp.textContent = s; m.appendChild(sp); });
    }
    setText($('evName'), E.n);
    setText($('evDesc'), E.d + ' ' + t('ev.time') + ' ' + t(ev.join ? 'ev.in' : 'ev.opt'));
    setText($('evJoin'), t(ev.join ? 'ev.leave' : 'ev.join'));
    $('evJoin').classList.toggle('alt', ev.join);
    setText($('evPts'), t('ev.pts', { p: Math.floor(ev.pts), m: state.medals }));
    $('evBar').style.width = (Math.min(1, ev.pts / EV_MILES[2]) * 100).toFixed(1) + '%';
    $('evMiles').querySelectorAll('span').forEach((sp, i) => sp.classList.toggle('got', ev.got > i));
    const end = ((ev.wk + 1) * 7 - 3) * 864e5, left = Math.max(0, end - Date.now());
    setText($('evLeft'), t('ev.left2', { d: Math.floor(left / 864e5), h: Math.floor(left % 864e5 / 36e5) }));
  }

  /* ---------- Tekillik (ikinci katman) ---------- */
  const tekGain = () => Math.floor(state.params / BAL.tekDiv);
  const tekOpen = () => state.params >= BAL.tekMin || state.tek > 0;
  const treeEl = $('tree');
  TREE.forEach(n => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'node btn';
    b.dataset.node = n.id;
    b.innerHTML = '<b></b><span></span><em></em>';
    treeEl.appendChild(b);
  });
  treeEl.addEventListener('click', e => {
    const b = e.target.closest('[data-node]');
    if (!b) return;
    const n = TREE.find(x => x.id === b.dataset.node);
    if (!n || state.tree[n.id] || state.bilinc < n.c) { Snd.nope(); return; }
    state.bilinc -= n.c;
    state.tree[n.id] = 1;
    Snd.init(); Snd.ach(); buzz(15);
    say(t('tek.node', { n: TX().tree[n.id].n }), 'wow', 2000);
    rebuild();
    updateAll();
    save();
  });
  function updateTek() {
    const open = tekOpen();
    $('tekBox').hidden = !open;
    if (!open) return;
    const g = tekGain();
    setText($('tekSum'), t('tek.sum', { a: state.bilinc, b: state.bilincAll, p: state.bilincAll * 10 }));
    if (!tekBtn._armed) setText(tekBtn, g >= 1 ? t('tek.btn', { g: g }) : t('tek.need', { n: BAL.tekMin }));
    tekBtn.disabled = g < 1 || !!state.ch;
    treeEl.querySelectorAll('[data-node]').forEach(b => {
      const n = TREE.find(x => x.id === b.dataset.node), own = !!state.tree[n.id], x = TX().tree[n.id];
      setText(b.querySelector('b'), x.n);
      setText(b.querySelector('span'), x.d);
      b.classList.toggle('own', own);
      b.disabled = own || state.bilinc < n.c;
      setText(b.querySelector('em'), own ? t('tek.own') : t('tek.cost', { n: n.c }));
    });
  }
  const tekBtn = $('tekBtn');
  twoStep(tekBtn, 'arm.tek', () => updateTek(), () => {
    const g = tekGain();
    if (g < 1 || state.ch) return;
    bankOffline();
    state.bilinc += g;
    state.bilincAll += g;
    state.tek++;
    state.params = 0;
    resetRun();
    save();
    Snd.init(); Snd.tier(); buzz([40, 80, 40]);
    syncAlignLook();
    say(t('tek.done', { g: g }), 'wow', 3000);
    rebuild();
    updateAll();
  });

  /* ---------- Benchmark meydan okumaları (Tekillik) ----------
     Ayrı durum: ana tur chSaved'de saklanır, meydan okuma bitince ya da çıkınca aynen geri gelir. */
  const RUNF = ['data', 'run', 'gen', 'upg', 'neurons', 'syn', 'nBought', 'choices', 'karma', 'halluLeft', 'comboTopRun'];
  function chEnter(id) {
    if (state.ch || !tekOpen() || !CHAL_BY[id]) return;
    bankOffline();
    const sv = {};
    RUNF.forEach(k => { sv[k] = JSON.parse(JSON.stringify(state[k] === undefined ? null : state[k])); });
    state.chSaved = sv;
    state.ch = { id: id };
    closeChoice();
    resetRun();
    lastTier = tierIdx();
    syncAlignLook(); rebuild(); updateAll(); save();
    Snd.init(); Snd.tier(); buzz([30, 60, 30]);
    say(t('ch.start', { n: TX().chal[id].n, g: fmt(CHAL_BY[id].goal) }), 'wow', 3200);
  }
  function chExit(won) {
    if (!state.ch) return;
    const c = CHAL_BY[state.ch.id], sv = state.chSaved || {};
    if (won) state.chDone[c.id] = 1;
    bankOffline();
    closeChoice();
    RUNF.forEach(k => { if (sv[k] !== undefined && sv[k] !== null) state[k] = sv[k]; });
    state.ch = null; state.chSaved = null;
    viruses = []; nextVirus = 0; combo = 0; upKey = '';
    brainDirty();
    lastTier = tierIdx();
    syncAlignLook(); rebuild(); updateAll(); save();
    if (won) { Snd.tier(); buzz([40, 80, 40]); showStory(t('ch.won'), TX().chal[c.id].n, t('ch.wonText', { r: TX().chal[c.id].rw })); postReact('react-n'); }
    else toast(t('ch.left'));
  }
  function closeChoice() { if (choiceOpen) { choiceOpen = 0; closeModal('choice'); } }
  const chList = $('chList');
  let chKey = '';
  function updateChal() {
    const key = (state.ch ? state.ch.id : '-') + CHAL.map(c => state.chDone[c.id] ? 1 : 0).join('') + LANG.meta.id;
    setText($('chSum'), CHAL.filter(c => state.chDone[c.id]).length + ' / ' + CHAL.length);
    if (key !== chKey) {
      chKey = key;
      chList.innerHTML = '';
      CHAL.forEach(c => {
        const x = TX().chal[c.id];
        const el = document.createElement('div');
        el.className = 'task' + (state.chDone[c.id] ? ' done' : '');
        el.innerHTML = '<div><div class="t1"></div><div class="t2"></div><div class="t2 alt"></div></div><div class="tacts"><button type="button" class="claim btn" data-ch="' + c.id + '"></button></div>';
        el.querySelector('.t1').textContent = x.n + (state.chDone[c.id] ? ' ✓' : '');
        el.querySelector('.t2').textContent = x.d + ' ' + t('ch.goal', { g: fmt(c.goal) });
        el.querySelector('.t2.alt').textContent = t('ch.reward', { r: x.rw });
        chList.appendChild(el);
      });
    }
    chList.querySelectorAll('[data-ch]').forEach(b => {
      const id = b.dataset.ch, act = chIs(id);
      if (!b._armed) setText(b, act ? t('ch.exit', { p: Math.floor(Math.min(1, Math.log10(1 + state.run) / Math.log10(CHAL_BY[id].goal)) * 100) }) : state.chDone[id] ? t('ch.replay') : t('ch.startBtn'));
      b.disabled = !!state.ch && !act;
    });
  }
  chList.addEventListener('click', e => {
    const b = e.target.closest('[data-ch]');
    if (!b || b.disabled) return;
    if (!b._armed) { b._armed = true; b._t = undefined; setText(b, t('arm.q')); clearTimeout(b._timer); b._timer = setTimeout(() => { b._armed = false; b._t = undefined; updateChal(); }, 4000); return; }
    b._armed = false; b._t = undefined; clearTimeout(b._timer);
    if (chIs(b.dataset.ch)) chExit(false); else chEnter(b.dataset.ch);
  });
  function checkChal() { if (state.ch && state.run >= CHAL_BY[state.ch.id].goal) chExit(true); }
