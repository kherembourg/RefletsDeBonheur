import { supabase, isSupabaseConfigured } from './client';
import type {
  Wedding,
  Media,
  GuestbookMessage,
  RSVP,
  Reaction,
  Favorite,
  Album,
  Profile,
  WeddingStats,
  WeddingConfig,
  InsertTables,
  UpdateTables,
  ReactionEmoji,
  ModerationStatus,
} from './types';

// ============================================
// Error Handling
// ============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function handleError(error: unknown, context: string): never {
  console.error(`[${context}]`, error);
  if (error instanceof Error) {
    throw new ApiError(error.message, 'SUPABASE_ERROR', error);
  }
  throw new ApiError('An unexpected error occurred', 'UNKNOWN_ERROR', error);
}

// ============================================
// PROFILES API
// ============================================

export const profilesApi = {
  async get(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      handleError(error, 'profilesApi.get');
    }
    return data;
  },

  async update(userId: string, updates: UpdateTables<'profiles'>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) handleError(error, 'profilesApi.update');
    return data;
  },

  async getCurrent(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.get(user.id);
  },
};

// ============================================
// WEDDINGS API
// ============================================

export const weddingsApi = {
  async getBySlug(slug: string): Promise<Wedding | null> {
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleError(error, 'weddingsApi.getBySlug');
    }
    return data;
  },

  async getById(id: string): Promise<Wedding | null> {
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleError(error, 'weddingsApi.getById');
    }
    return data;
  },

  async getByOwnerId(ownerId: string): Promise<Wedding[]> {
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) handleError(error, 'weddingsApi.getByOwnerId');
    return data || [];
  },

  async create(wedding: InsertTables<'weddings'>): Promise<Wedding> {
    const { data, error } = await supabase
      .from('weddings')
      .insert(wedding)
      .select()
      .single();

    if (error) handleError(error, 'weddingsApi.create');
    return data;
  },

  async update(id: string, updates: UpdateTables<'weddings'>): Promise<Wedding> {
    const { data, error } = await supabase
      .from('weddings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) handleError(error, 'weddingsApi.update');
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('weddings')
      .delete()
      .eq('id', id);

    if (error) handleError(error, 'weddingsApi.delete');
  },

  async verifyPin(slug: string, pin: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('weddings')
      .select('id')
      .eq('slug', slug)
      .eq('pin_code', pin)
      .single();

    if (error) return false;
    return Boolean(data);
  },

  async verifyMagicToken(token: string): Promise<Wedding | null> {
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('magic_token', token)
      .single();

    if (error) return null;
    return data;
  },

  async getStats(weddingId: string): Promise<WeddingStats | null> {
    const { data, error } = await supabase
      .from('wedding_stats')
      .select('*')
      .eq('wedding_id', weddingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleError(error, 'weddingsApi.getStats');
    }
    return data;
  },
};

// ============================================
// MEDIA API
// ============================================

export const mediaApi = {
  async getByWeddingId(
    weddingId: string,
    options?: {
      status?: 'ready' | 'all';
      moderation?: ModerationStatus | 'all';
      type?: 'image' | 'video' | 'all';
      limit?: number;
      offset?: number;
    }
  ): Promise<Media[]> {
    let query = supabase
      .from('media')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options?.moderation && options.moderation !== 'all') {
      query = query.eq('moderation_status', options.moderation);
    }
    if (options?.type && options.type !== 'all') {
      query = query.eq('type', options.type);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) handleError(error, 'mediaApi.getByWeddingId');
    return data || [];
  },

  async getById(id: string): Promise<Media | null> {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      handleError(error, 'mediaApi.getById');
    }
    return data;
  },

  async create(media: InsertTables<'media'>): Promise<Media> {
    const { data, error } = await supabase
      .from('media')
      .insert(media)
      .select()
      .single();

    if (error) handleError(error, 'mediaApi.create');
    return data;
  },

  async update(id: string, updates: UpdateTables<'media'>): Promise<Media> {
    const { data, error } = await supabase
      .from('media')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) handleError(error, 'mediaApi.update');
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', id);

    if (error) handleError(error, 'mediaApi.delete');
  },

  async moderate(
    id: string,
    status: ModerationStatus,
    moderatorId: string
  ): Promise<Media> {
    return this.update(id, {
      moderation_status: status,
      moderated_at: new Date().toISOString(),
      moderated_by: moderatorId,
    });
  },

  async getPublicMedia(weddingId: string, limit = 50): Promise<Media[]> {
    const { data, error } = await supabase
      .from('public_media')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) handleError(error, 'mediaApi.getPublicMedia');
    return data || [];
  },
};

