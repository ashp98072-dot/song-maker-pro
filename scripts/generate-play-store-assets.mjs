import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'artifacts/play-store');
await mkdir(output, { recursive: true });
const icon = await sharp(path.join(root, 'artifacts/android-branding/play-store-icon.png'))
  .resize(200, 200).png().toBuffer();
// A code-native layout using the established logo; no simulated app screenshots.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#080d17"/><stop offset="1" stop-color="#18243a"/></linearGradient>
  <linearGradient id="gold"><stop stop-color="#f5a400"/><stop offset="1" stop-color="#ffd16b"/></linearGradient>
</defs>
<rect width="1024" height="500" fill="url(#bg)"/>
<g fill="none" stroke="#34445d" stroke-width="2" opacity=".35">
  <path d="M0 380 C220 250 530 560 1024 260"/><path d="M0 406 C220 276 530 586 1024 286"/>
  <path d="M0 432 C220 302 530 612 1024 312"/>
</g>
<rect x="80" y="124" width="224" height="224" rx="40" fill="#0b1220" stroke="#826025" stroke-width="2"/>
<image x="92" y="136" width="200" height="200" href="data:image/png;base64,${icon.toString('base64')}"/>
<g font-family="Arial, sans-serif">
  <text x="352" y="205" fill="#f7f9fc" font-size="48" font-weight="700">Worship Transpose</text>
  <rect x="354" y="230" width="76" height="5" rx="2.5" fill="url(#gold)"/>
  <text x="352" y="281" fill="#ffd16b" font-size="29">Prepara tu próxima alabanza</text>
  <text x="352" y="324" fill="#b8c5d9" font-size="21">Canciones · Acordes · Listas</text>
</g>
</svg>`;
await writeFile(path.join(output, 'feature-graphic.svg'), svg);
await sharp(Buffer.from(svg)).removeAlpha().png().toFile(path.join(output, 'feature-graphic.png'));
const metadata = await sharp(path.join(output, 'feature-graphic.png')).metadata();
if (metadata.width !== 1024 || metadata.height !== 500 || metadata.hasAlpha) {
  throw new Error('El gráfico debe ser PNG opaco de 1024 × 500.');
}
console.log('Gráfico promocional generado: artifacts/play-store/feature-graphic.png (1024 × 500, sin transparencia).');
