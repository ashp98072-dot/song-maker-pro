import { Link } from 'react-router-dom';

export const PRIVACY_CONTACT = 'worshiptranspose@gmail.com';

export default function PrivacyPage() {
  return <article className="container max-w-3xl px-4 py-8 space-y-5">
    <h1 className="text-2xl font-bold">Política de privacidad de Worship Transpose</h1>
    <p>Actualizada el 10 de octubre de 2026. Responsable: Walter Villagran.
      Contacto: <a className="text-gold underline" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.</p>
    <h2 className="text-xl font-semibold">Cuenta y biblioteca</h2>
    <p>Para crear una cuenta utilizamos tu correo, identificador de usuario y nombre de perfil.
      Si accedes con Google, recibimos los datos de perfil autorizados por ese servicio.
      Supabase gestiona la autenticación. Guardamos tu perfil, foto opcional, canciones,
      listas, favoritos, ajustes y archivos PDF que subas para sincronizarlos entre dispositivos.</p>
    <h2 className="text-xl font-semibold">Contenido público y sesiones</h2>
    <p>Tu perfil y las canciones o listas que publiques en Comunidad pueden ser visibles para otros usuarios.
      En las sesiones compartimos la canción, el tono y los ajustes necesarios con los participantes.
      No publiques datos personales dentro de letras o archivos que quieras compartir.</p>
    <h2 className="text-xl font-semibold">Micrófono y archivos del dispositivo</h2>
    <p>El afinador y la prueba de voz analizan audio en tu dispositivo cuando activas la función.
      No enviamos ese audio al servidor. Las grabaciones de ensayo se guardan localmente y puedes
      borrarlas o descargarlas. Los archivos que selecciones para importar se leen para crear
      canciones; las fotos de perfil y PDF adjuntos sí se suben al almacenamiento de Supabase.</p>
    <h2 className="text-xl font-semibold">Servicios externos</h2>
    <p>Vercel aloja la web y procesa las búsquedas de videos. El texto de búsqueda se envía a la API de
      YouTube de Google; reproducir un video conecta con YouTube. Google y estos proveedores pueden
      procesar datos técnicos como dirección IP y registros de acceso. PayPal procesa las donaciones;
      no guardamos datos de tarjetas. Estos servicios tienen sus propias políticas de privacidad.</p>
    <p><a className="text-gold underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacidad de Google</a>{' · '}
      <a className="text-gold underline" href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">Condiciones de YouTube</a></p>
    <h2 className="text-xl font-semibold">Conservación y eliminación</h2>
    <p>Conservamos los datos de tu cuenta mientras utilizas el servicio o hasta que solicites eliminarlos.
      La solicitud se tramita manualmente y completamos la eliminación dentro de 7 días naturales
      desde que verificamos que eres titular de la cuenta.
      Incluye el perfil, biblioteca personal, favoritos, listas, ajustes, relaciones de seguimiento
      y archivos subidos asociados. Los archivos que descargaste y copias en otros dispositivos
      deben borrarse allí; las copias de seguridad y registros de los proveedores pueden persistir
      conforme a sus ciclos de conservación. Los registros de pagos los gestiona PayPal.</p>
    <p>Para consultar, corregir o solicitar la eliminación de tus datos, escribe al correo de contacto.
      Nunca envíes tu contraseña. Puedes usar el servicio como invitado sin crear una cuenta.</p>
    <Link className="text-gold underline block" to="/eliminar-cuenta">Solicitar eliminación de cuenta y datos</Link>
  </article>;
}
