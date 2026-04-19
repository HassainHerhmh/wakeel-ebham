import type {
  AccountStatementResponse,
  AccountStatementRow,
  AgentInfoRow,
  AuthSession,
  CommissionReportEntry,
  DashboardData,
  NamedItem,
  Order,
  OrderItem,
  OrderRestaurant,
  PermissionMap,
  Product,
  RestaurantItem,
  SettingsData,
  StaffRole,
  StaffUser,
} from '../types';
import { attachAgentLinkToUser } from './agentUserLinks';

function normalizeApiBaseUrl(rawUrl?: string): string {
  const normalizedUrl = (rawUrl || '/api').trim().replace(/\/$/, '');

  if (!normalizedUrl) {
    return '/api';
  }

  if (/\/api$/i.test(normalizedUrl) || normalizedUrl === '/api') {
    return normalizedUrl;
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    return `${normalizedUrl}/api`;
  }

  return normalizedUrl;
}

function resolveApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

  if (configuredUrl) {
    return normalizeApiBaseUrl(configuredUrl);
  }

  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    return '/api';
  }

  return normalizeApiBaseUrl(configuredUrl);
}

const API_BASE_URL = resolveApiBaseUrl();
export const SESSION_STORAGE_KEY = 'merchant-app-session';

interface AgentLoginResponse {
  success: boolean;
  token: string;
  agent: {
    id: string | number;
    name: string;
    phone?: string;
    branch_id?: string | number;
    account_id?: string | number | null;
    image_url?: string | null;
  };
}

interface StaffLoginResponse {
  success: boolean;
  message?: string;
  user: {
    id: string | number;
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: string;
    branch_id?: string | number | null;
    branch_name?: string | null;
    permissions?: unknown;
    agent_id?: string | number | null;
    agent_name?: string | null;
    is_admin_branch?: boolean;
    token: string;
  };
}

interface WrappedCollectionResponse<T> {
  success?: boolean;
  orders?: T[];
  products?: T[];
  categories?: T[];
  units?: T[];
  restaurants?: T[];
}

function extractCollection<T>(payload: T[] | WrappedCollectionResponse<T>, key: keyof WrappedCollectionResponse<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const value = payload[key];
  return Array.isArray(value) ? value : [];
}

const USER_PERMISSION_SECTIONS = [
  'dashboard',
  'users',
  'orders',
  'manual_orders',
  'reports',
  'products',
  'settings',
] as const;

const USER_PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'print'] as const;

function createEmptyPermissions(): PermissionMap {
  const permissions: PermissionMap = {};

  USER_PERMISSION_SECTIONS.forEach((section) => {
    permissions[section] = {
      view: false,
      create: false,
      edit: false,
      delete: false,
      print: false,
    };
  });

  return permissions;
}

function normalizePermissions(rawValue: unknown): PermissionMap {
  const permissions = createEmptyPermissions();

  let parsedValue = rawValue;
  if (typeof rawValue === 'string') {
    try {
      parsedValue = JSON.parse(rawValue);
    } catch {
      return permissions;
    }
  }

  USER_PERMISSION_SECTIONS.forEach((section) => {
    USER_PERMISSION_ACTIONS.forEach((action) => {
      permissions[section][action] = Boolean((parsedValue as Record<string, Record<string, unknown>> | null)?.[section]?.[action]);
    });
  });

  return permissions;
}

function normalizeStaffUser(row: Record<string, unknown>): StaffUser {
  return attachAgentLinkToUser({
    id: String(row.id || ''),
    name: String(row.name || ''),
    username: row.email !== undefined && row.email !== null ? String(row.email) : null,
    phone: row.phone !== undefined && row.phone !== null ? String(row.phone) : null,
    role: String(row.role || 'employee'),
    status: row.status !== undefined && row.status !== null ? String(row.status) : null,
    branch_id: row.branch_id !== undefined && row.branch_id !== null ? String(row.branch_id) : null,
    branch_name: row.branch_name !== undefined && row.branch_name !== null ? String(row.branch_name) : null,
    createdAt: row.created_at !== undefined && row.created_at !== null ? String(row.created_at) : null,
    linked_agent_id: row.agent_id !== undefined && row.agent_id !== null ? String(row.agent_id) : null,
    linked_agent_name: row.agent_name !== undefined && row.agent_name !== null ? String(row.agent_name) : null,
    permissions: normalizePermissions(row.permissions),
  });
}

function normalizeProduct(product: Product & { category_ids?: string[] | string | null }): Product {
  const rawCategoryIds = product.category_ids as string[] | string | null | undefined;
  const categoryIds = Array.isArray(rawCategoryIds)
    ? rawCategoryIds.map(String)
    : typeof rawCategoryIds === 'string' && rawCategoryIds.trim()
      ? rawCategoryIds.split(',').map((item: string) => item.trim()).filter(Boolean)
      : [];

  return {
    ...product,
    id: String(product.id),
    notes: product.notes || '',
    price: product.price === null ? null : Number(product.price),
    image_url: product.image_url || null,
    is_available: Boolean(product.is_available),
    is_parent: Boolean(product.is_parent),
    categories: product.categories || '',
    category_ids: categoryIds,
    unit_id: product.unit_id ? String(product.unit_id) : null,
    restaurant_id: product.restaurant_id ? String(product.restaurant_id) : null,
  };
}

