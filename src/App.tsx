import { useEffect, useMemo, useRef, useState } from 'react';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Orders } from './components/Orders';
import { Reports } from './components/Reports';
import { Products } from './components/Products';
import { Users } from './components/Users';
import Settings from './components/Settings';
import { api, SESSION_STORAGE_KEY } from './lib/api';
import { attachAgentLinkToUser, filterRestaurantsByAgent } from './lib/agentUserLinks';
import {
  getSavedOrderAlertEnabled,
  getSavedOrderAlertTone,
  playOrderAlertTone,
  setSavedOrderAlertEnabled,
  setSavedOrderAlertTone,
  type OrderAlertTone,
} from './lib/orderAlert';
import type { AppOrderNotification, AuthSession, AuthUser, Order, Page, RestaurantItem } from './types';

const ORDER_NOTIFICATIONS_LIMIT = 120;
const DELAY_THRESHOLD_MINUTES = 10;
const NEW_PENDING_STATUSES = new Set(['confirmed', 'processing', 'preparing']);
const DELAY_WATCH_STATUSES = new Set(['pending', 'scheduled', 'confirmed', 'processing', 'preparing', 'ready']);

const PAGE_PERMISSION_ALIASES: Record<Page, string[]> = {
  dashboard: ['dashboard'],
  orders: ['orders', 'manual_orders', 'wassel_orders'],
  products: ['products', 'restaurants'],
  reports: ['reports', 'commission_reports'],
  users: ['users'],
  settings: ['settings'],
};

function canViewPage(user: AuthUser | null, page: Page): boolean {
  if (!user) {
    return false;
  }

  if (user.role === 'agent' || user.is_admin_branch) {
    return true;
  }

  const permissions = user.permissions;
  if (!permissions) {
    return page === 'settings';
  }

  if (page === 'settings') {
    return true;
  }

  return PAGE_PERMISSION_ALIASES[page].some((key) => {
    const section = permissions[key];
    if (!section) {
      return false;
    }

    return Boolean(section.view || section.create || section.edit || section.delete || section.print);
  });
}

function getNotificationStorageKey(userId: string) {
  return `order-notifications-${userId}`;
}

