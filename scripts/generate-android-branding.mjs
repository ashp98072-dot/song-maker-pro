import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src/assets/worship-transpose-logo.png');
const res = path.join(root, 'android/app/src/main/res');
const background = '#0B1220';
// The note and cross from the existing logo, excluding the small wordmark.
const symbol = await sharp(source).extract({ left: 420, top: 100, width: 400, height: 450 }).png().toBuffer();
async function centered(input, size, artwork, output, bg = background) {
  const image = await sharp(input).resize(artwork, artwork, { fit: 'contain', background: bg }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: image, gravity: 'centre' }]).png().toFile(output);
}
for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  const directory = path.join(res, `mipmap-${density}`);
  await mkdir(directory, { recursive: true });
  await centered(symbol, 48 * scale, 36 * scale, path.join(directory, 'ic_launcher.png'));
  await centered(symbol, 48 * scale, 36 * scale, path.join(directory, 'ic_launcher_round.png'));
  // Adaptive foreground artwork remains inside the central safe area.
  await centered(symbol, 108 * scale, 56 * scale, path.join(directory, 'ic_launcher_foreground.png'), '#00000000');
}
const modern = path.join(res, 'drawable-nodpi');
await mkdir(modern, { recursive: true });
await centered(symbol, 288, 176, path.join(modern, 'worship_splash_icon.png'), '#00000000');
for (const directory of await readdir(res)) {
  if (!directory.startsWith('drawable')) continue;
  const output = path.join(res, directory, 'splash.png');
  const metadata = await sharp(output).metadata().catch(() => null);
  if (!metadata) continue;
  const { width, height } = metadata;
  const artwork = Math.round(Math.min(width, height) * 0.65);
  const image = await sharp(source).resize(artwork, artwork, { fit: 'inside' }).png().toBuffer();
  await sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: image, gravity: 'centre' }]).png().toFile(`${output}.tmp`);
  const { rename } = await import('node:fs/promises');
  await rename(`${output}.tmp`, output);
}
await mkdir(path.join(root, 'artifacts/android-branding'), { recursive: true });
await centered(symbol, 512, 384, path.join(root, 'artifacts/android-branding/play-store-icon.png'));
console.log('Android icons, splash screens and Play Store icon generated.');
