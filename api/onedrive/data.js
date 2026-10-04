// GET /api/onedrive/data?path=X.xlsx&sheet=data&projects_sheet=projects → { invoices, projects }
const XLSX = require("xlsx");
const { getAccessToken, downloadFile } = require("../_lib/msgraph");

const ALLOWED_EXT = /\.(xlsx|xlsm|xls|csv)$/i;
const MAX_BYTES = 15 * 1024 * 1024;

// Restrict to a plain relative path inside the user's OneDrive (CWE-22 / CWE-918).
function cleanPath(p) {
  const s = String(p || "").trim().replace(/^\/+/, "");
  if (!s || s.length > 400) return null;
  if (!ALLOWED_EXT.test(s)) return null;
  if (s.split("/").some(seg => !seg || seg === "." || seg === "..")) return null;
  if (/[\\:*?"<>|\x00-\x1f]/.test(s)) return null;
  return s;
}
function cleanSheet(s, fallback) {
  const v = String(s || fallback).trim();
  return v.length && v.length <= 100 ? v : fallback;
}
function findSheet(wb, name) {
  if (wb.Sheets[name]) return wb.Sheets[name];
  const norm = x => String(x).trim().toLowerCase().replace(/\s+/g, "");
  const hit = wb.SheetNames.find(n => norm(n) === norm(name));
  return hit ? wb.Sheets[hit] : null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const filePath = cleanPath(req.query && req.query.path);
  if (!filePath) return res.status(400).json({ error: "مسار ملف غير صالح (xlsx/xls/csv فقط)" });
  const sheet = cleanSheet(req.query.sheet, "data");
  const projectsSheet = cleanSheet(req.query.projects_sheet, "projects");

  try {
    const token = await getAccessToken(req, res);
    const buf = await downloadFile(token, filePath);
    if (buf.length > MAX_BYTES) return res.status(413).json({ error: "الملف أكبر من 15MB" });
    const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
    const invSheet = findSheet(wb, sheet) || wb.Sheets[wb.SheetNames[0]];
    const prjSheet = findSheet(wb, projectsSheet);
    const invoices = invSheet ? XLSX.utils.sheet_to_json(invSheet, { defval: null }) : [];
    const projects = prjSheet ? XLSX.utils.sheet_to_json(prjSheet, { defval: null }) : [];
    return res.status(200).json({ invoices, projects, file: filePath });
  } catch (e) {
    const status = e.status === 401 ? 401 : e.status === 404 ? 404 : 502;
    const msg = status === 401 ? "Not connected — reconnect"
              : status === 404 ? "الملف غير موجود في OneDrive"
              : "فشل قراءة الملف من OneDrive";
    if (status === 502) console.error("onedrive data:", e.message);
    return res.status(status).json({ error: msg });
  }
};
