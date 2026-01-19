import { Smile } from 'lucide-react';
import type { ReactionStats } from '../../lib/statistics';

interface ReactionBreakdownProps {
  reactions: ReactionStats[];
  totalReactions: number;
}

export function ReactionBreakdown({ reactions, totalReactions }: ReactionBreakdownProps) {
  if (reactions.length === 0) {
    return (
      <div className="text-center py-8 text-warm-taupe dark:text-silver-mist">
        <Smile size={32} className="mx-auto mb-2 opacity-30" />
        <p>Aucune réaction pour le moment</p>
      </div>
    );
  }

  // Find max count for scaling
  const maxCount = Math.max(...reactions.map(r => r.count), 1);

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="text-center p-4 bg-pearl-white dark:bg-deep-charcoal/30 rounded-lg">
        <div className="text-3xl font-bold text-[#ae1725]">
          {totalReactions}
        </div>
        <div className="text-sm text-warm-taupe dark:text-silver-mist">
          Réactions totales
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        {reactions.map((reaction, index) => {
          const barWidth = (reaction.count / maxCount) * 100;
          const colors = [
            'bg-[#ae1725]',
            'bg-[#ae1725]/80',
            'bg-[#ae1725]/60',
            'bg-[#ae1725]/40',
            'bg-[#ae1725]/30',
            'bg-[#ae1725]/20'
          ];
          const colorClass = colors[index] || 'bg-[#ae1725]/20';

          return (
            <div key={reaction.type} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{reaction.emoji}</span>
                  <span className="font-medium text-deep-charcoal dark:text-ivory capitalize">
                    {reaction.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-warm-taupe dark:text-silver-mist">
                  <span className="font-semibold text-deep-charcoal dark:text-ivory">
                    {reaction.count}
                  </span>
                  <span className="text-xs">
                    ({Math.round(reaction.percentage)}%)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-silver-mist/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pie chart representation (text-based) */}
      <div className="pt-4 border-t border-silver-mist/30">
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {reactions.map(reaction => (
            <div
              key={reaction.type}
              className="flex items-center gap-1 px-2 py-1 bg-pearl-white dark:bg-deep-charcoal/30 rounded-full text-xs"
            >
              <span>{reaction.emoji}</span>
              <span className="text-warm-taupe dark:text-silver-mist">
                {Math.round(reaction.percentage)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
