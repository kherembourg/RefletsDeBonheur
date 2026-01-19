import { User, TrendingUp, Heart } from 'lucide-react';
import type { UploaderStats } from '../../lib/statistics';

interface TopUploadersProps {
  uploaders: UploaderStats[];
  limit?: number;
}

export function TopUploaders({ uploaders, limit = 5 }: TopUploadersProps) {
  const displayUploaders = uploaders.slice(0, limit);

  if (displayUploaders.length === 0) {
    return (
      <div className="text-center py-8 text-warm-taupe dark:text-silver-mist">
        Aucun uploader pour le moment
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayUploaders.map((uploader, index) => {
        const isTop = index === 0;
        const medals = ['🥇', '🥈', '🥉'];
        const medal = index < 3 ? medals[index] : null;

        return (
          <div
            key={uploader.name}
            className={`relative p-4 rounded-lg border transition-all ${
              isTop
                ? 'bg-[#ae1725]/10 border-[#ae1725]'
                : 'bg-pearl-white dark:bg-deep-charcoal/30 border-silver-mist/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Left: User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {medal && <span className="text-xl">{medal}</span>}
                  <User size={16} className="text-[#ae1725] flex-shrink-0" />
                  <h3 className="font-semibold text-deep-charcoal dark:text-ivory truncate">
                    {uploader.name}
                  </h3>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-warm-taupe dark:text-silver-mist">
                  <span>
                    📸 {uploader.photoCount}
                  </span>
                  <span>
                    🎥 {uploader.videoCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={12} />
                    {uploader.totalReactions}
                  </span>
                </div>
              </div>

              {/* Right: Count & percentage */}
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold text-[#ae1725]">
                  {uploader.totalCount}
                </div>
                <div className="text-xs text-warm-taupe dark:text-silver-mist">
                  {Math.round(uploader.percentage)}%
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-1.5 bg-silver-mist/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTop ? 'bg-[#ae1725]' : 'bg-[#ae1725]/60'
                  }`}
                  style={{ width: `${uploader.percentage}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Show more indicator */}
      {uploaders.length > limit && (
        <div className="text-center text-sm text-warm-taupe dark:text-silver-mist pt-2">
          + {uploaders.length - limit} autre{uploaders.length - limit > 1 ? 's' : ''} uploader{uploaders.length - limit > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
