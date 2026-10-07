// Local, isolated PostgreSQL-compatible check. Pass a PGlite module path.
// Does not connect to Supabase or import user files.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
const admin = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
      $$ SELECT nullif(current_setting('app.uid', true), '')::uuid $$;
    CREATE TABLE user_roles(user_id uuid, role text);
    CREATE TABLE user_songs(song_id text UNIQUE, user_id uuid, title text, artist text, key text,
      chords text, bpm integer, youtube_url text);
    CREATE TABLE public_songs(song_id text UNIQUE, title text, artist text, original_key text,
      scale_mode text, chords text, bpm integer, title_slug text NOT NULL,
      uploader_id uuid, genre text, original_gender text);
    INSERT INTO user_roles VALUES ('${admin}', 'admin');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20260929190000_admin_import_songs.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261007100000_admin_import_updates.sql', import.meta.url), 'utf8'));
  const song = { id:'imp-test', title:'Test', artist:'Author', chords:'Test lyrics', originalKey:'Am',
    scaleMode:'minor', originalGender:'male', genre:'adoracion', titleSlug:'test' };
  const call = async (songs, publish = false) => (await db.query(
    'SELECT * FROM admin_import_songs($1::jsonb, $2)', [JSON.stringify(songs), publish])).rows;
  await assert.rejects(call([song]), /Solo el administrador/);
  await db.exec(`SET app.uid = '${other}'; SET ROLE authenticated;`);
  await assert.rejects(call([song]), /Solo el administrador/);
  await db.exec(`RESET ROLE; SET app.uid = '${admin}'; SET ROLE authenticated;`);
  assert.equal((await call([song]))[0].status, 'imported');
  assert.equal((await call([song]))[0].status, 'skipped');
  assert.equal((await call([song], true))[0].status, 'imported');
  assert.equal((await call([song], true))[0].status, 'skipped');
  assert.equal((await call([{...song,id:'imp-duplicate'}], true))[0].status, 'skipped');
  const results = await call([
    {...song,id:'imp-bad', title:'Bad', titleSlug:null},
    {...song,id:'imp-good', title:'Good'},
  ], true);
  assert.deepEqual(results.map(row=>row.status), ['error','imported']);
  await db.exec('RESET ROLE');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM user_songs WHERE song_id = 'imp-bad'")).rows[0].n, 0);
  await db.exec(`INSERT INTO user_songs(song_id,user_id,title) VALUES ('imp-other','${other}','Other'); SET ROLE authenticated;`);
  assert.equal((await call([{...song,id:'imp-other',title:'Changed'}]))[0].status,'skipped');
  await assert.rejects(call(Array(51).fill(song)), /Lote demasiado grande/);
  await assert.rejects(call(null), /lista de canciones/);
  const updated = await call([{...song,id:'imp-replacement',chords:'C\nUpdated',updateExisting:true}], true);
  assert.equal(updated[0].status, 'updated');
  assert.equal(updated[0].target_id, song.id);
  await db.exec('RESET ROLE');
  assert.equal((await db.query("SELECT chords FROM public_songs WHERE song_id = 'imp-test'")).rows[0].chords, 'C\nUpdated');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public_songs WHERE song_id = 'imp-replacement'")).rows[0].n, 0);
  await db.exec('SET ROLE authenticated');
  assert.equal((await call([{...song,id:'imp-replacement',updateExisting:true}], false))[0].target_id, song.id);
  await db.exec('RESET ROLE');
  await db.exec(`INSERT INTO public_songs(song_id,title,artist,title_slug) VALUES ('duplicate','Test','Author','duplicate');`);
  await db.exec('SET ROLE authenticated');
  assert.equal((await call([{...song,updateExisting:true}],true))[0].status,'error');
  assert.equal((await call([{...song,id:'imp-other',title:'Other',updateExisting:true}],false))[0].status,'skipped');
  await db.exec('RESET ROLE; SET ROLE anon;');
  await assert.rejects(call([song]), /permission denied/);
  console.log('SQL checks passed: admin gate, grants, batch limit, duplicate skip, ownership and per-song rollback.');
} finally { await db.close(); }
