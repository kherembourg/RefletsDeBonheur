import { useState, useEffect } from 'react';
import { Smile } from 'lucide-react';
import {
  DataService,
  REACTION_EMOJIS,
  type ReactionType,
  type Reaction
} from '../../lib/services/dataService';

interface ReactionsPanelProps {
  mediaId: string;
  dataService?: DataService;
  onReactionChange?: () => void;
  compact?: boolean;
}

export default function ReactionsPanel({ mediaId, dataService, onReactionChange, compact = false }: ReactionsPanelProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Create a default service for demo mode if not provided
  const service = dataService || new DataService({ demoMode: true });

  // Load initial state
  useEffect(() => {
    setUserReaction(service.getUserReaction(mediaId));
    setReactions(service.getReactions(mediaId));
  }, [mediaId, service]);

  const handleReaction = (reactionType: ReactionType) => {
    const newState = service.toggleReaction(mediaId, reactionType);

    // Update local state
    setUserReaction(newState ? reactionType : null);
    setReactions(service.getReactions(mediaId));
    setShowPicker(false);

    // Notify parent
    if (onReactionChange) {
      onReactionChange();
    }
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  // All available reaction types
  const allReactionTypes: ReactionType[] = ['heart', 'love', 'laugh', 'wow', 'celebrate', 'clap'];

  if (compact) {
    // Compact view - just show current reactions and add button
    return (
      <div className="relative">
        <div className="flex items-center gap-1">
          {/* Existing reactions */}
          {reactions.slice(0, 3).map((reaction) => (
            <div
              key={reaction.type}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                userReaction === reaction.type
                  ? 'bg-[#ae1725]/20 ring-1 ring-[#ae1725]'
                  : 'bg-ivory/50 dark:bg-[#2A2A2A]'
              }`}
            >
              <span>{REACTION_EMOJIS[reaction.type]}</span>
              <span className="font-medium text-deep-charcoal dark:text-[#E5E5E5]">{reaction.count}</span>
            </div>
          ))}

          {/* Add reaction button */}
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="p-1.5 rounded-full bg-ivory/50 dark:bg-[#2A2A2A] hover:bg-[#ae1725]/20 transition-all"
            aria-label="Ajouter une réaction"
          >
            <Smile size={14} className="text-warm-taupe" />
          </button>
        </div>

        {/* Reaction Picker Dropdown */}
        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPicker(false)}
            />
            <div className="absolute top-full mt-2 right-0 bg-ivory dark:bg-[#1A1A1A] rounded-xl shadow-2xl border border-silver-mist/20 p-3 z-50 flex gap-2">
              {allReactionTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  className={`text-2xl p-2 rounded-lg hover:bg-[#ae1725]/10 transition-all hover:scale-125 ${
                    userReaction === type ? 'bg-[#ae1725]/20 ring-2 ring-[#ae1725]' : ''
                  }`}
                  title={type}
                >
                  {REACTION_EMOJIS[type]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Full view - show all reactions with counts
  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {/* All reaction types */}
        {allReactionTypes.map((type) => {
          const reactionData = reactions.find(r => r.type === type);
          const count = reactionData?.count || 0;
          const isActive = userReaction === type;

          return (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 ${
                isActive
                  ? 'bg-[#ae1725] text-white shadow-md ring-2 ring-[#ae1725]/50'
                  : count > 0
                  ? 'bg-ivory dark:bg-[#2A2A2A] text-deep-charcoal dark:text-[#E5E5E5] hover:bg-[#ae1725]/20'
                  : 'bg-silver-mist/20 text-warm-taupe hover:bg-silver-mist/30'
              }`}
              aria-label={`Réagir avec ${type}`}
            >
              <span className="text-base">{REACTION_EMOJIS[type]}</span>
              {count > 0 && (
                <span className="font-semibold">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Total count */}
      {totalReactions > 0 && (
        <p className="text-xs text-warm-taupe mt-2">
          {totalReactions} réaction{totalReactions > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
