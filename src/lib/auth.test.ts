/**
 * Auth Module Unit Tests
 * Tests authentication and authorization functions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAuthState,
  authenticate,
  logout,
  getUsername,
  setUsername,
  isAdmin,
  isAuthenticated,
  requireAuth,
} from './auth';
import { AUTH_CODES } from './mockData';

describe('Auth - getAuthState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return unauthenticated state when no code stored', () => {
    const state = getAuthState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isAdmin).toBe(false);
    expect(state.code).toBeNull();
  });

  it('should return authenticated state when code exists', () => {
    localStorage.setItem('reflets_auth_code', 'TESTCODE');
    const state = getAuthState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.code).toBe('TESTCODE');
  });

  it('should detect admin status', () => {
    localStorage.setItem('reflets_auth_code', 'TESTCODE');
    localStorage.setItem('reflets_is_admin', 'true');

    const state = getAuthState();
    expect(state.isAdmin).toBe(true);
  });

  it('should detect non-admin status', () => {
    localStorage.setItem('reflets_auth_code', 'TESTCODE');
    localStorage.setItem('reflets_is_admin', 'false');

    const state = getAuthState();
    expect(state.isAdmin).toBe(false);
  });
});

describe('Auth - authenticate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should authenticate with admin code', () => {
    const result = authenticate(AUTH_CODES.ADMIN);

    expect(result.success).toBe(true);
    expect(result.isAdmin).toBe(true);
    expect(localStorage.getItem('reflets_auth_code')).toBe(AUTH_CODES.ADMIN);
    expect(localStorage.getItem('reflets_is_admin')).toBe('true');
  });

  it('should authenticate with guest code', () => {
    const result = authenticate(AUTH_CODES.GUEST);

    expect(result.success).toBe(true);
    expect(result.isAdmin).toBe(false);
    expect(localStorage.getItem('reflets_auth_code')).toBe(AUTH_CODES.GUEST);
    expect(localStorage.getItem('reflets_is_admin')).toBe('false');
  });

  it('should reject invalid code', () => {
    const result = authenticate('INVALID_CODE');

    expect(result.success).toBe(false);
    expect(result.isAdmin).toBe(false);
    expect(localStorage.getItem('reflets_auth_code')).toBeNull();
  });
});

describe('Auth - logout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should clear auth state on logout', () => {
    // First authenticate
    authenticate(AUTH_CODES.ADMIN);
    expect(localStorage.getItem('reflets_auth_code')).toBe(AUTH_CODES.ADMIN);

    // Then logout
    logout();

    expect(localStorage.getItem('reflets_auth_code')).toBeNull();
    expect(localStorage.getItem('reflets_is_admin')).toBeNull();
  });

  it('should handle logout when not authenticated', () => {
    // Should not throw
    expect(() => logout()).not.toThrow();
  });
});

describe('Auth - Username', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return empty string when no username set', () => {
    const username = getUsername();
    expect(username).toBe('');
  });

  it('should set and get username', () => {
    setUsername('Test User');
    const username = getUsername();
    expect(username).toBe('Test User');
  });

  it('should overwrite existing username', () => {
    setUsername('First Name');
    setUsername('Second Name');

    const username = getUsername();
    expect(username).toBe('Second Name');
  });
});

describe('Auth - isAdmin', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return false when not authenticated', () => {
    expect(isAdmin()).toBe(false);
  });

  it('should return true for admin auth code', () => {
    authenticate(AUTH_CODES.ADMIN);
    expect(isAdmin()).toBe(true);
  });

  it('should return false for guest auth code', () => {
    authenticate(AUTH_CODES.GUEST);
    expect(isAdmin()).toBe(false);
  });

  it('should return true for god impersonation', () => {
    localStorage.setItem('reflets_god_impersonation', 'true');
    expect(isAdmin()).toBe(true);
  });

  it('should return true for client session with admin flag', () => {
    localStorage.setItem('reflets_client_session', JSON.stringify({
      is_admin: true,
    }));
    expect(isAdmin()).toBe(true);
  });

  it('should return false for client session without admin flag', () => {
    localStorage.setItem('reflets_client_session', JSON.stringify({
      is_admin: false,
    }));
    expect(isAdmin()).toBe(false);
  });

  it('should return true for guest session with admin access type', () => {
    localStorage.setItem('reflets_guest_session', JSON.stringify({
      access_type: 'admin',
    }));
    expect(isAdmin()).toBe(true);
  });

  it('should return false for guest session with guest access type', () => {
    localStorage.setItem('reflets_guest_session', JSON.stringify({
      access_type: 'guest',
    }));
    expect(isAdmin()).toBe(false);
  });

  it('should handle malformed JSON in client session', () => {
    localStorage.setItem('reflets_client_session', 'invalid-json');
    // Should not throw and return false
    expect(isAdmin()).toBe(false);
  });

  it('should handle malformed JSON in guest session', () => {
    localStorage.setItem('reflets_guest_session', 'invalid-json');
    // Should not throw and return false
    expect(isAdmin()).toBe(false);
  });
});

describe('Auth - isAuthenticated', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return false when no auth present', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('should return true with auth code', () => {
    authenticate(AUTH_CODES.GUEST);
    expect(isAuthenticated()).toBe(true);
  });

  it('should return true with god impersonation', () => {
    localStorage.setItem('reflets_god_impersonation', 'true');
    expect(isAuthenticated()).toBe(true);
  });

  it('should return true with client session', () => {
    localStorage.setItem('reflets_client_session', JSON.stringify({}));
    expect(isAuthenticated()).toBe(true);
  });

  it('should return true with guest session', () => {
    localStorage.setItem('reflets_guest_session', JSON.stringify({}));
    expect(isAuthenticated()).toBe(true);
  });
});

describe('Auth - requireAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should redirect to /connexion when not authenticated', () => {
    // Mock location
    const originalLocation = global.location;
    delete (global as any).location;
    global.location = { href: '' } as any;

    requireAuth();

    expect(global.location.href).toBe('/connexion');

    // Restore
    global.location = originalLocation;
  });

  it('should not redirect when authenticated', () => {
    authenticate(AUTH_CODES.GUEST);

    const originalLocation = global.location;
    delete (global as any).location;
    global.location = { href: 'http://localhost:4321/gallery' } as any;

    requireAuth();

    // Should not change
    expect(global.location.href).toBe('http://localhost:4321/gallery');

    // Restore
    global.location = originalLocation;
  });
});

describe('Auth - Priority', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should prioritize god impersonation over other auth methods', () => {
    // Set multiple auth methods
    authenticate(AUTH_CODES.GUEST); // Non-admin
    localStorage.setItem('reflets_god_impersonation', 'true'); // Admin

    // God impersonation should take precedence
    expect(isAdmin()).toBe(true);
    expect(isAuthenticated()).toBe(true);
  });
});
