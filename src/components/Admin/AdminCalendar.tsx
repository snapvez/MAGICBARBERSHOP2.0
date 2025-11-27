import { useState, useEffect } from 'react';
import { Calendar, X, Plus, CheckCircle, Clock, User, Phone, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { EditAppointmentModal } from './EditAppointmentModal';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  client_id: string | null;
  guest_id: string | null;
  service_id: string;
  barber_id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  is_subscription_booking: boolean;
  client_name_at_booking: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
  guests?: {
    full_name: string;
    phone: string;
  };
  services: Service;
  barbers: {
    name: string;
  };
}

interface AdminCalendarProps {
  onNavigate?: (page: string) => void;
}

type ConfirmActionType = 'confirm' | 'complete' | 'cancel';

export const AdminCalendar = ({ onNavigate }: AdminCalendarProps) => {
  const { isSuperAdmin, adminBarberId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: ConfirmActionType, id: string } | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [newBooking, setNewBooking] = useState({
    client_name: '',
    client_phone: '',
    service_id: '',
    barber_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
  });

  useEffect(() => {
    loadMonthAppointments();
  }, [currentDate]);

  useEffect(() => {
    loadServices();
    loadBarbers();
  }, []);

  const loadMonthAppointments = async () => {
    setLoading(true);
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = endOfMonth.toISOString().split('T')[0];

    console.log('Loading appointments for:', { startDate, endDate, isSuperAdmin, adminBarberId });

    let query = supabase
      .from('appointments')
      .select(`
        *,
        profiles:client_id(full_name, phone),
        guests:guest_id(full_name, phone),
        services:service_id(id, name, price, duration_minutes),
        barbers:barber_id(name)
      `)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .neq('status', 'cancelled')
      .order('start_time');

    if (!isSuperAdmin && adminBarberId) {
      query = query.eq('barber_id', adminBarberId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading appointments:', error);
    }

    console.log('Appointments loaded:', data?.length, data);

    if (data) {
      setAppointments(data as unknown as Appointment[]);
    }
    setLoading(false);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('is_active', true)
      .order('price');
    if (data) setServices(data);
  };

  const loadBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (data) setBarbers(data);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    setConfirmAction({ type: 'cancel', id: appointmentId });
    setShowConfirmModal(true);
  };

  const executeCancelAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId);

    if (!error) {
      loadMonthAppointments();
    } else {
      alert('Erro ao cancelar marcação');
    }
  };

  const handleConfirmAppointment = (appointmentId: string) => {
    setConfirmAction({ type: 'confirm', id: appointmentId });
    setShowConfirmModal(true);
  };

  const executeConfirmAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', appointmentId);

    if (!error) {
      loadMonthAppointments();
    } else {
      console.error('Error confirming appointment:', error);
      alert(`Erro ao confirmar marcação: ${error.message}`);
    }
  };

  const handleCompleteAppointment = (appointmentId: string) => {
    setConfirmAction({ type: 'complete', id: appointmentId });
    setShowConfirmModal(true);
  };

  const executeCompleteAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId);

    if (!error) {
      loadMonthAppointments();
    } else {
      console.error('Error completing appointment:', error);
      alert(`Erro ao marcar como concluído: ${error.message}`);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;

    await executeCancelAppointment(confirmAction.id);

    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleAddWalkIn = async () => {
    if (!newBooking.client_name || !newBooking.client_phone || !newBooking.service_id || !newBooking.barber_id || !newBooking.time) {
      alert('Preencha todos os campos');
      return;
    }

    const selectedService = services.find(s => s.id === newBooking.service_id);
    if (!selectedService) {
      alert('Serviço não encontrado');
      return;
    }

    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .insert({
        full_name: newBooking.client_name,
        phone: newBooking.client_phone,
        email: null,
      })
      .select()
      .single();

    if (guestError) {
      alert('Erro ao criar cliente');
      return;
    }

    const startDateTime = new Date(`${newBooking.date}T${newBooking.time}`);
    const endDateTime = new Date(startDateTime.getTime() + selectedService.duration_minutes * 60000);
    const endTimeStr = endDateTime.toTimeString().slice(0, 5);

    const { error } = await supabase
      .from('appointments')
      .insert({
        guest_id: guestData.id,
        service_id: newBooking.service_id,
        barber_id: newBooking.barber_id,
        appointment_date: newBooking.date,
        start_time: newBooking.time,
        end_time: endTimeStr,
        status: 'confirmed',
        client_name_at_booking: newBooking.client_name,
        is_subscription_booking: false,
      });

    if (!error) {
      setShowAddModal(false);
      setNewBooking({
        client_name: '',
        client_phone: '',
        service_id: '',
        barber_id: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
      });
      loadMonthAppointments();
    } else {
      alert('Erro ao criar marcação');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getAppointmentsForDate = (date: Date | null) => {
    if (!date) return [];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const filtered = appointments.filter(apt => apt.appointment_date === dateStr);
    console.log('Filtering appointments for date:', dateStr, 'Found:', filtered.length, filtered);
    return filtered;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const selectedDateAppointments = selectedDate
    ? getAppointmentsForDate(new Date(selectedDate + 'T12:00:00'))
    : [];

  return (
    <div className="min-h-screen bg-magic-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-magic-gold mb-2">Calendário de Agendamentos</h1>
            <p className="text-magic-yellow">Vista mensal completa</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-magic-gold/50"
          >
            <Plus className="w-5 h-5" />
            Agendar Walk-in
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-magic-gold/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-magic-gold" />
                </button>
                <h2 className="text-2xl font-bold text-magic-gold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-magic-gold/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-magic-gold" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-magic-yellow font-semibold text-sm py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth().map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${day}`;

                  const dayAppointments = getAppointmentsForDate(date);

                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`aspect-square p-2 rounded-lg transition-all relative ${
                        isSelected
                          ? 'bg-magic-gold text-magic-black ring-2 ring-magic-gold'
                          : isToday
                          ? 'bg-magic-gold/20 text-magic-gold border-2 border-magic-gold'
                          : 'bg-magic-black text-white hover:bg-gray-800 border border-magic-gold/20'
                      }`}
                    >
                      <div className="text-sm font-semibold">{date.getDate()}</div>
                      {dayAppointments.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                          <div className="flex gap-0.5">
                            {dayAppointments.slice(0, 3).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSelected ? 'bg-magic-black' : 'bg-magic-gold'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30 h-[700px] flex flex-col">
              <h3 className="text-xl font-bold text-magic-gold mb-4">
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Selecione uma data'}
              </h3>

              {!selectedDate ? (
                <div className="text-center py-12 text-magic-yellow flex-1 flex flex-col items-center justify-center">
                  <Calendar className="w-16 h-16 mb-4 opacity-50" />
                  <p>Clique numa data para ver as marcações</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-0.5">
                    {getTimeSlots().map((timeSlot) => {
                      const appointment = selectedDateAppointments.find(
                        (apt) => apt.start_time.slice(0, 5) === timeSlot
                      );

                      if (timeSlot === '17:00') {
                        console.log('Checking 17:00 slot:', {
                          timeSlot,
                          allAppointments: selectedDateAppointments,
                          foundAppointment: appointment
                        });
                      }

                      const isLunchTime = () => {
                        const [hour] = timeSlot.split(':').map(Number);
                        return hour >= 13 && hour < 15;
                      };

                      const isBlockedByAppointment = () => {
                        if (appointment) return false;

                        const currentTimeMinutes = timeSlot.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));

                        return selectedDateAppointments.some(apt => {
                          const aptStartTime = apt.start_time.slice(0, 5);
                          const aptEndTime = apt.end_time.slice(0, 5);
                          const aptStartMinutes = aptStartTime.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));
                          const aptEndMinutes = aptEndTime.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));

                          return currentTimeMinutes >= aptStartMinutes && currentTimeMinutes < aptEndMinutes;
                        });
                      };

                      const blocked = isBlockedByAppointment();
                      const lunch = isLunchTime();

                      return (
                        <div
                          key={timeSlot}
                          className={`flex items-stretch border-l-4 ${
                            lunch
                              ? 'border-orange-500 bg-orange-900/20'
                              : appointment
                              ? appointment.status === 'completed'
                                ? 'border-green-500 bg-green-900/20'
                                : appointment.status === 'cancelled'
                                ? 'border-red-500 bg-red-900/20'
                                : 'border-magic-gold bg-magic-gold/10'
                              : blocked
                              ? 'border-gray-600 bg-gray-800/30'
                              : 'border-gray-700 bg-magic-black'
                          } rounded-r transition-all hover:bg-magic-gold/5`}
                        >
                          <div className="w-20 flex-shrink-0 p-1.5 flex items-center justify-center border-r border-magic-gold/20">
                            <span className="text-xs font-semibold text-magic-gold">
                              {timeSlot}
                            </span>
                          </div>

                          <div className="flex-1 p-1.5 min-h-[45px]">
                            {appointment ? (
                              <div className="h-full flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-white text-sm">
                                      {appointment.client_name_at_booking ||
                                        appointment.profiles?.full_name ||
                                        appointment.guests?.full_name ||
                                        'Cliente'}
                                    </span>
                                    {getStatusBadge(appointment.status)}
                                  </div>
                                  <div className="text-xs text-magic-yellow mb-1">
                                    {appointment.services.name}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {appointment.barbers.name} • {appointment.profiles?.phone || appointment.guests?.phone || 'N/A'}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-green-400 font-semibold">
                                    {appointment.services.price}€
                                  </span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => setEditingAppointmentId(appointment.id)}
                                      className="p-1.5 bg-magic-gold/20 hover:bg-magic-gold/30 text-magic-gold rounded transition-all"
                                      title="Editar"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    {appointment.status !== 'cancelled' && (
                                      <button
                                        onClick={() => handleCancelAppointment(appointment.id)}
                                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-all"
                                        title="Cancelar"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : lunch ? (
                              <div className="h-full flex items-center justify-center text-orange-400 text-xs font-semibold">
                                Almoço
                              </div>
                            ) : blocked ? (
                              <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                                Ocupado
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-gray-600 text-xs">
                                Disponível
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full border-2 border-magic-gold/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-magic-gold">Agendar Walk-in</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-magic-yellow text-sm font-medium mb-2">Nome do Cliente *</label>
                <input
                  type="text"
                  value={newBooking.client_name}
                  onChange={(e) => setNewBooking({ ...newBooking, client_name: e.target.value })}
                  className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-magic-yellow text-sm font-medium mb-2">Telemóvel *</label>
                <input
                  type="tel"
                  value={newBooking.client_phone}
                  onChange={(e) => setNewBooking({ ...newBooking, client_phone: e.target.value })}
                  className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                  placeholder="+351 xxx xxx xxx"
                />
              </div>

              <div>
                <label className="block text-magic-yellow text-sm font-medium mb-2">Serviço *</label>
                <select
                  value={newBooking.service_id}
                  onChange={(e) => setNewBooking({ ...newBooking, service_id: e.target.value })}
                  className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                >
                  <option value="">Selecione o serviço</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {service.price}€
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-magic-yellow text-sm font-medium mb-2">Barbeiro *</label>
                <select
                  value={newBooking.barber_id}
                  onChange={(e) => setNewBooking({ ...newBooking, barber_id: e.target.value })}
                  className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                >
                  <option value="">Selecione o barbeiro</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-magic-yellow text-sm font-medium mb-2">Data *</label>
                  <input
                    type="date"
                    value={newBooking.date}
                    onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                    className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-magic-yellow text-sm font-medium mb-2">Hora *</label>
                  <select
                    value={newBooking.time}
                    onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                    className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                  >
                    <option value="">Selecione a hora</option>
                    {getTimeSlots().map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddWalkIn}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black rounded-xl font-semibold transition-all"
                >
                  Criar Marcação
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-semibold hover:bg-gray-700 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border-2 border-magic-gold/50 shadow-2xl shadow-magic-gold/20">
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-magic-gold mb-2">
                  Confirmar Cancelamento
                </h3>
                <p className="text-magic-yellow text-lg">
                  Tem a certeza que quer cancelar esta marcação?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelConfirm}
                  className="flex-1 px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-semibold hover:bg-gray-700 transition-all"
                >
                  Não
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white"
                >
                  Sim, Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingAppointmentId && (
        <EditAppointmentModal
          appointmentId={editingAppointmentId}
          onClose={() => setEditingAppointmentId(null)}
          onUpdate={() => {
            loadAppointments();
            setEditingAppointmentId(null);
          }}
        />
      )}
    </div>
  );
};
