// GET /api/onedrive/callback?code=...&state=... → verify state, exchange code, store refresh token.
const { decrypt, safeEqual, parseCookies, setCookies, clearCookie } = require("../_lib/crypto");
const { exchangeCode, getMe, saveSession } = require("../_lib/msgraph");

function redirect(res, to) {
  res.statusCode = 302;
  res.setHeader("Location", to);
  res.end();
}

module.exports = async (req, res) => {
  const { code, state, error } = req.query || {};
  const saved = decrypt(parseCookies(req).od_state);
  setCookies(res, [clearCookie("od_state")]);

  if (error) return redirect(res, "/?onedrive=error");
  if (!code || !state || !saved || !saved.state || !safeEqual(saved.state, state)
      || Date.now() - saved.at > 10 * 60 * 1000) {
    return res.status(400).json({ error: "Invalid OAuth state" });
  }
  try {
    const tok = await exchangeCode(req, String(code));
    const user = await getMe(tok.access_token);
    saveSession(res, { rt: tok.refresh_token, user, at: Date.now() });
    return redirect(res, "/?onedrive=connected");
  } catch (e) {
    console.error("onedrive callback:", e.message);
    return redirect(res, "/?onedrive=error");
  }
};
