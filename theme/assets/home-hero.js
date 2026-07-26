(function () {
  'use strict';

  var steps = [
    {
      title: 'Определяем',
      text: 'Вид, класс, объём и требования.',
      icon: '<path d="M10.5 3.5a7 7 0 1 0 4.95 11.95L20 20"/><circle cx="10.5" cy="10.5" r="2.5"/>'
    },
    {
      title: 'Организуем',
      text: 'Тару, график, вывоз и транспортирование.',
      icon: '<path d="M4 7h10v9H4z"/><path d="M14 10h3l3 3v3h-6z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'
    },
    {
      title: 'Обрабатываем',
      text: 'Обезвреживание, утилизация или уничтожение.',
      icon: '<path d="M12 3v4M12 17v4M4.2 6.2l2.8 2.8M17 15l2.8 2.8M3 12h4M17 12h4M4.2 17.8 7 15M17 9l2.8-2.8"/><circle cx="12" cy="12" r="4"/>'
    },
    {
      title: 'Подтверждаем',
      text: 'Акты и предусмотренные договором документы.',
      icon: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12l2 2 4-4"/>'
    }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeIcon(markup) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = markup;
    return svg;
  }

  function makeVisual() {
    var root = el('div', 'hero-route');
    root.setAttribute('aria-label', 'Полный маршрут обращения с отходами');

    var stage = el('div', 'hero-route__stage');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hero-route__svg');
    svg.setAttribute('viewBox', '0 0 500 500');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<defs><linearGradient id="hero-route-gradient" x1="60" y1="60" x2="440" y2="440" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5AAEE6" stop-opacity="0"/><stop offset="0.42" stop-color="#5AAEE6" stop-opacity="0.9"/><stop offset="1" stop-color="#5BC873" stop-opacity="1"/></linearGradient></defs><circle class="hero-route__arc" cx="250" cy="250" r="190"/>';
    stage.appendChild(svg);

    var center = el('div', 'hero-route__center');
    var centerCopy = el('div');
    centerCopy.appendChild(el('strong', '', 'Один исполнитель на всём маршруте'));
    centerCopy.appendChild(el('span', '', 'от определения задачи до подтверждающих документов'));
    center.appendChild(centerCopy);
    stage.appendChild(center);

    steps.forEach(function (step, index) {
      var item = el('div', 'hero-route__item hero-route__item--' + (index + 1));
      var node = el('div', 'hero-route__node');
      node.appendChild(makeIcon(step.icon));
      var bubble = el('div', 'hero-route__bubble');
      bubble.appendChild(el('strong', '', step.title));
      bubble.appendChild(el('span', '', step.text));
      item.appendChild(node);
      item.appendChild(bubble);
      stage.appendChild(item);
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