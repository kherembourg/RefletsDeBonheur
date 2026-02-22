import type { WeddingCustomization } from '../../../lib/customization';
import type { Language } from '../../../i18n/translations';

export type EditorTab = 'theme' | 'colors' | 'content' | 'images';
export type DevicePreview = 'desktop' | 'tablet' | 'mobile';

export interface WebsiteEditorProps {
  weddingId: string;
  weddingSlug: string;
  demoMode?: boolean;
  lang?: Language;
  initialCustomization?: WeddingCustomization;
  onSave?: (customization: WeddingCustomization) => Promise<void>;
}

export type { SaveStatus } from '../../../hooks/useWebsiteEditor';
