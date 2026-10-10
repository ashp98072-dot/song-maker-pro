# Moderación de Comunidad

Incluye reportes de cantos, cadenas, comentarios y usuarios; bloqueo mutuo de visibilidad e interacciones; reglas con aceptación explícita registrada por cuenta; panel `/admin/comunidad` para retirar/restaurar contenido y suspender/restablecer participación pública. No incluye mensajería privada.

## Activación

1. Ejecutar `supabase/migrations/20261010120000_community_moderation.sql` en el SQL Editor de Supabase. La migración se ejecuta en una transacción. No repetirla después de aplicarla correctamente.
2. Fusionar y desplegar la web. Reconstruir APK/AAB; los clientes Android anteriores no tienen los botones ni el diálogo y no podrán publicar hasta actualizarse y aceptar las reglas.
3. El administrador debe aceptar las reglas al publicar, corregir un canto o abrir su propio perfil. Los perfiles son públicos después de aceptar las reglas; cada titular puede seguir viendo su propio perfil.
4. Entrar a Comunidad → Revisar reportes, o Perfil → Moderación de Comunidad, con la cuenta administradora.

## Operación

Revisar regularmente el panel; los reportes no envían correos ni notificaciones automáticas. Consultar la evidencia antes de decidir. Una retirada se aplica al contenido con el mismo ID, incluso dentro de cadenas públicas; si una cadena contiene un canto retirado, se oculta completa hasta que el canto se restaure. La suspensión oculta el contenido público de su autor y deniega nuevas publicaciones y cambios de perfil/foto. No elimina su cuenta ni su biblioteca privada.

El bloqueo elimina el seguimiento entre ambas cuentas; desbloquear no lo restaura. Se aplica en el servidor a lecturas e interacciones, y la app actualiza sus vistas tras la acción. No borra copias independientes ni impide ver contenido público sin iniciar sesión. Los dispositivos desconectados pueden conservar copias descargadas.

Los reportes son privados para el administrador e incluyen el motivo, detalles y una copia del contenido. Se evita duplicar un reporte pendiente de la misma persona para el mismo objeto; máximo 20 reportes/día y 20 comentarios/hora. No son mecanismos automáticos de retirada: un administrador decide. Las copias de evidencia están vinculadas a las cuentas y se eliminan al borrar al denunciante o al autor reportado. Los reportes cerrados sin medidas activas se depuran al consultar el panel una vez pasados 90 días; los que sostienen medidas activas permanecen para permitir restaurarlas.

## Prueba con cuentas de prueba

- Cuenta A publica un canto/cadena/comentario tras aceptar reglas. Cancelar las reglas no debe publicar.
- Cuenta B reporta el contenido. Cancelar el formulario no envía nada; reportar dos veces debe conservar un solo reporte pendiente.
- B bloquea A: no ve su contenido, no puede seguirla y A no puede comentar en las cadenas de B. Desbloquear desde Comunidad → Reglas y usuarios bloqueados.
- Administrador revisa, retira y comprueba desde B y como invitado que desapareció; restaurar y comprobar que vuelve. Suspender A y comprobar que no puede publicar, luego quitar suspensión.
- Una cuenta común no puede abrir la cola ni ejecutar acciones administrativas. No usar cuentas reales para estas pruebas destructivas de contenido.

## Verificación técnica

`scripts/test-community-moderation.mjs` usa PostgreSQL en memoria con `@electric-sql/pglite`, instalado fuera del proyecto. Establecer `PGLITE_MODULE_PATH` a la URL `file:///.../node_modules/@electric-sql/pglite/dist/index.js` y ejecutar `node scripts/test-community-moderation.mjs`. No usa credenciales ni modifica Supabase. Los esquemas de autenticación y almacenamiento son fixtures mínimos; el SQL de canciones/cadenas/SEO y la migración de moderación se ejecutan realmente.

La política de contenido de usuarios de Google Play pide reglas, moderación y opciones de reporte/bloqueo: https://support.google.com/googleplay/android-developer/answer/9876937 . La implementación y estas pruebas no garantizan aprobación; queda la prueba real con dos cuentas después del despliegue.
