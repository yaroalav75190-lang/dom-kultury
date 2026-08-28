/**
 * Перенос меню из сканов в структурированный контент.
 *
 * Читает результат распознавания 25 печатных полос (`extract.json`) и
 * раскладывает его по файлам `src/content/menu/*.md`. Скрипт разовый:
 * он нужен, чтобы миграцию можно было повторить и проверить, а не
 * чтобы гонять его на каждой сборке. Дальше меню правится вручную
 * в получившихся файлах.
 *
 * Запуск:  node scripts/build-menu.mjs <путь-к-extract.json>
 */
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/content/menu');
const source = process.argv[2];

if (!source) {
  console.error('Укажите путь к extract.json');
  process.exit(1);
}

/**
 * Каталог разделов: как называется на печатной полосе → куда попадает
 * на сайте. Порядок здесь и есть порядок в меню.
 */
const CATALOG = [
  // ---------- Кухня ----------
  ['ХОЛОДНЫЕ ЗАКУСКИ', 'kitchen', 'Еда', 'Холодные закуски', 10],
  ['ГОРЯЧИЕ ЗАКУСКИ', 'kitchen', 'Еда', 'Горячие закуски', 20],
  ['САЛАТЫ', 'kitchen', 'Еда', 'Салаты', 30],
  ['СУПЫ', 'kitchen', 'Еда', 'Супы', 40],
  ['ГОРЯЧЕЕ', 'kitchen', 'Еда', 'Горячее', 50],
  ['ПАСТА', 'kitchen', 'Еда', 'Паста', 60],
  ['ИЗ ПЕЧИ', 'kitchen', 'Еда', 'Из печи', 70],
  ['ДЕСЕРТЫ', 'kitchen', 'Еда', 'Десерты', 80],

  // ---------- Бар: коктейли ----------
  ['КУЛЬТУРНЫЕ КОКТЕЙЛИ', 'bar', 'Коктейли', 'Культурные коктейли', 10],
  ['КЛАССИЧЕСКИЕ КОКТЕЙЛИ', 'bar', 'Коктейли', 'Классические коктейли', 20],
  ['НАСТОЙКИ', 'bar', 'Коктейли', 'Настойки', 30],

  // ---------- Бар: вино ----------
  ['ИГРИСТОЕ ВИНО', 'bar', 'Вино', 'Игристое', 110],
  ['БЕЛОЕ ВИНО', 'bar', 'Вино', 'Белое', 120],
  ['РОЗОВОЕ ВИНО', 'bar', 'Вино', 'Розовое', 130],
  ['КРАСНОЕ ВИНО', 'bar', 'Вино', 'Красное', 140],
  ['ОРАНЖЕВОЕ ВИНО', 'bar', 'Вино', 'Оранжевое', 150],
  ['БЕЗАЛКОГОЛЬНОЕ ВИНО', 'bar', 'Вино', 'Безалкогольное вино', 160],
  ['МАГНУМ', 'bar', 'Вино', 'Магнум', 170],
  ['ПОРТО', 'bar', 'Вино', 'Порто', 180],

  // ---------- Бар: крепкое ----------
  ['АПЕРИТИВЫ И ДИЖЕСТИВЫ', 'bar', 'Крепкое', 'Аперитивы и дижестивы', 210],
  ['ВИСКИ', 'bar', 'Крепкое', 'Виски', 220],
  ['ДЖИН', 'bar', 'Крепкое', 'Джин', 230],
  ['РОМ', 'bar', 'Крепкое', 'Ром', 240],
  ['ТЕКИЛА', 'bar', 'Крепкое', 'Текила', 250],
  ['КОНЬЯК', 'bar', 'Крепкое', 'Коньяк', 260],
  ['ГРАППА', 'bar', 'Крепкое', 'Граппа', 270],
  ['ВОДКА', 'bar', 'Крепкое', 'Водка', 280],
  ['ЛИКЕРЫ', 'bar', 'Крепкое', 'Ликёры', 290],

  // ---------- Бар: пиво ----------
  ['ПИВО РАЗЛИВНОЕ', 'bar', 'Пиво и сидр', 'Разливное', 310],
  ['ПИВО И СИДР В БУТЫЛКЕ', 'bar', 'Пиво и сидр', 'В бутылке', 320],
  ['СИДР', 'bar', 'Пиво и сидр', 'Сидр', 330],
  ['БЕЗАЛКОГОЛЬНОЕ', 'bar', 'Пиво и сидр', 'Безалкогольное пиво', 340],

  // ---------- Бар: без алкоголя ----------
  ['КУЛЬТУРА БЕЗ АЛКОГОЛЯ', 'bar', 'Без алкоголя', 'Культура без алкоголя', 410],
  ['ЛИМОНАДЫ', 'bar', 'Без алкоголя', 'Лимонады', 420],
  ['ХОЛОДНЫЕ ЧАИ', 'bar', 'Без алкоголя', 'Холодные чаи', 430],
  ['АВТОРСКИЙ ЧАЙ', 'bar', 'Без алкоголя', 'Авторский чай', 440],
  ['ЗЕЛЕНЫЙ ЧАЙ', 'bar', 'Без алкоголя', 'Зелёный чай', 450],
  ['ЧЕРНЫЙ ЧАЙ', 'bar', 'Без алкоголя', 'Чёрный чай', 460],
  ['ТИЗАНЫ', 'bar', 'Без алкоголя', 'Тизаны', 470],
  ['КОФЕ', 'bar', 'Без алкоголя', 'Кофе', 480],
  ['НАПИТКИ', 'bar', 'Без алкоголя', 'Напитки', 490],

  // ---------- Банкет ----------
  ['ГОРЯЧИЕ МЯСНЫЕ БЛЮДА', 'banquet', 'Фуршет', 'Горячие мясные блюда', 40],
  ['ГОРЯЧИЕ РЫБНЫЕ БЛЮДА', 'banquet', 'Фуршет', 'Горячие рыбные блюда', 50],
  ['ВЫПЕЧКА', 'banquet', 'Фуршет', 'Выпечка', 60],
];

