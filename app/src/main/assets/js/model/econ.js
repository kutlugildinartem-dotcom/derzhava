'use strict';
// Экономическое ядро (месячный шаг). Все потоки — в годовом выражении.
// Реальные величины — в ценах стартового года (национальная валюта), номинальные — в текущих.
//
//  Предложение:  Y* = A · K^α · (L·h·часы)^(1−α)  + сырьевой сектор Q
//  Спрос:        Y  = C + I + G + X − M;   разрыв выпуска gap = Y/Y* − 1
//  Труд:         закон Оукена u → u* − 0.4·gap;  зарплаты по кривой Филлипса
//  Цены:         π = πᵉ + κ·gap + издержки + курс + сырьё + налоги + деньги
//  ЦБ:           правило Тейлора i = r* + πᵉ + 0.5(π − π*) + 0.5·gap
//  Курс:         паритет процентных ставок + платёжный баланс + условия торговли
(function () {
const D = globalThis.D;
const ALPHA = 0.35, DELTA = 0.05;

// Буферы последних 36 месяцев для годовых темпов.
D.bufPush = function (s, k, v) {
  const b = s.buf[k] || (s.buf[k] = []);
  b.push(v); if (b.length > 37) b.shift();
};
D.bufAgo = function (s, k, n) {
  const b = s.buf[k]; if (!b || !b.length) return undefined;
  return b[Math.max(0, b.length - 1 - n)];
};
D.yoy = (s, k, n = 12) => { const a = D.bufAgo(s, k, 0), b = D.bufAgo(s, k, n); return b ? a / b - 1 : 0; };

// ---------- предложение ----------
function supply(s) {
  const e = s.e, p = s.pop, m = s.mods, pol = s.pol, c0 = s.c0;
  // Рабочая сила: трудоспособные × участие + работающие пенсионеры − призывники и студенты.
  const retire = pol.pension.age;
  const part = D.clamp(c0.lfpr + (m.lfpr || 0) - (pol.laws.freeUniv === 2 ? 0.01 : 0), 0.35, 0.92);
  const workAge = D.popAges(p.cohorts, 15, retire);
  // После выхода на пенсию работает часть людей: чем раньше пенсия, тем больше.
  const olderWorkers = D.popAges(p.cohorts, retire, 75) * D.clamp(0.1 - 0.02 * (retire - 60), 0.03, 0.25);
  e.LF = workAge * part + olderWorkers;
  // Естественная безработица: МРОТ, пособия, защита работников, несоответствие навыков.
  const mw = m.minWage;
  const benefit = pol.unemp.repl * Math.min(1, pol.unemp.months / 12);
  e.un = D.clamp(c0.un + (m.unat || 0)
    + 0.3 * Math.max(0, mw - 0.45) - 0.3 * Math.max(0, c0.mw - 0.45)
    + 0.04 * (benefit - c0.benefit)
    + 0.0005 * (c0.qEdu - e.qEdu)
    + 0.0004 * Math.max(0, s.inst.shadow - c0.shadow) * 100
    + (m.plan >= 1 ? -0.8 * c0.un : 0), 0.005, 0.3);
  // Человеческий капитал: средние годы обучения растут по мере смены поколений.
  const Starget = D.clamp(3 + 11.5 * e.qEdu / 100 + (m.schooling || 0) + 1.2 * Math.log(Math.max(1, s.ind.gdppcPPP) / 3000) * 0.5, 2, 15.5) + c0.Soff;
  e.S = D.approach(e.S, Starget, 1 / 240);
  e.h = Math.exp(0.08 * e.S);
  e.gA = tfp(s, true);
  e.A *= Math.exp(e.gA / 12);
  // Капитал: инвестиции минус износ.
  e.K = Math.max(e.K * 0.3, e.K + (e.I - DELTA * e.K) / 12);
  const hours = 1 + (m.hours || 0);
  const Estar = e.LF * (1 - e.un);
  e.Ynstar = e.A * Math.pow(e.K, ALPHA) * Math.pow(Estar * e.h * hours, 1 - ALPHA) * (1 - (e.supplyShock || 0));
  e.supplyShock = Math.max(0, (e.supplyShock || 0) * 0.93 - 0.001);
  // Сырьё: запасы × мощности; инвестиции в добычу поддерживают, санкции на технологии и истощение снижают.
  const resInv = D.clamp(e.I / Math.max(1, c0.I), 0.3, 2);
  const gQ = 0.012 * (resInv - 1) - 0.006 - 0.03 * s.ext.techBlock * c0.resTechDep + (m.resGrowth || 0);
  e.Qres = Math.max(0, e.Qres * Math.exp(gQ / 12));
  e.Ystar = e.Ynstar + e.Qres;
}

// Производительность (TFP): догоняющий рост, наука, образование, институты, открытость.
function tfp(s, noise) {
  const e = s.e, p = s.pop, m = s.mods, pol = s.pol, c0 = s.c0;
  const inst = D.clamp((s.inst.rol / 100) * (1 - s.inst.corr / 130), 0.05, 1);
  const frontier = 0.009;
  const catchup = 0.022 * Math.max(0, Math.log(60000 / Math.max(500, s.ind.gdppcPPP))) * Math.pow(inst, 1.3) * D.clamp(e.open / 0.5, 0.5, 1.3);
  const rnd = 0.35 * ((pol.spend.science || 0) - 0.006);
  const edu = 0.008 * (e.qEdu - 60) / 40;
  const infra = 0.006 * (s.ind.infra - 60) / 40;
  const comp = 0.005 * (s.inst.competition - 50) / 50;
  const plan = -0.018 * (m.plan || 0) - 0.006 * Math.max(0, s.inst.stateShare - 0.3);
  const shadow = -0.01 * Math.max(0, s.inst.shadow - 0.15);
  const sanc = -0.02 * s.ext.techBlock;
  const brain = -0.5 * Math.max(0, s.soc.emigRate * 12 - 0.004);
  const aging = -0.004 * Math.max(0, p.median - 40) / 10;
  const gA = frontier + catchup + rnd + edu + infra + comp + plan + shadow + sanc + brain + aging + (m.tfpG || 0) + c0.gAoff;
  e.gAparts = { frontier, catchup, rnd, edu, infra, comp, plan: plan + shadow, sanc: sanc + brain, aging, laws: (m.tfpG || 0), calib: c0.gAoff };
  return D.clamp(gA + (noise ? D.gauss(s) * 0.004 : 0), -0.04, 0.07);
}
D.supplyProbe = s => { s.e.gA = tfp(s, false); };

// ---------- ставки и курс ----------
D.ratesProbe = s => rates(s);
function rates(s) {
  const e = s.e, pol = s.pol, w = s.w, c0 = s.c0, m = s.mods;
  const cb = pol.cb;
  e.target = cb.regime === 'union' ? 0.02 : cb.target;
  // Премия за риск страны (спред) — зависит от рейтинга, долга, инфляции, политики, санкций.
  const sp = s.gov.spread;
  if (cb.regime === 'union') {
    e.i = D.approach(e.i, Math.max(0, w.i - 0.01 + 0.5 * (s.w.pi - 0.02)), 0.2);
  } else if (cb.independent) {
    const rn = c0.rn + 0.3 * (sp - c0.spread);
    const fxDefense = cb.regime !== 'float' ? D.clamp(-3 * (s.ext.resMonthsChg || 0), 0, 0.05) : 0;
    const iT = Math.max(0, rn + e.pie + 0.6 * (e.pi12 - e.target) + 0.5 * e.gap + fxDefense);
    e.iTaylor = iT;
    e.i = D.approach(e.i, D.clamp(iT, 0, 3), 0.25);
  } else {
    // Зависимый ЦБ: ставку задаёт правительство. На «автопилоте» ЦБ ведёт её сам,
    // но с политическим уклоном: мягче к инфляции, сильнее к поддержке роста.
    e.iTaylor = Math.max(0, c0.rn + e.pie + 0.6 * (e.pi12 - e.target) + 0.5 * e.gap);
    if (cb.auto !== false) {
      const iA = Math.max(0, c0.rn + e.pie + 0.4 * (e.pi12 - e.target) + 0.7 * e.gap);
      cb.rate = D.approach(cb.rate, D.clamp(iA, 0, 3), 0.2);
    }
    e.i = D.clamp(cb.rate, 0, 3);
  }
  const bankRisk = s.cfg.modules.banks ? D.clamp((e.npl - 0.04) * 0.5, -0.01, 0.1) + (m.bankRisk || 0) : 0;
  e.iL = e.i + 0.025 + bankRisk + 0.3 * sp;
  e.iMort = e.i + 0.018 + bankRisk * 0.7 + 0.2 * sp - (pol.spend.housing - c0.spend.housing) * 1.5;
  e.ig = e.i + 0.004 + sp;
  e.rF = w.i + 0.004 + sp * 1.1;
  e.rReal = e.i - e.pie;
  e.rLReal = e.iL - e.pie;
}

function exchange(s) {
  const e = s.e, pol = s.pol, w = s.w, c0 = s.c0, m = s.mods, x = s.ext, diff = D.DIFF[s.cfg.difficulty];
  const regime = pol.cb.regime;
  const erUsd = e.er;
  // Экспорт и импорт в долларах.
  const Pw = w.P;
  const XnUsd = e.Xn * e.P / erUsd;
  const XrUsd = e.Xr * w.com * Pw / c0.er;
  const MUsd = e.M * Pw / c0.er;
  const intF = s.gov.debtF * s.gov.rFeff;
  e.caUsd = XnUsd + XrUsd - MUsd - intF + c0.caOther * s.ind.gdpUsd;
  const capCtrl = D.clamp(m.capCtrl || 0, 0, 0.95);
  const gdpUsd = s.ind.gdpUsd;
  const expDeprec = D.clamp(Math.log(e.er / (D.bufAgo(s, 'er', 6) || e.er)) * 2, -0.3, 1);
  const carry = (e.i - e.pie) - (w.i - w.pi) - s.gov.spread - 0.01;
  const polRisk = D.clamp((40 - s.polit.approval) / 40, 0, 1) * 0.5 + s.polit.protest * 0.5 + (s.polit.instability || 0);
  e.fdiUsd = gdpUsd * c0.fdi * D.clamp(s.ind.investClimate, 0.1, 2.5) * (1 + (m.fdi || 0)) * (1 - x.finBlock) * (1 - capCtrl * 0.5);
  const portf = gdpUsd * 0.04 * Math.tanh(carry / 0.03) * (1 - capCtrl) * (1 - x.finBlock * 0.8) * diff.market;
  const flight = gdpUsd * (0.012 * polRisk + 0.015 * x.finBlock + 0.05 * Math.max(0, expDeprec) + (e.crisisFlight || 0)) * (1 - 0.75 * capCtrl);
  const govF = (s.fis.borrowF || 0) * 12 / e.er;
  e.kfUsd = e.fdiUsd + portf - flight + govF + c0.kfOther * gdpUsd;
  e.flightUsd = flight;
  const bop = e.caUsd + e.kfUsd;
  e.bopUsd = bop;
  const bopShare = D.clamp(bop / Math.max(1, gdpUsd), -0.25, 0.25);
  e.bopAvg = D.approach(e.bopAvg || 0, bopShare, 1 / 12);
  // Реальный курс равновесия: условия торговли, платёжный баланс, премия за риск, производительность.
  const tot = Math.log(Math.max(0.2, w.com / c0.com)) * c0.resExpShare;
  const bs = Math.log(e.A / c0.A) * 0.25;
  const lnq = -1.0 * tot - 2.0 * (e.bopAvg - c0.bopAvg) + 1.2 * (s.gov.spread - c0.spread) - 1.2 * D.clamp(carry - c0.carry, -0.15, 0.15) - bs + 0.25 * x.finBlock;
  const lnEeq = Math.log(c0.er) + Math.log(e.P / c0.P) - Math.log(Pw / c0.Pw) + lnq;
  e.erEq = Math.exp(lnEeq);
  const noise = D.gauss(s) * 0.008 * diff.market * (1 - capCtrl * 0.6);
  const monthRes = MUsd / 12;
  // При высокой инфляции курс подстраивается быстрее: люди бегут из национальной валюты.
  const fast = D.clamp(e.pi12 / 2, 0, 0.7);
  if (regime === 'float' || s.cfg.cur.reserve) {
    e.er = Math.exp(Math.log(e.er) + D.clamp((0.12 + fast) * (lnEeq - Math.log(e.er)) + noise, -0.2, 0.6));
  } else if (regime === 'managed') {
    // ЦБ сглаживает движение и тратит (или копит) резервы.
    const move = D.clamp((0.035 + fast) * (lnEeq - Math.log(e.er)), -0.1, 0.5);
    e.er = Math.exp(Math.log(e.er) + move + noise * 0.4);
    x.res += bop / 12 * 0.6;
  } else if (regime === 'peg') {
    x.res += bop / 12;
    e.pegPressure = lnEeq - Math.log(e.er);
  } else {
    // Валютный союз: курс к доллару плавает вместе с союзной валютой.
    e.er = Math.exp(Math.log(e.er) + 0.05 * (Math.log(e.erUnionEq || c0.er) - Math.log(e.er)) + D.gauss(s) * 0.006);
  }
  x.res = Math.max(0, x.res);
  x.resDelta = x.res - (x.resPrev || x.res); x.resPrev = x.res;
  x.resMonths = x.res / Math.max(1, monthRes);
  const prevM = x.resMonthsPrev || x.resMonths;
  x.resMonthsChg = (x.resMonths - prevM) / Math.max(1, prevM);
  x.resMonthsPrev = x.resMonths;
  // Кризис фиксированного/управляемого курса: резервы кончились — девальвация.
  if ((regime === 'peg' || regime === 'managed') && x.resMonths < 1.2 && !s.cfg.cur.reserve && s.t > 3) {
    const jump = Math.max(1.25, e.erEq / e.er * 1.1);
    const old = e.er;
    e.er *= jump;
    pol.cb.regime = 'float';
    e.crisisFlight = 0.04;
    D.logEvent(s, 'crisis', '💥 Девальвация: резервы кончились', `Центробанк больше не может удерживать курс: валютные резервы упали до ${D.fmt(x.resMonths, 1)} мес. импорта. Курс отпущен в свободное плавание и за месяц вырос с ${D.fmt(old, 2)} до ${D.fmt(e.er, 2)} за доллар. Импорт резко подорожает — ждите скачка цен. Так было в России в 1998 г., Аргентине в 2002 г., Таиланде в 1997 г.`, { kb: 'crisis.currency' });
    s.flags.currencyCrisis = s.t;
  }
  e.crisisFlight = Math.max(0, (e.crisisFlight || 0) * 0.9 - 0.001);
  e.q = (e.er / c0.er) * (Pw / c0.Pw) / (e.P / c0.P);
}

// ---------- спрос ----------
function demand(s) {
  const e = s.e, c0 = s.c0, m = s.mods, pol = s.pol, x = s.ext;
  const YD = s.fis.YDnom / e.P;
  // Потребление: доход × склонность к потреблению (бедные тратят большую долю),
  // ставки (дорогой кредит — больше сберегают), уверенность, богатство, кредит, дефицит.
  const rateEff = D.clamp(Math.exp(-1.0 * (e.rReal - c0.rReal)), 0.8, 1.15);
  const wealth = s.cfg.modules.housing ? 1 + 0.04 * (e.hpi / e.P / (c0.hpi / c0.P) - 1) : 1;
  const creditImp = D.clamp((D.yoy(s, 'L') - D.yoy(s, 'gdpNom')) * 0.25, -0.04, 0.04);
  const shortageBlock = 0.35 * e.shortage;
  const Ct = YD * c0.crr * (s.dist.mpc / c0.mpc) * rateEff * Math.pow(e.cconf, 0.2) * wealth * (1 + creditImp) * (1 - shortageBlock);
  e.C = D.approach(e.C, Ct, 0.25);
  // Инвестиции: зависят от реальной ставки, прибыльности, уверенности, институтов, загрузки мощностей.
  const profitF = Math.pow(D.clamp(e.profitShare / c0.profitShare, 0.3, 2), 0.7);
  const util = Math.pow(D.clamp(1 + e.gap, 0.7, 1.15), 0.7);
  const rateI = D.clamp(Math.exp(-2.5 * (e.rLReal - c0.rLReal)), 0.4, 1.6);
  const clim = s.ind.investClimate;
  // Убывающая отдача: чем больше капитала на единицу выпуска, тем ниже его предельный продукт.
  const mpk = Math.pow(D.clamp((e.Ynstar / e.K) / (c0.Ynstar / c0.K), 0.3, 3), 1.2);
  let It = e.Ynstar * c0.is * rateI * Math.pow(e.conf, 0.6) * profitF * clim * util * mpk * (1 + (m.invest || 0));
  if (m.plan >= 0.9) It = e.Ynstar * pol.plan.invest;
  else if (m.plan > 0) It = D.lerp(It, e.Ynstar * pol.plan.invest, m.plan);
  e.I = D.approach(e.I, It, 0.08);
  // Госзакупки (реально): из бюджета прошлого месяца.
  e.G = s.fis.purchNom / e.P;
  // Экспорт: мировой спрос, реальный курс, санкции, пошлины против нас.
  const q = D.clamp(e.q, 0.3, 3);
  const Xt = e.Ynstar * c0.xn * s.w.demand * Math.pow(q, 0.8) * (1 - x.exportBlock) * (1 - x.tariffHit) * Math.pow(e.A / c0.A, 0.3) / Math.pow(e.Ynstar / c0.Ynstar, 0.3);
  e.Xn = D.approach(e.Xn, Xt, 0.12);
  e.Xr = e.Qres * c0.xres * (1 - x.resBlock);
  // Импорт: доля в расходах падает при слабой валюте и высоких пошлинах.
  const tar = pol.tax.tariff * (1 - x.ftaShare * 0.8);
  const tariffF = Math.pow((1 + tar) / (1 + c0.tariff), -1.6);
  // При перегреве часть спроса уходит в импорт.
  const mp = c0.mp * Math.pow(q, -0.75) * tariffF * (1 - x.importBlock) * (1 + (m.importMult || 0)) * (1 + 1.5 * D.clamp(e.gapRaw || 0, 0, 0.1));
  const base = e.C + e.I + e.G + 0.3 * (e.Xn + e.Xr);
  e.M = D.approach(e.M, mp * base, 0.2);
  e.mp = mp;
  const AD = e.C + e.I + e.G + e.Xn + e.Xr - e.M;
  e.AD = AD;
  e.gapRaw = AD / e.Ystar - 1;
  let gap = e.gapRaw < 0 ? e.gapRaw : D.softcap(e.gapRaw, 0.05);
  // Перегрев: лишний спрос уходит в цены.
  const excess = e.gapRaw - gap;
  // Забастовки и протесты.
  const strikes = s.polit.strike || 0;
  gap -= strikes * 0.01;
  e.excess = excess;
  e.gap = D.clamp(gap, -0.4, 0.08);
  const Yprev = e.Y;
  e.Y = e.Ystar * (1 + e.gap);
  e.Yn = e.Y - e.Qres;
  e.dY = e.Y / Yprev - 1;
  e.open = D.approach(e.open, (e.Xn + e.Xr + e.M) / e.Y, 0.1);
}

// ---------- рынок труда ----------
function labor(s) {
  const e = s.e, c0 = s.c0, m = s.mods, pol = s.pol;
  const okun = 0.42;
  const uT = D.clamp(e.un - okun * e.gap, 0.005, 0.5);
  const speed = D.clamp(0.12 * (1 + (m.uSpeed || 0)), 0.04, 0.3);
  e.u = D.clamp(D.approach(e.u, uT, speed) + (e.uShock || 0), 0.004, 0.5);
  e.uShock = 0;
  e.E = e.LF * (1 - e.u);
  // Зарплаты: ожидания + производительность + напряжённость рынка труда (кривая Филлипса).
  const gProd = D.clamp(D.yoy(s, 'Ynstar') - D.yoy(s, 'LF'), -0.05, 0.08);
  const tight = 0.9 * (e.un - e.u);
  const emigPull = 2 * Math.max(0, s.soc.emigRate * 12 - 0.003);
  let mwPush = 0;
  if (m.minWage > e.mwPrev) mwPush = 0.12 * (m.minWage - e.mwPrev); // разовый рост низких зарплат
  e.mwPrev = m.minWage;
  e.wPipe = (e.wPipe || 0) + mwPush;
  const pipe = e.wPipe * 0.1; e.wPipe -= pipe;
  // Возврат доли зарплат к равновесию: если прибыль «съедает» всё больше ВВП, зарплаты догоняют.
  const lsGap = D.clamp(c0.laborShare - e.laborShare, -0.15, 0.15) * 0.6;
  const gw = e.pie + gProd * 0.9 + tight + lsGap + (m.wagePush || 0) + emigPull + (e.wageShock || 0);
  e.wageShock = 0;
  // Номинальные зарплаты почти не снижаются (контракты, профсоюзы, мораль) — кроме массовой безработицы.
  const floor = e.u > 0.15 ? -0.06 : -0.01;
  e.gw = Math.max(gw, floor);
  e.W *= Math.exp(D.clamp(e.gw / 12 + pipe, -0.05, 0.41));
  e.Wpub = e.W * pol.publicWage;
}

// ---------- цены ----------
// Уровни цен по категориям потребительской корзины. Разовые шоки (девальвация,
// рост НДС, цены на нефть) уходят в «конвейер» и проявляются в течение нескольких месяцев.
D.CPI_CATS = [
  { id: 'food', name: 'Продукты', icon: '🥖' },
  { id: 'goods', name: 'Товары (одежда, техника)', icon: '👕' },
  { id: 'serv', name: 'Услуги', icon: '💇' },
  { id: 'util', name: 'ЖКХ', icon: '💡' },
  { id: 'fuel', name: 'Топливо', icon: '⛽' },
  { id: 'rent', name: 'Аренда жилья', icon: '🏠' },
];
D.pipeAdd = function (s, cat, dln, months) {
  const pp = s.e.pipe[cat];
  for (let i = 0; i < months; i++) pp[i] = (pp[i] || 0) + dln / months;
};
function prices(s) {
  const e = s.e, c0 = s.c0, m = s.mods, pol = s.pol, w = s.w;
  // Ожидания и доверие к ЦБ.
  const credT = D.clamp((pol.cb.independent || pol.cb.regime === 'union' ? 0.72 : 0.35) + (m.cred || 0)
    - 1.5 * D.clamp(Math.abs(e.pi12 - e.target), 0, 0.4)
    - 4 * (s.fis.monetized || 0)
    - (s.gov.debtGdp > 1.2 ? 0.08 : 0), 0.02, 0.95);
  e.cred = D.approach(e.cred, credT, 0.03);
  const pi3 = Math.pow((e.P / (D.bufAgo(s, 'P', 3) || e.P)), 4) - 1;
  const adapt = 0.55 * e.pi12 + 0.45 * pi3;
  e.pie = D.clamp(D.approach(e.pie, e.cred * e.target + (1 - e.cred) * adapt, 0.3), -0.02, 10);
  // Базовая (устойчивая) инфляция.
  const gProd = D.clamp(D.yoy(s, 'Ynstar') - D.yoy(s, 'LF'), -0.05, 0.08);
  const ulc = 0.3 * D.clamp(D.yoy(s, 'W') - gProd - e.pie, -0.1, 0.5);
  // Кривая Филлипса выпуклая: при перегреве цены растут быстро, при спаде падают медленно.
  const demandP = (e.gap > 0 ? 0.45 : 0.22) * e.gap + 1.3 * e.excess;
  const gM2 = D.yoy(s, 'M2');
  const money = 0.35 * D.clamp(gM2 - (D.yoy(s, 'Ystar') + e.pie + 0.03), 0, 3);
  const mon = 1.8 * (s.fis.monetized || 0) * 12;
  const shortageRelief = 0;
  let core = e.pie + demandP + ulc + money + mon + shortageRelief;
  core = D.clamp(core, -0.08, 12);
  // Разовые шоки текущего месяца в конвейер.
  const er6 = e.er, erPrev = D.bufAgo(s, 'er', 0) || er6;
  const dlnE = Math.log(er6 / erPrev);
  const pt = D.clamp(0.25 + 0.6 * c0.mShare, 0.2, 0.7);
  if (Math.abs(dlnE) > 1e-5) {
    D.pipeAdd(s, 'goods', dlnE * pt, 6);
    D.pipeAdd(s, 'food', dlnE * pt * 0.6, 6);
  }
  const oilLocal = Math.log(w.oil * e.er / (w.oilPrev * erPrev));
  const shield = D.clamp(s.fis.fuelShield || 0, 0, 0.9);
  if (Math.abs(oilLocal) > 1e-5) D.pipeAdd(s, 'fuel', oilLocal * 0.45 * (1 - shield), 3);
  const grain = Math.log(w.grain / w.grainPrev);
  if (Math.abs(grain) > 1e-5) D.pipeAdd(s, 'food', grain * 0.25, 4);
  // Регулируемые тарифы ЖКХ: индексация задаётся правительством.
  const utilG = e.pie * pol.utilTariff / 12;
  // Аренда следует за ценами жилья (или заморожена).
  const rentG = s.cfg.modules.housing ? D.clamp((m.rentCtrl ? Math.min(D.yoy(s, 'hpi'), e.pie - 0.03) : 0.6 * D.yoy(s, 'hpi') + 0.4 * e.pie) / 12, -0.02, 0.05) : core / 12;
  const extra = { food: (m.foodShock || 0) / 12, goods: (m.goodsShock || 0) / 12, serv: 0.3 * (D.yoy(s, 'W') - core) / 12 * 0.3, util: 0, fuel: 0, rent: 0 };
  const ctrl = m.priceCtrl || 0;
  let dlnP = 0, suppressed = 0;
  const parts = e.piParts = { exp: 0, demand: 0, wages: 0, money: 0, fx: 0, energy: 0, food: 0, taxes: 0, util: 0, ctrl: 0, other: 0 };
  for (const cat of D.CPI_CATS) {
    const id = cat.id, wgt = c0.cpiW[id];
    let base;
    if (id === 'util') base = utilG;
    else if (id === 'rent') base = rentG;
    else base = core / 12;
    const pipeNow = e.pipe[id].shift() || 0; e.pipe[id].push(0);
    let d = base + pipeNow + extra[id];
    // Контроль цен: подавленная часть копится как «денежный навес» и дефицит.
    if (ctrl > 0 && id !== 'util') {
      const allowed = Math.min(d, 0.002);
      const sup = (d - allowed) * ctrl;
      d -= sup; suppressed += sup * wgt;
    }
    e.Pc[id] *= Math.exp(d);
    dlnP += wgt * d;
    // Вклады (в годовом выражении) — для объяснения «почему растут цены».
    const k = wgt * 12;
    if (id === 'util') parts.util += k * d;
    else if (id === 'rent') parts.other += k * d;
    else {
      const sh = (ctrl > 0 && id !== 'util') ? (1 - ctrl) : 1;
      parts.exp += k * e.pie / 12 * sh;
      parts.demand += k * demandP / 12 * sh;
      parts.wages += k * ulc / 12 * sh;
      parts.money += k * (money + mon) / 12 * sh;
      const pn = pipeNow * sh;
      if (id === 'fuel') parts.energy += k * pn; else if (id === 'food') parts.food += k * (pn + extra.food * sh); else parts.fx += k * pn;
      if (id === 'serv' || id === 'goods') parts.other += k * extra[id] * sh;
    }
  }
  const taxShock = e.taxPipe.shift() || 0; e.taxPipe.push(0);
  dlnP += taxShock; parts.taxes += taxShock * 12;
  for (const cat of D.CPI_CATS) if (cat.id !== 'util') e.Pc[cat.id] *= Math.exp(taxShock);
  parts.ctrl = -suppressed * 12;
  // Предохранитель: даже при гиперинфляции не больше +50% за месяц (иначе числа переполнятся).
  dlnP = D.clamp(dlnP, -0.03, 0.41);
  e.P *= Math.exp(dlnP);
  e.piM = dlnP;
  // Навес и дефицит при контроле цен.
  const Cnom = e.C * e.P;
  e.overhang = Math.max(0, (e.overhang || 0) * (1 - 0.02 - 0.05 * (1 - ctrl)) + suppressed * Cnom * 1.0);
  e.shortage = D.clamp(1.2 * e.overhang / (Cnom + 1) + (m.plan >= 0.9 ? 0.05 : 0), 0, 1);
  e.pi12 = e.P / (D.bufAgo(s, 'P', 11) || e.P) - 1;
}

// ---------- деньги, кредит, банки, жильё ----------
function finance(s) {
  const e = s.e, c0 = s.c0, m = s.mods, pol = s.pol, banks = s.cfg.modules.banks;
  const gNom = D.clamp(D.yoy(s, 'gdpNom'), -0.3, 3);
  // Кредит тянется к «равновесной» глубине (кредиты/ВВП): дешевле деньги и выше уверенность — глубже.
  const depth = e.L / Math.max(1, s.ind.gdpNom);
  const dev = Math.log(Math.max(0.3, s.ind.gdppcPPP) / c0.gdppcPPP) * 0.15;
  const depthT = c0.depth * Math.exp(-1.8 * (e.rLReal - c0.rLReal) + 0.4 * (e.conf - 1) + (m.credit || 0) * 3 + dev);
  const crunch = banks && e.car < 0.08 ? -0.12 * (0.08 - e.car) / 0.04 : 0;
  let gL = gNom + 0.12 * Math.log(depthT / Math.max(0.01, depth)) + crunch;
  if (s.cfg.modules.housing) gL += 0.3 * D.clamp(D.yoy(s, 'hpi') - gNom, -0.2, 0.3);
  gL = D.clamp(gL, -0.3, 2.5);
  e.L *= Math.exp(gL / 12);
  e.gL = gL;
  // Денежная масса: кредиты + печать денег под дефицит + покупка валюты ЦБ.
  const mon = (s.fis.monetized || 0) * s.ind.gdpNom;
  e.M2 = e.M2 * Math.exp((0.8 * gL + 0.2 * gNom) / 12) + mon + Math.max(0, (s.ext.resDelta || 0)) * e.er * 0.3;
  if (banks) {
    const uUp = Math.max(0, e.u - c0.u);
    const rUp = Math.max(0, e.iL - c0.iL);
    const recess = Math.max(0, -e.growthY);
    const crash = Math.max(0, -D.yoy(s, 'hpi')) * (s.cfg.modules.housing ? 0.3 : 0);
    const nplT = D.clamp(c0.npl + 0.9 * uUp + 0.35 * rUp + 0.35 * recess + crash + 0.0008 * (s.inst.corr - c0.corr) + (e.nplShock || 0), 0.005, 0.6);
    e.nplShock = Math.max(0, (e.nplShock || 0) * 0.95);
    const dnpl = (nplT - e.npl) * 0.05;
    e.npl += dnpl;
    const carT = D.clamp(0.14 - 1.3 * (e.npl - c0.npl) + (m.bankCap || 0), -0.1, 0.25);
    e.car = D.approach(e.car, carT, 0.04) - Math.max(0, dnpl) * 0.5;
  }
  // Жильё.
  if (s.cfg.modules.housing) {
    const gInc = D.clamp(D.yoy(s, 'W') + D.yoy(s, 'E'), -0.3, 2);
    const dMort = e.iMort - (D.bufAgo(s, 'iMort', 12) || e.iMort);
    const mom = D.clamp(D.yoy(s, 'hpi') - gInc, -0.3, 0.4);
    const PI = (e.hpi / c0.hpi) / (e.W / c0.W);
    e.hpiRatio = PI;
    const supply = (m.housingSupply || 0) * -0.03 + (pol.spend.housing - c0.spend.housing) * -2;
    const migr = s.soc.capitalInflow * 3;
    let gH = gInc + 0.7 * D.clamp(gL - gNom, -0.3, 0.5) - 2.5 * dMort + 0.45 * mom + migr + supply - 0.12 * Math.max(0, PI - 1.35);
    if (e.houseCrash > 0) { gH = Math.min(gH, -0.18); e.houseCrash--; }
    else if (PI > 1.45 && (dMort > 0.015 || e.car < 0.08) && D.chance(s, 0.04)) {
      e.houseCrash = 14;
      D.logEvent(s, 'crisis', '🏚️ Лопнул пузырь на рынке жилья', `Цены на жильё обогнали доходы в ${D.fmt(PI, 2)} раза по сравнению со стартом, а ипотека подорожала. Покупатели исчезли — цены пошли вниз. Застройщики сворачивают стройки, банки получают плохие долги. Так было в США в 2006–2008 гг., в Испании и Ирландии в 2008 г.`, { kb: 'crisis.bubble' });
      if (banks) e.nplShock = 0.04;
    }
    e.hpi *= Math.exp(D.clamp(gH, -0.4, 1.5) / 12);
  }
}

// ---------- доверие и структура ----------
function sentiment(s) {
  const e = s.e;
  const g = e.growthY, infl = e.pi12;
  const confT = D.clamp(1 + 3 * (g - s.c0.growth) - 0.8 * Math.max(0, infl - 0.1) - 0.4 * s.polit.protest - 0.3 * s.ext.finBlock
    - 0.5 * Math.max(0, s.gov.spread - s.c0.spread) + (e.confShock || 0), 0.3, 1.5);
  e.conf = D.clamp(D.approach(e.conf, confT, 0.15), 0.6, 1.3);
  const cT = D.clamp(1 + 2 * (g - s.c0.growth) - 3 * Math.max(0, e.u - s.c0.u) - 1.0 * Math.max(0, infl - 0.08) - 0.5 * e.shortage + (e.confShock || 0), 0.3, 1.4);
  e.cconf = D.clamp(D.approach(e.cconf, cT, 0.15), 0.65, 1.2);
  e.confShock = (e.confShock || 0) * 0.85;
}

function sectors(s) {
  const e = s.e, c0 = s.c0, pol = s.pol, m = s.mods, w = s.w;
  const sec = e.sec;
  const q = Math.log(D.clamp(e.q, 0.3, 3));
  const drv = {
    agr: 0.25 * q + 3 * (pol.spend.agri - c0.spend.agri) + 0.15 * Math.log(w.grain) + (m.importMult < 0 ? 0.05 : 0) - 0.01,
    manuf: 0.35 * q + 2 * (pol.spend.industry - c0.spend.industry) - 0.15 * s.ext.techBlock + 0.004 * (s.inst.competition - 50) / 10 + 0.3 * (pol.tax.tariff - c0.tariff) - 0.005,
    constr: 1.2 * (e.I / e.Y - c0.is) + (s.cfg.modules.housing ? 0.3 * D.clamp(D.yoy(s, 'hpi') - e.pi12, -0.3, 0.3) : 0),
    trade: 0.4 * (e.C / e.Y - c0.cShare) + 0.1 * e.gap,
    serv: 0.006 + 0.3 * (e.C / e.Y - c0.cShare),
    it: 0.02 * (e.qEdu - 60) / 40 + 0.01 * (s.ind.infraNet - 60) / 40 - (pol.laws.internet > 0 ? 0.02 * pol.laws.internet : 0) - 3 * Math.max(0, s.soc.emigRate * 12 - 0.004) + 0.012,
    fin: 0.15 * D.clamp(D.yoy(s, 'L') - D.yoy(s, 'gdpNom'), -0.3, 0.3) - 0.5 * (pol.tax.fintx || 0) * 10,
  };
  let tot = 0;
  for (const id in drv) { sec[id] *= Math.exp(D.clamp(drv[id], -0.5, 0.5) / 12); tot += sec[id]; }
  // Доля сырья определяется стоимостью добычи.
  const resNom = e.Qres * w.com * w.P / c0.Pw * (e.er / c0.er) * c0.P;
  const mShare = D.clamp(resNom / Math.max(1, s.ind.gdpNom) / (1 - c0.govVA), 0, 0.8);
  for (const id in drv) sec[id] = sec[id] / tot * (1 - mShare);
  sec.mining = mShare;
}

// Главная функция экономического месяца.
D.stepEconomy = function (s) {
  supply(s);
  rates(s);
  exchange(s);
  demand(s);
  labor(s);
  prices(s);
  // Номинальный ВВП: несырьевой по ИПЦ + сырьё по мировым ценам.
  const e = s.e, c0 = s.c0, w = s.w;
  const resNom = e.Qres * w.com * (w.P / c0.Pw) * (e.er / c0.er) * c0.P;
  s.ind.gdpNom = e.Yn * e.P + resNom;
  s.ind.resNom = resNom;
  s.ind.gdpUsd = s.ind.gdpNom / e.er;
  s.ind.gdppc = s.ind.gdpUsd / s.popTotal;
  s.ind.gdppcPPP = s.ind.gdppc * D.clamp(Math.pow(55000 / Math.max(300, s.ind.gdppc), 0.33), 1, 3.2) * c0.pppAdj;
  e.growthY = e.Y / (D.bufAgo(s, 'Y', 11) || e.Y) - 1;
  finance(s);
  sentiment(s);
  sectors(s);
  // Доли дохода: труд против прибыли.
  const wageBill = e.W * 12 * e.E * (1 + s.pol.tax.ssc_er * (1 - s.inst.shadow));
  e.laborShare = D.clamp(wageBill / s.ind.gdpNom, 0.2, 0.85);
  e.profitShare = D.clamp(1 - e.laborShare - s.fis.indirectShare, 0.05, 0.7);
};
D.ALPHA = ALPHA; D.DELTA = DELTA;
})();
