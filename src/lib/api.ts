import type { MediaItem, GuestbookMessage } from './mockData';
import { AUTH_CODES } from './mockData';
import { fileToDataURL, compressImage } from './demoStorage';

// Utility to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate random ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Mock API responses
export const mockAPI = {
  // Authentication
  validateCode: async (code: string): Promise<{ valid: boolean; role?: 'guest' | 'admin'; error?: string }> => {
    await delay(300);
    if (code === AUTH_CODES.ADMIN) {
      return { valid: true, role: 'admin' };
    }
    if (code === AUTH_CODES.GUEST) {
      return { valid: true, role: 'guest' };
    }
    return { valid: false, error: 'Code invalide' };
  },

  // Media operations
  uploadMedia: async (files: { file: File; caption?: string; author: string }[]): Promise<MediaItem[]> => {
    await delay(2000); // Simulate upload time

    const results: MediaItem[] = [];
    for (const { file, caption, author } of files) {
      // Convert to data URL for persistence
      let dataUrl = await fileToDataURL(file);

      // Compress images to save localStorage space
      if (file.type.startsWith('image')) {
        dataUrl = await compressImage(dataUrl);
      }

      results.push({
        id: generateId(),
        url: dataUrl,
        type: file.type.startsWith('video') ? 'video' as const : 'image' as const,
        author,
        caption,
        createdAt: new Date(),
      });
    }

    return results;
  },

  // Upload media with progress tracking
  uploadMediaWithProgress: async (
    files: { file: File; caption?: string; author: string }[],
    onProgress: (fileIndex: number, progress: number) => void
  ): Promise<MediaItem[]> => {
    const results: MediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const { file, caption, author } = files[i];

      // Start progress
      onProgress(i, 10);

      // Convert to data URL for persistence
      let dataUrl = await fileToDataURL(file);
      onProgress(i, 40);

      // Compress images to save localStorage space
      if (file.type.startsWith('image')) {
        dataUrl = await compressImage(dataUrl);
      }
      onProgress(i, 70);

      // Simulate some network delay
      await delay(300);
      onProgress(i, 90);

      // Create the media item with data URL (persists in localStorage)
      const item: MediaItem = {
        id: generateId(),
        url: dataUrl,
        type: file.type.startsWith('video') ? 'video' as const : 'image' as const,
        author,
        caption,
        createdAt: new Date(),
      };

      results.push(item);
      onProgress(i, 100); // Mark as complete
    }

    return results;
  },

  deleteMedia: async (id: string): Promise<void> => {
    await delay(500);
    // In real app, this would call the API to delete
  },

  // AI caption generation
  generateCaption: async (imageBase64: string): Promise<string> => {
    await delay(1500); // Simulate AI processing

    const captions = [
      'Un moment de joie partagée',
      'Les rires résonnent encore',
      'L\'amour illumine cette scène',
      'Des souvenirs gravés à jamais',
      'La magie d\'un instant précieux',
      'Une célébration inoubliable',
      'L\'élégance de ce moment',
      'Les détails qui rendent tout parfait',
      'Un instant d\'émotion pure',
      'La beauté de cet instant',
    ];

    return captions[Math.floor(Math.random() * captions.length)];
  },

  // Guestbook operations
  submitMessage: async (data: { author: string; text: string }): Promise<GuestbookMessage> => {
    await delay(500);

    return {
      id: generateId(),
      ...data,
      createdAt: new Date(),
    };
  },

  deleteMessage: async (id: string): Promise<void> => {
    await delay(500);
    // In real app, this would call the API to delete
  },

  // AI guestbook message generation
  generateGuestbookMessage: async (
    relation: 'Amis' | 'Famille' | 'Collègue',
    tone: 'Joyeux' | 'Émouvant' | 'Solennel' | 'Poétique'
  ): Promise<string> => {
    await delay(2000); // Simulate AI processing

    const templates: Record<string, string[]> = {
      'Amis-Joyeux': [
        'Félicitations à vous deux ! Que votre amour grandisse chaque jour et que la vie vous offre mille bonheurs.',
        'Quel bonheur de célébrer votre union ! Vous êtes faits l\'un pour l\'autre. Longue vie aux mariés !',
        'Trop heureux pour vous ! Que cette journée soit le début d\'une aventure incroyable. Profitez à fond !',
      ],
      'Amis-Émouvant': [
        'C\'est avec les larmes aux yeux que nous célébrons votre amour. Vous méritez tout le bonheur du monde.',
        'Voir deux personnes aussi merveilleuses s\'unir est un privilège. Nos cœurs sont remplis de joie pour vous.',
        'Votre histoire d\'amour nous touche profondément. Puisse votre union être bénie et remplie de tendresse.',
      ],
      'Famille-Joyeux': [
        'Nous sommes si fiers de vous voir unis ! Que votre vie commune soit remplie de rires et de bonheur.',
        'Quelle joie de voir notre famille s\'agrandir ! Bienvenue dans l\'aventure du mariage. Profitez de chaque instant !',
        'Félicitations les amoureux ! Que chaque jour vous apporte son lot de surprises et de sourires.',
      ],
      'Famille-Émouvant': [
        'Nous sommes si fiers de vous. Que cette journée soit le début d\'une merveilleuse aventure à deux.',
        'Les larmes de joie coulent en ce jour magnifique. Vous êtes un exemple d\'amour pour nous tous.',
        'Voir nos enfants si heureux est la plus belle des récompenses. Tout notre amour vous accompagne.',
      ],
      'Collègue-Joyeux': [
        'Félicitations pour cette belle union ! Que votre vie professionnelle et personnelle soient tout aussi réussies.',
        'Quel plaisir de partager ce moment avec vous ! Nos meilleurs vœux pour cette nouvelle vie à deux.',
        'Toute l\'équipe vous félicite ! Que le bonheur soit au rendez-vous chaque jour.',
      ],
      'Collègue-Solennel': [
        'Nous vous adressons nos plus sincères félicitations en ce jour important. Que votre union soit solide et durable.',
        'C\'est avec grand plaisir que nous célébrons votre mariage. Tous nos vœux de bonheur et de prospérité.',
        'Nous vous souhaitons une vie commune harmonieuse et épanouissante. Toutes nos félicitations.',
      ],
    };

    // Try specific combination first
    const key = `${relation}-${tone}`;
    let options = templates[key];

    // Fallback to generic messages
    if (!options) {
      options = [
        'Félicitations pour votre mariage ! Que votre amour grandisse chaque jour.',
        'Tous nos vœux de bonheur pour cette nouvelle vie à deux.',
        'Puisse votre union être remplie d\'amour, de joie et de complicité.',
      ];
    }

    return options[Math.floor(Math.random() * options.length)];
  },

  // Admin operations
  toggleUploads: async (enabled: boolean): Promise<void> => {
    await delay(300);
    // In real app, this would update the database
  },

  exportBackup: async (): Promise<Blob> => {
    await delay(2000); // Simulate ZIP creation

    // In real app, this would fetch all files from R2 and create a ZIP
    // For mock, return empty blob
    const mockZipContent = 'Mock backup data';
    return new Blob([mockZipContent], { type: 'application/zip' });
  },
};

// Helper to trigger download
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
