import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Crown, Plus, Edit2, Save, X, Trash2, Link as LinkIcon } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  cuts_per_month: number;
  discount_percentage: number;
  description: string | null;
  is_active: boolean;
  stripe_payment_link: string | null;
  created_at: string;
}

export function SubscriptionPlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    cuts_per_month: 1,
    discount_percentage: 0,
    description: '',
    stripe_payment_link: '',
  });
  const [editFormData, setEditFormData] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      alert('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('subscription_plans').insert([
        {
          ...formData,
          is_active: true,
        },
      ]);

      if (error) throw error;

      alert('Plano adicionado com sucesso!');
      setShowAddForm(false);
      setFormData({ name: '', price: 0, cuts_per_month: 1, discount_percentage: 0, description: '', stripe_payment_link: '' });
      fetchPlans();
    } catch (error) {
      console.error('Error adding plan:', error);
      alert('Erro ao adicionar plano');
    }
  };

  const handleStartEdit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setEditFormData({ ...plan });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData(null);
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: editFormData.name,
          price: editFormData.price,
          cuts_per_month: editFormData.cuts_per_month,
          discount_percentage: editFormData.discount_percentage,
          description: editFormData.description,
          stripe_payment_link: editFormData.stripe_payment_link,
        })
        .eq('id', editFormData.id);

      if (error) throw error;

      alert('Plano atualizado com sucesso!');
      setEditingId(null);
      setEditFormData(null);
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Erro ao atualizar plano');
    }
  };

  const handleToggleActive = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !currentStatus })
        .eq('id', planId);

      if (error) throw error;

      alert('Estado do plano atualizado!');
      fetchPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      alert('Erro ao atualizar estado');
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Tem certeza que deseja remover este plano? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      alert('Plano removido com sucesso!');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Erro ao remover plano. Pode existir assinaturas ativas com este plano.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-xl text-gray-600">A carregar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8 bg-magic-black min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Crown className="w-8 h-8 text-magic-gold" />
          <h2 className="text-2xl font-bold text-magic-gold">Gestão de Planos de Assinatura</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-magic-gold text-magic-black rounded-lg hover:bg-magic-yellow font-semibold"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-900 rounded-lg shadow-sm p-6 border-2 border-magic-gold/30">
          <h3 className="text-lg font-semibold text-magic-gold mb-4">Novo Plano</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-magic-gold/30 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-transparent"
                  placeholder="Ex: Plano Mensal"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Preço (€) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-magic-gold/30 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Desconto (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-magic-gold/30 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Desconto aplicado no checkout (ex: 10 = 10% de desconto)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Cortes Gratuitos Incluídos *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.cuts_per_month}
                  onChange={(e) => setFormData({ ...formData, cuts_per_month: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-magic-gold/30 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Quantidade de cortes gratuitos que o cliente recebe</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Link de Pagamento Stripe
                </label>
                <input
                  type="url"
                  value={formData.stripe_payment_link}
                  onChange={(e) => setFormData({ ...formData, stripe_payment_link: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-magic-gold/30 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-transparent"
                  placeholder="https://buy.stripe.com/..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-magic-gold/30 rounded-lg focus:ring-2 focus:ring-magic-gold focus:border-transparent"
                  rows={3}
                  placeholder="Descrição detalhada do plano..."
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', price: 0, cuts_per_month: 1, discount_percentage: 0, description: '', stripe_payment_link: '' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-semibold"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg shadow-sm overflow-hidden border-2 border-magic-gold/30">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 border-b-2 border-magic-gold/30">
                <th className="px-4 py-3 text-left text-sm font-semibold text-magic-gold">Nome</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-magic-gold">Preço</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-magic-gold">Desconto</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-magic-gold">Cortes Grátis</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-magic-gold">Descrição</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-magic-gold">Link</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-magic-gold">Estado</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-magic-gold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-magic-gold/10">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-magic-gold/5">
                  {editingId === plan.id && editFormData ? (
                    <>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full px-2 py-1 bg-gray-800 text-white border border-magic-gold/30 rounded"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          step="0.01"
                          value={editFormData.price}
                          onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 text-right bg-gray-800 text-white border border-magic-gold/30 rounded"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editFormData.discount_percentage}
                          onChange={(e) => setEditFormData({ ...editFormData, discount_percentage: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 text-center bg-gray-800 text-white border border-magic-gold/30 rounded"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={editFormData.cuts_per_month}
                          onChange={(e) => setEditFormData({ ...editFormData, cuts_per_month: parseInt(e.target.value) || 1 })}
                          className="w-20 px-2 py-1 text-center bg-gray-800 text-white border border-magic-gold/30 rounded"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <textarea
                          value={editFormData.description || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="w-full px-2 py-1 bg-gray-800 text-white border border-magic-gold/30 rounded"
                          rows={2}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="url"
                          value={editFormData.stripe_payment_link || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, stripe_payment_link: e.target.value })}
                          className="w-full px-2 py-1 bg-gray-800 text-white border border-magic-gold/30 rounded text-sm break-all"
                          placeholder="https://..."
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(plan.id, plan.is_active)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            plan.is_active
                              ? 'bg-green-900/30 text-green-400 border border-green-500/50'
                              : 'bg-red-900/30 text-red-400 border border-red-500/50'
                          }`}
                        >
                          {plan.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="text-green-400 hover:text-green-300"
                            title="Guardar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-magic-yellow hover:text-magic-gold"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-4 text-sm font-medium text-white">{plan.name}</td>
                      <td className="px-4 py-4 text-sm text-right text-magic-yellow">{plan.price.toFixed(2)}€</td>
                      <td className="px-4 py-4 text-sm text-center text-magic-yellow">{plan.discount_percentage}%</td>
                      <td className="px-4 py-4 text-sm text-center text-magic-yellow">{plan.cuts_per_month}</td>
                      <td className="px-4 py-4 text-sm text-cyan-400 max-w-xs break-words">
                        {plan.description || '-'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {plan.stripe_payment_link ? (
                          <a
                            href={plan.stripe_payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300"
                            title="Ver link"
                          >
                            <LinkIcon className="w-4 h-4 inline" />
                          </a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(plan.id, plan.is_active)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            plan.is_active
                              ? 'bg-green-900/30 text-green-400 border border-green-500/50'
                              : 'bg-red-900/30 text-red-400 border border-red-500/50'
                          }`}
                        >
                          {plan.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleStartEdit(plan)}
                            className="text-cyan-400 hover:text-cyan-300"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {plans.length === 0 && (
            <div className="text-center py-8 text-magic-yellow">
              Nenhum plano cadastrado ainda
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
