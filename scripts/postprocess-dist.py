#!/usr/bin/env python3
"""Правки собранного сайта, которые Notepub сделать не умеет.

1. Версии ассетов. Хостинг отдаёт css, js и картинки с заголовком
   max-age=3888000 (45 дней) и игнорирует .htaccess, а имена файлов не
   содержат хеша. Без метки версии вернувшийся посетитель получит новую
   разметку со старым оформлением. Приписываем к адресу хеш содержимого:
   меняется файл — меняется адрес, остальное остаётся в кеше.

2. Слэш в конце адресов карты сайта. Notepub пишет их без слэша, а
   канонические адреса и все ссылки на сайте — со слэшем; поисковик иначе
   идёт по адресу, который отвечает редиректом.
"""
from __future__ import annotations

import hashlib
import pathlib
import re
import sys

dist = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "./dist")
if not dist.is_dir():
    print(f"Ошибка: нет каталога {dist}", file=sys.stderr)
    raise SystemExit(1)

digests: dict[pathlib.Path, str] = {}


def digest(path: pathlib.Path) -> str | None:
    if path not in digests:
        if not path.is_file():
            return None
        digests[path] = hashlib.md5(path.read_bytes()).hexdigest()[:8]
    return digests[path]


asset_ref = re.compile(r'((?:href|src)=")([^"]*?/assets/([^"?]+))(")')
stamped = 0

for page in dist.rglob("*.html"):
    text = page.read_text()

    def stamp(m: re.Match) -> str:
        global stamped
        target = dist / "assets" / m.group(3)
        version = digest(target)
        if version is None:
            return m.group(0)
        stamped += 1
        return f"{m.group(1)}{m.group(2)}?v={version}{m.group(4)}"

    updated = asset_ref.sub(stamp, text)
    if updated != text:
        page.write_text(updated)

slashed = 0
for sitemap in dist.glob("sitemap*.xml"):
    text = sitemap.read_text()

    def close(m: re.Match) -> str:
        global slashed
        url = m.group(1)
        if url.endswith("/") or url.rsplit("/", 1)[-1].count("."):
            return m.group(0)
        slashed += 1
        return f"<loc>{url}/</loc>"

    updated = re.sub(r"<loc>([^<]+)</loc>", close, text)
    if updated != text:
        sitemap.write_text(updated)

print(f"Проставлено версий ассетов: {stamped}; поправлено адресов в карте сайта: {slashed}")
