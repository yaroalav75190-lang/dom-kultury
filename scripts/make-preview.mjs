/**
 * Сборка автономного просмотрщика вёрстки.
 *
 * Берёт собранные страницы из dist/ и превращает каждую в один
 * самодостаточный HTML: стили, шрифты и картинки уезжают внутрь
 * документа как data-URI, внешних запросов не остаётся ни одного.
 * Дальше страницы вкладываются в просмотрщик через srcdoc — то есть
 * показывается настоящая вёрстка, а не скриншот: её можно листать,
 * менять ширину и щёлкать по интерфейсу.
 *
 * Запуск: node scripts/make-preview.mjs
 * Результат: preview/index.html
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/** Страницы, которые попадают в просмотрщик, и подписи к ним. */
const PAGES = [
  {
    file: 'index.html',
    title: 'Главная',
    route: '/',
    note: 'Обложка на интерьерном кадре, бегущая строка форматов, ближайшие события, пространства, меню и банкеты. На прежнем сайте это была одна страница целиком — вся навигация вела в JS-попапы.',
  },
  {
    file: 'afisha/index.html',
    title: 'Афиша',
    route: '/afisha',
    note: 'События сгруппированы по месяцам, фильтр по типу, прошедшие уезжают в свёрнутый архив. Раньше афиша жила в попапе без собственного адреса и не существовала для поиска.',
  },
  {
    file: 'afisha/performance-show/index.html',
    title: 'Страница события',
    route: '/afisha/performance-show',
    note: 'Каждое событие — отдельный адрес с разметкой Schema.org Event: дата, площадка, координаты, возраст. Такой ссылкой можно поделиться в чате, и её видит поисковик.',
  },
  {
    file: 'menu/index.html',
    title: 'Меню',
    route: '/menu',
    note: '266 позиций текстом с составами, граммовками и ценами. Липкая панель: переключение бар/кухня, группы и живой поиск. Прежде это были 25 сканов на 4,7 МБ.',
  },
  {
    file: 'bankety/index.html',
    title: 'Банкеты',
    route: '/bankety',
    note: 'Форматы, порядок работы и всё фуршетное меню текстом — 48 позиций. Раньше банкетное меню было пятью сканами формата A4 общим весом 3,5 МБ.',
  },
  {
    file: 'o-dome/index.html',
    title: 'О доме',
    route: '/o-dome',
    note: 'Что это за место, две площадки и сводка фактов. Страницы с таким содержанием на прежнем сайте не было вовсе.',
  },
  {
    file: 'kontakty/index.html',
    title: 'Контакты',
    route: '/kontakty',
    note: 'Адрес, график и форма брони, собирающая заявку в готовое сообщение. Карта — сторонний виджет Яндекса и грузится только по нажатию кнопки; внутри этого просмотра она не откроется, а на живом сайте откроется.',
  },
  {
    file: '404.html',
    title: 'Страница 404',
    route: '/404',
    note: 'Не тупик: показывает ближайшие события и телефон. Прежний сайт отдавал стандартную заглушку Tilda.',
  },
];

const mime = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const cache = new Map();
async function dataUri(urlPath) {
  if (cache.has(urlPath)) return cache.get(urlPath);
  const file = join(dist, urlPath.replace(/^\//, '').split('/').join(sep));
  const ext = urlPath.slice(urlPath.lastIndexOf('.'));
  const buf = await readFile(file);
  const uri = `data:${mime[ext] ?? 'application/octet-stream'};base64,${buf.toString('base64')}`;
  cache.set(urlPath, uri);
  return uri;
}

/** Из srcset берём вариант, ближайший к нужной ширине снизу. */
function pickFromSrcset(srcset, target) {
  const entries = srcset
    .split(',')
    .map((part) => part.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: Number((w ?? '').replace('w', '')) || 0 }))
    .filter((e) => e.url);
  if (!entries.length) return null;
  const under = entries.filter((e) => e.w <= target).sort((a, b) => b.w - a.w);
  return (under[0] ?? entries.sort((a, b) => a.w - b.w)[0]).url;
}

