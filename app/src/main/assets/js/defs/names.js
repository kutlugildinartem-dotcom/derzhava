'use strict';
// Генераторы названий: регионы, страны-партнёры, партии, флаги.
(function () {
const D = globalThis.D;

// Специализации регионов: какой отраслью регион силён и какие инфраструктурные
// особенности у него на старте. w — веса отраслей (умножаются на национальные).
D.REGION_SPECS = [
  { id: 'capital', name: 'Столичный', icon: '🏙️', w: { agr: 0.05, mining: 0.1, manuf: 0.6, constr: 1.3, trade: 1.5, serv: 1.6, it: 2.6, fin: 3.2 }, infra: 1.35, wage: 1.5 },
  { id: 'industrial', name: 'Промышленный', icon: '🏭', w: { agr: 0.4, mining: 0.6, manuf: 2.4, constr: 1, trade: 0.9, serv: 0.8, it: 0.5, fin: 0.6 }, infra: 1.05, wage: 1.0 },
  { id: 'resource', name: 'Сырьевой', icon: '⛏️', w: { agr: 0.3, mining: 5, manuf: 0.6, constr: 1.1, trade: 0.7, serv: 0.6, it: 0.3, fin: 0.4 }, infra: 0.85, wage: 1.35 },
  { id: 'agrarian', name: 'Аграрный', icon: '🌾', w: { agr: 4, mining: 0.3, manuf: 0.6, constr: 0.8, trade: 0.8, serv: 0.7, it: 0.2, fin: 0.3 }, infra: 0.75, wage: 0.7 },
  { id: 'port', name: 'Портовый', icon: '⚓', w: { agr: 0.6, mining: 0.6, manuf: 1.2, constr: 1.1, trade: 2.2, serv: 1.1, it: 0.8, fin: 1.1 }, infra: 1.05, wage: 1.05, coast: true },
  { id: 'tourist', name: 'Курортный', icon: '🏖️', w: { agr: 0.8, mining: 0.2, manuf: 0.4, constr: 1.3, trade: 1.4, serv: 2.2, it: 0.5, fin: 0.5 }, infra: 0.95, wage: 0.9 },
  { id: 'forest', name: 'Лесной', icon: '🌲', w: { agr: 1, mining: 1.2, manuf: 1.2, constr: 0.7, trade: 0.7, serv: 0.6, it: 0.2, fin: 0.3 }, infra: 0.7, wage: 0.8 },
  { id: 'tech', name: 'Научный', icon: '🔬', w: { agr: 0.3, mining: 0.2, manuf: 1.2, constr: 1, trade: 1, serv: 1.2, it: 3, fin: 1 }, infra: 1.15, wage: 1.2 },
  { id: 'depressed', name: 'Депрессивный', icon: '🏚️', w: { agr: 1.5, mining: 0.8, manuf: 0.9, constr: 0.5, trade: 0.7, serv: 0.6, it: 0.1, fin: 0.2 }, infra: 0.6, wage: 0.6 },
];
D.RSPEC = {};
for (const r of D.REGION_SPECS) D.RSPEC[r.id] = r;

const ROOTS = {
  capital: ['Столичный округ'],
  industrial: ['Заводск', 'Сталегорск', 'Машинострой', 'Кузнецк', 'Литейн', 'Турбинск', 'Ковров', 'Молотов'],
  resource: ['Рудногорск', 'Нефтеюжн', 'Газодальн', 'Медноярск', 'Угольн', 'Золотоборск', 'Никелевск', 'Самоцветн'],
  agrarian: ['Степн', 'Хлебородн', 'Черноземн', 'Пшеничн', 'Подсолнечн', 'Луговск', 'Колосовск', 'Раздольн'],
  port: ['Приморск', 'Бухтов', 'Маячн', 'Якорн', 'Гаванск', 'Заливн', 'Корабельн', 'Лоцманск'],
  tourist: ['Солнечн', 'Лазурн', 'Курортн', 'Горноозерск', 'Бирюзов', 'Тёплоключ', 'Кипарисн', 'Серебряноводск'],
  forest: ['Лесн', 'Сосновск', 'Кедров', 'Таёжн', 'Березовск', 'Еловск', 'Дубравн', 'Смолянск'],
  tech: ['Наукоград', 'Академск', 'Кремниев', 'Атомград', 'Инженерн', 'Квантов', 'Звёздн', 'Технопольск'],
  depressed: ['Заречн', 'Тихогорск', 'Дальнеозёрн', 'Глухов', 'Старомлынск', 'Пустоборск', 'Туманн', 'Отрадн'],
};
const TYPES = [
  { t: 'ая область', f: true }, { t: 'ий край', f: false }, { t: 'ая губерния', f: true }, { t: 'ий округ', f: false }, { t: 'ая республика', f: true },
];
// Прилагательное из корня: «Степн» + «ая область» → «Степная область».
function regionName(root, type) {
  if (/(ск|цк)$/.test(root)) return root + (type.f ? 'ая' : 'ий') + type.t.replace(/^(ая|ий)/, '');
  if (/(ов|ев|ин)$/.test(root)) return root + (type.f ? 'ская' : 'ский') + type.t.replace(/^(ая|ий)/, '');
  if (/(град)$/.test(root)) return root + (type.f ? 'ская' : 'ский') + type.t.replace(/^(ая|ий)/, '');
  if (/(строй)$/.test(root)) return root + 'тельн' + (type.f ? 'ая' : 'ый') + type.t.replace(/^(ая|ий)/, '');
  return root + (type.f ? 'ая' : 'ый') + type.t.replace(/^(ая|ий)/, '');
}
D.makeRegionName = function (rng, spec, used) {
  if (spec === 'capital') return 'Столичный округ';
  const roots = D.shuffle(rng, ROOTS[spec] || ROOTS.depressed);
  for (const r of roots) {
    const name = regionName(r, D.pick(rng, TYPES));
    if (!used.has(name)) { used.add(name); return name; }
  }
  return 'Регион №' + (used.size + 1);
};

// ---------- мир ----------
// Архетипы стран-партнёров. size — доля в мировой экономике (для важности торговли),
// x/m — доля в нашем экспорте/импорте по умолчанию, reg — политический режим.
D.PARTNER_ARCH = [
  { id: 'hegemon', name: 'Сверхдержава-демократия', icon: '🦅', reg: 'dem', size: 0.25, x: 0.14, m: 0.14, fin: 0.45, tech: 0.35, army: 100, rich: 1 },
  { id: 'union', name: 'Союз богатых демократий', icon: '🇪🇺', reg: 'dem', size: 0.18, x: 0.22, m: 0.2, fin: 0.3, tech: 0.3, army: 60, rich: 1 },
  { id: 'factory', name: 'Фабрика мира (авторитарная)', icon: '🐉', reg: 'aut', size: 0.18, x: 0.14, m: 0.22, fin: 0.1, tech: 0.2, army: 85, rich: 0.4 },
  { id: 'petro', name: 'Нефтяная монархия', icon: '🛢️', reg: 'aut', size: 0.03, x: 0.04, m: 0.04, fin: 0.05, tech: 0, army: 30, rich: 0.8 },
  { id: 'emerging', name: 'Крупный развивающийся рынок', icon: '🐘', reg: 'hyb', size: 0.07, x: 0.08, m: 0.08, fin: 0.03, tech: 0.05, army: 55, rich: 0.2 },
  { id: 'ally', name: 'Сосед-союзник', icon: '🤝', reg: 'same', size: 0.01, x: 0.1, m: 0.08, fin: 0.02, tech: 0.03, army: 20, rich: 0.6, neighbor: true },
  { id: 'rival', name: 'Сосед-соперник', icon: '⚔️', reg: 'opp', size: 0.03, x: 0.06, m: 0.06, fin: 0.02, tech: 0.02, army: 60, rich: 0.5, neighbor: true, threat: true },
  { id: 'poor', name: 'Бедный сосед', icon: '🌾', reg: 'hyb', size: 0.005, x: 0.05, m: 0.03, fin: 0, tech: 0, army: 15, rich: 0.1, neighbor: true, migrants: true },
];
const PARTNER_NAMES = {
  hegemon: ['Объединённые Штаты Колумбии', 'Атлантическая Федерация', 'Соединённые Провинции Вестленда'],
  union: ['Европейский Союз Альбиона', 'Содружество Эстерии', 'Лига Северных Королевств'],
  factory: ['Срединная Республика Лунхай', 'Народная Республика Тянь-Шэ', 'Великая Республика Хэлун'],
  petro: ['Эмират Сахр-Аль-Нур', 'Королевство Джазира', 'Султанат Барид'],
  emerging: ['Республика Бхарата-Сур', 'Федерация Амазонии', 'Союзная Республика Наваджо'],
  ally: ['Республика Белоречье', 'Княжество Вельмор', 'Королевство Остланд'],
  rival: ['Империя Каррас', 'Республика Тарвос', 'Великое Княжество Мордан'],
  poor: ['Республика Сухоречье', 'Государство Буранистан', 'Республика Кемерия'],
};
D.makePartners = function (rng, ownRegimeDem) {
  const used = new Set();
  return D.PARTNER_ARCH.map(a => {
    let name;
    do { name = D.pick(rng, PARTNER_NAMES[a.id]); } while (used.has(name));
    used.add(name);
    const reg = a.reg === 'same' ? (ownRegimeDem ? 'dem' : 'aut') : a.reg === 'opp' ? (ownRegimeDem ? 'aut' : 'dem') : a.reg;
    return {
      id: a.id, arch: a.id, name, icon: a.icon, reg, size: a.size,
      x: a.x, m: a.m, fin: a.fin, tech: a.tech, army: a.army, rich: a.rich, neighbor: !!a.neighbor, threat: !!a.threat, migrants: !!a.migrants,
      rel: 0, sanc: 0, ourSanc: 0, fta: false, tariffUs: 0, tariffThem: 0, allied: false, memory: 0, sancMonths: 0,
      flag: D.randomFlag(rng),
    };
  });
};

// ---------- партии ----------
const PARTY_NAMES = {
  communist: ['Коммунистическая партия', 'Партия трудового народа', 'Союз левых сил'],
  socdem: ['Социал-демократическая партия', 'Партия справедливости', 'Рабочая партия'],
  green: ['Партия зелёных', 'Экологический альянс', 'Зелёная волна'],
  centrist: ['Союз центра', 'Партия «Единство»', 'Гражданская платформа'],
  liberal: ['Либеральный альянс', 'Партия свободного рынка', 'Новые люди'],
  conserv: ['Консервативная партия', 'Партия порядка и традиций', 'Христианские демократы'],
  national: ['Национальный фронт', 'Партия «Отечество»', 'Союз патриотов'],
  populist: ['Народное движение «Голос»', 'Партия простых людей', 'Движение «Правда»'],
};
D.makeParties = function (rng, ruling) {
  // ruling: {name, e, s} — партия игрока. Добавляем 4–5 оппозиционных, далёких от неё.
  const ideos = D.IDEOLOGIES.slice().sort((a, b) => {
    const da = Math.hypot(a.e - ruling.e, a.s - ruling.s), db = Math.hypot(b.e - ruling.e, b.s - ruling.s);
    return db - da;
  });
  const pickN = 5;
  const chosen = ideos.slice(0, pickN);
  const parties = [{ id: 'ruling', name: ruling.name, e: ruling.e, s: ruling.s, color: '#e8c267', ruling: true, poll: 0 }];
  for (const i of chosen) {
    if (Math.hypot(i.e - ruling.e, i.s - ruling.s) < 0.25) continue;
    parties.push({ id: i.id, name: D.pick(rng, PARTY_NAMES[i.id]), e: i.e, s: i.s, color: i.color, poll: 0 });
  }
  return parties;
};

// ---------- флаги ----------
const FLAG_COLORS = ['#c8102e', '#ffffff', '#0033a0', '#009b3a', '#fcd116', '#000000', '#e87722', '#6cace4', '#7a1f3d', '#1c4f2e', '#f4c300', '#d52b1e', '#003893', '#00a3dd'];
const LAYOUTS = ['h3', 'v3', 'h2', 'cross', 'tri', 'band', 'diag', 'circle'];
D.FLAG_LAYOUTS = LAYOUTS;
D.FLAG_COLORS = FLAG_COLORS;
D.randomFlag = function (rng) {
  const c = D.shuffle(rng, FLAG_COLORS);
  return { layout: D.pick(rng, LAYOUTS), colors: [c[0], c[1], c[2]], emblem: D.pick(rng, ['', '★', '☀', '⚜', '✦', '❂', '🦅', '🦁', '🌿']) };
};

// ---------- столицы ----------
const CAPITALS = ['Новоград', 'Белокаменск', 'Вышеград', 'Светлоград', 'Златоград', 'Державинск', 'Кремнегорск', 'Ладожск', 'Святогорск', 'Велиград', 'Добромир', 'Ясноград'];
D.randomCapital = rng => D.pick(rng, CAPITALS);
const COUNTRY_ROOTS = ['Велор', 'Арден', 'Сарм', 'Остр', 'Бельв', 'Кард', 'Дольм', 'Равен', 'Тавр', 'Эльм', 'Норд', 'Мирав'];
const COUNTRY_END = ['ия', 'ания', 'ландия', 'ерия', 'ика'];
D.randomCountryName = rng => D.pick(rng, COUNTRY_ROOTS) + D.pick(rng, COUNTRY_END);
})();
