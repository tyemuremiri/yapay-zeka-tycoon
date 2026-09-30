#!/usr/bin/env python3
"""Kaynak parçalarını birleştirir:
  src/style.css + src/body.html + src/lang/*.js + src/js/*.js
  -> dist/game.html  (Claude artifact için: doctype/head olmadan)
  -> index.html      (tek başına çalışan PWA sayfası)"""
from pathlib import Path
here = Path(__file__).parent
src = here / 'src'
LANGS = ['tr', 'az', 'en', 'ru', 'ar', 'es', 'de', 'ja', 'zh']
fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700'
         '&family=IBM+Plex+Sans:wght@400;500;600;700&family=Tektur:wght@500;700;800&display=swap">')
langs = '\n'.join((src / 'lang' / (l + '.js')).read_text(encoding='utf-8') for l in LANGS if (src / 'lang' / (l + '.js')).exists())
js = '\n'.join(p.read_text(encoding='utf-8') for p in sorted((src / 'js').glob('*.js')))
game = ('<title>Yapay Zekâ Tycoon</title>\n' + fonts + '\n<style>\n' + (src / 'style.css').read_text(encoding='utf-8') + '</style>\n'
        + (src / 'body.html').read_text(encoding='utf-8')
        + '<script>\n(function () {\n  const LANGS = {};\n' + langs + '\n' + js + '\n})();\n</script>\n')
(here / 'dist').mkdir(exist_ok=True)
(here / 'dist' / 'game.html').write_text(game, encoding='utf-8')
head = '''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#05080B">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="YZ Tycoon">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
<style>html,body{margin:0}[hidden]{display:none!important}</style>
</head>
<body>
'''
tail = '''
<script>
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
</script>
</body>
</html>
'''
(here / 'index.html').write_text(head + game + tail, encoding='utf-8')
print('dist/game.html + index.html built', len(game) // 1024, 'KB')
