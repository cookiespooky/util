/* home-v3 — выноски на картинке hero (черновик новой главной).
   Линия идёт из середины ближайшей к точке стороны карточки прямо к точке.
   Её длина зависит от ширины карточки, поэтому считается здесь, а не в CSS.
   Появление запускается один раз, когда картинка попала в кадр. */
(function () {
  var scene = document.querySelector('[data-h3-scene]');
  if (!scene) return;

  function draw() {
    var box = scene.getBoundingClientRect();
    scene.querySelectorAll('.h3-scene__leaders path').forEach(function (path) {
      var n = path.getAttribute('data-n');
      var card = scene.querySelector('.h3-callout[data-n="' + n + '"]').getBoundingClientRect();
      var pin = scene.querySelector('.h3-scene__pin[data-n="' + n + '"]').getBoundingClientRect();
      var px = pin.left + pin.width / 2 - box.left;
      var py = pin.top + pin.height / 2 - box.top;
      var l = card.left - box.left, r = card.right - box.left;
      var t = card.top - box.top, b = card.bottom - box.top;
      var sides = [[r, (t + b) / 2], [l, (t + b) / 2], [(l + r) / 2, t], [(l + r) / 2, b]];
      var best = sides[0];
      sides.forEach(function (s) {
        if (Math.hypot(s[0] - px, s[1] - py) < Math.hypot(best[0] - px, best[1] - py)) best = s;
      });
      path.setAttribute('d', 'M' + best[0] + ' ' + best[1] + ' L' + px + ' ' + py);
      path.style.setProperty('--len', Math.hypot(px - best[0], py - best[1]) + 1);
    });
  }

  // Карточки и точки в CSS видны сразу; скрываем их для анимации только
  // когда скрипт точно запустился.
  scene.setAttribute('data-h3-ready', '');
  draw();
  window.addEventListener('resize', draw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

  if (!('IntersectionObserver' in window)) { scene.classList.add('is-in'); return; }
  var io = new IntersectionObserver(function (entries) {
    if (entries.some(function (e) { return e.isIntersecting; })) {
      scene.classList.add('is-in');
      io.disconnect();
    }
  }, { threshold: 0.35 });
  io.observe(scene);
})();
