import type { WeddingCustomization } from '../../../lib/customization';

export type EditorTab = 'theme' | 'colors' | 'content' | 'images';
export type DevicePreview = 'desktop' | 'tablet' | 'mobile';

export interface WebsiteEditorProps {
  weddingId: string;
  weddingSlug: string;
  demoMode?: boolean;
  initialCustomization?: WeddingCustomization;
  onSave?: (customization: WeddingCustomization) => Promise<void>;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
