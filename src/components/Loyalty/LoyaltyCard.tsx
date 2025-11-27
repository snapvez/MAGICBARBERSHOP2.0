import { useState, useEffect } from 'react';
import { Award, TrendingUp, Gift, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Profile {
  loyalty_points: number;
  total_visits: number;
  full_name: string;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  discount_percentage: number;
}

export const LoyaltyCard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadRewards();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('loyalty_points, total_visits, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

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

  if (!profile) return null;

  const nextReward = rewards.find(r => r.points_required > profile.loyalty_points);
  const currentTier = [...rewards].reverse().find(r => r.points_required <= profile.loyalty_points);
  const progressToNext = nextReward
    ? ((profile.loyalty_points / nextReward.points_required) * 100)
    : 100;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-magic-gold via-magic-yellow to-magic-gold rounded-3xl shadow-2xl shadow-magic-gold/50 overflow-hidden mb-8 border-2 border-magic-gold">
        <div className="p-8 text-magic-black">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-8 h-8" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Programa de Fidelidade
                </span>
              </div>
              <h2 className="text-4xl font-bold mb-1">{profile.full_name}</h2>
              {currentTier && (
                <div className="inline-flex items-center gap-2 bg-magic-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Star className="w-5 h-5" />
                  <span className="font-semibold">{currentTier.name}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold mb-1">{profile.loyalty_points}</div>
              <div className="text-sm">pontos acumulados</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso para próximo nível</span>
              {nextReward && (
                <span className="font-semibold">
                  {profile.loyalty_points} / {nextReward.points_required} pontos
                </span>
              )}
            </div>
            <div className="h-3 bg-magic-black/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-magic-black rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-magic-black/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">Total de Visitas</span>
              </div>
              <div className="text-3xl font-bold">{profile.total_visits}</div>
            </div>
            <div className="bg-magic-black/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-5 h-5" />
                <span className="text-sm">Próximo Prémio</span>
              </div>
              <div className="text-lg font-bold">
                {nextReward ? `${nextReward.discount_percentage}% OFF` : 'Máximo Atingido!'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl shadow-lg shadow-magic-gold/20 p-8 border-2 border-magic-gold/50">
        <h3 className="text-2xl font-bold text-magic-gold mb-6 flex items-center gap-3">
          <Gift className="w-8 h-8" />
          Recompensas Disponíveis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rewards.map((reward) => {
            const isUnlocked = profile.loyalty_points >= reward.points_required;
            const isCurrent = currentTier?.id === reward.id;

            return (
              <div
                key={reward.id}
                className={`p-6 rounded-xl border-2 transition-all ${
                  isUnlocked
                    ? isCurrent
                      ? 'border-magic-gold bg-magic-gold/20 shadow-lg shadow-magic-gold/50'
                      : 'border-magic-yellow bg-magic-yellow/10'
                    : 'border-gray-700 bg-gray-800/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-magic-gold mb-1">{reward.name}</h4>
                    <p className="text-sm text-gray-400">{reward.description}</p>
                  </div>
                  {isCurrent && (
                    <div className="bg-magic-gold text-magic-black px-3 py-1 rounded-full text-xs font-bold">
                      ATUAL
                    </div>
                  )}
                  {isUnlocked && !isCurrent && (
                    <div className="bg-magic-yellow text-magic-black px-3 py-1 rounded-full text-xs font-bold">
                      DESBLOQUEADO
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-magic-gold">
                    {reward.discount_percentage}% OFF
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Requer</div>
                    <div className="text-lg font-bold text-magic-yellow">{reward.points_required} pts</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
