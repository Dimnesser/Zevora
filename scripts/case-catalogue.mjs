/**
 * The 25 Zevora cases.
 *
 * Prices are in rubles, matching the skin catalogue in seed-data.ts;
 * the seed converts to minor units when it writes the database.
 *
 * This is the single source of truth shared by the art renderer
 * (`build-case-art.mjs`) and the drop-table builder
 * (`build-case-catalogue.mjs`). It mirrors the Figma file
 * "Zevora — Cases": `shell` and `ink` are the frame's repaint colours and
 * `mark` names the decal stamped on the lid.
 *
 * `pool` describes how the drop table is composed:
 *   weapons      restrict to these weapon names (omit for the whole catalogue)
 *   floor / ceil  cheapest and most expensive item, in rubles — the ceiling
 *                 is the case's jackpot and is what makes each tier feel
 *                 different rather than every case topping out on the same skin
 *   count        how many items to pick
 *   margin       target house edge, used to solve the weights
 */

export const CASES = [
  // ── вход: несколько десятков рублей ──
  { slug: "pervyy-zakhod", name: "Первый заход", price: 29,
    description: "Самый дешёвый вход в Zevora. Ничего дорогого, но попробовать механику хватит.",
    tags: ["cheap", "new"], shell: "#5A6172", ink: "#E4EAF4", mark: "tri",
    // The floor item costs 11 ₽, so a 19 ₽ case left the curve nowhere to
    // go: its target value sat almost on the cheapest drop and the table
    // collapsed onto it. A slightly higher price and a tighter ceiling
    // give the ladder room.
    pool: { floor: 11, ceil: 600, count: 10, margin: 0.30 } },

  { slug: "nulevoy-otsek", name: "Нулевой отсек", price: 39,
    description: "Нулевой отсек хранилища: дешёвые финиши и редкий шанс уйти в плюс.",
    tags: ["cheap", "popular"], shell: "#1C8FA8", ink: "#A8F6FF", mark: "bolt",
    pool: { floor: 12,     ceil: 900,    count: 13, margin: 0.38 } },

  { slug: "zhestyanka", name: "Жестянка", price: 69,
    description: "Пёстрая жестянка со складским хламом. Иногда в хламе попадается Classified.",
    tags: ["cheap"], shell: "#6C7A3A", ink: "#E1F0A4", mark: "hex",
    pool: { floor: 14,     ceil: 1600,    count: 13, margin: 0.37 } },

  { slug: "seryy-sektor", name: "Серый сектор", price: 99,
    description: "Тёмные городские финиши без лишнего блеска. Ровный кейс на каждый день.",
    tags: ["cheap", "popular"], shell: "#343A46", ink: "#B6C0D0", mark: "bars",
    pool: { floor: 20,     ceil: 2600,    count: 14, margin: 0.38 } },

  { slug: "pylnaya-smena", name: "Пыльная смена", price: 149,
    description: "Песок, камуфляж и потёртая сталь. Кейс для тех, кто играет, а не коллекционирует.",
    tags: ["cheap"], shell: "#A8854A", ink: "#FFE9BE", mark: "chev",
    pool: { floor: 30,     ceil: 4200,   count: 14, margin: 0.39 } },

  // ── середина ──
  { slug: "chas-volka", name: "Час волка", price: 249,
    description: "Ночная операция: тёмные финиши, городской камуфляж и редкий шанс на Covert.",
    tags: ["popular"], shell: "#2B5FBF", ink: "#C3D9FF", mark: "fang",
    pool: { floor: 40,     ceil: 7000,   count: 15, margin: 0.40 } },

  { slug: "mokryy-asfalt", name: "Мокрый асфальт", price: 399,
    description: "Холодная палитра: сталь, графит и синие подсветки.",
    tags: ["new"], shell: "#26303F", ink: "#9FC6E8", mark: "drop",
    pool: { floor: 60,     ceil: 11000,   count: 15, margin: 0.40 } },

  { slug: "kislotnyy-dozhd", name: "Кислотный дождь", price: 599,
    description: "Кислотные цвета и неон. Самый громкий кейс средней полки.",
    tags: ["popular", "new"], shell: "#7BC23A", ink: "#F0FFD4", mark: "rain",
    pool: { floor: 90,     ceil: 17000,   count: 15, margin: 0.39 } },

  { slug: "neonovyy-kvartal", name: "Неоновый квартал", price: 899,
    description: "Neon Rider, Vogue и всё, что светится. Плотная середина без провалов.",
    tags: ["popular"], shell: "#C42A78", ink: "#FFC9E9", mark: "star5",
    pool: { floor: 140,    ceil: 26000,   count: 16, margin: 0.38 } },

  { slug: "kholodnaya-svarka", name: "Холодная сварка", price: 1290,
    description: "Синие и стальные финиши высокого класса. Шанс на нож здесь уже не теоретический.",
    tags: ["premium"], shell: "#3F7FA8", ink: "#D6F2FF", mark: "star8",
    pool: { floor: 200,    ceil: 38000,  count: 16, margin: 0.40 } },

  { slug: "krasnaya-smena", name: "Красная смена", price: 1790,
    description: "Красные и оранжевые финиши: Redline, Bloodsport, Wildfire и их соседи.",
    tags: ["premium"], shell: "#B8293C", ink: "#FFD4DA", mark: "cross",
    pool: { floor: 280,    ceil: 52000,  count: 16, margin: 0.40 } },

  // ── верх ──
  { slug: "belyy-shum", name: "Белый шум", price: 2490,
    description: "Белые корпуса и оранжевые акценты: Asiimov, Printstream, Player Two.",
    tags: ["premium", "popular"], shell: "#D6D9E0", ink: "#E8641E", mark: "bars",
    pool: { floor: 400,    ceil: 215000,  count: 17, margin: 0.39 } },


  { slug: "chernyy-yanvar", name: "Чёрный январь", price: 3490,
    description: "Чёрное с золотом. Строгий кейс с тяжёлым верхом дроп-таблицы.",
    tags: ["premium"], shell: "#1B1B20", ink: "#E0B64A", mark: "sq",
    pool: { floor: 560,    ceil: 412000,  count: 17, margin: 0.40 } },

  { slug: "dalniy-vystrel", name: "Дальний выстрел", price: 4490,
    description: "Только снайперские винтовки: AWP, SSG 08, SCAR-20. Вплоть до Dragon Lore.",
    tags: ["premium", "rare"], shell: "#2E4A33", ink: "#CFEEC4", mark: "crosshair",
    pool: { weapons: ["AWP", "SSG 08", "SCAR-20"], floor: 11, ceil: 1180000, count: 11, margin: 0.42 } },

  { slug: "purpurnyy-razlom", name: "Пурпурный разлом", price: 4990,
    description: "Фиолетовая ветка: Neo-Noir, Vogue, Doppler и всё, что отливает в пурпур.",
    tags: ["premium"], shell: "#7B3FC4", ink: "#E7D2FF", mark: "rift",
    pool: { floor: 800,    ceil: 412000,  count: 17, margin: 0.41 } },

  { slug: "zolotaya-zhila", name: "Золотая жила", price: 6990,
    description: "Золото, латунь и Tiger Tooth. Кейс с высоким средним выигрышем.",
    tags: ["premium"], shell: "#B08A2E", ink: "#FFF0BE", mark: "hex",
    pool: { floor: 1100,   ceil: 412000,  count: 18, margin: 0.41 } },

  { slug: "glubokiy-eshelon", name: "Глубокий эшелон", price: 9900,
    description: "Глубокий склад Zevora. Ножи и перчатки составляют заметную долю таблицы.",
    tags: ["premium", "rare"], shell: "#175F63", ink: "#B0F0E8", mark: "chev",
    pool: { floor: 1600,   ceil: 412000,  count: 18, margin: 0.42 } },

  { slug: "yadro", name: "Ядро", price: 13900,
    description: "Раскалённая палитра и тяжёлый верх: Wildfire, Blaze, Howl.",
    tags: ["premium", "rare"], shell: "#C9531E", ink: "#FFDCB0", mark: "star6",
    pool: { floor: 2200,   ceil: 1180000, count: 18, margin: 0.42 } },

  // ── премиум ──
  { slug: "posledniy-svet", name: "Последний свет", price: 19900,
    description: "Верхняя полка каталога: Dragon Lore, Howl и клинки в одном пуле.",
    tags: ["premium", "rare"], shell: "#C79A20", ink: "#FFF6CC", mark: "star8",
    pool: { floor: 3200,   ceil: 1180000, count: 18, margin: 0.42 } },

  { slug: "tenevoy-fond", name: "Теневой фонд", price: 27900,
    description: "Закрытый фонд Zevora. Половина таблицы — ножи, перчатки и Covert.",
    tags: ["premium", "rare"], shell: "#241C38", ink: "#BCA4FF", mark: "pent",
    pool: { floor: 4500,   ceil: 1180000, count: 17, margin: 0.43 } },

  { slug: "korona-severa", name: "Корона севера", price: 39900,
    description: "Платина и лёд. Кейс для тех, кто открывает редко и метко.",
    tags: ["premium", "rare"], shell: "#5E7A99", ink: "#EAF4FF", mark: "crown",
    pool: { floor: 6400,   ceil: 1180000, count: 16, margin: 0.43 } },

  { slug: "almaznyy-fond", name: "Алмазный фонд", price: 54900,
    description: "Только верх каталога: Fade, Marble Fade, Doppler, Pandora's Box.",
    tags: ["premium", "rare"], shell: "#9FD8DE", ink: "#0E4A52", mark: "diamond",
    pool: { floor: 9000,   ceil: 1180000, count: 15, margin: 0.43 } },

  { slug: "legenda-2013", name: "Легенда 2013", price: 79900,
    description: "Снятые с производства легенды: Howl и Dragon Lore в одной таблице.",
    tags: ["premium", "rare"], shell: "#6E1420", ink: "#EFC96B", mark: "star4",
    pool: { floor: 13000,  ceil: 1180000, count: 14, margin: 0.44 } },

  { slug: "tolko-stal", name: "Только сталь", price: 94900,
    description: "В кейсе только клинки и перчатки — ни одного ствола. Самый дорогой вход в каталоге.",
    tags: ["premium", "rare"], shell: "#6E7683", ink: "#EEF4FC", mark: "blade",
    pool: { weapons: ["★"], floor: 500, ceil: 215000, count: 9, margin: 0.22 } },

  // ── закрытый ──
  { slug: "zal-osnovateley", name: "Зал основателей", price: 0, partner_only: true,
    description: "Закрытый кейс партнёрской программы. Открывается бесплатно и недоступен обычным аккаунтам.",
    tags: ["partner", "premium"], shell: "#3A2B6B", ink: "#FFD976", mark: "crown",
    pool: { floor: 11,     ceil: 1180000, count: 15, margin: 0 } },
];
