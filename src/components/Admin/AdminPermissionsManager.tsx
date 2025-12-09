import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Users, Check, X } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'barber';
  is_active: boolean;
  barber_id: string | null;
}

interface Permission {
  permission_key: string;
  permission_name: string;
  description: string | null;
}

interface UserPermission {
  admin_user_id: string;
  permission_key: string;
}

export function AdminPermissionsManager() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [adminsRes, permsRes, userPermsRes] = await Promise.all([
        supabase
          .from('admin_users')
          .select('*')
          .neq('role', 'barber')
          .order('full_name'),
        supabase
          .from('admin_permissions')
          .select('*')
          .order('permission_name'),
        supabase
          .from('admin_user_permissions')
          .select('admin_user_id, permission_key'),
      ]);

      if (adminsRes.error) throw adminsRes.error;
      if (permsRes.error) throw permsRes.error;
      if (userPermsRes.error) throw userPermsRes.error;

      setAdmins(adminsRes.data || []);
      setPermissions(permsRes.data || []);
      setUserPermissions(userPermsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Erro ao carregar dados de permissões');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (adminId: string, permissionKey: string): boolean => {
    const admin = admins.find((a) => a.id === adminId);
    if (admin?.role === 'super_admin') return true;
    return userPermissions.some(
      (up) => up.admin_user_id === adminId && up.permission_key === permissionKey
    );
  };

  const togglePermission = async (adminId: string, permissionKey: string) => {
    const admin = admins.find((a) => a.id === adminId);

    if (admin?.role === 'super_admin') {
      alert('Super Administradores têm todas as permissões automaticamente.');
      return;
    }

    const currentlyHas = hasPermission(adminId, permissionKey);

    try {
      if (currentlyHas) {
        const { error } = await supabase
          .from('admin_user_permissions')
          .delete()
          .eq('admin_user_id', adminId)
          .eq('permission_key', permissionKey);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_user_permissions')
          .insert([
            {
              admin_user_id: adminId,
              permission_key: permissionKey,
            },
          ]);

        if (error) throw error;
      }

      await fetchData();
    } catch (error: any) {
      console.error('Error toggling permission:', error);
      alert(`Erro ao alterar permissão: ${error.message}`);
    }
  };

  const grantAllPermissions = async (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId);

    if (admin?.role === 'super_admin') {
      alert('Super Administradores já têm todas as permissões.');
      return;
    }

    if (!confirm(`Conceder TODAS as permissões a ${admin?.full_name}?`)) {
      return;
    }

    try {
      const permissionsToGrant = permissions
        .filter((p) => !hasPermission(adminId, p.permission_key))
        .map((p) => ({
          admin_user_id: adminId,
          permission_key: p.permission_key,
        }));

      if (permissionsToGrant.length > 0) {
        const { error } = await supabase
          .from('admin_user_permissions')
          .insert(permissionsToGrant);

        if (error) throw error;
      }

      await fetchData();
      alert('Todas as permissões concedidas com sucesso!');
    } catch (error: any) {
      console.error('Error granting all permissions:', error);
      alert(`Erro ao conceder permissões: ${error.message}`);
    }
  };

  const revokeAllPermissions = async (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId);

    if (admin?.role === 'super_admin') {
      alert('Não é possível remover permissões de Super Administradores.');
      return;
    }

    if (!confirm(`Remover TODAS as permissões de ${admin?.full_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_user_permissions')
        .delete()
        .eq('admin_user_id', adminId);

      if (error) throw error;

      await fetchData();
      alert('Todas as permissões removidas com sucesso!');
    } catch (error: any) {
      console.error('Error revoking all permissions:', error);
      alert(`Erro ao remover permissões: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-xl text-gray-600">A carregar...</div>
      </div>
    );
  }

  const selectedAdminData = admins.find((a) => a.id === selectedAdmin);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-900">
          Gerenciar Permissões de Administradores
        </h2>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>Super Administrador (Maycon):</strong> Tem acesso total a todas as
          funcionalidades automaticamente.
          <br />
          <strong>Administradores:</strong> Apenas têm acesso às funcionalidades que você
          conceder permissão.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Administradores
          </h3>
          <div className="space-y-2">
            {admins.map((admin) => (
              <button
                key={admin.id}
                onClick={() => setSelectedAdmin(admin.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedAdmin === admin.id
                    ? 'bg-amber-100 border-2 border-amber-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="font-medium text-gray-900">{admin.full_name}</div>
                <div className="text-sm text-gray-600">{admin.email}</div>
                <div className="mt-1">
                  {admin.role === 'super_admin' ? (
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-amber-600 text-white rounded">
                      Super Admin
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                      Admin
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          {selectedAdmin ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Permissões de {selectedAdminData?.full_name}
                </h3>
                {selectedAdminData?.role !== 'super_admin' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => grantAllPermissions(selectedAdmin)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Conceder Todas
                    </button>
                    <button
                      onClick={() => revokeAllPermissions(selectedAdmin)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remover Todas
                    </button>
                  </div>
                )}
              </div>

              {selectedAdminData?.role === 'super_admin' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800">
                    Este é um Super Administrador e tem acesso total a todas as
                    funcionalidades automaticamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {permissions.map((permission) => {
                    const has = hasPermission(selectedAdmin, permission.permission_key);
                    const isManageAdmins = permission.permission_key === 'manage_admins';

                    return (
                      <div
                        key={permission.permission_key}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-colors ${
                          has
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <button
                          onClick={() =>
                            !isManageAdmins &&
                            togglePermission(selectedAdmin, permission.permission_key)
                          }
                          disabled={isManageAdmins}
                          className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors ${
                            has
                              ? 'bg-green-500 text-white'
                              : 'bg-white border-2 border-gray-300'
                          } ${isManageAdmins ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                        >
                          {has && <Check className="w-4 h-4" />}
                        </button>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {permission.permission_name}
                            {isManageAdmins && (
                              <span className="ml-2 text-xs text-amber-600 font-semibold">
                                (Apenas Super Admin)
                              </span>
                            )}
                          </div>
                          {permission.description && (
                            <div className="text-sm text-gray-600 mt-1">
                              {permission.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Selecione um administrador para gerenciar suas permissões
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
