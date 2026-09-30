'use strict';
// Панели политики, общие для конструктора и игры: налоги, расходы, законы, ЦБ.
// model — адаптер к данным (конфиг перед стартом или s.pol в игре), s — партия (в игре) или null.
(function () {
const D = globalThis.D, U = D.ui, h = U.h;
const pct = (v, d = 1) => D.fmt(v * 100, d) + '%';

// Недовольство от налога: насколько ставка выше нормы и кого это злит.
function satisfaction(t, rate) {
  const over = t.unit === '$/т' ? Math.max(0, rate - t.norm.hi) / 60 : t.unit === '×' ? Math.max(0, rate - t.norm.hi) : Math.max(0, rate - t.norm.hi) / 0.1;
  const angry = Object.entries(t.mood).filter(([, v]) => v < 0).map(([g]) => D.GROUP[g].icon).join('');
  const happy = Object.entries(t.mood).filter(([, v]) => v > 0).map(([g]) => D.GROUP[g].icon).join('');
  const frac = D.clamp(1 - over * 0.7, 0, 1);
  return { frac, angry, happy, over };
}

// ---------- налоги ----------
U.taxPanel = function (model, s) {
  const box = h('div');
  const GDP = s ? s.ind.gdpNom : 0;
  if (s) {
    const f = s.fis;
    box.appendChild(h('div.card', h('h3', '💰 Налоговые доходы', h('span.sp'), U.info('fis.taxes')),
      h('div.row.between', h('span.dim', 'Всего налогов'), h('b', `${D.money(s, f.taxTotal)} / год · ${pct(f.taxBurden)} ВВП`)),
      h('div.row.between', h('span.dim', 'Центр / регионы / муниципалитеты'), h('span.small', `${pct(f.revLvl.f / GDP)} · ${pct(f.revLvl.r / GDP)} · ${pct(f.revLvl.l / GDP)}`)),
      h('div.small.dim.mt', 'Зелёная полоса на слайдере — типичный мировой коридор. Выше него растут уклонение (кривая Лаффера) и недовольство. Изменения действуют со следующего месяца; налоги на потребление почти сразу отражаются в ценах.')));
  }
  // НДФЛ: плоская или прогрессивная шкала.
  const pitBox = h('div.card', h('h3', '💼 Шкала подоходного налога', h('span.sp'), U.info('tax.pitmode')));
  const renderPit = () => {
    U.clear(pitBox);
    pitBox.appendChild(h('h3', '💼 Шкала подоходного налога', h('span.sp'), U.info('tax.pitmode')));
    pitBox.appendChild(U.seg({ options: [{ v: 'flat', label: 'Плоская (одна ставка)' }, { v: 'prog', label: 'Прогрессивная' }], value: model.pitMode(), onChange: v => { model.setPitMode(v); renderPit(); } }));
    if (model.pitMode() === 'prog') {
      const br = model.brackets();
      br.forEach((b, i) => {
        pitBox.appendChild(U.slider({ name: i === 0 ? `Ставка с первых денег` : `Ставка с дохода выше ${D.fmt(b.from, 1)} ср. зарплат`, min: 0, max: 0.7, step: 0.005, value: b.rate, fmt: v => pct(v), norm: { lo: 0.1, hi: 0.45 },
          onChange: v => { b.rate = v; model.setBrackets(br); } }));
        if (i > 0) pitBox.appendChild(U.slider({ name: `↳ Порог ступени ${i + 1} (в средних зарплатах)`, min: 0.2, max: 100, step: 0.1, value: b.from, fmt: v => D.fmt(v, 1) + '×',
          onChange: v => { b.from = Math.max(br[i - 1].from + 0.1, v); model.setBrackets(br); renderPit(); } }));
      });
      if (s) pitBox.appendChild(h('div.small.dim.mt', `Средняя зарплата: ${D.money(s, s.e.W)} в месяц. Эффективная ставка у бедных 10% — ${pct(s.dist.pitRates[0])}, у богатых 10% — ${pct(s.dist.pitRates[9])}.`));
    }
    pitBox.appendChild(U.slider({ name: 'Необлагаемый минимум (доля средней зарплаты)', kb: 'tax.taxfree', min: 0, max: 0.8, step: 0.01, value: model.taxFree(), fmt: v => pct(v, 0), onChange: v => model.setTaxFree(v) }));
  };
  renderPit();
  box.appendChild(pitBox);
  for (const cat of D.TAX_CATS) {
    const card = h('div.card', h('h3', cat.icon + ' ' + cat.name));
    for (const t of D.TAXES.filter(x => x.cat === cat.id)) {
      if (t.id === 'pit' && model.pitMode() === 'prog') continue;
      const revTxt = () => s && s.fis.rev[t.id] !== undefined ? `Собрано: ${D.money(s, s.fis.rev[t.id])}/год (${pct(s.fis.rev[t.id] / GDP, 2)} ВВП)` : '';
      const satBar = h('div.satis', h('i'));
      const upd = v => {
        const st = satisfaction(t, v);
        satBar.firstChild.style.width = st.frac * 100 + '%';
        satBar.firstChild.style.background = st.frac > 0.8 ? 'var(--good)' : st.frac > 0.5 ? 'var(--warn)' : 'var(--bad)';
      };
      const sl = U.slider({
        name: t.name, icon: t.icon, kb: 'tax.' + t.id, min: t.min, max: t.max, step: t.step, value: model.get(t.id), norm: t.norm,
        fmt: v => D.taxStr(t.id, v), sub: () => revTxt(),
        onInput: upd, onChange: v => { model.set(t.id, v); },
        extra: h('div', satBar, h('div.row.between.tiny.dim', h('span', (satisfaction(t, model.get(t.id)).angry ? 'Недовольны при росте: ' + satisfaction(t, 0).angry : '')),
          h('button.chip', { onclick: () => U.splitEditor(model, t) }, '🏛️ Кому идёт'))),
      });
      upd(model.get(t.id));
      card.appendChild(sl);
    }
    box.appendChild(card);
  }
  return box;
};

// Кто распоряжается налогом: центр / регионы / муниципалитеты.
U.splitEditor = function (model, t) {
  const sp = Object.assign({}, model.split(t.id));
  const body = h('div');
  const render = () => {
    U.clear(body);
    body.appendChild(h('p.small.dim', 'Налог собирают в регионах, но распределяют между уровнями власти. Чем больше остаётся на местах, тем богаче регионы с сильной экономикой и тем беднее отстающие (им нужны трансферты из центра).'));
    const norm = () => { const tot = sp.f + sp.r + sp.l || 1; sp.f /= tot; sp.r /= tot; sp.l /= tot; };
    for (const [k, name] of [['f', '🏛️ Центр (федеральный бюджет)'], ['r', '🏞️ Регионы'], ['l', '🏘️ Муниципалитеты (города, районы)']]) {
      body.appendChild(U.slider({ name, min: 0, max: 1, step: 0.05, value: sp[k], fmt: v => pct(v, 0), onChange: v => {
        const others = ['f', 'r', 'l'].filter(x => x !== k); const rest = 1 - v; const os = sp[others[0]] + sp[others[1]] || 1;
        sp[others[0]] = rest * sp[others[0]] / os; sp[others[1]] = rest * sp[others[1]] / os; sp[k] = v; norm(); model.setSplit(t.id, Object.assign({}, sp)); render();
      } }));
    }
  };
  render();
  U.modal({ title: t.name, icon: t.icon, body: h('div', body, h('div.mt', U.info('tax.split'), ' ', h('span.small.dim', 'Методичка: бюджетный федерализм'))) });
};

// ---------- расходы ----------
U.spendPanel = function (model, s) {
  const box = h('div');
  const GDP = s ? s.ind.gdpNom : 0;
  if (s) {
    const f = s.fis;
    box.appendChild(h('div.card', h('h3', '🧾 Расходы бюджета', h('span.sp'), U.info('fis.spending')),
      h('div.row.between', h('span.dim', 'Всего расходов'), h('b', `${D.money(s, f.totalExp)} / год · ${pct(f.totalExp / GDP)} ВВП`)),
      h('div.row.between', h('span.dim', 'Проценты по долгу'), h('b.bad', `${pct((f.exp.interest || 0) / GDP)} ВВП`)),
      f.regFund < 0.97 ? h('div.note.warn.mt', `⚠️ Регионам не хватает денег: они финансируют свои статьи на ${pct(f.regFund, 0)}. Увеличьте трансферты или долю налогов регионам.`) : null,
      h('div.small.dim.mt', 'Статьи задаются в % ВВП. Социальные обязательства (пенсии, пособия) считаются по формулам: число получателей × размер выплаты.')));
  }
  // Социальные обязательства.
  const soc = h('div.card', h('h3', '🤝 Социальные обязательства'));
  const pens = model.pension();
  soc.appendChild(U.slider({ name: 'Пенсия (доля средней зарплаты)', icon: '👵', kb: 'spend.pension_repl', min: 0, max: 0.9, step: 0.01, value: pens.repl, fmt: v => pct(v, 0), norm: { lo: 0.35, hi: 0.6 },
    sub: () => s ? `≈ ${D.money(s, pens.repl * s.e.W)}/мес · всего на пенсии: ${pct((s.fis.exp.pensions || 0) / GDP)} ВВП · пенсионеров: ${D.people(s.pop.elderly)}` : '',
    onChange: v => { pens.repl = v; model.setPension(pens); } }));
  soc.appendChild(U.slider({ name: 'Пенсионный возраст', icon: '🎂', kb: 'spend.pension_age', min: 50, max: 72, step: 1, value: pens.age, fmt: v => v + ' лет', norm: { lo: 60, hi: 67 },
    onChange: v => { pens.age = v; model.setPension(pens); } }));
  soc.appendChild(U.prmSeg({ name: 'Индексация пенсий', kb: 'spend.pension_index', value: pens.index || 'wages', options: [{ v: 'wages', label: 'По зарплатам' }, { v: 'mixed', label: 'Смешанная' }, { v: 'infl', label: 'По инфляции' }],
    onChange: v => { pens.index = v; model.setPension(pens); } }));
  const un = model.unemp();
  soc.appendChild(U.slider({ name: 'Пособие по безработице (доля зарплаты)', icon: '🧑‍💼', kb: 'spend.unemp_repl', min: 0, max: 0.9, step: 0.01, value: un.repl, fmt: v => pct(v, 0), norm: { lo: 0.4, hi: 0.7 },
    onChange: v => { un.repl = v; model.setUnemp(un); } }));
  soc.appendChild(U.slider({ name: 'Срок выплаты пособия', icon: '📅', kb: 'spend.unemp_months', min: 0, max: 24, step: 1, value: un.months, fmt: v => v + ' мес.', norm: { lo: 6, hi: 12 },
    onChange: v => { un.months = v; model.setUnemp(un); } }));
  soc.appendChild(U.slider({ name: 'Детское пособие (на ребёнка, доля зарплаты)', icon: '👶', kb: 'spend.child', min: 0, max: 0.25, step: 0.005, value: model.get('childBenefit'), fmt: v => pct(v, 1), norm: { lo: 0.02, hi: 0.08 },
    onChange: v => model.set('childBenefit', v) }));
  soc.appendChild(U.slider({ name: 'Гарантированный минимум дохода (доля медианы)', icon: '🥣', kb: 'spend.gmi', min: 0, max: 0.6, step: 0.01, value: model.get('gmi'), fmt: v => pct(v, 0), norm: { lo: 0.15, hi: 0.4 },
    onChange: v => model.set('gmi', v) }));
  soc.appendChild(U.slider({ name: 'Безусловный базовый доход (доля зарплаты)', icon: '🎁', kb: 'spend.ubi', min: 0, max: 0.5, step: 0.01, value: model.get('ubi'), fmt: v => pct(v, 0), norm: { lo: 0, hi: 0.05 },
    sub: () => s ? `Стоимость ≈ ${pct(s.pop.adults * model.get('ubi') * s.e.W * 12 / GDP)} ВВП` : '',
    onChange: v => model.set('ubi', v) }));
  soc.appendChild(U.slider({ name: 'Зарплаты бюджетников (к средней в частном секторе)', icon: '🧑‍🏫', kb: 'spend.publicwage', min: 0.5, max: 1.6, step: 0.01, value: model.get('publicWage'), fmt: v => '×' + D.fmt(v, 2), norm: { lo: 0.9, hi: 1.1 },
    onChange: v => model.set('publicWage', v) }));
  box.appendChild(soc);
  for (const cat of D.SPEND_CATS) {
    const items = D.SPEND_DISC.filter(x => x.cat === cat.id);
    if (!items.length) continue;
    const card = h('div.card', h('h3', cat.icon + ' ' + cat.name));
    for (const x of items) {
      card.appendChild(U.slider({ name: x.name, icon: x.icon, kb: 'spend.' + x.id, min: 0, max: x.max, step: 0.0005, value: model.get(x.id), norm: x.norm, fmt: v => pct(v, 2),
        sub: () => s ? `≈ ${D.money(s, model.get(x.id) * GDP)}/год` : '', onChange: v => model.set(x.id, v) }));
    }
    box.appendChild(card);
  }
  return box;
};

// ---------- законы ----------
U.lawPanel = function (model, s) {
  const box = h('div');
  const reg = D.REGIME[model.regime()];
  if (s) box.appendChild(h('div.note.mb', reg.needParl ? '🏛️ В вашей стране законы принимает парламент. Перед выбором вы увидите прогноз поддержки. Если большинства нет, закон не пройдёт' + (reg.decree ? ' — но президент может издать указ (это снизит доверие).' : '.') : '👑 Законы вступают в силу по вашему решению — без парламента.'));
  for (const cat of D.LAW_CATS) {
    const card = h('div.card', h('h3', cat.icon + ' ' + cat.name));
    for (const l of D.LAWS.filter(x => x.cat === cat.id)) {
      const pend = s && (s.pendingLaws || []).find(p => p.id === l.id);
      const opts = l.opts.map((o, i) => ({ v: i, label: o.label, disabled: o.auth && reg.dem, title: o.auth && reg.dem ? 'Недоступно в демократии' : null }));
      card.appendChild(U.prmSeg({ name: l.name, icon: l.icon, kb: 'law.' + l.id, value: model.law(l.id), cur: model.law(l.id), options: opts,
        sub: pend ? `⏳ Вступает в силу: «${l.opts[pend.opt].label}» через ${pend.t - s.t} мес.` : null,
        onChange: v => model.setLaw(l.id, v) }));
    }
    box.appendChild(card);
  }
  return box;
};

// ---------- ЦБ и финансы ----------
U.cbPanel = function (model, s) {
  const box = h('div');
  const cb = model.cb();
  const card = h('div.card', h('h3', '🏦 Центральный банк', h('span.sp'), U.info('cb.about')));
  card.appendChild(U.prmSeg({ name: 'Валютный режим', kb: 'cb.regime', value: cb.regime, options: D.CB_REGIMES.map(r => ({ v: r.id, label: r.name })),
    onChange: v => { cb.regime = v; model.setCb(cb); rerender(); } }));
  if (cb.regime !== 'union') {
    card.appendChild(U.prmToggle({ name: 'Независимость ЦБ', kb: 'cb.independent', value: cb.independent, sub: cb.independent ? 'ЦБ сам ставит ставку по правилу Тейлора' : 'Ставку определяет правительство',
      onChange: v => { cb.independent = v; model.setCb(cb); rerender(); } }));
    card.appendChild(U.slider({ name: 'Цель по инфляции', kb: 'cb.target', min: 0, max: 0.1, step: 0.0025, value: cb.target, fmt: v => pct(v, 1), norm: { lo: 0.02, hi: 0.04 },
      onChange: v => { cb.target = v; model.setCb(cb); } }));
    if (!cb.independent) {
      card.appendChild(U.prmToggle({ name: 'Автопилот ставки', kb: 'cb.auto', value: cb.auto !== false, sub: cb.auto !== false ? 'Технократы ЦБ ведут ставку сами (мягче, чем независимый ЦБ)' : 'Вы задаёте ставку вручную',
        onChange: v => { cb.auto = v; model.setCb(cb); rerender(); } }));
      card.appendChild(U.slider({ name: 'Ключевая ставка', kb: 'cb.rate', min: 0, max: 1.2, step: 0.0025, value: cb.rate, fmt: v => pct(v, 2),
        sub: () => s ? `Правило Тейлора советует ≈ ${pct(s.e.iTaylor || 0, 1)} · инфляция ${pct(s.e.pi12)} · ожидания ${pct(s.e.pie)}` : '',
        disabled: cb.auto !== false, onChange: v => { cb.rate = v; cb.auto = false; model.setCb(cb); } }));
    } else if (s) card.appendChild(h('div.small.dim', `Текущая ставка ${pct(s.e.i, 2)} (по правилу Тейлора ≈ ${pct(s.e.iTaylor || 0, 1)}).`));
  } else card.appendChild(h('div.note', 'Своей денежной политики нет: ставка определяется центробанком валютного союза (как ЕЦБ для стран еврозоны). Вы не можете девальвировать валюту или печатать деньги — только бюджет и реформы.'));
  box.appendChild(card);
  let rerender = () => { const nb = U.cbPanel(model, s); box.replaceWith(nb); };
  return box;
};

// Финансирование дефицита и межбюджетные отношения.
U.finPanel = function (model, s) {
  const box = h('div');
  const cb = model.cb();
  const fin = model.fin();
  const card2 = h('div.card', h('h3', '💳 Финансирование дефицита', h('span.sp'), U.info('fis.financing')));
  card2.appendChild(U.slider({ name: 'Доля займов за рубежом (в валюте)', kb: 'fis.foreign', min: 0, max: 1, step: 0.05, value: fin.foreign, fmt: v => pct(v, 0),
    onChange: v => { fin.foreign = v; model.setFin(fin); } }));
  const canPrint = !cb.independent && cb.regime !== 'union';
  card2.appendChild(U.slider({ name: 'Печать денег (доля дефицита)', kb: 'fis.monetize', min: 0, max: 1, step: 0.05, value: canPrint ? fin.monetize : 0, fmt: v => pct(v, 0), disabled: !canPrint,
    sub: canPrint ? 'Опасно: прямой путь к инфляции' : 'Независимый ЦБ не финансирует правительство', onChange: v => { fin.monetize = v; model.setFin(fin); } }));
  card2.appendChild(U.prmToggle({ name: 'Тратить фонд благосостояния на дефицит', kb: 'fis.fund', value: !!fin.useFund, onChange: v => { fin.useFund = v; model.setFin(fin); } }));
  box.appendChild(card2);
  const rg = model.regional();
  const card3 = h('div.card', h('h3', '🗺️ Межбюджетные отношения', h('span.sp'), U.info('reg.transfer')));
  card3.appendChild(U.slider({ name: 'Трансферты регионам (доля доходов центра)', kb: 'reg.transfer', min: 0, max: 0.5, step: 0.01, value: rg.transfer, fmt: v => pct(v, 0), norm: { lo: 0.1, hi: 0.3 },
    onChange: v => { rg.transfer = v; model.setRegional(rg); } }));
  card3.appendChild(U.slider({ name: 'Выравнивание (помощь бедным регионам)', kb: 'reg.equal', min: 0, max: 1, step: 0.05, value: rg.equal, fmt: v => pct(v, 0),
    sub: v => v < 0.3 ? 'Деньги делятся по численности — сильные регионы богатеют' : v > 0.7 ? 'Почти всё уходит отстающим — меньше стимулов развиваться самим' : 'Баланс между справедливостью и стимулами',
    onChange: v => { rg.equal = v; model.setRegional(rg); } }));
  box.appendChild(card3);
  return box;
};

// Адаптер к конфигу (конструктор).
U.cfgModel = cfg => ({
  get: id => id === 'childBenefit' ? cfg.child : id === 'gmi' ? cfg.gmi : id === 'ubi' ? (cfg.ubi || 0) : id === 'publicWage' ? cfg.publicWage : (cfg.tax[id] !== undefined && D.TAX[id] ? cfg.tax[id] : cfg.spend[id] || 0),
  set: (id, v) => {
    if (id === 'childBenefit') cfg.child = v; else if (id === 'gmi') cfg.gmi = v; else if (id === 'ubi') cfg.ubi = v; else if (id === 'publicWage') cfg.publicWage = v;
    else if (D.TAX[id]) { cfg.tax[id] = v; if (id === 'pit' && cfg.pitMode === 'flat') cfg.pit.forEach(b => { b[1] = v; }); cfg.revTarget = 0; }
    else { cfg.spend[id] = v; cfg.expTarget = 0; }
  },
  pitMode: () => cfg.pitMode, setPitMode: v => { cfg.pitMode = v; cfg.revTarget = 0; },
  brackets: () => cfg.pit.map(b => ({ from: b[0], rate: b[1] })), setBrackets: br => { cfg.pit = br.map(b => [b.from, b.rate]); cfg.revTarget = 0; },
  taxFree: () => cfg.taxFree || 0, setTaxFree: v => { cfg.taxFree = v; },
  split: id => cfg.splits[id] || D.TAX[id].split, setSplit: (id, sp) => { cfg.splits[id] = sp; },
  pension: () => Object.assign({ index: 'wages' }, cfg.pension), setPension: p => { cfg.pension = p; },
  unemp: () => Object.assign({}, cfg.unemp), setUnemp: u => { cfg.unemp = u; },
  regime: () => cfg.regime, law: id => cfg.laws[id], setLaw: (id, v) => { cfg.laws[id] = v; },
  cb: () => Object.assign({ auto: true, rate: cfg.eco.rate }, cfg.cb), setCb: cb => { cfg.cb = cb; if (cb.rate !== undefined) cfg.eco.rate = cb.rate; },
  fin: () => Object.assign({ useFund: true }, cfg.fin), setFin: f => { cfg.fin = f; },
  regional: () => Object.assign({}, cfg.regional), setRegional: r => { cfg.regional = r; },
});
})();
