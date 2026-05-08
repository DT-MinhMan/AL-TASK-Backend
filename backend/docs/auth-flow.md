# Luong hoat dong Auth

Tai lieu nay mo ta cach module auth dang chay trong backend NestJS, di theo tung request tu controller, service, schema, guard va database.

## 1. Cac file chinh

| File | Vai tro |
| --- | --- |
| `src/modules/auth/controllers/auth.controller.ts` | Nhan request auth: register, login, logout, profile, password reset, Google auth. |
| `src/modules/auth/services/auth.service.ts` | Xu ly logic auth: tao user, kiem tra password, tao JWT, luu token, logout, reset password. |
| `src/modules/auth/guards/jwt-auth.guard.ts` | Bao ve route can dang nhap. Guard verify JWT va kiem tra token con active trong DB. |
| `src/modules/auth/services/token.service.ts` | Service lam viec voi collection token: tim token active, invalidate token. |
| `src/modules/auth/schemas/token.schema.ts` | Schema MongoDB luu token, userId, email, status. |
| `src/modules/auth/dtos/auth.dto.ts` | DTO cho register/login/update profile. Register chi nhan `email` va `password`. |
| `src/modules/users/services/users.service.ts` | Tao user, hash password, tim user theo email/id, update user. |
| `src/modules/users/schemas/users.schema.ts` | Schema MongoDB cua user. |
| `src/modules/auth/auth.module.ts` | Noi cac dependency cua auth: JwtModule, TokenModule, UsersModule, Mongoose models. |

## 2. Luong register account thuong

Endpoint:

```http
POST /auth/register
```

Body hop le:

```json
{
  "email": "user@example.com",
  "password": "654321"
}
```

Duong di cua code:

1. `auth.controller.ts`
   - Method `register(@Body() registerDto: RegisterDto)` nhan body.
   - Body duoc map theo `RegisterDto`.

2. `auth.dto.ts`
   - `RegisterDto` chi khai bao `email` va `password`.
   - Khong con field `role` trong public register.

3. `auth.service.ts`
   - Method `register(registerDto)` kiem tra email da ton tai chua bang `usersService.findByEmail()`.
   - Neu email da co, throw `ConflictException`.
   - Neu chua co, goi `usersService.createUser()` voi data:

```ts
{
  email: registerDto.email,
  password: registerDto.password,
  role: 'user',
  status: 'active'
}
```

4. `users.service.ts`
   - Method `createUser()` hash password bang `bcrypt`.
   - Sau do goi repository de save user vao MongoDB.

Ket qua: moi account tao tu public register luon la `role: 'user'`. Client gui them `role: 'admin'` cung khong duoc service su dung.

## 3. Luong tao admin

Admin khong duoc tao qua public register.

