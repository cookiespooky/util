#!/usr/bin/env bash
# Выкладка боевого сайта на виртуальный хостинг reg.ru.
#
# Собирает сайт с config.regru.yaml (адреса своего домена и подключённый
# приёмник заявок) и заливает по rsync поверх SSH. GitHub Pages это не
# затрагивает: там свой конфиг и своя сборка через Actions.
#
# Переменные окружения:
#   REGRU_HOST   обязательна, вида u1234567@server.hosting.reg.ru
#   REGRU_ROOT   корень сайта на сервере, по умолчанию www/utilityservice.ru
#   REGRU_KEY    приватный ключ, по умолчанию ~/.ssh/utilit-deploy
#   DRY_RUN=1    показать, что изменится, ничего не заливая
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${REGRU_HOST:-}" ]]; then
  echo "Ошибка: не задан REGRU_HOST (например: REGRU_HOST=u1234567@server.hosting.reg.ru $0)" >&2
  exit 1
fi

REGRU_ROOT="${REGRU_ROOT:-www/utilityservice.ru}"
DIST_DIR="${DIST:-./dist}"

REGRU_KEY="${REGRU_KEY:-$HOME/.ssh/utilit-deploy}"

# IdentitiesOnly обязателен: в ~/.ssh много ключей, без него ssh переберёт их
# все и сервер оборвёт соединение по лимиту попыток авторизации.
SSH_CMD="ssh -i $REGRU_KEY -o IdentitiesOnly=yes"

RSYNC_OPTS=(-avz --human-readable -e "$SSH_CMD")
if [[ -n "${DRY_RUN:-}" ]]; then
  RSYNC_OPTS+=(--dry-run)
  echo "РЕЖИМ ПРОВЕРКИ: файлы не изменяются"
fi

echo "Собираю сайт для https://utilityservice.ru"
CONFIG=./config.regru.yaml DIST="$DIST_DIR" ./scripts/build.sh

# Сборка на GitHub Pages не должна утечь на боевой домен: проверяем явно.
if grep -rq "cookiespooky.github.io" "$DIST_DIR/index.html"; then
  echo "Ошибка: в сборке остались адреса GitHub Pages — проверьте CONFIG." >&2
  exit 1
fi

cp deploy/htaccess "$DIST_DIR/.htaccess"

# Статика. --delete убирает со сервера то, чего больше нет в сборке, поэтому
# api/ и storage/ исключены явно: их в dist нет, и они были бы снесены.
echo "Заливаю статику в $REGRU_ROOT"
rsync "${RSYNC_OPTS[@]}" --delete \
  --exclude 'api/' --exclude 'storage/' \
  "$DIST_DIR/" "$REGRU_HOST:$REGRU_ROOT/"

# Бэкенд. config.php с паролем от почты живёт только на сервере и никогда
# не перезаписывается отсюда.
echo "Заливаю бэкенд в $REGRU_ROOT/api"
rsync "${RSYNC_OPTS[@]}" \
  --exclude 'config.php' \
  api/ "$REGRU_HOST:$REGRU_ROOT/api/"

if [[ -n "${DRY_RUN:-}" ]]; then
  echo "Проверка завершена, ничего не изменено."
  exit 0
fi

echo
echo "Готово: https://utilityservice.ru"
echo "Если это первая выкладка, на сервере ещё нужно:"
echo "  1. скопировать api/config.sample.php в api/config.php и заполнить SMTP;"
echo "  2. создать каталог для журнала заявок вне корня сайта (например ~/storage)"
echo "     и указать его в config.php как storage_dir;"
echo "  3. выбрать версию PHP 8.0 или новее в панели ISPmanager."
