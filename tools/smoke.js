const { chromium } = require('playwright');
// Uçtan uca kontrol: node tools/smoke.js (Playwright gerekir). Ekran görüntüleri çalışılan klasöre yazılır.
const URL = require('url').pathToFileURL(require('path').join(__dirname, '..', 'index.html')).href + '#debug';
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'tr' });
  await p.addInitScript(() => { window.__now = Date.parse('2026-09-30T10:00:00Z'); Date.now = () => window.__now; });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForTimeout(400);
  const S = f => p.evaluate(f);
  const clearModals = async () => { for (let i = 0; i < 30; i++) { await p.waitForTimeout(80); if (await S(() => !document.getElementById('choice').hidden)) await p.click('#chF'); else if (await S(() => !document.getElementById('story').hidden)) await p.click('#stOk'); else break; await p.waitForTimeout(450); } };

  // 1) offline: kayıt saati ilerletmez
  await S(() => { __yz.state.gen[0] = 10; __yz.state.data = 0; __yz.updateAll(); __yz.tick(); });
  const d1 = await S(() => __yz.dps(true));
  await S(() => { window.__now += 3600e3; __yz.save(); __yz.save(); __yz.catchUp(); });
  const pend = await S(() => __yz.state.pendingOff);
  ok(Math.abs(pend - d1 * 3600 * 0.6) / (d1 * 3600 * 0.6) < 0.01, 'offline 1h after saves: ' + pend.toFixed(1) + ' vs ' + (d1 * 3600 * 0.6).toFixed(1));
  // 2) short return
  await S(() => { __yz.state.pendingOff = 0; document.getElementById('offline').hidden = true; __yz.state.data = 0; window.__now += 30000; __yz.catchUp(); });
  const sd = await S(() => __yz.state.data);
  ok(Math.abs(sd - d1 * 30 * 0.6) < 0.01 * d1 * 30, 'short 30s return adds ' + sd.toFixed(2));
  // 3) pending banked into old run at prestige
  await S(() => { const s = __yz.state; s.run = 2e11; s.pendingOff = 1e14; for (let i = 1; i < 30; i++) s.choices[i] = 'f'; __yz.updateAll(); });
  const gPrev = await S(() => __yz.gain());
  await clearModals(); await p.click('#tab-model'); await p.click('#pBtn'); await p.click('#pBtn');
  await p.waitForTimeout(200);
  const after = await S(() => ({ run: __yz.state.run, pend: __yz.state.pendingOff, params: __yz.state.params }));
  ok(after.pend === 0 && after.run < 1e6 && after.params === gPrev, 'prestige banks offline: ' + JSON.stringify(after) + ' gain ' + gPrev);
  await p.click('#stOk');
  // 4) perm2x + bilincAll migration + atomic load failure
  const mig = await S(() => {
    const s = __yz.state; const raw = JSON.stringify(Object.assign({}, s, { perm2x: true, bilinc: 1, tree: { abuy: 1, syn: 1 }, bilincAll: undefined }));
    const r1 = __yz.loadFrom(raw);
    const got = { perm: __yz.state.perm2x, all: __yz.state.bilincAll };
    const before = __yz.state.params;
    const r2 = __yz.loadFrom('{"ver":6,"gen":"boom","neurons":[{"s":0,"l":1}],"kasa":{"get x(){}":1}}');
    return { r1, got, r2, keep: __yz.state.params === before };
  });
  ok(mig.r1 && mig.got.perm === true && mig.got.all === 5, 'perm2x + bilincAll migration ' + JSON.stringify(mig.got));
  await S(() => { __yz.state.perm2x = false; });

  // 5) single screen + feed sheet + settings + language
  const nav = await p.locator('.tabs').boundingBox();
  ok(nav.y + nav.height >= 840, 'tabs at bottom y=' + nav.y);
  ok(await S(() => document.documentElement.scrollHeight <= innerHeight + 1), 'page does not scroll');
  await p.click('#ticker'); await p.waitForTimeout(100);
  ok(await S(() => !document.getElementById('feedSheet').hidden), 'feed sheet opens');
  await p.click('[data-close="feedSheet"]');
  ok(await S(() => document.getElementById('feedSheet').hidden), 'feed sheet closes');
  await p.click('#gearBtn'); await p.click('[data-lang="ar"]'); await p.waitForTimeout(100);
  ok(await S(() => document.documentElement.dir === 'rtl' && document.getElementById('tab-gen').textContent.includes('المصادر')), 'arabic rtl applied');
  await p.click('[data-lang="tr"]'); await p.click('[data-close="settings"]');
  ok(await S(() => __yz.state.opt.lang === 'tr' && __yz.state.langsSeen.ar === 1), 'lang saved + seen');

  // 6) merge mode preview
  await S(() => { const s = __yz.state; s.neurons = [{ s: 0, l: 2 }, { s: 1, l: 2 }, { s: 2, l: 1 }]; s.syn = []; __yz.rebuild(); __yz.updateAll(); });
  await clearModals(); await p.click('#tab-gen');
  await S(() => window.scrollTo(0, 0));
  await p.click('#nMerge');
  const pos = await S(() => { const B = __yz.B, r = document.getElementById('brain').getBoundingClientRect(); return [0, 1].map(i => ({ x: r.left + B.slots[i].x, y: r.top + B.slots[i].y })); });
  await p.mouse.click(pos[0].x, pos[0].y); await p.mouse.click(pos[1].x, pos[1].y);
  const et = await p.textContent('#editText');
  ok(/seviye 3/.test(et) && /Beyin gücü/.test(et), 'merge preview: ' + et);
  await p.screenshot({ path: 'v8-merge.png' });
  await p.click('#editActs .go');
  ok(await S(() => __yz.state.neurons.some(n => n.l === 3)), 'merge executed');
  await p.click('#nMerge');

  // 7) projects
  await S(() => { __yz.state.bestTier = 2; __yz.state.gen = [40, 30, 20, 10, 0, 0, 0, 0]; __yz.state.data = 1e9; __yz.updateAll(); });
  await clearModals(); await p.click('#tab-proj'); await p.waitForTimeout(100);
  await p.screenshot({ path: 'v8-proj.png', fullPage: false });
  const pt = await p.textContent('#projBox');
  ok(/Rıza/.test(pt), 'story project offered');
  await p.click('[data-pgo="1"]');
  console.log('after pgo', JSON.stringify(await S(() => __yz.state.proj)), await S(() => document.getElementById('projBox').innerText.slice(0, 200)));
  await S(() => { window.__now += 31 * 60e3; __yz.tick(); __yz.updateAll(); });
  ok(await S(() => !document.getElementById('offline').hidden), 'long gap shows offline sheet');
  await p.click('#offOk');
  await p.click('[data-pdo="deliver"]');
  const pr = await S(() => ({ refs: __yz.state.refs, cos: __yz.state.cos, done: __yz.state.projDone }));
  ok(pr.refs === 1 && pr.cos === 'cay' && pr.done === 1, 'careful delivery ' + JSON.stringify(pr));
  await p.click('#stOk');
  await p.screenshot({ path: 'v8-cay.png', clip: { x: 0, y: 0, width: 390, height: 844 } });

  // 8) dailies
  await clearModals(); await p.click('#tab-goal');
  const tt = await p.textContent('#taskList');
  ok(/veya/.test(tt), 'daily pairs show "veya"');
  await p.click('[data-reroll]');
  ok(await S(() => __yz.state.daily.rerolls === 0), 'reroll used');
  await p.click('#evJoin');
  ok(await S(() => __yz.state.ev.join === true), 'event join');
  await p.screenshot({ path: 'v8-goal.png' });

  // 9) automation + prestige preview
  await S(() => { __yz.state.runs = 3; __yz.state.data = 1e6; __yz.updateAll(); });
  await clearModals(); await p.click('#tab-gen');
  const bought = await S(() => __yz.autoBuy(5));
  ok(bought > 0, 'autoBuy bought ' + bought);
  await clearModals(); await p.click('#tab-model'); await p.click('[data-msub="train"]');
  const pv = await p.textContent('#pGainBox');
  ok(/Sıradaki laboratuvar/.test(pv), 'prestige preview: ' + pv.slice(0, 80));

  // 10) challenge enter/exit keeps main run
  await S(() => { const s = __yz.state; s.params = 120; s.run = 5e12; s.data = 777; for (let i = 1; i < 30; i++) s.choices[i] = 'f'; __yz.updateAll(); });
  await S(() => __yz.chEnter('kit'));
  const inCh = await S(() => ({ ch: __yz.state.ch && __yz.state.ch.id, run: __yz.state.run, gain: __yz.gain() }));
  ok(inCh.ch === 'kit' && inCh.run === 0 && inCh.gain === 0, 'in challenge ' + JSON.stringify(inCh));
  await S(() => { __yz.state.run = 1e15; for (let i = 1; i < 30; i++) __yz.state.choices[i] = 'f'; __yz.tick(); __yz.tick(); __yz.tick(); __yz.tick(); });
  const out = await S(() => ({ ch: __yz.state.ch, run: __yz.state.run, done: __yz.state.chDone }));
  ok(!out.ch && out.run >= 5e12 && out.done.kit, 'challenge won & restored ' + JSON.stringify(out));
  // reload persistence
  await S(() => __yz.save());
  await p.reload(); await p.waitForTimeout(400);
  const rl = await S(() => ({ refs: __yz.state.refs, kit: __yz.state.chDone.kit, auto: __yz.state.auto.mode }));
  ok(rl.refs === 1 && rl.kit === 1, 'reload keeps ' + JSON.stringify(rl));
  await clearModals(); await p.click('#tab-model');
  await p.screenshot({ path: 'v8-model.png' });
  await S(() => window.scrollTo(0, 0));
  await p.screenshot({ path: 'v8-top.png' });
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
