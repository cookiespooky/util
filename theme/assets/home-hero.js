(function () {
  'use strict';

  var steps = [
    { title: 'Определяем', text: 'Вид, класс, объём и требования.' },
    { title: 'Организуем', text: 'Тару, график, вывоз и транспортирование.' },
    { title: 'Обрабатываем', text: 'Обезвреживание, утилизация или уничтожение.' },
    { title: 'Подтверждаем', text: 'Акты и предусмотренные договором документы.' }
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

    var inputs = el('div', 'hero-route__inputs');
    ['класс', 'объём', 'тара', 'вывоз', 'сроки', 'документы'].forEach(function (label) {
      inputs.appendChild(el('span', 'hero-route__input', label));
    });
    root.appendChild(inputs);
    root.appendChild(el('span', 'hero-route__feed'));

    var stage = el('div', 'hero-route__stage');
    var ring = el('div', 'hero-route__ring');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hero-route__svg');
    svg.setAttribute('viewBox', '0 0 500 500');
    svg.setAttribute('aria-hidden', 'true');
    var paths = [
      ['M250 54 A196 196 0 0 1 446 250', false],
      ['M446 250 A196 196 0 0 1 250 446', false],
      ['M250 446 A196 196 0 0 1 54 250', true],
      ['M54 250 A196 196 0 0 1 250 54', true]
    ];
    paths.forEach(function (item) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', item[0]);
      path.setAttribute('class', 'hero-route__arc' + (item[1] ? ' hero-route__arc--green' : ''));
      svg.appendChild(path);
    });
    stage.appendChild(ring);
    stage.appendChild(svg);

    var center = el('div', 'hero-route__center');
    var centerCopy = el('div');
    centerCopy.appendChild(el('strong', '', 'Один исполнитель на всём маршруте'));
    centerCopy.appendChild(el('span', '', 'от определения задачи до подтверждающих документов'));
    center.appendChild(centerCopy);
    stage.appendChild(center);

    var detail = el('div', 'hero-route__detail');
    detail.innerHTML = '<strong>' + steps[0].title + '.</strong> ' + steps[0].text;

    function activate(index) {
      stage.querySelectorAll('.hero-route__node').forEach(function (button, i) {
        button.classList.toggle('is-active', i === index);
        button.setAttribute('aria-pressed', i === index ? 'true' : 'false');
      });
      detail.innerHTML = '<strong>' + steps[index].title + '.</strong> ' + steps[index].text;
    }

    steps.forEach(function (step, index) {
      var button = el('button', 'hero-route__node hero-route__node--' + (index + 1), step.title);
      button.type = 'button';
      button.setAttribute('aria-label', step.title + '. ' + step.text);
      button.addEventListener('mouseenter', function () { activate(index); });
      button.addEventListener('focus', function () { activate(index); });
      button.addEventListener('click', function () { activate(index); });
      stage.appendChild(button);
    });

    root.appendChild(stage);
    [
      ['medical', 'Медицинские'],
      ['industrial', 'Промышленные'],
      ['food', 'Пищевые']
    ].forEach(function (item) {
      root.appendChild(el('span', 'hero-route__satellite hero-route__satellite--' + item[0], item[1]));
    });
    root.appendChild(el('div', 'hero-route__result', 'Задача закрыта'));
    root.appendChild(detail);
    activate(0);
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