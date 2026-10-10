# Recuperación de contraseña

Autorizar estas URLs en Supabase → Authentication → URL Configuration → Redirect URLs:

- https://worshiptranspose.com/auth/restablecer
- com.worshiptranspose.app://auth/callback?recovery=1

No cambiar Site URL ni quitar el callback Google existente. La plantilla Reset Password debe usar ConfirmationURL (o un flujo equivalente ya configurado) para verificar el enlace; no enlazar solo a RedirectTo sin verificación.

Verificar SMTP real: el servicio predeterminado de Supabase tiene restricciones de destinatarios y límites; no dar correo productivo por probado sin recibirlo con una cuenta de prueba. No hacen falta migraciones SQL.

Prueba web y Android actualizado: solicitar recuperación desde login, recibir correo y abrirlo en el mismo dispositivo donde se solicitó (PKCE Android requiere el verificador de esa instalación), poner dos contraseñas iguales, guardar y comprobar acceso con la nueva. Probar enlace vencido/usado, error de envío, contraseñas diferentes y acceso Google previo. No compartir enlaces ni contraseñas en capturas. Regenerar APK/AAB después de sincronizar.

Fuente: https://supabase.com/docs/guides/auth/passwords y https://supabase.com/docs/guides/auth/redirect-urls
