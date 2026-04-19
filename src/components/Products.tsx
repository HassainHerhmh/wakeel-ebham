import React, { useEffect, useRef, useState } from 'react';
import { Plus, Search, CreditCard as Edit, Trash2, Camera, X, Save } from 'lucide-react';
import { api } from '../lib/api';
import { formatYemeniCurrency } from '../lib/currency';
import type { NamedItem, Product, RestaurantItem } from '../types';

const fallbackImage = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400';

interface ProductFormData {
  name: string;
  notes: string;
  price: string;
  isParent: boolean;
  childrenIds: string[];
  categoryIds: string[];
  unitId: string;
  restaurantId: string;
  imageUrl: string;
  available: boolean;
}

const defaultFormData: ProductFormData = {
  name: '',
  notes: '',
  price: '',
  isParent: false,
  childrenIds: [],
  categoryIds: [],
  unitId: '',
  restaurantId: '',
  imageUrl: '',
  available: true,
};

function isPersistableImageUrl(value: string): boolean {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return false;
  }

  return !normalizedValue.startsWith('blob:') && !normalizedValue.startsWith('data:');
}

interface ProductsProps {
  restaurantId?: string | null;
}

export function Products({ restaurantId }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [parentChildrenNames, setParentChildrenNames] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<NamedItem[]>([]);
  const [units, setUnits] = useState<NamedItem[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [productsResponse, categoriesResponse, restaurantsResponse] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getRestaurants(),
        ]);

        if (!mounted) {
          return;
        }

        setProducts(productsResponse);
        const parentChildrenEntries = await Promise.all(
          productsResponse
            .filter((product) => product.is_parent)
            .map(async (product) => {
              const children = await api.getProductChildren(product.id);
              return [product.id, children.map((child) => child.name)] as const;
            }),
        );

        if (!mounted) {
          return;
        }

        setParentChildrenNames(Object.fromEntries(parentChildrenEntries));
        setCategories(categoriesResponse);
        setRestaurants(restaurantsResponse);
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل المنتجات');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const uniqueRestaurantIds = Array.from(new Set(products.map((product) => product.restaurant_id).filter(Boolean))) as string[];
  const resolvedRestaurantId = restaurantId
    || (restaurants.length === 1
      ? restaurants[0].id
      : uniqueRestaurantIds.length === 1
        ? uniqueRestaurantIds[0]
        : '');

  useEffect(() => {
    let mounted = true;

    const loadUnits = async () => {
      try {
        const targetRestaurantId = formData.restaurantId || resolvedRestaurantId;
        const unitsResponse = await api.getUnits(
          targetRestaurantId
            ? { restaurantId: targetRestaurantId }
            : undefined,
        );

        if (mounted) {
          setUnits(unitsResponse);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الوحدات');
        }
      }
    };

    void loadUnits();

    return () => {
      mounted = false;
    };
  }, [formData.restaurantId, resolvedRestaurantId]);

  useEffect(() => {
    if (!resolvedRestaurantId) {
      return;
    }

    setFormData((currentFormData) => {
      if (currentFormData.restaurantId === resolvedRestaurantId) {
        return currentFormData;
      }

      return {
        ...currentFormData,
        restaurantId: resolvedRestaurantId,
      };
    });
  }, [resolvedRestaurantId]);

  const filteredProducts = products.filter((product) => {
    const searchValue = searchTerm.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchValue) || product.notes.toLowerCase().includes(searchValue);
    const matchesCategory = categoryFilter === 'all' || product.category_ids.includes(categoryFilter);
    const matchesRestaurant = !resolvedRestaurantId || String(product.restaurant_id || '') === String(resolvedRestaurantId);
    return matchesSearch && matchesCategory && matchesRestaurant;
  });

  const childProductOptions = products.filter((product) => {
    if (editingProduct && product.id === editingProduct.id) {
      return false;
    }

    const targetRestaurantId = formData.restaurantId || resolvedRestaurantId;
    if (targetRestaurantId && product.restaurant_id !== targetRestaurantId) {
      return false;
    }

    return !product.is_parent;
  });

  const reloadProducts = async () => {
    const productsResponse = await api.getProducts();
    setProducts(productsResponse);

    const parentChildrenEntries = await Promise.all(
      productsResponse
        .filter((product) => product.is_parent)
        .map(async (product) => {
          const children = await api.getProductChildren(product.id);
          return [product.id, children.map((child) => child.name)] as const;
        }),
    );

    setParentChildrenNames(Object.fromEntries(parentChildrenEntries));
  };

  const resetForm = () => {
    setFormData({
      ...defaultFormData,
      restaurantId: resolvedRestaurantId,
    });
    setSelectedImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    setError('');
    resetForm();
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setError('');
    resetForm();
    setShowAddModal(true);
  };

  const buildProductPayload = () => {
    const payload = new FormData();
    payload.append('name', formData.name.trim());
    payload.append('notes', formData.notes.trim());
    payload.append('price', formData.isParent ? '' : formData.price);
    payload.append('unit_id', formData.unitId);
    payload.append('restaurant_id', formData.restaurantId || resolvedRestaurantId);
    payload.append('category_ids', JSON.stringify(formData.categoryIds));
    payload.append('is_available', formData.available ? '1' : '0');
    payload.append('is_parent', formData.isParent ? '1' : '0');
    payload.append('children', JSON.stringify(formData.isParent ? formData.childrenIds : []));

    if (isPersistableImageUrl(formData.imageUrl)) {
      payload.append('image_url', formData.imageUrl.trim());
    }

    if (selectedImageFile) {
      payload.append('image', selectedImageFile);
    }

    return payload;
  };

  const handleAddProduct = async () => {
    if (!formData.name || (!formData.isParent && !formData.price) || !(formData.restaurantId || resolvedRestaurantId)) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await api.createProduct(buildProductPayload());
      await reloadProducts();
      closeModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر إضافة المنتج');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct || !formData.name || (!formData.isParent && !formData.price) || !(formData.restaurantId || resolvedRestaurantId)) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await api.updateProduct(editingProduct.id, buildProductPayload());
      await reloadProducts();
      closeModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر تعديل المنتج');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      setProducts((currentProducts) => currentProducts.filter((product) => product.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف المنتج');
    }
  };

  const openEditModal = async (product: Product) => {
    setError('');

    let childrenIds: string[] = [];
    if (product.is_parent) {
      try {
        const children = await api.getProductChildren(product.id);
        childrenIds = children.map((child) => child.id);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل أبناء المنتج');
      }
    }

    setEditingProduct(product);
    setShowAddModal(false);
    setFormData({
      name: product.name,
      notes: product.notes,
      price: product.price?.toString() || '',
      isParent: Boolean(product.is_parent),
      childrenIds,
      categoryIds: product.category_ids,
      unitId: product.unit_id || '',
      restaurantId: product.restaurant_id || '',
      imageUrl: product.image_url || '',
      available: product.is_available,
    });
    setSelectedImageFile(null);
    setImagePreview(product.image_url || '');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    const localObjectUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setImagePreview(localObjectUrl);
    setFormData((currentFormData) => ({
      ...currentFormData,
      imageUrl: localObjectUrl,
    }));
  };

  const toggleCategorySelection = (categoryId: string) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      categoryIds: currentFormData.categoryIds.includes(categoryId)
        ? currentFormData.categoryIds.filter((id) => id !== categoryId)
        : [...currentFormData.categoryIds, categoryId],
    }));
  };

  const toggleChildSelection = (childId: string) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      childrenIds: currentFormData.childrenIds.includes(childId)
        ? currentFormData.childrenIds.filter((id) => id !== childId)
        : [...currentFormData.childrenIds, childId],
    }));
  };

  const canSave = Boolean(formData.name && (formData.isParent || formData.price) && (formData.restaurantId || resolvedRestaurantId));

  const getParentChildrenLabel = (product: Product) => {
    const childrenNames = parentChildrenNames[product.id] || [];

    if (childrenNames.length === 0) {
      return 'لا يوجد أبناء';
    }

    return childrenNames.join('، ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">إدارة المنتجات</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="البحث في المنتجات..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pr-10 pl-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">جميع الفئات</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            إضافة منتج جديد
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">جاري تحميل المنتجات...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative">
                  <img
                    src={product.image_url || fallbackImage}
                    alt={product.name}
                    className="w-full h-32 sm:h-40 lg:h-48 object-cover"
                  />
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                    product.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.is_available ? 'متوفر' : 'غير متوفر'}
                  </div>
                  {product.is_parent && (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      منتج أب
                    </div>
                  )}
                </div>

                <div className="p-2 sm:p-3 lg:p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm lg:text-base line-clamp-1">{product.name}</h3>
                  <p className="text-gray-600 text-xs mb-2 line-clamp-2 hidden sm:block">{product.notes || 'لا يوجد وصف'}</p>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="text-green-600 font-bold text-xs sm:text-sm lg:text-base">
                      {product.is_parent ? 'منتج أب' : product.price !== null ? formatYemeniCurrency(product.price) : 'بدون سعر'}
                    </span>
                    <div className="text-left">
                      <div className="text-gray-500 text-xs hidden sm:block">{product.categories || 'بدون فئة'}</div>
                      <div className="text-gray-400 text-xs hidden lg:block line-clamp-2 max-w-36">
                        {product.is_parent ? getParentChildrenLabel(product) : product.unit_name || 'بدون وحدة'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => void openEditModal(product)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">تعديل</span>
                    </button>
                    <button
                      onClick={() => void handleDeleteProduct(product.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
            <p className="text-gray-600">لم يتم العثور على منتجات تطابق البحث</p>
          </div>
        )}
      </div>

      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم المنتج *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="أدخل اسم المنتج"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="أدخل وصف المنتج"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is-parent"
                  checked={formData.isParent}
                  onChange={(event) => setFormData({
                    ...formData,
                    isParent: event.target.checked,
                    price: event.target.checked ? '' : formData.price,
                    childrenIds: event.target.checked ? formData.childrenIds : [],
                  })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="is-parent" className="mr-2 text-sm text-gray-700">
                  هذا منتج أب
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.isParent ? 'السعر' : 'السعر *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                    disabled={formData.isParent}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder={formData.isParent ? 'المنتج الأب لا يملك سعراً' : '0.00'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفئات</label>
                  <div className="border border-gray-300 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500">لا توجد فئات متاحة</p>
                    ) : (
                      categories.map((category) => (
                        <label key={category.id} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.categoryIds.includes(category.id)}
                            onChange={() => toggleCategorySelection(category.id)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span>{category.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {formData.categoryIds.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      الفئات المختارة: {categories.filter((category) => formData.categoryIds.includes(category.id)).map((category) => category.name).join('، ')}
                    </p>
                  )}
                </div>
              </div>

              {formData.isParent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">المنتجات الأبناء</label>
                  <div className="border border-gray-300 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {childProductOptions.length === 0 ? (
                      <p className="text-sm text-gray-500">لا توجد منتجات متاحة للاختيار كأبناء</p>
                    ) : (
                      childProductOptions.map((product) => (
                        <label key={product.id} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.childrenIds.includes(product.id)}
                            onChange={() => toggleChildSelection(product.id)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span>{product.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {formData.childrenIds.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      الأبناء المختارون: {childProductOptions.filter((product) => formData.childrenIds.includes(product.id)).map((product) => product.name).join('، ')}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الوحدة</label>
                  <select
                    value={formData.unitId}
                    onChange={(event) => setFormData({ ...formData, unitId: event.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">اختر الوحدة</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
                {resolvedRestaurantId ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المطعم</label>
                    <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700">
                      {restaurants.find((restaurant) => restaurant.id === resolvedRestaurantId)?.name || editingProduct?.restaurant_name || 'تم تحديد المطعم تلقائياً'}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المطعم *</label>
                    <select
                      value={formData.restaurantId}
                      onChange={(event) => setFormData({ ...formData, restaurantId: event.target.value, childrenIds: [] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">اختر المطعم</option>
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">صورة المنتج</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2 border-2 border-dashed border-green-300"
                >
                  <Camera className="h-5 w-5" />
                  اختر صورة من الكاميرا أو الاستوديو
                </button>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSelectedImageFile(null);
                    setFormData({ ...formData, imageUrl: nextValue });
                    setImagePreview(nextValue);
                  }}
                  className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="أو ضع رابط الصورة هنا"
                />
                {(imagePreview || formData.imageUrl) && (
                  <div className="mt-3">
                    <img
                      src={imagePreview || formData.imageUrl}
                      alt="معاينة"
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available}
                  onChange={(event) => setFormData({ ...formData, available: event.target.checked })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="available" className="mr-2 text-sm text-gray-700">
                  المنتج متوفر للطلب
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => void (editingProduct ? handleEditProduct() : handleAddProduct())}
                disabled={isSaving || !canSave}
                className="px-4 py-2 text-sm bg-green-500 text-white hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'جاري الحفظ...' : editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
