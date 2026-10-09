# Publicación Android

Estado: preparación de firma implementada; todavía no existe un AAB firmado para subir.
El identificador es `com.worshiptranspose.app`. Confirmarlo antes de la primera carga.

## Cuenta y primera clave

Walter publicará como persona, sin empresa. Crear una cuenta personal en Play Console,
completar la verificación que solicite Google y usar el nombre legal en esa verificación.
Correo de contacto de la app: `worshiptranspose@gmail.com`.

En Android Studio, usar Build > Generate Signed Bundle / APK > Android App Bundle.
Crear una clave de carga nueva si esta es la primera publicación. Guardar el keystore
fuera del repositorio y sus contraseñas en un gestor de contraseñas, con copia segura
del archivo. No compartir contraseñas, claves privadas ni capturas que las revelen.
Activar Play App Signing al configurar la primera publicación. La clave de carga
firma lo que enviamos; Google administra la firma de distribución.

## Compilar desde terminal

Usar JDK 21 y SDK 36 como se describe en android.md. Configurar en el entorno del
proceso las cuatro variables siguientes, sin escribir sus valores en archivos versionados:

- `ANDROID_UPLOAD_STORE_FILE`: ruta absoluta del keystore.
- `ANDROID_UPLOAD_STORE_PASSWORD`: contraseña del archivo.
- `ANDROID_UPLOAD_KEY_ALIAS`: alias de la clave de carga.
- `ANDROID_UPLOAD_KEY_PASSWORD`: contraseña de esa clave.

Desde la raíz del repositorio:

```powershell
npm.cmd run android:sync
./android/gradlew.bat -p android bundleRelease -PreleaseVersionCode=1 -PreleaseVersionName=1.0 --console=plain
```

Detenerse si falla cualquiera de los comandos. Salida:
`android/app/build/outputs/bundle/release/app-release.aab`.
Comprobar la firma con `jarsigner -verify` del JDK, confirmar el certificado de carga
y subir primero a pruebas internas. Cada actualización requiere un código mayor
que el ya usado en Play Console. La compilación release rechaza credenciales ausentes;
la compilación debug sigue usando su firma de pruebas. No se genera una clave automáticamente.

## Pendientes antes de producción

- Probar la eliminación completa con una cuenta de prueba: el correo recibido solo
  demuestra que se puede solicitar. Aplicar docs/play-store-privacy-review.md.
- Probar permisos de micrófono aceptados y denegados, archivos, navegación y recuperación de red.
- Completar Seguridad de los datos, clasificación de contenido, público objetivo y acceso
  de revisores según el comportamiento real. Revisar moderación del contenido público
  y derechos sobre las canciones publicadas.
- Preparar capturas reales, gráfico promocional y ficha. El icono 512 está en
  `artifacts/android-branding/play-store-icon.png`.
- Revisar PayPal: las aportaciones directas pueden estar exentas de Play Billing si
  el 100% va al creador y no conceden contenido, servicios o ventajas digitales.
  Confirmar el destino y condiciones del cobro antes de declarar que cumplen; no se
  ha eliminado ni aprobado este flujo para Play.
- Una cuenta personal nueva requiere una prueba cerrada con al menos 12 participantes
  inscritos continuamente durante 14 días antes de solicitar acceso a producción.
  Registrar uso, comentarios y correcciones; cumplir el plazo no garantiza aprobación.

Fuentes revisadas el 9 de octubre de 2026:

- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/10281818
- https://developer.android.com/studio/publish/app-signing

## Comando de publicación en Windows

Después de crear y respaldar la clave en Android Studio y configurar las cuatro variables ANDROID_UPLOAD_*, ejecutar:

./scripts/build-android-release.ps1 -VersionCode 1 -VersionName 1.0

El script comprueba credenciales, Java 21 y SDK, sincroniza la app, genera bundleRelease y verifica la firma con jarsigner. No crea claves, no muestra contraseñas y no sube el archivo a Google Play. La clave de carga aún está pendiente de creación por Walter.
