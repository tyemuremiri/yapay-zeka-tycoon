// Hızlı tempo simülasyonu: sahte saat, zamanlayıcılar kapalı, döngü sayfanın içinde koşar.
const { chromium } = require('playwright');
const [file, minutes = 180, taps = 3, ratio = 1, first = 5, bal = '{}'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  await p.addInitScript((bal) => {
    window.__BAL = JSON.parse(bal);
    window.__now = Date.parse('2026-09-30T10:00:00Z');
    Date.now = () => window.__now;
    performance.now = () => window.__now;
    window.setInterval = () => 0;
    window.requestAnimationFrame = () => 0;
  }, bal);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file + '#debug');
  await p.waitForTimeout(300);
  const out = await p.evaluate(([minutes, taps, ratio, first]) => {
    const log = []; let lastTier = 0; const y = window.__yz;
    for (let sec = 1; sec <= minutes * 60; sec++) {
      const r = window.__bot(taps, { prestigeRatio: ratio, firstPrestige: first, packets: false });
      for (let q = 0; q < 4; q++) { window.__now += 250; window.__tick(); }
      const m = (sec / 60).toFixed(1), t = y.tierIdx();
      if (r) log.push(m + ' dk  ' + r + '  toplam param ' + y.state.params);
      if (t !== lastTier) { log.push(m + ' dk  seviye ' + lastTier + '→' + t + '  dps ' + y.dps().toExponential(1) + '  dokunuş ' + y.tapValue().toExponential(1)); lastTier = t; }
      if (sec % 1800 === 0) log.push(m + ' dk  [durum] seviye ' + t + ' dps ' + y.dps().toExponential(1) + ' param ' + y.state.params + ' tur ' + y.state.runs + ' kaynak ' + y.state.gen.join('/') + ' kazanç ' + y.gain());
    }
    return log.join('\n');
  }, [+minutes, +taps, +ratio, +first]);
  console.log(out);
  console.log('errors', errs.slice(0, 3));
  await b.close();
})();