function normalizeRestaurant(
  item: RestaurantItem & {
    account_id?: string | number | null;
    accountId?: string | number | null;
    agent_id?: string | number | null;
    agentId?: string | number | null;
    account?: { id?: string | number | null; account_id?: string | number | null } | null;
  },
): RestaurantItem {
  const resolvedAccountId =
    item.account_id
    ?? item.accountId
    ?? item.account?.id
    ?? item.account?.account_id
    ?? null;

  return {
    ...item,
    id: String(item.id),
    image_url: typeof item.image_url === 'string' ? item.image_url : null,
    account_id: resolvedAccountId !== undefined && resolvedAccountId !== null ? String(resolvedAccountId) : null,
    agent_id: item.agent_id !== undefined && item.agent_id !== null
      ? String(item.agent_id)
      : item.agentId !== undefined && item.agentId !== null
        ? String(item.agentId)
        : null,
  };
}

function normalizeOrderItem(item: Partial<OrderItem> & { qty?: number; total?: number }): OrderItem {
  const quantity = Number(item.quantity ?? item.qty ?? 0);
  const price = Number(item.price ?? 0);

  return {
    id: item.id ? String(item.id) : undefined,
    product_id: item.product_id ? String(item.product_id) : undefined,
    restaurant_id: item.restaurant_id ? String(item.restaurant_id) : undefined,
    name: String(item.name || ''),
    quantity,
    price,
    subtotal: item.subtotal !== undefined ? Number(item.subtotal) : item.total !== undefined ? Number(item.total) : quantity * price,
  };
}

function normalizeOrderRestaurant(restaurant: Partial<OrderRestaurant> & { items?: Array<Partial<OrderItem> & { qty?: number; total?: number }> }): OrderRestaurant {
  const items = Array.isArray(restaurant.items) ? restaurant.items.map(normalizeOrderItem) : [];

  return {
    id: String(restaurant.id || ''),
    name: String(restaurant.name || ''),
    address: typeof restaurant.address === 'string' ? restaurant.address : '',
    restaurant_image: typeof restaurant.restaurant_image === 'string' ? restaurant.restaurant_image : null,
    items,
    total: restaurant.total !== undefined ? Number(restaurant.total) : items.reduce((sum, item) => sum + (item.subtotal || 0), 0),
  };
}

function normalizeOrder(order: Record<string, unknown>): Order {
  const summaryRestaurant = order.restaurant && typeof order.restaurant === 'object'
    ? normalizeOrderRestaurant(order.restaurant as Partial<OrderRestaurant>)
    : null;

  const summaryProducts = Array.isArray(order.products)
    ? (order.products as Array<Partial<OrderItem>>).map(normalizeOrderItem)
    : [];

  const restaurants = Array.isArray(order.restaurants)
    ? order.restaurants.map((restaurant) => normalizeOrderRestaurant(restaurant as Partial<OrderRestaurant> & { items?: Array<Partial<OrderItem>> }))
    : summaryRestaurant
      ? [{
          ...summaryRestaurant,
          items: summaryProducts,
          total: summaryProducts.reduce((sum, item) => sum + (item.subtotal || 0), 0),
        }]
    : (() => {
        const ids = typeof order.restaurant_ids === 'string' ? order.restaurant_ids.split('||') : [];
        const names = typeof order.restaurant_names === 'string' ? order.restaurant_names.split('||') : [];
        const addresses = typeof order.restaurant_addresses === 'string' ? order.restaurant_addresses.split('||') : [];

        return names
          .map((name, index) => ({
            id: String(ids[index] || ''),
            name: String(name || ''),
            address: String(addresses[index] || ''),
            restaurant_image: null,
            items: [],
            total: 0,
          }))
          .filter((restaurant) => restaurant.id || restaurant.name);
      })();

  const flattenedItems = restaurants.flatMap((restaurant) =>
    restaurant.items.map((item) => ({
      ...item,
      restaurant_id: item.restaurant_id || restaurant.id,
    })),
  );

  const resolvedItems = Array.isArray(order.items)
    ? (order.items as Array<Partial<OrderItem>>).map(normalizeOrderItem)
    : flattenedItems;

  const derivedTotal = resolvedItems.reduce((sum, item) => sum + (item.subtotal ?? item.quantity * item.price), 0);
  const rawTotal = order.total_amount ?? order.total;

  return {
    id: String(order.id || ''),
    customer: String(order.customer_name || order.customer || ''),
    phone: String(order.customer_phone || order.phone || ''),
    address: String(order.customer_address || order.address || ''),
    total: rawTotal !== undefined && rawTotal !== null ? Number(rawTotal) : derivedTotal,
    status: String(order.status || 'pending') as Order['status'],
    items: resolvedItems,
    createdAt: String(order.created_at || order.createdAt || new Date().toISOString()),
    note: typeof order.note === 'string' ? order.note : '',
    paymentMethod: typeof order.payment_method_label === 'string'
      ? order.payment_method_label
      : typeof order.payment_method === 'string'
        ? order.payment_method
        : '',
    deliveryFee: Number(order.delivery_fee ?? 0),
    extraStoreFee: Number(order.extra_store_fee ?? 0),
    discountAmount: Number(order.discount_amount ?? 0),
    couponCode: typeof order.coupon_code === 'string' ? order.coupon_code : null,
    captainName: typeof order.captain_name === 'string' ? order.captain_name : null,
    branchName: typeof order.branch_name === 'string' ? order.branch_name : null,
    restaurants,
    cancelReason: typeof order.cancel_reason === 'string'
      ? order.cancel_reason
      : typeof order.cancelReason === 'string'
        ? order.cancelReason
        : undefined,
  };
}

