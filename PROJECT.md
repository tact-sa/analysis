# analysis.tact.sa — Financial Analysis Dashboard
### داشبورد التحليل المالي — Tact Digital Communications

> بيان شامل للمشروع: الهيكل، التقنيات، الميزات، الأمان، والصلاحيات.
> Last updated: 2026-09-30

---

## 📌 نظرة عامة

**analysis.tact.sa** هو تطبيق ويب أحادي الصفحة (SPA) بلغتين (عربي / إنجليزي) لتحليل البيانات المالية لوكالة Tact Digital Communications. يقدّم ثلاثة تقارير رئيسية:

1. **تحليل المديونية** (Debt Analysis) — KPIs، Aging، DSO، أعلى المدينين، الفواتير
2. **تحليل المشاريع** (Projects Analysis) — العقود، المنجز، المفوتر، المستحق
3. **تحليل الحملات** (Campaigns Analysis) — نفس بنية المشاريع للحملات التسويقية

يعمل مع تكامل Firebase Authentication + Firestore للمزامنة الفورية عبر الأجهزة، وOneDrive لسحب البيانات من Excel مباشرة.

---

## 🏗 التقنيات

### الواجهة الأمامية (Frontend)
- **HTML/CSS/JS خام** — بدون build step، كل شيء في ملف واحد `index.html` (~6000 سطر)
- **مكتبات CDN**:
  - Firebase 10.14.1 (Auth + Firestore compat SDK)
  - SheetJS 0.18.5 (قراءة/كتابة Excel)
  - Chart.js 4.4.4 (الرسوم البيانية)
  - html2pdf.js 0.10.2 (تصدير PDF)
- **الخطوط**: Tajawal + IBM Plex Sans Arabic + Inter + IBM Plex Mono
- **الأنماط**: Design Tokens (CSS Variables) مع ألوان Tact Brand — وضع فاتح ووضع داكن

### الواجهة الخلفية (Backend)
- **Vercel Serverless Functions** (Node.js 20)
- **Firestore** (NoSQL) — قاعدة البيانات الرئيسية
- **Microsoft Graph API** — قراءة ملفات Excel من OneDrive
- **Resend API** — إرسال رموز OTP بالبريد

### الاستضافة والنطاق
- **Vercel** (analysis.tact.sa)
- **DNS** — Cloudflare / موفر النطاق
- **HTTPS/HSTS** إجباري

---

## 🎨 الهوية البصرية (Tact Brand)

| اللون | HEX | الاستخدام |
|---|---|---|
| Orange (Accent) | `#F15D2A` | العناصر الأساسية، الأزرار، Highlights |
| Dark (Ink) | `#282829` | النصوص، الخلفيات الداكنة |
| Teal (Positive) | `#4CC0AF` | القيم الإيجابية، الإكمال |
| Yellow (Warning) | `#FFC63E` | التحذيرات، الفواتير المتأخرة |
| Purple (Secondary) | `#32004B` | تصنيفات إضافية |
| Cream (Bg) | `#FAF7F2` | خلفية الوضع الفاتح |

المصدر: Tact Brand Guidelines PDF (مستخرَج ومطبَّق كـ CSS variables).

---

## 📁 هيكل الملفات

```
analysis/
│
├── index.html                    ← تطبيق SPA كامل (~6000 سطر)
├── vercel.json                   ← إعدادات Vercel + Security Headers
├── package.json                  ← اعتماديات Serverless Functions
├── .gitignore
├── README.md
├── PROJECT.md                    ← هذا الملف
├── STRUCTURE.md                  ← خريطة الملفات
├── SECURITY.md                   ← سياسة الأمان
│
└── api/                          ← Vercel Serverless Functions
    ├── _lib/                     ← مكتبات مشتركة
    │   ├── crypto.js             ← AES-256-GCM لتشفير الكوكيز
    │   ├── msgraph.js            ← Microsoft Graph API helpers
    │   └── mail.js               ← Resend Email helper
    │
    ├── otp/                      ← التحقق بخطوتين
    │   ├── send.js               ← توليد وإرسال OTP + rate limiting
    │   └── verify.js             ← التحقق من الرمز + timing-safe compare
    │
    └── onedrive/                 ← تكامل OneDrive OAuth
        ├── auth.js               ← بدء تدفق OAuth
        ├── callback.js           ← استقبال code + تبادل tokens
        ├── status.js             ← فحص حالة الاتصال
        ├── disconnect.js         ← فصل الاتصال
        └── data.js               ← جلب Excel → JSON
```

