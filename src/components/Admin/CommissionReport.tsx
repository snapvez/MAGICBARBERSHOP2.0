import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Calendar, TrendingUp, Users, Download, Plus, Edit2, Trash2, Save, X, Settings } from 'lucide-react';

interface CommissionData {
  barber_id: string;
  barber_name: string;
  commission_percentage: number;
  total_appointments: number;
  total_minutes: number;
  gross_revenue: number;
  commission_amount: number;
  manual_entries: ManualEntry[];
  appointments: {
    date: string;
    time: string;
    service: string;
    price: number;
    commission: number;
  }[];
}

interface ManualEntry {
  id: string;
  date: string;
  minutes: number;
  description: string;
  amount: number;
}

export function CommissionReport() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [commissionsData, setCommissionsData] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [pricePerMinute, setPricePerMinute] = useState(3.87);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('3.87');
  const [showAddManual, setShowAddManual] = useState(false);
  const [availableBarbers, setAvailableBarbers] = useState<{id: string; name: string}[]>([]);
  const [manualForm, setManualForm] = useState({
    barber_id: '',
    date: new Date().toISOString().split('T')[0],
    minutes: 0,
    description: '',
    amount: 0,
  });
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  useEffect(() => {
    loadPricePerMinute();
    loadBarbers();
    fetchCommissions();
  }, []);

  useEffect(() => {
    const calculatedAmount = (manualForm.minutes * pricePerMinute);
    setManualForm(prev => ({ ...prev, amount: parseFloat(calculatedAmount.toFixed(2)) }));
  }, [manualForm.minutes, pricePerMinute]);

  const loadBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      if (data) {
        setAvailableBarbers(data);
      }
    } catch (error) {
      console.error('Error loading barbers:', error);
    }
  };

  const loadPricePerMinute = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_settings')
        .select('price_per_minute')
        .single();

      if (error) throw error;
      if (data) {
        setPricePerMinute(data.price_per_minute);
        setNewPrice(data.price_per_minute.toString());
      }
    } catch (error) {
      console.error('Error loading price per minute:', error);
    }
  };

  const updatePricePerMinute = async () => {
    try {
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        alert('Preço inválido');
        return;
      }

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from('commission_settings')
        .update({
          price_per_minute: price,
          updated_at: new Date().toISOString(),
          updated_by: adminData?.id,
        })
        .eq('id', (await supabase.from('commission_settings').select('id').single()).data?.id);

      if (error) throw error;

      setPricePerMinute(price);
      setEditingPrice(false);
      alert('Preço por minuto atualizado!');
      fetchCommissions();
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Erro ao atualizar preço');
    }
  };

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          barber_id,
          barbers (
            id,
            name,
            commission_percentage
          ),
          services (
            name,
            price
          )
        `)
        .eq('status', 'completed')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      const { data: manualEntries, error: manualError } = await supabase
        .from('manual_commission_entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (manualError) throw manualError;

      const barberMap = new Map<string, CommissionData>();

      appointments?.forEach((apt: any) => {
        if (!apt.barber_id || !apt.barbers || !apt.services) return;

        const barberId = apt.barber_id;
        const barberName = apt.barbers.name;
        const commissionPercentage = apt.barbers.commission_percentage;
        const servicePrice = apt.services.price;
        const serviceName = apt.services.name;

        const startTime = new Date(`2000-01-01T${apt.start_time}`);
        const endTime = new Date(`2000-01-01T${apt.end_time}`);
        const minutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        const commission = (servicePrice * commissionPercentage) / 100;

        if (!barberMap.has(barberId)) {
          barberMap.set(barberId, {
            barber_id: barberId,
            barber_name: barberName,
            commission_percentage: commissionPercentage,
            total_appointments: 0,
            total_minutes: 0,
            gross_revenue: 0,
            commission_amount: 0,
            manual_entries: [],
            appointments: [],
          });
        }

        const data = barberMap.get(barberId)!;
        data.total_appointments += 1;
        data.total_minutes += minutes;
        data.gross_revenue += servicePrice;
        data.commission_amount += commission;
        data.appointments.push({
          date: apt.appointment_date,
          time: apt.start_time.substring(0, 5),
          service: serviceName,
          price: servicePrice,
          commission: commission,
        });
      });

      for (const entry of manualEntries || []) {
        if (!barberMap.has(entry.barber_id)) {
          const { data: barberData } = await supabase
            .from('barbers')
            .select('name, commission_percentage')
            .eq('id', entry.barber_id)
            .single();

          if (barberData) {
            barberMap.set(entry.barber_id, {
              barber_id: entry.barber_id,
              barber_name: barberData.name,
              commission_percentage: barberData.commission_percentage,
              total_appointments: 0,
              total_minutes: 0,
              gross_revenue: 0,
              commission_amount: 0,
              manual_entries: [],
              appointments: [],
            });
          }
        }

        const data = barberMap.get(entry.barber_id);
        if (data) {
          data.total_minutes += entry.minutes;
          data.commission_amount += entry.amount;
          data.manual_entries.push({
            id: entry.id,
            date: entry.date,
            minutes: entry.minutes,
            description: entry.description,
            amount: entry.amount,
          });
        }
      }

      setCommissionsData(Array.from(barberMap.values()));
    } catch (error) {
      console.error('Error fetching commissions:', error);
      alert('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase.from('manual_commission_entries').insert([
        {
          ...manualForm,
          created_by: adminData?.id,
        },
      ]);

      if (error) throw error;

      alert('Entrada manual adicionada!');
      setShowAddManual(false);
      setManualForm({
        barber_id: '',
        date: new Date().toISOString().split('T')[0],
        minutes: 0,
        description: '',
        amount: 0,
      });
      fetchCommissions();
    } catch (error) {
      console.error('Error adding manual entry:', error);
      alert('Erro ao adicionar entrada');
    }
  };

  const handleUpdateManual = async (entryId: string, updates: Partial<ManualEntry>) => {
    try {
      const { error } = await supabase
        .from('manual_commission_entries')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;

      alert('Entrada atualizada!');
      setEditingEntry(null);
      fetchCommissions();
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Erro ao atualizar entrada');
    }
  };

  const handleDeleteManual = async (entryId: string) => {
    if (!confirm('Tem certeza que deseja remover esta entrada?')) return;

    try {
      const { error } = await supabase
        .from('manual_commission_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      alert('Entrada removida!');
      fetchCommissions();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Erro ao remover entrada');
    }
  };

  const totals = commissionsData.reduce(
    (acc, barber) => ({
      appointments: acc.appointments + barber.total_appointments,
      revenue: acc.revenue + barber.gross_revenue,
      commissions: acc.commissions + barber.commission_amount,
      minutes: acc.minutes + barber.total_minutes,
    }),
    { appointments: 0, revenue: 0, commissions: 0, minutes: 0 }
  );

  const selectedBarberData = commissionsData.find(b => b.barber_id === selectedBarber);

  const exportToPDF = () => {
    alert('Funcionalidade de exportar PDF em desenvolvimento');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Comissões Geradas</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddManual(!showAddManual)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Adicionar Manual
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {showAddManual && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Entrada Manual</h3>
          <form onSubmit={handleAddManual} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Barbeiro *</label>
                <select
                  value={manualForm.barber_id}
                  onChange={(e) => setManualForm({ ...manualForm, barber_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Selecione</option>
                  {availableBarbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minutos *</label>
                <input
                  type="number"
                  min="0"
                  value={manualForm.minutes}
                  onChange={(e) => setManualForm({ ...manualForm, minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor (€)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualForm.amount}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    {manualForm.minutes} × {pricePerMinute.toFixed(2)}€
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input
                  type="text"
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: Trabalho extra, bónus, etc."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowAddManual(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Final *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              onClick={fetchCommissions}
              disabled={loading}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'A carregar...' : 'Buscar'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Marcações</div>
            <div className="text-2xl font-bold text-gray-900">{totals.appointments}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Receita Bruta</div>
            <div className="text-2xl font-bold text-gray-900">{totals.revenue.toFixed(2)}€</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Comissões</div>
            <div className="text-2xl font-bold text-green-600">{totals.commissions.toFixed(2)}€</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
              Preço/Minuto
              {!editingPrice && (
                <button onClick={() => setEditingPrice(true)} className="text-blue-600 hover:text-blue-700">
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
            {editingPrice ? (
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-20 px-2 py-1 text-center border border-gray-300 rounded"
                  autoFocus
                />
                <button onClick={updatePricePerMinute} className="text-green-600 hover:text-green-700">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingPrice(false)} className="text-red-600 hover:text-red-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-900">{pricePerMinute.toFixed(2)}€</div>
            )}
          </div>
        </div>

        {!selectedBarber ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Profissional</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Minutos</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Receita Bruta</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Comissão</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">%</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {commissionsData.map((barber) => (
                  <tr key={barber.barber_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{barber.barber_name}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">{Math.round(barber.total_minutes)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{barber.gross_revenue.toFixed(2)}€</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-green-600">{barber.commission_amount.toFixed(2)}€</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{barber.commission_percentage.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedBarber(barber.barber_id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {commissionsData.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">Nenhuma comissão encontrada</div>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedBarber(null)}
              className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Voltar
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900">{selectedBarberData?.barber_name}</h3>
              <p className="text-gray-600">
                Comissão: {selectedBarberData?.commission_percentage}% | Total: {selectedBarberData?.commission_amount.toFixed(2)}€
              </p>
            </div>

            {selectedBarberData && selectedBarberData.manual_entries.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Entradas Manuais</h4>
                <div className="overflow-x-auto">
                  <table className="w-full mb-4">
                    <thead>
                      <tr className="bg-green-50 border-b">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Data</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Descrição</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Minutos</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Valor</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedBarberData.manual_entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(entry.date).toLocaleDateString('pt-PT')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{entry.description || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{entry.minutes}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                            {entry.amount.toFixed(2)}€
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteManual(entry.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <h4 className="text-lg font-semibold text-gray-900 mb-3">Marcações</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Data</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Hora</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Serviço</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Preço</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedBarberData?.appointments.map((apt, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(apt.date).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{apt.time}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{apt.service}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{apt.price.toFixed(2)}€</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                        {apt.commission.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
