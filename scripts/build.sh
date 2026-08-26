#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NOTEPUB_REF="${NOTEPUB_REF:-ff6d7902b9675cca01363b81ab6a3afedcddd565}"
NOTEPUB_BIN="${NOTEPUB_BIN:-}"
# Конфиг сборки: config.yaml — превью на GitHub Pages,
# config.regru.yaml — боевой сайт на своём домене.
CONFIG="${CONFIG:-./config.yaml}"
DIST="${DIST:-./dist}"

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

# artifacts/ — каталог по умолчанию шага build; чистим, чтобы он не расходился
# с индексом в .notepub/artifacts
rm -rf "$DIST" .notepub artifacts
mkdir -p "$DIST"

echo "Проверяю frontmatter и маршруты"
"$NOTEPUB_BIN" validate --config "$CONFIG" --rules ./rules.yaml

echo "Строю индекс и карту разрешения ссылок"
"$NOTEPUB_BIN" index --config "$CONFIG" --rules ./rules.yaml

RESOLVE_FILE="./.notepub/artifacts/resolve.json"
if [[ ! -f "$RESOLVE_FILE" ]]; then
  echo "Ошибка: после index не создан $RESOLVE_FILE" >&2
  exit 1
fi

echo "Проверяю wikilinks и Markdown по созданной карте"
"$NOTEPUB_BIN" validate --config "$CONFIG" --rules ./rules.yaml --resolve "$RESOLVE_FILE" --links --markdown

echo "Выгружаю справочники для бэкенда"
python3 ./scripts/export-backend-data.py

echo "Собираю статический сайт"
"$NOTEPUB_BIN" build --config "$CONFIG" --rules ./rules.yaml --dist "$DIST" --artifacts ./.notepub/artifacts

touch "$DIST/.nojekyll"
if [[ -f "$DIST/404/index.html" ]]; then
  cp "$DIST/404/index.html" "$DIST/404.html"
fi

python3 ./scripts/postprocess-dist.py "$DIST"

python3 ./scripts/check-dist.py "$DIST"

echo "Готово: $DIST (конфиг: $CONFIG)"
