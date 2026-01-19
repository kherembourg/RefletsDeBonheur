import type { MediaItem, GuestbookMessage, ReactionType } from './mockData';

export interface EnhancedStatistics {
  // Basic counts
  totalPhotos: number;
  totalVideos: number;
  totalMedia: number;
  totalMessages: number;
  totalFavorites: number;
  totalReactions: number;

  // Storage
  estimatedStorageMB: number;
  estimatedStorageGB: number;

  // User activity
  topUploaders: UploaderStats[];
  uniqueUploaders: number;

  // Timeline
  uploadsByDay: DayUpload[];
  uploadsByHour: HourUpload[];

  // Reactions breakdown
  reactionBreakdown: ReactionStats[];
  mostReactedPhotos: MediaItem[];

  // Ratios
  photoVideoRatio: {
    photos: number;
    videos: number;
    photoPercentage: number;
    videoPercentage: number;
  };

  // Peak times
  peakUploadDay: string;
  peakUploadHour: string;
  peakUploadCount: number;
}

export interface UploaderStats {
  name: string;
  photoCount: number;
  videoCount: number;
  totalCount: number;
  totalReactions: number;
  percentage: number;
}

export interface DayUpload {
  date: string;
  displayDate: string;
  count: number;
  photos: number;
  videos: number;
}

export interface HourUpload {
  hour: number;
  displayHour: string;
  count: number;
}

export interface ReactionStats {
  type: ReactionType;
  emoji: string;
  count: number;
  percentage: number;
}

// Average file sizes (estimates)
const AVG_PHOTO_SIZE_MB = 3; // ~3MB for high-res wedding photo
const AVG_VIDEO_SIZE_MB = 50; // ~50MB for short video clip

export function calculateEnhancedStatistics(
  media: MediaItem[],
  messages: GuestbookMessage[]
): EnhancedStatistics {
  // Basic counts
  const photos = media.filter(m => m.type === 'image');
  const videos = media.filter(m => m.type === 'video');

  const totalPhotos = photos.length;
  const totalVideos = videos.length;
  const totalMedia = media.length;
  const totalMessages = messages.length;

  // Favorites
  const totalFavorites = media.reduce((sum, m) => sum + (m.favoriteCount || 0), 0);

  // Reactions
  const totalReactions = media.reduce((sum, m) => {
    if (!m.reactions) return sum;
    return sum + m.reactions.reduce((rSum, r) => rSum + r.count, 0);
  }, 0);

  // Storage estimation
  const estimatedStorageMB = (totalPhotos * AVG_PHOTO_SIZE_MB) + (totalVideos * AVG_VIDEO_SIZE_MB);
  const estimatedStorageGB = estimatedStorageMB / 1024;

  // User activity
  const uploaderMap = new Map<string, UploaderStats>();

  media.forEach(item => {
    const existing = uploaderMap.get(item.author) || {
      name: item.author,
      photoCount: 0,
      videoCount: 0,
      totalCount: 0,
      totalReactions: 0,
      percentage: 0
    };

    if (item.type === 'image') {
      existing.photoCount++;
    } else {
      existing.videoCount++;
    }
    existing.totalCount++;

    // Count reactions for this uploader
    if (item.reactions) {
      existing.totalReactions += item.reactions.reduce((sum, r) => sum + r.count, 0);
    }

    uploaderMap.set(item.author, existing);
  });

  // Calculate percentages and sort
  const topUploaders = Array.from(uploaderMap.values())
    .map(uploader => ({
      ...uploader,
      percentage: (uploader.totalCount / totalMedia) * 100
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  const uniqueUploaders = uploaderMap.size;

  // Timeline by day
  const dayMap = new Map<string, DayUpload>();

  media.forEach(item => {
    const dateKey = item.createdAt.toISOString().split('T')[0];
    const existing = dayMap.get(dateKey) || {
      date: dateKey,
      displayDate: new Date(dateKey).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      }),
      count: 0,
      photos: 0,
      videos: 0
    };

    existing.count++;
    if (item.type === 'image') {
      existing.photos++;
    } else {
      existing.videos++;
    }

    dayMap.set(dateKey, existing);
  });

  const uploadsByDay = Array.from(dayMap.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  // Timeline by hour
  const hourMap = new Map<number, number>();

  media.forEach(item => {
    const hour = item.createdAt.getHours();
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  });

  const uploadsByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    displayHour: `${hour.toString().padStart(2, '0')}:00`,
    count: hourMap.get(hour) || 0
  }));

  // Reaction breakdown
  const reactionMap = new Map<ReactionType, number>();
  const REACTION_EMOJIS: Record<ReactionType, string> = {
    heart: '❤️',
    laugh: '😂',
    wow: '😮',
    celebrate: '🎉',
    love: '😍',
    clap: '👏',
  };

  media.forEach(item => {
    if (!item.reactions) return;
    item.reactions.forEach(reaction => {
      reactionMap.set(
        reaction.type,
        (reactionMap.get(reaction.type) || 0) + reaction.count
      );
    });
  });

  const reactionBreakdown = Array.from(reactionMap.entries())
    .map(([type, count]) => ({
      type,
      emoji: REACTION_EMOJIS[type],
      count,
      percentage: totalReactions > 0 ? (count / totalReactions) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Most reacted photos
  const mostReactedPhotos = [...media]
    .sort((a, b) => {
      const aTotal = a.reactions?.reduce((sum, r) => sum + r.count, 0) || 0;
      const bTotal = b.reactions?.reduce((sum, r) => sum + r.count, 0) || 0;
      return bTotal - aTotal;
    })
    .slice(0, 5); // Top 5

  // Photo/Video ratio
  const photoVideoRatio = {
    photos: totalPhotos,
    videos: totalVideos,
    photoPercentage: totalMedia > 0 ? (totalPhotos / totalMedia) * 100 : 0,
    videoPercentage: totalMedia > 0 ? (totalVideos / totalMedia) * 100 : 0
  };

  // Peak times
  const peakDay = uploadsByDay.length > 0
    ? uploadsByDay.reduce((max, day) => day.count > max.count ? day : max, uploadsByDay[0])
    : { displayDate: 'N/A', count: 0 };

  const peakHour = uploadsByHour.reduce((max, hour) =>
    hour.count > max.count ? hour : max,
    uploadsByHour[0]
  );

  return {
    totalPhotos,
    totalVideos,
    totalMedia,
    totalMessages,
    totalFavorites,
    totalReactions,
    estimatedStorageMB: Math.round(estimatedStorageMB * 10) / 10,
    estimatedStorageGB: Math.round(estimatedStorageGB * 100) / 100,
    topUploaders,
    uniqueUploaders,
    uploadsByDay,
    uploadsByHour,
    reactionBreakdown,
    mostReactedPhotos,
    photoVideoRatio,
    peakUploadDay: peakDay.displayDate,
    peakUploadHour: peakHour.displayHour,
    peakUploadCount: peakDay.count
  };
}

// Helper to format storage size
export function formatStorageSize(mb: number): string {
  if (mb < 1024) {
    return `${Math.round(mb)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

// Helper to format percentage
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
