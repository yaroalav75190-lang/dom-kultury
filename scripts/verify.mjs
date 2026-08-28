/**
 * Проверка собранного сайта.
 *
 * Гоняется по dist/ и подтверждает фактами то, что иначе пришлось бы
 * принимать на слово: один h1 на страницу, непустые alt, валидный
 * JSON-LD, разумный вес страниц, отсутствие битых внутренних ссылок.
 *
 * Запуск: npm run verify (после npm run build)
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, dirname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/**
 * Базовый путь сборки. Пустой для боевого сайта в корне домена
 * и '/имя-репозитория' для витрины на GitHub Pages — тогда все
 * внутренние адреса в разметке начинаются с него, и перед сверкой
 * его надо снять.
 */
const BASE = process.env.PAGES_BASE
  ? `/${process.env.PAGES_BASE.replace(/^\/+|\/+$/g, '')}`
  : '';
const unbase = (p) => (BASE && p.startsWith(BASE + '/') ? p.slice(BASE.length) : p);

/** Путь файловой системы → адрес на сайте. */
const toUrl = (file) => '/' + relative(dist, file).split(sep).join('/');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const files = await walk(dist);
const pages = files.filter((f) => f.endsWith('.html'));

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};

console.log(`\nСтраниц: ${pages.length}\n`);

// Всё, на что вообще можно сослаться изнутри сайта.
const targets = new Set(['/']);
for (const f of files) {
  const url = toUrl(f);
  targets.add(url);
  if (url.endsWith('/index.html')) {
    targets.add(url.slice(0, -'index.html'.length));
    targets.add(url.slice(0, -'/index.html'.length));
  }
}

let totalHtml = 0;
let totalGzip = 0;
const rows = [];

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const name = toUrl(page).replace(/index\.html$/, '');
  const bytes = Buffer.byteLength(html);
  const gz = gzipSync(html).length;
  totalHtml += bytes;
  totalGzip += gz;
  rows.push({ name, bytes, gz });

  // --- Ровно один h1 ---
  const h1 = [...html.matchAll(/<h1[\s>]/g)].length;
  if (h1 !== 1) fail(`${name}: h1 встречается ${h1} раз (ожидается 1)`);

  // --- Заголовок и описание ---
  if (!/<title>[^<]{10,}<\/title>/.test(html)) fail(`${name}: title пустой или слишком короткий`);
  const descr = html.match(/<meta name="description" content="([^"]*)"/);
  if (!descr || descr[1].length < 50) fail(`${name}: description короче 50 символов`);
  else if (descr[1].length > 320) fail(`${name}: description длиннее 320 символов (${descr[1].length})`);

  // --- Язык страницы ---
  if (!/<html lang="ru"/.test(html)) fail(`${name}: у <html> нет lang="ru"`);

  // --- alt у каждого изображения ---
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  // Astro сворачивает alt="" в булев атрибут alt. Это валидный пустой alt
  // для декоративных картинок, поэтому принимаем обе записи.
  const noAlt = imgs.filter((t) => !/\salt(=|[\s/>])/.test(t));
  if (noAlt.length) fail(`${name}: ${noAlt.length} <img> без атрибута alt`);

  // --- Ориентиры и обход клавиатурой ---
  for (const tag of ['<main', '<header', '<footer', '<nav']) {
    if (!html.includes(tag)) fail(`${name}: нет ориентира ${tag}>`);
  }
  if (!html.includes('skip-link')) fail(`${name}: нет ссылки «к содержанию»`);

  // --- JSON-LD парсится ---
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) fail(`${name}: нет JSON-LD`);
  for (const [, body] of blocks) {
    try {
      JSON.parse(body);
    } catch (e) {
      fail(`${name}: JSON-LD не парсится — ${e.message}`);
    }
  }

  // --- canonical только на https ---
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canon) fail(`${name}: нет canonical`);
  else if (!canon[1].startsWith('https://')) fail(`${name}: canonical не на https — ${canon[1]}`);

  // --- Внутренние ссылки ведут в существующее ---
  const seen = new Set();
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const raw = unbase(m[1]);
    if (seen.has(raw)) continue;
    seen.add(raw);
    const trimmed = raw.replace(/\/$/, '') || '/';
    if (!targets.has(raw) && !targets.has(trimmed) && !targets.has(trimmed + '/')) {
      fail(`${name}: битая внутренняя ссылка ${raw}`);
    }
  }

  // --- Якоря указывают на существующие id ---
  // Ссылка вида /menu#bar выглядит рабочей, но молча никуда не ведёт,
  // если такого id на целевой странице нет.
  for (const m of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
    const [path, fragment] = m[1].split('#');
    if (!fragment || fragment === 'top') continue;
    if (path && !path.startsWith('/')) continue; // внешние ссылки не проверяем

    const targetFile = path
      ? join(dist, unbase(path).replace(/^\//, '').split('/').join(sep), 'index.html')
      : page;
    let targetHtml;
    try {
      targetHtml = await readFile(targetFile, 'utf8');
    } catch {
      continue; // отсутствие самой страницы уже поймано проверкой выше
    }
    const idRe = new RegExp(`\\sid="${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
    if (!idRe.test(targetHtml)) {
      fail(`${name}: якорь #${fragment} не найден на ${path || name}`);
    }
  }

  // --- Внешние ссылки открываются безопасно ---
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(m[0])) fail(`${name}: target="_blank" без rel="noopener"`);
  }

  // --- Внутренние комментарии не должны уезжать в браузер ---
  // Разметочный <!-- --> в шаблоне Astro попадает в ответ вместе
  // со страницей: заметки для разработчика и TODO становятся видны
  // всем, кто откроет исходный код. Для комментариев есть {/* */}.
  const comments = [...html.matchAll(/<!--([\s\S]*?)-->/g)]
    .map((m) => m[1].trim())
    .filter((c) => c && !c.startsWith('['));
  if (comments.length) {
    fail(`${name}: ${comments.length} HTML-комментариев в проде — «${comments[0].slice(0, 60)}…»`);
  }
}

