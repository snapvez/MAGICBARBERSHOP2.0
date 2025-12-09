import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Service {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

interface AppointmentService {
  id: string;
  service_id: string;
  price_at_time: number;
  is_original: boolean;
  services?: {
    name: string;
  };
}

interface EditAppointmentModalProps {
  appointmentId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export const EditAppointmentModal = ({
  appointmentId,
  onClose,
  onUpdate,
}: EditAppointmentModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [appointmentServices, setAppointmentServices] = useState<AppointmentService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [appointmentId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [servicesResult, appointmentServicesResult] = await Promise.all([
        supabase
          .from('services')
          .select('id, name, price, category_id')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('appointment_services')
          .select('id, service_id, price_at_time, is_original, services(name)')
          .eq('appointment_id', appointmentId),
      ]);

      if (servicesResult.data) {
        setAvailableServices(servicesResult.data);
      }

      if (appointmentServicesResult.data) {
        setAppointmentServices(appointmentServicesResult.data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const addService = async () => {
    if (!selectedServiceId) {
      setError('Selecione um serviço');
      return;
    }

    const existingService = appointmentServices.find(
      (as) => as.service_id === selectedServiceId
    );
    if (existingService) {
      setError('Este serviço já está adicionado');
      return;
    }

    const service = availableServices.find((s) => s.id === selectedServiceId);
    if (!service) return;

    try {
      setSaving(true);
      setError('');

      const { data: user } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from('appointment_services').insert({
        appointment_id: appointmentId,
        service_id: selectedServiceId,
        price_at_time: service.price,
        added_by: user.user?.id,
        is_original: false,
      });

      if (insertError) throw insertError;

      await loadData();
      setSelectedServiceId('');
    } catch (err) {
      console.error('Erro ao adicionar serviço:', err);
      setError('Erro ao adicionar serviço');
    } finally {
      setSaving(false);
    }
  };

  const removeService = async (serviceRecordId: string) => {
    if (!confirm('Tem certeza que deseja remover este serviço?')) return;

    try {
      setSaving(true);
      setError('');

      const { error: deleteError } = await supabase
        .from('appointment_services')
        .delete()
        .eq('id', serviceRecordId);

      if (deleteError) throw deleteError;

      await loadData();
    } catch (err) {
      console.error('Erro ao remover serviço:', err);
      setError('Erro ao remover serviço');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    onUpdate();
    onClose();
  };

  const totalPrice = appointmentServices.reduce(
    (sum, service) => sum + Number(service.price_at_time),
    0
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full border-2 border-magic-gold/30">
          <div className="text-center text-magic-gold">A carregar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full border-2 border-magic-gold/30 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-magic-gold">Editar Agendamento</h2>
          <button
            onClick={onClose}
            className="text-magic-gold hover:text-magic-yellow transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-xl text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-magic-gold mb-4">Serviços Atuais</h3>
          <div className="space-y-2">
            {appointmentServices.length === 0 ? (
              <div className="text-center py-8 text-magic-yellow">
                Nenhum serviço adicionado
              </div>
            ) : (
              appointmentServices.map((as) => (
                <div
                  key={as.id}
                  className="flex items-center justify-between p-4 bg-magic-black rounded-xl border border-magic-gold/30"
                >
                  <div className="flex-1">
                    <div className="font-medium text-white">
                      {as.services?.name || 'Serviço Desconhecido'}
                    </div>
                    <div className="text-sm text-magic-yellow">
                      {as.is_original ? 'Serviço Original' : 'Serviço Extra'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-green-400">{as.price_at_time}€</span>
                    {!as.is_original && (
                      <button
                        onClick={() => removeService(as.id)}
                        disabled={saving}
                        className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-magic-gold mb-4">
            Adicionar Serviço Extra
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-magic-black border-2 border-magic-gold/30 rounded-xl text-white focus:outline-none focus:border-magic-gold transition-colors disabled:opacity-50"
            >
              <option value="">Selecione um serviço</option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.price}€
                </option>
              ))}
            </select>
            <button
              onClick={addService}
              disabled={!selectedServiceId || saving}
              className="px-6 py-3 bg-magic-gold text-magic-black rounded-xl font-semibold hover:bg-magic-yellow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Adicionar
            </button>
          </div>
        </div>

        <div className="border-t border-magic-gold/30 pt-6 mb-6">
          <div className="flex items-center justify-between text-xl font-bold">
            <span className="text-magic-gold flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Total:
            </span>
            <span className="text-green-400">{totalPrice.toFixed(2)}€</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-magic-black border-2 border-magic-gold/30 text-magic-gold rounded-xl font-semibold hover:border-magic-gold/50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-magic-gold text-magic-black rounded-xl font-semibold hover:bg-magic-yellow transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Guardar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