---

## 🎯 الميزات الرئيسية

### 1. تسجيل الدخول متعدد الطبقات
- **الطبقة 1**: Firebase Authentication (Email + Password)
- **الطبقة 2**: OTP عبر البريد (٦ أرقام، ١٠ دقائق صلاحية)
- **الطبقة 3**: Session ID عشوائي (`crypto.randomUUID`) لكل جلسة
- **Idle Timeout**: ٣٠ دقيقة عدم نشاط ← تسجيل خروج تلقائي

### 2. الصلاحيات (Role-Based Access Control)
ثلاثة أدوار رئيسية:
- **`super`** — تحكم كامل: كل التقارير + إدارة الحسابات + Data Editor + API
- **`editor`** — تعديل البيانات + التقارير المسموحة
- **`viewer`** — قراءة فقط للتقارير المسموحة

بالإضافة إلى **صلاحيات لكل تقرير** لكل مستخدم:
```js
users/{email}.reports = {
  debt: true,       // تحليل المديونية
  projects: true,   // تحليل المشاريع
  campaigns: false  // تحليل الحملات
}
```
Super Users يشوفون كل التقارير تلقائياً (يتخطى هذا الحقل).

### 3. تحليل المديونية (Debt Analysis)
- **KPIs**: إجمالي المديونية، المتأخر، DSO، معدل التحصيل
- **Aging Buckets**: 0-30، 31-60، 61-90، 91-120، أكثر من 120 يوم
- **جدول أعلى المدينين** مع تصنيف مخاطر (منخفض/متوسط/مرتفع)
- **جدول الفواتير** مع بحث + ترتيب أعمدة + drill-down
- **DSO Analysis** مع مقارنة الهدف
- **Bad Debt %** و **Provisions**

### 4. تحليل المشاريع والحملات
- إجمالي العقود، المنجز، المفوتر، المستحق، المقدم
- شريط تقدم لكل مشروع
- تفاصيل drill-down مع الفواتير المرتبطة
- ربط بالعميل (clientNo)

### 5. AI Helper (المساعد الذكي)
- ٢٠ سؤال كل ٦ ساعات
- إجابات مبنية من DATA (لا API خارجي)
- يحترم الصلاحيات — Viewers لا يرون تفاصيل حساسة
- حفظ آخر ٢٠ رسالة
- زر إنهاء الدردشة

### 6. البحث الشامل (Global Search)
- **`Ctrl+K`** لفتح البحث
- يبحث في: الفواتير، المشاريع، الحملات، العملاء
- Keyboard navigation

### 7. تصدير PDF
- كل تقرير قابل للتصدير بضغطة زر
- يحافظ على ألوان Tact Brand
- عربي RTL جاهز

### 8. مزامنة فورية (Real-time Sync)
- Firestore `onSnapshot` — أي تعديل يظهر فوراً على كل المتصفحات
- `_uid` stable identifier لكل صف — يقاوم Firestore round-trip
- `findLive()` يحل مراجع الصفوف عبر الـ snapshots

### 9. استيراد Excel
- **يدوي**: رفع ملف `.xlsx` من الجهاز
- **OneDrive**: ربط بحساب Microsoft وسحب مباشر من OneDrive
- **API**: نقطة `/api/onedrive/data` تعيد JSON

### 10. تعديل مباشر (Data Grid)
- Excel-like editor داخل `/data` (تبويب من الإعدادات)
- إضافة/حذف صفوف
- تعديل خلوي مع حفظ debounced (400ms)
- يُخفى عن Viewers

### 11. الثنائية اللغوية (i18n)
- عربي (RTL) / إنجليزي (LTR)
- `TR = { ar, en }` قاموس مع `t()` helper
- `data-i18n` attributes للترجمة التلقائية
- تبديل فوري + `applyLang()`

### 12. الوضع الداكن (Dark Mode)
- تبديل من الإعدادات
- CSS variables تُبدَّل تلقائياً
- تحفظ التفضيل في `localStorage`

---

## 🗄 نموذج البيانات

### Firestore Collections

