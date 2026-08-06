import fs from 'fs';

const file = 'src/features/director-session/context/SpectatorSessionContext.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const hookStarts = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^\s*const\s+(\w+)\s*=\s*use(Callback|Memo|Effect)\s*\(/);
  if (m) hookStarts.push({ name: m[1], kind: m[2], line: i + 1, idx: i });
}

const declLine = Object.fromEntries(hookStarts.map((h) => [h.name, h.line]));

function findDepsEnd(startIdx) {
  let paren = 0;
  let started = false;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '(') {
        paren++;
        started = true;
      } else if (ch === ')') paren--;
    }
    if (started && paren === 0) {
      // hook call closed; deps array follows
      for (let k = i; k < Math.min(i + 30, lines.length); k++) {
        if (/^\s*\],?\s*$/.test(lines[k]) || /^\s*\]\s*\)\s*;?\s*$/.test(lines[k])) {
          return k + 1;
        }
      }
    }
  }
  return null;
}

const violations = [];
for (const h of hookStarts) {
  const endLine = findDepsEnd(h.idx);
  if (!endLine) continue;
  // scan backwards from endLine for `[` start of deps
  let depsText = '';
  for (let i = endLine - 1; i >= h.idx; i--) {
    depsText = lines[i] + '\n' + depsText;
    if (lines[i].includes('[') && depsText.includes(']')) break;
  }
  const chunk = lines.slice(h.idx, endLine).join('\n');
  const depMatch = chunk.match(/,\s*\[([\s\S]*?)\]\s*\)\s*;?\s*$/);
  if (!depMatch) continue;
  const depBody = depMatch[1];
  const ids = [...depBody.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)]
    .map((m) => m[1])
    .filter((id) => declLine[id]);

  for (const id of [...new Set(ids)]) {
    if (declLine[id] > h.line) {
      violations.push({ hook: h.name, hookLine: h.line, dep: id, depLine: declLine[id] });
    }
  }
}

violations.sort((a, b) => a.hookLine - b.hookLine || a.depLine - b.depLine);
console.log('=== USADO_ANTES → DECLARADO_DESPUÉS ===\n');
let cur = null;
for (const v of violations) {
  if (v.hook !== cur) {
    if (cur) console.log('');
    console.log(`line ${v.hookLine}:`);
    console.log(v.hook);
    console.log('depends on:');
    cur = v.hook;
  }
  console.log(`* ${v.dep} (declared line ${v.depLine})`);
}
console.log(`\nTotal: ${violations.length}`);
