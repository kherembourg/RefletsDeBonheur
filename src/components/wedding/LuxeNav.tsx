import { Home, Camera, Radio, BookOpen } from 'lucide-react';
import { luxeTheme } from '../../lib/themes';

interface LuxeNavProps {
  slug: string;
  currentPage: 'home' | 'photos' | 'live' | 'guestbook';
}

export function LuxeNav({ slug, currentPage }: LuxeNavProps) {
  const colors = luxeTheme.colors;

  const navItems = [
    { id: 'home', label: 'Info', icon: Home, href: `/${slug}` },
    { id: 'photos', label: 'Photos', icon: Camera, href: `/${slug}/photos` },
    { id: 'live', label: 'Live', icon: Radio, href: `/${slug}/photos?live=true` },
    { id: 'guestbook', label: 'Livre', icon: BookOpen, href: `/${slug}/livre-or` },
  ];

  return (
    <nav
      className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] px-5 py-3 rounded-full flex justify-between items-center z-50 shadow-lg border"
      style={{
        background: colors.glass,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'rgba(255, 255, 255, 0.5)',
      }}
    >
      {navItems.map((item) => {
        const isActive = currentPage === item.id;
        const Icon = item.icon;

        return (
          <a
            key={item.id}
            href={item.href}
            className="flex flex-col items-center gap-0.5 text-[0.7rem] font-medium transition-colors relative"
            style={{ color: isActive ? colors.text : colors.textMuted }}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.label}</span>
            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute -bottom-1 w-1 h-1 rounded-full"
                style={{ backgroundColor: colors.accent }}
              />
            )}
          </a>
        );
      })}
    </nav>
  );
}
