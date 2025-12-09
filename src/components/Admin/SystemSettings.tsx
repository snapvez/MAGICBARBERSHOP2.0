import { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle, DollarSign, Clock, Ban, MessageSquare, Phone, MessageCircle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SystemSettingsData {
  cancellation_tolerance_minutes: number;
  penalty_duration_hours: number;
  subscription_commission_percentage: number;
  non_subscriber_booking_window_days: number;
  admin_notification_channel: 'sms' | 'whatsapp' | 'both';
  admin_whatsapp_number: string;
  voucher_discounts: {
    all: number;
    individual_services: number;
    subscription_services: number;
    products: number;
  };
}

export const SystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettingsData>({
    cancellation_tolerance_minutes: 60,
    penalty_duration_hours: 24,
    subscription_commission_percentage: 0,
    non_subscriber_booking_window_days: 7,
    admin_notification_channel: 'both',
    admin_whatsapp_number: '',
    voucher_discounts: {
      all: 0,
      individual_services: 0,
      subscription_services: 0,
      products: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toleranceOptions = [20, 60, 120, 180, 240, 300];
  const penaltyDurationOptions = [1, 2, 3, 6, 12, 24, 48, 72];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'cancellation_tolerance_minutes',
          'penalty_duration_hours',
          'subscription_commission_percentage',
          'non_subscriber_booking_window_days',
          'admin_notification_channel',
          'admin_whatsapp_number',
          'voucher_discounts'
        ]);

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach(item => {
        if (item.setting_key === 'voucher_discounts') {
          settingsMap[item.setting_key] = item.setting_value;
        } else {
          settingsMap[item.setting_key] = parseFloat(item.setting_value);
        }
      });

      setSettings(prev => ({
        ...prev,
        ...settingsMap
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
      showAlert('error', 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        {
          setting_key: 'cancellation_tolerance_minutes',
          setting_value: settings.cancellation_tolerance_minutes.toString(),
          description: 'Tolerância antes de aplicar penalidade (em minutos)'
        },
        {
          setting_key: 'penalty_duration_hours',
          setting_value: settings.penalty_duration_hours.toString(),
          description: 'Duração da penalidade em horas'
        },
        {
          setting_key: 'subscription_commission_percentage',
          setting_value: settings.subscription_commission_percentage.toString(),
          description: 'Percentual que o barbeiro recebe das assinaturas'
        },
        {
          setting_key: 'non_subscriber_booking_window_days',
          setting_value: settings.non_subscriber_booking_window_days.toString(),
          description: 'Número de dias de antecedência que não-assinantes podem agendar'
        },
        {
          setting_key: 'admin_notification_channel',
          setting_value: settings.admin_notification_channel,
          description: 'Canal de notificação para administradores'
        },
        {
          setting_key: 'admin_whatsapp_number',
          setting_value: settings.admin_whatsapp_number,
          description: 'Número WhatsApp para notificações admin'
        },
        {
          setting_key: 'voucher_discounts',
          setting_value: settings.voucher_discounts,
          description: 'Descontos de vales por categoria'
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            ...update,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });

        if (error) throw error;
      }

      showAlert('success', 'Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showAlert('error', error.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-magic-yellow">A carregar configurações...</div>
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
          <Settings className="w-6 h-6 text-magic-gold" />
          <h2 className="text-2xl font-bold text-magic-gold">Configurações do Sistema</h2>
        </div>
      </div>

      <div className="space-y-6">
        {/* Regras de Agendamento */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 className="text-xl font-bold text-magic-gold">Regras de Agendamento</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Janela de Agendamento para Não Assinantes (dias)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={settings.non_subscriber_booking_window_days}
                onChange={(e) => setSettings({ ...settings, non_subscriber_booking_window_days: parseInt(e.target.value) || 7 })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              />
              <p className="text-xs text-magic-yellow/60 mt-1">
                Número de dias de antecedência que não assinantes podem agendar (sugestões: 7, 10, 14, 21, 30 dias)
              </p>
              <div className="mt-3 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  <strong>Assinantes:</strong> Podem agendar sem limite de dias (apenas 1 agendamento ativo por vez)
                  <br />
                  <strong>Não Assinantes:</strong> Podem ter múltiplos agendamentos, mas limitados a {settings.non_subscriber_booking_window_days} dias de antecedência
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Penalidades para Assinantes */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Ban className="w-5 h-5 text-red-400" />
            <h3 className="text-xl font-bold text-magic-gold">Regras de Penalidade para Assinantes</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Tolerância de Cancelamento
              </label>
              <select
                value={settings.cancellation_tolerance_minutes}
                onChange={(e) => setSettings({ ...settings, cancellation_tolerance_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              >
                {toleranceOptions.map(minutes => (
                  <option key={minutes} value={minutes}>
                    {minutes < 60 ? `${minutes} minutos` : `${minutes / 60} hora${minutes > 60 ? 's' : ''}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-magic-yellow/60 mt-1">
                Tempo mínimo antes da marcação para cancelar sem penalidade
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Duração da Penalidade
              </label>
              <select
                value={settings.penalty_duration_hours}
                onChange={(e) => setSettings({ ...settings, penalty_duration_hours: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              >
                {penaltyDurationOptions.map(hours => (
                  <option key={hours} value={hours}>
                    {hours < 24 ? `${hours} hora${hours > 1 ? 's' : ''}` : `${hours / 24} dia${hours > 24 ? 's' : ''}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-magic-yellow/60 mt-1">
                Tempo de bloqueio para assinantes que cancelarem fora do prazo
              </p>
            </div>
          </div>
        </div>

        {/* Notificações para Administradores */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h3 className="text-xl font-bold text-magic-gold">Notificações para Administradores</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Canal de Notificação
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, admin_notification_channel: 'sms' })}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    settings.admin_notification_channel === 'sms'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Phone className="w-5 h-5 mx-auto mb-1" />
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, admin_notification_channel: 'whatsapp' })}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    settings.admin_notification_channel === 'whatsapp'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <MessageCircle className="w-5 h-5 mx-auto mb-1" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, admin_notification_channel: 'both' })}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    settings.admin_notification_channel === 'both'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                  Ambos
                </button>
              </div>
              <p className="text-xs text-magic-yellow/60 mt-2">
                Como os administradores receberão notificações de novos agendamentos
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Número WhatsApp para Admins (opcional)
              </label>
              <input
                type="tel"
                value={settings.admin_whatsapp_number}
                onChange={(e) => setSettings({ ...settings, admin_whatsapp_number: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                placeholder="+351 912 345 678"
              />
              <p className="text-xs text-magic-yellow/60 mt-1">
                Número alternativo para WhatsApp. Deixe em branco para usar o número do perfil de cada admin
              </p>
            </div>
          </div>
        </div>

        {/* Configurações Financeiras */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h3 className="text-xl font-bold text-magic-gold">Configurações Financeiras</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-magic-yellow mb-2">
                Comissão de Assinaturas para Barbeiros (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.subscription_commission_percentage}
                onChange={(e) => setSettings({ ...settings, subscription_commission_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
              />
              <p className="text-xs text-magic-yellow/60 mt-1">
                Percentual que o barbeiro recebe sobre os valores das assinaturas
              </p>
            </div>

            <div className="border-t border-gray-700 pt-4 mt-4">
              <h4 className="text-lg font-semibold text-magic-gold mb-3">Descontos de Vales</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-magic-yellow mb-2">
                    Todos os Serviços (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.voucher_discounts.all}
                    onChange={(e) => setSettings({
                      ...settings,
                      voucher_discounts: {
                        ...settings.voucher_discounts,
                        all: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-magic-yellow mb-2">
                    Serviços Avulsos (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.voucher_discounts.individual_services}
                    onChange={(e) => setSettings({
                      ...settings,
                      voucher_discounts: {
                        ...settings.voucher_discounts,
                        individual_services: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-magic-yellow mb-2">
                    Serviços de Assinatura (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.voucher_discounts.subscription_services}
                    onChange={(e) => setSettings({
                      ...settings,
                      voucher_discounts: {
                        ...settings.voucher_discounts,
                        subscription_services: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-magic-yellow mb-2">
                    Produtos (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.voucher_discounts.products}
                    onChange={(e) => setSettings({
                      ...settings,
                      voucher_discounts: {
                        ...settings.voucher_discounts,
                        products: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'A guardar...' : 'Guardar Configurações'}
          </button>
        </div>

        {/* Informação */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-semibold mb-1">Importante:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-200/80">
                <li>Assinantes só podem ter 1 agendamento ativo, mas sem limite de data futura</li>
                <li>Não assinantes podem ter múltiplos agendamentos (ex: pais com filhos), mas com limite de dias</li>
                <li>As penalidades são aplicadas automaticamente quando assinantes cancelam fora do prazo</li>
                <li>Durante a penalidade, o cliente não pode fazer novas marcações</li>
                <li>As comissões são calculadas automaticamente com base nas configurações</li>
                <li>Os descontos de vales são aplicados no momento do pagamento</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
