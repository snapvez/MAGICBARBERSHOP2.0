import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  services: {
    name: string;
    price: number;
  };
}

export const AppointmentsList = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user, filter]);

  const loadAppointments = async () => {
    if (!user) return;

    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        status,
        notes,
        services (
          name,
          price
        )
      `)
      .eq('client_id', user.id)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (filter === 'upcoming') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('appointment_date', today).neq('status', 'cancelled');
    } else if (filter === 'past') {
      const today = new Date().toISOString().split('T')[0];
      query = query.lt('appointment_date', today);
    }

    const { data } = await query;
    if (data) {
      setAppointments(data as any);
    }
  };

  const cancelAppointment = async (id: string) => {
    if (!confirm('Tens a certeza que queres cancelar esta marcação?')) return;

    const updateData: Record<string, string> = { status: 'cancelled' };
    const { error } = await supabase
      .from('appointments')
      .update(updateData as any)
      .eq('id', id);

    if (!error) {
      loadAppointments();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };

    const icons = {
      pending: <AlertCircle className="w-4 h-4" />,
      confirmed: <CheckCircle className="w-4 h-4" />,
      completed: <CheckCircle className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
    };

    const labels = {
      pending: 'Pendente',
      confirmed: 'Confirmada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    };

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">As Tuas Marcações</h2>

        <div className="flex gap-3">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'upcoming'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Próximas
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'past'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Histórico
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'all'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Ainda não tens marcações nesta categoria.</p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {appointment.services.name}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(appointment.appointment_date).toLocaleDateString('pt-PT', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {appointment.start_time}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(appointment.status)}
                  <div className="text-2xl font-bold text-blue-600 mt-2">
                    {appointment.services.price}€
                  </div>
                </div>
              </div>

              {appointment.notes && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">{appointment.notes}</p>
                </div>
              )}

              {appointment.status === 'pending' && (
                <button
                  onClick={() => cancelAppointment(appointment.id)}
                  className="w-full sm:w-auto px-6 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-all"
                >
                  Cancelar Marcação
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
