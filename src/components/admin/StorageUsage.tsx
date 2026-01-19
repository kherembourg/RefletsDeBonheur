import { HardDrive, Image, Video } from 'lucide-react';
import { formatStorageSize } from '../../lib/statistics';

interface StorageUsageProps {
  totalMB: number;
  totalGB: number;
  photoCount: number;
  videoCount: number;
  photoVideoRatio: {
    photoPercentage: number;
    videoPercentage: number;
  };
}

export function StorageUsage({
  totalMB,
  totalGB,
  photoCount,
  videoCount,
  photoVideoRatio
}: StorageUsageProps) {
  // Determine display format
  const displaySize = totalGB >= 1 ? `${totalGB.toFixed(2)} GB` : `${Math.round(totalMB)} MB`;
  const photoPercentage = photoVideoRatio.photoPercentage;
  const videoPercentage = photoVideoRatio.videoPercentage;

  return (
    <div className="space-y-4">
      {/* Total Storage */}
      <div className="text-center p-6 bg-pearl-white dark:bg-deep-charcoal/30 rounded-lg">
        <HardDrive className="w-12 h-12 text-[#ae1725] mx-auto mb-2" />
        <div className="text-4xl font-bold text-deep-charcoal dark:text-ivory">
          {displaySize}
        </div>
        <div className="text-sm text-warm-taupe dark:text-silver-mist mt-1">
          Espace utilisé (estimé)
        </div>
      </div>

      {/* Photo/Video Breakdown */}
      <div className="space-y-3">
        {/* Photos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Image size={16} className="text-[#ae1725]" />
              <span className="font-medium text-deep-charcoal dark:text-ivory">
                Photos
              </span>
            </div>
            <span className="text-sm text-warm-taupe dark:text-silver-mist">
              {photoCount} • {Math.round(photoPercentage)}%
            </span>
          </div>
          <div className="h-2 bg-silver-mist/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ae1725] rounded-full transition-all duration-500"
              style={{ width: `${photoPercentage}%` }}
            />
          </div>
        </div>

        {/* Videos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Video size={16} className="text-[#ae1725]" />
              <span className="font-medium text-deep-charcoal dark:text-ivory">
                Vidéos
              </span>
            </div>
            <span className="text-sm text-warm-taupe dark:text-silver-mist">
              {videoCount} • {Math.round(videoPercentage)}%
            </span>
          </div>
          <div className="h-2 bg-silver-mist/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ae1725]/60 rounded-full transition-all duration-500"
              style={{ width: `${videoPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="text-xs text-center text-warm-taupe dark:text-silver-mist bg-pearl-white dark:bg-deep-charcoal/20 p-3 rounded-lg">
        <p className="mb-1">
          💡 <span className="font-medium">Estimation:</span> Photos ~3MB, Vidéos ~50MB
        </p>
        <p className="text-[10px]">
          Le stockage réel peut varier selon la qualité et la compression.
        </p>
      </div>
    </div>
  );
}
