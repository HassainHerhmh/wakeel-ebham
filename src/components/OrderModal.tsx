import { useEffect, useState } from 'react';
import { X, Package, Edit, Trash2, Save, XCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import type { Order, OrderItem } from '../types';

interface OrderModalProps {
  order: Order;
  onClose: () => void;
  onUpdateOrder: (updatedOrder: Order) => Promise<void>;
}

export function OrderModal({ order, onClose, onUpdateOrder }: OrderModalProps) {
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [editingItems, setEditingItems] = useState<OrderItem[]>(order.items);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadOrderDetails = async () => {
      try {
        const details = await api.getOrderDetails(order.id);
        if (!mounted) {
          return;
        }

        setCurrentOrder(details);
        setEditingItems(details.items);
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل تفاصيل الطلب');
        }
      } finally {
        if (mounted) {
          setIsLoadingDetails(false);
        }
      }
    };

    void loadOrderDetails();

    return () => {
      mounted = false;
    };
  }, [order.id]);

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

  const getStatusActionIcon = (status: Order['status']) => {
    switch (status) {
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const commitOrder = async (updatedOrder: Order, closeAfterSave = false) => {
    setIsSaving(true);
    setError('');
    try {
      await onUpdateOrder(updatedOrder);
      setCurrentOrder(updatedOrder);
      setEditingItems(updatedOrder.items);
      if (closeAfterSave) {
        onClose();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ الطلب');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    if (newStatus === 'cancelled') {
      setShowCancelModal(true);
      return;
    }

    const updatedOrder = await api.updateOrderStatus(currentOrder.id, newStatus);
    await commitOrder(updatedOrder, true);
  };

  const handleCancelOrder = async () => {
    const cancelReason = selectedCancelReason === 'أخرى'
      ? customCancelReason.trim()
      : selectedCancelReason.trim();

    if (!cancelReason) {
      return;
    }

    const updatedOrder = await api.cancelOrder(currentOrder.id, cancelReason);
    await commitOrder(updatedOrder, true);
    setShowCancelModal(false);
    setSelectedCancelReason('');
    setCustomCancelReason('');
  };

  const handleItemQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }

    const updatedItems = [...editingItems];
    updatedItems[index] = { ...updatedItems[index], quantity: newQuantity };
    setEditingItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = editingItems.filter((_, itemIndex) => itemIndex !== index);
    setEditingItems(updatedItems);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError('');

    try {
      const originalItems = currentOrder.items;
      let latestOrder = currentOrder;

      for (const item of originalItems) {
        const editedItem = editingItems.find((candidate) => candidate.id === item.id);

        if (!editedItem && item.id) {
          latestOrder = await api.deleteOrderItem(item.id, currentOrder.id);
          continue;
        }

        if (editedItem && item.id && editedItem.quantity !== item.quantity) {
          latestOrder = await api.updateOrderItem(item.id, editedItem.quantity, currentOrder.id);
        }
      }

      await commitOrder(latestOrder);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر تعديل عناصر الطلب');
      setIsSaving(false);
    }
  };

  const cancelReasons = [
    'نفاد المنتج من المخزون',
    'عدم توفر خدمة التوصيل للمنطقة',
    'طلب العميل إلغاء الطلب',
    'مشكلة في الدفع',
    'خطأ في تفاصيل الطلب',
    'أخرى',
  ];

  const editableStatuses: Array<{ value: Order['status']; label: string }> = [
    { value: 'preparing', label: 'قيد التحضير' },
  ];

  const visibleStatusActions = editableStatuses.filter((statusOption) => {
    if (statusOption.value === 'preparing' && !['confirmed', 'processing'].includes(currentOrder.status)) {
      return false;
    }

    return true;
  });

  const getItemSubtotal = (item: OrderItem, useLiveQuantity = false) =>
    useLiveQuantity ? item.quantity * item.price : item.subtotal ?? item.quantity * item.price;

  const getItemsTotal = (items: OrderItem[], useLiveQuantity = false) =>
    items.reduce((sum, item) => sum + getItemSubtotal(item, useLiveQuantity), 0);

  const formatYemeniCurrency = (value: number) => `${value.toFixed(2)} ريال يمني`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">تفاصيل الطلب #{currentOrder.id}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(currentOrder.createdAt).toLocaleDateString('en-GB')} - {new Date(currentOrder.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {isLoadingDetails ? (
            <div className="text-center py-12 text-gray-500">جاري تحميل تفاصيل الطلب...</div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h4 className="font-semibold text-gray-900">حالة الطلب</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentOrder.status)}`}>
                    {getStatusText(currentOrder.status)}
                  </span>
                </div>

                {currentOrder.status === 'cancelled' && currentOrder.cancelReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-red-800">سبب الإلغاء:</p>
                    <p className="text-sm text-red-700">{currentOrder.cancelReason}</p>
                  </div>
                )}

                {currentOrder.status !== 'cancelled' && currentOrder.status !== 'completed' && (
                  <div className="flex flex-wrap gap-2">
                    {visibleStatusActions.map((statusOption) => (
                      <button
                        key={statusOption.value}
                        onClick={() => void handleStatusUpdate(statusOption.value)}
                        className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm inline-flex items-center gap-2"
                        disabled={currentOrder.status === statusOption.value || isSaving}
                      >
                        {getStatusActionIcon(statusOption.value)}
                        {statusOption.label}
                      </button>
                    ))}
                    <button
                      onClick={() => void handleStatusUpdate('cancelled')}
                      className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      disabled={isSaving}
                    >
                      إلغاء الطلب
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    المنتجات المطلوبة
                  </h4>
                  {currentOrder.status !== 'cancelled' && currentOrder.status !== 'completed' && (
                    <button
                      onClick={() => {
                        if (isEditing) {
                          void handleSaveChanges();
                        } else {
                          setIsEditing(true);
                          setEditingItems([...currentOrder.items]);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm"
                      disabled={isSaving}
                    >
                      {isEditing ? (
                        <>
                          <Save className="h-4 w-4" />
                          حفظ التعديلات
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4" />
                          تعديل الطلب
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">المنتج</th>
                          <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">الكمية</th>
                          <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">السعر</th>
                          <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">المجموع</th>
                          {isEditing && (
                            <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">الإجراءات</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(isEditing ? editingItems : currentOrder.items).map((item, index) => (
                          <tr key={item.id || `${item.name}-${index}`} className="border-b border-gray-200">
                            <td className="py-3 px-2 sm:px-4 font-medium text-gray-900 text-sm">{item.name}</td>
                            <td className="py-3 px-2 sm:px-4 text-gray-700 text-sm">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleItemQuantityChange(index, item.quantity - 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                                    disabled={item.quantity <= 1}
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center">{item.quantity}</span>
                                  <button
                                    onClick={() => handleItemQuantityChange(index, item.quantity + 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                item.quantity
                              )}
                            </td>
                              <td className="py-3 px-2 sm:px-4 text-gray-700 text-sm">{formatYemeniCurrency(item.price)}</td>
                              <td className="py-3 px-2 sm:px-4 font-medium text-gray-900 text-sm">{formatYemeniCurrency(getItemSubtotal(item, isEditing))}</td>
                            {isEditing && (
                              <td className="py-3 px-2 sm:px-4">
                                <button
                                  onClick={() => handleRemoveItem(index)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  disabled={editingItems.length <= 1 || isSaving}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        <tr className="bg-green-50">
                          <td colSpan={isEditing ? 4 : 3} className="py-3 px-2 sm:px-4 font-bold text-gray-900 text-sm">الإجمالي</td>
                          <td className="py-3 px-2 sm:px-4 font-bold text-green-600 text-base sm:text-lg">
                            {formatYemeniCurrency(isEditing ? getItemsTotal(editingItems, true) : getItemsTotal(currentOrder.items))}
                          </td>
                          {isEditing && <td></td>}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">إلغاء الطلب</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">يرجى اختيار سبب إلغاء الطلب:</p>

              <div className="space-y-2">
                {cancelReasons.map((reason) => (
                  <label key={reason} className="flex items-center">
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={selectedCancelReason === reason}
                      onChange={(event) => setSelectedCancelReason(event.target.value)}
                      className="ml-2 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{reason}</span>
                  </label>
                ))}
              </div>

              {selectedCancelReason === 'أخرى' && (
                <textarea
                  placeholder="اكتب السبب..."
                  value={customCancelReason}
                  onChange={(event) => setCustomCancelReason(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => void handleCancelOrder()}
                disabled={isSaving || !(selectedCancelReason === 'أخرى' ? customCancelReason.trim() : selectedCancelReason.trim())}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
