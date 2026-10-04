// AES-256-GCM helpers for encrypted, HttpOnly cookies + small cookie utilities.
const crypto = require("crypto");

function getKey() {
  const secret = process.env.COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("COOKIE_SECRET is missing or too short (need 32+ chars)");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, data]).toString("base64url");
}

function decrypt(token) {
  if (!token) return null;
  try {
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(out.toString("utf8"));
  } catch (e) {
    return null;
  }
}

// Constant-time string comparison (CWE-208)
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie || "";
  header.split(";").forEach(part => {
    const i = part.indexOf("=");
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function serializeCookie(name, value, { maxAge, path = "/" } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly; Secure; SameSite=Lax`;
  if (maxAge !== undefined) c += `; Max-Age=${Math.floor(maxAge)}`;
  return c;
}

function setCookies(res, cookies) {
  const prev = res.getHeader("Set-Cookie");
  const list = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
  res.setHeader("Set-Cookie", list.concat(cookies));
}

function clearCookie(name) {
  return serializeCookie(name, "", { maxAge: 0 });
}

module.exports = { encrypt, decrypt, safeEqual, parseCookies, serializeCookie, setCookies, clearCookie };
