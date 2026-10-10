Las correcciones de letra y acordes del administrador se guardan por ID en `catalog_song_corrections`. El servidor comprueba el rol; no se transfiere la propiedad de canciones públicas ni se modifican listas, favoritos o tonos personales. Una copia independiente con otro ID conserva su contenido.

Antes de desplegar, ejecutar en Supabase SQL Editor la migración `supabase/migrations/20261010100000_catalog_song_corrections.sql`. Después desplegar la web y reconstruir Android. Las versiones Android anteriores requieren actualizarse para aplicar correcciones a canciones que no están en public_songs.

Las correcciones antiguas no se migran automáticamente: volver a guardar desde la cuenta administradora las canciones corregidas. Las versiones antiguas de user_songs no identifican de forma fiable qué texto corresponde a una corrección del administrador.

Verificación con dos cuentas: guardar una corrección como administrador; abrir el mismo ID en otra cuenta (incluida una lista existente); volver a enfocar la app o esperar hasta un minuto. Comprobar letra/acordes nuevos y tono/lista/favorito conservados. Repetir como invitado. Sin conexión se conserva la última versión descargada; al reconectar se actualiza. Un fallo al guardar mantiene el editor abierto y no muestra éxito.
