import React, { useEffect, useRef, useState } from 'react';
import { Bell, User, Menu, LogOut } from 'lucide-react';
import { api } from '../lib/api';
import type { AppOrderNotification, AuthUser, RestaurantItem } from '../types';

interface HeaderProps {
  onMenuClick: () => void;
  onLogout?: () => void;
  user?: AuthUser | null;
  restaurant?: RestaurantItem | null;
  onRestaurantUpdate?: (restaurant: RestaurantItem) => void;
  notifications?: AppOrderNotification[];
  unreadNotificationsCount?: number;
  onMarkNotificationRead?: (notificationId: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onOpenOrdersPage?: () => void;
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

function getUserSecondaryLabel(user?: AuthUser | null): string {
  if (!user) {
    return 'مستخدم';
  }

  if (user.role && user.role !== 'agent') {
    return user.name || getRoleLabel(user.role);
  }

  return getRoleLabel(user.role);
}

function formatRelativeArabicTime(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'الآن';
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'الآن';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `قبل ${minutes} د`; 
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `قبل ${hours} س`;
  }

  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

export function Header({
  onMenuClick,
  onLogout,
  user,
  restaurant,
  onRestaurantUpdate,
  notifications = [],
  unreadNotificationsCount = 0,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenOrdersPage,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationsPanelRef = useRef<HTMLDivElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationsPanelRef.current) {
        return;
      }

      if (!notificationsPanelRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="bg-[#EAF7EE] border-b border-[#D5EEDC] px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
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
            type="button"
            onClick={onMenuClick}
            className="lg:hidden shrink-0 p-1.5 sm:p-2 text-green-800 hover:text-green-900 hover:bg-white/70 rounded-lg transition-colors"
            title="فتح القائمة"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 truncate">وكيل ابهام</h1>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 space-x-reverse shrink-0">
          <div className="relative" ref={notificationsPanelRef}>
            <button
              onClick={() => setShowNotifications((currentValue) => !currentValue)}
              className="relative p-1.5 sm:p-2 text-green-800 hover:text-green-900 hover:bg-white/70 rounded-lg transition-colors"
              title="الإشعارات"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-semibold">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed left-3 right-3 top-20 z-50 max-h-[70vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-96 sm:max-h-96">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-gray-900">الإشعارات</h3>
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    className="text-xs font-medium text-green-700 hover:text-green-800"
                  >
                    تعيين الكل كمقروء
                  </button>
                </div>

                <div className="max-h-[calc(70vh-56px)] overflow-y-auto overscroll-contain sm:max-h-96">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">لا توجد إشعارات حاليا</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <li key={notification.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onMarkNotificationRead?.(notification.id);
                              setShowNotifications(false);
                              onOpenOrdersPage?.();
                            }}
                            className={`w-full px-4 py-3 text-right transition-colors hover:bg-green-50 ${
                              notification.isRead ? 'bg-white' : 'bg-green-50/60'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {!notification.isRead && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-green-500"></span>}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                                <p className="mt-1 break-words text-xs leading-6 text-gray-600">{notification.message}</p>
                                <p className="mt-2 text-[11px] text-gray-400">{formatRelativeArabicTime(notification.createdAt)}</p>
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="p-1.5 sm:p-2 text-green-800 hover:text-green-900 hover:bg-white/70 rounded-lg transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="text-right hidden sm:block">
              <div className="text-xs sm:text-sm font-medium text-gray-900 max-w-32 lg:max-w-48 truncate">{restaurant?.name || 'المطعم'}</div>
              <div className="text-xs text-gray-500">{isUploadingLogo ? 'جاري حفظ الشعار...' : getUserSecondaryLabel(user)}</div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo || !restaurant}
              title="تغيير الشعار"
               className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-green-500 flex items-center justify-center ring-2 ring-white/80 hover:ring-green-200 transition-colors disabled:opacity-60"
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
