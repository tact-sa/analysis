# analysis.tact.sa — التحليل المالي

داشبورد التحليل المالي لـ Tact Digital Communications (المديونية، المشاريع، الحملات).
التفاصيل الكاملة في [PROJECT.md](PROJECT.md).

## الملفات

| المسار | الوصف |
|---|---|
| `index.html` | هيكل الصفحة (HTML) |
| `js/app.js` | منطق التطبيق كاملاً (JavaScript) |
| `js/theme.js`, `js/mode-indicator.js` | تهيئة الثيم ومؤشر الاتصال |
| `css/app.css` | التنسيقات |
| `api/otp/*` | التحقق بخطوتين عبر البريد (Resend) |
| `api/onedrive/*` | ربط OneDrive وقراءة ملفات Excel (Microsoft Graph) |
| `api/_lib/*` | تشفير الكوكيز AES-256-GCM، البريد (Resend)، Graph |
| `assets/` | شعار tact (SVG) والأيقونة المفضلة — مستخرجة من دليل الهوية |
| `vercel.json` | المسارات وترويسات الأمان |
| `firestore.rules` | قواعد Firestore (الأدوار وصلاحيات التعديل) |

## متغيرات البيئة (Vercel → Settings → Environment Variables)

| المتغير | مطلوب | الوصف |
|---|:---:|---|
| `COOKIE_SECRET` | ✅ | نص عشوائي 32 حرفاً أو أكثر (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | ✅ | مفتاح Resend لإرسال رموز التحقق بخطوتين |
| `OTP_FROM_EMAIL` | — | المرسل، الافتراضي `tact Analysis <no-reply@mail.tact.sa>` (الدومين موثّق في Resend) |
| `OTP_ALLOWED_DOMAINS` | — | النطاقات المسموح لها بالدخول، الافتراضي `tact.sa` (افصل بفاصلة) |
| `MS_CLIENT_ID` | OneDrive | Azure App Registration |
| `MS_CLIENT_SECRET` | OneDrive | Azure client secret |
| `MS_TENANT_ID` | OneDrive | معرف المستأجر في Azure |
| `MS_REDIRECT_URI` | — | الافتراضي `https://<host>/api/onedrive/callback` |

## التشغيل محلياً

```bash
npm install
npx vercel dev
```

## الصلاحيات

| الدور | التقارير | التعديل |
|---|---|---|
| سوبر يوزر | الكل | كل شيء + الحسابات والإعدادات |
| محرر | حسب `reports` | الجداول المحددة في `edit` فقط |
| مشاهد | حسب `reports` | لا شيء |

وثيقة المستخدم في `users/{email}`:

```js
{
  role: "editor",
  reports: { debt: true, projects: true, campaigns: false },
  edit:    { invoices: true, projects: false, campaigns: false } // للمحرر فقط
}
```

تُدار من الإعدادات ← إدارة الحسابات. لتطبيقها من جهة السيرفر انشر `firestore.rules`
من Firebase Console ← Firestore Database ← Rules.

## النشر

الموقع `analysis.tact.sa` منشور على Vercel من المستودع `tact-sa/analysis`:

- أي رفع على فرع `main` ← نشر تلقائي للإنتاج.
- الفروع الأخرى ← نسخ معاينة (Preview) فقط.

## الهوية البصرية

مطبّقة حسب «الدليل الإرشادي لهوية تاكت»:

- **الخط:** Readex Pro للعربي والإنجليزي.
- **الألوان الأساسية:** Tact Dark `#282829` و Tact Orange `#F15D2A`.
- **الألوان الثانوية:** Teal `#4CC0AF` و Yellow `#FFC63E` و Purple `#32004B`.
- **الشعار:** الشعار الفرعي «tact FINANCIAL ANALYSIS.» في الهيدر، والشعار الكامل «tact Digital comm.» في شاشة الدخول والفوتر.
- **العناصر البصرية:** الأشكال الهندسية الأساسية (ربع دائرة، نصف دائرة، دائرة) وأيقونات خطية برتقالية.
