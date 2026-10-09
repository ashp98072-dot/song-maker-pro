import { Link } from 'react-router-dom';
import { PRIVACY_CONTACT } from './PrivacyPage';

export default function DeleteAccountPage() {
  const subject = encodeURIComponent('Eliminar mi cuenta de Worship Transpose');
  const body = encodeURIComponent('Solicito eliminar mi cuenta de Worship Transpose y los datos asociados.\n\nCorreo de mi cuenta: \nNombre de perfil: \n');
  return <article className="container max-w-3xl px-4 py-8 space-y-5">
    <h1 className="text-2xl font-bold">Eliminar cuenta de Worship Transpose</h1>
    <p>Puedes solicitar la eliminación desde esta página sin instalar la app ni iniciar sesión.
      Walter Villagran recibe las solicitudes en <a className="text-gold underline" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>.</p>
    <ol className="list-decimal pl-6 space-y-2">
      <li>Envía un correo desde la dirección vinculada a tu cuenta, indicando que deseas eliminarla y tu nombre de perfil.</li>
      <li>Verificaremos que eres titular de la cuenta. Si usas otro correo, coordinaremos la verificación antes de borrar los datos.</li>
      <li>Te confirmaremos la eliminación por correo una vez completada. Preparar el correo no envía la solicitud ni elimina datos.</li>
    </ol>
    <p>Se eliminarán tu cuenta, perfil, canciones y listas asociadas, favoritos, ajustes,
      relaciones de seguimiento y fotos/PDF subidos. Exporta antes la biblioteca que quieras conservar.
      Las descargas o copias en otros dispositivos deben borrarse allí. Los registros y copias de
      seguridad de proveedores pueden permanecer según sus políticas; PayPal conserva sus registros de pagos.</p>
    <a className="inline-block rounded-xl bg-gold text-black px-5 py-3 font-semibold" href={`mailto:${PRIVACY_CONTACT}?subject=${subject}&body=${body}`}>Preparar correo de eliminación</a>
    <p>Si no tienes una aplicación de correo configurada, copia la dirección y envía el mensaje desde tu servicio de correo.
      No envíes contraseñas ni documentos de identidad en el primer mensaje.</p>
    <Link className="block text-gold underline" to="/privacidad">Leer política de privacidad</Link>
  </article>;
}
