'use strict';
// Формы правления, экономические системы и социальные группы.
(function () {
const D = globalThis.D;

// elections: pres — президент + парламент, parl — парламент выбирает правительство,
// managed — выборы есть, но под контролем, none — выборов нет.
// needParl — законы нужно проводить через парламент; decree — можно указом.
D.REGIMES = [
  { id: 'pres', name: 'Президентская республика', icon: '🏛️', dem: true, elections: 'pres', term: 5, needParl: true, decree: true, auth: false,
    mods: { freedom: 10, relDem: 10, trust: 0 } },
  { id: 'parl', name: 'Парламентская республика', icon: '🗳️', dem: true, elections: 'parl', term: 4, needParl: true, decree: false, auth: false,
    mods: { freedom: 12, relDem: 12, corr: -2 } },
  { id: 'cmon', name: 'Конституционная монархия', icon: '👑', dem: true, elections: 'parl', term: 4, needParl: true, decree: false, auth: false,
    mods: { freedom: 10, relDem: 12, trust: 5, stability: 10 } },
  { id: 'hybrid', name: 'Гибридный режим («управляемая демократия»)', icon: '🎭', dem: false, elections: 'managed', term: 6, needParl: false, decree: true, auth: true,
    mods: { freedom: -12, relDem: -8, corr: 6, trust: 0 } },
  { id: 'amon', name: 'Абсолютная монархия', icon: '🕌', dem: false, elections: 'none', term: 0, needParl: false, decree: true, auth: true,
    mods: { freedom: -25, relDem: -12, corr: 5, stability: 15, relAut: 8 } },
  { id: 'oneparty', name: 'Однопартийное государство', icon: '☭', dem: false, elections: 'none', term: 0, needParl: false, decree: true, auth: true,
    mods: { freedom: -30, relDem: -18, corr: 6, relAut: 10, press: -30 } },
  { id: 'junta', name: 'Военная диктатура', icon: '🎖️', dem: false, elections: 'none', term: 0, needParl: false, decree: true, auth: true,
    mods: { freedom: -35, relDem: -25, corr: 12, rol: -15, invest: -0.06, groups: { military: 15 } } },
];
D.REGIME = {};
for (const r of D.REGIMES) D.REGIME[r.id] = r;

// Экономические системы. stateShare — доля госсектора в экономике, plan — степень
// централизованного планирования. tax/spend — разумные стартовые настройки.
D.SYSTEMS = [
  { id: 'laissez', name: 'Свободный рынок (минимальное государство)', icon: '🦅', stateShare: 0.03, plan: 0, ideo: { e: 1, s: -0.5 },
    tax: { pit: 0.10, ssc_er: 0.05, vat: 0.07, cit: 0.12, tariff: 0.01, capinc: 0.05 },
    spend: { health: 0.02, school: 0.025, univ: 0.003, science: 0.002, roads: 0.012, utilities: 0.005, defense: 0.015, police: 0.012, admin: 0.01, agri: 0, industry: 0, tariffsub: 0, housing: 0.001, culture: 0.002, ecology: 0.002, smesup: 0 },
    pension: 0.2, mods: { biz: 10, invest: 0.04, giniAdj: 0.04 } },
  { id: 'liberal', name: 'Либеральная рыночная экономика', icon: '🗽', stateShare: 0.06, plan: 0, ideo: { e: 0.6, s: -0.3 },
    tax: { pit: 0.2, ssc_er: 0.08, ssc_ee: 0.07, vat: 0.1, cit: 0.21, capinc: 0.2 },
    spend: { health: 0.06, school: 0.035, univ: 0.006, science: 0.007, roads: 0.02, defense: 0.03 },
    pension: 0.38, mods: { biz: 6, giniAdj: 0.02 } },
  { id: 'social', name: 'Социальное рыночное хозяйство', icon: '🤝', stateShare: 0.12, plan: 0, ideo: { e: 0, s: 0 },
    tax: { pit: 0.3, ssc_er: 0.2, ssc_ee: 0.2, vat: 0.19, cit: 0.3, capinc: 0.25 },
    spend: { health: 0.075, school: 0.03, univ: 0.012, science: 0.01, roads: 0.02, defense: 0.015 },
    pension: 0.48, mods: { giniAdj: -0.01 } },
  { id: 'nordic', name: 'Скандинавская модель', icon: '❄️', stateShare: 0.15, plan: 0, ideo: { e: -0.3, s: -0.4 },
    tax: { pit: 0.45, ssc_er: 0.31, ssc_ee: 0.07, vat: 0.25, cit: 0.206, capinc: 0.3, carbon: 120 },
    spend: { health: 0.07, school: 0.045, univ: 0.018, science: 0.012, roads: 0.02, defense: 0.013, culture: 0.012 },
    pension: 0.52, mods: { giniAdj: -0.04, trust: 8, corr: -6 } },
  { id: 'statecap', name: 'Государственный капитализм', icon: '🐉', stateShare: 0.35, plan: 0.2, ideo: { e: -0.2, s: 0.7 },
    tax: { pit: 0.2, ssc_er: 0.2, vat: 0.13, cit: 0.25, tariff: 0.08 },
    spend: { health: 0.03, school: 0.03, univ: 0.008, science: 0.008, roads: 0.04, industry: 0.015, defense: 0.02 },
    pension: 0.4, mods: { invest: 0.12, competition: -8, corr: 4 } },
  { id: 'marketsoc', name: 'Рыночный социализм', icon: '⚙️', stateShare: 0.6, plan: 0.35, ideo: { e: -0.7, s: 0.2 },
    tax: { pit: 0.2, ssc_er: 0.25, vat: 0.15, cit: 0.3 },
    spend: { health: 0.05, school: 0.04, univ: 0.012, science: 0.008, roads: 0.03, industry: 0.02 },
    pension: 0.5, mods: { competition: -12, giniAdj: -0.05, tfpG: -0.004 } },
  { id: 'planned', name: 'Плановая (командная) экономика', icon: '🏭', stateShare: 0.95, plan: 1, ideo: { e: -1, s: 0.8 },
    tax: { pit: 0.13, ssc_er: 0.1, vat: 0, cit: 0.4, sales: 0.1, tariff: 0.1 },
    spend: { health: 0.04, school: 0.04, univ: 0.012, science: 0.02, roads: 0.03, industry: 0.04, defense: 0.08, agri: 0.02 },
    pension: 0.45, mods: { competition: -40, giniAdj: -0.08, biz: -60, priceCtrl: 0.9 } },
];
D.SYSTEM = {};
for (const x of D.SYSTEMS) D.SYSTEM[x.id] = x;

// Социальные группы. ideo — политические предпочтения; power — влияние на
// устойчивость власти помимо голосов (элиты, силовики).
D.GROUPS = [
  { id: 'pensioners', name: 'Пенсионеры', icon: '👵', ideo: { e: -0.4, s: 0.5 }, power: 1 },
  { id: 'workers', name: 'Рабочие', icon: '👷', ideo: { e: -0.6, s: 0.3 }, power: 1 },
  { id: 'public', name: 'Бюджетники (врачи, учителя)', icon: '🧑‍🏫', ideo: { e: -0.4, s: 0 }, power: 1 },
  { id: 'office', name: 'Средний класс, офисные', icon: '👔', ideo: { e: 0.3, s: -0.4 }, power: 1.2 },
  { id: 'smallbiz', name: 'Малый бизнес', icon: '🧑‍🔧', ideo: { e: 0.7, s: -0.2 }, power: 1.3 },
  { id: 'bigbiz', name: 'Крупный бизнес', icon: '🎩', ideo: { e: 0.8, s: 0.2 }, power: 12 },
  { id: 'youth', name: 'Молодёжь и студенты', icon: '🧑‍🎓', ideo: { e: 0, s: -0.7 }, power: 1.3 },
  { id: 'families', name: 'Семьи с детьми', icon: '👨‍👩‍👧', ideo: { e: -0.2, s: 0.3 }, power: 1 },
  { id: 'poor', name: 'Бедные и безработные', icon: '🥣', ideo: { e: -0.9, s: 0.2 }, power: 0.7 },
  { id: 'military', name: 'Силовики и военные', icon: '🎖️', ideo: { e: -0.1, s: 0.9 }, power: 6 },
  { id: 'farmers', name: 'Фермеры и село', icon: '🚜', ideo: { e: -0.3, s: 0.6 }, power: 1 },
  { id: 'intel', name: 'Интеллигенция и учёные', icon: '🔬', ideo: { e: -0.1, s: -0.8 }, power: 1.6 },
];
D.GROUP = {};
for (const g of D.GROUPS) D.GROUP[g.id] = g;

// Идеологии партий (для генерации оппозиции).
D.IDEOLOGIES = [
  { id: 'communist', name: 'Коммунисты', e: -0.95, s: 0.6, color: '#d64545' },
  { id: 'socdem', name: 'Социал-демократы', e: -0.5, s: -0.3, color: '#e0707a' },
  { id: 'green', name: 'Зелёные', e: -0.3, s: -0.7, color: '#4caf6a' },
  { id: 'centrist', name: 'Центристы', e: 0.1, s: 0, color: '#e8a93c' },
  { id: 'liberal', name: 'Либералы', e: 0.6, s: -0.7, color: '#4a9fe0' },
  { id: 'conserv', name: 'Консерваторы', e: 0.5, s: 0.6, color: '#3a5fbf' },
  { id: 'national', name: 'Националисты', e: -0.2, s: 0.95, color: '#8a5a3c' },
  { id: 'populist', name: 'Популисты', e: -0.6, s: 0.5, color: '#b061c9' },
];
})();
