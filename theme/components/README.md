# Компонентная архитектура темы

Каталог `theme/components/` предназначен для серверных HTML-компонентов. Компонент получает нормализованные данные и не анализирует произвольный порядок Markdown-элементов.

## Целевая структура

```text
theme/components/
  primitives/
    section.html
    section-heading.html
    button.html
    card.html
    prose.html
  hero/
    home.html
    page.html
    service.html
    city.html
  services/
    card.html
    grid.html
    selector.html
    related.html
  process/
    timeline.html
    route.html
  facts/
    grid.html
  capabilities/
    grid.html
  cities/
    map.html
    list.html
  documents/
    card.html
    list.html
  faq/
    list.html
  forms/
    request.html
  contacts/
    panel.html
  cta/
    panel.html
```

## Контракт компонента

Каждый компонент должен:

1. получать готовую модель данных;
2. иметь один корневой предметный класс;
3. использовать BEM-подобные классы `component__element` и `component--modifier`;
4. использовать токены, а не локальные произвольные значения без причины;
5. иметь читаемый HTML без JavaScript;
6. не полагаться на позицию среди соседних элементов;
7. корректно работать при изменении количества элементов;
8. поддерживать клавиатуру и доступные подписи, когда есть интерактивность.

## Пример

```html
<section class="section section--surface service-section">
  <div class="container">
    <header class="section-heading">
      <span class="section-heading__eyebrow">Услуги</span>
      <h2 class="section-heading__title">С какими отходами работаем</h2>
      <p class="section-heading__description">Краткое пояснение.</p>
    </header>

    <div class="service-grid">
      <!-- service-card components -->
    </div>
  </div>
</section>
```

## CSS-слои

```text
design-tokens.css       — значения и семантические переменные
primitives.css          — контейнеры, секции, типографика, кнопки, формы
components/*.css        — предметные компоненты
pages/*.css             — только композиция конкретного типа страницы
utilities.css           — ограниченный набор технических утилит
```

Страничный CSS не должен переопределять внутреннюю структуру компонента через длинные селекторы.

## Именование

Хорошо:

```text
.service-card
.service-card__title
.service-card__summary
.service-card--featured
```

Не использовать как основной публичный контракт:

```text
.card-2
.blue-box
.prose > ul:nth-of-type(3)
.js-generated-wrapper
```

## Миграция

Пока Notepub не передаёт блоки как структурированную модель, компоненты могут внедряться по типам страниц. Временные DOM-преобразования не расширяются и удаляются после переноса соответствующей страницы в серверный шаблон.