#### `dashboard/main`
الوثيقة الرئيسية — تحتوي كل بيانات التقارير:
```js
{
  kpi: {
    total: Number,        // إجمالي المديونية
    overdue: Number,      // المتأخر
    dso: Number,          // Days Sales Outstanding
    rate: Number          // معدل التحصيل %
  },
  badDebtPct: Number,
  provision: Number,
  dsoTarget: Number,
  aging: [
    { label: "0-30", amount: Number, count: Number, color: "#...", note: "..." },
    // ... 5 buckets
  ],
  debtors: [
    { _uid, id, name, risk: "low|med|high", invoices, overdueDays, balance, overdueAmt }
  ],
  invoices: [
    { _uid, invoiceNo, date, client, clientNo, project, platform, pm, amount, dueDays }
  ],
  projects: [
    { _uid, id, name, client, clientNo, pm, contract, invoiced, completed, advance, status }
  ],
  campaigns: [
    { _uid, id, name, client, clientNo, pm, contract, invoiced, completed, advance, status }
  ]
}
```

#### `users/{email}`
حساب لكل مستخدم:
```js
{
  name: String,
  role: "super" | "editor" | "viewer",
  reports: {
    debt: Boolean,
    projects: Boolean,
    campaigns: Boolean
  }
}
```

#### `meta/display`
تفضيلات العرض العامة:
```js
{
  showKpis: true,
  showAging: true,
  showChart: true,
  showDSO: true,
  showInvoices: true,
  showDebtors: true,
  showCollection: true,
  showProjKpis: true,
  showProjTable: true,
  showCmpKpis: true,
  showCmpTable: true
}
```

---

## 🔐 الأمان (Security)

### مقاومة CWEs
تم تدقيق المشروع ضد قائمة CWE الحرجة:

| CWE | الاسم | الحماية |
|---|---|---|
| CWE-77/78 | Command Injection | لا `exec/spawn` في المشروع |
| CWE-79 | XSS | `escapeHtml()` × 168، CSP صارم |
| CWE-89 | SQL Injection | Firestore NoSQL بـ SDK آمن |
| CWE-94 | Code Injection | لا `eval` ولا `new Function` |
| CWE-120 | Buffer Overflow | JS managed memory |
| CWE-269 | Improper Privilege Mgmt | Firestore Rules + role check |
| CWE-287 | Improper Authentication | Firebase Auth + OTP 2FA + timing-safe |
| CWE-306 | Missing Auth Critical Fn | كل endpoint وراء تحقق |
| CWE-384 | Session Fixation | `crypto.randomUUID()` لكل login |
| CWE-501 | Trust Boundary | cookies مشفرة AES-256-GCM |
| CWE-862/863 | Missing/Incorrect Authz | Firestore Rules طبقة مستقلة |
| CWE-918 | SSRF | مسارات مقيّدة + امتدادات ملفات محددة |

### التشفير
- **Cookies**: AES-256-GCM (`crypto.js`)
- **Session tokens**: Firebase JWT (RS256)
- **OTP challenge**: مشفَّر في cookie قصيرة العمر
- **Constant-time comparison**: `timingSafeEqual` لـ CSRF state و OTP code

### Rate Limiting
- **Login**: 5 محاولات → قفل دقيقة (client-side)
- **OTP Send**: 5 مرات/ساعة + 30ث بين كل طلب
- **OTP Verify**: 5 محاولات ثم يُبطَل التحدي
- **AI Helper**: 20 سؤال/6 ساعات

### Security Headers ([vercel.json](vercel.json))
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), ...
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

