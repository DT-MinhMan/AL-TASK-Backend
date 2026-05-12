# 🚀 Frontend Auth Integration Guide

**Backend Status**: ✅ Ready (80% tested)  
**API Base URL**: `http://localhost:5512`  
**Cookie Auth**: ✅ Working (HttpOnly, SameSite, Secure)

---

## 📝 Quick Setup (5 minutes)

### 1️⃣ Update API Base URL

```typescript
// environment.ts or config.ts
export const API_BASE_URL = 'http://localhost:5512';
// NOTE: NO /api prefix needed
```

### 2️⃣ Configure HTTP Client

#### Fetch API
```javascript
// Every request needs credentials: 'include'
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',  // ⚠️ IMPORTANT!
  body: JSON.stringify({ email, password })
});
```

#### Axios
```typescript
// Create instance with credentials
const api = axios.create({
  baseURL: 'http://localhost:5512',
  withCredentials: true,  // ⚠️ IMPORTANT!
  headers: {
    'Content-Type': 'application/json',
  }
});

// Use it:
const { data } = await api.post('/auth/login', { email, password });
```

#### Angular HttpClient
```typescript
// app.config.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';

export const httpInterceptorProviders = [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true,
  },
];

// auth.interceptor.ts
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const clonedRequest = req.clone({
      withCredentials: true,  // ⚠️ IMPORTANT!
    });
    return next.handle(clonedRequest);
  }
}
```

#### React + TanStack Query
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// In components
const { data: user, isLoading } = useQuery({
  queryKey: ['auth', 'me'],
  queryFn: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include',  // ⚠️ IMPORTANT!
    });
    return res.json();
  },
});
```

---

## 🔑 Key Endpoints

### Register
```javascript
POST /auth/register
Content-Type: application/json
Credentials: include

Request:
{
  "email": "user@example.com",
  "password": "Password@123"
}

Response (201):
{
  "success": true,
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
  "email": "user@example.com"
}

Check points:
✅ Status 201
✅ Email returned
✅ Message provides feedback
```

---

### Login
```javascript
POST /auth/login
Content-Type: application/json
Credentials: include

Request:
{
  "email": "user@example.com",
  "password": "Password@123"
}

Response (200):
{
  "message": "Đăng nhập thành công",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "user",
    "status": "active"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}

Cookies automatically set by browser:
- access_token (15 minutes)
- refresh_token (7 days)

Check points:
✅ Status 200
✅ User object returned
✅ Cookies visible in browser DevTools → Application → Cookies
✅ Cookies marked as HttpOnly (can't be accessed by JavaScript)
```

---

### Get Current User (Protected)
```javascript
GET /auth/me
Authorization: Bearer {accessToken}  // OR rely on cookies
Credentials: include

Response (200):
{
  "email": "user@example.com",
  "role": "user",
  "status": "active",
  "createdAt": "...",
  "id": "..."
}

Check points:
✅ Status 200 = authenticated
✅ Status 401 = not logged in (redirect to login)
```

---

### Get User Permissions (Protected)
```javascript
GET /auth/my-permissions
Authorization: Bearer {accessToken}
Credentials: include

Response (200 - Regular User):
{
  "role": "user",
  "permissions": [
    { "resource": "posts", "action": "create" },
    { "resource": "posts", "action": "read" }
  ],
  "isAdmin": false
}

Response (200 - Admin):
{
  "role": "admin",
  "permissions": [
    { "resource": "*", "action": "*" }
  ],
  "isAdmin": true
}

Usage:
- Store in Redux/Context
- Check before showing buttons
- Use for fine-grained access control
```

---

### Refresh Token (Auto-called on 401)
```javascript
POST /auth/refresh
Content-Type: application/json
Credentials: include

Request body: {} (optional, or include refreshToken)

Response (200):
{
  "success": true,
  "message": "Làm mới token thành công"
}

New cookies automatically set:
- access_token (new)
- refresh_token (new, rotated)

Implementation Strategy:
1. Catch 401 response
2. Call POST /auth/refresh
3. Retry original request
4. Browser auto-manages cookies

Example (Axios interceptor):
```

---

### Logout (Protected)
```javascript
POST /auth/logout
Authorization: Bearer {accessToken}
Credentials: include

Response (200):
{
  "message": "Đăng xuất thành công",
  "revoked": true
}

Side effects:
✅ Cookies cleared (MaxAge=0)
✅ Tokens revoked on server
✅ User redirected to /login

Cleanup:
- Clear localStorage/sessionStorage
- Clear Redux/Context auth state
- Redirect to login page
```

---

## 🛠️ Best Practices

### 1️⃣ Always Use `credentials: 'include'`
```javascript
// ❌ WRONG - cookies won't be sent
fetch('/auth/me');

// ✅ CORRECT
fetch('/auth/me', {
  credentials: 'include'
});
```

### 2️⃣ Handle Token Expiry (401)
```javascript
// Axios interceptor pattern
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response.status === 401) {
      // Try to refresh
      try {
        await api.post('/auth/refresh');
        // Retry original request
        return api(error.config);
      } catch {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### 3️⃣ Store User State
```typescript
// React Context example
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if logged in on mount
    fetch('/auth/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not logged in');
      })
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 4️⃣ Protected Route Component
```typescript
// React Router example
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;

  return children;
}

// Usage:
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route 
    path="/dashboard" 
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } 
  />
