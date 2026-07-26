(function () {
  'use strict';

  function applyMapFixes() {
    var surgut = document.querySelector('.presence-city[data-city="surgut"]');
    var nyagan = document.querySelector('.presence-city[data-city="nyagan"]');
    var infoTitle = document.querySelector('.presence-info h3');

    if (surgut) {
      surgut.textContent = 'Сургут';
      surgut.style.setProperty('--x', 58);
      surgut.style.setProperty('--y', 20);
      surgut.style.zIndex = '5';
      surgut.style.pointerEvents = 'auto';
    }

    if (nyagan) {
      nyagan.style.setProperty('--x', 18);
      nyagan.style.setProperty('--y', 38);
      nyagan.style.zIndex = '4';
      nyagan.style.pointerEvents = 'auto';
    }

    if (infoTitle && infoTitle.textContent === 'Сургут и Белый Яр') {
      infoTitle.textContent = 'Сургут';
    }

    if (surgut) {
      surgut.addEventListener('click', function () {
        document.querySelectorAll('.presence-city').forEach(function (button) {
          button.classList.toggle('is-active', button === surgut);
        });

        var info = document.querySelector('.presence-info');
        if (!info) return;

        info.innerHTML = '';
        var label = document.createElement('span');
        label.className = 'viz-label';
        label.textContent = 'Подразделение';

        var title = document.createElement('h3');
        title.textContent = 'Сургут';

        var description = document.createElement('p');
        description.textContent = 'Выберите город на схеме, чтобы увидеть локальные контакты и доступные направления.';

        var meta = document.createElement('div');
        meta.className = 'presence-meta';
        meta.innerHTML = '<div><span>Телефон</span><strong>+7 3462 55-58-97</strong></div>' +
          '<div><span>Адрес</span><strong>Сургут</strong></div>';

        var services = document.createElement('div');
        services.className = 'presence-services';
        ['Медицинские отходы', 'Промышленные отходы', 'Транспортирование'].forEach(function (name) {
          var item = document.createElement('span');
          item.textContent = name;
          services.appendChild(item);
        });

        info.appendChild(label);
        info.appendChild(title);
        info.appendChild(description);
        info.appendChild(meta);
        info.appendChild(services);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyMapFixes);
  } else {
    applyMapFixes();
  }
})();