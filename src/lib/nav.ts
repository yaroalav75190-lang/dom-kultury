import { site } from '@/data/site';

export interface NavItem {
  readonly label: string;
  readonly href: string;
  /** Внешняя ссылка — открывается в новой вкладке и помечается для читателя экрана. */
  readonly external?: boolean;
  readonly description?: string;
}

/** Основная навигация. Пять пунктов — предел, который читается без раздумий. */
export const primaryNav: readonly NavItem[] = [
  { label: 'Афиша', href: '/afisha', description: 'Что происходит в ближайшие недели' },
  { label: 'Меню', href: '/menu', description: 'Бар и кухня' },
  { label: 'Банкеты', href: '/bankety', description: 'Дни рождения, корпоративы, съёмки' },
  { label: 'О доме', href: '/o-dome', description: 'Залы, веранда, сцена' },
  { label: 'Контакты', href: '/kontakty', description: 'Адрес, часы, как добраться' },
];

/** Служебные ссылки — уводят на внешние сервисы, поэтому вынесены отдельно. */
export const utilityNav: readonly NavItem[] = [
  { label: site.external.delivery.label, href: site.external.delivery.href, external: true },
  { label: site.external.loyalty.label, href: site.external.loyalty.href, external: true },
];

export const footerNav: readonly NavItem[] = [
  ...primaryNav,
  { label: 'Карта лояльности', href: site.external.loyalty.href, external: true },
  { label: 'Доставка', href: site.external.delivery.href, external: true },
  { label: 'Плейлист', href: site.external.playlist.href, external: true },
];

export const legalNav: readonly NavItem[] = [
  { label: 'Политика конфиденциальности', href: '/pravovaya-informatsiya#konfidentsialnost' },
  { label: 'Согласие на обработку данных', href: '/pravovaya-informatsiya#soglasie' },
  { label: 'Оферта', href: '/pravovaya-informatsiya#oferta' },
];

/** Активен ли пункт меню для текущего адреса. */
export function isActive(itemHref: string, pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (itemHref === '/') return clean === '/';
  return clean === itemHref || clean.startsWith(itemHref + '/');
}
