// Wedding data - supports both mock data and Supabase
// In production, this fetches from Supabase

import type { Wedding, RSVP, WeddingConfig } from './types';
import { DEFAULT_WEDDING_CONFIG } from './types';
import { supabase, isSupabaseConfigured } from './supabase/client';

// ============================================
// MOCK WEDDINGS
// ============================================

export const MOCK_WEDDINGS: Wedding[] = [
  {
    id: 'w-001',
    ownerId: 'u-001',
    slug: 'julie-thomas',
    name: 'Mariage de Julie & Thomas',
    date: '2026-06-15',
    pinCode: '1234',
    magicToken: 'abc123xyz',
    config: {
      ...DEFAULT_WEDDING_CONFIG,
      brideName: 'Julie',
      groomName: 'Thomas',
      weddingDate: '2026-06-15',
      welcomeTitle: 'Julie & Thomas',
      welcomeMessage: 'Nous sommes heureux de vous accueillir pour célébrer notre union. Merci de faire partie de ce moment magique avec nous.',
      venue: {
        name: 'Château de Fontainebleau',
        address: '77300 Fontainebleau, France',
        coordinates: { lat: 48.4026, lng: 2.7023 },
        mapUrl: 'https://maps.google.com/?q=Chateau+de+Fontainebleau',
        parkingInfo: 'Parking gratuit disponible sur place',
      },
      timeline: [
        { time: '14:00', title: 'Cérémonie', description: 'Cérémonie civile dans le jardin', icon: 'ceremony', location: 'Jardin principal' },
        { time: '15:30', title: 'Vin d\'honneur', description: 'Cocktail et photos', icon: 'cocktail', location: 'Terrasse' },
        { time: '18:00', title: 'Dîner', description: 'Dîner de gala', icon: 'dinner', location: 'Grande salle' },
        { time: '22:00', title: 'Soirée dansante', description: 'Ouverture du bal', icon: 'party', location: 'Grande salle' },
      ],
      theme: {
        id: 'classic',
        primaryColor: '#ae1725',
        secondaryColor: '#c92a38',
        fontFamily: 'playfair',
        heroImage: '/images/wedding-hero.jpg',
      },
      features: {
        rsvp: true,
        guestbook: true,
        photoGallery: true,
        liveWall: true,
        geoFencing: false,
        countdown: true,
        timeline: true,
      },
      moderation: {
        enabled: true,
        autoApprove: false,
        notifyOnUpload: true,
      },
      rsvpDeadline: '2026-05-01',
      rsvpMessage: 'Merci de confirmer votre présence avant le 1er mai 2026.',
      allowPlusOne: true,
      askDietaryRestrictions: true,
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'w-002',
    ownerId: 'u-002',
    slug: 'marie-pierre',
    name: 'Mariage de Marie & Pierre',
    date: '2026-09-21',
    pinCode: '5678',
    magicToken: 'def456uvw',
    config: {
      ...DEFAULT_WEDDING_CONFIG,
      brideName: 'Marie',
      groomName: 'Pierre',
      weddingDate: '2026-09-21',
      welcomeTitle: 'Marie & Pierre',
      welcomeMessage: 'L\'amour est notre plus belle aventure. Venez la célébrer avec nous !',
      venue: {
        name: 'Domaine des Roses',
        address: '13100 Aix-en-Provence, France',
        coordinates: { lat: 43.5297, lng: 5.4474 },
      },
      timeline: [
        { time: '15:00', title: 'Cérémonie laïque', icon: 'ceremony' },
        { time: '16:30', title: 'Cocktail', icon: 'cocktail' },
        { time: '19:00', title: 'Dîner', icon: 'dinner' },
        { time: '23:00', title: 'Fête', icon: 'party' },
      ],
      theme: {
        id: 'luxe',
        primaryColor: '#2C2C2C',
        secondaryColor: '#D4AF37',
        fontFamily: 'playfair',
      },
      features: {
        rsvp: true,
        guestbook: true,
        photoGallery: true,
        liveWall: false,
        geoFencing: false,
        countdown: true,
        timeline: true,
      },
      moderation: {
        enabled: false,
        autoApprove: true,
        notifyOnUpload: false,
      },
    },
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
];

// ============================================
// MOCK RSVP RESPONSES
// ============================================

export const MOCK_RSVPS: RSVP[] = [
  {
    id: 'r-001',
    weddingId: 'w-001',
    name: 'Sophie Martin',
    email: 'sophie@example.com',
    attendance: 'yes',
    plusOne: true,
    plusOneName: 'Marc Dupont',
    dietaryRestrictions: 'Végétarienne',
    message: 'Hâte de célébrer avec vous !',
    createdAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'r-002',
    weddingId: 'w-001',
    name: 'Michel Bernard',
    email: 'michel@example.com',
    attendance: 'yes',
    plusOne: false,
    dietaryRestrictions: '',
    message: 'Je serai là avec plaisir !',
    createdAt: '2026-03-16T14:30:00Z',
  },
  {
    id: 'r-003',
    weddingId: 'w-001',
    name: 'Claire Dubois',
    email: 'claire@example.com',
    attendance: 'no',
    plusOne: false,
    message: 'Désolée, je suis en voyage à cette date. Je pense fort à vous !',
    createdAt: '2026-03-17T09:00:00Z',
  },
  {
    id: 'r-004',
    weddingId: 'w-001',
    name: 'Jean-Pierre Leroy',
    email: 'jp@example.com',
    attendance: 'maybe',
    plusOne: true,
    plusOneName: 'Isabelle Leroy',
    dietaryRestrictions: 'Sans gluten',
    message: 'Je confirme dès que possible.',
    createdAt: '2026-03-18T16:45:00Z',
  },
];

// ============================================
// API FUNCTIONS (Supabase + Mock fallback)
// ============================================

/**
 * Get wedding by slug - tries Supabase first, falls back to mock data
 */
export async function getWeddingBySlugAsync(slug: string): Promise<Wedding | undefined> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data: wedding, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!error && wedding) {
        // Convert Supabase wedding to Wedding format
        return supabaseWeddingToWedding(wedding);
      }
    } catch (e) {
      console.error('Supabase fetch error:', e);
    }
  }

  // Fallback to mock data
  return MOCK_WEDDINGS.find(w => w.slug === slug);
}

