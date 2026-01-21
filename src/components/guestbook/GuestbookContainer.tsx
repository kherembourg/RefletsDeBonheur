import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { GuestbookForm } from './GuestbookForm';
import { MessageList } from './MessageList';
import { requireAuth, isAdmin as checkIsAdmin } from '../../lib/auth';
import { useDataService, useGuestbook } from '../../lib/services/dataService';

interface GuestbookContainerProps {
  weddingId?: string;
  demoMode?: boolean; // Skip auth check for demo page
}

export function GuestbookContainer({ weddingId, demoMode = false }: GuestbookContainerProps) {
  // Data service handles both demo and production modes
  const dataService = useDataService({ demoMode, weddingId });
  const { messages, loading, refresh } = useGuestbook(dataService);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check authentication (skip in demo mode)
    if (!demoMode) {
      requireAuth();
    }

    // Check admin status (in demo mode, allow admin features)
    setIsAdmin(demoMode || checkIsAdmin());
  }, [demoMode]);

  const handleSubmit = async (author: string, text: string) => {
    await dataService.addMessage({ author, text });
    refresh();
  };

  const handleDelete = async (id: string) => {
    await dataService.deleteMessage(id);
    refresh();
  };

  // Convert to format expected by MessageList
  const formattedMessages = messages.map(m => ({
    id: m.id,
    author: m.author,
    text: m.text,
    createdAt: m.createdAt,
  }));

  return (
    <div className="space-y-12">
      {/* Form Section - On Top */}
      <div className="max-w-2xl mx-auto">
        <GuestbookForm onSubmit={handleSubmit} />
      </div>

      {/* Decorative Divider */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 h-px bg-linear-to-r from-transparent via-burgundy-old/20 to-transparent"></div>
        <div className="text-burgundy-old/40 text-2xl">❧</div>
        <div className="flex-1 h-px bg-linear-to-r from-transparent via-burgundy-old/20 to-transparent"></div>
      </div>

      {/* Messages Section Header */}
      <div className="text-center">
        <span className="text-burgundy-old/70 tracking-[0.2em] uppercase text-xs font-sans font-medium">
          {loading ? '...' : `${messages.length} message${messages.length > 1 ? 's' : ''}`} de vœux
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-light text-charcoal mt-2">
          Les mots de vos proches
        </h2>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-burgundy-old animate-spin" />
          <p className="text-charcoal/60 font-light">Chargement des messages...</p>
        </div>
      ) : (
        /* Messages Grid */
        <MessageList
          messages={formattedMessages}
          isAdmin={isAdmin}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
