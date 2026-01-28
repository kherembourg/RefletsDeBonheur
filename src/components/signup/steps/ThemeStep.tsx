import { Check } from 'lucide-react';
import { AdminButton } from '../../admin/ui/AdminButton';
import { themeList, type ThemeId, type Theme } from '../../../lib/themes';
import { cn } from '../../../styles/admin-theme';

export interface ThemeData {
  themeId: ThemeId;
}

interface ThemeStepProps {
  data: ThemeData;
  onChange: (data: ThemeData) => void;
  onNext: () => void;
  onBack: () => void;
  loading?: boolean;
}

function ThemeCard({
  theme,
  selected,
  onClick,
}: {
  theme: Theme;
  selected: boolean;
  onClick: () => void;
}) {
  const colors = [
    theme.colors.primary,
    theme.colors.accent,
    theme.colors.background,
    theme.colors.text,
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full text-left rounded-lg border-2 p-4 transition-all duration-200',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-burgundy-old/20',
        selected
          ? 'border-burgundy-old bg-burgundy-old/5'
          : 'border-charcoal/10 bg-white hover:border-charcoal/20'
      )}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-burgundy-old text-white flex items-center justify-center">
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Color preview */}
      <div className="flex gap-1.5 mb-3">
        {colors.map((color, index) => (
          <div
            key={index}
            className="w-6 h-6 rounded-full border border-charcoal/10"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Theme info */}
      <h3 className={cn(
        'font-medium mb-1',
        selected ? 'text-burgundy-old' : 'text-charcoal'
      )}>
        {theme.name}
      </h3>
      <p className="text-xs text-charcoal/60 line-clamp-2">
        {theme.description}
      </p>

      {/* Typography preview */}
      <div className="mt-3 pt-3 border-t border-charcoal/5 text-xs text-charcoal/40">
        <span style={{ fontFamily: theme.typography.fontDisplay }}>
          {theme.typography.fontDisplay}
        </span>
        {' + '}
        <span style={{ fontFamily: theme.typography.fontBody }}>
          {theme.typography.fontBody}
        </span>
      </div>
    </button>
  );
}

export function ThemeStep({ data, onChange, onNext, onBack, loading }: ThemeStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.themeId) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl text-charcoal mb-2">Choose Your Theme</h2>
        <p className="text-charcoal/60 text-sm">
          Select a style for your wedding website. You can customize it later.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themeList.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            selected={data.themeId === theme.id}
            onClick={() => onChange({ themeId: theme.id })}
          />
        ))}
      </div>

      <div className="flex gap-4 pt-4">
        <AdminButton
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="flex-1"
          disabled={loading}
        >
          Back
        </AdminButton>
        <AdminButton
          type="submit"
          variant="primary"
          size="lg"
          className="flex-1"
          disabled={!data.themeId}
          loading={loading}
        >
          {loading ? 'Creating...' : 'Create My Wedding Site'}
        </AdminButton>
      </div>

      <p className="text-center text-xs text-charcoal/50">
        By creating an account, you agree to our{' '}
        <a href="/cgv" className="text-burgundy-old hover:underline">Terms</a>
        {' '}and{' '}
        <a href="/politique-confidentialite" className="text-burgundy-old hover:underline">Privacy Policy</a>.
      </p>
    </form>
  );
}
