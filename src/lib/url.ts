/**
 * Пути внутри сайта.
 *
 * Сайт должен одинаково работать и в корне домена (d-k.bar), и в
 * подпапке — например, на GitHub Pages, где адрес выглядит как
 * `.../имя-репозитория/`. Astro сам подставляет базовый путь только
 * тому, что собирает: стилям, скриптам, картинкам из `src/assets`.
 * Ссылки и файлы из `public/` написаны руками, поэтому базовый путь
 * им нужно добавлять здесь.
 *
 * Правило простое: любой внутренний адрес, начинающийся со слэша,
 * проходит через `withBase`.
 */

/** '/' в обычной сборке, '/имя-репозитория/' при сборке в подпапку. */
const BASE = import.meta.env.BASE_URL;

const normalizedBase = BASE.endsWith('/') ? BASE : `${BASE}/`;

/** Внешние адреса, почтовые и телефонные ссылки трогать нельзя. */
const isExternal = (path: string) => /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path);

export function withBase(path: string): string {
  if (!path || isExternal(path)) return path;
  return normalizedBase + path.replace(/^\/+/, '');
}

/**
 * Обратная операция: убирает базовый путь из адреса текущей страницы,
 * чтобы сравнивать его с «чистыми» путями навигации.
 */
export function stripBase(pathname: string): string {
  if (normalizedBase === '/') return pathname;
  const withoutSlash = normalizedBase.slice(0, -1);
  if (pathname === withoutSlash) return '/';
  return pathname.startsWith(normalizedBase)
    ? `/${pathname.slice(normalizedBase.length)}`
    : pathname;
}
