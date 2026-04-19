# نظام التاجر

هذا المشروع أصبح الآن مهيأ كالتالي:

- واجهة React/Vite.
- سيرفر محلي Node/Express لحفظ البيانات وربط الواجهة.
- يدعم الربط مع سيرفر خارجي أيضاً عبر `VITE_API_BASE_URL`.
- دعم Android عبر Capacitor.

## التشغيل المحلي عبر CMD أو PowerShell

```powershell
npm install
npm run dev:all
```

بعد التشغيل:

- الواجهة: http://localhost:5173
- السيرفر المحلي: http://localhost:3001

بيانات الدخول التجريبية:

- رقم الهاتف: 770067118
- كلمة المرور: 770067118

واجهة تسجيل الدخول الآن ترسل الطلب إلى:

- `/api/agents/login` في السيرفر المحلي
- أو أي Base URL تحدده في `VITE_API_BASE_URL`

إذا كان السيرفر الخارجي مستضافاً على Railway أو أي استضافة مشابهة، استخدم ملف `.env` بهذا الشكل:

```env
VITE_API_BASE_URL=https://your-app.up.railway.app/api
```

مهم: قيمة المتغير يجب أن تنتهي بـ `/api` لأن جميع الطلبات في الواجهة مبنية على هذا الأساس.

## بناء نسخة Android

```powershell
npm run build
npm run android:add
npm run android:sync
npm run android:open
```

إذا كنت ستجرب على محاكي Android، ضع ملف `.env` في جذر المشروع بالمحتوى التالي قبل البناء:

```env
VITE_API_BASE_URL=http://10.0.2.2:3001/api
```

إذا كان الاختبار على جهاز فعلي، استبدل `10.0.2.2` بعنوان IP الخاص بجهازك على الشبكة المحلية.