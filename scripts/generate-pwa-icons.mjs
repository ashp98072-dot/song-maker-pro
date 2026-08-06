import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src/assets/worship-transpose-logo.png');
const outDir = path.join(root, 'public/pwa');

const BG = { r: 11, g: 18, b: 32, alpha: 1 };

await mkdir(outDir, { recursive: true });

await sharp(src).resize(192, 192, { fit: 'cover' }).png().toFile(path.join(outDir, 'icon-192.png'));
await sharp(src).resize(512, 512, { fit: 'cover' }).png().toFile(path.join(outDir, 'icon-512.png'));

await sharp(src)
  .resize(280, 280, { fit: 'contain', background: BG })
  .extend({ top: 116, bottom: 116, left: 116, right: 116, background: BG })
  .png()
  .toFile(path.join(outDir, 'icon-maskable-512.png'));

console.log('PWA icons generated in public/pwa/');
