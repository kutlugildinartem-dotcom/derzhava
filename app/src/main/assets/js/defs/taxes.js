'use strict';
// Справочник налогов: механика для модели. Тексты методичек — в kb/taxes.js.
// rate хранится долей (0.2 = 20%), кроме carbon ($ за тонну CO₂) и transport (индекс).
// norm — типичный мировой коридор; выше hi растут уклонение и недовольство.
// split — кому по умолчанию идут деньги: f — центр, r — регионы, l — муниципалитеты.
// mood — насколько сильно группы реагируют на ставку выше нормы (баллы настроения за +10 п.п.).
(function () {
const D = globalThis.D;
D.TAX_CATS = [
  { id: 'income', name: 'Налоги на доходы и труд', icon: '👷' },
  { id: 'consumption', name: 'Налоги на потребление', icon: '🛒' },
  { id: 'business', name: 'Налоги на бизнес', icon: '🏭' },
  { id: 'property', name: 'Налоги на имущество и богатство', icon: '🏠' },
  { id: 'resource', name: 'Ресурсные и внешнеторговые', icon: '🛢️' },
  { id: 'special', name: 'Особые налоги', icon: '⚙️' },
];
D.TAXES = [
  { id: 'pit', cat: 'income', name: 'Налог на доходы физлиц (НДФЛ)', short: 'НДФЛ', icon: '💼', min: 0, max: 0.7, step: 0.005, def: 0.13,
    norm: { lo: 0.10, hi: 0.40 }, split: { f: 0.4, r: 0.45, l: 0.15 }, evK: 1.6,
    mood: { office: -7, workers: -5, intel: -4, public: -4, youth: -2 } },
  { id: 'ssc_er', cat: 'income', name: 'Страховые взносы работодателя', short: 'Взносы работодат.', icon: '🧾', min: 0, max: 0.5, step: 0.005, def: 0.22,
    norm: { lo: 0.08, hi: 0.30 }, split: { f: 1, r: 0, l: 0 }, evK: 2.2,
    mood: { smallbiz: -8, bigbiz: -4 } },
  { id: 'ssc_ee', cat: 'income', name: 'Страховые взносы работника', short: 'Взносы работника', icon: '📋', min: 0, max: 0.3, step: 0.005, def: 0.0,
    norm: { lo: 0, hi: 0.15 }, split: { f: 1, r: 0, l: 0 }, evK: 1.8,
    mood: { workers: -5, office: -4, public: -3 } },
  { id: 'vat', cat: 'consumption', name: 'Налог на добавленную стоимость (НДС)', short: 'НДС', icon: '🧮', min: 0, max: 0.35, step: 0.005, def: 0.20,
    norm: { lo: 0.05, hi: 0.25 }, split: { f: 1, r: 0, l: 0 }, evK: 1.4,
    mood: { poor: -6, pensioners: -5, families: -4, smallbiz: -3, workers: -3 } },
  { id: 'vat_red', cat: 'consumption', name: 'Льготная ставка НДС (еда, лекарства, детское)', short: 'Льготный НДС', icon: '🥖', min: 0, max: 0.35, step: 0.005, def: 0.10,
    norm: { lo: 0, hi: 0.12 }, split: { f: 1, r: 0, l: 0 }, evK: 0.6,
    mood: { poor: -9, pensioners: -8, families: -6 } },
  { id: 'sales', cat: 'consumption', name: 'Налог с продаж', short: 'С продаж', icon: '🏷️', min: 0, max: 0.15, step: 0.005, def: 0,
    norm: { lo: 0, hi: 0.08 }, split: { f: 0, r: 1, l: 0 }, evK: 2.5,
    mood: { poor: -5, pensioners: -4, smallbiz: -5 } },
  { id: 'exc_alc', cat: 'consumption', name: 'Акциз на алкоголь', short: 'Акциз: алкоголь', icon: '🍷', min: 0, max: 0.8, step: 0.01, def: 0.3,
    norm: { lo: 0.15, hi: 0.5 }, split: { f: 0.5, r: 0.5, l: 0 }, evK: 2.0,
    mood: { workers: -3, farmers: -2 } },
  { id: 'exc_tob', cat: 'consumption', name: 'Акциз на табак', short: 'Акциз: табак', icon: '🚬', min: 0, max: 0.9, step: 0.01, def: 0.5,
    norm: { lo: 0.3, hi: 0.75 }, split: { f: 1, r: 0, l: 0 }, evK: 1.5,
    mood: { workers: -2 } },
  { id: 'exc_fuel', cat: 'consumption', name: 'Акциз на топливо', short: 'Акциз: топливо', icon: '⛽', min: 0, max: 0.7, step: 0.01, def: 0.25,
    norm: { lo: 0.1, hi: 0.5 }, split: { f: 0.4, r: 0.6, l: 0 }, evK: 0.8,
    mood: { farmers: -6, workers: -3, smallbiz: -3, office: -2 } },
  { id: 'luxury', cat: 'consumption', name: 'Налог на роскошь', short: 'На роскошь', icon: '💎', min: 0, max: 0.4, step: 0.01, def: 0,
    norm: { lo: 0, hi: 0.15 }, split: { f: 1, r: 0, l: 0 }, evK: 3.0,
    mood: { bigbiz: -6, poor: 2, workers: 1 } },
  { id: 'cit', cat: 'business', name: 'Налог на прибыль организаций', short: 'На прибыль', icon: '🏭', min: 0, max: 0.6, step: 0.005, def: 0.20,
    norm: { lo: 0.12, hi: 0.30 }, split: { f: 0.3, r: 0.7, l: 0 }, evK: 2.2,
    mood: { bigbiz: -8, smallbiz: -3 } },
  { id: 'sme', cat: 'business', name: 'Упрощённый налог для малого бизнеса (с оборота)', short: 'Упрощёнка', icon: '🧑‍🔧', min: 0, max: 0.2, step: 0.005, def: 0.06,
    norm: { lo: 0.02, hi: 0.10 }, split: { f: 0, r: 1, l: 0 }, evK: 3.0,
    mood: { smallbiz: -10, farmers: -3 } },
  { id: 'fintx', cat: 'business', name: 'Налог на финансовые операции', short: 'На фин. операции', icon: '🏦', min: 0, max: 0.01, step: 0.0005, def: 0,
    norm: { lo: 0, hi: 0.002 }, split: { f: 1, r: 0, l: 0 }, evK: 60,
    mood: { bigbiz: -5, office: -2 } },
  { id: 'digital', cat: 'business', name: 'Налог на цифровые услуги', short: 'Цифровой', icon: '📱', min: 0, max: 0.15, step: 0.005, def: 0,
    norm: { lo: 0, hi: 0.05 }, split: { f: 1, r: 0, l: 0 }, evK: 4,
    mood: { youth: -2, office: -2 } },
  { id: 'windfall', cat: 'business', name: 'Налог на сверхприбыль', short: 'На сверхприбыль', icon: '📈', min: 0, max: 0.9, step: 0.01, def: 0,
    norm: { lo: 0, hi: 0.4 }, split: { f: 1, r: 0, l: 0 }, evK: 1.2,
    mood: { bigbiz: -8, workers: 1, poor: 1 } },
  { id: 'prop_ind', cat: 'property', name: 'Налог на имущество граждан', short: 'Имущ. граждан', icon: '🏠', min: 0, max: 0.04, step: 0.0005, def: 0.001,
    norm: { lo: 0.001, hi: 0.015 }, split: { f: 0, r: 0, l: 1 }, evK: 25,
    mood: { pensioners: -8, office: -6, families: -4 } },
  { id: 'prop_corp', cat: 'property', name: 'Налог на имущество организаций', short: 'Имущ. компаний', icon: '🏢', min: 0, max: 0.04, step: 0.0005, def: 0.015,
    norm: { lo: 0.005, hi: 0.022 }, split: { f: 0, r: 1, l: 0 }, evK: 20,
    mood: { bigbiz: -4, smallbiz: -3 } },
  { id: 'land', cat: 'property', name: 'Земельный налог', short: 'Земельный', icon: '🌾', min: 0, max: 0.03, step: 0.0005, def: 0.003,
    norm: { lo: 0.001, hi: 0.015 }, split: { f: 0, r: 0, l: 1 }, evK: 15,
    mood: { farmers: -8, pensioners: -2 } },
  { id: 'capinc', cat: 'property', name: 'Налог на дивиденды и прирост капитала', short: 'На капитал', icon: '📊', min: 0, max: 0.6, step: 0.005, def: 0.13,
    norm: { lo: 0.10, hi: 0.35 }, split: { f: 1, r: 0, l: 0 }, evK: 2.8,
    mood: { bigbiz: -6, office: -2 } },
  { id: 'inherit', cat: 'property', name: 'Налог на наследство', short: 'На наследство', icon: '📜', min: 0, max: 0.7, step: 0.01, def: 0,
    norm: { lo: 0, hi: 0.40 }, split: { f: 1, r: 0, l: 0 }, evK: 2.0,
    mood: { bigbiz: -5, pensioners: -3, office: -2, farmers: -2 } },
  { id: 'wealth', cat: 'property', name: 'Налог на богатство (крупные состояния)', short: 'На богатство', icon: '🏰', min: 0, max: 0.05, step: 0.001, def: 0,
    norm: { lo: 0, hi: 0.01 }, split: { f: 1, r: 0, l: 0 }, evK: 60,
    mood: { bigbiz: -10, poor: 2, workers: 1 } },
  { id: 'mining', cat: 'resource', name: 'Налог на добычу полезных ископаемых (роялти)', short: 'НДПИ', icon: '⛏️', min: 0, max: 0.8, step: 0.01, def: 0.2,
    norm: { lo: 0.05, hi: 0.45 }, split: { f: 0.9, r: 0.1, l: 0 }, evK: 0.9,
    mood: { bigbiz: -5 } },
  { id: 'export', cat: 'resource', name: 'Экспортные пошлины на сырьё', short: 'Экспорт. пошлины', icon: '🚢', min: 0, max: 0.5, step: 0.01, def: 0,
    norm: { lo: 0, hi: 0.15 }, split: { f: 1, r: 0, l: 0 }, evK: 1.5,
    mood: { bigbiz: -5, farmers: -3 } },
  { id: 'tariff', cat: 'resource', name: 'Ввозные таможенные пошлины (средняя)', short: 'Импорт. пошлины', icon: '🛃', min: 0, max: 0.6, step: 0.005, def: 0.05,
    norm: { lo: 0.02, hi: 0.12 }, split: { f: 1, r: 0, l: 0 }, evK: 2.0,
    mood: { office: -3, youth: -2, workers: 1, farmers: 2 } },
  { id: 'carbon', cat: 'special', name: 'Углеродный налог ($ за тонну CO₂)', short: 'Углеродный', icon: '🌫️', min: 0, max: 200, step: 1, def: 0, unit: '$/т',
    norm: { lo: 0, hi: 60 }, split: { f: 1, r: 0, l: 0 }, evK: 0.004,
    mood: { farmers: -4, workers: -3, bigbiz: -4, youth: 2, intel: 2 } },
  { id: 'transport', cat: 'special', name: 'Транспортный налог (индекс к норме)', short: 'Транспортный', icon: '🚗', min: 0, max: 5, step: 0.1, def: 1, unit: '×',
    norm: { lo: 0.5, hi: 2 }, split: { f: 0, r: 1, l: 0 }, evK: 0.3,
    mood: { office: -3, farmers: -2, workers: -2 } },
];
D.TAX = {};
for (const t of D.TAXES) D.TAX[t.id] = t;

// Прогрессивная шкала НДФЛ: пороги — в средних зарплатах в месяц.
D.defaultBrackets = () => ([
  { from: 0, rate: 0.13 },
  { from: 3, rate: 0.15 },
  { from: 8, rate: 0.18 },
  { from: 25, rate: 0.20 },
  { from: 60, rate: 0.22 },
]);

// Как ставка отображается в интерфейсе.
D.taxStr = function (id, v) {
  const t = D.TAX[id];
  if (t.unit === '$/т') return D.fmt(v, 0) + ' $/т';
  if (t.unit === '×') return '×' + D.fmt(v, 1);
  const d = t.max <= 0.05 ? 2 : 1;
  return D.fmt(v * 100, d) + '%';
};
})();
