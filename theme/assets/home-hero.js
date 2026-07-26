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
    svg.innerHTML = '<defs><linearGradient id="hero-route-gradient" x1="65" y1="65" x2="435" y2="435" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5AAEE6" stop-opacity="0"/><stop offset="0.46" stop-color="#5AAEE6" stop-opacity="0.92"/><stop offset="1" stop-color="#5BC873" stop-opacity="1"/></linearGradient></defs><circle class="hero-route__arc" cx="250" cy="250" r="176"/>';
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