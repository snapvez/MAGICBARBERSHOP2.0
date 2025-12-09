import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Plus, Edit2, Trash2, Save, X, Percent, Crown, Upload, Camera, Scissors } from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  commission_percentage: number;
  profile_photo_url: string | null;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
}

interface BarberService {
  service_id: string;
}

export function BarberManager() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBarberServices, setSelectedBarberServices] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    commission_percentage: 50,
    selectedServices: [] as string[],
  });

  useEffect(() => {
    fetchBarbers();
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

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

  const fetchBarberServices = async (barberId: string) => {
    try {
      const { data, error } = await supabase
        .from('barber_services')
        .select('service_id')
        .eq('barber_id', barberId);

      if (error) throw error;
      return (data || []).map((bs: BarberService) => bs.service_id);
    } catch (error) {
      console.error('Error fetching barber services:', error);
      return [];
    }
  };

  const handlePhotoUpload = async (barberId: string, file: File) => {
    try {
      setUploadingPhoto(barberId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${barberId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('barber-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('barber-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('barbers')
        .update({ profile_photo_url: publicUrl })
        .eq('id', barberId);

      if (updateError) throw updateError;

      alert('Foto atualizada com sucesso!');
      fetchBarbers();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert(`Erro ao fazer upload da foto: ${error.message}`);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.selectedServices.length === 0) {
      alert('Por favor, selecione pelo menos um serviço que o barbeiro pode fazer.');
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar utilizador');

      const { data: barberData, error: barberError } = await supabase
        .from('barbers')
        .insert([
          {
            name: formData.name,
            phone: formData.phone,
            commission_percentage: formData.commission_percentage,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (barberError) throw barberError;

      const { error: adminError } = await supabase.from('admin_users').insert([
        {
          auth_user_id: authData.user.id,
          email: formData.email,
          full_name: formData.name,
          role: 'barber',
          barber_id: barberData.id,
          is_active: true,
        },
      ]);

      if (adminError) throw adminError;

      const barberServicesData = formData.selectedServices.map((serviceId) => ({
        barber_id: barberData.id,
        service_id: serviceId,
      }));

      const { error: servicesError } = await supabase
        .from('barber_services')
        .insert(barberServicesData);

      if (servicesError) throw servicesError;

      alert('Barbeiro e conta criados com sucesso! O barbeiro pode agora fazer login.');
      setShowAddForm(false);
      setFormData({ name: '', phone: '', email: '', password: '', commission_percentage: 50, selectedServices: [] });
      fetchBarbers();
    } catch (error: any) {
      console.error('Error adding barber:', error);
      alert(`Erro ao adicionar barbeiro: ${error.message}`);
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

  const handleEditServices = async (barberId: string) => {
    const currentServices = await fetchBarberServices(barberId);
    setSelectedBarberServices(currentServices);
    setEditingId(barberId);
  };

  const handleSaveServices = async (barberId: string) => {
    try {
      await supabase
        .from('barber_services')
        .delete()
        .eq('barber_id', barberId);

      if (selectedBarberServices.length > 0) {
        const barberServicesData = selectedBarberServices.map((serviceId) => ({
          barber_id: barberId,
          service_id: serviceId,
        }));

        const { error } = await supabase
          .from('barber_services')
          .insert(barberServicesData);

        if (error) throw error;
      }

      alert('Serviços atualizados com sucesso!');
      setEditingId(null);
      setSelectedBarberServices([]);
    } catch (error: any) {
      console.error('Error updating services:', error);
      alert(`Erro ao atualizar serviços: ${error.message}`);
    }
  };

  const toggleService = (serviceId: string) => {
    if (selectedBarberServices.includes(serviceId)) {
      setSelectedBarberServices(selectedBarberServices.filter((id) => id !== serviceId));
    } else {
      setSelectedBarberServices([...selectedBarberServices, serviceId]);
    }
  };

  const handlePromoteToAdmin = async (barberId: string, barberName: string) => {
    if (!confirm(
      `Promover "${barberName}" a Administrador?\n\n` +
      `ISTO IRÁ:\n` +
      `- Converter o barbeiro em administrador\n` +
      `- Dar acesso ao painel administrativo (você define as permissões)\n` +
      `- Manter os agendamentos históricos\n\n` +
      `IMPORTANTE: Após promover, você precisa ir em "Permissões" para\n` +
      `definir o que este administrador pode acessar.\n\n` +
      `Confirmar promoção?`
    )) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({
          role: 'admin',
          barber_id: null
        })
        .eq('barber_id', barberId);

      if (updateError) throw updateError;

      const { error: deactivateError } = await supabase
        .from('barbers')
        .update({ is_active: false })
        .eq('id', barberId);

      if (deactivateError) throw deactivateError;

      alert(
        `"${barberName}" foi promovido a Administrador!\n\n` +
        `O perfil de barbeiro foi desativado mas os dados históricos foram preservados.\n\n` +
        `PRÓXIMO PASSO: Vá em "Permissões" no menu para definir o que\n` +
        `este administrador pode acessar no sistema.`
      );
      fetchBarbers();
    } catch (error: any) {
      console.error('Error promoting barber:', error);
      alert(`Erro ao promover barbeiro: ${error.message}`);
    }
  };

  const handleDelete = async (barberId: string, barberName: string) => {
    try {
      const { count: appointmentsCount, error: countError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', barberId);

      if (countError) throw countError;

      if (appointmentsCount && appointmentsCount > 0) {
        const action = confirm(
          `ATENÇÃO: O barbeiro "${barberName}" tem ${appointmentsCount} agendamento(s) associado(s).\n\n` +
          `Escolha uma opção:\n` +
          `• OK = Desativar o barbeiro (recomendado - mantém histórico)\n` +
          `• CANCELAR = Não fazer nada\n\n` +
          `NOTA: Não é possível eliminar barbeiros com agendamentos para preservar o histórico.`
        );

        if (action) {
          await handleUpdate(barberId, { is_active: false });
          alert(`Barbeiro "${barberName}" foi desativado com sucesso!\n\nOs agendamentos históricos foram preservados.`);
        }
        return;
      }

      if (!confirm(
        `Tem certeza que deseja eliminar o barbeiro "${barberName}"?\n\n` +
        `ISTO IRÁ:\n` +
        `- Eliminar o barbeiro permanentemente\n` +
        `- Eliminar a conta de acesso\n` +
        `- Esta ação NÃO pode ser desfeita!\n\n` +
        `Confirmar eliminação?`
      )) {
        return;
      }

      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('auth_user_id')
        .eq('barber_id', barberId)
        .maybeSingle();

      if (adminError) throw adminError;

      if (adminUser) {
        const { error: deleteAdminError } = await supabase
          .from('admin_users')
          .delete()
          .eq('barber_id', barberId);

        if (deleteAdminError) throw deleteAdminError;
      }

      const { error: deleteBarberError } = await supabase
        .from('barbers')
        .delete()
        .eq('id', barberId);

      if (deleteBarberError) throw deleteBarberError;

      alert('Barbeiro eliminado com sucesso!');
      fetchBarbers();
    } catch (error: any) {
      console.error('Error deleting barber:', error);
      alert(`Erro ao eliminar barbeiro: ${error.message}`);
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
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Scissors className="w-4 h-4 inline mr-1" />
                Serviços que o Barbeiro Realiza *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border border-gray-300 rounded-lg bg-gray-50">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedServices.includes(service.id)}
                      onChange={() => {
                        if (formData.selectedServices.includes(service.id)) {
                          setFormData({
                            ...formData,
                            selectedServices: formData.selectedServices.filter(
                              (id) => id !== service.id
                            ),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            selectedServices: [...formData.selectedServices, service.id],
                          });
                        }
                      }}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-700">{service.name}</span>
                  </label>
                ))}
              </div>
              {formData.selectedServices.length === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Selecione pelo menos um serviço
                </p>
              )}
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
                  setFormData({ name: '', phone: '', email: '', password: '', commission_percentage: 50, selectedServices: [] });
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Foto</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Telefone</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                Comissão (%)
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Estado</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {barbers.map((barber) => (
              <React.Fragment key={barber.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                        {barber.profile_photo_url ? (
                          <img
                            src={barber.profile_photo_url}
                            alt={barber.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <label
                        className={`cursor-pointer text-blue-600 hover:text-blue-800 ${
                          uploadingPhoto === barber.id ? 'opacity-50' : ''
                        }`}
                      >
                        <Upload className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingPhoto === barber.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handlePhotoUpload(barber.id, file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{barber.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{barber.phone}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className="font-medium text-gray-900">
                      {barber.commission_percentage.toFixed(2)}%
                    </span>
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
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditServices(barber.id)}
                        className="text-amber-600 hover:text-amber-800"
                        title="Editar serviços"
                      >
                        <Scissors className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePromoteToAdmin(barber.id, barber.name)}
                        className="text-amber-600 hover:text-amber-800"
                        title="Promover a Administrador"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(barber.id, barber.name)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar barbeiro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {editingId === barber.id && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 bg-amber-50">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">
                          Editar Serviços de {barber.name}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {services.map((service) => (
                            <label
                              key={service.id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedBarberServices.includes(service.id)}
                                onChange={() => toggleService(service.id)}
                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                              />
                              <span className="text-sm text-gray-700">{service.name}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveServices(barber.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                          >
                            <Save className="w-4 h-4" />
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setSelectedBarberServices([]);
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
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
