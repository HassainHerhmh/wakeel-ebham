import React, { useRef, useState } from 'react';
import { Bell, User, Menu, LogOut } from 'lucide-react';
import { api } from '../lib/api';
import type { AuthUser, RestaurantItem } from '../types';

interface HeaderProps {
  onMenuClick: () => void;
  onLogout?: () => void;
  user?: AuthUser | null;
  restaurant?: RestaurantItem | null;
  onRestaurantUpdate?: (restaurant: RestaurantItem) => void;
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case 'agent':
      return 'وكيل';
    case 'admin':
      return 'مدير';
    case 'captain':
      return 'كابتن';
    case 'customer':
      return 'عميل';
    default:
      return role || 'مستخدم';
  }
}

export function Header({ onMenuClick, onLogout, user, restaurant, onRestaurantUpdate }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');

  const handleLogoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !restaurant || !onRestaurantUpdate) {
      return;
    }

    setIsUploadingLogo(true);
    setLogoError('');

    try {
      const nextImageUrl = await api.updateRestaurantLogo(restaurant.id, file);

      onRestaurantUpdate({
        ...restaurant,
        image_url: nextImageUrl,
      });
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'تعذر حفظ الشعار');
    } finally {
      setIsUploadingLogo(false);
      event.target.value = '';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoSelect}
        className="hidden"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-green-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 truncate">نظام التاجر - إبهام للتوصيل</h1>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 space-x-reverse shrink-0">
          <button className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-green-100 rounded-lg transition-colors">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-green-100 rounded-lg transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="text-right hidden sm:block">
              <div className="text-xs sm:text-sm font-medium text-gray-900 max-w-32 lg:max-w-48 truncate">{restaurant?.name || 'المطعم'}</div>
              <div className="text-xs text-gray-500">{isUploadingLogo ? 'جاري حفظ الشعار...' : getRoleLabel(user?.role)}</div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo || !restaurant}
              title="تغيير الشعار"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-green-500 flex items-center justify-center ring-2 ring-green-100 hover:ring-green-300 transition-colors disabled:opacity-60"
            >
              {restaurant?.image_url ? (
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name || 'شعار المطعم'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
      {logoError && (
        <div className="mt-3 text-xs text-red-600 text-right">
          {logoError}
        </div>
      )}
    </header>
  );
}