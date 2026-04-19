export type Page = 'dashboard' | 'orders' | 'reports' | 'products' | 'users' | 'settings';

export type OrderStatus = 'pending' | 'scheduled' | 'processing' | 'preparing' | 'confirmed' | 'ready' | 'delivering' | 'completed' | 'cancelled';

export interface OrderItem {
  id?: string;
  product_id?: string;
  restaurant_id?: string;
  name: string;
  quantity: number;
  price: number;
  subtotal?: number;
}

export interface OrderRestaurant {
  id: string;
  name: string;
  address?: string;
  restaurant_image?: string | null;
  items: OrderItem[];
  total?: number;
}

export interface Order {
  id: string;
  customer: string;
  phone: string;
  address: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
  note?: string;
  paymentMethod?: string;
  deliveryFee?: number;
  extraStoreFee?: number;
  discountAmount?: number;
  couponCode?: string | null;
  captainName?: string | null;
  branchName?: string | null;
  restaurants?: OrderRestaurant[];
  cancelReason?: string;
}

export interface Product {
  id: string;
  name: string;
  notes: string;
  price: number | null;
  image_url: string | null;
  is_available: boolean;
  is_parent?: boolean;
  categories: string;
  category_ids: string[];
  unit_id?: string | null;
  unit_name?: string | null;
  restaurant_id?: string | null;
  restaurant_name?: string | null;
  branch_id?: string | number | null;
  branch_name?: string | null;
  children_count?: number;
}

export interface RestaurantItem {
  id: string;
  name: string;
  image_url?: string | null;
  account_id?: string | null;
  agent_id?: string | null;
}

export interface NamedItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface SettingsData {
  storeName: string;
  companyName: string;
  commissionRate: number;
  categories: NamedItem[];
  types: NamedItem[];
  units: NamedItem[];
}

export interface CommissionReportEntry {
  orderDate: string;
  captainName: string | null;
  restaurantName: string | null;
  orderId: string;
  totalAmount: number;
  restaurantCommission: number;
  captainCommission: number;
}

export interface AgentInfoRow {
  id: string;
  account_type: string;
  account_id: string;
  group_id?: string | null;
  commission_type?: string | null;
  commission_value?: number;
  contract_start?: string | null;
  contract_end?: string | null;
  agent_account_id?: string | null;
  commission_account_id?: string | null;
  agent_name?: string | null;
  agent_account_name?: string | null;
  branch_name?: string | null;
  currency_code?: string | null;
  is_active?: boolean;
  is_valid_now?: boolean;
}

export interface AccountStatementRow {
  id: string;
  journalDate: string;
  referenceId: string;
  referenceType: string;
  notes: string;
  accountName: string;
  currencyName: string;
  debit: number;
  credit: number;
  balance: number;
  isOpening: boolean;
}

export interface AccountStatementResponse {
  openingBalance: number | Record<string, number>;
  list: AccountStatementRow[];
}

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string | null;
  branch_id?: string | number;
  branch_name?: string | null;
  is_admin_branch?: boolean;
  account_id?: string | null;
  image_url?: string | null;
  linked_agent_id?: string | null;
  linked_agent_name?: string | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface DashboardData {
  totalSales: number;
  newOrders: number;
  pendingOrders: number;
  growthRate: number;
  weeklySales: Array<{ name: string; value: number }>;
  orderDistribution: Array<{ name: string; value: number }>;
}

export type AppOrderNotificationType = 'new_pending' | 'delay_warning';

export interface AppOrderNotification {
  id: string;
  type: AppOrderNotificationType;
  orderId: string;
  orderSource: 'normal' | 'manual';
  restaurantId?: string | null;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'print';

export type PermissionMap = Record<string, Record<PermissionAction, boolean>>;

export interface StaffUser {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
  role: string;
  status?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  createdAt?: string | null;
  linked_agent_id?: string | null;
  linked_agent_name?: string | null;
  permissions: PermissionMap;
}

export type StaffRole = 'employee' | 'accountant' | 'cashier';