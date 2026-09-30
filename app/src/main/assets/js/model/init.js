'use strict';
// Создание новой партии из конфигурации. Модель калибруется так, чтобы страна
// стартовала в равновесии с заданными показателями, а дальнейшая динамика
// определялась решениями игрока, миром и случайностью.
(function () {
const D = globalThis.D;

function policyFrom(cfg) {
  const pol = {
    regime: cfg.regime, system: cfg.system,
    tax: {}, pitMode: cfg.pitMode, pit: cfg.pit.map(b => ({ from: b[0], rate: b[1] })), taxFree: cfg.taxFree || 0,
    split: {}, spend: {},
    pension: { repl: cfg.pension.repl, age: cfg.pension.age, index: cfg.pension.index || 'wages' },
    unemp: { repl: cfg.unemp.repl, months: cfg.unemp.months },
    child: cfg.child, gmi: cfg.gmi, ubi: cfg.ubi || 0, publicWage: cfg.publicWage,
    laws: {}, cb: { independent: !!cfg.cb.independent, target: cfg.cb.target, regime: cfg.cb.regime, rate: cfg.eco.rate, auto: true },
    fin: { foreign: cfg.fin.foreign, monetize: cfg.fin.monetize, useFund: !!cfg.eco.fund },
    regional: { transfer: cfg.regional.transfer, equal: cfg.regional.equal },
    stateShare: cfg.eco.state, utilTariff: 1, plan: { invest: 0.3 },
  };
  for (const t of D.TAXES) {
    pol.tax[t.id] = cfg.tax[t.id] !== undefined ? +cfg.tax[t.id] : t.def;
    const sp = cfg.splits[t.id] || t.split;
    pol.split[t.id] = { f: sp.f, r: sp.r, l: sp.l };
  }
  if (pol.pitMode === 'flat') pol.pit.forEach(b => { b.rate = pol.tax.pit; });
  for (const x of D.SPEND_DISC) pol.spend[x.id] = cfg.spend[x.id] !== undefined ? +cfg.spend[x.id] : x.def;
  for (const l of D.LAWS) pol.laws[l.id] = cfg.laws[l.id] !== undefined ? cfg.laws[l.id] : l.def;
  if (cfg.regime && D.REGIME[cfg.regime].dem) {
    // Демократия не может стартовать с «авторитарными» законами.
    for (const l of D.LAWS) if (l.opts[pol.laws[l.id]].auth) pol.laws[l.id] = l.def;
  }
  return pol;
}

// Регионы: специализации по ресурсам и структуре экономики.
function makeRegions(s, rng) {
  const cfg = s.cfg, sec = cfg.eco.sec, res = cfg.res;
  let n = cfg.geo.regions;
  if (!n) n = cfg.geo.area < 10 ? 3 : cfg.geo.area < 60 ? D.pick(rng, [4, 5]) : cfg.geo.area < 400 ? D.pick(rng, [5, 6, 7]) : cfg.geo.area < 2000 ? D.pick(rng, [7, 8, 9]) : D.pick(rng, [9, 10, 11, 12]);
  n = D.clamp(n, 3, 12);
  const specs = ['capital'];
  const want = [];
  if (sec.mining > 0.05 || res.oil + res.gas + res.metals > 150) want.push('resource');
  if (sec.mining > 0.12) want.push('resource');
  if (sec.manuf > 0.12) want.push('industrial');
  if (sec.manuf > 0.2) want.push('industrial');
  if (sec.agr > 0.04 || res.farmland > 60) want.push('agrarian');
  if (cfg.geo.coast) want.push('port');
  if (cfg.geo.coast && ['warm', 'hot'].includes(cfg.geo.climate)) want.push('tourist');
  if (res.wood > 60) want.push('forest');
  if (sec.it > 0.06 || cfg.demo.edu > 12.5) want.push('tech');
  if (cfg.eco.gdppc < 20000 || cfg.eco.gini > 0.35) want.push('depressed');
  const extra = ['industrial', 'agrarian', 'depressed', 'forest', 'port', 'tourist', 'resource'];
  for (const w of D.shuffle(rng, want)) if (specs.length < n) specs.push(w);
  while (specs.length < n) specs.push(D.pick(rng, extra.filter(x => x !== 'port' || cfg.geo.coast)));
  const used = new Set();
  const capShare = D.clamp(0.9 / n + D.range(rng, 0.03, 0.12) + (cfg.geo.area < 50 ? 0.1 : 0), 0.08, 0.5);
  const raw = specs.map((sp, i) => i === 0 ? 0 : D.range(rng, 0.5, 1.5) * (sp === 'depressed' ? 0.8 : sp === 'resource' ? 0.6 : 1));
  const rs = D.sum(raw);
  // Координаты на карте: столица ближе к центру, порты — к краю.
  const pts = [];
  const place = (edge) => {
    for (let k = 0; k < 200; k++) {
      const a = D.rand(rng) * Math.PI * 2;
      const rr = edge ? D.range(rng, 0.55, 0.8) : Math.sqrt(D.rand(rng)) * 0.75;
      const x = 0.5 + Math.cos(a) * rr * 0.45, y = 0.5 + Math.sin(a) * rr * 0.45;
      if (pts.every(p => Math.hypot(p.x - x, p.y - y) > 0.52 / Math.sqrt(n))) return { x, y };
    }
    return { x: D.range(rng, 0.15, 0.85), y: D.range(rng, 0.15, 0.85) };
  };
  const pyramid = D.agePyramid(cfg.demo.le, cfg.demo.median);
  const popTotal = cfg.demo.pop * 1e6;
  const regions = specs.map((sp, i) => {
    const spec = D.RSPEC[sp];
    const pt = i === 0 ? { x: 0.5 + D.range(rng, -0.08, 0.08), y: 0.5 + D.range(rng, -0.08, 0.08) } : place(sp === 'port' || sp === 'tourist');
    pts.push(pt);
    const share = i === 0 ? capShare : (1 - capShare) * raw[i] / rs;
    // Возрастная структура: в столице больше молодых, в депрессивных — пожилых.
    const tilt = sp === 'capital' ? 0.1 : sp === 'depressed' ? -0.12 : sp === 'agrarian' ? -0.05 : 0;
    const coh = pyramid.map((v, b) => v * (1 + tilt * (b >= 4 && b <= 8 ? 1 : b >= 12 ? -1 : 0)));
    const cs = D.sum(coh);
    return {
      id: 'r' + i, name: D.makeRegionName(rng, sp, used), spec: sp, cap: i === 0,
      coh: coh.map(v => v / cs * share * popTotal), pop: share * popTotal,
      w: Object.assign({}, spec.w), prod: (spec.id === 'capital' ? 1.35 : spec.id === 'tech' ? 1.25 : spec.id === 'resource' ? 1.5 : spec.id === 'depressed' ? 0.65 : spec.id === 'agrarian' ? 0.75 : 1) * D.range(rng, 0.9, 1.1),
      infra: {}, infraOff: {}, boost: {}, infraAvg: 60, infraMul: spec.infra * D.range(rng, 0.92, 1.08),
      hpiBase: { capital: 1.9, tourist: 1.3, port: 1.2, tech: 1.4, resource: 1.0, industrial: 0.85, agrarian: 0.6, forest: 0.6, depressed: 0.45 }[sp] * D.range(rng, 0.9, 1.1),
      hpiRel: 1, wageRel: spec.wage, uRel: { capital: 0.6, tech: 0.75, resource: 0.8, port: 0.9, industrial: 1.0, tourist: 1.1, agrarian: 1.2, forest: 1.2, depressed: 1.8 }[sp],
      crimeOff: { capital: 6, depressed: 12, port: 5, tourist: 0, tech: -6, resource: 3, industrial: 3, agrarian: -4, forest: -2 }[sp],
      pollOff: { capital: 8, industrial: 20, resource: 16, port: 6, tourist: -14, forest: -20, agrarian: -8, tech: -6, depressed: 2 }[sp],
      x: pt.x, y: pt.y, mood: 50, fund: 1, trans: 0, balance: 0, netMig: 0, tfrMul: sp === 'capital' ? 0.85 : sp === 'agrarian' || sp === 'depressed' ? 1.15 : 1,
    };
  });
  // Нормируем относительную безработицу и зарплаты к 1 в среднем.
  const norm = k => { const avg = D.sum(regions.map(r => r[k] * r.pop)) / popTotal; for (const r of regions) r[k] /= avg; };
  norm('uRel'); norm('wageRel'); norm('hpiBase');
  for (const r of regions) r.hpiRel = r.hpiBase;
  return regions;
}

D.newGame = function (cfgIn, seed) {
  const cfg = D.normalizeConfig(D.clone(cfgIn));
  const s = {
    v: 1, seed: (seed || (Date.now() ^ 0x5bd1e995)) | 0, t: 0, year0: cfg.startYear, month0: 0, cfg,
    effects: [], flags: {}, crises: {}, pending: [], log: [], turnLog: [], buf: {}, hist: {}, over: null,
  };
  const rng = { seed: s.seed ^ 0x2545f491 };
  s.pol = policyFrom(cfg);
  D.computeMods(s);
  const m = s.mods, E = cfg.eco, dm = cfg.demo;
  s.pop = { le: dm.le, leTarget: dm.le, tfr: dm.tfr, tfrTarget: dm.tfr, births: 0, deaths: 0, emig: 0, immig: 0 };
  s.regions = makeRegions(s, rng);
  D.refreshPopTotals(s);
  const pop = s.popTotal;
  // ---------- мир ----------
  const res = cfg.res;
  const mix = { oil: res.oil, gas: res.gas * 0.8, metals: res.metals + res.rare * 0.5 + res.coal * 0.4, agri: res.farmland * 0.5 + res.wood * 0.3 };
  const ms = D.sum(Object.values(mix)) || 1;
  for (const k in mix) mix[k] /= ms;
  s.w = { g: 0.03, gShock: 0, demand: 1, pi: 0.025, P: 1, P0: 1, i: 0.035, oil: 80, oilPrev: 80, gas: 1, metals: 1, grain: 1, grainPrev: 1, crisis: 0, com: 1 };
  // ---------- стартовые величины ----------
  const er = cfg.cur.rate;
  const gdpUsd = E.gdppc * pop;
  const GDP = gdpUsd * er;
  const govVA = 0.1;
  const resShare = E.sec.mining * (1 - govVA);
  const Y = GDP;
  const Qres = resShare * Y;
  const pppF = D.clamp(Math.pow(55000 / Math.max(300, E.gdppc), 0.33), 1, 3.2);
  const lfpr = dm.lfpr * (D.popAges(s.pop.cohorts, 15, 65) / Math.max(1, D.popAges(s.pop.cohorts, 15, s.pol.pension.age)));
  const workAge = D.popAges(s.pop.cohorts, 15, s.pol.pension.age);
  const olderW = D.popAges(s.pop.cohorts, s.pol.pension.age, 75) * D.clamp(0.1 - 0.02 * (s.pol.pension.age - 60), 0.03, 0.25);
  const LF = workAge * lfpr + olderW;
  const u = E.unemp;
  const Ecount = LF * (1 - u);
  const S = dm.edu, h = Math.exp(0.08 * S);
  const g = D.clamp(E.growth, 0.005, 0.07);
  const pubInv = D.sum(D.SPEND_DISC.map(x => (s.pol.spend[x.id] || 0) * (x.invest || 0))) * Y;
  let Ipriv = Math.max(0.06 * Y, E.invest * Y - pubInv);
  const K = Ipriv / (D.DELTA + g);
  const Ynstar = Y - Qres;
  const hours = 1 + (m.hours || 0);
  const A = Ynstar / (Math.pow(K, D.ALPHA) * Math.pow(Ecount * h * hours, 1 - D.ALPHA));
  const LS = D.clamp(0.54 - 0.4 * resShare - 0.15 * E.shadow + (E.gdppc > 30000 ? 0.04 : 0), 0.3, 0.64);
  const formal = 1 - E.shadow;
  const W = LS * GDP / (12 * Ecount * (1 + s.pol.tax.ssc_er * formal));
  const food = D.clamp(0.36 - 0.06 * Math.log(Math.max(1, E.gdppc / 2000)), 0.1, 0.45);
  const rent = D.clamp(0.03 + 0.012 * Math.log(Math.max(1, E.gdppc / 2000)), 0.03, 0.09);
  const serv = D.clamp(0.18 + 0.05 * Math.log(Math.max(1, E.gdppc / 2000)), 0.15, 0.42);
  const cpiW = { food, rent, serv, util: 0.08, fuel: 0.05, goods: 0 };
  cpiW.goods = Math.max(0.1, 1 - food - rent - serv - 0.13);
  const cw = D.sum(Object.values(cpiW)); for (const k in cpiW) cpiW[k] /= cw;
  const cred0 = D.clamp((s.pol.cb.independent || s.pol.cb.regime === 'union' ? 0.6 : 0.3) - 1.5 * Math.abs(E.infl - s.pol.cb.target), 0.03, 0.9);
  // Экономика.
  s.e = {
    A, K, Y, Yn: Ynstar, Ystar: Y, Ynstar, Qres, gap: 0, gapRaw: 0, excess: 0, AD: Y,
    C: 0.6 * Y, I: Ipriv, G: 0, Xn: 0, Xr: 0, M: 0,
    LF, E: Ecount, u, un: u, W, Wpub: W * s.pol.publicWage, S, h, qEdu: 50, qHealth: 50,
    P: 1, Pc: { food: 1, goods: 1, serv: 1, util: 1, fuel: 1, rent: 1 }, pipe: {}, taxPipe: new Array(12).fill(0),
    pi12: E.infl, piM: E.infl / 12, pie: E.infl, cred: cred0, target: s.pol.cb.target, piParts: {},
    i: E.rate, iL: E.rate + 0.03, iMort: E.rate + 0.02, ig: E.rate + 0.01, rF: 0.05, rReal: E.rate - E.infl, rLReal: E.rate + 0.03 - E.infl,
    er, erEq: er, q: 1, M2: GDP * (0.35 + 0.55 * E.credit), L: E.credit * GDP,
    npl: D.clamp(0.02 + E.corr / 1000 + 0.03 * E.shadow, 0.01, 0.15), car: 0.14, hpi: 1, hpiRatio: 1, houseCrash: 0,
    conf: 1, cconf: 1, shortage: 0, overhang: 0, sec: Object.assign({}, E.sec), growthY: g, gA: 0.01, mwPrev: m.minWage,
    laborShare: LS, profitShare: 0.3, bopAvg: 0, crisisFlight: 0, gw: E.infl + 0.01, mp: 0.3, open: E.open,
  };
  for (const c of D.CPI_CATS) s.e.pipe[c.id] = new Array(12).fill(0);
  if (cfg.system === 'planned' || s.mods.priceCtrl > 0.8) s.e.overhang = 0.1 * 0.5 * GDP;
  // Институты (стартовые значения из конфигурации).
  s.inst = {
    corr: E.corr, rol: D.clamp(100 - E.corr * 0.95 + (m.rol || 0) * 0.3, 3, 98), shadow: E.shadow, stateShare: E.state,
    press: D.clamp(60 + (m.press || 0), 0, 100), assembly: D.clamp(60 + (m.assembly || 0), 0, 100), freedom: D.clamp(55 + (m.freedom || 0), 0, 100),
    trust: D.clamp(35 + (60 - E.corr) * 0.4, 5, 90), competition: D.clamp(50 + (m.competition || 0) - 25 * Math.max(0, E.state - 0.2) + 10 * (E.open - 0.5), 0, 100),
    biz: D.clamp(50 + (m.biz || 0) - 0.25 * (E.corr - 50), 0, 100),
    pollution: D.clamp(30 + 60 * (E.sec.manuf + E.sec.mining) + 10 * Math.log(Math.max(1, E.gdppc / 3000)) * (E.gdppc < 30000 ? 1 : -0.5) + (m.pollution || 0), 5, 95),
    crime: D.clamp(20 + 50 * (E.gini - 0.3) + 150 * (u - 0.05) + 0.2 * E.corr + (m.crime || 0), 3, 95),
    taxAdmin: 0.8,
  };
  s.pol.stateShare = E.state;
  s.inst.biz = D.clamp(s.inst.biz + 0.1 * (s.inst.rol - 50), 0, 100);
  s.ind = { gdpNom: GDP, gdpUsd, gdppc: E.gdppc, gdppcPPP: E.gdppc * pppF, resNom: Qres, infra: 60, infraParts: {}, infraNet: 60, happy: 5, hdi: 0.7, affordYears: E.house, investClimate: 1, povLine: 0, regGap: 2 };
  s.soc = { emigRate: 0, immigRate: 0, capitalInflow: 0 };
  s.gov = { debtD: E.debt * GDP * (1 - E.extDebt), debtF: E.debt * GDP * E.extDebt / er, regDebt: 0, rDeff: E.rate + 0.01, rFeff: 0.05, fund: (E.fund || 0) * gdpUsd,
    spread: 0.02, score: 60, scoreOff: 0, rating: 'BBB', marketAccess: true, debtGdp: E.debt, defaults: E.defaults || 0, defaultUntil: -1, imf: null, arrearsMonths: 0 };
  s.fis = { purchNom: 0, YDnom: 0.6 * GDP, indirectShare: 0.12, monetized: 0, fuelShield: 0, pensionLevel: s.pol.pension.repl * W, pensionRepl: s.pol.pension.repl, effSpend: 0.8, eff: {}, exp: {}, regFund: 1, utilFund: 1 };
  s.dist = { gini: E.gini, mpc: 0.85, median: 0, dispPC: new Array(10).fill(0) };
  s.ext = { partners: [], res: 0, resMonths: E.reserves, cool: {}, exportBlock: 0, importBlock: 0, resBlock: 0, finBlock: 0, techBlock: 0, tariffHit: 0, ftaShare: 0, security: 60 };
  s.polit = { approval: 50, protest: 0, tension: 0, strike: 0, instability: 0, fraud: {}, history: [], terms: 1, lowMonths: 0 };
  s.groups = {};
  for (const gdef of D.GROUPS) s.groups[gdef.id] = { mood: 50, target: 50, size: 0.05, shock: 0, why: [] };
  // ---------- калибровочные константы ----------
  const c0 = s.c0 = {
    lfpr, retAge: s.pol.pension.age, un: u, u, mw: m.minWage, benefit: s.pol.unemp.repl * Math.min(1, s.pol.unemp.months / 12),
    shadow: E.shadow, Soff: 0, gAoff: 0, I: Ipriv, resTechDep: D.clamp(0.3 + 0.4 * (res.oil + res.gas) / 200, 0.2, 0.7),
    A, Ynstar, Y, P: 1, Pw: 1, er, com: 1, W, cpiW, govVA, pppAdj: 1, infl: E.infl, growth: g, u0: u,
    tax: Object.assign({}, s.pol.tax), spend: Object.assign({}, s.pol.spend), tariff: s.pol.tax.tariff,
    resShare, resShareSec: E.sec.mining, resMix: mix, stateShare: E.state, publicWage: s.pol.publicWage,
    child: s.pol.child, gmi: s.pol.gmi, unempRepl: s.pol.unemp.repl, pensionRepl: s.pol.pension.repl, topPit: D.topPitRate(s.pol),
    smeShare: D.clamp(0.12 + 0.1 * E.shadow + (E.gdppc < 20000 ? 0.05 : 0), 0.05, 0.4), vatComp: 1, taxAdminOff: 0,
    housingStock: E.house * W * 12 * pop / 2.6, afford: E.house, hpi: 1, dirtyShare: E.sec.manuf + E.sec.mining,
    corr: E.corr, rol: s.inst.rol, biz: s.inst.biz, freedom: s.inst.freedom, trust: s.inst.trust, pollution: s.inst.pollution, crime: s.inst.crime,
    off: {},
  };
  c0.vatComp = D.clamp(0.9 - 0.8 * E.shadow, 0.3, 0.95);
  c0.taxAdminOff = 0;
  c0.wedge = D.topPitRate(s.pol) * 0.3 + s.pol.tax.pit * 0.4 + s.pol.tax.ssc_er + s.pol.tax.ssc_ee + s.pol.tax.vat * 0.4;
  // Мир и торговля.
  s.w.com = (mix.oil + mix.gas * s.w.gas + mix.metals * s.w.metals + mix.agri * s.w.grain);
  c0.com = s.w.com;
  const open = E.open;
  const tb = D.clamp(1.1 * resShare - 0.02, -0.08, 0.25);
  let X = open / 2 * Y * (1 + tb), M = open / 2 * Y * (1 - tb);
  const Xr = Math.min(Qres * D.clamp(0.45 + 0.4 * open, 0.3, 0.95), X * 0.85);
  c0.xres = Qres > 0 ? Xr / Qres : 0;
  s.e.Xr = Xr; s.e.Xn = X - Xr; s.e.M = M;
  c0.xn = s.e.Xn / Ynstar;
  c0.resExpShare = D.clamp(Xr / Math.max(1, X) * 1.6, 0, 1);
  // Макро-баланс: G из бюджета, C — остаток.
  s.ind.povLine = 0;
  c0.povLine = 208 * er / pppF;
  c0.gdppcPPP = s.ind.gdppcPPP;
  c0.giniW = E.gini + 0.05;
  c0.median = 1; c0.gini = E.gini;
  c0.effShare = {};
  for (const x of D.SPEND_DISC) c0.effShare[x.id] = s.pol.spend[x.id];
  c0.pensionRepl = s.pol.pension.repl;
  c0.profitShare = 0.3; c0.povertyAbs = 0.1; c0.qEdu = 50; c0.qHealth = 50;
  c0.off = { corr: 0, rol: 0, shadow: 0, pollution: 0, crime: 0, qHealth: 0, qEdu: 0, le: 0, tfr: 0, happy: 5 };
  s.fis.eff = {}; s.fis.exp = {};
  // Буферы «истории» за 3 года назад, чтобы годовые темпы считались с первого месяца.
  const erTrend = Math.max(-0.1, E.infl - 0.025);
  // gr — годовой темп; переводим в непрерывный (ln(1+g)), иначе 150% превратились бы в 348%.
  const seedBuf = (k, v0, gr) => { const c = Math.log(1 + gr); s.buf[k] = []; for (let i = 36; i >= 1; i--) s.buf[k].push(v0 * Math.exp(-c * i / 12)); };
  seedBuf('P', 1, E.infl); seedBuf('Y', Y, g); seedBuf('Ystar', Y, g); seedBuf('Ynstar', Ynstar, g);
  seedBuf('W', W, E.infl + g * 0.7); seedBuf('er', er, erTrend); seedBuf('M2', s.e.M2, E.infl + g); seedBuf('L', s.e.L, E.infl + g);
  seedBuf('gdpNom', GDP, E.infl + g); seedBuf('hpi', 1, E.infl + g * 0.5); seedBuf('LF', LF, 0.003); seedBuf('E', Ecount, 0.003);
  seedBuf('iMort', s.e.iMort, 0); seedBuf('realInc', 1, g * 0.7);
  // Качество услуг и первый проход бюджета.
  const eff0 = D.clamp((1 - 0.5 * E.corr / 100) * (1 - 0.6 * Math.pow(s.pol.publicWage - 1, 2)), 0.3, 1);
  s.e.qHealth = D.quality(s.pol.spend.health, 0.065, s.ind.gdppcPPP, eff0);
  s.e.qEdu = D.quality(s.pol.spend.school + s.pol.spend.univ, 0.045, s.ind.gdppcPPP, eff0);
  c0.qEdu = s.e.qEdu; c0.qHealth = s.e.qHealth;
  c0.Soff = S - D.clamp(3 + 11.5 * s.e.qEdu / 100 + 1.2 * Math.log(Math.max(1, s.ind.gdppcPPP) / 3000) * 0.5, 2, 15.5);
  s.e.profitShare = D.clamp(1 - LS - 0.12, 0.1, 0.6);
  s.polit.parties = D.makeParties(rng, { name: cfg.partyName, e: D.SYSTEM[cfg.system].ideo.e * 0.8, s: D.SYSTEM[cfg.system].ideo.s * 0.6 + (D.REGIME[cfg.regime].dem ? -0.1 : 0.4) });
  s.polit.seats = null;
  // Регионы: стартовая инфраструктура.
  for (const r of s.regions) {
    const q = D.clamp(D.quality(0.03, 0.03, s.ind.gdppcPPP, eff0) * r.infraMul, 5, 97);
    for (const k of ['road', 'util', 'health', 'school', 'net']) r.infra[k] = D.clamp(q + D.range(rng, -6, 6), 3, 98);
    r.infraAvg = D.avg(Object.values(r.infra));
  }
  // Партнёры.
  const dem = D.REGIME[cfg.regime].dem;
  s.ext.partners = D.makePartners(rng, dem);
  const sx = D.sum(s.ext.partners.map(p => p.x)), sm = D.sum(s.ext.partners.map(p => p.m));
  for (const p of s.ext.partners) { p.x *= 0.85 / sx; p.m *= 0.85 / sm; }
  for (const p of s.ext.partners) {
    let r0 = p.arch === 'ally' ? 55 : p.threat ? -35 : p.reg === 'dem' ? (dem ? 40 : -5) : p.reg === 'aut' ? (dem ? 5 : 35) : 20;
    if (cfg.world.sanctions && (p.arch === 'hegemon' || p.arch === 'union')) { p.sanc = cfg.world.sanctions; p.sancAge = 24; r0 = -60; }
    p.rel = r0; p.base = 0;
  }
  s.ext.res = E.reserves * (M / er) / 12;
  s.ext.resMonths = E.reserves;
  s.ext.resMonthsPrev = E.reserves;
  // Старый долг выпущен в прошлом: его средняя ставка ниже текущей рыночной (облигации длинные).
  const legacy = () => {
    s.gov.rDeff = D.clamp(0.45 * (E.rate + 0.004 + s.gov.spread) + 0.015, 0.01, 0.12);
    s.gov.rFeff = D.clamp(0.6 * (0.035 + 0.004 + s.gov.spread) + 0.01, 0.02, 0.08);
  };
  s.gov.spread = 0.01; legacy();
  // Прогоняем модель вхолостую, чтобы свести балансы: несколько итераций бюджета/спроса.
  s.e.C = 0.6 * Y;
  for (let it = 0; it < 3; it++) {
    D.stepForeignInit(s);
    s.fis.YDnom = s.fis.YDnom || 0.6 * GDP;
    D.stepFiscal(s, true);
    const G = s.fis.purchNom;
    let C = Y - Ipriv - G - (X - M);
    if (C < 0.42 * Y) { const need = 0.42 * Y - C; M += need * 0.5; Ipriv = Math.max(0.06 * Y, Ipriv - need * 0.5); C = Y - Ipriv - G - (X - M); }
    s.e.C = C; s.e.G = G; s.e.I = Ipriv; s.e.M = M;
    // Подбор неравенства зарплат под целевой Джини располагаемых доходов.
    let lo = 0.12, hi = 0.8;
    for (let k = 0; k < 18; k++) {
      c0.giniW = (lo + hi) / 2; D.stepFiscal(s, true);
      if (s.dist.gini > E.gini) hi = c0.giniW; else lo = c0.giniW;
    }
  }
  // Доходы бюджета страны-прототипа: подгоняем «невидимые» налоговые базы.
  c0.revMul = 1;
  if (cfg.revTarget) {
    D.stepFiscal(s, true);
    const target = cfg.revTarget * GDP;
    c0.revMul = D.clamp((target - s.fis.nontax) / Math.max(1, s.fis.taxTotal), 0.6, 1.6);
    D.stepFiscal(s, true);
  }
  // Прочие соцвыплаты (больничные, инвалидность, жилищные пособия) — под реальные расходы страны.
  if (cfg.expTarget) {
    s.pol.spend.social_other = 0;
    D.stepFiscal(s, true);
    const other = D.clamp(cfg.expTarget - (s.fis.totalExp) / GDP, 0, 0.08);
    s.pol.spend.social_other = other;
    cfg.spend.social_other = other;
    D.stepFiscal(s, true);
  }
  c0.spend.social_other = s.pol.spend.social_other;
  // Финальное сведение спроса: G — из итогового бюджета, C — остаток до ВВП.
  D.stepFiscal(s, true);
  s.e.G = s.fis.purchNom;
  s.e.C = Y - s.e.I - s.e.G - (s.e.Xn + s.e.Xr - s.e.M);
  if (s.e.C < 0.35 * Y) { const d = 0.35 * Y - s.e.C; s.e.M += d; s.e.C = 0.35 * Y; }
  c0.I = Ipriv; c0.is = Ipriv / Ynstar; c0.K = K; s.pol.plan.invest = D.clamp(c0.is, 0.1, 0.5); c0.laborShare = LS; c0.depth = E.credit;
  c0.crr = s.e.C / s.fis.YDnom;
  c0.mpc = s.dist.mpc;
  c0.mp = s.e.M / (s.e.C + s.e.I + s.e.G + 0.3 * (s.e.Xn + s.e.Xr));
  c0.mShare = s.e.M / Y; c0.cShare = s.e.C / Y;
  c0.median = s.dist.median; c0.gini = s.dist.gini; c0.povertyAbs = s.dist.povertyAbs;
  c0.profitShare = s.e.profitShare;
  for (const x of D.SPEND_DISC) c0.effShare[x.id] = (s.fis.eff[x.id] || 0) / GDP;
  c0.pensionRepl = s.fis.pensionRepl;
  // Рейтинг и ставки.
  s.gov.score = 60;
  for (let k = 0; k < 40; k++) D.stepFiscalRatingOnly(s);
  legacy(); D.stepFiscal(s, true);
  for (let k = 0; k < 40; k++) D.stepFiscalRatingOnly(s);
  c0.spread = s.gov.spread;
  const rnRaw = E.rate - E.infl - 0.6 * (E.infl - s.pol.cb.target);
  c0.rn = D.clamp(rnRaw, -0.02, 0.05);
  s.e.target = s.pol.cb.target;
  s.e.gap = 0;
  D.ratesProbe(s);
  s.e.i = E.rate;
  D.ratesProbe(s);
  if (s.pol.cb.independent) s.e.i = E.rate;
  s.e.rReal = s.e.i - s.e.pie; s.e.rLReal = s.e.iL - s.e.pie;
  c0.rReal = s.e.rReal; c0.rLReal = s.e.rLReal; c0.iL = s.e.iL; c0.npl = s.e.npl;
  // Платёжный баланс: подбираем прочие потоки так, чтобы на старте он был сведён.
  const XnUsd = s.e.Xn / er, XrUsd = s.e.Xr / er, MUsd = s.e.M / er;
  c0.caOther = 0;
  const ca = XnUsd + XrUsd - MUsd - s.gov.debtF * s.gov.rFeff;
  c0.fdi = D.clamp(0.012 + 0.02 * open - E.corr / 6000, 0.003, 0.06);
  c0.carry = (s.e.i - s.e.pie) - (s.w.i - s.w.pi) - c0.spread - 0.01;
  const portf = gdpUsd * 0.04 * Math.tanh(c0.carry / 0.03);
  const polRisk0 = 0.1;
  const flight = gdpUsd * (0.012 * polRisk0 + 0.015 * s.ext.finBlock) * (1 - 0.75 * D.clamp(m.capCtrl || 0, 0, 0.95));
  const fdiUsd = gdpUsd * c0.fdi * (1 + (m.fdi || 0)) * (1 - s.ext.finBlock) * (1 - D.clamp(m.capCtrl || 0, 0, 0.95) * 0.5);
  c0.kfOther = -(ca + fdiUsd + portf - flight) / gdpUsd;
  c0.bopAvg = 0;
  // Офсеты индексов: стартовые значения совпадают с заданными.
  const o = c0.off;
  o.corr = E.corr - (m.corr || 0);
  o.rol = s.inst.rol - (m.rol || 0);
  o.shadow = E.shadow - (m.shadow || 0);
  o.pollution = s.inst.pollution - (m.pollution || 0);
  o.crime = s.inst.crime - (m.crime || 0);
  o.le = dm.le - D.incomeLE(s.ind.gdppcPPP) - (m.le || 0);
  o.tfr = dm.tfr - (m.tfr || 0);
  o.qHealth = 0; o.qEdu = 0;
  const happy0 = D.clamp(3.2 + 0.75 * Math.log(Math.max(0.3, s.ind.gdppcPPP / 2000)) + 0.012 * (s.inst.freedom - 50) - 0.015 * (E.corr - 50) - 3 * (E.gini - 0.35) - 5 * (u - 0.06), 2.2, 7.9);
  o.happy = happy0; s.ind.happy = happy0;
  c0.le = dm.le; c0.freedom = s.inst.freedom; c0.trust = s.inst.trust; c0.infl = E.infl;
  // Миграция.
  const annEmig = 0.001 + 0.004 * D.sigmoid((15000 - s.ind.gdppcPPP) / 8000) + (m.repress || 0) * 0.004;
  c0.emigBase = annEmig / 12;
  c0.pull = Math.log(Math.max(1, 45000 / s.ind.gdppcPPP)) * 0.25 + (5.5 - happy0) * 0.25 + (m.repress || 0) * 0.6 + 2 * Math.max(0, u - 0.08);
  const immLaw = [0.1, 1, 1.3, 2.6][s.pol.laws.immigration];
  c0.attract = D.sigmoid((s.ind.gdppcPPP - 12000) / 9000) * (1 - (m.repress || 0) * 0.5);
  c0.immigBase = (0.0004 + 0.008 * D.sigmoid((s.ind.gdppcPPP - 20000) / 12000)) * (0.5 + dm.immig * 3) / 12 / immLaw;
  // Рост производительности: подгоняем под заданный темп роста ВВП.
  s.inst.taxAdmin = 0.8;
  const gL = D.clamp((D.popAges(s.pop.cohorts, 10, 15) - D.popAges(s.pop.cohorts, s.pol.pension.age - 5, s.pol.pension.age)) / 5 / Math.max(1, workAge), -0.03, 0.04);
  const gK = Ipriv / K - D.DELTA;
  const gAneed = (g - D.ALPHA * gK - (1 - D.ALPHA) * gL) / (1 - D.ALPHA) * (1 - D.ALPHA);
  s.ind.infra = D.avg(s.regions.map(r => r.infraAvg)); s.ind.infraNet = s.ind.infra;
  c0.infra = s.ind.infra;
  const saveA = s.e.A;
  D.supplyProbe(s);
  c0.gAoff = D.clamp(gAneed - s.e.gA, -0.04, 0.04);
  s.e.A = saveA;
  c0.u = u; c0.growth = g;
  // Регионы и социальные показатели: первый проход без сдвигов.
  D.stepSocialInit(s);
  for (const r of s.regions) {
    // Смещения, чтобы стартовая инфраструктура совпала с исходной.
    for (const k in r.infra) r.infraOff[k] = r.infra[k] - (r.tgt0 ? r.tgt0[k] : r.infra[k]);
  }
  for (const gdef of D.GROUPS) s.groups[gdef.id].mood = s.groups[gdef.id].target;
  s.polit.approval = D.sum(D.GROUPS.map(gd => s.groups[gd.id].size * s.groups[gd.id].mood)) / D.sum(D.GROUPS.map(gd => s.groups[gd.id].size));
  const reg = D.REGIME[cfg.regime];
  s.polit.nextElection = reg.elections === 'none' ? 1e9 : reg.term * 12;
  s.polit.seats = D.seatsFrom(D.pollShares(s));
  s.polit.coalition = -1;
  s.soc.emigRate = c0.emigBase; s.soc.immigRate = c0.immigBase * immLaw;
  for (const p of s.ext.partners) { p.base = 0; p.base = p.rel - D.relTargetOf(s, p); }
  s.pol.cb.rate = s.e.i;
  s.prevTax = Object.assign({}, s.pol.tax);
  s.hist = {};
  D.recordHistory(s);
  D.logEvent(s, 'info', `🏛️ Рождение правительства: ${cfg.name}`, `Вы возглавили ${cfg.name}. Население — ${D.people(s.popTotal)}, ВВП на душу — ${D.usd(s.ind.gdppc, 0)}, инфляция — ${D.pct(E.infl)}, безработица — ${D.pct(u)}, госдолг — ${D.pct(E.debt, 0)} ВВП. Изучите страну, наметьте цели и принимайте решения.`);
  s.turnLog = [];
  return s;
};
})();
