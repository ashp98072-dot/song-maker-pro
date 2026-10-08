# Android: base de Capacitor (fase 2)

El proyecto usa Capacitor 8 y empaqueta la interfaz Vite en `dist-android`. No configura `server.url`: el arranque no descarga la interfaz de Vercel. Supabase sigue sirviendo usuarios y datos; Vercel conserva la web y endpoints SEO.

## Preparación local

1. Instalar Node 22 o superior, Android Studio 2025.2.1 o superior, SDK Android 36 y JDK 21. Comprobar la versión de Java: Android Studio reciente puede incluir un JDK más nuevo e incompatible con este Gradle. Confirmar las versiones requeridas por Capacitor al actualizar dependencias.
2. Ejecutar `npm ci` desde la raíz del repositorio.
3. Configurar `.env.local` con las variables públicas de Supabase del proyecto. Consultar `.env.example`. No incluir claves `service_role`, contraseñas, certificados ni secretos administrativos. Las variables `VITE_*` terminan dentro del cliente.
4. Ejecutar `npm run android:sync`: genera iconos PWA, comprueba tipos, compila la interfaz y copia recursos/plugins a Android.
5. Ejecutar `npm run android:open`, esperar la sincronización Gradle y seleccionar un teléfono o emulador. Usar Run para instalar una versión de depuración.

### APK de prueba desde PowerShell

Con las herramientas instaladas, ejecutar `./scripts/build-android-debug.ps1`. Busca un JDK 21 portátil en `../.android-tools/jdk21`, después `JAVA_HOME` y finalmente Java de Android Studio. Valida que sea Java 21: versiones recientes de Android Studio pueden incluir Java 25, incompatible con el Gradle actual. Se pueden indicar `-JdkPath` y `-SdkPath` si están en otras carpetas. No cambia las variables del sistema permanentemente. Primero compila/sincroniza la interfaz y después ejecuta Gradle; el resultado es `android/app/build/outputs/apk/debug/app-debug.apk`.

Si falta Android SDK Platform 36, instalarlo desde Tools > SDK Manager > SDK Platforms en Android Studio. Aceptar las licencias que muestre el instalador. No sustituir el target SDK por una versión distinta para evitar esa instalación.

El botón Atrás de Android cierra primero diálogos/menús y pantalla completa, después recorre el historial interno y, sin historial, minimiza. El comportamiento con teclado virtual y gestos se debe verificar en dispositivo. El acceso Google sigue pendiente de adaptar a navegador del sistema y retorno a la app.

La compilación Android verifica la URL y clave pública Supabase antes de generar recursos. Rechaza JWT con rol administrativo o de otro proyecto. `.env.local` está ignorado por Git. Cambiar estas variables requiere recompilar el APK; editar canciones en Supabase no requiere recompilar.

La compilación web sigue usando `npm run build` y `dist`; no cambiar la configuración de Vercel. No ejecutar `cap add android` otra vez: el proyecto nativo ya está versionado. Después de cambios en la interfaz, ejecutar `android:sync` antes de volver a compilar Android.

## Estado de esta entrega

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
