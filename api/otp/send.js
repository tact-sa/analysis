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
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;color:#282829">
        <p>رمز التحقق الخاص بك للدخول إلى <b>التحليل المالي</b>:</p>
        <p style="font-size:30px;font-weight:700;letter-spacing:6px;color:#F15D2A;direction:ltr">${code}</p>
        <p style="color:#565657">الرمز صالح لمدة ١٠ دقائق. إذا لم تطلب هذا الرمز تجاهل الرسالة.</p>
      </div>`
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
