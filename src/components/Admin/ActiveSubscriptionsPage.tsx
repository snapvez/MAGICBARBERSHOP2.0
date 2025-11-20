import { useEffect, useState } from 'react';
import { ArrowLeft, Crown, Search, Calendar, User, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Subscription {
  id: string;
  status: string;
  cuts_used_this_month: number;
  current_period_start: string;
  current_period_end: string;
  profiles?: {
    full_name: string;
    email: string;
    phone: string;
  };
  subscription_plans?: {
    name: string;
    cuts_per_month: number;
    price: number;
  };
  barbers?: {
    name: string;
  };
}

interface ActiveSubscriptionsPageProps {
  onNavigate: (page: string) => void;
}

export const ActiveSubscriptionsPage = ({ onNavigate }: ActiveSubscriptionsPageProps) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadActiveSubscriptions();
  }, []);

  useEffect(() => {
    filterSubscriptions();
  }, [searchTerm, subscriptions]);

  const loadActiveSubscriptions = async () => {
    try {
      const { data } = await supabase
        .from('client_subscriptions')
        .select(`
          *,
          profiles:client_id(full_name, email, phone),
          subscription_plans:plan_id(name, cuts_per_month, price),
          barbers:barber_id(name)
        `)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .order('current_period_start', { ascending: false });

      setSubscriptions(data || []);
      setFilteredSubscriptions(data || []);
    } catch (error) {
      console.error('Erro ao carregar assinaturas ativas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSubscriptions = () => {
    let filtered = [...subscriptions];

    if (searchTerm) {
      filtered = filtered.filter((sub) => {
        const clientName = sub.profiles?.full_name || '';
        const clientPhone = sub.profiles?.phone || '';
        const planName = sub.subscription_plans?.name || '';

        return (
          clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clientPhone.includes(searchTerm) ||
          planName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredSubscriptions(filtered);
  };

  const getRemainingCuts = (sub: Subscription) => {
    const total = sub.subscription_plans?.cuts_per_month || 0;
    const used = sub.cuts_used_this_month || 0;
    return Math.max(0, total - used);
  };

  const getUsagePercentage = (sub: Subscription) => {
    const total = sub.subscription_plans?.cuts_per_month || 0;
    const used = sub.cuts_used_this_month || 0;
    return total > 0 ? (used / total) * 100 : 0;
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-magic-black">
        <div className="text-xl text-magic-gold">A carregar assinaturas ativas...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-magic-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => onNavigate('admin')}
            className="flex items-center gap-2 text-magic-gold hover:text-magic-yellow transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Dashboard
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-magic-gold">
              Assinaturas Ativas
            </h1>
          </div>
          <p className="text-magic-yellow">
            Total de {subscriptions.length} assinaturas ativas
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-purple-500/30">
            <div className="text-3xl font-bold text-purple-400">{subscriptions.length}</div>
            <div className="text-sm text-purple-300">Assinaturas Ativas</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-green-500/30">
            <div className="text-3xl font-bold text-green-400">
              {subscriptions.reduce((sum, sub) => sum + (sub.subscription_plans?.price || 0), 0)}€
            </div>
            <div className="text-sm text-green-300">Receita Mensal</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-cyan-500/30">
            <div className="text-3xl font-bold text-cyan-400">
              {subscriptions.reduce((sum, sub) => sum + (sub.cuts_used_this_month || 0), 0)}
            </div>
            <div className="text-sm text-cyan-300">Cortes Usados Este Mês</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-magic-gold w-5 h-5" />
              <input
                type="text"
                placeholder="Pesquisar por cliente, telefone ou plano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-magic-gold transition-colors"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredSubscriptions.length === 0 ? (
              <div className="text-center py-12 text-magic-yellow">
                {searchTerm
                  ? 'Nenhuma assinatura encontrada com os filtros aplicados'
                  : 'Nenhuma assinatura ativa'}
              </div>
            ) : (
              filteredSubscriptions.map((subscription) => {
                const percentage = getUsagePercentage(subscription);
                const remaining = getRemainingCuts(subscription);
                const daysLeft = getDaysRemaining(subscription.current_period_end);

                return (
                  <div
                    key={subscription.id}
                    className="bg-magic-black rounded-xl p-6 border-2 border-magic-gold/30 hover:border-magic-gold/50 transition-all"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      <div className="lg:col-span-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <div className="font-bold text-white">
                              {subscription.profiles?.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-cyan-400">
                              {subscription.profiles?.phone || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-1">
                        <div className="mb-1 text-sm text-gray-400">Plano</div>
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-magic-gold" />
                          <span className="font-bold text-magic-gold">
                            {subscription.subscription_plans?.name || 'N/A'}
                          </span>
                        </div>
                        <div className="text-sm text-magic-yellow mt-1">
                          {subscription.subscription_plans?.price}€/mês
                        </div>
                        {subscription.barbers?.name && (
                          <div className="text-sm text-gray-400 mt-1">
                            Barbeiro: {subscription.barbers.name}
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-1">
                        <div className="mb-2 text-sm text-gray-400">Utilização</div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-2xl font-bold text-cyan-400">
                            {subscription.cuts_used_this_month || 0}
                          </div>
                          <div className="text-gray-400">/</div>
                          <div className="text-xl text-gray-400">
                            {subscription.subscription_plans?.cuts_per_month || 0}
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              percentage >= 100
                                ? 'bg-red-500'
                                : percentage >= 75
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {remaining > 0 ? (
                            <span className="text-green-400">
                              {remaining} corte{remaining !== 1 ? 's' : ''} restante
                              {remaining !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-red-400">Limite atingido</span>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-1">
                        <div className="mb-2 text-sm text-gray-400">Período</div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-cyan-400" />
                            <span className="text-white">
                              {new Date(subscription.current_period_start).toLocaleDateString(
                                'pt-PT'
                              )}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">até</div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-cyan-400" />
                            <span className="text-white">
                              {new Date(subscription.current_period_end).toLocaleDateString('pt-PT')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span
                              className={`text-sm font-semibold ${
                                daysLeft <= 7 ? 'text-red-400' : 'text-green-400'
                              }`}
                            >
                              {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante
                              {daysLeft !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
