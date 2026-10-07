# Refresco del catálogo compartido

El catálogo público se consulta completo con páginas de 500 registros ordenadas por ID. Se aplica solo después de terminar todas las páginas: un fallo de red conserva la copia anterior. Las canciones se actualizan por `song_id`, manteniendo referencias de listas y favoritos y permitiendo arreglos distintos con el mismo título.

Se refresca al iniciar, recibir foco, volver a estar visible o recuperar conexión. Las solicitudes simultáneas se agrupan y se descartan respuestas de una identidad anterior o de un proveedor desmontado. No es una suscripción instantánea a cambios públicos: una página que permanece abierta sin esos eventos puede conservar el estado anterior.

Las copias personales identificadas en `user_songs` y las canciones editadas/importadas durante la sesión tienen prioridad sobre la publicación compartida. Los registros locales que no aparecen en la respuesta se conservan para uso sin conexión; la limpieza de archivadas mantiene su flujo separado. La caché de canciones visitadas solo agrega IDs ausentes y no reemplaza una canción que ya se haya cargado.

No requiere migraciones SQL ni instala Android. Capacitor deberá conectar sus eventos nativos de reanudación y red cuando se integre. Las pruebas actuales ejercitan eventos del navegador, paginación, conservación de ediciones locales y desmontaje; faltan pruebas en un teléfono real.
