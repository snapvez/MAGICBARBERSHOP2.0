import { useEffect, useState } from 'react';
import { Calendar, Users, TrendingUp, Award, CalendarDays, Phone, Mail, Crown, Ban, CheckCircle, DollarSign, Clock, CalendarClock, FileDown, Trophy, FolderOpen, Settings, UserCog, Scissors, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RevenueTracker } from './RevenueTracker';
import { BarberPointsReport } from './BarberPointsReport';
import { QRCodeGenerator } from './QRCodeGenerator';
import { AnalyticsMetrics } from './AnalyticsMetrics';
import { ServiceCategoriesManager } from './ServiceCategoriesManager';
import { SystemSettings } from './SystemSettings';
import { ProfessionalsManager } from './ProfessionalsManager';
import { ServicesManager } from './ServicesManager';
import { BarberScheduleManager } from './BarberScheduleManager';
import BrandingManager from './BrandingManager';
import { AdminUsersManager } from './AdminUsersManager';
import { AdminPermissionsManager } from './AdminPermissionsManager';
import { generateAdminPDF } from '../../utils/pdfExport';

interface Stats {
  totalClients: number;
  totalAppointments: number;
  todayAppointments: number;
  monthlyRevenue: number;
  activeServices: number;
  activeSubscriptions: number;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  total_appointments: number;
  last_appointment: string | null;
  subscription_status: 'active' | 'inactive';
  subscription_plan: string | null;
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  client_name_at_booking?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone: string;
  };
  guests?: {
    full_name: string;
    email: string;
    phone: string;
  };
  services?: {
    name: string;
    price: number;
  };
}

interface AdminDashboardProps {
  onNavigate?: (page: string) => void;
}

