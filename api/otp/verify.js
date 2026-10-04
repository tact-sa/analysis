// POST /api/otp/verify  { email, code }  → checks the code against the encrypted challenge cookie.
const { encrypt, decrypt, safeEqual, parseCookies, serializeCookie, setCookies, clearCookie } = require("../_lib/crypto");
const { hashCode } = require("./send");

const MAX_TRIES = 5;
const VERIFIED_TTL_S = 12 * 60 * 60;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  const code = String((req.body && req.body.code) || "").trim();
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "الرمز يجب أن يكون ٦ أرقام" });

  const ch = decrypt(parseCookies(req).otp_ch);
  if (!ch || !safeEqual(ch.email, email)) {
    return res.status(400).json({ error: "لا يوجد رمز نشط — اطلب رمزاً جديداً" });
  }
  if (Date.now() > ch.exp) {
    setCookies(res, [clearCookie("otp_ch")]);
    return res.status(400).json({ error: "انتهت صلاحية الرمز" });
  }
  if (ch.tries >= MAX_TRIES) {
    setCookies(res, [clearCookie("otp_ch")]);
    return res.status(429).json({ error: "محاولات كثيرة — اطلب رمزاً جديداً", remaining: 0 });
  }

  if (!safeEqual(ch.h, hashCode(email, code))) {
    ch.tries += 1;
    const remaining = MAX_TRIES - ch.tries;
    setCookies(res, [remaining > 0
      ? serializeCookie("otp_ch", encrypt(ch), { maxAge: Math.max(1, (ch.exp - Date.now()) / 1000) })
      : clearCookie("otp_ch")]);
    return res.status(400).json({ error: "الرمز غير صحيح", remaining });
  }

  setCookies(res, [
    clearCookie("otp_ch"),
    serializeCookie("otp_ok", encrypt({ email, at: Date.now() }), { maxAge: VERIFIED_TTL_S })
  ]);
  return res.status(200).json({ ok: true });
};
