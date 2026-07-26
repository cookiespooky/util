(function () {
  'use strict';

  var steps = [
    { title: 'Определяем', text: 'Вид, класс, объём и требования.' },
    { title: 'Организуем', text: 'Тару, график, вывоз и транспортирование.' },
    { title: 'Обрабатываем', text: 'Обезвреживание, утилизация или уничтожение.' },
    { title: 'Подтверждаем', text: 'Акты и договорные документы.' }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeVisual() {
    var root = el('div', 'hero-route');
    root.setAttribute('aria-label', 'Полный маршрут обращения с отходами');

    var stage = el('div', 'hero-route__stage');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hero-route__svg');
    svg.setAttribute('viewBox', '0 0 500 500');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = [
      '<defs>',
      '<linearGradient id="hero-route-gradient" x1="72" y1="72" x2="428" y2="428" gradientUnits="userSpaceOnUse">',
      '<stop offset="0" stop-color="#5AAEE6" stop-opacity="0.18"/>',
      '<stop offset="0.46" stop-color="#5AAEE6" stop-opacity="0.96"/>',
      '<stop offset="1" stop-color="#5BC873" stop-opacity="1"/>',
      '</linearGradient>',
      '<marker id="hero-arrow-blue" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="strokeWidth"><path d="M1 1 10 6 1 11Z" fill="#5AAEE6"/></marker>',
      '<marker id="hero-arrow-teal" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="strokeWidth"><path d="M1 1 10 6 1 11Z" fill="#58B7A2"/></marker>',
      '<marker id="hero-arrow-green" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="strokeWidth"><path d="M1 1 10 6 1 11Z" fill="#5BC873"/></marker>',
      '</defs>',
      '<path class="hero-route__arrow" d="M250 70 A180 180 0 0 1 430 250" marker-end="url(#hero-arrow-blue)"/>',
      '<path class="hero-route__arrow" d="M430 250 A180 180 0 0 1 250 430" marker-end="url(#hero-arrow-teal)"/>',
      '<path class="hero-route__arrow" d="M250 430 A180 180 0 0 1 70 250" marker-end="url(#hero-arrow-green)"/>',
      '<path class="hero-route__arrow" d="M70 250 A180 180 0 0 1 250 70" marker-end="url(#hero-arrow-blue)"/>'
    ].join('');
    stage.appendChild(svg);

    var center = el('div', 'hero-route__center');
    var centerCopy = el('div');
    centerCopy.appendChild(el('strong', '', 'Один исполнитель на всём маршруте'));
    centerCopy.appendChild(el('span', '', 'от определения задачи до подтверждающих документов'));
    center.appendChild(centerCopy);
    stage.appendChild(center);

    steps.forEach(function (step, index) {
      var bubble = el('div', 'hero-route__bubble hero-route__bubble--' + (index + 1));
      bubble.appendChild(el('strong', '', step.title));
      bubble.appendChild(el('span', '', step.text));
      stage.appendChild(bubble);
    });

    root.appendChild(stage);
    return root;
  }

  function mount() {
    var prose = document.querySelector('.page-home .prose-home');
    if (!prose || prose.dataset.heroEnhanced === 'true') return;

    var heading = prose.querySelector(':scope > h1');
    var intro = heading && heading.nextElementSibling;
    var actions = intro && intro.nextElementSibling;
    if (!heading || !intro || !actions) return;

    var hero = el('section', 'home-hero');
    var copy = el('div', 'home-hero__copy');
    var actionWrap = el('div', 'home-hero__actions');

    copy.appendChild(heading);
    copy.appendChild(intro);
    Array.prototype.slice.call(actions.querySelectorAll('a')).forEach(function (link) {
      actionWrap.appendChild(link);
    });
    if (actionWrap.children.length) copy.appendChild(actionWrap);
    actions.remove();

    hero.appendChild(copy);
    hero.appendChild(makeVisual());
    prose.parentNode.insertBefore(hero, prose);
    prose.dataset.heroEnhanced = 'true';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();