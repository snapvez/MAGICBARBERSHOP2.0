import { useState, useEffect } from 'react';
import { Header } from './components/Layout/Header';
import { HomePage } from './components/Home/HomePage';
import { BookingCalendar } from './components/Booking/BookingCalendar';
import { SubscriptionPage } from './components/Subscription/SubscriptionPage';
import { LoginForm } from './components/Auth/LoginForm';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminCalendar } from './components/Admin/AdminCalendar';
import { ScheduleManager } from './components/Admin/ScheduleManager';
import { CommissionReport } from './components/Admin/CommissionReport';
import { BarberManager } from './components/Admin/BarberManager';
import { SubscriptionPlansManager } from './components/Admin/SubscriptionPlansManager';
import { ClientsListPage } from './components/Admin/ClientsListPage';
import { TodayAppointmentsPage } from './components/Admin/TodayAppointmentsPage';
import { RevenueDetailsPage } from './components/Admin/RevenueDetailsPage';
import { AllAppointmentsPage } from './components/Admin/AllAppointmentsPage';
import { ActiveSubscriptionsPage } from './components/Admin/ActiveSubscriptionsPage';
import { ActiveServicesPage } from './components/Admin/ActiveServicesPage';
import { ConfigError } from './components/UI/ConfigError';
import { useAuth } from './contexts/AuthContext';
import { Calendar, LayoutDashboard, X } from 'lucide-react';

function App() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return <ConfigError />;
  }

  const { user, isAdmin, isBarber, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);

  useEffect(() => {
    if (user && isAdmin) {
      setCurrentPage('admin');
    } else if (user && isBarber) {
      setCurrentPage('admin-calendar');
    } else if (user) {
      setCurrentPage('booking');
    }
  }, [user, isAdmin, isBarber]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;
    const hasSeenQuickAccess = sessionStorage.getItem('hasSeenQuickAccess');

    if (isStandalone && !hasSeenQuickAccess && isAdmin && !isBarber) {
      setTimeout(() => setShowQuickAccess(true), 500);
    }
  }, [isAdmin, isBarber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-50">
        <div className="text-xl text-gray-600">A carregar...</div>
      </div>
    );
  }

  const renderPage = () => {
    if (!user && currentPage !== 'login' && !isGuestMode) {
      return <LoginForm onGuestMode={() => setIsGuestMode(true)} />;
    }

    if (isBarber && currentPage === 'admin-calendar') {
      return <AdminCalendar onNavigate={setCurrentPage} />;
    }

    if (isBarber && currentPage !== 'admin-calendar') {
      setCurrentPage('admin-calendar');
      return null;
    }

    if (isAdmin && (currentPage === 'admin' || currentPage === 'admin-calendar' || currentPage === 'schedule-manager' || currentPage === 'commissions' || currentPage === 'barbers' || currentPage === 'subscription-plans' || currentPage === 'clients-list' || currentPage === 'today-appointments' || currentPage === 'revenue-details' || currentPage === 'all-appointments' || currentPage === 'active-subscriptions' || currentPage === 'active-services')) {
      if (currentPage === 'admin-calendar') {
        return <AdminCalendar onNavigate={setCurrentPage} />;
      }
      if (currentPage === 'schedule-manager') {
        return <ScheduleManager />;
      }
      if (currentPage === 'commissions') {
        return <CommissionReport />;
      }
      if (currentPage === 'barbers') {
        return <BarberManager />;
      }
      if (currentPage === 'subscription-plans') {
        return <SubscriptionPlansManager />;
      }
      if (currentPage === 'clients-list') {
        return <ClientsListPage onNavigate={setCurrentPage} />;
      }
      if (currentPage === 'today-appointments') {
        return <TodayAppointmentsPage onNavigate={setCurrentPage} />;
      }
      if (currentPage === 'revenue-details') {
        return <RevenueDetailsPage onNavigate={setCurrentPage} />;
      }
      if (currentPage === 'all-appointments') {
        return <AllAppointmentsPage onNavigate={setCurrentPage} />;
      }
      if (currentPage === 'active-subscriptions') {
        return <ActiveSubscriptionsPage onNavigate={setCurrentPage} />;
      }
      if (currentPage === 'active-services') {
        return <ActiveServicesPage onNavigate={setCurrentPage} />;
      }
      return <AdminDashboard onNavigate={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'convidado':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'booking':
        return <BookingCalendar />;
      case 'subscription':
        return <SubscriptionPage />;
      case 'login':
        setIsGuestMode(false);
        return <LoginForm onGuestMode={() => setIsGuestMode(true)} />;
      default:
        return <BookingCalendar />;
    }
  };

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  const handleQuickAccessClick = (page: string) => {
    sessionStorage.setItem('hasSeenQuickAccess', 'true');
    setShowQuickAccess(false);
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-magic-black">
      <Header onNavigate={handleNavigation} currentPage={currentPage} />
      <main className="py-8 sm:py-12">
        {renderPage()}
      </main>
      <footer className="bg-magic-black text-white py-8 mt-20 border-t-2 border-magic-gold/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-magic-yellow">
            &copy; 2025 Magic Barbershop. Sistema inteligente de marcações 24/7.
          </p>
        </div>
      </footer>

      {showQuickAccess && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-magic-black rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-magic-gold/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-magic-gold">Acesso Rápido</h3>
              <button
                onClick={() => {
                  sessionStorage.setItem('hasSeenQuickAccess', 'true');
                  setShowQuickAccess(false);
                }}
                className="text-magic-gold/60 hover:text-magic-gold transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-magic-yellow/80 mb-6 text-sm">
              Escolhe o que pretendes ver:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleQuickAccessClick('admin-calendar')}
                className="w-full p-6 bg-gradient-to-r from-magic-gold/10 to-magic-yellow/10 hover:from-magic-gold/20 hover:to-magic-yellow/20 border-2 border-magic-gold/30 hover:border-magic-gold rounded-xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-magic-gold/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6 text-magic-gold" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-bold text-magic-gold">Agendamentos de Hoje</h4>
                    <p className="text-sm text-magic-yellow/60">Ver calendário e gestão</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAccessClick('admin')}
                className="w-full p-6 bg-gradient-to-r from-magic-gold/10 to-magic-yellow/10 hover:from-magic-gold/20 hover:to-magic-yellow/20 border-2 border-magic-gold/30 hover:border-magic-gold rounded-xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-magic-gold/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-6 h-6 text-magic-gold" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-bold text-magic-gold">Painel Admin</h4>
                    <p className="text-sm text-magic-yellow/60">Dashboard completo</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
