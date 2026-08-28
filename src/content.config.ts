import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Афиша.
 *
 * Каждое событие — отдельный markdown-файл в `src/content/events/`.
 * Имя файла становится адресом страницы: `sennlima.md` → `/afisha/senlima`.
 * Из этих же данных собирается микроразметка Schema.org Event, поэтому
 * поисковики видят афишу как события, а не как картинки.
 */
const events = defineCollection({
  loader: glob({ base: './src/content/events', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Дата и время начала. Указывать с часовым поясом: 2026-08-29T20:00:00+05:00 */
      startsAt: z.coerce.date().optional(),
      /** Для многодневных событий и фестивалей. */
      endsAt: z.coerce.date().optional(),
      /** Событие анонсировано, но дата ещё не назначена. */
      dateTba: z.boolean().default(false),
      /** Как дата написана на афише, если формат нестандартный. */
      dateNote: z.string().optional(),

      kind: z.enum([
        'концерт',
        'dj-сет',
        'вечеринка',
        'театр',
        'перформанс',
        'стендап',
        'мастер-класс',
        'фестиваль',
        'гастроужин',
        'квартирник',
        'музлото',
      ]),
      venue: z.enum(['Основной зал', 'Летняя веранда', 'Мансарда', 'Весь дом']).default('Основной зал'),

      /** Короткая строка под заголовком в карточке. */
      summary: z.string().max(180).optional(),
      lineup: z.array(z.string()).default([]),

      poster: image(),
      posterAlt: z.string(),

      price: z.string().optional(),
      free: z.boolean().default(false),
      ageLimit: z.number().default(18),

      /** Куда ведёт кнопка. По умолчанию — Telegram заведения. */
      ticketUrl: z.url().optional(),
      ticketLabel: z.string().default('Забронировать'),

      featured: z.boolean().default(false),
      draft: z.boolean().default(false),

      /**
       * Описание перенесено с текущего сайта как есть и содержит
       * заглушку вместо настоящего текста. Такие события помечаются
       * в интерфейсе сдержанно, а в README попадают в список задач.
       */
      copyPending: z.boolean().default(false),
    }),
});

/**
 * Меню.
 *
 * Прежде меню жило 25 растровыми сканами общим весом 4,7 МБ: его нельзя
 * было прочитать скринридером, найти поиском или открыть на медленной
 * мобильной сети. Здесь это структурированные данные.
 */
const menu = defineCollection({
  loader: glob({ base: './src/content/menu', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    /** Порядок раздела в меню. */
    order: z.number().default(100),
    /** bar | kitchen | banquet — какой карте принадлежит раздел. */
    card: z.enum(['bar', 'kitchen', 'banquet']),
    /** Группа внутри карты: «Коктейли», «Вино», «Крепкое» — по ней строятся вкладки. */
    group: z.string().optional(),
    note: z.string().optional(),
    items: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          /** Вес или объём как напечатано: «250», «150/50», «0,5». */
          measure: z.string().optional(),
          /** Цена в рублях. Число, а не строка — чтобы можно было считать и сортировать. */
          price: z.number().optional(),
          priceNote: z.string().optional(),
          /**
           * Витринная позиция: попадает на главную как аргумент,
           * а не как строка списка. Флаг живёт здесь, чтобы главная
           * не расходилась с меню, когда карта поменяется.
           */
          featured: z.boolean().default(false),
          tags: z.array(z.enum(['хит', 'новинка', 'острое', 'вегетарианское', 'безалкогольное'])).default([]),
        }),
      )
      .default([]),
  }),
});

export const collections = { events, menu };
