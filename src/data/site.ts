/**
 * Единый источник правды о заведении.
 *
 * Всё, что дублируется на сайте (телефон, адрес, часы, ссылки), живёт
 * только здесь. Из этого же файла собираются микроразметка Schema.org,
 * подвал, шапка и страница контактов — рассинхронизация невозможна.
 *
 * ВНИМАНИЕ. На текущем сайте d-k.bar график работы указан по-разному
 * в шапке (вс 18:00–02:00, пт-сб 18:00–06:00) и в подвале
 * (пн-чт 17:00–02:00, пт 17:00–06:00, сб 12:00–06:00, вс 12:00–02:00).
 * За основу взят подробный вариант из подвала — его нужно подтвердить
 * у заведения перед публикацией.
 */

export interface OpeningHours {
  /** Дни недели по ISO: 1 — понедельник, 7 — воскресенье. */
  readonly days: readonly number[];
  readonly label: string;
  readonly opens: string;
  readonly closes: string;
  /** true, если закрытие приходится на следующие сутки. */
  readonly overnight: boolean;
}

export interface SocialLink {
  readonly id: string;
  readonly label: string;
  readonly short: string;
  readonly href: string;
  /** Требуется ли сноска о признании Meta экстремистской организацией в РФ. */
  readonly metaDisclaimer?: boolean;
}

const PHONE_DIGITS = '+79030788487';