/**
 * Страница `__2026_page-0004.jpg` дублирует полосы с чаем, кофе и
 * лимонадами из старой серии — с ДРУГИМИ ценами. Оба варианта сейчас
 * выложены на сайте одновременно. Берём вариант 2026 года как более
 * поздний; расхождение вынесено в отчёт для заведения.
 */
const SUPERSEDED = new Set([
  'kitchen-15.png:ЗЕЛЕНЫЙ ЧАЙ',
  'kitchen-15.png:ТИЗАНЫ',
  'kitchen-15.png:ЧЕРНЫЙ ЧАЙ',
  'kitchen-15.png:АВТОРСКИЙ ЧАЙ',
  'kitchen-16.png:КОФЕ',
  'kitchen-16.png:НАПИТКИ',
  'kitchen-16.png:ЛИМОНАДЫ',
]);

/**
 * Полосы банкетного меню: [группа, заголовок для безымянного блока, базовый порядок].
 *
 * Разделы перетекают с полосы на полосу, и на продолжении заголовок
 * не повторяется. Безымянный блок получает заголовок предыдущего
 * раздела и потому сливается с ним, а не заводит отдельную секцию.
 *
 * Базовый порядок берётся от полосы, а не от каталога кухни: иначе
 * «Холодные закуски» с первой полосы оказывались в конце меню, после
 * выпечки, — просто потому что их название совпадает с кухонным.
 */
const BANQUET_PAGES = {
  'banquet-01.jpg': ['Фуршет', 'Холодные закуски', 10],
  'banquet-02.jpg': ['Фуршет', 'Холодные закуски (продолжение)', 20],
  'banquet-03.jpg': ['Фуршет', 'Холодные закуски (продолжение)', 30],
  'banquet-04.jpg': ['Фуршет', 'Салаты', 40],
  'banquet-05.jpg': ['Фуршет', '', 50],
};

