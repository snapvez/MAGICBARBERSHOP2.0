import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Edit, Clock, User, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
  is_active: boolean;
}

interface Appointment {
  id: string;
  client_id: string | null;
  guest_id: string | null;
  service_id: string;
  barber_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
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
}

export const BarberScheduleView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ barberId: string; time: string } | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [newBooking, setNewBooking] = useState({
    client_name: '',
    client_phone: '',
    service_id: '',
  });

  useEffect(() => {
    loadBarbers();
    loadServices();
  }, []);

  useEffect(() => {
    if (barbers.length > 0) {
      loadDayAppointments();
    }
  }, [currentDate, barbers]);

  const loadBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (data) setBarbers(data);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('is_active', true)
      .order('price');
    if (data) setServices(data);
  };

  const loadDayAppointments = async () => {
    setLoading(true);
    const dateStr = currentDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles:client_id(full_name, phone),
        guests:guest_id(full_name, phone),
        services:service_id(id, name, price, duration_minutes)
      `)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled')
      .order('start_time');

    if (error) {
      console.error('Error loading appointments:', error);
    }

    if (data) {
      setAppointments(data as unknown as Appointment[]);
    }
    setLoading(false);
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

  const getAppointmentForSlot = (barberId: string, timeSlot: string) => {
    return appointments.find(
      apt => apt.barber_id === barberId && apt.start_time.slice(0, 5) === timeSlot
    );
  };

  const isSlotBlockedByAppointment = (barberId: string, timeSlot: string) => {
    const currentTimeMinutes = timeSlot.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));

    return appointments.some(apt => {
      if (apt.barber_id !== barberId) return false;

      const aptStartTime = apt.start_time.slice(0, 5);
      const aptEndTime = apt.end_time.slice(0, 5);
      const aptStartMinutes = aptStartTime.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));
      const aptEndMinutes = aptEndTime.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));

      return currentTimeMinutes >= aptStartMinutes && currentTimeMinutes < aptEndMinutes;
    });
  };

  const handleSlotClick = (barberId: string, timeSlot: string) => {
    const appointment = getAppointmentForSlot(barberId, timeSlot);
    if (appointment) {
      setEditingAppointmentId(appointment.id);
    } else if (!isSlotBlockedByAppointment(barberId, timeSlot)) {
      setSelectedSlot({ barberId, time: timeSlot });
      setShowAddModal(true);
    }
  };

  const handleAddAppointment = async () => {
    if (!newBooking.client_name || !newBooking.client_phone || !newBooking.service_id || !selectedSlot) {
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

    const dateStr = currentDate.toISOString().split('T')[0];
    const startDateTime = new Date(`${dateStr}T${selectedSlot.time}`);
    const endDateTime = new Date(startDateTime.getTime() + selectedService.duration_minutes * 60000);
    const endTimeStr = endDateTime.toTimeString().slice(0, 5);

    const { error } = await supabase
      .from('appointments')
      .insert({
        guest_id: guestData.id,
        service_id: newBooking.service_id,
        barber_id: selectedSlot.barberId,
        appointment_date: dateStr,
        start_time: selectedSlot.time,
        end_time: endTimeStr,
        status: 'confirmed',
        client_name_at_booking: newBooking.client_name,
        is_subscription_booking: false,
      });

    if (!error) {
      setShowAddModal(false);
      setSelectedSlot(null);
      setNewBooking({
        client_name: '',
        client_phone: '',
        service_id: '',
      });
      loadDayAppointments();
    } else {
      alert('Erro ao criar marcação');
    }
  };

  const previousDay = () => {
    setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
  };

  const nextDay = () => {
    setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isLunchTime = (timeSlot: string) => {
    const [hour] = timeSlot.split(':').map(Number);
    return hour >= 13 && hour < 15;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-600 border-blue-500';
      case 'completed':
        return 'bg-green-600 border-green-500';
      case 'pending':
        return 'bg-amber-600 border-amber-500';
      default:
        return 'bg-gray-600 border-gray-500';
    }
  };

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const today = new Date();
  const isToday = currentDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-magic-black">
      <div className="max-w-full px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-magic-gold mb-2">Agenda dos Barbeiros</h1>
            <p className="text-magic-yellow">Vista diária por barbeiro</p>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-magic-gold/20 hover:bg-magic-gold/30 text-magic-gold rounded-lg transition-all font-semibold"
          >
            Hoje
          </button>
        </div>

        <div className="mb-6 flex items-center justify-center gap-4 bg-gray-900 rounded-xl p-4 border-2 border-magic-gold/30">
          <button
            onClick={previousDay}
            className="p-2 hover:bg-magic-gold/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-magic-gold" />
          </button>

          <div className="text-center">
            <div className="text-2xl font-bold text-magic-gold">
              {dayNames[currentDate.getDay()]}, {currentDate.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            {isToday && (
              <div className="text-sm text-magic-yellow font-semibold mt-1">Hoje</div>
            )}
          </div>

          <button
            onClick={nextDay}
            className="p-2 hover:bg-magic-gold/10 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-magic-gold" />
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl border-2 border-magic-gold/30 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] bg-gray-800 border-b-2 border-magic-gold/30" style={{ gridTemplateColumns: `100px repeat(${barbers.length}, minmax(200px, 1fr))` }}>
                <div className="p-4 border-r border-magic-gold/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-magic-gold" />
                </div>
                {barbers.map(barber => (
                  <div
                    key={barber.id}
                    className="p-4 border-r border-magic-gold/20 text-center"
                  >
                    <div className="font-bold text-magic-gold text-lg">{barber.name}</div>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-magic-gold/10">
                {getTimeSlots().map((timeSlot) => {
                  const isLunch = isLunchTime(timeSlot);

                  return (
                    <div
                      key={timeSlot}
                      className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] hover:bg-magic-gold/5 transition-colors"
                      style={{ gridTemplateColumns: `100px repeat(${barbers.length}, minmax(200px, 1fr))` }}
                    >
                      <div className="p-3 border-r border-magic-gold/20 flex items-center justify-center bg-gray-800/50">
                        <span className="text-sm font-semibold text-magic-gold">{timeSlot}</span>
                      </div>

                      {barbers.map(barber => {
                        const appointment = getAppointmentForSlot(barber.id, timeSlot);
                        const blocked = isSlotBlockedByAppointment(barber.id, timeSlot);

                        return (
                          <div
                            key={`${barber.id}-${timeSlot}`}
                            onClick={() => handleSlotClick(barber.id, timeSlot)}
                            className={`p-2 border-r border-magic-gold/20 min-h-[70px] cursor-pointer transition-all ${
                              isLunch
                                ? 'bg-orange-900/20 hover:bg-orange-900/30'
                                : appointment
                                ? `${getStatusColor(appointment.status)} hover:opacity-90`
                                : blocked
                                ? 'bg-gray-800/50 cursor-not-allowed'
                                : 'hover:bg-magic-gold/10'
                            }`}
                          >
                            {appointment ? (
                              <div className="text-white h-full flex flex-col justify-between">
                                <div>
                                  <div className="font-semibold text-sm mb-1 flex items-center justify-between">
                                    <span className="truncate">
                                      {appointment.client_name_at_booking ||
                                        appointment.profiles?.full_name ||
                                        appointment.guests?.full_name}
                                    </span>
                                    <Edit className="w-3 h-3 opacity-50" />
                                  </div>
                                  <div className="text-xs opacity-90 mb-1">{appointment.services.name}</div>
                                  <div className="text-xs opacity-75 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {appointment.profiles?.phone || appointment.guests?.phone}
                                  </div>
                                </div>
                                <div className="text-xs font-semibold text-green-300 mt-2">
                                  {appointment.services.price}€
                                </div>
                              </div>
                            ) : isLunch ? (
                              <div className="h-full flex items-center justify-center text-orange-400 text-xs font-semibold">
                                Almoço
                              </div>
                            ) : blocked ? (
                              <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                                Ocupado
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4 text-magic-gold" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gray-900 rounded-xl p-4 border border-magic-gold/30">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded border border-blue-500"></div>
              <span className="text-gray-300">Confirmado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded border border-green-500"></div>
              <span className="text-gray-300">Concluído</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-600 rounded border border-amber-500"></div>
              <span className="text-gray-300">Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-900/50 rounded"></div>
              <span className="text-gray-300">Almoço</span>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border-2 border-magic-gold/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-magic-gold">Agendar Cliente</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedSlot(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-magic-gold/10 rounded-lg border border-magic-gold/30">
              <div className="text-sm text-magic-yellow mb-1">Barbeiro:</div>
              <div className="font-semibold text-white">
                {barbers.find(b => b.id === selectedSlot.barberId)?.name}
              </div>
              <div className="text-sm text-magic-yellow mt-2">Horário:</div>
              <div className="font-semibold text-white">{selectedSlot.time}</div>
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
                      {service.name} - {service.price}€ ({service.duration_minutes}min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddAppointment}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black rounded-xl font-semibold transition-all"
                >
                  Criar Marcação
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedSlot(null);
                  }}
                  className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-semibold hover:bg-gray-700 transition-all"
                >
                  Cancelar
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
            loadDayAppointments();
            setEditingAppointmentId(null);
          }}
        />
      )}
    </div>
  );
};