// ============================================
// GUESTBOOK API
// ============================================

export const guestbookApi = {
  async getByWeddingId(
    weddingId: string,
    options?: {
      moderation?: ModerationStatus | 'all';
      limit?: number;
    }
  ): Promise<GuestbookMessage[]> {
    let query = supabase
      .from('guestbook_messages')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false });

    if (options?.moderation && options.moderation !== 'all') {
      query = query.eq('moderation_status', options.moderation);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) handleError(error, 'guestbookApi.getByWeddingId');
    return data || [];
  },

  async create(message: InsertTables<'guestbook_messages'>): Promise<GuestbookMessage> {
    const { data, error } = await supabase
      .from('guestbook_messages')
      .insert(message)
      .select()
      .single();

    if (error) handleError(error, 'guestbookApi.create');
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('guestbook_messages')
      .delete()
      .eq('id', id);

    if (error) handleError(error, 'guestbookApi.delete');
  },

  async moderate(
    id: string,
    status: ModerationStatus,
    moderatorId: string
  ): Promise<GuestbookMessage> {
    const { data, error } = await supabase
      .from('guestbook_messages')
      .update({
        moderation_status: status,
        moderated_at: new Date().toISOString(),
        moderated_by: moderatorId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) handleError(error, 'guestbookApi.moderate');
    return data;
  },
};

// ============================================
// RSVP API
// ============================================

export const rsvpApi = {
  async getByWeddingId(weddingId: string): Promise<RSVP[]> {
    const { data, error } = await supabase
      .from('rsvp')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false });

    if (error) handleError(error, 'rsvpApi.getByWeddingId');
    return data || [];
  },

  async create(rsvp: InsertTables<'rsvp'>): Promise<RSVP> {
    const { data, error } = await supabase
      .from('rsvp')
      .insert(rsvp)
      .select()
      .single();

    if (error) handleError(error, 'rsvpApi.create');
    return data;
  },

  async update(id: string, updates: UpdateTables<'rsvp'>): Promise<RSVP> {
    const { data, error } = await supabase
      .from('rsvp')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) handleError(error, 'rsvpApi.update');
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('rsvp')
      .delete()
      .eq('id', id);

    if (error) handleError(error, 'rsvpApi.delete');
  },

  async getStats(weddingId: string): Promise<{
    yes: number;
    no: number;
    maybe: number;
    totalGuests: number;
  }> {
    const { data, error } = await supabase
      .from('wedding_stats')
      .select('rsvp_yes_count, rsvp_no_count, rsvp_maybe_count, total_guests')
      .eq('wedding_id', weddingId)
      .single();

    if (error) {
      return { yes: 0, no: 0, maybe: 0, totalGuests: 0 };
    }

    return {
      yes: data.rsvp_yes_count || 0,
      no: data.rsvp_no_count || 0,
      maybe: data.rsvp_maybe_count || 0,
      totalGuests: data.total_guests || 0,
    };
  },
};

// ============================================
// REACTIONS API
// ============================================

export const reactionsApi = {
  async getByMediaId(mediaId: string): Promise<Reaction[]> {
    const { data, error } = await supabase
      .from('reactions')
      .select('*')
      .eq('media_id', mediaId);

    if (error) handleError(error, 'reactionsApi.getByMediaId');
    return data || [];
  },

  async add(
    mediaId: string,
    emoji: ReactionEmoji,
    options: { userId?: string; guestIdentifier?: string }
  ): Promise<Reaction> {
    const { data, error } = await supabase
      .from('reactions')
      .insert({
        media_id: mediaId,
        emoji,
        user_id: options.userId || null,
        guest_identifier: options.guestIdentifier || null,
      })
      .select()
      .single();

    if (error) handleError(error, 'reactionsApi.add');
    return data;
  },

  async remove(
    mediaId: string,
    emoji: ReactionEmoji,
    options: { userId?: string; guestIdentifier?: string }
  ): Promise<void> {
    let query = supabase
      .from('reactions')
      .delete()
      .eq('media_id', mediaId)
      .eq('emoji', emoji);

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    } else if (options.guestIdentifier) {
      query = query.eq('guest_identifier', options.guestIdentifier);
    }

    const { error } = await query;
    if (error) handleError(error, 'reactionsApi.remove');
  },

  async getCountsByMediaId(mediaId: string): Promise<Record<ReactionEmoji, number>> {
    const { data, error } = await supabase
      .from('reactions')
      .select('emoji')
      .eq('media_id', mediaId);

    if (error) handleError(error, 'reactionsApi.getCountsByMediaId');

    const counts: Record<ReactionEmoji, number> = {
      '❤️': 0,
      '😍': 0,
      '😂': 0,
      '🥳': 0,
      '👏': 0,
      '🔥': 0,
    };

    data?.forEach((r) => {
      if (r.emoji in counts) {
        counts[r.emoji as ReactionEmoji]++;
      }
    });

    return counts;
  },
};

