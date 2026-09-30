'use strict';
// Оболочка игры: меню, игровой экран, ходы, отчёты, события, откат, сохранения.
(function () {
const D = globalThis.D, U = D.ui, h = U.h;
const pct = (v, d = 1) => D.pct(v, d);

U.setScreen = function (el) {
  const app = U.$('#app');
  U.clear(app).appendChild(el);
  U.onBack = null;
};

// ---------- сохранения ----------
const SLOTS = 5;
U.slotMeta = () => { try { return JSON.parse(localStorage.getItem('dz.slots') || '{}'); } catch (e) { return {}; } };
U.saveTo = function (slot, s) {
  try {
    localStorage.setItem('dz.slot.' + slot, JSON.stringify(s));
    const meta = U.slotMeta();
    meta[slot] = { name: s.cfg.name, date: D.dateStr(s), saved: Date.now(), flag: s.cfg.flag };
    localStorage.setItem('dz.slots', JSON.stringify(meta));
    return true;
  } catch (e) { U.toast('Не удалось сохранить: ' + e.message); return false; }
};
U.loadFrom = function (slot) {
  try { const raw = localStorage.getItem('dz.slot.' + slot); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
};
window.dzSave = () => { if (U.s && !U.s.over) U.saveTo('auto', U.s); };

// ---------- главное меню ----------
U.showHome = function () {
  U.s = null;
  const auto = U.slotMeta().auto;
  const scr = h('div.screen.home', h('div.inner',
    h('div.logo', 'ДЕРЖАВА'),
    h('div.logo-sub', 'Симулятор экономики и государства. Налоги, цены, выборы, регионы, кризисы — и объяснение, почему всё устроено именно так.'),
    h('div', { style: 'height:10px' }),
    U.updateInfo ? h('button.menu-btn', { style: 'border-color:var(--gold)', onclick: () => U.checkUpdate(true) }, h('span.ic', '⬇️'), h('div', 'Доступна версия ' + U.updateInfo.ver, h('small', 'Нажмите, чтобы обновить'))) : null,
    auto ? h('button.menu-btn.primary', { onclick: () => { const s = U.loadFrom('auto'); if (s) U.startGame(s); } }, h('span.ic', '▶'), h('div', 'Продолжить', h('small', `${auto.name} · ${auto.date}`))) : null,
    h('button.menu-btn' + (auto ? '' : '.primary'), { onclick: () => U.openSetup() }, h('span.ic', '🏛️'), h('div', 'Новое государство', h('small', 'Конструктор страны: всё до мелочей'))),
    h('button.menu-btn', { onclick: () => U.openSlots(false) }, h('span.ic', '💾'), h('div', 'Загрузить партию', h('small', 'Сохранённые страны'))),
    h('button.menu-btn', { onclick: () => U.openLearn('genesis') }, h('span.ic', '📚'), h('div', 'Учебник экономики', h('small', 'Как рождается страна, кризисы, идеологии, словарь'))),
    h('button.menu-btn', { onclick: () => U.openSettings() }, h('span.ic', '⚙️'), h('div', 'Настройки', h('small', 'Уровень объяснений: ' + U.LEVELS.find(l => l.v === U.settings.level).name))),
    h('button.small.dim2', { style: 'margin-top:14px', onclick: () => U.checkUpdate(true) }, 'Версия ' + D.VERSION + ' · проверить обновления')));
  U.setScreen(scr);
};

U.openSettings = function () {
  const body = h('div');
  const render = () => {
    U.clear(body);
    body.appendChild(h('div.card', h('h3', '🎓 Уровень объяснений'), h('p.small.dim', 'Влияет на методички, отчёты и подсказки. Можно менять в любой момент прямо в окне методички.'),
      ...U.LEVELS.map(l => h('button.list-item', { style: 'width:100%;text-align:left', onclick: () => { U.settings.level = l.v; U.saveSettings(); render(); } },
        h('span.ic', ['👶', '🧒', '🧑‍🎓', '👨‍🏫'][l.v - 1]), h('div.grow', h('b' + (U.settings.level === l.v ? '.gold' : ''), l.name), h('div.small.dim', l.desc)), U.settings.level === l.v ? h('span.chip.sel', '✓') : null))));
    body.appendChild(h('div.card', U.prmToggle({ name: 'Вибрация', value: U.settings.haptics, onChange: v => { U.settings.haptics = v; U.saveSettings(); } })));
  };
  render();
  U.modal({ title: 'Настройки', icon: '⚙️', body });
};

U.openSlots = function (saving) {
  const body = h('div');
  const render = () => {
    U.clear(body);
    const meta = U.slotMeta();
    const slots = ['auto', ...Array.from({ length: SLOTS }, (_, i) => String(i + 1))];
    for (const sl of slots) {
      if (saving && sl === 'auto') continue;
      const m = meta[sl];
      body.appendChild(h('div.list-item',
        h('span.ic', sl === 'auto' ? '🔄' : '💾'),
        h('div.grow', h('b', sl === 'auto' ? 'Автосохранение' : 'Слот ' + sl), h('div.small.dim', m ? `${m.name} · ${m.date}` : 'пусто')),
        saving ? h('button.btn.small.primary', { onclick: () => { if (U.saveTo(sl, U.s)) { U.toast('Сохранено'); render(); } } }, 'Сохранить')
          : m ? h('button.btn.small.primary', { onclick: () => { const s = U.loadFrom(sl); if (s) { U.stack.slice().forEach(x => x.close()); U.startGame(s); } } }, 'Загрузить') : null,
        m && !saving ? h('button.btn.small.bad', { onclick: async () => { if (await U.confirm({ title: 'Удалить сохранение?', danger: true, ok: 'Удалить' })) { localStorage.removeItem('dz.slot.' + sl); delete meta[sl]; localStorage.setItem('dz.slots', JSON.stringify(meta)); render(); } } }, '🗑') : null));
    }
  };
  render();
  U.modal({ title: saving ? 'Сохранить партию' : 'Загрузить партию', icon: '💾', body });
};

// ---------- игровой экран ----------
U.NAV = [
  { id: 'overview', name: 'Обзор', icon: '🏠' },
  { id: 'economy', name: 'Экономика', icon: '📈' },
  { id: 'budget', name: 'Бюджет', icon: '💰' },
  { id: 'society', name: 'Общество', icon: '👥' },
  { id: 'regions', name: 'Регионы', icon: '🗺️' },
  { id: 'power', name: 'Власть', icon: '🏛️' },
  { id: 'world', name: 'Мир', icon: '🌍' },
  { id: 'more', name: 'Ещё', icon: '☰' },
];
U.TABS = U.TABS || {};

U.startGame = function (s, isNew) {
  U.s = s;
  U.snaps = [];
  U.ghost = null;
  U.tab = 'overview'; U.sub = {};
  U.mapGeo = null;
  s.pendingLaws = s.pendingLaws || [];
  s.reports = s.reports || [];
  s.tasks = s.tasks || [];
  const scr = h('div.screen');
  const topbar = h('div.gtop');
  const ticker = h('div.ticker');
  const body = h('div.scroll');
  const nav = h('div.nav');
  scr.append(topbar, ticker, body, nav);
  U.setScreen(scr);
  U.gameEls = { topbar, ticker, body, nav };
  U.onBack = () => { if (U.tab !== 'overview') { U.go('overview'); return true; } U.confirm({ title: 'Выйти в меню?', text: 'Партия сохранится автоматически.', ok: 'Выйти' }).then(ok => { if (ok) { window.dzSave(); U.showHome(); } }); return true; };
  U.refresh();
  if (isNew) setTimeout(() => U.openIntro(s), 150);
  else if (s.pending.length) setTimeout(() => U.showEvent(), 150);
  if (s.over) setTimeout(() => U.showGameOver(), 200);
};

U.go = function (tab, sub) {
  U.tab = tab;
  if (sub) U.sub[tab] = sub;
  U.refresh(true);
};

U.refresh = function (scrollTop) {
  const s = U.s, els = U.gameEls; if (!s || !els) return;
  // Шапка.
  U.clear(els.topbar);
  const months = U.settings.turn || 3;
  els.topbar.append(...[
    U.flagCanvas(s.cfg.flag, 38, 26),
    h('div.title', h('b', s.cfg.name), h('span', D.dateStr(s) + (s.cfg.lengthYears ? ` · осталось ${D.months(Math.max(0, s.cfg.lengthYears * 12 - s.t))}` : ''))),
    U.snaps.length ? h('button.iconbtn', { onclick: () => U.rollback(), title: 'Отменить ход' }, '↩️') : null,
    h('div.turnbtn', h('button.go', { onclick: () => U.nextTurn() }, '▶ Ход'),
      h('button.len', { onclick: () => { U.settings.turn = months === 1 ? 3 : months === 3 ? 12 : 1; U.saveSettings(); U.refresh(); } }, months === 12 ? '1 год' : months + ' мес'))].filter(Boolean));
  // Бегущая строка.
  U.clear(els.ticker);
  const tk = (label, val, cls) => h('span', label + ' ', h('b' + (cls ? '.' + cls : ''), val));
  const e = s.e;
  els.ticker.append(
    tk('ВВП', D.spct(e.growthY), e.growthY >= 0.02 ? 'good' : e.growthY < 0 ? 'bad' : ''),
    tk('Инфл.', pct(e.pi12), e.pi12 > 0.06 || e.pi12 < 0 ? 'bad' : e.pi12 <= 0.04 ? 'good' : 'warn'),
    tk('Безраб.', pct(e.u), e.u > 0.08 ? 'bad' : e.u < 0.05 ? 'good' : ''),
    tk('Ставка', pct(e.i)),
    tk('Курс', D.fmt(e.er, e.er < 10 ? 2 : 0)),
    tk('Долг', pct(s.gov.debtGdp, 0), s.gov.debtGdp > 0.9 ? 'bad' : ''),
    tk('Рейтинг', D.fmt(s.polit.approval, 0), s.polit.approval < 40 ? 'bad' : s.polit.approval > 55 ? 'good' : ''),
    tk('Нефть', D.fmt(s.w.oil, 0) + '$'));
  // Навигация.
  U.clear(els.nav);
  for (const n of U.NAV) {
    const badge = n.id === 'overview' && s.pending.length ? '!' : null;
    els.nav.appendChild(h('button' + (U.tab === n.id ? '.on' : ''), { onclick: () => { U.vibrate(6); U.go(n.id); } }, h('span.ic', n.icon), n.name, badge ? h('span.pill-num', { style: 'position:absolute;margin-left:22px;margin-top:-2px' }, badge) : null));
  }
  // Содержимое.
  const st = els.body.scrollTop;
  U.clear(els.body);
  try {
    const fn = U.TABS[U.tab];
    els.body.appendChild(fn ? fn(s) : h('p', 'Раздел готовится'));
  } catch (err) {
    console.error(err);
    els.body.appendChild(h('div.note.bad', 'Ошибка отображения: ' + err.message));
  }
  els.body.scrollTop = scrollTop ? 0 : st;
};

// ---------- ход ----------
U.nextTurn = function () {
  const s = U.s;
  if (s.over) { U.showGameOver(); return; }
  if (s.pending.length) { U.showEvent(); return; }
  U.snaps.push(JSON.stringify(s));
  if (U.snaps.length > 15) U.snaps.shift();
  const months = U.settings.turn || 3;
  let rep;
  try { rep = D.playTurn(s, months); } catch (err) { console.error(err); U.toast('Ошибка модели: ' + err.message, 5000); return; }
  s.reports.push({ t0: rep.t0, t1: rep.t1, rows: rep.rows, contrib: rep.contrib, pi: rep.pi, events: rep.events.map(x => ({ title: x.title, type: x.type })) });
  if (s.reports.length > 40) s.reports.shift();
  U.lastReport = rep;
  U.vibrate(15);
  window.dzSave();
  U.refresh();
  const after = () => { if (s.over) U.showGameOver(); };
  if (s.pending.length) U.showEvent(() => U.showReport(rep, after));
  else U.showReport(rep, after);
};

U.rollback = async function () {
  if (!U.snaps.length) return;
  const ok = await U.confirm({ title: 'Отменить последний ход?', icon: '↩️', text: 'Страна вернётся к состоянию до хода. Отменённая ветка останется на графиках пунктиром — можно сравнить, что было бы.', ok: 'Отменить ход' });
  if (!ok) return;
  U.ghost = D.clone(U.s.hist);
  U.s = JSON.parse(U.snaps.pop());
  U.stack.slice().forEach(x => x.close());
  U.refresh();
  U.toast('Ход отменён. Пунктир на графиках — отменённая ветка.');
};

// ---------- событие ----------
U.showEvent = function (then) {
  const s = U.s;
  const pe = s.pending[0]; if (!pe) { if (then) then(); return; }
  const ev = D.EVENT[pe.id];
  pe.text = pe.text || ev.text(s, pe);
  const dem = D.REGIME[s.pol.regime].dem;
  const body = h('div.event-card',
    h('div.event-icon', ev.icon),
    h('p', pe.text),
    ev.example ? h('div.kb', h('div.ex', '📜 ' + ev.example)) : null,
    ev.kb ? h('div.row.mt', U.info(ev.kb), h('span.small.dim', 'Методичка по теме')) : null,
    h('h4.mt2', { style: 'margin-bottom:8px' }, 'Ваше решение:'),
    ...ev.choices.map((ch, i) => h('button.choice', { disabled: ch.auth && dem ? true : null, onclick: () => {
      D.resolveEvent(s, i); m.close(); U.vibrate(12); U.refresh();
      if (s.pending.length) U.showEvent(then); else if (then) then();
    } }, h('b', ch.label + (ch.auth && dem ? ' (недоступно в демократии)' : '')), h('span', ch.desc))));
  const m = U.modal({ title: ev.title, sticky: true, body });
  m.head.querySelector('.iconbtn').remove();
};

// ---------- отчёт хода ----------
U.showReport = function (rep, then) {
  const s = U.s, lvl = U.settings.level;
  const body = h('div');
  const hl = D.reportHighlights(s, rep, lvl);
  if (hl.length) body.appendChild(h('div.card', h('h3', '📰 Главное'), ...hl.map(x => h('p', x))));
  const tbl = h('div.card', h('h3', '📊 Показатели', h('span.sp'), h('span.small.dim', `${D.dateShort(s, rep.t0)} → ${D.dateShort(s, rep.t1)}`)));
  for (const r of rep.rows) {
    const hd = D.HISTBY[r.id];
    const d = r.b - r.a;
    const better = r.good === 0 ? 0 : Math.sign(d) * r.good;
    const inNorm = r.norm ? r.b >= r.norm[0] && r.b <= r.norm[1] : null;
    tbl.appendChild(h('div.report-row',
      h('span', r.name),
      h('span.dim.num', D.fmtVal(s, r.id, r.a)),
      h('span.arr.' + (Math.abs(d) < 1e-9 || better === 0 ? 'dim' : better > 0 ? 'good' : 'bad'), Math.abs(d) < 1e-9 ? '=' : d > 0 ? '▲' : '▼'),
      h('b.num' + (inNorm === null ? '' : inNorm ? '.good' : '.warn'), D.fmtVal(s, r.id, r.b))));
  }
  body.appendChild(tbl);
  const g = h('div.card', h('h3', '📈 Откуда рост', h('span.sp'), U.info('ind.gdp')));
  g.append(...D.explainGrowth(s, rep.contrib, rep.months, lvl).map(x => h('p.small', x)));
  g.appendChild(U.barsChart([{ label: 'Потребление', v: rep.contrib.C }, { label: 'Инвестиции', v: rep.contrib.I }, { label: 'Госрасходы', v: rep.contrib.G }, { label: 'Чистый экспорт', v: rep.contrib.NX }], v => D.pp(v, 2)));
  body.appendChild(g);
  const p = h('div.card', h('h3', '🏷️ Почему менялись цены', h('span.sp'), U.info('ind.inflation')));
  p.append(...D.explainInflation(s, rep.pi, lvl).map(x => h('p.small', x)));
  p.appendChild(U.barsChart(D.INFL_PARTS.map(x => ({ label: x.name, v: rep.pi[x.id] || 0, color: x.color })).filter(x => Math.abs(x.v) > 0.0005), v => D.pp(v), { posGood: false }));
  p.appendChild(h('p.small.dim.mt', `Цены за период выросли на ${pct(rep.priceGrowth, 2)}.`));
  body.appendChild(p);
  body.appendChild(h('div.card', h('h3', '👥 Население за период'),
    h('div.row.between.small', h('span', '👶 Родилось'), h('b', D.people(rep.births))),
    h('div.row.between.small', h('span', '⚰️ Умерло'), h('b', D.people(rep.deaths))),
    h('div.row.between.small', h('span', '🛬 Приехало'), h('b', D.people(rep.immig))),
    h('div.row.between.small', h('span', '🛫 Уехало'), h('b', D.people(rep.emig))),
    h('div.row.between.small', h('span', 'Итого'), h('b.' + (rep.births - rep.deaths + rep.immig - rep.emig >= 0 ? 'good' : 'bad'), D.signed((rep.births - rep.deaths + rep.immig - rep.emig) / 1000, 0) + ' тыс.'))));
  if (rep.events.length) {
    const ev = h('div.card', h('h3', '🗞️ События'));
    for (const x of rep.events) ev.appendChild(h('div.list-item', h('div.grow', h('b', x.title), h('div.small.dim', x.text)), x.kb ? U.info(x.kb) : null));
    body.appendChild(ev);
  }
  U.modal({ title: 'Итоги хода', icon: '🧾', body, foot: [
    U.snaps.length ? { label: '↩️ Отменить ход', onclick: () => U.rollback(), close: false } : null,
    { label: 'Продолжить', cls: 'primary', onclick: () => { if (then) then(); } },
  ].filter(Boolean), onClose: null });
};

// ---------- конец игры ----------
U.OVER = {
  election: { icon: '🗳️', title: 'Вы проиграли выборы', text: 'Народ проголосовал за другую партию. Власть мирно перешла к оппозиции — так работает демократия.' },
  revolution: { icon: '🔥', title: 'Революция', text: 'Долгое недовольство, массовые протесты и нежелание силовиков разгонять людей привели к смене власти.' },
  coup: { icon: '🎖️', title: 'Государственный переворот', text: 'Военные или элиты решили, что вы им больше не нужны, и отстранили вас от власти.' },
  finish: { icon: '🏁', title: 'Срок правления завершён', text: 'Вы довели страну до конца партии. Вот итоги вашего правления.' },
};
U.showGameOver = function () {
  const s = U.s, o = U.OVER[s.over.reason] || U.OVER.finish;
  const hist = s.hist;
  const first = id => hist[id][0], last = id => hist[id][hist[id].length - 1];
  const rows = [['Реальный ВВП', D.spct(last('gdpReal') / first('gdpReal') - 1, 0)], ['ВВП на душу', `${D.usd(first('gdppc'), 0)} → ${D.usd(last('gdppc'), 0)}`],
    ['Продолжительность жизни', `${D.fmt(first('le'), 1)} → ${D.fmt(last('le'), 1)}`], ['ИЧР', `${D.fmt(first('hdi'), 3)} → ${D.fmt(last('hdi'), 3)}`],
    ['Счастье', `${D.fmt(first('happy'), 1)} → ${D.fmt(last('happy'), 1)}`], ['Бедность', `${pct(first('poverty'))} → ${pct(last('poverty'))}`],
    ['Госдолг', `${pct(first('debt'), 0)} → ${pct(last('debt'), 0)}`], ['Население', `${D.people(first('pop'))} → ${D.people(last('pop'))}`]];
  const body = h('div', h('div.event-icon', o.icon), h('p', o.text), h('p.dim', `Вы правили ${D.months(s.t)}.`),
    h('div.card', h('h3', '🏆 Индекс процветания: ' + D.prosperity(s) + ' / 100'), h('table.t', rows.map(r => h('tr', h('td', r[0]), h('td', r[1]))))),
    s.over.reason === 'election' && s.over.data ? h('div.card', h('h3', 'Итоги выборов'), ...s.polit.parties.map((p, i) => h('div.row.between.small', h('span', p.name), h('b', pct(s.over.data.shares[i]))))) : null);
  U.modal({ title: o.title, body, sticky: true, foot: [
    U.snaps.length ? { label: '↩️ Откатить ход', onclick: () => { s.over = null; U.rollback(); }, close: true } : null,
    s.over.reason === 'finish' ? { label: 'Продолжить без ограничения', onclick: () => { s.over = null; s.cfg.lengthYears = 0; U.refresh(); } } : null,
    { label: 'В меню', cls: 'primary', onclick: () => { localStorage.removeItem('dz.slot.auto'); const meta = U.slotMeta(); delete meta.auto; localStorage.setItem('dz.slots', JSON.stringify(meta)); U.showHome(); } },
  ].filter(Boolean) });
};

// ---------- вступление ----------
U.openIntro = function (s) {
  const reg = D.REGIME[s.pol.regime];
  const body = h('div',
    h('div.row', U.flagCanvas(s.cfg.flag, 90, 60), h('div.grow', h('h2', s.cfg.name), h('div.dim.small', `${reg.name} · ${D.SYSTEM[s.pol.system].name}`), h('div.dim.small', `Столица: ${s.cfg.capital} · ${s.regions.length} регионов`))),
    h('p.mt', `Население ${D.people(s.popTotal)}, ВВП на душу ${D.usd(s.ind.gdppc, 0)} (по паритету покупательной способности ${D.usd(s.ind.gdppcPPP, 0)}). Инфляция ${pct(s.e.pi12)}, безработица ${pct(s.e.u)}, госдолг ${pct(s.gov.debtGdp, 0)} ВВП, бюджет ${s.fis.deficit > 0 ? 'в дефиците ' + pct(s.fis.deficit / s.ind.gdpNom) : 'в профиците ' + pct(-s.fis.deficit / s.ind.gdpNom)} ВВП.`),
    h('div.card', h('h3', '🧭 С чего начать'),
      h('p.small', '1. Загляните в «Обзор»: плитки показателей кликабельны — нажмите, чтобы узнать «почему».'),
      h('p.small', '2. Посмотрите «Нормы» и «Задачи» в обзоре: что в стране не в порядке.'),
      h('p.small', '3. Меняйте налоги, расходы, законы и ставку ЦБ. У каждого параметра есть кнопка ⓘ — методичка: что это, кто платит, что будет при изменении.'),
      h('p.small', '4. Нажмите «▶ Ход». Экономика реагирует с задержкой: ставка ЦБ — через 3–6 кварталов, образование — через годы.'),
      h('p.small', '5. Ошиблись? Ход можно отменить (↩️) и сравнить ветки на графиках.')),
    h('div.row', h('button.btn.grow', { onclick: () => U.openLearn('genesis') }, '🌱 Как рождается страна'), h('button.btn.grow', { onclick: () => U.openLearn('start') }, '🧭 Гид по игре')));
  U.modal({ title: 'Добро пожаловать', icon: '🏛️', body, foot: [{ label: 'Начать править', cls: 'primary' }] });
};

// ---------- адаптер политики в игре ----------
U.polModel = function (s) {
  const pol = s.pol;
  const after = () => { U.refresh(); };
  return {
    get: id => id === 'childBenefit' ? pol.child : id === 'gmi' ? pol.gmi : id === 'ubi' ? pol.ubi : id === 'publicWage' ? pol.publicWage : D.TAX[id] ? pol.tax[id] : (pol.spend[id] || 0),
    set: (id, v) => {
      if (id === 'childBenefit') pol.child = v; else if (id === 'gmi') pol.gmi = v; else if (id === 'ubi') pol.ubi = v; else if (id === 'publicWage') pol.publicWage = v;
      else if (D.TAX[id]) { pol.tax[id] = v; if (id === 'pit' && pol.pitMode === 'flat') pol.pit.forEach(b => { b.rate = v; }); }
      else pol.spend[id] = v;
      U.decisionLog(s, id, v);
    },
    pitMode: () => pol.pitMode, setPitMode: v => { pol.pitMode = v; if (v === 'flat') pol.pit.forEach(b => { b.rate = pol.tax.pit; }); },
    brackets: () => pol.pit, setBrackets: br => { pol.pit = br; },
    taxFree: () => pol.taxFree, setTaxFree: v => { pol.taxFree = v; },
    split: id => pol.split[id], setSplit: (id, sp) => { pol.split[id] = sp; },
    pension: () => pol.pension, setPension: p => { const old = pol.pension.repl; pol.pension = p; if (Math.abs(p.repl - old) > 1e-9) s.fis.pensionLevel = p.repl * s.e.W; },
    unemp: () => pol.unemp, setUnemp: u => { pol.unemp = u; },
    regime: () => pol.regime,
    law: id => pol.laws[id],
    setLaw: (id, v) => U.proposeLaw(s, id, v),
    cb: () => pol.cb, setCb: cb => { pol.cb = cb; },
    fin: () => pol.fin, setFin: f => { pol.fin = f; },
    regional: () => pol.regional, setRegional: r => { pol.regional = r; },
  };
};
U.decisionLog = function (s, id, v) {
  s.decisions = s.decisions || [];
  s.decisions.push({ t: s.t, id, v });
  if (s.decisions.length > 300) s.decisions.shift();
};

// Предложить закон: прогноз поддержки, реакция групп, вступление в силу.
U.proposeLaw = function (s, id, opt) {
  const L = D.LAW[id], cur = s.pol.laws[id];
  if (opt === cur) { s.pendingLaws = s.pendingLaws.filter(p => p.id !== id); U.refresh(); return; }
  const sup = D.lawSupport(s, id, opt);
  const o = L.opts[opt], o0 = L.opts[cur];
  const g = Object.assign({}, o.mods.groups || {});
  for (const k in (o0.mods.groups || {})) g[k] = (g[k] || 0) - o0.mods.groups[k];
  const reactions = Object.entries(g).filter(([, v]) => Math.abs(v) >= 1).sort((a, b) => b[1] - a[1]);
  const body = h('div',
    h('div.row', h('span.chip', o0.label), h('span', '→'), h('span.chip.gold', o.label)),
    h('div.mt', U.kbBody('law.' + id, Math.min(3, U.settings.level))),
    reactions.length ? h('div.card.mt', h('h3', '👥 Реакция общества'), ...reactions.map(([gid, v]) => h('div.row.between.small', h('span', D.GROUP[gid].icon + ' ' + D.GROUP[gid].name), h('b.' + (v > 0 ? 'good' : 'bad'), (v > 0 ? '+' : '') + v)))) : null,
    h('div.card', h('h3', '🏛️ Парламент'),
      sup.via === 'blocked' ? h('p.bad', sup.reason) :
        D.REGIME[s.pol.regime].needParl ? h('div', h('div.row.between', h('span', 'Прогноз поддержки'), h('b.' + (sup.support >= 0.5 ? 'good' : 'bad'), pct(sup.support, 0))), U.bar(sup.support, sup.support >= 0.5 ? 'var(--good)' : 'var(--bad)'),
          h('p.small.dim.mt', sup.support >= 0.5 ? 'Большинство готово поддержать.' : 'Большинства нет.' + (sup.via === 'decree-possible' ? ' Можно издать указом — но это ударит по доверию и отношениям с демократиями.' : ''))) :
          h('p.small.dim', 'Решение принимается без парламента.')),
    h('p.small.dim', `Вступит в силу через ${D.months(L.delay || 1)}.`));
  const enact = (decree) => {
    s.pendingLaws = s.pendingLaws.filter(p => p.id !== id);
    s.pendingLaws.push({ id, opt, t: s.t + (L.delay || 1) });
    if (decree) { s.inst.trust = Math.max(0, s.inst.trust - 3); for (const p of s.ext.partners) if (p.reg === 'dem') p.memory -= 2; }
    D.logEvent(s, 'politics', `📜 ${decree ? 'Указ' : 'Закон'}: ${L.name}`, `Принято: «${o.label}». Вступит в силу в ${D.dateStr(s, s.t + (L.delay || 1))}.`, { kb: 'law.' + id });
    U.decisionLog(s, 'law.' + id, opt);
    U.toast(decree ? 'Указ подписан' : 'Закон принят');
    U.refresh();
  };
  const foot = [];
  if (sup.via === 'blocked') foot.push({ label: 'Понятно' });
  else if (sup.passes) foot.push({ label: 'Отмена' }, { label: D.REGIME[s.pol.regime].needParl ? 'Внести в парламент' : 'Принять', cls: 'primary', onclick: () => enact(false) });
  else {
    foot.push({ label: 'Отмена' });
    foot.push({ label: 'Голосовать всё равно', onclick: () => { D.logEvent(s, 'politics', `❌ Парламент отклонил: ${L.name}`, `Законопроект «${o.label}» не набрал большинства (${pct(sup.support, 0)}).`); U.toast('Парламент отклонил закон'); U.refresh(); } });
    if (sup.via === 'decree-possible') foot.push({ label: 'Указом', cls: 'bad', onclick: () => enact(true) });
  }
  U.modal({ title: L.name, icon: L.icon, body, foot });
};
})();
