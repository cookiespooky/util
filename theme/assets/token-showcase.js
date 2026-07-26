(function () {
  'use strict';

  var groups = {
    colors: [
      ['Основной синий', '--color-brand-blue', '#5AAEE6'],
      ['Сильный синий', '--color-brand-blue-strong', '#3F8FC8'],
      ['Мягкий синий', '--color-brand-blue-soft', '#EAF6FD'],
      ['Основной зелёный', '--color-brand-green', '#5BC873'],
      ['Сильный зелёный', '--color-brand-green-strong', '#42A95B'],
      ['Мягкий зелёный', '--color-brand-green-soft', '#ECF9EF'],
      ['Фон страницы', '--color-page', '#F2F5F4'],
      ['Поверхность', '--color-surface', '#FFFFFF'],
      ['Вторичная поверхность', '--color-surface-muted', '#F7F9F8'],
      ['Основной текст', '--color-text', '#1E2925'],
      ['Вторичный текст', '--color-text-muted', '#43504B']
    ],
    spacing: [
      ['4 px', '--space-1', '4px'], ['8 px', '--space-2', '8px'], ['12 px', '--space-3', '12px'],
      ['16 px', '--space-4', '16px'], ['24 px', '--space-6', '24px'], ['32 px', '--space-8', '32px'],
      ['48 px', '--space-12', '48px'], ['56 px', '--space-14', '56px']
    ],
    radius: [
      ['Контрол', '--radius-control', '12px'],
      ['Карточка', '--radius-card', '18px'],
      ['Секция', '--radius-section', '22px'],
      ['Логотип', '--radius-brand', '13px']
    ],
    type: [
      ['Подпись', '--font-size-xs', '12px'],
      ['Малый текст', '--font-size-sm', '13px'],
      ['Основной интерфейс', '--font-size-md', '15px'],
      ['Основной текст', '--font-size-lg', '17px'],
      ['Заголовок карточки', '--font-size-xl', '24px'],
      ['Межстрочный заголовков', '--line-height-heading', '1.4'],
      ['Межстрочный текста', '--line-height-body', '1.65']
    ]
  };

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function row(label, token, value, kind) {
    var item = node('div', 'token-row');
    var meta = node('div', 'token-row__meta');
    meta.appendChild(node('strong', '', label));
    meta.appendChild(node('code', '', token));
    item.appendChild(meta);

    var visual = node('div', 'token-row__value');
    if (kind === 'color') {
      var swatch = node('div', 'token-swatch');
      swatch.style.setProperty('--token-color', 'var(' + token + ')');
      visual.appendChild(swatch);
    } else if (kind === 'space') {
      var space = node('div', 'token-space');
      space.style.width = 'var(' + token + ')';
      visual.appendChild(space);
    } else if (kind === 'radius') {
      var radius = node('div', 'token-radius');
      radius.style.setProperty('--token-radius', 'var(' + token + ')');
      visual.appendChild(radius);
    } else {
      var sample = node('span', 'token-type-sample', 'Aa · ' + value);
      if (token.indexOf('font-size') > -1) sample.style.fontSize = 'var(' + token + ')';
      if (token.indexOf('line-height') > -1) sample.style.lineHeight = 'var(' + token + ')';
      visual.appendChild(sample);
    }
    item.appendChild(visual);
    return item;
  }

  function panel(title, items, kind) {
    var section = node('section', 'token-panel');
    section.appendChild(node('h3', '', title));
    var list = node('div', 'token-list');
    items.forEach(function (item) { list.appendChild(row(item[0], item[1], item[2], kind)); });
    section.appendChild(list);
    return section;
  }

  function classPanel() {
    var section = node('section', 'token-panel');
    section.appendChild(node('h3', '', 'Классы компонентов'));
    var list = node('div', 'token-class-grid');
    [
      ['.ui-surface', 'Базовая поверхность без рамки и тени.'],
      ['.ui-surface--muted', 'Вторичный слой для внутренних блоков.'],
      ['.ui-card', 'Карточка с единым радиусом и внутренним отступом.'],
      ['.ui-control', 'Общий контракт для input, select и textarea.'],
      ['.ui-button', 'Базовый размер и типографика кнопок.'],
      ['.ui-button--primary', 'Главное действие с синим акцентом.'],
      ['.ui-label', 'Надзаголовок и служебная подпись.'],
      ['.ui-title', 'Заголовок с единым межстрочным интервалом.'],
      ['.ui-copy', 'Основной описательный текст.'],
      ['.ui-stack / .ui-cluster', 'Вертикальная и горизонтальная композиция.']
    ].forEach(function (item) {
      var block = node('div', 'token-class');
      block.appendChild(node('code', '', item[0]));
      block.appendChild(node('p', '', item[1]));
      list.appendChild(block);
    });
    section.appendChild(list);

    var demo = node('div', 'token-demo');
    var cardA = node('article', 'ui-card');
    cardA.appendChild(node('span', 'ui-label', 'Поверхность'));
    cardA.appendChild(node('h4', 'ui-title', 'Базовая карточка'));
    cardA.appendChild(node('p', 'ui-copy', 'Компонент использует только семантические токены.'));
    var cardB = node('article', 'ui-card ui-card--muted');
    cardB.appendChild(node('span', 'ui-label', 'Вторичный слой'));
    cardB.appendChild(node('h4', 'ui-title', 'Приглушённая карточка'));
    cardB.appendChild(node('p', 'ui-copy', 'Подходит для пояснений и вложенных состояний.'));
    demo.appendChild(cardA); demo.appendChild(cardB);
    section.appendChild(demo);
    return section;
  }

  function mount() {
    var page = document.querySelector('.ds-page');
    var anchor = document.querySelector('.ds-final');
    if (!page || !anchor) return;

    var section = node('section', 'token-reference container');
    var head = node('div', 'token-reference__head');
    var left = node('div');
    left.appendChild(node('span', 'ds-index', '12'));
    left.appendChild(node('h2', '', 'Токены и классы'));
    head.appendChild(left);
    head.appendChild(node('p', '', 'Все базовые настройки собраны в одном слое. Компоненты используют семантические переменные, поэтому цвет, радиус, отступ или высоту контролов можно изменить централизованно.'));
    section.appendChild(head);

    var grid = node('div', 'token-reference__grid');
    grid.appendChild(panel('Цвета', groups.colors, 'color'));
    grid.appendChild(panel('Отступы', groups.spacing, 'space'));
    grid.appendChild(panel('Скругления', groups.radius, 'radius'));
    grid.appendChild(panel('Типографика', groups.type, 'type'));
    grid.appendChild(classPanel());
    section.appendChild(grid);
    page.insertBefore(section, anchor);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();