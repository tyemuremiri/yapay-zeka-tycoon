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

Güncel denge (bot ölçümü, v6): aktif oyuncu ilk yeni modele ~40 dk'da, rahat oyuncu ~68 dk'da ulaşır; turlar 20-60 dk arası sürer ve giderek uzar.
Benchmark meydan okumalarının hedefleri, Tekillik açıldığında (~100 parametre) aktif oyuncu için ~20-25 dk olacak şekilde ölçüldü.

## v6'da neler değişti

- **Kayıt ve çevrimdışı düzeltmeleri:** kayıt artık üretim saatini ilerletmiyor (arka planda çevrimdışı kazanç sıfırlanmıyordu); 60 sn'den kısa dönüşler de sayılıyor; eğitim/Tekillik öncesi bekleyen çevrimdışı veri eski tura işleniyor; yükleme ya tamamen olur ya hiç (bozuk kayıt mevcut oyunu silmez); otomatik yedek (`-yedek` anahtarı); kalıcı ×2 hakkı kayıtla geri yükleniyor.
- **Bilinç:** bonus toplam kazanılan Bilinçten hesaplanır; ağaçtan yetenek almak üretimi düşürmez.
- **Ödüller:** gezi, görev ve beğeni ödülleri geçici güçlendirmeler (turbo, İlham) hariç taban üretime göre hesaplanır. Beğeni güçlendirmeleri 2-3 dk sürer, türleri birbirini silmez.
- **Telefon düzeni:** alt gezinme çubuğu (Kaynaklar, Yükseltme, Projeler, Hedefler, Model), alttan açılan Zekâ Akışı, üstte küçük veri göstergesi, beynin boş yerinde sayfa kaydırılabilir.
- **Nöronlar:** Birleştir / Bağla modları; iki nörona dokun, beyin gücü, pasif üretim ve dokunuş farkını gör, onayla. Aynı seviyeleri bağlayarak rezonans kurulabilir.
- **Otomasyon:** ilk eğitimde Otomatik Alıcı (Verimli / Eşiğe tamamla / Yalnız seçili), 3. eğitimde Otomatik Birleştirici (sinapslı nöronları koruma seçeneği). Tekillik ağacı bunları hızlandırır.
- **Yeni model önizlemesi:** kazanılacak parametre, çarpan farkı, çip, sıradaki laboratuvar, kalan/sıfırlanan listesi.
- **Günlük görevler:** her satır "aktif VEYA rahat" iki seçenek; günde bir ücretsiz değişim; imkânsız hale gelen görev ücretsiz değişir.
- **Haftalık etkinlik isteğe bağlı:** katılmayanın ekonomisi değişmez.
- **Müşteri projeleri:** Hızlı (3 dk, veri) ya da Özenli (30 dk, çip + kalıcı referans) yol; kalite yıldızı kurduğun yapıya bağlı. Üç hikâye projesi (Çaycı Rıza Usta, Nezahat Teyze, Şehir Hastanesi) Nöro'ya yeni aksesuar verir.
- **Benchmark meydan okumaları (Tekillik):** Donanım Ambargosu, Kıt Veri, Yalnız Pasif. Ana tur kenara kaydedilir, istediğin an ücretsiz çıkılır, tamamlayınca kalıcı ödül.
