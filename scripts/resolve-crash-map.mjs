import fs from 'fs';
import { SourceMapConsumer } from 'source-map';

const assetsDir = 'dist/assets';
const bootstrap = fs
  .readdirSync(assetsDir)
  .find((f) => f.startsWith('bootstrap-') && f.endsWith('.js') && !f.endsWith('.map'));
if (!bootstrap) {
  console.error('bootstrap chunk not found');
  process.exit(1);
}

const jsPath = `${assetsDir}/${bootstrap}`;
const mapPath = `${jsPath}.map`;
const js = fs.readFileSync(jsPath, 'utf8');
const lines = js.split('\n');
const line = 228;
const col = 119274;

console.log('bootstrap:', bootstrap);
console.log('lines:', lines.length);
console.log('line', line, 'length:', lines[line - 1]?.length ?? 0);

const snippet = lines[line - 1]?.slice(Math.max(0, col - 80), col + 80) ?? '';
console.log('snippet around col:', JSON.stringify(snippet));

const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const consumer = await new SourceMapConsumer(raw);

const primary = consumer.originalPositionFor({ line, column: col });
console.log('\n=== CRASH TRACE MAP (primary) ===');
console.log(JSON.stringify(primary, null, 2));

if (!primary.source) {
  let best = null;
  for (let c = col; c >= 0; c -= 500) {
    const p = consumer.originalPositionFor({ line, column: c });
    if (p.source) {
      best = p;
      break;
    }
  }
  console.log('\n=== nearest column with source ===');
  console.log(JSON.stringify(best, null, 2));
}

// Find minified identifier at crash column
const seg = lines[line - 1]?.slice(col - 20, col + 20) ?? '';
const idMatch = seg.match(/[A-Za-z_$][\w$]*/g);
console.log('\nidentifiers near column:', idMatch);

// Scan names array for bindings used in SpectatorSession / follower modules
const sources = raw.sources?.filter((s) =>
  /SpectatorSession|followerView|followerJoin|SessionStatus|LiveSessionChannel/i.test(s)
);
console.log('\nrelevant sources in map:', sources?.length);
for (const s of sources ?? []) {
  console.log(' -', s.replace(/.*\/src\//, 'src/'));
}

consumer.destroy();