### Firestore Security Rules (مثال)
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{email} {
      allow read: if request.auth != null && request.auth.token.email == email;
      allow write: if request.auth != null &&
        get(/databases/$(db)/documents/users/$(request.auth.token.email)).data.role == "super";
    }
    match /dashboard/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(db)/documents/users/$(request.auth.token.email)).data.role in ["super", "editor"];
    }
    match /meta/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(db)/documents/users/$(request.auth.token.email)).data.role == "super";
    }
  }
}
```

---

## 🔌 API Endpoints

### OTP 2FA

#### `POST /api/otp/send`
يولّد رمز عشوائي ويرسله بالبريد.

**Request:**
```json
{ "email": "user@tact.sa" }
```

**Response 200:**
```json
{ "ok": true, "expiresIn": 600, "remaining": 4 }
```

**Response 429:** (تجاوز الحد)
```json
{ "error": "انتظر 25 ثانية قبل طلب رمز جديد" }
```

**Cookies:**
- `otp_ch` — التحدي المشفَّر (٥ محاولات، ١٥ دقيقة)
- `otp_rl` — عداد الحد (ساعة)

#### `POST /api/otp/verify`
يتحقق من الرمز.

**Request:**
```json
{ "email": "user@tact.sa", "code": "123456" }
```

**Response 200:**
```json
{ "ok": true }
```

**Response 400:**
```json
{ "error": "الرمز غير صحيح", "remaining": 3 }
```

**Cookies (on success):**
- `otp_ok` — إثبات التحقق (١٢ ساعة)

### OneDrive Integration

| Endpoint | Method | الوظيفة |
|---|:---:|---|
| `/api/onedrive/auth` | GET | يوجّه لصفحة OAuth مايكروسوفت |
| `/api/onedrive/callback` | GET | يستقبل code، يبادلها بـ tokens، يخزنها |
| `/api/onedrive/status` | GET | `{connected, user, expires_at}` |
| `/api/onedrive/disconnect` | GET | يمسح Cookie |
| `/api/onedrive/data?path=X.xlsx` | GET | يقرأ Excel من OneDrive → JSON |

**متغيرات البيئة المطلوبة:**
- `MS_CLIENT_ID` — Azure App Registration
- `MS_CLIENT_SECRET`
- `MS_TENANT_ID`
- `COOKIE_SECRET` — 32 بايت عشوائي لتشفير الكوكيز
- `RESEND_API_KEY` — من resend.com
- `OTP_FROM_EMAIL` — (اختياري) المرسل الافتراضي

---

## 🚀 التشغيل والنشر

### Local Development
```bash
git clone https://github.com/ziyadhh12/analysis.git
cd analysis
npm install    # لاعتماديات api/
npx vercel dev # يشغّل السيرفر مع API functions
```

### النشر على Vercel
1. اربط GitHub Repository في Vercel Dashboard
2. أضف متغيرات البيئة (Settings → Environment Variables)
3. Deploy تلقائي مع كل push على `main`

### إعداد النطاق
1. Vercel → Project → Settings → Domains
2. أضف `analysis.tact.sa`
3. حدّث DNS: `CNAME analysis → cname.vercel-dns.com`

### إعداد Firebase
1. أنشئ مشروع في Firebase Console
2. فعّل **Authentication → Email/Password**
3. أنشئ **Firestore Database** (production mode)
4. طبّق Security Rules (انظر أعلاه)
5. انسخ Config من Project Settings → SDK
6. الصقه في `index.html` (متغير `firebaseConfig`)

### إعداد Resend (OTP)
1. سجّل في [resend.com](https://resend.com/signup) (مجاني — 3000 إيميل/شهر)
2. **API Keys → Create** → انسخ المفتاح
3. Vercel → Env Vars → أضف `RESEND_API_KEY`
4. للإنتاج: تحقق من دومين `tact.sa` وضع `OTP_FROM_EMAIL = "Analysis <no-reply@tact.sa>"`
5. Redeploy المشروع

### إعداد OneDrive/Azure
1. Azure Portal → App Registrations → New
2. Redirect URI: `https://analysis.tact.sa/api/onedrive/callback`
3. API Permissions: `Files.Read.All`, `offline_access`, `User.Read`
4. Client Secret → أنشئ واحداً
5. أضف `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID` في Vercel

---

## 🧭 تدفقات العمل

### تدفق الدخول
```
1. المستخدم يفتح analysis.tact.sa
   ↓
2. يظهر Lock Screen (شاشة القفل)
   ↓
3. يُدخل البريد + كلمة السر
   ↓
4. Firebase Auth يتحقق → JWT
   ↓
5. onAuthStateChanged يُشعِل gateOnOTP(email)
   ↓
6. إذا لم يكن متحقق OTP في هذه الجلسة:
   → يطلب /api/otp/send
   → يرسل رمز ٦ أرقام للبريد
   → يظهر OTP Screen
   ↓
7. المستخدم يدخل الرمز
   ↓
8. /api/otp/verify يتحقق (timing-safe compare)
   ↓
9. sessionStorage.setItem("ar_otp_verified", email)
   ↓
10. unlock(email):
    - يولّد sessionId جديد (crypto.randomUUID)
    - يحمّل profile من Firestore
    - يطبق role permissions
    - يفتح الواجهة
    - يشترك بـ Firestore onSnapshot
```

