'use strict';
// Методички и учебный центр.
// Статья D.KB[id]: { t, icon, kid, text, pro, who:{pays,gets,manages}, up:[], down:[], norm, rec, ex:[], opts:[], see:[] }
// Уровни: 1 — только kid (+ простые «больше/меньше»), 2 — kid + text + примеры,
// 3 — text + кто платит + последствия + норма + рекомендации + примеры, 4 — всё + pro (формулы).
(function () {
const D = globalThis.D, U = D.ui, h = U.h;
D.KB = D.KB || {};
D.kbAdd = obj => Object.assign(D.KB, obj);

// Если статьи нет — собираем из справочников, чтобы кнопка ⓘ никогда не была пустой.
function fallback(id) {
  const [kind, key] = id.split('.');
  if (kind === 'tax' && D.TAX[key]) return { t: D.TAX[key].name, icon: D.TAX[key].icon, text: 'Подробная методичка по этому налогу готовится.' };
  if (kind === 'spend' && D.SP[key]) return { t: D.SP[key].name, icon: D.SP[key].icon, text: 'Подробная методичка по этой статье расходов готовится.' };
  if (kind === 'law' && D.LAW[key]) return { t: D.LAW[key].name, icon: D.LAW[key].icon, text: 'Варианты закона: ' + D.LAW[key].opts.map(o => o.label).join(' / ') + '.' };
  return { t: 'Методичка', text: 'Статья готовится.' };
}
D.kb = id => D.KB[id] || fallback(id);

function para(text) {
  if (!text) return null;
  const arr = Array.isArray(text) ? text : String(text).split('\n\n');
  return arr.map(t => h('p', { html: linkify(t) }));
}
// [[id|текст]] → ссылка на другую методичку.
function linkify(t) {
  return t.replace(/\[\[([\w.]+)\|([^\]]+)\]\]/g, (m, id, label) => `<span class="kblink" data-kb="${id}">${label}</span>`);
}
function wireLinks(root) {
  root.querySelectorAll('.kblink').forEach(el => el.addEventListener('click', () => U.openKB(el.dataset.kb)));
}

U.kbBody = function (id, lvl, extra) {
  const k = D.kb(id);
  const box = h('div.kb');
  const L = lvl;
  if (L <= 2 && k.kid) box.appendChild(h('div.kid', { html: '👶 ' + linkify(k.kid) }));
  if (L >= 2) { const p = para(L === 2 && k.school ? k.school : k.text); if (p) box.append(...p); }
  if (L === 1 && !k.kid && k.text) box.append(...para(k.text.split('\n\n')[0]));
  if (extra) box.appendChild(extra);
  if (L >= 3 && k.who) {
    box.appendChild(h('h4', 'Кто платит и кто распоряжается'));
    const g = h('div.who');
    if (k.who.pays) g.append(h('b', 'Платит:'), h('span', k.who.pays));
    if (k.who.base) g.append(h('b', 'С чего:'), h('span', k.who.base));
    if (k.who.gets) g.append(h('b', 'Получает:'), h('span', k.who.gets));
    if (k.who.spends) g.append(h('b', 'Идёт на:'), h('span', k.who.spends));
    if (k.who.manages) g.append(h('b', 'Распоряжается:'), h('span', k.who.manages));
    box.appendChild(g);
  }
  if (k.opts && L >= 2) {
    box.appendChild(h('h4', 'Варианты'));
    box.appendChild(h('ul', k.opts.map(o => h('li', { html: linkify(o) }))));
  }
  if (k.up && k.up.length) { box.appendChild(h('h4', L <= 1 ? 'Если сделать больше' : 'Если повысить / усилить')); box.appendChild(h('ul.up', k.up.map(x => h('li', { html: linkify(x) })))); }
  if (k.down && k.down.length) { box.appendChild(h('h4', L <= 1 ? 'Если сделать меньше' : 'Если понизить / ослабить')); box.appendChild(h('ul.down', k.down.map(x => h('li', { html: linkify(x) })))); }
  if (L >= 3 && k.norm) { box.appendChild(h('h4', 'Норма в мире')); box.append(...para(k.norm)); }
  if (L >= 3 && k.rec) { box.appendChild(h('h4', 'Рекомендации')); box.append(...para(k.rec)); }
  if (L >= 2 && k.ex && k.ex.length) {
    box.appendChild(h('h4', 'Примеры из жизни'));
    for (const x of (L === 2 ? k.ex.slice(0, 2) : k.ex)) box.appendChild(h('div.ex', { html: linkify(x) }));
  }
  if (L >= 4 && k.pro) { box.appendChild(h('h4', 'Для экономиста: формулы и теория')); box.appendChild(h('div.pro', k.pro)); }
  if (L < 4 && k.pro) box.appendChild(h('p.small.dim.mt', 'Формулы и теория — на уровне «Экономист».'));
  if (k.see && k.see.length) {
    box.appendChild(h('h4', 'Связанные темы'));
    box.appendChild(h('div.row.wrap', k.see.map(sid => h('button.chip', { onclick: () => U.openKB(sid) }, (D.kb(sid).icon || '📘') + ' ' + D.kb(sid).t))));
  }
  wireLinks(box);
  return box;
};

U.levelBar = function (onChange) {
  const bar = h('div.levelbar');
  const render = () => {
    U.clear(bar);
    for (const l of U.LEVELS) bar.appendChild(h('button' + (U.settings.level === l.v ? '.on' : ''), { onclick: () => { U.settings.level = l.v; U.saveSettings(); render(); onChange(); } }, l.name));
  };
  render();
  return bar;
};

U.openKB = function (id, extra) {
  const k = D.kb(id);
  const m = U.modal({ title: k.t, icon: k.icon || '📘' });
  const render = () => m.set(h('div', U.levelBar(render), U.kbBody(id, U.settings.level, typeof extra === 'function' ? extra() : extra)));
  render();
  return m;
};

// ---------- учебный центр ----------
U.openLearn = function (tab) {
  const m = U.modal({ title: 'Учебник экономики', icon: '📚', full: true });
  let cur = tab || 'genesis';
  const render = () => {
    const tabs = U.tabs([
      { id: 'genesis', name: 'Как рождается страна', icon: '🌱' },
      { id: 'start', name: 'С чего начать', icon: '🧭' },
      { id: 'cards', name: 'Карточки проблем', icon: '🃏' },
      { id: 'ideo', name: 'Идеологии и строи', icon: '⚖️' },
      { id: 'schools', name: 'Экономические школы', icon: '🎓' },
      { id: 'crises', name: 'Кризисы', icon: '🌪️' },
      { id: 'gloss', name: 'Словарь', icon: '🔤' },
    ], cur, id => { cur = id; render(); });
    let body;
    if (cur === 'genesis') body = genesisView();
    else if (cur === 'start') body = articleList(D.START_GUIDE || []);
    else if (cur === 'cards') body = cardsView();
    else if (cur === 'ideo') body = kbList(Object.keys(D.KB).filter(k => /^(ideo|regime|system)\./.test(k)));
    else if (cur === 'schools') body = kbList(Object.keys(D.KB).filter(k => /^(school|adv)\./.test(k)));
    else if (cur === 'crises') body = kbList(Object.keys(D.KB).filter(k => /^crisis\./.test(k)));
    else body = glossary();
    m.set(h('div', tabs, h('div', { style: 'margin-top:10px' }, body)));
  };
  render();
};

function kbList(ids) {
  return h('div', ids.map(id => {
    const k = D.KB[id];
    return h('button.list-item', { style: 'width:100%;text-align:left', onclick: () => U.openKB(id) },
      h('span.ic', k.icon || '📘'), h('div.grow', h('b', k.t), k.kid ? h('div.small.dim', { html: k.kid.replace(/\[\[[\w.]+\|([^\]]+)\]\]/g, '$1') }) : null), h('span.dim', '›'));
  }));
}
function articleList(items) {
  return h('div', items.map(a => h('div.card', h('h3', a.icon + ' ' + a.t), ...para(a.text).map(p => { wireLinks(p); return p; }))));
}

