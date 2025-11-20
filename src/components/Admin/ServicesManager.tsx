import { useEffect, useState } from 'react';
import { Award, Plus, Edit2, Save, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  tokens_price: number | null;
  rebooking_period_days: number | null;
  category_id: string | null;
  is_hidden: boolean;
  is_quick_service: boolean;
  push_notification_enabled: boolean;
  price_starts_at: boolean;
  service_type: 'subscription' | 'individual';
  is_active: boolean;
  color: string | null;
  points_reward: number;
}

interface ServiceCategory {
  id: string;
  name: string;
}

export const ServicesManager = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    tokens_price: null as number | null,
    rebooking_period_days: null as number | null,
    category_id: '',
    is_hidden: false,
    is_quick_service: false,
    push_notification_enabled: false,
    price_starts_at: false,
    service_type: 'individual' as 'subscription' | 'individual',
    color: '#FFD700',
    points_reward: 1,
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        supabase.from('services').select('*').order('name'),
        supabase.from('service_categories').select('id, name').eq('is_active', true).order('display_order')
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setServices(servicesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      description: '',
      duration_minutes: 30,
      price: 0,
      tokens_price: null,
      rebooking_period_days: null,
      category_id: '',
      is_hidden: false,
      is_quick_service: false,
      push_notification_enabled: false,
      price_starts_at: false,
      service_type: 'individual',
      color: '#FFD700',
      points_reward: 1,
    });
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price,
      tokens_price: service.tokens_price,
      rebooking_period_days: service.rebooking_period_days,
      category_id: service.category_id || '',
      is_hidden: service.is_hidden,
      is_quick_service: service.is_quick_service,
      push_notification_enabled: service.push_notification_enabled,
      price_starts_at: service.price_starts_at,
      service_type: service.service_type,
      color: service.color || '#FFD700',
      points_reward: service.points_reward,
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        showAlert('error', 'Nome é obrigatório');
        return;
      }

      if (formData.duration_minutes <= 0) {
        showAlert('error', 'Duração deve ser maior que 0');
        return;
      }

      if (formData.price <= 0) {
        showAlert('error', 'Valor deve ser maior que 0');
        return;
      }

      if (!formData.category_id) {
        showAlert('error', 'Categoria é obrigatória');
        return;
      }

      const dataToSave = {
        ...formData,
        category_id: formData.category_id || null,
      };

      if (isCreating) {
        const { error } = await supabase
          .from('services')
          .insert([{ ...dataToSave, is_active: true }]);

        if (error) throw error;
        showAlert('success', 'Serviço criado com sucesso!');
      } else if (editingId) {
        const { error } = await supabase
          .from('services')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;
        showAlert('success', 'Serviço atualizado com sucesso!');
      }

      setIsCreating(false);
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving service:', error);
      showAlert('error', error.message || 'Erro ao salvar serviço');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadData();
      showAlert('success', 'Status atualizado!');
    } catch (error: any) {
      showAlert('error', 'Erro ao atualizar status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-magic-yellow">A carregar serviços...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alert && (
        <div className={`p-4 rounded-lg ${
          alert.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {alert.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-6 h-6 text-magic-gold" />
          <h2 className="text-2xl font-bold text-magic-gold">Gestão de Serviços</h2>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço
          </button>
        )}
      </div>

      {(isCreating || editingId) && (
        <div className="bg-gray-900/50 rounded-lg p-6 border-2 border-magic-gold">
          <h3 className="text-lg font-bold text-magic-gold mb-4">
            {isCreating ? 'Novo Serviço' : 'Editar Serviço'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Nome *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="Ex: Corte, Barba, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Categoria *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Duração (minutos) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Valor (€) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Valor em Fichas
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.tokens_price || ''}
                onChange={(e) => setFormData({ ...formData, tokens_price: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="Opcional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Período para Reocupar (dias)
              </label>
              <input
                type="number"
                min="0"
                value={formData.rebooking_period_days || ''}
                onChange={(e) => setFormData({ ...formData, rebooking_period_days: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="Opcional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Pontos de Recompensa
              </label>
              <input
                type="number"
                min="0"
                value={formData.points_reward}
                onChange={(e) => setFormData({ ...formData, points_reward: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Cor
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 bg-gray-700 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Tipo de Serviço
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value as 'subscription' | 'individual' })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              >
                <option value="individual">Avulso</option>
                <option value="subscription">Assinatura</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                rows={2}
                placeholder="Descrição do serviço (opcional)"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center gap-2 text-magic-yellow cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_hidden}
                  onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                  className="w-4 h-4 text-magic-gold focus:ring-magic-gold rounded"
                />
                Oculto (não aparece para o cliente)
              </label>

              <label className="flex items-center gap-2 text-magic-yellow cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_quick_service}
                  onChange={(e) => setFormData({ ...formData, is_quick_service: e.target.checked })}
                  className="w-4 h-4 text-magic-gold focus:ring-magic-gold rounded"
                />
                Serviço de Encaixe (horários livres específicos)
              </label>

              <label className="flex items-center gap-2 text-magic-yellow cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.push_notification_enabled}
                  onChange={(e) => setFormData({ ...formData, push_notification_enabled: e.target.checked })}
                  className="w-4 h-4 text-magic-gold focus:ring-magic-gold rounded"
                />
                Considerar como aviso no PUSH (campanhas)
              </label>

              <label className="flex items-center gap-2 text-magic-yellow cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.price_starts_at}
                  onChange={(e) => setFormData({ ...formData, price_starts_at: e.target.checked })}
                  className="w-4 h-4 text-magic-gold focus:ring-magic-gold rounded"
                />
                A partir de (preço exibido como "A partir de X€")
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Voltar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className={`bg-gray-900/50 rounded-lg p-4 border transition-all ${
              service.is_active
                ? 'border-gray-700 hover:border-magic-gold/50'
                : 'border-red-500/30 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {service.color && (
                    <div
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: service.color }}
                    />
                  )}
                  <h3 className="text-lg font-bold text-magic-gold">{service.name}</h3>
                  {service.is_hidden && (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                {service.description && (
                  <p className="text-xs text-magic-yellow/70 mb-2">{service.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded">
                    {service.price_starts_at ? 'A partir de ' : ''}{service.price}€
                  </span>
                  <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
                    {service.duration_minutes}min
                  </span>
                  <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
                    {service.service_type === 'subscription' ? 'Assinatura' : 'Avulso'}
                  </span>
                  {service.is_quick_service && (
                    <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
                      Encaixe
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(service)}
                  className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(service.id, service.is_active)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    service.is_active
                      ? 'bg-green-900/20 text-green-400'
                      : 'bg-red-900/20 text-red-400'
                  }`}
                >
                  {service.is_active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
