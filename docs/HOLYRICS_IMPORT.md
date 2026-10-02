# Importación administrativa de Holyrics

La pantalla **Importar catálogo** admite `.muf` (objeto Music) y `.mufl` (ArrayList de Music) del formato binario Java usado por la muestra suministrada. Los archivos se leen en el navegador; no se ejecutan clases Java ni se sube el archivo original. Otros formatos/versiones pueden ser rechazados y necesitan una muestra para ampliar compatibilidad.

## Flujo

1. Entrar con una cuenta con rol `admin` y subir el archivo.
2. Revisar títulos, artistas, letra, género y tonalidad. Las entradas sin título o letra se reportan por posición. Los duplicados por título/artista se dejan sin seleccionar.
3. Elegir biblioteca personal, publicación en comunidad o publicación con cadena.
4. La aplicación envía lotes de diez canciones y muestra progreso. El servidor vuelve a comprobar el rol en cada lote, omite duplicados y nunca sobrescribe canciones existentes. Cada canción se guarda en una subtransacción; un error de publicación revierte también su alta privada.
5. Las canciones confirmadas se retiran de la cola; las fallidas permanecen para corregir/reintentar. Ante una respuesta perdida, la deduplicación del servidor evita repetir el alta. La creación de la cadena ocurre después de guardar las canciones y puede fallar por separado.

Límites: 10 MB por archivo, 20 archivos por selección, 5000 canciones en la cola. El servidor acepta como máximo 50 canciones y 2 MB por llamada. También hay límites de profundidad, referencias y longitud al interpretar el archivo.

## Datos conservados y límites

Se importan título, artista (o autor si no hay artista), letra y saltos de línea. Se usan los identificadores de origen para reintentos estables. El esquema inspeccionado no contiene tonalidad: se presenta **C como valor inicial editable**, no como tonalidad detectada. No se generan acordes. No se importan fondos, formato HTML, notas ni orden de proyección personalizado.

Prueba local con `2020-08-21_16-57-18.mufl` (840430 bytes): 666 registros, 663 con título/letra, 3 incompletos (posiciones 86, 136 y 345), 661 combinaciones únicas de título/artista, 663 identificadores únicos. El archivo del usuario y sus letras no se incluyen en Git ni se han publicado en Supabase.

## Activación en Supabase

**Aplicar `supabase/migrations/20260929190000_admin_import_songs.sql` antes de desplegar esta versión.** Requiere las tablas existentes `user_roles`, `user_songs` y `public_songs` y `auth.uid()`. El importador administrativo de ChordPro/pegado también usa esta función para evitar falsos éxitos de sincronización. Si falta la migración, la pantalla lo indica y conserva la cola.

La función es SECURITY DEFINER, fija search_path, comprueba `user_roles` en servidor y solo concede ejecución a `authenticated`. No concede escritura directa ni cambia las políticas de publicación normal de la comunidad. Nunca recibe del cliente el usuario o rol con el que guarda.

La migración está probada con un esquema mínimo aislado en PGlite. El administrador confirmó su aplicación al proyecto Supabase remoto el 29 de septiembre de 2026 y compartió el resultado exitoso del editor SQL. Sigue pendiente una importación completa contra ese proyecto: la prueba aislada no sustituye verificar sus políticas, restricciones y triggers.

## Verificación

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Pruebas sintéticas del parser: objeto individual, lista, UTF modificado de Java, referencias, archivos truncados, límites y objetos no compatibles.
- Pruebas UI: acceso no administrador, revisión sin publicación, duplicados, lotes y reintentos.
- Prueba SQL reproducible (PowerShell; instalación aislada, sin cambios a dependencias de la app):

```powershell
npm install --prefix "$env:TEMP/song-maker-sql-check" @electric-sql/pglite --no-save --ignore-scripts
node scripts/check-admin-import-sql.mjs "$env:TEMP/song-maker-sql-check/node_modules/@electric-sql/pglite/dist/index.js"
```

Comprueba permisos de anónimo/usuario/admin, duplicados, pertenencia a otro usuario, límite del lote y rollback de una canción fallida. No conecta a servicios remotos.
