import { useEffect, useState } from 'react';
import { Search, Eye, CheckCircle, Clock, XCircle, ChefHat } from 'lucide-react';
import { OrderModal } from './OrderModal';
import { api } from '../lib/api';
import type { Order } from '../types';

interface OrdersProps {
  restaurantId?: string;
}

type OrderStatusTab = 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';

export function Orders({ restaurantId }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusTab>('pending');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusModalMessage, setStatusModalMessage] = useState('');

  const statusTabs: Array<{ key: OrderStatusTab; label: string }> = [
    { key: 'pending', label: 'معلقة' },
    { key: 'processing', label: 'قيد التحضير' },
    { key: 'ready', label: 'جاهز' },
    { key: 'completed', label: 'تم التسليم' },
    { key: 'cancelled', label: 'ملغي' },
  ];

  useEffect(() => {
    let mounted = true;
    let isFetching = false;

    const enrichOrdersWithCaptainNames = async (incomingOrders: Order[]) => {
      const ordersMissingCaptain = incomingOrders.filter((order) => !order.captainName);

      if (ordersMissingCaptain.length === 0) {
        return incomingOrders;
      }

      const detailResults = await Promise.allSettled(
        ordersMissingCaptain.map(async (order) => ({
          id: order.id,
          captainName: (await api.getOrderDetails(order.id)).captainName || null,
        })),
      );

      const captainNameMap = new Map<string, string>();

      detailResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.captainName) {
          captainNameMap.set(result.value.id, result.value.captainName);
        }
      });

      return incomingOrders.map((order) => ({
        ...order,
        captainName: order.captainName || captainNameMap.get(order.id) || null,
      }));
    };

    const loadOrders = async (showLoading = false) => {
      if (isFetching) {
        return;
      }

      isFetching = true;

      if (showLoading && mounted) {
        setIsLoading(true);
      }

      try {
        const response = await api.getAgentOrders(restaurantId);
        const enrichedOrders = await enrichOrdersWithCaptainNames(response);
        if (mounted) {
          setOrders(enrichedOrders);
          setSelectedOrder((currentOrder) => {
            if (!currentOrder) {
              return null;
            }

            return enrichedOrders.find((order) => order.id === currentOrder.id) || currentOrder;
          });
          setError('');
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الطلبات');
        }
      } finally {
        isFetching = false;
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const handleWindowFocus = () => {
      void loadOrders(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadOrders(false);
      }
    };

    const intervalId = window.setInterval(() => {
      void loadOrders(false);
    }, 5000);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    void loadOrders(true);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [restaurantId]);

  const reloadOrders = async () => {
    const response = await api.getAgentOrders(restaurantId);
    const detailedOrders = await Promise.allSettled(
      response.map(async (order) => {
        if (order.captainName) {
          return order;
        }

        const details = await api.getOrderDetails(order.id);
        return {
          ...order,
          captainName: details.captainName || null,
        };
      }),
    );

    setOrders(
      detailedOrders.map((result, index) => (result.status === 'fulfilled' ? result.value : response[index])),
    );
  };

  const matchesStatusTab = (order: Order, tab: OrderStatusTab) => {
    switch (tab) {
      case 'pending':
        return order.status === 'confirmed' || order.status === 'processing';
      case 'processing':
        return order.status === 'preparing';
      case 'ready':
        return order.status === 'ready';
      case 'completed':
        return order.status === 'completed' || order.status === 'delivering';
      case 'cancelled':
        return order.status === 'cancelled';
      default:
        return false;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
      case 'scheduled':
      case 'confirmed':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'ready':
        return 'bg-emerald-100 text-emerald-800';
      case 'delivering':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending':
      case 'scheduled':
      case 'confirmed':
      case 'processing':
        return 'معلقة';
      case 'preparing':
        return 'قيد التحضير';
      case 'ready':
        return 'جاهز';
      case 'delivering':
      case 'completed':
        return 'تم التسليم';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'preparing':
        return <ChefHat className="h-4 w-4" />;
      case 'ready':
      case 'delivering':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (['pending', 'scheduled'].includes(order.status)) {
      return false;
    }

    const searchValue = searchTerm.toLowerCase();
    const matchesSearch =
      order.id.includes(searchTerm) ||
      (order.restaurants || []).some((restaurant) =>
        restaurant.name.toLowerCase().includes(searchValue) ||
        restaurant.items.some((item) => item.name.toLowerCase().includes(searchValue)),
      );
    const matchesStatus = matchesStatusTab(order, statusFilter);
    return matchesSearch && matchesStatus;
  });

  const handleOrderUpdated = async (updatedOrder: Order, keepDetailsOpen = true) => {
    setOrders((currentOrders) => currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
    setSelectedOrder((currentOrder) => {
      if (!keepDetailsOpen || !currentOrder || currentOrder.id !== updatedOrder.id) {
        return keepDetailsOpen ? currentOrder : null;
      }

      return updatedOrder;
    });
    await reloadOrders();
  };

  const getCardStatusActions = (order: Order): Array<{ value: Order['status']; label: string }> => {
    switch (order.status) {
      case 'preparing':
        return [{ value: 'ready', label: 'جاهز' }];
      case 'ready':
        return [{ value: 'delivering', label: 'تم التسليم' }];
      default:
        return [];
    }
  };

  const handleCardStatusUpdate = async (order: Order, newStatus: Order['status']) => {
    if (newStatus === 'delivering' && !order.captainName) {
      setStatusModalMessage('الطلب لم يرتبط بكبتن بعد');
      return;
    }

    const updatedOrder = await api.updateOrderStatus(order.id, newStatus);
    await handleOrderUpdated(updatedOrder, false);
  };

  const formatYemeniCurrency = (value: number) => `${value.toFixed(2)} ريال يمني`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">الطلبات</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {statusModalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-3">تنبيه</h3>
            <p className="text-sm text-gray-600 mb-6">{statusModalMessage}</p>
            <button
              type="button"
              onClick={() => setStatusModalMessage('')}
              className="w-full rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600 transition-colors"
            >
              حسناً
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2 min-w-max">
              {statusTabs.map((tab) => {
                const isActive = statusFilter === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-green-500 text-white'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="البحث برقم الطلب أو اسم المنتج..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pr-10 pl-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">جاري تحميل الطلبات...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">رقم الطلب</div>
                    <div className="font-bold text-gray-900 text-lg">#{order.id}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">المبلغ الإجمالي</div>
                  <div className="font-bold text-green-600 text-lg">{formatYemeniCurrency(order.total)}</div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">المنتجات</div>
                    <div className="text-gray-700 line-clamp-2">
                      {order.restaurants && order.restaurants.length > 0
                        ? order.restaurants.flatMap((restaurant) => restaurant.items).map((item) => item.name).join('، ')
                        : 'لا توجد منتجات'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">تاريخ الطلب</div>
                    <div className="text-gray-700">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(order.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </div>
                  </div>
                </div>

                <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <div className="text-xs text-gray-500 mb-1">اسم الكابتن</div>
                  <div className="font-medium text-gray-800">{order.captainName || 'لم يتم التعيين بعد'}</div>
                </div>

                <button
                  onClick={() => setSelectedOrder(order)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                >
                  <Eye className="h-4 w-4" />
                  عرض وتعديل الطلب
                </button>

                {getCardStatusActions(order).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getCardStatusActions(order).map((action) => (
                      <button
                        key={action.value}
                        type="button"
                        onClick={() => void handleCardStatusUpdate(order, action.value)}
                        className="flex-1 min-w-[120px] px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors text-sm font-medium"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد طلبات</h3>
            <p className="text-gray-600">لم يتم العثور على طلبات تطابق البحث</p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateOrder={handleOrderUpdated}
        />
      )}
    </div>
  );
}
