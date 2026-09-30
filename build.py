#!/usr/bin/env python3
"""src/game.html (Claude artifact için yazılan parça) -> index.html (tek başına çalışan PWA sayfası)."""
from pathlib import Path
here = Path(__file__).parent
game = (here / 'src' / 'game.html').read_text(encoding='utf-8')
head = '''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#8A5CF6">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="YZ Tycoon">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html,body{margin:0}[hidden]{display:none!important}</style>
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
print('index.html built')
