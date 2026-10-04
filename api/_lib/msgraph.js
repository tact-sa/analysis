// Microsoft identity platform + Graph API helpers for OneDrive access.
const { decrypt, encrypt, parseCookies, serializeCookie, setCookies } = require("./crypto");

const SCOPES = "offline_access User.Read Files.Read.All";
const TOKEN_COOKIE = "od_tok";
const TOKEN_MAX_AGE = 90 * 24 * 60 * 60; // refresh tokens live ~90 days

function cfg() {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenant = process.env.MS_TENANT_ID || "organizations";
  if (!clientId || !clientSecret) throw new Error("MS_CLIENT_ID / MS_CLIENT_SECRET are not configured");
  return { clientId, clientSecret, tenant };
}

function redirectUri(req) {
  if (process.env.MS_REDIRECT_URI) return process.env.MS_REDIRECT_URI;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `https://${host}/api/onedrive/callback`;
}

function authorizeUrl(req, state) {
  const { clientId, tenant } = cfg();
  const p = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(req),
    response_mode: "query",
    scope: SCOPES,
    state
  });
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${p}`;
}

async function tokenRequest(params) {
  const { clientId, clientSecret, tenant } = cfg();
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: SCOPES, ...params });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error_description || json.error || `token HTTP ${res.status}`);
  return json;
}

function exchangeCode(req, code) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(req) });
}

function refresh(refreshToken) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

async function graph(accessToken, path, { raw = false } = {}) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`Graph HTTP ${res.status}: ${txt.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return raw ? Buffer.from(await res.arrayBuffer()) : res.json();
}

async function getMe(accessToken) {
  const me = await graph(accessToken, "/me?$select=displayName,mail,userPrincipalName");
  return { name: me.displayName || "", email: me.mail || me.userPrincipalName || "" };
}

// Only the refresh token + user are stored (access tokens would overflow the 4KB cookie limit).
function saveSession(res, session) {
  setCookies(res, [serializeCookie(TOKEN_COOKIE, encrypt(session), { maxAge: TOKEN_MAX_AGE })]);
}

function readSession(req) {
  return decrypt(parseCookies(req)[TOKEN_COOKIE]);
}

// Returns a fresh access token, rotating the stored refresh token when Microsoft issues a new one.
async function getAccessToken(req, res) {
  const session = readSession(req);
  if (!session || !session.rt) {
    const e = new Error("Not connected");
    e.status = 401;
    throw e;
  }
  let tok;
  try {
    tok = await refresh(session.rt);
  } catch (err) {
    const e = new Error("OneDrive session expired — reconnect");
    e.status = 401;
    throw e;
  }
  if (tok.refresh_token && tok.refresh_token !== session.rt) {
    saveSession(res, { ...session, rt: tok.refresh_token });
  }
  return tok.access_token;
}

// Download a file by its path relative to the OneDrive root.
function downloadFile(accessToken, filePath) {
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  return graph(accessToken, `/me/drive/root:/${encoded}:/content`, { raw: true });
}

module.exports = {
  TOKEN_COOKIE, authorizeUrl, exchangeCode, getMe, saveSession, readSession, getAccessToken, downloadFile
};
