import { useState } from 'react';
import { LogIn, UserPlus, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onGuestMode?: () => void;
}

export const LoginForm = ({ onGuestMode }: LoginFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signInGuest, signUpGuest, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isAdminMode) {
        await signIn(adminEmail, password);
      } else {
        if (isLogin) {
          await signInGuest(phone);
        } else {
          await signUpGuest(fullName, phone, clientEmail || undefined, taxId || undefined);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-magic-black px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-magic-gold/30 overflow-hidden border-2 border-magic-gold/50">
          <div className="bg-gradient-to-r from-magic-gold to-magic-yellow p-6 sm:p-8 text-magic-black text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-magic-black/20 rounded-full mb-4 backdrop-blur-sm">
              {isAdminMode ? <Shield className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              {isAdminMode ? 'Acesso Admin' : isLogin ? 'Bem-vindo de volta' : 'Cria a tua conta'}
            </h2>
            <p className="text-sm sm:text-base text-magic-black/80">
              {isAdminMode
                ? 'Área restrita para administradores'
                : isLogin
                  ? 'Faz login para marcar o teu próximo serviço'
                  : 'Junta-te a nós e agenda o teu serviço'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4 sm:space-y-6">
            {isAdminMode ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-magic-gold mb-2">
                    Email Admin
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all text-white text-base"
                    placeholder="admin@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-magic-gold mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all text-white text-base"
                    placeholder="••••••••"
                  />
                </div>
              </>
            ) : (
              <>
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-magic-gold mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all text-white text-base"
                      placeholder="O teu nome"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-magic-gold mb-2">
                    Telemóvel *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all text-white text-base"
                    placeholder="+351 931 423 262"
                    pattern="[+]?[0-9]{9,15}"
                    title="Introduz um número de telemóvel válido (9-15 dígitos)"
                  />
                </div>

                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-magic-gold mb-2">
                        Email (opcional)
                      </label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all text-white text-base"
                        placeholder="exemplo@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-magic-gold mb-2">
                        NIF (opcional)
                      </label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all text-white text-base"
                        placeholder="123456789"
                        pattern="[0-9]{9}"
                        maxLength={9}
                        title="Introduz um NIF válido (9 dígitos)"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-900/20 border-2 border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-magic-gold to-magic-yellow text-magic-black py-3 sm:py-4 rounded-lg font-semibold hover:from-magic-yellow hover:to-magic-gold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-lg shadow-magic-gold/50"
            >
              {loading ? (
                'Aguarda...'
              ) : isAdminMode ? (
                <>
                  <Shield className="w-5 h-5" />
                  Entrar como Admin
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Criar Conta
                </>
              )}
            </button>

            {!isAdminMode && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setTaxId('');
                    setClientEmail('');
                    setFullName('');
                  }}
                  className="text-magic-gold hover:text-magic-yellow font-medium text-sm"
                >
                  {isLogin ? 'Não tens conta? Regista-te' : 'Já tens conta? Faz login'}
                </button>
              </div>
            )}

            <div className="text-center pt-4 border-t border-magic-gold/20 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(!isAdminMode);
                  setError('');
                  setAdminEmail('');
                  setClientEmail('');
                  setTaxId('');
                  setPassword('');
                  setPhone('');
                  setFullName('');
                }}
                className="text-gray-400 hover:text-magic-gold font-medium text-xs flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <Shield className="w-4 h-4" />
                {isAdminMode ? 'Voltar ao login de cliente' : 'Acesso Admin'}
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => onGuestMode?.()}
                  className="text-magic-yellow hover:text-magic-gold font-medium text-xs transition-colors"
                >
                  Continuar como convidado
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
