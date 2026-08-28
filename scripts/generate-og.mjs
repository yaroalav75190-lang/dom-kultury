/**
 * Генерация статичных изображений: превью для соцсетей и иконки приложения.
 *
 * Всё строится из НАСТОЯЩЕГО логотипа заведения
 * (`src/assets/brand/logotype.png` — оригинальное начертание «ДОМ
 * КУЛЬТУРЫ», снятое с их же материалов). Перерисовывать логотип
 * нельзя, поэтому цвет меняется единственным допустимым способом:
 * из исходника берётся альфа-канал и используется как маска для
 * заливки латунью. Форма букв при этом не трогается вовсе.
 *
 * Запускается перед сборкой (`npm run build`), результат — в /public.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'src/assets/brand');
const out = join(root, 'public');

const LOGO = join(brand, 'logotype.png');
const SIGN = join(brand, 'logo-sign.png');

/** Фирменные цвета — те же, что в src/styles/tokens.css. */
const INK = { r: 11, g: 15, b: 13, alpha: 1 };
const BRASS = { r: 200, g: 169, b: 106 };

await mkdir(out, { recursive: true });

/**
 * Перекрашивает логотип, не меняя его формы: альфа оригинала
 * становится альфой сплошной латунной заливки.
 */
async function tinted(input, width) {
  const resized = await sharp(input)
    .resize({ width, fit: 'inside', withoutEnlargement: false })
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = resized.info;
  const alpha = await sharp(resized.data).extractChannel('alpha').toBuffer();

  return sharp({
    create: { width: w, height: h, channels: 3, background: BRASS },
  })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

/** Квадратная иконка: логотип по центру на фирменном фоне. */
async function icon(size, { crop = null, scale = 0.74, file }) {
  const source = crop ? await sharp(LOGO).extract(crop).png().toBuffer() : LOGO;
  const art = await tinted(source, Math.round(size * scale));
  const meta = await sharp(art).metadata();

  await sharp({
    create: { width: size, height: size, channels: 4, background: INK },
  })
    .composite([
      {
        input: art,
        left: Math.round((size - meta.width) / 2),
        top: Math.round((size - meta.height) / 2),
      },
    ])
    .png()
    .toFile(join(out, file));
}

/**
 * Кадр под мелкие иконки — литера «Д» из логотипа.
 *
 * Полная надпись в 32 пикселя превращается в кашу, а «Д» с её
 * треугольником узнаётся и там. Это вырезка из оригинала,
 * а не отдельно нарисованный знак.
 */
const D_GLYPH = { left: 139, top: 59, width: 330, height: 274 };

// --- Иконки ---
await icon(32, { crop: D_GLYPH, scale: 0.68, file: 'favicon-32.png' });
await icon(180, { crop: D_GLYPH, scale: 0.62, file: 'apple-touch-icon.png' });
await icon(192, { scale: 0.78, file: 'icon-192.png' });
await icon(512, { scale: 0.78, file: 'icon-512.png' });
// Маскируемая иконка: Android обрезает её кругом, поэтому поле шире.
await icon(512, { scale: 0.56, file: 'icon-maskable-512.png' });

// --- Превью для соцсетей: фотография латунной вывески заведения ---
await sharp(SIGN)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .modulate({ brightness: 0.92 })
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(join(out, 'og.jpg'));

console.log('Иконки и превью собраны из оригинального логотипа');
