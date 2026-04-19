import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Save, Package, ArrowRight, LogOut, Moon, Sun, BellRing, Play } from 'lucide-react';
import { api } from '../lib/api';
import { playOrderAlertTone, type OrderAlertTone } from '../lib/orderAlert';
import type { NamedItem } from '../types';

interface SettingsProps {
  onBack: () => void;
  onLogout?: () => void;
  restaurantId?: string | null;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  orderAlertTone?: OrderAlertTone;
  onOrderAlertToneChange?: (tone: OrderAlertTone) => void;
  orderAlertEnabled?: boolean;
  onOrderAlertEnabledChange?: (enabled: boolean) => void;
}

export default function StoreSettings({
  onBack,
  onLogout,
  restaurantId,
  isDarkMode = false,
  onToggleDarkMode,
  orderAlertTone = 'classic',
  onOrderAlertToneChange,
  orderAlertEnabled = true,
  onOrderAlertEnabledChange,
}: SettingsProps) {
  const [units, setUnits] = useState<NamedItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NamedItem | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const response = await api.getUnits({ restaurantId: restaurantId || undefined });
        if (mounted) {
          setUnits(response);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الوحدات');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  const handleAdd = async () => {
    const name = formData.name.trim();
    if (!name) {
      return;
    }

    if (!restaurantId) {
      setError('لا يوجد متجر مرتبط لإضافة وحدة جديدة');
      return;
    }

    const newItem = await api.createUnit(name, restaurantId);
    setUnits((currentUnits) => [{ ...newItem, createdAt: newItem.createdAt || new Date().toISOString() }, ...currentUnits]);

    resetForm();
    setShowAddModal(false);
  };

  const handleEdit = async () => {
    if (!editingItem) {
      return;
    }

    const name = formData.name.trim();
    if (!name) {
      return;
    }

    if (!restaurantId) {
      setError('لا يوجد متجر مرتبط لتعديل الوحدة');
      return;
    }

    const updatedItem = await api.updateUnit(editingItem.id, name, restaurantId);
    setUnits((currentUnits) =>
      currentUnits.map((item) =>
        item.id === editingItem.id
          ? { ...item, ...updatedItem, createdAt: item.createdAt || updatedItem.createdAt }
          : item,
      ),
    );

    resetForm();
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    await api.deleteUnit(id);
    setUnits((currentUnits) => currentUnits.filter((item) => item.id !== id));
  };

  const openEditModal = (item: NamedItem) => {
    setEditingItem(item);
    setFormData({ name: item.name });
  };

  const resetForm = () => {
    setFormData({ name: '' });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    resetForm();
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-gray-100' : ''}`}>
      {/* زر الرجوع */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            isDarkMode
              ? 'text-gray-300 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-green-100'
          }`}
          title="العودة للصفحة الرئيسية"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="text-right">
          <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>إعدادات المطعم</h2>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>إدارة الوحدات مباشرة</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* قسم الوحدات */}
      <div className={`rounded-xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="p-4 sm:p-6">
          {/* شريط الإضافة */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                إدارة الوحدات
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                يمكنك إضافة وتعديل وحذف الوحدات حسب احتياجات متجرك
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              إضافة وحدة
            </button>
          </div>

          {/* قائمة العناصر */}
          {isLoading ? (
            <div className={`text-center py-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>جاري تحميل الوحدات...</div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {units.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg p-4 transition-colors ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className={`font-medium text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</h4>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {item.createdAt ? `تم الإنشاء: ${item.createdAt}` : 'وحدة مرتبطة بالمتجر'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          {!isLoading && units.length === 0 && (
            <div className="text-center py-12">
              <div className={`mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <Package className="h-12 w-12 mx-auto" />
              </div>
              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>لا توجد عناصر</h3>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>ابدأ بإضافة الوحدات لمتجرك</p>
            </div>
          )}
        </div>
      </div>

      {/* قسم الوضع الليلي */}
      {onToggleDarkMode && (
        <div className={`rounded-xl shadow-sm border p-4 sm:p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-base sm:text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                الوضع الليلي
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                تفعيل أو إيقاف المظهر الليلي للتطبيق بالكامل
              </p>
            </div>
            <button
              onClick={onToggleDarkMode}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDarkMode ? 'إيقاف الوضع الليلي' : 'تفعيل الوضع الليلي'}
            </button>
          </div>
        </div>
      )}

      {/* قسم نغمة الطلبات */}
      {(onOrderAlertToneChange || onOrderAlertEnabledChange) && (
        <div className={`rounded-xl shadow-sm border p-4 sm:p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={`text-base sm:text-lg font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <BellRing className="h-5 w-5" />
                تنبيه الطلبات المعلقة
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                اختر نغمة تنبيه عند وصول طلب جديد بحالة معلقة
              </p>
            </div>
            {onOrderAlertEnabledChange && (
              <button
                onClick={() => onOrderAlertEnabledChange(!orderAlertEnabled)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  orderAlertEnabled
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {orderAlertEnabled ? 'التنبيه مفعل' : 'التنبيه متوقف'}
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
            <select
              value={orderAlertTone}
              onChange={(event) => onOrderAlertToneChange?.(event.target.value as OrderAlertTone)}
              disabled={!orderAlertEnabled}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100 disabled:text-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 disabled:text-gray-400'
              }`}
            >
              <option value="classic">النغمة الكلاسيكية</option>
              <option value="bell">نغمة الجرس</option>
              <option value="soft">نغمة هادئة</option>
            </select>

            <button
              onClick={() => void playOrderAlertTone(orderAlertTone)}
              disabled={!orderAlertEnabled}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                orderAlertEnabled
                  ? isDarkMode
                    ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Play className="h-4 w-4" />
              تجربة النغمة
            </button>
          </div>
        </div>
      )}

      {/* قسم تسجيل الخروج */}
      {onLogout && (
        <div className={`rounded-xl shadow-sm border p-4 sm:p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-base sm:text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                تسجيل الخروج
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                تسجيل الخروج من حسابك والعودة لصفحة تسجيل الدخول
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}

      {/* نافذة الإضافة/التعديل */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className={`rounded-xl max-w-md w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 ${isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingItem ? 'تعديل وحدة' : 'إضافة وحدة جديدة'}
              </h3>
              <button
                onClick={closeModal}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className={`h-5 w-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  اسم الوحدة *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="أدخل اسم الوحدة"
                />
              </div>
            </div>

            <div className={`flex flex-col sm:flex-row justify-end gap-3 p-6 ${isDarkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'}`}>
              <button
                onClick={closeModal}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  isDarkMode
                    ? 'text-gray-200 bg-gray-700 hover:bg-gray-600'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={() => void (editingItem ? handleEdit() : handleAdd())}
                className="px-4 py-2 text-sm bg-green-500 text-white hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingItem ? 'حفظ التعديلات' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}