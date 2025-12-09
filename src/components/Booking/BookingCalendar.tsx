import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomAlert } from '../UI/CustomAlert';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  points_reward: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
  is_active: boolean;
}

export const BookingCalendar = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [filteredBarbers, setFilteredBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [availableBarbers, setAvailableBarbers] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasValidSubscription, setHasValidSubscription] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [hasPendingAppointment, setHasPendingAppointment] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [bookingWindowDays, setBookingWindowDays] = useState<number>(7);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertType, setAlertType] = useState<'error' | 'success' | 'warning' | 'info'>('info');

  useEffect(() => {
    loadServices();
    loadBarbers();
    checkSubscription();
    checkPendingAppointments();
    loadBookingWindowConfig();
  }, [user]);

  useEffect(() => {
    if (selectedService) {
      loadBarbersByService(selectedService.id);
    } else {
      setFilteredBarbers(barbers);
    }
  }, [selectedService, barbers]);

  useEffect(() => {
    if (selectedDate && selectedService) {
      loadBookedTimes();
    }
  }, [selectedDate, selectedService, filteredBarbers]);

  useEffect(() => {
    if (selectedDate && selectedTime && selectedService) {
      checkBarberAvailability();
    }
  }, [selectedDate, selectedTime, selectedService]);

  const showAlert = (message: string, title = '', type: 'error' | 'success' | 'warning' | 'info' = 'info') => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertType(type);
    setAlertOpen(true);
  };

  const checkPendingAppointments = async () => {
    if (!user) {
      setHasPendingAppointment(false);
      return;
    }

    const isGuest = 'isGuest' in user && user.isGuest;

    let query = supabase
      .from('appointments')
      .select('id')
      .in('status', ['completed', 'confirmed'])
      .eq('is_subscription_booking', true);

    if (isGuest) {
      query = query.eq('guest_id', user.id);
    } else {
      query = query.eq('client_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking pending appointments:', error);
      setHasPendingAppointment(false);
      return;
    }

    const hasPending = !!data && data.length > 0;
    console.log('Pending subscription appointments check:', { userId: user.id, hasPending, count: data?.length });
    setHasPendingAppointment(hasPending);
  };

  const loadBookingWindowConfig = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'non_subscriber_booking_window_days')
      .maybeSingle();

    if (data?.setting_value) {
      const days = parseInt(data.setting_value as string);
      setBookingWindowDays(isNaN(days) ? 7 : days);
    }
  };

  const checkSubscription = async () => {
    if (!user) {
      setSubscriptionChecked(true);
      return;
    }

    if ('isGuest' in user && user.isGuest) {
      setHasValidSubscription(false);
      setSubscriptionChecked(true);
      return;
    }

    const { data } = await supabase
      .from('client_subscriptions')
      .select('*, subscription_plans(cuts_per_month)')
      .eq('client_id', user.id)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .maybeSingle();

    setHasValidSubscription(!!data);
    setSubscriptionChecked(true);
  };

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, description, price, points_reward, duration_minutes')
      .eq('is_active', true)
      .order('price');

    if (!error && data) {
      setServices(data);
    }
  };

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setBarbers(data);
    }
  };

  const loadBarbersByService = async (serviceId: string) => {
    const { data, error } = await supabase
      .from('barber_services')
      .select('barber_id, barbers(id, name, is_active)')
      .eq('service_id', serviceId);

    if (error) {
      console.error('Error loading barbers for service:', error);
      showAlert('Erro ao carregar barbeiros disponíveis para este serviço', 'Erro', 'error');
      setFilteredBarbers([]);
      return;
    }

    if (!data || data.length === 0) {
      showAlert(
        'Nenhum barbeiro está disponível para realizar este serviço. Por favor, contacte a barbearia.',
        'Serviço Indisponível',
        'warning'
      );
      setFilteredBarbers([]);
      setSelectedBarber('');
      return;
    }

    const availableBarbers = data
      .map(bs => bs.barbers as unknown as Barber)
      .filter(barber => barber && barber.is_active);

    setFilteredBarbers(availableBarbers);

    if (selectedBarber && !availableBarbers.find(b => b.id === selectedBarber)) {
      setSelectedBarber('');
    }
  };

  const loadBookedTimes = async () => {
    if (!selectedDate || !selectedService || filteredBarbers.length === 0) return;

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('start_time, end_time, barber_id')
      .eq('appointment_date', selectedDate)
      .in('status', ['completed', 'confirmed']);

    if (error) {
      console.error('Error loading booked times:', error);
      setBookedTimes([]);
      return;
    }

    if (!appointments) {
      setBookedTimes([]);
      return;
    }

    console.log('Appointments found for date:', selectedDate, appointments);

    const fullyBookedTimes = new Set<string>();
    const serviceDuration = selectedService.duration_minutes;

    const startHour = 9;
    const endHour = 19;
    const lunchStartMinutes = 13 * 60;
    const lunchEndMinutes = 15 * 60;
    const closingMinutes = endHour * 60;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const startTimeInMinutes = hour * 60 + minute;
        const endTimeInMinutes = startTimeInMinutes + serviceDuration;

        if (endTimeInMinutes > closingMinutes) continue;
        if (startTimeInMinutes >= lunchStartMinutes && startTimeInMinutes < lunchEndMinutes) continue;
        if (endTimeInMinutes > lunchStartMinutes && endTimeInMinutes <= lunchEndMinutes) continue;
        if (startTimeInMinutes < lunchStartMinutes && endTimeInMinutes > lunchEndMinutes) continue;

        const requestedStart = new Date(`${selectedDate}T${timeStr}`);
        const requestedEnd = new Date(requestedStart.getTime() + serviceDuration * 60000);

        let availableBarberCount = filteredBarbers.length;

        const busyBarbers = new Set<string>();

        appointments.forEach(apt => {
          const aptStart = new Date(`${selectedDate}T${apt.start_time}`);
          const aptEnd = new Date(`${selectedDate}T${apt.end_time}`);

          if (
            (requestedStart >= aptStart && requestedStart < aptEnd) ||
            (requestedEnd > aptStart && requestedEnd <= aptEnd) ||
            (requestedStart <= aptStart && requestedEnd >= aptEnd)
          ) {
            busyBarbers.add(apt.barber_id);
          }
        });

        availableBarberCount = filteredBarbers.filter(b => !busyBarbers.has(b.id)).length;

        if (availableBarberCount === 0) {
          fullyBookedTimes.add(timeStr);
        }
      }
    }

    const bookedTimesArray = Array.from(fullyBookedTimes);
    console.log('Fully booked times:', bookedTimesArray);
    setBookedTimes(bookedTimesArray);
  };

  const checkBarberAvailability = async () => {
    if (!selectedDate || !selectedTime || !selectedService) return;

    const requestedStartTime = new Date(`${selectedDate}T${selectedTime}`);
    const requestedEndTime = new Date(requestedStartTime.getTime() + selectedService.duration_minutes * 60000);

    const { data: bookedAppointments } = await supabase
      .from('appointments')
      .select('barber_id, start_time, end_time')
      .eq('appointment_date', selectedDate)
      .in('status', ['completed', 'confirmed']);

    const bookedBarberIds: string[] = [];

    bookedAppointments?.forEach(apt => {
      const aptStart = new Date(`${selectedDate}T${apt.start_time}`);
      const aptEnd = new Date(`${selectedDate}T${apt.end_time}`);

      if (
        (requestedStartTime >= aptStart && requestedStartTime < aptEnd) ||
        (requestedEndTime > aptStart && requestedEndTime <= aptEnd) ||
        (requestedStartTime <= aptStart && requestedEndTime >= aptEnd)
      ) {
        bookedBarberIds.push(apt.barber_id);
      }
    });

    const available = filteredBarbers
      .filter(barber => !bookedBarberIds.includes(barber.id))
      .map(barber => barber.id);

    setAvailableBarbers(available);

    if (available.length === 1) {
      setSelectedBarber(available[0]);
    } else if (available.length === 0) {
      setSelectedBarber('');
    } else if (selectedBarber && !available.includes(selectedBarber)) {
      setSelectedBarber('');
    }
  };

  const getPortugalTime = () => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
  };

  const getAvailableTimes = () => {
    const times = [];
    const now = getPortugalTime();
    const isToday = selectedDate === now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (!selectedService) return times;

    const serviceDuration = selectedService.duration_minutes;
    const startHour = 9;
    const endHour = 19;
    const lunchStartMinutes = 13 * 60;
    const lunchEndMinutes = 15 * 60;
    const closingMinutes = endHour * 60;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const startTimeInMinutes = hour * 60 + minute;
        const endTimeInMinutes = startTimeInMinutes + serviceDuration;

        if (endTimeInMinutes > closingMinutes) {
          continue;
        }

        if (startTimeInMinutes >= lunchStartMinutes && startTimeInMinutes < lunchEndMinutes) {
          continue;
        }

        if (endTimeInMinutes > lunchStartMinutes && endTimeInMinutes <= lunchEndMinutes) {
          continue;
        }

        if (startTimeInMinutes < lunchStartMinutes && endTimeInMinutes > lunchEndMinutes) {
          continue;
        }

        if (isToday) {
          const timeNow = currentHour * 60 + currentMinute;
          const minBookingTime = timeNow + 60;
          if (startTimeInMinutes < minBookingTime) {
            continue;
          }
        }

        times.push(timeStr);
      }
    }
    return times;
  };

  const getMinDate = () => {
    const now = getPortugalTime();
    const minDate = new Date(now);

    if (now.getHours() >= 18) {
      minDate.setDate(minDate.getDate() + 1);
    }

    return minDate.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    if (hasValidSubscription) {
      return undefined;
    }

    const now = getPortugalTime();
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + bookingWindowDays);

    return maxDate.toISOString().split('T')[0];
  };

  const handleBooking = async () => {
    if (!user) {
      showAlert('Por favor, faz login para agendar.', 'Login Necessário', 'warning');
      return;
    }

    if (hasValidSubscription) {
      await checkPendingAppointments();

      if (hasPendingAppointment) {
        showAlert('Já tens uma marcação de assinatura pendente. Aguarda a confirmação do administrador antes de fazer outra marcação.', 'Marcação Pendente', 'warning');
        return;
      }
    }

    if (!selectedService || !selectedDate || !selectedTime) {
      showAlert('Por favor, seleciona o serviço, data e hora.', 'Dados Incompletos', 'warning');
      return;
    }

    if (!selectedBarber) {
      showAlert('Por favor, seleciona o barbeiro.', 'Barbeiro Não Selecionado', 'warning');
      return;
    }

    if (availableBarbers.length === 0) {
      showAlert('Não há barbeiros disponíveis neste horário. Por favor, escolhe outro horário.', 'Horário Indisponível', 'error');
      return;
    }

    const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const now = getPortugalTime();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    if (appointmentDateTime < oneHourFromNow) {
      showAlert('A marcação deve ser feita com pelo menos 1 hora de antecedência.', 'Antecedência Insuficiente', 'warning');
      return;
    }

    if (!hasValidSubscription) {
      const maxDate = getMaxDate();
      if (maxDate && selectedDate > maxDate) {
        showAlert(
          `Não assinantes podem agendar até ${bookingWindowDays} dias de antecedência. Considera a nossa assinatura premium para agendar sem limites!`,
          'Limite de Agendamento',
          'warning'
        );
        return;
      }
    }

    setLoading(true);

    const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const endDateTime = new Date(startDateTime.getTime() + selectedService.duration_minutes * 60000);
    const endTimeStr = endDateTime.toTimeString().slice(0, 5);

    const isGuest = 'isGuest' in user && user.isGuest;

    let clientName = '';
    if (isGuest) {
      const { data: guestData } = await supabase
        .from('guests')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      clientName = guestData?.full_name || 'Convidado';
    } else {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      clientName = profileData?.full_name || 'Cliente';
    }

    const appointmentData: any = {
      service_id: selectedService.id,
      barber_id: selectedBarber,
      appointment_date: selectedDate,
      start_time: selectedTime,
      end_time: endTimeStr,
      status: 'completed',
      notes: notes || null,
      points_earned: 0,
      client_name_at_booking: clientName,
      is_subscription_booking: hasValidSubscription,
    };

    if (isGuest) {
      appointmentData.guest_id = user.id;
    } else {
      appointmentData.client_id = user.id;
    }

    const { error } = await supabase
      .from('appointments')
      .insert(appointmentData);

    setLoading(false);

    if (error) {
      console.error('Booking error:', error);

      let errorMessage = 'Erro ao criar marcação. Tenta novamente.';

      if (error.message.includes('marcação de assinatura pendente') ||
          error.message.includes('Já tens uma marcação')) {
        errorMessage = 'Já tens uma marcação ativa. Só podes fazer nova marcação depois da anterior terminar.';
        if (hasValidSubscription) {
          await checkPendingAppointments();
        }
      } else if (error.message.includes('já tem marcação neste horário') ||
                 error.message.includes('Barbeiro já tem marcação')) {
        errorMessage = 'Este horário já não está disponível. Por favor, escolhe outro horário.';
        await loadBookedTimes();
        await checkBarberAvailability();
      } else if (error.message.includes('podem agendar até') ||
                 error.message.includes('dias de antecedência')) {
        errorMessage = error.message;
      }

      showAlert(errorMessage, 'Erro ao Criar Marcação', 'error');
    } else {
      setSuccess(true);
      await checkPendingAppointments();
      setTimeout(() => {
        setSuccess(false);
        setSelectedService(null);
        setSelectedBarber('');
        setSelectedDate('');
        setSelectedTime('');
        setNotes('');
      }, 3000);
    }
  };

  if (success) {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-gradient-to-br from-magic-black to-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl shadow-magic-gold/30 p-6 sm:p-8 md:p-12 text-center border-2 border-magic-gold">
            <div className="w-20 h-20 bg-magic-gold rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-magic-black" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-magic-gold mb-4">Marcação Criada!</h2>
            <p className="text-base sm:text-lg md:text-xl text-magic-yellow mb-2">
              A tua marcação foi registada com sucesso.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-gray-400">
              Entraremos em contacto em breve para confirmação.
            </p>
          </div>
        </div>
        <CustomAlert
          isOpen={alertOpen}
          onClose={() => setAlertOpen(false)}
          title={alertTitle}
          message={alertMessage}
          type={alertType}
        />
      </>
    );
  }

  if (selectedService) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => setSelectedService(null)}
          className="mb-6 text-magic-gold hover:text-magic-yellow font-semibold"
        >
          ← Voltar aos serviços
        </button>

        <div className="bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl shadow-magic-gold/20 overflow-hidden border-2 border-magic-gold/50">
          <div className="bg-gradient-to-r from-magic-black to-gray-900 p-6 sm:p-8 text-white border-b-2 border-magic-gold/50">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-magic-gold">{selectedService.name}</h2>
            <p className="text-magic-yellow mb-4">{selectedService.description}</p>
            <div className="flex items-center gap-6">
              <div className="text-2xl font-bold text-magic-gold">{selectedService.price}€</div>
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            {hasPendingAppointment && hasValidSubscription && (
              <div className="bg-red-900/20 border-2 border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-400 mb-1">
                    Marcação de Assinatura Pendente
                  </div>
                  <div className="text-sm text-red-300">
                    Já tens uma marcação de assinatura à espera de confirmação. Aguarda a confirmação do administrador antes de fazer outra marcação de assinatura.
                  </div>
                </div>
              </div>
            )}

            {!hasPendingAppointment && subscriptionChecked && hasValidSubscription && (
              <div className="bg-green-900/20 border-2 border-green-500/50 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-green-400 mb-1">
                    Assinatura Ativa ✨
                  </div>
                  <div className="text-sm text-green-300">
                    Esta marcação está coberta pela tua assinatura premium!
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-magic-gold mb-2">
                Seleciona o Barbeiro
              </label>
              {selectedDate && selectedTime && availableBarbers.length === 0 ? (
                <div className="bg-red-900/20 border-2 border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-300">
                    Não há barbeiros disponíveis neste horário. Por favor, escolhe outro horário.
                  </div>
                </div>
              ) : selectedDate && selectedTime && availableBarbers.length === 1 ? (
                <div className="bg-blue-900/20 border-2 border-blue-500/50 rounded-xl p-4">
                  <div className="text-blue-300 text-sm mb-2">
                    Apenas um barbeiro disponível neste horário:
                  </div>
                  <div className="text-xl font-bold text-blue-400">
                    {filteredBarbers.find(b => b.id === selectedBarber)?.name}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredBarbers.map((barber) => {
                    const isAvailable = !selectedDate || !selectedTime || availableBarbers.includes(barber.id);
                    const isSelected = selectedBarber === barber.id;
                    return (
                      <button
                        key={barber.id}
                        onClick={() => isAvailable && setSelectedBarber(barber.id)}
                        disabled={!isAvailable}
                        className={`py-4 px-6 rounded-xl font-semibold text-base transition-all ${
                          isSelected
                            ? 'bg-magic-gold text-magic-black shadow-lg shadow-magic-gold/50 scale-105'
                            : isAvailable
                            ? 'bg-gray-800 text-magic-yellow hover:bg-gray-700 border-2 border-magic-gold/30 hover:border-magic-gold/50'
                            : 'bg-gray-900 text-gray-600 border-2 border-gray-700 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {barber.name}
                        {!isAvailable && selectedDate && selectedTime && (
                          <div className="text-xs mt-1">Ocupado</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-magic-gold mb-2">
                Seleciona a Data
              </label>
              {!hasValidSubscription && (
                <div className="mb-3 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300">
                    Podes agendar até <span className="font-semibold">{bookingWindowDays} dias</span> de antecedência. Quer mais flexibilidade? Considera a nossa assinatura premium!
                  </p>
                </div>
              )}
              <input
                type="date"
                min={getMinDate()}
                max={getMaxDate()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-xl focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all text-base text-white touch-manipulation"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-magic-gold mb-2">
                Seleciona a Hora
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {getAvailableTimes().map((time) => {
                  const isBooked = bookedTimes.includes(time);
                  return (
                    <button
                      key={time}
                      onClick={() => !isBooked && setSelectedTime(time)}
                      disabled={isBooked}
                      className={`py-2 sm:py-3 px-2 rounded-lg font-semibold text-sm transition-all touch-manipulation relative ${
                        isBooked
                          ? 'bg-red-950/40 text-red-400/60 border-2 border-red-800/60 cursor-not-allowed opacity-60'
                          : selectedTime === time
                          ? 'bg-magic-gold text-magic-black shadow-lg shadow-magic-gold/50 scale-105 border-2 border-magic-gold'
                          : 'bg-gray-800 text-magic-yellow hover:bg-gray-700 border-2 border-magic-gold/30 hover:border-magic-gold/60 hover:scale-105'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {isBooked && <span className="text-red-400">✕</span>}
                        <span>{time}</span>
                      </div>
                      {isBooked && (
                        <div className="text-[10px] mt-0.5 font-normal text-red-300">
                          Ocupado
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-6 bg-gray-800 border-2 border-magic-gold/30 rounded flex items-center justify-center">
                    <span className="text-magic-yellow text-[10px]">✓</span>
                  </div>
                  <span>Disponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-6 bg-red-950/40 border-2 border-red-800/60 rounded flex items-center justify-center opacity-60">
                    <span className="text-red-400 text-xs">✕</span>
                  </div>
                  <span>Ocupado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-6 bg-magic-gold border-2 border-magic-gold rounded"></div>
                  <span className="font-semibold text-magic-gold">Selecionado</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-magic-gold mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Algum pedido especial ou preferência?"
                rows={3}
                className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-xl focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all resize-none text-white"
              />
            </div>

            <button
              onClick={handleBooking}
              disabled={loading || !selectedDate || !selectedTime || !selectedBarber || availableBarbers.length === 0}
              className="w-full bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-magic-gold/50 flex items-center justify-center gap-2"
            >
              {loading ? (
                'A criar marcação...'
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Confirmar Marcação
                </>
              )}
            </button>
          </div>
        </div>

        <CustomAlert
          isOpen={alertOpen}
          onClose={() => setAlertOpen(false)}
          title={alertTitle}
          message={alertMessage}
          type={alertType}
        />
      </div>
    );
  }

  if (!subscriptionChecked) {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4 text-center py-12">
          <div className="text-xl text-magic-yellow">A verificar assinatura...</div>
        </div>
        <CustomAlert
          isOpen={alertOpen}
          onClose={() => setAlertOpen(false)}
          title={alertTitle}
          message={alertMessage}
          type={alertType}
        />
      </>
    );
  }

  if (hasValidSubscription) {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-gradient-to-br from-magic-gold to-magic-yellow rounded-3xl shadow-2xl shadow-magic-gold/50 p-8 text-center border-2 border-magic-gold">
            <div className="w-20 h-20 bg-magic-black/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-magic-black" />
            </div>
            <h2 className="text-3xl font-bold text-magic-black mb-4">Assinatura Ativa</h2>
            <p className="text-lg text-magic-black/80 mb-6">
              Tens uma assinatura ativa! Para agendar os teus cortes incluídos na assinatura, vai à página de Assinatura.
            </p>
            <p className="text-base text-magic-black/70">
              Todos os serviços estão incluídos na tua assinatura premium.
            </p>
          </div>
        </div>
        <CustomAlert
          isOpen={alertOpen}
          onClose={() => setAlertOpen(false)}
          title={alertTitle}
          message={alertMessage}
          type={alertType}
        />
      </>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-magic-gold mb-3 sm:mb-4">Agendar Serviço</h2>
        <p className="text-magic-yellow text-sm sm:text-base md:text-lg">Escolhe o teu serviço e agenda online em segundos</p>
      </div>

      <div className="bg-gray-900 rounded-2xl shadow-lg shadow-magic-gold/20 p-4 sm:p-6 md:p-8 border-2 border-magic-gold/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="p-4 sm:p-6 rounded-xl border-2 border-magic-gold/30 hover:border-magic-gold hover:shadow-xl hover:shadow-magic-gold/30 transition-all bg-magic-black touch-manipulation"
            >
              <h4 className="font-bold text-lg sm:text-xl text-magic-gold mb-2 sm:mb-3">{service.name}</h4>
              <p className="text-sm text-gray-400 mb-6 min-h-[3rem]">{service.description}</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-magic-yellow">
                  <div className="text-2xl font-bold text-magic-gold">{service.price}€</div>
                </div>
                <button
                  onClick={() => setSelectedService(service)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black rounded-lg font-semibold text-sm sm:text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-magic-gold/50 touch-manipulation"
                >
                  Agendar Agora
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 bg-gradient-to-br from-gray-800 to-magic-black rounded-xl p-6 sm:p-8 text-center border-2 border-magic-gold/50">
          <h3 className="text-xl sm:text-2xl font-bold text-magic-gold mb-3 sm:mb-4">Dúvidas?</h3>
          <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 max-w-2xl mx-auto">
            Preferes marcar por telefone? Liga-nos! Estamos disponíveis de segunda a sábado, das 9h às 19h.
          </p>
          <a
            href="tel:+351912345678"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-xl font-bold text-base sm:text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-magic-gold/50 touch-manipulation"
          >
            <Clock className="w-6 h-6" />
            +351 931 423 262
          </a>
        </div>
      </div>

      <CustomAlert
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
      />
    </div>
  );
};
