// Tüm dillerde anahtar/içerik eksiği var mı? node tools/keycheck.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const LANGS = {};
for (const l of ['tr', 'en', 'ru', 'ar', 'es', 'de']) {
  const f = path.join(root, 'src/lang', l + '.js');
  if (fs.existsSync(f)) new Function('LANGS', fs.readFileSync(f, 'utf8'))(LANGS);
}
const code = fs.readdirSync(path.join(root, 'src/js')).map(f => fs.readFileSync(path.join(root, 'src/js', f), 'utf8')).join('\n') + fs.readFileSync(path.join(root, 'src/body.html'), 'utf8');
const used = new Set();
(code.match(/t\(\s*'[^']+'/g) || []).forEach(m => used.add(m.replace(/t\(\s*'/, '').replace(/'$/, '')));
(code.match(/data-t[ap]?="[^"]+"/g) || []).forEach(m => used.add(m.replace(/.*="/, '').replace(/"$/, '')));
// dinamik anahtarlar
['f', 'n', 'h'].forEach(a => { ['align.', 'alignNote.', 'virus.gone.', 'tier.up.', 'nero.sleep.'].forEach(p => used.add(p + a)); });
['f', 'h'].forEach(a => used.add('align.short.' + a));
['hW', 'hL', 'fW', 'fL'].forEach(x => used.add('mg.end.' + x));
['tap', 'aha', 'packet', 'merge', 'earn', 'buy', 'upg', 'trip', 'proj', 'turbo'].forEach(x => used.add('task.' + x));
['tap', 'src', 'crit'].forEach(x => used.add('buff.s.' + x));
['tap', 'src', 'crit', 'data'].forEach(x => used.add('buff.n.' + x));
['auto', 'dark', 'light'].forEach(x => used.add('theme.' + x));
['quiz', 'hallu', 'duck'].forEach(x => used.add('pk.' + x));
['mis.back', 'mis.away', 'mis.home', 'pr.note', 'pr.locked', 'eco.on', 'eco.off', 'ev.in', 'ev.opt', 'ev.join', 'ev.leave', 'auto.on', 'auto.off', 'auto.buyFast', 'auto.buySlow', 'sw.on', 'sw.off',
  'pr.slow', 'pr.fast', 'pr.slowTag', 'pr.fastTag', 'pr.goSlow', 'pr.goFast', 'mg.dark', 'mg.light', 'mg.introD', 'mg.introL', 'pk.gift', 'pk.got', 'pk.giftAria', 'pk.aria'].forEach(k => used.add(k));
const bad = [...used].filter(k => /[^a-zA-Z0-9.]/.test(k) || k.endsWith('.') || !k.includes('.') && !['mk', 'karma', 'combo', 'duck'].includes(k));
bad.forEach(k => used.delete(k));
const ref = LANGS.tr;
let fails = 0;
const shape = (a, b, p) => {
  if (Array.isArray(a)) { if (!Array.isArray(b)) { console.log('  shape', p); fails++; } else if (p.match(/(gens|tiers|tiersShort|regions|labs|genCards)$/) && a.length !== b.length) { console.log('  len', p, a.length, b.length); fails++; } return; }
  if (a && typeof a === 'object') { for (const k of Object.keys(a)) { if (b == null || !(k in b)) { console.log('  missing', p + '.' + k); fails++; } else shape(a[k], b[k], p + '.' + k); } }
};
for (const l of Object.keys(LANGS)) {
  const L = LANGS[l];
  const miss = [...used].filter(k => L.ui[k] == null);
  if (miss.length) { console.log(l, 'ui eksik:', miss.join(' ')); fails += miss.length; }
  if (l !== 'tr') {
    const extra = Object.keys(ref.ui).filter(k => L.ui[k] == null);
    if (extra.length) { console.log(l, 'tr\'de olup burada olmayan:', extra.join(' ')); fails += extra.length; }
    shape(ref.c, L.c, l + '.c');
  }
  // yer tutucular tutarlı mı
  for (const k of Object.keys(ref.ui)) {
    if (L.ui[k] == null) continue;
    const ph = s => (s.match(/\{\w+\}/g) || []).sort().join();
    if (ph(ref.ui[k]) !== ph(L.ui[k])) { console.log(l, 'yer tutucu farkı', k, ph(ref.ui[k]), '|', ph(L.ui[k])); fails++; }
  }
  L.c.quiz.forEach((q, i) => { if (!(q.c >= 0 && q.c < q.a.length)) { console.log(l, 'quiz cevap', i); fails++; } });
  console.log(l, 'ok: ui', Object.keys(L.ui).length, 'feed', L.c.feed.length, 'quiz', L.c.quiz.length, 'quips', L.c.quips.n.length + L.c.quips.f.length + L.c.quips.h.length);
}
console.log('kullanılan anahtar', used.size, fails ? 'HATA ' + fails : 'TAMAM');
process.exit(fails ? 1 : 0);
