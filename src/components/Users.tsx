import { useEffect, useState } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2, UserRound, UserX, X } from 'lucide-react';
import { api } from '../lib/api';
import { filterUsersByAgent, getEffectiveAgentId, getEffectiveAgentName } from '../lib/agentUserLinks';
import type { AuthUser, PermissionAction, PermissionMap, StaffRole, StaffUser } from '../types';

interface UsersProps {
  isDarkMode?: boolean;
  currentUser?: AuthUser | null;
}

const roleOptions: Array<{ value: StaffRole; label: string }> = [
  { value: 'employee', label: 'موظف' },
  { value: 'accountant', label: 'محاسب' },
  { value: 'cashier', label: 'كاشير' },
];

function getRoleLabel(role: string) {
  switch (role) {
    case 'employee':
      return 'موظف';
    case 'accountant':
      return 'محاسب';
    case 'cashier':
      return 'كاشير';
    default:
      return role;
  }
}

const permissionSections = [
  { key: 'dashboard', label: 'لوحة التحكم' },
  { key: 'users', label: 'المستخدمين' },
  { key: 'orders', label: 'الطلبات' },
  { key: 'manual_orders', label: 'الطلبات اليدوية' },
  { key: 'reports', label: 'التقارير' },
  { key: 'products', label: 'المنتجات' },
  { key: 'settings', label: 'الإعدادات' },
] as const;

