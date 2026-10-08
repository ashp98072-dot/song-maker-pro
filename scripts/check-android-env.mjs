import { loadEnv } from 'vite';

const env = { ...loadEnv('android', process.cwd(), 'VITE_'), ...process.env };
const url = env.VITE_SUPABASE_URL?.trim();
const key = (env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim();
if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) || !key) {
  throw new Error('Configura VITE_SUPABASE_URL y la clave pública Supabase en .env.local antes de compilar Android.');
}
if (!key.startsWith('sb_publishable_')) {
  let payload;
  try { payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()); }
  catch { throw new Error('La clave Supabase debe ser una clave pública publishable o un JWT anon válido.'); }
  if (payload.role !== 'anon' || payload.iss !== 'supabase' || new URL(url).hostname !== `${payload.ref}.supabase.co`) {
    throw new Error('La clave debe ser anon del mismo proyecto. Nunca empaquetes una clave administrativa.');
  }
}
console.log('Configuración pública Android verificada.');
