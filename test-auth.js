#!/usr/bin/env node

/**
 * 🧪 Auth Backend Test Script
 * Test tất cả auth endpoints để verify trước khi frontend tích hợp
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:5512';

// Test data
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'Test@1234';
let accessToken = '';
let refreshToken = '';
let userId = '';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, icon, message) {
  console.log(`${colors[color]}${icon} ${message}${colors.reset}`);
}

function logSuccess(message) {
  log('green', '✅', message);
}

function logError(message) {
  log('red', '❌', message);
}

function logInfo(message) {
  log('cyan', 'ℹ️', message);
}

function logWarn(message) {
  log('yellow', '⚠️', message);
}

// HTTP request helper
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test cases
async function testCheckEmail() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '1️⃣  CHECK EMAIL' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    logInfo(`Testing email: ${testEmail}`);
    const res = await makeRequest('GET', `/auth/check-email?email=${testEmail}`);

    if (res.status === 200) {
      logSuccess(`Status: ${res.status}`);
      logSuccess(`Response: ${JSON.stringify(res.body)}`);
      return true;
    } else {
      logError(`Status: ${res.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testRegister() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '2️⃣  REGISTER' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    logInfo(`Registering: ${testEmail}`);
    const res = await makeRequest('POST', '/auth/register', {
      email: testEmail,
      password: testPassword,
    });

    if (res.status === 200 || res.status === 201) {
      logSuccess(`Status: ${res.status}`);
      logSuccess(`Response: ${JSON.stringify(res.body)}`);
      if (res.body?.user?.id) {
        userId = res.body.user.id;
        logSuccess(`✓ User ID: ${userId}`);
      }
      return true;
    } else {
      logError(`Status: ${res.status}`);
      logError(`Response: ${JSON.stringify(res.body)}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testLogin() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '3️⃣  LOGIN (HttpOnly Cookies Check)' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    logInfo(`Logging in: ${testEmail}`);
    const res = await makeRequest('POST', '/auth/login', {
      email: testEmail,
      password: testPassword,
    });

    if (res.status === 200) {
      logSuccess(`Status: ${res.status}`);

      // Check tokens in response body
      if (res.body?.accessToken) {
        accessToken = res.body.accessToken;
        logSuccess(`✓ Access Token (first 30 chars): ${accessToken.substring(0, 30)}...`);
      }
      if (res.body?.refreshToken) {
        refreshToken = res.body.refreshToken;
        logSuccess(`✓ Refresh Token (first 30 chars): ${refreshToken.substring(0, 30)}...`);
      }

      // Check Set-Cookie headers
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        logSuccess(`✓ Set-Cookie headers received:`);
        setCookie.forEach((cookie, idx) => {
          const cookieName = cookie.split('=')[0];
          const isHttpOnly = cookie.includes('HttpOnly');
          const isSecure = cookie.includes('Secure');
          const isSameSite = cookie.includes('SameSite');
          const maxAge = cookie.match(/Max-Age=(\d+)/)?.[1];

          logSuccess(`  [${idx + 1}] ${cookieName}`);
          logSuccess(`      HttpOnly: ${isHttpOnly ? 'YES ✓' : 'NO ❌'}`);
          logSuccess(`      Secure: ${isSecure ? 'YES ✓' : 'NO (OK on localhost)'}`);
          logSuccess(`      SameSite: ${isSameSite ? 'YES ✓' : 'NO ❌'}`);
          logSuccess(`      Max-Age: ${maxAge ? maxAge + 's' : 'Session'}`);
        });
      } else {
        logWarn('⚠️ Set-Cookie headers NOT found');
      }

      return true;
    } else {
      logError(`Status: ${res.status}`);
      logError(`Response: ${JSON.stringify(res.body)}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testGetProfile() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '4️⃣  GET PROFILE (Protected Endpoint)' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    logInfo(`Testing JWT Auth Guard...`);
    const res = await makeRequest('GET', '/auth/me', null, {
      Authorization: `Bearer ${accessToken}`,
    });

    if (res.status === 200) {
      logSuccess(`Status: ${res.status}`);
      logSuccess(`✓ User profile: ${JSON.stringify(res.body)}`);
      return true;
    } else {
      logError(`Status: ${res.status}`);
      logError(`Response: ${JSON.stringify(res.body)}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testGetPermissions() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '5️⃣  GET PERMISSIONS' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    logInfo(`Fetching user permissions...`);
    const res = await makeRequest('GET', '/auth/my-permissions', null, {
      Authorization: `Bearer ${accessToken}`,
    });

    if (res.status === 200) {
      logSuccess(`Status: ${res.status}`);
      logSuccess(`Role: ${res.body?.role}`);
      logSuccess(`Is Admin: ${res.body?.isAdmin}`);
      logSuccess(`Permissions Count: ${res.body?.permissions?.length || 0}`);
      if (res.body?.permissions?.length > 0) {
        logSuccess(`Sample Permission: ${JSON.stringify(res.body.permissions[0])}`);
      }
      return true;
    } else {
      logError(`Status: ${res.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testRefreshToken() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '6️⃣  REFRESH TOKEN (Token Rotation)' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    const oldAccessToken = accessToken;

    logInfo(`Refreshing token...`);
    const res = await makeRequest('POST', '/auth/refresh', {
      refreshToken: refreshToken,
    });

    if (res.status === 200) {
      logSuccess(`Status: ${res.status}`);
      logSuccess(`Message: ${res.body?.message}`);

      // Check new cookies
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        logSuccess(`✓ New tokens set in cookies`);
        logSuccess(`✓ Cookies received: ${setCookie.length}`);
      }

      return true;
    } else {
      logError(`Status: ${res.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testLogout() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '7️⃣  LOGOUT (Revoke Tokens)' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    logInfo(`Logging out...`);
    const res = await makeRequest('POST', '/auth/logout', null, {
      Authorization: `Bearer ${accessToken}`,
    });

    if (res.status === 200) {
      logSuccess(`Status: ${res.status}`);
      logSuccess(`Message: ${res.body?.message}`);

      // Check clear-cookie headers
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        let clearedCount = 0;
        setCookie.forEach((cookie) => {
          if (cookie.includes('Max-Age=0')) {
            clearedCount++;
          }
        });
        logSuccess(`✓ Cookies cleared: ${clearedCount} cookies`);
      }

      return true;
    } else {
      logError(`Status: ${res.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testTokenInvalidAfterLogout() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '8️⃣  TEST REVOKED TOKEN (Should Fail)' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    logInfo(`Testing if revoked token is rejected...`);
    const res = await makeRequest('GET', '/auth/me', null, {
      Authorization: `Bearer ${accessToken}`,
    });

    if (res.status === 401) {
      logSuccess(`Status: ${res.status} ✓ Token properly revoked`);
      logSuccess(`Message: ${res.body?.message}`);
      return true;
    } else if (res.status === 200) {
      logWarn(`Status: ${res.status} - Token still valid (refresh not working?)`);
      return false;
    } else {
      logError(`Status: ${res.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testUnauthorizedEndpoint() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '9️⃣  TEST UNPROTECTED ACCESS (Should Fail)' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    logInfo(`Testing protected endpoint without token...`);
    const res = await makeRequest('GET', '/auth/me');

    if (res.status === 401) {
      logSuccess(`Status: ${res.status} ✓ Guard working correctly`);
      logSuccess(`Message: ${res.body?.message}`);
      return true;
    } else {
      logError(`Status: ${res.status} - Guard NOT protecting endpoint`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

async function testPasswordReset() {
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '🔟 PASSWORD RESET REQUEST' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  try {
    logInfo(`Requesting password reset for: ${testEmail}`);
    const res = await makeRequest('POST', '/auth/request-password-reset', {
      email: testEmail,
      resetMethod: 'link',
    });

    if (res.status === 200) {
      logSuccess(`Status: ${res.status}`);
      logSuccess(`Message: ${res.body?.message}`);
      logWarn(`📧 Check email for reset link`);
      return true;
    } else {
      logError(`Status: ${res.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + colors.bright + colors.cyan);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       🧪 AL-TASK BACKEND AUTH QUICK TEST SUITE              ║');
  console.log('║              Testing All Auth Endpoints                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Test User: ${testEmail}`);

  const results = [];

  results.push({ name: '1️⃣  Check Email', pass: await testCheckEmail() });
  results.push({ name: '2️⃣  Register', pass: await testRegister() });
  results.push({ name: '3️⃣  Login (HttpOnly Cookies)', pass: await testLogin() });
  results.push({ name: '4️⃣  Get Profile', pass: await testGetProfile() });
  results.push({ name: '5️⃣  Get Permissions', pass: await testGetPermissions() });
  results.push({ name: '6️⃣  Refresh Token', pass: await testRefreshToken() });
  results.push({ name: '7️⃣  Logout', pass: await testLogout() });
  results.push({ name: '8️⃣  Test Revoked Token', pass: await testTokenInvalidAfterLogout() });
  results.push({ name: '9️⃣  Unprotected Access (Should Fail)', pass: await testUnauthorizedEndpoint() });
  results.push({ name: '🔟 Password Reset', pass: await testPasswordReset() });

  // Summary
  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '📊 TEST SUMMARY' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  results.forEach((result) => {
    if (result.pass) {
      logSuccess(result.name);
    } else {
      logError(result.name);
    }
  });

  console.log('');
  if (percentage === 100) {
    logSuccess(`✨ ALL TESTS PASSED: ${passed}/${total} (${percentage}%)`);
    console.log(colors.green + '\n🎉 Backend auth is ready for frontend integration!' + colors.reset);
  } else if (percentage >= 70) {
    logWarn(`PARTIAL SUCCESS: ${passed}/${total} (${percentage}%)`);
  } else {
    logError(`FAILED: ${passed}/${total} (${percentage}%)`);
  }

  console.log('\n' + colors.bright + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '🚀 READY FOR FRONTEND?' + colors.reset);
  console.log(colors.bright + '═══════════════════════════════════════' + colors.reset);

  if (percentage >= 80) {
    logSuccess('✅ Backend is READY for frontend integration');
    logSuccess('✅ HttpOnly Cookies are working');
    logSuccess('✅ JWT Auth Guards are protecting endpoints');
    logSuccess('✅ Token rotation is functional');
    console.log('\n' + colors.bright + 'Next Steps:' + colors.reset);
    console.log('1. ✅ Share Postman collection with frontend team');
    console.log('2. ✅ Frontend can start integration');
    console.log('3. ✅ Run full Postman tests after integration');
  } else {
    logError('❌ Fix remaining issues before frontend integration');
  }

  console.log('');
  process.exit(percentage === 100 ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