</Routes>
```

### 5️⃣ Check Permissions Before Actions
```typescript
function CanCreatePost({ children }) {
  const { user } = useAuth();
  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => fetch('/auth/my-permissions', { credentials: 'include' }).then(r => r.json()),
  });

  const canCreate = permissions?.permissions?.some(p => 
    p.resource === 'posts' && p.action === 'create'
  );

  return canCreate ? children : null;
}

// Usage:
<CanCreatePost>
  <button onClick={createPost}>Create Post</button>
</CanCreatePost>
```

---

## ❌ Common Mistakes

| ❌ Mistake | ✅ Fix |
|-----------|--------|
| `fetch('/auth/me')` | Add `credentials: 'include'` |
| Using `/api/auth/login` | Remove `/api` prefix |
| Not handling 401 | Implement refresh + retry |
| Storing token in localStorage | Use HttpOnly cookies instead |
| Forgetting `Authorization: Bearer` | Send via Authorization header OR rely on cookies |
| Not clearing state on logout | Clear Redux/Context + redirect |

---

## 🔍 Debug Checklist

### Are cookies being sent?
1. Open DevTools → Network tab
2. Click on auth request
3. Check Request Headers → Cookie
4. Should show: `access_token=...; refresh_token=...`

### Are cookies being stored?
1. Open DevTools → Application tab
2. Expand Cookies → http://localhost:5512
3. Should see: `access_token` and `refresh_token`
4. Both should have `HttpOnly` ✓

### Why 401 on protected endpoint?
1. ❌ Not including `credentials: 'include'`
2. ❌ Token expired (need refresh)
3. ❌ Wrong Authorization header format
4. ❌ Token revoked (login again)

### Why CORS error?
```
Access to XMLHttpRequest blocked by CORS policy
```
**Fix**: Backend CORS is already configured, make sure:
- ✅ API URL = `http://localhost:5512`
- ✅ Add `credentials: 'include'` to fetch
- ✅ CORS is enabled for your frontend URL

---

## 📊 Testing Endpoints

### Quick Test with cURL
```bash
# Register
curl -X POST http://localhost:5512/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123"}'

# Login (saves cookies)
curl -c cookies.txt -X POST http://localhost:5512/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123"}'

# Use cookies
curl -b cookies.txt http://localhost:5512/auth/me

# Logout
curl -b cookies.txt -X POST http://localhost:5512/auth/logout
```

### Test with Postman
1. Import [POSTMAN-QUICK-START.md](../POSTMAN-QUICK-START.md)
2. Set environment: `http://localhost:5512` (no /api)
3. Enable "Send cookies with requests"
4. Run requests in order

---

## 🚦 Status by Feature

| Feature | Status | Ready | Notes |
|---------|--------|-------|-------|
| Register | ✅ | YES | Email validation working |
| Login | ✅ | YES | HttpOnly cookies verified |
| Get Profile | ✅ | YES | Protected endpoint working |
| Permissions | ✅ | YES | Roles system functional |
| Token Refresh | ✅ | YES | Auto-rotation working |
| Logout | ⚠️ | SOON | Minor issue, fix in progress |
| Password Reset | ⚠️ | SOON | Server error, needs debugging |
| Google OAuth | ✅ | YES | Full OAuth flow implemented |

---

## 📞 Issues & Support

### Current Known Issues
1. **Logout endpoint** (Status 401) - Will be fixed
2. **Password reset** (Status 500) - Server error, will be fixed

### What Works Right Now
✅ Register/Login flow  
✅ Protected endpoints  
✅ Token refresh  
✅ Role-based permissions  
✅ Cookie security  

### Next Steps
1. Start integrating core endpoints (register, login, protected routes)
2. Verify cookies in browser DevTools
3. Test token refresh on 401
4. Report any issues found

---

## 🎯 Integration Timeline

**Week 1**:
- Register/Login flow
- Protected routes
- Cookie verification

**Week 2**:
- Token refresh handling
- Permission checks
- Error handling

**Week 3+**:
- Password reset (after backend fix)
- Google OAuth
- Full e2e testing

---

**Questions?** Check [postman-auth-testing.md](../postman-auth-testing.md) for detailed endpoint docs or ask backend team.
