import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);
const db=new PGlite();
const uid='00000000-0000-0000-0000-000000000001';
try {
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
 INSERT INTO auth.users VALUES ('${uid}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('app.uid',true),'')::uuid $$;
 CREATE TABLE user_roles(user_id uuid,role text);INSERT INTO user_roles VALUES ('${uid}','admin');
 CREATE TABLE user_songs(song_id text UNIQUE,user_id uuid,title text,artist text,key text,chords text,bpm integer,youtube_url text);
 CREATE TABLE public_songs(song_id text UNIQUE,title text,artist text,original_key text,scale_mode text,chords text,bpm integer,title_slug text NOT NULL,uploader_id uuid,genre text,original_gender text);`);
 for (const name of ['20260929190000_admin_import_songs.sql','20261007100000_admin_import_updates.sql'])
   await db.exec(execFileSync('git',['show',`HEAD:supabase/migrations/${name}`],{encoding:'utf8'}));
 for (const name of ['20261007120000_catalog_archive.sql','20261007130000_restore_imported_archives.sql'])
   await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
 const song={id:'imp-original',title:'Prueba',artist:'Autor',originalKey:'C',scaleMode:'major',originalGender:'male',genre:'adoracion',titleSlug:'prueba',chords:'Letra'};
 await db.exec(`SET app.uid='${uid}';SET ROLE authenticated;`);
 await db.query('SELECT * FROM admin_import_songs($1::jsonb,true)',[JSON.stringify([song])]);
 const archive=()=>db.query('SELECT admin_archive_catalog_songs($1::text[],true)',[['imp-original']]);
 const hidden=async()=> (await db.query('SELECT * FROM catalog_archived_song_ids()')).rows.length;
 const update=(chords,publish=true,extra={})=>db.query('SELECT * FROM admin_import_restore_songs($1::jsonb,$2)',[JSON.stringify([{...song,id:'imp-incoming',updateExisting:true,chords,...extra}]),publish]);
 await archive();await update('Solo letra sin acordes');assert.equal(await hidden(),1);
 await update('Am, G, C.\nTexto',false);assert.equal(await hidden(),1);
 await update('C G Am F\nTexto',true,{originalKey:''});assert.equal(await hidden(),1);
 const result=await update('Am, G, C.\nTexto');assert.equal(result.rows[0].target_id,'imp-original');assert.equal(await hidden(),0);
 await archive();await update('////G////\nTexto');assert.equal(await hidden(),0);
 await archive();await update('C G Am F\nTexto',true,{updateExisting:false});assert.equal(await hidden(),1);
 await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(update('C G'),/permission denied/);
 console.log('Restore checks passed: lyrics stay archived, library-only stays archived, failed/skipped updates stay archived, chord updates restore original ID, admin permissions.');
}finally{await db.close();}
