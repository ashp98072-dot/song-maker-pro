## Plan

### 1. Backend (Migration única)

**Nuevas tablas:**
- `user_roles` (user_id, role enum 'admin'|'user') + función `has_role(uuid, app_role)` SECURITY DEFINER.
- `user_lists` (id, user_id, name, song_ids JSONB[], created_at, updated_at) con RLS `auth.uid() = user_id`.
- `app_songs` (song_id text PK, title, artist, original_key, scale_mode, chords, bpm, original_gender text). RLS: SELECT a authenticated; INSERT/UPDATE/DELETE solo admin via `has_role(auth.uid(),'admin')`.
- `live_sessions` (code text PK, director_id uuid, song_id text, list_song_ids jsonb, semitones int, bpm int, is_active bool, updated_at). RLS: SELECT a authenticated; INSERT/UPDATE solo el director.

**Migrar datos:** copiar `playlists` + `playlist_songs` a `user_lists` agregando song_ids como JSONB. Mantener tablas viejas por ahora (no romper) pero AppContext dejará de usarlas.

**original_gender:** se vive en `app_songs.original_gender`. La columna `vocal_register` en `user_song_settings` sigue siendo el override por usuario.

### 2. Frontend

**`src/context/AppContext.tsx`**
- Cargar canciones combinando data local + `app_songs` (override `originalGender`).
- Reemplazar `createList/addSongToList/...` para escribir/leer `user_lists` con array JSONB. Asegurar `user_id: session.user.id` en todo upsert.
- Exponer `isAdmin` (consulta a `user_roles`).

**Búsqueda accent-insensitive (`HomePage`, `CommunityLibraryPage`, etc.)**
- Helper `normalizeText(s) = s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()` y aplicarlo en filtros.

**`ListsPage` import**
- Tras `createList(name)`, hacer un solo update de `user_lists.song_ids = validSongIds` (JSONB) en lugar de N inserts en `playlist_songs`.

**Admin UI canción**
- En `SongViewPage` (o similar), si `isAdmin`, mostrar selector de `originalGender` que hace upsert a `app_songs`. Resto de usuarios solo ve.

**Live Session Pro (`DirectorSession.tsx`)**
- Persistir `{code, role}` en localStorage (`worship-live-session`).
- Al montar: si existe entrada y `live_sessions.is_active=true`, reconectar automáticamente como Director o Follower.
- Director: al iniciar/cambiar estado, upsert a `live_sessions`. Al detener, set `is_active=false`.
- Buscador in-session: input que filtra `songs` (accent-insensitive) y permite al Director añadir a `listSongIds`. Cambio se propaga por broadcast existente + persiste en `live_sessions`.

### 3. Aspectos técnicos

- Postgres ya usa UTF-8 por defecto; no hace falta cambiar charset (la "ñ" funciona — el problema real es la búsqueda sin normalizar).
- Mantener `playlists/playlist_songs` en DB sin tocar para no romper backups; nuevo código solo lee/escribe `user_lists`.
- Para asignarte admin la primera vez: ejecutar manualmente `INSERT INTO user_roles(user_id,role) VALUES ('<tu-uuid>','admin')` desde el panel de Cloud (te indico el UUID tras el primer login).

### Orden de ejecución

1. Migración SQL (tablas + RLS + función + copia de datos).
2. Actualizar AppContext + helpers.
3. ListsPage import + búsqueda normalizada.
4. DirectorSession con persistencia y buscador.
5. UI admin para original_gender.
