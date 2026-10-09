# Búsqueda de YouTube en Vercel

Configurar `YOUTUBE_API_KEY` como variable privada en Production y Preview.
Restringirla a YouTube Data API v3. El cliente no utiliza `VITE_YOUTUBE_API_KEY`.
Desplegar este cambio y después instalar el APK actualizado.

La web consulta `/api/youtube-search?q=...` en su propio despliegue. Android consulta
`https://worshiptranspose.com/api/youtube-search?q=...`, permitiendo su origen
`https://localhost`. No necesita la clave durante la compilación.

El servicio devuelve título, canal, miniatura y enlace de hasta 12 videos insertables.
La duración no se solicita en esta versión. Conserva la selección y reproducción existentes.
Las consultas se guardan cinco minutos en la memoria de cada instancia; permite diez
consultas por minuto y dirección en esa instancia. Esto no constituye un límite global:
la cuota de Google sigue siendo el límite del proyecto. CORS tampoco autentica clientes.
Si aumenta el tráfico, configurar límites distribuidos o reglas de Firewall de Vercel.

La clave no aparece en resultados, errores ni registros del servicio. Los errores de
cuota permiten usar la alternativa de búsqueda externa. No hay fallback automático a Piped.

Validación tras desplegar: abrir el selector desde web y Android, buscar una canción,
seleccionar un resultado y comprobar reproducción. Un 503 significa que falta la variable
en ese despliegue; un 502 puede indicar clave/restricciones/API no habilitada; un 429
indica cuota o límite local. Cambiar variables requiere un nuevo despliegue.