function normalizeManualOrder(order: Record<string, unknown>): Order {
  const rawItems = Array.isArray(order.items) ? order.items as Array<Record<string, unknown>> : [];
  const normalizedItems = rawItems.map((item) => {
    const quantity = Number(item.qty ?? item.quantity ?? 0);
    const price = Number(item.price ?? 0);
    return {
      name: String(item.name || ''),
      quantity,
      price,
      subtotal: Number(item.total ?? quantity * price),
      restaurant_id: order.restaurant_id ? String(order.restaurant_id) : undefined,
    };
  });

  const restaurantId = order.restaurant_id ? String(order.restaurant_id) : '';
  const restaurantName = typeof order.restaurant_name === 'string' ? order.restaurant_name : '';

  return {
    id: String(order.id || ''),
    customer: String(order.customer_name || order.customer || ''),
    phone: String(order.customer_phone || order.phone || ''),
    address: String(order.to_address || order.customer_address || order.address || ''),
    total: Number(order.total_amount ?? order.total ?? 0),
    status: String(order.status || 'pending') as Order['status'],
    items: normalizedItems,
    createdAt: String(order.created_at || order.createdAt || new Date().toISOString()),
    note: typeof order.notes === 'string' ? order.notes : typeof order.note === 'string' ? order.note : '',
    paymentMethod: typeof order.payment_method === 'string' ? order.payment_method : '',
    deliveryFee: Number(order.delivery_fee ?? 0),
    extraStoreFee: Number(order.extra_fee ?? 0),
    discountAmount: Number(order.discount_amount ?? 0),
    couponCode: typeof order.coupon_code === 'string' ? order.coupon_code : null,
    captainName: typeof order.captain_name === 'string' ? order.captain_name : null,
    branchName: typeof order.branch_name === 'string' ? order.branch_name : null,
    restaurants: restaurantId || restaurantName ? [{
      id: restaurantId,
      name: restaurantName,
      address: '',
      restaurant_image: typeof order.restaurant_image === 'string' ? order.restaurant_image : null,
      items: normalizedItems,
      total: normalizedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
    }] : [],
  };
}

function getAuthHeaders(): HeadersInit {
  const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return {};
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession;

    if (!session.token) {
      return {};
    }

    return {
      Authorization: `Bearer ${session.token}`,
    };
  } catch {
    return {};
  }
}

