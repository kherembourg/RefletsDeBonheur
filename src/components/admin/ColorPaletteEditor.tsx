import { useState } from 'react';
import { Palette, RotateCcw, Check, AlertCircle, Info } from 'lucide-react';
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
    description: 'Boutons et liens',
    group: 'primary',
  },
  {
    key: 'primaryHover',
    label: 'Survol principal',
    description: 'Au survol des boutons',
    group: 'primary',
  },
  {
    key: 'accent',
    label: 'Accent',
    description: 'Highlights',
    group: 'primary',
  },
  // Background colors
  {
    key: 'background',
    label: 'Arrière-plan',
    description: 'Fond principal',
    group: 'background',
  },
  {
    key: 'backgroundAlt',
    label: 'Arrière-plan alt.',
    description: 'Sections alternées',
    group: 'background',
  },
  {
    key: 'card',
    label: 'Cartes',
    description: 'Fond des cartes',
    group: 'background',
  },
  // Text colors
  {
    key: 'text',
    label: 'Texte principal',
    description: 'Texte par défaut',
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
    description: 'Texte d\'aide',
    group: 'text',
  },
  // Other
  {
    key: 'border',
    label: 'Bordures',
    description: 'Couleur des bordures',
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
  const [expandedGroup, setExpandedGroup] = useState<string>('primary');
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
        [key]: 'Format invalide',
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

  const groups = [
    { id: 'primary', label: 'Couleurs principales', fields: groupedFields.primary },
    { id: 'background', label: 'Arrière-plans', fields: groupedFields.background },
    { id: 'text', label: 'Texte', fields: groupedFields.text },
    { id: 'other', label: 'Autres', fields: groupedFields.other },
  ];

  const hasCustomColors = Object.keys(editingPalette).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
            <Palette className="w-4 h-4 text-burgundy" />
            Palette de couleurs
          </h3>
          {hasCustomColors && (
            <button
              onClick={handleReset}
              className="text-xs text-charcoal/50 hover:text-burgundy transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
        <p className="text-xs text-charcoal/50">
          Personnalisez les couleurs du thème <span className="text-charcoal/70">{theme.name}</span>
        </p>
      </div>

      {/* Info Tip */}
      <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Laissez vide pour utiliser la couleur par défaut du thème.
        </p>
      </div>

      {/* Color Groups */}
      <div className="space-y-2">
        {groups.map((group) => {
          const isExpanded = expandedGroup === group.id;
          const customizedCount = group.fields.filter(f => isCustomized(f.key)).length;

          return (
            <div key={group.id} className="border border-charcoal/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedGroup(isExpanded ? '' : group.id)}
                className="w-full px-3 py-2.5 flex items-center justify-between bg-charcoal/5 hover:bg-charcoal/10 transition-colors"
              >
                <span className="text-sm font-medium text-charcoal">{group.label}</span>
                <div className="flex items-center gap-2">
                  {customizedCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-burgundy/10 text-burgundy rounded-full">
                      {customizedCount}
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 text-charcoal/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="p-3 space-y-3 bg-white">
                  {group.fields.map((field) => {
                    const effectiveColor = getEffectiveColor(field.key);
                    const customized = isCustomized(field.key);
                    const error = errors[field.key];

                    return (
                      <div key={field.key} className="flex items-center gap-3">
                        {/* Color Picker */}
                        <div className="relative">
                          <input
                            type="color"
                            value={effectiveColor}
                            onChange={(e) => handleColorChange(field.key, e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border-2 border-charcoal/10 hover:border-charcoal/20 transition-colors bg-transparent"
                            title={field.label}
                          />
                          {customized && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-burgundy rounded-full border-2 border-white" />
                          )}
                        </div>

                        {/* Label & Input */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <label className="text-xs font-medium text-charcoal/70">
                              {field.label}
                            </label>
                            {customized && <Check className="w-3 h-3 text-burgundy" />}
                          </div>
                          <input
                            type="text"
                            value={editingPalette[field.key] || ''}
                            onChange={(e) => handleColorChange(field.key, e.target.value)}
                            placeholder={effectiveColor}
                            className={`w-full px-2 py-1.5 rounded-md border text-xs font-mono transition-colors bg-white ${
                              error
                                ? 'border-red-300 text-red-600'
                                : customized
                                ? 'border-burgundy/50 text-charcoal'
                                : 'border-charcoal/10 text-charcoal/60 placeholder-charcoal/30'
                            }`}
                          />
                        </div>

                        {/* Reset button */}
                        {customized && (
                          <button
                            onClick={() => handleColorChange(field.key, '')}
                            className="p-1.5 rounded text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                            title="Réinitialiser"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
