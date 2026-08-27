/* v2 — поведение страниц нового поколения: главной, услуг, раздела компании
   и подразделений. Точки входа ищутся по data-атрибутам, поэтому скрипт
   безопасно подключается к любой из них. */
(function () {
  'use strict';

  /* Динамические поля по услугам — состав по CONTENT-SPEC.md.
     Показываются только после выбора услуги, максимум три поля. */
  var dynamicFields = {
    medical: [
      { name: 'waste-class', label: 'Класс отходов', type: 'select', options: ['Класс Б', 'Класс В', 'Класс Г', 'Несколько классов', 'Не знаю'] },
      { name: 'volume', label: 'Примерный объём или количество упаковок', type: 'text', placeholder: 'Например: 20 пакетов в неделю' }
    ],
    industrial: [
      { name: 'waste-name', label: 'Наименование отхода или код ФККО', type: 'text', placeholder: 'Название отхода или код, если известен' },
      { name: 'volume', label: 'Примерный объём', type: 'text', placeholder: 'Например: 3 тонны в месяц' },
      { name: 'state', label: 'Агрегатное состояние', type: 'select', options: ['Твёрдое', 'Жидкое', 'Смешанное', 'Не знаю'] }
    ],
    food: [
      { name: 'product', label: 'Вид продукции или отходов', type: 'text', placeholder: 'Например: молочная продукция с истёкшим сроком' },
      { name: 'volume', label: 'Примерный объём', type: 'text', placeholder: 'Например: 500 кг' },
      { name: 'record', label: 'Нужна ли фото- или видеофиксация', type: 'select', options: ['Не нужна', 'Фотофиксация', 'Видеофиксация'] }
    ],
    biological: [
      { name: 'waste-name', label: 'Вид отходов', type: 'text', placeholder: 'Например: павшая птица' },
      { name: 'mass', label: 'Примерная масса', type: 'text', placeholder: 'Например: 800 кг' },
      { name: 'storage', label: 'Условия хранения', type: 'text', placeholder: 'Холодильная камера, контейнер, открытая площадка' }
    ],
    documents: [
      { name: 'volume', label: 'Количество коробок или примерный объём', type: 'text', placeholder: 'Например: 40 архивных коробов' },
      { name: 'record', label: 'Нужна ли фото- или видеофиксация', type: 'select', options: ['Не нужна', 'Фотофиксация', 'Видеофиксация'] }
    ],
    passports: [
      { name: 'kinds', label: 'Количество видов отходов', type: 'text', placeholder: 'Например: 12 видов' },
      { name: 'existing', label: 'Есть ли старые паспорта или лабораторные документы', type: 'select', options: ['Есть', 'Нет', 'Частично'] }
    ],
    cremation: [
      { name: 'weight', label: 'Примерный вес животного', type: 'text', placeholder: 'Например: 12 кг' },
      { name: 'format', label: 'Формат кремации', type: 'select', options: ['Общая', 'Индивидуальная', 'Нужна консультация'] },
      { name: 'pickup', label: 'Нужен ли выезд', type: 'select', options: ['Не нужен', 'Нужен'] }
    ]
  };

  function createField(field) {
    var label = document.createElement('label');
    label.className = 'v2-field';

    var caption = document.createElement('span');
    caption.textContent = field.label;
    label.appendChild(caption);

    var control;
    if (field.type === 'select') {
      control = document.createElement('select');
      field.options.forEach(function (option) {
        var item = document.createElement('option');
        item.value = option;
        item.textContent = option;
        control.appendChild(item);
      });
    } else {
      control = document.createElement('input');
      control.type = 'text';
      if (field.placeholder) control.placeholder = field.placeholder;
    }
    control.className = 'v2-control';
    control.name = field.name;
    label.appendChild(control);

    return label;
  }

  function initDynamicFields(form) {
    var serviceSelect = form.querySelector('[data-request-service]');
    var container = form.querySelector('[data-dynamic-fields]');
    if (!serviceSelect || !container) return;

    /* На странице услуги услуга известна из контекста и подставляется
       заранее (CONTENT-SPEC.md), но остаётся доступной для изменения. */
    var preset = form.dataset.servicePreset;
    if (preset) {
      var hasPreset = Array.prototype.some.call(serviceSelect.options, function (option) {
        return option.value === preset;
      });
      if (hasPreset) serviceSelect.value = preset;
    }

    function render() {
      var fields = dynamicFields[serviceSelect.value];
      container.innerHTML = '';

      if (!fields) {
        container.hidden = true;
        return;
      }

      var title = document.createElement('span');
      title.className = 'v2-form__dynamic-title';
      title.textContent = 'Уточните по выбранной услуге';
      container.appendChild(title);

      fields.forEach(function (field) {
        container.appendChild(createField(field));
      });
      container.hidden = false;
    }

    serviceSelect.addEventListener('change', render);
    render();
  }

  /* Отметка времени для отсева роботов: в разметке её нет, потому что сайт
     статический и серверное время было бы временем сборки. */
  function initFormGuard(form) {
    var stamp = form.querySelector('[data-form-ts]');
    if (stamp) stamp.value = String(Math.floor(Date.now() / 1000));
  }

  /* Отправка заявки на бэкенд. Адрес берётся из data-endpoint формы, чтобы
     не зашивать префикс: сайт живёт и в подкаталоге, и в корне домена.

     Успехом считается ответ ok — сервер сначала пишет заявку в журнал и лишь
     потом шлёт почту, поэтому «принято» здесь не обманывает даже при
     недоступном SMTP. Оговорка о том, что заявка не подтверждает возможность
     приёма отхода, стоит рядом с кнопкой (CONTENT-SPEC.md) и остаётся
     единственной обратной связью: автоответ клиенту не отправляется. */
  function initSubmit(form) {
    var status = form.querySelector('[data-form-status]');
    var submitButton = form.querySelector('button[type="submit"]');
    var endpoint = form.dataset.endpoint;
    var sending = false;

    function show(message, isError) {
      if (!status) return;
      status.textContent = message;
      status.hidden = false;
      status.classList.toggle('is-error', !!isError);
    }

    /* Подпись поля для сообщения об ошибке. Из «Организация — необязательно»
       берём только название, всё после тире — пояснение. */
    function fieldLabel(control) {
      var field = control.closest('.v2-field');
      var caption = field ? field.querySelector('span') : null;
      return caption ? caption.textContent.split('—')[0].trim() : 'обязательное поле';
    }

    function wrapOf(control) {
      return control.closest('.v2-form__consent') || control.closest('.v2-field');
    }

    function markInvalid(control, message) {
      var wrap = wrapOf(control);
      control.setAttribute('aria-invalid', 'true');
      if (wrap) wrap.classList.add('is-invalid');
      show(message, true);
      control.focus();
    }

    function clearInvalid(control) {
      if (!control || !control.removeAttribute) return;
      control.removeAttribute('aria-invalid');
      var wrap = wrapOf(control);
      if (wrap) wrap.classList.remove('is-invalid');
    }

    /* Своя проверка обязательных полей: на форме стоит novalidate, потому что
       браузерная подсказка не вписывается в оформление, а на телефоне её
       легко не заметить. Раньше отправка в этом месте просто прекращалась
       молча — посетитель видел, что кнопка не работает, и не понимал почему.
       Сообщение выводим в ту же строку статуса, что и ответ сервера, и
       подсвечиваем само поле. */
    function firstProblem() {
      var controls = form.querySelectorAll('[required]');
      for (var i = 0; i < controls.length; i++) {
        var control = controls[i];

        if (control.type === 'checkbox') {
          if (control.checked) continue;
          return [control, control.name === 'privacy-consent'
            ? 'Отметьте согласие на обработку персональных данных — без него заявку принять нельзя.'
            : 'Отметьте обязательный пункт.'];
        }

        var value = (control.value || '').trim();
        if (!value) {
          return [control, control.name === 'phone'
            ? 'Укажите телефон — по нему специалист свяжется с вами.'
            : 'Заполните поле «' + fieldLabel(control) + '».'];
        }
        /* Маска доводит номер до одиннадцати цифр; меньше — номер оборван. */
        if (control.name === 'phone' && value.replace(/\D/g, '').length < 11) {
          return [control, 'Номер неполный — укажите телефон целиком.'];
        }
      }
      return null;
    }

    /* Подсветка снимается сразу, как только поле начали исправлять. */
    form.addEventListener('input', function (event) { clearInvalid(event.target); });
    form.addEventListener('change', function (event) { clearInvalid(event.target); });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (sending) return;

      var marked = form.querySelectorAll('[aria-invalid]');
      for (var i = 0; i < marked.length; i++) clearInvalid(marked[i]);

      var problem = firstProblem();
      if (problem) {
        markInvalid(problem[0], problem[1]);
        return;
      }

      if (!endpoint) {
        // Бэкенд не подключён — ведём себя как раньше, чтобы форма на
        // статичной сборке не выглядела сломанной.
        show('Заявка отправлена. Специалист проверит информацию и свяжется с вами для уточнения условий.');
        return;
      }

      sending = true;
      if (submitButton) submitButton.disabled = true;
      show('Отправляем заявку…');

      fetch(endpoint, {
        method: 'POST',
        body: new FormData(form)
      }).then(function (response) {
        return response.json().catch(function () { return {}; });
      }).then(function (data) {
        if (data && data.ok) {
          form.reset();
          show('Заявка отправлена. Специалист проверит информацию и свяжется с вами для уточнения условий.');
          return;
        }

        if (data && data.error === 'rate_limited') {
          show('Слишком много заявок подряд. Попробуйте позже или позвоните нам.', true);
          return;
        }

        /* Сервер проверяет те же поля ещё раз и возвращает 422 со списком.
           Показываем первую претензию его словами, а не общей ошибкой. */
        if (data && data.error === 'validation' && data.fields) {
          var names = Object.keys(data.fields);
          var control = names.length ? form.querySelector('[name="' + names[0] + '"]') : null;
          if (control) markInvalid(control, data.fields[names[0]]);
          else show('Проверьте заполнение формы и отправьте ещё раз.', true);
          return;
        }

        show('Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.', true);
      }).catch(function () {
        show('Не удалось отправить заявку. Проверьте соединение или позвоните нам.', true);
      }).then(function () {
        sending = false;
        if (submitButton) submitButton.disabled = false;
      });
    });
  }

  /* Маска телефона: +7 999 123-45-67. Любой ввод приводится к одиннадцати
     цифрам российского номера — «8» в начале и вставка из буфера с пробелами,
     скобками или префиксом 007 дают одинаковую запись, так что и оператору в
     письме, и проверке на сервере достаётся один формат.

     Каретку возвращаем по числу цифр слева от неё, а не по числу символов:
     разделители переставляются при каждом вводе, и по символам курсор
     уезжал бы при правке в середине номера. */
  function initPhoneMask(form) {
    var input = form.querySelector('input[name="phone"]');
    if (!input) return;

    function digitsOf(raw) {
      var d = raw.replace(/\D/g, '');
      if (!d) return '';
      /* Международный префикс 00 равнозначен плюсу: без этого «007 916…»
         превращалось бы в номер с двумя лишними нулями внутри. */
      if (d.slice(0, 2) === '00') d = d.slice(2);
      if (d.charAt(0) === '8') d = '7' + d.slice(1);
      else if (d.charAt(0) !== '7') d = '7' + d;
      return d.slice(0, 11);
    }

    function format(d) {
      if (!d) return '';
      var out = '+7';
      if (d.length > 1) out += ' ' + d.slice(1, 4);
      if (d.length > 4) out += ' ' + d.slice(4, 7);
      if (d.length > 7) out += '-' + d.slice(7, 9);
      if (d.length > 9) out += '-' + d.slice(9, 11);
      return out;
    }

    input.addEventListener('input', function () {
      var raw = input.value;
      var caret = input.selectionStart;
      var atEnd = caret === raw.length;
      var before = raw.slice(0, caret).replace(/\D/g, '').length;

      /* Если номер начали не с кода страны, семёрку подставили мы —
         значит цифр слева от каретки стало на одну больше. */
      var first = raw.replace(/\D/g, '').charAt(0);
      if (first && first !== '7' && first !== '8') before += 1;

      var value = format(digitsOf(raw));
      if (value === raw) return;
      input.value = value;

      if (atEnd) {
        input.setSelectionRange(value.length, value.length);
        return;
      }

      var seen = 0;
      var pos = value.length;
      for (var i = 0; i < value.length; i++) {
        if (value.charAt(i) < '0' || value.charAt(i) > '9') continue;
        seen += 1;
        if (seen === before) { pos = i + 1; break; }
      }
      input.setSelectionRange(pos, pos);
    });
  }

  /* Кнопка «Проверить возможность приёма» ведёт к форме
     с ненавязанной услугой — посетитель описывает отход словами. */
  function initUnknownWasteShortcut(form) {
    var serviceSelect = form.querySelector('[data-request-service]');
    var comment = form.querySelector('textarea[name="comment"]');
    if (!serviceSelect) return;

    document.querySelectorAll('.v2-service--action a[href="#request"]').forEach(function (link) {
      link.addEventListener('click', function () {
        serviceSelect.value = '';
        serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
        window.setTimeout(function () { if (comment) comment.focus({ preventScroll: true }); }, 400);
      });
    });
  }

  /* Карточки «кому подходит» ведут к форме с подставленной услугой.
     Профиль организации и вид услуги — разные оси (у госзаказчика отход
     может быть любым), поэтому пресет задаёт только начальное значение:
     селект остаётся доступным для замены, ничего не обещая заранее. */
  function initAudienceShortcuts(form) {
    var serviceSelect = form.querySelector('[data-request-service]');
    var comment = form.querySelector('textarea[name="comment"]');
    if (!serviceSelect) return;

    document.querySelectorAll('[data-audience-service]').forEach(function (link) {
      link.addEventListener('click', function () {
        var preset = link.dataset.audienceService;
        var known = Array.prototype.some.call(serviceSelect.options, function (option) {
          return option.value === preset;
        });
        if (!known) return;

        serviceSelect.value = preset;
        serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));

        /* Пустой пресет — «Не знаю — подберите»: услугу не навязываем,
           даём описать отход словами. Ждём окончания плавного скролла. */
        if (!preset && comment) {
          window.setTimeout(function () { comment.focus({ preventScroll: true }); }, 400);
        }
      });
    });
  }

  /* Общий main.js восстанавливает город из localStorage по всему сайту.
     Если сохранён город, которого нет в списке этой страницы, селектор
     остаётся пустым — возвращаем его к городу по умолчанию. */
  function initCityFallback() {
    var citySelect = document.querySelector('[data-city-select]');
    if (!citySelect || citySelect.value) return;
    /* Город по умолчанию — первый в списке, а не зашитый «Сургут»:
       список собирается из коллекции городов, порядок задаёт nav_order. */
    if (!citySelect.options.length) return;
    citySelect.value = citySelect.options[0].value;
    citySelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* Поиск в строке меню. Источник — список страниц v2, отданный в разметке
     data-атрибутами: общий search.json собирается только по страницам v1.
     Совпадения ищутся по заголовку и описанию, как в main.js. */
  var KIND_LABELS = {
    home: 'Главная',
    catalog: 'Каталог',
    service: 'Услуга',
    city: 'Подразделение',
    content: 'Компания'
  };

  function initHeaderSearch() {
    var root = document.querySelector('[data-header-search]');
    if (!root) return;

    var nav = root.closest('.v2-nav');
    /* Признак вешаем на шапку, а не на строку меню: на узких экранах гаснут
       логотип, город и бургер, а они лежат вне .v2-nav. */
    var header = root.closest('.v2-header');
    var field = root.querySelector('[data-search-field]');
    var output = root.querySelector('[data-search-output]');
    var expand = root.querySelector('[data-search-expand]');
    var collapse = root.querySelector('[data-search-collapse]');
    if (!field || !output) return;

    var index = Array.prototype.map.call(
      document.querySelectorAll('[data-search-index] [data-item]'),
      function (node) {
        return {
          title: node.dataset.title || '',
          path: node.dataset.path || '/',
          kind: node.dataset.kind || '',
          snippet: node.dataset.snippet || ''
        };
      }
    );

    var base = window.__notepubBaseURL || '';
    var active = -1;

    /* Поле вынуто из потока и прижато к правому краю своего контейнера,
       чтобы расти справа налево поверх пунктов меню. Контейнер стоит в
       середине строки, поэтому ширина считается как расстояние от левого
       края строки до правого края контейнера — иначе поле уезжает за
       строку и накрывает логотип. */
    function syncWidth() {
      if (!nav) return;
      var width = Math.round(root.getBoundingClientRect().right - nav.getBoundingClientRect().left);
      if (width > 0) root.style.setProperty('--v2-search-width', width + 'px');
    }

    function setOpen(open) {
      if (open) syncWidth();
      root.dataset.expanded = open ? 'true' : 'false';
      if (header) header.dataset.searchOpen = open ? 'true' : 'false';
      if (expand) expand.setAttribute('aria-expanded', String(open));
      if (open) {
        field.focus();
      } else {
        field.value = '';
        hideResults();
      }
    }

    window.addEventListener('resize', function () {
      if (root.dataset.expanded === 'true') syncWidth();
    });

    function hideResults() {
      output.hidden = true;
      output.innerHTML = '';
      field.setAttribute('aria-expanded', 'false');
      active = -1;
    }

    function render(items, query) {
      if (!items.length) {
        output.innerHTML = '<p class="v2-search__empty">Ничего не найдено. Попробуйте назвать вид отхода, услугу или город.</p>';
        output.hidden = false;
        field.setAttribute('aria-expanded', 'true');
        return;
      }

      output.innerHTML = '';
      items.forEach(function (item) {
        var hit = document.createElement('a');
        hit.className = 'v2-search__hit';
        hit.href = base + item.path;
        hit.setAttribute('role', 'option');
        hit.setAttribute('aria-selected', 'false');

        var kind = document.createElement('span');
        kind.className = 'v2-search__kind';
        kind.textContent = KIND_LABELS[item.kind] || 'Страница';
        hit.appendChild(kind);

        var title = document.createElement('strong');
        title.textContent = item.title;
        hit.appendChild(title);

        if (item.snippet) {
          var snippet = document.createElement('small');
          snippet.textContent = item.snippet;
          hit.appendChild(snippet);
        }
        output.appendChild(hit);
      });

      output.hidden = false;
      field.setAttribute('aria-expanded', 'true');
      active = -1;
    }

    function search() {
      var query = field.value.trim().toLowerCase();
      if (query.length < 2) { hideResults(); return; }

      /* Совпадение в заголовке важнее совпадения в описании: иначе
         страница, где слово встретилось вскользь, обгоняет профильную. */
      var found = index.map(function (item) {
        var inTitle = item.title.toLowerCase().indexOf(query);
        var inSnippet = item.snippet.toLowerCase().indexOf(query);
        if (inTitle === -1 && inSnippet === -1) return null;
        return { item: item, rank: inTitle !== -1 ? inTitle : 1000 + inSnippet };
      }).filter(Boolean).sort(function (a, b) {
        return a.rank - b.rank;
      }).slice(0, 8).map(function (entry) { return entry.item; });

      render(found, query);
    }

    function move(step) {
      var hits = output.querySelectorAll('.v2-search__hit');
      if (!hits.length) return;
      if (active >= 0) hits[active].setAttribute('aria-selected', 'false');
      active = (active + step + hits.length) % hits.length;
      hits[active].setAttribute('aria-selected', 'true');
      hits[active].scrollIntoView({ block: 'nearest' });
    }

    if (expand) expand.addEventListener('click', function () { setOpen(true); });
    if (collapse) collapse.addEventListener('click', function () { setOpen(false); });

    field.addEventListener('input', search);

    field.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { setOpen(false); if (expand) expand.focus(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); move(1); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); return; }
      if (event.key === 'Enter') {
        var hits = output.querySelectorAll('.v2-search__hit');
        if (active >= 0 && hits[active]) { event.preventDefault(); hits[active].click(); }
      }
    });

    document.addEventListener('click', function (event) {
      if (root.contains(event.target)) return;
      if (root.dataset.expanded === 'true' && !field.value) setOpen(false);
      else hideResults();
    });
  }

  /* Панели разделов в шапке. Наведение и фокус с клавиатуры обрабатывает
     CSS, скрипт добавляет то, что в CSS выразить нельзя: кнопку-переключатель
     для тач-устройств, закрытие по Escape и по клику вне меню.
     data-open="false" в разметке перекрывает :hover — см. порядок правил
     в v2.css, поэтому уходя с пункта состояние снимаем совсем. */
  function initNavMenus() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-nav-item]'));
    if (!items.length) return;

    function setState(item, open) {
      item.dataset.open = open ? 'true' : 'false';
      var toggle = item.querySelector('[data-nav-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', String(open));
    }

    function release(item) {
      delete item.dataset.open;
      var toggle = item.querySelector('[data-nav-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    items.forEach(function (item) {
      var toggle = item.querySelector('[data-nav-toggle]');
      if (toggle) {
        toggle.addEventListener('click', function () {
          var willOpen = item.dataset.open !== 'true';
          items.forEach(function (other) { if (other !== item) setState(other, false); });
          setState(item, willOpen);
        });
      }
      item.addEventListener('mouseleave', function () { release(item); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      items.forEach(function (item) {
        if (item.dataset.open !== 'true') return;
        setState(item, false);
        var toggle = item.querySelector('[data-nav-toggle]');
        if (toggle) toggle.focus();
      });
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-nav-item]')) return;
      items.forEach(function (item) { setState(item, false); });
    });
  }

  /* Свой дропдаун города. Нативный select остаётся источником состояния:
     через него город получают main.js, карта подразделений и форма. */
  function initCityDropdown() {
    var root = document.querySelector('[data-city-dropdown]');
    if (!root) return;

    var native = root.querySelector('[data-city-select]');
    var trigger = root.querySelector('[data-city-trigger]');
    var menu = root.querySelector('[data-city-menu]');
    var value = root.querySelector('[data-city-value]');
    var options = Array.prototype.slice.call(root.querySelectorAll('[data-city-option]'));
    if (!native || !trigger || !menu) return;

    function syncFromNative() {
      options.forEach(function (option) {
        var selected = option.dataset.cityOption === native.value;
        option.setAttribute('aria-selected', String(selected));
        if (selected && value) value.textContent = option.textContent;
      });
    }

    function setOpen(open) {
      menu.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        var current = root.querySelector('[data-city-option][aria-selected="true"]') || options[0];
        if (current) current.focus();
      }
    }

    function choose(city) {
      if (native.value !== city) {
        native.value = city;
        native.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncFromNative();
      setOpen(false);
      trigger.focus();
    }

    trigger.addEventListener('click', function () {
      setOpen(menu.hidden);
    });

    /* Город меняет не только этот список: его переключают подтверждение
       автоопределения и карта подразделений на главной — оба пишут значение
       в нативный select. Без этой синхронизации подпись в шапке оставалась
       бы на прежнем городе, хотя телефоны уже сменились. */
    native.addEventListener('change', syncFromNative);
    document.addEventListener('utilit:citychange', syncFromNative);

    menu.addEventListener('click', function (event) {
      var option = event.target.closest('[data-city-option]');
      if (option) choose(option.dataset.cityOption);
    });

    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        trigger.focus();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      event.preventDefault();
      if (menu.hidden) {
        setOpen(true);
        return;
      }
      var index = options.indexOf(document.activeElement);
      var step = event.key === 'ArrowDown' ? 1 : -1;
      var next = options[(index + step + options.length) % options.length];
      if (next) next.focus();
    });

    document.addEventListener('click', function (event) {
      if (!menu.hidden && !root.contains(event.target)) setOpen(false);
    });

    // Город может смениться извне — с карты подразделений или из localStorage
    native.addEventListener('change', syncFromNative);
    syncFromNative();
  }

  /* На странице подразделения город известен из контекста: подставляем его
     и в форму, и в шапку, но оставляем доступным для изменения. */
  function initCityPreset() {
    var form = document.querySelector('[data-v2-form]');
    var preset = form && form.dataset.cityPreset;
    if (!preset) return;

    var citySelect = document.querySelector('[data-city-select]');
    if (!citySelect) return;
    var known = Array.prototype.some.call(citySelect.options, function (option) {
      return option.value === preset;
    });
    if (!known || citySelect.value === preset) return;
    citySelect.value = preset;
    citySelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function init() {
    initCityFallback();
    initCityPreset();
    initCityDropdown();
    initNavMenus();
    initHeaderSearch();

    var form = document.querySelector('[data-v2-form]');
    if (!form) return;
    initDynamicFields(form);
    initFormGuard(form);
    initPhoneMask(form);
    initSubmit(form);
    initUnknownWasteShortcut(form);
    initAudienceShortcuts(form);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