async function parseErrorResponse(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const errorBody = await response.json().catch(() => null);

    if (errorBody && typeof errorBody.message === 'string' && errorBody.message.trim()) {
      return errorBody.message;
    }
  } else {
    const text = await response.text().catch(() => '');

    if (text.trim()) {
      if (response.status === 404) {
        return 'المسار المطلوب غير متاح حاليا';
      }

      return `فشل تنفيذ الطلب برمز ${response.status}`;
    }
  }

  if (response.status === 401) {
    return 'بيانات غير صحيحة';
  }

  if (response.status === 403) {
    return 'الحساب معطل';
  }

  if (response.status === 404) {
    return 'تعذر العثور على المسار المطلوب';
  }

  return `فشل تنفيذ الطلب برمز ${response.status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const headers = new Headers(init?.headers || {});
  const isFormData = init?.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  Object.entries(getAuthHeaders()).forEach(([key, value]) => {
    if (value !== undefined && !headers.has(key)) {
      headers.set(key, String(value));
    }
  });

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error('تعذر إكمال الاتصال. تحقق من رابط API والاتصال بالإنترنت');
  }

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response.json() as Promise<T>;
}

async function requestWithFallback<T>(paths: string[], init?: RequestInit): Promise<T> {
  let lastError: Error | null = null;

  for (const path of paths) {
    try {
      return await request<T>(path, init);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      lastError = error;

      const isNotFoundError =
        error.message.includes('404') ||
        error.message.includes('endpoint') ||
        error.message.includes('المسار المطلوب غير موجود') ||
        error.message.includes('تعذر العثور');

      if (!isNotFoundError) {
        throw error;
      }
    }
  }

  throw lastError || new Error('تعذر تنفيذ الطلب');
}

function normalizeCommissionReportEntry(row: Record<string, unknown>): CommissionReportEntry {
  return {
    orderDate: String(row.order_date || row.created_at || row.date || ''),
    captainName: typeof row.captain_name === 'string' ? row.captain_name : null,
    restaurantName: typeof row.restaurant_name === 'string' ? row.restaurant_name : null,
    orderId: String(row.order_id || row.reference_id || row.id || ''),
    totalAmount: Number(row.total_amount ?? row.total ?? 0),
    restaurantCommission: Number(row.restaurant_commission ?? 0),
    captainCommission: Number(row.captain_commission ?? 0),
  };
}

function normalizeAgentInfoRow(row: Record<string, unknown>): AgentInfoRow {
  return {
    id: String(row.id || ''),
    account_type: String(row.account_type || ''),
    account_id: String(row.account_id || ''),
    group_id: row.group_id !== undefined && row.group_id !== null ? String(row.group_id) : null,
    commission_type: typeof row.commission_type === 'string' ? row.commission_type : null,
    commission_value: Number(row.commission_value ?? 0),
    contract_start: row.contract_start !== undefined && row.contract_start !== null ? String(row.contract_start) : null,
    contract_end: row.contract_end !== undefined && row.contract_end !== null ? String(row.contract_end) : null,
    agent_account_id: row.agent_account_id !== undefined && row.agent_account_id !== null ? String(row.agent_account_id) : null,
    commission_account_id: row.commission_account_id !== undefined && row.commission_account_id !== null ? String(row.commission_account_id) : null,
    agent_name: typeof row.agent_name === 'string' ? row.agent_name : null,
    agent_account_name: typeof row.agent_account_name === 'string' ? row.agent_account_name : null,
    branch_name: typeof row.branch_name === 'string' ? row.branch_name : null,
    currency_code: typeof row.currency_code === 'string' ? row.currency_code : null,
    is_active: row.is_active !== undefined ? Boolean(row.is_active) : undefined,
    is_valid_now: row.is_valid_now !== undefined ? Boolean(row.is_valid_now) : undefined,
  };
}

function pickActiveCommissionContract(rows: AgentInfoRow[], agentId?: string) {
  if (!agentId) {
    return null;
  }

  const matchingRows = rows.filter(
    (row) => row.account_type === 'agent' && row.account_id === String(agentId) && row.is_active !== false,
  );

  if (!matchingRows.length) {
    return null;
  }

  const validNow = matchingRows.find((row) => row.is_valid_now === true);
  if (validNow) {
    return validNow;
  }

  return matchingRows
    .slice()
    .sort((left, right) => String(right.contract_end || '').localeCompare(String(left.contract_end || '')))[0] || null;
}

function calculateCommissionAmount(
  totalAmount: number,
  contract: AgentInfoRow | null,
  fallbackRate: number,
) {
  if (contract && Number.isFinite(contract.commission_value)) {
    const normalizedType = String(contract.commission_type || '').trim().toLowerCase();
    const value = Number(contract.commission_value || 0);

    const isPercent =
      normalizedType.includes('percent')
      || normalizedType.includes('percentage')
      || normalizedType.includes('rate')
      || normalizedType.includes('نسبة');

    if (isPercent) {
      return Number((totalAmount * normalizeCommissionRate(value)).toFixed(2));
    }

    return Number(value.toFixed(2));
  }

  return Number((totalAmount * fallbackRate).toFixed(2));
}

function normalizeAccountStatementRow(row: Record<string, unknown>, index: number): AccountStatementRow {
  return {
    id: String(row.id || row.reference_id || `statement-row-${index}`),
    journalDate: String(row.journal_date || row.date || ''),
    referenceId: String(row.reference_id || row.reference || ''),
    referenceType: String(row.reference_type || row.document || ''),
    notes: String(row.notes || row.description || ''),
    accountName: String(row.account_name || row.account || ''),
    currencyName: String(row.currency_name || ''),
    debit: Number(row.debit ?? 0),
    credit: Number(row.credit ?? 0),
    balance: Number(row.balance ?? 0),
    isOpening: Boolean(row.is_opening),
  };
}

function normalizeCommissionRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value > 1 ? value / 100 : value;
}

function isOrderWithinDateRange(orderDate: string, from?: string, to?: string) {
  const orderDay = new Date(orderDate).toISOString().split('T')[0];

  if (from && orderDay < from) {
    return false;
  }

  if (to && orderDay > to) {
    return false;
  }

  return true;
}

function toSafeNumber(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatDayLabelForDashboard(dateValue: string) {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'غير معروف';
  }

  return parsedDate.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

function buildDashboardFromOrders(orders: Order[]): DashboardData {
  const sortedOrders = [...orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  const totalSales = sortedOrders
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + toSafeNumber(order.total), 0);

  const pendingOrders = sortedOrders.filter((order) =>
    ['pending', 'scheduled', 'processing', 'preparing', 'confirmed', 'ready'].includes(order.status),
  ).length;

  const latestWeek = sortedOrders.slice(0, 7);
  const previousWeek = sortedOrders.slice(7, 14);
  const latestTotal = latestWeek.reduce((sum, order) => sum + toSafeNumber(order.total), 0);
  const previousTotal = previousWeek.reduce((sum, order) => sum + toSafeNumber(order.total), 0);
  const growthRate = previousTotal > 0 ? ((latestTotal - previousTotal) / previousTotal) * 100 : 0;

  const dailySalesMap = new Map<string, { rawDate: string; value: number }>();

  sortedOrders.forEach((order) => {
    if (order.status === 'cancelled') {
      return;
    }

    const parsedDate = new Date(order.createdAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return;
    }

    const rawDate = parsedDate.toISOString().split('T')[0];
    const current = dailySalesMap.get(rawDate) || { rawDate, value: 0 };
    current.value += toSafeNumber(order.total);
    dailySalesMap.set(rawDate, current);
  });

  const weeklySales = Array.from(dailySalesMap.values())
    .sort((left, right) => left.rawDate.localeCompare(right.rawDate))
    .slice(-7)
    .map((entry) => ({
      name: formatDayLabelForDashboard(entry.rawDate),
      value: Number(entry.value.toFixed(2)),
    }));

  const statusCount = sortedOrders.reduce<Record<string, number>>((accumulator, order) => {
    const key = String(order.status || 'unknown');
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const orderDistribution = [
    { name: 'مكتملة', value: (statusCount.completed || 0) + (statusCount.delivered || 0) + (statusCount.delivery || 0) },
    { name: 'قيد التوصيل', value: statusCount.delivering || 0 },
    { name: 'ملغية', value: statusCount.cancelled || 0 },
  ];

  const productSummary = new Map<string, { name: string; sales: number; orderIds: Set<string> }>();

  sortedOrders.forEach((order) => {
    order.items.forEach((item) => {
      const productName = String(item.name || '').trim();
      if (!productName) {
        return;
      }

      const productKey = String(item.product_id || productName).trim();
      const fallbackSubtotal = Number(item.quantity || 0) * Number(item.price || 0);
      const subtotal = Number(item.subtotal ?? fallbackSubtotal);
      const current = productSummary.get(productKey) || {
        name: productName,
        sales: 0,
        orderIds: new Set<string>(),
      };

      current.sales += Number.isFinite(subtotal) ? subtotal : 0;
      current.orderIds.add(order.id);
      productSummary.set(productKey, current);
    });
  });

  const topProducts = Array.from(productSummary.values())
    .map((entry) => ({
      name: entry.name,
      sales: Number(entry.sales.toFixed(2)),
      orderCount: entry.orderIds.size,
    }))
    .sort((left, right) => right.sales - left.sales)
    .slice(0, 5);

  return {
    totalSales,
    newOrders: sortedOrders.length,
    pendingOrders,
    growthRate,
    weeklySales,
    orderDistribution,
    topProducts,
  };
}

function normalizeDashboardData(payload: Record<string, unknown>): DashboardData {
  const weeklyRaw = Array.isArray(payload.weeklySales)
    ? payload.weeklySales
    : Array.isArray(payload.weekly_sales)
      ? payload.weekly_sales
      : [];

  const orderDistributionRaw = Array.isArray(payload.orderDistribution)
    ? payload.orderDistribution
    : Array.isArray(payload.order_distribution)
      ? payload.order_distribution
      : [];

  const topProductsRaw = Array.isArray(payload.topProducts)
    ? payload.topProducts
    : Array.isArray(payload.top_products)
      ? payload.top_products
      : [];

  return {
    totalSales: toSafeNumber(payload.totalSales ?? payload.total_sales),
    newOrders: toSafeNumber(payload.newOrders ?? payload.new_orders),
    pendingOrders: toSafeNumber(payload.pendingOrders ?? payload.pending_orders),
    growthRate: toSafeNumber(payload.growthRate ?? payload.growth_rate),
    weeklySales: weeklyRaw.map((item) => ({
      name: String((item as { name?: unknown }).name || ''),
      value: toSafeNumber((item as { value?: unknown }).value),
    })),
    orderDistribution: orderDistributionRaw.map((item) => ({
      name: String((item as { name?: unknown }).name || ''),
      value: toSafeNumber((item as { value?: unknown }).value),
    })),
    topProducts: topProductsRaw.map((item) => ({
      name: String((item as { name?: unknown }).name || ''),
      sales: toSafeNumber((item as { sales?: unknown; value?: unknown }).sales ?? (item as { value?: unknown }).value),
      orderCount: toSafeNumber((item as { orderCount?: unknown; order_count?: unknown; count?: unknown }).orderCount
        ?? (item as { order_count?: unknown }).order_count
        ?? (item as { count?: unknown }).count),
    })),
  };
}

export const api = {
  async login(phone: string, password: string): Promise<AuthSession> {
    try {
      const response = await request<AgentLoginResponse>('/agents/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });

      return {
        token: response.token,
        user: {
          id: String(response.agent.id),
          name: response.agent.name,
          role: 'agent',
          phone: response.agent.phone,
          branch_id: response.agent.branch_id,
          account_id: response.agent.account_id !== undefined && response.agent.account_id !== null
            ? String(response.agent.account_id)
            : null,
          image_url: response.agent.image_url ?? null,
        },
      };
    } catch (agentError) {
      const response = await request<StaffLoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: phone, password }),
      });

      if (!response.success || !response.user?.token) {
        throw new Error(response.message || (agentError instanceof Error ? agentError.message : 'تعذر تسجيل الدخول'));
      }

      let resolvedPermissions = normalizePermissions(response.user.permissions);

      // Backward compatibility: if login payload misses permissions, fetch it explicitly.
      if (!response.user.permissions && response.user.id !== undefined && response.user.id !== null) {
        try {
          const permissionsResponse = await request<{ permissions?: unknown }>(`/users/${response.user.id}/permissions`);
          resolvedPermissions = normalizePermissions(permissionsResponse.permissions);
        } catch {
          resolvedPermissions = normalizePermissions(undefined);
        }
      }

      return {
        token: response.user.token,
        user: attachAgentLinkToUser({
          id: String(response.user.id),
          name: response.user.name,
          role: String(response.user.role || 'employee'),
          phone: response.user.phone ?? undefined,
          email: response.user.email ?? null,
          branch_id: response.user.branch_id !== undefined && response.user.branch_id !== null
            ? String(response.user.branch_id)
            : undefined,
          branch_name: response.user.branch_name ?? null,
          linked_agent_id: response.user.agent_id !== undefined && response.user.agent_id !== null
            ? String(response.user.agent_id)
            : null,
          linked_agent_name: response.user.agent_name ?? null,
          is_admin_branch: Boolean(response.user.is_admin_branch),
          permissions: resolvedPermissions,
          account_id: null,
          image_url: null,
        }),
      };
    }
  },

  async updateRestaurantLogo(restaurantId: string, file: File): Promise<string | null> {
    const payload = new FormData();
    payload.append('image', file);

    await request<{ success?: boolean; message?: string }>(`/restaurants/${restaurantId}`, {
      method: 'PUT',
      body: payload,
    });

    const restaurants = await api.getRestaurants();
    const updatedRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantId);

    return updatedRestaurant?.image_url || null;
  },

  async getDashboard() {
    try {
      const orders = await api.getAgentOrders();
      return buildDashboardFromOrders(orders);
    } catch {
      try {
        const orders = await api.getOrders();
        return buildDashboardFromOrders(orders);
      } catch {
        const payload = await request<Record<string, unknown>>('/dashboard');
        return normalizeDashboardData(payload);
      }
    }
  },

  getOrders() {
    return request<Order[] | WrappedCollectionResponse<Order>>('/orders').then((response) =>
      extractCollection(response, 'orders').map((order) => normalizeOrder(order as unknown as Record<string, unknown>)),
    );
  },

  getAgentOrders(restaurantId?: string) {
    const searchParams = new URLSearchParams();

    if (restaurantId) {
      searchParams.set('restaurant_id', restaurantId);
    }

    const query = searchParams.toString();

    return request<Order[] | WrappedCollectionResponse<Order>>(`/orders/agent-summary${query ? `?${query}` : ''}`).then((response) =>
      extractCollection(response, 'orders').map((order) => normalizeOrder(order as unknown as Record<string, unknown>)),
    );
  },

  getManualOrders(restaurantId?: string) {
    return request<{ success?: boolean; orders?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
      '/manual-orders/manual-list',
    ).then((response) => {
      const rows = Array.isArray(response)
        ? response
        : Array.isArray(response.orders)
          ? response.orders
          : [];

      return rows
        .filter((row) => {
          if (!restaurantId) {
            return true;
          }

          return String(row.restaurant_id || '') === String(restaurantId);
        })
        .map((row) => normalizeManualOrder(row));
    });
  },

  getOrderDetails(id: string) {
    return request<{ success?: boolean; order?: Order }>(`/orders/${id}`).then((response) =>
      normalizeOrder((response.order || {}) as unknown as Record<string, unknown>),
    );
  },

  async updateOrderStatus(id: string, status: Order['status']) {
    await request<{ success: boolean }>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });

    return api.getOrderDetails(id);
  },

  async cancelOrder(id: string, reason: string) {
    await request<{ success: boolean }>(`/orders/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });

    return api.getOrderDetails(id);
  },

  async updateOrderItem(itemId: string, quantity: number, orderId: string) {
    await request<{ success: boolean }>(`/orders/item/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });

    return api.getOrderDetails(orderId);
  },

  async deleteOrderItem(itemId: string, orderId: string) {
    await request<{ success: boolean }>(`/orders/item/${itemId}`, {
      method: 'DELETE',
    });

    return api.getOrderDetails(orderId);
  },

  getProducts() {
    return request<Product[] | WrappedCollectionResponse<Product>>('/products').then((response) =>
      extractCollection(response, 'products').map(normalizeProduct),
    );
  },

  getProductChildren(id: string) {
    return request<{ success?: boolean; children?: Product[] }>(`/products/${id}/children`).then((response) =>
      Array.isArray(response.children) ? response.children.map(normalizeProduct) : [],
    );
  },

  createProduct(product: FormData) {
    return request<{ success: boolean; message?: string }>('/products', {
      method: 'POST',
      body: product,
    });
  },

  updateProduct(id: string, product: FormData) {
    return request<{ success: boolean; message?: string }>(`/products/${id}`, {
      method: 'PUT',
      body: product,
    });
  },

  deleteProduct(id: string) {
    return request<{ success: boolean }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  getCategories() {
    return request<NamedItem[] | WrappedCollectionResponse<NamedItem>>('/categories').then((response) =>
      extractCollection(response, 'categories').map((item) => ({
        ...item,
        id: String(item.id),
      })),
    );
  },

  getUnits(filters?: { q?: string; restaurantId?: string }) {
    const searchParams = new URLSearchParams();

    if (filters?.q) {
      searchParams.set('q', filters.q);
    }

    if (filters?.restaurantId) {
      searchParams.set('restaurant_id', filters.restaurantId);
    }

    const query = searchParams.toString();

    return request<{ success?: boolean; units?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
      `/units${query ? `?${query}` : ''}`,
    ).then((response) => {
      const rows = Array.isArray(response)
        ? response
        : Array.isArray(response.units)
          ? response.units
          : [];

      return rows.map((row) => ({
        id: String(row.id || ''),
        name: String(row.name || ''),
        createdAt: String(row.created_at || row.createdAt || ''),
      }));
    });
  },

  createUnit(name: string, restaurantId: string) {
    return request<{ success?: boolean; message?: string; unit?: Record<string, unknown> }>('/units', {
      method: 'POST',
      body: JSON.stringify({
        name,
        restaurant_id: restaurantId,
      }),
    }).then((response) => {
      const unit = response.unit || {};

      return {
        id: String(unit.id || ''),
        name: String(unit.name || name),
        createdAt: String(unit.created_at || unit.createdAt || ''),
      };
    });
  },

  updateUnit(id: string, name: string, restaurantId: string) {
    return request<{ success?: boolean; message?: string; unit?: Record<string, unknown> }>(`/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        restaurant_id: restaurantId,
      }),
    }).then((response) => {
      const unit = response.unit || {};

      return {
        id: String(unit.id || id),
        name: String(unit.name || name),
        createdAt: String(unit.created_at || unit.createdAt || ''),
      };
    });
  },

  async deleteUnit(id: string) {
    await request<{ success?: boolean; message?: string }>(`/units/${id}`, {
      method: 'DELETE',
    });
  },

  getUsers() {
    return request<{ success?: boolean; users?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>('/users').then((response) => {
      const rows = Array.isArray(response)
        ? response
        : Array.isArray(response.users)
          ? response.users
          : [];

      return rows.map((row) => normalizeStaffUser(row));
    });
  },

  getUserPermissions(id: string) {
    return request<{ success?: boolean; permissions?: unknown; role?: string }>(`/users/${id}/permissions`).then((response) => ({
      role: String(response.role || 'employee'),
      permissions: normalizePermissions(response.permissions),
    }));
  },

  async createUser(payload: {
    name: string;
    username: string;
    phone: string;
    password: string;
    role?: StaffRole;
    agentId?: string | null;
    permissions?: PermissionMap;
  }) {
    const permissions = payload.permissions || createEmptyPermissions();

    await request<{ success?: boolean }>('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        username: payload.username,
        email: payload.username,
        phone: payload.phone,
        password: payload.password,
        role: payload.role || 'employee',
        agent_id: payload.agentId || null,
        permissions: JSON.stringify(permissions),
      }),
    });

    const users = await api.getUsers();
    const createdUser = users.find((user) => user.phone === payload.phone || user.username === payload.username);

    if (!createdUser) {
      throw new Error('تمت إضافة المستخدم لكن تعذر جلب بياناته');
    }

    return createdUser;
  },

  async updateUserPermissions(id: string, role: string, permissions: PermissionMap) {
    await request<{ success?: boolean; role?: string; permissions?: unknown }>(`/users/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({
        role,
        permissions,
      }),
    });
  },

  async updateUser(payload: {
    id: string;
    name: string;
    username: string;
    phone: string;
    role: StaffRole;
  }) {
    await request<{ success?: boolean; message?: string }>(`/users/${payload.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: payload.name,
        username: payload.username,
        email: payload.username,
        phone: payload.phone,
        role: payload.role,
      }),
    });
  },

  async toggleUserStatus(id: string) {
    return request<{ success?: boolean; message?: string; status?: string }>(`/users/${id}/disable`, {
      method: 'PUT',
    });
  },

  async deleteUser(id: string) {
    await request<{ success?: boolean; message?: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  getRestaurants() {
    return request<RestaurantItem[] | WrappedCollectionResponse<RestaurantItem>>('/restaurants').then((response) =>
      extractCollection(response, 'restaurants').map((item) => normalizeRestaurant(item)),
    );
  },

  getRestaurantDetails(id: string) {
    return requestWithFallback<{ success?: boolean; restaurant?: RestaurantItem } | RestaurantItem>([
      `/restaurants/${id}`,
      `/restaurant/${id}`,
    ]).then((response) => {
      const restaurant = Array.isArray(response)
        ? null
        : 'restaurant' in response && response.restaurant
          ? response.restaurant
          : response;

      return normalizeRestaurant(restaurant as RestaurantItem);
    });
  },

  getSettings() {
    return request<SettingsData>('/settings');
  },

  getAgentInfo() {
    return requestWithFallback<{ success?: boolean; list?: Record<string, unknown>[] }>([
      '/agent-info',
      '/agents-info',
    ]).then((response) =>
      Array.isArray(response.list) ? response.list.map((row) => normalizeAgentInfoRow(row)) : [],
    );
  },

  async getLinkedAgentAccountId(agentId: string) {
    const rows = await api.getAgentInfo();
    const matchingRow = rows.find((row) => row.account_type === 'agent' && row.account_id === String(agentId));
    return matchingRow?.agent_account_id || null;
  },

  async getCommissions(filters?: { from?: string; to?: string; type?: string; restaurantId?: string; agentId?: string }) {
    const searchParams = new URLSearchParams();

    if (filters?.from) {
      searchParams.set('from', filters.from);
    }

    if (filters?.to) {
      searchParams.set('to', filters.to);
    }

    if (filters?.type) {
      searchParams.set('type', filters.type);
    }

    if (filters?.restaurantId) {
      searchParams.set('restaurant_id', filters.restaurantId);
    }

    if (filters?.agentId) {
      searchParams.set('account_id', filters.agentId);
    }

    const query = searchParams.toString();
    const suffix = query ? `?${query}` : '';

    try {
      const response = await requestWithFallback<{ success?: boolean; list?: Record<string, unknown>[] }>([
        `/reports/commissions${suffix}`,
        `/commissions${suffix}`,
      ]);

      return Array.isArray(response.list) ? response.list.map((row) => normalizeCommissionReportEntry(row)) : [];
    } catch {
      const [orders, agentInfoRows] = await Promise.all([
        api.getAgentOrders(filters?.restaurantId),
        api.getAgentInfo().catch(() => []),
      ]);

      const commissionRate = 0.05;
      const activeContract = pickActiveCommissionContract(agentInfoRows, filters?.agentId);

      return orders
        .filter((order) => isOrderWithinDateRange(order.createdAt, filters?.from, filters?.to))
        .map((order) => {
          const restaurantName = order.restaurants?.[0]?.name || null;
          const totalAmount = Number(order.total || 0);
          const restaurantCommission = calculateCommissionAmount(totalAmount, activeContract, commissionRate);

          return {
            orderDate: order.createdAt,
            captainName: order.captainName || null,
            restaurantName,
            orderId: order.id,
            totalAmount,
            restaurantCommission,
            captainCommission: 0,
          };
        });
    }
  },

  getAccountStatement(filters?: {
    accountId?: string;
    currencyId?: string;
    from?: string;
    to?: string;
    fromDate?: string;
    toDate?: string;
    reportMode?: 'summary' | 'details' | 'detailed';
    detailedType?: 'full' | 'no_open';
  }): Promise<AccountStatementResponse> {
    return requestWithFallback<{
      success?: boolean;
      opening_balance?: number | Record<string, number>;
      list?: Record<string, unknown>[];
    }>([
      '/reports/account-statement',
      '/account-statement',
    ], {
      method: 'POST',
      body: JSON.stringify({
        account_id: filters?.accountId,
        currency_id: filters?.currencyId,
        from_date: filters?.fromDate ?? filters?.from,
        to_date: filters?.toDate ?? filters?.to,
        report_mode: filters?.reportMode || 'detailed',
        detailed_type: filters?.detailedType || 'full',
      }),
    }).then((response) => ({
      openingBalance: response.opening_balance ?? 0,
      list: Array.isArray(response.list)
        ? response.list.map((row, index) => normalizeAccountStatementRow(row, index))
        : [],
    }));
  },

  createSettingItem(collection: 'categories' | 'types' | 'units', name: string) {
    return request<NamedItem>(`/settings/${collection}`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  updateSettingItem(collection: 'categories' | 'types' | 'units', id: string, name: string) {
    return request<NamedItem>(`/settings/${collection}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  deleteSettingItem(collection: 'categories' | 'types' | 'units', id: string) {
    return request<{ success: boolean }>(`/settings/${collection}/${id}`, {
      method: 'DELETE',
    });
  },
};
