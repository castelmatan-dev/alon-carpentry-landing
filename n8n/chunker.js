// Markdown chunker for Alon's documents (spec §6.4 "החיתוך").
// One chunk per "##" section (plus the preamble). Every chunk starts with
// "<doc title> — <section>" and the document's version line, so a price row
// never loses its context. A section longer than MAX splits between blocks or
// table rows, and every piece of a table repeats the table header.
// The same source is pasted into the n8n Code node "Chunk Markdown".
const MAX = 1500;

function splitBody(body, limit) {
  if (body.length <= limit) return [body];
  const units = [];
  for (const block of body.split(/\n\s*\n/)) {
    const ls = block.split('\n');
    if (ls.length > 2 && ls[0].startsWith('|') && /^\|[\s:|-]+\|$/.test(ls[1].trim())) {
      units.push({ header: ls.slice(0, 2).join('\n'), rows: ls.slice(2) });
    } else {
      units.push({ text: block });
    }
  }
  const parts = [];
  let cur = '';
  let curHeader = null;
  const flush = () => {
    if (cur.trim()) parts.push(cur.trim());
    cur = '';
    curHeader = null;
  };
  for (const u of units) {
    if (u.text !== undefined) {
      if (cur && cur.length + u.text.length + 2 > limit) flush();
      cur += (cur ? '\n\n' : '') + u.text;
      continue;
    }
    for (const row of u.rows) {
      const needHeader = curHeader !== u.header;
      const addLen = (needHeader ? u.header.length + 2 : 0) + row.length + 1;
      if (cur && cur.length + addLen > limit) flush();
      if (curHeader !== u.header) {
        cur += (cur ? '\n\n' : '') + u.header;
        curHeader = u.header;
      }
      cur += '\n' + row;
    }
    curHeader = null;
  }
  flush();
  return parts;
}

function chunkMarkdown(text, docTitle) {
  const src = String(text || '').replace(/\r\n/g, '\n');
  if (!src.trim()) return [];

  const sections = [];
  let cur = { section: 'פתיח', lines: [] };
  for (const line of src.split('\n')) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      sections.push(cur);
      cur = { section: m[1].trim(), lines: [] };
    } else {
      cur.lines.push(line);
    }
  }
  sections.push(cur);

  const vm = sections[0].lines.join('\n').match(/^.*גרסה.*$/m);
  const versionLine = vm ? vm[0].replace(/\*\*/g, '').trim() : '';

  const out = [];
  for (const s of sections) {
    const body = s.lines.join('\n').trim();
    if (!body) continue;
    const head = `${docTitle} — ${s.section}` + (versionLine ? `\n${versionLine}` : '');
    for (const part of splitBody(body, MAX - head.length - 2)) {
      out.push({ section: s.section, text: `${head}\n\n${part}` });
    }
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { chunkMarkdown };
