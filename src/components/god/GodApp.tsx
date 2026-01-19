/**
 * God Admin Application
 * Root component that handles auth state and routing
 */

import { useState, useEffect } from 'react';
import { GodLogin } from './GodLogin';
import { GodDashboard } from './GodDashboard';
import { verifyGodSession, type GodAdmin } from '../../lib/auth/godAuth';
import { RefreshCw } from 'lucide-react';

export function GodApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<GodAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await verifyGodSession();
      if (result.valid && result.admin) {
        setIsAuthenticated(true);
        setAdmin(result.admin);
      } else {
        setIsAuthenticated(false);
        setAdmin(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    await checkAuth();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdmin(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin text-amber-500 mx-auto mb-4" size={40} />
          <p className="text-gray-400">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Show login or dashboard based on auth state
  if (!isAuthenticated || !admin) {
    return <GodLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <GodDashboard admin={admin} onLogout={handleLogout} />;
}
