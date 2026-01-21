/**
 * God Admin Dashboard
 * Central management interface for all clients
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Image,
  MessageSquare,
  HardDrive,
  Plus,
  Search,
  LogOut,
  RefreshCw,
  LayoutDashboard,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Trash2,
  Settings,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { godLogout, getAllClients, getDashboardStats, createImpersonationToken, updateClientStatus, deleteClient } from '../../lib/auth/godAuth';
import type { Client, GodAdmin } from '../../lib/auth/godAuth';
import { CreateClientModal } from './CreateClientModal';

interface GodDashboardProps {
  admin: GodAdmin;
  onLogout: () => void;
}

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  trialClients: number;
  totalPhotos: number;
  totalMessages: number;
  totalStorageMB: number;
  recentClients: Client[];
}

const ROWS_PER_PAGE = 100;

export function GodDashboard({ admin, onLogout }: GodDashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, statsData] = await Promise.all([
        getAllClients(),
        getDashboardStats(),
      ]);
      setClients(clientsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await godLogout();
    onLogout();
  };

  const handleImpersonate = async (clientId: string) => {
    setActionLoading(clientId);
    try {
      const result = await createImpersonationToken(admin.id, clientId);
      if (result.success && result.token) {
        // Open client interface with impersonation token
        window.open(`/god/impersonate?token=${result.token}`, '_blank');
      } else {
        alert(result.error || 'Failed to create access token');
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      alert('Failed to create access token');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (clientId: string, newStatus: 'active' | 'expired' | 'trial') => {
    setActionLoading(clientId);
    try {
      const success = await updateClientStatus(clientId, newStatus);
      if (success) {
        setClients(clients.map(c =>
          c.id === clientId ? { ...c, status: newStatus } : c
        ));
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Status update error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }
    setActionLoading(clientId);
    try {
      const success = await deleteClient(clientId);
      if (success) {
        setClients(clients.filter(c => c.id !== clientId));
      } else {
        alert('Failed to delete client');
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.wedding_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.couple_names.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredClients.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
      active: { bg: 'bg-green-500/10', text: 'text-green-400', icon: CheckCircle },
      trial: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Clock },
      expired: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertTriangle },
    };
    const badge = badges[status] || badges.expired;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">God Admin</h1>
                <p className="text-xs text-gray-400">Bienvenue, {admin.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <StatCard
              label="Total Clients"
              value={stats.totalClients}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Actifs"
              value={stats.activeClients}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              label="Essai"
              value={stats.trialClients}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              label="Photos"
              value={stats.totalPhotos}
              icon={Image}
              color="purple"
            />
            <StatCard
              label="Messages"
              value={stats.totalMessages}
              icon={MessageSquare}
              color="pink"
            />
            <StatCard
              label="Stockage"
              value={formatStorage(stats.totalStorageMB)}
              icon={HardDrive}
              color="orange"
              isText
            />
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="trial">Essai</option>
            <option value="expired">Expirés</option>
          </select>

          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Create Client */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-lg transition-all shadow-lg"
          >
            <Plus size={18} />
            <span>Nouveau client</span>
          </button>
        </div>

        {/* Results Count - Above the table */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
              <span className="text-amber-400 font-semibold">{filteredClients.length}</span>
              <span className="text-gray-300 ml-1.5">
                client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
              </span>
            </div>
            {(searchQuery || statusFilter !== 'all') && (
              <span className="text-sm text-gray-500">
                {searchQuery && `Recherche: "${searchQuery}"`}
                {searchQuery && statusFilter !== 'all' && ' • '}
                {statusFilter !== 'all' && `Statut: ${statusFilter}`}
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <span className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </span>
          )}
        </div>

        {/* Clients Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Date mariage
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Médias
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Stockage
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                    Chargement...
                  </td>
                </tr>
              ) : paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucun client trouvé
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-medium text-white">{client.wedding_name}</p>
                          <p className="text-sm text-gray-400">{client.couple_names}</p>
                          <p className="text-xs text-gray-500">{client.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {getStatusBadge(client.status)}
                      </td>
                      <td className="px-6 py-5 text-gray-300">
                        {formatDate(client.wedding_date)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Image size={14} />
                            {client.photo_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare size={14} />
                            {client.message_count}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-300 text-sm">
                        {formatStorage(client.storage_used_mb)}
                      </td>
                      <td className="px-6 py-5 text-gray-300 text-sm">
                        {formatDate(client.subscription_expires_at)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Client Interface */}
                          <button
                            onClick={() => handleImpersonate(client.id)}
                            disabled={actionLoading === client.id}
                            className="p-2 text-gray-400 hover:text-amber-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Accéder à l'interface client"
                          >
                            {actionLoading === client.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>

                          {/* Status Menu */}
                          <div className="relative group">
                            <button
                              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                              title="Modifier le statut"
                            >
                              <Settings size={16} />
                            </button>
                            <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <div className="py-1">
                                {(['active', 'trial', 'expired'] as const).map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusChange(client.id, status)}
                                    disabled={client.status === status}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 ${
                                      client.status === status ? 'text-amber-400' : 'text-gray-300'
                                    }`}
                                  >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* External Link */}
                          <a
                            href={`/${client.wedding_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Voir le site public"
                          >
                            <ExternalLink size={16} />
                          </a>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(client.id)}
                            disabled={actionLoading === client.id}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredClients.length)} sur {filteredClients.length} clients
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Début
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fin
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Create Client Modal */}
      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newClient) => {
            setClients([newClient, ...clients]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number | string;
  icon: typeof Users;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'orange';
  isText?: boolean;
}

function StatCard({ label, value, icon: Icon, color, isText }: StatCardProps) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
    pink: 'from-pink-500 to-pink-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className={`w-10 h-10 rounded-lg bg-linear-to-br ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="text-white" size={20} />
      </div>
      <p className="text-2xl font-bold text-white">
        {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
