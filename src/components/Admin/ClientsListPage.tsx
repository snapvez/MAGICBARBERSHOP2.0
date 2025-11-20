import { useEffect, useState } from 'react';
import { ArrowLeft, Search, Phone, Mail, CheckCircle, Ban, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  total_appointments: number;
  last_appointment: string | null;
  subscription_status: 'active' | 'inactive';
  subscription_plan: string | null;
}

interface ClientsListPageProps {
  onNavigate: (page: string) => void;
}

export const ClientsListPage = ({ onNavigate }: ClientsListPageProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchTerm, filterStatus, clients]);

  const loadClients = async () => {
    try {
      const { data: clientsData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const enrichedClients = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { count: appointmentCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          const { data: lastAppointment } = await supabase
            .from('appointments')
            .select('appointment_date')
            .eq('client_id', client.id)
            .order('appointment_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: subscription } = await supabase
            .from('client_subscriptions')
            .select('status, subscription_plans(name)')
            .eq('client_id', client.id)
            .eq('status', 'active')
            .gt('current_period_end', new Date().toISOString())
            .maybeSingle();

          return {
            id: client.id,
            full_name: client.full_name || 'Sem nome',
            email: client.email,
            phone: client.phone,
            created_at: client.created_at,
            total_appointments: appointmentCount || 0,
            last_appointment: lastAppointment?.appointment_date || null,
            subscription_status: subscription ? 'active' : 'inactive',
            subscription_plan: subscription?.subscription_plans?.name || null,
          } as Client;
        })
      );

      setClients(enrichedClients);
      setFilteredClients(enrichedClients);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.phone && client.phone.includes(searchTerm))
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((client) => client.subscription_status === filterStatus);
    }

    setFilteredClients(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-magic-black">
        <div className="text-xl text-magic-gold">A carregar clientes...</div>
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
          <h1 className="text-3xl sm:text-4xl font-bold text-magic-gold mb-2">
            Gestão de Clientes
          </h1>
          <p className="text-magic-yellow">Total de {clients.length} clientes registados</p>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-magic-gold w-5 h-5" />
              <input
                type="text"
                placeholder="Pesquisar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-magic-gold transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-magic-gold text-magic-black'
                    : 'bg-magic-black text-magic-gold border-2 border-magic-gold/30 hover:border-magic-gold/50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filterStatus === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-magic-black text-green-400 border-2 border-green-500/30 hover:border-green-500/50'
                }`}
              >
                Com Assinatura
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filterStatus === 'inactive'
                    ? 'bg-red-600 text-white'
                    : 'bg-magic-black text-red-400 border-2 border-red-500/30 hover:border-red-500/50'
                }`}
              >
                Sem Assinatura
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-magic-gold/30">
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Contacto</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Assinatura</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">
                    Total Marcações
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">
                    Última Visita
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">
                    Cliente Desde
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-magic-yellow">
                      {searchTerm || filterStatus !== 'all'
                        ? 'Nenhum cliente encontrado com os filtros aplicados'
                        : 'Nenhum cliente registado'}
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-magic-gold/10 hover:bg-magic-gold/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{client.full_name}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-cyan-400">
                            <Phone className="w-3 h-3" />
                            <span className="break-all">{client.phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-cyan-400">
                            <Mail className="w-3 h-3" />
                            <span className="break-all">{client.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {client.subscription_status === 'active' ? (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-900/20 text-green-400 border border-green-500/50 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Ativa
                            </span>
                            {client.subscription_plan && (
                              <span className="text-xs text-gray-400">
                                ({client.subscription_plan})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-900/20 text-red-400 border border-red-500/50 flex items-center gap-1 w-fit">
                            <Ban className="w-3 h-3" />
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-magic-gold">
                          {client.total_appointments}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-magic-yellow text-sm">
                          <Calendar className="w-4 h-4" />
                          {client.last_appointment
                            ? new Date(client.last_appointment).toLocaleDateString('pt-PT')
                            : 'Nunca'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-sm">
                        {new Date(client.created_at).toLocaleDateString('pt-PT')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30">
          <h3 className="text-xl font-bold text-magic-gold mb-4">Resumo de Estatísticas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-magic-black rounded-xl p-4 border border-magic-gold/30">
              <div className="text-3xl font-bold text-magic-gold mb-1">
                {clients.filter((c) => c.subscription_status === 'active').length}
              </div>
              <div className="text-sm text-magic-yellow">Clientes com Assinatura</div>
            </div>
            <div className="bg-magic-black rounded-xl p-4 border border-magic-gold/30">
              <div className="text-3xl font-bold text-cyan-400 mb-1">
                {clients.reduce((sum, c) => sum + c.total_appointments, 0)}
              </div>
              <div className="text-sm text-cyan-300">Total de Marcações</div>
            </div>
            <div className="bg-magic-black rounded-xl p-4 border border-magic-gold/30">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {clients.filter((c) => c.total_appointments > 0).length}
              </div>
              <div className="text-sm text-green-300">Clientes Ativos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
