import { useState } from 'react';
import { Palette, RotateCcw, Check, AlertCircle } from 'lucide-react';
import type { CustomPalette } from '../../lib/customization';
import { isValidHexColor } from '../../lib/customization';
import { getTheme, type ThemeId } from '../../lib/themes';

interface ColorPaletteEditorProps {
  themeId: ThemeId;
  customPalette?: CustomPalette;
  onChange: (palette: CustomPalette | undefined) => void;
}

interface ColorField {
  key: keyof CustomPalette;
  label: string;
  description: string;
  group: 'primary' | 'background' | 'text' | 'other';
}

const COLOR_FIELDS: ColorField[] = [
  // Primary colors
  {
    key: 'primary',
    label: 'Couleur principale',
    description: 'Utilisée pour les boutons et liens',
    group: 'primary',
  },
  {
    key: 'primaryHover',
    label: 'Survol principal',
    description: 'Couleur au survol des boutons',
    group: 'primary',
  },
  {
    key: 'accent',
    label: 'Couleur d\'accent',
    description: 'Éléments décoratifs et highlights',
    group: 'primary',
  },
  // Background colors
  {
    key: 'background',
    label: 'Arrière-plan',
    description: 'Fond principal de la page',
    group: 'background',
  },
  {
    key: 'backgroundAlt',
    label: 'Arrière-plan alternatif',
    description: 'Sections alternées',
    group: 'background',
  },
  {
    key: 'card',
    label: 'Cartes',
    description: 'Fond des cartes et panneaux',
    group: 'background',
  },
  // Text colors
  {
    key: 'text',
    label: 'Texte principal',
    description: 'Couleur du texte par défaut',
    group: 'text',
  },
  {
    key: 'textLight',
    label: 'Texte clair',
    description: 'Texte secondaire',
    group: 'text',
  },
  {
    key: 'textMuted',
    label: 'Texte atténué',
    description: 'Texte désactivé ou d\'aide',
    group: 'text',
  },
  // Other
  {
    key: 'border',
    label: 'Bordures',
    description: 'Couleur des bordures',
    group: 'other',
  },
  {
    key: 'glass',
    label: 'Effet verre',
    description: 'Effet glassmorphism',
    group: 'other',
  },
];

