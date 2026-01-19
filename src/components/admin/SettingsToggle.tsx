interface SettingsToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  loading?: boolean;
}

export function SettingsToggle({ enabled, onChange, loading = false }: SettingsToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? 'bg-sage-green' : 'bg-silver-mist'
      }`}
      aria-label={enabled ? 'Désactiver les uploads' : 'Activer les uploads'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-ivory transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
