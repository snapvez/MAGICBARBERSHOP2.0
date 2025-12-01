import { useEffect, useState } from 'react';
import { ArrowLeft, Award, DollarSign, Clock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  points_reward: number;
  is_active: boolean;
  color?: string;
  created_at: string;
}

interface ActiveServicesPageProps {
  onNavigate: (page: string) => void;
}

export const ActiveServicesPage = ({ onNavigate }: ActiveServicesPageProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data } = await supabase
        .from('services')
        .select('*')
        .order('is_active', { ascending: false })
        .order('name', { ascending: true });

      setServices(data || []);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !currentStatus })
        .eq('id', serviceId);

      if (error) throw error;

      setServices((prev) =>
        prev.map((service) =>
          service.id === serviceId ? { ...service, is_active: !currentStatus } : service
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar status do serviço:', error);
      alert('Erro ao atualizar status do serviço');
    }
  };

  const activeServices = services.filter((s) => s.is_active);
  const inactiveServices = services.filter((s) => !s.is_active);
  const displayedServices = showInactive ? services : activeServices;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-magic-black">
        <div className="text-xl text-magic-gold">A carregar serviços...</div>
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
            <Award className="w-8 h-8 text-pink-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-magic-gold">Serviços Disponíveis</h1>
          </div>
          <p className="text-magic-yellow">Gestão de todos os serviços do salão</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-pink-500/30">
            <div className="text-3xl font-bold text-pink-400">{services.length}</div>
            <div className="text-sm text-pink-300">Total de Serviços</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-green-500/30">
            <div className="text-3xl font-bold text-green-400">{activeServices.length}</div>
            <div className="text-sm text-green-300">Serviços Ativos</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-red-500/30">
            <div className="text-3xl font-bold text-red-400">{inactiveServices.length}</div>
            <div className="text-sm text-red-300">Serviços Inativos</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-magic-gold">Lista de Serviços</h2>
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                showInactive
                  ? 'bg-magic-gold text-magic-black'
                  : 'bg-magic-black text-magic-gold border-2 border-magic-gold/30 hover:border-magic-gold/50'
              }`}
            >
              {showInactive ? (
                <>
                  <Eye className="w-4 h-4" />
                  Mostrar Todos
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  Apenas Ativos
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedServices.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-magic-yellow">
                Nenhum serviço encontrado
              </div>
            ) : (
              displayedServices.map((service) => (
                <div
                  key={service.id}
                  className={`bg-magic-black rounded-xl p-6 border-2 transition-all ${
                    service.is_active
                      ? 'border-magic-gold/30 hover:border-magic-gold/50'
                      : 'border-red-500/30 hover:border-red-500/50 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {service.color && (
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white/20"
                            style={{ backgroundColor: service.color }}
                          ></div>
                        )}
                        <h3 className="text-xl font-bold text-white">{service.name}</h3>
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-400 mb-3">{service.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleServiceStatus(service.id, service.is_active)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        service.is_active
                          ? 'bg-green-900/20 text-green-400 border border-green-500/50 hover:bg-green-900/30'
                          : 'bg-red-900/20 text-red-400 border border-red-500/50 hover:bg-red-900/30'
                      }`}
                    >
                      {service.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-gray-400">Preço</span>
                      </div>
                      <div className="text-lg font-bold text-green-400">{service.price}€</div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs text-gray-400">Duração</span>
                      </div>
                      <div className="text-lg font-bold text-cyan-400">
                        {service.duration_minutes}min
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-magic-gold" />
                        <span className="text-xs text-gray-400">Pontos</span>
                      </div>
                      <div className="text-lg font-bold text-magic-gold">
                        {service.points_reward}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-500">
                      Criado em {new Date(service.created_at).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30">
          <h3 className="text-xl font-bold text-magic-gold mb-4">Estatísticas de Preços</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-magic-black rounded-xl p-4 border border-magic-gold/30">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {activeServices.length > 0
                  ? Math.min(...activeServices.map((s) => s.price)).toFixed(2)
                  : '0.00'}
                €
              </div>
              <div className="text-sm text-green-300">Preço Mínimo</div>
            </div>
            <div className="bg-magic-black rounded-xl p-4 border border-magic-gold/30">
              <div className="text-2xl font-bold text-magic-gold mb-1">
                {activeServices.length > 0
                  ? (
                      activeServices.reduce((sum, s) => sum + s.price, 0) / activeServices.length
                    ).toFixed(2)
                  : '0.00'}
                €
              </div>
              <div className="text-sm text-magic-yellow">Preço Médio</div>
            </div>
            <div className="bg-magic-black rounded-xl p-4 border border-magic-gold/30">
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {activeServices.length > 0
                  ? Math.max(...activeServices.map((s) => s.price)).toFixed(2)
                  : '0.00'}
                €
              </div>
              <div className="text-sm text-cyan-300">Preço Máximo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
