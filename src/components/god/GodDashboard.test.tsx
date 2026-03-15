import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GodDashboard } from './GodDashboard';

const mockGodLogout = vi.fn();
const mockGetAllClients = vi.fn();
const mockGetDashboardStats = vi.fn();
const mockCreateImpersonationToken = vi.fn();
const mockUpdateClientStatus = vi.fn();
const mockDeleteClient = vi.fn();

vi.mock('../../lib/auth/godAuth', () => ({
  godLogout: () => mockGodLogout(),
  getAllClients: () => mockGetAllClients(),
  getDashboardStats: () => mockGetDashboardStats(),
  createImpersonationToken: (...args: unknown[]) => mockCreateImpersonationToken(...args),
  updateClientStatus: (...args: unknown[]) => mockUpdateClientStatus(...args),
  deleteClient: (...args: unknown[]) => mockDeleteClient(...args),
}));

vi.mock('./CreateClientModal', () => ({
  CreateClientModal: () => <div>Create client modal</div>,
}));

describe('GodDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAllClients.mockResolvedValue([
      {
        id: 'client-1',
        wedding_name: 'Alice & Bob',
        couple_names: 'Alice et Bob',
        username: 'alicebob',
        email: 'alice@example.com',
        wedding_date: '2026-07-10',
        wedding_slug: 'alice-bob',
        status: 'active',
        photo_count: 12,
        message_count: 4,
        storage_used_mb: 256,
        subscription_expires_at: '2026-08-10',
      },
    ]);

    mockGetDashboardStats.mockResolvedValue({
      totalClients: 1,
      activeClients: 1,
      trialClients: 0,
      totalPhotos: 12,
      totalMessages: 4,
      totalStorageMB: 256,
      recentClients: [],
    });
  });

  it('renders loaded clients and stats', async () => {
    render(
      <GodDashboard
        admin={{ id: 'god-1', username: 'kevin' }}
        onLogout={vi.fn()}
      />
    );

    expect(await screen.findByText('Alice & Bob')).toBeInTheDocument();
    expect(screen.getByText('Total Clients')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('opens a delete confirmation modal before removing a client', async () => {
    render(
      <GodDashboard
        admin={{ id: 'god-1', username: 'kevin' }}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByLabelText('Supprimer Alice & Bob'));

    expect(screen.getByText('Delete this client?')).toBeInTheDocument();
    expect(screen.getByText(/Delete Alice & Bob and all related access data/i)).toBeInTheDocument();
  });

  it('deletes a client after confirmation', async () => {
    mockDeleteClient.mockResolvedValue(true);

    render(
      <GodDashboard
        admin={{ id: 'god-1', username: 'kevin' }}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByLabelText('Supprimer Alice & Bob'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDeleteClient).toHaveBeenCalledWith('client-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('Alice & Bob')).not.toBeInTheDocument();
    });
  });
});
