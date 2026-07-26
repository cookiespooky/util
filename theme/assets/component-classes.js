(function () {
  'use strict';

  var mappings = [
    ['.ds-service-card, .waste-cycle-card, .presence-info, .matrix-result, .ds-state', ['ui-card']],
    ['.ds-service-card:not(.ds-blue):not(.ds-green), .waste-cycle-card, .presence-info, .matrix-result, .ds-neutral', ['ui-card--muted']],
    ['.ds-label, .viz-label, .ds-index, .ds-kicker', ['ui-label']],
    ['.ds-service-card h3, .waste-cycle-card h3, .presence-info h3, .matrix-result h3', ['ui-title']],
    ['.ds-service-card p, .waste-cycle-card p, .presence-info p, .matrix-result p', ['ui-copy']],
    ['.ds-button, .matrix-option', ['ui-button']],
    ['.ds-button-primary', ['ui-button--primary']],
    ['.ds-button-secondary, .matrix-option', ['ui-button--secondary']],
    ['.ds-form input, .ds-form select, .ds-form textarea, .city-control select', ['ui-control']],
    ['.ds-component-row, .matrix-options, .presence-services, .matrix-requirements', ['ui-cluster']],
    ['.ds-form-grid, .service-matrix, .waste-timeline', ['ui-stack']],
    ['.viz-shell, .ds-form, .ds-tab-panel', ['ui-surface']]
  ];

  function applyClasses() {
    mappings.forEach(function (mapping) {
      document.querySelectorAll(mapping[0]).forEach(function (element) {
        mapping[1].forEach(function (className) { element.classList.add(className); });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyClasses();
      requestAnimationFrame(applyClasses);
    });
  } else {
    applyClasses();
    requestAnimationFrame(applyClasses);
  }
})();