import React, { useState } from 'react';
import { Eye, EyeOff, ChefHat, Lock, User } from 'lucide-react';

interface LoginProps {
  onLogin: (phone: string, password: string) => Promise<string | null>;
}

export function Login({ onLogin }: LoginProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const loginError = await onLogin(phone, password);

    if (loginError) {
      setError(loginError);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-3 sm:p-4" dir="rtl">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* شعار التطبيق */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-xl sm:rounded-2xl shadow-lg mb-3 sm:mb-4">
            <ChefHat className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">نظام التاجر </h1>
          <p className="text-sm sm:text-base text-gray-600">شركة إبهام للتوصيل</p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">تسجيل الدخول</h2>
            <p className="text-gray-600 text-xs sm:text-sm">أدخل بياناتك للوصول إلى حسابك</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* حقل رقم الهاتف */}
            <div>
              <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="أدخل رقم الهاتف"
                  required
                />
              </div>
            </div>

            {/* حقل كلمة المرور */}
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-9 sm:pr-10 pl-10 sm:pl-12 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="أدخل كلمة المرور"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* رسالة الخطأ */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3">
                <p className="text-red-700 text-xs sm:text-sm text-center">{error}</p>
              </div>
            )}

            {/* زر تسجيل الدخول */}
            <button
              type="submit"
              disabled={isLoading || !phone || !password}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 sm:py-3 px-4 text-sm sm:text-base rounded-lg sm:rounded-xl font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs sm:text-sm">جاري تسجيل الدخول...</span>
                </div>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

        </div>

        {/* تذييل */}
        <div className="text-center mt-6 sm:mt-8">
          <p className="text-gray-500 text-xs sm:text-sm">
            © 2024 إبهام للتوصيل. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </div>
  );
}