# Tutorial inicial

Guía de cuatro pasos: biblioteca, tonalidad/vistas, listas y sesión en vivo. Tiene Atrás, Siguiente, Omitir y Comenzar, y se puede repetir desde el perfil propio con Tutorial de uso. Es una guía introductoria; no crea canciones, listas ni sesiones de demostración.

El registro por correo inicializa `usage_tutorial_v1` en los metadatos de Supabase Auth. Así también funciona cuando el correo se confirma más tarde. Para cuentas OAuth recién creadas, el tutorial se ofrece si la primera visita ocurre dentro de diez minutos de su creación. Las cuentas anteriores pueden abrirlo manualmente desde Perfil. Invitados y visitantes sin cuenta no lo reciben.

Se guardan `step` (0–3) y `status` (active/completed/skipped) mediante `auth.updateUser`, sin tablas ni migraciones nuevas. Cada avance, retroceso, omisión y finalización se confirma antes de actualizar la guía. Se lee la cuenta con `getUser` al entrar para recuperar el avance entre dispositivos. Si falla la conexión se permite reintentar o cerrar temporalmente sin guardar; en ese caso el próximo acceso conserva el último estado confirmado.

La guía se muestra solo en Inicio, Perfil, Listas, Favoritos y Comunidad. En canciones, enlaces de unión y vistas en vivo se pospone hasta volver a una pantalla segura. Usa un diálogo con foco atrapado, cierre por Escape equivalente a Omitir, texto accesible y altura limitada con scroll para móviles.

Pruebas: validación del estado, avance/retroceso/finalización, reanudación, omisión/repetición, exclusión de cuentas completadas y rutas de canción, errores de guardado y cierre de sesión durante una petición. Pendiente probar registros por correo/OAuth y sincronización entre dispositivos contra Supabase real; las pruebas automatizadas simulan Auth.
