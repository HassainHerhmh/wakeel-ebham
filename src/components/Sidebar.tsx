import { BarChart3, ShoppingBag, FileText, ChefHat, X, Package, Settings as SettingsIcon, PanelRightClose, PanelRightOpen, Users as UsersIcon } from 'lucide-react';
import type { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  allowedPages?: Page[];
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  restaurantName: string;
  restaurantImageUrl?: string | null;
}

export function Sidebar({
  currentPage,
  setCurrentPage,
  allowedPages,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  restaurantName,
  restaurantImageUrl,
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: BarChart3 },
    { id: 'orders', label: 'الطلبات', icon: ShoppingBag },
    { id: 'products', label: 'المنتجات', icon: Package },
    { id: 'reports', label: 'التقارير', icon: FileText },
    { id: 'users', label: 'المستخدمين', icon: UsersIcon },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
  ];

  const visibleMenuItems = Array.isArray(allowedPages) && allowedPages.length > 0
    ? menuItems.filter((item) => allowedPages.includes(item.id as Page))
    : menuItems;

  const handleItemClick = (id: Page) => {
    setCurrentPage(id);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 right-0 z-50 w-[82vw] max-w-xs sm:w-72 ${isCollapsed ? 'lg:w-24' : 'lg:w-64'} bg-white border-r border-gray-200 h-screen
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-between items-center p-3 sm:p-4 border-b border-gray-200">
          <span className="text-base sm:text-lg font-bold text-gray-900">القائمة</span>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-green-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`relative p-4 sm:p-6 border-b border-gray-200 ${isCollapsed ? 'lg:px-3' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-between gap-3'}`}>
            <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'space-x-3 space-x-reverse flex-1 min-w-0'}`}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-green-500 flex items-center justify-center shrink-0">
                {restaurantImageUrl ? (
                  <img
                    src={restaurantImageUrl}
                    alt={restaurantName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                )}
              </div>
              {!isCollapsed && (
                <span className="text-base sm:text-xl font-bold text-gray-900 line-clamp-2 break-words">{restaurantName}</span>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors shrink-0"
                title="طي السايد بار"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            )}
          </div>

        </div>

        {isCollapsed && (
          <div className="hidden lg:flex justify-center border-b border-gray-200 px-3 py-3">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors"
              title="فتح السايد بار"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          </div>
        )}

      <nav className="mt-4 sm:mt-6">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id as Page)}
              className={`w-full flex items-center ${isCollapsed ? 'lg:justify-center lg:px-3' : 'space-x-3 space-x-reverse px-4 sm:px-6'} py-3 text-right hover:bg-gray-50 transition-colors ${
                currentPage === item.id
                  ? 'bg-green-50 text-green-600 border-r-2 border-green-600'
                  : 'text-gray-700'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              {!isCollapsed && <span className="text-sm sm:text-base font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>
      </div>
    </>
  );
}