(function () {
  'use strict';

  var root = document.documentElement;
  var base = (root.getAttribute('data-base-url') || '').replace(/\/$/, '');

  var menuButton = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-main-nav]');
  if (menuButton && menu) {
    menuButton.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }

  /* Контакты подразделений приходят разметкой из [data-city-index]: шапка
     собирает её из frontmatter страниц городов. Своей копии телефонов и почт
     здесь нет намеренно — иначе она разъезжается с сайтом молча. */
  var cityContacts = {};
  var cityOrder = [];

  Array.prototype.forEach.call(
    document.querySelectorAll('[data-city-index] [data-item]'),
    function (node) {
      var key = node.dataset.city;
      if (!key) return;
      cityContacts[key] = {
        phone: node.dataset.phone || '',
        phoneLink: node.dataset.phoneLink || '',
        /* Второй номер есть не у всех подразделений: где его нет, элемент
           в шапке прячется, а не показывает номер соседнего города. */
        phone2: node.dataset.phone2 || '',
        phone2Link: node.dataset.phone2Link || '',
        email: node.dataset.email || '',
        title: node.dataset.title || ''
      };
      cityOrder.push(key);
    }
  );

  /* Город по умолчанию — первый в коллекции, а не зашитый «Сургут»:
     порядок задаётся полем nav_order на страницах подразделений. */
  var defaultCity = cityOrder[0] || '';

  var citySelect = document.querySelector('[data-city-select]');

  function applyCity(city) {
    var contact = cityContacts[city] || cityContacts[defaultCity];
    if (!contact) return;
    localStorage.setItem('utilit-city', city);
    root.setAttribute('data-selected-city', city);

    if (citySelect && citySelect.value !== city) citySelect.value = city;

    document.querySelectorAll('[data-city-phone]').forEach(function (link) {
      link.textContent = contact.phone;
      link.href = 'tel:' + contact.phoneLink;
    });

    document.querySelectorAll('[data-city-phone-2]').forEach(function (link) {
      if (contact.phone2) {
        link.textContent = contact.phone2;
        link.href = 'tel:' + contact.phone2Link;
        link.hidden = false;
      } else {
        link.textContent = '';
        link.removeAttribute('href');
        link.hidden = true;
      }
    });

    document.querySelectorAll('[data-city-email]').forEach(function (link) {
      link.textContent = contact.email;
      link.href = 'mailto:' + contact.email;
    });

    document.querySelectorAll('[data-request-city]').forEach(function (select) {
      var hasOption = Array.prototype.some.call(select.options || [], function (option) {
        return option.value === city;
      });
      if (hasOption) select.value = city;
    });

    document.dispatchEvent(new CustomEvent('utilit:citychange', { detail: { city: city } }));
  }

  if (citySelect) {
    var savedCity = localStorage.getItem('utilit-city');
    var initialCity = cityContacts[savedCity] ? savedCity : citySelect.value || defaultCity;
    applyCity(initialCity);
    citySelect.addEventListener('change', function () {
      applyCity(citySelect.value);
    });

    /* Автоопределение города спрашиваем только при первом визите: свой выбор
       посетителя переопределять нельзя. Страницы остаются статикой — сервер
       отдаёт один ключ города, подстановку делает applyCity.

       Ошибки глушим намеренно: без бэкенда (например, на статичном превью)
       эндпоинта нет, и сайт должен просто остаться на городе по умолчанию. */
    if (!cityContacts[savedCity] && typeof fetch === 'function') {
      var base = window.__notepubBaseURL || '';
      fetch(base + '/api/city.php', { headers: { Accept: 'application/json' } })
        .then(function (response) {
          return response.ok ? response.json() : null;
        })
        .then(function (data) {
          if (!data || !data.city || !cityContacts[data.city]) return;
          // За время запроса посетитель мог выбрать город сам — не мешаем.
          if (localStorage.getItem('utilit-city') !== initialCity) return;
          applyCity(data.city);
        })
        .catch(function () { /* эндпоинта нет — остаёмся на умолчании */ });
    }
  }

  var modal = document.querySelector('[data-search-modal]');
  var openButtons = document.querySelectorAll('[data-search-open]');
  var closeButtons = document.querySelectorAll('[data-search-close]');
  var input = document.querySelector('[data-search-input]');
  var results = document.querySelector('[data-search-results]');

  function openSearch() {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { if (input) input.focus(); }, 30);
  }

  function closeSearch() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openButtons.forEach(function (button) { button.addEventListener('click', openSearch); });
  closeButtons.forEach(function (button) { button.addEventListener('click', closeSearch); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeSearch();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    }
  });

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function renderResults(items) {
    if (!results) return;
    if (!items.length) {
      results.innerHTML = '<p class="muted">Ничего не найдено. Попробуйте назвать вид отхода или город.</p>';
      return;
    }
    results.innerHTML = '<ul>' + items.map(function (item) {
      var path = item.path || '/';
      if (path.charAt(0) === '/') path = base + path;
      return '<li><a href="' + escapeHTML(path) + '">' + escapeHTML(item.title) + '</a>' +
        (item.snippet ? '<p>' + escapeHTML(item.snippet) + '</p>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  if (input) {
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var query = input.value.trim().toLowerCase();
      if (query.length < 2) {
        if (results) results.innerHTML = '<p class="muted">Введите минимум два символа.</p>';
        return;
      }
      timer = setTimeout(function () {
        fetch(base + '/search.json')
          .then(function (response) {
            if (!response.ok) throw new Error('search');
            return response.json();
          })
          .then(function (data) {
            var items = (data.items || []).filter(function (item) {
              return ((item.title || '') + ' ' + (item.snippet || '')).toLowerCase().indexOf(query) !== -1;
            }).slice(0, 12);
            renderResults(items);
          })
          .catch(function () {
            if (results) results.innerHTML = '<p class="muted">Поиск временно недоступен. Откройте каталог услуг.</p>';
          });
      }, 160);
    });
  }

  var ctaRoutes = {
    'рассчитать стоимость': '/contacts/#request',
    'получить расчёт': '/contacts/#request',
    'оставить заявку': '/contacts/#request',
    'отправить заявку': '/contacts/#request',
    'отправить': '/contacts/#request',
    'задать вопрос': '/contacts/#request',
    'задать вопрос специалисту': '/contacts/#request',
    'не знаю, какая услуга нужна': '/contacts/#request',
    'все услуги': '/services/',
    'посмотреть лицензии': '/licenses/',
    'посмотреть документы': '/licenses/',
    'о компании': '/about/',
    'запросить документы': '/licenses/#document-request',
    'на главную': '/',
    'контакты': '/contacts/'
  };

  document.querySelectorAll('[data-prose] p').forEach(function (paragraph) {
    var plain = paragraph.textContent.trim();
    if (/^\[(УТОЧНИТЬ|ЗАГЛУШКА|ТЕЛЕФОН|EMAIL|АДРЕС|ГРАФИК|СПИСОК|НОМЕР|ФАЙЛ|КОЛИЧЕСТВО|АКТУАЛЬНЫЙ|ЮРИДИЧЕСКИЙ|ПОДТВЕРДИТЬ|ПОЛЕ|РЕЗУЛЬТАТЫ|ЛОГОТИПЫ|ПОДТВЕРЖДЁННЫЙ)/i.test(plain)) {
      paragraph.classList.add('placeholder');
    }
    var matches = plain.match(/\[[^\]]+\]/g);
    if (matches && matches.join(' ') === plain) {
      var row = document.createElement('div');
      row.className = 'cta-row';
      matches.forEach(function (token, index) {
        var label = token.slice(1, -1);
        var route = ctaRoutes[label.toLowerCase()] || '/contacts/#request';
        var link = document.createElement('a');
        link.className = 'button' + (index ? ' secondary' : '');
        link.href = base + route;
        link.textContent = label;
        row.appendChild(link);
      });
      paragraph.replaceWith(row);
    }
  });
})();