/**
 * Вес первой загрузки: сжатый HTML плюс всё, что браузер обязан
 * забрать, чтобы показать страницу, — стили, скрипты, кириллические
 * шрифты и картинки из атрибута src (то есть без ленивых и без
 * альтернатив из srcset, которые браузер не станет качать все разом).
 */
const sizeCache = new Map();
async function assetSize(url) {
  if (sizeCache.has(url)) return sizeCache.get(url);
  const file = join(dist, url.replace(/^\//, '').split('/').join(sep));
  let size = 0;
  try {
    const s = await stat(file);
    // Текстовые ресурсы отдаются сжатыми, бинарные — как есть.
    size = /\.(css|js|svg|xml|json)$/.test(url)
      ? gzipSync(await readFile(file)).length
      : s.size;
  } catch {
    size = 0;
  }
  sizeCache.set(url, size);
  return size;
}

for (const r of rows) {
  const html = await readFile(join(dist, r.name.replace(/^\//, '').split('/').join(sep), 'index.html')).catch(
    () => readFile(join(dist, r.name.replace(/^\//, '').split('/').join(sep))),
  );
  const text = html.toString();
  let weight = r.gz;

  const refs = new Set();
  for (const m of text.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) refs.add(m[1]);
  for (const m of text.matchAll(/<script[^>]+src="([^"]+)"/g)) refs.add(m[1]);
  // Предзагружаемые шрифты — только кириллица, латиница подтянется по надобности.
  for (const m of text.matchAll(/<link rel="preload" href="([^"]+)"/g)) refs.add(m[1]);
  // Картинки, которые грузятся сразу.
  for (const tag of text.matchAll(/<img\b[^>]*>/g)) {
    if (/loading="lazy"/.test(tag[0])) continue;
    const src = tag[0].match(/\ssrc="([^"]+)"/);
    if (src) refs.add(src[1]);
  }

  for (const ref of refs) {
    if (ref.startsWith('/')) weight += await assetSize(unbase(ref));
  }
  r.first = weight;
}

// --- Canonical совпадает с адресом в sitemap ---
// Разные формы одного адреса поисковик считает разными страницами.
try {
  const sitemapXml = await readFile(join(dist, 'sitemap-0.xml'), 'utf8');
  const inSitemap = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

  for (const page of pages) {
    const html = await readFile(page, 'utf8');
    if (/content="noindex/.test(html)) continue;
    const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const name = toUrl(page).replace(/index\.html$/, '');
    if (canon && !inSitemap.has(canon)) {
      fail(`${name}: canonical ${canon} не совпадает ни с одним адресом в sitemap`);
    }
  }
} catch {
  fail('sitemap-0.xml не найден');
}

// --- Обязательные поля Schema.org ---
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const name = toUrl(page).replace(/index\.html$/, '');
  for (const [, body] of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      continue; // невалидный JSON уже пойман выше
    }
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      if (node['@type'] === 'Event' && !node.startDate) {
        fail(`${name}: Event без обязательного startDate`);
      }
      // У Offer обязательна цена: «предложение» без цены поисковик отбрасывает.
      const offers = node.offers && !Array.isArray(node.offers) ? [node.offers] : node.offers;
      for (const offer of offers ?? []) {
        if (offer.price === undefined) fail(`${name}: Offer без price`);
      }
    }
  }
}

console.log('Вес страницы: HTML / gzip / первая загрузка');
for (const r of rows.sort((a, b) => b.first - a.first)) {
  const flag = r.first > 400_000 ? '   ← тяжёлая' : '';
  console.log(
    `  ${r.name.padEnd(34)} ${String(Math.round(r.bytes / 1024)).padStart(5)} КБ ${String(
      Math.round(r.gz / 1024),
    ).padStart(5)} КБ ${String(Math.round(r.first / 1024)).padStart(5)} КБ${flag}`,
  );
}

const assets = files.filter((f) => !f.endsWith('.html'));
let assetBytes = 0;
const heavy = [];
for (const f of assets) {
  const s = await stat(f);
  assetBytes += s.size;
  if (s.size > 300_000) heavy.push([toUrl(f), s.size]);
}

console.log(`\nHTML всего:   ${Math.round(totalHtml / 1024)} КБ (gzip ${Math.round(totalGzip / 1024)} КБ)`);
console.log(
  `Ассеты всего: ${Math.round((assetBytes / 1024 / 1024) * 100) / 100} МБ в ${assets.length} файлах`,
);
if (heavy.length) {
  console.log('\nАссеты тяжелее 300 КБ:');
  for (const [f, s] of heavy) console.log(`  ${f} — ${Math.round(s / 1024)} КБ`);
}

console.log(failures === 0 ? '\n✓ Все проверки пройдены\n' : `\n✗ Проблем: ${failures}\n`);
process.exit(failures === 0 ? 0 : 1);
