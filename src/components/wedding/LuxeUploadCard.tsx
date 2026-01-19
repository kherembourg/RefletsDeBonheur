import { Camera } from 'lucide-react';
import { useState } from 'react';
import { luxeTheme } from '../../lib/themes';

interface LuxeUploadCardProps {
  onUploadClick?: () => void;
}

export function LuxeUploadCard({ onUploadClick }: LuxeUploadCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = luxeTheme.colors;

  return (
    <section className="px-5 mb-10">
      <div
        className="rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer"
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${isHovered ? colors.accent : colors.border}`,
          transform: isHovered ? 'translateY(-2px)' : 'none',
          boxShadow: isHovered ? '0 10px 30px rgba(0,0,0,0.05)' : 'none',
        }}
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
          style={{ color: colors.text, fontFamily: "'Playfair Display', serif" }}
        >
          Partagez vos souvenirs
        </h3>

        {/* Description */}
        <p
          className="text-sm leading-relaxed mb-5"
          style={{ color: colors.textLight }}
        >
          Ajoutez vos photos et vidéos directement à notre album privé.
        </p>

        {/* Button */}
        <button
          className="px-7 py-3.5 rounded-full text-sm font-medium transition-colors duration-300"
          style={{
            backgroundColor: isHovered ? colors.accent : colors.text,
            color: '#fff',
          }}
        >
          Sélectionner
        </button>
      </div>
    </section>
  );
}
