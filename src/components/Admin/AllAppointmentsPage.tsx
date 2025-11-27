import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, Search, Calendar, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EditAppointmentModal } from './EditAppointmentModal';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  client_name_at_booking?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone: string;
  };
  guests?: {
    full_name: string;
    email: string;
    phone: string;
  };
  services?: {
    name: string;
    price: number;
  };
  barbers?: {
    name: string;
  };
}

interface AllAppointmentsPageProps {
  onNavigate: (page: string) => void;
}

export const AllAppointmentsPage = ({ onNavigate }: AllAppointmentsPageProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const itemsPerPage = 20;

  useEffect(() => {
    loadAllAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [searchTerm, filterStatus, appointments]);

  const loadAllAppointments = async () => {
    try {
      const { data } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:client_id(full_name, email, phone),
          guests:guest_id(full_name, email, phone),
          services:service_id(name, price),
          barbers:barber_id(name)
        `)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      setAppointments(data || []);
      setFilteredAppointments(data || []);
    } catch (error) {
      console.error('Erro ao carregar marcações:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = [...appointments];

    if (searchTerm) {
      filtered = filtered.filter((apt) => {
        const clientName =
          apt.client_name_at_booking || apt.profiles?.full_name || apt.guests?.full_name || '';
        const clientPhone = apt.profiles?.phone || apt.guests?.phone || '';
        const serviceName = apt.services?.name || '';

        return (
          clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clientPhone.includes(searchTerm) ||
          serviceName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((apt) => apt.status === filterStatus);
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-900/20 text-amber-400 border-amber-500/50',
      confirmed: 'bg-blue-900/20 text-blue-400 border-blue-500/50',
      completed: 'bg-green-900/20 text-green-400 border-green-500/50',
      cancelled: 'bg-red-900/20 text-red-400 border-red-500/50',
    };
    return colors[status] || 'bg-gray-900/20 text-gray-400 border-gray-500/50';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-magic-black">
        <div className="text-xl text-magic-gold">A carregar histórico de marcações...</div>
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
            <TrendingUp className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-magic-gold">
              Histórico Completo de Marcações
            </h1>
          </div>
          <p className="text-magic-yellow">Total de {appointments.length} marcações registadas</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-orange-500/30">
            <div className="text-3xl font-bold text-orange-400">{appointments.length}</div>
            <div className="text-sm text-orange-300">Total de Marcações</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-green-500/30">
            <div className="text-3xl font-bold text-green-400">
              {appointments.filter((a) => a.status === 'completed').length}
            </div>
            <div className="text-sm text-green-300">Concluídas</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-blue-500/30">
            <div className="text-3xl font-bold text-blue-400">
              {appointments.filter((a) => a.status === 'confirmed').length}
            </div>
            <div className="text-sm text-blue-300">Confirmadas</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border-2 border-red-500/30">
            <div className="text-3xl font-bold text-red-400">
              {appointments.filter((a) => a.status === 'cancelled').length}
            </div>
            <div className="text-sm text-red-300">Canceladas</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-magic-gold w-5 h-5" />
              <input
                type="text"
                placeholder="Pesquisar por cliente, telefone ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-magic-gold transition-colors"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  filterStatus === 'all'
                    ? 'bg-magic-gold text-magic-black'
                    : 'bg-magic-black text-magic-gold border-2 border-magic-gold/30 hover:border-magic-gold/50'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  filterStatus === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-magic-black text-amber-400 border-2 border-amber-500/30 hover:border-amber-500/50'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFilterStatus('confirmed')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  filterStatus === 'confirmed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-magic-black text-blue-400 border-2 border-blue-500/30 hover:border-blue-500/50'
                }`}
              >
                Confirmadas
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  filterStatus === 'completed'
                    ? 'bg-green-600 text-white'
                    : 'bg-magic-black text-green-400 border-2 border-green-500/30 hover:border-green-500/50'
                }`}
              >
                Concluídas
              </button>
              <button
                onClick={() => setFilterStatus('cancelled')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  filterStatus === 'cancelled'
                    ? 'bg-red-600 text-white'
                    : 'bg-magic-black text-red-400 border-2 border-red-500/30 hover:border-red-500/50'
                }`}
              >
                Canceladas
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-magic-gold/30">
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Data</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Hora</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Serviço</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Barbeiro</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Preço</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {currentAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-magic-yellow">
                      {searchTerm || filterStatus !== 'all'
                        ? 'Nenhuma marcação encontrada com os filtros aplicados'
                        : 'Nenhuma marcação registada'}
                    </td>
                  </tr>
                ) : (
                  currentAppointments.map((appointment) => {
                    const clientName =
                      appointment.client_name_at_booking ||
                      appointment.profiles?.full_name ||
                      appointment.guests?.full_name ||
                      'N/A';

                    return (
                      <tr
                        key={appointment.id}
                        className="border-b border-magic-gold/10 hover:bg-magic-gold/5 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-magic-yellow">
                            <Calendar className="w-4 h-4" />
                            {new Date(appointment.appointment_date).toLocaleDateString('pt-PT')}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-cyan-400">{appointment.start_time}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{clientName}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">
                            {appointment.services?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-magic-yellow">
                            {appointment.barbers?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-green-400">
                            {appointment.services?.price}€
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                              appointment.status
                            )}`}
                          >
                            {getStatusLabel(appointment.status)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => setEditingAppointmentId(appointment.id)}
                            className="p-2 bg-magic-gold/10 hover:bg-magic-gold/20 text-magic-gold rounded-lg transition-colors"
                            title="Editar agendamento"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-magic-gold/30">
              <div className="text-sm text-magic-yellow">
                A mostrar {startIndex + 1} a {Math.min(endIndex, filteredAppointments.length)} de{' '}
                {filteredAppointments.length} marcações
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-magic-black border-2 border-magic-gold/30 hover:border-magic-gold/50 text-magic-gold rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <div className="px-4 py-2 bg-magic-gold/10 border-2 border-magic-gold/30 text-magic-gold rounded-xl font-semibold">
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-magic-black border-2 border-magic-gold/30 hover:border-magic-gold/50 text-magic-gold rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingAppointmentId && (
        <EditAppointmentModal
          appointmentId={editingAppointmentId}
          onClose={() => setEditingAppointmentId(null)}
          onUpdate={loadAllAppointments}
        />
      )}
    </div>
  );
};
