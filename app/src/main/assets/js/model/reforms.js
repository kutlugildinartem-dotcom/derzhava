'use strict';
// Крупные реформы: смена формы правления и экономической системы.
(function () {
const D = globalThis.D;
const shock = (s, v, ids) => { for (const g of ids || D.GROUPS.map(x => x.id)) s.groups[g].shock = (s.groups[g].shock || 0) + v; };

// Что будет при смене формы правления (для окна подтверждения).
D.regimeChangeInfo = function (s, to) {
  const from = D.REGIME[s.pol.regime], R = D.REGIME[to];
  const out = { ok: true, risk: 0, text: [] };
  if (from.id === to) { out.ok = false; return out; }
  if (from.dem && !R.dem) {
    out.risk = D.clamp((55 - s.polit.approval) / 40 + (50 - s.groups.military.mood) / 60, 0, 0.9);
    out.text.push('Отказ от демократии: свободы и выборы будут ограничены, демократические страны введут санкции, часть молодёжи и специалистов уедет.');
    out.text.push(`Риск провала (массовые протесты или отказ силовиков подчиниться): ≈ ${D.pct(out.risk, 0)}.`);
  } else if (!from.dem && R.dem) {
    out.text.push('Демократизация: через 12 месяцев пройдут свободные выборы. Отношения с демократиями улучшатся, доверие и инвестиции вырастут — но придётся бороться за голоса честно.');
    out.text.push('Опыт: Испания после Франко (1975–1978), Южная Корея (1987), Тайвань (1996) — успешно; многие «цветные» переходы — с откатами назад.');
  } else if (R.id === 'amon' || R.id === 'cmon') {
    if (from.id !== 'cmon' && from.id !== 'amon') { out.ok = false; out.text.push('Монархию нельзя просто объявить: нужна династия и легитимность. (В игре доступно только превращение одной монархии в другую.)'); }
    else out.text.push(R.id === 'cmon' ? 'Король уступает реальную власть парламенту, как в Великобритании и Испании.' : 'Монарх забирает всю власть себе — риск протестов и санкций.');
  } else out.text.push('Смена модели управления потребует конституционной реформы.');
  return out;
};

D.changeRegime = function (s, to) {
  const info = D.regimeChangeInfo(s, to);
  if (!info.ok) return false;
  const from = D.REGIME[s.pol.regime], R = D.REGIME[to];
  if (from.dem && !R.dem && D.chance(s, info.risk)) {
    s.polit.protest = D.clamp(s.polit.protest + 0.5, 0, 1);
    s.polit.tension = D.clamp(s.polit.tension + 0.4, 0, 1);
    shock(s, -15);
    D.logEvent(s, 'politics', '🚫 Попытка узурпации провалилась', 'Люди вышли на улицы, силовики отказались выполнять приказы. Конституция сохранена, но ваш авторитет подорван.', { kb: 'politics.protest' });
    return false;
  }
  s.pol.regime = to;
  if (from.dem && !R.dem) {
    shock(s, -12, ['intel', 'youth', 'office']); shock(s, 4, ['military']);
    for (const p of s.ext.partners) if (p.reg === 'dem') p.memory -= 35;
    s.polit.nextElection = R.elections === 'none' ? 1e9 : s.t + R.term * 12;
  } else if (!from.dem && R.dem) {
    for (const l of D.LAWS) if (l.opts[s.pol.laws[l.id]].auth) s.pol.laws[l.id] = l.def;
    shock(s, 10, ['intel', 'youth', 'office']); shock(s, -6, ['military']);
    for (const p of s.ext.partners) if (p.reg === 'dem') p.memory += 25;
    s.polit.nextElection = s.t + 12;
    s.polit.seats = D.seatsFrom(D.pollShares(s));
  } else {
    s.polit.nextElection = R.elections === 'none' ? 1e9 : s.t + R.term * 12;
  }
  D.logEvent(s, 'politics', `${R.icon} Новая форма правления: ${R.name}`, info.text.join(' '), { kb: 'regime.' + to });
  return true;
};

// Переход к другой экономической системе.
D.systemChangeInfo = function (s, to) {
  const from = D.SYSTEM[s.pol.system], X = D.SYSTEM[to];
  const text = [];
  if (from.plan >= 0.9 && X.plan < 0.5) {
    text.push('Переход от плана к рынку: цены отпускаются — накопленный «денежный навес» выплеснется скачком инфляции; неэффективные предприятия закроются (трансформационный спад 10–30%); начнётся приватизация.');
    text.push('Так было в Польше (1990, «план Бальцеровича»), России (1992), странах Балтии. Польша восстановилась за 2–3 года, Россия — за 7–8.');
  } else if (X.plan >= 0.9 && from.plan < 0.5) {
    text.push('Переход к плановой экономике: национализация предприятий, фиксированные цены, государственный план. Краткосрочно — рабочие места и равенство; дальше — дефицит, падение качества, бегство капитала и специалистов.');
    text.push('Примеры: СССР 1928–1932 (коллективизация), Куба 1960-х, Венесуэла 2000–2010-х (частично).');
  } else text.push(`Постепенная смена модели: доля госсектора будет двигаться к ${D.pct(X.stateShare, 0)}, изменятся стимулы и перераспределение.`);
  return text;
};
D.changeSystem = function (s, to) {
  const from = D.SYSTEM[s.pol.system], X = D.SYSTEM[to];
  if (from.id === to) return;
  s.pol.system = to;
  s.pol.stateShare = X.stateShare;
  if (from.plan >= 0.9 && X.plan < 0.5) {
    s.pol.laws.priceControl = 0;
    const oh = s.e.overhang / Math.max(1, s.e.C * s.e.P);
    for (const c of ['goods', 'food', 'serv']) D.pipeAdd(s, c, Math.min(3, 0.6 + oh * 3), 6);
    s.e.overhang *= 0.1;
    s.e.supplyShock = 0.12;
    s.e.uShock = 0.04;
    D.addEffect(s, 'transition', 36, { tfpG: 0.01, shadow: 0.06, corr: 6, crime: 6 }, 'Переходный период');
    shock(s, -12, ['pensioners', 'workers', 'public', 'poor']); shock(s, 8, ['smallbiz', 'youth', 'office']);
  } else if (X.plan >= 0.9 && from.plan < 0.5) {
    s.pol.laws.priceControl = 3; s.pol.laws.capitalControls = 2;
    s.e.supplyShock = 0.06; s.e.crisisFlight = 0.06;
    shock(s, -20, ['bigbiz', 'smallbiz']); shock(s, 6, ['poor', 'workers']);
    for (const p of s.ext.partners) if (p.reg === 'dem') p.memory -= 15;
  }
  D.logEvent(s, 'politics', `${X.icon} Экономическая система: ${X.name}`, D.systemChangeInfo(s, to).join(' '), { kb: 'system.' + to });
};

// Приватизация / национализация: целевая доля госсектора.
D.setStateShare = function (s, v) {
  const old = s.pol.stateShare;
  s.pol.stateShare = D.clamp(v, 0, 0.99);
  const d = s.pol.stateShare - old;
  if (d < -0.02) {
    // Продажа госкомпаний приносит деньги в бюджет (разово).
    const proceeds = -d * s.ind.gdpNom * 0.6;
    s.gov.debtD = Math.max(0, s.gov.debtD - proceeds);
    D.logEvent(s, 'politics', '🏷️ Приватизация', `Госсектор будет сокращён до ${D.pct(s.pol.stateShare, 0)}. От продажи компаний бюджет получит ≈ ${D.money(s, proceeds)}. Частные собственники обычно эффективнее, но важно, как пройдёт продажа: честный аукцион или «залоговые аукционы» своим.`, { kb: 'econ.privatization' });
  } else if (d > 0.02) {
    s.e.crisisFlight = (s.e.crisisFlight || 0) + d * 0.3;
    for (const p of s.ext.partners) if (p.reg === 'dem') p.memory -= d * 60;
    shock(s, -d * 80, ['bigbiz', 'smallbiz']);
    D.logEvent(s, 'politics', '🏛️ Национализация', `Государство забирает компании: доля госсектора вырастет до ${D.pct(s.pol.stateShare, 0)}. Инвесторы напуганы, но государство получает контроль над отраслями.`, { kb: 'econ.privatization' });
  }
};
})();
