// server.cjs - يستخدم صيغة CommonJS (require) ليتجنب أخطاء require is not defined

const express = require('express');
const path = require('path');
const http = require('http'); // ضروري إذا كنت تخطط لاستخدام Socket.io

// 1. إعداد التطبيق والمنفذ
const app = express();
// استخدم متغير البيئة PORT الخاص بـ Render، أو 3000 للاستخدام المحلي
const PORT = process.env.PORT || 3000;

// 2. خدمة الملفات الثابتة (Static Files)
// هذا يخبر Express بالبحث عن جميع ملفاتك (HTML, CSS, JS, صور) داخل مجلد 'public'
// عند طلبها مباشرة (مثال: /admin.html)
app.use(express.static(path.join(__dirname, 'public')));

// 3. توجيه المسار الرئيسي (الجذر) - حل مشكلة Cannot GET /
// عند طلب المسار الرئيسي '/'، يتم إرسال ملف login.html
app.get('/', (req, res) => {
    // res.sendFile يقوم بإرسال الملف المطلوب إلى المتصفح
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 4. (هنا يمكن إضافة أي مسارات API أو منطق خادم آخر)

// 5. بدء تشغيل الخادم
// يتم استخدام app.listen هنا. إذا كنت ستضيف Socket.io لاحقاً، استبدله بخطوط server.listen(PORT)
app.listen(PORT, () => {
    console.log(`✅ Server is running and listening on port ${PORT}`);
    console.log(`🔗 Local access: http://localhost:${PORT}`);
});