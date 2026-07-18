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

  var citySelect = document.querySelector('[data-city-select]');
  if (citySelect) {
    var savedCity = localStorage.getItem('utilit-city');
    if (savedCity) citySelect.value = savedCity;
    citySelect.addEventListener('change', function () {
      localStorage.setItem('utilit-city', citySelect.value);
      var routes = { surgut: 'surgut', tyumen: 'tyumen', novosibirsk: 'novosibirsk', nyagan: 'nyagan' };
      if (routes[citySelect.value]) window.location.href = base + '/' + routes[citySelect.value] + '/';
    });
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
      event.preventDefault(); openSearch();
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
          .then(function (response) { if (!response.ok) throw new Error('search'); return response.json(); })
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
    'запросить документы': '/contacts/#request',
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

  var contactHeading = Array.from(document.querySelectorAll('[data-prose] h2')).find(function (heading) {
    return /форма|заявк|расч[её]т/i.test(heading.textContent);
  });
  if (contactHeading && /contacts\/?$/.test(window.location.pathname.replace(/\/$/, ''))) {
    contactHeading.id = 'request';
    var panel = document.createElement('section');
    panel.className = 'request-panel';
    panel.innerHTML = '<h2>Связаться с компанией</h2><p>На этапе текстового прототипа заявки принимаются по общим контактам. После подключения обработчика форма будет отправлять данные без открытия почтового клиента.</p><p><a href="tel:+73462555897">+7 3462 55-58-97</a><br><a href="mailto:555897sur@bk.ru?subject=Заявка%20с%20сайта%20Утилитсервис">555897sur@bk.ru</a></p>';
    contactHeading.parentNode.insertBefore(panel, contactHeading.nextSibling);
  }
})();
