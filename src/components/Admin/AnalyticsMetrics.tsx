import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, UserCheck, UserX, Calendar, Star, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MetricsData {
  returnRate30: number;
  returnRate60: number;
  newClientReturnRate30: number;
  newClientReturnRate60: number;
  newClientReturnRate90: number;
  lostClients30: number;
  lostClients60: number;
  lostClients90: number;
  clientsServedYesterday: number;
  clientsServedWeek: number;
  clientsServedMonth: number;
  servicesYesterday: number;
  servicesWeek: number;
  servicesMonth: number;
  noPreferenceWeek: number;
  noPreferenceMonth: number;
  newClientsWeek: number;
  newClientsMonth: number;
  newClientsYear: number;
  averageRating: number;
  oneStarLastMonth: number;
}

export const AnalyticsMetrics = () => {
  const [metrics, setMetrics] = useState<MetricsData>({
    returnRate30: 0,
    returnRate60: 0,
    newClientReturnRate30: 0,
    newClientReturnRate60: 0,
    newClientReturnRate90: 0,
    lostClients30: 0,
    lostClients60: 0,
    lostClients90: 0,
    clientsServedYesterday: 0,
    clientsServedWeek: 0,
    clientsServedMonth: 0,
    servicesYesterday: 0,
    servicesWeek: 0,
    servicesMonth: 0,
    noPreferenceWeek: 0,
    noPreferenceMonth: 0,
    newClientsWeek: 0,
    newClientsMonth: 0,
    newClientsYear: 0,
    averageRating: 0,
    oneStarLastMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const date30 = new Date(now);
      date30.setDate(date30.getDate() - 30);
      const date60 = new Date(now);
      date60.setDate(date60.getDate() - 60);
      const date90 = new Date(now);
      date90.setDate(date90.getDate() - 90);
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      const { data: allCompletedAppointments } = await supabase
        .from('appointments')
        .select('client_id, appointment_date, created_at')
        .eq('status', 'completed')
        .not('client_id', 'is', null)
        .order('appointment_date', { ascending: false });

      const clientMap = new Map();
      allCompletedAppointments?.forEach(apt => {
        if (!clientMap.has(apt.client_id)) {
          clientMap.set(apt.client_id, []);
        }
        clientMap.get(apt.client_id).push(apt.appointment_date);
      });

      let returnedClients30 = 0;
      let returnedClients60 = 0;
      let totalClientsWithAppointments = 0;

      clientMap.forEach((dates) => {
        if (dates.length >= 2) {
          totalClientsWithAppointments++;
          const sortedDates = dates.sort();
          const firstDate = new Date(sortedDates[0]);
          const lastDate = new Date(sortedDates[sortedDates.length - 1]);
          const daysDiff = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff <= 30) returnedClients30++;
          if (daysDiff <= 60) returnedClients60++;
        }
      });

      const returnRate30 = totalClientsWithAppointments > 0
        ? (returnedClients30 / totalClientsWithAppointments) * 100
        : 0;
      const returnRate60 = totalClientsWithAppointments > 0
        ? (returnedClients60 / totalClientsWithAppointments) * 100
        : 0;

      const { data: newClients } = await supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', date90.toISOString());

      let newClientReturn30 = 0;
      let newClientReturn60 = 0;
      let newClientReturn90 = 0;

      for (const client of (newClients || [])) {
        const { data: clientAppointments } = await supabase
          .from('appointments')
          .select('appointment_date')
          .eq('client_id', client.id)
          .eq('status', 'completed')
          .order('appointment_date', { ascending: true });

        if (clientAppointments && clientAppointments.length >= 2) {
          const firstDate = new Date(clientAppointments[0].appointment_date);
          const secondDate = new Date(clientAppointments[1].appointment_date);
          const daysDiff = Math.floor((secondDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff <= 30) newClientReturn30++;
          if (daysDiff <= 60) newClientReturn60++;
          if (daysDiff <= 90) newClientReturn90++;
        }
      }

      const newClientReturnRate30 = newClients && newClients.length > 0 ? (newClientReturn30 / newClients.length) * 100 : 0;
      const newClientReturnRate60 = newClients && newClients.length > 0 ? (newClientReturn60 / newClients.length) * 100 : 0;
      const newClientReturnRate90 = newClients && newClients.length > 0 ? (newClientReturn90 / newClients.length) * 100 : 0;

      const { data: allClients } = await supabase
        .from('profiles')
        .select('id, created_at');

      let lostClients30 = 0;
      let lostClients60 = 0;
      let lostClients90 = 0;

      for (const client of (allClients || [])) {
        const { data: lastAppointment } = await supabase
          .from('appointments')
          .select('appointment_date')
          .eq('client_id', client.id)
          .eq('status', 'completed')
          .order('appointment_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastAppointment) {
          const lastDate = new Date(lastAppointment.appointment_date);
          const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceLast > 30) lostClients30++;
          if (daysSinceLast > 60) lostClients60++;
          if (daysSinceLast > 90) lostClients90++;
        }
      }

      const { data: yesterdayClients } = await supabase
        .from('appointments')
        .select('client_id', { count: 'exact' })
        .eq('appointment_date', yesterday.toISOString().split('T')[0])
        .eq('status', 'completed')
        .not('client_id', 'is', null);

      const uniqueClientsYesterday = new Set(yesterdayClients?.map(a => a.client_id)).size;

      const { data: weekClients } = await supabase
        .from('appointments')
        .select('client_id')
        .gte('appointment_date', weekAgo.toISOString().split('T')[0])
        .eq('status', 'completed')
        .not('client_id', 'is', null);

      const uniqueClientsWeek = new Set(weekClients?.map(a => a.client_id)).size;

      const { data: monthClients } = await supabase
        .from('appointments')
        .select('client_id')
        .gte('appointment_date', monthAgo.toISOString().split('T')[0])
        .eq('status', 'completed')
        .not('client_id', 'is', null);

      const uniqueClientsMonth = new Set(monthClients?.map(a => a.client_id)).size;

      const { count: servicesYesterday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', yesterday.toISOString().split('T')[0])
        .eq('status', 'completed');

      const { count: servicesWeek } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', weekAgo.toISOString().split('T')[0])
        .eq('status', 'completed');

      const { count: servicesMonth } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', monthAgo.toISOString().split('T')[0])
        .eq('status', 'completed');

      const { count: noPreferenceWeek } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', weekAgo.toISOString().split('T')[0])
        .is('barber_id', null);

      const { count: noPreferenceMonth } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', monthAgo.toISOString().split('T')[0])
        .is('barber_id', null);

      const { count: newClientsWeekCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      const { count: newClientsMonthCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString());

      const { count: newClientsYearCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yearAgo.toISOString());

      setMetrics({
        returnRate30,
        returnRate60,
        newClientReturnRate30,
        newClientReturnRate60,
        newClientReturnRate90,
        lostClients30,
        lostClients60,
        lostClients90,
        clientsServedYesterday: uniqueClientsYesterday,
        clientsServedWeek: uniqueClientsWeek,
        clientsServedMonth: uniqueClientsMonth,
        servicesYesterday: servicesYesterday || 0,
        servicesWeek: servicesWeek || 0,
        servicesMonth: servicesMonth || 0,
        noPreferenceWeek: noPreferenceWeek || 0,
        noPreferenceMonth: noPreferenceMonth || 0,
        newClientsWeek: newClientsWeekCount || 0,
        newClientsMonth: newClientsMonthCount || 0,
        newClientsYear: newClientsYearCount || 0,
        averageRating: 0,
        oneStarLastMonth: 0,
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-magic-gold">A carregar métricas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-magic-gold flex items-center gap-2">
              Taxa de retorno
              <Info className="w-4 h-4 text-gray-400" />
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Geral 30 dias</div>
              <div className="text-3xl font-bold text-blue-400">{metrics.returnRate30.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Geral 60 dias</div>
              <div className="text-3xl font-bold text-blue-400">{metrics.returnRate60.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-magic-gold flex items-center gap-2">
              Taxa de retorno sobre clientes novos
              <Info className="w-4 h-4 text-gray-400" />
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-400 mb-1">Geral 30 dias</div>
              <div className="text-2xl font-bold text-blue-400">{metrics.newClientReturnRate30.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Geral 60 dias</div>
              <div className="text-2xl font-bold text-blue-400">{metrics.newClientReturnRate60.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Geral 90 dias</div>
              <div className="text-2xl font-bold text-blue-400">{metrics.newClientReturnRate90.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-magic-gold">Clientes perdidos</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-400 mb-1">Geral 30 dias</div>
              <div className="text-2xl font-bold text-red-400">{metrics.lostClients30}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Geral 60 dias</div>
              <div className="text-2xl font-bold text-red-400">{metrics.lostClients60}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Geral 90 dias</div>
              <div className="text-2xl font-bold text-red-400">{metrics.lostClients90}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-magic-gold flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Clientes atendidos
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Dia anterior</div>
              <div className="text-3xl font-bold text-green-400">{metrics.clientsServedYesterday}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Semana</div>
              <div className="text-3xl font-bold text-green-400">{metrics.clientsServedWeek}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Mês</div>
              <div className="text-3xl font-bold text-green-400">{metrics.clientsServedMonth}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-magic-gold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Serviços realizados
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Dia anterior</div>
              <div className="text-3xl font-bold text-blue-400">{metrics.servicesYesterday}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Semana</div>
              <div className="text-3xl font-bold text-blue-400">{metrics.servicesWeek}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Mês</div>
              <div className="text-3xl font-bold text-blue-400">{metrics.servicesMonth}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-magic-gold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Agendamentos sem preferência
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Semana</div>
              <div className="text-3xl font-bold text-orange-400">{metrics.noPreferenceWeek}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Mês</div>
              <div className="text-3xl font-bold text-orange-400">{metrics.noPreferenceMonth}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-magic-gold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clientes novos
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Semana</div>
              <div className="text-3xl font-bold text-cyan-400">{metrics.newClientsWeek}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Mês</div>
              <div className="text-3xl font-bold text-cyan-400">{metrics.newClientsMonth}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Ano</div>
              <div className="text-3xl font-bold text-cyan-400">{metrics.newClientsYear}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-magic-gold flex items-center gap-2">
              <Star className="w-5 h-5" />
              Avaliações da empresa
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Nota média dos últimos 12 meses</div>
              <div className="text-3xl font-bold text-yellow-400">{metrics.averageRating.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Avaliação de 1 estrela no último mês</div>
              <div className="text-3xl font-bold text-red-400">{metrics.oneStarLastMonth}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
