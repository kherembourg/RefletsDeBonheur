import { useState, useCallback, memo } from 'react';
import { Type, RotateCcw, Check, Info } from 'lucide-react';
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
    placeholder: 'Nous sommes heureux de vous accueillir...',
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
    label: 'Titre galerie',
    placeholder: 'Galerie photos',
    type: 'text',
    maxLength: 100,
    section: 'gallery',
  },
  {
    key: 'galleryDescription',
    label: 'Description galerie',
    placeholder: 'Partagez vos plus beaux souvenirs...',
    type: 'textarea',
    maxLength: 300,
    section: 'gallery',
  },
  {
    key: 'galleryCallToAction',
    label: 'Bouton galerie',
    placeholder: 'Téléchargez vos photos',
    type: 'text',
    maxLength: 50,
    section: 'gallery',
  },
  // Guestbook section
  {
    key: 'guestbookTitle',
    label: 'Titre livre d\'or',
    placeholder: 'Livre d\'or',
    type: 'text',
    maxLength: 100,
    section: 'guestbook',
  },
  {
    key: 'guestbookDescription',
    label: 'Description livre d\'or',
    placeholder: 'Laissez-nous un message...',
    type: 'textarea',
    maxLength: 300,
    section: 'guestbook',
  },
  {
    key: 'guestbookCallToAction',
    label: 'Bouton livre d\'or',
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
    placeholder: 'Merci de confirmer votre présence...',
    type: 'textarea',
    maxLength: 300,
    section: 'rsvp',
  },
  // Footer
  {
    key: 'footerText',
    label: 'Texte pied de page',
    placeholder: 'Avec amour, Marie & Jean',
    type: 'text',
    maxLength: 200,
    section: 'footer',
  },
];

const SECTIONS = [
  { id: 'hero' as const, label: 'Hero', icon: '✨' },
  { id: 'welcome' as const, label: 'Bienvenue', icon: '👋' },
  { id: 'about' as const, label: 'À propos', icon: '💕' },
  { id: 'gallery' as const, label: 'Galerie', icon: '📸' },
  { id: 'guestbook' as const, label: 'Livre d\'or', icon: '✍️' },
  { id: 'rsvp' as const, label: 'RSVP', icon: '✉️' },
  { id: 'footer' as const, label: 'Footer', icon: '📄' },
];

// Memoized Section Tab component
interface SectionTabProps {
  section: typeof SECTIONS[number];
  isActive: boolean;
  customizedCount: number;
  onClick: (id: string) => void;
}

const SectionTab = memo(function SectionTab({
  section,
  isActive,
  customizedCount,
  onClick,
}: SectionTabProps) {
  const handleClick = useCallback(() => {
    onClick(section.id);
  }, [onClick, section.id]);

  return (
    <button
      onClick={handleClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
        isActive
          ? 'bg-burgundy text-white'
          : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
      }`}
    >
      <span>{section.icon}</span>
      {section.label}
      {customizedCount > 0 && (
        <span className={`px-1 py-0.5 rounded text-[10px] ${
          isActive
            ? 'bg-white/20'
            : 'bg-burgundy/30 text-burgundy'
        }`}>
          {customizedCount}
        </span>
      )}
    </button>
  );
});

// Memoized Field Editor component
interface FieldEditorProps {
  field: ContentField;
  value: string;
  onChange: (key: keyof CustomContent, value: string) => void;
}

const FieldEditor = memo(function FieldEditor({
  field,
  value,
  onChange,
}: FieldEditorProps) {
  const customized = !!value;
  const charCount = value?.length || 0;
  const maxLength = field.maxLength || 500;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(field.key, e.target.value);
  }, [onChange, field.key]);

  const handleReset = useCallback(() => {
    onChange(field.key, '');
  }, [onChange, field.key]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
          {field.label}
          {customized && <Check className="w-3 h-3 text-burgundy" />}
        </label>
        <span className={`text-[10px] ${charCount > maxLength * 0.9 ? 'text-amber-400' : 'text-gray-600'}`}>
          {charCount}/{maxLength}
        </span>
      </div>

      {field.type === 'text' ? (
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={field.placeholder}
          maxLength={maxLength}
          className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors bg-[#0f0f0f] placeholder-gray-600 ${
            customized
              ? 'border-burgundy/50 text-white'
              : 'border-[#2a2a2a] text-gray-300 hover:border-[#3a3a3a]'
          }`}
        />
      ) : (
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={field.placeholder}
          maxLength={maxLength}
          rows={3}
          className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors resize-none bg-[#0f0f0f] placeholder-gray-600 ${
            customized
              ? 'border-burgundy/50 text-white'
              : 'border-[#2a2a2a] text-gray-300 hover:border-[#3a3a3a]'
          }`}
        />
      )}

      {customized && (
        <button
          onClick={handleReset}
          className="text-[10px] text-gray-500 hover:text-burgundy transition-colors"
        >
          Réinitialiser ce champ
        </button>
      )}
    </div>
  );
});

export function ContentEditor({
  customContent,
  onChange,
  defaultValues = {},
}: ContentEditorProps) {
  const [editingContent, setEditingContent] = useState<CustomContent>(
    customContent || {}
  );
  const [activeSection, setActiveSection] = useState<string>('hero');

  // Handle content change - memoized for FieldEditor
  const handleContentChange = useCallback((key: keyof CustomContent, value: string) => {
    setEditingContent(prev => {
      const newContent = {
        ...prev,
        [key]: value || undefined,
      };

      // Remove undefined values
      Object.keys(newContent).forEach((k) => {
        if (newContent[k as keyof CustomContent] === undefined) {
          delete newContent[k as keyof CustomContent];
        }
      });

      // Call onChange with new content (use setTimeout to avoid setState during render)
      setTimeout(() => {
        onChange(Object.keys(newContent).length > 0 ? newContent : undefined);
      }, 0);

      return newContent;
    });
  }, [onChange]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    if (confirm('Réinitialiser tout le contenu personnalisé ?')) {
      setEditingContent({});
      onChange(undefined);
    }
  }, [onChange]);

  // Handle section click - memoized for SectionTab
  const handleSectionClick = useCallback((id: string) => {
    setActiveSection(id);
  }, []);

  // Check if field is customized
  const isCustomized = (key: keyof CustomContent): boolean => {
    return !!editingContent[key];
  };

  // Group fields by section
  const getFieldsBySection = (section: string) => {
    return CONTENT_FIELDS.filter((f) => f.section === section);
  };

  const hasCustomContent = Object.keys(editingContent).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Type className="w-4 h-4 text-burgundy" />
            Contenu textuel
          </h3>
          {hasCustomContent && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-burgundy transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Personnalisez les textes de votre site
        </p>
      </div>

      {/* Info Tip */}
      <div className="flex items-start gap-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="text-xs text-purple-300">
          Les champs vides utiliseront les textes par défaut.
        </p>
      </div>

      {/* Section Tabs - Scrollable */}
      <div className="relative">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {SECTIONS.map((section) => {
            const fields = getFieldsBySection(section.id);
            const customizedCount = fields.filter((f) => isCustomized(f.key)).length;

            return (
              <SectionTab
                key={section.id}
                section={section}
                isActive={activeSection === section.id}
                customizedCount={customizedCount}
                onClick={handleSectionClick}
              />
            );
          })}
        </div>
      </div>

      {/* Fields for Active Section */}
      <div className="space-y-3">
        {getFieldsBySection(activeSection).map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={editingContent[field.key] || ''}
            onChange={handleContentChange}
          />
        ))}
      </div>
    </div>
  );
}
