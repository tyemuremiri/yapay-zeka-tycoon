# Yapay Zekâ Tycoon

Tek bir nörondan yapay zekâ beyni kurduğun, Türkçe, çizgi film tarzı tıklama (idle/incremental) oyunu.

- `src/game.html`: oyunun kaynağı (Claude artifact olarak yayınlanan parça).
- `index.html`: `python3 build.py` ile üretilir; tek başına çalışan PWA sayfası.
- `manifest.webmanifest`, `sw.js`, `icon-*.png`: telefona "Ana ekrana ekle" ve çevrimdışı oynama için.

## Oyna

**https://tyemuremiri.github.io/yapay-zeka-tycoon/**

Telefonda aç → tarayıcı menüsü → **Ana ekrana ekle**. Oyun bir kez açıldıktan sonra internetsiz de çalışır.

Yayın: GitHub **Settings → Pages → Deploy from a branch → `main` / `(root)`**.

## Tempo simülasyonu

`tools/sim.js` oyunu sahte saatla hızlandırır ve `#debug` modundaki botla oynatır (Playwright gerekir):

```
node tools/sim.js "$PWD/index.html" <dakika> <saniyede_dokunuş> <prestij_oranı> <ilk_prestij_parametre> '<BAL JSON>'
node tools/sim.js "$PWD/index.html" 240 3 1 5            # aktif oyuncu, 4 saat
node tools/sim.js "$PWD/index.html" 240 1 1 5            # rahat oyuncu
```

Son JSON, `src/game.html` içindeki `BAL` denge ayarlarını geçici olarak değiştirir; böylece yeni sayıları koda dokunmadan deneyebilirsin.

Güncel denge (bot ölçümü): aktif oyuncu ilk yeni modele ~35 dk'da, rahat oyuncu ~65 dk'da ulaşır; turlar 20-60 dk arası sürer ve giderek uzar.
