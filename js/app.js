// تطبيق مطعم الديار - نسخة HTML/JS
class RestaurantApp {
  constructor() {
    this.isAuthenticated = false;
    this.currentPage = 'dashboard';
    this.sidebarOpen = false;
    this.selectedOrder = null;
    this.showAddModal = false;
    this.editingProduct = null;
    this.reportView = 'summary';
    this.selectedPeriod = 'monthly';
    
    // بيانات وهمية
    this.initMockData();
    
    // تهيئة التطبيق
    this.init();
  }

  initMockData() {
    this.orders = [
      {
        id: '1001',
        customer: 'سارة أحمد',
        phone: '0501234567',
        address: 'الرياض، حي النخيل، شارع الملك فهد',
        total: 125.50,
        status: 'pending',
        items: [
          { name: 'برجر دجاج', quantity: 2, price: 35 },
          { name: 'بطاطس مقلية', quantity: 2, price: 15 },
          { name: 'كوكا كولا', quantity: 2, price: 8 },
          { name: 'آيس كريم', quantity: 1, price: 12.50 },
        ],
        createdAt: '2024-01-15T14:30:00',
      },
      {
        id: '1002',
        customer: 'خالد محمد',
        phone: '0507654321',
        address: 'جدة، حي الحمراء، طريق الملك عبدالعزيز',
        total: 89.75,
        status: 'confirmed',
        items: [
          { name: 'شاورما دجاج', quantity: 3, price: 25 },
          { name: 'سلطة تبولة', quantity: 1, price: 14.75 },
        ],
        createdAt: '2024-01-15T13:15:00',
      }
    ];

    this.products = [
      {
        id: '1',
        name: 'برجر دجاج كلاسيك',
        description: 'برجر دجاج مشوي مع الخس والطماطم والمايونيز',
        price: 35.00,
        category: 'برجر',
        type: 'غداء',
        unit: 'حبة',
        image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=400',
        available: true,
        createdAt: '2024-01-10',
      },
      {
        id: '2',
        name: 'بيتزا مارجريتا',
        description: 'بيتزا كلاسيكية بالجبن والطماطم والريحان',
        price: 45.00,
        category: 'بيتزا',
        type: 'عشاء',
        unit: 'حبة',
        image: 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400',
        available: true,
        createdAt: '2024-01-08',
      }
    ];

    this.categories = ['برجر', 'بيتزا', 'شاورما', 'سلطات', 'مشروبات', 'حلويات'];
    this.types = ['فطار', 'غداء', 'عشاء', 'وجبة خفيفة', 'حلويات', 'مشروبات'];
    this.units = ['حبة', 'طبق', 'كوب', 'نصف كوب', 'ملعقة', 'قطعة', 'شريحة', 'كيلو', 'جرام', '500 جرام', 'لتر', 'نصف لتر'];
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    const app = document.getElementById('app');
    
    if (!this.isAuthenticated) {
      app.innerHTML = this.renderLogin();
    } else {
      app.innerHTML = this.renderMainApp();
    }
    
    this.attachEventListeners();
  }

