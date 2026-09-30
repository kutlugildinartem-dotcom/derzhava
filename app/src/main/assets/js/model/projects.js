'use strict';
// Национальные проекты в регионах: стоимость (доля годового ВВП), срок, эффект после ввода.
(function () {
const D = globalThis.D;
D.PROJECTS = [
  { id: 'road', name: 'Скоростная трасса', icon: '🛣️', cost: 0.003, months: 24, boost: { road: 14, net: 2 }, prod: 0.03, desc: 'Быстрее доставка грузов, дешевле логистика, регион ближе к рынкам.' },
  { id: 'rail', name: 'Железная дорога', icon: '🚆', cost: 0.006, months: 36, boost: { road: 16 }, prod: 0.05, w: { mining: 1.1, manuf: 1.08 }, desc: 'Дешёвая перевозка сырья и промышленных грузов на большие расстояния.' },
  { id: 'port', name: 'Морской порт', icon: '⚓', cost: 0.004, months: 30, coast: true, prod: 0.04, w: { trade: 1.25, manuf: 1.08 }, open: 0.02, desc: 'Ворота для экспорта и импорта. Нужен выход к морю.' },
  { id: 'airport', name: 'Аэропорт', icon: '✈️', cost: 0.003, months: 24, boost: { net: 4 }, prod: 0.02, w: { serv: 1.1, trade: 1.05 }, desc: 'Туризм, деловые поездки, быстрые грузы.' },
  { id: 'hospital', name: 'Областная больница', icon: '🏥', cost: 0.0015, months: 18, boost: { health: 16 }, le: 0.15, desc: 'Современная медицина рядом: меньше смертность, выше продолжительность жизни.' },
  { id: 'school', name: 'Школы и детсады', icon: '🏫', cost: 0.001, months: 12, boost: { school: 14 }, desc: 'Качество образования растёт, молодые семьи меньше уезжают.' },
  { id: 'univ', name: 'Университет', icon: '🎓', cost: 0.002, months: 30, boost: { school: 8 }, w: { it: 1.2 }, tfp: 0.0005, desc: 'Кадры для высокотехнологичных отраслей, молодёжь остаётся в регионе.' },
  { id: 'power', name: 'Электростанция', icon: '⚡', cost: 0.004, months: 36, boost: { util: 12 }, w: { manuf: 1.1 }, prod: 0.02, desc: 'Надёжное и дешёвое электричество для заводов и домов.' },
  { id: 'gas', name: 'Газификация', icon: '🔥', cost: 0.002, months: 18, boost: { util: 15 }, pollution: -3, desc: 'Газ в дома: тепло, дешевле отопление, чище воздух, чем уголь и дрова.' },
  { id: 'internet', name: 'Широкополосный интернет', icon: '📶', cost: 0.001, months: 12, boost: { net: 22 }, w: { it: 1.1 }, desc: 'Удалённая работа, онлайн-услуги, цифровой бизнес.' },
  { id: 'housing', name: 'Жилой квартал', icon: '🏘️', cost: 0.0025, months: 24, hpi: -0.08, desc: 'Больше предложения жилья — ниже цены и аренда.' },
  { id: 'sez', name: 'Особая экономическая зона', icon: '🏗️', cost: 0.002, months: 24, prod: 0.08, fdi: true, desc: 'Льготы инвесторам: заводы, рабочие места, экспорт.' },
  { id: 'techpark', name: 'Технопарк', icon: '🔬', cost: 0.0015, months: 24, w: { it: 1.3 }, tfp: 0.0007, desc: 'Стартапы и исследования: рост IT и производительности.' },
  { id: 'factory', name: 'Государственный завод', icon: '🏭', cost: 0.003, months: 30, w: { manuf: 1.25 }, u: -0.15, state: 0.004, desc: 'Рабочие места «здесь и сейчас». Но госпредприятия часто менее эффективны.' },
  { id: 'agro', name: 'Агрокластер', icon: '🌾', cost: 0.0015, months: 18, w: { agr: 1.25 }, u: -0.08, desc: 'Современное сельское хозяйство, переработка, хранение.' },
  { id: 'water', name: 'Водоснабжение и очистка', icon: '💧', cost: 0.001, months: 12, boost: { util: 10, health: 3 }, desc: 'Чистая вода — меньше болезней.' },
  { id: 'eco', name: 'Очистные сооружения', icon: '🌳', cost: 0.001, months: 18, pollution: -10, desc: 'Меньше выбросов в воздух и воду.' },
];
D.PROJ = {};
for (const p of D.PROJECTS) D.PROJ[p.id] = p;

D.startProject = function (s, regionId, projId) {
  const p = D.PROJ[projId], r = s.regions.find(x => x.id === regionId);
  if (!p || !r) return null;
  const costNom = p.cost * s.ind.gdpNom;
  s.projects = s.projects || [];
  const pr = { id: projId, r: regionId, start: s.t, end: s.t + p.months, costNom, monthly: costNom / p.months };
  s.projects.push(pr);
  D.logEvent(s, 'info', `${p.icon} Старт проекта: ${p.name}`, `Регион «${r.name}». Стоимость ${D.money(s, costNom)}, срок ${D.months(p.months)}.`);
  return pr;
};

// Вызывается каждый месяц: завершение проектов и их эффекты.
D.stepProjects = function (s) {
  if (!s.projects || !s.projects.length) { s.fis.projects = 0; return; }
  let spend = 0;
  for (const pr of s.projects) {
    if (pr.done) continue;
    if (s.t >= pr.end) {
      pr.done = true;
      const p = D.PROJ[pr.id], r = s.regions.find(x => x.id === pr.r);
      if (p.boost) for (const k in p.boost) r.boost[k] = (r.boost[k] || 0) + p.boost[k];
      if (p.prod) r.prod *= 1 + p.prod;
      if (p.w) for (const k in p.w) r.w[k] = (r.w[k] || 1) * p.w[k];
      if (p.u) r.uRel *= 1 + p.u;
      if (p.hpi) r.hpiBase *= 1 + p.hpi;
      if (p.pollution) r.pollOff += p.pollution;
      if (p.le) r.mortMul = (r.mortMul || 1) * (1 - p.le * 0.1);
      if (p.state) s.pol.stateShare = Math.min(1, s.pol.stateShare + p.state);
      if (p.tfp) s.e.A *= 1 + p.tfp * 10;
      if (p.fdi) D.addEffect(s, 'sezFdi' + pr.r, 60, { fdi: 0.05 }, 'ОЭЗ');
      D.logEvent(s, 'good', `${p.icon} Введён в строй: ${p.name}`, `Регион «${r.name}». ${p.desc}`);
    } else spend += pr.monthly;
  }
  s.fis.projects = spend * 12;
  s.projects = s.projects.filter(p => !p.done || s.t - p.end < 120);
};
})();
