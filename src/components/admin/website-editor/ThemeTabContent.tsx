import { Sparkles, Check } from 'lucide-react';
import { themeList } from '../../../lib/themes';
import type { WeddingCustomization } from '../../../lib/customization';
import type { Language } from '../../../i18n/translations';
import { t } from '../../../i18n/utils';

interface ThemeTabContentProps {
  customization: WeddingCustomization;
  onThemeChange: (themeId: string) => void;
  lang?: Language;
}

export function ThemeTabContent({ customization, onThemeChange, lang = 'fr' }: ThemeTabContentProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-burgundy" />
          {t(lang, 'editor.themeTab.selectTheme')}
        </h3>
        <p className="text-xs text-charcoal/50">
          {t(lang, 'editor.themeTab.chooseStyle')}
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-2 gap-3">
        {themeList.map((theme) => {
          const isSelected = customization.themeId === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              className={`relative p-3 rounded-xl border-2 transition-all text-left group ${
                isSelected
                  ? 'border-burgundy bg-burgundy/5'
                  : 'border-charcoal/10 hover:border-charcoal/20 bg-charcoal/5'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-burgundy flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Theme Preview */}
              <div
                className="h-16 rounded-lg mb-2 overflow-hidden border border-charcoal/10"
                style={{ backgroundColor: theme.colors.background }}
              >
                <div className="w-full h-full p-2 flex flex-col items-center justify-center">
                  <div
                    className="h-2 w-12 rounded-sm mb-1"
                    style={{ backgroundColor: theme.colors.text, opacity: 0.3 }}
                  />
                  <div
                    className="h-1.5 w-8 rounded-sm"
                    style={{ backgroundColor: theme.colors.accent, opacity: 0.5 }}
                  />
                </div>
              </div>

              <h4 className="text-sm font-medium text-charcoal mb-1 truncate">
                {theme.name}
              </h4>

              {/* Color dots */}
              <div className="flex gap-1">
                {Object.entries(theme.colors)
                  .slice(0, 4)
                  .map(([key, color]) => (
                    <div
                      key={key}
                      className="w-4 h-4 rounded-full border border-charcoal/10"
                      style={{ backgroundColor: color }}
                      title={key}
                    />
                  ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Theme Details */}
      {customization.themeId && (
        <div className="mt-4 p-3 bg-charcoal/5 rounded-xl border border-charcoal/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-burgundy/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-burgundy" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-charcoal">
                {themeList.find(t => t.id === customization.themeId)?.name}
              </h4>
              <p className="text-xs text-charcoal/50 mt-0.5">
                {themeList.find(t => t.id === customization.themeId)?.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
