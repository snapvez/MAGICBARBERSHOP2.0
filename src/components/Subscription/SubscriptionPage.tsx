import { useState, useEffect } from 'react';
import { Check, Crown, Scissors, Calendar, TrendingDown, Sparkles, Infinity, Users, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  cuts_per_month: number;
  discount_percentage: number;
  description: string | null;
  is_active: boolean;
  stripe_payment_link: string | null;
}

interface ClientSubscription {
  id: string;
  client_id: string;
  plan_id: string;
  status: string;
  cuts_used_this_month: number;
  current_period_start: string;
  current_period_end: string;
  subscription_plans: SubscriptionPlan;
  barber_id: string | null;
  barbers?: {
    name: string;
  };
}

interface Barber {
  id: string;
  name: string;
  is_active: boolean;
  max_subscriptions: number;
  active_subscriptions_count?: number;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export const SubscriptionPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableSpots, setAvailableSpots] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number>(90);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [selectedPlanForSubscription, setSelectedPlanForSubscription] = useState<string>('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingBarber, setBookingBarber] = useState<string>('');
  const [availableBarbers, setAvailableBarbers] = useState<string[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPlans(), loadSubscription(), loadCapacity(), loadBarbers(), loadServices()]);
    setLoading(false);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('price');

    if (data) {
      setServices(data);
    }
  };

  const loadBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) {
      const barbersWithCounts = await Promise.all(
        data.map(async (barber) => {
          const { count } = await supabase
            .from('client_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('barber_id', barber.id)
            .eq('status', 'active')
            .gt('current_period_end', new Date().toISOString());

          return {
            ...barber,
            active_subscriptions_count: count || 0,
          };
        })
      );

      setBarbers(barbersWithCounts);

      const availableBarber = barbersWithCounts.find(
        b => (b.active_subscriptions_count || 0) < b.max_subscriptions
      );
      if (availableBarber) {
        setSelectedBarber(availableBarber.id);
      }
    }
  };

  const loadCapacity = async () => {
    const { data: capacityData } = await supabase
      .from('subscription_capacity')
      .select('max_total_subscriptions')
      .single();

    const { count } = await supabase
      .from('client_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString());

    if (capacityData) {
      setMaxCapacity(capacityData.max_total_subscriptions);
      setAvailableSpots(capacityData.max_total_subscriptions - (count || 0));
    }
  };

  const loadPlans = async () => {
    console.log('🔍 Iniciando carregamento de planos...');
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price');

    if (error) {
      console.error('❌ Erro ao carregar planos:', error);
    }

    if (data) {
      console.log('✅ Planos carregados com sucesso:', data);
      console.log('📊 Total de planos:', data.length);
      setPlans(data);
    } else {
      console.warn('⚠️ Nenhum plano encontrado!');
    }
  };

  const loadSubscription = async () => {
    if (!user) return;

    const isGuest = 'isGuest' in user && user.isGuest;
    let query = supabase
      .from('client_subscriptions')
      .select(`
        *,
        subscription_plans (*),
        barbers (name)
      `)
      .eq('status', 'active');

    if (isGuest) {
      query = query.eq('guest_id', user.id);
    } else {
      query = query.eq('client_id', user.id);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      setSubscription(data as ClientSubscription);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      alert('Por favor, faz login para subscrever.');
      return;
    }

    if (subscription) {
      alert('Já tens uma assinatura ativa!');
      return;
    }

    setSelectedPlanForSubscription(planId);
    setShowBarberModal(true);
  };


  const confirmSubscription = async () => {
    if (!selectedBarber) {
      alert('Por favor, seleciona um barbeiro.');
      return;
    }

    const selectedPlan = plans.find(p => p.id === selectedPlanForSubscription);
    if (!selectedPlan) return;

    if (selectedPlan.stripe_payment_link) {
      const clientId = 'isGuest' in user && user.isGuest ? user.id : user?.id;

      localStorage.setItem('pending_subscription', JSON.stringify({
        client_id: clientId,
        plan_id: selectedPlanForSubscription,
        barber_id: selectedBarber,
      }));

      window.location.href = `${selectedPlan.stripe_payment_link}?client_reference_id=${clientId}&prefilled_email=${user?.email || ''}`;
    } else {
      alert('Link de pagamento não configurado. Contacta o suporte.');
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    const confirmed = confirm('Tens a certeza que queres cancelar a tua assinatura?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('client_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscription.id);

    if (error) {
      alert('Erro ao cancelar assinatura. Tenta novamente.');
      console.error(error);
    } else {
      alert('Assinatura cancelada com sucesso.');
      setSubscription(null);
    }
  };

  const openBookingModal = () => {
    setShowBookingModal(true);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTime('');
    setNotes('');
    setBookingBarber(subscription?.barber_id || '');
  };

  const checkBarberAvailability = async () => {
    if (!selectedDate || !selectedTime) return;

    const { data: bookedAppointments } = await supabase
      .from('appointments')
      .select('barber_id')
      .eq('appointment_date', selectedDate)
      .eq('start_time', selectedTime)
      .in('status', ['pending', 'confirmed']);

    const bookedBarberIds = bookedAppointments?.map(app => app.barber_id) || [];
    const available = barbers
      .filter(barber => !bookedBarberIds.includes(barber.id))
      .map(barber => barber.id);

    setAvailableBarbers(available);

    if (available.length === 1) {
      setBookingBarber(available[0]);
    } else if (available.length === 0) {
      setBookingBarber('');
    } else if (bookingBarber && !available.includes(bookingBarber)) {
      setBookingBarber('');
    }
  };

  useEffect(() => {
    if (selectedDate && selectedTime && showBookingModal) {
      checkBarberAvailability();
    }
  }, [selectedDate, selectedTime, showBookingModal]);

  const getPortugalTime = () => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
  };

  const getAvailableTimes = () => {
    const times = [];
    const now = getPortugalTime();
    const isToday = selectedDate === now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (let hour = 9; hour < 19; hour++) {
      const time00 = `${hour.toString().padStart(2, '0')}:00`;
      const time30 = `${hour.toString().padStart(2, '0')}:30`;

      if (isToday) {
        if (hour > currentHour + 1 || (hour === currentHour + 1 && currentMinute === 0)) {
          times.push(time00);
        }
        if (hour < 18 && (hour > currentHour + 1 || (hour === currentHour + 1 && currentMinute <= 30))) {
          times.push(time30);
        }
      } else {
        times.push(time00);
        if (hour < 18) {
          times.push(time30);
        }
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

  const handleBookingSubmit = async () => {
    if (!user || !subscription) return;

    if (!selectedService || !selectedDate || !selectedTime || !bookingBarber) {
      alert('Por favor, preenche todos os campos.');
      return;
    }

    if (availableBarbers.length === 0) {
      alert('Não há barbeiros disponíveis neste horário.');
      return;
    }

    const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const now = getPortugalTime();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    if (appointmentDateTime < oneHourFromNow) {
      alert('A marcação deve ser feita com pelo menos 1 hora de antecedência.');
      return;
    }

    setBookingLoading(true);

    const endTime = new Date(`${selectedDate}T${selectedTime}`);
    endTime.setHours(endTime.getHours() + 1);
    const endTimeStr = endTime.toTimeString().slice(0, 5);

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
      barber_id: bookingBarber,
      appointment_date: selectedDate,
      start_time: selectedTime,
      end_time: endTimeStr,
      status: 'pending',
      notes: notes || null,
      points_earned: 0,
      client_name_at_booking: clientName,
      is_subscription_booking: true,
    };

    if (isGuest) {
      appointmentData.guest_id = user.id;
    } else {
      appointmentData.client_id = user.id;
    }

    const { error } = await supabase
      .from('appointments')
      .insert(appointmentData);

    setBookingLoading(false);

    if (error) {
      console.error(error);
      alert('Erro ao criar marcação. Tenta novamente.');
    } else {
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setShowBookingModal(false);
        loadSubscription();
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <div className="text-xl text-magic-yellow">A carregar...</div>
      </div>
    );
  }

  console.log('Rendering - Plans:', plans.length, 'Subscription:', subscription);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-magic-gold/20 text-magic-gold px-4 py-2 rounded-full mb-4 border border-magic-gold/50">
          <Crown className="w-5 h-5" />
          <span className="font-semibold">Assinatura Premium</span>
        </div>
        <h1 className="text-5xl font-bold text-magic-gold mb-4">
          Corta Sempre que Quiseres
        </h1>
        <p className="text-xl text-magic-yellow max-w-2xl mx-auto">
          Poupa até 40% com a nossa assinatura mensal. Liberdade total para manteres o teu estilo sempre impecável.
        </p>
        {!subscription && (
          <div className="mt-6 inline-flex items-center gap-2 bg-magic-black/50 border-2 border-magic-gold/50 text-magic-gold px-6 py-3 rounded-xl backdrop-blur-sm">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">45 vagas por barbeiro</span>
          </div>
        )}
      </div>

      {subscription && (
        <div className="bg-gradient-to-br from-magic-gold to-magic-yellow rounded-3xl shadow-2xl shadow-magic-gold/50 p-8 mb-12 text-magic-black border-2 border-magic-gold">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-magic-black/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Assinatura Ativa</h3>
              <p className="text-magic-black/80">{subscription.subscription_plans.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-magic-black/10 backdrop-blur-sm rounded-xl p-6 border border-magic-black/20">
              <div className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
                {subscription.cuts_used_this_month}/<Infinity className="w-8 h-8" />
              </div>
              <div className="text-magic-black/80">Cortes este mês</div>
            </div>
            <div className="bg-magic-black/10 backdrop-blur-sm rounded-xl p-6 border border-magic-black/20">
              <div className="text-4xl font-bold mb-2">{subscription.subscription_plans.price}€</div>
              <div className="text-magic-black/80">Mensalidade</div>
            </div>
            <div className="bg-magic-black/10 backdrop-blur-sm rounded-xl p-6 border border-magic-black/20">
              <div className="text-4xl font-bold mb-2">
                {new Date(subscription.current_period_end).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
              </div>
              <div className="text-magic-black/80">Renova em</div>
            </div>
            {subscription.barbers && (
              <div className="bg-magic-black/10 backdrop-blur-sm rounded-xl p-6 border border-magic-black/20">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-8 h-8" />
                </div>
                <div className="text-xl font-bold mb-1">{subscription.barbers.name}</div>
                <div className="text-magic-black/80">Barbeiro Preferido</div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={openBookingModal}
              className="px-6 py-3 bg-magic-black/20 hover:bg-magic-black/30 text-magic-black rounded-lg font-semibold transition-all backdrop-blur-sm border border-magic-black/30 flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Agendar Corte
            </button>
            <button
              onClick={handleCancelSubscription}
              className="px-6 py-3 bg-red-900/30 hover:bg-red-900/40 text-red-900 rounded-lg font-semibold transition-all backdrop-blur-sm border border-red-900/50"
            >
              Cancelar Assinatura
            </button>
          </div>
        </div>
      )}

      {!subscription && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {plans.map((plan) => {
            return (
              <div
                key={plan.id}
                className="relative bg-gray-900 rounded-3xl shadow-xl shadow-magic-gold/20 p-8 border-2 border-magic-gold/50 hover:border-magic-gold transition-all hover:shadow-2xl hover:shadow-magic-gold/30"
              >
                <div className="text-center mb-8 pt-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-magic-gold/20 to-magic-yellow/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-magic-gold" />
                  </div>
                  <h3 className="text-3xl font-bold text-magic-gold mb-2">{plan.name}</h3>
                  <p className="text-gray-400">{plan.description}</p>
                </div>

                <div className="text-center mb-8">
                  <div className="flex items-end justify-center gap-2 mb-2">
                    {plan.discount_percentage > 0 ? (
                      <>
                        <span className="text-3xl font-bold text-gray-500 line-through">{plan.price}€</span>
                        <span className="text-6xl font-bold text-magic-gold">
                          {(plan.price * (1 - plan.discount_percentage / 100)).toFixed(2)}€
                        </span>
                        <span className="text-gray-500 text-xl mb-2">/mês</span>
                      </>
                    ) : (
                      <>
                        <span className="text-6xl font-bold text-magic-gold">{plan.price}€</span>
                        <span className="text-gray-500 text-xl mb-2">/mês</span>
                      </>
                    )}
                  </div>
                  {plan.discount_percentage > 0 && (
                    <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold border border-green-500/50">
                      Poupa {plan.discount_percentage}% ({(plan.price * (plan.discount_percentage / 100)).toFixed(2)}€)
                    </div>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-magic-gold/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-magic-gold" />
                    </div>
                    <span className="text-gray-300">
                      <strong>{plan.name.includes('Gold') ? 'Corte de cabelo e barba ilimitado' : 'Cortes de cabelo ilimitados'}</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-magic-gold/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-magic-gold" />
                    </div>
                    <span className="text-gray-300">Marcações prioritárias</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-magic-gold/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-magic-gold" />
                    </div>
                    <span className="text-gray-300">Sem taxas de cancelamento</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-magic-gold/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-magic-gold" />
                    </div>
                    <span className="text-gray-300">Cancela quando quiseres</span>
                  </li>
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={barbers.every(b => (b.active_subscriptions_count || 0) >= b.max_subscriptions)}
                  className="w-full bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-magic-gold/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Crown className="w-5 h-5" />
                  {barbers.some(b => (b.active_subscriptions_count || 0) < b.max_subscriptions) ? 'Subscrever Agora' : 'Sem Vagas'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-gray-900 rounded-3xl p-8 md:p-12 border-2 border-magic-gold/50 shadow-lg shadow-magic-gold/20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-magic-gold mb-4">Porque Escolher a Assinatura?</h2>
          <p className="text-magic-yellow text-lg">Vantagens exclusivas para membros premium</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-magic-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="w-8 h-8 text-magic-gold" />
            </div>
            <h3 className="text-xl font-bold text-magic-gold mb-2">Poupa Muito Dinheiro</h3>
            <p className="text-gray-400">
              Até 40% de desconto comparado com cortes individuais. Quanto mais cortas, mais poupas.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-magic-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-magic-gold" />
            </div>
            <h3 className="text-xl font-bold text-magic-gold mb-2">Flexibilidade Total</h3>
            <p className="text-gray-400">
              Marca quando quiseres, sem compromissos. Cancela a qualquer momento sem penalizações.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-magic-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Scissors className="w-8 h-8 text-magic-gold" />
            </div>
            <h3 className="text-xl font-bold text-magic-gold mb-2">Estilo Sempre Perfeito</h3>
            <p className="text-gray-400">
              Mantém o teu visual sempre impecável sem te preocupares com custos extra.
            </p>
          </div>
        </div>

        <div className="mt-12 bg-magic-black/50 rounded-2xl p-8 border-2 border-magic-gold/30">
          <h3 className="text-2xl font-bold text-magic-gold mb-6 text-center">Perguntas Frequentes</h3>

          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-magic-gold mb-2">O que acontece se não usar todos os cortes?</h4>
              <p className="text-gray-400">
                Os cortes não utilizados não acumulam para o mês seguinte. Cada mês começa com o número total de cortes incluídos no teu plano.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-magic-gold mb-2">Posso cancelar a qualquer momento?</h4>
              <p className="text-gray-400">
                Sim! Podes cancelar a tua assinatura quando quiseres, sem taxas ou penalizações. A assinatura mantém-se ativa até ao fim do período pago.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-magic-gold mb-2">Como funcionam as marcações?</h4>
              <p className="text-gray-400">
                Como membro premium, tens acesso prioritário às marcações. Basta ligares ou usar o sistema de marcações online como habitualmente.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showBarberModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-magic-gold/50">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-magic-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-magic-gold" />
              </div>
              <h3 className="text-2xl font-bold text-magic-gold mb-2">Escolhe o teu Barbeiro</h3>
              <p className="text-gray-400">Seleciona o barbeiro preferido para a tua assinatura</p>
            </div>

            <div className="space-y-3 mb-6">
              {barbers.map((barber) => {
                const availableSpots = barber.max_subscriptions - (barber.active_subscriptions_count || 0);
                const isFull = availableSpots <= 0;

                return (
                  <label
                    key={barber.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      isFull
                        ? 'border-gray-800 bg-gray-800/50 cursor-not-allowed opacity-50'
                        : selectedBarber === barber.id
                        ? 'border-magic-gold bg-magic-gold/10 cursor-pointer'
                        : 'border-gray-700 hover:border-magic-gold/50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="barber"
                      value={barber.id}
                      checked={selectedBarber === barber.id}
                      onChange={(e) => setSelectedBarber(e.target.value)}
                      disabled={isFull}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isFull
                        ? 'border-gray-600 bg-gray-700'
                        : selectedBarber === barber.id
                        ? 'border-magic-gold bg-magic-gold'
                        : 'border-gray-500'
                    }`}>
                      {selectedBarber === barber.id && !isFull && (
                        <div className="w-2 h-2 bg-magic-black rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{barber.name}</div>
                      <div className={`text-sm ${isFull ? 'text-red-400' : 'text-gray-400'}`}>
                        {isFull ? 'Esgotado' : `${availableSpots} ${availableSpots === 1 ? 'vaga disponível' : 'vagas disponíveis'}`}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBarberModal(false)}
                className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSubscription}
                disabled={!selectedBarber}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black rounded-lg font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-magic-gold/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showBookingModal && subscription && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border-2 border-magic-gold/50 my-8">
            {bookingSuccess ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-magic-gold rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-magic-black" />
                </div>
                <h3 className="text-3xl font-bold text-magic-gold mb-4">Marcação Criada!</h3>
                <p className="text-lg text-magic-yellow">A tua marcação foi registada com sucesso.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-magic-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-magic-gold" />
                  </div>
                  <h3 className="text-2xl font-bold text-magic-gold mb-2">Agendar Corte da Assinatura</h3>
                  <p className="text-gray-400">Este corte está incluído na tua assinatura premium</p>
                </div>

                <div className="space-y-4">
                  {!selectedService ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-magic-gold mb-3">
                          Escolhe o Serviço
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          {services.map((service) => (
                            <button
                              key={service.id}
                              onClick={() => setSelectedService(service)}
                              className="p-4 rounded-xl border-2 border-magic-gold/30 hover:border-magic-gold hover:bg-magic-gold/10 transition-all text-left"
                            >
                              <div className="font-bold text-lg text-magic-gold mb-1">{service.name}</div>
                              <div className="text-sm text-gray-400">{service.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-magic-gold/10 border-2 border-magic-gold/50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-magic-gold">{selectedService.name}</div>
                            <div className="text-sm text-gray-400">{selectedService.description}</div>
                          </div>
                          <button
                            onClick={() => setSelectedService(null)}
                            className="text-magic-gold hover:text-magic-yellow text-sm font-semibold"
                          >
                            Mudar
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-magic-gold mb-2">
                          Barbeiro
                        </label>
                        {selectedDate && selectedTime && availableBarbers.length === 0 ? (
                          <div className="bg-red-900/20 border-2 border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-300">
                              Não há barbeiros disponíveis neste horário. Por favor, escolhe outro horário.
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {barbers.map((barber) => {
                              const isAvailable = !selectedDate || !selectedTime || availableBarbers.includes(barber.id);
                              const isSelected = bookingBarber === barber.id;
                              return (
                                <button
                                  key={barber.id}
                                  onClick={() => isAvailable && setBookingBarber(barber.id)}
                                  disabled={!isAvailable}
                                  className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                                    isSelected
                                      ? 'bg-magic-gold text-magic-black shadow-lg shadow-magic-gold/50'
                                      : isAvailable
                                      ? 'bg-gray-800 text-magic-yellow hover:bg-gray-700 border-2 border-magic-gold/30'
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
                          Data
                        </label>
                        <input
                          type="date"
                          min={getMinDate()}
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-xl focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-magic-gold mb-2">
                          Hora
                        </label>
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {getAvailableTimes().map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`py-2 px-2 rounded-lg font-semibold text-sm transition-all ${
                                selectedTime === time
                                  ? 'bg-magic-gold text-magic-black shadow-lg shadow-magic-gold/50'
                                  : 'bg-gray-800 text-magic-yellow hover:bg-gray-700 border border-magic-gold/30'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-magic-gold mb-2">
                          Notas (opcional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Algum pedido especial?"
                          rows={2}
                          className="w-full px-4 py-3 bg-magic-black border-2 border-magic-gold/50 rounded-xl focus:ring-2 focus:ring-magic-gold focus:border-magic-gold transition-all resize-none text-white"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  {selectedService && (
                    <button
                      onClick={handleBookingSubmit}
                      disabled={bookingLoading || !selectedDate || !selectedTime || !bookingBarber || availableBarbers.length === 0}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black rounded-lg font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-magic-gold/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {bookingLoading ? (
                        'A criar...'
                      ) : (
                        <>
                          <Calendar className="w-5 h-5" />
                          Confirmar
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
