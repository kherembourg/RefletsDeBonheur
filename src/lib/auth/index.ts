/**
 * Auth Module Exports
 * Central export for all authentication utilities
 */

// God Admin Authentication
export {
  godLogin,
  godLogout,
  verifyGodSession,
  getAllClients,
  getClientById,
  createClient,
  updateClientStatus,
  deleteClient,
  createImpersonationToken,
  verifyImpersonationToken,
  getDashboardStats,
  cleanupExpiredGodTokens,
  isGodTokenValid,
  getTokenExpiration,
  GOD_TOKEN_TTL_HOURS,
  GOD_SESSION_TTL_HOURS,
  type GodAdmin,
  type Client,
  type AuthSession,
  type GodAccessToken,
} from './godAuth';

// Client & Guest Authentication
export {
  clientLogin,
  clientLogout,
  guestLogin,
  guestLogout,
  verifyClientSession,
  verifyGuestSession,
  refreshClientToken,
  getCurrentSessionType,
  getCurrentSession,
  type ClientSession,
  type GuestSession,
} from './clientAuth';
