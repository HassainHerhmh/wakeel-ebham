# وكيل ابهام

تطبيق ويب مبني بـ React وVite لإدارة الطلبات والمنتجات والتقارير، مع واجهة عربية واتجاه RTL.

## التشغيل المحلي

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

## الربط مع API خارجي

تقرأ الواجهة عنوان الـ API من المتغير `VITE_API_BASE_URL` أو `VITE_API_URL`.

مثال ملف `.env`:

```env
VITE_API_BASE_URL=https://your-app.up.railway.app/api
```

## النشر على Vercel

إعدادات النشر المناسبة:

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

إذا كان المشروع يحتاج الاتصال بسيرفر خارجي، أضف `VITE_API_BASE_URL` أو `VITE_API_URL` داخل Environment Variables في Vercel.

على Vercel يتم تمرير طلبات `/api/*` إلى Railway عبر `vercel.json` لتجنب مشاكل CORS في المتصفح.

## Android

```powershell
npm run build
npm run android:sync
npm run android:open
```