const permissionActions: Array<{ key: PermissionAction; label: string }> = [
  { key: 'view', label: 'عرض' },
  { key: 'create', label: 'إضافة' },
  { key: 'edit', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
  { key: 'print', label: 'طباعة' },
];

function createEmptyPermissions(): PermissionMap {
  return permissionSections.reduce<PermissionMap>((accumulator, section) => {
    accumulator[section.key] = {
      view: false,
      create: false,
      edit: false,
      delete: false,
      print: false,
    };
    return accumulator;
  }, {} as PermissionMap);
}

export function Users({ isDarkMode = false, currentUser }: UsersProps) {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'employee' as StaffRole,
  });
  const [permissions, setPermissions] = useState<PermissionMap>(createEmptyPermissions());
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    username: '',
    phone: '',
    role: 'employee' as StaffRole,
  });
  const effectiveAgentId = getEffectiveAgentId(currentUser);
  const effectiveAgentName = getEffectiveAgentName(currentUser);

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      try {
        const response = await api.getUsers();
        if (mounted) {
          setUsers(filterUsersByAgent(response, effectiveAgentId));
          setError('');
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل المستخدمين');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      mounted = false;
    };
  }, [effectiveAgentId]);

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'employee',
    });
    setPermissions(createEmptyPermissions());
  };

  const handleTogglePermission = (section: string, action: PermissionAction) => {
    setPermissions((currentPermissions) => ({
      ...currentPermissions,
      [section]: {
        ...currentPermissions[section],
        [action]: !currentPermissions[section]?.[action],
      },
    }));
  };

  const handleCreateUser = async () => {
    if (!formData.name.trim() || !formData.username.trim() || !formData.phone.trim() || !formData.password.trim()) {
      setError('أكمل جميع الحقول المطلوبة');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('تأكيد كلمة المرور غير مطابق');
      return;
    }

    if (!effectiveAgentId) {
      setError('لا يمكن إضافة مستخدم بدون وكيل مرتبط');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const createdUser = await api.createUser({
        name: formData.name.trim(),
        username: formData.username.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        agentId: effectiveAgentId,
        permissions,
      });

      createdUser.linked_agent_id = effectiveAgentId;
      createdUser.linked_agent_name = effectiveAgentName;

      setUsers((currentUsers) => [createdUser, ...currentUsers]);
      setShowAddModal(false);
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر إضافة المستخدم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: StaffUser) => {
    const isDisabled = user.status === 'disabled';
    const confirmed = window.confirm(
      isDisabled
        ? `تأكيد تفعيل المستخدم ${user.name}؟`
        : `تأكيد تعطيل المستخدم ${user.name}؟`,
    );
    if (!confirmed) {
      return;
    }

    setActionUserId(user.id);
    setError('');

    try {
      const response = await api.toggleUserStatus(user.id);
      const nextStatus = response.status === 'disabled' ? 'disabled' : 'active';

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                status: nextStatus,
              }
            : currentUser,
        ),
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'تعذر تغيير حالة المستخدم');
    } finally {
      setActionUserId(null);
    }
  };

  const openEditModal = (user: StaffUser) => {
    setEditFormData({
      id: user.id,
      name: user.name,
      username: user.username || '',
      phone: user.phone || '',
      role: (['employee', 'accountant', 'cashier'].includes(user.role) ? user.role : 'employee') as StaffRole,
    });
    setShowEditModal(true);
    setError('');
  };

  const handleUpdateUser = async () => {
    if (!editFormData.name.trim() || !editFormData.username.trim() || !editFormData.phone.trim()) {
      setError('أكمل جميع حقول التعديل المطلوبة');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.updateUser({
        id: editFormData.id,
        name: editFormData.name.trim(),
        username: editFormData.username.trim(),
        phone: editFormData.phone.trim(),
        role: editFormData.role,
      });

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === editFormData.id
            ? {
                ...currentUser,
                name: editFormData.name.trim(),
                username: editFormData.username.trim(),
                phone: editFormData.phone.trim(),
                role: editFormData.role,
              }
            : currentUser,
        ),
      );

      setShowEditModal(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر تعديل المستخدم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: StaffUser) => {
    const confirmed = window.confirm(`تأكيد حذف المستخدم ${user.name}؟`);
    if (!confirmed) {
      return;
    }

    setActionUserId(user.id);
    setError('');

    try {
      await api.deleteUser(user.id);
      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'تعذر حذف المستخدم');
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-gray-100' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>المستخدمين</h2>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            {effectiveAgentName ? `المستخدمون المرتبطون بالوكيل ${effectiveAgentName}` : 'إضافة مستخدمين فرعيين وربط صلاحياتهم'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          إضافة مستخدم
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className={`rounded-xl border shadow-sm ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className={`py-12 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>جاري تحميل المستخدمين...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center">
              <UserRound className={`mx-auto mb-4 h-12 w-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-300'}`} />
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>لا يوجد مستخدمون مرتبطون بهذا الوكيل حتى الآن</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-700/60' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.username || 'بدون اسم مستخدم'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${user.status === 'disabled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {user.status === 'disabled' ? 'معطل' : 'نشط'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>رقم الجوال: {user.phone || '-'}</div>
                    <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>الدور: {getRoleLabel(user.role)}</div>
                    <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>الوكيل: {user.linked_agent_name || effectiveAgentName || '-'}</div>
                  </div>

                  <div className="mt-4 border-t border-dashed pt-4">
                    <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                      <ShieldCheck className="h-4 w-4" />
                      الصلاحيات المفعلة
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {permissionSections
                        .filter((section) => permissionActions.some((action) => user.permissions?.[section.key]?.[action.key]))
                        .map((section) => (
                          <span key={section.key} className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            {section.label}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-dashed pt-4">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      disabled={actionUserId === user.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Pencil className="h-4 w-4" />
                      تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleToggleUserStatus(user)}
                      disabled={actionUserId === user.id}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${user.status === 'disabled' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                    >
                      <UserX className="h-4 w-4" />
                      {actionUserId === user.id ? 'جاري التنفيذ...' : user.status === 'disabled' ? 'تفعيل' : 'تعطيل'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteUser(user)}
                      disabled={actionUserId === user.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className={`max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
              <div>
                <h3 className="text-lg font-bold">إضافة مستخدم فرعي</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>حدد بيانات المستخدم والصلاحيات الخاصة به</p>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg p-2 hover:bg-gray-100/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1fr_1.15fr]">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">الاسم</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    placeholder="اسم الموظف"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">اسم المستخدم</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(event) => setFormData((current) => ({ ...current, username: event.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    placeholder="اسم الدخول"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">رقم الجوال</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    placeholder="7xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">الدور</label>
                  <select
                    value={formData.role}
                    onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value as StaffRole }))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div className={`rounded-lg border px-3 py-3 text-sm ${isDarkMode ? 'border-gray-700 bg-gray-700/40 text-gray-200' : 'border-green-100 bg-green-50 text-green-800'}`}>
                  الوكيل المرتبط: {effectiveAgentName || 'غير محدد'}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">كلمة المرور</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    placeholder="********"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">تأكيد كلمة المرور</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(event) => setFormData((current) => ({ ...current, confirmPassword: event.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    placeholder="********"
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold">الصلاحيات</h4>
                <div className="space-y-3">
                  {permissionSections.map((section) => (
                    <div key={section.key} className={`rounded-xl border p-3 ${isDarkMode ? 'border-gray-700 bg-gray-700/40' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="mb-3 text-sm font-medium">{section.label}</div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {permissionActions.map((action) => (
                          <label
                            key={action.key}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-700'}`}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(permissions[section.key]?.[action.key])}
                              onChange={() => handleTogglePermission(section.key, action.key)}
                              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            {action.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`flex flex-col-reverse gap-3 border-t px-5 py-4 sm:flex-row sm:justify-end ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${isDarkMode ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleCreateUser()}
                disabled={isSubmitting}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-60"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className={`w-full max-w-xl rounded-2xl ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div>
                <h3 className="text-lg font-bold">تعديل المستخدم</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>تحديث بيانات المستخدم الفرعي</p>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} className="rounded-lg p-2 hover:bg-gray-100/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-2 block text-sm font-medium">الاسم</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(event) => setEditFormData((current) => ({ ...current, name: event.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">اسم المستخدم</label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(event) => setEditFormData((current) => ({ ...current, username: event.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">رقم الجوال</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(event) => setEditFormData((current) => ({ ...current, phone: event.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">الدور</label>
                <select
                  value={editFormData.role}
                  onChange={(event) => setEditFormData((current) => ({ ...current, role: event.target.value as StaffRole }))}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-green-500 focus:outline-none ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`flex flex-col-reverse gap-3 border-t px-5 py-4 sm:flex-row sm:justify-end ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${isDarkMode ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleUpdateUser()}
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
