#!/usr/bin/env python3
"""Выгружает справочники сайта в api/site-data.generated.json.

Бэкенду нужны перечни допустимых городов и услуг: по городу выбирается ящик
получателя, по услуге — подпись в письме. Держать эти списки отдельной копией
в PHP нельзя — она молча разойдётся с сайтом, и заявка уедет не в тот город.
Поэтому справочники выводятся из того же источника, что и страницы.

Разбирается только верхний уровень YAML-фронтматтера, без внешних библиотек:
на площадке сборки может не быть pyyaml, а нужные поля лежат плоско.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "api" / "site-data.generated.json"


def frontmatter(path: pathlib.Path) -> str:
    text = path.read_text()
    if not text.startswith("---"):
        raise ValueError(f"{path.name}: нет frontmatter")
    return text[3:text.index("\n---", 3)]


def scalar(block: str, key: str) -> str | None:
    m = re.search(rf"^{key}:[ \t]*(.+)$", block, re.M)
    return m.group(1).strip().strip("'\"") if m else None


def contact_block(block: str) -> str:
    m = re.search(r"^contact:\n(?:[ \t]+.*\n)*", block, re.M)
    return m.group(0) if m else ""


def is_draft(block: str) -> bool:
    return (scalar(block, "draft") or "false").lower() == "true"


def collect_cities() -> list[dict]:
    cities = []
    for path in sorted((ROOT / "content" / "cities").glob("*.md")):
        block = frontmatter(path)
        if is_draft(block):
            continue

        key = scalar(block, "city_key")
        if not key:
            raise ValueError(f"{path.name}: нет city_key")

        contact = contact_block(block)
        phone = re.search(r"^\s*- value:[ \t]*(.+)$", contact, re.M)
        link = re.search(r"^\s*link:[ \t]*(.+)$", contact, re.M)
        clean = lambda m: m.group(1).strip().strip("'\"") if m else None

        cities.append({
            "key": key,
            "slug": scalar(block, "slug"),
            "title": scalar(block, "nav_title"),
            "full_title": scalar(block, "city"),
            "email": scalar(contact, r"[ \t]*email"),
            "phone": clean(phone),
            "phone_link": clean(link),
            "order": int(scalar(block, "nav_order") or 0),
        })

    cities.sort(key=lambda c: c["order"])
    return cities


def collect_services() -> list[dict]:
    services = []
    for path in sorted((ROOT / "content" / "services").glob("*.md")):
        block = frontmatter(path)
        if is_draft(block):
            continue

        key = scalar(block, "service_key")
        if not key:
            continue

        services.append({
            "key": key,
            "slug": scalar(block, "slug"),
            "title": scalar(block, "hero_title") or scalar(block, "title"),
            "order": int(scalar(block, "nav_order") or 0),
        })

    services.sort(key=lambda s: s["order"])
    return services


def main() -> int:
    try:
        data = {"cities": collect_cities(), "services": collect_services()}
    except (ValueError, OSError) as exc:
        print(f"Ошибка: {exc}", file=sys.stderr)
        return 1

    if not data["cities"]:
        print("Ошибка: не найдено ни одного подразделения", file=sys.stderr)
        return 1
    if not data["services"]:
        print("Ошибка: не найдено ни одной услуги", file=sys.stderr)
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(
        f"Справочники выгружены: {len(data['cities'])} подразделений, "
        f"{len(data['services'])} услуг → {OUT.relative_to(ROOT)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