/**
 * Бранчи и «Безлимит игристого» набраны конструктором, а не списком
 * «позиция — цена»: у основы нет цены, а стоимость складывается из
 * основы и начинки. Такие полосы переносятся вручную —
 * см. `src/content/menu/brunch-*.md`.
 */
const MANUAL_PAGES = new Set(['bar-02.png', 'bar-03.png']);

/**
 * Примечания разделов, которые видит гость.
 *
 * Распознавание складывало в это поле описания вёрстки печатной полосы
 * («Шапка колонок над списком: „ГР.“ и „ЦЕНА“ красным мелким капсом»).
 * Для миграции это полезно, для посетителя — мусор, поэтому примечание
 * не копируется вслепую, а берётся отсюда. Здесь только то, что на
 * полосе действительно адресовано гостю.
 */
const NOTES = new Map([
  ['bar:Культурные коктейли', 'Выход коктейля указан с учётом льда'],
  ['bar:Классические коктейли', 'Выход коктейля указан с учётом льда'],
  ['bar:Культура без алкоголя', 'Выход коктейля указан с учётом льда'],
  // Объём напечатан один раз в шапке раздела «Чай» и относится ко всем подразделам.
  ['bar:Авторский чай', 'Объём — 900 мл'],
  ['bar:Зелёный чай', 'Объём — 900 мл'],
  ['bar:Чёрный чай', 'Объём — 900 мл'],
  ['bar:Тизаны', 'Объём — 900 мл'],
]);

/**
 * Читаемые имена файлов для кухни.
 *
 * Ключ включает карту, а не одно название: «Холодные закуски»,
 * «Горячие закуски» и «Салаты» есть и в кухне, и в банкетном меню.
 * Пока карты в ключе не было, банкетный раздел писался в тот же файл
 * и затирал кухонный — с сайта молча пропадали 28 позиций.
 */
