# Authentication Architecture

## User Types

| Type | Description | Access Level |
|------|-------------|--------------|
| **Client** | Wedding owner (paid account) | Full admin access to their wedding |
| **Guest** | Wedding attendee | View/upload based on PIN |
| **Guest Admin** | Guest with magic token | Admin access to wedding |
| **God Admin** | Platform super admin | Access to all weddings |

## Authentication Flows

### Client Authentication (Supabase Auth)

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│ Supabase │────▶│ Session  │
│  Form    │     │   Auth   │     │ Created  │
└──────────┘     └──────────┘     └──────────┘
                      │
                      ▼
              ┌──────────────┐
              │  auth.users  │
              │  + profiles  │
              │  + weddings  │
              └──────────────┘
```

1. User enters email + password at `/connexion`
2. Supabase Auth validates credentials
3. Session stored in `reflets_client_session` localStorage
4. User redirected to their wedding admin

### Guest Authentication (PIN Code)

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Enter   │────▶│ Validate │────▶│  Guest   │
│   PIN    │     │ vs DB    │     │ Session  │
└──────────┘     └──────────┘     └──────────┘
```

1. Guest enters 6-character PIN
2. PIN validated against `weddings.pin_code`
3. Guest session created in `guest_sessions` table
4. Session stored in `reflets_guest_session` localStorage
5. Access type: `viewer` (can view and upload)

### Guest Admin Authentication (Magic Token)

```
URL: /{slug}?token={magic_token}

┌──────────┐     ┌──────────┐     ┌──────────┐
│  Magic   │────▶│ Validate │────▶│  Admin   │
│  Token   │     │ vs DB    │     │ Session  │
└──────────┘     └──────────┘     └──────────┘
```

1. Client shares magic token URL with trusted person
2. Token validated against `weddings.magic_token`
3. Guest session created with `access_type: 'admin'`
4. Full admin access without account

### God Admin Authentication

Separate authentication for platform administrators:

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  God     │────▶│  god_admins  │────▶│ Session  │
│  Login   │     │  (password)  │     │ Created  │
└──────────┘     └──────────────┘     └──────────┘
                        │
                        ▼ (impersonation)
              ┌──────────────────┐
              │ god_access_tokens│
              │  (24h TTL)       │
              └──────────────────┘
```

## localStorage Keys

| Key | Description |
|-----|-------------|
| `reflets_client_token` | Client auth JWT |
| `reflets_client_session` | Client session data |
| `reflets_guest_session` | Guest session data |
| `reflets_god_impersonation` | God admin impersonation token |
| `reflets_is_admin` | Simple admin flag (demo mode) |

## Session Data Structures

### Client Session
```typescript
{
  userId: string;
  email: string;
  weddingId: string;
  weddingSlug: string;
  expiresAt: string;
}
```

### Guest Session
```typescript
{
  weddingId: string;
  sessionToken: string;
  accessType: 'viewer' | 'admin';
  createdAt: string;
}
```

## Access Control by Page

| Page | Client | Guest (PIN) | Guest (Admin) | God Admin |
|------|--------|-------------|---------------|-----------|
| `/{slug}` | ✅ | ✅ | ✅ | ✅ |
| `/{slug}/photos` | ✅ | ✅ | ✅ | ✅ |
| `/{slug}/livre-or` | ✅ | ✅ | ✅ | ✅ |
| `/{slug}/admin` | ✅ | ❌ | ✅ | ✅ |
| `/{slug}/admin/website-editor` | ✅ | ❌ | ✅ | ✅ |

## Client-Side Auth Check

Admin pages include client-side auth verification:

```javascript
// Check multiple auth sources
let hasAccess = false;

// 1. Client login
if (clientToken && clientSession) {
  hasAccess = true;
}

// 2. God admin impersonation
if (godImpersonation) {
  hasAccess = true;
}

// 3. Guest admin access
if (guestSession?.access_type === 'admin') {
  hasAccess = true;
}

// 4. Demo mode admin flag
if (isAdmin === 'true') {
  hasAccess = true;
}

if (!hasAccess) {
  window.location.href = '/connexion';
}
```

## Security Considerations

1. **PIN Codes**: 6 alphanumeric characters, stored plain (for easy sharing)
2. **Magic Tokens**: UUID v4, longer and more secure than PIN
3. **God Tokens**: 24-hour TTL, auto-cleanup via database trigger
4. **Sessions**: Stored in localStorage (client-side), validated server-side

## Demo Mode Authentication

In demo mode (Supabase not configured):
- `reflets_is_admin === 'true'` grants admin access
- No real authentication occurs
- Used for development and demos

---

*Last updated: January 21, 2026*