export function ColorPaletteEditor({
  themeId,
  customPalette,
  onChange,
}: ColorPaletteEditorProps) {
  const [editingPalette, setEditingPalette] = useState<CustomPalette>(
    customPalette || {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const theme = getTheme(themeId);

  // Handle color change
  const handleColorChange = (key: keyof CustomPalette, value: string) => {
    const newPalette = {
      ...editingPalette,
      [key]: value || undefined,
    };

    // Remove undefined values
    Object.keys(newPalette).forEach((k) => {
      if (newPalette[k as keyof CustomPalette] === undefined) {
        delete newPalette[k as keyof CustomPalette];
      }
    });

    setEditingPalette(newPalette);

    // Validate
    if (value && !isValidHexColor(value) && !value.startsWith('rgba')) {
      setErrors((prev) => ({
        ...prev,
        [key]: 'Format de couleur invalide (utilisez #RRGGBB)',
      }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }

    // Update parent
    onChange(Object.keys(newPalette).length > 0 ? newPalette : undefined);
  };

  // Reset to theme defaults
  const handleReset = () => {
    setEditingPalette({});
    setErrors({});
    onChange(undefined);
  };

  // Get effective color (custom or theme default)
  const getEffectiveColor = (key: keyof CustomPalette): string => {
    return editingPalette[key] || theme.colors[key] || '#000000';
  };

  // Check if color is customized
  const isCustomized = (key: keyof CustomPalette): boolean => {
    return !!editingPalette[key];
  };

  // Group fields
  const groupedFields = {
    primary: COLOR_FIELDS.filter((f) => f.group === 'primary'),
    background: COLOR_FIELDS.filter((f) => f.group === 'background'),
    text: COLOR_FIELDS.filter((f) => f.group === 'text'),
    other: COLOR_FIELDS.filter((f) => f.group === 'other'),
  };

  const hasCustomColors = Object.keys(editingPalette).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-deep-charcoal flex items-center gap-2">
            <Palette className="w-5 h-5 text-burgundy" />
            Palette de couleurs
          </h3>
          {hasCustomColors && (
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
          Personnalisez les couleurs du thème <strong>{theme.name}</strong>
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Astuce</p>
          <p>
            Laissez un champ vide pour utiliser la couleur par défaut du thème.
            Les modifications sont appliquées en temps réel dans l'aperçu.
          </p>
        </div>
      </div>

      {/* Color Groups */}
      <div className="space-y-6">
        {/* Primary Colors */}
        <ColorGroup
          title="Couleurs principales"
          fields={groupedFields.primary}
          editingPalette={editingPalette}
          errors={errors}
          onColorChange={handleColorChange}
          getEffectiveColor={getEffectiveColor}
          isCustomized={isCustomized}
        />

        {/* Background Colors */}
        <ColorGroup
          title="Arrière-plans"
          fields={groupedFields.background}
          editingPalette={editingPalette}
          errors={errors}
          onColorChange={handleColorChange}
          getEffectiveColor={getEffectiveColor}
          isCustomized={isCustomized}
        />

        {/* Text Colors */}
        <ColorGroup
          title="Couleurs de texte"
          fields={groupedFields.text}
          editingPalette={editingPalette}
          errors={errors}
          onColorChange={handleColorChange}
          getEffectiveColor={getEffectiveColor}
          isCustomized={isCustomized}
        />

        {/* Other Colors */}
        <ColorGroup
          title="Autres"
          fields={groupedFields.other}
          editingPalette={editingPalette}
          errors={errors}
          onColorChange={handleColorChange}
          getEffectiveColor={getEffectiveColor}
          isCustomized={isCustomized}
        />
      </div>
    </div>
  );
}

// ============================================
// COLOR GROUP COMPONENT
// ============================================

interface ColorGroupProps {
  title: string;
  fields: ColorField[];
  editingPalette: CustomPalette;
  errors: Record<string, string>;
  onColorChange: (key: keyof CustomPalette, value: string) => void;
  getEffectiveColor: (key: keyof CustomPalette) => string;
  isCustomized: (key: keyof CustomPalette) => boolean;
}

function ColorGroup({
  title,
  fields,
  editingPalette,
  errors,
  onColorChange,
  getEffectiveColor,
  isCustomized,
}: ColorGroupProps) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-deep-charcoal mb-3">{title}</h4>
      <div className="space-y-3">
        {fields.map((field) => {
          const effectiveColor = getEffectiveColor(field.key);
          const customized = isCustomized(field.key);
          const error = errors[field.key];

          return (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-deep-charcoal flex items-center gap-2">
                  {field.label}
                  {customized && (
                    <Check className="w-3.5 h-3.5 text-green-600" title="Personnalisé" />
                  )}
                </label>
                <button
                  onClick={() => onColorChange(field.key, '')}
                  className="text-xs text-warm-taupe hover:text-burgundy transition-colors"
                  disabled={!customized}
                >
                  Par défaut
                </button>
              </div>

              <div className="flex gap-3">
                {/* Color Picker */}
                <div className="relative">
                  <input
                    type="color"
                    value={effectiveColor}
                    onChange={(e) => onColorChange(field.key, e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-silver-mist/30 hover:border-burgundy transition-colors"
                    title={field.label}
                  />
                  {customized && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Text Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={editingPalette[field.key] || ''}
                    onChange={(e) => onColorChange(field.key, e.target.value)}
                    placeholder={effectiveColor}
                    className={`w-full px-4 py-2.5 rounded-lg border font-mono text-sm transition-colors ${
                      error
                        ? 'border-red-300 bg-red-50 text-red-900'
                        : customized
                        ? 'border-green-300 bg-green-50 text-deep-charcoal'
                        : 'border-silver-mist/30 bg-white text-deep-charcoal hover:border-silver-mist'
                    }`}
                  />
                  <p className="text-xs text-warm-taupe mt-1">{field.description}</p>
                  {error && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
