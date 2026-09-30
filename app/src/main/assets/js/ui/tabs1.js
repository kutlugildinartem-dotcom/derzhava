'use strict';
// Вкладки: Обзор, Экономика, Бюджет.
(function () {
const D = globalThis.D, U = D.ui, h = U.h;
const pct = (v, d = 1) => D.pct(v, d);
const subTabs = (tab, list) => U.tabs(list, U.sub[tab] || list[0].id, id => { U.sub[tab] = id; U.refresh(true); });
const cur = (tab, list) => U.sub[tab] || list[0].id;
const ago = (s, id, n = 12) => { const a = s.hist[id]; return a[Math.max(0, a.length - 1 - n)]; };
const last = (s, id) => { const a = s.hist[id]; return a[a.length - 1]; };

// ---------- «Почему?» по показателю ----------
U.openWhy = function (id) {
  const s = U.s;
  const w = D.WHY[id] ? D.WHY[id](s) : { title: D.HISTBY[id] ? D.HISTBY[id].name : id, charts: [[id]], kb: null, text: [] };
  const body = h('div');
  for (const ch of w.charts || []) {
    const hasAll = ch.every(x => D.HISTBY[x]);
    if (hasAll) body.appendChild(h('div.card', U.histChart(s, ch, { band: ch === w.charts[0] ? w.band : null, labels: w.labels, zero: true })));
  }
  if (w.bars && w.bars.length) body.appendChild(h('div.card', h('h3', 'Из чего складывается'), U.barsChart(w.bars, v => D.pp(v), { posGood: id === 'infl' ? false : true })));
  if (w.text && w.text.length) body.appendChild(h('div.card', ...w.text.map(t => h('p', t))));
  if (w.kb) body.appendChild(h('div.card', U.kbBody(w.kb, U.settings.level)));
  U.modal({ title: w.title, icon: '❓', body });
};

// ---------- ОБЗОР ----------
U.TABS.overview = function (s) {
  const box = h('div');
  if (s.pending.length) box.appendChild(h('button.note.warn', { style: 'width:100%;text-align:left;margin-bottom:10px', onclick: () => U.showEvent() }, h('b', '⚠️ Требуется ваше решение: '), D.EVENT[s.pending[0].id].title, ' ›'));
  const crises = D.CRISES.filter(c => s.crises[c.id] && s.crises[c.id].active);
  if (crises.length) box.appendChild(h('div.row.wrap.mb', crises.map(c => h('button.chip.bad', { onclick: () => U.openKB(c.kb) }, c.icon + ' ' + c.name))));
  if (s.pendingLaws.length) box.appendChild(h('div.note.mb.small', '⏳ Законы в пути: ' + s.pendingLaws.map(p => `${D.LAW[p.id].name} (через ${p.t - s.t} мес.)`).join('; ')));
  // Плитки.
  const tiles = [
    { id: 'growth', name: 'Рост ВВП', v: s.e.growthY, f: v => D.spct(v), good: v => v >= 0.02 ? 1 : v < 0 ? -1 : 0 },
    { id: 'infl', name: 'Инфляция', v: s.e.pi12, f: v => pct(v), good: v => v >= 0.005 && v <= 0.04 ? 1 : v > 0.08 || v < -0.01 ? -1 : 0 },
    { id: 'unemp', name: 'Безработица', v: s.e.u, f: v => pct(v), good: v => v <= 0.05 ? 1 : v > 0.09 ? -1 : 0, inv: true },
    { id: 'rate', name: 'Ставка ЦБ', v: s.e.i, f: v => pct(v), good: () => 0 },
    { id: 'deficit', name: 'Бюджет', v: -s.fis.deficit / s.ind.gdpNom, f: v => D.spct(v), good: v => v >= -0.03 ? 1 : v < -0.06 ? -1 : 0 },
    { id: 'debt', name: 'Госдолг', v: s.gov.debtGdp, f: v => pct(v, 0), good: v => v <= 0.6 ? 1 : v > 1 ? -1 : 0, inv: true },
    { id: 'approval', name: 'Рейтинг власти', v: s.polit.approval, f: v => D.fmt(v, 0), good: v => v >= 55 ? 1 : v < 40 ? -1 : 0 },
    { id: 'happy', name: 'Счастье', v: s.ind.happy, f: v => D.fmt(v, 1), good: v => v >= 6.5 ? 1 : v < 4.5 ? -1 : 0 },
    { id: 'gdppc', name: 'ВВП на душу', v: s.ind.gdppc, f: v => D.usd(v, 0), good: () => 0 },
    { id: 'hdi', name: 'ИЧР', v: s.ind.hdi, f: v => D.fmt(v, 3), good: v => v >= 0.8 ? 1 : v < 0.6 ? -1 : 0 },
    { id: 'pop', name: 'Население', v: s.popTotal, f: v => D.people(v), good: () => 0 },
    { id: 'res', name: 'Резервы, мес.', v: s.ext.resMonths, f: v => D.fmt(v, 1), good: v => v >= 3 ? 1 : v < 1.5 ? -1 : 0 },
  ];
  const grid = h('div.kpis');
  for (const t of tiles) {
    const prev = ago(s, t.id);
    const d = t.v - prev;
    const g = t.good(t.v);
    grid.appendChild(h('button.kpi', { onclick: () => U.openWhy(t.id) },
      h('div.k-name', h('span.dot', { style: { background: g > 0 ? 'var(--good)' : g < 0 ? 'var(--bad)' : 'var(--dim2)' } }), t.name),
      h('div.k-val', t.f(t.v)),
      h('div.k-delta.dim', 'за год: ' + (D.HISTBY[t.id].fmt === 'pct' ? D.pp(d) : (d >= 0 ? '+' : '') + t.f(d).replace(/^[+−-]/, ''))),
      U.spark(s.hist[t.id], g > 0 ? '#5cd6a0' : g < 0 ? '#ff6b6b' : '#e8c267')));
  }
  box.appendChild(h('div.sec-title', 'Ключевые показатели', h('span.dim2.small', '· нажмите, чтобы узнать «почему»')));
  box.appendChild(grid);
  // Нормы.
  const pr = D.prosperity(s);
  const norms = h('div.card', h('h3', '🎯 Нормы развитой страны', h('span.sp'), h('span.chip.gold', 'Индекс процветания ' + pr)));
  let okN = 0;
  for (const n of D.NORMS) {
    const v = n.f(s), ok = n.ok(v, s); if (ok) okN++;
    norms.appendChild(h('div.row', { style: 'padding:5px 0;border-bottom:1px solid var(--line)' }, h('span', ok ? '✅' : '❌'), h('span.grow.small', n.name), h('b.small.' + (ok ? 'good' : 'bad'), n.fmt(v)), U.info(n.kb)));
  }
  norms.insertBefore(h('p.small.dim', `Выполнено ${okN} из ${D.NORMS.length}. Ориентиры взяты у развитых стран: инфляция 2% (цель ФРС и ЕЦБ), долг до 60% и дефицит до 3% ВВП (Маастрихт) и т.д.`), norms.children[1]);
  box.appendChild(norms);
  // Задачи.
  const active = (s.tasks || []).filter(t => !t.status);
  const tasks = h('div.card', h('h3', '📋 Задачи правительства'));
  if (!active.length) tasks.appendChild(h('p.small.dim', 'Срочных задач нет. Новые появляются, когда в стране возникают проблемы.'));
  for (const t of active) tasks.appendChild(h('div.list-item', h('span.ic', '📌'), h('div.grow', h('b', t.name), h('div.small.dim', `Срок: ${D.dateStr(s, t.deadline)} (${D.months(t.deadline - s.t)})`)), h('button.btn.small', { onclick: () => U.openCard(t.kb) }, 'Как?')));
  const done = (s.tasks || []).filter(t => t.status).slice(-3);
  for (const t of done) tasks.appendChild(h('div.small', { style: 'padding:3px 0' }, (t.status === 'done' ? '🏅 ' : '⌛ ') + t.name));
  box.appendChild(tasks);
  // Выборы.
  const reg = D.REGIME[s.pol.regime];
  if (reg.elections !== 'none' && s.polit.nextElection < 1e8) {
    const left = s.polit.nextElection - s.t;
    const poll = s.polit.parties[0].poll;
    box.appendChild(h('button.card', { style: 'width:100%;text-align:left;display:block', onclick: () => U.go('power', 'elections') },
      h('h3', '🗳️ Выборы через ' + D.months(Math.max(0, left)), h('span.sp'), h('span.chip.' + (poll >= 0.5 ? 'good' : poll >= 0.4 ? 'warn' : 'bad'), 'Ваша партия: ' + pct(poll, 0))),
      U.bar(poll, poll >= 0.5 ? 'var(--good)' : 'var(--warn)'), h('p.small.dim.mt', poll < 0.5 ? 'По опросам вы проигрываете. Ищите, какие группы недовольны (Общество → Группы).' : 'По опросам вы побеждаете.')));
  }
  // Советники.
  const adv = h('div.card', h('h3', '🧑‍💼 Советники', h('span.sp'), h('button.btn.small', { onclick: () => U.openAdvisors() }, 'Все')));
  const pick = [D.ADVISORS[s.t % 3], D.ADVISORS[3 + (s.t % 3)]];
  for (const a of pick) adv.appendChild(h('div.list-item', h('span.ic', a.icon), h('div.grow', h('b', `${a.name} · ${a.school}`), h('div.small', a.advise(s)[0]))));
  box.appendChild(adv);
  // Лента.
  const feed = h('div.card', h('h3', '🗞️ Последние события', h('span.sp'), h('button.btn.small', { onclick: () => U.go('more', 'log') }, 'Журнал')));
  for (const it of s.log.slice(-6).reverse()) feed.appendChild(h('div.list-item', h('div.grow', h('b.small', it.title), h('div.tiny.dim', D.dateStr(s, it.t))), it.kb ? U.info(it.kb) : null));
  box.appendChild(feed);
  return box;
};

U.openAdvisors = function () {
  const s = U.s;
  const body = h('div', h('p.small.dim', 'У каждого советника своя экономическая школа. Они часто противоречат друг другу — как и в жизни. Решать вам.'));
  for (const a of D.ADVISORS) body.appendChild(h('div.card', h('h3', a.icon + ' ' + a.name, h('span.sp'), U.info(a.kb)), h('div.small.gold', a.school), ...a.advise(s).map(t => h('p.small', '«' + t + '»'))));
  U.modal({ title: 'Советники', icon: '🧑‍💼', body });
};

// ---------- ЭКОНОМИКА ----------
const ECO_SUBS = [
  { id: 'cb', name: 'ЦБ и деньги', icon: '🏦' }, { id: 'infl', name: 'Инфляция', icon: '🏷️' }, { id: 'growth', name: 'Рост', icon: '📈' },
  { id: 'labor', name: 'Труд', icon: '👷' }, { id: 'sectors', name: 'Отрасли', icon: '🏭' }, { id: 'banks', name: 'Банки', icon: '💳' },
  { id: 'housing', name: 'Жильё', icon: '🏠' }, { id: 'trade', name: 'Торговля и курс', icon: '🚢' },
];
U.TABS.economy = function (s) {
  const sub = cur('economy', ECO_SUBS);
  const box = h('div', subTabs('economy', ECO_SUBS));
  const e = s.e;
  const card = (...k) => h('div.card', ...k);
  const kv = (k, v, cls) => h('div.row.between', { style: 'padding:3px 0' }, h('span.dim.small', k), h('b.small' + (cls ? '.' + cls : ''), v));
  if (sub === 'cb') {
    box.appendChild(card(h('h3', '🏦 Денежная политика', h('span.sp'), U.info('cb.about')),
      kv('Ключевая ставка', pct(e.i, 2)), kv('Инфляция (г/г)', pct(e.pi12), e.pi12 > e.target + 0.02 ? 'bad' : 'good'), kv('Цель ЦБ', pct(e.target)),
      kv('Инфляционные ожидания', pct(e.pie)), kv('Реальная ставка', pct(e.i - e.pie), e.i - e.pie < 0 ? 'warn' : ''), kv('Правило Тейлора', pct(e.iTaylor || 0)),
      kv('Доверие к ЦБ', D.fmt(e.cred * 100, 0) + ' / 100'), kv('Рост денежной массы (г/г)', pct(D.yoy(s, 'M2'))),
      U.histChart(s, ['rate', 'infl', 'pie'], { labels: ['Ставка', 'Инфляция', 'Ожидания'], years: 10 })));
    box.appendChild(U.cbPanel(U.polModel(s), s));
  } else if (sub === 'infl') {
    const parts = e.piParts;
    box.appendChild(card(h('h3', '🏷️ Инфляция сейчас: ' + pct(e.pi12), h('span.sp'), U.info('ind.inflation')), U.histChart(s, ['infl'], { band: { lo: 0.01, hi: 0.04 }, zero: true })));
    box.appendChild(card(h('h3', '🔍 Откуда рост цен (последний месяц, в годовом выражении)'), ...D.explainInflation(s, parts, U.settings.level).map(t => h('p.small', t)),
      U.barsChart(D.INFL_PARTS.map(p => ({ label: p.name, v: parts[p.id] || 0, color: p.color })).filter(b => Math.abs(b.v) > 0.0003), v => D.pp(v), { posGood: false })));
    const cpi = card(h('h3', '🛒 Цены по категориям (старт = 100)'));
    for (const c of D.CPI_CATS) cpi.appendChild(kv(`${c.icon} ${c.name} (вес ${pct(s.c0.cpiW[c.id], 0)})`, D.fmt(e.Pc[c.id] * 100, 0)));
    box.appendChild(cpi);
    box.appendChild(card(h('h3', '🤔 Почему цены почти всегда растут', h('span.sp'), U.info('crisis.deflation')), ...D.WHY_PRICES_RISE.map(t => h('p.small', '• ' + t))));
    const cures = card(h('h3', '💊 Как снизить инфляцию — и чем за это платят'));
    for (const c of D.PRICE_CURES) cures.appendChild(h('div', { style: 'padding:8px 0;border-bottom:1px solid var(--line)' }, h('b.gold', c.name), h('div.tiny.dim', 'Где: ' + c.how), h('div.small', '✅ ' + c.effect), h('div.small.bad', '⚠ ' + c.cost), h('div.small.blue', '📜 ' + c.ex)));
    box.appendChild(cures);
  } else if (sub === 'growth') {
    const p = e.gAparts || {};
    box.appendChild(card(h('h3', '📈 Реальный ВВП и потенциал', h('span.sp'), U.info('ind.potential')), U.histChart(s, ['gdpReal', 'gdpPot'], { labels: ['Фактический', 'Потенциальный'] }),
      kv('Рост за год', D.spct(e.growthY)), kv('Разрыв выпуска', D.spct(e.gap), Math.abs(e.gap) > 0.02 ? 'warn' : ''), kv('ВВП (номинал)', D.money(s, s.ind.gdpNom) + ' · ' + D.usd(s.ind.gdpUsd)),
      kv('ВВП на душу', D.usd(s.ind.gdppc, 0) + ' (ППС ' + D.usd(s.ind.gdppcPPP, 0) + ')')));
    box.appendChild(card(h('h3', '⚙️ Рост производительности (TFP): ' + pct(e.gA), h('span.sp'), U.info('ind.tfp')),
      U.barsChart([{ label: 'Мировой прогресс', v: p.frontier || 0 }, { label: 'Догоняющий рост', v: p.catchup || 0 }, { label: 'Наука (R&D)', v: p.rnd || 0 }, { label: 'Образование', v: p.edu || 0 },
        { label: 'Инфраструктура', v: p.infra || 0 }, { label: 'Конкуренция', v: p.comp || 0 }, { label: 'Госсектор и тень', v: p.plan || 0 }, { label: 'Санкции, утечка мозгов', v: p.sanc || 0 },
        { label: 'Старение', v: p.aging || 0 }, { label: 'Законы', v: p.laws || 0 }, { label: 'Особенности страны', v: p.calib || 0 }], v => D.pp(v, 2)),
      h('p.small.dim.mt', 'Производительность — главный двигатель долгого роста: рост за счёт капитала и рабочих рук упирается в пределы, а рост эффективности — нет (модель Солоу).')));
    box.appendChild(card(h('h3', '🧮 Структура спроса (% ВВП)', h('span.sp'), U.info('ind.demand')),
      kv('Потребление (C)', pct(e.C / e.Y)), kv('Инвестиции (I)', pct(e.I / e.Y)), kv('Госзакупки (G)', pct(e.G / e.Y)), kv('Экспорт (X)', pct((e.Xn + e.Xr) / e.Y)), kv('Импорт (M)', pct(e.M / e.Y)),
      kv('Капитал / ВВП', D.fmt(e.K / e.Y, 2)), kv('Уверенность бизнеса', D.fmt(e.conf, 2)), kv('Уверенность потребителей', D.fmt(e.cconf, 2))));
  } else if (sub === 'labor') {
    box.appendChild(card(h('h3', '👷 Рынок труда', h('span.sp'), U.info('ind.unemployment')), U.histChart(s, ['unemp', 'unat'], { labels: ['Безработица', 'Естественная'] }),
      kv('Рабочая сила', D.people(e.LF)), kv('Занятые', D.people(e.E)), kv('Безработные', D.people(e.LF * e.u)), kv('Средняя зарплата', D.money(s, e.W) + ' / мес'),
      kv('Реальная зарплата (г/г)', D.spct(D.yoy(s, 'W') - e.pi12)), kv('Зарплата бюджетника', D.money(s, e.Wpub)), kv('Доля зарплат в ВВП', pct(e.laborShare)),
      kv('МРОТ', s.mods.minWage ? pct(s.mods.minWage, 0) + ' средней = ' + D.money(s, s.mods.minWage * e.W) : 'нет'), kv('Рабочая неделя', s.mods.hoursWeek + ' ч'),
      h('div.row.mt', h('button.btn.small', { onclick: () => U.go('power', 'laws') }, '⚖️ Трудовые законы'), h('button.btn.small', { onclick: () => U.go('budget', 'spend') }, '🧾 Пособия'))));
    box.appendChild(card(h('h3', '💵 Зарплаты'), U.histChart(s, ['wageReal'], {})));
  } else if (sub === 'sectors') {
    const c = card(h('h3', '🏭 Отрасли (доля рыночной экономики)', h('span.sp'), U.info('ind.sectors')));
    const vals = D.SECTORS.map(x => e.sec[x.id]);
    c.appendChild(U.columns(vals.map(v => v * 100), D.SECTORS.map(x => x.icon), v => D.fmt(v, 0) + '%', U.COLORS));
    for (const x of D.SECTORS) c.appendChild(kv(x.icon + ' ' + x.name, pct(e.sec[x.id]) + ` (на старте ${pct(s.cfg.eco.sec[x.id])})`));
    c.appendChild(h('p.small.dim.mt', 'Слабая валюта помогает экспортёрам и промышленности; дорогое сырьё укрепляет валюту и душит остальные отрасли («голландская болезнь»); образование и интернет растят IT; кредит — финансы.'));
    box.appendChild(c);
  } else if (sub === 'banks') {
    if (!s.cfg.modules.banks) box.appendChild(h('div.note', 'Модуль банков отключён при создании страны: кредит считается упрощённо.'));
    box.appendChild(card(h('h3', '💳 Кредит и банки', h('span.sp'), U.info('ind.banks')),
      kv('Кредиты экономике', D.money(s, e.L) + ' · ' + pct(e.L / s.ind.gdpNom, 0) + ' ВВП'), kv('Рост кредита (г/г)', pct(D.yoy(s, 'L'))), kv('Ставка по кредитам', pct(e.iL)),
      kv('Ставка по ипотеке', pct(e.iMort)), kv('Плохие кредиты (NPL)', pct(e.npl), e.npl > 0.1 ? 'bad' : ''), kv('Достаточность капитала', pct(e.car), e.car < 0.08 ? 'bad' : 'good'),
      kv('Денежная масса M2', D.money(s, e.M2)), kv('Страхование вкладов', s.pol.laws.depositIns ? 'есть' : 'нет'),
      U.histChart(s, ['npl', 'car'], { labels: ['Плохие кредиты', 'Капитал банков'] })));
  } else if (sub === 'housing') {
    if (!s.cfg.modules.housing) box.appendChild(h('div.note', 'Модуль жилья отключён при создании страны.'));
    box.appendChild(card(h('h3', '🏠 Рынок жилья', h('span.sp'), U.info('ind.housing')),
      kv('Реальные цены (старт = 100)', D.fmt(e.hpi / e.P * 100, 0)), kv('Лет зарплаты на квартиру', D.fmt(s.ind.affordYears, 1), s.ind.affordYears > 10 ? 'bad' : ''),
      kv('Ипотечная ставка', pct(e.iMort)), kv('Цены / доходы к старту', D.fmt(e.hpiRatio || 1, 2), (e.hpiRatio || 1) > 1.4 ? 'warn' : ''), e.houseCrash > 0 ? h('div.note.bad.mt', '🏚️ Идёт обвал цен после пузыря.') : null,
      U.histChart(s, ['hpiReal', 'afford'], { labels: ['Реальные цены', 'Лет зарплаты'] }),
      h('div.row.mt', h('button.btn.small', { onclick: () => U.go('budget', 'spend') }, '🏗️ Соцжильё'), h('button.btn.small', { onclick: () => U.go('regions') }, '🏘️ Стройки в регионах'))));
  } else if (sub === 'trade') {
    const x = s.ext;
    box.appendChild(card(h('h3', '🚢 Внешняя торговля', h('span.sp'), U.info('ind.trade')),
      kv('Экспорт', pct((e.Xn + e.Xr) / e.Y) + ' ВВП'), kv('— из них сырьё', pct(e.Xr / e.Y) + ' ВВП'), kv('Импорт', pct(e.M / e.Y) + ' ВВП'),
      kv('Текущий счёт', pct(e.caUsd / s.ind.gdpUsd), e.caUsd < -0.03 * s.ind.gdpUsd ? 'warn' : ''), kv('Прямые инвестиции', D.usd(e.fdiUsd || 0) + '/год'), kv('Бегство капитала', D.usd(e.flightUsd || 0) + '/год'),
      kv('Курс', D.fmt(e.er, 2) + ' ' + s.cfg.cur.sym + '/$'), kv('Реальный курс (старт = 1)', D.fmt(e.q, 2)), kv('Равновесный курс', D.fmt(e.erEq, 2)),
      kv('Резервы', D.usd(x.res) + ' · ' + D.fmt(x.resMonths, 1) + ' мес.'), kv('Режим курса', D.CB_REGIMES.find(r => r.id === s.pol.cb.regime).name),
      U.histChart(s, ['er'], {}), h('div.row.mt', h('button.btn.small', { onclick: () => U.go('world') }, '🌍 Партнёры и санкции'))));
  }
  return box;
};

// ---------- БЮДЖЕТ ----------
const BUD_SUBS = [{ id: 'sum', name: 'Сводка', icon: '📊' }, { id: 'tax', name: 'Налоги', icon: '💰' }, { id: 'spend', name: 'Расходы', icon: '🧾' }, { id: 'debt', name: 'Долг и финансы', icon: '💳' }, { id: 'who', name: 'Кто платит', icon: '👛' }];
U.TABS.budget = function (s) {
  const sub = cur('budget', BUD_SUBS);
  const box = h('div', subTabs('budget', BUD_SUBS));
  const f = s.fis, G = s.ind.gdpNom, g = s.gov;
  const kv = (k, v, cls) => h('div.row.between', { style: 'padding:3px 0' }, h('span.dim.small', k), h('b.small' + (cls ? '.' + cls : ''), v));
  if (sub === 'sum') {
    box.appendChild(h('div.card', h('h3', '📊 Бюджет страны', h('span.sp'), U.info('fis.budget')),
      kv('Доходы', `${D.money(s, f.totalRev)} · ${pct(f.totalRev / G)} ВВП`), kv('Расходы', `${D.money(s, f.totalExp)} · ${pct(f.totalExp / G)} ВВП`),
      kv(f.deficit > 0 ? 'Дефицит' : 'Профицит', pct(Math.abs(f.deficit) / G) + ' ВВП', f.deficit / G > 0.03 ? 'bad' : 'good'), kv('Первичный баланс', D.spct(-f.primary / G)),
      kv('Госдолг', pct(g.debtGdp, 0) + ' ВВП', g.debtGdp > 0.9 ? 'bad' : ''), kv('Кредитный рейтинг', g.rating, ['AAA', 'AA', 'A', 'BBB'].includes(g.rating) ? 'good' : 'warn'),
      kv('Налоговая нагрузка', pct(f.taxBurden) + ' ВВП'), f.toFund > 0 ? kv('Отложено в фонд', D.money(s, f.toFund) + '/год') : null,
      U.histChart(s, ['rev', 'exp'], { labels: ['Доходы', 'Расходы'], years: 15 })));
    const revItems = D.TAXES.map(t => ({ label: t.short, v: (f.rev[t.id] || 0) / G })).filter(x => x.v > 0.001).sort((a, b) => b.v - a.v);
    revItems.push({ label: 'Неналоговые', v: f.nontax / G });
    box.appendChild(h('div.card', h('h3', '💰 Откуда деньги (% ВВП)'), U.barsChart(revItems, v => pct(v))));
    const expItems = [...D.SPEND.map(x => ({ label: x.name.split(' (')[0], v: (f.eff[x.id] || 0) / G })), { label: 'Проценты по долгу', v: (f.eff.interest || 0) / G, color: 'var(--bad)' }, { label: 'Нацпроекты', v: (f.eff.projects || 0) / G }].filter(x => x.v > 0.001).sort((a, b) => b.v - a.v);
    box.appendChild(h('div.card', h('h3', '🧾 Куда деньги (% ВВП)'), U.barsChart(expItems.map(x => Object.assign({ color: x.color || 'var(--blue)' }, x)), v => pct(v))));
    // Почему налоги высокие.
    const why = h('div.card', h('h3', '🤔 Почему налоги такие', h('span.sp'), U.info('fis.whytax')));
    const pens = (f.eff.pensions || 0) / G, intr = (f.eff.interest || 0) / G, soc = ((f.eff.unemp || 0) + (f.eff.child || 0) + (f.eff.assist || 0) + (f.eff.social_other || 0)) / G;
    why.append(
      h('p.small', `• Пенсии — ${pct(pens)} ВВП: на одного работающего приходится ${D.fmt(s.pop.elderly / Math.max(1, s.e.E), 2)} пенсионера. С возрастом страны эта нагрузка растёт.`),
      h('p.small', `• Проценты по долгу — ${pct(intr)} ВВП: плата за решения прошлых правительств.`),
      h('p.small', `• Социальные выплаты — ${pct(soc)} ВВП, здравоохранение и образование — ${pct(((f.eff.health || 0) + (f.eff.school || 0) + (f.eff.univ || 0)) / G)} ВВП.`),
      h('p.small', `• Теневая экономика — ${pct(s.inst.shadow, 0)}: те, кто в тени, не платят — платящим приходится платить больше.`),
      h('p.small', `• Коррупция (${D.fmt(s.inst.corr, 0)}) съедает часть расходов: эффективность трат ${pct(f.effSpend, 0)}.`),
      h('p.small.dim', 'Налоги — цена общественных благ, которые рынок сам не создаст: армия, суды, дороги, медицина, образование, пенсии. Высокие налоги оправданы, если услуги качественные (Скандинавия), и разрушительны, если деньги уходят в коррупцию и долги.'));
    box.appendChild(why);
  } else if (sub === 'tax') box.appendChild(U.taxPanel(U.polModel(s), s));
  else if (sub === 'spend') box.appendChild(U.spendPanel(U.polModel(s), s));
  else if (sub === 'debt') {
    box.appendChild(h('div.card', h('h3', '💳 Госдолг', h('span.sp'), U.info('fis.debt')),
      kv('Весь долг', D.money(s, g.debtAll) + ' · ' + pct(g.debtGdp, 0) + ' ВВП'), kv('Внутренний', D.money(s, g.debtD)), kv('Внешний (в валюте)', D.usd(g.debtF) + ' ≈ ' + D.money(s, g.debtF * s.e.er)),
      kv('Долги регионов', D.money(s, g.regDebt)), kv('Ставка по внутреннему долгу', pct(g.rDeff)), kv('Ставка по внешнему', pct(g.rFeff)),
      kv('Премия за риск (спред)', pct(g.spread)), kv('Рейтинг', g.rating), kv('Доступ к рынкам', g.marketAccess ? 'есть' : 'ЗАКРЫТ', g.marketAccess ? 'good' : 'bad'),
      kv('Фонд благосостояния', D.usd(g.fund) + ' · ' + pct(g.fund * s.e.er / G) + ' ВВП'), g.imf ? h('div.note.warn.mt', `🏦 Программа МВФ до ${D.dateStr(s, g.imf.deadline)}: дефицит ≤ 3% ВВП, без топливных субсидий.`) : null,
      U.histChart(s, ['debt'], { band: { lo: 0, hi: 0.6 } }), U.histChart(s, ['interest', 'spread'], { labels: ['Проценты, % ВВП', 'Спред'] })));
    box.appendChild(U.finPanel(U.polModel(s), s));
    if (!g.marketAccess && !g.imf) box.appendChild(h('button.btn.block.primary', { onclick: async () => { if (await U.confirm({ title: 'Обратиться в МВФ?', icon: '🏦', text: 'Кредит 5% ВВП. Условия: дефицит не выше 3% ВВП через 2 года, отмена топливных субсидий, независимый ЦБ. Невыполнение условий ударит по рейтингу.', ok: 'Обратиться' })) { D.startIMF(s); U.refresh(); } } }, '🏦 Обратиться в МВФ'));
  } else if (sub === 'who') {
    const d = s.dist;
    const c = h('div.card', h('h3', '👛 Кто сколько платит и получает', h('span.sp'), U.info('fis.incidence')));
    c.appendChild(h('p.small.dim', 'Население разбито на 10 равных групп (децилей) — от самых бедных (1) до самых богатых (10). Показано на человека в месяц.'));
    const perCap = s.popTotal / 10 / 12;
    const rows = h('table.t', h('tr', h('th', 'Дециль'), h('th', 'Рыночный доход'), h('th', 'Налоги'), h('th', 'Выплаты'), h('th', 'На руки')));
    for (let i = 0; i < 10; i++) rows.appendChild(h('tr', h('td', String(i + 1)), h('td', D.big(d.mkt[i] / perCap)), h('td.bad', '−' + D.big(d.taxes[i] / perCap)), h('td.good', '+' + D.big(d.trans[i] / perCap)), h('td', h('b', D.big(d.disp[i] / perCap)))));
    c.appendChild(rows);
    c.appendChild(h('p.small.mt', `Ставка НДФЛ: у бедных ${pct(d.pitRates[0])}, у середины ${pct(d.pitRates[4])}, у богатых ${pct(d.pitRates[9])}. НДС и акцизы бедные тратят почти целиком, поэтому налоги на потребление бьют по ним сильнее (регрессивны).`));
    c.appendChild(h('p.small', `Джини до налогов и выплат ${D.fmt(d.giniMkt, 2)} → после ${D.fmt(d.gini, 2)}. Медианный доход ${D.money(s, d.median)} в месяц, бедность ${pct(d.povertyAbs)} (ниже прожиточного минимума ${D.money(s, s.ind.povLine)}).`));
    box.appendChild(c);
    box.appendChild(h('div.card', h('h3', '📊 Располагаемый доход по децилям'), U.columns(d.dispPC, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], v => D.big(v), ['#6cb4ff'])));
  }
  return box;
};
})();
