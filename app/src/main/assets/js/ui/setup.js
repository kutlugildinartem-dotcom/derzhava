'use strict';
// Конструктор страны.
(function () {
const D = globalThis.D, U = D.ui, h = U.h;
const pct = (v, d = 1) => D.fmt(v * 100, d) + '%';

D.REAL_CURRENCIES = [
  { code: 'USD', name: 'доллар США', sym: '$', rate: 1 }, { code: 'EUR', name: 'евро', sym: '€', rate: 0.92 }, { code: 'GBP', name: 'фунт стерлингов', sym: '£', rate: 0.79 },
  { code: 'JPY', name: 'иена', sym: '¥', rate: 150 }, { code: 'CNY', name: 'юань', sym: '¥', rate: 7.2 }, { code: 'RUB', name: 'рубль', sym: '₽', rate: 90 },
  { code: 'CHF', name: 'швейцарский франк', sym: 'Fr', rate: 0.88 }, { code: 'KZT', name: 'тенге', sym: '₸', rate: 460 }, { code: 'BYN', name: 'белорусский рубль', sym: 'Br', rate: 3.2 },
  { code: 'UAH', name: 'гривна', sym: '₴', rate: 40 }, { code: 'TRY', name: 'турецкая лира', sym: '₺', rate: 32 }, { code: 'INR', name: 'рупия', sym: '₹', rate: 83 },
  { code: 'BRL', name: 'реал', sym: 'R$', rate: 5 }, { code: 'PLN', name: 'злотый', sym: 'zł', rate: 4 }, { code: 'SEK', name: 'шведская крона', sym: 'kr', rate: 10.5 },
];

const SECTIONS = [
  { id: 'main', name: 'Страна', icon: '🏳️' },
  { id: 'geo', name: 'География', icon: '🗺️', from: ['geo'] },
  { id: 'demo', name: 'Население', icon: '👥', from: ['demo'] },
  { id: 'eco', name: 'Экономика', icon: '📈', from: ['eco'] },
  { id: 'tax', name: 'Налоги', icon: '💰', from: ['tax'] },
  { id: 'spend', name: 'Бюджет', icon: '🧾', from: ['spend'] },
  { id: 'laws', name: 'Законы', icon: '⚖️', from: ['laws'] },
  { id: 'cb', name: 'ЦБ', icon: '🏦', from: ['currency'] },
  { id: 'world', name: 'Мир', icon: '🌍' },
];

U.openSetup = function (cfgIn) {
  const cfg = cfgIn || D.defaultConfig();
  let sec = 'main';
  const scr = h('div.screen');
  const top = h('div.topbar', h('button.iconbtn', { onclick: () => U.showHome() }, '‹'), h('h2.grow', 'Создание государства'),
    h('button.btn.small', { onclick: () => pickTemplate() }, '🌍 Шаблон'), h('button.btn.small', { onclick: () => pickRandom() }, '🎲'));
  const tabsBox = h('div');
  const body = h('div.scroll');
  const foot = h('div', { style: 'position:absolute;left:0;right:0;bottom:0;padding:10px 12px calc(10px + var(--safe-bot));background:rgba(14,20,32,0.97);border-top:1px solid var(--line);display:flex;gap:8px' },
    h('button.btn.grow', { onclick: () => { const i = SECTIONS.findIndex(x => x.id === sec); if (i > 0) go(SECTIONS[i - 1].id); } }, '‹'),
    h('button.btn.primary', { style: 'flex:3', onclick: start }, '🏛️ Создать государство'),
    h('button.btn.grow', { onclick: () => { const i = SECTIONS.findIndex(x => x.id === sec); if (i < SECTIONS.length - 1) go(SECTIONS[i + 1].id); } }, '›'));
  scr.append(top, tabsBox, body, foot);
  U.setScreen(scr);
  U.onBack = () => { U.showHome(); return true; };

  function go(id) { sec = id; render(); body.scrollTop = 0; }
  function render() {
    U.clear(tabsBox).appendChild(U.tabs(SECTIONS, sec, go));
    U.clear(body);
    const S = SECTIONS.find(x => x.id === sec);
    if (S.from) body.appendChild(h('div.row.mb', h('span.small.dim.grow', 'Параметры можно взять у реальной страны — и смешать с другими.'),
      h('button.btn.small', { onclick: () => pickTemplate(S.from, S.name) }, '📥 Взять у страны')));
    const fn = { main, geo, demo, eco, tax, spend, laws, cb, world }[sec];
    body.appendChild(fn());
  }

  // ---------- выбор шаблона ----------
  function pickTemplate(sections, label) {
    const list = h('div');
    for (const c of D.COUNTRIES) list.appendChild(h('button.list-item', { style: 'width:100%;text-align:left', onclick: () => {
      D.applyCountry(cfg, c.id, sections || null); m.close(); U.toast(sections ? `«${label}» взяты у страны ${c.name}` : `Шаблон: ${c.name} (${c.year})`); render();
    } }, h('span.ic', c.flag), h('div.grow', h('b', c.name), h('div.small.dim', `${D.REGIME[c.regime].name} · ${D.SYSTEM[c.system].name} · ВВП на душу ${D.usd(c.eco.gdppc, 0)} · ${c.year} г.`)), h('span.dim', '›')));
    const m = U.modal({ title: sections ? `«${label}»: взять у страны` : 'Шаблон реальной страны', icon: '🌍', body: h('div',
      h('p.small.dim', sections ? 'Будут заменены только параметры этого раздела. Так можно собрать «идеальную» страну: налоги Швеции, институты Сингапура, ресурсы Норвегии…' : 'Все параметры будут взяты у выбранной страны (цифры приблизительные, ≈2023–2024).'),
      list) });
  }
  function pickRandom() {
    const list = h('div');
    for (const a of D.ARCHETYPES) list.appendChild(h('button.list-item', { style: 'width:100%;text-align:left', onclick: () => {
      const n = D.randomConfig(Date.now() & 0x7fffffff, a.id);
      Object.keys(cfg).forEach(k => delete cfg[k]); Object.assign(cfg, n);
      m.close(); U.toast('Сгенерирована страна: ' + cfg.name); render();
    } }, h('span.ic', a.icon), h('b.grow', a.name), h('span.dim', '›')));
    const m = U.modal({ title: 'Случайная страна', icon: '🎲', body: h('div', h('p.small.dim', 'Выберите архетип — параметры будут сгенерированы правдоподобно для такой страны. Потом всё можно подправить.'), list) });
  }

  // ---------- разделы ----------
  function main() {
    const box = h('div');
    const c1 = h('div.card', h('h3', '🏳️ Название и символы'));
    const txt = (label, key, kb) => { const inp = h('input', { type: 'text', value: cfg[key] || '' }); inp.addEventListener('input', () => { cfg[key] = inp.value; }); return h('div.prm', h('div.prm-head', h('div.prm-name', label), kb ? U.info(kb) : null), h('div', { style: 'margin-top:6px' }, inp)); };
    c1.append(txt('Название страны', 'name', 'cfg.name'), txt('Столица', 'capital'), txt('Ваша партия / движение', 'partyName', 'politics.party'));
    // Флаг.
    const fc = h('canvas.flagbox');
    const redraw = () => U.drawFlag(fc, cfg.flag, 90, 60);
    const flagEd = h('div');
    const renderFlag = () => {
      U.clear(flagEd);
      flagEd.appendChild(h('div.row', fc, h('div.col.grow', U.seg({ options: D.FLAG_LAYOUTS.map(l => ({ v: l, label: { h3: '☰', v3: '▥', h2: '▤', cross: '✚', tri: '◣', band: '▬', diag: '◩', circle: '◉' }[l] })), value: cfg.flag.layout, onChange: v => { cfg.flag.layout = v; redraw(); } }))));
      ['Цвет 1', 'Цвет 2', 'Цвет 3'].forEach((lab, k) => {
        flagEd.appendChild(h('div.row.mt', h('span.small.dim', { style: 'width:52px' }, lab), h('div.colors', D.FLAG_COLORS.map(col => h('button' + (cfg.flag.colors[k] === col ? '.on' : ''), { style: { background: col }, onclick: () => { cfg.flag.colors[k] = col; renderFlag(); } })))));
      });
      flagEd.appendChild(h('div.row.mt', h('span.small.dim', { style: 'width:52px' }, 'Эмблема'), U.seg({ options: ['', '★', '☀', '⚜', '✦', '❂', '🦅', '🦁', '🌿', '⚒', '🐻', '🌙'].map(x => ({ v: x, label: x || 'нет' })), value: cfg.flag.emblem, onChange: v => { cfg.flag.emblem = v; redraw(); } })));
      redraw();
    };
    renderFlag();
    c1.appendChild(h('div.prm', h('div.prm-head', h('div.prm-name', 'Флаг'), h('button.btn.small', { onclick: () => { cfg.flag = D.randomFlag(D.tmpRng(Date.now())); renderFlag(); } }, '🎲')), h('div.mt', flagEd)));
    box.appendChild(c1);
    // Строй.
    const c2 = h('div.card', h('h3', '🏛️ Форма правления и экономическая система'));
    c2.appendChild(h('div.prm-sub', 'От формы правления зависят выборы, роль парламента, доступные законы и отношения с другими странами.'));
    for (const r of D.REGIMES) c2.appendChild(h('button.list-item', { style: 'width:100%;text-align:left', onclick: () => { cfg.regime = r.id; render(); } },
      h('span.ic', r.icon), h('div.grow', h('b' + (cfg.regime === r.id ? '.gold' : ''), r.name), h('div.small.dim', r.dem ? 'Демократия: свободные выборы' + (r.term ? ` каждые ${r.term} лет` : '') : r.elections === 'managed' ? 'Выборы под контролем власти' : 'Выборов нет')),
      cfg.regime === r.id ? h('span.chip.sel', '✓') : null, U.info('regime.' + r.id)));
    c2.appendChild(h('div.divider'));
    for (const x of D.SYSTEMS) c2.appendChild(h('button.list-item', { style: 'width:100%;text-align:left', onclick: async () => {
      const ok = await U.confirm({ title: x.name, icon: x.icon, text: 'Применить систему? Налоги и расходы будут выставлены «в её духе» (потом их можно поменять).', ok: 'Применить' });
      if (ok) { D.applySystem(cfg, x.id); cfg.revTarget = 0; cfg.expTarget = 0; render(); }
    } }, h('span.ic', x.icon), h('div.grow', h('b' + (cfg.system === x.id ? '.gold' : ''), x.name), h('div.small.dim', `Госсектор ≈ ${pct(x.stateShare, 0)}${x.plan ? ' · планирование' : ''}`)),
      cfg.system === x.id ? h('span.chip.sel', '✓') : null, U.info('system.' + x.id)));
    box.appendChild(c2);
    // Валюта.
    const c3 = h('div.card', h('h3', '💱 Валюта', h('span.sp'), U.info('cfg.currency')));
    const mode = cfg.cb.regime === 'union' ? 'union' : 'own';
    c3.appendChild(U.seg({ options: [{ v: 'own', label: 'Своя валюта' }, { v: 'union', label: 'Чужая валюта / валютный союз' }], value: mode, onChange: v => {
      if (v === 'union') { cfg.cb.regime = 'union'; cfg.cur = Object.assign({}, D.REAL_CURRENCIES[1], { union: true }); }
      else { cfg.cb.regime = 'float'; delete cfg.cur.union; }
      render();
    } }));
    if (mode === 'own') {
      c3.append(txt2('Название', v => cfg.cur.name = v, cfg.cur.name), txt2('Символ', v => cfg.cur.sym = v, cfg.cur.sym));
      c3.appendChild(U.slider({ name: 'Курс: единиц за 1 доллар', kb: 'cfg.rate', min: 0, max: 7, step: 0.01, value: Math.log10(cfg.cur.rate), fmt: v => D.fmt(Math.pow(10, v), Math.pow(10, v) < 10 ? 2 : 0),
        onChange: v => { cfg.cur.rate = +Math.pow(10, v).toPrecision(3); } }));
      c3.appendChild(h('div.prm-sub', 'Или назовите валюту как реальную:'));
      c3.appendChild(h('div.seg', D.REAL_CURRENCIES.map(rc => h('button', { onclick: () => { cfg.cur = { name: rc.name, sym: rc.sym, code: rc.code, rate: rc.rate }; render(); } }, rc.code))));
    } else {
      c3.appendChild(h('div.prm-sub', 'Какую валюту используете:'));
      c3.appendChild(h('div.seg', D.REAL_CURRENCIES.slice(0, 3).map(rc => h('button' + (cfg.cur.code === rc.code ? '.on' : ''), { onclick: () => { cfg.cur = Object.assign({}, rc, { union: true }); render(); } }, rc.code + ' ' + rc.sym))));
      c3.appendChild(h('div.note.mt', 'Как Эквадор с долларом или страны еврозоны с евро: нет своей денежной политики, но нет и риска девальвации. Ставку задаёт «чужой» ЦБ.'));
    }
    box.appendChild(c3);
    // Игра.
    const c4 = h('div.card', h('h3', '🎮 Параметры партии'));
    c4.appendChild(U.prmSeg({ name: 'Сложность', kb: 'cfg.difficulty', value: cfg.difficulty, options: D.DIFFICULTIES.map(d => ({ v: d.id, label: d.name })), sub: D.DIFFICULTIES.find(d => d.id === cfg.difficulty).desc, onChange: v => { cfg.difficulty = v; render(); } }));
    c4.appendChild(U.prmSeg({ name: 'Длительность', kb: 'cfg.length', value: cfg.lengthYears, options: [10, 20, 30, 50, 0].map(y => ({ v: y, label: y ? y + ' лет' : 'Без конца' })), onChange: v => { cfg.lengthYears = v; } }));
    c4.appendChild(U.slider({ name: 'Год начала', min: 1900, max: 2100, step: 1, value: cfg.startYear, fmt: v => String(v), onChange: v => { cfg.startYear = v; } }));
    c4.appendChild(U.prmToggle({ name: 'Банки как отдельный механизм', kb: 'cfg.banks', value: cfg.modules.banks, sub: 'Плохие долги, банковские кризисы, паника вкладчиков', onChange: v => cfg.modules.banks = v }));
    c4.appendChild(U.prmToggle({ name: 'Рынок жилья и ипотека', kb: 'cfg.housing', value: cfg.modules.housing, sub: 'Цены квартир, пузыри, доступность жилья', onChange: v => cfg.modules.housing = v }));
    c4.appendChild(U.prmToggle({ name: 'Армия и внешние угрозы', kb: 'cfg.military', value: cfg.modules.military, sub: 'Соперник у границы, военные союзы, конфликты', onChange: v => cfg.modules.military = v }));
    c4.appendChild(U.prmToggle({ name: 'Случайные события', kb: 'cfg.events', value: cfg.modules.events, sub: 'Кризисы, пандемии, засухи, открытия месторождений…', onChange: v => cfg.modules.events = v }));
    box.appendChild(c4);
    return box;
  }
  function txt2(label, set, val) { const inp = h('input', { type: 'text', value: val || '' }); inp.addEventListener('input', () => set(inp.value)); return h('div.prm', h('div.prm-name', label), h('div', { style: 'margin-top:6px' }, inp)); }

  function geo() {
    const box = h('div');
    const c = h('div.card', h('h3', '🗺️ Территория'));
    c.appendChild(U.slider({ name: 'Площадь (тыс. км²)', kb: 'geo.area', min: -0.5, max: 4.4, step: 0.01, value: Math.log10(Math.max(0.3, cfg.geo.area)), fmt: v => D.fmt(Math.pow(10, v), Math.pow(10, v) < 10 ? 1 : 0),
      sub: v => { const a = Math.pow(10, v); return a < 1 ? 'Город-государство (Сингапур — 0,7)' : a < 50 ? 'Маленькая (Эстония — 45)' : a < 500 ? 'Средняя (Германия — 357)' : a < 3000 ? 'Большая (Казахстан — 2725)' : 'Огромная (Россия — 17 100)'; },
      onChange: v => { cfg.geo.area = +Math.pow(10, v).toPrecision(3); } }));
    c.appendChild(U.prmSeg({ name: 'Климат', kb: 'geo.climate', value: cfg.geo.climate, options: D.CLIMATES.map(x => ({ v: x.id, label: x.name })), onChange: v => cfg.geo.climate = v }));
    c.appendChild(U.prmToggle({ name: 'Выход к морю', kb: 'geo.coast', value: !!cfg.geo.coast, sub: 'Порты, морская торговля, курорты', onChange: v => cfg.geo.coast = v ? 1 : 0 }));
    c.appendChild(U.slider({ name: 'Число регионов', kb: 'geo.regions', min: 0, max: 12, step: 1, value: cfg.geo.regions || 0, fmt: v => v ? String(Math.max(3, v)) : 'случайно',
      onChange: v => cfg.geo.regions = v ? Math.max(3, v) : 0 }));
    box.appendChild(c);
    const r = h('div.card', h('h3', '⛏️ Природные ресурсы', h('span.sp'), U.info('res.about')));
    for (const x of D.RESOURCES) r.appendChild(U.slider({ name: x.name, icon: x.icon, kb: 'res.' + x.id, min: 0, max: 100, step: 1, value: cfg.res[x.id], fmt: v => v + ' / 100',
      sub: v => v < 10 ? 'Почти нет' : v < 40 ? 'Немного' : v < 70 ? 'Значительные запасы' : 'Огромные запасы', onChange: v => cfg.res[x.id] = v }));
    r.appendChild(h('div.note.mt', 'Запасы определяют, какие регионы появятся и что страна может экспортировать. Долю добычи в экономике задаёт структура отраслей (раздел «Экономика»). Помните о «ресурсном проклятии»: богатство недр часто приводит к коррупции и отставанию остальных отраслей.'));
    box.appendChild(r);
    return box;
  }

  function demo() {
    const d = cfg.demo, box = h('div.card', h('h3', '👥 Население'));
    box.appendChild(U.slider({ name: 'Численность (млн чел.)', kb: 'demo.pop', min: -1, max: 3.2, step: 0.01, value: Math.log10(d.pop), fmt: v => D.fmt(Math.pow(10, v), Math.pow(10, v) < 10 ? 2 : 0), onChange: v => d.pop = +Math.pow(10, v).toPrecision(3) }));
    box.appendChild(U.slider({ name: 'Рождаемость (детей на женщину)', kb: 'ind.tfr', min: 0.7, max: 7, step: 0.05, value: d.tfr, fmt: v => D.fmt(v, 2), norm: { lo: 1.8, hi: 2.3 }, sub: v => v < 2.1 ? 'Ниже уровня замещения (2,1) — население будет стареть и сокращаться' : 'Население растёт', onChange: v => d.tfr = v }));
    box.appendChild(U.slider({ name: 'Ожидаемая продолжительность жизни', kb: 'ind.le', min: 45, max: 86, step: 0.1, value: d.le, fmt: v => D.fmt(v, 1) + ' лет', norm: { lo: 76, hi: 86 }, onChange: v => d.le = v }));
    box.appendChild(U.slider({ name: 'Медианный возраст', kb: 'ind.median', min: 15, max: 50, step: 0.5, value: d.median, fmt: v => D.fmt(v, 1) + ' лет', sub: v => v < 25 ? 'Молодая страна: много детей, дешёвый труд' : v > 42 ? 'Стареющая страна: много пенсионеров' : 'Сбалансированная структура', onChange: v => d.median = v }));
    box.appendChild(U.slider({ name: 'Городское население', kb: 'demo.urban', min: 0.1, max: 1, step: 0.01, value: d.urban, fmt: v => pct(v, 0), onChange: v => d.urban = v }));
    box.appendChild(U.slider({ name: 'Средние годы обучения', kb: 'ind.edu', min: 2, max: 14.5, step: 0.1, value: d.edu, fmt: v => D.fmt(v, 1) + ' лет', norm: { lo: 11, hi: 14.5 }, onChange: v => d.edu = v }));
    box.appendChild(U.slider({ name: 'Участие в рабочей силе (15–64)', kb: 'ind.lfpr', min: 0.4, max: 0.9, step: 0.01, value: d.lfpr, fmt: v => pct(v, 0), norm: { lo: 0.7, hi: 0.85 }, onChange: v => d.lfpr = v }));
    box.appendChild(U.slider({ name: 'Доля мигрантов', kb: 'demo.immig', min: 0, max: 0.9, step: 0.01, value: d.immig, fmt: v => pct(v, 0), onChange: v => d.immig = v }));
    return box;
  }

  function eco() {
    const e = cfg.eco, box = h('div');
    const c = h('div.card', h('h3', '📈 Уровень развития и макроэкономика'));
    const S = (name, kb, key, min, max, step, fmt, norm, sub) => c.appendChild(U.slider({ name, kb, min, max, step, value: e[key], fmt, norm, sub, onChange: v => { e[key] = v; cfg.revTarget = 0; cfg.expTarget = 0; } }));
    c.appendChild(U.slider({ name: 'ВВП на душу населения, $', kb: 'ind.gdppc', min: 2.5, max: 5.1, step: 0.005, value: Math.log10(e.gdppc), fmt: v => D.usd(Math.pow(10, v), 0),
      sub: v => { const x = Math.pow(10, v); return x < 1500 ? 'Беднейшие страны (Эфиопия, Мали)' : x < 5000 ? 'Ниже среднего (Индия, Египет)' : x < 15000 ? 'Средний уровень (Бразилия, Китай, Россия)' : x < 35000 ? 'Выше среднего (Польша, Чили)' : 'Богатые страны (Германия, США)'; },
      onChange: v => { e.gdppc = Math.round(Math.pow(10, v)); cfg.revTarget = 0; } }));
    S('Трендовый рост ВВП', 'ind.gdp', 'growth', 0, 0.08, 0.001, v => pct(v), { lo: 0.02, hi: 0.06 });
    S('Инфляция на старте', 'ind.inflation', 'infl', -0.02, 3, 0.005, v => pct(v), { lo: 0.01, hi: 0.04 });
    S('Ключевая ставка на старте', 'cb.rate', 'rate', 0, 1.5, 0.0025, v => pct(v, 2));
    S('Безработица', 'ind.unemployment', 'unemp', 0.01, 0.35, 0.001, v => pct(v), { lo: 0.03, hi: 0.06 });
    S('Госдолг, % ВВП', 'fis.debt', 'debt', 0, 3, 0.01, v => pct(v, 0), { lo: 0, hi: 0.6 });
    S('Доля долга в иностранной валюте', 'fis.extdebt', 'extDebt', 0, 1, 0.01, v => pct(v, 0), { lo: 0, hi: 0.3 });
    S('Валютные резервы (месяцев импорта)', 'ind.reserves', 'reserves', 0, 24, 0.1, v => D.fmt(v, 1), { lo: 3, hi: 24 });
    S('Суверенный фонд, % ВВП', 'fis.fund', 'fund', 0, 3, 0.01, v => pct(v, 0));
    S('Открытость торговле (экспорт+импорт / ВВП)', 'ind.openness', 'open', 0.05, 1.6, 0.01, v => pct(v, 0));
    S('Инвестиции, % ВВП', 'ind.investment', 'invest', 0.08, 0.45, 0.005, v => pct(v, 0), { lo: 0.2, hi: 0.3 });
    S('Кредиты экономике, % ВВП', 'ind.credit', 'credit', 0.02, 2, 0.01, v => pct(v, 0));
    S('Цена квартиры в годовых зарплатах', 'ind.housing', 'house', 2, 25, 0.1, v => D.fmt(v, 1) + ' лет', { lo: 3, hi: 7 });
    box.appendChild(c);
    const c2 = h('div.card', h('h3', '🏛️ Институты и общество'));
    const S2 = (name, kb, key, min, max, step, fmt, norm, sub) => c2.appendChild(U.slider({ name, kb, min, max, step, value: e[key], fmt, norm, sub, onChange: v => { e[key] = v; } }));
    S2('Коррупция (0 — нет, 100 — тотальная)', 'ind.corruption', 'corr', 0, 100, 1, v => D.fmt(v, 0), { lo: 0, hi: 30 }, v => v < 25 ? 'Как в Дании, Сингапуре' : v < 50 ? 'Средне (Польша, Чили)' : v < 70 ? 'Высокая (Бразилия, Турция)' : 'Системная (Нигерия, Венесуэла)');
    S2('Теневая экономика', 'ind.shadow', 'shadow', 0.02, 0.7, 0.01, v => pct(v, 0), { lo: 0.02, hi: 0.15 });
    S2('Неравенство (Джини)', 'ind.gini', 'gini', 0.2, 0.65, 0.005, v => D.fmt(v, 2), { lo: 0.24, hi: 0.32 }, v => v < 0.28 ? 'Очень равное (Скандинавия)' : v < 0.35 ? 'Умеренное (Германия, Япония)' : v < 0.45 ? 'Высокое (США, Россия)' : 'Огромное (ЮАР, Бразилия)');
    S2('Доля госсектора в экономике', 'ind.stateshare', 'state', 0, 1, 0.01, v => pct(v, 0));
    box.appendChild(c2);
    const c3 = h('div.card', h('h3', '🏭 Структура экономики', h('span.sp'), U.info('ind.sectors')));
    const tot = () => D.sum(D.SECTORS.map(s => e.sec[s.id]));
    for (const x of D.SECTORS) c3.appendChild(U.slider({ name: x.name, icon: x.icon, kb: 'sector.' + x.id, min: 0, max: 0.6, step: 0.005, value: e.sec[x.id], fmt: v => pct(v / Math.max(0.01, tot() - e.sec[x.id] + v), 0),
      onChange: v => { e.sec[x.id] = v; cfg.revTarget = 0; } }));
    c3.appendChild(h('div.small.dim', 'Доли автоматически нормируются к 100%. Добыча сырья определяет сырьевую ренту, экспорт и зависимость от цен на нефть и металлы.'));
    box.appendChild(c3);
    return box;
  }

  function tax() { return U.taxPanel(U.cfgModel(cfg), null); }
  function spend() { return U.spendPanel(U.cfgModel(cfg), null); }
  function laws() { return U.lawPanel(U.cfgModel(cfg), null); }
  function cb() { return h('div', U.cbPanel(U.cfgModel(cfg), null), U.finPanel(U.cfgModel(cfg), null)); }
  function world() {
    const box = h('div.card', h('h3', '🌍 Мир вокруг'));
    box.appendChild(h('p.small.dim', 'В мире 8 стран-партнёров разных типов: сверхдержава-демократия, союз богатых демократий, «фабрика мира», нефтяная монархия, крупный развивающийся рынок, сосед-союзник, сосед-соперник и бедный сосед. Отношения с ними зависят от вашего строя, свобод, торговли и действий.'));
    box.appendChild(U.prmSeg({ name: 'Санкции на старте', kb: 'world.sanctions', value: cfg.world.sanctions || 0, options: [{ v: 0, label: 'Нет' }, { v: 1, label: 'Точечные' }, { v: 2, label: 'Секторальные' }, { v: 3, label: 'Эмбарго' }],
      sub: 'Санкции со стороны западных демократий (сверхдержавы и союза).', onChange: v => cfg.world.sanctions = v }));
    return box;
  }

  function start() {
    if (!cfg.name || !cfg.name.trim()) { U.toast('Назовите страну'); go('main'); return; }
    try {
      const s = D.newGame(cfg);
      U.startGame(s, true);
    } catch (err) {
      console.error(err);
      U.toast('Ошибка при создании: ' + err.message, 5000);
    }
  }
  render();
};
})();
