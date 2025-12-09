import { useEffect, useState } from 'react';
import { Users, Plus, Edit2, Save, X, Eye, EyeOff, Shield, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Professional {
  id: string;
  name: string;
  nif: string | null;
  phone: string | null;
  mbway_number: string | null;
  address: string | null;
  profile_photo_url: string | null;
  availability_days_advance: number;
  is_hidden: boolean;
  is_active: boolean;
  commission_percentage: number;
  created_at: string;
}

interface BarberPermissions {
  barber_id: string;
  can_create_appointments: boolean;
  can_edit_appointments: boolean;
  can_manage_products: boolean;
  can_manage_services: boolean;
  can_create_blocks: boolean;
  can_remove_days_off: boolean;
  can_edit_client_notes: boolean;
}

export const ProfessionalsManager = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [permissions, setPermissions] = useState<Record<string, BarberPermissions>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPermissionsId, setEditingPermissionsId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nif: '',
    phone: '',
    mbway_number: '',
    address: '',
    availability_days_advance: 7,
    is_hidden: false,
    commission_percentage: 50,
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadProfessionals();
  }, []);

  const loadProfessionals = async () => {
    try {
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
        .order('name');

      if (barbersError) throw barbersError;

      const { data: permissionsData, error: permissionsError } = await supabase
        .from('barber_permissions')
        .select('*');

      if (permissionsError) throw permissionsError;

      const permissionsMap: Record<string, BarberPermissions> = {};
      permissionsData?.forEach(perm => {
        permissionsMap[perm.barber_id] = perm;
      });

      setProfessionals(barbersData || []);
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error loading professionals:', error);
      showAlert('error', 'Erro ao carregar profissionais');
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
      nif: '',
      phone: '',
      mbway_number: '',
      address: '',
      availability_days_advance: 7,
      is_hidden: false,
      commission_percentage: 50,
    });
  };

  const handleEdit = (professional: Professional) => {
    setEditingId(professional.id);
    setFormData({
      name: professional.name,
      nif: professional.nif || '',
      phone: professional.phone || '',
      mbway_number: professional.mbway_number || '',
      address: professional.address || '',
      availability_days_advance: professional.availability_days_advance,
      is_hidden: professional.is_hidden,
      commission_percentage: professional.commission_percentage,
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        showAlert('error', 'Nome é obrigatório');
        return;
      }

      if (isCreating) {
        const { error } = await supabase
          .from('barbers')
          .insert([{ ...formData, is_active: true }]);

        if (error) throw error;
        showAlert('success', 'Profissional criado com sucesso!');
      } else if (editingId) {
        const { error } = await supabase
          .from('barbers')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        showAlert('success', 'Profissional atualizado com sucesso!');
      }

      setIsCreating(false);
      setEditingId(null);
      loadProfessionals();
    } catch (error: any) {
      console.error('Error saving professional:', error);
      showAlert('error', error.message || 'Erro ao salvar profissional');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('barbers')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadProfessionals();
      showAlert('success', 'Status atualizado!');
    } catch (error: any) {
      showAlert('error', 'Erro ao atualizar status');
    }
  };

  const handleSavePermissions = async (barberId: string) => {
    try {
      const { error } = await supabase
        .from('barber_permissions')
        .update(permissions[barberId])
        .eq('barber_id', barberId);

      if (error) throw error;
      setEditingPermissionsId(null);
      showAlert('success', 'Permissões atualizadas!');
    } catch (error: any) {
      showAlert('error', 'Erro ao salvar permissões');
    }
  };

  const updatePermission = (barberId: string, key: keyof BarberPermissions, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [barberId]: {
        ...prev[barberId],
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-magic-yellow">A carregar profissionais...</div>
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
          <Users className="w-6 h-6 text-magic-gold" />
          <h2 className="text-2xl font-bold text-magic-gold">Gestão de Profissionais</h2>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold"
          >
            <Plus className="w-4 h-4" />
            Novo Profissional
          </button>
        )}
      </div>

      {(isCreating || editingId) && (
        <div className="bg-gray-900/50 rounded-lg p-6 border-2 border-magic-gold">
          <h3 className="text-lg font-bold text-magic-gold mb-4">
            {isCreating ? 'Novo Profissional' : 'Editar Profissional'}
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
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                NIF
              </label>
              <input
                type="text"
                value={formData.nif}
                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="Número de Identificação Fiscal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Telemóvel
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="+351 XXX XXX XXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Número MBWay
              </label>
              <input
                type="tel"
                value={formData.mbway_number}
                onChange={(e) => setFormData({ ...formData, mbway_number: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="Número MBWay"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Comissão (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.commission_percentage}
                onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Morada
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                rows={2}
                placeholder="Morada completa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Dias de Antecedência na Agenda
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={formData.availability_days_advance}
                onChange={(e) => setFormData({ ...formData, availability_days_advance: parseInt(e.target.value) || 7 })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              />
              <p className="text-xs text-magic-yellow/60 mt-1">
                Quantos dias de antecedência o cliente pode visualizar
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-magic-yellow cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_hidden}
                  onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                  className="w-4 h-4 text-magic-gold focus:ring-magic-gold rounded"
                />
                Profissional Oculto (não aparece no site, apenas na receção)
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

      <div className="space-y-4">
        {professionals.map((professional) => (
          <div
            key={professional.id}
            className="bg-gray-900/50 rounded-lg p-6 border border-gray-700"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-magic-gold">{professional.name}</h3>
                  {professional.is_hidden && (
                    <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />
                      Oculto
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleActive(professional.id, professional.is_active)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      professional.is_active
                        ? 'bg-green-900/20 text-green-400'
                        : 'bg-red-900/20 text-red-400'
                    }`}
                  >
                    {professional.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-magic-yellow/70">
                  {professional.phone && <div>Tel: {professional.phone}</div>}
                  {professional.nif && <div>NIF: {professional.nif}</div>}
                  {professional.mbway_number && <div>MBWay: {professional.mbway_number}</div>}
                  <div>Comissão: {professional.commission_percentage}%</div>
                  <div>Agenda: {professional.availability_days_advance} dias</div>
                </div>
              </div>
              <button
                onClick={() => handleEdit(professional)}
                className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Permissões */}
            <div className="border-t border-gray-700 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-magic-gold" />
                  <h4 className="font-semibold text-magic-gold">Permissões</h4>
                </div>
                {editingPermissionsId === professional.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSavePermissions(professional.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setEditingPermissionsId(null);
                        loadProfessionals();
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingPermissionsId(professional.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                  >
                    Editar
                  </button>
                )}
              </div>

              {permissions[professional.id] && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { key: 'can_create_appointments', label: 'Criar Agendamentos' },
                    { key: 'can_edit_appointments', label: 'Editar Agendamentos' },
                    { key: 'can_manage_products', label: 'Gerir Produtos' },
                    { key: 'can_manage_services', label: 'Gerir Serviços' },
                    { key: 'can_create_blocks', label: 'Bloquear Horários' },
                    { key: 'can_remove_days_off', label: 'Remover Folgas' },
                    { key: 'can_edit_client_notes', label: 'Editar Notas de Clientes' },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm text-magic-yellow cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={permissions[professional.id][key as keyof BarberPermissions] as boolean}
                        onChange={(e) => updatePermission(professional.id, key as keyof BarberPermissions, e.target.checked)}
                        disabled={editingPermissionsId !== professional.id}
                        className="w-4 h-4 text-magic-gold focus:ring-magic-gold rounded disabled:opacity-50"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
