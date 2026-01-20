import { useState } from 'react';
import { Type, RotateCcw, Check, AlertCircle, Sparkles } from 'lucide-react';
import type { CustomContent } from '../../lib/customization';

interface ContentEditorProps {
  customContent?: CustomContent;
  onChange: (content: CustomContent | undefined) => void;
  defaultValues?: Partial<CustomContent>;
}

interface ContentField {
  key: keyof CustomContent;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea';
  maxLength?: number;
  section: 'hero' | 'welcome' | 'about' | 'gallery' | 'guestbook' | 'rsvp' | 'footer';
}

const CONTENT_FIELDS: ContentField[] = [
  // Hero section
  {
    key: 'heroTitle',
    label: 'Titre principal',
    placeholder: 'Marie & Jean',
    type: 'text',
    maxLength: 100,
    section: 'hero',
  },
  {
    key: 'heroSubtitle',
    label: 'Sous-titre',
    placeholder: 'Nous nous marions !',
    type: 'text',
    maxLength: 200,
    section: 'hero',
  },
  {
    key: 'heroDate',
    label: 'Date affichée',
    placeholder: '15 juin 2026',
    type: 'text',
    maxLength: 100,
    section: 'hero',
  },
  // Welcome section
  {
    key: 'welcomeTitle',
    label: 'Titre de bienvenue',
    placeholder: 'Bienvenue',
    type: 'text',
    maxLength: 100,
    section: 'welcome',
  },
  {
    key: 'welcomeMessage',
    label: 'Message de bienvenue',
    placeholder: 'Nous sommes heureux de vous accueillir pour célébrer notre union.',
    type: 'textarea',
    maxLength: 500,
    section: 'welcome',
  },
  // About us section
  {
    key: 'aboutUsTitle',
    label: 'Titre À propos',
    placeholder: 'Notre histoire',
    type: 'text',
    maxLength: 100,
    section: 'about',
  },
  {
    key: 'aboutUsText',
    label: 'Texte À propos',
    placeholder: 'Partagez votre histoire d\'amour...',
    type: 'textarea',
    maxLength: 1000,
    section: 'about',
  },
  // Gallery section
  {
    key: 'galleryTitle',
    label: 'Titre de la galerie',
    placeholder: 'Galerie photos',
    type: 'text',
    maxLength: 100,
    section: 'gallery',
  },
  {
    key: 'galleryDescription',
    label: 'Description de la galerie',
    placeholder: 'Partagez vos plus beaux souvenirs de notre journée spéciale',
    type: 'textarea',
    maxLength: 300,
    section: 'gallery',
  },
  {
    key: 'galleryCallToAction',
    label: 'Appel à l\'action galerie',
    placeholder: 'Téléchargez vos photos',
    type: 'text',
    maxLength: 50,
    section: 'gallery',
  },
  // Guestbook section
  {
    key: 'guestbookTitle',
    label: 'Titre du livre d\'or',
    placeholder: 'Livre d\'or',
    type: 'text',
    maxLength: 100,
    section: 'guestbook',
  },
  {
    key: 'guestbookDescription',
    label: 'Description du livre d\'or',
    placeholder: 'Laissez-nous un message pour immortaliser ce jour',
    type: 'textarea',
    maxLength: 300,
    section: 'guestbook',
  },
  {
    key: 'guestbookCallToAction',
    label: 'Appel à l\'action livre d\'or',
    placeholder: 'Écrire un message',
    type: 'text',
    maxLength: 50,
    section: 'guestbook',
  },
  // RSVP section
  {
    key: 'rsvpTitle',
    label: 'Titre RSVP',
    placeholder: 'Confirmez votre présence',
    type: 'text',
    maxLength: 100,
    section: 'rsvp',
  },
  {
    key: 'rsvpDescription',
    label: 'Description RSVP',
    placeholder: 'Merci de confirmer votre présence avant le...',
    type: 'textarea',
    maxLength: 300,
    section: 'rsvp',
  },
  // Footer
  {
    key: 'footerText',
    label: 'Texte du pied de page',
    placeholder: 'Avec amour, Marie & Jean',
    type: 'text',
    maxLength: 200,
    section: 'footer',
  },
];

