/**
 * End-to-end integration test suite for SheSorts authentication backend
 */
import { createApp } from './app';
import http from 'http';
import { pool } from './config/db';

async function runTests() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(5099, () => {
      console.log('🧪 Test server listening on http://localhost:5099');
      resolve();
    });
  });

  const baseUrl = 'http://localhost:5099/api';
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Jane Doe';

  let accessToken = '';
  let refreshToken = '';
  let cookies: string[] = [];

  const extractCookies = (res: globalThis.Response): string[] => {
    const raw = res.headers.get('set-cookie');
    if (!raw) return [];
    return raw.split(',').map((c) => c.split(';')[0].trim());
  };

  try {
    console.log('\n--- 1. Testing Health Endpoint ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log('Health response status:', healthRes.status, healthData);
    if (healthRes.status !== 200) throw new Error('Health check failed');

    console.log('\n--- 2. Testing Register Validation Error ---');
    const invalidRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email', password: '123', name: '' }),
    });
    const invalidRegData = await invalidRegRes.json();
    console.log('Validation status:', invalidRegRes.status, invalidRegData);
    if (invalidRegRes.status !== 400) throw new Error('Expected 400 validation error');

    console.log('\n--- 3. Testing Valid User Registration ---');
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: testName,
      }),
    });
    const regData = (await regRes.json()) as any;
    console.log('Register response status:', regRes.status);
    console.log('Registered user:', regData.data?.user);
    if (regRes.status !== 201) throw new Error('Registration failed');
    if (!regData.data?.accessToken || !regData.data?.refreshToken) {
      throw new Error('Tokens missing from registration response');
    }
    accessToken = regData.data.accessToken;
    refreshToken = regData.data.refreshToken;
    cookies = extractCookies(regRes);
    console.log('Received cookies:', cookies);

    console.log('\n--- 4. Testing Duplicate Registration (Conflict) ---');
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: testName,
      }),
    });
    const dupData = await dupRes.json();
    console.log('Duplicate status:', dupRes.status, dupData);
    if (dupRes.status !== 409) throw new Error('Expected 409 Conflict for duplicate email');

    console.log('\n--- 5. Testing Login with Wrong Password ---');
    const wrongLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });
    console.log('Wrong password status:', wrongLoginRes.status);
    if (wrongLoginRes.status !== 401) throw new Error('Expected 401 for wrong password');

    console.log('\n--- 6. Testing Successful Login ---');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = (await loginRes.json()) as any;
    console.log('Login status:', loginRes.status);
    if (loginRes.status !== 200) throw new Error('Login failed');
    accessToken = loginData.data.accessToken;
    refreshToken = loginData.data.refreshToken;
    cookies = extractCookies(loginRes);

    console.log('\n--- 7. Testing Protected /me Route with Bearer Token ---');
    const meBearerRes = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const meBearerData = (await meBearerRes.json()) as any;
    console.log('Me (Bearer) status:', meBearerRes.status, meBearerData.data?.user);
    if (meBearerRes.status !== 200 || meBearerData.data?.user?.email !== testEmail.toLowerCase()) {
      throw new Error('Failed to fetch profile with Bearer token');
    }

    console.log('\n--- 8. Testing Protected /me Route with Cookie ---');
    const cookieHeader = cookies.join('; ');
    const meCookieRes = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
    });
    const meCookieData = (await meCookieRes.json()) as any;
    console.log('Me (Cookie) status:', meCookieRes.status, meCookieData.data?.user);
    if (meCookieRes.status !== 200 || meCookieData.data?.user?.email !== testEmail.toLowerCase()) {
      throw new Error('Failed to fetch profile with Cookie');
    }

    console.log('\n--- 9. Testing Token Refresh ---');
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    const refreshData = (await refreshRes.json()) as any;
    console.log('Refresh status:', refreshRes.status);
    if (refreshRes.status !== 200) throw new Error('Token refresh failed');
    const newAccessToken = refreshData.data.accessToken;
    const newRefreshToken = refreshData.data.refreshToken;

    console.log('\n--- 10. Testing Logout ---');
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: newRefreshToken }),
    });
    console.log('Logout status:', logoutRes.status);
    if (logoutRes.status !== 200) throw new Error('Logout failed');

    console.log('\n--- 11. Testing Refresh with Revoked Token (Should Fail) ---');
    const revokedRefreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: newRefreshToken }),
    });
    console.log('Revoked refresh status:', revokedRefreshRes.status);
    if (revokedRefreshRes.status !== 401) throw new Error('Expected 401 for revoked refresh token');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    await pool.end();
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
