import { useState, useEffect } from 'react';
import { User, Mail, Phone, Save, Calendar, Award, MessageSquare, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Profile {
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp_number: string | null;
  notification_preference: 'sms' | 'whatsapp' | 'both';
  tax_id: string | null;
  loyalty_points: number;
  total_visits: number;
}

export const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notificationPreference, setNotificationPreference] = useState<'sms' | 'whatsapp' | 'both'>('whatsapp');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      const profileData = data as any;
      setProfile(profileData);
      setFullName(profileData.full_name);
      setPhone(profileData.phone || '');
      setWhatsappNumber(profileData.whatsapp_number || '');
      setTaxId(profileData.tax_id || '');
      setNotificationPreference(profileData.notification_preference || 'whatsapp');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (taxId && !/^[0-9]{9}$/.test(taxId)) {
      alert('NIF inválido. Deve conter exatamente 9 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const updateData: Record<string, any> = {
        full_name: fullName,
        phone: phone || null,
        whatsapp_number: whatsappNumber || null,
        tax_id: taxId || null,
        notification_preference: notificationPreference,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData as any)
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);
      loadProfile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">A carregar perfil...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-sky-600 p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">{profile.full_name}</h2>
              <p className="text-blue-100">{profile.email}</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Pontos de Fidelidade</span>
              </div>
              <div className="text-4xl font-bold text-blue-600">{profile.loyalty_points}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Total de Visitas</span>
              </div>
              <div className="text-4xl font-bold text-blue-600">{profile.total_visits}</div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Editar Informações</h3>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4" />
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4" />
                Telemóvel
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="+351 912 345 678"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4" />
                NIF (Contribuinte) *
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="123456789"
                maxLength={9}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                9 dígitos - obrigatório para emissão de faturas
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MessageCircle className="w-4 h-4" />
                WhatsApp (opcional)
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="+351 912 345 678"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para usar o mesmo número do telemóvel
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4" />
                Preferência de Notificações
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setNotificationPreference('sms')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    notificationPreference === 'sms'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Phone className="w-5 h-5 mx-auto mb-1" />
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationPreference('whatsapp')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    notificationPreference === 'whatsapp'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <MessageCircle className="w-5 h-5 mx-auto mb-1" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationPreference('both')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    notificationPreference === 'both'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                  Ambos
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Escolha como deseja receber notificações sobre os seus agendamentos
              </p>
            </div>

            {success && (
              <div className="bg-blue-50 border-2 border-blue-200 text-blue-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <Save className="w-5 h-5" />
                <span className="font-semibold">Perfil atualizado com sucesso!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-sky-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-sky-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
