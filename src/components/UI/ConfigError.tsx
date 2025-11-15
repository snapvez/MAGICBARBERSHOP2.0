import { AlertCircle } from 'lucide-react';

export const ConfigError = () => {
  return (
    <div className="min-h-screen bg-magic-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl shadow-2xl border-2 border-red-500/50 p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-red-500 text-center mb-4">
          Configuração Incompleta
        </h1>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-300 text-sm text-center">
            As variáveis de ambiente do Supabase não estão configuradas corretamente.
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <p className="text-gray-400 text-sm mb-3 font-semibold">
            Variáveis necessárias:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-magic-gold font-mono text-xs">•</span>
              <code className="text-xs text-magic-yellow font-mono">VITE_SUPABASE_URL</code>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-magic-gold font-mono text-xs">•</span>
              <code className="text-xs text-magic-yellow font-mono">VITE_SUPABASE_ANON_KEY</code>
            </li>
          </ul>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-xs leading-relaxed">
            <strong className="text-blue-400">No Netlify:</strong>
            <br />
            1. Vai a Site Settings → Environment Variables
            <br />
            2. Adiciona as variáveis acima
            <br />
            3. Faz redeploy do site
          </p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg font-semibold transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    </div>
  );
};
