# Pruebas en teléfono antes de publicar

Usar una cuenta de prueba con contenido que se pueda eliminar. Registrar modelo,
versión Android, versión de la app, resultado y pasos de cualquier fallo.
Una compilación correcta no sustituye estas pruebas.

| Prueba | Pasos y resultado esperado | Estado |
| --- | --- | --- |
| Google | Entrar, cancelar y reintentar; cerrar/reabrir conservando sesión | Éxito informado por Walter; cancelación/reintento pendientes |
| YouTube | Buscar desde una canción, elegir resultado y abrir video | Búsqueda informada como correcta por Walter |
| Solicitud de eliminación | Abrir enlace público, preparar correo y enviarlo | Recepción confirmada por capturas |
| Micrófono permitido | Activar afinador/test de voz, aceptar permiso, emitir sonido y cerrar herramienta | Pendiente |
| Micrófono rechazado | Rechazar permiso; app debe seguir usable, explicar fallo y permitir reintento | Pendiente |
| Micrófono revocado | Revocar en Ajustes Android y volver a activar función | Pendiente |
| Foto | Elegir una imagen propia, cancelar selector y comprobar actualización de perfil | Pendiente |
| PDF | Importar PDF autorizado, abrirlo, cancelar selector y probar archivo inválido | Pendiente |
| Grabación local | Grabar ensayo, detener, reproducir y exportar; revisar permisos y errores | Pendiente |
| Sesión compartida | Cambiar tono en director; espectador debe coincidir incluso con registro vocal previo | Pendiente de confirmación final |
| Navegación | Atrás con diálogo, teclado, pantalla completa e inicio; regresar desde otra app | Pendiente |
| Red | Desconectar/reconectar; mostrar fallo recuperable, no borrar biblioteca local | Pendiente |
| Borrado completo | Cuenta de prueba con foto/PDF/listas/favoritos y publicaciones; ejecutar procedimiento y verificar ausencia | Pendiente; correo recibido no equivale a borrado |

Para cada fallo: anotar los pasos exactos, mensaje y pantalla; no enviar tokens,
contraseñas ni documentos personales. Repetir solo las pruebas afectadas por una corrección.
El ensayo de borrado requiere el operador autorizado y la revisión del esquema de
producción descrita en play-store-privacy-review.md; esta lista no ejecuta borrados.