const slugMap = new Map([
  ['kitchen:Холодные закуски', 'kitchen-cold'],
  ['kitchen:Горячие закуски', 'kitchen-hot'],
  ['kitchen:Салаты', 'kitchen-salads'],
  ['kitchen:Супы', 'kitchen-soups'],
  ['kitchen:Горячее', 'kitchen-mains'],
  ['kitchen:Паста', 'kitchen-pasta'],
  ['kitchen:Из печи', 'kitchen-oven'],
  ['kitchen:Десерты', 'kitchen-desserts'],
]);

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[«»"'()]/g, '')
    .replace(/[^а-яёa-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '');

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
};
const translit = (s) => [...s].map((c) => TRANSLIT[c] ?? c).join('');

/** «1 200», «1200.-», «570" → 1200 / 570. Нечитаемое остаётся undefined. */
function parsePrice(raw) {
  if (raw === undefined || raw === null) return undefined;
  const digits = String(raw).replace(/[\s ]/g, '').match(/\d+/);
  if (!digits) return undefined;
  const n = Number(digits[0]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** «240 гр», «0,5 л», «120" → «240 г», «0,5 л», «120 мл» не додумываем. */
function cleanMeasure(raw) {
  if (!raw) return undefined;
  return String(raw).replace(/\s*гр\.?$/i, ' г').replace(/\s+/g, ' ').trim() || undefined;
}

/** Печатное меню набрано капсом — на экране это кричит и хуже читается. */
function sentenceCase(s) {
  const t = s.trim();
  if (!t) return t;
  const letters = t.replace(/[^А-ЯЁA-Zа-яёa-z]/g, '');
  const upper = letters.replace(/[^А-ЯЁA-Z]/g, '');
  // Переводим только то, что действительно набрано целиком капсом.
  if (letters.length > 2 && upper.length / letters.length > 0.85) {
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }
  return t;
}

const yaml = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

// ---------------------------------------------------------------- main

const data = JSON.parse(await readFile(source, 'utf8'));

// Разделы копятся по ключу, потому что один раздел может быть разбит
// на две печатные полосы (например, виски на развороте).
const sections = new Map();
const unmapped = [];

// Полосы приходят из распознавания в произвольном порядке, а разделы,
// перетекающие с полосы на полосу, склеиваются в порядке обработки.
// Без сортировки позиции внутри такого раздела шли бы не как в печати.
const pages = [...(data.pages ?? [])].sort((a, b) =>
  String(a.file).localeCompare(String(b.file), 'en'),
);

for (const page of pages) {
  const file = page.file;
  if (MANUAL_PAGES.has(file)) continue;

  const categories = page.categories ?? [];

  for (const [index, cat] of categories.entries()) {
    const rawName = (cat.name ?? '').trim();
    const items = cat.items ?? [];
    if (!items.length) continue;

    if (SUPERSEDED.has(`${file}:${rawName}`)) continue;

    let card, group, title, order;

    const banquet = BANQUET_PAGES[file];
    if (banquet && !CATALOG.some(([n]) => n === rawName)) {
      card = 'banquet';
      [group, title, order] = banquet;
    } else {
      const hit = CATALOG.find(([n]) => n === rawName);
      if (!hit) {
        unmapped.push({ file, name: rawName, count: items.length });
        continue;
      }
      [, card, group, title, order] = hit;
      // Банкетные полосы содержат разделы с теми же названиями, что
      // и кухня («Салаты», «Горячие закуски»). Смешивать их нельзя,
      // а порядок нужно брать от полосы: положение раздела в печатном
      // меню определяет печать, а не каталог кухни.
      if (file.startsWith('banquet') && card !== 'banquet') {
        card = 'banquet';
        group = 'Фуршет';
        order = banquet ? banquet[2] + index : order;
      }
    }

    const key = `${card}:${title}`;
    if (!sections.has(key)) {
      sections.set(key, { card, group, title, order, note: NOTES.get(key), items: [] });
    }

    for (const it of items) {
      const name = sentenceCase(it.name ?? '');
      if (!name) continue;
      sections.get(key).items.push({
        name,
        description: (it.description ?? '').trim() || undefined,
        measure: cleanMeasure(it.measure),
        price: parsePrice(it.price),
      });
    }
  }
}

await mkdir(outDir, { recursive: true });
// Ручные файлы (бранчи) переживают перегенерацию.
for (const f of await readdir(outDir).catch(() => [])) {
  if (f.endsWith('.md') && !f.startsWith('brunch-')) await unlink(join(outDir, f));
}

let total = 0;
let noPrice = 0;
const written = new Set();

for (const s of [...sections.values()].sort((a, b) => a.order - b.order)) {
  const slug =
    slugMap.get(`${s.card}:${s.title}`) ??
    `${s.card}-${translit(slugify(s.title))}`.replace(/-+/g, '-');

  const lines = ['---', `title: ${yaml(s.title)}`, `card: ${s.card}`];
  if (s.group) lines.push(`group: ${yaml(s.group)}`);
  lines.push(`order: ${s.order}`);
  if (s.note) lines.push(`note: ${yaml(s.note)}`);
  lines.push('items:');

  for (const it of s.items) {
    total++;
    if (it.price === undefined) noPrice++;
    lines.push(`  - name: ${yaml(it.name)}`);
    if (it.description) lines.push(`    description: ${yaml(it.description)}`);
    if (it.measure) lines.push(`    measure: ${yaml(it.measure)}`);
    if (it.price !== undefined) lines.push(`    price: ${it.price}`);
  }

  lines.push('---', '');

  // Молчаливая перезапись означала бы потерю целого раздела меню,
  // поэтому конфликт имён — это остановка, а не предупреждение.
  if (written.has(slug)) {
    throw new Error(
      `Два раздела претендуют на файл ${slug}.md — второй затёр бы первый. ` +
        `Конфликт на разделе «${s.title}» (карта ${s.card}).`,
    );
  }
  written.add(slug);

  await writeFile(join(outDir, `${slug}.md`), lines.join('\n'), 'utf8');
}

console.log(`Разделов: ${sections.size}, позиций: ${total}, без цены: ${noPrice}`);
if (unmapped.length) {
  console.log('\nНе разложено по каталогу (проверьте вручную):');
  for (const u of unmapped) console.log(`  ${u.file}: «${u.name}» — ${u.count} поз.`);
}