const SECTIONS = [
  { id: 'hero' as const, label: 'Section Hero', icon: '✨' },
  { id: 'welcome' as const, label: 'Bienvenue', icon: '👋' },
  { id: 'about' as const, label: 'À propos', icon: '💕' },
  { id: 'gallery' as const, label: 'Galerie', icon: '📸' },
  { id: 'guestbook' as const, label: 'Livre d\'or', icon: '✍️' },
  { id: 'rsvp' as const, label: 'RSVP', icon: '✉️' },
  { id: 'footer' as const, label: 'Pied de page', icon: '📄' },
];

export function ContentEditor({
  customContent,
  onChange,
  defaultValues = {},
}: ContentEditorProps) {
  const [editingContent, setEditingContent] = useState<CustomContent>(
    customContent || {}
  );
  const [activeSection, setActiveSection] = useState<string>('hero');

  // Handle content change
  const handleContentChange = (key: keyof CustomContent, value: string) => {
    const newContent = {
      ...editingContent,
      [key]: value || undefined,
    };

    // Remove undefined values
    Object.keys(newContent).forEach((k) => {
      if (newContent[k as keyof CustomContent] === undefined) {
        delete newContent[k as keyof CustomContent];
      }
    });

    setEditingContent(newContent);
    onChange(Object.keys(newContent).length > 0 ? newContent : undefined);
  };

  // Reset to defaults
  const handleReset = () => {
    if (confirm('Réinitialiser tout le contenu personnalisé ?')) {
      setEditingContent({});
      onChange(undefined);
    }
  };

  // Check if field is customized
  const isCustomized = (key: keyof CustomContent): boolean => {
    return !!editingContent[key];
  };

  // Get character count
  const getCharCount = (key: keyof CustomContent): number => {
    return editingContent[key]?.length || 0;
  };

  // Group fields by section
  const getFieldsBySection = (section: string) => {
    return CONTENT_FIELDS.filter((f) => f.section === section);
  };

  const hasCustomContent = Object.keys(editingContent).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-deep-charcoal flex items-center gap-2">
            <Type className="w-5 h-5 text-burgundy" />
            Contenu textuel
          </h3>
          {hasCustomContent && (
            <button
              onClick={handleReset}
              className="text-sm text-warm-taupe hover:text-burgundy transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>
        <p className="text-sm text-warm-taupe">
          Personnalisez les textes de votre site de mariage
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-900">
          <p className="font-medium mb-1">Conseil</p>
          <p>
            Les champs vides utiliseront les textes par défaut. Personnalisez
            uniquement ce que vous souhaitez modifier.
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="border-b border-silver-mist/30">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {SECTIONS.map((section) => {
            const fields = getFieldsBySection(section.id);
            const customizedCount = fields.filter((f) =>
              isCustomized(f.key)
            ).length;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeSection === section.id
                    ? 'bg-burgundy text-white shadow-md'
                    : 'bg-silver-mist/20 text-warm-taupe hover:bg-silver-mist/40'
                }`}
              >
                <span>{section.icon}</span>
                {section.label}
                {customizedCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                    {customizedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fields for Active Section */}
      <div className="space-y-4">
        {getFieldsBySection(activeSection).map((field) => {
          const customized = isCustomized(field.key);
          const charCount = getCharCount(field.key);
          const maxLength = field.maxLength || 500;

          return (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-deep-charcoal flex items-center gap-2">
                  {field.label}
                  {customized && (
                    <span title="Personnalisé">
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-warm-taupe">
                    {charCount}/{maxLength}
                  </span>
                  {customized && (
                    <button
                      onClick={() => handleContentChange(field.key, '')}
                      className="text-xs text-warm-taupe hover:text-burgundy transition-colors"
                    >
                      Par défaut
                    </button>
                  )}
                </div>
              </div>

              {field.type === 'text' ? (
                <input
                  type="text"
                  value={editingContent[field.key] || ''}
                  onChange={(e) => handleContentChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={maxLength}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                    customized
                      ? 'border-green-300 bg-green-50 text-deep-charcoal'
                      : 'border-silver-mist/30 bg-white text-deep-charcoal hover:border-silver-mist'
                  }`}
                />
              ) : (
                <textarea
                  value={editingContent[field.key] || ''}
                  onChange={(e) => handleContentChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={maxLength}
                  rows={4}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors resize-none ${
                    customized
                      ? 'border-green-300 bg-green-50 text-deep-charcoal'
                      : 'border-silver-mist/30 bg-white text-deep-charcoal hover:border-silver-mist'
                  }`}
                />
              )}

              {defaultValues[field.key] && (
                <p className="text-xs text-warm-taupe">
                  Défaut : {defaultValues[field.key]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
