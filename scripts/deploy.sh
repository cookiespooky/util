#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

./scripts/build.sh

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Сборка готова, но каталог не является git-репозиторием." >&2
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "Нельзя выполнить деплой из detached HEAD." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  git add content theme config.yaml config.dev.yaml rules.yaml scripts .github README.md FRONTMATTER.md .gitignore media
  git commit -m "${1:-Update Utilit text site}"
else
  echo "Изменений для коммита нет."
fi

git push origin "$BRANCH"
echo "Push выполнен. GitHub Actions опубликует Pages после успешной сборки."
