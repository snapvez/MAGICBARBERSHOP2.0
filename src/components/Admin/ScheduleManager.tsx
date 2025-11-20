import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Barber {
  id: string;
  name: string;
}

interface AvailabilityBlock {
  id: string;
  barber_id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string;
  created_at: string;
  barber?: { name: string };
}

export const ScheduleManager = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    barber_id: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    reason: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: barbersData } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      const { data: blocksData } = await supabase
        .from('barber_availability_blocks')
        .select(`
          *,
          barbers:barber_id(name)
        `)
        .order('start_datetime', { ascending: false });

      setBarbers(barbersData || []);
      setBlocks(blocksData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showMessage('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.barber_id || !formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time) {
      showMessage('error', 'Preencha todos os campos obrigatórios');
      return;
    }

    const startDatetime = `${formData.start_date}T${formData.start_time}:00`;
    const endDatetime = `${formData.end_date}T${formData.end_time}:00`;

    if (new Date(endDatetime) <= new Date(startDatetime)) {
      showMessage('error', 'A data/hora de fim deve ser posterior à de início');
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', user.user?.id)
        .maybeSingle();

      const { error } = await supabase
        .from('barber_availability_blocks')
        .insert({
          barber_id: formData.barber_id,
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          reason: formData.reason,
          created_by: adminUser?.id,
        });

      if (error) throw error;

      showMessage('success', 'Bloqueio criado com sucesso');
      setShowAddForm(false);
      setFormData({
        barber_id: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        reason: '',
      });
      loadData();
    } catch (error) {
      console.error('Erro ao criar bloqueio:', error);
      showMessage('error', 'Erro ao criar bloqueio');
    }
  };

  const handleDelete = async (blockId: string) => {
    if (!confirm('Tem certeza que deseja remover este bloqueio?')) return;

    try {
      const { error } = await supabase
        .from('barber_availability_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      showMessage('success', 'Bloqueio removido com sucesso');
      loadData();
    } catch (error) {
      console.error('Erro ao remover bloqueio:', error);
      showMessage('error', 'Erro ao remover bloqueio');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-magic-black">
        <div className="text-xl text-magic-gold">A carregar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-magic-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-magic-gold mb-2">Gestão de Horários</h1>
          <p className="text-magic-yellow">Bloqueie dias e horários para folgas ou eventos especiais</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-900/20 border-green-500/50 text-green-400'
                : 'bg-red-900/20 border-red-500/50 text-red-400'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <span>{message.text}</span>
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-magic-gold">Bloqueios Agendados</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black rounded-xl font-semibold transition-all"
            >
              <Plus className="w-5 h-5" />
              Novo Bloqueio
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-6 bg-magic-black rounded-xl border border-magic-gold/30">
              <h3 className="text-lg font-semibold text-magic-gold mb-4">Criar Novo Bloqueio</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-magic-yellow text-sm font-medium mb-2">
                    Barbeiro *
                  </label>
                  <select
                    value={formData.barber_id}
                    onChange={(e) => setFormData({ ...formData, barber_id: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                    required
                  >
                    <option value="">Selecione um barbeiro</option>
                    {barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-magic-yellow text-sm font-medium mb-2">
                    Motivo
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Ex: Férias, Folga, Evento"
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-magic-yellow text-sm font-medium mb-2">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-magic-yellow text-sm font-medium mb-2">
                    Hora de Início *
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-magic-yellow text-sm font-medium mb-2">
                    Data de Fim *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-magic-yellow text-sm font-medium mb-2">
                    Hora de Fim *
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-magic-gold/30 rounded-xl text-white focus:border-magic-gold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black rounded-xl font-semibold transition-all"
                >
                  <Save className="w-5 h-5" />
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-semibold hover:bg-gray-700 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-magic-gold/30">
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Barbeiro</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Início</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Fim</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Motivo</th>
                  <th className="text-left py-3 px-4 font-semibold text-magic-gold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {blocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-magic-yellow">
                      Nenhum bloqueio agendado
                    </td>
                  </tr>
                ) : (
                  blocks.map((block) => (
                    <tr key={block.id} className="border-b border-magic-gold/10 hover:bg-magic-gold/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{block.barber?.name || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-magic-yellow">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(block.start_datetime).toLocaleDateString('pt-PT')}</span>
                          <Clock className="w-4 h-4 ml-2" />
                          <span>{new Date(block.start_datetime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-magic-yellow">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(block.end_datetime).toLocaleDateString('pt-PT')}</span>
                          <Clock className="w-4 h-4 ml-2" />
                          <span>{new Date(block.end_datetime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300">{block.reason || 'Sem motivo especificado'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleDelete(block.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-900/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-900/40 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