export const site = {
  name: 'Дом культуры',
  legalName: 'Дом культуры',
  shortName: 'ДК',
  tagline: 'Культура, которой так не хватало',
  positioning: 'Культурно, но не слишком',
  description:
    'Бар и площадка событий на Бажова, 193 в Екатеринбурге. Концерты и квартирники, ' +
    'иммерсивный театр, музыкальное лото, dj-сеты, гастроужины и авторская коктейльная карта.',
  url: 'https://d-k.bar',
  locale: 'ru_RU',
  lang: 'ru',

  contacts: {
    phone: {
      display: '+7 (903) 078-84-87',
      href: `tel:${PHONE_DIGITS}`,
      raw: PHONE_DIGITS,
    },
    address: {
      street: 'ул. Бажова, 193',
      streetShort: 'Бажова, 193',
      city: 'Екатеринбург',
      region: 'Свердловская область',
      // Проверено по справочнику адресов: Бажова, 193 — Октябрьский район,
      // индекс 620026. Неверный индекс в микроразметке портит локальную выдачу.
      postalCode: '620026',
      district: 'Октябрьский район',
      country: 'RU',
      full: 'Екатеринбург, ул. Бажова, 193',
    },
    geo: {
      latitude: 56.827163,
      longitude: 60.632671,
    },
    maps: 'https://yandex.ru/maps/org/dom_kultury/243013495762/',
  },

  /**
   * Бронирование принимают раньше, чем открывается зал.
   *
   * Внимание: бронь и анонсы — РАЗНЫЕ адреса в Telegram. Заявки идут
   * в аккаунт администратора @domcultekb123, а @domcultekb — это канал
   * с афишей. На прежнем сайте оба использовались вперемешку, и часть
   * заявок уходила в канал, где их никто не читает.
   */
  reservations: {
    label: 'Бронирование',
    hours: 'каждый день с 11:00',
    telegram: 'https://t.me/domcultekb123',
    telegramHandle: '@domcultekb123',
  },

  /** Канал с анонсами — не путать с адресом для брони. */
  channel: {
    label: 'Канал с афишей',
    href: 'https://t.me/domcultekb',
    handle: '@domcultekb',
  },

  hours: [
    { days: [1, 2, 3, 4], label: 'пн — чт', opens: '17:00', closes: '02:00', overnight: true },
    { days: [5], label: 'пятница', opens: '17:00', closes: '06:00', overnight: true },
    { days: [6], label: 'суббота', opens: '12:00', closes: '06:00', overnight: true },
    { days: [7], label: 'воскресенье', opens: '12:00', closes: '02:00', overnight: true },
  ] as const satisfies readonly OpeningHours[],

  socials: [
    { id: 'telegram', label: 'Telegram', short: 'TG', href: 'https://t.me/domcultekb' },
    { id: 'vk', label: 'ВКонтакте', short: 'VK', href: 'https://vk.ru/domcultekb' },
    {
      id: 'instagram',
      label: 'Instagram',
      short: 'IG',
      href: 'https://www.instagram.com/domcult.ekb',
      metaDisclaimer: true,
    },
  ] as const satisfies readonly SocialLink[],

  external: {
    delivery: {
      label: 'Доставка',
      service: 'Яндекс Еда',
      href: 'https://eda.yandex.ru/r/dk_gastrobar',
    },
    loyalty: {
      label: 'Карта лояльности',
      service: 'UDS',
      href: 'https://domcultekb.uds.app/c/join?ref=bajt9427',
    },
    playlist: {
      label: 'Плейлист',
      service: 'Яндекс Музыка',
      href: 'https://music.yandex.ru/playlists/fa1753a0-43f9-8644-84da-baf577b2178c',
    },
  },


  /**
   * Социальные доказательства.
   *
   * Только то, что можно проверить по ссылке рядом. Числа сверены
   * вручную в первоисточниках 28 августа 2026 года — рейтинги живут
   * своей жизнью, поэтому раз в квартал их стоит перепроверять
   * (см. README, раздел «Что нужно сделать заведению»).
   *
   * Придумывать отзывы, награды и «более 5000 довольных гостей»
   * нельзя: это ровно то, из-за чего блокам с доказательствами
   * перестают верить.
   */
  proof: {
    checkedOn: '2026-08-28',
    items: [
      {
        id: 'yandex',
        rating: '4,8',
        scale: '5',
        label: 'на Яндекс Картах',
        detail: '214 оценок, 166 отзывов',
        href: 'https://yandex.ru/maps/org/dom_kultury/243013495762/reviews/',
      },
      {
        id: '2gis',
        rating: '4,8',
        scale: '5',
        label: 'в 2ГИС',
        detail: '375 оценок',
        href: 'https://2gis.ru/ekaterinburg/firm/70000001109591280/tab/reviews',
      },
      {
        id: 'award',
        rating: '2026',
        label: '«Хорошее место»',
        detail: 'награда Яндекс Карт по оценкам пользователей',
        href: 'https://yandex.ru/maps/org/dom_kultury/243013495762/',
      },
    ],
  },

  /**
   * Постоянные предложения. На прежнем сайте они были напечатаны
   * внутри сканов меню — то есть не читались ни поиском, ни человеком,
   * листающим страницу с телефона.
   */
  offers: [
    {
      id: 'sparkling',
      title: 'Безлимит игристого',
      when: 'каждый день до 20:00',
      price: 1200,
      priceNote: '₽ с гостя',
    },
    {
      id: 'brunch',
      title: 'Бранчи Дома культуры',
      when: 'суббота и воскресенье, 12:00 — 20:00',
      note: 'Сэндвич-бранч и яичный конструктор: собираете завтрак сами.',
      href: '/menu#brunch-1-sandwich-base',
    },
  ],

  legal: {
    metaDisclaimer:
      'Компания Meta Platforms Inc., владеющая социальной сетью Instagram, ' +
      'признана экстремистской организацией на территории РФ.',
    ageDisclaimer: '18+',
    alcoholDisclaimer: 'Чрезмерное употребление алкоголя вредит вашему здоровью.',
  },
} as const;

/** Часы работы в формате Schema.org: «Mo-Th 17:00-02:00». */
export function schemaOpeningHours(): string[] {
  const dayCode = ['', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  return site.hours.map((h) => {
    const first = dayCode[h.days[0]!];
    const last = dayCode[h.days[h.days.length - 1]!];
    const range = h.days.length > 1 ? `${first}-${last}` : first;
    return `${range} ${h.opens}-${h.closes}`;
  });
}

/**
 * Открыто ли заведение прямо сейчас — с учётом ночных смен,
 * когда закрытие приходится на следующие сутки.
 */
export function isOpenAt(date: Date): boolean {
  const iso = date.getDay() === 0 ? 7 : date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h! * 60 + m!;
  };

  for (const slot of site.hours) {
    const opens = toMin(slot.opens);
    const closes = toMin(slot.closes);

    // Смена, начавшаяся сегодня.
    const days = slot.days as readonly number[];
    if (days.includes(iso)) {
      if (slot.overnight ? minutes >= opens : minutes >= opens && minutes < closes) return true;
    }
    // Хвост вчерашней ночной смены, дотянувшийся до текущих суток.
    if (slot.overnight) {
      const yesterday = iso === 1 ? 7 : iso - 1;
      if (days.includes(yesterday) && minutes < closes) return true;
    }
  }
  return false;
}
