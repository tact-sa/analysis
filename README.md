# analysis.tact.sa — التحليل المالي

داشبورد التحليل المالي لـ Tact Digital Communications (المديونية، المشاريع، الحملات).
التفاصيل الكاملة في [PROJECT.md](PROJECT.md).

## الملفات

| المسار | الوصف |
|---|---|
| `index.html` | تطبيق الواجهة كاملاً (SPA) |
| `api/otp/*` | التحقق بخطوتين عبر البريد (Resend) |
| `api/onedrive/*` | ربط OneDrive وقراءة ملفات Excel (Microsoft Graph) |
| `api/_lib/*` | تشفير الكوكيز AES-256-GCM، البريد، Graph |
| `vercel.json` | المسارات وترويسات الأمان |
| `firestore.rules` | قواعد Firestore (الأدوار وصلاحيات التعديل) |

## متغيرات البيئة (Vercel → Settings → Environment Variables)

| المتغير | مطلوب | الوصف |
|---|:---:|---|
| `COOKIE_SECRET` | ✅ | نص عشوائي 32 حرفاً أو أكثر (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | — | مفتاح Resend لإرسال رموز OTP (مطلوب فقط إذا فُعّل `OTP_ENABLED` في `index.html`) |
| `OTP_FROM_EMAIL` | — | المرسل، مثل `Analysis <no-reply@tact.sa>` (يتطلب توثيق الدومين في Resend) |
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
