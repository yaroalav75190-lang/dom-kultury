// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Боевая сборка идёт для d-k.bar в корне домена.
 *
 * Витрина для заказчика собирается на GitHub Pages, где сайт живёт
 * в подпапке с именем репозитория. Адрес и базовый путь берутся из
 * переменных окружения, чтобы боевую конфигурацию не трогать.
 */
const previewSite = process.env.PAGES_SITE;

// Имя подпапки передаётся без слэшей (PAGES_BASE=dom-kultury): значение,
// начинающееся со слэша, Git Bash на Windows подменяет на путь диска.
const rawBase = process.env.PAGES_BASE;
const previewBase = rawBase ? `/${rawBase.replace(/^\/+|\/+$/g, '')}` : undefined;

export default defineConfig({
  site: previewSite || 'https://d-k.bar',
  base: previewBase || undefined,
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      // lastmod намеренно не задаём: единая дата сборки на всех страницах
      // означала бы «всё обновилось разом», что попросту неправда
      // и обесценивает сигнал свежести.
      serialize(item) {
        // При сборке в подпапку из пути надо убрать базовую часть,
        // иначе ни одно сравнение ниже не сработает.
        const base = previewBase ? previewBase.replace(/\/+$/, '') : '';
        const path = new URL(item.url).pathname.slice(base.length) || '/';
        if (path === '/') item.priority = 1.0;
        else if (path === '/afisha/') item.priority = 0.9;
        else if (path.startsWith('/afisha/')) item.priority = 0.7;
        else if (path === '/menu/') item.priority = 0.9;
        else if (path === '/bankety/' || path === '/kontakty/') item.priority = 0.8;
        else item.priority = 0.5;
        return item;
      },
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
  image: {
    // Глобальный layout намеренно не включаем: он доклеивает к каждой
    // картинке варианты вплоть до исходной ширины (у постеров это
    // 1680×1680 и ~350 КБ), хотя такие размеры нигде не используются.
    // Ширины и sizes задаются явно в каждом <Image>.
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