// ============================================
// FAVORITES API
// ============================================

export const favoritesApi = {
  async getByUser(
    options: { userId?: string; guestIdentifier?: string }
  ): Promise<string[]> {
    let query = supabase
      .from('favorites')
      .select('media_id');

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    } else if (options.guestIdentifier) {
      query = query.eq('guest_identifier', options.guestIdentifier);
    }

    const { data, error } = await query;
    if (error) handleError(error, 'favoritesApi.getByUser');
    return data?.map((f) => f.media_id) || [];
  },

  async add(
    mediaId: string,
    options: { userId?: string; guestIdentifier?: string }
  ): Promise<Favorite> {
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        media_id: mediaId,
        user_id: options.userId || null,
        guest_identifier: options.guestIdentifier || null,
      })
      .select()
      .single();

    if (error) handleError(error, 'favoritesApi.add');
    return data;
  },

  async remove(
    mediaId: string,
    options: { userId?: string; guestIdentifier?: string }
  ): Promise<void> {
    let query = supabase
      .from('favorites')
      .delete()
      .eq('media_id', mediaId);

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    } else if (options.guestIdentifier) {
      query = query.eq('guest_identifier', options.guestIdentifier);
    }

    const { error } = await query;
    if (error) handleError(error, 'favoritesApi.remove');
  },

  async toggle(
    mediaId: string,
    options: { userId?: string; guestIdentifier?: string }
  ): Promise<boolean> {
    const favorites = await this.getByUser(options);
    const isFavorite = favorites.includes(mediaId);

    if (isFavorite) {
      await this.remove(mediaId, options);
      return false;
    } else {
      await this.add(mediaId, options);
      return true;
    }
  },
};

// ============================================
// ALBUMS API
// ============================================

export const albumsApi = {
  async getByWeddingId(weddingId: string): Promise<Album[]> {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true });

    if (error) handleError(error, 'albumsApi.getByWeddingId');
    return data || [];
  },

  async create(album: InsertTables<'albums'>): Promise<Album> {
    const { data, error } = await supabase
      .from('albums')
      .insert(album)
      .select()
      .single();

    if (error) handleError(error, 'albumsApi.create');
    return data;
  },

  async update(id: string, updates: UpdateTables<'albums'>): Promise<Album> {
    const { data, error } = await supabase
      .from('albums')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) handleError(error, 'albumsApi.update');
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id);

    if (error) handleError(error, 'albumsApi.delete');
  },

  async addMedia(albumId: string, mediaId: string): Promise<void> {
    const { error } = await supabase
      .from('album_media')
      .insert({ album_id: albumId, media_id: mediaId });

    if (error) handleError(error, 'albumsApi.addMedia');
  },

  async removeMedia(albumId: string, mediaId: string): Promise<void> {
    const { error } = await supabase
      .from('album_media')
      .delete()
      .eq('album_id', albumId)
      .eq('media_id', mediaId);

    if (error) handleError(error, 'albumsApi.removeMedia');
  },

  async getMediaIds(albumId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('album_media')
      .select('media_id')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: true });

    if (error) handleError(error, 'albumsApi.getMediaIds');
    return data?.map((am) => am.media_id) || [];
  },
};

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export const realtime = {
  subscribeToMedia(
    weddingId: string,
    callback: (payload: { eventType: string; new: Media; old: Media }) => void
  ) {
    return supabase
      .channel(`wedding:${weddingId}:media`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media',
          filter: `wedding_id=eq.${weddingId}`,
        },
        (payload) => {
          callback({
            eventType: payload.eventType,
            new: payload.new as Media,
            old: payload.old as Media,
          });
        }
      )
      .subscribe();
  },

  subscribeToGuestbook(
    weddingId: string,
    callback: (payload: { eventType: string; new: GuestbookMessage; old: GuestbookMessage }) => void
  ) {
    return supabase
      .channel(`wedding:${weddingId}:guestbook`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guestbook_messages',
          filter: `wedding_id=eq.${weddingId}`,
        },
        (payload) => {
          callback({
            eventType: payload.eventType,
            new: payload.new as GuestbookMessage,
            old: payload.old as GuestbookMessage,
          });
        }
      )
      .subscribe();
  },

  unsubscribe(channel: ReturnType<typeof supabase.channel>) {
    return supabase.removeChannel(channel);
  },
};
