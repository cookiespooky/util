#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NOTEPUB_REF="${NOTEPUB_REF:-ff6d7902b9675cca01363b81ab6a3afedcddd565}"
NOTEPUB_BIN="${NOTEPUB_BIN:-}"

if [[ -z "$NOTEPUB_BIN" ]]; then
  if command -v notepub >/dev/null 2>&1; then
    NOTEPUB_BIN="$(command -v notepub)"
  else
    if ! command -v go >/dev/null 2>&1; then
      echo "Ошибка: не найден notepub и не установлен Go." >&2
      exit 1
    fi
    mkdir -p "$ROOT_DIR/.bin"
    echo "Устанавливаю Notepub @ ${NOTEPUB_REF}"
    GOBIN="$ROOT_DIR/.bin" go install "github.com/cookiespooky/notepub/cmd/notepub@${NOTEPUB_REF}"
    NOTEPUB_BIN="$ROOT_DIR/.bin/notepub"
  fi
fi

rm -rf dist .notepub
mkdir -p dist

echo "Проверяю frontmatter и маршруты"
"$NOTEPUB_BIN" validate --config ./config.yaml --rules ./rules.yaml

echo "Строю индекс и карту разрешения ссылок"
"$NOTEPUB_BIN" index --config ./config.yaml --rules ./rules.yaml

RESOLVE_FILE="./.notepub/artifacts/resolve.json"
if [[ ! -f "$RESOLVE_FILE" ]]; then
  echo "Ошибка: после index не создан $RESOLVE_FILE" >&2
  exit 1
fi

echo "Проверяю wikilinks и Markdown по созданной карте"
"$NOTEPUB_BIN" validate --config ./config.yaml --rules ./rules.yaml --resolve "$RESOLVE_FILE" --links --markdown

echo "Собираю статический сайт"
"$NOTEPUB_BIN" build --config ./config.yaml --rules ./rules.yaml --dist ./dist

touch dist/.nojekyll
if [[ -f dist/404/index.html ]]; then
  cp dist/404/index.html dist/404.html
fi

python3 ./scripts/check-dist.py ./dist

echo "Готово: $ROOT_DIR/dist"
