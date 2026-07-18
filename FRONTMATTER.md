# Контракт frontmatter

Обязательные поля Notepub: `type`, `slug`, `title`.

Дополнительные поля прототипа:

- `layout` — будущий шаблон кастомной верстки;
- `page_kind` — `home`, `catalog`, `service`, `city`, `content`, `partial`, `system`;
- `nav_order` — порядок;
- `section` — раздел;
- `city` — город;
- `service_key` — машинный ключ услуги;
- `related` — связанные slug;
- `noindex` — служебная индексация;
- `updated_at` — дата версии.

Маркеры `<!-- block:* -->`, `<!-- include:site-header -->` и `<!-- include:site-footer -->` безопасны для Markdown и предназначены для будущей темы.
