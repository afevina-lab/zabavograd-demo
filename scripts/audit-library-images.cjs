#!/usr/bin/env node
/* Проверка связности картинок слов с плоской публичной библиотекой.
 * Запуск: node scripts/audit-library-images.cjs
 * Картинки интерфейса и тем не считаются словарными.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const cards = JSON.parse(fs.readFileSync(path.join(root, 'library.json'), 'utf8'));
assert(Array.isArray(cards), 'library.json must be an array');
const ids = new Set();
const referenced = new Set();
const withoutCategory = [];
let withImage = 0;
let variants = 0;
for (const card of cards) {
  assert(card.id && !ids.has(card.id), 'Missing or duplicate ID: ' + card.id);
  ids.add(card.id);
  if (!Array.isArray(card.variants) || card.variants.length === 0) continue;
  withImage++;
  if (!Array.isArray(card.categories) || !card.categories.length) withoutCategory.push({ id: card.id, label: card.label });
  for (const variant of card.variants) {
    variants++;
    assert(typeof variant.src === 'string' && variant.src.startsWith('/assets/words/'), 'Invalid image path for ' + card.id);
    const src = variant.src;
    assert(fs.existsSync(path.join(root, src.slice(1))), 'Missing referenced image: ' + src);
    referenced.add(src);
  }
}
const wordDir = path.join(root, 'assets/words');
const allWordImages = fs.readdirSync(wordDir).filter(name => /\.(?:webp|png|jpe?g|gif|svg)$/i.test(name));
const orphan = allWordImages.filter(name => !referenced.has('/assets/words/' + name));
const allowedOrphans = new Set(['игрушка.webp', 'машинка.webp']); // Previously deferred by the user.
const allowedNoCategory = new Set(['ru-new-20261108-9e891397bc']); // Кость: изображение собачьей кости, решение отложено.
const unexpectedOrphans = orphan.filter(name => !allowedOrphans.has(name));
const unexpectedUncategorized = withoutCategory.filter(x => !allowedNoCategory.has(x.id));
console.log(JSON.stringify({
  cards: cards.length, cardsWithImage: withImage, imageReferences: variants,
  uniqueImagesLinked: referenced.size, imagesOnDisk: allWordImages.length,
  orphan, cardsWithNoCategory: withoutCategory
}, null, 2));
assert(!unexpectedOrphans.length, 'Unlinked word images: ' + unexpectedOrphans.join(', '));
assert(!unexpectedUncategorized.length, 'Illustrated entries without category: ' + unexpectedUncategorized.map(x => x.label).join(', '));
console.log('Image-to-library audit OK');
