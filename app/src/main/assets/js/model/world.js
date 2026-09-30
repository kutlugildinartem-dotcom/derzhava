'use strict';
// Мировая экономика и внешняя политика: сырьевые цены, мировой цикл, партнёры, санкции.
(function () {
const D = globalThis.D;

D.stepWorld = function (s) {
  const w = s.w, diff = D.DIFF[s.cfg.difficulty];
  w.oilPrev = w.oil; w.grainPrev = w.grain;
  // Мировой рост: колебания вокруг 3% + редкие глобальные рецессии.
  if (w.crisis > 0) { w.crisis--; w.gShock = D.approach(w.gShock, -0.045, 0.3); }
  else w.gShock = D.approach(w.gShock, 0, 0.08);
  w.g = D.clamp(0.03 + 0.85 * (w.g - 0.03) + D.gauss(s) * 0.002 * diff.shock + w.gShock * 0.08, -0.05, 0.07);
  w.demand = D.clamp(D.approach(w.demand, 1 + 4 * (w.g - 0.03), 0.1), 0.7, 1.2);
  w.pi = D.clamp(0.025 + 0.9 * (w.pi - 0.025) + D.gauss(s) * 0.0015 + (w.oil / w.oilPrev - 1) * 0.05, -0.01, 0.12);
  w.P *= Math.exp(w.pi / 12);
  w.i = D.clamp(D.approach(w.i, 0.01 + w.pi + 0.5 * (w.pi - 0.02) + 2 * (w.g - 0.03), 0.05), 0, 0.12);
  // Сырьё: логарифмическое блуждание с возвратом к среднему и редкими скачками.
  const walk = (x, mean, vol, rev) => Math.exp(Math.log(x) + rev * (Math.log(mean) - Math.log(x)) + D.gauss(s) * vol * diff.shock);
  w.oil = D.clamp(walk(w.oil, 80 * (1 + 3 * (w.g - 0.03)) * w.P / w.P0, 0.07, 0.03), 15, 250);
  w.gas = D.clamp(walk(w.gas, w.P / w.P0 * (1 + 3 * (w.g - 0.03)), 0.08, 0.04), 0.2, 6);
  w.metals = D.clamp(walk(w.metals, w.P / w.P0 * (1 + 5 * (w.g - 0.03)), 0.05, 0.03), 0.3, 4);
  w.grain = D.clamp(walk(w.grain, w.P / w.P0, 0.04, 0.05), 0.4, 4);
  // Индекс цен на наш сырьевой экспорт (в «реальных» мировых ценах).
  const mix = s.c0.resMix;
  w.com = (mix.oil * w.oil / 80 + mix.gas * w.gas + mix.metals * w.metals + mix.agri * w.grain) / (w.P / w.P0);
  if (!(w.com > 0)) w.com = 1;
};

// ---------- партнёры ----------
function relTarget(s, p) {
  const I = s.inst, dem = D.REGIME[s.pol.regime].dem;
  let t = 0;
  if (p.reg === 'dem') t += (I.freedom - 50) * 0.8 + (s.mods.relDem || 0) + (dem ? 15 : -10);
  else if (p.reg === 'aut') t += (s.mods.relAut || 0) + (dem ? -5 : 18) - Math.max(0, I.freedom - 70) * 0.3;
  else t += 5;
  if (p.threat) t -= 35 - Math.min(20, (s.fis.eff.foreignaid || 0) / s.ind.gdpNom * 2000);
  if (p.arch === 'ally') t += 30;
  t += p.x * 60 + p.m * 40;                  // торговые связи сближают
  t += (p.fta ? 12 : 0) - p.ourSanc * 15 - p.tariffThem * 60;
  t += Math.min(15, (s.pol.spend.foreignaid || 0) * 1500);
  t += p.memory;
  return D.clamp(t + p.base, -100, 100);
}

D.relTargetOf = relTarget;
D.stepForeignInit = s => blocks(s, false);
D.stepForeign = function (s) { blocks(s, true); };
function blocks(s, live) {
  const x = s.ext, diff = D.DIFF[s.cfg.difficulty];
  let exportBlock = 0, importBlock = 0, finBlock = 0, techBlock = 0, resBlock = 0, fta = 0, tariffHit = 0;
  for (const p of x.partners) {
    if (live) {
    p.memory *= 0.985;
    p.relT = relTarget(s, p);
    p.rel = D.clamp(D.approach(p.rel, p.relT, 0.04) + D.gauss(s) * 0.4, -100, 100);
    // Санкции: вводятся, когда отношения очень плохие, снимаются, когда наладились.
    if (p.sanc < 3 && p.rel < -45 && p.reg !== 'aut' || p.sanc < 3 && p.rel < -65) {
      const prob = 0.02 * (-p.rel - 40) / 30 * diff.events;
      if (D.chance(s, prob)) D.impose(s, p, p.sanc + 1);
    } else if (p.sanc > 0 && p.rel > -15) {
      p.sancMonths = (p.sancMonths || 0) + 1;
      if (p.sancMonths > 8 && D.chance(s, 0.08)) D.lift(s, p);
    } else p.sancMonths = 0;
    // Встречные пошлины: если мы подняли их на партнёра, он может ответить.
    if (p.tariffThem > p.tariffUs + 0.02 && D.chance(s, 0.06) && p.rel < 30) {
      p.tariffUs = D.clamp(p.tariffThem * D.range(s, 0.6, 1.1), 0, 0.5);
      D.logEvent(s, 'world', `↩️ ${p.name} ответил встречными пошлинами`, `В ответ на наши пошлины ${p.name} ввёл свои — ${D.pct(p.tariffUs, 0)} на наш экспорт. Так начинаются торговые войны: обе стороны платят дороже за импорт, а экспортёры теряют рынки. Пример — торговая война США и Китая 2018–2019 гг.`, { kb: 'world.tradewar', partner: p.id });
    }
    }
    const sx = [0, 0.15, 0.5, 0.9][p.sanc];
    const sm = [0, 0.1, 0.4, 0.85][p.sanc];
    // Со временем торговлю перенаправляют через другие страны: потеря уменьшается.
    const divert = D.clamp((p.sancAge || 0) / 36, 0, 0.55);
    if (p.sanc > 0 && live) p.sancAge = (p.sancAge || 0) + 1;
    exportBlock += p.x * sx * (1 - divert);
    importBlock += p.m * sm * (1 - divert);
    resBlock += p.x * [0, 0.05, 0.35, 0.8][p.sanc] * (1 - divert);
    finBlock += p.fin * [0, 0.2, 0.7, 1][p.sanc];
    techBlock += p.tech * [0, 0.2, 0.6, 1][p.sanc] * (1 - divert * 0.5);
    tariffHit += p.x * p.tariffUs * 1.2;
    if (p.fta) fta += p.m;
  }
  x.exportBlock = D.clamp(exportBlock, 0, 0.8);
  x.importBlock = D.clamp(importBlock, 0, 0.8);
  x.resBlock = D.clamp(resBlock, 0, 0.8);
  x.finBlock = D.clamp(finBlock, 0, 1);
  x.techBlock = D.clamp(techBlock, 0, 1);
  x.tariffHit = D.clamp(tariffHit, 0, 0.5);
  x.ftaShare = D.clamp(fta, 0, 1);
  // Военная угроза.
  if (!live) { x.security = 60; return; }
  if (s.cfg.modules.military) {
    const def = (s.fis.eff.defense || 0) / s.ind.gdpNom;
    const rival = x.partners.find(p => p.threat);
    const power = Math.pow(s.ind.gdpUsd / 1e9, 0.5) * def * 100 * (1 + (s.mods.defenseEff || 0));
    const theirs = rival ? rival.army * (1 + Math.max(0, -rival.rel) / 100) * 0.6 : 10;
    x.security = D.clamp(50 + 30 * Math.log(Math.max(0.05, power / theirs)), 0, 100);
    if (rival && !s.flags.war && rival.rel < -70 && x.security < 35 && D.chance(s, 0.004 * diff.events)) s.pending.push({ id: 'war', data: { partner: rival.id } });
  } else x.security = 70;
}

// Ввести санкции (партнёр против нас).
D.impose = function (s, p, level) {
  const prev = p.sanc;
  p.sanc = D.clamp(level, 0, 3);
  p.sancAge = 0; p.sancMonths = 0;
  const names = ['', 'точечные санкции (визы, счета чиновников)', 'секторальные санкции (финансы, технологии)', 'полное эмбарго'];
  const loss = p.x * [0, 0.15, 0.5, 0.9][p.sanc];
  s.flags.rally = s.t + 12;
  D.logEvent(s, 'world', `⛔ ${p.name}: ${names[p.sanc]}`,
    `Отношения упали до ${D.fmt(p.rel, 0)}. ${p.name} ${prev ? 'ужесточил санкции' : 'ввёл санкции'}: ${names[p.sanc]}. Под угрозой около ${D.pct(loss, 0)} нашего экспорта, ${p.fin > 0.1 ? 'закрывается доступ к финансовым рынкам, ' : ''}${p.tech > 0.1 ? 'импорт технологий затруднён — это замедлит рост производительности. ' : ''}В первый год часть граждан сплотится вокруг власти, но экономика потеряет в росте. Со временем торговлю частично перенаправят через третьи страны.`,
    { kb: 'world.sanctions', partner: p.id, report: 'sanctions' });
};
D.lift = function (s, p) {
  const old = p.sanc;
  p.sanc = Math.max(0, p.sanc - 1); p.sancMonths = 0;
  D.logEvent(s, 'world', `🕊️ ${p.name} смягчил санкции`, `Отношения улучшились (${D.fmt(p.rel, 0)}), и ${p.name} снизил уровень санкций с ${old} до ${p.sanc}. Экспорт и доступ к технологиям начнут восстанавливаться.`, { partner: p.id });
};

// Дипломатические действия игрока. Возвращают отчёт для окна с объяснением.
D.DIPLO = [
  { id: 'visit', name: 'Визит на высшем уровне', icon: '🤝', cost: 0.0002, cool: 12,
    desc: 'Переговоры лидеров. Улучшает отношения, открывает дорогу соглашениям.' },
  { id: 'fta', name: 'Соглашение о свободной торговле', icon: '📜', cost: 0, cool: 24, need: 30,
    desc: 'Взаимная отмена пошлин. Импорт дешевеет, экспорт растёт, но местным производителям станет тяжелее конкурировать.' },
  { id: 'tariffUp', name: 'Повысить пошлины на их товары', icon: '🛃', cost: 0, cool: 3,
    desc: 'Защищает местных производителей, но товары дорожают, а партнёр может ответить встречными пошлинами.' },
  { id: 'tariffDown', name: 'Снизить пошлины на их товары', icon: '🔓', cost: 0, cool: 3,
    desc: 'Импорт дешевеет, отношения улучшаются.' },
  { id: 'sanction', name: 'Ввести санкции против них', icon: '⛔', cost: 0, cool: 6,
    desc: 'Давление на партнёра. Обратная сторона — потери нашей торговли и почти наверняка ответные меры.' },
  { id: 'unsanction', name: 'Снять наши санкции', icon: '🕊️', cost: 0, cool: 6,
    desc: 'Жест доброй воли: улучшает отношения и возвращает торговлю.' },
  { id: 'aid', name: 'Оказать помощь', icon: '🎁', cost: 0.002, cool: 12,
    desc: 'Гуманитарная помощь или кредит. Сильно улучшает отношения, стоит денег бюджету.' },
  { id: 'alliance', name: 'Военный союз', icon: '🛡️', cost: 0, cool: 36, need: 50,
    desc: 'Совместная оборона: снижает военную угрозу, но портит отношения с соперниками союзника.' },
  { id: 'expel', name: 'Выслать дипломатов', icon: '📤', cost: 0, cool: 6,
    desc: 'Демонстрация недовольства. Резко портит отношения.' },
];
D.DIPLO_BY = {};
for (const d of D.DIPLO) D.DIPLO_BY[d.id] = d;

D.diplomacy = function (s, partnerId, actId) {
  const p = s.ext.partners.find(q => q.id === partnerId), a = D.DIPLO_BY[actId];
  if (!p || !a) return null;
  const key = partnerId + ':' + actId;
  if ((s.ext.cool[key] || 0) > s.t) return { ok: false, text: `Это действие снова будет доступно через ${s.ext.cool[key] - s.t} мес.` };
  if (a.need && p.rel < a.need) return { ok: false, text: `Нужны отношения не ниже ${a.need} (сейчас ${D.fmt(p.rel, 0)}).` };
  const before = { rel: p.rel, x: p.x, m: p.m, tariffThem: p.tariffThem, tariffUs: p.tariffUs };
  let text = '', effect = '';
  const cost = a.cost * s.ind.gdpNom;
  if (cost > 0) { s.gov.debtD += cost; }
  switch (actId) {
    case 'visit': p.memory += 12; text = `Переговоры прошли успешно. Отношения с ${p.name} улучшатся на ~12 пунктов в ближайшие месяцы.`; break;
    case 'fta':
      p.fta = true; p.tariffThem = 0; p.tariffUs = 0; p.memory += 10; p.x *= 1.15; p.m *= 1.2;
      text = `Подписано соглашение о свободной торговле с ${p.name}. Пошлины обнулены в обе стороны.`;
      effect = 'Импорт из этой страны подешевеет (доля нашего импорта из неё вырастет примерно на 20%), экспорт вырастет. Потребители выиграют, но местные производители почувствуют конкуренцию. Пример: НАФТА (1994) — рост торговли США, Канады и Мексики втрое за 20 лет.';
      break;
    case 'tariffUp':
      p.tariffThem = D.clamp(p.tariffThem + 0.1, 0, 0.6); p.memory -= 8; p.fta = false;
      text = `Пошлины на товары из ${p.name} выросли до ${D.pct(p.tariffThem, 0)} сверх базовых.`;
      effect = 'Товары из этой страны подорожают, часть спроса перейдёт к местным производителям. Высока вероятность встречных пошлин на наш экспорт.';
      break;
    case 'tariffDown':
      p.tariffThem = Math.max(0, p.tariffThem - 0.1); p.memory += 4;
      text = `Пошлины на товары из ${p.name} снижены до ${D.pct(p.tariffThem, 0)}.`; break;
    case 'sanction':
      p.ourSanc = Math.min(3, p.ourSanc + 1); p.memory -= 25; p.m *= 0.8;
      text = `Мы ввели санкции против ${p.name} (уровень ${p.ourSanc}).`;
      effect = 'Импорт из этой страны сократится, отношения резко ухудшатся. Ответные санкции очень вероятны.';
      break;
    case 'unsanction':
      if (!p.ourSanc) return { ok: false, text: 'Против этой страны у нас нет санкций.' };
      p.ourSanc--; p.memory += 15; p.m *= 1.1; text = `Наши санкции против ${p.name} ослаблены.`; break;
    case 'aid': p.memory += 20; text = `Мы оказали помощь ${p.name} на сумму ${D.money(s, cost)}. Отношения заметно улучшатся.`; break;
    case 'alliance':
      p.allied = true; p.memory += 15; for (const q of s.ext.partners) if (q.threat && q !== p) q.memory -= 15;
      text = `Заключён военный союз с ${p.name}. Внешняя угроза снижается, но соперники союзника насторожились.`; break;
    case 'expel': p.memory -= 20; text = `Дипломаты ${p.name} высланы. Отношения резко ухудшатся.`; break;
  }
  const sumX = D.sum(s.ext.partners.map(q => q.x)), sumM = D.sum(s.ext.partners.map(q => q.m));
  if (sumX > 0.95) for (const q of s.ext.partners) q.x *= 0.95 / sumX;
  if (sumM > 0.95) for (const q of s.ext.partners) q.m *= 0.95 / sumM;
  s.ext.cool[key] = s.t + a.cool;
  D.logEvent(s, 'world', `${a.icon} ${a.name}: ${p.name}`, text + (effect ? ' ' + effect : ''), { partner: p.id });
  return { ok: true, text, effect, before, after: { rel: p.rel, x: p.x, m: p.m, tariffThem: p.tariffThem, tariffUs: p.tariffUs }, partner: p, act: a };
};
})();
