import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, ShoppingCart, Clock, DollarSign } from 'lucide-react';
import { StatCard } from './StatCard';
import { Chart } from './Chart';
import { api } from '../lib/api';
import { formatYemeniCurrency } from '../lib/currency';
import type { DashboardData, Page } from '../types';

interface DashboardProps {
  onNavigate: (page: Page) => void;
  restaurantName: string;
}

function normalizeOrderDistributionLabel(label: string) {
  switch (label) {
    case 'pending':
    case 'scheduled':
    case 'confirmed':
    case 'processing':
    case 'قيد الانتظار':
    case 'مجدول':
    case 'تم التأكيد':
      return 'معلقة';
    case 'preparing':
    case 'قيد التحضير':
      return 'قيد التحضير';
    case 'ready':
    case 'جاهز':
      return 'جاهز';
    case 'delivering':
    case 'completed':
    case 'قيد التوصيل':
    case 'مكتمل':
    case 'مكتملة':
    case 'تم التسليم':
      return 'تم التسليم';
    case 'cancelled':
    case 'ملغي':
      return 'ملغي';
    default:
      return label;
  }
}

export function Dashboard({ onNavigate, restaurantName }: DashboardProps) {
  const [dashboard, setDashboard] = useState<DashboardData>({
    totalSales: 0,
    newOrders: 0,
    pendingOrders: 0,
    growthRate: 0,
    weeklySales: [],
    orderDistribution: [],
    topProducts: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const dashboardResponse = await api.getDashboard();

        if (mounted) {
          setDashboard(dashboardResponse);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = [
    {
      title: 'إجمالي المبيعات',
      value: formatYemeniCurrency(dashboard.totalSales),
      change: `${dashboard.growthRate >= 0 ? '+' : ''}${dashboard.growthRate.toFixed(1)}%`,
      changeType: dashboard.growthRate >= 0 ? ('increase' as const) : ('decrease' as const),
      icon: DollarSign,
      onClick: () => onNavigate('reports'),
    },
    {
      title: 'الطلبات الجديدة',
      value: String(dashboard.newOrders),
      change: 'محدثة تلقائيا',
      changeType: 'increase' as const,
      icon: ShoppingCart,
      onClick: () => onNavigate('orders'),
    },
    {
      title: 'الطلبات المعلقة',
      value: String(dashboard.pendingOrders),
      change: 'بانتظار المعالجة',
      changeType: 'decrease' as const,
      icon: Clock,
      onClick: () => onNavigate('orders'),
    },
    {
      title: 'معدل النمو',
      value: `${dashboard.growthRate.toFixed(1)}%`,
      change: 'مقارنة بالأسبوع السابق',
      changeType: dashboard.growthRate >= 0 ? ('increase' as const) : ('decrease' as const),
      icon: TrendingUp,
      onClick: () => onNavigate('reports'),
    },
  ];

  const dailySales = useMemo(() => {
    const groupedByDay = new Map<string, number>();

    dashboard.weeklySales.forEach((item) => {
      const label = String(item.name || '').trim() || 'غير معروف';
      groupedByDay.set(label, (groupedByDay.get(label) || 0) + Number(item.value || 0));
    });

    return Array.from(groupedByDay.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [dashboard.weeklySales]);

  const normalizedOrderDistribution = useMemo(() => {
    const grouped = new Map<string, number>();

    dashboard.orderDistribution.forEach((item) => {
      const normalizedName = normalizeOrderDistributionLabel(item.name);
      grouped.set(normalizedName, (grouped.get(normalizedName) || 0) + Number(item.value || 0));
    });

    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [dashboard.orderDistribution]);

  const topProductsChartData = useMemo(
    () => dashboard.topProducts.map((item) => ({
      name: item.name,
      value: item.sales,
      meta: `${item.orderCount} مرة طلب`,
    })),
    [dashboard.topProducts],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">لوحة التحكم - {restaurantName}</h2>
        <p className="text-sm sm:text-base text-gray-600">
          {isLoading ? 'جاري تحميل ملخص الأداء...' : `نظرة عامة على أداء ${restaurantName}`}
        </p>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"> 
        <Chart 
          title="المبيعات الأسبوعية" 
          type="sales"
          data={dailySales.length > 0 ? dailySales : [{ name: 'لا يوجد', value: 0 }]}
        />
        <Chart 
          title="توزيع الطلبات" 
          type="orders"
          data={normalizedOrderDistribution.length > 0 ? normalizedOrderDistribution : [{ name: 'لا يوجد', value: 1 }]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <Chart
          title="أكثر 5 منتجات مبيعًا"
          type="top-products"
          data={topProductsChartData.length > 0 ? topProductsChartData : [{ name: 'لا يوجد', value: 0, meta: '0 مرة طلب' }]}
        />
      </div>
    </div>
  );
}