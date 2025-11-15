import { useEffect, useState } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RevenueData {
  date: string;
  total: number;
  appointments_count: number;
  subscriptions_revenue: number;
}

interface RevenueDetailsPageProps {
  onNavigate: (page: string) => void;
}

export const RevenueDetailsPage = ({ onNavigate }: RevenueDetailsPageProps) => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadRevenueData();
  }, [selectedMonth, selectedYear]);

  const loadRevenueData = async () => {
    try {
      const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];

      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_date, services:service_id(price), payment_status')
        .gte('appointment_date', startOfMonth)
        .lte('appointment_date', endOfMonth)
        .eq('status', 'completed');

      const { data: subscriptions } = await supabase
        .from('client_subscriptions')
        .select('current_period_start, subscription_plans:plan_id(price)')
        .gte('current_period_start', startOfMonth)
        .lte('current_period_start', endOfMonth)
        .eq('status', 'active');

      const revenueByDate: Record<string, RevenueData> = {};

      (appointments || []).forEach((apt) => {
        const date = apt.appointment_date;
        if (!revenueByDate[date]) {
          revenueByDate[date] = {
            date,
            total: 0,
            appointments_count: 0,
            subscriptions_revenue: 0,
          };
        }
        if (apt.payment_status === 'paid') {
          revenueByDate[date].total += apt.services?.price || 0;
          revenueByDate[date].appointments_count += 1;
        }
      });

      (subscriptions || []).forEach((sub) => {
        const date = sub.current_period_start?.split('T')[0];
        if (date) {
          if (!revenueByDate[date]) {
            revenueByDate[date] = {
              date,
              total: 0,
              appointments_count: 0,
              subscriptions_revenue: 0,
            };
          }
          revenueByDate[date].subscriptions_revenue += sub.subscription_plans?.price || 0;
          revenueByDate[date].total += sub.subscription_plans?.price || 0;
        }
      });

      const sortedData = Object.values(revenueByDate).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setRevenueData(sortedData);
    } catch (error) {
      console.error('Erro ao carregar receita:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenueData.reduce((sum, day) => sum + day.total, 0);
  const totalAppointments = revenueData.reduce((sum, day) => sum + day.appointments_count, 0);
  const totalSubscriptionsRevenue = revenueData.reduce(
    (sum, day) => sum + day.subscriptions_revenue,
    0
  );

  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-magic-black">
        <div className="text-xl text-magic-gold">A carregar dados de receita...</div>
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
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-magic-gold">
              Detalhes da Receita
            </h1>
          </div>

          <div className="flex gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-gray-900 border-2 border-magic-gold/30 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-magic-gold"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-gray-900 border-2 border-magic-gold/30 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-magic-gold"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-green-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-3xl font-bold text-green-400">{totalRevenue.toFixed(2)}€</span>
            </div>
            <h3 className="text-sm font-medium text-green-300">Receita Total do Mês</h3>
          </div>

          <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-3xl font-bold text-cyan-400">{totalAppointments}</span>
            </div>
            <h3 className="text-sm font-medium text-cyan-300">Marcações Pagas</h3>
          </div>

          <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-magic-gold/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-magic-gold" />
              </div>
              <span className="text-3xl font-bold text-magic-gold">
                {totalSubscriptionsRevenue.toFixed(2)}€
              </span>
            </div>
            <h3 className="text-sm font-medium text-magic-yellow">Receita de Assinaturas</h3>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30 mb-8">
          <h2 className="text-2xl font-bold text-magic-gold mb-6">Receita por Dia</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-magic-gold/30">
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Data</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">
                    Marcações
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">
                    Receita Marcações
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">
                    Receita Assinaturas
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">
                    Total do Dia
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenueData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-magic-yellow">
                      Sem dados de receita para este período
                    </td>
                  </tr>
                ) : (
                  revenueData.map((day) => (
                    <tr
                      key={day.date}
                      className="border-b border-magic-gold/10 hover:bg-magic-gold/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">
                          {new Date(day.date).toLocaleDateString('pt-PT', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-cyan-400">{day.appointments_count}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-green-400">
                          {(day.total - day.subscriptions_revenue).toFixed(2)}€
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-magic-gold">
                          {day.subscriptions_revenue.toFixed(2)}€
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-green-400 text-lg">
                          {day.total.toFixed(2)}€
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {revenueData.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-magic-gold/30 bg-magic-gold/5">
                    <td className="py-4 px-4 font-bold text-magic-gold">TOTAL</td>
                    <td className="py-4 px-4 font-bold text-cyan-400">{totalAppointments}</td>
                    <td className="py-4 px-4 font-bold text-green-400">
                      {(totalRevenue - totalSubscriptionsRevenue).toFixed(2)}€
                    </td>
                    <td className="py-4 px-4 font-bold text-magic-gold">
                      {totalSubscriptionsRevenue.toFixed(2)}€
                    </td>
                    <td className="py-4 px-4 font-bold text-green-400 text-xl">
                      {totalRevenue.toFixed(2)}€
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30">
          <h3 className="text-xl font-bold text-magic-gold mb-4">Análise de Desempenho</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-magic-black rounded-xl p-4 border border-magic-gold/30">
              <div className="text-2xl font-bold text-magic-gold mb-1">
                {revenueData.length > 0
                  ? (totalRevenue / revenueData.length).toFixed(2)
                  : '0.00'}
                €
              </div>
              <div className="text-sm text-magic-yellow">Receita Média por Dia</div>
            </div>
            <div className="bg-magic-black rounded-xl p-4 border border-magic-gold/30">
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {totalAppointments > 0 ? (totalRevenue / totalAppointments).toFixed(2) : '0.00'}€
              </div>
              <div className="text-sm text-cyan-300">Receita Média por Marcação</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
