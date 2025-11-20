import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, FolderOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  discount_percentage: number;
  commission_percentage: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export const ServiceCategoriesManager = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: 0,
    commission_percentage: 0,
    display_order: 0,
    is_active: true,
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      showAlert('error', 'Erro ao carregar categorias');
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
      discount_percentage: 0,
      commission_percentage: 0,
      display_order: categories.length,
      is_active: true,
    });
  };

  const handleEdit = (category: ServiceCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description,
      discount_percentage: category.discount_percentage,
      commission_percentage: category.commission_percentage,
      display_order: category.display_order,
      is_active: category.is_active,
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        showAlert('error', 'Nome da categoria é obrigatório');
        return;
      }

      if (isCreating) {
        const { error } = await supabase
          .from('service_categories')
          .insert([formData]);

        if (error) throw error;
        showAlert('success', 'Categoria criada com sucesso!');
      } else if (editingId) {
        const { error } = await supabase
          .from('service_categories')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        showAlert('success', 'Categoria atualizada com sucesso!');
      }

      setIsCreating(false);
      setEditingId(null);
      loadCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      showAlert('error', error.message || 'Erro ao salvar categoria');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta categoria? Os serviços associados não serão eliminados.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showAlert('success', 'Categoria eliminada com sucesso!');
      loadCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      showAlert('error', error.message || 'Erro ao eliminar categoria');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-magic-yellow">A carregar categorias...</div>
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
          <FolderOpen className="w-6 h-6 text-magic-gold" />
          <h2 className="text-2xl font-bold text-magic-gold">Gestão de Categorias</h2>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            Nova Categoria
          </button>
        )}
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4">
        <p className="text-sm text-magic-yellow/70 mb-4">
          As categorias organizam os serviços da barbearia. Pode definir percentagens de desconto e comissão para cada categoria.
        </p>

        {(isCreating || editingId) && (
          <div className="bg-gray-900/50 rounded-lg p-6 mb-6 border-2 border-magic-gold">
            <h3 className="text-lg font-bold text-magic-gold mb-4">
              {isCreating ? 'Nova Categoria' : 'Editar Categoria'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                  placeholder="Ex: Barbearia, Corte, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                />
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
                  placeholder="Descrição da categoria (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Percentagem de Desconto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Percentagem de Comissão (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commission_percentage}
                  onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-magic-yellow cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-magic-gold focus:ring-magic-gold rounded"
                  />
                  Categoria ativa
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
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-magic-gold/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-magic-gold">{category.name}</h3>
                    {!category.is_active && (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                        Inativa
                      </span>
                    )}
                    <span className="px-2 py-1 bg-magic-gold/20 text-magic-gold text-xs rounded">
                      Ordem: {category.display_order}
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-sm text-magic-yellow/70 mb-2">{category.description}</p>
                  )}
                  <div className="flex gap-4 text-sm">
                    {category.discount_percentage > 0 && (
                      <span className="text-green-400">
                        Desconto: {category.discount_percentage}%
                      </span>
                    )}
                    {category.commission_percentage > 0 && (
                      <span className="text-blue-400">
                        Comissão: {category.commission_percentage}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-8 text-magic-yellow/50">
              Nenhuma categoria criada ainda
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
