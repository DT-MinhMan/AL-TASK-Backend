/* eslint-disable no-console */
/**
 * Integration auth v2 test (cookie-first, rotation, reuse detection, revoke, rate limit).
 * Run: node scripts/test-auth-v2.js
 * Env:
 *   BASE_URL=http://localhost:3000/api
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');

// Backend default port (see `src/main.ts`: process.env.PORT || 5512)
const DEFAULT_BASE_URL = 'http://localhost:5512';
// API prefix used in Postman env: /api
const DEFAULT_API_PREFIX = process.env.API_PREFIX || '/api';
const BASE_URL_RAW = process.env.BASE_URL || process.env.baseUrl || DEFAULT_BASE_URL;
// Normalize: allow BASE_URL either with or without /api
const BASE_URL = BASE_URL_RAW.endsWith(DEFAULT_API_PREFIX)
  ? BASE_URL_RAW
  : BASE_URL_RAW.replace(/\/$/, '') + DEFAULT_API_PREFIX;

const COOKIE_NAMES = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
};

// ---------- color/log ----------
const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const log = {
  section: (t) => console.log(`\n${ANSI.bold}${ANSI.cyan}== ${t} ==${ANSI.reset}`),
  info: (t) => console.log(`${ANSI.blue}INFO${ANSI.reset} ${t}`),
  ok: (t) => console.log(`${ANSI.green}PASS${ANSI.reset} ${t}`),
  warn: (t) => console.log(`${ANSI.yellow}WARN${ANSI.reset} ${t}`),
  err: (t) => console.log(`${ANSI.red}FAIL${ANSI.reset} ${t}`),
  kv: (k, v) => console.log(`${ANSI.gray}${k}:${ANSI.reset} ${v}`),
};

// ---------- cookie jar ----------
/**
 * cookieJar[name] = {
 *   value: string,
 *   attrs: { [lowerKey]: string|true },
 *   raw: string,
 * }
 */
const cookieJar = Object.create(null);

function parseCookies(setCookieHeaders) {
  // returns array of { name, value, attrs, raw }
  if (!setCookieHeaders) return [];
  const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  return arr
    .filter(Boolean)
    .map((raw) => {
      const parts = String(raw).split(';').map((p) => p.trim());
      const [nv, ...attrParts] = parts;
      const eqIdx = nv.indexOf('=');
      const name = eqIdx >= 0 ? nv.slice(0, eqIdx) : nv;
      const value = eqIdx >= 0 ? nv.slice(eqIdx + 1) : '';
      const attrs = Object.create(null);
      for (const ap of attrParts) {
        if (!ap) continue;
        const i = ap.indexOf('=');
        if (i === -1) attrs[ap.toLowerCase()] = true;
        else attrs[ap.slice(0, i).toLowerCase()] = ap.slice(i + 1);
      }
      return { name, value, attrs, raw: String(raw) };
    });
}

function updateCookieJar(setCookieHeaders) {
  const parsed = parseCookies(setCookieHeaders);
  for (const c of parsed) {
    if (!c.name) continue;
    cookieJar[c.name] = { value: c.value, attrs: c.attrs, raw: c.raw };
  }
  return parsed;
}

function getCookieHeader(overrides) {
  const src = overrides || cookieJar;
  const pairs = [];
  for (const [k, v] of Object.entries(src)) {
    if (!v || typeof v.value !== 'string') continue;
    if (v.value === '') continue;
    pairs.push(`${k}=${v.value}`);
  }
  return pairs.join('; ');
}

function extractCookieValue(setCookieHeaders, cookieName) {
  const parsed = parseCookies(setCookieHeaders);
  const found = parsed.find((c) => c.name === cookieName);
  return found ? found.value : undefined;
}

function cloneCookieJar() {
  const out = Object.create(null);
  for (const [k, v] of Object.entries(cookieJar)) out[k] = { ...v, attrs: { ...v.attrs } };
  return out;
}

function minimalCookieJarSnapshot(names) {
  const out = Object.create(null);
  for (const n of names) {
    if (cookieJar[n]) out[n] = { ...cookieJar[n], attrs: { ...cookieJar[n].attrs } };
  }
  return out;
}