export const AdminDashboard = ({ onNavigate }: AdminDashboardProps) => {
  const { isSuperAdmin, adminBarberId } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    activeServices: 0,
    activeSubscriptions: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'appointments' | 'clients' | 'revenue' | 'points' | 'qrcode' | 'analytics' | 'categories' | 'settings' | 'professionals' | 'services' | 'schedules' | 'branding' | 'admins' | 'permissions'>('appointments');
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { count: clientCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today);

      const { count: serviceCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: activeSubsCount } = await supabase
        .from('client_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString());

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: monthlyAppointments } = await supabase
        .from('appointments')
        .select('services:service_id(price)')
        .gte('appointment_date', startOfMonth.split('T')[0])
        .eq('status', 'completed');

      const monthlyRevenue = monthlyAppointments?.reduce((sum, app) => {
        return sum + (app.services?.price || 0);
      }, 0) || 0;

      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:client_id(full_name, email, phone),
          guests:guest_id(full_name, email, phone),
          services:service_id(name, price)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: clientsData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const enrichedClients = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { count: appointmentCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          const { data: lastAppointment } = await supabase
            .from('appointments')
            .select('appointment_date')
            .eq('client_id', client.id)
            .order('appointment_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: subscription } = await supabase
            .from('client_subscriptions')
            .select('status, subscription_plans(name)')
            .eq('client_id', client.id)
            .eq('status', 'active')
            .gt('current_period_end', new Date().toISOString())
            .maybeSingle();

          return {
            id: client.id,
            full_name: client.full_name || 'Sem nome',
            email: client.email,
            phone: client.phone,
            created_at: client.created_at,
            total_appointments: appointmentCount || 0,
            last_appointment: lastAppointment?.appointment_date || null,
            subscription_status: subscription ? 'active' : 'inactive',
            subscription_plan: subscription?.subscription_plans?.name || null,
          } as Client;
        })
      );

      setStats({
        totalClients: clientCount || 0,
        totalAppointments: appointmentCount || 0,
        todayAppointments: todayCount || 0,
        monthlyRevenue,
        activeServices: serviceCount || 0,
        activeSubscriptions: activeSubsCount || 0,
      });

      setRecentAppointments(appointments || []);
      setClients(enrichedClients);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-900/20 text-amber-400 border-amber-500/50',
      confirmed: 'bg-blue-900/20 text-blue-400 border-blue-500/50',
      completed: 'bg-green-900/20 text-green-400 border-green-500/50',
      cancelled: 'bg-red-900/20 text-red-400 border-red-500/50',
    };
    return colors[status] || 'bg-gray-900/20 text-gray-400 border-gray-500/50';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          status,
          payment_status,
          client_name_at_booking,
          profiles:client_id (full_name, email, phone),
          guests:guest_id (full_name, email, phone),
          services:service_id (name, price),
          barbers:barber_id (name)
        `)
        .order('appointment_date', { ascending: false })
        .limit(100);

      const { data: allClients } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .order('created_at', { ascending: false });

      const { data: clientAppointmentCounts } = await supabase
        .from('appointments')
        .select('client_id')
        .not('client_id', 'is', null);

      const appointmentCountMap = (clientAppointmentCounts || []).reduce((acc, apt) => {
        acc[apt.client_id] = (acc[apt.client_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const { data: activeSubscriptions } = await supabase
        .from('client_subscriptions')
        .select(`
          id,
          status,
          cuts_used_this_month,
          current_period_start,
          current_period_end,
          profiles:client_id (full_name),
          subscription_plans:plan_id (name, cuts_per_month),
          barbers:barber_id (name)
        `)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString());

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: monthlyAppointments } = await supabase
        .from('appointments')
        .select('appointment_date, services:service_id (price)')
        .gte('appointment_date', startOfMonth)
        .eq('payment_status', 'paid');

      const revenueByDate = (monthlyAppointments || []).reduce((acc, apt) => {
        const date = apt.appointment_date;
        if (!acc[date]) {
          acc[date] = { total: 0, appointments_count: 0, subscriptions_count: 0 };
        }
        acc[date].total += apt.services?.price || 0;
        acc[date].appointments_count += 1;
        return acc;
      }, {} as Record<string, { total: number; appointments_count: number; subscriptions_count: number }>);

      const pdfData = {
        appointments: (allAppointments || []).map(apt => ({
          id: apt.id,
          appointment_date: apt.appointment_date,
          start_time: apt.start_time,
          status: apt.status,
          client_name: apt.client_name_at_booking || apt.profiles?.full_name || apt.guests?.full_name || 'N/A',
          client_phone: apt.profiles?.phone || apt.guests?.phone || 'N/A',
          service_name: apt.services?.name || 'N/A',
          service_price: apt.services?.price || 0,
          barber_name: apt.barbers?.name,
          payment_status: apt.payment_status || 'pending',
        })),
        clients: (allClients || []).map(client => ({
          id: client.id,
          full_name: client.full_name,
          email: client.email,
          phone: client.phone || '',
          total_appointments: appointmentCountMap[client.id] || 0,
          subscription_status: 'inactive',
          created_at: client.created_at,
        })),
        subscriptions: (activeSubscriptions || []).map(sub => ({
          id: sub.id,
          client_name: sub.profiles?.full_name || 'N/A',
          plan_name: sub.subscription_plans?.name || 'N/A',
          status: sub.status,
          cuts_used: sub.cuts_used_this_month || 0,
          cuts_allowed: sub.subscription_plans?.cuts_per_month || 0,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          barber_name: sub.barbers?.name,
        })),
        revenue: Object.entries(revenueByDate).map(([date, data]) => ({
          date,
          total: data.total,
          appointments_count: data.appointments_count,
          subscriptions_count: data.subscriptions_count,
        })),
        stats: {
          totalClients: stats.totalClients,
          totalAppointments: stats.totalAppointments,
          monthlyRevenue: stats.monthlyRevenue,
          activeSubscriptions: stats.activeSubscriptions,
        },
      };

      generateAdminPDF(pdfData);
      alert('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setExportingPDF(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col items-start gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-magic-gold mb-2">Dashboard Admin</h1>
            <p className="text-magic-yellow">Visão geral completa do negócio</p>
          </div>
          {onNavigate && (
            <div className="flex flex-wrap gap-3 w-full">
              <button
                onClick={() => onNavigate('schedule-manager')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all shadow-lg text-sm"
              >
                <CalendarClock className="w-4 h-4" />
                Horários
              </button>
              <button
                onClick={() => onNavigate('admin-calendar')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-magic-gold to-magic-yellow hover:from-magic-yellow hover:to-magic-gold text-magic-black rounded-xl font-semibold transition-all shadow-lg text-sm"
              >
                <CalendarDays className="w-4 h-4" />
                Calendário
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-600 text-white rounded-xl font-semibold transition-all shadow-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4" />
                {exportingPDF ? 'A gerar...' : 'Exportar PDF'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <button
            onClick={() => onNavigate?.('clients-list')}
            className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30 hover:border-magic-gold/50 transition-all cursor-pointer text-left hover:scale-105 transform"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-magic-gold/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-magic-gold" />
              </div>
              <span className="text-3xl font-bold text-magic-gold">{stats.totalClients}</span>
            </div>
            <h3 className="text-sm font-medium text-magic-yellow">Total de Clientes</h3>
          </button>

          <button
            onClick={() => onNavigate?.('today-appointments')}
            className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-all cursor-pointer text-left hover:scale-105 transform"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-3xl font-bold text-cyan-400">{stats.todayAppointments}</span>
            </div>
            <h3 className="text-sm font-medium text-cyan-300">Marcações Hoje</h3>
          </button>

          <button
            onClick={() => onNavigate?.('revenue-details')}
            className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-green-500/30 hover:border-green-500/50 transition-all cursor-pointer text-left hover:scale-105 transform"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-3xl font-bold text-green-400">{stats.monthlyRevenue}€</span>
            </div>
            <h3 className="text-sm font-medium text-green-300">Receita Mensal</h3>
          </button>

          <button
            onClick={() => onNavigate?.('active-subscriptions')}
            className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer text-left hover:scale-105 transform"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-3xl font-bold text-purple-400">{stats.activeSubscriptions}</span>
            </div>
            <h3 className="text-sm font-medium text-purple-300">Assinaturas Ativas</h3>
          </button>

          <button
            onClick={() => onNavigate?.('all-appointments')}
            className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all cursor-pointer text-left hover:scale-105 transform"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-3xl font-bold text-orange-400">{stats.totalAppointments}</span>
            </div>
            <h3 className="text-sm font-medium text-orange-300">Total Marcações</h3>
          </button>

          <button
            onClick={() => onNavigate?.('active-services')}
            className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-pink-500/30 hover:border-pink-500/50 transition-all cursor-pointer text-left hover:scale-105 transform"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-pink-400" />
              </div>
              <span className="text-3xl font-bold text-pink-400">{stats.activeServices}</span>
            </div>
            <h3 className="text-sm font-medium text-pink-300">Serviços Ativos</h3>
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 border-2 border-magic-gold/30 mb-8">
          <div className="flex flex-col items-start mb-6 gap-4">
            <h2 className="text-2xl font-bold text-magic-gold">Dados Detalhados</h2>
            <div className="flex flex-wrap gap-2 w-full">
              <button
                onClick={() => setViewMode('appointments')}
                className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                  viewMode === 'appointments'
                    ? 'bg-magic-gold text-magic-black'
                    : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                }`}
              >
                Marcações
              </button>
              <button
                onClick={() => setViewMode('clients')}
                className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                  viewMode === 'clients'
                    ? 'bg-magic-gold text-magic-black'
                    : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                }`}
              >
                Clientes
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                  viewMode === 'analytics'
                    ? 'bg-magic-gold text-magic-black'
                    : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                }`}
              >
                Métricas Avançadas
              </button>
              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => setViewMode('revenue')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                      viewMode === 'revenue'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    Faturamento
                  </button>
                  <button
                    onClick={() => setViewMode('points')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                      viewMode === 'points'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    Pontos & Comissões
                  </button>
                  <button
                    onClick={() => setViewMode('qrcode')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                      viewMode === 'qrcode'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    QR Code
                  </button>
                  <button
                    onClick={() => setViewMode('categories')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                      viewMode === 'categories'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Categorias
                  </button>
                  <button
                    onClick={() => setViewMode('professionals')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                      viewMode === 'professionals'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    <UserCog className="w-4 h-4" />
                    Profissionais
                  </button>
                  <button
                    onClick={() => setViewMode('services')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                      viewMode === 'services'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    <Scissors className="w-4 h-4" />
                    Serviços
                  </button>
                  <button
                    onClick={() => setViewMode('schedules')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                      viewMode === 'schedules'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Horários
                  </button>
                  <button
                    onClick={() => setViewMode('settings')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                      viewMode === 'settings'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Configurações
                  </button>
                  <button
                    onClick={() => setViewMode('branding')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                      viewMode === 'branding'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    Logo e Marca
                  </button>
                  <button
                    onClick={() => setViewMode('admins')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                      viewMode === 'admins'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Utilizadores Admin
                  </button>
                  <button
                    onClick={() => setViewMode('permissions')}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                      viewMode === 'permissions'
                        ? 'bg-magic-gold text-magic-black'
                        : 'bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Permissões
                  </button>
                </>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => onNavigate?.('barbers')}
                  className="px-3 py-2 rounded-lg font-semibold text-xs bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50 transition-all"
                >
                  Barbeiros
                </button>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => onNavigate?.('subscription-plans')}
                  className="px-3 py-2 rounded-lg font-semibold text-xs bg-magic-black text-magic-gold border border-magic-gold/30 hover:border-magic-gold/50 transition-all"
                >
                  Planos
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {viewMode === 'appointments' ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-magic-gold/30">
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Contacto</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Serviço</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Hora</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Preço</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-magic-yellow">
                        Nenhuma marcação registada
                      </td>
                    </tr>
                  ) : (
                    recentAppointments.map((appointment) => {
                      const clientName = appointment.client_name_at_booking ||
                                        appointment.profiles?.full_name ||
                                        appointment.guests?.full_name ||
                                        'N/A';
                      const clientPhone = appointment.profiles?.phone ||
                                         appointment.guests?.phone ||
                                         'N/A';
                      const clientEmail = appointment.profiles?.email ||
                                         appointment.guests?.email ||
                                         'N/A';

                      return (
                      <tr key={appointment.id} className="border-b border-magic-gold/10 hover:bg-magic-gold/5 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{clientName}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-cyan-400">
                              <Phone className="w-3 h-3" />
                              <span className="break-all">{clientPhone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-cyan-400">
                              <Mail className="w-3 h-3" />
                              <span className="break-all">{clientEmail}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{appointment.services?.name || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-4 text-magic-yellow">
                          {new Date(appointment.appointment_date).toLocaleDateString('pt-PT')}
                        </td>
                        <td className="py-4 px-4 text-magic-yellow">{appointment.start_time}</td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-green-400">{appointment.services?.price}€</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(appointment.status)}`}>
                            {getStatusLabel(appointment.status)}
                          </span>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : viewMode === 'clients' ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-magic-gold/30">
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Telemóvel</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Assinatura</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Total Marcações</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Última Visita</th>
                    <th className="text-left py-3 px-4 font-semibold text-magic-gold">Cliente Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-magic-yellow">
                        Nenhum cliente registado
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr key={client.id} className="border-b border-magic-gold/10 hover:bg-magic-gold/5 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{client.full_name}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-cyan-400">
                            <Phone className="w-4 h-4" />
                            <span className="break-all">{client.phone || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-cyan-400 text-sm">
                            <Mail className="w-4 h-4" />
                            <span className="break-all">{client.email}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {client.subscription_status === 'active' ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-900/20 text-green-400 border border-green-500/50 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Ativa
                              </span>
                              {client.subscription_plan && (
                                <span className="text-xs text-gray-400">({client.subscription_plan})</span>
                              )}
                            </div>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-900/20 text-red-400 border border-red-500/50 flex items-center gap-1 w-fit">
                              <Ban className="w-3 h-3" />
                              Inativa
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-magic-gold">{client.total_appointments}</span>
                        </td>
                        <td className="py-4 px-4 text-magic-yellow text-sm">
                          {client.last_appointment
                            ? new Date(client.last_appointment).toLocaleDateString('pt-PT')
                            : 'Nunca'}
                        </td>
                        <td className="py-4 px-4 text-gray-400 text-sm">
                          {new Date(client.created_at).toLocaleDateString('pt-PT')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : viewMode === 'analytics' ? (
              <AnalyticsMetrics />
            ) : viewMode === 'revenue' ? (
              <RevenueTracker />
            ) : viewMode === 'points' ? (
              <BarberPointsReport />
            ) : viewMode === 'categories' ? (
              <ServiceCategoriesManager />
            ) : viewMode === 'services' ? (
              <ServicesManager />
            ) : viewMode === 'professionals' ? (
              <ProfessionalsManager />
            ) : viewMode === 'schedules' ? (
              <BarberScheduleManager />
            ) : viewMode === 'settings' ? (
              <SystemSettings />
            ) : viewMode === 'branding' ? (
              <BrandingManager />
            ) : viewMode === 'admins' ? (
              <AdminUsersManager />
            ) : viewMode === 'permissions' ? (
              <AdminPermissionsManager />
            ) : (
              <QRCodeGenerator />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
