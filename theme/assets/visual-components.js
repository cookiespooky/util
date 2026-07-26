(function () {
  'use strict';

  var CONFIG = {
    cycle: {
      title: 'Цикл обращения с отходами',
      description: 'Статичный таймлайн показывает услугу как последовательный управляемый процесс. Количество этапов меняется только в массиве steps.',
      steps: [
        { id: 'source', title: 'Образование отходов', text: 'Отходы появляются у клиента и первично идентифицируются по виду, классу и объёму.' },
        { id: 'collection', title: 'Сбор и упаковка', text: 'Подбираются требования к таре, маркировке, накоплению и подготовке к передаче.' },
        { id: 'transport', title: 'Транспортирование', text: 'Партия вывозится по согласованному графику специализированным транспортом.' },
        { id: 'treatment', title: 'Обработка', text: 'Выполняется предусмотренная договором операция: обезвреживание, уничтожение или передача.' },
        { id: 'documents', title: 'Документы', text: 'Заказчик получает закрывающие и подтверждающие документы по выполненной услуге.' }
      ]
    },
    map: {
      title: 'Карта присутствия',
      description: 'Точки используют относительные координаты x/y. Можно добавить любое количество городов без изменения разметки.',
      cities: [
        { id: 'nyagan', name: 'Нягань', x: 25, y: 30, phone: '+7 3462 55-58-97', address: 'Адрес подразделения уточняется', services: ['Вывоз', 'Документы', 'Консультация'] },
        { id: 'surgut', name: 'Сургут и Белый Яр', x: 45, y: 24, phone: '+7 3462 55-58-97', address: 'Сургутский район, Белый Яр', services: ['Медицинские отходы', 'Промышленные отходы', 'Транспортирование'] },
        { id: 'tyumen', name: 'Тюмень', x: 40, y: 58, phone: '+7 3452 00-00-00', address: 'Адрес подразделения уточняется', services: ['Пищевые отходы', 'Документы', 'Регулярный вывоз'] },
        { id: 'novosibirsk', name: 'Новосибирск', x: 72, y: 72, phone: '+7 383 000-00-00', address: 'Адрес подразделения уточняется', services: ['Промышленные отходы', 'Разовые партии', 'Консультация'] }
      ]
    },
    matrix: {
      title: 'Матрица выбора услуги',
      description: 'Компонент связывает тип организации и задачу с подходящей услугой. Наборы опций и правила можно расширять конфигурацией.',
      organizations: [
        { id: 'clinic', label: 'Клиника или лаборатория' },
        { id: 'factory', label: 'Производство' },
        { id: 'retail', label: 'Магазин или склад' },
        { id: 'food', label: 'Общепит' }
      ],
      tasks: [
        { id: 'regular', label: 'Регулярный вывоз' },
        { id: 'single', label: 'Разовая партия' },
        { id: 'destroy', label: 'Уничтожение продукции' },
        { id: 'documents', label: 'Паспорта и документы' }
      ],
      results: {
        'clinic:regular': { title: 'Медицинские отходы', text: 'Регулярный вывоз отходов классов Б, В и Г по согласованному графику.', requirements: ['Класс отходов', 'Объём', 'Адрес', 'Периодичность'] },
        'clinic:single': { title: 'Разовый вывоз медицинских отходов', text: 'Проверим состав партии и возможность разового приёма.', requirements: ['Класс отходов', 'Объём', 'Фото или описание'] },
        'factory:regular': { title: 'Промышленные отходы I–IV классов', text: 'Комплексное обслуживание предприятия с графиком и документами.', requirements: ['Код ФККО', 'Класс опасности', 'Объём', 'Адрес'] },
        'factory:documents': { title: 'Паспорта отходов', text: 'Подготовка и актуализация экологической документации.', requirements: ['Состав отхода', 'Исходные документы', 'Реквизиты'] },
        'retail:destroy': { title: 'Уничтожение некачественной продукции', text: 'Уничтожение списанной продукции с подтверждающими материалами.', requirements: ['Наименование', 'Объём', 'Причина списания', 'Фотофиксация'] },
        'food:regular': { title: 'Пищевые отходы', text: 'Регулярный вывоз отходов общепита по согласованному графику.', requirements: ['Объём', 'Периодичность', 'Условия хранения'] },
        'default': { title: 'Подбор услуги специалистом', text: 'Опишите задачу — специалист определит услугу и перечень необходимых сведений.', requirements: ['Город', 'Описание задачи', 'Телефон'] }
      }
    }
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeSection(index, title, description) {
    var section = el('section', 'viz-section container');
    var head = el('div', 'viz-section-head');
    var left = el('div');
    left.appendChild(el('span', 'ds-index', index));
    left.appendChild(el('h2', '', title));
    head.appendChild(left);
    head.appendChild(el('p', '', description));
    section.appendChild(head);
    return section;
  }

  function renderCycle() {
    var cfg = CONFIG.cycle;
    var section = makeSection('09', cfg.title, cfg.description);
    var shell = el('div', 'viz-shell waste-timeline');

    cfg.steps.forEach(function (step, index) {
      var item = el('article', 'waste-timeline-item');
      var marker = el('div', 'waste-timeline-marker');
      marker.appendChild(el('span', 'waste-cycle-node', String(index + 1).padStart(2, '0')));

      var card = el('div', 'waste-cycle-card');
      card.appendChild(el('span', 'viz-label', 'Этап процесса'));
      card.appendChild(el('h3', '', step.title));
      card.appendChild(el('p', '', step.text));
      card.appendChild(el('div', 'waste-cycle-counter', String(index + 1).padStart(2, '0') + ' / ' + String(cfg.steps.length).padStart(2, '0')));

      item.appendChild(marker);
      item.appendChild(card);
      shell.appendChild(item);
    });

    section.appendChild(shell);
    section.appendChild(el('p', 'viz-caption', 'Параметры: cycle.steps[]. Добавление или удаление элемента автоматически перестраивает таймлайн и счётчики.'));
    return section;
  }

  function renderMap() {
    var cfg = CONFIG.map;
    var section = makeSection('10', cfg.title, cfg.description);
    var shell = el('div', 'viz-shell presence-map');
    var canvas = el('div', 'presence-canvas');
    var route = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    route.setAttribute('class', 'presence-route');
    route.setAttribute('viewBox', '0 0 100 100');
    route.setAttribute('preserveAspectRatio', 'none');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', cfg.cities.map(function (city, i) { return (i ? 'L' : 'M') + city.x + ' ' + city.y; }).join(' '));
    route.appendChild(path);
    canvas.appendChild(route);
    var info = el('aside', 'presence-info');

    function activate(cityId) {
      var city = cfg.cities.filter(function (item) { return item.id === cityId; })[0] || cfg.cities[0];
      Array.prototype.forEach.call(canvas.querySelectorAll('.presence-city'), function (button) {
        button.classList.toggle('is-active', button.getAttribute('data-city') === city.id);
      });
      info.innerHTML = '';
      info.appendChild(el('span', 'viz-label', 'Подразделение'));
      info.appendChild(el('h3', '', city.name));
      info.appendChild(el('p', '', 'Выберите город на схеме, чтобы увидеть локальные контакты и доступные направления.'));
      var meta = el('div', 'presence-meta');
      var phone = el('div'); phone.appendChild(el('span', '', 'Телефон')); phone.appendChild(el('strong', '', city.phone));
      var address = el('div'); address.appendChild(el('span', '', 'Адрес')); address.appendChild(el('strong', '', city.address));
      meta.appendChild(phone); meta.appendChild(address); info.appendChild(meta);
      var services = el('div', 'presence-services');
      city.services.forEach(function (service) { services.appendChild(el('span', '', service)); });
      info.appendChild(services);
    }

    cfg.cities.forEach(function (city) {
      var button = el('button', 'presence-city', city.name);
      button.type = 'button';
      button.setAttribute('data-city', city.id);
      button.style.setProperty('--x', city.x);
      button.style.setProperty('--y', city.y);
      button.addEventListener('click', function () { activate(city.id); });
      canvas.appendChild(button);
    });

    shell.appendChild(canvas);
    shell.appendChild(info);
    section.appendChild(shell);
    section.appendChild(el('p', 'viz-caption', 'Параметры: map.cities[]. Для новой точки достаточно id, названия, координат x/y, контактов и списка услуг.'));
    activate(cfg.cities[0].id);
    return section;
  }

  function renderMatrix() {
    var cfg = CONFIG.matrix;
    var section = makeSection('11', cfg.title, cfg.description);
    var shell = el('div', 'viz-shell service-matrix');
    var selectedOrg = cfg.organizations[0].id;
    var selectedTask = cfg.tasks[0].id;

    function makeGroup(title, items, selectedGetter, onSelect) {
      var group = el('div', 'matrix-group');
      group.appendChild(el('div', 'matrix-group-title', title));
      var options = el('div', 'matrix-options');
      items.forEach(function (item) {
        var button = el('button', 'matrix-option', item.label);
        button.type = 'button';
        button.setAttribute('data-value', item.id);
        button.classList.toggle('is-active', selectedGetter() === item.id);
        button.addEventListener('click', function () { onSelect(item.id); refresh(); });
        options.appendChild(button);
      });
      group.appendChild(options);
      return group;
    }

    var orgGroup = makeGroup('Кто вы?', cfg.organizations, function () { return selectedOrg; }, function (value) { selectedOrg = value; });
    var taskGroup = makeGroup('Что нужно сделать?', cfg.tasks, function () { return selectedTask; }, function (value) { selectedTask = value; });
    var result = el('div', 'matrix-result');

    function refresh() {
      Array.prototype.forEach.call(orgGroup.querySelectorAll('.matrix-option'), function (button) {
        button.classList.toggle('is-active', button.getAttribute('data-value') === selectedOrg);
      });
      Array.prototype.forEach.call(taskGroup.querySelectorAll('.matrix-option'), function (button) {
        button.classList.toggle('is-active', button.getAttribute('data-value') === selectedTask);
      });
      var data = cfg.results[selectedOrg + ':' + selectedTask] || cfg.results.default;
      result.innerHTML = '';
      var copy = el('div');
      copy.appendChild(el('span', 'viz-label', 'Подходящая услуга'));
      copy.appendChild(el('h3', '', data.title));
      copy.appendChild(el('p', '', data.text));
      var requirements = el('div', 'matrix-requirements');
      data.requirements.forEach(function (item) { requirements.appendChild(el('span', '', item)); });
      copy.appendChild(requirements);
      var action = el('button', 'ds-button ds-button-primary matrix-result-action', 'Получить расчёт');
      action.type = 'button';
      result.appendChild(copy);
      result.appendChild(action);
    }

    shell.appendChild(orgGroup);
    shell.appendChild(taskGroup);
    shell.appendChild(result);
    section.appendChild(shell);
    section.appendChild(el('p', 'viz-caption', 'Параметры: matrix.organizations[], matrix.tasks[] и matrix.results. Неизвестная комбинация автоматически использует default.'));
    refresh();
    return section;
  }

  function mount() {
    var page = document.querySelector('.ds-page');
    var anchor = document.querySelector('.ds-final');
    if (!page || !anchor) return;
    [renderCycle(), renderMap(), renderMatrix()].forEach(function (section) {
      page.insertBefore(section, anchor);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();