/**
 * Synchronous version for backward compatibility
 */
export function getWeddingBySlug(slug: string): Wedding | undefined {
  return MOCK_WEDDINGS.find(w => w.slug === slug);
}

export function getWeddingById(id: string): Wedding | undefined {
  return MOCK_WEDDINGS.find(w => w.id === id);
}

/**
 * Convert Supabase client record to Wedding format
 */
function supabaseWeddingToWedding(wedding: any): Wedding {
  return {
    id: wedding.id,
    ownerId: wedding.owner_id,
    slug: wedding.slug,
    name: wedding.name || `Mariage de ${wedding.bride_name} & ${wedding.groom_name}`.trim(),
    date: wedding.wedding_date || '',
    pinCode: wedding.pin_code || '',
    magicToken: wedding.magic_token,
    config: {
      ...DEFAULT_WEDDING_CONFIG,
      brideName: wedding.bride_name || '',
      groomName: wedding.groom_name || '',
      weddingDate: wedding.wedding_date || '',
      welcomeTitle: `${wedding.bride_name} & ${wedding.groom_name}`.trim(),
      welcomeMessage: `Bienvenue sur notre espace de partage. Nous sommes heureux de vous accueillir pour célébrer notre union.`,
      theme: {
        id: wedding.config?.theme?.name || 'classic',
        primaryColor: wedding.config?.theme?.primaryColor || '#ae1725',
        secondaryColor: wedding.config?.theme?.secondaryColor || '#c92a38',
        fontFamily: wedding.config?.theme?.fontFamily || 'playfair',
      },
      features: {
        rsvp: true,
        guestbook: wedding.config?.features?.guestbook ?? true,
        photoGallery: wedding.config?.features?.gallery ?? true,
        liveWall: wedding.config?.features?.liveWall ?? false,
        geoFencing: wedding.config?.features?.geoFencing ?? false,
        countdown: true,
        timeline: false,
      },
      moderation: {
        enabled: wedding.config?.moderation?.enabled ?? true,
        autoApprove: wedding.config?.moderation?.autoApprove ?? true,
        notifyOnUpload: true,
      },
    },
    createdAt: wedding.created_at,
    updatedAt: wedding.updated_at,
  };
}

export function validatePinCode(slug: string, pin: string): boolean {
  const wedding = getWeddingBySlug(slug);
  return wedding?.pinCode === pin;
}

export function validateMagicToken(slug: string, token: string): boolean {
  const wedding = getWeddingBySlug(slug);
  return wedding?.magicToken === token;
}

export function getRSVPsByWeddingId(weddingId: string): RSVP[] {
  return MOCK_RSVPS.filter(r => r.weddingId === weddingId);
}

export function getRSVPStats(weddingId: string) {
  const rsvps = getRSVPsByWeddingId(weddingId);
  const yes = rsvps.filter(r => r.attendance === 'yes');
  const no = rsvps.filter(r => r.attendance === 'no');
  const maybe = rsvps.filter(r => r.attendance === 'maybe');

  const totalGuests = yes.reduce((sum, r) => sum + 1 + (r.plusOne ? 1 : 0), 0);

  return {
    total: rsvps.length,
    confirmed: yes.length,
    declined: no.length,
    pending: maybe.length,
    totalGuests,
    plusOnes: yes.filter(r => r.plusOne).length,
  };
}

// ============================================
// DATE HELPERS
// ============================================

export function getDaysUntilWedding(weddingDate: string): number {
  const wedding = new Date(weddingDate);
  const today = new Date();
  const diffTime = wedding.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatWeddingDate(dateString: string, locale: string = 'fr-FR'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
