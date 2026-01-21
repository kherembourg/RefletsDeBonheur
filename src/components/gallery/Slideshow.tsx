import { useEffect, useState, useRef } from 'react';
import { X, Play, Pause, ChevronLeft, ChevronRight, Maximize, Minimize, Settings } from 'lucide-react';
import type { MediaItem } from '../../lib/services/dataService';

interface SlideshowProps {
  media: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

type Speed = 3000 | 5000 | 7000 | 10000;

export function Slideshow({ media, initialIndex = 0, onClose }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>(5000);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = media[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === media.length - 1;

  // Auto-advance logic
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          // Loop back to start when reaching the end
          return prev >= media.length - 1 ? 0 : prev + 1;
        });
      }, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, media.length]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isPlaying, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev >= media.length - 1 ? 0 : prev + 1));
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error attempting to exit fullscreen:', err);
      }
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const speedOptions = [
    { value: 3000, label: 'Rapide (3s)' },
    { value: 5000, label: 'Normal (5s)' },
    { value: 7000, label: 'Lent (7s)' },
    { value: 10000, label: 'Très lent (10s)' },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-deep-charcoal z-50 flex flex-col animate-fade-in"
    >
      {/* Top Controls Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-linear-to-b from-deep-charcoal/90 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left: Info */}
          <div className="flex items-center gap-4 text-ivory">
            <div>
              <p className="font-semibold">{currentItem.author}</p>
              {currentItem.caption && (
                <p className="text-sm text-ivory/70">{currentItem.caption}</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-deep-charcoal/80 hover:bg-deep-charcoal text-ivory rounded-lg transition-all duration-200 hover:scale-110"
              aria-label="Paramètres"
              title="Paramètres"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 bg-deep-charcoal/80 hover:bg-deep-charcoal text-ivory rounded-lg transition-all duration-200 hover:scale-110"
              aria-label={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
              title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-deep-charcoal/80 hover:bg-deep-charcoal text-ivory rounded-lg transition-all duration-200 hover:scale-110"
              aria-label="Fermer"
              title="Fermer le diaporama"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Settings Dropdown */}
        {showSettings && (
          <div className="mt-4 max-w-xs mx-auto bg-deep-charcoal/95 rounded-lg p-4 border border-ivory/20 animate-scale-in">
            <h3 className="text-ivory font-semibold mb-3 text-sm">Vitesse du diaporama</h3>
            <div className="space-y-2">
              {speedOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSpeed(option.value as Speed);
                    setShowSettings(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    speed === option.value
                      ? 'bg-burgundy-old text-white font-semibold'
                      : 'bg-ivory/10 text-ivory hover:bg-ivory/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Image Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        {currentItem.type === 'video' ? (
          <video
            key={currentItem.id}
            src={currentItem.url}
            autoPlay
            muted
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onEnded={goToNext}
          />
        ) : (
          <img
            key={currentItem.id}
            src={currentItem.url}
            alt={currentItem.caption || `Photo par ${currentItem.author}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-fade-in"
          />
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-linear-to-t from-deep-charcoal/90 to-transparent p-6">
        <div className="max-w-7xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-ivory/60 text-xs mb-2">
              <span>
                {currentIndex + 1} / {media.length}
              </span>
              <span>{Math.round(((currentIndex + 1) / media.length) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-ivory/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-burgundy-old transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / media.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPrevious}
              disabled={isFirst && !isPlaying}
              className="p-3 bg-ivory/10 hover:bg-ivory/20 text-ivory rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 bg-burgundy-old hover:bg-[#c92a38] text-white rounded-full transition-all duration-200 hover:scale-110 shadow-lg"
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
            </button>

            <button
              onClick={goToNext}
              disabled={isLast && !isPlaying}
              className="p-3 bg-ivory/10 hover:bg-ivory/20 text-ivory rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Photo suivante"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="text-center text-ivory/40 text-xs mt-4 hidden md:block">
            <span className="bg-deep-charcoal/60 px-4 py-1 rounded-full">
              ESPACE pour pause • ← → pour naviguer • F pour plein écran • ESC pour fermer
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
