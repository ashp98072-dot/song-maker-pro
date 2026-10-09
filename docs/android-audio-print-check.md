# Verificación de micrófono e impresión Android

Fallo informado en teléfono el 9 de octubre de 2026: RECORD_AUDIO concedido,
pero afinador/test vocal no iniciaban; imprimir abría HTML sin guardar PDF.

Correcciones:

- Declarar MODIFY_AUDIO_SETTINGS además de RECORD_AUDIO. El WebChromeClient de
  Capacitor 8 solicita ambos para AUDIO_CAPTURE y deniega la petición web si falta
  cualquiera. Se conserva su implementación, sin conceder permisos indiscriminadamente.
- Reanudar AudioContext, conservar referencias antes de inicializar el analizador
  y liberar el flujo si falla la inicialización o se cierra la herramienta.
- Mostrar errores distintos para permiso rechazado, dispositivo ocupado y ausencia
  de micrófono; mensajes adecuados al APK o navegador.
- Imprimir HTML local mediante PrintManager y un WebView dedicado, sin JavaScript,
  archivos ni red. Mantenerlo hasta terminar/cancelar el diálogo y liberarlo después.
  La app no afirma que el archivo se guardó cuando solo se abrió el selector.
- Escapar título, artista y tono al construir HTML. Conservar el flujo web.

Instalar el APK corregido sobre el anterior (misma firma de pruebas). No es necesario
borrar datos ni desinstalar para actualizar.

Pruebas pendientes en teléfono:

1. Afinador: activar, aceptar permiso si se solicita y tocar una cuerda. Comprobar
   lectura, detener y verificar que el indicador de micrófono desaparece.
2. Test vocal: capturar grave/agudo, detener y regresar a otra pantalla.
3. Rechazar/revocar permiso desde Android: mostrar mensaje recuperable y volver a
   funcionar después de autorizarlo. Si falla con permiso concedido, registrar el
   nuevo mensaje y comprobar el interruptor global de micrófono del dispositivo.
4. Imprimir una canción: debe abrir el diálogo Android. Elegir Guardar como PDF,
   seleccionar carpeta y guardar; abrir el PDF y comprobar tono, texto y páginas.
5. Cancelar impresión y repetir; probar una canción larga y vista de solo letra.

La compilación y firma del APK no confirman resultados en un dispositivo real.
Documentación del flujo de impresión:
https://developer.android.com/training/printing/html-docs
