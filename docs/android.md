# Android: base de Capacitor (fase 2)

El proyecto usa Capacitor 8 y empaqueta la interfaz Vite en `dist-android`. No configura `server.url`: el arranque no descarga la interfaz de Vercel. Supabase sigue sirviendo usuarios y datos; Vercel conserva la web y endpoints SEO.

## Preparación local

1. Instalar Node 22 o superior, Android Studio 2025.2.1 o superior, SDK Android 36 y JDK 21 (incluido con Android Studio). Confirmar las versiones requeridas por Capacitor al actualizar dependencias.
2. Ejecutar `npm ci` desde la raíz del repositorio.
3. Configurar `.env.local` con las variables públicas de Supabase del proyecto. Consultar `.env.example`. No incluir claves `service_role`, contraseñas, certificados ni secretos administrativos. Las variables `VITE_*` terminan dentro del cliente.
4. Ejecutar `npm run android:sync`: genera iconos PWA, comprueba tipos, compila la interfaz y copia recursos/plugins a Android.
5. Ejecutar `npm run android:open`, esperar la sincronización Gradle y seleccionar un teléfono o emulador. Usar Run para instalar una versión de depuración.

La compilación web sigue usando `npm run build` y `dist`; no cambiar la configuración de Vercel. No ejecutar `cap add android` otra vez: el proyecto nativo ya está versionado. Después de cambios en la interfaz, ejecutar `android:sync` antes de volver a compilar Android.

## Estado de esta entrega

- Identificador inicial: `com.worshiptranspose.app`. Confirmarlo antes de publicar; Play Store no permite cambiarlo para una app existente.
- Nombre: Worship Transpose. Versión inicial de plantilla: 1.0, código 1.
- `compileSdk` y `targetSdk`: 36; mínimo de la plantilla: 24.
- No registra el service worker de la PWA dentro de Android.
- Eventos nativos de reanudación y reconexión activan el refresco del catálogo.
- Copias de seguridad automáticas Android desactivadas para no respaldar la sesión web local. Archivos generados, SDK local y claves de firma excluidos de Git.

## Aún no es una versión publicable

Pendiente: compilar APK con Gradle y probar un teléfono; adaptar OAuth/retorno Google, botón Atrás, micrófono y archivos; revisar iconos y pantalla inicial definitivos, enlaces externos y donaciones, almacenamiento/caché y políticas. No se han añadido permisos de micrófono hasta completar su flujo de autorización. El proyecto conserva los recursos visuales iniciales de la plantilla Android para esta primera prueba.

La clave de firma de producción se generará y resguardará en la fase de publicación. No usar ni publicar la firma de depuración como firma definitiva. Cada actualización Android necesita un `versionCode` mayor y otro paquete firmado; un despliegue web no sustituye los recursos de una instalación Android.

Requisitos de Capacitor: https://capacitorjs.com/docs/getting-started/environment-setup
Flujo de trabajo: https://capacitorjs.com/docs/basics/workflow
