'use strict';
// Конфигурация страны перед стартом партии: значения по умолчанию, пресеты реальных
// стран (целиком или по разделам) и случайная генерация по архетипам.
(function () {
const D = globalThis.D;

D.SECTORS = [
  { id: 'agr', name: 'Сельское хозяйство', icon: '🌾' },
  { id: 'mining', name: 'Добыча сырья', icon: '⛏️' },
  { id: 'manuf', name: 'Обрабатывающая промышленность', icon: '🏭' },
  { id: 'constr', name: 'Строительство', icon: '🏗️' },
  { id: 'trade', name: 'Торговля и логистика', icon: '🛒' },
  { id: 'serv', name: 'Услуги', icon: '💇' },
  { id: 'it', name: 'IT и связь', icon: '💻' },
  { id: 'fin', name: 'Финансы', icon: '🏦' },
];
D.RESOURCES = [
  { id: 'oil', name: 'Нефть', icon: '🛢️' },
  { id: 'gas', name: 'Природный газ', icon: '🔥' },
  { id: 'metals', name: 'Металлы и руды', icon: '⛏️' },
  { id: 'coal', name: 'Уголь', icon: '⚫' },
  { id: 'wood', name: 'Лес', icon: '🌲' },
  { id: 'farmland', name: 'Плодородные земли', icon: '🌾' },
  { id: 'water', name: 'Пресная вода', icon: '💧' },
  { id: 'rare', name: 'Редкоземельные металлы', icon: '💠' },
];
D.CLIMATES = [
  { id: 'cold', name: 'Холодный' }, { id: 'temperate', name: 'Умеренный' }, { id: 'warm', name: 'Тёплый' },
  { id: 'hot', name: 'Жаркий, тропический' }, { id: 'arid', name: 'Засушливый' },
];
D.DIFFICULTIES = [
  { id: 'easy', name: 'Лёгкий', desc: 'Народ терпелив, рынки прощают ошибки, кризисы редкие и мягкие.' },
  { id: 'normal', name: 'Нормальный', desc: 'Сбалансированная игра: реальные связи, умеренная случайность.' },
  { id: 'hard', name: 'Сложный', desc: 'Кризисы чаще и глубже, инвесторы нервные, народ требовательный.' },
  { id: 'real', name: 'Реализм', desc: 'Жёсткая случайность мировой экономики, долгие лаги, никаких поблажек.' },
];
D.DIFF = { easy: { shock: 0.5, mood: 6, market: 0.7, events: 0.6 }, normal: { shock: 1, mood: 0, market: 1, events: 1 }, hard: { shock: 1.4, mood: -5, market: 1.3, events: 1.4 }, real: { shock: 1.7, mood: -8, market: 1.5, events: 1.6 } };
D.CB_REGIMES = [
  { id: 'float', name: 'Плавающий курс' },
  { id: 'managed', name: 'Управляемый курс' },
  { id: 'peg', name: 'Фиксированный курс (привязка к $)' },
  { id: 'union', name: 'Чужая валюта / валютный союз' },
];

// Базовая «средняя» страна: развивающаяся, умеренные налоги. От неё отталкиваются
// случайная генерация и пресеты (недостающие поля берутся отсюда).
D.defaultConfig = function () {
  const cfg = {
    name: 'Велория', capital: 'Новоград', partyName: 'Партия «Созидание»',
    flag: { layout: 'h3', colors: ['#ffffff', '#0033a0', '#c8102e'], emblem: '' },
    regime: 'pres', system: 'social',
    cur: { name: 'крона', sym: 'кр', code: 'VLK', rate: 40 },
    difficulty: 'normal', lengthYears: 20, startYear: 2026,
    modules: { banks: true, housing: true, military: true, events: true },
    geo: { area: 400, climate: 'temperate', coast: 1, regions: 0 },
    res: { oil: 30, gas: 25, metals: 35, coal: 25, wood: 40, farmland: 50, water: 50, rare: 10 },
    demo: { pop: 20, tfr: 1.7, le: 74, urban: 0.7, median: 36, edu: 11, lfpr: 0.72, immig: 0.04 },
    eco: { gdppc: 12000, growth: 0.025, infl: 0.05, unemp: 0.06, debt: 0.45, reserves: 5, open: 0.6, invest: 0.22, state: 0.2, shadow: 0.2, corr: 50, gini: 0.34, rate: 0.07, credit: 0.6, house: 8, extDebt: 0.25, fund: 0, defaults: 0,
      sec: { agr: 0.06, mining: 0.06, manuf: 0.16, constr: 0.06, trade: 0.14, serv: 0.4, it: 0.05, fin: 0.05 } },
    tax: {}, pitMode: 'flat', pit: D.defaultBrackets().map(b => [b.from, b.rate]), taxFree: 0,
    splits: {},
    spend: {},
    pension: { repl: 0.4, age: 63 }, unemp: { repl: 0.4, months: 6 }, child: 0.03, gmi: 0.2, ubi: 0, publicWage: 0.95,
    laws: {},
    cb: { independent: true, target: 0.04, regime: 'float' },
    fin: { foreign: 0.2, monetize: 0 },
    regional: { transfer: 0.15, equal: 0.5 },
    world: { sanctions: 0 },
  };
  for (const t of D.TAXES) cfg.tax[t.id] = t.def;
  for (const x of D.SPEND_DISC) cfg.spend[x.id] = x.def;
  for (const l of D.LAWS) cfg.laws[l.id] = l.def;
  return cfg;
};

// Разделы конструктора, которые можно брать у реальных стран по отдельности.
D.CFG_SECTIONS = [
  { id: 'politics', name: 'Власть и строй', keys: ['regime', 'system'] },
  { id: 'currency', name: 'Валюта и ЦБ', keys: ['cur', 'cb'] },
  { id: 'geo', name: 'География и ресурсы', keys: ['geo', 'res'] },
  { id: 'demo', name: 'Население', keys: ['demo'] },
  { id: 'eco', name: 'Экономика', keys: ['eco'] },
  { id: 'tax', name: 'Налоги', keys: ['tax', 'pit', 'pitMode'] },
  { id: 'spend', name: 'Бюджет и соцполитика', keys: ['spend', 'pension', 'unemp', 'child', 'gmi', 'publicWage'] },
  { id: 'laws', name: 'Законы и институты', keys: ['laws'] },
];

// Применить раздел пресета к конфигу.
D.applyCountry = function (cfg, id, sectionIds) {
  const c = D.COUNTRY[id]; if (!c) return cfg;
  const all = !sectionIds;
  const want = sid => all || sectionIds.includes(sid);
  if (want('politics')) { cfg.regime = c.regime; cfg.system = c.system; }
  if (all && D.PRESET_FLAGS[c.id]) cfg.flag = D.clone(D.PRESET_FLAGS[c.id]);
  if (want('currency')) {
    cfg.cur = Object.assign({}, c.cur);
    cfg.cb = Object.assign({ independent: true, target: 0.03, regime: 'float' }, c.cb);
    if (c.cur.union) cfg.cb.regime = 'union';
  }
  if (want('geo')) { cfg.geo = Object.assign({ regions: 0 }, c.geo); cfg.res = Object.assign({}, c.res); }
  if (want('demo')) cfg.demo = Object.assign({}, c.demo);
  if (want('eco')) {
    cfg.eco = Object.assign(D.defaultConfig().eco, c.eco);
    cfg.eco.sec = Object.assign({}, c.eco.sec);
    if (c.world) cfg.world = Object.assign({}, c.world);
  }
  if (want('tax')) {
    const base = D.defaultConfig().tax;
    for (const t of D.TAXES) cfg.tax[t.id] = c.tax[t.id] !== undefined ? c.tax[t.id] : (t.id === 'vat_red' ? (c.tax.vat || 0) : base[t.id] * (['sales', 'luxury', 'windfall', 'wealth', 'fintx', 'digital', 'carbon', 'export', 'inherit'].includes(t.id) ? 0 : 1));
    cfg.pit = c.pit.map(b => b.slice());
    const flat = c.pit.every(b => b[1] === c.pit[0][1]);
    cfg.pitMode = flat ? 'flat' : 'prog';
    cfg.tax.pit = flat ? c.pit[0][1] : c.tax.pit;
  }
  if (want('spend')) {
    for (const x of D.SPEND_DISC) cfg.spend[x.id] = c.spend[x.id] !== undefined ? c.spend[x.id] : 0;
    cfg.pension = Object.assign({}, c.pension); cfg.unemp = Object.assign({}, c.unemp);
    cfg.child = c.child; cfg.gmi = c.gmi; cfg.publicWage = Math.min(1.6, c.publicWage);
  }
  if (want('laws')) {
    for (const l of D.LAWS) cfg.laws[l.id] = c.laws[l.id] !== undefined ? c.laws[l.id] : l.def;
  }
  if (all) {
    cfg.name = c.name; cfg.startYear = c.year;
    cfg.fromCountry = c.id;
    cfg.revTarget = D.REAL_REV[c.id] || 0;
    cfg.expTarget = D.REAL_EXP[c.id] || 0;
  } else if (sectionIds.some(x => ['tax', 'spend', 'eco'].includes(x))) { cfg.revTarget = 0; cfg.expTarget = 0; }
  return cfg;
};

// Применить экономическую систему: стартовые налоги и расходы «в её духе».
D.applySystem = function (cfg, sysId) {
  const sys = D.SYSTEM[sysId]; if (!sys) return;
  cfg.system = sysId;
  Object.assign(cfg.tax, sys.tax);
  Object.assign(cfg.spend, sys.spend);
  cfg.pension.repl = sys.pension;
  cfg.eco.state = sys.stateShare;
  if (sysId === 'planned') { cfg.laws.priceControl = 3; cfg.laws.antimonopoly = 0; cfg.laws.capitalControls = 2; cfg.cb.independent = false; cfg.cb.regime = 'peg'; cfg.unemp.repl = 0; }
  if (sysId === 'laissez') { cfg.laws.minWage = 0; cfg.laws.regulation = 0; cfg.laws.priceControl = 0; cfg.laws.laborProt = 0; cfg.gmi = 0.05; cfg.child = 0; }
  if (sysId === 'nordic') { cfg.laws.unions = 2; cfg.laws.freeUniv = 2; cfg.laws.anticorr = 2; cfg.laws.egov = 2; cfg.gmi = 0.3; cfg.pitMode = 'prog'; }
};

// ---------- случайная страна ----------
D.ARCHETYPES = [
  { id: 'random', name: 'Полностью случайная', icon: '🎲' },
  { id: 'poorAgr', name: 'Бедная аграрная страна', icon: '🌾' },
  { id: 'resource', name: 'Сырьевая держава', icon: '🛢️' },
  { id: 'industrial', name: 'Индустриальная страна', icon: '🏭' },
  { id: 'developed', name: 'Развитая постиндустриальная', icon: '🏙️' },
  { id: 'island', name: 'Маленькое островное государство', icon: '🏝️' },
  { id: 'postsoviet', name: 'Постсоветская страна', icon: '🏚️' },
  { id: 'newborn', name: 'Только что родившееся государство', icon: '🌱' },
];

D.randomConfig = function (seed, archetype) {
  const r = D.tmpRng(seed);
  const R = (a, b) => D.range(r, a, b);
  const cfg = D.defaultConfig();
  let arch = archetype || 'random';
  if (arch === 'random') arch = D.pick(r, D.ARCHETYPES.slice(1)).id;
  cfg.archetype = arch;
  cfg.name = D.randomCountryName(r);
  cfg.capital = D.randomCapital(r);
  cfg.flag = D.randomFlag(r);
  const curNames = [['крона', 'кр'], ['талер', 'тл'], ['динар', 'дн'], ['лира', 'л'], ['марка', 'мк'], ['флорин', 'фл'], ['гривна', 'гр'], ['дукат', 'дк'], ['злат', 'зл'], ['лев', 'лв']];
  const cn = D.pick(r, curNames);
  cfg.cur = { name: cn[0], sym: cn[1], code: (cfg.name.slice(0, 2) + cn[0][0]).toUpperCase(), rate: Math.round(Math.exp(R(Math.log(1.5), Math.log(900)))) };
  cfg.geo.climate = D.pick(r, D.CLIMATES).id;
  cfg.geo.coast = D.chance(r, 0.8) ? 1 : 0;
  for (const res of D.RESOURCES) cfg.res[res.id] = Math.round(R(0, 70));
  const e = cfg.eco, d = cfg.demo;
  const set = (o, k, a, b, dig = 3) => { o[k] = +R(a, b).toFixed(dig); };
  switch (arch) {
    case 'poorAgr':
      set(e, 'gdppc', 800, 3500, 0); set(d, 'tfr', 3, 5.5, 2); set(d, 'le', 55, 68, 1); set(d, 'median', 17, 24, 0); set(d, 'urban', 0.25, 0.5, 2); set(d, 'edu', 4, 8, 1);
      set(e, 'corr', 60, 85, 0); set(e, 'shadow', 0.35, 0.55); set(e, 'gini', 0.36, 0.5); set(e, 'infl', 0.06, 0.2); set(e, 'debt', 0.35, 0.8); set(e, 'invest', 0.14, 0.22);
      e.sec = { agr: R(0.2, 0.35), mining: R(0.02, 0.08), manuf: R(0.06, 0.12), constr: 0.05, trade: 0.14, serv: 0.3, it: 0.02, fin: 0.03 };
      cfg.res.farmland = Math.round(R(60, 100)); cfg.regime = D.pick(r, ['pres', 'hybrid', 'junta']); cfg.system = D.pick(r, ['liberal', 'statecap', 'social']);
      set(cfg.geo, 'area', 100, 1200, 0); set(d, 'pop', 8, 90, 1); break;
    case 'resource':
      set(e, 'gdppc', 6000, 45000, 0); set(d, 'tfr', 1.6, 3.2, 2); set(d, 'le', 68, 78, 1); set(d, 'median', 25, 38, 0); set(d, 'edu', 9, 12.5, 1);
      set(e, 'corr', 45, 80, 0); set(e, 'shadow', 0.15, 0.35); set(e, 'gini', 0.3, 0.45); set(e, 'infl', 0.04, 0.12); set(e, 'debt', 0.1, 0.4); set(e, 'fund', 0, 0.4);
      cfg.res.oil = Math.round(R(70, 100)); cfg.res.gas = Math.round(R(50, 100)); cfg.res.metals = Math.round(R(30, 90));
      e.sec = { agr: 0.04, mining: R(0.15, 0.3), manuf: R(0.07, 0.14), constr: 0.07, trade: 0.14, serv: 0.33, it: 0.03, fin: 0.05 };
      cfg.regime = D.pick(r, ['hybrid', 'amon', 'pres']); cfg.system = 'statecap'; cfg.laws.fiscalRule = D.chance(r, 0.5) ? 1 : 0;
      set(cfg.geo, 'area', 300, 5000, 0); set(d, 'pop', 3, 60, 1); break;
    case 'industrial':
      set(e, 'gdppc', 8000, 25000, 0); set(d, 'tfr', 1.2, 1.9, 2); set(d, 'le', 72, 80, 1); set(d, 'median', 35, 44, 0); set(d, 'edu', 10.5, 13, 1);
      set(e, 'corr', 35, 65, 0); set(e, 'shadow', 0.12, 0.25); set(e, 'gini', 0.28, 0.38); set(e, 'infl', 0.02, 0.07); set(e, 'debt', 0.3, 0.7); set(e, 'invest', 0.22, 0.32);
      e.sec = { agr: 0.04, mining: 0.02, manuf: R(0.22, 0.32), constr: 0.06, trade: 0.13, serv: 0.34, it: 0.05, fin: 0.05 };
      cfg.regime = D.pick(r, ['pres', 'parl', 'hybrid']); cfg.system = D.pick(r, ['social', 'statecap', 'liberal']);
      set(cfg.geo, 'area', 100, 800, 0); set(d, 'pop', 10, 90, 1); break;
    case 'developed':
      set(e, 'gdppc', 35000, 75000, 0); set(d, 'tfr', 1.2, 1.8, 2); set(d, 'le', 79, 84, 1); set(d, 'median', 39, 47, 0); set(d, 'edu', 12.5, 14, 1);
      set(e, 'corr', 12, 35, 0); set(e, 'shadow', 0.06, 0.14); set(e, 'gini', 0.25, 0.38); set(e, 'infl', 0.015, 0.035); set(e, 'debt', 0.4, 1.3); set(e, 'unemp', 0.03, 0.08);
      e.sec = { agr: 0.015, mining: 0.01, manuf: R(0.1, 0.2), constr: 0.055, trade: 0.12, serv: 0.47, it: R(0.06, 0.12), fin: R(0.05, 0.1) };
      cfg.regime = D.pick(r, ['pres', 'parl', 'cmon']); cfg.system = D.pick(r, ['liberal', 'social', 'nordic']);
      cfg.laws.courts = 2; cfg.laws.press = 2; cfg.laws.assembly = 2; cfg.laws.property = 2; cfg.cb.target = 0.02;
      set(cfg.geo, 'area', 40, 700, 0); set(d, 'pop', 4, 80, 1); break;
    case 'island':
      set(e, 'gdppc', 5000, 40000, 0); set(d, 'tfr', 1.4, 2.6, 2); set(d, 'le', 72, 81, 1); set(d, 'median', 30, 42, 0);
      set(e, 'corr', 25, 60, 0); set(e, 'open', 1.0, 1.6); set(e, 'debt', 0.4, 1.0);
      e.sec = { agr: 0.03, mining: 0.005, manuf: 0.06, constr: 0.07, trade: 0.18, serv: R(0.45, 0.55), it: 0.04, fin: R(0.05, 0.15) };
      for (const k in cfg.res) cfg.res[k] = Math.round(R(0, 15));
      cfg.geo.coast = 1; cfg.geo.climate = D.pick(r, ['warm', 'hot']); set(cfg.geo, 'area', 1, 30, 1); set(d, 'pop', 0.3, 4, 2); cfg.geo.regions = D.pick(r, [3, 4]);
      cfg.regime = D.pick(r, ['parl', 'cmon', 'pres']); cfg.system = D.pick(r, ['liberal', 'social']); break;
    case 'postsoviet':
      set(e, 'gdppc', 3500, 15000, 0); set(d, 'tfr', 1.2, 2.2, 2); set(d, 'le', 68, 76, 1); set(d, 'median', 33, 42, 0); set(d, 'edu', 11, 12.8, 1);
      set(e, 'corr', 50, 78, 0); set(e, 'shadow', 0.2, 0.4); set(e, 'gini', 0.26, 0.38); set(e, 'infl', 0.05, 0.15); set(e, 'debt', 0.2, 0.6); set(e, 'state', 0.3, 0.5);
      e.sec = { agr: R(0.05, 0.12), mining: R(0.02, 0.12), manuf: R(0.12, 0.2), constr: 0.06, trade: 0.15, serv: 0.34, it: 0.03, fin: 0.04 };
      cfg.regime = D.pick(r, ['hybrid', 'pres', 'parl']); cfg.system = 'statecap'; cfg.laws.courts = 0; cfg.laws.anticorr = 0; cfg.pension.age = 60; cfg.laws.egov = D.pick(r, [0, 1, 2]);
      set(cfg.geo, 'area', 30, 3000, 0); set(d, 'pop', 2, 45, 1); break;
    case 'newborn':
      set(e, 'gdppc', 700, 5000, 0); set(d, 'tfr', 2.5, 5, 2); set(d, 'le', 55, 70, 1); set(d, 'median', 18, 28, 0); set(d, 'edu', 4, 9, 1);
      set(e, 'corr', 65, 90, 0); set(e, 'shadow', 0.35, 0.6); set(e, 'gini', 0.35, 0.5); set(e, 'infl', 0.1, 0.4); set(e, 'debt', 0.05, 0.3); set(e, 'reserves', 0.5, 2, 1);
      set(e, 'invest', 0.1, 0.16); e.credit = 0.1;
      e.sec = { agr: R(0.2, 0.35), mining: R(0.03, 0.2), manuf: 0.06, constr: 0.05, trade: 0.15, serv: 0.3, it: 0.01, fin: 0.02 };
      cfg.regime = D.pick(r, ['pres', 'hybrid', 'parl']); cfg.system = D.pick(r, ['liberal', 'social', 'statecap']);
      cfg.laws.courts = 1; cfg.laws.anticorr = 0; cfg.laws.egov = 0; cfg.laws.property = 0;
      cfg.spend.health = 0.015; cfg.spend.school = 0.02; cfg.spend.science = 0.001; cfg.pension.repl = 0.15; cfg.unemp.repl = 0; cfg.gmi = 0; cfg.child = 0;
      set(cfg.geo, 'area', 20, 700, 0); set(d, 'pop', 1, 15, 1); break;
  }
  // Итог: безработица, ставка ЦБ и т.п. — из уже выбранных параметров.
  if (arch !== 'developed') set(e, 'unemp', 0.04, 0.14);
  e.rate = +(e.infl + R(0.01, 0.04)).toFixed(3);
  e.growth = +(e.gdppc < 8000 ? R(0.03, 0.06) : e.gdppc < 25000 ? R(0.02, 0.04) : R(0.008, 0.022)).toFixed(3);
  e.open = e.open || +R(0.35, 0.9).toFixed(2);
  e.credit = e.credit !== undefined && arch === 'newborn' ? e.credit : +D.clamp(e.gdppc / 40000, 0.1, 1.6).toFixed(2);
  e.house = +R(5, 12).toFixed(1);
  e.extDebt = +D.clamp(0.6 - e.gdppc / 60000, 0, 0.7).toFixed(2);
  e.reserves = e.reserves || +R(2, 9).toFixed(1);
  d.lfpr = +R(0.6, 0.8).toFixed(2);
  d.immig = +R(0.01, 0.15).toFixed(2);
  D.applySystem(cfg, cfg.system);
  cfg.cb.independent = !['junta', 'oneparty', 'amon'].includes(cfg.regime) && D.chance(r, 0.7);
  cfg.cb.target = e.gdppc > 30000 ? 0.02 : 0.04;
  if (['hybrid', 'amon', 'oneparty', 'junta'].includes(cfg.regime)) {
    cfg.laws.press = D.pick(r, [0, 1]); cfg.laws.assembly = D.pick(r, [0, 1]); cfg.laws.opposition = D.pick(r, [1, 2]); cfg.laws.courts = 0;
  }
  cfg.partyName = D.pick(r, ['Партия «Созидание»', 'Союз «Возрождение»', 'Партия «Новый путь»', 'Движение «Вперёд»', 'Партия «Единая держава»']);
  return cfg;
};

// Проверка и нормализация конфига: границы, суммы долей, согласованность.
D.normalizeConfig = function (cfg) {
  const e = cfg.eco, d = cfg.demo;
  const sec = e.sec; let tot = 0;
  for (const s of D.SECTORS) { sec[s.id] = Math.max(0.001, +sec[s.id] || 0); tot += sec[s.id]; }
  for (const s of D.SECTORS) sec[s.id] /= tot;
  d.pop = D.clamp(+d.pop, 0.05, 2000);
  d.tfr = D.clamp(+d.tfr, 0.6, 7.5); d.le = D.clamp(+d.le, 40, 88); d.median = D.clamp(+d.median, 15, 55);
  d.edu = D.clamp(+d.edu, 2, 15); d.lfpr = D.clamp(+d.lfpr, 0.4, 0.9); d.urban = D.clamp(+d.urban, 0.1, 1);
  e.gdppc = D.clamp(+e.gdppc, 300, 150000); e.infl = D.clamp(+e.infl, -0.05, 5); e.unemp = D.clamp(+e.unemp, 0.005, 0.4);
  e.debt = D.clamp(+e.debt, 0, 3); e.open = D.clamp(+e.open, 0.05, 1.6); e.invest = D.clamp(+e.invest, 0.08, 0.45);
  e.corr = D.clamp(+e.corr, 0, 100); e.shadow = D.clamp(+e.shadow, 0.02, 0.7); e.gini = D.clamp(+e.gini, 0.2, 0.65);
  e.state = D.clamp(+e.state, 0, 1); e.rate = D.clamp(+e.rate, 0, 2);
  cfg.pension.age = D.clamp(Math.round(cfg.pension.age), 50, 72);
  if (cfg.cur.union || cfg.cb.regime === 'union') cfg.cb.regime = 'union';
  return cfg;
};
})();