  renderLogin() {
    return `
      <div class="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-3 sm:p-4">
        <div class="w-full max-w-sm sm:max-w-md">
          <!-- شعار التطبيق -->
          <div class="text-center mb-6 sm:mb-8">
            <div class="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl shadow-lg mb-3 sm:mb-4">
              <i data-lucide="chef-hat" class="h-6 w-6 sm:h-8 sm:w-8 text-white"></i>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">نظام التاجر</h1>
            <p class="text-sm sm:text-base text-gray-600">مطعم الديار</p>
          </div>

          <!-- نموذج تسجيل الدخول -->
          <div class="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <div class="mb-6">
              <h2 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">تسجيل الدخول</h2>
              <p class="text-gray-600 text-xs sm:text-sm">أدخل بياناتك للوصول إلى حسابك</p>
            </div>

            <form id="loginForm" class="space-y-4 sm:space-y-6">
              <!-- حقل اسم المستخدم -->
              <div>
                <label for="username" class="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  اسم المستخدم
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <i data-lucide="user" class="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"></i>
                  </div>
                  <input
                    id="username"
                    type="text"
                    class="w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="أدخل اسم المستخدم"
                    required
                  />
                </div>
              </div>

              <!-- حقل كلمة المرور -->
              <div>
                <label for="password" class="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <i data-lucide="lock" class="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"></i>
                  </div>
                  <input
                    id="password"
                    type="password"
                    class="w-full pr-9 sm:pr-10 pl-10 sm:pl-12 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                  <button
                    type="button"
                    id="togglePassword"
                    class="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i data-lucide="eye" class="h-4 w-4 sm:h-5 sm:w-5"></i>
                  </button>
                </div>
              </div>

              <!-- رسالة الخطأ -->
              <div id="errorMessage" class="hidden bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3">
                <p class="text-red-700 text-xs sm:text-sm text-center"></p>
              </div>

              <!-- زر تسجيل الدخول -->
              <button
                type="submit"
                class="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 sm:py-3 px-4 text-sm sm:text-base rounded-lg sm:rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                تسجيل الدخول
              </button>
            </form>

            <!-- معلومات إضافية -->
            <div class="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
              <div class="bg-orange-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <h3 class="text-xs sm:text-sm font-medium text-orange-800 mb-2">بيانات تجريبية:</h3>
                <div class="text-xs text-orange-700 space-y-0.5 sm:space-y-1">
                  <p><strong>اسم المستخدم:</strong> 770067118</p>
                  <p><strong>كلمة المرور:</strong> 770067118</p>
                </div>
              </div>
            </div>
          </div>

          <!-- تذييل -->
          <div class="text-center mt-6 sm:mt-8">
            <p class="text-gray-500 text-xs sm:text-sm">
              © 2024 مطعم الديار. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  renderMainApp() {
    return `
      <div class="min-h-screen bg-gray-50 flex">
        ${this.renderSidebar()}
        <div class="flex-1 flex flex-col">
          ${this.renderHeader()}
          <main class="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
            ${this.renderCurrentPage()}
          </main>
        </div>
      </div>
      ${this.selectedOrder ? this.renderOrderModal() : ''}
      ${this.showAddModal || this.editingProduct ? this.renderProductModal() : ''}
    `;
  }

  renderSidebar() {
    const menuItems = [
      { id: 'dashboard', label: 'لوحة التحكم', icon: 'bar-chart-3' },
      { id: 'orders', label: 'الطلبات', icon: 'shopping-bag' },
      { id: 'products', label: 'المنتجات', icon: 'package' },
      { id: 'reports', label: 'التقارير', icon: 'file-text' },
      { id: 'settings', label: 'الإعدادات', icon: 'settings' },
    ];

    return `
      <!-- Mobile overlay -->
      ${this.sidebarOpen ? '<div class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onclick="app.closeSidebar()"></div>' : ''}
      
      <!-- Sidebar -->
      <div class="fixed lg:static inset-y-0 right-0 z-50 w-64 sm:w-72 lg:w-64 bg-white border-r border-gray-200 h-screen transform transition-transform duration-300 ease-in-out lg:transform-none ${this.sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}">
        <!-- Mobile close button -->
        <div class="lg:hidden flex justify-between items-center p-3 sm:p-4 border-b border-gray-200">
          <span class="text-base sm:text-lg font-bold text-gray-900">القائمة</span>
          <button onclick="app.closeSidebar()" class="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-orange-100 rounded-lg transition-colors">
            <i data-lucide="x" class="h-5 w-5"></i>
          </button>
        </div>
        
        <div class="p-4 sm:p-6 border-b border-gray-200">
          <div class="flex items-center space-x-3 space-x-reverse">
            <div class="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <i data-lucide="chef-hat" class="h-4 w-4 sm:h-5 sm:w-5 text-white"></i>
            </div>
            <span class="text-lg sm:text-xl font-bold text-gray-900">مطعم الديار</span>
          </div>
        </div>
        <nav class="mt-4 sm:mt-6">
          ${menuItems.map(item => `
            <button
              onclick="app.setCurrentPage('${item.id}')"
              class="w-full flex items-center space-x-3 space-x-reverse px-4 sm:px-6 py-3 text-right hover:bg-gray-50 transition-colors ${
                this.currentPage === item.id
                  ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-600'
                  : 'text-gray-700'
              }"
            >
              <i data-lucide="${item.icon}" class="h-4 w-4 sm:h-5 sm:w-5"></i>
              <span class="text-sm sm:text-base font-medium">${item.label}</span>
            </button>
          `).join('')}
        </nav>
      </div>
    `;
  }

  renderHeader() {
    return `
      <header class="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              onclick="app.openSidebar()"
              class="lg:hidden p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <i data-lucide="menu" class="h-5 w-5 sm:h-6 sm:w-6"></i>
            </button>
            <h1 class="text-base sm:text-lg lg:text-xl font-bold text-gray-900">نظام التاجر</h1>
          </div>
          <div class="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 space-x-reverse">
            <button class="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-orange-100 rounded-lg transition-colors">
              <i data-lucide="bell" class="h-4 w-4 sm:h-5 sm:w-5"></i>
              <span class="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            <button 
              onclick="app.logout()"
              class="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-orange-100 rounded-lg transition-colors"
              title="تسجيل الخروج"
            >
              <i data-lucide="log-out" class="h-4 w-4 sm:h-5 sm:w-5"></i>
            </button>
            <div class="flex items-center space-x-2 space-x-reverse">
              <div class="text-right hidden sm:block">
                <div class="text-xs sm:text-sm font-medium text-gray-900">محمد أحمد</div>
                <div class="text-xs text-gray-500">مدير المتجر</div>
              </div>
              <div class="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <i data-lucide="user" class="h-3 w-3 sm:h-4 sm:w-4 text-white"></i>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  renderCurrentPage() {
    switch (this.currentPage) {
      case 'dashboard':
        return this.renderDashboard();
      case 'orders':
        return this.renderOrders();
      case 'products':
        return this.renderProducts();
      case 'reports':
        return this.renderReports();
      case 'settings':
        return this.renderSettings();
      default:
        return this.renderDashboard();
    }
  }

