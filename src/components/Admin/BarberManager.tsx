import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Plus, Edit2, Trash2, Save, X, Percent } from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
  commission_percentage: number;
  created_at: string;
}

export function BarberManager() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    commission_percentage: 50,
  });

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .order('name');

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Error fetching barbers:', error);
      alert('Erro ao carregar barbeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('barbers').insert([
        {
          ...formData,
          is_active: true,
        },
      ]);

      if (error) throw error;

      alert('Barbeiro adicionado com sucesso!');
      setShowAddForm(false);
      setFormData({ name: '', phone: '', email: '', commission_percentage: 50 });
      fetchBarbers();
    } catch (error) {
      console.error('Error adding barber:', error);
      alert('Erro ao adicionar barbeiro');
    }
  };

  const handleUpdate = async (barberId: string, updates: Partial<Barber>) => {
    try {
      const { error } = await supabase
        .from('barbers')
        .update(updates)
        .eq('id', barberId);

      if (error) throw error;

      alert('Barbeiro atualizado com sucesso!');
      setEditingId(null);
      fetchBarbers();
    } catch (error) {
      console.error('Error updating barber:', error);
      alert('Erro ao atualizar barbeiro');
    }
  };

  const handleToggleActive = async (barberId: string, currentStatus: boolean) => {
    await handleUpdate(barberId, { is_active: !currentStatus });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-xl text-gray-600">A carregar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Barbeiros</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" />
          Adicionar Barbeiro
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo Barbeiro</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comissão (%) *
                </label>
                <div className="relative">
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.commission_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commission_percentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
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
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', phone: '', email: '', commission_percentage: 50 });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Telefone</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                Comissão (%)
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Estado</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {barbers.map((barber) => (
              <tr key={barber.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{barber.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{barber.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{barber.email || '-'}</td>
                <td className="px-6 py-4 text-sm text-right">
                  {editingId === barber.id ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      defaultValue={barber.commission_percentage}
                      className="w-20 px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                      onBlur={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue) && newValue !== barber.commission_percentage) {
                          handleUpdate(barber.id, { commission_percentage: newValue });
                        } else {
                          setEditingId(null);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-gray-900">
                      {barber.commission_percentage.toFixed(2)}%
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleActive(barber.id, barber.is_active)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      barber.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {barber.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => setEditingId(barber.id)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                    title="Editar comissão"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {barbers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum barbeiro cadastrado ainda
          </div>
        )}
      </div>
    </div>
  );
}
