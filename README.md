# Yapay Zekâ Tycoon

Tek bir nörondan yapay zekâ beyni kurduğun, Türkçe, çizgi film tarzı tıklama (idle/incremental) oyunu.

- `src/style.css`, `src/body.html`, `src/js/*.js`: oyunun kaynağı (tasarım, iskelet, mantık).
- `src/lang/{tr,az,en,ru,ar,es,de,ja,zh}.js`: bütün metinler. Her dilin kendi espri, parodi şirket ve karakterleri var (tam yerelleştirme, Arapça sağdan sola).
- `python3 build.py`: parçaları birleştirir → `index.html` (tek başına çalışan PWA) ve `dist/game.html` (Claude artifact sürümü).
- `manifest.webmanifest`, `sw.js`, `icon-*.png`: telefona "Ana ekrana ekle" ve çevrimdışı oynama için.
- `tools/keycheck.js`: her dilde eksik metin, yer tutucu uyumsuzluğu ve quiz cevabı kontrolü. `tools/smoke.js`: Playwright ile uçtan uca kontrol. `tools/sim.js`: tempo simülasyonu.

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

## v9'da neler değişti
- **Beyin ekrana sığar:** kamera artık kırpmaz; ilk seviyelerde nöronlar daha iri çizilir.
- **Kompakt sahne (telefon):** Kaynaklar dışındaki sekmelerde ya da liste aşağı kaydırılınca beyin küçülür, liste büyür.
- **Sabit satın alma satırı:** ×1/×10/×25/×100/Sonraki/Maks liste kayarken üstte kalır.
- **Gerçek isim yok:** şirket, model ve kişi adları tanınır ama farklı parodi adlarla (ör. Sam Altmış, Klodiş Öpüş, Kıskançya, Gırgır; Entropic, Clawd Octopus, Grump…); bilim insanı adları bilgilerden çıkarıldı.
- **2 yeni dil:** 日本語 (源さん, ハルばあちゃん, オワタ先輩, 適量 ve しりとり şakaları) ve 中文 简体 (胡同茶馆的老王, 李奶奶, 丧气的老周, 盐少许, 996, 下象棋的大爷). Toplam 9 dil.
- **万/億 sayıları:** Japonca ve Çincede sayılar 4 haneli gruplarla (5.23万). CJK yazı tipi yalnız o dil seçilince yüklenir.
- **Birleştirme paneli** beynin altına taşındı, metni dokunuşu engellemez; düzenleme modunda Nöro gizlenir.

## v8'de neler değişti
- **Kaynak döngü çubukları:** her kaynakta dolan çubuk ve "+X" (görsel; veri kesintisiz akar, denge ve çevrimdışı değişmez).
- **Eşikler 10/25/50/100/200/300/400/500:** sırayla "hız ×2" (döngü yarıya iner) ve "veri ×2". Tempo `srcK` ile eski hâlinde tutuldu (aktif bot ilk eğitime ~42 dk).
- **Satın alma:** ×1, ×10, ×25, ×100, Sonraki eşik, Maks. Alımda satır animasyonu, eşikte parlama; yükseltme alınınca kart kayarak çıkar.
- **Sıradaki adım satırı:** ilk turda sıralı öğretici hedefler, sonra hazır ödül/proje/eğitim/seviye; dokununca ilgili yere götürür.
- **Nöro balonu:** dokunana kadar (en fazla 30 sn) kalır; önemli mesajlar sıraya girer, sohbet onları ezmez; dil değişince temizlenir.
- **Haber kartı:** avatar, ad, iki satır metin, beğeni ödülü rozeti, yeni haberde parlama.
- **Dönüş özeti:** çevrimdışı penceresinde hazır proje, dönen gezi, görev ödülleri, kârlı eğitim.
- **Beyin gelişimi:** başta yakın kamera, seviye arttıkça uzaklaşır; her model aşaması beyne görünür iz ekler (evrişim ızgarası, LSTM döngüleri, dikkat yayları, dil harfleri, duyu noktaları, YGZ kabuğu).
- **Hikâye projelerinin devamı:** üç müşteriye ikişer yeni bölüm (7 dilde).
- **Düzeltmeler:** geçersiz kayıt içe aktarma artık oyunu silmez ve içe aktarma temiz başlar; küp sınırında parametre 1 eksik çıkmıyor; hızlı birleştirme önce sonucu gösterir ve güç düşecekse uyarır; önizlemedeki dokunuş yüzdesi gerçek hesapla aynı; service worker yalnız sayfa gezintisinde index.html döner, fontları önbelleğe alır; süre tahmini son dokunuş gelirini de sayar; eğitim "mümkün" ve "kârlı" ayrı gösterilir.
- **Mobil:** dokunma alanları 44–48 px, açıklama yazıları büyütüldü; Hedefler'de önce günlük görevler, etkinlik ve başarımlar katlanır.

## v7'de neler değişti

- **Tek ekran (uygulama gibi):** telefonda sayfa kaymaz. Üstte veri göstergesi, ortada beyin ve düğmeleri, altta yalnız kendi içinde kayan panel ve sekmeler.
- **Ayarlar penceresi (⚙):** dil, ses, müzik, titreşim, tasarruf, tema (otomatik/koyu/açık), sayı biçimi, Nöro'nun rengi ve aksesuarı, kayıt yedeği.
- **7 dil:** Türkçe, Azərbaycanca, English, Русский, العربية (sağdan sola), Español, Deutsch. İlk açılışta cihazın dili seçilir. Her dilde yerel karakterler (ör. Naxçıvanlı Validə nənə, Lənkəranlı Zakir dayı, Sal's Diner, тётя Валя, أبو خليل, Paco el del bar, Café Sonnenschein), yerel parodi şirketler (Paxıllıq/Envydia/Завидия/حسديا/Envidia/Neidia) ve o dile özgü kelime oyunlu sorular.
- **Yeni görünüm:** "laboratuvar HUD'u" tasarım sistemi. 45° kesik köşeler, çizgiyle ayrılmış satırlar, Tektur + IBM Plex yazı tipleri, aqua (veri) ve amber (satın alma) vurguları, koyu temada statik neon parıltı. Beyin çizimi de yeni.

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
