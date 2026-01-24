import { cn } from '../../../styles/admin-theme';

export interface AdminToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
}

export function AdminToggle({
  enabled,
  onChange,
  disabled = false,
  loading = false,
  size = 'md',
  label,
  description,
}: AdminToggleProps) {
  const sizeStyles = {
    sm: {
      track: 'w-8 h-[18px]',
      thumb: 'w-3.5 h-3.5',
      thumbTranslate: enabled ? 'translate-x-[14px]' : 'translate-x-0.5',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      thumbTranslate: enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      thumbTranslate: enabled ? 'translate-x-[30px]' : 'translate-x-0.5',
    },
  };

  const styles = sizeStyles[size];

  const handleClick = () => {
    if (!disabled && !loading) {
      onChange(!enabled);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const toggleButton = (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled || loading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-flex shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-burgundy-old/30 focus:ring-offset-2',
        styles.track,
        enabled ? 'bg-burgundy-old' : 'bg-charcoal/20',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        !(disabled || loading) && 'cursor-pointer'
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 -translate-y-1/2 bg-white rounded-full shadow-sm transition-transform duration-200',
          styles.thumb,
          styles.thumbTranslate,
          loading && 'animate-pulse'
        )}
      />
    </button>
  );

  if (!label) {
    return toggleButton;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-charcoal">{label}</span>
        {description && (
          <span className="block text-sm text-charcoal/50 mt-0.5">{description}</span>
        )}
      </div>
      {toggleButton}
    </div>
  );
}
