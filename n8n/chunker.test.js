// Chunker tests (spec §6.4 "החיתוך"): run with `node --test n8n/chunker.test.js`
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { chunkMarkdown } = require('./chunker.js');

const DOCS = path.join(process.env.HOME, 'claude-brain/ai-dev-focus/course/lesson-11/homework-11/client-docs/alon');
const pricelist = fs.readFileSync(path.join(DOCS, 'pricelist.md'), 'utf8');
const terms = fs.readFileSync(path.join(DOCS, 'order-terms.md'), 'utf8');

test('one chunk per ## section, plus the preamble', () => {
  const chunks = chunkMarkdown(pricelist, 'מחירון');
  const sections = (pricelist.match(/^## /gm) || []).length;
  assert.strictEqual(chunks.length, sections + 1);
  assert.strictEqual(chunks[0].section, 'פתיח');
  assert.deepStrictEqual(chunks.slice(1).map(c => c.section).slice(0, 2), ['איך לקרוא את המחירון', 'שולחנות אוכל']);
});

test('every chunk carries doc title, version line and its section heading', () => {
  for (const c of chunkMarkdown(pricelist, 'מחירון')) {
    assert.match(c.text, /^מחירון — /);
    assert.match(c.text, /גרסה 1 · מעודכן 19\.10\.2026/);
    assert.ok(c.text.includes(c.section), c.section);
  }
});

test('a price row stays whole and keeps its table header', () => {
  const dining = chunkMarkdown(pricelist, 'מחירון').find(c => c.section === 'שולחנות אוכל');
  assert.ok(dining.text.includes('| 180×95 | 5,600 ₪ | 9,600 ₪ | 12,900 ₪ |'));
  assert.ok(dining.text.indexOf('| מידה (ס"מ) | אורן | אלון | אגוז |') < dining.text.indexOf('| 180×95 |'));
});

test('a long section splits between rows, repeating the table header', () => {
  const rows = Array.from({ length: 80 }, (_, i) => `| ${100 + i}×50 | 1,000 ₪ | 2,000 ₪ | 3,000 ₪ |`).join('\n');
  const md = `# מחירון\n\n**גרסה 9**\n\n## ענק\n\n| מידה | אורן | אלון | אגוז |\n|---|---|---|---|\n${rows}\n`;
  const big = chunkMarkdown(md, 'מחירון').filter(c => c.section === 'ענק');
  assert.ok(big.length > 1);
  for (const c of big) {
    assert.ok(c.text.length <= 1600, `chunk of ${c.text.length}`);
    assert.ok(c.text.includes('| מידה | אורן | אלון | אגוז |'));
    for (const line of c.text.split('\n')) if (line.startsWith('| 1')) assert.match(line, /\|$/);
  }
  const all = big.map(c => c.text).join('\n');
  for (let i = 0; i < 80; i += 1) assert.ok(all.includes(`| ${100 + i}×50 |`), `row ${i}`);
});

test('order terms chunk the same way', () => {
  const chunks = chunkMarkdown(terms, 'תנאי הזמנה');
  assert.strictEqual(chunks.length, (terms.match(/^## /gm) || []).length + 1);
  assert.ok(chunks.find(c => c.section === 'תשלום'));
});

test('empty or heading-less text yields no chunks or one', () => {
  assert.deepStrictEqual(chunkMarkdown('', 'מחירון'), []);
  assert.deepStrictEqual(chunkMarkdown('   \n  ', 'מחירון'), []);
  assert.strictEqual(chunkMarkdown('רק שורה אחת', 'מחירון').length, 1);
});
