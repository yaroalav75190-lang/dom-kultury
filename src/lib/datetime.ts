/**
 * Даты и время по-русски.
 *
 * Заведение работает по Екатеринбургу (UTC+5), а сборка может идти
 * на сервере в любом поясе — поэтому пояс задаётся явно везде.
 */

export const TIME_ZONE = 'Asia/Yekaterinburg';

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const MONTHS_NOMINATIVE = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

/** Разбирает дату в компоненты нужного часового пояса. */
function parts(date: Date) {
  const fmt = new Intl.DateTimeFormat('ru-RU', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    weekday: map.weekday ?? '',
  };
}

/** «29 августа» */
export function formatDay(date: Date): string {
  const p = parts(date);
  return `${p.day} ${MONTHS_GENITIVE[p.month - 1]}`;
}

/** «29 августа 2026» */
export function formatDayYear(date: Date): string {
  const p = parts(date);
  return `${p.day} ${MONTHS_GENITIVE[p.month - 1]} ${p.year}`;
}

/** «21:00» */
export function formatTime(date: Date): string {
  const p = parts(date);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** «сб, 29 августа · 21:00» */
export function formatFull(date: Date): string {
  const p = parts(date);
  return `${p.weekday.replace('.', '')}, ${formatDay(date)} · ${formatTime(date)}`;
}

/** «29» и «авг» — для отрывного календарного блока в карточке. */
export function dayBadge(date: Date): { day: string; month: string; weekday: string } {
  const p = parts(date);
  return {
    day: String(p.day),
    month: MONTHS_GENITIVE[p.month - 1]!.slice(0, 3),
    weekday: p.weekday.replace('.', ''),
  };
}

/** «Август» — заголовок группы в афише. */
export function monthTitle(date: Date): string {
  const p = parts(date);
  const name = MONTHS_NOMINATIVE[p.month - 1]!;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Ключ месяца для группировки: «2026-08». */
export function monthKey(date: Date): string {
  const p = parts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}`;
}

/** Машиночитаемая дата для datetime и Schema.org. */
export function isoDate(date: Date): string {
  return date.toISOString();
}

/**
 * Событие ещё не прошло?
 *
 * Ночные события заканчиваются под утро, поэтому событие считается
 * актуальным до конца календарных суток его начала — иначе концерт,
 * начавшийся в 22:00, исчезал бы с афиши посреди самого концерта.
 */
const GRACE_HOURS = 8;

export function isUpcoming(start: Date, now: Date = new Date(), end?: Date): boolean {
  const last = end ?? start;
  return last.getTime() + GRACE_HOURS * 3_600_000 >= now.getTime();
}

/**
 * То же самое, но для записи афиши целиком.
 *
 * Учитывает `endsAt`: двухдневный фестиваль иначе уезжал бы
 * в «Прошедшие» на следующее же утро после открытия. События
 * без назначенной даты всегда считаются предстоящими.
 */
export function eventIsUpcoming(
  event: { startsAt?: Date; endsAt?: Date; dateTba?: boolean },
  now: Date = new Date(),
): boolean {
  if (event.dateTba) return true;
  if (!event.startsAt) return false;
  return isUpcoming(event.startsAt, now, event.endsAt);
}

/** «сегодня» / «завтра» / null — бейдж срочности в карточке. */
export function relativeBadge(date: Date, now: Date = new Date()): 'сегодня' | 'завтра' | null {
  const a = parts(date);
  const b = parts(now);
  if (a.year === b.year && a.month === b.month && a.day === b.day) return 'сегодня';

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const t = parts(tomorrow);
  if (a.year === t.year && a.month === t.month && a.day === t.day) return 'завтра';

  return null;
}

/** Склонение по числу: 1 событие, 2 события, 5 событий. */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (tail > 1 && tail < 5) return forms[1];
  if (tail === 1) return forms[0];
  return forms[2];
}
