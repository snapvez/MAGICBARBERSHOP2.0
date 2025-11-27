import { Phone, LogIn, LogOut, Shield, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Header = ({ onNavigate, currentPage }: HeaderProps) => {
  const { user, isAdmin, isBarber, profile, signOut } = useAuth();
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('MAGIC BARBERSHOP');

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const { data } = await supabase
        .from('site_branding')
        .select('logo_url, site_name')
        .limit(1)
        .maybeSingle();

      if (data) {
        if (data.logo_url) setLogoUrl(data.logo_url);
        if (data.site_name) setSiteName(data.site_name.toUpperCase());
      }
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onNavigate('home');
  };

  return (
    <header className="bg-magic-black shadow-2xl sticky top-0 z-30 border-b-2 border-magic-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24 md:h-28">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${siteName} Logo`}
                className="h-[52px] sm:h-[72px] md:h-[83px] w-auto object-contain"
              />
            ) : (
              <div className="h-[52px] sm:h-[72px] md:h-[83px] w-[52px] sm:w-[72px] md:w-[83px] bg-gradient-to-br from-magic-gold to-magic-yellow rounded-lg flex items-center justify-center">
                <span className="text-magic-black font-bold text-2xl sm:text-4xl">
                  {siteName.charAt(0)}
                </span>
              </div>
            )}
            <div className="text-left">
              <h1 className="text-sm sm:text-xl md:text-2xl font-bold text-magic-gold tracking-wide">{siteName}</h1>
              <p className="text-[9px] sm:text-xs text-magic-yellow uppercase tracking-widest">Na Régua Como Deve Ser</p>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => onNavigate('home')}
              className={`px-4 lg:px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                currentPage === 'home'
                  ? 'bg-magic-gold text-magic-black shadow-md shadow-magic-gold/50'
                  : 'text-magic-yellow hover:bg-magic-gold/10'
              }`}
            >
              Início
            </button>
            <button
              onClick={() => onNavigate('booking')}
              className={`px-4 lg:px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                currentPage === 'booking'
                  ? 'bg-magic-gold text-magic-black shadow-md shadow-magic-gold/50'
                  : 'text-magic-yellow hover:bg-magic-gold/10'
              }`}
            >
              Serviços
            </button>
            <button
              onClick={() => onNavigate('subscription')}
              className={`px-4 lg:px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                currentPage === 'subscription'
                  ? 'bg-magic-gold text-magic-black shadow-md shadow-magic-gold/50'
                  : 'text-magic-yellow hover:bg-magic-gold/10'
              }`}
            >
              Assinatura
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => onNavigate('admin')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    currentPage === 'admin'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-red-500 hover:bg-red-500/10'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </button>
                <button
                  onClick={() => setShowQuickMenu(!showQuickMenu)}
                  className="px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 bg-magic-gold/20 text-magic-gold hover:bg-magic-gold/30 border border-magic-gold/30"
                  title="Acesso Rápido"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </>
            )}
            {isBarber && (
              <button
                onClick={() => onNavigate('admin-calendar')}
                className="px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 bg-magic-gold/20 text-magic-gold hover:bg-magic-gold/30 border border-magic-gold/30"
                title="Calendário"
              >
                <Zap className="w-4 h-4" />
                Calendário
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-magic-gold">{profile?.full_name || profile?.email}</p>
                  <p className="text-xs text-magic-yellow">{isAdmin ? 'Administrador' : isBarber ? 'Barbeiro' : 'Cliente'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-md text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-medium shadow-md shadow-magic-gold/50 text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Entrar</span>
                </button>
                <a
                  href="tel:+351912345678"
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-magic-gold/20 hover:bg-magic-gold/30 text-magic-gold rounded-lg transition-colors font-medium border border-magic-gold/30"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </>
            )}
          </div>
        </div>

        <nav className="lg:hidden flex items-center gap-2 pb-3 overflow-x-auto scrollbar-hide touch-pan-x">
          <button
            onClick={() => onNavigate('home')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all text-sm touch-manipulation ${
              currentPage === 'home'
                ? 'bg-magic-gold text-magic-black shadow-md'
                : 'text-magic-yellow hover:bg-magic-gold/10'
            }`}
          >
            Início
          </button>
          <button
            onClick={() => onNavigate('booking')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all text-sm touch-manipulation ${
              currentPage === 'booking'
                ? 'bg-magic-gold text-magic-black shadow-md'
                : 'text-magic-yellow hover:bg-magic-gold/10'
            }`}
          >
            Serviços
          </button>
          <button
            onClick={() => onNavigate('subscription')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all text-sm touch-manipulation ${
              currentPage === 'subscription'
                ? 'bg-magic-gold text-magic-black shadow-md'
                : 'text-magic-yellow hover:bg-magic-gold/10'
            }`}
          >
            Assinatura
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => onNavigate('admin')}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  currentPage === 'admin'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-red-500 hover:bg-red-500/10'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
              <button
                onClick={() => setShowQuickMenu(!showQuickMenu)}
                className="px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-2 bg-magic-gold/20 text-magic-gold hover:bg-magic-gold/30 border border-magic-gold/30"
                title="Acesso Rápido"
              >
                <Zap className="w-4 h-4" />
              </button>
            </>
          )}
          {isBarber && (
            <button
              onClick={() => onNavigate('admin-calendar')}
              className="px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-2 bg-magic-gold/20 text-magic-gold hover:bg-magic-gold/30 border border-magic-gold/30"
              title="Calendário"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}
        </nav>
      </div>

      {showQuickMenu && isAdmin && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowQuickMenu(false)}
          />
          <div className="absolute right-4 top-20 lg:top-16 z-50 w-80 bg-gradient-to-br from-gray-900 to-magic-black rounded-xl shadow-2xl border-2 border-magic-gold/50 p-4">
            <h3 className="text-lg font-bold text-magic-gold mb-3">Acesso Rápido</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  onNavigate('admin-calendar');
                  setShowQuickMenu(false);
                }}
                className="w-full p-4 bg-magic-gold/10 hover:bg-magic-gold/20 border border-magic-gold/30 hover:border-magic-gold rounded-lg transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-magic-gold/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5 text-magic-gold" />
                  </div>
                  <div>
                    <h4 className="font-bold text-magic-gold text-sm">Agendamentos de Hoje</h4>
                    <p className="text-xs text-magic-yellow/60">Ver calendário</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  onNavigate('admin');
                  setShowQuickMenu(false);
                }}
                className="w-full p-4 bg-magic-gold/10 hover:bg-magic-gold/20 border border-magic-gold/30 hover:border-magic-gold rounded-lg transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-magic-gold/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5 text-magic-gold" />
                  </div>
                  <div>
                    <h4 className="font-bold text-magic-gold text-sm">Painel Admin</h4>
                    <p className="text-xs text-magic-yellow/60">Dashboard completo</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
