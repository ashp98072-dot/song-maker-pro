# Borrador de Seguridad de los datos y aportaciones

Revisión de código y fuentes oficiales: 10 de octubre de 2026. Borrador para
revisión del responsable; no se ha enviado ningún formulario a Play Console.

## Aportaciones PayPal

DonatePage ofrece importes sugeridos y personalizados, crea una orden PayPal y
captura el pago. No se observó que esa página otorgue funciones o contenido tras
el pago. El destinatario real depende de la configuración de la cuenta PayPal;
no se deduce de la interfaz. El 10 de octubre de 2026 el responsable confirmó que
las aportaciones llegan a su cuenta como creador, son voluntarias y no otorgan
funciones, contenido, insignias ni ventajas. No se realizó una transacción ni se
verificaron la liquidación o las comisiones de PayPal.

Google contempla una excepción para aportaciones directas a creadores si el
creador recibe el 100 % y el pago no da acceso a contenido ni servicios digitales,
incluidas insignias. No confundir esta excepción con donaciones benéficas exentas
de impuestos. No marcar el flujo como validado antes de confirmar las condiciones.

Fuente: https://support.google.com/googleplay/android-developer/answer/10281818?hl=es

## Inventario provisional

| Categoría candidata en Play | Evidencia / finalidad | Pendiente |
| --- | --- | --- |
| Información personal: nombre, correo, ID de usuario | Autenticación y perfil en Supabase; acceso con Google opcional | Revisar todos los métodos de alta y campos reales |
| Fotos | Foto de perfil opcional subida a avatars | Confirmar tratamiento público y proveedores |
| Archivos y documentos | PDF adjuntos y contenido de biblioteca sincronizado | Distinguir adjunto subido de PDF leído localmente por el escáner |
| Otro contenido generado por usuarios | Canciones, listas, comentarios, perfil público y reportes con copia del contenido | Revisar categorías del formulario y visibilidad por función |
| Actividad en la app | Favoritos, seguimiento, bloqueos, aceptación de reglas, búsquedas de videos y sesiones compartidas | Determinar categorías exactas, retención y compartición |
| Información financiera / historial de compras | SDK PayPal y aportaciones opcionales | Revisar datos enviados por el SDK; no afirmar ausencia por no guardar tarjetas |
| Identificadores / datos técnicos | Servicios Google, YouTube, Supabase, Vercel y PayPal | Comprobar SDK, registros y configuración efectiva |
| Audio | Afinador y rango vocal analizados localmente; ensayo guardado localmente | No contar procesamiento exclusivamente local como recopilación; revisar servicios externos por separado |

La recopilación incluye datos enviados fuera del dispositivo por SDK o WebViews.
Las excepciones a compartición dependen de la relación con cada proveedor y de la
acción del usuario; no marcar automáticamente todo proveedor como compartición.
Las categorías anteriores son candidatas, no respuestas definitivas.

Fuente: https://support.google.com/googleplay/android-developer/answer/10787469?hl=es

## Confirmaciones antes de enviar

- El 10 de octubre de 2026 el responsable confirmó recepción de mensajes y envío
  de respuestas desde worshiptranspose@gmail.com.
- Destinatario y ausencia de ventajas confirmados por el responsable; comprobar
  configuración real y liquidación PayPal antes de dar la prueba de pago por completada.
- Configuración y retención de logs/backups revisadas por proveedor.
- Datos de SDK y reproducción YouTube revisados además del código propio.
- Revisar cifrado de todas las transferencias; HTTPS no equivale a cifrado de extremo a extremo.
- Política de privacidad y URL de eliminación accesibles y coherentes con el formulario.
- Plazo confirmado: eliminación dentro de 7 días naturales desde la verificación
  del titular, con confirmación por correo. Falta definir conservación del registro mínimo.

Las pruebas de lectura de PDF con texto, escaneado y cancelación en web/APK fueron
confirmadas por el responsable. El AAB actualizado fue verificado con la misma firma
de subida y contiene los archivos del lector PDF.
