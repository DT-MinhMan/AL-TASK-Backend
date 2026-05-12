# 🎯 Auth Integration - Quick Start for Frontend

**Status**: ✅ Backend ready (80% tested)  
**API URL**: `http://localhost:5512` (NO /api prefix)

---

## 🚀 Start Here (Copy-Paste Ready)

### Step 1: Create Auth Service

**React + TypeScript Example:**

```typescript
// src/services/authService.ts
const API_BASE = 'http://localhost:5512';

export const authService = {
  // Register
  async register(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // ← IMPORTANT!
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  // Login
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // ← IMPORTANT!
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  // Get current user (protected)
  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',  // ← IMPORTANT!
    });
    if (res.status === 401) throw new Error('Not authenticated');
    return res.json();
  },

  // Get permissions (protected)
  async getPermissions() {
    const res = await fetch(`${API_BASE}/auth/my-permissions`, {
      credentials: 'include',  // ← IMPORTANT!
    });
    return res.json();
  },

  // Logout (protected)
  async logout() {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',  // ← IMPORTANT!
    });
    return res.json();
  },

  // Refresh token
  async refresh() {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',  // ← IMPORTANT!
    });
    return res.json();
  },
};
```

---

### Step 2: Create Auth Context

```typescript
// src/context/AuthContext.tsx
import { createContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext<any>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if logged in on mount
    authService
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    setUser(result.user);
    return result;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

---

### Step 3: Protected Route

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
```

---

### Step 4: Use in App

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## 📌 Important Notes

### ⚠️ CRITICAL: `credentials: 'include'`
Every fetch must include this:
```javascript
fetch(url, {
  credentials: 'include',  // ← THIS IS REQUIRED!
  ...
})
```

**Without it**: Cookies won't be sent, auth won't work.

---

### ⚠️ API URL Format
```
✅ CORRECT:   http://localhost:5512/auth/login
❌ WRONG:     http://localhost:3000/api/auth/login
❌ WRONG:     http://localhost:5512/api/auth/login
```

**Rule**: `http://localhost:5512` + `/endpoint` (NO /api prefix)

---

### 🪙 How Cookies Work

1. **Login**: Browser receives `Set-Cookie` headers
   ```
   Set-Cookie: access_token=...
   Set-Cookie: refresh_token=...
   ```

2. **Subsequent requests**: Browser auto-sends cookies
   ```
   Cookie: access_token=...; refresh_token=...
   ```

3. **You don't need to do anything** - browser handles it!

---

## 🧪 Test Your Integration

### In Browser DevTools:
1. Go to Application → Cookies → localhost:5512
2. Should see 2 cookies after login:
   - `access_token` (15 min expiry)
   - `refresh_token` (7 day expiry)
3. Both should have 🔒 HttpOnly flag

### Network Tab:
1. Click login request
2. Response Headers → Should see `Set-Cookie`
3. Subsequent requests → Request Headers → Should have `Cookie`

---

## 🔄 Handling Token Refresh

When access token expires (15 min), backend returns 401.

**Simple approach:**
```typescript
async function apiCall(url, options = {}) {
  let res = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  if (res.status === 401) {
    // Try to refresh
    const refreshRes = await fetch('http://localhost:5512/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshRes.ok) {
      // Retry original request
      res = await fetch(url, {
        credentials: 'include',
        ...options,
      });
    }
  }

  return res;
}
```

---

## 🎨 Example: Login Form

```typescript
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button disabled={loading}>
        {loading ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
}
```

---

## ✅ Checklist Before Going Live

- [ ] API base URL = `http://localhost:5512` (no /api)
- [ ] All fetch calls have `credentials: 'include'`
- [ ] Cookies visible in DevTools after login
- [ ] Protected routes redirect to login on 401
- [ ] Token refresh handled (retry on 401)
- [ ] User state clears on logout
- [ ] Registration works
- [ ] Login works
- [ ] Get profile works

---

## 📚 Full Docs

- **Detailed endpoints**: [postman-auth-testing.md](postman-auth-testing.md)
- **Setup guide**: [FRONTEND-AUTH-INTEGRATION.md](FRONTEND-AUTH-INTEGRATION.md)
- **Test results**: [AUTH-TEST-RESULTS.md](AUTH-TEST-RESULTS.md)

---

## 🆘 Troubleshooting

### "Cannot POST /auth/login" (404)
**Fix**: Check API URL = `http://localhost:5512` (no /api prefix)

### Cookies not being sent
**Fix**: Add `credentials: 'include'` to fetch

### 401 on protected endpoint
**Fix**: 
1. Make sure login worked (check cookies)
2. Try refresh token: `POST /auth/refresh`
3. Retry request

### CORS Error
**Fix**: API already configured, make sure:
- URL = `http://localhost:5512`
- credentials: 'include' in fetch

### Backend not running?
```bash
cd AL-TASK-Backend
npm run start:dev  # or: npm start
```

Then check: `http://localhost:5512` should be accessible

---

## 🎯 Next Steps

1. ✅ Copy auth service code above
2. ✅ Set up context/provider
3. ✅ Create protected route component
4. ✅ Test login/logout flow
5. ✅ Verify cookies in DevTools
6. ✅ Build UI components on top

**That's it!** Auth is working on backend, just integrate in frontend.

---

**Questions?** Ask backend team or check detailed docs in `/docs` folder.
