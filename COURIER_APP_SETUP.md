# تطبيق المندوب - Android

تم إنشاء لوحة تحكم المندوب كتطبيق موبايل متكامل يعمل على أجهزة Android.

## المميزات

- ✅ واجهة مستخدم محسنة للموبايل
- ✅ تتبع GPS مباشر مع إرسال الموقع للعميل
- ✅ إشعارات الطلبات الجديدة
- ✅ تحديث حالة الطلبات بسهولة
- ✅ الاتصال المباشر بالعملاء والمتاجر
- ✅ الملاحة عبر Google Maps
- ✅ عرض الأرباح والإحصائيات
- ✅ وضع ليلي/نهاري

## خطوات بناء تطبيق Android

### 1. نقل المشروع إلى GitHub

1. اضغط على زر **"Export to GitHub"** في Lovable
2. اختر اسم المستودع واضغط **Export**

### 2. استنساخ المشروع على جهازك

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 3. تثبيت المتطلبات

```bash
npm install
```

### 4. إضافة منصة Android

```bash
npx cap add android
```

### 5. بناء المشروع

```bash
npm run build
```

### 6. مزامنة Capacitor

```bash
npx cap sync android
```

### 7. فتح المشروع في Android Studio

```bash
npx cap open android
```

### 8. تشغيل التطبيق

- في Android Studio، اختر جهازك أو المحاكي
- اضغط على زر **Run** (▶️)

## المتطلبات

- [Node.js](https://nodejs.org/) v18+
- [Android Studio](https://developer.android.com/studio)
- Android SDK 33+
- جهاز Android أو محاكي

## الصلاحيات المطلوبة

التطبيق يحتاج الصلاحيات التالية:
- **ACCESS_FINE_LOCATION**: لتتبع موقع المندوب
- **ACCESS_COARSE_LOCATION**: لتحديد الموقع التقريبي
- **INTERNET**: للاتصال بالخادم
- **VIBRATE**: للإشعارات

## ملاحظات هامة

1. تأكد من تفعيل GPS على الجهاز
2. امنح التطبيق صلاحية الوصول للموقع "دائماً" للتتبع في الخلفية
3. تأكد من اتصال الإنترنت لإرسال تحديثات الموقع

## Hot Reload أثناء التطوير

الإعدادات الحالية في `capacitor.config.ts` تسمح بالتحميل المباشر من sandbox:
- أي تغييرات في الكود ستظهر مباشرة على التطبيق
- مفيد للتطوير والاختبار السريع

للإنتاج، احذف قسم `server` من `capacitor.config.ts`:
```typescript
// احذف هذا للإنتاج:
server: {
  url: "...",
  cleartext: true
}
```

## الدعم

للمساعدة أو الاستفسارات، تواصل معنا عبر لوحة الدعم الفني.
