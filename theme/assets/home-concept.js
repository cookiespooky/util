(function () {
  'use strict';

  function initSubmitPreview() {
    var form = document.querySelector('.task-form');
    if (!form) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      if (!button) return;
      var original = button.textContent;
      button.textContent = 'Задача принята локально';
      window.setTimeout(function () {
        button.textContent = original;
      }, 2200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSubmitPreview();
    });
  } else {
    initSubmitPreview();
  }
})();