  renderDashboard() {
    const stats = [
      { title: 'إجمالي المبيعات', value: '12,345 ر.س', change: '+١٢.٥%', changeType: 'increase', icon: 'dollar-sign' },
      { title: 'الطلبات الجديدة', value: '87', change: '+٨.٢%', changeType: 'increase', icon: 'shopping-cart' },
      { title: 'الطلبات المعلقة', value: '23', change: '-٤.١%', changeType: 'decrease', icon: 'clock' },
      { title: 'معدل النمو', value: '15.3%', change: '+٢.٧%', changeType: 'increase', icon: 'trending-up' },
    ];

    return `
      <div class="space-y-6">
        <div>
          <h2 class="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">لوحة التحكم - مطعم الديار</h2>
          <p class="text-sm sm:text-base text-gray-600">نظرة عامة على أداء المطعم اليوم</p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          ${stats.map(stat => `
            <div class="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-600 text-xs sm:text-sm font-medium leading-tight">${stat.title}</p>
                  <p class="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 mt-1">${stat.value}</p>
                </div>
                <div class="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i data-lucide="${stat.icon}" class="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600"></i>
                </div>
              </div>
              <div class="flex items-center mt-2 sm:mt-3 lg:mt-4">
                <i data-lucide="${stat.changeType === 'increase' ? 'trending-up' : 'trending-down'}" class="h-3 w-3 sm:h-4 sm:w-4 ${stat.changeType === 'increase' ? 'text-green-500' : 'text-red-500'} ml-1"></i>
                <span class="text-xs sm:text-sm font-medium ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}">${stat.change}</span>
                <span class="text-gray-500 text-xs mr-1 hidden sm:inline">من الشهر الماضي</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div class="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
            <h3 class="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">المبيعات الأسبوعية</h3>
            <div class="space-y-2 sm:space-y-3">
              ${['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day, index) => {
                const values = [4000, 3000, 5000, 2780, 1890, 2390, 3490];
                const maxValue = Math.max(...values);
                const value = values[index];
                return `
                  <div class="flex items-center">
                    <div class="w-10 sm:w-12 lg:w-16 text-xs text-gray-600 flex-shrink-0">${day}</div>
                    <div class="flex-1 mx-2 sm:mx-3">
                      <div class="bg-gray-200 rounded-full h-1.5 sm:h-2">
                        <div class="bg-orange-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" style="width: ${(value / maxValue) * 100}%"></div>
                      </div>
                    </div>
                    <div class="w-10 sm:w-12 lg:w-16 text-xs font-medium text-gray-900 text-left flex-shrink-0">${value.toLocaleString()}</div>
                  </div>
            <!-- فلاتر التقرير محسنة للجوال -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-6">
                <!-- تبويبات نوع التقرير -->
                <div class="flex bg-gray-100 rounded-lg p-1 mb-4 w-full">
                    <button onclick="setReportView('summary')" class="report-tab flex-1 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 bg-orange-500 text-white shadow-sm">
                        <i data-lucide="trending-up" class="h-3 w-3 sm:h-4 sm:w-4"></i>
                        <span class="hidden xs:inline">ملخص التقارير</span>
                        <span class="xs:hidden">ملخص</span>
                    </button>
                    <button onclick="setReportView('statement')" class="report-tab flex-1 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900">
                        <i data-lucide="file-text" class="h-3 w-3 sm:h-4 sm:w-4"></i>
                        <span class="hidden xs:inline">كشف الحساب</span>
                        <span class="xs:hidden">كشف</span>
                    </button>
                </div>

                <!-- فلاتر الفترة للجوال -->
                <div class="space-y-4">
                    <div class="flex items-center gap-2" id="period-filter">
                        <i data-lucide="filter" class="h-4 w-4 text-gray-500 flex-shrink-0"></i>
                        <span class="text-xs sm:text-sm font-medium text-gray-700">نوع التقرير:</span>
                    </div>
                    <div class="grid grid-cols-3 bg-gray-100 rounded-lg p-1 gap-1">
                        <button onclick="setSelectedPeriod('daily')" class="period-btn px-2 py-2 rounded-md text-xs font-medium transition-colors text-gray-600 hover:text-gray-900">يومي</button>
                        <button onclick="setSelectedPeriod('weekly')" class="period-btn px-2 py-2 rounded-md text-xs font-medium transition-colors text-gray-600 hover:text-gray-900">أسبوعي</button>
                        <button onclick="setSelectedPeriod('monthly')" class="period-btn px-2 py-2 rounded-md text-xs font-medium transition-colors bg-orange-500 text-white shadow-sm">شهري</button>
                    </div>

                    <!-- التاريخ المخصص -->
                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <i data-lucide="calendar" class="h-4 w-4 text-gray-500 flex-shrink-0"></i>
                            <span class="text-xs sm:text-sm font-medium text-gray-700">الفترة المخصصة:</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">من تاريخ</label>
                                <input type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">إلى تاريخ</label>
                                <input type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                            </div>
                        </div>
                    </div>

                    <!-- زر التصدير -->
                    <button onclick="exportToPDF()" class="w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                        <i data-lucide="download" class="h-4 w-4"></i>
                        تصدير PDF
                    </button>
                </div>
            </div>
          <p class="text-gray-600">إدارة جميع الطلبات الواردة من العملاء</p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6" id="summary-stats">
                    <div class="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-6">
              <i data-lucide="search" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5"></i>
              <input
                                <p class="text-gray-600 text-xs sm:text-sm font-medium leading-tight">إجمالي المبيعات</p>
                                <p class="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 mt-1">34,567.80 ر.س</p>
                class="w-full pr-10 pl-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div class="flex items-center gap-3">
              <i data-lucide="filter" class="text-gray-400 h-5 w-5"></i>
              <select class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                <option value="all">جميع الحالات</option>
                <option value="pending">في الانتظار</option>
                <option value="confirmed">مؤكد</option>
                <option value="preparing">جاري التحضير</option>
                <option value="delivery">قيد التوصيل</option>
                <option value="completed">الطلب جاهز</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${this.orders.map(order => `
              <div class="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200">
                <div class="mb-3">
                  <div class="text-xs text-gray-500 mb-1">رقم الطلب</div>
                  <div class="font-bold text-gray-900 text-lg">#${order.id}</div>
                </div>
                
                <div class="mb-3">
                  <div class="text-xs text-gray-500 mb-1">المبلغ الإجمالي</div>
                  <div class="font-bold text-orange-600 text-lg">${order.total.toFixed(2)} ر.س</div>
                </div>
                
                <div class="mb-3">
                  <div class="text-xs text-gray-500 mb-1">حالة الطلب</div>
                  <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${this.getStatusColor(order.status)}">
                    <i data-lucide="${this.getStatusIcon(order.status)}" class="h-4 w-4"></i>
                    ${this.getStatusText(order.status)}
                  </span>
                </div>
                
                <div class="mb-4">
                  <div class="text-xs text-gray-500 mb-1">تاريخ الطلب</div>
                  <div class="text-sm text-gray-700">
                    ${new Date(order.createdAt).toLocaleDateString('en-GB')}
                  </div>
                  <div class="text-sm text-gray-600">
                    ${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>
                
                <button
                  onclick="app.openOrderModal('${order.id}')"
                  class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                >
                  <i data-lucide="eye" class="h-4 w-4"></i>
                  عرض التفاصيل
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderProducts() {
    return `
      <div class="space-y-6">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">إدارة قائمة الطعام</h2>
          <p class="text-gray-600">إضافة وتعديل أطباق مطعم الديار</p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div class="flex flex-col sm:flex-row gap-4 flex-1">
              <div class="relative flex-1 max-w-md">
                <i data-lucide="search" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5"></i>
                <input
                  type="text"
                  placeholder="البحث في المنتجات..."
                  class="w-full pr-10 pl-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <select class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                <option value="all">جميع الفئات</option>
                ${this.categories.map(category => `<option value="${category}">${category}</option>`).join('')}
              </select>
              <select class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                <option value="all">جميع الأنواع</option>
                ${this.types.map(type => `<option value="${type}">${type}</option>`).join('')}
              </select>
            </div>
            <button
              onclick="app.openAddProductModal()"
              class="flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              <i data-lucide="plus" class="h-4 w-4"></i>
              إضافة منتج جديد
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6">
            ${this.products.map(product => `
              <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div class="relative">
                  <img
                    src="${product.image}"
                    alt="${product.name}"
                    class="w-full h-32 sm:h-40 lg:h-48 object-cover"
                  />
                  <div class="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${product.available ? 'متوفر' : 'غير متوفر'}
                  </div>
                </div>
                
                <div class="p-2 sm:p-3 lg:p-4">
                  <h3 class="font-semibold text-gray-900 mb-1 text-xs sm:text-sm lg:text-base line-clamp-1">${product.name}</h3>
                  <p class="text-gray-600 text-xs mb-2 line-clamp-2 hidden sm:block">${product.description}</p>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-orange-600 font-bold text-xs sm:text-sm lg:text-base">${product.price.toFixed(2)} ر.س</span>
                    <div class="text-left">
                      <div class="text-gray-500 text-xs hidden sm:block">${product.category}</div>
                      <div class="text-gray-400 text-xs hidden lg:block">${product.type} • ${product.unit}</div>
                    </div>
                  </div>
                  
                  <div class="flex gap-1 sm:gap-2">
                    <button
                      onclick="app.openEditProductModal('${product.id}')"
                      class="flex-1 flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-xs text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <i data-lucide="edit" class="h-3 w-3 sm:h-4 sm:w-4"></i>
                      <span class="hidden sm:inline">تعديل</span>
                    </button>
                    <button
                      onclick="app.deleteProduct('${product.id}')"
                      class="flex-1 flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <i data-lucide="trash-2" class="h-3 w-3 sm:h-4 sm:w-4"></i>
                      <span class="hidden sm:inline">حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderReports() {
    return `
      <div class="space-y-6">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">التقارير والإحصائيات</h2>
          <p class="text-gray-600">تحليل مفصل لأداء مبيعاتك </p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div class="flex bg-gray-100 rounded-lg p-1 mb-6 w-fit">
            <button
              onclick="app.setReportView('summary')"
              class="px-2 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${this.reportView === 'summary' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <i data-lucide="trending-up" class="h-4 w-4"></i>
              ملخص التقارير
            </button>
            <button
              onclick="app.setReportView('statement')"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${this.reportView === 'statement' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <i data-lucide="file-text" class="h-4 w-4"></i>
              كشف الحساب
            </button>
          </div>

          <div class="flex flex-col lg:flex-row lg:items-center gap-4">
            ${this.reportView === 'summary' ? `
              <div class="flex items-center gap-3">
                <i data-lucide="filter" class="h-5 w-5 text-gray-500"></i>
                <span class="text-sm sm:text-base font-medium text-gray-700">نوع التقرير:</span>
                <div class="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onclick="app.setSelectedPeriod('daily')"
                    class="px-4 py-2 rounded-md text-sm font-medium transition-colors ${this.selectedPeriod === 'daily' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
                  >
                    يومي
                  </button>
                  <button
                    onclick="app.setSelectedPeriod('weekly')"
                    class="px-4 py-2 rounded-md text-sm font-medium transition-colors ${this.selectedPeriod === 'weekly' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
                  >
                    أسبوعي
                  </button>
                  <button
                    onclick="app.setSelectedPeriod('monthly')"
                    class="px-4 py-2 rounded-md text-sm font-medium transition-colors ${this.selectedPeriod === 'monthly' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
                  >
                    شهري
                  </button>
                </div>
              </div>
            ` : ''}

            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <i data-lucide="calendar" class="h-5 w-5 text-gray-500"></i>
              <span class="text-sm sm:text-base font-medium text-gray-700">الفترة المخصصة:</span>
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input
                  type="date"
                  class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <span class="text-gray-500 text-sm">إلى</span>
                <input
                  type="date"
                  class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <button 
              onclick="app.exportToPDF()"
              class="flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm w-full lg:w-auto"
            >
              <i data-lucide="download" class="h-4 w-4"></i>
              تصدير PDF
            </button>
          </div>
        </div>

        ${this.reportView === 'summary' ? this.renderSummaryReport() : this.renderStatementReport()}
      </div>
    `;
  }

  renderSummaryReport() { 
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">إجمالي المبيعات</p>
              <p class="text-lg sm:text-2xl font-bold text-gray-900 mt-1">34,567.80 ر.س</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <i data-lucide="trending-up" class="h-5 w-5 sm:h-6 sm:w-6 text-green-600"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">إجمالي العمولة (5%)</p>
              <p class="text-lg sm:text-2xl font-bold text-gray-900 mt-1">-1,728.39 ر.س</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <i data-lucide="trending-up" class="h-5 w-5 sm:h-6 sm:w-6 text-red-600"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">المبلغ المتبقي</p>
              <p class="text-lg sm:text-2xl font-bold text-gray-900 mt-1">32,839.41 ر.س</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <i data-lucide="trending-up" class="h-5 w-5 sm:h-6 sm:w-6 text-green-600"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">إجمالي الطلبات</p>
              <p class="text-lg sm:text-2xl font-bold text-gray-900 mt-1">423</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <i data-lucide="trending-up" class="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-4">التقرير الشهري المفصل</h3>
        
        <div class="overflow-x-auto -mx-4 sm:mx-0">
          <table class="w-full min-w-[600px]">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">الفترة</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">المبيعات</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">العمولة (5%)</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">المبلغ المتبقي</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">عدد الطلبات</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">متوسط قيمة الطلب</th>
              </tr>
            </thead>
            <tbody>
              ${[
                { period: 'يناير 2024', sales: 34567.80, orders: 423, avgOrderValue: 81.73 },
                { period: 'ديسمبر 2023', sales: 41234.50, orders: 498, avgOrderValue: 82.80 },
                { period: 'نوفمبر 2023', sales: 38901.25, orders: 467, avgOrderValue: 83.30 }
              ].map(item => {
                const commission = item.sales * 0.05;
                const netAmount = item.sales - commission;
                return `
                  <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-2 sm:py-4 sm:px-4 font-medium text-gray-900 text-sm">${item.period}</td>
                    <td class="py-3 px-2 sm:py-4 sm:px-4 font-medium text-gray-900 text-sm">${item.sales.toFixed(2)} ر.س</td>
                    <td class="py-3 px-2 sm:py-4 sm:px-4 font-medium text-red-600 text-sm">-${commission.toFixed(2)} ر.س</td>
                    <td class="py-3 px-2 sm:py-4 sm:px-4 font-medium text-green-600 text-sm">${netAmount.toFixed(2)} ر.س</td>
                    <td class="py-3 px-2 sm:py-4 sm:px-4 text-gray-700 text-sm">${item.orders}</td>
                    <td class="py-3 px-2 sm:py-4 sm:px-4 text-gray-700 text-sm">${item.avgOrderValue.toFixed(2)} ر.س</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderStatementReport() {
    const mockAccountEntries = [
      { id: '1', date: '2024-01-15', type: 'sale', invoiceNumber: '1001', description: 'مبيعات - طلب #1001 - سارة أحمد', debit: 0, credit: 125.50, balance: 125.50 },
      { id: '2', date: '2024-01-15', type: 'commission', description: 'عمولة يومية 15/01/2024 (5%)', debit: 6.28, credit: 0, balance: 119.22 },
      { id: '3', date: '2024-01-15', type: 'sale', invoiceNumber: '1002', description: 'مبيعات - طلب #1002 - خالد محمد', debit: 0, credit: 89.75, balance: 208.97 }
    ];

    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <i data-lucide="receipt" class="h-6 w-6 text-orange-600"></i>
            <h3 class="text-base sm:text-lg font-semibold text-gray-900">كشف الحساب المفصل</h3>
          </div>
          <div class="text-sm text-gray-600">
            آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}
          </div>
        </div>
        
        <div class="overflow-x-auto -mx-4 sm:mx-0">
          <table class="w-full min-w-[700px]">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">التاريخ</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">رقم الفاتورة</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">البيان</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">مدين</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">دائن</th>
                <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${mockAccountEntries.map(entry => `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors ${entry.type === 'commission' ? 'bg-red-50' : ''}">
                  <td class="py-3 px-2 sm:py-4 sm:px-4 text-sm text-gray-900">
                    ${new Date(entry.date).toLocaleDateString('ar-SA')}
                  </td>
                  <td class="py-3 px-2 sm:py-4 sm:px-4 text-sm text-gray-900 font-medium">
                    ${entry.invoiceNumber || '-'}
                  </td>
                  <td class="py-3 px-2 sm:py-4 sm:px-4 text-sm text-gray-700">
                    <div class="flex items-center gap-2">
                      ${entry.type === 'commission' ? '<span class="w-2 h-2 bg-red-500 rounded-full"></span>' : ''}
                      ${entry.description}
                    </div>
                  </td>
                  <td class="py-3 px-2 sm:py-4 sm:px-4 text-sm">
                    ${entry.debit > 0 ? `<span class="text-red-600 font-medium">${entry.debit.toFixed(2)} ر.س</span>` : '<span class="text-gray-400">-</span>'}
                  </td>
                  <td class="py-3 px-2 sm:py-4 sm:px-4 text-sm">
                    ${entry.credit > 0 ? `<span class="text-green-600 font-medium">${entry.credit.toFixed(2)} ر.س</span>` : '<span class="text-gray-400">-</span>'}
                  </td>
                  <td class="py-3 px-2 sm:py-4 sm:px-4 text-sm font-bold text-gray-900">
                    ${entry.balance.toFixed(2)} ر.س
                  </td>
                </tr>
              `).join('')}
              <tr class="bg-orange-50 border-t-2 border-orange-200">
                <td colspan="5" class="py-3 px-2 sm:py-4 sm:px-4 font-bold text-gray-900 text-sm">
                  الرصيد النهائي
                </td>
                <td class="py-3 px-2 sm:py-4 sm:px-4 font-bold text-orange-600 text-base sm:text-lg">
                  ${mockAccountEntries[mockAccountEntries.length - 1]?.balance.toFixed(2)} ر.س
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderSettings() {
    return `
      <div class="space-y-6">
        <div class="flex items-center gap-3">
          <button
            onclick="app.setCurrentPage('dashboard')"
            class="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 hover:bg-orange-100 rounded-lg transition-colors"
            title="العودة للصفحة الرئيسية"
          >
            <i data-lucide="arrow-right" class="h-5 w-5"></i>
          </button>
          <div class="text-right">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">إعدادات المطعم</h2>
            <p class="text-gray-600">إدارة أنواع ووحدات منتجات مطعم الديار</p>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                تسجيل الخروج
              </h3>
              <p class="text-sm text-gray-600">
                تسجيل الخروج من حسابك والعودة لصفحة تسجيل الدخول
              </p>
            </div>
            <button
              onclick="app.logout()"
              class="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              <i data-lucide="log-out" class="h-4 w-4"></i>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderOrderModal() {
    const order = this.orders.find(o => o.id === this.selectedOrder);
    if (!order) return '';

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div class="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 class="text-lg sm:text-xl font-bold text-gray-900">تفاصيل الطلب #${order.id}</h3>
            <button
              onclick="app.closeOrderModal()"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <i data-lucide="x" class="h-5 w-5 text-gray-500"></i>
            </button>
          </div>

          <div class="p-4 sm:p-6 space-y-6">
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-4">
                <h4 class="font-semibold text-gray-900">حالة الطلب</h4>
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${this.getStatusColor(order.status)}">
                  ${this.getStatusText(order.status)}
                </span>
              </div>
              
              ${order.status !== 'cancelled' ? `
                <div class="flex flex-wrap gap-2">
                  <button
                    onclick="app.updateOrderStatus('${order.id}', 'preparing')"
                    class="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                    ${order.status === 'preparing' ? 'disabled' : ''}
                  >
                    جاري التحضير
                  </button>
                  <button
                    onclick="app.updateOrderStatus('${order.id}', 'completed')"
                    class="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    ${order.status === 'completed' ? 'disabled' : ''}
                  >
                    الطلب جاهز
                  </button>
                  <button
                    onclick="app.updateOrderStatus('${order.id}', 'cancelled')"
                    class="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    إلغاء الطلب
                  </button>
                </div>
              ` : ''}
            </div>

            <div>
              <h4 class="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <i data-lucide="package" class="h-5 w-5"></i>
                المنتجات المطلوبة
              </h4>
              
              <div class="bg-gray-50 rounded-lg overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[400px]">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">المنتج</th>
                        <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">الكمية</th>
                        <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">السعر</th>
                        <th class="text-right py-3 px-2 sm:px-4 font-semibold text-gray-700 text-sm">المجموع</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${order.items.map(item => `
                        <tr class="border-b border-gray-200">
                          <td class="py-3 px-2 sm:px-4 font-medium text-gray-900 text-sm">${item.name}</td>
                          <td class="py-3 px-2 sm:px-4 text-gray-700 text-sm">${item.quantity}</td>
                          <td class="py-3 px-2 sm:px-4 text-gray-700 text-sm">${item.price.toFixed(2)} ر.س</td>
                          <td class="py-3 px-2 sm:px-4 font-medium text-gray-900 text-sm">${(item.quantity * item.price).toFixed(2)} ر.س</td>
                        </tr>
                      `).join('')}
                      <tr class="bg-orange-50">
                        <td colspan="3" class="py-3 px-2 sm:px-4 font-bold text-gray-900 text-sm">الإجمالي</td>
                        <td class="py-3 px-2 sm:px-4 font-bold text-orange-600 text-base sm:text-lg">${order.total.toFixed(2)} ر.س</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-xs sm:text-sm font-medium text-gray-700">اسم العميل</label>
                <p class="text-sm sm:text-base text-gray-900">${order.customer}</p>
              </div>
              <div>
                <label class="text-xs sm:text-sm font-medium text-gray-700">رقم الهاتف</label>
                <p class="text-sm sm:text-base text-gray-900">${order.phone}</p>
              </div>
              <div class="md:col-span-2">
                <label class="text-xs sm:text-sm font-medium text-gray-700">العنوان</label>
                <p class="text-sm sm:text-base text-gray-900">${order.address}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
            <button
              onclick="app.closeOrderModal()"
              class="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderProductModal() {
    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div class="bg-white rounded-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
          <div class="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 class="text-lg sm:text-xl font-bold text-gray-900">
              ${this.editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </h3>
            <button
              onclick="app.closeProductModal()"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <i data-lucide="x" class="h-5 w-5 text-gray-500"></i>
            </button>
          </div>

          <form id="productForm" class="p-4 sm:p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">اسم المنتج *</label>
              <input
                type="text"
                name="name"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="أدخل اسم المنتج"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
              <textarea
                name="description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="أدخل وصف المنتج"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">السعر (ر.س) *</label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">الفئة</label>
                <select
                  name="category"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">اختر الفئة</option>
                  ${this.categories.map(category => `<option value="${category}">${category}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">النوع</label>
                <select
                  name="type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">اختر النوع</option>
                  ${this.types.map(type => `<option value="${type}">${type}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">الوحدة</label>
                <select
                  name="unit"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">اختر الوحدة</option>
                  ${this.units.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">رابط الصورة</label>
              <input
                type="url"
                name="image"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div class="flex items-center">
              <input
                type="checkbox"
                name="available"
                id="available"
                checked
                class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label for="available" class="mr-2 text-sm text-gray-700">
                المنتج متوفر للطلب
              </label>
            </div>
          </form>

          <div class="flex flex-col sm:flex-row justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
            <button
              onclick="app.closeProductModal()"
              class="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              onclick="app.saveProduct()"
              class="px-4 py-2 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <i data-lucide="save" class="h-4 w-4"></i>
              ${this.editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Event Listeners
  attachEventListeners() {
    // تهيئة أيقونات Lucide
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });

      const togglePassword = document.getElementById('togglePassword');
      if (togglePassword) {
        togglePassword.addEventListener('click', () => {
          const passwordInput = document.getElementById('password');
          const icon = togglePassword.querySelector('i');
          
          if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
          } else {
            passwordInput.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
          }
          
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        });
      }
    }
  }

  // Methods
  handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    if (username === '770067118' && password === '770067118') {
      this.isAuthenticated = true;
      this.render();
    } else {
      errorMessage.classList.remove('hidden');
      errorMessage.querySelector('p').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
  }

  logout() {
    this.isAuthenticated = false;
    this.currentPage = 'dashboard';
    this.sidebarOpen = false;
    this.render();
  }

  setCurrentPage(page) {
    this.currentPage = page;
    this.sidebarOpen = false;
    this.render();
  }

  openSidebar() {
    this.sidebarOpen = true;
    this.render();
  }

  closeSidebar() {
    this.sidebarOpen = false;
    this.render();
  }

  openOrderModal(orderId) {
    this.selectedOrder = orderId;
    this.render();
  }

  closeOrderModal() {
    this.selectedOrder = null;
    this.render();
  }

  updateOrderStatus(orderId, newStatus) {
    const orderIndex = this.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      this.orders[orderIndex].status = newStatus;
      this.render();
    }
  }

  openAddProductModal() {
    this.showAddModal = true;
    this.editingProduct = null;
    this.render();
  }

  openEditProductModal(productId) {
    this.editingProduct = this.products.find(p => p.id === productId);
    this.showAddModal = false;
    this.render();
  }

  closeProductModal() {
    this.showAddModal = false;
    this.editingProduct = null;
    this.render();
  }

  saveProduct() {
    const form = document.getElementById('productForm');
    const formData = new FormData(form);
    
    const productData = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price')),
      category: formData.get('category'),
      type: formData.get('type'),
      unit: formData.get('unit'),
      image: formData.get('image') || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      available: formData.get('available') === 'on',
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (this.editingProduct) {
      const index = this.products.findIndex(p => p.id === this.editingProduct.id);
      this.products[index] = { ...this.editingProduct, ...productData };
    } else {
      const newProduct = {
        id: Date.now().toString(),
        ...productData
      };
      this.products.push(newProduct);
    }

    this.closeProductModal();
  }

  deleteProduct(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      this.products = this.products.filter(p => p.id !== productId);
      this.render();
    }
  }

  setReportView(view) {
    this.reportView = view;
    this.render();
  }

  setSelectedPeriod(period) {
    this.selectedPeriod = period;
    this.render();
  }

  exportToPDF() {
    if (typeof jsPDF === 'undefined') {
      alert('مكتبة PDF غير متوفرة');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont('helvetica');
    doc.setFontSize(16);
    
    const title = this.reportView === 'summary' ? 'تقرير المبيعات' : 'كشف الحساب';
    doc.text(title, 105, 20, { align: 'center' });
    
    const reportDate = new Date().toLocaleDateString('ar-SA');
    doc.setFontSize(12);
    doc.text(`تاريخ التقرير: ${reportDate}`, 20, 35);
    
    const fileName = `${title}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  // Helper methods
  getStatusText(status) {
    const statusMap = {
      'pending': 'في الانتظار',
      'confirmed': 'مؤكد',
      'preparing': 'جاري التحضير',
      'delivery': 'قيد التوصيل',
      'completed': 'الطلب جاهز',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status) {
    const colorMap = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-purple-100 text-purple-800',
      'delivery': 'bg-indigo-100 text-indigo-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusIcon(status) {
    const iconMap = {
      'completed': 'check-circle',
      'cancelled': 'x-circle'
    };
    return iconMap[status] || 'clock';
  }
}

// تهيئة التطبيق
const app = new RestaurantApp();