# Утилитсервис — текстовый сайт

Статический корпоративный сайт на Markdown и [Notepub](https://github.com/cookiespooky/notepub). Публичная версия собирается GitHub Actions и размещается на GitHub Pages.

## Публичный адрес

https://cookiespooky.github.io/util/

## Что внутри

- `content/` — тексты страниц с frontmatter и `[[wikilinks]]`;
- `theme/` — кастомные HTML-шаблоны, CSS и JavaScript;
- `rules.yaml` — типы страниц, маршруты, граф ссылок, поиск и sitemap;
- `config.yaml` — production-конфигурация GitHub Pages;
- `config.dev.yaml` — локальная конфигурация;
- `scripts/build.sh` — воспроизводимая проверка и статическая сборка;
- `scripts/deploy.sh` — сборка, коммит и push текущей ветки;
- `.github/workflows/pages.yml` — автоматический деплой GitHub Pages.

## Локальная сборка

Требуется Go 1.22+ либо готовый бинарник `notepub` в `PATH`.

```bash
./scripts/build.sh
```

Скрипт:

1. устанавливает зафиксированную версию Notepub, если бинарника нет;
2. проверяет frontmatter, маршруты, wikilinks и Markdown;
3. строит индекс;
4. собирает `dist/`;
5. проверяет наличие обязательных файлов и локальные ссылки.

## Локальный просмотр

```bash
notepub serve --config ./config.dev.yaml --rules ./rules.yaml
```

Открыть http://127.0.0.1:8080/.

## Деплой

```bash
./scripts/deploy.sh "Update site content"
```

После push workflow автоматически пересобирает и публикует сайт.

## Статус контента

Текстовые заглушки в квадратных скобках намеренны. Они отмечают данные, которые должен подтвердить Заказчик: городские контакты, перечни услуг, лицензии, документы, показатели компании и юридические тексты.

GitHub Pages подключён через Actions. Контрольный запуск публикации: 18 июля 2026 года.
