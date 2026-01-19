import { AUTH_CODES } from './mockData';

export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  code: string | null;
}

// Local storage keys
const AUTH_CODE_KEY = 'reflets_auth_code';
const IS_ADMIN_KEY = 'reflets_is_admin';
const USERNAME_KEY = 'reflets_username';

// Get current auth state from localStorage
export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, isAdmin: false, code: null };
  }

  const code = localStorage.getItem(AUTH_CODE_KEY);
  const isAdmin = localStorage.getItem(IS_ADMIN_KEY) === 'true';

  return {
    isAuthenticated: !!code,
    isAdmin,
    code,
  };
}

// Validate and store auth code
export function authenticate(code: string): { success: boolean; isAdmin: boolean } {
  if (code === AUTH_CODES.ADMIN) {
    localStorage.setItem(AUTH_CODE_KEY, code);
    localStorage.setItem(IS_ADMIN_KEY, 'true');
    return { success: true, isAdmin: true };
  }

  if (code === AUTH_CODES.GUEST) {
    localStorage.setItem(AUTH_CODE_KEY, code);
    localStorage.setItem(IS_ADMIN_KEY, 'false');
    return { success: true, isAdmin: false };
  }

  return { success: false, isAdmin: false };
}

// Clear auth state
export function logout(): void {
  localStorage.removeItem(AUTH_CODE_KEY);
  localStorage.removeItem(IS_ADMIN_KEY);
}

// Username persistence
export function getUsername(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(USERNAME_KEY) || '';
}

export function setUsername(name: string): void {
  localStorage.setItem(USERNAME_KEY, name);
}

// Check if user has admin access
export function isAdmin(): boolean {
  if (typeof window === 'undefined') return false;

  // Check old demo auth
  if (localStorage.getItem(IS_ADMIN_KEY) === 'true') {
    return true;
  }

  // Check god impersonation (always admin)
  if (localStorage.getItem('reflets_god_impersonation')) {
    return true;
  }

  // Check client session
  const clientSession = localStorage.getItem('reflets_client_session');
  if (clientSession) {
    try {
      const session = JSON.parse(clientSession);
      if (session.is_admin) {
        return true;
      }
    } catch (e) {}
  }

  // Check guest session with admin access
  const guestSession = localStorage.getItem('reflets_guest_session');
  if (guestSession) {
    try {
      const session = JSON.parse(guestSession);
      if (session.access_type === 'admin') {
        return true;
      }
    } catch (e) {}
  }

  return false;
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  // Check old demo auth
  if (localStorage.getItem(AUTH_CODE_KEY)) {
    return true;
  }

  // Check god impersonation
  if (localStorage.getItem('reflets_god_impersonation')) {
    return true;
  }

  // Check client session
  if (localStorage.getItem('reflets_client_session')) {
    return true;
  }

  // Check guest session
  if (localStorage.getItem('reflets_guest_session')) {
    return true;
  }

  return false;
}

// Redirect to login if not authenticated (client-side only)
export function requireAuth(): void {
  if (typeof window !== 'undefined' && !isAuthenticated()) {
    window.location.href = '/connexion';
  }
}
