import { RazorMark } from '@/components/brand/Logo';

/** Se muestra si faltan las variables de entorno de Supabase */
export function SetupNotice() {
  return (
    <div className="grid min-h-dvh place-items-center bg-onyx-900 px-6 text-bone-50">
      <div className="max-w-lg">
        <RazorMark className="size-10 text-gold-400" />
        <h1 className="display mt-6 text-6xl">Falta conectar Supabase</h1>
        <p className="mt-4 text-bone-100/75">
          Crea el archivo <code className="rounded-xs bg-onyx-950 px-1.5 py-0.5 text-gold-300">.env</code> a partir de{' '}
          <code className="rounded-xs bg-onyx-950 px-1.5 py-0.5 text-gold-300">.env.example</code> con la URL del proyecto y la llave
          pública, y vuelve a iniciar el servidor.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-md bg-onyx-950 p-4 text-sm text-bone-100/85">
          {`VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<llave publishable o anon>`}
        </pre>
      </div>
    </div>
  );
}