function genesisView() {
  const ch = D.GENESIS || [];
  let i = U.settings.genesisPage || 0;
  const box = h('div');
  const render = () => {
    const c = ch[i]; if (!c) return;
    U.clear(box);
    box.appendChild(h('div.progress-dots', ch.map((_, k) => h('i' + (k === i ? '.on' : '')))));
    const body = h('div.chapter', h('div.big-ic', c.icon), h('h2', { style: 'text-align:center;margin-bottom:10px' }, `Глава ${i + 1}. ${c.t}`), ...para(c.text));
    if (c.fact) body.appendChild(h('div.note', { html: '💡 ' + linkify(c.fact) }));
    if (c.ex) body.appendChild(h('div.kb', h('div.ex', { html: linkify(c.ex) })));
    if (c.game) body.appendChild(h('div.note.good.mt', { html: '🎮 В игре: ' + linkify(c.game) }));
    wireLinks(body);
    box.appendChild(body);
    box.appendChild(h('div.row.mt2', h('button.btn.grow', { disabled: i === 0 || null, onclick: () => { i--; U.settings.genesisPage = i; U.saveSettings(); render(); box.scrollIntoView(); } }, '‹ Назад'),
      h('button.btn.primary.grow', { disabled: i === ch.length - 1 || null, onclick: () => { i++; U.settings.genesisPage = i; U.saveSettings(); render(); box.parentNode.parentNode.scrollTop = 0; } }, 'Дальше ›')));
  };
  render();
  return box;
}

