(function () {
  'use strict';

  var drawer = document.querySelector('[data-mobile-drawer]');
  var openButton = document.querySelector('[data-drawer-open]');
  var closeButtons = document.querySelectorAll('[data-drawer-close]');

  function setDrawer(open) {
    if (!drawer || !openButton) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    openButton.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (openButton) openButton.addEventListener('click', function () { setDrawer(true); });
  closeButtons.forEach(function (button) {
    button.addEventListener('click', function () { setDrawer(false); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setDrawer(false);
  });

  var form = document.querySelector('.ds-form');
  var actions = form && form.querySelector('.ds-form-actions');
  if (form && actions && !form.querySelector('.ds-consent')) {
    var consent = document.createElement('label');
    consent.className = 'ds-consent';
    consent.innerHTML = '<input type="checkbox" name="privacy-consent" required>' +
      '<span class="ds-consent-copy">Я согласен на <a href="' +
      ((window.__notepubBaseURL || '').replace(/\/$/, '')) +
      '/privacy/">обработку персональных данных</a>. Согласие не отмечено заранее: пользователь принимает решение самостоятельно.</span>';
    actions.parentNode.insertBefore(consent, actions);
  }
})();