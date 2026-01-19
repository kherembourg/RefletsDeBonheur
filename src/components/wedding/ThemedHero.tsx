import type { WeddingConfig, WeddingThemeId } from '../../lib/types';
import { WeddingHero } from './WeddingHero';
import { LuxeHero } from './LuxeHero';

interface ThemedHeroProps {
  config: WeddingConfig;
}

export function ThemedHero({ config }: ThemedHeroProps) {
  const themeId = config.theme.id || 'classic';

  if (themeId === 'luxe') {
    return <LuxeHero config={config} />;
  }

  return <WeddingHero config={config} />;
}