function cardsView() {
  const cards = D.CARDS || [];
  return h('div', h('p.dim.small', 'Типичные болезни экономики: симптомы, причины, лекарства и их цена, реальные истории. Нажмите на карточку.'),
    cards.map(c => h('button.card', { style: 'width:100%;text-align:left;display:block', onclick: () => U.openCard(c.id) },
      h('div.row', h('span', { style: 'font-size:28px' }, c.icon), h('div.grow', h('b', c.t), h('div.small.dim', c.symptoms[0])), h('span.dim', '›')))));
}
U.openCard = function (id) {
  const c = (D.CARDS || []).find(x => x.id === id);
  if (!c) return U.openKB(id);
  const body = h('div.kb',
    h('div.kid', { html: '👶 ' + c.kid }),
    h('h4', 'Симптомы'), h('ul', c.symptoms.map(x => h('li', x))),
    h('h4', 'Почему так бывает'), h('ul', c.causes.map(x => h('li', { html: linkify(x) }))),
    h('h4', 'Как лечат — и чем за это платят'),
    ...c.cures.map(x => h('div.card.tight', h('b.gold', x.name), h('div.small', x.how), h('div.small.bad', '⚠ Цена: ' + x.cost))),
    h('h4', 'Реальные истории'), ...c.cases.map(x => h('div.ex', { html: linkify(x) })),
    h('h4', 'Что делать в игре'), h('div.note.good', { html: linkify(c.game) }));
  wireLinks(body);
  U.modal({ title: c.t, icon: c.icon, body });
};

function glossary() {
  const inp = h('input', { type: 'text', placeholder: 'Поиск: инфляция, НДС, Джини…' });
  const list = h('div');
  const ids = Object.keys(D.KB).filter(k => !/^(genesis|start)\./.test(k)).sort((a, b) => D.KB[a].t.localeCompare(D.KB[b].t, 'ru'));
  const render = () => {
    const q = inp.value.trim().toLowerCase();
    U.clear(list);
    const hits = ids.filter(id => !q || D.KB[id].t.toLowerCase().includes(q) || (D.KB[id].text || '').toLowerCase().includes(q)).slice(0, 120);
    list.appendChild(kbList(hits));
    if (!hits.length) list.appendChild(h('p.dim', 'Ничего не найдено.'));
  };
  inp.addEventListener('input', render);
  render();
  return h('div', inp, h('div.mt', list));
}
})();
