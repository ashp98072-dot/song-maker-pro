# Android: base de Capacitor (fase 2)

El proyecto usa Capacitor 8 y empaqueta la interfaz Vite en `dist-android`. No configura `server.url`: el arranque no descarga la interfaz de Vercel. Supabase sigue sirviendo usuarios y datos; Vercel conserva la web y endpoints SEO.

## Preparación local

1. Instalar Node 22 o superior, Android Studio 2025.2.1 o superior, SDK Android 36 y JDK 21. Comprobar la versión de Java: Android Studio reciente puede incluir un JDK más nuevo e incompatible con este Gradle. Confirmar las versiones requeridas por Capacitor al actualizar dependencias.
2. Ejecutar `npm ci` desde la raíz del repositorio.
3. Configurar `.env.local` con las variables públicas de Supabase del proyecto. Consultar `.env.example`. No incluir claves `service_role`, contraseñas, certificados ni secretos administrativos. Las variables `VITE_*` terminan dentro del cliente.
4. Ejecutar `npm run android:sync`: genera iconos PWA, comprueba tipos, compila la interfaz y copia recursos/plugins a Android.
5. Ejecutar `npm run android:open`, esperar la sincronización Gradle y seleccionar un teléfono o emulador. Usar Run para instalar una versión de depuración.

En la configuración de Gradle de Android Studio, seleccionar también JDK 21. El script PowerShell configura Java solo para su proceso; no cambia el JDK seleccionado por el IDE. Si se usa el JDK portátil de esta máquina, está en `../.android-tools/jdk21/` dentro de su carpeta de versión.

### APK de prueba desde PowerShell

Con las herramientas instaladas, ejecutar `./scripts/build-android-debug.ps1`. Busca un JDK 21 portátil en `../.android-tools/jdk21`, después `JAVA_HOME` y finalmente Java de Android Studio. Valida que sea Java 21: versiones recientes de Android Studio pueden incluir Java 25, incompatible con el Gradle actual. Se pueden indicar `-JdkPath` y `-SdkPath` si están en otras carpetas. No cambia las variables del sistema permanentemente. Primero compila/sincroniza la interfaz y después ejecuta Gradle; el resultado es `android/app/build/outputs/apk/debug/app-debug.apk`.

Si falta Android SDK Platform 36, instalarlo desde Tools > SDK Manager > SDK Platforms en Android Studio. Aceptar las licencias que muestre el instalador. No sustituir el target SDK por una versión distinta para evitar esa instalación.

El botón Atrás de Android cierra primero diálogos/menús y pantalla completa, después recorre el historial interno y, sin historial, minimiza. El comportamiento con teclado virtual y gestos se debe verificar en dispositivo. El acceso Google sigue pendiente de adaptar a navegador del sistema y retorno a la app.

La compilación Android verifica la URL y clave pública Supabase antes de generar recursos. Rechaza JWT con rol administrativo o de otro proyecto. `.env.local` está ignorado por Git. Cambiar estas variables requiere recompilar el APK; editar canciones en Supabase no requiere recompilar.

### Primera prueba en teléfono

1. Transferir `app-debug.apk` al teléfono, abrirlo y autorizar la instalación desde esa fuente si Android lo solicita. Es un instalador de depuración para pruebas, no el paquete de Play Store.
2. Entrar como invitado o con correo y contraseña. El retorno de Google todavía no está adaptado a Android.
3. Abrir una canción, transponer y cambiar entre letra/acordes. Probar Atrás desde pantalla completa, desde un diálogo, desde una canción y desde el inicio.
4. Cambiar a otra aplicación y regresar. Desconectar/reconectar Internet y comprobar el catálogo. Sin conexión, solo se debe esperar acceso a los datos ya guardados; no prometer catálogo completo recién instalado.
5. Probar cierre y reapertura y registrar modelo de teléfono, versión Android y pasos de cualquier bloqueo. No compartir contraseñas, tokens ni claves al reportar problemas.

Las funciones de micrófono, archivos y acceso Google aún no forman parte de esta validación inicial. La fase 2 se cierra después de comprobar arranque y navegación en un dispositivo; un APK compilado por sí solo no completa esa prueba.

La compilación web sigue usando `npm run build` y `dist`; no cambiar la configuración de Vercel. No ejecutar `cap add android` otra vez: el proyecto nativo ya está versionado. Después de cambios en la interfaz, ejecutar `android:sync` antes de volver a compilar Android.

## Estado de esta entrega

Validación local del 8 de octubre de 2026: 321 pruebas de aplicación y 3 pruebas de configuración aprobadas, lint/typecheck y compilación web correctos. `assembleDebug` terminó con JDK 21 y SDK 36; se verificaron firma APK v2, identificador, SDK objetivo y presencia de la configuración pública Supabase dentro del paquete. No había dispositivos conectados, por lo que el arranque real sigue pendiente.

- Identificador inicial: `com.worshiptranspose.app`. Confirmarlo antes de publicar; Play Store no permite cambiarlo para una app existente.
- Nombre: Worship Transpose. Versión inicial de plantilla: 1.0, código 1.
- `compileSdk` y `targetSdk`: 36; mínimo de la plantilla: 24.
- No registra el service worker de la PWA dentro de Android.
- Eventos nativos de reanudación y reconexión activan el refresco del catálogo.
- Copias de seguridad automáticas Android desactivadas para no respaldar la sesión web local. Archivos generados, SDK local y claves de firma excluidos de Git.

## Aún no es una versión publicable

Pendiente: validar el APK en un teléfono; adaptar OAuth/retorno Google, micrófono y archivos; verificar el botón Atrás con gestos y teclado; revisar iconos y pantalla inicial definitivos, enlaces externos y donaciones, almacenamiento/caché y políticas. No se han añadido permisos de micrófono hasta completar su flujo de autorización. El proyecto conserva los recursos visuales iniciales de la plantilla Android para esta primera prueba.

La clave de firma de producción se generará y resguardará en la fase de publicación. No usar ni publicar la firma de depuración como firma definitiva. Cada actualización Android necesita un `versionCode` mayor y otro paquete firmado; un despliegue web no sustituye los recursos de una instalación Android.

Requisitos de Capacitor: https://capacitorjs.com/docs/getting-started/environment-setup
Flujo de trabajo: https://capacitorjs.com/docs/basics/workflow
# Acceso con Google en Android

En Supabase → Authentication → URL Configuration → Redirect URLs, añadir exactamente
`com.worshiptranspose.app://auth/callback`. Conservar los retornos web existentes.
No cambiar el callback de Google Cloud: Google vuelve a Supabase y Supabase devuelve
el código a la app. Android utiliza PKCE y conserva el verificador en su almacenamiento.

Instalar el APK nuevo y empezar un acceso nuevo desde la app. El navegador seguro
se abre para elegir la cuenta y el enlace devuelve el control a Android. No reutilizar
un enlace antiguo con `bad_oauth_state`. Probar éxito, cancelación y reintento tanto
con la app abierta como después de cerrarla. La configuración remota y el acceso
con una cuenta real requieren verificación antes de dar este flujo por terminado.
