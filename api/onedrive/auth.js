// GET /api/onedrive/auth → redirect to Microsoft sign-in (CSRF state stored in an encrypted cookie).
const crypto = require("crypto");
const { encrypt, serializeCookie, setCookies } = require("../_lib/crypto");
const { authorizeUrl } = require("../_lib/msgraph");

module.exports = async (req, res) => {
  try {
    const state = crypto.randomBytes(24).toString("base64url");
    setCookies(res, [serializeCookie("od_state", encrypt({ state, at: Date.now() }), { maxAge: 10 * 60 })]);
    res.statusCode = 302;
    res.setHeader("Location", authorizeUrl(req, state));
    res.end();
  } catch (e) {
    console.error("onedrive auth:", e.message);
    res.status(500).json({ error: "OneDrive غير مُعد على السيرفر" });
  }
};
