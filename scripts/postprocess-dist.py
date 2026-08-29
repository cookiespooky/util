#!/usr/bin/env python3
"""Правки собранного сайта, которые Notepub сделать не умеет.

1. Версии ассетов. Хостинг отдаёт css, js и картинки с заголовком
   max-age=3888000 (45 дней) и игнорирует .htaccess, а имена файлов не
   содержат хеша. Без метки версии вернувшийся посетитель получит новую
   разметку со старым оформлением. Приписываем к адресу хеш содержимого:
   меняется файл — меняется адрес, остальное остаётся в кеше.

   Версия проставляется и в разметке, и в url() внутри CSS, причём в CSS
   раньше: иначе шрифт из @font-face и его же preload в <head> получают
   разные адреса. При font-display: optional это ломает шрифт целиком —
   preload греет один адрес, стили запрашивают другой, запрос уходит уже
   после разбора CSS и не успевает в отведённое окно, а optional означает
   «не успел — остаёмся на запасном до конца просмотра».

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


# Ссылки внутри CSS. Обязательно до разметки: правка меняет содержимое
# файла, а значит и его хеш, который потом уходит в <link>.
css_ref = re.compile(r'url\(\s*(["\']?)([^"\')]+)\1\s*\)')
css_stamped = 0

for sheet in sorted((dist / "assets").rglob("*.css")):

    def stamp_css(m: re.Match) -> str:
        global css_stamped
        quote, ref = m.group(1), m.group(2).strip()
        # url(#…) — ссылка на градиент или фильтр в SVG, а не на файл.
        # data:, внешние адреса и уже помеченные оставляем как есть.
        if ref.startswith(("#", "data:", "http:", "https:", "//")) or "?" in ref:
            return m.group(0)
        # CSS из CSS не размечаем: его хеш пришлось бы считать после его же
        # правки, а этот проход такого порядка не гарантирует. @import в теме
        # не используется, так что случай пока умозрительный.
        if ref.endswith(".css"):
            return m.group(0)
        version = digest((sheet.parent / ref).resolve())
        if version is None:
            return m.group(0)
        css_stamped += 1
        return f"url({quote}{ref}?v={version}{quote})"

    text = sheet.read_text()
    updated = css_ref.sub(stamp_css, text)
    if updated != text:
        sheet.write_text(updated)


# Внутренние ссылки без завершающего слэша. Notepub так отдаёт результат
# разрешения [[wikilinks]]: «/services» вместо «/services/». Страницы лежат
# каталогами, и каждая такая ссылка стоит посетителю лишнего редиректа, а
# роботу — лишнего обхода. Правим только адреса своего сайта: базовый адрес
# берём из data-base-url, который layout.html пишет в <html>.
base_ref = re.compile(r'(<html[^>]*\sdata-base-url=")([^"]+)(")')
slashed_links = 0


def close_links(text: str) -> str:
    global slashed_links
    found = base_ref.search(text)
    if not found:
        return text
    base = found.group(2).rstrip('/')

    # Последний сегмент без точки, без «?», «#» и без слэша на конце — это
    # адрес страницы. Всё остальное (ассеты, якоря, внешние адреса) не трогаем.
    link = re.compile(r'(href=")(' + re.escape(base) + r'/[A-Za-z0-9_\-/]+)(")')

    def stamp(m: re.Match) -> str:
        global slashed_links
        slashed_links += 1
        return f'{m.group(1)}{m.group(2)}/{m.group(3)}'

    return link.sub(stamp, text)


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

    updated = close_links(asset_ref.sub(stamp, text))
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

print(
    f"Проставлено версий ассетов: {stamped} в разметке, {css_stamped} в CSS; "
    f"внутренних ссылок со слэшем: {slashed_links}; "
    f"поправлено адресов в карте сайта: {slashed}"
)
