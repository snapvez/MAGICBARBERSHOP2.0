import { useEffect, useState } from 'react';
import { Clock, Calendar, Coffee, Umbrella, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Barber {
  id: string;
  name: string;
}

interface Schedule {
  id?: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface Break {
  id?: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  description: string;
}

interface TimeOff {
  id?: string;
  barber_id: string;
  start_date: string;
  end_date: string;
  type: 'day_off' | 'vacation' | 'block';
  reason: string;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export const BarberScheduleManager = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'breaks' | 'timeoff'>('schedule');

  useEffect(() => {
    loadBarbers();
  }, []);

  useEffect(() => {
    if (selectedBarberId) {
      loadBarberData();
    }
  }, [selectedBarberId]);

  const loadBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBarbers(data || []);
      if (data && data.length > 0) {
        setSelectedBarberId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading barbers:', error);
      showAlert('error', 'Erro ao carregar profissionais');
    } finally {
      setLoading(false);
    }
  };

  const loadBarberData = async () => {
    try {
      const [schedulesRes, breaksRes, timeOffsRes] = await Promise.all([
        supabase.from('barber_schedules').select('*').eq('barber_id', selectedBarberId).order('day_of_week'),
        supabase.from('barber_breaks').select('*').eq('barber_id', selectedBarberId).order('day_of_week'),
        supabase.from('barber_time_off').select('*').eq('barber_id', selectedBarberId).eq('is_active', true).order('start_date', { ascending: false })
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (breaksRes.error) throw breaksRes.error;
      if (timeOffsRes.error) throw timeOffsRes.error;

      setSchedules(schedulesRes.data || []);
      setBreaks(breaksRes.data || []);
      setTimeOffs(timeOffsRes.data || []);
    } catch (error) {
      console.error('Error loading barber data:', error);
      showAlert('error', 'Erro ao carregar dados do profissional');
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const initializeSchedules = () => {
    const newSchedules: Schedule[] = DAYS_OF_WEEK.map(day => ({
      barber_id: selectedBarberId,
      day_of_week: day.value,
      start_time: '09:00',
      end_time: '18:00',
      is_working: day.value >= 1 && day.value <= 6,
    }));
    setSchedules(newSchedules);
  };

  const handleSaveSchedules = async () => {
    try {
      await supabase.from('barber_schedules').delete().eq('barber_id', selectedBarberId);

      const { error } = await supabase
        .from('barber_schedules')
        .insert(schedules.map(s => ({
          barber_id: s.barber_id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_working: s.is_working,
        })));

      if (error) throw error;
      showAlert('success', 'Horários salvos com sucesso!');
      loadBarberData();
    } catch (error: any) {
      console.error('Error saving schedules:', error);
      showAlert('error', error.message || 'Erro ao salvar horários');
    }
  };

  const handleAddBreak = () => {
    setBreaks([...breaks, {
      barber_id: selectedBarberId,
      day_of_week: 1,
      start_time: '12:00',
      end_time: '13:00',
      description: 'Almoço',
    }]);
  };

  const handleRemoveBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const handleSaveBreaks = async () => {
    try {
      await supabase.from('barber_breaks').delete().eq('barber_id', selectedBarberId);

      if (breaks.length > 0) {
        const { error } = await supabase
          .from('barber_breaks')
          .insert(breaks.map(b => ({
            barber_id: b.barber_id,
            day_of_week: b.day_of_week,
            start_time: b.start_time,
            end_time: b.end_time,
            description: b.description,
          })));

        if (error) throw error;
      }

      showAlert('success', 'Intervalos salvos com sucesso!');
      loadBarberData();
    } catch (error: any) {
      console.error('Error saving breaks:', error);
      showAlert('error', error.message || 'Erro ao salvar intervalos');
    }
  };

  const handleAddTimeOff = () => {
    const today = new Date().toISOString().split('T')[0];
    setTimeOffs([...timeOffs, {
      barber_id: selectedBarberId,
      start_date: today,
      end_date: today,
      type: 'day_off',
      reason: '',
      is_active: true,
    }]);
  };

  const handleSaveTimeOff = async (timeOff: TimeOff, index: number) => {
    try {
      if (timeOff.id) {
        const { error } = await supabase
          .from('barber_time_off')
          .update({
            start_date: timeOff.start_date,
            end_date: timeOff.end_date,
            type: timeOff.type,
            reason: timeOff.reason,
            is_active: timeOff.is_active,
          })
          .eq('id', timeOff.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('barber_time_off')
          .insert([{
            barber_id: timeOff.barber_id,
            start_date: timeOff.start_date,
            end_date: timeOff.end_date,
            type: timeOff.type,
            reason: timeOff.reason,
            is_active: true,
          }]);

        if (error) throw error;
      }

      showAlert('success', 'Folga salva com sucesso!');
      loadBarberData();
    } catch (error: any) {
      console.error('Error saving time off:', error);
      showAlert('error', error.message || 'Erro ao salvar folga');
    }
  };

  const handleCancelTimeOff = async (id: string) => {
    try {
      const { error } = await supabase
        .from('barber_time_off')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      showAlert('success', 'Folga cancelada com sucesso!');
      loadBarberData();
    } catch (error: any) {
      showAlert('error', 'Erro ao cancelar folga');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-magic-yellow">A carregar...</div>
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

      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-magic-gold" />
        <h2 className="text-2xl font-bold text-magic-gold">Gestão de Horários e Folgas</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-magic-yellow mb-2">
          Selecionar Profissional
        </label>
        <select
          value={selectedBarberId}
          onChange={(e) => setSelectedBarberId(e.target.value)}
          className="w-full md:w-64 px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-magic-gold"
        >
          {barbers.map(barber => (
            <option key={barber.id} value={barber.id}>{barber.name}</option>
          ))}
        </select>
      </div>

      {selectedBarberId && (
        <>
          <div className="flex gap-2 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'schedule'
                  ? 'text-magic-gold border-b-2 border-magic-gold'
                  : 'text-magic-yellow/50 hover:text-magic-yellow'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Horários
            </button>
            <button
              onClick={() => setActiveTab('breaks')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'breaks'
                  ? 'text-magic-gold border-b-2 border-magic-gold'
                  : 'text-magic-yellow/50 hover:text-magic-yellow'
              }`}
            >
              <Coffee className="w-4 h-4 inline mr-2" />
              Intervalos
            </button>
            <button
              onClick={() => setActiveTab('timeoff')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'timeoff'
                  ? 'text-magic-gold border-b-2 border-magic-gold'
                  : 'text-magic-yellow/50 hover:text-magic-yellow'
              }`}
            >
              <Umbrella className="w-4 h-4 inline mr-2" />
              Folgas & Férias
            </button>
          </div>

          {activeTab === 'schedule' && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              {schedules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-magic-yellow/70 mb-4">Nenhum horário definido</p>
                  <button
                    onClick={initializeSchedules}
                    className="px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold"
                  >
                    Inicializar Horários Padrão
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {DAYS_OF_WEEK.map(day => {
                      const schedule = schedules.find(s => s.day_of_week === day.value);
                      return (
                        <div key={day.value} className="grid grid-cols-4 gap-4 items-center">
                          <label className="flex items-center gap-2 text-magic-yellow">
                            <input
                              type="checkbox"
                              checked={schedule?.is_working || false}
                              onChange={(e) => {
                                setSchedules(schedules.map(s =>
                                  s.day_of_week === day.value
                                    ? { ...s, is_working: e.target.checked }
                                    : s
                                ));
                              }}
                              className="w-4 h-4"
                            />
                            {day.label}
                          </label>
                          <input
                            type="time"
                            value={schedule?.start_time || '09:00'}
                            onChange={(e) => {
                              setSchedules(schedules.map(s =>
                                s.day_of_week === day.value
                                  ? { ...s, start_time: e.target.value }
                                  : s
                              ));
                            }}
                            disabled={!schedule?.is_working}
                            className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50"
                          />
                          <input
                            type="time"
                            value={schedule?.end_time || '18:00'}
                            onChange={(e) => {
                              setSchedules(schedules.map(s =>
                                s.day_of_week === day.value
                                  ? { ...s, end_time: e.target.value }
                                  : s
                              ));
                            }}
                            disabled={!schedule?.is_working}
                            className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleSaveSchedules}
                    className="mt-6 flex items-center gap-2 px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Horários
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'breaks' && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-magic-gold">Intervalos</h3>
                <button
                  onClick={handleAddBreak}
                  className="flex items-center gap-2 px-3 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {breaks.map((brk, index) => (
                  <div key={index} className="grid grid-cols-5 gap-3 items-center">
                    <select
                      value={brk.day_of_week}
                      onChange={(e) => {
                        const newBreaks = [...breaks];
                        newBreaks[index].day_of_week = parseInt(e.target.value);
                        setBreaks(newBreaks);
                      }}
                      className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={brk.start_time}
                      onChange={(e) => {
                        const newBreaks = [...breaks];
                        newBreaks[index].start_time = e.target.value;
                        setBreaks(newBreaks);
                      }}
                      className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                    <input
                      type="time"
                      value={brk.end_time}
                      onChange={(e) => {
                        const newBreaks = [...breaks];
                        newBreaks[index].end_time = e.target.value;
                        setBreaks(newBreaks);
                      }}
                      className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                    <input
                      type="text"
                      value={brk.description}
                      onChange={(e) => {
                        const newBreaks = [...breaks];
                        newBreaks[index].description = e.target.value;
                        setBreaks(newBreaks);
                      }}
                      placeholder="Descrição"
                      className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                    />
                    <button
                      onClick={() => handleRemoveBreak(index)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveBreaks}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors font-semibold"
              >
                <Save className="w-4 h-4" />
                Guardar Intervalos
              </button>
            </div>
          )}

          {activeTab === 'timeoff' && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-magic-gold">Folgas e Férias</h3>
                <button
                  onClick={handleAddTimeOff}
                  className="flex items-center gap-2 px-3 py-2 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-colors text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Folga
                </button>
              </div>

              <div className="space-y-4">
                {timeOffs.map((timeOff, index) => (
                  <div key={timeOff.id || index} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-magic-yellow mb-1">Tipo</label>
                        <select
                          value={timeOff.type}
                          onChange={(e) => {
                            const newTimeOffs = [...timeOffs];
                            newTimeOffs[index].type = e.target.value as TimeOff['type'];
                            setTimeOffs(newTimeOffs);
                          }}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                        >
                          <option value="day_off">Folga</option>
                          <option value="vacation">Férias</option>
                          <option value="block">Bloqueio</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-magic-yellow mb-1">Data Início</label>
                        <input
                          type="date"
                          value={timeOff.start_date}
                          onChange={(e) => {
                            const newTimeOffs = [...timeOffs];
                            newTimeOffs[index].start_date = e.target.value;
                            setTimeOffs(newTimeOffs);
                          }}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-magic-yellow mb-1">Data Fim</label>
                        <input
                          type="date"
                          value={timeOff.end_date}
                          onChange={(e) => {
                            const newTimeOffs = [...timeOffs];
                            newTimeOffs[index].end_date = e.target.value;
                            setTimeOffs(newTimeOffs);
                          }}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-magic-yellow mb-1">Motivo</label>
                      <input
                        type="text"
                        value={timeOff.reason}
                        onChange={(e) => {
                          const newTimeOffs = [...timeOffs];
                          newTimeOffs[index].reason = e.target.value;
                          setTimeOffs(newTimeOffs);
                        }}
                        placeholder="Motivo da folga (opcional)"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveTimeOff(timeOff, index)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                      >
                        Guardar
                      </button>
                      {timeOff.id && (
                        <button
                          onClick={() => handleCancelTimeOff(timeOff.id!)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          Cancelar Folga
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {timeOffs.length === 0 && (
                  <div className="text-center py-8 text-magic-yellow/50">
                    Nenhuma folga cadastrada
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
