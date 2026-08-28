/**
 * Проверка контраста палитры по WCAG 2.2.
 *
 * Токены читаются прямо из `src/styles/tokens.css`, поэтому проверка
 * не расходится с тем, что реально применяется на сайте: поменяли цвет —
 * тест сразу скажет, прошёл он или нет.
 *
 * Пороги: 4.5:1 для основного текста (1.4.3), 3:1 для крупного текста,
 * границ интерактивных элементов и индикаторов состояния (1.4.11).
 *
 * Запуск: npm run contrast
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const css = await readFile(join(root, 'src/styles/tokens.css'), 'utf8');

/** Достаём объявления вида `--c-brass: #c8a96a;`. */
const tokens = new Map();
for (const m of css.matchAll(/(--c-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
  tokens.set(m[1], m[2].toLowerCase());
}

const need = (name) => {
  const v = tokens.get(name);
  if (!v) {
    console.error(`  ✗ токен ${name} не найден в tokens.css`);
    process.exit(1);
  }
  return v;
};

const channels = (hex) => hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255);
const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** [подпись, передний план, фон, требуемый минимум] */
const CHECKS = [
  ['Основной текст на фоне', '--c-paper', '--c-ink', 4.5],
  ['Основной текст на карточке', '--c-paper', '--c-surface', 4.5],
  ['Приглушённый текст на фоне', '--c-paper-dim', '--c-ink', 4.5],
  ['Приглушённый текст на карточке', '--c-paper-dim', '--c-surface', 4.5],
  ['Служебный текст на фоне', '--c-paper-mute', '--c-ink', 4.5],
  ['Служебный текст на карточке', '--c-paper-mute', '--c-surface', 4.5],
  ['Служебный текст на поднятом слое', '--c-paper-mute', '--c-surface-2', 4.5],
  ['Латунный акцент на фоне', '--c-brass', '--c-ink', 4.5],
  ['Латунный акцент на карточке', '--c-brass', '--c-surface', 4.5],
  ['Латунный акцент в подвале', '--c-brass', '--c-void', 4.5],
  ['Текст основной кнопки', '--c-ink', '--c-brass', 4.5],
  ['Кольцо фокуса на фоне', '--c-focus', '--c-ink', 3],
  ['Кольцо фокуса на карточке', '--c-focus', '--c-surface', 3],
  ['Граница элемента на фоне', '--c-line-strong', '--c-ink', 3],
  ['Граница элемента на карточке', '--c-line-strong', '--c-surface', 3],
  ['Граница элемента на поднятом слое', '--c-line-strong', '--c-surface-2', 3],
];

// --c-focus объявлен через var(); разворачиваем вручную.
tokens.set('--c-focus', need('--c-brass-bright'));

let failed = 0;
console.log('\nКонтраст палитры (WCAG 2.2)\n');

for (const [label, fg, bg, min] of CHECKS) {
  const r = contrast(need(fg), need(bg));
  const ok = r >= min;
  if (!ok) failed++;
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'}  ${label.padEnd(36)} ${r.toFixed(2).padStart(5)}:1  (мин. ${min}:1)`,
  );
}

// Отдельно — красный бейдж «сегодня», у него белый текст.
const red = contrast('#ffffff', need('--c-red'));
const redOk = red >= 4.5;
if (!redOk) failed++;
console.log(
  `  ${redOk ? 'OK  ' : 'FAIL'}  ${'Белый текст на красном бейдже'.padEnd(36)} ${red
    .toFixed(2)
    .padStart(5)}:1  (мин. 4.5:1)`,
);

console.log(failed === 0 ? '\n✓ Палитра проходит AA\n' : `\n✗ Не проходит проверок: ${failed}\n`);
process.exit(failed === 0 ? 0 : 1);
