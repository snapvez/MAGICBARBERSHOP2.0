import { useEffect, useState } from 'react';
import { Shield, Plus, Edit2, Save, X, UserPlus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'barber';
  is_active: boolean;
  barber_id: string | null;
  created_at: string;
}

interface Barber {
  id: string;
  name: string;
}

export const AdminUsersManager = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'admin' as 'super_admin' | 'admin' | 'barber',
    barber_id: '',
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [adminUsersResult, barbersResult] = await Promise.all([
        supabase
          .from('admin_users')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('barbers')
          .select('id, name')
          .eq('is_active', true)
          .order('name')
      ]);

      if (adminUsersResult.error) throw adminUsersResult.error;
      if (barbersResult.error) throw barbersResult.error;

      setAdminUsers(adminUsersResult.data || []);
      setBarbers(barbersResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'admin',
      barber_id: '',
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.email.trim() || !formData.password.trim()) {
        showAlert('error', 'Email e password são obrigatórios');
        return;
      }

      if (formData.role === 'barber' && !formData.barber_id) {
        showAlert('error', 'Selecione um barbeiro para a role "barber"');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`;

      const requestBody: any = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name || formData.email.split('@')[0],
        role: formData.role,
      };

      if (formData.barber_id) {
        requestBody.barber_id = formData.barber_id;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao criar utilizador admin');
      }

      showAlert('success', 'Utilizador admin criado com sucesso!');
      setIsCreating(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      showAlert('error', error.message || 'Erro ao criar utilizador admin');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadData();
      showAlert('success', 'Status atualizado!');
    } catch (error: any) {
      showAlert('error', 'Erro ao atualizar status');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'barber':
        return 'Barbeiro';
      default:
        return role;
    }
  };

  const getBarberName = (barberId: string | null) => {
    if (!barberId) return '-';
    const barber = barbers.find(b => b.id === barberId);
    return barber?.name || '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-magic-yellow">A carregar utilizadores admin...</div>
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
          <Shield className="w-6 h-6 text-magic-gold" />
          <h2 className="text-2xl font-bold text-magic-gold">Gestão de Utilizadores Admin</h2>
        </div>
        {!isCreating && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            Novo Admin
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-gray-900/50 rounded-lg p-6 border-2 border-magic-gold">
          <h3 className="text-lg font-bold text-magic-gold mb-4">Novo Utilizador Admin</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="Nome completo do utilizador"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
                <option value="barber">Barbeiro</option>
              </select>
            </div>

            {formData.role === 'barber' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-magic-yellow mb-2">
                  Barbeiro *
                </label>
                <select
                  value={formData.barber_id}
                  onChange={(e) => setFormData({ ...formData, barber_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                >
                  <option value="">Selecione um barbeiro</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                <strong>Nota:</strong> O novo utilizador receberá um email de confirmação e poderá fazer login imediatamente com as credenciais fornecidas.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold"
            >
              <Save className="w-4 h-4" />
              Criar Utilizador
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
        {adminUsers.map((user) => (
          <div
            key={user.id}
            className="bg-gray-900/50 rounded-lg p-6 border border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-magic-gold">{user.full_name}</h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    user.role === 'super_admin'
                      ? 'bg-purple-900/20 text-purple-400'
                      : user.role === 'admin'
                      ? 'bg-blue-900/20 text-blue-400'
                      : 'bg-green-900/20 text-green-400'
                  }`}>
                    {getRoleName(user.role)}
                  </span>
                  <button
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      user.is_active
                        ? 'bg-green-900/20 text-green-400'
                        : 'bg-red-900/20 text-red-400'
                    }`}
                  >
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-magic-yellow/70">
                  <div>Email: {user.email}</div>
                  {user.barber_id && <div>Barbeiro: {getBarberName(user.barber_id)}</div>}
                  <div>Criado: {new Date(user.created_at).toLocaleDateString('pt-PT')}</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {adminUsers.length === 0 && (
          <div className="text-center py-8 text-magic-yellow/60">
            Nenhum utilizador admin encontrado.
          </div>
        )}
      </div>
    </div>
  );
};
