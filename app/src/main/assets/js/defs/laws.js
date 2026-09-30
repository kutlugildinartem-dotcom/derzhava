'use strict';
// Законы. У каждого варианта свой набор модификаторов (mods), которые модель
// складывает каждый месяц. Ключи модификаторов описаны в model/mods.js.
// ideo — «куда тянет» вариант по двум осям: e (−1 левые … +1 правые рыночники),
// s (−1 свобода … +1 порядок/контроль). По этим осям парламент решает, поддержать ли закон.
// delay — сколько месяцев закон вступает в силу. auth — вариант доступен только
// недемократическим режимам (или после смены конституции).
(function () {
const D = globalThis.D;
D.LAW_CATS = [
  { id: 'economy', name: 'Экономика и рынок', icon: '📈' },
  { id: 'finance', name: 'Финансы и банки', icon: '🏦' },
  { id: 'labor', name: 'Труд и занятость', icon: '👷' },
  { id: 'social', name: 'Социальная сфера', icon: '🤝' },
  { id: 'migration', name: 'Миграция', icon: '🧳' },
  { id: 'state', name: 'Государство и свободы', icon: '🏛️' },
  { id: 'ecology', name: 'Экология и энергетика', icon: '🌳' },
];
D.LAWS = [
  // ---------- экономика ----------
  { id: 'priceControl', cat: 'economy', name: 'Государственный контроль цен', icon: '🏷️', def: 0, delay: 1, opts: [
    { label: 'Нет', mods: {} },
    { label: 'На соц. продукты', ideo: { e: -0.6, s: 0.3 }, mods: { priceCtrl: 0.2, competition: -3, groups: { poor: 4, pensioners: 4, farmers: -6, smallbiz: -4 } } },
    { label: 'На большинство товаров', ideo: { e: -0.9, s: 0.6 }, mods: { priceCtrl: 0.55, competition: -10, tfpG: -0.004, shadow: 0.04, groups: { poor: 5, pensioners: 5, farmers: -10, smallbiz: -10, bigbiz: -8 } } },
    { label: 'Все цены назначает государство', ideo: { e: -1, s: 0.9 }, mods: { priceCtrl: 0.92, competition: -25, tfpG: -0.01, shadow: 0.08, groups: { smallbiz: -20, bigbiz: -15, farmers: -10 } } },
  ] },
  { id: 'antimonopoly', cat: 'economy', name: 'Антимонопольная политика', icon: '⚔️', def: 1, delay: 3, opts: [
    { label: 'Слабая', ideo: { e: 0.5, s: 0 }, mods: { competition: -12, groups: { bigbiz: 5, smallbiz: -3 } } },
    { label: 'Обычная', mods: {} },
    { label: 'Жёсткая', ideo: { e: -0.3, s: 0.1 }, mods: { competition: 12, tfpG: 0.002, groups: { bigbiz: -8, smallbiz: 4, office: 1 } } },
  ] },
  { id: 'regulation', cat: 'economy', name: 'Регулирование бизнеса (проверки, лицензии)', icon: '📑', def: 1, delay: 3, opts: [
    { label: 'Минимальное', ideo: { e: 0.9, s: -0.4 }, mods: { biz: 15, shadow: -0.03, corr: -4, pollution: 6, crime: 1, invest: 0.04, groups: { smallbiz: 8, bigbiz: 4, intel: -2 } } },
    { label: 'Умеренное', mods: {} },
    { label: 'Строгое', ideo: { e: -0.4, s: 0.4 }, mods: { biz: -12, shadow: 0.03, corr: 5, pollution: -4, invest: -0.04, groups: { smallbiz: -7, bigbiz: -3 } } },
    { label: 'Бюрократический ад', ideo: { e: -0.6, s: 0.8 }, mods: { biz: -30, shadow: 0.08, corr: 12, pollution: -5, invest: -0.1, tfpG: -0.004, groups: { smallbiz: -15, bigbiz: -6, public: 2 } } },
  ] },
  { id: 'property', cat: 'economy', name: 'Защита права собственности', icon: '🔐', def: 1, delay: 6, opts: [
    { label: 'Слабая (возможны изъятия)', ideo: { e: -0.7, s: 0.7 }, mods: { invest: -0.18, fdi: -0.4, rol: -10, emig: 0.15, groups: { bigbiz: -12, smallbiz: -8 } } },
    { label: 'Обычная', mods: {} },
    { label: 'Сильная (независимый арбитраж)', ideo: { e: 0.6, s: -0.2 }, mods: { invest: 0.08, fdi: 0.25, rol: 6, groups: { bigbiz: 5, smallbiz: 4 } } },
  ] },
  { id: 'foreignOwn', cat: 'economy', name: 'Иностранные инвестиции', icon: '🌐', def: 1, delay: 3, opts: [
    { label: 'Запрещены в ключевых отраслях', ideo: { e: -0.4, s: 0.6 }, mods: { fdi: -0.6, tfpG: -0.003, groups: { military: 3, bigbiz: 2, office: -2 } } },
    { label: 'С ограничениями', mods: {} },
    { label: 'Полностью открыты', ideo: { e: 0.7, s: -0.3 }, mods: { fdi: 0.35, tfpG: 0.002, competition: 5, groups: { office: 2, bigbiz: -3, military: -2 } } },
  ] },
  { id: 'sez', cat: 'economy', name: 'Особые экономические зоны', icon: '🏗️', def: 0, delay: 12, opts: [
    { label: 'Нет', mods: {} },
    { label: 'Есть (льготы инвесторам)', ideo: { e: 0.5, s: 0 }, mods: { fdi: 0.2, invest: 0.03, taxBase: -0.01, groups: { bigbiz: 3, workers: 1 } } },
  ] },
  { id: 'importSubst', cat: 'economy', name: 'Импортозамещение и продуктовое эмбарго', icon: '🚫', def: 0, delay: 2, opts: [
    { label: 'Нет', mods: {} },
    { label: 'Запрет импорта еды', ideo: { e: -0.3, s: 0.6 }, mods: { importMult: -0.08, foodShock: 0.06, competition: -6, groups: { farmers: 12, office: -4, poor: -4, pensioners: -2 } } },
    { label: 'Широкое импортозамещение', ideo: { e: -0.5, s: 0.7 }, mods: { importMult: -0.2, foodShock: 0.06, goodsShock: 0.05, competition: -12, tfpG: -0.004, groups: { farmers: 10, workers: 3, office: -6, youth: -4 } } },
  ] },
  // ---------- финансы ----------
  { id: 'capitalControls', cat: 'finance', name: 'Контроль за движением капитала', icon: '🧱', def: 0, delay: 1, opts: [
    { label: 'Свободный вывоз капитала', mods: {} },
    { label: 'Ограничения на вывоз', ideo: { e: -0.5, s: 0.6 }, mods: { capCtrl: 0.6, fdi: -0.3, freedom: -3, groups: { bigbiz: -8, office: -4 } } },
    { label: 'Полный валютный контроль', ideo: { e: -0.8, s: 0.9 }, mods: { capCtrl: 0.95, fdi: -0.7, shadow: 0.05, freedom: -6, tfpG: -0.002, groups: { bigbiz: -14, office: -8, youth: -4 } } },
  ] },
  { id: 'depositIns', cat: 'finance', name: 'Страхование вкладов', icon: '☂️', def: 1, delay: 3, opts: [
    { label: 'Нет', mods: { bankRun: 0.6 } },
    { label: 'Есть', ideo: { e: -0.2, s: 0 }, mods: { bankRisk: 0.003, groups: { pensioners: 2, office: 1 } } },
  ] },
  { id: 'macropru', cat: 'finance', name: 'Макропруденциальное регулирование', icon: '🧯', def: 1, delay: 3, opts: [
    { label: 'Мягкое', ideo: { e: 0.4, s: -0.2 }, mods: { credit: 0.04, bankRisk: 0.004, groups: { youth: 2, bigbiz: 2 } } },
    { label: 'Обычное', mods: {} },
    { label: 'Жёсткое (лимиты по ипотеке)', ideo: { e: -0.2, s: 0.2 }, mods: { credit: -0.04, bankRisk: -0.004, groups: { youth: -3, families: -2 } } },
  ] },
  { id: 'usury', cat: 'finance', name: 'Потолок ставок по кредитам', icon: '🪙', def: 0, delay: 2, opts: [
    { label: 'Нет', mods: {} },
    { label: 'Есть', ideo: { e: -0.6, s: 0.2 }, mods: { credit: -0.05, shadow: 0.02, crime: 2, groups: { poor: 4, workers: 2 } } },
  ] },
  { id: 'fiscalRule', cat: 'finance', name: 'Бюджетное правило (сырьевой фонд)', icon: '⚖️', def: 0, delay: 1, opts: [
    { label: 'Нет', mods: {} },
    { label: 'Сверхдоходы от сырья — в фонд', ideo: { e: 0.3, s: 0 }, mods: { cred: 0.05, groups: {} } },
  ] },
  // ---------- труд ----------
  { id: 'minWage', cat: 'labor', name: 'Минимальный размер оплаты труда (МРОТ)', icon: '💵', def: 2, delay: 1, opts: [
    { label: 'Нет', ideo: { e: 0.9, s: 0 }, v: 0, mods: { groups: { poor: -6, workers: -4, smallbiz: 3 } } },
    { label: '25% средней з/п', v: 0.25, mods: { groups: { poor: -2 } } },
    { label: '35% средней з/п', v: 0.35, mods: {} },
    { label: '45% средней з/п', ideo: { e: -0.5, s: 0 }, v: 0.45, mods: { groups: { poor: 3, workers: 3, smallbiz: -3 } } },
    { label: '60% средней з/п', ideo: { e: -0.9, s: 0 }, v: 0.6, mods: { groups: { poor: 5, workers: 5, smallbiz: -8 } } },
  ] },
  { id: 'workWeek', cat: 'labor', name: 'Рабочая неделя', icon: '⏱️', def: 1, delay: 3, opts: [
    { label: '48 часов', ideo: { e: 0.6, s: 0.3 }, v: 48, mods: { hours: 0.06, le: -0.8, tfr: -0.03, groups: { workers: -8, office: -6, bigbiz: 5 } } },
    { label: '40 часов', v: 40, mods: {} },
    { label: '36 часов', ideo: { e: -0.6, s: -0.2 }, v: 36, mods: { hours: -0.05, le: 0.3, tfr: 0.03, wagePush: 0.01, groups: { workers: 6, office: 6, youth: 3, bigbiz: -6, smallbiz: -6 } } },
    { label: '32 часа (4 дня)', ideo: { e: -0.8, s: -0.3 }, v: 32, mods: { hours: -0.09, le: 0.5, tfr: 0.05, wagePush: 0.02, groups: { workers: 9, office: 10, youth: 6, bigbiz: -10, smallbiz: -10 } } },
  ] },
  { id: 'laborProt', cat: 'labor', name: 'Защита работников от увольнений', icon: '🛡️', def: 1, delay: 3, opts: [
    { label: 'Гибкий рынок труда', ideo: { e: 0.8, s: -0.1 }, mods: { unat: -0.008, uSpeed: 0.5, invest: 0.03, groups: { workers: -6, bigbiz: 5, smallbiz: 5 } } },
    { label: 'Обычная', mods: {} },
    { label: 'Жёсткая (уволить почти нельзя)', ideo: { e: -0.8, s: 0.2 }, mods: { unat: 0.015, uSpeed: -0.4, invest: -0.04, shadow: 0.02, groups: { workers: 6, public: 3, smallbiz: -8, youth: -3 } } },
  ] },
  { id: 'unions', cat: 'labor', name: 'Профсоюзы', icon: '✊', def: 1, delay: 3, opts: [
    { label: 'Запрещены', ideo: { e: 0.5, s: 0.9 }, auth: true, mods: { wagePush: -0.01, freedom: -8, strikes: -0.8, relDem: -8, groups: { workers: -12, bigbiz: 6 } } },
    { label: 'Слабые', mods: { wagePush: -0.003, groups: { workers: -2, bigbiz: 2 } } },
    { label: 'Сильные (коллективные договоры)', ideo: { e: -0.7, s: -0.1 }, mods: { wagePush: 0.008, strikes: 0.6, giniAdj: -0.02, groups: { workers: 8, public: 4, bigbiz: -6, smallbiz: -3 } } },
  ] },
  { id: 'conscription', cat: 'labor', name: 'Призыв в армию', icon: '🪖', def: 1, delay: 6, opts: [
    { label: 'Контрактная армия', ideo: { e: 0.3, s: -0.4 }, mods: { lfpr: 0.004, defenseEff: -0.05, groups: { youth: 8, families: 3, military: -4 } } },
    { label: '1 год', mods: {} },
    { label: '2 года', ideo: { e: 0, s: 0.7 }, mods: { lfpr: -0.006, defenseEff: 0.08, emig: 0.15, groups: { youth: -10, families: -5, military: 5 } } },
  ] },
  // ---------- социалка ----------
  { id: 'freeUniv', cat: 'social', name: 'Бесплатное высшее образование', icon: '🎓', def: 1, delay: 12, opts: [
    { label: 'Платное', ideo: { e: 0.7, s: 0 }, mods: { schooling: -0.6, giniAdj: 0.015, groups: { youth: -10, families: -5, intel: -4 } } },
    { label: 'Бюджетные места по конкурсу', mods: {} },
    { label: 'Полностью бесплатное', ideo: { e: -0.7, s: 0 }, mods: { schooling: 0.5, giniAdj: -0.01, spendUniv: 0.004, groups: { youth: 8, families: 4, intel: 3 } } },
  ] },
  { id: 'univHealth', cat: 'social', name: 'Всеобщее медицинское страхование', icon: '🩺', def: 1, delay: 12, opts: [
    { label: 'Частная медицина', ideo: { e: 0.8, s: 0 }, mods: { le: -1.5, giniAdj: 0.01, groups: { poor: -10, pensioners: -8, families: -4, bigbiz: 3 } } },
    { label: 'Всеобщее ОМС', mods: {} },
  ] },
  { id: 'matCap', cat: 'social', name: 'Материнский капитал', icon: '🍼', def: 0, delay: 3, opts: [
    { label: 'Нет', mods: {} },
    { label: 'Есть (на 1-го и 2-го ребёнка)', ideo: { e: -0.3, s: 0.3 }, mods: { tfr: 0.1, spendChild: 0.004, groups: { families: 6, youth: 2 } } },
  ] },
  { id: 'alcohol', cat: 'social', name: 'Алкогольная политика', icon: '🍷', def: 1, delay: 3, opts: [
    { label: 'Свободная продажа', ideo: { e: 0.4, s: -0.5 }, mods: { le: -1.2, crime: 2, groups: { workers: 2 } } },
    { label: 'Ограничения (время, возраст)', mods: {} },
    { label: '«Сухой закон»', ideo: { e: -0.2, s: 0.9 }, mods: { le: 1.5, shadow: 0.04, crime: 8, corr: 5, taxBase: -0.01, groups: { workers: -12, farmers: -5, poor: -4, families: 3 } } },
  ] },
  { id: 'rentControl', cat: 'social', name: 'Заморозка арендной платы', icon: '🔑', def: 0, delay: 2, opts: [
    { label: 'Нет', mods: {} },
    { label: 'Есть', ideo: { e: -0.7, s: 0.2 }, mods: { rentCtrl: 1, housingSupply: -0.35, groups: { youth: 6, poor: 3, pensioners: -2, bigbiz: -3 } } },
  ] },
  // ---------- миграция ----------
  { id: 'immigration', cat: 'migration', name: 'Иммиграционная политика', icon: '🛬', def: 1, delay: 3, opts: [
    { label: 'Закрытая', ideo: { e: -0.1, s: 0.8 }, mods: { immig: -0.9, wagePush: 0.004, groups: { workers: 3, military: 3, bigbiz: -4, smallbiz: -3 } } },
    { label: 'Квоты', mods: {} },
    { label: 'Балльная система (для специалистов)', ideo: { e: 0.4, s: 0 }, mods: { immig: 0.3, immigSkill: 1, tfpG: 0.002, groups: { bigbiz: 3, intel: 2 } } },
    { label: 'Открытые границы', ideo: { e: 0.6, s: -0.9 }, mods: { immig: 1.6, wagePush: -0.006, crime: 3, groups: { workers: -8, pensioners: -4, military: -5, bigbiz: 6, smallbiz: 4 } } },
  ] },
  { id: 'emigration', cat: 'migration', name: 'Выезд граждан за рубеж', icon: '🛫', def: 0, delay: 1, opts: [
    { label: 'Свободный', mods: {} },
    { label: 'Выездные разрешения', ideo: { e: -0.2, s: 0.8 }, auth: true, mods: { emig: -0.6, freedom: -10, relDem: -12, groups: { youth: -10, intel: -10, office: -8 } } },
    { label: 'Граница закрыта', ideo: { e: -0.3, s: 1 }, auth: true, mods: { emig: -0.95, freedom: -20, relDem: -25, tfpG: -0.004, groups: { youth: -15, intel: -15, office: -12, smallbiz: -6 } } },
  ] },
  // ---------- государство ----------
  { id: 'courts', cat: 'state', name: 'Независимость судов', icon: '⚖️', def: 1, delay: 12, opts: [
    { label: 'Суды подчинены власти', ideo: { e: 0, s: 0.9 }, auth: true, mods: { rol: -22, corr: 10, invest: -0.06, fdi: -0.2, relDem: -10, freedom: -10, groups: { intel: -8, smallbiz: -6, bigbiz: -3, military: 3 } } },
    { label: 'Частичная', mods: {} },
    { label: 'Полная независимость', ideo: { e: 0.2, s: -0.7 }, mods: { rol: 15, corr: -8, invest: 0.04, fdi: 0.15, relDem: 6, freedom: 6, groups: { intel: 5, smallbiz: 5, military: -2 } } },
  ] },
  { id: 'press', cat: 'state', name: 'Свобода прессы', icon: '📰', def: 1, delay: 1, opts: [
    { label: 'Госпропаганда и цензура', ideo: { e: 0, s: 1 }, auth: true, mods: { press: -45, corr: 10, trust: 6, relDem: -15, freedom: -15, groups: { intel: -14, youth: -8, office: -5, pensioners: 3, military: 3 } } },
    { label: 'Частичная', mods: { press: -15 } },
    { label: 'Свободные СМИ', ideo: { e: 0, s: -0.8 }, mods: { press: 10, corr: -6, trust: -3, relDem: 5, freedom: 6, groups: { intel: 6, youth: 4, office: 3 } } },
  ] },
  { id: 'internet', cat: 'state', name: 'Интернет', icon: '🌐', def: 0, delay: 1, opts: [
    { label: 'Свободный', mods: {} },
    { label: 'Блокировки сайтов', ideo: { e: 0, s: 0.7 }, mods: { freedom: -6, tfpG: -0.001, groups: { youth: -8, office: -4, intel: -5 } } },
    { label: '«Суверенный» интернет', ideo: { e: -0.1, s: 1 }, auth: true, mods: { freedom: -14, press: -15, tfpG: -0.004, emig: 0.25, relDem: -10, groups: { youth: -16, office: -10, intel: -12, smallbiz: -4 } } },
  ] },
  { id: 'assembly', cat: 'state', name: 'Свобода собраний и митингов', icon: '📢', def: 1, delay: 1, opts: [
    { label: 'Запрещены', ideo: { e: 0, s: 1 }, auth: true, mods: { assembly: -60, repress: 0.6, freedom: -15, relDem: -15, groups: { intel: -10, youth: -10, office: -5, military: 2 } } },
    { label: 'Только согласованные', ideo: { e: 0, s: 0.3 }, mods: { assembly: -20, freedom: -3, groups: { youth: -2 } } },
    { label: 'Свободные', ideo: { e: 0, s: -0.6 }, mods: { assembly: 10, freedom: 4, groups: { intel: 3, youth: 3 } } },
  ] },
  { id: 'opposition', cat: 'state', name: 'Оппозиция', icon: '🗳️', def: 0, delay: 1, opts: [
    { label: 'Свободна', mods: {} },
    { label: 'Ограничена (фильтры регистрации)', ideo: { e: 0, s: 0.7 }, auth: true, mods: { freedom: -10, oppWeak: 0.5, relDem: -10, trust: -3, groups: { intel: -8, youth: -5, office: -4 } } },
    { label: 'Запрещена', ideo: { e: 0, s: 1 }, auth: true, mods: { freedom: -25, oppWeak: 1, relDem: -25, trust: -6, emig: 0.3, groups: { intel: -15, youth: -10, office: -8, smallbiz: -4 } } },
  ] },
  { id: 'anticorr', cat: 'state', name: 'Борьба с коррупцией', icon: '🕵️', def: 1, delay: 6, opts: [
    { label: 'Номинальная', mods: { corr: 6, groups: { bigbiz: 2, public: 1 } } },
    { label: 'Прокуратура и полиция', mods: {} },
    { label: 'Независимое агентство + декларации', ideo: { e: 0.1, s: -0.2 }, mods: { corr: -12, trust: 4, taxAdmin: 0.02, groups: { office: 4, smallbiz: 5, intel: 4, public: -4, bigbiz: -5 } } },
  ] },
  { id: 'egov', cat: 'state', name: 'Цифровое государство (госуслуги онлайн)', icon: '💻', def: 1, delay: 12, opts: [
    { label: 'Бумажная бюрократия', mods: { corr: 5, taxAdmin: -0.03, biz: -5 } },
    { label: 'Частичная цифровизация', mods: {} },
    { label: 'Всё онлайн (как в Эстонии)', ideo: { e: 0.2, s: -0.1 }, mods: { corr: -7, taxAdmin: 0.04, biz: 8, trust: 2, spendAdmin: 0.002, groups: { office: 4, youth: 3, smallbiz: 3, pensioners: -1 } } },
  ] },
  { id: 'termLimits', cat: 'state', name: 'Ограничение сроков главы государства', icon: '⏳', def: 1, delay: 1, opts: [
    { label: 'Без ограничений', ideo: { e: 0, s: 0.8 }, mods: { freedom: -6, relDem: -6, corr: 3, groups: { intel: -6, youth: -4 } } },
    { label: 'Не более двух сроков', mods: {} },
  ] },
  { id: 'lobbying', cat: 'state', name: 'Лоббирование', icon: '🤝', def: 1, delay: 3, opts: [
    { label: 'Не регулируется', mods: { corr: 6, groups: { bigbiz: 5 } } },
    { label: 'Прозрачные реестры', mods: {} },
  ] },
  // ---------- экология ----------
  { id: 'emissions', cat: 'ecology', name: 'Экологические нормы для предприятий', icon: '🏭', def: 1, delay: 12, opts: [
    { label: 'Мягкие', ideo: { e: 0.6, s: 0 }, mods: { pollution: 12, invest: 0.02, groups: { bigbiz: 4, youth: -3, intel: -2 } } },
    { label: 'Обычные', mods: {} },
    { label: 'Строгие (евростандарт)', ideo: { e: -0.3, s: 0.1 }, mods: { pollution: -14, invest: -0.03, tfpG: -0.001, groups: { bigbiz: -6, youth: 4, intel: 3, families: 2 } } },
  ] },
  { id: 'greenEnergy', cat: 'ecology', name: 'Поддержка зелёной энергетики', icon: '☀️', def: 0, delay: 12, opts: [
    { label: 'Нет', mods: {} },
    { label: 'Субсидии ВИЭ', ideo: { e: -0.3, s: -0.2 }, mods: { pollution: -8, energyShield: 0.15, spendGreen: 0.003, groups: { youth: 4, intel: 3, bigbiz: -2 } } },
  ] },
];
D.LAW = {};
for (const l of D.LAWS) D.LAW[l.id] = l;
})();