async function inlinePage(htmlPath) {
  let html = await readFile(join(dist, htmlPath.split('/').join(sep)), 'utf8');

  // --- Стили внутрь документа ---
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
  let css = '';
  for (const [tag, href] of links) {
    css += await readFile(join(dist, href.replace(/^\//, '').split('/').join(sep)), 'utf8');
    html = html.replace(tag, '');
  }

  // --- Шрифты внутрь стилей ---
  // Латиницу отбрасываем: в русском тексте она почти не встречается,
  // а каждый вложенный файл удваивается в каждой странице просмотрщика.
  css = css.replace(/@font-face\{[^}]*latin[^}]*\}/g, '');
  for (const m of [...css.matchAll(/url\((\/fonts\/[^)]+)\)/g)]) {
    css = css.replace(m[1], await dataUri(m[1]));
  }

  html = html.replace('</head>', `<style>${css}</style></head>`);

  // --- Служебные ссылки не нужны: они ведут наружу ---
  html = html.replace(
    /<link rel="(icon|apple-touch-icon|manifest|preload|sitemap|alternate|canonical)"[^>]*>/g,
    '',
  );

  // --- Картинки внутрь документа ---
  for (const tag of [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])) {
    const srcset = tag.match(/srcset="([^"]+)"/)?.[1];
    const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
    // Крупные фоновые кадры оставляем детальнее карточек.
    const target = /hero__img|banner__img/.test(tag) ? 1200 : 720;
    const chosen = (srcset && pickFromSrcset(srcset, target)) || src;
    if (!chosen || !chosen.startsWith('/')) continue;

    let next = tag
      .replace(/\ssrcset="[^"]*"/, '')
      .replace(/\ssizes="[^"]*"/, '')
      .replace(/\ssrc="[^"]*"/, ` src="${await dataUri(chosen)}"`);
    html = html.replace(tag, next);
  }

  // --- Всё, что осталось ссылками на собранные файлы ---
  // Логотип, например, подставляется CSS-маской прямо в атрибуте style,
  // а не тегом <img>: без этого прохода знак в просмотрщике оказался бы
  // пустым — файла-то рядом нет.
  const leftovers = new Set(
    [...html.matchAll(/\/_astro\/[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp|svg|woff2)/g)].map((m) => m[0]),
  );
  for (const ref of leftovers) {
    html = html.replaceAll(ref, await dataUri(ref));
  }

  return html;
}

// ---------------------------------------------------------------- сборка

const built = [];
for (const page of PAGES) {
  const html = await inlinePage(page.file);
  const real = await stat(join(dist, page.file.split('/').join(sep)));
  built.push({
    ...page,
    html,
    // Вес настоящей страницы, а не встроенной копии.
    gzip: Math.round(gzipSync(await readFile(join(dist, page.file.split('/').join(sep)))).length / 1024),
    raw: Math.round(real.size / 1024),
  });
  console.log(`  ${page.route.padEnd(28)} ${Math.round(html.length / 1024)} КБ встроенной копии`);
}

await mkdir(join(root, 'preview'), { recursive: true });

// Внутри <script type="application/json"> последовательность «</» закрыла бы
// тег раньше времени. < — валидный JSON-эскейп и решает это на корню.
const payload = JSON.stringify(built).replace(/</g, '\\u003C');

const template = await readFile(join(root, 'preview', 'template.html'), 'utf8');
await writeFile(join(root, 'preview', 'index.html'), template.replace('<!--PAGES-->', payload), 'utf8');

const total = built.reduce((n, p) => n + p.html.length, 0);
const out = await stat(join(root, 'preview', 'index.html'));
console.log(`\nВстроено страниц: ${built.length}, суммарно ${Math.round((total / 1024 / 1024) * 100) / 100} МБ`);
console.log(`Просмотрщик: preview/index.html — ${Math.round((out.size / 1024 / 1024) * 100) / 100} МБ`);
