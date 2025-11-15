import { useState, useEffect } from 'react';
import { Award, TrendingUp, Sparkles, Search, Crown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  discount_percentage: number;
}

interface Service {
  name: string;
  price: number;
  points_reward: number;
}

interface ClientData {
  name: string;
  email: string;
  phone: string;
  total_points: number;
  current_tier: string;
}

export const LoyaltyInfo = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadRewards();
    loadServices();
  }, []);

  const loadRewards = async () => {
    const { data } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_required');

    if (data) {
      setRewards(data);
    }
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('name, price, points_reward')
      .eq('is_active', true)
      .order('price');

    if (data) {
      setServices(data);
    }
  };

  const searchClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setNotFound(false);
    setClientData(null);

    try {
      const cleanPhone = searchPhone.replace(/\s+/g, '');

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, total_points, current_tier')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const profileData = data as { full_name: string; email: string; phone: string | null; total_points: number; current_tier: string };
        setClientData({
          name: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone || '',
          total_points: profileData.total_points || 0,
          current_tier: profileData.current_tier || 'Pawn'
        });
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Erro ao procurar cliente:', error);
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  const getTierEmoji = (tier: string) => {
    const emojiMap: Record<string, string> = {
      'Pawn': '♟️',
      'Knight': '♞',
      'Bishop': '♝',
      'Rook': '♜',
      'Queen': '♛',
      'King': '♚'
    };
    return emojiMap[tier] || '♟️';
  };

  const getTierColor = (tier: string) => {
    const colorMap: Record<string, string> = {
      'Pawn': 'from-slate-600 to-slate-800',
      'Knight': 'from-amber-700 to-amber-900',
      'Bishop': 'from-gray-400 to-gray-600',
      'Rook': 'from-orange-500 to-red-600',
      'Queen': 'from-purple-500 to-pink-600',
      'King': 'from-yellow-400 to-amber-500'
    };
    return colorMap[tier] || 'from-slate-600 to-slate-800';
  };

  const getNextTier = (currentPoints: number) => {
    const nextReward = rewards.find(r => r.points_required > currentPoints);
    return nextReward;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="relative overflow-hidden bg-gradient-to-br from-magic-gold via-magic-yellow to-magic-gold rounded-3xl shadow-2xl shadow-magic-gold/50 mb-12 border-2 border-magic-gold">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />

        <div className="relative p-12 text-magic-black text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-magic-black/20 rounded-full mb-6 backdrop-blur-sm">
            <Award className="w-10 h-10" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Ranking de Fidelidade
          </h1>
          <p className="text-2xl text-magic-black/80 max-w-3xl mx-auto leading-relaxed">
            Sobe de Pawn a King e desbloqueia descontos até 35%!
          </p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl shadow-lg shadow-magic-gold/20 p-8 mb-12 border-2 border-magic-gold/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-magic-gold/20 rounded-full mb-4">
            <Search className="w-8 h-8 text-magic-gold" />
          </div>
          <h2 className="text-3xl font-bold text-magic-gold mb-3">Consulta o Teu Ranking</h2>
          <p className="text-magic-yellow text-lg">
            Insere o teu número de telefone para ver os teus pontos e ranking atual
          </p>
        </div>

        <form onSubmit={searchClient} className="max-w-md mx-auto mb-8">
          <div className="flex gap-3">
            <input
              type="tel"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="+351 912 345 678"
              className="flex-1 px-6 py-4 bg-magic-black border-2 border-magic-gold/50 rounded-xl focus:ring-2 focus:ring-magic-gold focus:border-magic-gold text-lg text-white"
              required
            />
            <button
              type="submit"
              disabled={searching}
              className="px-8 py-4 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
            >
              {searching ? 'A procurar...' : 'Consultar'}
            </button>
          </div>
        </form>

        {notFound && (
          <div className="max-w-md mx-auto p-6 bg-amber-900/20 border-2 border-amber-500/50 rounded-xl text-center">
            <p className="text-amber-400 font-semibold">
              Número não encontrado. Verifica se inseriste corretamente ou contacta-nos.
            </p>
          </div>
        )}

        {clientData && (
          <div className="max-w-2xl mx-auto">
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getTierColor(clientData.current_tier)} p-8 text-white shadow-2xl mb-6`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-3xl font-bold mb-2">{clientData.name}</h3>
                    <p className="text-white/80">{clientData.phone}</p>
                  </div>
                  <div className="text-7xl">
                    {getTierEmoji(clientData.current_tier)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-sm opacity-90 mb-1">Ranking Atual</p>
                    <p className="text-3xl font-bold">{clientData.current_tier}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-sm opacity-90 mb-1">Total de Pontos</p>
                    <p className="text-3xl font-bold">{clientData.total_points}</p>
                  </div>
                </div>

                {(() => {
                  const nextTier = getNextTier(clientData.total_points);
                  if (nextTier) {
                    const pointsNeeded = nextTier.points_required - clientData.total_points;
                    const progress = (clientData.total_points / nextTier.points_required) * 100;
                    return (
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm opacity-90">Próximo nível: {nextTier.name}</p>
                          <p className="text-sm font-bold">{pointsNeeded} pontos</p>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-white h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                        <Crown className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-bold">Parabéns! Atingiste o nível máximo!</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-magic-black rounded-xl p-6 border-2 border-magic-gold/50 text-center">
              <p className="text-magic-gold font-semibold mb-2">
                Desconto Atual: {rewards.find(r => r.name === clientData.current_tier)?.discount_percentage || 0}%
              </p>
              <p className="text-gray-400 text-sm">
                Usa o teu desconto na próxima visita!
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-gray-900 rounded-2xl shadow-lg shadow-magic-gold/20 p-8 border-2 border-magic-gold/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-magic-gold/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-magic-gold" />
            </div>
            <h2 className="text-3xl font-bold text-magic-gold">Como Funciona</h2>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-magic-gold rounded-full flex items-center justify-center text-magic-black font-bold">
                1
              </div>
              <div>
                <h3 className="font-bold text-lg text-magic-gold mb-2">Faz Serviços</h3>
                <p className="text-gray-400">
                  Cada vez que pagas um serviço, acumulas pontos automaticamente baseados no valor gasto.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-magic-gold rounded-full flex items-center justify-center text-magic-black font-bold">
                2
              </div>
              <div>
                <h3 className="font-bold text-lg text-magic-gold mb-2">Acumula Pontos</h3>
                <p className="text-gray-400">
                  Os pontos são adicionados à tua conta e podes acompanhar o teu progresso para o próximo nível.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-magic-gold rounded-full flex items-center justify-center text-magic-black font-bold">
                3
              </div>
              <div>
                <h3 className="font-bold text-lg text-magic-gold mb-2">Sobe no Ranking</h3>
                <p className="text-gray-400">
                  Progride de Pawn até King e ganha descontos progressivos de até 35% nos serviços!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-magic-black rounded-2xl shadow-lg shadow-magic-gold/20 p-8 border-2 border-magic-gold/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-magic-gold rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-magic-black" />
            </div>
            <h2 className="text-3xl font-bold text-magic-gold">Pontos por Serviço</h2>
          </div>

          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="bg-magic-black/50 rounded-xl p-4 flex items-center justify-between border border-magic-gold/30">
                <div>
                  <h3 className="font-bold text-magic-gold">{service.name}</h3>
                  <p className="text-sm text-gray-400">{service.price}€</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-magic-gold">+{service.points_reward}</div>
                  <div className="text-xs text-gray-500">pontos</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-amber-900/20 rounded-xl border-2 border-amber-500/50">
            <p className="text-sm text-amber-400 font-semibold text-center">
              Cada euro gasto = 1 ponto acumulado
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl shadow-lg shadow-magic-gold/20 p-8 border-2 border-magic-gold/50">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-magic-gold mb-3 flex items-center justify-center gap-3">
            <Award className="w-9 h-9 text-magic-gold" />
            Ranking do Salão
          </h2>
          <p className="text-magic-yellow text-lg">
            Sistema de ranking inspirado no xadrez - Do Pawn ao King
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => {
            const tierConfig: Record<string, { bg: string; icon: string; border: string; emoji: string }> = {
              'Pawn': {
                bg: 'from-slate-600 to-slate-800',
                icon: 'bg-slate-500',
                border: 'border-slate-400',
                emoji: '♟️'
              },
              'Knight': {
                bg: 'from-amber-700 to-amber-900',
                icon: 'bg-amber-600',
                border: 'border-amber-500',
                emoji: '♞'
              },
              'Bishop': {
                bg: 'from-gray-400 to-gray-600',
                icon: 'bg-gray-500',
                border: 'border-gray-400',
                emoji: '♝'
              },
              'Rook': {
                bg: 'from-orange-500 to-red-600',
                icon: 'bg-orange-600',
                border: 'border-orange-400',
                emoji: '♜'
              },
              'Queen': {
                bg: 'from-purple-500 to-pink-600',
                icon: 'bg-purple-600',
                border: 'border-purple-400',
                emoji: '♛'
              },
              'King': {
                bg: 'from-yellow-400 to-amber-500',
                icon: 'bg-yellow-500',
                border: 'border-yellow-400',
                emoji: '♚'
              }
            };
            const colors = tierConfig[reward.name] || tierConfig['Pawn'];

            return (
              <div
                key={reward.id}
                className={`relative overflow-hidden rounded-2xl border-4 ${colors.border} bg-gradient-to-br ${colors.bg} p-6 text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                <div className="relative">
                  <div className="text-6xl mb-4 filter drop-shadow-lg">
                    {colors.emoji}
                  </div>
                  <h3 className="text-3xl font-bold mb-2">{reward.name}</h3>
                  <p className="text-sm opacity-90 mb-4 min-h-[3rem]">{reward.description}</p>

                  <div className="border-t border-white/30 pt-4 mt-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm opacity-90">Desconto</span>
                      <span className="text-4xl font-bold">{reward.discount_percentage}%</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm opacity-90">Pontos necessários</span>
                      <span className="text-xl font-bold">{reward.points_required}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 bg-gradient-to-r from-magic-gold to-magic-yellow rounded-2xl shadow-2xl shadow-magic-gold/50 p-12 text-magic-black text-center border-2 border-magic-gold">
        <h2 className="text-4xl font-bold mb-4">Pronto para Começar?</h2>
        <p className="text-xl text-magic-black/80 mb-8 max-w-2xl mx-auto">
          Liga-nos para fazer a tua primeira marcação e começar a acumular pontos desde já!
        </p>
        <a
          href="tel:+351912345678"
          className="inline-flex items-center gap-3 px-8 py-4 bg-magic-black text-magic-gold rounded-xl font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
        >
          <Award className="w-6 h-6" />
          +351 912 345 678
        </a>
      </div>
    </div>
  );
};
