import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Orders } from './components/Orders';
import { Reports } from './components/Reports';
import { Products } from './components/Products';
import Settings from './components/Settings';
import { api, SESSION_STORAGE_KEY } from './lib/api';
import type { AuthSession, AuthUser, Page, RestaurantItem } from './types';

export default function App() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'guest'>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app-dark-mode') === '1');
  const [currentRestaurant, setCurrentRestaurant] = useState<RestaurantItem | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    localStorage.setItem('app-dark-mode', isDarkMode ? '1' : '0');
  }, [isDarkMode]);

  const syncCurrentRestaurant = async () => {
    try {
      const restaurants = await api.getRestaurants();
      const firstRestaurant = restaurants[0];

      if (!firstRestaurant) {
        setCurrentRestaurant(null);
        return;
      }

      setCurrentRestaurant(firstRestaurant);
    } catch {
      setCurrentRestaurant(null);
      return;
    }
  };

  const persistSessionUser = (nextUser: AuthUser) => {
    setUser(nextUser);

    const session = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!session) {
      return;
    }

    try {
      const parsedSession = JSON.parse(session) as AuthSession;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        ...parsedSession,
        user: nextUser,
      }));
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  useEffect(() => {
    const session = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!session) {
      setAuthState('guest');
      return;
    }

    try {
      const parsedSession = JSON.parse(session) as AuthSession;

      if (!parsedSession.token || !parsedSession.user) {
        throw new Error('Invalid session');
      }

      setUser(parsedSession.user);
      setAuthState('authenticated');
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setAuthState('guest');
    }
  }, []);

  useEffect(() => {
    if (authState !== 'authenticated') {
      return;
    }

    void syncCurrentRestaurant();
  }, [authState]);

  const handleLogin = async (phone: string, password: string): Promise<string | null> => {
    try {
      const response = await api.login(phone, password);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(response));
      persistSessionUser(response.user);
      setAuthState('authenticated');
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'تعذر تسجيل الدخول';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
    setCurrentRestaurant(null);
    setAuthState('guest');
    setCurrentPage('dashboard');
    setSidebarOpen(false);
  };

  const handleRestaurantUpdate = (restaurant: RestaurantItem) => {
    setCurrentRestaurant(restaurant);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} restaurantName={currentRestaurant?.name || 'المطعم'} />;
      case 'orders':
        return <Orders restaurantId={currentRestaurant?.id} />;
      case 'reports':
        return <Reports restaurant={currentRestaurant} user={user} />;
      case 'products':
        return <Products restaurantId={currentRestaurant?.id || null} />;
      case 'settings':
        return (
          <Settings
            onBack={() => setCurrentPage('dashboard')}
            onLogout={handleLogout}
            restaurantId={currentRestaurant?.id || null}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode((currentValue) => !currentValue)}
          />
        );
      default:
        return <Dashboard onNavigate={setCurrentPage} restaurantName={currentRestaurant?.name || 'المطعم'} />;
    }
  };

  if (authState === 'loading') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'dark-theme bg-gray-900' : 'bg-gray-50'}`} dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تهيئة التطبيق...</p>
        </div>
      </div>
    );
  }

  if (authState !== 'authenticated') {
    return (
      <div className={isDarkMode ? 'dark-theme min-h-screen bg-gray-900' : ''} dir="rtl">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'dark-theme bg-gray-900' : 'bg-gray-50'}`} dir="rtl">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((currentValue) => !currentValue)}
        restaurantName={currentRestaurant?.name || 'المطعم'}
        restaurantImageUrl={currentRestaurant?.image_url || null}
      />
      <div className="flex-1 flex flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          user={user}
          restaurant={currentRestaurant}
          onRestaurantUpdate={handleRestaurantUpdate}
        />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
}