// ---------- http helper ----------
function readBody(res) {
  return new Promise((resolve) => {
    const chunks = [];
    res.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(String(d))));
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function makeRequest(method, path, opts) {
  const options = opts || {};
  const url = new URL(path, BASE_URL);
  const isHttps = url.protocol === 'https:';

  const headers = Object.assign({}, options.headers || {});

  const cookieHeader = options.cookieHeader;
  if (cookieHeader) headers.Cookie = cookieHeader;

  let bodyStr;
  if (options.json !== undefined) {
    bodyStr = JSON.stringify(options.json);
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    headers['Content-Length'] = Buffer.byteLength(bodyStr);
  } else if (options.body !== undefined) {
    bodyStr = String(options.body);
    headers['Content-Length'] = Buffer.byteLength(bodyStr);
  }

  const reqOptions = {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    method,
    path: url.pathname + url.search,
    headers,
  };

  const transport = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(reqOptions, async (res) => {
      const rawBody = await readBody(res);
      const setCookie = res.headers['set-cookie'];
      const contentType = String(res.headers['content-type'] || '');
      let json;
      if (rawBody && contentType.includes('application/json')) {
        try {
          json = JSON.parse(rawBody);
        } catch {
          json = undefined;
        }
      }
      resolve({
        url: url.toString(),
        status: res.statusCode,
        headers: res.headers,
        setCookie,
        rawBody,
        json,
      });
    });
    req.on('error', reject);
    if (bodyStr !== undefined) req.write(bodyStr);
    req.end();
  });
}

// ---------- asserts / suite ----------
let pass = 0;
let fail = 0;
let warn = 0;
const criticalFailures = [];

function record(ok, msg, critical) {
  if (ok) {
    pass += 1;
    log.ok(msg);
    return;
  }
  fail += 1;
  log.err(msg);
  if (critical) criticalFailures.push(msg);
}

function recordWarn(msg) {
  warn += 1;
  log.warn(msg);
}

function assertEq(a, b, msg, critical) {
  record(a === b, `${msg} (${JSON.stringify(a)} === ${JSON.stringify(b)})`, critical);
}

function assertOneOf(a, list, msg, critical) {
  record(list.includes(a), `${msg} (${a} in ${JSON.stringify(list)})`, critical);
}

function assertTruthy(v, msg, critical) {
  record(Boolean(v), msg, critical);
}

function isProductionBaseUrl() {
  // heuristic: non-localhost + https likely prod
  try {
    const u = new URL(BASE_URL);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return false;
    if (u.protocol === 'https:') return true;
    return true;
  } catch {
    return false;
  }
}

function validateCookieFlags(parsedCookies, cookieName, critical) {
  const c = parsedCookies.find((x) => x.name === cookieName);
  if (!c) {
    record(false, `Cookie ${cookieName} present`, critical);
    return;
  }

  record(Boolean(c.attrs.httponly), `Cookie ${cookieName} has HttpOnly`, critical);
  record(Boolean(c.attrs.samesite), `Cookie ${cookieName} has SameSite`, critical);
  record(Boolean(c.attrs.path), `Cookie ${cookieName} has Path`, false);

  // backend uses Express maxAge(ms) => Set-Cookie uses Max-Age=seconds usually
  record(Boolean(c.attrs['max-age'] || c.attrs.expires), `Cookie ${cookieName} has Max-Age/Expires`, critical);

  const prod = isProductionBaseUrl();
  if (prod) record(Boolean(c.attrs.secure), `Cookie ${cookieName} has Secure (prod)`, critical);
  else if (c.attrs.secure) record(true, `Cookie ${cookieName} has Secure (ok on localhost)`, false);
  else recordWarn(`Cookie ${cookieName} missing Secure (ok on localhost/non-prod)`);
}

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function randomEmail() {
  const ts = Date.now();
  const rnd = crypto.randomBytes(3).toString('hex');
  return `itest_${ts}_${rnd}@example.com`;
}

