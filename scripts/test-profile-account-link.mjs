import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users, user_id uuid UNIQUE REFERENCES auth.users, display_name text, avatar_url text);
    INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
    INSERT INTO profiles(id,display_name) VALUES ('00000000-0000-4000-8000-000000000001','Existing');`);
  const migration = await readFile(new URL('../supabase/migrations/20261012100000_profile_account_link.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  let rows = (await db.query('SELECT * FROM profiles')).rows;
  assert.equal(rows[0].user_id, rows[0].id);
  assert.equal(rows[0].display_name, 'Existing');
  await db.exec(`CREATE ROLE authenticated; GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated; SET ROLE authenticated;
    INSERT INTO profiles(id,display_name) VALUES ('00000000-0000-4000-8000-000000000002','New');`);
  rows = (await db.query("SELECT * FROM profiles WHERE display_name='New'")).rows;
  assert.equal(rows[0].user_id, rows[0].id);
  for (let i = 0; i < 2; i++) {
    await db.exec(`INSERT INTO profiles(id,user_id,display_name,avatar_url)
      VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Existing','photo')
      ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, avatar_url=excluded.avatar_url;`);
  }
  rows = (await db.query('SELECT * FROM profiles')).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows.find(row => row.display_name === 'Existing').avatar_url, 'photo');
  console.log('Passed: legacy backfill, repeat migration, signup without auth table access, repeated avatar upsert.');
} finally { await db.close(); }
