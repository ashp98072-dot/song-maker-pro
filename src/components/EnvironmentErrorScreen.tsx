export interface EnvironmentErrorScreenProps {
  missing: string[];
}

export default function EnvironmentErrorScreen({ missing }: EnvironmentErrorScreenProps) {
  const isDev = import.meta.env.DEV;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b1220',
        color: '#e2e8f0',
        padding: '2.5rem 1.5rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Configuración incompleta
        </h1>
        <p style={{ opacity: 0.85, lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Faltan variables de entorno necesarias para iniciar la app.
        </p>

        <ul
          style={{
            listStyle: 'disc',
            paddingLeft: '1.25rem',
            marginBottom: '1.5rem',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.9rem',
          }}
        >
          {missing.map((name) => (
            <li key={name} style={{ marginBottom: '0.35rem' }}>
              {name}
            </li>
          ))}
        </ul>

        {missing.includes('VITE_SUPABASE_ANON_KEY') && (
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '1.25rem' }}>
            Alias aceptado: <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
          </p>
        )}

        {isDev ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              fontSize: '0.875rem',
              lineHeight: 1.7,
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>En desarrollo:</p>
            <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
              <li>Crear <code>.env.local</code> en la raíz del proyecto</li>
              <li>
                Añadir <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (desde
                el dashboard de Supabase → Settings → API)
              </li>
              <li>Reiniciar <code>npm run dev</code></li>
            </ol>
            <p style={{ marginTop: '0.75rem', opacity: 0.75 }}>
              Copia la plantilla desde <code>.env.example</code>.
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '0.875rem', opacity: 0.75 }}>
            Contacta al administrador del despliegue para configurar las variables en el hosting.
          </p>
        )}
      </div>
    </div>
  );
}
