import { Calendar, Bell, Sparkles, Clock, TrendingUp, Scissors } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export const HomePage = ({ onNavigate }: HomePageProps) => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="relative overflow-hidden bg-gradient-to-br from-magic-black via-gray-900 to-magic-black rounded-3xl shadow-2xl mb-12 border-2 border-magic-gold">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

        <div className="relative p-6 sm:p-8 md:p-12 text-white">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-magic-gold" />
            <span className="text-lg font-semibold uppercase tracking-wider text-magic-gold">Bem-vindo ao Magic Barbershop</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight text-white">
            Agendamento Inteligente<br />
            <span className="text-magic-yellow">Disponível 24/7</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl leading-relaxed">
            Sistema automático de marcações e notificações inteligentes para uma experiência premium.
          </p>
          <button
            onClick={() => onNavigate('booking')}
            className="bg-magic-gold text-magic-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:shadow-2xl hover:shadow-magic-gold/50 transition-all transform hover:scale-105 active:scale-95 inline-flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center"
          >
            <Calendar className="w-6 h-6" />
            Fazer Marcação Agora
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
        <div className="bg-gray-900 rounded-2xl shadow-lg shadow-magic-gold/10 p-6 sm:p-8 hover:shadow-xl hover:shadow-magic-gold/20 transition-all border border-magic-gold/30">
          <div className="w-16 h-16 bg-magic-gold/20 rounded-2xl flex items-center justify-center mb-6">
            <Clock className="w-8 h-8 text-magic-gold" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-magic-gold mb-3 sm:mb-4">Disponível 24/7</h3>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Marca o teu serviço a qualquer hora do dia ou da noite. O nosso sistema está sempre disponível para ti.
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg shadow-magic-gold/10 p-6 sm:p-8 hover:shadow-xl hover:shadow-magic-gold/20 transition-all border border-magic-gold/30">
          <div className="w-16 h-16 bg-magic-gold/20 rounded-2xl flex items-center justify-center mb-6">
            <Scissors className="w-8 h-8 text-magic-gold" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-magic-gold mb-3 sm:mb-4">Serviço Profissional</h3>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Barbeiros experientes e dedicados a oferecer o melhor estilo para ti.
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg shadow-magic-gold/10 p-6 sm:p-8 hover:shadow-xl hover:shadow-magic-gold/20 transition-all border border-magic-gold/30">
          <div className="w-16 h-16 bg-magic-gold/20 rounded-2xl flex items-center justify-center mb-6">
            <Bell className="w-8 h-8 text-magic-gold" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-magic-gold mb-3 sm:mb-4">Lembretes Automáticos</h3>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Recebe notificações de confirmação e lembretes para nunca perderes uma marcação.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-900 to-magic-black rounded-3xl shadow-2xl shadow-magic-gold/20 p-6 sm:p-8 md:p-12 text-white border-2 border-magic-gold/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-8 h-8 text-magic-gold" />
              <span className="text-magic-gold font-semibold uppercase tracking-wider">Vantagens Exclusivas</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight">
              Experiência Premium em Cada Visita
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-magic-gold rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-magic-black text-sm font-bold">✓</span>
                </div>
                <span className="text-sm sm:text-base md:text-lg">Confirmação instantânea da marcação</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-magic-gold rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-magic-black text-sm font-bold">✓</span>
                </div>
                <span className="text-sm sm:text-base md:text-lg">Barbeiros profissionais e experientes</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-magic-gold rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-magic-black text-sm font-bold">✓</span>
                </div>
                <span className="text-sm sm:text-base md:text-lg">Planos de assinatura flexíveis</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-magic-gold rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-magic-black text-sm font-bold">✓</span>
                </div>
                <span className="text-sm sm:text-base md:text-lg">Gestão completa das tuas marcações</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <div className="bg-magic-gold/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-magic-gold/30">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-magic-gold mb-1 sm:mb-2">24/7</div>
              <div className="text-xs sm:text-sm md:text-base text-magic-yellow">Disponibilidade Total</div>
            </div>
            <div className="bg-magic-gold/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-magic-gold/30">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-magic-gold mb-1 sm:mb-2">40%</div>
              <div className="text-xs sm:text-sm md:text-base text-magic-yellow">Economia com Assinatura</div>
            </div>
            <div className="bg-magic-gold/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-magic-gold/30">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-magic-gold mb-1 sm:mb-2">10+</div>
              <div className="text-xs sm:text-sm md:text-base text-magic-yellow">Anos de Experiência</div>
            </div>
            <div className="bg-magic-gold/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-magic-gold/30">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-magic-gold mb-1 sm:mb-2">100%</div>
              <div className="text-xs sm:text-sm md:text-base text-magic-yellow">Satisfação</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