async function main() {
  log.section('0. Config');
  log.kv('BASE_URL', BASE_URL);

  // shared test data
  const email = randomEmail();
  const password = 'Test@1234';
  let userId;

  // ========== 1. Health / Basic Connectivity ==========
  log.section('1. Health / Basic Connectivity');
  try {
    const r0 = await makeRequest('GET', '/', { headers: { Accept: 'application/json' } });
    assertTruthy(r0.status, `Backend reachable (GET /) status=${r0.status}`, true);
  } catch (e) {
    record(false, `Backend reachable (network error: ${e && e.message ? e.message : String(e)})`, true);
    throw e;
  }

  // "Verify auth endpoints respond" -> hit login/register/me expecting non-network response
  const rMe0 = await makeRequest('GET', '/auth/me', { headers: { Accept: 'application/json' } });
  record([200, 401, 403].includes(rMe0.status), `Auth endpoint /auth/me responds (status=${rMe0.status})`, true);

  const rLogin0 = await makeRequest('POST', '/auth/login', { json: { email: 'x', password: 'y' } });
  record(Boolean(rLogin0.status), `Auth endpoint /auth/login responds (status=${rLogin0.status})`, true);

  // ========== 2. Register ==========
  log.section('2. Register');
  log.kv('email', email);

  const rReg = await makeRequest('POST', '/auth/register', {
    // RegisterDto expects only {email,password}
    json: { email, password },
  });

  assertOneOf(rReg.status, [200, 201], 'Register status', true);
  log.info(`Register response body: ${rReg.rawBody || '(empty)'}`);
  userId = rReg.json && (rReg.json.userId || rReg.json._id || rReg.json.id || (rReg.json.user && (rReg.json.user._id || rReg.json.user.id)));
  assertTruthy(userId, 'Register returns userId', true);

  // ========== 3. Login ==========
  log.section('3. Login');
  const rLogin = await makeRequest('POST', '/auth/login', {
    json: { email, password },
  });
  assertEq(rLogin.status, 200, 'Login status 200', true);

  const parsedLoginCookies = updateCookieJar(rLogin.setCookie);
  assertTruthy(rLogin.setCookie && parsedLoginCookies.length, 'Login Set-Cookie received', true);

  const accessCookie = cookieJar[COOKIE_NAMES.ACCESS];
  const refreshCookie = cookieJar[COOKIE_NAMES.REFRESH];
  assertTruthy(accessCookie && accessCookie.value, 'access_token cookie exists', true);
  assertTruthy(refreshCookie && refreshCookie.value, 'refresh_token cookie exists', true);

  validateCookieFlags(parsedLoginCookies, COOKIE_NAMES.ACCESS, true);
  validateCookieFlags(parsedLoginCookies, COOKIE_NAMES.REFRESH, true);

  // ========== 4. Profile via Cookie Auth ==========
  log.section('4. Profile via Cookie Auth');
  const rMe = await makeRequest('GET', '/auth/me', {
    cookieHeader: getCookieHeader(),
    headers: { Accept: 'application/json' },
  });
  assertEq(rMe.status, 200, 'GET /auth/me via cookies -> 200', true);
  const meId = rMe.json && (rMe.json._id || rMe.json.id || rMe.json.userId);
  if (meId && userId) assertEq(String(meId), String(userId), 'Returned user matches registered userId', true);
  else recordWarn(`Could not strictly compare userId (meId=${meId}, registered=${userId})`);

  // ========== 5. Refresh Rotation ==========
  log.section('5. Refresh Rotation');
  const oldRefresh = cookieJar[COOKIE_NAMES.REFRESH] ? cookieJar[COOKIE_NAMES.REFRESH].value : undefined;
  assertTruthy(oldRefresh, 'Snapshot OLD refresh token', true);

  const rRefresh = await makeRequest('POST', '/auth/refresh', {
    cookieHeader: getCookieHeader(),
    // RefreshTokenDto requires non-empty refreshToken; cookie still source-of-truth
    json: { refreshToken: 'cookie' },
  });
  assertEq(rRefresh.status, 200, 'POST /auth/refresh -> 200', true);

  const parsedRefreshCookies = updateCookieJar(rRefresh.setCookie);
  assertTruthy(rRefresh.setCookie && parsedRefreshCookies.length, 'Refresh Set-Cookie received', true);

  const newAccess = cookieJar[COOKIE_NAMES.ACCESS] ? cookieJar[COOKIE_NAMES.ACCESS].value : undefined;
  const newRefresh = cookieJar[COOKIE_NAMES.REFRESH] ? cookieJar[COOKIE_NAMES.REFRESH].value : undefined;
  assertTruthy(newAccess, 'New access_token present after refresh', true);
  assertTruthy(newRefresh, 'New refresh_token present after refresh', true);
  record(newRefresh !== oldRefresh, 'Refresh rotation: new refresh != old refresh', true);
  log.info('Rotation successful');

  // ========== 6. Logout ==========
  log.section('6. Logout');
  const cookiesBeforeLogout = cloneCookieJar();
  const rLogout = await makeRequest('POST', '/auth/logout', {
    cookieHeader: getCookieHeader(),
    json: {},
  });
  assertEq(rLogout.status, 200, 'POST /auth/logout -> 200', true);

  const parsedLogoutCookies = parseCookies(rLogout.setCookie);
  assertTruthy(parsedLogoutCookies.length, 'Logout Set-Cookie received', true);

  const clearedAccess = extractCookieValue(rLogout.setCookie, COOKIE_NAMES.ACCESS);
  const clearedRefresh = extractCookieValue(rLogout.setCookie, COOKIE_NAMES.REFRESH);
  // cleared might be empty string
  record(clearedAccess === '' || clearedAccess === undefined, 'Logout clears access_token cookie', true);
  record(clearedRefresh === '' || clearedRefresh === undefined, 'Logout clears refresh_token cookie', true);

  const accessLogout = parsedLogoutCookies.find((c) => c.name === COOKIE_NAMES.ACCESS);
  const refreshLogout = parsedLogoutCookies.find((c) => c.name === COOKIE_NAMES.REFRESH);
  if (accessLogout) record(String(accessLogout.attrs['max-age'] || '') === '0' || Boolean(accessLogout.attrs.expires), 'Logout access cookie Max-Age=0/Expires', true);
  if (refreshLogout) record(String(refreshLogout.attrs['max-age'] || '') === '0' || Boolean(refreshLogout.attrs.expires), 'Logout refresh cookie Max-Age=0/Expires', true);

  // jar now updated to cleared values
  updateCookieJar(rLogout.setCookie);

  // ========== 7. Revoked Token Rejection ==========
  log.section('7. Revoked Token Rejection');
  // Use OLD cookies snapshot from before logout
  const oldCookieHeader = getCookieHeader(cookiesBeforeLogout);
  const rMeAfterLogout = await makeRequest('GET', '/auth/me', {
    cookieHeader: oldCookieHeader,
    headers: { Accept: 'application/json' },
  });
  assertEq(rMeAfterLogout.status, 401, 'GET /auth/me with revoked cookies -> 401', true);

  // ========== 8. Unauthorized Access ==========
  log.section('8. Unauthorized Access');
  const rMeNoCookies = await makeRequest('GET', '/auth/me', { headers: { Accept: 'application/json' } });
  assertEq(rMeNoCookies.status, 401, 'GET /auth/me without cookies -> 401', true);

  // ========== 9. Refresh Reuse Detection (MOST IMPORTANT) ==========
  log.section('9. Refresh Reuse Detection');
  // fresh login (avoid rate limit side effects later)
  const email2 = randomEmail();
  const rReg2 = await makeRequest('POST', '/auth/register', {
    json: { email: email2, password, confirmPassword: password },
  });
  assertOneOf(rReg2.status, [200, 201], 'Register (reuse test) status', true);

  const rLogin2 = await makeRequest('POST', '/auth/login', { json: { email: email2, password } });
  assertEq(rLogin2.status, 200, 'Login (reuse test) status 200', true);
  updateCookieJar(rLogin2.setCookie);

  const refreshA = cookieJar[COOKIE_NAMES.REFRESH] ? cookieJar[COOKIE_NAMES.REFRESH].value : undefined;
  assertTruthy(refreshA, 'Captured refresh token A', true);

  const rRefresh1 = await makeRequest('POST', '/auth/refresh', { cookieHeader: getCookieHeader(), json: { refreshToken: 'cookie' } });
  assertEq(rRefresh1.status, 200, 'Refresh A -> get B (status 200)', true);
  updateCookieJar(rRefresh1.setCookie);

  const refreshB = cookieJar[COOKIE_NAMES.REFRESH] ? cookieJar[COOKIE_NAMES.REFRESH].value : undefined;
  assertTruthy(refreshB, 'Captured refresh token B', true);
  record(refreshB !== refreshA, 'A != B after rotation', true);

  // attempt refresh again using OLD refresh token A
  const jarWithOldA = minimalCookieJarSnapshot([COOKIE_NAMES.ACCESS, COOKIE_NAMES.REFRESH]);
  jarWithOldA[COOKIE_NAMES.REFRESH] = { ...jarWithOldA[COOKIE_NAMES.REFRESH], value: refreshA };
  const rReuseA = await makeRequest('POST', '/auth/refresh', {
    cookieHeader: getCookieHeader(jarWithOldA),
    json: { refreshToken: 'cookie' },
  });

  const reuseRejected = rReuseA.status === 401 || rReuseA.status === 403;
  record(reuseRejected, `Reuse old refresh A rejected (status=${rReuseA.status})`, true);

  const reuseBody = rReuseA.json || {};
  const reuseMsg = String(reuseBody.message || reuseBody.error || reuseBody.code || '');
  if (reuseMsg) log.info(`Reuse-A response msg/code: ${reuseMsg}`);
  if (/family|revoke|revoked|TOKEN_FAMILY_REVOKED/i.test(reuseMsg)) log.info('Reuse detection indicates token family revoke');

  // then try refresh again using refresh token B
  const jarWithB = minimalCookieJarSnapshot([COOKIE_NAMES.ACCESS, COOKIE_NAMES.REFRESH]);
  jarWithB[COOKIE_NAMES.REFRESH] = { ...jarWithB[COOKIE_NAMES.REFRESH], value: refreshB };
  const rAfterReuseWithB = await makeRequest('POST', '/auth/refresh', {
    cookieHeader: getCookieHeader(jarWithB),
    json: { refreshToken: 'cookie' },
  });

  if (/family|revoke|revoked|TOKEN_FAMILY_REVOKED/i.test(reuseMsg)) {
    record([401, 403].includes(rAfterReuseWithB.status), `After reuse, refresh B rejected due to family revoke (status=${rAfterReuseWithB.status})`, true);
  } else {
    // if server does not family-revoke, at minimum A must be rejected; B may still work.
    record([200, 401, 403].includes(rAfterReuseWithB.status), `After reuse, refresh B response acceptable (status=${rAfterReuseWithB.status})`, true);
    if (rAfterReuseWithB.status === 200) log.info('No family revoke detected (B still valid)');
    else log.info('Family revoke likely (B rejected)');
  }

  // ========== 10. Password Reset Generic Response ==========
  log.section('10. Password Reset Generic Response');
  const existingEmail = email2;
  const fakeEmail = randomEmail();

  const rResetExisting = await makeRequest('POST', '/auth/request-password-reset', { json: { email: existingEmail } });
  const rResetFake = await makeRequest('POST', '/auth/request-password-reset', { json: { email: fakeEmail } });

  assertEq(rResetExisting.status, rResetFake.status, 'Password reset status identical (existing vs fake)', true);

  const msgExisting = (rResetExisting.json && (rResetExisting.json.message || rResetExisting.json.msg)) || rResetExisting.rawBody;
  const msgFake = (rResetFake.json && (rResetFake.json.message || rResetFake.json.msg)) || rResetFake.rawBody;

  // prefer message compare; fallback -> rawBody compare trimmed
  record(String(msgExisting).trim() === String(msgFake).trim(), 'Password reset response generic (no enumeration)', true);

  // ========== 11. Rate Limiting ==========
  log.section('11. Rate Limiting');
  const rlEmail = existingEmail; // valid email, invalid password -> should count attempts
  let hit429 = false;
  let attempts = 0;
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i += 1) {
    attempts += 1;
    const r = await makeRequest('POST', '/auth/login', {
      json: { email: rlEmail, password: 'WrongPassword!@#' },
    });
    if (r.status === 429) {
      hit429 = true;
      break;
    }
    // also accept throttler alternative formats
    if (r.status === 201 || r.status === 200) {
      // should not happen with wrong password; keep going but warn.
      recordWarn(`RateLimit test got success status=${r.status} (unexpected with wrong password)`);
    }
  }
  record(hit429, `Rate limiting triggers (429) within ${maxAttempts} attempts`, true);
  log.info(`Requests before block: ${hit429 ? attempts : `${attempts} (no 429)`}`);

  // ========== 12. Cookie Security Flags ==========
  log.section('12. Cookie Security Flags');
  // perform login again to inspect cookies freshly
  const email3 = randomEmail();
  const rReg3 = await makeRequest('POST', '/auth/register', { json: { email: email3, password, confirmPassword: password } });
  assertOneOf(rReg3.status, [200, 201], 'Register (cookie flags) status', true);

  const rLogin3 = await makeRequest('POST', '/auth/login', { json: { email: email3, password } });
  assertEq(rLogin3.status, 200, 'Login (cookie flags) status 200', true);
  const parsed3 = parseCookies(rLogin3.setCookie);

  validateCookieFlags(parsed3, COOKIE_NAMES.ACCESS, true);
  validateCookieFlags(parsed3, COOKIE_NAMES.REFRESH, true);

  // ---------- summary ----------
  log.section('SUMMARY');
  console.log(`${ANSI.green}PASS${ANSI.reset} ${pass}  ${ANSI.red}FAIL${ANSI.reset} ${fail}  ${ANSI.yellow}WARN${ANSI.reset} ${warn}`);

  if (criticalFailures.length) {
    console.log(`\n${ANSI.red}${ANSI.bold}CRITICAL FAILURES${ANSI.reset}`);
    for (const m of criticalFailures) console.log(`- ${m}`);
  }

  const okExit = criticalFailures.length === 0;
  process.exitCode = okExit ? 0 : 1;
}

main().catch((e) => {
  log.section('UNHANDLED ERROR');
  log.err(e && e.stack ? e.stack : String(e));
  process.exitCode = 1;
});