function readStoredNotifications(userId: string): AppOrderNotification[] {
  const raw = localStorage.getItem(getNotificationStorageKey(userId));

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AppOrderNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildOrderRestaurantId(order: Order): string | null {
  const firstRestaurant = order.restaurants?.[0];
  return firstRestaurant?.id ? String(firstRestaurant.id) : null;
}

function createNotificationId(kind: 'new' | 'delay', source: 'normal' | 'manual', orderId: string) {
  return `${kind}:${source}:${orderId}`;
}

export default function App() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'guest'>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app-dark-mode') === '1');
  const [orderAlertTone, setOrderAlertTone] = useState<OrderAlertTone>(() => getSavedOrderAlertTone());
  const [orderAlertEnabled, setOrderAlertEnabled] = useState(() => getSavedOrderAlertEnabled());
  const [notifications, setNotifications] = useState<AppOrderNotification[]>([]);
  const [toastNotifications, setToastNotifications] = useState<AppOrderNotification[]>([]);
  const [currentRestaurant, setCurrentRestaurant] = useState<RestaurantItem | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const knownPendingOrderIds = useRef<Set<string> | null>(null);
  const delayedNotifiedOrderIds = useRef<Set<string>>(new Set());
  const newOrderNotifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('app-dark-mode', isDarkMode ? '1' : '0');
  }, [isDarkMode]);

  useEffect(() => {
    setSavedOrderAlertTone(orderAlertTone);
  }, [orderAlertTone]);

  useEffect(() => {
    setSavedOrderAlertEnabled(orderAlertEnabled);
  }, [orderAlertEnabled]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      delayedNotifiedOrderIds.current = new Set();
      return;
    }

    const stored = readStoredNotifications(user.id);
    setNotifications(stored);
    delayedNotifiedOrderIds.current = new Set(
      stored
        .filter((item) => item.type === 'delay_warning')
        .map((item) => createNotificationId('delay', item.orderSource, item.orderId)),
    );
    newOrderNotifiedIds.current = new Set(
      stored
        .filter((item) => item.type === 'new_pending')
        .map((item) => createNotificationId('new', item.orderSource, item.orderId)),
    );
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    localStorage.setItem(getNotificationStorageKey(user.id), JSON.stringify(notifications));
  }, [notifications, user?.id]);

  useEffect(() => {
    if (!toastNotifications.length) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastNotifications((current) => current.slice(1));
    }, 7000);

    return () => window.clearTimeout(timeoutId);
  }, [toastNotifications]);

  const syncCurrentRestaurant = async () => {
    try {
      const restaurants = filterRestaurantsByAgent(await api.getRestaurants(), user);
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

      setUser(attachAgentLinkToUser(parsedSession.user));
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
  }, [authState, user]);

  useEffect(() => {
    if (authState !== 'authenticated' || !user || user.role === 'agent') {
      return;
    }

    let mounted = true;

    const hydrateSubUserPermissions = async () => {
      try {
        const permissionPayload = await api.getUserPermissions(user.id);

        if (!mounted) {
          return;
        }

        persistSessionUser({
          ...user,
          role: permissionPayload.role || user.role,
          permissions: permissionPayload.permissions,
        });
      } catch {
        // Keep existing session payload if permissions endpoint fails.
      }
    };

    void hydrateSubUserPermissions();

    return () => {
      mounted = false;
    };
  }, [authState, user?.id]);

  const allowedPages = useMemo(
    () => (['dashboard', 'orders', 'products', 'reports', 'users', 'settings'] as Page[])
      .filter((page) => canViewPage(user, page)),
    [user],
  );

  useEffect(() => {
    if (authState !== 'authenticated') {
      return;
    }

    if (allowedPages.includes(currentPage)) {
      return;
    }

    setCurrentPage(allowedPages[0] || 'settings');
  }, [authState, currentPage, allowedPages]);

  useEffect(() => {
    if (authState !== 'authenticated') {
      knownPendingOrderIds.current = null;
      delayedNotifiedOrderIds.current = new Set();
      newOrderNotifiedIds.current = new Set();
      return;
    }

    let mounted = true;
    let isFetching = false;

    const getTrackedOrders = async () => {
      const [orders, manualOrders] = await Promise.all([
        api.getAgentOrders(currentRestaurant?.id),
        api.getManualOrders(currentRestaurant?.id).catch(() => []),
      ]);

      const normal = orders.map((order) => ({ source: 'normal' as const, order }));
      const manual = manualOrders.map((order) => ({ source: 'manual' as const, order }));

      return [...normal, ...manual];
    };

    const checkForNewPendingOrders = async () => {
      if (isFetching) {
        return;
      }

      isFetching = true;

      try {
        const trackedOrders = await getTrackedOrders();
        const currentPendingIds = new Set(
          trackedOrders
            .filter((item) => NEW_PENDING_STATUSES.has(item.order.status))
            .map((item) => createNotificationId('new', item.source, item.order.id)),
        );

        if (!mounted) {
          return;
        }

        const previousPendingIds = knownPendingOrderIds.current;
        const newNotifications: AppOrderNotification[] = [];

        trackedOrders.forEach(({ source, order }) => {
          if (!DELAY_WATCH_STATUSES.has(order.status)) {
            return;
          }

          const createdAt = new Date(order.createdAt).getTime();
          if (Number.isNaN(createdAt)) {
            return;
          }

          const minutesSinceCreation = (Date.now() - createdAt) / (1000 * 60);
          if (minutesSinceCreation < DELAY_THRESHOLD_MINUTES) {
            return;
          }

          const delayKey = createNotificationId('delay', source, order.id);
          if (delayedNotifiedOrderIds.current.has(delayKey)) {
            return;
          }

          delayedNotifiedOrderIds.current.add(delayKey);
          newNotifications.push({
            id: `${delayKey}:${Date.now()}`,
            type: 'delay_warning',
            orderId: order.id,
            orderSource: source,
            restaurantId: buildOrderRestaurantId(order),
            title: 'تنبيه تأخير الطلب',
            message: `الطلب #${order.id} ما يزال في حالة ${order.status === 'ready' ? 'جاهز' : 'معلق'} لأكثر من 10 دقائق`,
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        });

        if (previousPendingIds) {
          const hasNewPendingOrder = Array.from(currentPendingIds).some((id) => !previousPendingIds.has(id));

          if (hasNewPendingOrder) {
            trackedOrders
              .filter((item) => NEW_PENDING_STATUSES.has(item.order.status))
              .forEach(({ source, order }) => {
                const key = createNotificationId('new', source, order.id);
                if (previousPendingIds.has(key) || newOrderNotifiedIds.current.has(key)) {
                  return;
                }

                newOrderNotifiedIds.current.add(key);

                newNotifications.push({
                  id: `${key}:${Date.now()}`,
                  type: 'new_pending',
                  orderId: order.id,
                  orderSource: source,
                  restaurantId: buildOrderRestaurantId(order),
                  title: 'لديك طلب معلق',
                  message: `لديك طلب معلق رقم #${order.id}`,
                  createdAt: new Date().toISOString(),
                  isRead: false,
                });
              });
          }

          if (hasNewPendingOrder && orderAlertEnabled) {
            await playOrderAlertTone(orderAlertTone);
          }
        }

        if (newNotifications.length) {
          setNotifications((current) => [...newNotifications, ...current].slice(0, ORDER_NOTIFICATIONS_LIMIT));
          setToastNotifications((current) => [...current, ...newNotifications].slice(-4));
        }

        knownPendingOrderIds.current = currentPendingIds;
      } catch {
        // Ignore notification polling errors to avoid interrupting app usage.
      } finally {
        isFetching = false;
      }
    };

    void checkForNewPendingOrders();

    const intervalId = window.setInterval(() => {
      void checkForNewPendingOrders();
    }, 7000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [authState, currentRestaurant?.id, orderAlertEnabled, orderAlertTone]);

  const visibleNotifications = notifications.filter(
    (item) => !item.restaurantId || String(item.restaurantId) === String(currentRestaurant?.id || ''),
  );
  const unreadNotificationsCount = visibleNotifications.filter((item) => !item.isRead).length;

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((current) =>
      current.map((item) =>
        !item.restaurantId || String(item.restaurantId) === String(currentRestaurant?.id || '')
          ? { ...item, isRead: true }
          : item,
      ),
    );
  };

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
    if (!canViewPage(user, currentPage)) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          لا تملك صلاحية الوصول لهذه الصفحة
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} restaurantName={currentRestaurant?.name || 'المطعم'} />;
      case 'orders':
        return <Orders restaurantId={currentRestaurant?.id} />;
      case 'reports':
        return <Reports restaurant={currentRestaurant} user={user} />;
      case 'products':
        return <Products restaurantId={currentRestaurant?.id || null} />;
      case 'users':
        return <Users isDarkMode={isDarkMode} currentUser={user} />;
      case 'settings':
        return (
          <Settings
            onBack={() => setCurrentPage('dashboard')}
            onLogout={handleLogout}
            restaurantId={currentRestaurant?.id || null}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode((currentValue) => !currentValue)}
            orderAlertTone={orderAlertTone}
            onOrderAlertToneChange={setOrderAlertTone}
            orderAlertEnabled={orderAlertEnabled}
            onOrderAlertEnabledChange={setOrderAlertEnabled}
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
      {toastNotifications.length > 0 && (
        <div className="fixed top-20 left-4 z-[60] space-y-2 w-[calc(100%-2rem)] max-w-sm">
          {toastNotifications.map((notification) => (
            <div key={notification.id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
              <p className="text-sm font-semibold text-amber-900">{notification.title}</p>
              <p className="text-xs text-amber-800 mt-1">{notification.message}</p>
            </div>
          ))}
        </div>
      )}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        allowedPages={allowedPages}
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
          notifications={visibleNotifications}
          unreadNotificationsCount={unreadNotificationsCount}
          onMarkNotificationRead={markNotificationAsRead}
          onMarkAllNotificationsRead={markAllNotificationsAsRead}
          onOpenOrdersPage={() => setCurrentPage('orders')}
        />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
}