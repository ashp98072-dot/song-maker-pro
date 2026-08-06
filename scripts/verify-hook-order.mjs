import fs from 'fs';

const lines = fs.readFileSync(
  'src/features/director-session/context/SpectatorSessionContext.tsx',
  'utf8'
).split('\n');

const hooks = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^\s*const\s+(\w+)\s*=\s*use(Callback|Memo|Effect)\s*\(/);
  if (m) hooks.push({ name: m[1], line: i + 1 });
}
const lineOf = Object.fromEntries(hooks.map((h) => [h.name, h.line]));

const depArrays = [];
let i = 0;
while (i < lines.length) {
  if (/^\s*const\s+\w+\s*=\s*use(Callback|Memo|Effect)\s*\(/.test(lines[i])) {
    const hookLine = i + 1;
    const hookName = lines[i].match(/const\s+(\w+)/)[1];
    for (let j = i + 1; j < Math.min(i + 500, lines.length); j++) {
      if (/^\s*\],\s*$/.test(lines[j])) {
        const block = lines.slice(i, j + 1).join('\n');
        const m = block.match(/,\s*\[([\s\S]*?)\]\s*\)\s*;?\s*$/);
        if (m) {
          const deps = [...m[1].matchAll(/\b([A-Za-z_$][\w$]*)\b/g)]
            .map((x) => x[1])
            .filter((n) => lineOf[n]);
          depArrays.push({ hook: hookName, hookLine, deps, end: j + 1 });
        }
        i = j;
        break;
      }
    }
  }
  i++;
}

const bad = [];
for (const d of depArrays) {
  for (const dep of [...new Set(d.deps)]) {
    if (lineOf[dep] > d.hookLine) {
      bad.push({ hook: d.hook, hookLine: d.hookLine, dep, depLine: lineOf[dep] });
    }
  }
}

if (bad.length === 0) {
  console.log('OK: no hook dependency references a hook declared later.');
} else {
  console.log('VIOLATIONS:');
  for (const v of bad) {
    console.log(`  ${v.hook}@${v.hookLine} -> ${v.dep}@${v.depLine}`);
  }
  process.exit(1);
}
