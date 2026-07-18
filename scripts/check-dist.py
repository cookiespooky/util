#!/usr/bin/env python3
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "dist").resolve()
required = [root / "index.html", root / "search.json", root / "sitemap.xml"]
missing = [str(p.relative_to(root)) for p in required if not p.exists()]
if missing:
    raise SystemExit("Не созданы обязательные файлы: " + ", ".join(missing))

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links: list[str] = []
    def handle_starttag(self, tag, attrs):
        if tag in {"a", "link", "script", "img"}:
            for key, value in attrs:
                if key in {"href", "src"} and value:
                    self.links.append(value)

broken: list[tuple[str, str]] = []
html_files = list(root.rglob("*.html"))
for page in html_files:
    parser = Links()
    parser.feed(page.read_text(encoding="utf-8", errors="replace"))
    for link in parser.links:
        if link.startswith(("mailto:", "tel:", "#", "javascript:")):
            continue
        parsed = urlparse(link)
        if parsed.scheme in {"http", "https"}:
            continue
        path = parsed.path
        if not path:
            continue
        if path.startswith("/util/"):
            path = path[len("/util/"):]
        elif path.startswith("/"):
            continue
        target = root / path
        candidates = [target, target / "index.html"]
        if target.suffix == "":
            candidates.append(target.with_suffix(".html"))
        if not any(c.exists() for c in candidates):
            broken.append((str(page.relative_to(root)), link))

if broken:
    sample = "\n".join(f"- {page}: {link}" for page, link in broken[:30])
    raise SystemExit(f"Найдены локальные ссылки на отсутствующие файлы:\n{sample}")

print(f"Проверено HTML-страниц: {len(html_files)}. Локальные ссылки разрешаются.")
