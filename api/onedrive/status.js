// GET /api/onedrive/status → { connected, user, expires_at }
const { readSession } = require("../_lib/msgraph");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const s = readSession(req);
    if (!s || !s.rt) return res.status(200).json({ connected: false });
    return res.status(200).json({
      connected: true,
      user: s.user || null,
      expires_at: s.at ? new Date(s.at + 90 * 24 * 60 * 60 * 1000).toISOString() : null
    });
  } catch (e) {
    return res.status(200).json({ connected: false });
  }
};
