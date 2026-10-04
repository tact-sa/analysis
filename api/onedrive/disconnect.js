// POST|GET /api/onedrive/disconnect → clear the stored OneDrive token.
const { setCookies, clearCookie } = require("../_lib/crypto");
const { TOKEN_COOKIE } = require("../_lib/msgraph");

module.exports = async (req, res) => {
  setCookies(res, [clearCookie(TOKEN_COOKIE)]);
  res.status(200).json({ ok: true });
};
