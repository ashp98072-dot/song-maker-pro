import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./check-android-env.mjs', import.meta.url));
const key = (role, ref = 'testproject') => `eyJ.${Buffer.from(JSON.stringify({ role, ref, iss: 'supabase' })).toString('base64url')}.test`;
function check(value, url = 'https://testproject.supabase.co') {
  return spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env,
    VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: value, VITE_SUPABASE_PUBLISHABLE_KEY: '',
  } });
}
test('accepts the anonymous key for the configured project', () => assert.equal(check(key('anon')).status, 0));
test('rejects administrative keys and keys from another project', () => {
  assert.notEqual(check(key('service_role')).status, 0);
  assert.notEqual(check(key('anon', 'otherproject')).status, 0);
});
test('rejects missing configuration before generating an unusable APK', () => {
  assert.notEqual(check('').status, 0);
  assert.notEqual(check(key('anon'), '').status, 0);
});
