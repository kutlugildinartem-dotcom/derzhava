'use strict';
// Оркестратор: месячный шаг, ход (1/3/12 месяцев), история, отчёты по итогам хода.
(function () {
const D = globalThis.D;

// Ряды истории для графиков. fmt: pct — проценты, num — число, money — деньги,
// usd — доллары, people — люди, idx — индекс, x — множитель.
D.HIST = [
  // экономика
  { id: 'growth', cat: 'eco', name: 'Рост реального ВВП (г/г)', fmt: 'pct', f: s => s.e.growthY },
  { id: 'gdpReal', cat: 'eco', name: 'Реальный ВВП', fmt: 'money', f: s => s.e.Y },
  { id: 'gdpPot', cat: 'eco', name: 'Потенциальный ВВП', fmt: 'money', f: s => s.e.Ystar },
  { id: 'gdpNom', cat: 'eco', name: 'Номинальный ВВП', fmt: 'money', f: s => s.ind.gdpNom },
  { id: 'gdppc', cat: 'eco', name: 'ВВП на душу, $', fmt: 'usd', f: s => s.ind.gdppc },
  { id: 'gdppcPPP', cat: 'eco', name: 'ВВП на душу по ППС, $', fmt: 'usd', f: s => s.ind.gdppcPPP },
  { id: 'gap', cat: 'eco', name: 'Разрыв выпуска', fmt: 'pct', f: s => s.e.gap },
  { id: 'infl', cat: 'eco', name: 'Инфляция (г/г)', fmt: 'pct', f: s => s.e.pi12 },
  { id: 'pie', cat: 'eco', name: 'Инфляционные ожидания', fmt: 'pct', f: s => s.e.pie },
  { id: 'rate', cat: 'eco', name: 'Ключевая ставка', fmt: 'pct', f: s => s.e.i },
  { id: 'rateReal', cat: 'eco', name: 'Реальная ставка', fmt: 'pct', f: s => s.e.i - s.e.pie },
  { id: 'er', cat: 'eco', name: 'Курс к доллару', fmt: 'num2', f: s => s.e.er },
  { id: 'unemp', cat: 'eco', name: 'Безработица', fmt: 'pct', f: s => s.e.u },
  { id: 'unat', cat: 'eco', name: 'Естественная безработица', fmt: 'pct', f: s => s.e.un },
  { id: 'wage', cat: 'eco', name: 'Средняя зарплата (номинальная)', fmt: 'money', f: s => s.e.W },
  { id: 'wageReal', cat: 'eco', name: 'Реальная зарплата (в ценах старта)', fmt: 'money', f: s => s.e.W / s.e.P },
  { id: 'cpi', cat: 'eco', name: 'Индекс цен (старт = 100)', fmt: 'num', f: s => s.e.P * 100 },
  { id: 'invShare', cat: 'eco', name: 'Инвестиции, % ВВП', fmt: 'pct', f: s => s.e.I / s.e.Y },
  { id: 'consShare', cat: 'eco', name: 'Потребление, % ВВП', fmt: 'pct', f: s => s.e.C / s.e.Y },
  { id: 'ca', cat: 'eco', name: 'Текущий счёт, % ВВП', fmt: 'pct', f: s => s.e.caUsd / s.ind.gdpUsd },
  { id: 'res', cat: 'eco', name: 'Резервы, месяцев импорта', fmt: 'num1', f: s => s.ext.resMonths },
  { id: 'credit', cat: 'eco', name: 'Кредиты, % ВВП', fmt: 'pct', f: s => s.e.L / s.ind.gdpNom },
  { id: 'npl', cat: 'eco', name: 'Плохие кредиты', fmt: 'pct', f: s => s.e.npl },
  { id: 'car', cat: 'eco', name: 'Достаточность капитала банков', fmt: 'pct', f: s => s.e.car },
  { id: 'hpiReal', cat: 'eco', name: 'Реальные цены жилья (старт = 100)', fmt: 'num', f: s => s.e.hpi / s.e.P * 100 },
  { id: 'afford', cat: 'eco', name: 'Лет зарплаты на квартиру', fmt: 'num1', f: s => s.ind.affordYears },
  { id: 'oil', cat: 'eco', name: 'Нефть, $/барр.', fmt: 'num', f: s => s.w.oil },
  { id: 'tfp', cat: 'eco', name: 'Рост производительности (TFP)', fmt: 'pct', f: s => s.e.gA },
  { id: 'shortage', cat: 'eco', name: 'Дефицит товаров', fmt: 'pct', f: s => s.e.shortage },
  { id: 'conf', cat: 'eco', name: 'Уверенность бизнеса', fmt: 'num2', f: s => s.e.conf },
  // бюджет
  { id: 'rev', cat: 'fis', name: 'Доходы бюджета, % ВВП', fmt: 'pct', f: s => s.fis.totalRev / s.ind.gdpNom },
  { id: 'exp', cat: 'fis', name: 'Расходы бюджета, % ВВП', fmt: 'pct', f: s => s.fis.totalExp / s.ind.gdpNom },
  { id: 'deficit', cat: 'fis', name: 'Дефицит (−) / профицит (+), % ВВП', fmt: 'pct', f: s => -s.fis.deficit / s.ind.gdpNom },
  { id: 'debt', cat: 'fis', name: 'Госдолг, % ВВП', fmt: 'pct', f: s => s.gov.debtGdp },
  { id: 'interest', cat: 'fis', name: 'Проценты по долгу, % ВВП', fmt: 'pct', f: s => (s.fis.exp.interest || 0) / s.ind.gdpNom },
  { id: 'taxBurden', cat: 'fis', name: 'Налоговая нагрузка, % ВВП', fmt: 'pct', f: s => s.fis.taxBurden },
  { id: 'spread', cat: 'fis', name: 'Премия за риск страны', fmt: 'pct', f: s => s.gov.spread },
  { id: 'fund', cat: 'fis', name: 'Фонд благосостояния, % ВВП', fmt: 'pct', f: s => s.gov.fund * s.e.er / s.ind.gdpNom },
  // общество
  { id: 'pop', cat: 'soc', name: 'Население', fmt: 'people', f: s => s.popTotal },
  { id: 'le', cat: 'soc', name: 'Продолжительность жизни', fmt: 'num1', f: s => s.pop.le },
  { id: 'tfr', cat: 'soc', name: 'Рождаемость (детей на женщину)', fmt: 'num2', f: s => s.pop.tfr },
  { id: 'births', cat: 'soc', name: 'Рождений в год', fmt: 'people', f: s => s.pop.births * 12 },
  { id: 'deaths', cat: 'soc', name: 'Смертей в год', fmt: 'people', f: s => s.pop.deaths * 12 },
  { id: 'emig', cat: 'soc', name: 'Эмиграция в год', fmt: 'people', f: s => s.pop.emig * 12 },
  { id: 'immig', cat: 'soc', name: 'Иммиграция в год', fmt: 'people', f: s => s.pop.immig * 12 },
  { id: 'median', cat: 'soc', name: 'Медианный возраст', fmt: 'num1', f: s => s.pop.median },
  { id: 'dependency', cat: 'soc', name: 'Нагрузка на работающих', fmt: 'num2', f: s => s.pop.dependency },
  { id: 'gini', cat: 'soc', name: 'Неравенство (Джини)', fmt: 'num2', f: s => s.dist.gini },
  { id: 'poverty', cat: 'soc', name: 'Бедность (ниже прожиточного)', fmt: 'pct', f: s => s.dist.povertyAbs },
  { id: 'povertyRel', cat: 'soc', name: 'Относительная бедность (<50% медианы)', fmt: 'pct', f: s => s.dist.poverty },
  { id: 'happy', cat: 'soc', name: 'Счастье (0–10)', fmt: 'num1', f: s => s.ind.happy },
  { id: 'hdi', cat: 'soc', name: 'ИЧР', fmt: 'num3', f: s => s.ind.hdi },
  { id: 'qHealth', cat: 'soc', name: 'Качество медицины', fmt: 'num', f: s => s.e.qHealth },
  { id: 'qEdu', cat: 'soc', name: 'Качество образования', fmt: 'num', f: s => s.e.qEdu },
  { id: 'infra', cat: 'soc', name: 'Инфраструктура', fmt: 'num', f: s => s.ind.infra },
  { id: 'crime', cat: 'soc', name: 'Преступность', fmt: 'num', f: s => s.inst.crime },
  { id: 'pollution', cat: 'soc', name: 'Загрязнение', fmt: 'num', f: s => s.inst.pollution },
  // власть
  { id: 'approval', cat: 'pol', name: 'Рейтинг власти', fmt: 'num', f: s => s.polit.approval },
  { id: 'protest', cat: 'pol', name: 'Протесты', fmt: 'pct', f: s => s.polit.protest },
  { id: 'corr', cat: 'pol', name: 'Коррупция', fmt: 'num', f: s => s.inst.corr },
  { id: 'shadow', cat: 'pol', name: 'Теневая экономика', fmt: 'pct', f: s => s.inst.shadow },
  { id: 'rol', cat: 'pol', name: 'Верховенство права', fmt: 'num', f: s => s.inst.rol },
  { id: 'freedom', cat: 'pol', name: 'Свободы', fmt: 'num', f: s => s.inst.freedom },
  { id: 'trust', cat: 'pol', name: 'Доверие к власти', fmt: 'num', f: s => s.inst.trust },
];
for (const g of D.GROUPS) D.HIST.push({ id: 'g_' + g.id, cat: 'grp', name: 'Настроение: ' + g.name, fmt: 'num', f: s => s.groups[g.id].mood });
D.HISTBY = {};
for (const h of D.HIST) D.HISTBY[h.id] = h;

D.recordHistory = function (s) {
  for (const h of D.HIST) {
    const a = s.hist[h.id] || (s.hist[h.id] = []);
    let v = h.f(s);
    if (!isFinite(v)) v = 0;
    a.push(+v.toPrecision(6));
  }
};

D.fmtVal = function (s, id, v) {
  const h = D.HISTBY[id], f = h ? h.fmt : 'num';
  switch (f) {
    case 'pct': return D.pct(v);
    case 'money': return D.money(s, v);
    case 'usd': return D.usd(v, 0);
    case 'people': return D.people(v);
    case 'num1': return D.fmt(v, 1);
    case 'num2': return D.fmt(v, 2);
    case 'num3': return D.fmt(v, 3);
    default: return D.fmt(v, 0);
  }
};

// Изменения ставок налогов на потребление отражаются в ценах (почти полностью).
function taxPriceShock(s) {
  const pt = s.prevTax, tx = s.pol.tax, w = s.c0.cpiW;
  if (!pt) { s.prevTax = Object.assign({}, tx); return; }
  const d = r => Math.log(1 + r);
  let dl = 0;
  dl += (1 - w.food) * (d(tx.vat) - d(pt.vat)) + w.food * (d(tx.vat_red) - d(pt.vat_red));
  dl += d(tx.sales) - d(pt.sales);
  dl += 0.025 * (d(tx.exc_alc) - d(pt.exc_alc)) + 0.012 * (d(tx.exc_tob) - d(pt.exc_tob)) + 0.06 * (d(tx.exc_fuel) - d(pt.exc_fuel));
  dl += 0.03 * (d(tx.luxury) - d(pt.luxury)) + 0.004 * (tx.carbon - pt.carbon) / 100;
  dl += s.c0.mShare * 0.5 * (d(tx.tariff) - d(pt.tariff));
  if (Math.abs(dl) > 1e-6) for (let i = 0; i < 3; i++) s.e.taxPipe[i] += dl * 0.9 / 3;
  s.prevTax = Object.assign({}, tx);
}

D.stepMonth = function (s) {
  s.popTotal = s.popTotal || D.sum(s.regions.map(r => r.pop));
  // Законы, срок вступления которых наступил.
  if (s.pendingLaws && s.pendingLaws.length) {
    for (const p of s.pendingLaws.filter(x => s.t >= x.t)) {
      s.pol.laws[p.id] = p.opt;
      const L = D.LAW[p.id];
      D.logEvent(s, 'politics', `✅ Вступил в силу: ${L.name}`, `Теперь действует вариант «${L.opts[p.opt].label}».`, { kb: 'law.' + p.id });
    }
    s.pendingLaws = s.pendingLaws.filter(x => s.t < x.t);
  }
  D.computeMods(s);
  taxPriceShock(s);
  D.stepWorld(s);
  D.stepForeign(s);
  D.stepDemography(s);
  D.stepEconomy(s);
  D.stepFiscal(s);
  D.stepSocial(s);
  D.stepEvents(s);
  if (D.stepTasks) D.stepTasks(s);
  if (D.stepProjects) D.stepProjects(s);
  const e = s.e;
  const pushes = { P: e.P, Y: e.Y, Ystar: e.Ystar, Ynstar: e.Ynstar, W: e.W, er: e.er, M2: e.M2, L: e.L, gdpNom: s.ind.gdpNom, hpi: e.hpi, LF: e.LF, E: e.E, iMort: e.iMort, realInc: s.fis.YDnom / e.P / s.popTotal };
  for (const k in pushes) D.bufPush(s, k, pushes[k]);
  // Накопители хода.
  const a = s.acc;
  if (a) {
    a.months++; a.births += s.pop.births; a.deaths += s.pop.deaths; a.emig += s.pop.emig; a.immig += s.pop.immig;
    for (const k in e.piParts) a.pi[k] = (a.pi[k] || 0) + e.piParts[k];
    a.deficit += s.fis.deficit / 12;
  }
  D.recordHistory(s);
  s.t++;
  const L = s.cfg.lengthYears;
  if (L > 0 && s.t >= L * 12 && !s.over) D.gameOver(s, 'finish');
};

// Ключевые показатели для сравнения «до/после хода».
D.KEY = [
  { id: 'growth', name: 'Рост ВВП', good: 1, norm: [0.02, 0.05] },
  { id: 'infl', name: 'Инфляция', good: -1, norm: [0.01, 0.04] },
  { id: 'unemp', name: 'Безработица', good: -1, norm: [0.02, 0.06] },
  { id: 'wageReal', name: 'Реальная зарплата', good: 1, rel: true },
  { id: 'rate', name: 'Ключевая ставка', good: 0 },
  { id: 'er', name: 'Курс к $', good: 0 },
  { id: 'deficit', name: 'Баланс бюджета', good: 1, norm: [-0.03, 0.02] },
  { id: 'debt', name: 'Госдолг', good: -1, norm: [0, 0.6] },
  { id: 'approval', name: 'Рейтинг власти', good: 1, norm: [50, 100] },
  { id: 'pop', name: 'Население', good: 1, rel: true },
  { id: 'le', name: 'Продолжительность жизни', good: 1 },
  { id: 'tfr', name: 'Рождаемость', good: 1, norm: [2.1, 3] },
  { id: 'gini', name: 'Неравенство', good: -1, norm: [0.24, 0.32] },
  { id: 'poverty', name: 'Бедность', good: -1, norm: [0, 0.1] },
  { id: 'happy', name: 'Счастье', good: 1 },
  { id: 'corr', name: 'Коррупция', good: -1, norm: [0, 30] },
  { id: 'crime', name: 'Преступность', good: -1 },
  { id: 'res', name: 'Резервы (мес. импорта)', good: 1, norm: [3, 99] },
];

D.keyVals = function (s) {
  const v = {};
  for (const k of D.KEY) v[k.id] = D.HISTBY[k.id].f(s);
  v.Y = s.e.Y; v.C = s.e.C; v.I = s.e.I; v.G = s.e.G; v.NX = s.e.Xn + s.e.Xr - s.e.M; v.P = s.e.P;
  return v;
};

D.startTurn = function (s) {
  s.turnLog = [];
  s.acc = { months: 0, births: 0, deaths: 0, emig: 0, immig: 0, pi: {}, deficit: 0, t0: s.t, start: D.keyVals(s) };
};

D.endTurn = function (s) {
  const a = s.acc, st = a.start, en = D.keyVals(s);
  const rows = D.KEY.map(k => ({ id: k.id, name: k.name, good: k.good, norm: k.norm, rel: k.rel, a: st[k.id], b: en[k.id] }));
  const dY = en.Y - st.Y;
  const contrib = { C: (en.C - st.C) / st.Y, I: (en.I - st.I) / st.Y, G: (en.G - st.G) / st.Y, NX: (en.NX - st.NX) / st.Y, total: dY / st.Y };
  const pi = {};
  for (const k in a.pi) pi[k] = a.pi[k] / Math.max(1, a.months);
  return {
    t0: a.t0, t1: s.t, months: a.months, rows, contrib, pi, priceGrowth: en.P / st.P - 1,
    births: a.births, deaths: a.deaths, emig: a.emig, immig: a.immig, deficit: a.deficit,
    events: s.turnLog.slice(),
  };
};

// Сыграть ход: до months месяцев, остановиться раньше, если нужно решение по событию.
D.playTurn = function (s, months) {
  D.startTurn(s);
  for (let i = 0; i < months; i++) {
    D.stepMonth(s);
    if (s.over || s.pending.length) break;
  }
  return D.endTurn(s);
};
})();
