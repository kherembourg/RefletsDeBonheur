import { useState } from 'react';
import { Check, Palette, Eye } from 'lucide-react';
import { themeList, type Theme, type ThemeId } from '../../lib/themes';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
  weddingSlug?: string;
}

export function ThemeSelector({ currentTheme, onThemeChange, weddingSlug }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(currentTheme);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = (themeId: ThemeId) => {
    setSelectedTheme(themeId);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call (in production, this would update Supabase)
    await new Promise(resolve => setTimeout(resolve, 500));
    onThemeChange(selectedTheme);
    setIsSaving(false);
  };

  const hasChanges = selectedTheme !== currentTheme;

  return (
    <div className="bg-white dark:bg-deep-charcoal/50 rounded-xl p-6 border border-silver-mist/20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#ae1725]/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-[#ae1725]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-deep-charcoal dark:text-ivory">
            Thème du site
          </h3>
          <p className="text-sm text-warm-taupe dark:text-silver-mist">
            Choisissez l'apparence de votre site de mariage
          </p>
        </div>
      </div>

      {/* Theme Cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {themeList.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={selectedTheme === theme.id}
            isCurrent={currentTheme === theme.id}
            onSelect={() => handleSelect(theme.id)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-silver-mist/20">
        {/* Preview Link */}
        {weddingSlug && (
          <a
            href={`/${weddingSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-warm-taupe hover:text-[#ae1725] transition-colors"
          >
            <Eye className="w-4 h-4" />
            Voir le site
          </a>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            hasChanges
              ? 'bg-[#ae1725] text-white hover:bg-[#c92a38]'
              : 'bg-silver-mist/30 text-warm-taupe cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enregistrement...
            </span>
          ) : (
            'Enregistrer'
          )}
        </button>
      </div>
    </div>
  );
}

// Theme Card Component
interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}

function ThemeCard({ theme, isSelected, isCurrent, onSelect }: ThemeCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
        isSelected
          ? 'border-[#ae1725] bg-[#ae1725]/5'
          : 'border-silver-mist/30 hover:border-silver-mist'
      }`}
    >
      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#ae1725] flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Current Badge */}
      {isCurrent && !isSelected && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-silver-mist/30 text-xs text-warm-taupe">
          Actuel
        </div>
      )}

      {/* Theme Preview */}
      <div
        className="h-24 rounded-lg mb-3 overflow-hidden relative"
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Mini preview of theme */}
        <div className="absolute inset-0 p-3">
          {/* Header simulation */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="h-2 w-16 rounded"
              style={{ backgroundColor: theme.colors.accent }}
            />
            {theme.layout.navStyle === 'floating' && (
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 h-3 w-20 rounded-full"
                style={{ backgroundColor: theme.colors.glass, border: `1px solid ${theme.colors.border}` }}
              />
            )}
          </div>
          {/* Content simulation */}
          <div className="space-y-1">
            <div
              className="h-3 w-20 rounded mx-auto"
              style={{ backgroundColor: theme.colors.text, opacity: 0.2 }}
            />
            <div
              className="h-2 w-14 rounded mx-auto"
              style={{ backgroundColor: theme.colors.accent, opacity: 0.5 }}
            />
          </div>
          {/* Cards simulation */}
          <div className="flex gap-1 mt-2 justify-center">
            <div
              className="h-6 w-8 rounded"
              style={{ backgroundColor: theme.colors.card, border: `1px solid ${theme.colors.border}` }}
            />
            <div
              className="h-6 w-8 rounded"
              style={{ backgroundColor: theme.colors.card, border: `1px solid ${theme.colors.border}` }}
            />
          </div>
        </div>
      </div>

      {/* Theme Info */}
      <h4 className="font-semibold text-deep-charcoal dark:text-ivory mb-1">
        {theme.name}
      </h4>
      <p className="text-sm text-warm-taupe dark:text-silver-mist">
        {theme.description}
      </p>

      {/* Color Swatches */}
      <div className="flex gap-1.5 mt-3">
        <div
          className="w-5 h-5 rounded-full border border-silver-mist/30"
          style={{ backgroundColor: theme.colors.primary }}
          title="Couleur principale"
        />
        <div
          className="w-5 h-5 rounded-full border border-silver-mist/30"
          style={{ backgroundColor: theme.colors.accent }}
          title="Couleur d'accent"
        />
        <div
          className="w-5 h-5 rounded-full border border-silver-mist/30"
          style={{ backgroundColor: theme.colors.background }}
          title="Arrière-plan"
        />
      </div>
    </button>
  );
}
