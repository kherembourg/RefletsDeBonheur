import { memo, useCallback } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import type { GuestbookEntry } from '../../lib/services/dataService';

// Re-export as GuestbookMessage for backwards compatibility
type GuestbookMessage = GuestbookEntry;

interface MessageListProps {
  messages: GuestbookMessage[];
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

// Card background colors - soft pastel palette (module level to avoid recreation)
const cardColors = [
  'bg-linear-to-br from-rose-50 to-pink-50',
  'bg-linear-to-br from-amber-50 to-orange-50',
  'bg-linear-to-br from-emerald-50 to-teal-50',
  'bg-linear-to-br from-sky-50 to-blue-50',
  'bg-linear-to-br from-violet-50 to-purple-50',
  'bg-linear-to-br from-cream to-blush',
];

// Decorative corner elements (module level to avoid recreation)
const cornerDecorations = ['❦', '✿', '❀', '✾', '❁', '✽'];

// Memoized wave border component to avoid SVG recreation
const WaveBorder = memo(function WaveBorder({ position }: { position: 'top' | 'bottom' | 'left' | 'right' }) {
  if (position === 'top') {
    return (
      <div className="absolute -top-2 left-0 right-0 h-4 overflow-hidden">
        <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full">
          <path
            d="M0,10 Q10,0 20,10 T40,10 T60,10 T80,10 T100,10 T120,10 T140,10 T160,10 T180,10 T200,10 L200,20 L0,20 Z"
            fill="currentColor"
            className="text-white"
          />
        </svg>
      </div>
    );
  }
  if (position === 'bottom') {
    return (
      <div className="absolute -bottom-2 left-0 right-0 h-4 overflow-hidden rotate-180">
        <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full">
          <path
            d="M0,10 Q10,0 20,10 T40,10 T60,10 T80,10 T100,10 T120,10 T140,10 T160,10 T180,10 T200,10 L200,20 L0,20 Z"
            fill="currentColor"
            className="text-white"
          />
        </svg>
      </div>
    );
  }
  if (position === 'left') {
    return (
      <div className="absolute top-0 -left-2 bottom-0 w-4 overflow-hidden">
        <svg viewBox="0 0 20 200" preserveAspectRatio="none" className="w-full h-full">
          <path
            d="M10,0 Q0,10 10,20 T10,40 T10,60 T10,80 T10,100 T10,120 T10,140 T10,160 T10,180 T10,200 L20,200 L20,0 Z"
            fill="currentColor"
            className="text-white"
          />
        </svg>
      </div>
    );
  }
  return (
    <div className="absolute top-0 -right-2 bottom-0 w-4 overflow-hidden rotate-180">
      <svg viewBox="0 0 20 200" preserveAspectRatio="none" className="w-full h-full">
        <path
          d="M10,0 Q0,10 10,20 T10,40 T10,60 T10,80 T10,100 T10,120 T10,140 T10,160 T10,180 T10,200 L20,200 L20,0 Z"
          fill="currentColor"
          className="text-white"
        />
      </svg>
    </div>
  );
});

// Memoized message card component
interface MessageCardProps {
  msg: GuestbookMessage;
  colorClass: string;
  cornerDecor: string;
  animationDelay: string | undefined;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

const MessageCard = memo(function MessageCard({
  msg,
  colorClass,
  cornerDecor,
  animationDelay,
  isAdmin,
  onDelete
}: MessageCardProps) {
  const handleDeleteClick = () => {
    if (confirm('Supprimer ce message ?')) {
      onDelete(msg.id);
    }
  };

  return (
    <div
      className="greeting-card group"
      style={animationDelay ? { animationDelay } : undefined}
    >
      {/* Card with wave border effect */}
      <div className={`relative ${colorClass} p-1 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1`}>
        {/* Wave borders */}
        <WaveBorder position="top" />
        <WaveBorder position="bottom" />
        <WaveBorder position="left" />
        <WaveBorder position="right" />

        {/* Inner card content */}
        <div className="bg-white/80 backdrop-blur-xs p-6 relative min-h-[200px] flex flex-col">
          {/* Corner decorations */}
          <div className="absolute top-2 left-3 text-burgundy-old/20 text-lg font-serif">
            {cornerDecor}
          </div>
          <div className="absolute top-2 right-3 text-burgundy-old/20 text-lg font-serif transform scale-x-[-1]">
            {cornerDecor}
          </div>

          {/* Message content */}
          <div className="flex-1 flex flex-col justify-center text-center px-2 py-4">
            <p className="font-serif text-charcoal leading-relaxed italic text-base">
              "{msg.text}"
            </p>
          </div>

          {/* Author section */}
          <div className="border-t border-charcoal/10 pt-4 mt-auto">
            <div className="flex items-center justify-center gap-3">
              {/* Author initial */}
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-burgundy-old/10 to-burgundy-old/20 flex items-center justify-center">
                <span className="font-script text-xl text-burgundy-old">
                  {msg.author.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Author name and date */}
              <div className="text-left">
                <p className="font-medium text-charcoal text-sm">
                  {msg.author}
                </p>
                <p className="text-xs text-charcoal/50">
                  {msg.createdAt.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom corner decorations */}
          <div className="absolute bottom-2 left-3 text-burgundy-old/20 text-lg font-serif transform rotate-180">
            {cornerDecor}
          </div>
          <div className="absolute bottom-2 right-3 text-burgundy-old/20 text-lg font-serif transform rotate-180 scale-x-[-1]">
            {cornerDecor}
          </div>

          {/* Delete Button (Admin Only) */}
          {isAdmin && (
            <button
              onClick={handleDeleteClick}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-charcoal/30 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
              aria-label="Supprimer"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export const MessageList = memo(function MessageList({ messages, isAdmin, onDelete }: MessageListProps) {
  // Memoized delete handler
  const handleDelete = useCallback((id: string) => {
    onDelete(id);
  }, [onDelete]);

  if (messages.length === 0) {
    return (
      <div className="text-center py-16 sm:py-24 px-4">
        {/* Decorative illustration */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-linear-to-br from-burgundy-old/5 to-burgundy-old/10 rounded-full"></div>
          <div className="absolute inset-4 bg-white rounded-full shadow-inner flex items-center justify-center">
            <MessageSquare className="text-burgundy-old/40" size={36} />
          </div>
          {/* Decorative hearts */}
          <div className="absolute -top-2 -right-2 w-6 h-6 text-burgundy-old/30">❤</div>
          <div className="absolute -bottom-1 -left-3 w-4 h-4 text-burgundy-old/20">❤</div>
        </div>

        <h3 className="font-serif text-2xl sm:text-3xl text-charcoal mb-3">
          Le livre d'or vous attend
        </h3>
        <p className="text-charcoal/50 font-light max-w-md mx-auto mb-8 leading-relaxed">
          Soyez le premier à laisser un message pour les mariés.
          Vos mots resteront gravés pour toujours dans leur mémoire.
        </p>

        {/* Decorative bottom element */}
        <div className="flex items-center justify-center gap-4 mt-12">
          <div className="w-16 h-px bg-linear-to-r from-transparent to-burgundy-old/20"></div>
          <div className="text-burgundy-old/30 text-lg">❧</div>
          <div className="w-16 h-px bg-linear-to-r from-burgundy-old/20 to-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {messages.map((msg, index) => (
        <MessageCard
          key={msg.id}
          msg={msg}
          colorClass={cardColors[index % cardColors.length]}
          cornerDecor={cornerDecorations[index % cornerDecorations.length]}
          // Only animate first 9 items (visible on initial load)
          animationDelay={index < 9 ? `${index * 0.1}s` : undefined}
          isAdmin={isAdmin}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
});
