'use strict';
// Общество: институты, благосостояние, регионы и миграция, социальные группы, политика.
(function () {
const D = globalThis.D;
const incomeLE = y => 30 * (1 - Math.exp(-y / 12000));
D.incomeLE = incomeLE;

// Качество услуги по расходам: x = (доля ВВП / норма)^0.7 × (доход на душу / 30 000 $)^0.35 × эффективность.
D.quality = (share, norm, gdppc, eff) => 100 * (1 - Math.exp(-1.2 * Math.pow(Math.max(0, share) / norm, 0.7) * Math.pow(Math.max(300, gdppc) / 30000, 0.35) * eff));

// ---------- институты ----------
function institutions(s) {
  const I = s.inst, m = s.mods, c0 = s.c0, pol = s.pol, e = s.e, o = c0.off;
  I.stateShare = D.approach(I.stateShare, pol.stateShare, 1 / 24);
  I.press = D.clamp(60 + (m.press || 0), 0, 100);
  I.assembly = D.clamp(60 + (m.assembly || 0), 0, 100);
  I.freedom = D.clamp(55 + (m.freedom || 0) - (s.polit.fraudScandal || 0) * 0.3, 0, 100);
  const corrT = o.corr + (m.corr || 0) + 25 * (I.stateShare - c0.stateShare) + 25 * (e.sec.mining - c0.resShareSec)
    - 10 * (pol.publicWage - c0.publicWage) + 0.1 * (s.polit.fraudLevel || 0);
  I.corr = D.clamp(D.approach(I.corr, corrT, 1 / 60), 0, 100);
  const rolT = o.rol + (m.rol || 0) - 0.45 * (I.corr - c0.corr) + 300 * ((pol.spend.courts || 0) - c0.spend.courts);
  I.rol = D.clamp(D.approach(I.rol, rolT, 1 / 48), 0, 100);
  const wedge = D.topPitRate(pol) * 0.3 + pol.tax.pit * 0.4 + pol.tax.ssc_er + pol.tax.ssc_ee + pol.tax.vat * 0.4;
  const shadowT = o.shadow + (m.shadow || 0) + 0.35 * (wedge - c0.wedge) + 0.0018 * (c0.biz - I.biz) + 0.0025 * (I.corr - c0.corr)
    + 0.25 * Math.max(0, m.minWage - 0.45) + 0.35 * e.shortage + 0.1 * Math.max(0, e.u - c0.u);
  I.shadow = D.clamp(D.approach(I.shadow, shadowT, 1 / 36), 0.02, 0.8);
  I.competition = D.clamp(D.approach(I.competition, 50 + (m.competition || 0) - 25 * Math.max(0, I.stateShare - 0.2) + 10 * (e.open - 0.5), 1 / 24), 0, 100);
  I.biz = D.clamp(D.approach(I.biz, 50 + (m.biz || 0) - 0.25 * (I.corr - 50) + 0.1 * (I.rol - 50), 1 / 24), 0, 100);
  const trustT = 0.4 * s.polit.approval + 0.3 * (100 - I.corr) + 10 + (m.trust || 0) - (s.polit.fraudScandal || 0);
  I.trust = D.clamp(D.approach(I.trust, trustT, 1 / 12), 0, 100);
  const pollT = o.pollution + 70 * ((e.sec.manuf + e.sec.mining) - c0.dirtyShare) - 500 * ((pol.spend.ecology || 0) - c0.spend.ecology)
    - 0.08 * pol.tax.carbon + (m.pollution || 0) + 4 * Math.log(Math.max(0.2, e.Y / c0.Y));
  I.pollution = D.clamp(D.approach(I.pollution, pollT, 1 / 36), 2, 100);
  const crimeT = o.crime + 160 * (e.u - c0.u) + 60 * (s.dist.gini - c0.gini) + 40 * (s.dist.povertyAbs - c0.povertyAbs)
    - 350 * ((pol.spend.police || 0) - c0.spend.police) - 200 * ((pol.spend.courts || 0) - c0.spend.courts)
    + (m.crime || 0) + 0.25 * (I.corr - c0.corr) + 30 * e.shortage;
  I.crime = D.clamp(D.approach(I.crime, crimeT, 1 / 24), 1, 100);
}

// ---------- благосостояние ----------
function welfare(s) {
  const e = s.e, c0 = s.c0, pol = s.pol, m = s.mods, f = s.fis, I = s.inst, p = s.pop, o = c0.off, ind = s.ind;
  const eff = f.effSpend;
  const hShare = (f.eff.health || 0) / ind.gdpNom;
  const eShare = ((f.eff.school || 0) + (f.eff.univ || 0)) / ind.gdpNom;
  e.qHealthT = D.quality(hShare, 0.065, ind.gdppcPPP, eff) + (m.le || 0) * 0 + o.qHealth;
  e.qEduT = D.quality(eShare, 0.045, ind.gdppcPPP, eff) + o.qEdu;
  e.qHealth = D.clamp(D.approach(e.qHealth, e.qHealthT, 1 / 36), 0, 100);
  e.qEdu = D.clamp(D.approach(e.qEdu, e.qEduT, 1 / 60), 0, 100);
  // Продолжительность жизни (кривая Престона + медицина + экология + бедность).
  p.leTarget = D.clamp(o.le + incomeLE(ind.gdppcPPP) + 0.12 * (e.qHealth - c0.qHealth) - 0.06 * (I.pollution - c0.pollution)
    - 12 * (s.dist.povertyAbs - c0.povertyAbs) + (m.le || 0) - 3 * e.shortage - 0.03 * (I.crime - c0.crime), 35, 90);
  // Рождаемость.
  const afford = s.ind.affordYears || c0.afford;
  const incG = D.clamp(D.yoy(s, 'realInc', 24) / 2, -0.2, 0.2);
  p.tfrTarget = D.clamp(o.tfr + 2.2 * (pol.child - c0.child) + (m.tfr || 0) + 1.2 * incG - 2 * (e.u - c0.u) - 0.03 * (afford - c0.afford)
    - 0.006 * (e.qEdu - c0.qEdu) - 0.3 * e.shortage + 0.15 * (e.cconf - 1) - 0.25 * Math.log(Math.max(0.3, ind.gdppcPPP / c0.gdppcPPP)) * 0.5, 0.6, 7.5);
  // Счастье по шкале 0–10 (как в World Happiness Report).
  const happy = o.happy + 0.45 * Math.log(Math.max(0.1, ind.gdppcPPP / c0.gdppcPPP)) - 5 * (e.u - c0.u) - 3 * Math.max(0, e.pi12 - Math.max(0.04, c0.infl))
    + 0.015 * (I.freedom - c0.freedom) + 0.012 * (I.trust - c0.trust) - 3 * (s.dist.gini - c0.gini) + 0.03 * (p.le - c0.le)
    - 0.01 * (I.crime - c0.crime) - 2 * e.shortage - 0.012 * (I.corr - c0.corr) + 0.005 * (ind.infra - c0.infra) - (s.flags.war ? 0.8 : 0);
  ind.happy = D.clamp(D.approach(ind.happy, happy, 0.1), 0, 10);
  // Индекс человеческого развития (ИЧР) по методике ООН.
  const hI = D.clamp((p.le - 20) / 65, 0, 1);
  const eI = D.clamp((e.S / 15 + Math.min(18, e.S * 1.3) / 18) / 2, 0, 1);
  const iI = D.clamp((Math.log(Math.max(100, ind.gdppcPPP * 0.95)) - Math.log(100)) / (Math.log(75000) - Math.log(100)), 0, 1);
  ind.hdi = Math.cbrt(hI * eI * iI);
  // Доступность жилья: сколько лет копить среднюю зарплату на квартиру 54 м².
  ind.affordYears = s.cfg.modules.housing ? c0.afford * (e.hpi / c0.hpi) / (e.W / c0.W) : c0.afford;
  // Миграция за рубеж.
  const repress = m.repress || 0;
  const pull = Math.log(Math.max(1, 45000 / ind.gdppcPPP)) * 0.25 + (5.5 - ind.happy) * 0.25 + repress * 0.6 + (s.flags.war ? 1 : 0) + 2 * Math.max(0, e.u - 0.08) + 0.5 * e.shortage;
  s.soc.emigRate = D.clamp(c0.emigBase * Math.exp(pull - c0.pull) * (1 + (m.emig || 0)), 0, 0.004);
  const immLaw = [0.1, 1, 1.3, 2.6][pol.laws.immigration];
  const attract = D.sigmoid((ind.gdppcPPP - 12000) / 9000) * (1 - repress * 0.5) * (s.flags.war ? 0.2 : 1);
  s.soc.immigRate = D.clamp(c0.immigBase * immLaw * attract / c0.attract * (1 + (m.immig || 0) - (m.immig < 0 ? 0 : 0)), 0, 0.004);
}

// ---------- регионы ----------
function regions(s) {
  const e = s.e, f = s.fis, pol = s.pol, ind = s.ind, c0 = s.c0;
  const R = s.regions, tot = s.popTotal, sec = e.sec;
  let wsum = 0;
  for (const r of R) {
    let mix = 0;
    for (const id in sec) mix += sec[id] * (r.w[id] || 1);
    r.weight = D.popAges(r.coh, 15, 65) * r.prod * mix * (0.7 + 0.3 * r.infraAvg / 60);
    wsum += r.weight;
  }
  // Межбюджетные трансферты: часть по численности, часть — по «нужде» (выравнивание).
  const need = f.needReg, eq = pol.regional.equal, trans = f.transfers;
  let gapSum = 0;
  for (const r of R) {
    r.grpShare = r.weight / wsum;
    r.grp = ind.gdpNom * r.grpShare;
    r.grppc = r.grp / r.pop / e.er;
    r.popShare = r.pop / tot;
    r.ownRev = f.regRev * r.grpShare;
    r.need = need * r.popShare;
    r.gap = Math.max(0, r.need - r.ownRev);
    gapSum += r.gap;
  }
  const effG = f.effSpend;
  for (const r of R) {
    r.trans = trans * ((1 - eq) * r.popShare + eq * (gapSum > 0 ? r.gap / gapSum : r.popShare));
    r.fund = D.clamp((r.ownRev + r.trans) / Math.max(1, r.need), 0.25, 1.8);
    r.balance = r.ownRev + r.trans - r.need;
    // Зарплаты и безработица в регионе.
    const perW = r.grp / Math.max(1, D.popAges(r.coh, 15, 65));
    const natPerW = ind.gdpNom / Math.max(1, D.popAges(s.pop.cohorts, 15, 65));
    r.wageRel = D.approach(r.wageRel, Math.pow(perW / natPerW, 0.6), 1 / 24);
    r.u = D.clamp(e.u * r.uRel * (1 + 0.4 * (55 - r.infraAvg) / 55), 0.005, 0.6);
    // Инфраструктура: федеральная часть по численности, региональная — сколько регион может оплатить.
    const gpc = ind.gdppcPPP * Math.pow(r.wageRel, 0.5);
    const lvlMix = x => (D.SP[x].lvl.f + (D.SP[x].lvl.r + D.SP[x].lvl.l) * r.fund);
    const share = id => (f.exp[id] || 0) / ind.gdpNom;
    const tg = {
      road: D.quality(share('roads') * lvlMix('roads'), 0.025, gpc, effG),
      util: D.quality((share('utilities') + share('tariffsub') * 0.5) * lvlMix('utilities') * Math.min(1.2, f.utilFund), 0.015, gpc, effG),
      health: D.quality(share('health') * lvlMix('health'), 0.065, gpc, effG),
      school: D.quality((share('school') + share('univ') * 0.4) * lvlMix('school'), 0.04, gpc, effG),
      net: D.quality(share('roads') * 0.3 + e.sec.it * 0.12 + share('science') * 0.5, 0.015, gpc, effG),
    };
    const speed = { road: 1 / 72, util: 1 / 48, health: 1 / 36, school: 1 / 36, net: 1 / 30 };
    let sum = 0;
    for (const k in tg) {
      if (s.initMode) { r.tgt0 = r.tgt0 || {}; r.tgt0[k] = tg[k]; continue; }
      const t = D.clamp(tg[k] + r.infraOff[k] + (r.boost[k] || 0), 0, 100);
      r.infra[k] = D.clamp(D.approach(r.infra[k], t, speed[k]), 0, 100);
      r.boost[k] = (r.boost[k] || 0) * (1 - 1 / 300);
      sum += r.infra[k];
    }
    r.infraAvg = sum / 5;
    r.crime = D.clamp(s.inst.crime + r.crimeOff, 1, 100);
    r.mood = D.clamp(s.polit.approval + (r.wageRel - 1) * 20 - (r.u - e.u) * 150 + (r.infraAvg - (ind.infra || 60)) * 0.25 - (r.fund < 0.9 ? (0.9 - r.fund) * 30 : 0), 0, 100);
    r.pollution = D.clamp(s.inst.pollution + r.pollOff, 1, 100);
  }
  if (s.initMode) {
    for (const r of R) { r.infraAvg = D.avg(Object.values(r.infra)); r.attr = 0; r.netMig = 0; }
  }
  // Внутренняя миграция: люди едут туда, где выше зарплаты, ниже безработица, лучше сервис и доступнее жильё.
  const mob = D.clamp(1 - 0.5 * Math.max(0, (ind.affordYears || 8) - 8) / 8, 0.3, 1);
  for (const r of R) {
    r.attr = Math.log(r.wageRel) - 3 * r.u + 0.006 * r.infraAvg - 0.3 * Math.log(r.hpiRel) + 0.003 * (100 - r.crime) + (r.cap ? 0.08 : 0);
    r.netMig = 0;
  }
  if (!s.initMode) for (const a of R) for (const b of R) {
    const d = b.attr - a.attr;
    if (d <= 0.02) continue;
    const flow = a.pop * 0.00022 * (d - 0.02) * mob;
    D.moveAges(a.coh, 20, 40, -flow);
    D.moveAges(b.coh, 20, 40, flow);
    a.netMig -= flow; b.netMig += flow;
  }
  let capIn = 0;
  for (const r of R) {
    const inflow = r.netMig / Math.max(1, r.pop) * 12;
    r.hpiRel = D.approach(r.hpiRel, r.hpiBase * (1 + 4 * D.clamp(inflow, -0.05, 0.05)) * Math.pow(r.wageRel, 0.8), 1 / 24);
    if (r.cap) capIn = inflow;
  }
  s.soc.capitalInflow = capIn;
  D.refreshPopTotals(s);
  // Средние по стране (взвешенные по населению).
  const keys = ['road', 'util', 'health', 'school', 'net'];
  const nat = {};
  for (const k of keys) nat[k] = 0;
  for (const r of R) for (const k of keys) nat[k] += r.infra[k] * r.pop / s.popTotal;
  ind.infraParts = nat;
  ind.infra = (nat.road + nat.util + nat.health + nat.school + nat.net) / 5;
  ind.infraNet = nat.net;
  // Разрыв между регионами: отношение ВРП на душу самого богатого к самому бедному.
  const pcs = R.map(r => r.grppc);
  ind.regGap = Math.max(...pcs) / Math.max(1, Math.min(...pcs));
  ind.investClimate = D.clamp(Math.pow((100 - s.inst.corr) / (100 - c0.corr), 0.6) * Math.pow(Math.max(5, s.inst.rol) / c0.rol, 0.3) * (1 + 0.004 * (s.inst.biz - c0.biz)) * (1 - 0.3 * s.polit.instability), 0.1, 2.5);
}

// ---------- социальные группы ----------
function groupSizes(s) {
  const e = s.e, p = s.pop, sec = e.sec, f = s.fis;
  const A = Math.max(1, p.adults);
  const E = e.E;
  return {
    pensioners: p.elderly / A,
    workers: E * (sec.manuf + sec.mining + sec.constr + sec.trade * 0.4) / A,
    public: f.pubEmp / A,
    office: E * (sec.fin + sec.it + sec.serv * 0.45 + sec.trade * 0.3) / A,
    smallbiz: 0.06 * D.clamp(s.inst.biz / 50, 0.2, 2) * (1 - (s.mods.plan || 0) * 0.9),
    bigbiz: 0.002 * (1 - (s.mods.plan || 0) * 0.95),
    youth: D.popAges(p.cohorts, 18, 30) / A,
    families: p.children * 1.1 / A,
    poor: D.clamp(s.dist.povertyAbs * 0.8 + e.u * 0.6, 0.01, 0.8),
    military: f.milEmp / A * 2,
    farmers: E * sec.agr * 1.2 / A,
    intel: (0.02 + e.sec.it * 0.2 + (s.pol.spend.science || 0) * 4) ,
  };
}

function realInc(s, g) {
  const e = s.e, f = s.fis, d = s.dist;
  switch (g) {
    case 'pensioners': return f.pensionLevel / e.P;
    case 'public': case 'military': case 'intel': return e.Wpub / e.P;
    case 'poor': return (d.dispPC[0] + d.dispPC[1]) / e.P;
    case 'families': return (d.dispPC[3] + d.dispPC[4] + d.dispPC[5]) / e.P;
    case 'smallbiz': return e.profitShare * s.ind.gdpNom / e.P * (1 - s.pol.tax.sme);
    case 'bigbiz': return e.profitShare * s.ind.gdpNom / e.P * (1 - s.pol.tax.cit);
    case 'farmers': return e.sec.agr * e.Y * (1 + (s.pol.spend.agri || 0) * 10);
    default: return e.W / e.P;
  }
}

function groups(s) {
  const e = s.e, c0 = s.c0, m = s.mods, pol = s.pol, I = s.inst, f = s.fis, diff = D.DIFF[s.cfg.difficulty];
  const sizes = groupSizes(s);
  const GDP = s.ind.gdpNom;
  let vote = 0, wsum = 0, power = 0, pw = 0;
  for (const def of D.GROUPS) {
    const id = def.id, G = s.groups[id];
    G.size = D.clamp(sizes[id], 0.0005, 0.9);
    const ri = realInc(s, id);
    D.bufPush(s, 'gi_' + id, ri);
    const why = [];
    const add = (label, v) => { if (Math.abs(v) >= 0.5) why.push({ label, v }); return v; };
    let t = 55 + diff.mood + add('Законы и решения', (m.groups[id] || 0)) + add('События', G.shock || 0);
    const g12 = ri / (D.bufAgo(s, 'gi_' + id, 12) || ri) - 1;
    t += add('Реальные доходы за год', D.clamp(g12 * 130, -25, 15));
    const infW = { pensioners: 1.4, poor: 1.4, families: 1.1, bigbiz: 0.4 }[id] || 1;
    t += add('Инфляция', -D.clamp(Math.max(0, e.pi12 - 0.04) * 80 * infW, 0, 32));
    const uW = { workers: 200, youth: 230, poor: 260, farmers: 90, smallbiz: 80 }[id] || 60;
    t += add('Безработица', -D.clamp(Math.max(0, e.u - 0.05) * uW, 0, 30));
    // Налоги: и абсолютный уровень (выше нормы), и изменения со старта.
    let tax = 0;
    for (const tx of D.TAXES) {
      const k = tx.mood[id]; if (!k) continue;
      const scale = tx.unit === '$/т' ? 60 : tx.unit === '×' ? 1 : 0.1;
      const r = pol.tax[tx.id];
      tax += k * Math.max(0, r - tx.norm.hi) / scale + k * (r - c0.tax[tx.id]) / scale * 0.7;
    }
    if (id === 'office' || id === 'intel') tax += -6 * Math.max(0, D.topPitRate(pol) - Math.max(0.45, c0.topPit)) / 0.1;
    t += add('Налоги', D.clamp(tax, -30, 12));
    // Расходы бюджета.
    let sp = 0;
    for (const x of D.SPEND_DISC) {
      const k = x.mood && x.mood[id]; if (!k) continue;
      const mid = (x.norm.lo + x.norm.hi) / 2;
      const share = (f.eff[x.id] || 0) / GDP;
      sp += k * D.clamp((share - c0.effShare[x.id]) / mid, -1, 1.5) * 0.8 + (share < x.norm.lo * 0.5 ? -k * 0.3 : 0);
    }
    if (id === 'pensioners') sp += 70 * (f.pensionRepl - c0.pensionRepl) + (pol.pension.age - c0.retAge) * -2.2;
    if (id === 'workers') sp += (pol.pension.age - c0.retAge) * -1.2;
    if (id === 'poor') sp += 40 * (pol.unemp.repl - c0.unempRepl) * 0.3 + 40 * (pol.gmi - c0.gmi) + 30 * pol.ubi;
    if (id === 'families') sp += 120 * (pol.child - c0.child);
    t += add('Бюджетные расходы', D.clamp(sp, -30, 20));
    const corrW = { office: 1.5, smallbiz: 1.6, intel: 1.6, bigbiz: -0.3, military: 0.5 }[id] ?? 1;
    t += add('Коррупция', -(I.corr - 45) * 0.07 * corrW);
    if (id === 'intel' || id === 'youth' || id === 'office') t += add('Свободы', (I.freedom - 50) * 0.12);
    if (id === 'military' || id === 'pensioners') t += add('Порядок', (50 - I.freedom) * 0.03);
    t += add('Дефицит товаров', -e.shortage * 45);
    if (id === 'youth' || id === 'families') t += add('Цены на жильё', -D.clamp(((s.ind.affordYears || 7) - 7) * 1.2, -5, 20));
    t += add('Преступность', -(I.crime - 40) * 0.06);
    if (id === 'poor') t += add('Бедность', -D.clamp((s.dist.povertyAbs - 0.1) * 40, -5, 25));
    if (id === 'military') t += add('Армия', D.clamp(((f.eff.defense || 0) / GDP - 0.02) * 250, -12, 12));
    if (id === 'farmers') t += add('Село', (s.ind.infra - 50) * 0.06);
    if (s.flags.rally > s.t && (id === 'pensioners' || id === 'military' || id === 'workers')) t += add('Сплочение вокруг флага', 5);
    if (s.t < 12) t += add('Медовый месяц власти', 6 * (1 - s.t / 12));
    G.target = D.clamp(t, 0, 100);
    G.mood = D.clamp(D.approach(G.mood, G.target, 0.08), 0, 100);
    G.shock = (G.shock || 0) * 0.93;
    why.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    G.why = why.slice(0, 6);
    vote += G.size * G.mood; wsum += G.size;
    power += def.power * G.size * G.mood; pw += def.power * G.size;
  }
  s.polit.approval = D.clamp(vote / wsum, 0, 100);
  s.polit.eliteMood = power / pw;
}

// ---------- протесты, стабильность ----------
function unrest(s) {
  const P = s.polit, m = s.mods, I = s.inst;
  let pr = 0, ws = 0;
  for (const def of D.GROUPS) {
    const G = s.groups[def.id];
    pr += G.size * Math.max(0, 38 - G.mood) / 38; ws += G.size;
  }
  const raw = D.clamp(pr / ws * 2.2 * (0.4 + I.assembly / 100) * (1 + (m.protest || 0)), 0, 1);
  const repress = D.clamp(m.repress || 0, 0, 0.9);
  P.protest = D.approach(P.protest, raw * (1 - repress), 0.2);
  P.tension = D.clamp((P.tension || 0) * 0.98 + raw * repress * 0.03, 0, 1);
  const wk = s.groups.workers, pb = s.groups.public;
  const unions = s.pol.laws.unions;
  P.strike = unions === 0 ? 0 : D.clamp(((wk.mood < 32 ? (32 - wk.mood) / 32 : 0) + (pb.mood < 30 ? (30 - pb.mood) / 30 : 0)) * (unions === 2 ? 1 : 0.5) * (1 + (m.strikes || 0)), 0, 1);
  P.instability = D.clamp(P.protest * 1.3 + (P.approval < 25 ? (25 - P.approval) / 25 * 0.4 : 0) + P.tension * 0.5 + (s.flags.war ? 0.2 : 0), 0, 1);
  if (P.approval < 22) P.lowMonths = (P.lowMonths || 0) + 1; else P.lowMonths = 0;
  // Революция: долгое падение рейтинга, массовые протесты, а силовики не хотят разгонять.
  const reg = D.REGIME[s.pol.regime];
  // Первые два года у новой власти есть кредит доверия; дальше долгий провал рейтинга опасен.
  if (!s.over && s.t > 24 && P.lowMonths >= 12 && (P.protest > 0.4 || P.tension > 0.55) && s.groups.military.mood < 40) {
    if (D.chance(s, 0.04 * D.DIFF[s.cfg.difficulty].events)) D.gameOver(s, 'revolution');
  }
  if (!s.over && s.t > 24 && !reg.dem && s.groups.military.mood < 20 && D.chance(s, 0.015)) D.gameOver(s, 'coup');
  if (!s.over && s.t > 24 && !reg.dem && s.groups.bigbiz.mood < 12 && s.groups.military.mood < 30 && D.chance(s, 0.01)) D.gameOver(s, 'coup');
}

// ---------- выборы ----------
D.pollShares = function (s, extra) {
  const P = s.polit, parties = P.parties;
  const share = parties.map(() => 0);
  let tot = 0;
  for (const def of D.GROUPS) {
    if (def.id === 'bigbiz') continue;
    const G = s.groups[def.id];
    const turnout = { pensioners: 0.75, youth: 0.45, poor: 0.45 }[def.id] || 0.6;
    const w = G.size * turnout;
    const inc = D.sigmoid((G.mood - 47) / 9);
    share[0] += w * inc;
    const rest = w * (1 - inc);
    const aff = parties.map((p, i) => i === 0 ? 0 : Math.exp(-2.5 * Math.hypot(p.e - def.ideo.e, p.s - def.ideo.s)));
    const as = D.sum(aff) || 1;
    for (let i = 1; i < parties.length; i++) share[i] += rest * aff[i] / as;
    tot += w;
  }
  for (let i = 0; i < share.length; i++) share[i] /= tot;
  // Оппозиция ограничена/запрещена — её голоса частично уходят партии власти или «против всех».
  const weak = D.clamp(s.mods.oppWeak || 0, 0, 1);
  if (weak > 0) {
    let moved = 0;
    for (let i = 1; i < share.length; i++) { const d = share[i] * weak * 0.6; share[i] -= d; moved += d; }
    share[0] += moved * 0.5;
    const t2 = D.sum(share); for (let i = 0; i < share.length; i++) share[i] /= t2;
  }
  if (extra) {
    share[0] = D.clamp(share[0] + extra, 0, 0.99);
    const rest = D.sum(share.slice(1)) || 1;
    for (let i = 1; i < share.length; i++) share[i] = share[i] / rest * (1 - share[0]);
  }
  return share;
};

// Места в парламенте: проходной барьер 5%, пропорционально.
D.seatsFrom = function (shares) {
  const pass = shares.map(x => x >= 0.05 ? x : 0);
  const t = D.sum(pass) || 1;
  return pass.map(x => x / t);
};

// Бонусы от фальсификаций (п.п.) и вероятность разоблачения.
D.FRAUD = [
  { id: 'admin', name: 'Административный ресурс', pp: 0.03, detect: 0.15, trust: 3, dem: 3,
    what: 'Бюджетников, студентов и работников госкомпаний «настоятельно просят» прийти и проголосовать правильно, а начальство отчитывается о явке.' },
  { id: 'media', name: 'Контроль эфира перед выборами', pp: 0.04, detect: 0.25, trust: 4, dem: 5,
    what: 'Оппозицию не пускают в эфир, госканалы показывают только достижения власти.' },
  { id: 'handouts', name: 'Предвыборные раздачи', pp: 0.04, detect: 0, trust: 1, dem: 0, cost: 0.01,
    what: 'Разовые выплаты пенсионерам, бюджетникам и семьям перед выборами. Законно, но стоит бюджету ~1% ВВП и разгоняет инфляцию.' },
  { id: 'buy', name: 'Подкуп избирателей', pp: 0.05, detect: 0.35, trust: 8, dem: 10, cost: 0.002,
    what: 'Прямая покупка голосов: деньги или продуктовые наборы за «правильный» бюллетень. Уголовное преступление.' },
  { id: 'stuff', name: 'Вбросы и «карусели»', pp: 0.09, detect: 0.55, trust: 15, dem: 20,
    what: 'Вброс бюллетеней, многократное голосование, переписывание протоколов. Самый грубый способ.' },
  { id: 'ban', name: 'Снятие главного оппонента', pp: 0.1, detect: 0.9, trust: 12, dem: 25,
    what: 'Главного соперника не регистрируют через суд или избирком: «ошибки в подписях», уголовное дело.' },
];
D.FRAUD_BY = {};
for (const x of D.FRAUD) D.FRAUD_BY[x.id] = x;

D.runElection = function (s) {
  const P = s.polit, reg = D.REGIME[s.pol.regime];
  const fraud = P.fraud || {};
  let bonus = reg.elections === 'managed' ? 0.07 : 0;
  let detectP = 0, trustHit = 0, demHit = 0;
  for (const x of D.FRAUD) if (fraud[x.id]) {
    bonus += x.pp;
    detectP = 1 - (1 - detectP) * (1 - x.detect * (0.3 + s.inst.press / 100) * (0.5 + s.inst.assembly / 150));
    trustHit += x.trust; demHit += x.dem;
  }
  const honest = D.pollShares(s);
  const shares = D.pollShares(s, bonus);
  // Смена лидера из-за ограничения сроков — у преемника нет бонуса известности.
  const termOut = s.pol.laws.termLimits === 1 && P.terms >= 2;
  if (termOut) shares[0] = Math.max(0, shares[0] - 0.03);
  const res = { t: s.t, shares: shares.slice(), honest: honest[0], bonus, parties: P.parties.map(p => p.name), termOut };
  let win;
  if (reg.elections === 'parl') {
    const seats = D.seatsFrom(shares);
    // Коалиция с ближайшей по идеологии партией.
    let best = -1, bd = 9;
    for (let i = 1; i < P.parties.length; i++) {
      const d = Math.hypot(P.parties[i].e - P.parties[0].e, P.parties[i].s - P.parties[0].s);
      if (seats[i] > 0 && d < bd) { bd = d; best = i; }
    }
    const coal = seats[0] + (best > 0 && bd < 1 ? seats[best] : 0);
    res.seats = seats; res.coalition = best > 0 && bd < 1 ? P.parties[best].name : null;
    win = seats[0] >= 0.5 || coal >= 0.5;
    P.seats = seats; P.coalition = best > 0 && bd < 1 ? best : -1;
  } else {
    win = shares[0] >= 0.5;
    if (!win) {
      // Второй тур против сильнейшего соперника.
      let top = 1; for (let i = 2; i < shares.length; i++) if (shares[i] > shares[top]) top = i;
      const pOpp = P.parties[top];
      let a = shares[0], b = shares[top];
      for (let i = 1; i < shares.length; i++) {
        if (i === top) continue;
        const dA = Math.hypot(P.parties[i].e - P.parties[0].e, P.parties[i].s - P.parties[0].s);
        const dB = Math.hypot(P.parties[i].e - pOpp.e, P.parties[i].s - pOpp.s);
        a += shares[i] * dB / (dA + dB); b += shares[i] * dA / (dA + dB);
      }
      res.runoff = { a: a / (a + b), b: b / (a + b), opp: pOpp.name };
      win = a > b;
    }
    P.seats = D.seatsFrom(shares);
  }
  res.win = win;
  P.lastElection = res;
  P.history.push(res);
  P.fraudLevel = trustHit;
  P.fraud = {};
  const reg2 = reg.elections;
  P.nextElection = s.t + reg.term * 12;
  // Разоблачение фальсификаций.
  if (bonus > (reg2 === 'managed' ? 0.07 : 0) && D.chance(s, detectP)) {
    res.detected = true;
    P.fraudScandal = 20 + trustHit;
    s.inst.trust = Math.max(0, s.inst.trust - trustHit);
    for (const g of ['intel', 'youth', 'office']) s.groups[g].shock = (s.groups[g].shock || 0) - 15;
    P.protest = D.clamp(P.protest + 0.25, 0, 1);
    for (const pt of s.ext.partners) if (pt.reg === 'dem') pt.memory -= demHit;
    D.logEvent(s, 'politics', '🚨 Фальсификации раскрыты', `Наблюдатели и журналисты опубликовали доказательства нарушений на выборах. Доверие к власти рухнуло, на улицы вышли протестующие, демократические страны осуждают итоги и грозят санкциями. Так было на Украине в 2004 г., в Сербии в 2000 г., в Беларуси в 2020 г.`, { kb: 'politics.fraud' });
  }
  if (win) {
    P.terms = termOut ? 1 : (P.terms || 1) + 1;
    if (termOut) D.logEvent(s, 'politics', '🤝 Передача власти преемнику', 'Лидер отработал два срока и по конституции ушёл. Партия выиграла выборы с новым кандидатом — курс продолжается.');
    D.logEvent(s, 'politics', '🗳️ Победа на выборах', `Партия власти набрала ${D.pct(shares[0])}${res.runoff ? ` (во втором туре — ${D.pct(res.runoff.a)})` : ''}. Мандат продлён на ${reg.term} ${D.plural(reg.term, 'год', 'года', 'лет')}.`, { election: res });
  } else if (reg2 === 'managed') {
    s.pending.push({ id: 'managedLoss', data: { share: shares[0] } });
  } else {
    D.gameOver(s, 'election', res);
  }
  return res;
};

// Поддержка закона в парламенте.
D.lawSupport = function (s, lawId, opt) {
  const reg = D.REGIME[s.pol.regime], P = s.polit;
  const L = D.LAW[lawId], o = L.opts[opt];
  if (!reg.needParl) return { support: 1, passes: true, via: reg.dem ? 'decree' : 'auto' };
  const ideo = o.ideo || { e: 0, s: 0 };
  const cur = L.opts[s.pol.laws[lawId]].ideo || { e: 0, s: 0 };
  const dir = { e: ideo.e - cur.e, s: ideo.s - cur.s };
  let sup = 0;
  const seats = P.seats || D.seatsFrom(D.pollShares(s));
  P.parties.forEach((p, i) => {
    const dot = dir.e * p.e + dir.s * p.s;
    const k = i === 0 || i === P.coalition ? D.sigmoid(3 * (dot + 0.9)) : D.sigmoid(3 * (dot - 0.1));
    sup += seats[i] * k;
  });
  if (L.opts[opt].auth && reg.dem) return { support: sup, passes: false, via: 'blocked', reason: 'Конституция демократической страны не позволяет такой закон.' };
  return { support: sup, passes: sup >= 0.5, via: sup >= 0.5 ? 'parl' : (reg.decree ? 'decree-possible' : 'fail') };
};

D.stepSocialInit = function (s) {
  s.initMode = true;
  welfare(s);
  // Качество медицины и образования на старте совпадает с исходным.
  s.c0.off.qHealth += s.e.qHealth - s.e.qHealthT;
  s.c0.off.qEdu += s.e.qEdu - s.e.qEduT;
  s.pop.le = s.cfg.demo.le; s.pop.leTarget = s.cfg.demo.le; s.pop.tfr = s.cfg.demo.tfr; s.pop.tfrTarget = s.cfg.demo.tfr;
  regions(s);
  groups(s);
  delete s.initMode;
};

D.stepSocial = function (s) {
  institutions(s);
  welfare(s);
  regions(s);
  groups(s);
  unrest(s);
  // Выборы.
  const reg = D.REGIME[s.pol.regime];
  if (reg.elections !== 'none' && s.t >= s.polit.nextElection && !s.over) D.runElection(s);
  const polls = D.pollShares(s);
  s.polit.parties.forEach((p, i) => { p.poll = D.clamp(polls[i] + D.gauss(s) * 0.01, 0, 1); });
  s.polit.fraudScandal = Math.max(0, (s.polit.fraudScandal || 0) * 0.97 - 0.05);
};
})();
