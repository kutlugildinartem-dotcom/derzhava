'use strict';
// Базовые элементы интерфейса: конструктор DOM, модальные окна, слайдеры, переключатели.
(function () {
const D = globalThis.D;
const U = D.ui = D.ui || {};

// h('div.card', {onclick}, 'текст', child, [children]) — компактная сборка DOM.
U.h = function (sel, attrs, ...kids) {
  let tag = 'div', cls = [], id = null;
  sel.replace(/([.#]?)([\w-]+)/g, (m, p, name) => { if (p === '.') cls.push(name); else if (p === '#') id = name; else tag = name; return ''; });
  const el = document.createElement(tag);
  if (cls.length) el.className = cls.join(' ');
  if (id) el.id = id;
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = c => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
};
const h = U.h;
U.$ = sel => document.querySelector(sel);
U.clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

// ---------- настройки ----------
U.settings = { level: 2, haptics: true, turn: 3 };
try { Object.assign(U.settings, JSON.parse(localStorage.getItem('dz.settings') || '{}')); } catch (e) { /* пусто */ }
U.saveSettings = () => { try { localStorage.setItem('dz.settings', JSON.stringify(U.settings)); } catch (e) { /* пусто */ } };
U.LEVELS = [
  { v: 1, name: 'Малыш', desc: 'Как для первоклассника: сравнения с жизнью, без терминов.' },
  { v: 2, name: 'Школьник', desc: 'Простые объяснения с примерами и базовыми понятиями.' },
  { v: 3, name: 'Студент', desc: 'Подробно: кто платит, на что влияет, нормы, рекомендации, случаи из истории.' },
  { v: 4, name: 'Экономист', desc: 'Всё выше + формулы, модели и теория как в университете.' },
];

U.vibrate = ms => {
  if (!U.settings.haptics) return;
  try { if (window.DZAndroid) window.DZAndroid.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* пусто */ }
};

U.toast = function (text, ms = 2400) {
  const t = h('div.toast', text);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
};

// ---------- модальные окна (стек) ----------
U.stack = [];
U.modal = function (o) {
  const body = h('div.sheet-body');
  const head = h('div.sheet-head', o.icon ? h('span', { style: 'font-size:22px' }, o.icon) : null, h('h2', o.title || ''),
    o.headExtra || null, h('button.iconbtn', { onclick: () => m.close(), 'aria-label': 'Закрыть' }, '✕'));
  const sheet = h('div.sheet' + (o.full ? '.full' : ''), head, body);
  const foot = h('div.sheet-foot');
  if (o.foot && o.foot.length) {
    for (const b of o.foot) foot.appendChild(h('button.btn' + (b.cls ? '.' + b.cls : ''), { onclick: () => { if (b.onclick) b.onclick(m); if (b.close !== false) m.close(); } }, b.label));
    sheet.appendChild(foot);
  }
  const ov = h('div.overlay', sheet);
  ov.addEventListener('click', e => { if (e.target === ov && !o.sticky) m.close(); });
  const m = {
    el: ov, body, head, foot, closed: false,
    close() {
      if (m.closed) return; m.closed = true;
      ov.remove();
      const i = U.stack.indexOf(m); if (i >= 0) U.stack.splice(i, 1);
      if (o.onClose) o.onClose();
    },
    set(content) { U.clear(body); body.appendChild(typeof content === 'function' ? content(m) : content); },
  };
  if (o.body) m.set(o.body);
  document.body.appendChild(ov);
  U.stack.push(m);
  return m;
};
U.confirm = function (o) {
  return new Promise(res => {
    U.modal({
      title: o.title, icon: o.icon, sticky: true,
      body: h('div', o.node || null, o.text ? h('p', o.text) : null),
      foot: [{ label: o.cancel || 'Отмена', onclick: () => res(false) }, { label: o.ok || 'Да', cls: o.danger ? 'bad' : 'primary', onclick: () => res(true) }],
      onClose: () => res(false),
    });
  });
};
// Кнопка «Назад» на Android.
window.dzBack = function () {
  if (U.stack.length) { U.stack[U.stack.length - 1].close(); return true; }
  if (U.onBack) return U.onBack();
  return false;
};

// ---------- кнопка методички ----------
U.info = (id, extra) => h('button.info', { onclick: e => { e.stopPropagation(); U.openKB(id, extra); }, 'aria-label': 'Методичка' }, 'i');

// ---------- слайдер параметра ----------
// o: {name, kb, min, max, step, value, fmt, norm, sub, cur, onInput, onChange, disabled}
U.slider = function (o) {
  const val = h('span.prm-val', o.fmt(o.value));
  const sub = h('div.prm-sub', o.sub ? (typeof o.sub === 'function' ? o.sub(o.value) : o.sub) : '');
  const inp = h('input', { type: 'range', min: o.min, max: o.max, step: o.step, value: o.value });
  if (o.disabled) inp.disabled = true;
  const wrap = h('div.range-wrap');
  if (o.norm) {
    const span = o.max - o.min;
    const l = D.clamp((o.norm.lo - o.min) / span, 0, 1), r = D.clamp((o.norm.hi - o.min) / span, 0, 1);
    wrap.appendChild(h('div.norm-band', { style: { left: `calc(${l * 100}% + ${11 - l * 22}px)`, width: `calc(${(r - l) * 100}% - ${(r - l) * 22}px)` } }));
  }
  wrap.appendChild(inp);
  const upd = () => {
    const v = +inp.value;
    val.textContent = o.fmt(v);
    if (o.sub && typeof o.sub === 'function') sub.textContent = o.sub(v);
    if (o.norm) val.style.color = v < o.norm.lo - 1e-9 || v > o.norm.hi + 1e-9 ? 'var(--warn)' : 'var(--gold)';
    if (o.onInput) o.onInput(v);
  };
  inp.addEventListener('input', upd);
  inp.addEventListener('change', () => { if (o.onChange) o.onChange(+inp.value); U.vibrate(8); });
  upd();
  return h('div.prm', h('div.prm-head', o.icon ? h('span', o.icon) : null, h('div.prm-name', o.name), val, o.kb ? U.info(o.kb) : null), wrap, sub, o.extra || null);
};

// Выбор из вариантов кнопками.
U.seg = function (o) {
  const box = h('div.seg');
  const render = () => {
    U.clear(box);
    o.options.forEach((opt, i) => {
      const v = opt.v !== undefined ? opt.v : i;
      box.appendChild(h('button' + (v === o.value ? '.on' : '') + (o.cur !== undefined && v === o.cur && v !== o.value ? '.cur' : ''), {
        disabled: opt.disabled || null, title: opt.title || null,
        onclick: () => { if (opt.disabled) return; o.value = v; render(); U.vibrate(8); o.onChange && o.onChange(v); },
      }, opt.label));
    });
  };
  render();
  return box;
};
U.prmSeg = (o) => h('div.prm', h('div.prm-head', o.icon ? h('span', o.icon) : null, h('div.prm-name', o.name), o.kb ? U.info(o.kb) : null), o.sub ? h('div.prm-sub', o.sub) : null, U.seg(o), o.extra || null);

U.toggle = function (value, onChange) {
  const t = h('button.toggle' + (value ? '.on' : ''), { onclick: () => { value = !value; t.classList.toggle('on', value); U.vibrate(8); onChange(value); } });
  return t;
};
U.prmToggle = o => h('div.prm', h('div.prm-head', o.icon ? h('span', o.icon) : null, h('div.prm-name', o.name, o.sub ? h('div.prm-sub', o.sub) : null), o.kb ? U.info(o.kb) : null, U.toggle(o.value, o.onChange)));

U.tabs = function (list, cur, onChange) {
  const box = h('div.tabs');
  for (const t of list) {
    const b = h('button' + (t.id === cur ? '.on' : ''), { onclick: () => { U.vibrate(6); onChange(t.id); } }, (t.icon ? t.icon + ' ' : '') + t.name, t.badge ? h('span.pill-num', { style: 'margin-left:4px' }, t.badge) : null);
    box.appendChild(b);
  }
  setTimeout(() => { const on = box.querySelector('.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' }); }, 0);
  return box;
};

U.card = (title, ...kids) => h('div.card', title ? h('h3', title) : null, ...kids);
U.bar = (frac, color) => h('div.bar', h('i', { style: { width: D.clamp(frac, 0, 1) * 100 + '%', background: color || 'var(--gold)' } }));
U.moodColor = v => v >= 60 ? 'var(--good)' : v >= 42 ? 'var(--warn)' : 'var(--bad)';
U.chipNorm = (ok) => h('span.chip.' + (ok ? 'good' : 'bad'), ok ? 'в норме' : 'вне нормы');
})();
