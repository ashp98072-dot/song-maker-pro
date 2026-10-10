# Privacidad y preparación para Play Store

Responsable indicado por el usuario: Walter Villagran.
Correo indicado: worshiptranspose@gmail.com. El responsable confirmó recepción y
respuesta de mensajes el 10 de octubre de 2026.

## URLs después del despliegue

- https://worshiptranspose.com/privacidad
- https://worshiptranspose.com/eliminar-cuenta

La solicitud de eliminación es manual por correo, no un borrado automático.
El responsable debe revisar el buzón y completar solicitudes verificadas.
Plazo acordado el 10 de octubre de 2026: completar la eliminación dentro de 7 días
naturales desde la verificación del titular y confirmar el resultado por correo.

## Avances comprobados el 9 de octubre de 2026

- El responsable eliminó dos cuentas que habían solicitado eliminación. Las capturas
  mostraron ausencia de sus registros en las tablas revisadas: profiles, user_songs,
  user_lists, user_favorites, user_song_settings, user_roles, public_songs, public_lists,
  public_list_comments, live_sessions y catalog_archived_songs. user_follows estaba vacía.
- En Storage se observó únicamente el bucket avatars. Se eliminaron dos imágenes
  pendientes de una cuenta y se comprobó su carpeta vacía; no se encontró carpeta de
  la otra cuenta en la raíz. No se observó un bucket song-pdfs en ese proyecto.
- El responsable guardó un registro privado de las solicitudes en Google Sheets.
  Este documento no incluye los identificadores de las cuentas eliminadas.
- Se generó un AAB de release firmado y se verificó su firma. No se ha subido a Play.
- El responsable confirmó funcionamiento del micrófono y PDF en el APK actualizado.
  Las capturas posteriores mostraron el permiso en «No permitir» en Android y el
  mensaje de micrófono no autorizado tanto en el afinador como en la medición del
  rango vocal. También se observó el diálogo nativo de solicitud del permiso.
  El responsable confirmó que una canción abre con el permiso denegado y que el
  afinador y el rango vocal vuelven a detectar notas al conceder nuevamente el
  permiso. No se probó revocación durante una captura de audio activa.
- La prueba de importación detectó que el escáner enviaba PDF directamente al OCR
  de imágenes. Se corrigió para leer texto del PDF y renderizar páginas sin texto
  antes del OCR. La extracción del PDF adjunto de dos páginas se verificó localmente,
  incluyendo acordes B y F#. Tras el despliegue, el responsable confirmó en la web
  la importación del PDF con texto y el procesamiento de acordes. También confirmó
  que cancelar el selector sin elegir archivo conserva el texto y permite seguir
  usando la aplicación en la web. Falta probar esta corrección en el teléfono y PDF
  de páginas escaneadas.
  No dar estas pruebas pendientes por aprobadas.

Estas comprobaciones cubren los datos mostrados en producción. No sustituyen un ensayo
con una cuenta de prueba que ejercite PDF, seguimiento y demás funciones, ni verifican
la retención de backups o logs externos.

## Procedimiento operativo de eliminación

1. Confirmar la solicitud con el correo asociado a la cuenta. No solicitar contraseñas.
2. Resolver el UUID exacto en Supabase Authentication. Nunca buscar y borrar solo por nombre.
3. Revisar el esquema real de producción y todas las relaciones de ese UUID. El repositorio
   no documenta todas las tablas iniciales; no asumir que borrar auth.users borra todo.
4. Eliminar archivos mediante la API/UI de Storage: carpeta del UUID en `avatars` y
   `song-pdfs`, incluyendo subcarpetas. No borrar filas de storage.objects con SQL.
5. Revisar y eliminar sus registros en profiles, user_follows (ambos lados), user_favorites,
   user_song_settings, user_lists, user_songs, song_attachments, public_songs,
   public_lists, seguidores de listas y roles. Revisar también sesiones y tablas añadidas.
   Resolver dependencias antes de borrar el usuario. `catalog_archived_songs.archived_by`
   referencia auth.users sin cascada: revisar esas filas si la cuenta era administrador.
6. Borrar el usuario de Authentication solo después de resolver archivos/dependencias.
7. Verificar que no queden datos asociados, registrar la finalización sin conservar
   una copia del contenido eliminado y confirmar al solicitante.
8. Explicar cualquier retención efectiva, los ciclos de backups del plan y registros
   del proveedor de pagos. La política no promete borrado inmediato de backups externos.

Antes del lanzamiento, hacer un ensayo con una cuenta de prueba que tenga foto, PDF,
favoritos, listas, canciones públicas y seguimiento. Definir plazo de respuesta y
conservación de registros con el responsable. No marcar eliminación operativa como
validada hasta completar ese ensayo.

## Inventario para el formulario Seguridad de los datos

Este inventario se deriva del código; no sustituye la revisión de producción y SDK.

| Dato | Uso observado | Destino |
| --- | --- | --- |
| Correo, nombre, identificador | Cuenta/autenticación/perfil | Supabase y Google al iniciar sesión |
| Foto opcional | Perfil público | Storage avatars |
| PDF, canciones, listas y favoritos | Biblioteca/sincronización/comunidad | Supabase |
| Ajustes de canción y metadatos de perfil | Personalización | Local y Supabase |
| Relaciones de seguimiento | Comunidad | Supabase |
| Consulta de video | Búsqueda | Vercel y YouTube Data API |
| Estado de canción, tono y sección | Sesiones compartidas | Realtime/Supabase y participantes |
| Voz / afinador | Análisis al activar la función | Dispositivo; no subida observada |
| Grabación de ensayo | Guardar/reproducir/exportar | localStorage del dispositivo |
| Dirección IP/registros técnicos | Servicio y límites de búsqueda | Infraestructura; validar retención |
| Datos de pagos | Donaciones | PayPal; revisar flujo y declaraciones |

Determinar categorías y distinción recopilación/compartición conforme a las definiciones
de Play; comprobar proveedores, configuración de registros y SDK antes de completar el
formulario. No declarar que la app no recopila datos ni que tiene cifrado de extremo a extremo.

## Permisos

Se agrega RECORD_AUDIO para funciones ya existentes. Capacitor solicita el permiso de
micrófono al ejecutar getUserMedia; no al arrancar la app. El micrófono es opcional
para la instalación. No se agregan permisos generales de almacenamiento ni cámara.
La selección de imagen/PDF utiliza el selector de archivos. Verificar el manifest
fusionado del AAB final y probar permitir, rechazar y revocar micrófono en un teléfono.

## Pendientes antes de envío

- Comprobar que el nombre y correo coincidan con la ficha del desarrollador.
- Ensayar solicitud/eliminación completa de la cuenta de prueba.
- Confirmar conservación de backups/logs y concretar procedimiento de respuesta.
- Probar micrófono, cámara/selector de archivos y audio local en Android real.
- Revisar derechos de canciones/contenido público, moderación y denuncias.
- Revisar donaciones PayPal y política de pagos antes de distribuir en Play.
- Revisar versión del AAB firmado, ficha, clasificación y pruebas exigidas por la cuenta.

Referencias: https://support.google.com/googleplay/android-developer/answer/13327111
y https://support.google.com/googleplay/android-developer/answer/10144311
