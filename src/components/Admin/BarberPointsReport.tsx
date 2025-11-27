import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Calendar, DollarSign, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface BarberCommission {
  month: string;
  barber_id: string;
  barber_name: string;
  total_points: number;
  total_services: number;
  total_minutes: number;
  points_percentage: number;
  commission_amount: number;
  monthly_revenue_pool: number;
  distribution_percentage: number;
}

interface RevenuePool {
  total_revenue: number;
  distribution_percentage: number;
}

export const BarberPointsReport = () => {
  const [commissions, setCommissions] = useState<BarberCommission[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [revenuePool, setRevenuePool] = useState<RevenuePool>({ total_revenue: 0, distribution_percentage: 100 });
  const [editingRevenue, setEditingRevenue] = useState(false);
  const [editedRevenue, setEditedRevenue] = useState('');
  const [editingDistribution, setEditingDistribution] = useState(false);
  const [editedDistribution, setEditedDistribution] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAvailableMonths();
    loadRevenuePool();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadCommissions();
      loadRevenuePool();
    }
  }, [selectedMonth]);

  const loadRevenuePool = async () => {
    const monthToUse = selectedMonth || new Date().toISOString().slice(0, 7);

    const { data, error } = await supabase
      .from('subscription_revenue_pool')
      .select('total_revenue, distribution_percentage')
      .eq('month', monthToUse)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar revenue pool:', error);
    }

    if (data) {
      setRevenuePool({
        total_revenue: parseFloat(data.total_revenue as any) || 0,
        distribution_percentage: parseFloat(data.distribution_percentage as any) || 100
      });
    } else {
      setRevenuePool({ total_revenue: 0, distribution_percentage: 100 });
    }
  };

  const loadAvailableMonths = async () => {
    const { data, error } = await supabase
      .from('barber_points')
      .select('month')
      .order('month', { ascending: false });

    if (error) {
      console.error('Erro ao carregar meses:', error);
      setLoading(false);
      return;
    }

    if (data) {
      const uniqueMonths = [...new Set(data.map(item => item.month))];
      setAvailableMonths(uniqueMonths);
      if (uniqueMonths.length > 0) {
        setSelectedMonth(uniqueMonths[0]);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('barber_commissions_by_month')
      .select('*')
      .eq('month', selectedMonth)
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Erro ao carregar comissões:', error);
    }

    if (data) {
      setCommissions(data);
    }

    setLoading(false);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-PT', { year: 'numeric', month: 'long' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleEditRevenue = () => {
    setEditingRevenue(true);
    setEditedRevenue(totalRevenue.toString());
  };

  const handleSaveRevenue = async () => {
    setSaving(true);
    const newRevenue = parseFloat(editedRevenue);

    if (isNaN(newRevenue) || newRevenue < 0) {
      alert('Valor inválido');
      setSaving(false);
      return;
    }

    const monthToUse = selectedMonth || new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(monthToUse)) {
      alert('Formato de mês inválido');
      setSaving(false);
      return;
    }

    console.log('Guardando fundo:', { monthToUse, newRevenue, distributionPercentage });

    const { data: existing, error: checkError } = await supabase
      .from('subscription_revenue_pool')
      .select('*')
      .eq('month', monthToUse)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar registo:', checkError);
      alert(`Erro: ${checkError.message}`);
      setSaving(false);
      return;
    }

    let error;
    if (existing) {
      const { error: updateError } = await supabase
        .from('subscription_revenue_pool')
        .update({
          total_revenue: newRevenue,
          updated_at: new Date().toISOString()
        })
        .eq('month', monthToUse);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('subscription_revenue_pool')
        .insert({
          month: monthToUse,
          total_revenue: newRevenue,
          distribution_percentage: 100
        });
      error = insertError;
    }

    if (error) {
      console.error('Erro ao guardar fundo:', error);
      alert(`Erro ao atualizar fundo: ${error.message}`);
    } else {
      await loadCommissions();
      await loadRevenuePool();
      setEditingRevenue(false);
    }

    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingRevenue(false);
    setEditedRevenue('');
  };

  const handleEditDistribution = () => {
    setEditingDistribution(true);
    setEditedDistribution(revenuePool.distribution_percentage.toString());
  };

  const handleSaveDistribution = async () => {
    setSaving(true);
    const newDistribution = parseFloat(editedDistribution);

    if (isNaN(newDistribution) || newDistribution < 0 || newDistribution > 100) {
      alert('Valor inválido. Insere uma percentagem entre 0 e 100.');
      setSaving(false);
      return;
    }

    const monthToUse = selectedMonth || new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(monthToUse)) {
      alert('Formato de mês inválido');
      setSaving(false);
      return;
    }

    console.log('Guardando percentagem:', { monthToUse, totalRevenue, newDistribution });

    const { data: existing, error: checkError } = await supabase
      .from('subscription_revenue_pool')
      .select('*')
      .eq('month', monthToUse)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar registo:', checkError);
      alert(`Erro: ${checkError.message}`);
      setSaving(false);
      return;
    }

    let error;
    if (existing) {
      const { error: updateError } = await supabase
        .from('subscription_revenue_pool')
        .update({
          distribution_percentage: newDistribution,
          updated_at: new Date().toISOString()
        })
        .eq('month', monthToUse);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('subscription_revenue_pool')
        .insert({
          month: monthToUse,
          total_revenue: totalRevenue || 0,
          distribution_percentage: newDistribution
        });
      error = insertError;
    }

    if (error) {
      console.error('Erro ao guardar percentagem:', error);
      alert(`Erro ao atualizar percentagem: ${error.message}`);
    } else {
      await loadCommissions();
      await loadRevenuePool();
      setEditingDistribution(false);
    }

    setSaving(false);
  };

  const handleCancelDistributionEdit = () => {
    setEditingDistribution(false);
    setEditedDistribution('');
  };

  if (loading && availableMonths.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-magic-yellow">A carregar relatório...</div>
      </div>
    );
  }

  const currentMonth = selectedMonth || new Date().toISOString().slice(0, 7);
  const totalPoints = commissions.reduce((sum, c) => sum + c.total_points, 0);
  const totalRevenue = revenuePool.total_revenue;
  const distributionPercentage = revenuePool.distribution_percentage;
  const distributedAmount = totalRevenue * (distributionPercentage / 100);
  const reservedAmount = totalRevenue - distributedAmount;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-magic-gold mb-2">
          Sistema de Pontos dos Barbeiros
        </h2>
        <p className="text-magic-yellow">
          1 minuto de serviço = 1 ponto | Comissões distribuídas proporcionalmente
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-magic-yellow mb-2 font-medium">
          Selecionar Mês e Ano
        </label>
        <input
          type="month"
          value={currentMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full md:w-64 bg-gray-800 text-magic-yellow border-2 border-magic-gold/30 rounded-lg px-4 py-2 focus:outline-none focus:border-magic-gold"
        />
        <p className="text-sm text-gray-400 mt-1">
          Podes selecionar qualquer mês para ver dados ou configurar o fundo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-magic-black to-gray-900 rounded-xl p-6 border-2 border-magic-gold/30">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-magic-gold" />
            <h3 className="text-lg font-bold text-magic-gold">Total de Pontos</h3>
          </div>
          <p className="text-3xl font-bold text-magic-yellow">{totalPoints}</p>
          <p className="text-sm text-gray-400 mt-1">Pontos acumulados no mês</p>
        </div>

        <div className="bg-gradient-to-br from-magic-black to-gray-900 rounded-xl p-6 border-2 border-magic-gold/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <h3 className="text-lg font-bold text-magic-gold">Fundo Total</h3>
            </div>
            {!editingRevenue ? (
              <button
                onClick={handleEditRevenue}
                className="p-2 rounded-lg bg-magic-gold/20 hover:bg-magic-gold/30 text-magic-gold transition-colors"
                title="Editar fundo total"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRevenue}
                  disabled={saving}
                  className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-500 transition-colors disabled:opacity-50"
                  title="Guardar"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors disabled:opacity-50"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {editingRevenue ? (
            <input
              type="number"
              step="0.01"
              value={editedRevenue}
              onChange={(e) => setEditedRevenue(e.target.value)}
              className="w-full text-2xl font-bold text-magic-yellow bg-magic-black border-2 border-magic-gold/30 rounded-lg px-3 py-2 focus:outline-none focus:border-magic-gold"
              placeholder="0.00"
              autoFocus
            />
          ) : (
            <p className="text-3xl font-bold text-magic-yellow">{formatCurrency(totalRevenue)}</p>
          )}
          <p className="text-sm text-gray-400 mt-1">
            {editingRevenue ? 'Digite o valor total do fundo mensal' : 'Receita das assinaturas'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-magic-black to-gray-900 rounded-xl p-6 border-2 border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              <h3 className="text-lg font-bold text-magic-gold">% a Distribuir</h3>
            </div>
            {!editingDistribution ? (
              <button
                onClick={handleEditDistribution}
                className="p-2 rounded-lg bg-magic-gold/20 hover:bg-magic-gold/30 text-magic-gold transition-colors"
                title="Editar percentagem de distribuição"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDistribution}
                  disabled={saving}
                  className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-500 transition-colors disabled:opacity-50"
                  title="Guardar"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelDistributionEdit}
                  disabled={saving}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors disabled:opacity-50"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {editingDistribution ? (
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={editedDistribution}
              onChange={(e) => setEditedDistribution(e.target.value)}
              className="w-full text-2xl font-bold text-magic-yellow bg-magic-black border-2 border-magic-gold/30 rounded-lg px-3 py-2 focus:outline-none focus:border-magic-gold"
              placeholder="100"
              autoFocus
            />
          ) : (
            <p className="text-3xl font-bold text-magic-yellow">{distributionPercentage}%</p>
          )}
          <p className="text-sm text-gray-400 mt-1">
            {editingDistribution ? 'Digite a % do fundo a distribuir (0-100)' : `Distribuir: ${formatCurrency(distributedAmount)}`}
          </p>
        </div>

        <div className="bg-gradient-to-br from-magic-black to-gray-900 rounded-xl p-6 border-2 border-orange-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-orange-500" />
            <h3 className="text-lg font-bold text-magic-gold">Reservado</h3>
          </div>
          <p className="text-3xl font-bold text-orange-400">{formatCurrency(reservedAmount)}</p>
          <p className="text-sm text-gray-400 mt-1">{(100 - distributionPercentage).toFixed(0)}% do fundo bloqueado</p>
        </div>
      </div>

      {commissions.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-magic-black to-gray-900 rounded-xl border-2 border-magic-gold/30">
          <Calendar className="w-16 h-16 text-magic-gold/50 mx-auto mb-4" />
          <p className="text-magic-yellow text-lg">Sem dados para este mês</p>
          <p className="text-gray-400 mt-2">
            Os pontos são atribuídos automaticamente quando confirmas marcações como "completed"
          </p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-magic-black to-gray-900 rounded-xl border-2 border-magic-gold/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-magic-gold/10 border-b-2 border-magic-gold/30">
                <tr>
                  <th className="text-left px-6 py-4 text-magic-gold font-bold">Posição</th>
                  <th className="text-left px-6 py-4 text-magic-gold font-bold">Barbeiro</th>
                  <th className="text-center px-6 py-4 text-magic-gold font-bold">Pontos</th>
                  <th className="text-center px-6 py-4 text-magic-gold font-bold">Serviços</th>
                  <th className="text-center px-6 py-4 text-magic-gold font-bold">Minutos</th>
                  <th className="text-center px-6 py-4 text-magic-gold font-bold">% do Total</th>
                  <th className="text-right px-6 py-4 text-magic-gold font-bold">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission, index) => (
                  <tr
                    key={commission.barber_id}
                    className="border-b border-magic-gold/10 hover:bg-magic-gold/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Trophy className="w-5 h-5 text-yellow-400" />
                        )}
                        {index === 1 && (
                          <Trophy className="w-5 h-5 text-gray-300" />
                        )}
                        {index === 2 && (
                          <Trophy className="w-5 h-5 text-orange-400" />
                        )}
                        <span className="text-magic-yellow font-bold">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-magic-yellow font-medium">{commission.barber_name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-magic-gold/20 rounded-full text-magic-gold font-bold">
                        <Trophy className="w-4 h-4" />
                        {commission.total_points}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-magic-yellow">
                      {commission.total_services}
                    </td>
                    <td className="px-6 py-4 text-center text-magic-yellow">
                      {commission.total_minutes}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-magic-gold font-bold">
                        {commission.points_percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-green-400 font-bold text-lg">
                        {formatCurrency(commission.commission_amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-magic-gold/10 border-t-2 border-magic-gold/30">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-magic-gold font-bold text-lg">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-magic-gold font-bold text-lg">{totalPoints}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-magic-yellow font-bold">
                      {commissions.reduce((sum, c) => sum + c.total_services, 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-magic-yellow font-bold">
                      {commissions.reduce((sum, c) => sum + c.total_minutes, 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-magic-gold font-bold">100%</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-green-400 font-bold text-lg">
                      {formatCurrency(distributedAmount)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-500/10 border-2 border-blue-500/30 rounded-xl p-6">
        <h3 className="text-xl font-bold text-blue-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Como Funciona o Sistema de Pontos
        </h3>
        <div className="space-y-2 text-magic-yellow">
          <p>✅ <strong>1 minuto de serviço = 1 ponto</strong></p>
          <p>✅ Os pontos são atribuídos automaticamente quando uma marcação é marcada como "completed"</p>
          <p>✅ Podes ajustar o <strong>Fundo Total</strong> e a <strong>% a Distribuir</strong> clicando no ícone de editar (lápis)</p>
          <p>✅ <strong>Fórmula:</strong> Teus Pontos ÷ Total Pontos × Fundo Total × (% Distribuir ÷ 100)</p>
          <p>✅ <strong>Valor por ponto:</strong> {totalPoints > 0 ? formatCurrency(distributedAmount / totalPoints) : '€0,00'}</p>
          <p>✅ <strong>Exemplo:</strong> Fundo de 1000€, 70% para distribuir = 700€ divididos pelos pontos</p>
          <p>⚠️ <strong>Reservado:</strong> Os {(100 - distributionPercentage).toFixed(0)}% restantes ({formatCurrency(reservedAmount)}) ficam bloqueados</p>
        </div>
      </div>
    </div>
  );
};
