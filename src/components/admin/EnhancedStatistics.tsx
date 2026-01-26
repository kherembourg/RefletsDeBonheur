import { useState, useCallback, memo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Heart,
  HardDrive,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { EnhancedStatistics as StatsType } from '../../lib/statistics';
import { TimelineGraph } from './TimelineGraph';
import { StorageUsage } from './StorageUsage';
import { TopUploaders } from './TopUploaders';
import { ReactionBreakdown } from './ReactionBreakdown';

interface EnhancedStatisticsProps {
  stats: StatsType;
}

type SectionId = 'timeline' | 'storage' | 'uploaders' | 'reactions';

export const EnhancedStatistics = memo(function EnhancedStatistics({ stats }: EnhancedStatisticsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    new Set(['timeline'])
  );

  // Memoized toggle handler
  const toggleSection = useCallback((sectionId: SectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const isExpanded = (sectionId: SectionId) => expandedSections.has(sectionId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-burgundy-old">
        <BarChart3 size={24} />
        <h2 className="text-xl font-bold font-serif text-deep-charcoal dark:text-ivory">
          Statistiques Avancées
        </h2>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-ivory dark:bg-deep-charcoal/50 p-4 rounded-lg border border-silver-mist/30 text-center">
          <div className="text-2xl font-bold text-burgundy-old">
            {stats.uniqueUploaders}
          </div>
          <div className="text-xs text-warm-taupe dark:text-silver-mist">
            Contributeurs
          </div>
        </div>

        <div className="bg-ivory dark:bg-deep-charcoal/50 p-4 rounded-lg border border-silver-mist/30 text-center">
          <div className="text-2xl font-bold text-burgundy-old">
            {stats.totalReactions}
          </div>
          <div className="text-xs text-warm-taupe dark:text-silver-mist">
            Réactions
          </div>
        </div>

        <div className="bg-ivory dark:bg-deep-charcoal/50 p-4 rounded-lg border border-silver-mist/30 text-center">
          <div className="text-2xl font-bold text-burgundy-old">
            {stats.peakUploadDay}
          </div>
          <div className="text-xs text-warm-taupe dark:text-silver-mist">
            Jour le + actif
          </div>
        </div>

        <div className="bg-ivory dark:bg-deep-charcoal/50 p-4 rounded-lg border border-silver-mist/30 text-center">
          <div className="text-2xl font-bold text-burgundy-old">
            {stats.peakUploadHour}
          </div>
          <div className="text-xs text-warm-taupe dark:text-silver-mist">
            Heure de pointe
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-3">
        {/* Timeline Section */}
        <div className="bg-ivory dark:bg-deep-charcoal/50 rounded-xl border border-silver-mist/30 overflow-hidden">
          <button
            onClick={() => toggleSection('timeline')}
            className="w-full flex items-center justify-between p-4 hover:bg-pearl-white dark:hover:bg-deep-charcoal/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-burgundy-old" />
              <h3 className="font-semibold text-deep-charcoal dark:text-ivory">
                Timeline des Uploads
              </h3>
            </div>
            {isExpanded('timeline') ? (
              <ChevronUp size={20} className="text-warm-taupe" />
            ) : (
              <ChevronDown size={20} className="text-warm-taupe" />
            )}
          </button>

          {isExpanded('timeline') && (
            <div className="p-4 pt-0 border-t border-silver-mist/30">
              <TimelineGraph data={stats.uploadsByDay} />
            </div>
          )}
        </div>

        {/* Storage Section */}
        <div className="bg-ivory dark:bg-deep-charcoal/50 rounded-xl border border-silver-mist/30 overflow-hidden">
          <button
            onClick={() => toggleSection('storage')}
            className="w-full flex items-center justify-between p-4 hover:bg-pearl-white dark:hover:bg-deep-charcoal/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HardDrive size={20} className="text-burgundy-old" />
              <h3 className="font-semibold text-deep-charcoal dark:text-ivory">
                Stockage & Répartition
              </h3>
            </div>
            {isExpanded('storage') ? (
              <ChevronUp size={20} className="text-warm-taupe" />
            ) : (
              <ChevronDown size={20} className="text-warm-taupe" />
            )}
          </button>

          {isExpanded('storage') && (
            <div className="p-4 pt-0 border-t border-silver-mist/30">
              <StorageUsage
                totalMB={stats.estimatedStorageMB}
                totalGB={stats.estimatedStorageGB}
                photoCount={stats.totalPhotos}
                videoCount={stats.totalVideos}
                photoVideoRatio={stats.photoVideoRatio}
              />
            </div>
          )}
        </div>

        {/* Top Uploaders Section */}
        <div className="bg-ivory dark:bg-deep-charcoal/50 rounded-xl border border-silver-mist/30 overflow-hidden">
          <button
            onClick={() => toggleSection('uploaders')}
            className="w-full flex items-center justify-between p-4 hover:bg-pearl-white dark:hover:bg-deep-charcoal/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users size={20} className="text-burgundy-old" />
              <h3 className="font-semibold text-deep-charcoal dark:text-ivory">
                Contributeurs les Plus Actifs
              </h3>
            </div>
            {isExpanded('uploaders') ? (
              <ChevronUp size={20} className="text-warm-taupe" />
            ) : (
              <ChevronDown size={20} className="text-warm-taupe" />
            )}
          </button>

          {isExpanded('uploaders') && (
            <div className="p-4 pt-0 border-t border-silver-mist/30">
              <TopUploaders uploaders={stats.topUploaders} limit={5} />
            </div>
          )}
        </div>

        {/* Reactions Section */}
        <div className="bg-ivory dark:bg-deep-charcoal/50 rounded-xl border border-silver-mist/30 overflow-hidden">
          <button
            onClick={() => toggleSection('reactions')}
            className="w-full flex items-center justify-between p-4 hover:bg-pearl-white dark:hover:bg-deep-charcoal/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Heart size={20} className="text-burgundy-old" />
              <h3 className="font-semibold text-deep-charcoal dark:text-ivory">
                Répartition des Réactions
              </h3>
            </div>
            {isExpanded('reactions') ? (
              <ChevronUp size={20} className="text-warm-taupe" />
            ) : (
              <ChevronDown size={20} className="text-warm-taupe" />
            )}
          </button>

          {isExpanded('reactions') && (
            <div className="p-4 pt-0 border-t border-silver-mist/30">
              <ReactionBreakdown
                reactions={stats.reactionBreakdown}
                totalReactions={stats.totalReactions}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-center text-warm-taupe dark:text-silver-mist bg-ivory dark:bg-deep-charcoal/50 p-3 rounded-lg border border-silver-mist/30">
        💡 Les statistiques sont calculées en temps réel à partir des données actuelles
      </div>
    </div>
  );
});
