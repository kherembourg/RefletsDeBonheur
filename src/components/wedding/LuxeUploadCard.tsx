import { useState, useMemo } from 'react';
import { luxeTheme } from '../../lib/themes';

interface LuxeUploadCardProps {
  onUploadClick?: () => void;
}

export function LuxeUploadCard({ onUploadClick }: LuxeUploadCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = luxeTheme.colors;

  // Memoize static styles
  const staticStyles = useMemo(() => ({
    title: { color: colors.text, fontFamily: "'Playfair Display', serif" } as React.CSSProperties,
    description: { color: colors.textLight } as React.CSSProperties,
  }), [colors.text, colors.textLight]);

  // Dynamic styles that depend on hover state (computed inline but with stable base)
  const cardStyle = useMemo(() => ({
    backgroundColor: colors.card,
    borderColor: colors.border,
  }), [colors.card, colors.border]);

  const hoverCardStyle = useMemo(() => ({
    ...cardStyle,
    borderColor: colors.accent,
    transform: 'translateY(-2px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
  }), [cardStyle, colors.accent]);

  const buttonBaseStyle = useMemo(() => ({
    backgroundColor: colors.text,
    color: '#fff',
  }), [colors.text]);

  const buttonHoverStyle = useMemo(() => ({
    backgroundColor: colors.accent,
    color: '#fff',
  }), [colors.accent]);

  return (
    <section className="px-5 mb-10">
      <div
        className="rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer border"
        style={isHovered ? hoverCardStyle : cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onUploadClick}
      >
        {/* Camera Icon */}
        <div className="text-3xl mb-4">
          📷
        </div>

        {/* Title */}
        <h3
          className="text-lg font-semibold mb-2"
          style={staticStyles.title}
        >
          Partagez vos souvenirs
        </h3>

        {/* Description */}
        <p
          className="text-sm leading-relaxed mb-5"
          style={staticStyles.description}
        >
          Ajoutez vos photos et vidéos directement à notre album privé.
        </p>

        {/* Button */}
        <button
          className="px-7 py-3.5 rounded-full text-sm font-medium transition-colors duration-300"
          style={isHovered ? buttonHoverStyle : buttonBaseStyle}
        >
          Sélectionner
        </button>
      </div>
    </section>
  );
}
