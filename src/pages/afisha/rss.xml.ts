import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '@/data/site';
import { formatFull, eventIsUpcoming } from '@/lib/datetime';

/**
 * Лента афиши.
 *
 * Нужна не столько читателям RSS, сколько агрегаторам городских афиш
 * и автопостингу: одна ссылка вместо ручного переноса событий.
 */
const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site: astroSite }) => {
  const base = astroSite ?? new URL(site.url);

  const events = (await getCollection('events', ({ data }) => !data.draft))
    .filter((e) => eventIsUpcoming(e.data))
    .sort((a, b) => {
      if (!a.data.startsAt) return 1;
      if (!b.data.startsAt) return -1;
      return a.data.startsAt.getTime() - b.data.startsAt.getTime();
    });

  const items = events
    .map((e) => {
      const url = new URL(`/afisha/${e.id}`, base).href;
      const when = e.data.startsAt
        ? formatFull(e.data.startsAt)
        : (e.data.dateNote ?? 'дата уточняется');
      const description = [when, e.data.venue, e.data.summary]
        .filter(Boolean)
        .join(' · ');

      return `    <item>
      <title>${escape(e.data.title)}</title>
      <link>${escape(url)}</link>
      <guid isPermaLink="true">${escape(url)}</guid>
      <description>${escape(description)}</description>
      <category>${escape(e.data.kind)}</category>
      ${e.data.startsAt ? `<pubDate>${e.data.startsAt.toUTCString()}</pubDate>` : ''}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Афиша — ${escape(site.name)}</title>
    <link>${escape(new URL('/afisha', base).href)}</link>
    <description>${escape(
      `Концерты, сеты, постановки и гастрономические вечера в баре «${site.name}», ${site.contacts.address.full}.`,
    )}</description>
    <language>ru</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
};