### تدفق البيانات (قراءة)
```
Firestore (dashboard/main)
        ↓ onSnapshot (real-time)
JavaScript DATA object
        ↓ recomputeFromInvoices()
KPIs + Aging + Debtors + Projects + Campaigns
        ↓ renderAll()
DOM
```

### تدفق البيانات (كتابة)
```
User edit في /data grid
        ↓ input handler
findLive(kind, row)  ← يقاوم Firestore round-trip
        ↓ mutate DATA
saveData()  ← 400ms debounce
        ↓
Firestore .set(DATA)
        ↓ onSnapshot fires
كل المتصفحات الأخرى تتحدث فوراً
```

### تدفق OneDrive
```
1. User → Settings → OneDrive → Connect
   ↓
2. GET /api/onedrive/auth
   ↓ 302
3. login.microsoftonline.com/authorize (state=random)
   ↓
4. User grants permission
   ↓ 302
5. /api/onedrive/callback?code=...&state=...
   ↓ (verify state — CSRF check)
6. exchangeCode() → { access_token, refresh_token }
   ↓
7. encrypt + Set-Cookie od_tok
   ↓ 302 → /?onedrive=connected
   ↓
8. User → Fetch data
   ↓
9. GET /api/onedrive/data?path=Report.xlsx
   ↓ (decrypt cookie, refresh if expired)
10. downloadFile from Graph API
    ↓
11. XLSX.read → sheet_to_json
    ↓
12. Response { invoices, projects }
    ↓
13. Client merges into DATA + saveData()
```

---

## 🛡 خريطة الحماية الطبقية (Defense in Depth)

