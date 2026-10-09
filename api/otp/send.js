// POST /api/otp/send  { email }  → emails a 6-digit code, stores the challenge in an encrypted cookie.
const crypto = require("crypto");
const { encrypt, decrypt, parseCookies, serializeCookie, setCookies } = require("../_lib/crypto");
const { sendMail } = require("../_lib/mail");

const CODE_TTL_S = 10 * 60;        // code valid 10 minutes
const CHALLENGE_TTL_S = 15 * 60;   // challenge cookie lifetime
const MAX_SENDS_PER_HOUR = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

function allowedDomain(email) {
  const list = (process.env.OTP_ALLOWED_DOMAINS || "tact.sa")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (list.includes("*")) return true;
  const domain = email.split("@")[1];
  return list.includes(domain);
}

function hashCode(email, code) {
  return crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: "بريد غير صالح" });
  }
  if (!allowedDomain(email)) {
    return res.status(403).json({ error: "هذا البريد غير مسموح له بالدخول" });
  }

  const cookies = parseCookies(req);
  const now = Date.now();
  let rl = decrypt(cookies.otp_rl) || { sends: [] };
  rl.sends = (rl.sends || []).filter(ts => now - ts < 60 * 60 * 1000);
  const last = rl.sends[rl.sends.length - 1] || 0;
  if (now - last < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - last)) / 1000);
    return res.status(429).json({ error: `انتظر ${wait} ثانية قبل طلب رمز جديد` });
  }
  if (rl.sends.length >= MAX_SENDS_PER_HOUR) {
    return res.status(429).json({ error: "تجاوزت الحد المسموح — حاول بعد ساعة" });
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  try {
    await sendMail({
      to: email,
      subject: `رمز التحقق: ${code}`,
      text: `رمز التحقق الخاص بك للدخول إلى analysis.tact.sa هو: ${code}\nالرمز صالح لمدة 10 دقائق.`,
      html: `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;padding:0;background:#F5F5F5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:14px;overflow:hidden;font-family:'Readex Pro',Tahoma,Arial,sans-serif;color:#282829">
      <tr><td style="background:#282829;padding:22px 28px" dir="ltr">
        <span style="font-size:30px;font-weight:700;color:#F15D2A;letter-spacing:-0.5px">tact</span>
        <span style="font-size:12px;color:#D9D9D9;letter-spacing:1px;margin-left:6px">FINANCIAL ANALYSIS<span style="color:#F15D2A">.</span></span>
      </td></tr>
      <tr><td style="padding:28px" dir="rtl">
        <p style="margin:0 0 6px;font-size:18px;font-weight:600">رمز التحقق</p>
        <p style="margin:0 0 20px;font-size:14px;color:#58585A">استخدم الرمز التالي لتسجيل الدخول إلى <b>التحليل المالي</b>:</p>
        <p style="margin:0 0 20px;padding:16px;background:#F5F5F5;border-radius:10px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#F15D2A" dir="ltr">${code}</p>
        <p style="margin:0;font-size:13px;color:#8C8C8E">الرمز صالح لمدة ١٠ دقائق. إذا لم تطلب هذا الرمز تجاهل الرسالة.</p>
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #E5E5E5;font-size:12px;color:#8C8C8E" dir="ltr">tact Digital Communications · tact.sa</td></tr>
    </table>
  </td></tr>
</table></body></html>`
    });
  } catch (e) {
    console.error("otp send failed:", e.message);
    return res.status(502).json({ error: "فشل إرسال الرمز — تأكد من إعدادات البريد" });
  }

  rl.sends.push(now);
  const challenge = { email, h: hashCode(email, code), exp: now + CODE_TTL_S * 1000, tries: 0 };
  setCookies(res, [
    serializeCookie("otp_ch", encrypt(challenge), { maxAge: CHALLENGE_TTL_S }),
    serializeCookie("otp_rl", encrypt(rl), { maxAge: 60 * 60 })
  ]);
  return res.status(200).json({ ok: true, expiresIn: CODE_TTL_S, remaining: MAX_SENDS_PER_HOUR - rl.sends.length });
};

module.exports.hashCode = hashCode;