Admin duoc tao bang seed script:

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="StrongPassword123!"
$env:ADMIN_FULL_NAME="System Admin"
npm run seed:admin
```

Duong di cua code:

1. `package.json`
   - Script `seed:admin` chay file `scripts/seed-admin.ts`.

2. `scripts/seed-admin.ts`
   - Doc `DB_CONNECTION_STRING` tu `.env`.
   - Doc `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` tu environment variables.
   - Yeu cau password admin toi thieu 12 ky tu.
   - Ket noi MongoDB.
   - Neu email da ton tai thi update user thanh admin.
   - Neu email chua ton tai thi tao moi user admin.

Ket qua: viec tao admin chi dien ra trong terminal/server environment, khong phoi endpoint tao admin ra internet.

## 4. Luong login

Endpoint:

```http
POST /auth/login
```

Body:

```json
{
  "email": "user@example.com",
  "password": "654321"
}
```

Duong di cua code:

1. `auth.controller.ts`
   - Method `login(@Body() loginDto: LoginDto)` nhan email/password.
   - Goi `authService.login(loginDto)`.

2. `auth.service.ts`
   - Tim user bang `usersService.findByEmail(loginDto.email)`.
   - Neu khong co user, throw `UnauthorizedException`.
   - Neu user khong co password, xem nhu account Google va yeu cau login bang Google.
   - So sanh password bang `bcrypt.compare(loginDto.password, user.password)`.
   - Neu password sai, throw `UnauthorizedException`.
   - Neu dung, goi `createAndSaveToken()`.

3. `auth.service.ts` method `createAndSaveToken()`
   - Tao JWT payload:

```ts
{
  userId,
  email,
  role,
  fullName,
  avatar
}
```

   - Sign JWT bang `JwtService`.
   - Luu token vua tao vao collection `Token` voi `status: true`.

4. `token.schema.ts`
   - MongoDB luu:

```ts
{
  userId,
  email,
  token,
  deviceInfo: 'Web',
  status: true
}
```

Ket qua response login co `token`. Frontend can luu token nay va gui trong header:

```http
Authorization: Bearer <token>
```

## 5. Luong request vao route can dang nhap

Vi du:

```http
GET /auth/me
Authorization: Bearer <token>
```

Duong di cua code:

1. Controller gan guard

```ts
@UseGuards(JwtAuthGuard)
```

2. `jwt-auth.guard.ts`
   - Doc header `Authorization`.
   - Neu khong co `Bearer <token>`, throw `UnauthorizedException`.
   - Goi `jwtService.verify(token)` de kiem tra:
     - token co dung chu ky khong
     - token da het han chua
   - Sau khi JWT hop le, guard tiep tuc goi:

```ts
this.tokenService.findToken(token)
```

3. `token.service.ts`
   - Method `findToken(token)` query MongoDB:

```ts
{ token, status: true }
```

4. `jwt-auth.guard.ts`
   - Neu khong tim thay token active, reject request.
   - Neu token active co `userId` khong khop voi JWT payload, reject request.
   - Neu hop le, gan user vao request:

```ts
request.user = {
  userId: decoded.userId,
  email: decoded.email,
  role: decoded.role
}
```

5. Controller phia sau guard
   - Co the doc `req.user.userId`, `req.user.email`, `req.user.role`.

Ket qua: token phai dong thoi hop le ve JWT va con active trong DB moi duoc truy cap route protected.

## 6. Luong logout va token revocation

Endpoint:

```http
POST /auth/logout
Authorization: Bearer <token>
```

Duong di cua code:

1. `auth.controller.ts`
   - Route logout co `@UseGuards(JwtAuthGuard)`.
   - Nghia la chi token con active moi logout duoc.
   - Sau guard, controller lay Bearer token hien tai tu header `Authorization`.
   - Goi `authService.logout(token)`.

2. `auth.service.ts`
   - Method `logout(token)` chi update token cua phien hien tai:

```ts
await this.tokenModel.updateOne({ token }, { status: false });
```

3. `token.schema.ts`
   - Token cua phien hien tai chuyen tu:

```ts
status: true
```

sang:

```ts
status: false
```

4. Request sau logout
   - Frontend neu tiep tuc gui token cu vao route protected.
   - `JwtAuthGuard` van co the verify JWT thanh cong neu token chua het han.
   - Nhung guard se query DB voi `{ token, status: true }`.
   - Token da bi set `status: false`, nen guard reject `401`.

Ket qua: logout bay gio co hieu luc that su. Token da logout/revoked khong con dung duoc nua, ke ca JWT van chua het han.

Neu cung mot account dang login tren nhieu thiet bi/trinh duyet, logout o mot noi chi revoke token cua noi do. Cac token active khac van tiep tuc dung duoc.

## 7. Khac nhau giua JWT expiry va token revocation

JWT expiry:

- Duoc cau hinh trong `auth.module.ts` bang `JWT_EXPIRES_IN`.
- Neu JWT het han, `jwtService.verify(token)` se fail.
- Khong can DB cung reject duoc.

Token revocation:

- Duoc quan ly trong MongoDB collection `Token`.
- Khi logout, token bi set `status: false`.
- JWT co the chua het han, nhung guard van reject vi DB khong con token active.

Hai lop nay bo sung cho nhau:

```txt
JWT verify pass + DB token active => duoc vao
JWT verify fail => bi reject
JWT verify pass + DB token inactive => bi reject
```

## 8. Luong password reset

Endpoint chinh:

```http
POST /auth/request-password-reset
POST /auth/verify-otp
POST /auth/reset-password/token
POST /auth/reset-password/otp
```

Duong di tong quat:

1. `auth.controller.ts`
   - Nhan request password reset va goi service tuong ung.

2. `auth.service.ts`
   - `requestPasswordReset()` tim user theo email.
   - Tao reset token JWT loai `password-reset`, expires sau 15 phut.
   - Tao OTP 6 so, expires sau 15 phut.
   - Luu reset token vao collection `Token`.
   - Luu OTP vao collection `Otp`.
   - Gui email qua `VerifyService`.

3. Reset bang token
   - `resetPasswordWithToken()` verify reset token.
   - Kiem tra token con `status: true` trong DB.
   - Hash password moi.
   - Update password user.
   - Set reset token `status: false` de khong dung lai duoc.

4. Reset bang OTP
   - `resetPasswordWithOtp()` tim OTP chua dung, chua het han.
   - Hash password moi.
   - Update password user.
   - Set OTP `isUsed: true`.

## 9. Tom tat luong bao mat hien tai

Register:

```txt
auth.controller.ts -> auth.dto.ts -> auth.service.ts -> users.service.ts -> users.schema.ts
```

Login:

```txt
auth.controller.ts -> auth.service.ts -> users.service.ts -> bcrypt -> JwtService -> token.schema.ts
```

Protected request:

```txt
Controller @UseGuards -> jwt-auth.guard.ts -> JwtService.verify -> token.service.ts -> token.schema.ts -> controller handler
```

Logout current session:

```txt
auth.controller.ts -> jwt-auth.guard.ts -> auth.service.logout -> token.schema.ts status=false
```

Admin seed:

```txt
package.json seed:admin -> scripts/seed-admin.ts -> users.schema.ts
```

## 10. Diem nen lam tiep

1. Bat `ValidationPipe` voi `whitelist: true` va `forbidNonWhitelisted: true`.
2. Chuan hoa password rule giua register va create user.
3. Them validator cho password reset DTO.
4. Neu can tinh nang "dang xuat tat ca thiet bi", co the tao endpoint rieng goi `TokenService.invalidateAllTokensForUser(userId)`.