```
┌─────────────────────────────────────────────────────────┐
│  Layer 7 — Application Logic                            │
│  • Role checks (super/editor/viewer)                    │
│  • Per-report permissions                               │
│  • escapeHtml() on all user data                        │
├─────────────────────────────────────────────────────────┤
│  Layer 6 — Session Management                           │
│  • Random sessionId per login (CWE-384)                 │
│  • 30min idle timeout                                   │
│  • OTP verification per session                         │
├─────────────────────────────────────────────────────────┤
│  Layer 5 — Authentication                               │
│  • Firebase Auth (RS256 JWT)                            │
│  • OTP 2FA (6-digit, 10min expiry)                      │
│  • timingSafeEqual compare                              │
├─────────────────────────────────────────────────────────┤
│  Layer 4 — Rate Limiting                                │
│  • Login: 5 attempts → 1min lockout                     │
│  • OTP send: 5/hour + 30s cooldown                      │
│  • OTP verify: 5 attempts → invalidate                  │
│  • AI: 20 questions / 6h                                │
├─────────────────────────────────────────────────────────┤
│  Layer 3 — Data Layer (Firestore)                       │
│  • Security Rules (role-based)                          │
│  • Server-side validation                               │
│  • Field-level access control                           │
├─────────────────────────────────────────────────────────┤
│  Layer 2 — Transport                                    │
│  • AES-256-GCM encrypted cookies                        │
│  • HttpOnly + Secure + SameSite=Lax                     │
│  • HTTPS enforced (HSTS preload)                        │
├─────────────────────────────────────────────────────────┤
│  Layer 1 — Network / Headers                            │
│  • CSP (script/style/connect restricted)                │
│  • X-Frame-Options: DENY                                │
│  • X-Content-Type-Options: nosniff                      │
│  • Permissions-Policy (no camera/mic/geo)               │
│  • COOP + CORP: same-origin                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 حجم المشروع

| المقياس | القيمة |
|---|---:|
| `index.html` | ~270 KB (~6000 سطر) |
| ملفات JS في `/api` | 10 ملفات (~15 KB) |
| ملفات التوثيق `.md` | 3+ ملفات |
| اعتماديات npm (backend) | 2 (xlsx, cookie) |
| اعتماديات CDN (frontend) | 6+ |
| Vercel Functions | 7 (5 onedrive + 2 otp) |
| إجمالي المستودع | < 500 KB (بدون node_modules) |

---

## 🎨 خريطة الوظائف داخل `index.html`

| السطر | القسم |
|---:|---|
| 1 – 1400 | CSS: Design tokens + جميع الأنماط |
| 1400 – 1900 | HTML: lock, header, home hero, صفحات التقارير، /data |
| 1900 – 2500 | HTML: drawers (editor, settings, details modal, OTP), scripts |
| 2500 – 2900 | i18n dictionary (TR{ar,en}) + `t()` + `applyLang()` |
| 2900 – 3100 | Firebase config + init + auth listener |
| 3100 – 3450 | Login/lock: sha256, tryLogin, unlock, idle timeout, session ID |
| 3450 – 3650 | OTP: gateOnOTP, requestOTP, verifyOTP, timer |
| 3650 – 3900 | Data model + seed + `recomputeFromInvoices` |
| 3900 – 4100 | subscribeCloudData (Firestore real-time) + save/load |
| 4100 – 4400 | Render: KPIs, Aging, DSO, Debtors, Invoices |
| 4400 – 4700 | Projects + Campaigns rendering + drill-down |
| 4700 – 5000 | Details modal + AI Helper |
| 5000 – 5300 | /data grid editor + findLive + add/delete row |
| 5300 – 5500 | Excel import/export (SheetJS) |
| 5500 – 5800 | Settings drawer + users management + permissions |
| 5800 – 6100 | API sync + OneDrive integration (client side) |
| 6100 – 6300 | Routing (pushState + popstate) |
| 6300 – 6700 | Global search (Ctrl+K) |

---

## 👥 المستخدمون الافتراضيون

- **z.albaydani@tact.sa** — Super User (المسؤول الرئيسي)
- **saleh@tact.sa** — Editor
- المزيد يُضاف من قِبل الـ Super User عبر Settings → Users

---

## 🐛 قرارات معمارية مهمة

### لماذا SPA في ملف واحد؟
- **بساطة النشر**: ملف HTML واحد على CDN بدون build step
- **سرعة التطوير**: تعديل مباشر بدون webpack/vite/rollup
- **أمان**: كل الكود مرئي، لا bundling يخفي شيئاً
- **الثمن**: الملف كبير، لكن CDN يخدمه مضغوطاً

### لماذا Firestore بدلاً من SQL؟
- **مزامنة فورية**: `onSnapshot` مجاناً
- **Auth مدمج** مع Firebase
- **بدون خادم**: تكلفة صفر عند عدم الاستخدام
- **Security Rules قوية**: تحكم على مستوى الحقل

### لماذا `_uid` لكل صف؟
Firestore يستبدل الكائنات كاملة عند التزامن، فالمراجع بالـ closure تُكسَر. `_uid` يسمح بـ `findLive()` أن يعثر على الصف "الحيّ" بعد round-trip.

### لماذا OTP في cookies بدلاً من قاعدة بيانات؟
Serverless stateless — لا ذاكرة مشتركة. Cookie encrypted يعطي نفس الفائدة بدون Redis/KV store، مع HttpOnly تحميه من JS.

---

## 🔮 التحسينات المقترحة

- [ ] فصل JS إلى ملفات منفصلة لتشديد CSP (إزالة `unsafe-inline`)
- [ ] إضافة IP-based rate limiting (يتطلب Vercel KV أو Upstash)
- [ ] Audit log لكل تعديل حساس
- [ ] Bulk import validation قبل الحفظ
- [ ] PWA support للعمل offline
- [ ] Notifications للفواتير المتأخرة
- [ ] Email digest أسبوعي للـ Super Users
- [ ] Multi-workspace support (لو أرادت Tact إدارة عملاء متعددين)

---

## 📚 المراجع

- **Repository**: https://github.com/ziyadhh12/analysis
- **Production**: https://analysis.tact.sa
- **Firebase Console**: https://console.firebase.google.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Resend Dashboard**: https://resend.com/emails
- **Azure Portal**: https://portal.azure.com

---

## 📝 الترخيص

مشروع خاص بـ **Tact Digital Communications**. جميع الحقوق محفوظة.

---

## 🤝 المساهمة والصيانة

- **المطور الرئيسي**: Ziad (z.albaydani@tact.sa)
- **الأداة المساعدة**: Claude Code (Anthropic)
- **آخر تحديث**: 2026-09-30
