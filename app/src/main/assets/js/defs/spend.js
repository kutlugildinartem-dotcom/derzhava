'use strict';
// Статьи расходов бюджета. Дискреционные задаются в % ВВП, социальные обязательства
// считаются по формулам (пенсия × число пенсионеров и т.д.).
// lvl — кто финансирует (центр/регионы/муниципалитеты), labor — доля зарплат
// бюджетников в статье (влияет на занятость в госсекторе), invest — доля капвложений.
(function () {
const D = globalThis.D;
D.SPEND_CATS = [
  { id: 'social', name: 'Социальная политика', icon: '🤝' },
  { id: 'human', name: 'Человеческий капитал', icon: '🎓' },
  { id: 'infra', name: 'Инфраструктура и ЖКХ', icon: '🛣️' },
  { id: 'economy', name: 'Поддержка экономики', icon: '⚙️' },
  { id: 'state', name: 'Государство и безопасность', icon: '🏛️' },
];
D.SPEND = [
  // Социальные обязательства: сумма считается моделью, игрок меняет параметры.
  { id: 'pensions', cat: 'social', name: 'Пенсии', icon: '👵', formula: true, lvl: { f: 1, r: 0, l: 0 }, labor: 0.02, norm: { lo: 0.05, hi: 0.12 },
    mood: { pensioners: 14 } },
  { id: 'unemp', cat: 'social', name: 'Пособия по безработице', icon: '🧑‍💼', formula: true, lvl: { f: 0.8, r: 0.2, l: 0 }, labor: 0.03, norm: { lo: 0.003, hi: 0.015 },
    mood: { poor: 6, workers: 2 } },
  { id: 'child', cat: 'social', name: 'Детские пособия и материнский капитал', icon: '👶', formula: true, lvl: { f: 0.7, r: 0.3, l: 0 }, labor: 0.02, norm: { lo: 0.005, hi: 0.025 },
    mood: { families: 10, youth: 2 } },
  { id: 'assist', cat: 'social', name: 'Адресная помощь бедным', icon: '🥣', formula: true, lvl: { f: 0.5, r: 0.5, l: 0 }, labor: 0.04, norm: { lo: 0.003, hi: 0.015 },
    mood: { poor: 10 } },
  { id: 'social_other', cat: 'social', name: 'Прочие соцвыплаты (больничные, инвалидность, жильё)', icon: '♿', def: 0.015, max: 0.1, transfer: true, lvl: { f: 0.7, r: 0.3, l: 0 }, labor: 0.03, invest: 0, norm: { lo: 0.01, hi: 0.05 },
    mood: { pensioners: 3, poor: 5, families: 2, workers: 1 } },
  // Человеческий капитал
  { id: 'health', cat: 'human', name: 'Здравоохранение', icon: '🏥', def: 0.045, max: 0.14, lvl: { f: 0.3, r: 0.6, l: 0.1 }, labor: 0.55, invest: 0.08, norm: { lo: 0.04, hi: 0.09 },
    mood: { pensioners: 6, families: 5, public: 5, poor: 3 } },
  { id: 'school', cat: 'human', name: 'Школы и детские сады', icon: '🏫', def: 0.03, max: 0.08, lvl: { f: 0.1, r: 0.5, l: 0.4 }, labor: 0.7, invest: 0.06, norm: { lo: 0.03, hi: 0.05 },
    mood: { families: 7, public: 5, intel: 2 } },
  { id: 'univ', cat: 'human', name: 'Высшее образование', icon: '🎓', def: 0.008, max: 0.035, lvl: { f: 0.9, r: 0.1, l: 0 }, labor: 0.6, invest: 0.08, norm: { lo: 0.008, hi: 0.018 },
    mood: { youth: 6, intel: 5, families: 2 } },
  { id: 'science', cat: 'human', name: 'Наука и исследования (R&D)', icon: '🔬', def: 0.004, max: 0.04, lvl: { f: 1, r: 0, l: 0 }, labor: 0.5, invest: 0.2, norm: { lo: 0.005, hi: 0.015 },
    mood: { intel: 9, youth: 1 } },
  { id: 'culture', cat: 'human', name: 'Культура и спорт', icon: '🎭', def: 0.006, max: 0.02, lvl: { f: 0.3, r: 0.4, l: 0.3 }, labor: 0.5, invest: 0.15, norm: { lo: 0.004, hi: 0.012 },
    mood: { intel: 3, youth: 2, pensioners: 1 } },
  // Инфраструктура
  { id: 'roads', cat: 'infra', name: 'Дороги, транспорт, связь', icon: '🛣️', def: 0.02, max: 0.07, lvl: { f: 0.4, r: 0.4, l: 0.2 }, labor: 0.2, invest: 0.75, norm: { lo: 0.015, hi: 0.035 },
    mood: { farmers: 3, smallbiz: 3, workers: 2, office: 1 } },
  { id: 'utilities', cat: 'infra', name: 'ЖКХ и благоустройство', icon: '🏘️', def: 0.012, max: 0.05, lvl: { f: 0.1, r: 0.4, l: 0.5 }, labor: 0.3, invest: 0.55, norm: { lo: 0.008, hi: 0.02 },
    mood: { pensioners: 3, families: 3, workers: 2 } },
  { id: 'housing', cat: 'infra', name: 'Социальное жильё и ипотечные программы', icon: '🏗️', def: 0.004, max: 0.03, lvl: { f: 0.6, r: 0.4, l: 0 }, labor: 0.1, invest: 0.8, norm: { lo: 0.002, hi: 0.01 },
    mood: { youth: 5, families: 5 } },
  { id: 'tariffsub', cat: 'infra', name: 'Субсидии на тарифы ЖКХ', icon: '💡', def: 0.004, max: 0.04, lvl: { f: 0.3, r: 0.7, l: 0 }, labor: 0, invest: 0, norm: { lo: 0, hi: 0.01 },
    mood: { pensioners: 4, poor: 4, families: 2 } },
  { id: 'ecology', cat: 'infra', name: 'Экология', icon: '🌳', def: 0.004, max: 0.02, lvl: { f: 0.5, r: 0.3, l: 0.2 }, labor: 0.3, invest: 0.4, norm: { lo: 0.004, hi: 0.01 },
    mood: { youth: 3, intel: 3, families: 1 } },
  // Экономика
  { id: 'agri', cat: 'economy', name: 'Субсидии сельскому хозяйству', icon: '🚜', def: 0.004, max: 0.03, lvl: { f: 0.7, r: 0.3, l: 0 }, labor: 0.05, invest: 0.3, norm: { lo: 0.002, hi: 0.01 },
    mood: { farmers: 12 } },
  { id: 'industry', cat: 'economy', name: 'Поддержка промышленности', icon: '🏭', def: 0.004, max: 0.04, lvl: { f: 0.8, r: 0.2, l: 0 }, labor: 0.05, invest: 0.5, norm: { lo: 0.002, hi: 0.01 },
    mood: { workers: 4, bigbiz: 4 } },
  { id: 'smesup', cat: 'economy', name: 'Поддержка малого бизнеса', icon: '🧑‍🔧', def: 0.001, max: 0.02, lvl: { f: 0.5, r: 0.5, l: 0 }, labor: 0.05, invest: 0.2, norm: { lo: 0.001, hi: 0.005 },
    mood: { smallbiz: 8 } },
  { id: 'fuelsub', cat: 'economy', name: 'Субсидии на топливо', icon: '⛽', def: 0, max: 0.06, lvl: { f: 1, r: 0, l: 0 }, labor: 0, invest: 0, norm: { lo: 0, hi: 0.005 },
    mood: { farmers: 5, workers: 3, poor: 2, office: 1 } },
  // Государство
  { id: 'defense', cat: 'state', name: 'Оборона', icon: '🛡️', def: 0.02, max: 0.12, lvl: { f: 1, r: 0, l: 0 }, labor: 0.35, invest: 0.3, norm: { lo: 0.01, hi: 0.03 },
    mood: { military: 12, pensioners: 1 } },
  { id: 'police', cat: 'state', name: 'Полиция и безопасность', icon: '👮', def: 0.015, max: 0.05, lvl: { f: 0.7, r: 0.3, l: 0 }, labor: 0.7, invest: 0.05, norm: { lo: 0.01, hi: 0.02 },
    mood: { military: 6, pensioners: 2, smallbiz: 1 } },
  { id: 'courts', cat: 'state', name: 'Суды и прокуратура', icon: '⚖️', def: 0.003, max: 0.015, lvl: { f: 1, r: 0, l: 0 }, labor: 0.7, invest: 0.05, norm: { lo: 0.003, hi: 0.006 },
    mood: { smallbiz: 2, intel: 1 } },
  { id: 'admin', cat: 'state', name: 'Госуправление и налоговая служба', icon: '🗂️', def: 0.02, max: 0.06, lvl: { f: 0.5, r: 0.3, l: 0.2 }, labor: 0.6, invest: 0.1, norm: { lo: 0.012, hi: 0.025 },
    mood: { public: 3 } },
  { id: 'foreignaid', cat: 'state', name: 'Международная помощь и дипломатия', icon: '🕊️', def: 0.001, max: 0.02, lvl: { f: 1, r: 0, l: 0 }, labor: 0.2, invest: 0, norm: { lo: 0.001, hi: 0.007 },
    mood: { poor: -1 } },
];
D.SP = {};
for (const x of D.SPEND) D.SP[x.id] = x;
D.SPEND_DISC = D.SPEND.filter(x => !x.formula);
})();
