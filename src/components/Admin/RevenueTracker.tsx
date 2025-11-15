import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MonthlyRevenue {
  month: string;
  year: number;
  appointments: number;
  subscriptions: number;
  total: number;
}

interface YearlyRevenue {
  year: number;
  appointments: number;
  subscriptions: number;
  total: number;
}

export const RevenueTracker = () => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyRevenue[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, [selectedYear, viewMode]);

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadMonthlyRevenue(), loadYearlyRevenue(), loadAvailableYears()]);
    } catch (error) {
      console.error('Erro ao carregar faturamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableYears = async () => {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_date')
      .order('appointment_date', { ascending: true })
      .limit(1);

    const { data: subscriptions } = await supabase
      .from('client_subscriptions')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1);

    const startYear = Math.min(
      appointments?.[0] ? new Date(appointments[0].appointment_date).getFullYear() : new Date().getFullYear(),
      subscriptions?.[0] ? new Date(subscriptions[0].created_at).getFullYear() : new Date().getFullYear()
    );

    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = startYear; year <= currentYear; year++) {
      years.push(year);
    }
    setAvailableYears(years.reverse());
  };

  const loadMonthlyRevenue = async () => {
    const monthsData: MonthlyRevenue[] = [];

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(selectedYear, month, 1);
      const monthEnd = new Date(selectedYear, month + 1, 0);

      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      const { data: appointments } = await supabase
        .from('appointments')
        .select('services:service_id(price)')
        .gte('appointment_date', monthStartStr)
        .lte('appointment_date', monthEndStr)
        .eq('status', 'completed');

      const appointmentsRevenue = appointments?.reduce((sum, app) => {
        return sum + (app.services?.price || 0);
      }, 0) || 0;

      const { data: subscriptionPayments } = await supabase
        .from('subscription_payments')
        .select('amount')
        .gte('payment_date', monthStart.toISOString())
        .lte('payment_date', monthEnd.toISOString())
        .eq('status', 'paid');

      const subscriptionsRevenue = subscriptionPayments?.reduce((sum, payment) => {
        return sum + (payment.amount || 0);
      }, 0) || 0;

      monthsData.push({
        month: monthStart.toLocaleDateString('pt-PT', { month: 'long' }),
        year: selectedYear,
        appointments: appointmentsRevenue,
        subscriptions: subscriptionsRevenue,
        total: appointmentsRevenue + subscriptionsRevenue,
      });
    }

    setMonthlyData(monthsData);
  };

  const loadYearlyRevenue = async () => {
    const yearsData: YearlyRevenue[] = [];

    for (const year of availableYears) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const yearStartStr = yearStart.toISOString().split('T')[0];
      const yearEndStr = yearEnd.toISOString().split('T')[0];

      const { data: appointments } = await supabase
        .from('appointments')
        .select('services:service_id(price)')
        .gte('appointment_date', yearStartStr)
        .lte('appointment_date', yearEndStr)
        .eq('status', 'completed');

      const appointmentsRevenue = appointments?.reduce((sum, app) => {
        return sum + (app.services?.price || 0);
      }, 0) || 0;

      const { data: subscriptionPayments } = await supabase
        .from('subscription_payments')
        .select('amount')
        .gte('payment_date', yearStart.toISOString())
        .lte('payment_date', yearEnd.toISOString())
        .eq('status', 'paid');

      const subscriptionsRevenue = subscriptionPayments?.reduce((sum, payment) => {
        return sum + (payment.amount || 0);
      }, 0) || 0;

      yearsData.push({
        year,
        appointments: appointmentsRevenue,
        subscriptions: subscriptionsRevenue,
        total: appointmentsRevenue + subscriptionsRevenue,
      });
    }

    setYearlyData(yearsData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xl text-magic-gold">A carregar faturamento...</div>
      </div>
    );
  }

  const totalRevenue = viewMode === 'monthly'
    ? monthlyData.reduce((sum, m) => sum + m.total, 0)
    : yearlyData.reduce((sum, y) => sum + y.total, 0);

  const totalAppointments = viewMode === 'monthly'
    ? monthlyData.reduce((sum, m) => sum + m.appointments, 0)
    : yearlyData.reduce((sum, y) => sum + y.appointments, 0);

  const totalSubscriptions = viewMode === 'monthly'
    ? monthlyData.reduce((sum, m) => sum + m.subscriptions, 0)
    : yearlyData.reduce((sum, y) => sum + y.subscriptions, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-magic-gold mb-2">Faturamento</h2>
          <p className="text-gray-400">Análise de receitas por mês e ano</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'monthly'
                ? 'bg-magic-gold text-magic-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'yearly'
                ? 'bg-magic-gold text-magic-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Anual
          </button>
        </div>
      </div>

      {viewMode === 'monthly' && (
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-magic-gold" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-magic-gold/30 focus:border-magic-gold focus:outline-none"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-magic-gold to-magic-yellow rounded-2xl p-6 text-magic-black">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-magic-black/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-80">Total</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Marcações</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalAppointments)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-magic-gold/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Assinaturas</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalSubscriptions)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-magic-gold/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-magic-gold font-semibold">
                  {viewMode === 'monthly' ? 'Mês' : 'Ano'}
                </th>
                <th className="px-6 py-4 text-right text-magic-gold font-semibold">Marcações</th>
                <th className="px-6 py-4 text-right text-magic-gold font-semibold">Assinaturas</th>
                <th className="px-6 py-4 text-right text-magic-gold font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {viewMode === 'monthly' ? (
                monthlyData.map((month, index) => (
                  <tr key={index} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-white capitalize">{month.month}</td>
                    <td className="px-6 py-4 text-right text-blue-400">{formatCurrency(month.appointments)}</td>
                    <td className="px-6 py-4 text-right text-purple-400">{formatCurrency(month.subscriptions)}</td>
                    <td className="px-6 py-4 text-right text-magic-gold font-semibold">{formatCurrency(month.total)}</td>
                  </tr>
                ))
              ) : (
                yearlyData.map((year) => (
                  <tr key={year.year} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-white font-semibold">{year.year}</td>
                    <td className="px-6 py-4 text-right text-blue-400">{formatCurrency(year.appointments)}</td>
                    <td className="px-6 py-4 text-right text-purple-400">{formatCurrency(year.subscriptions)}</td>
                    <td className="px-6 py-4 text-right text-magic-gold font-semibold">{formatCurrency(year.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
