(function () {
  'use strict';

  function applyMapFixes() {
    var surgut = document.querySelector('.presence-city[data-city="surgut"]');
    var nyagan = document.querySelector('.presence-city[data-city="nyagan"]');
    var infoTitle = document.querySelector('.presence-info h3');

    if (surgut) {
      surgut.textContent = 'Сургут';
      surgut.style.setProperty('--x', 54);
      surgut.style.setProperty('--y', 22);
      surgut.addEventListener('click', function () {
        requestAnimationFrame(function () {
          var title = document.querySelector('.presence-info h3');
          if (title) title.textContent = 'Сургут';
        });
      });
    }

    if (nyagan) {
      nyagan.style.setProperty('--x', 21);
      nyagan.style.setProperty('--y', 34);
    }

    if (infoTitle && infoTitle.textContent === 'Сургут и Белый Яр') {
      infoTitle.textContent = 'Сургут';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyMapFixes);
  } else {
    applyMapFixes();
  }
})();