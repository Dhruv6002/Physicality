# Auth-Gated App Testing Playbook (Emergent Google Auth)

NOTE - Do not be satisfied until you've tested the app completely, especially the auth gated pages.

## App-specific adaptations (Physicality)
- All backend routes are prefixed with `/api` (e.g. `/api/auth/me`).
- Users are stored with MongoDB `_id` (ObjectId); `db.user_sessions.user_id` stores `str(user._id)`.
- Google sessions live in `db.user_sessions` with fields: `user_id` (string of user _id), `session_token`, `expires_at`, `created_at`.
- `get_current_user` accepts: `access_token` cookie (JWT), `Authorization: Bearer <jwt>`, `session_token` cookie (Google), or `Authorization: Bearer <session_token>`.
- Google exchange endpoint: `POST /api/auth/google/session` with body `{"session_id": "..."}`.
- Google sign-in button redirects to `https://auth.emergentagent.com/?redirect=<origin>/account` (origin derived from `window.location.origin`, never hardcoded).
- AuthCallback is detected synchronously via `useLocation().hash` containing `session_id=`.

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var r = db.users.insertOne({
  email: 'google.test.' + Date.now() + '@example.com',
  name: 'Google Test User',
  role: 'customer',
  password_hash: null,
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
var sessionToken = 'test_session_' + Date.now();
db.user_sessions.insertOne({
  user_id: r.insertedId.toString(),
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
"
```

## Step 2: Test Backend API
```bash
curl -X GET "http://localhost:8000/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser Testing
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "physical-editions.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://physical-editions.preview.emergentagent.com/account")
```

## Quick Debug
```bash
mongosh --eval "
use('test_database');
db.users.find({password_hash: null}).limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
"
# Clean test data
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /google\.test\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
```

## Checklist
- Session user_id matches str(user._id) exactly
- /api/auth/me returns user data with the session token
- Callback detection uses `useLocation().hash`, not `window.location.hash`
- AuthProvider skips /auth/me when hash contains session_id=

## Success Indicators
- /api/auth/me returns user data (not 401)
- /account loads without redirect to /auth

## Failure Indicators
- "User not found" errors
- 401 Unauthorized responses
- Redirect to login page

---

# Legacy JWT auth checks (email/password)
```
curl -c cookies.txt -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"dhruvambardar@gmail.com","password":"Physicality@2006!"}'
curl -b cookies.txt http://localhost:8000/api/auth/me
```
