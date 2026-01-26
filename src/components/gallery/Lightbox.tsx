import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import type { MediaItem } from '../../lib/services/dataService';
import ReactionsPanel from './ReactionsPanel';

interface LightboxProps {
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ media, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  // Refs for touch handling (using refs to avoid re-renders during touch)
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ref for stable callback access (prevents effect re-runs when onClose changes)
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const currentItem = media[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === media.length - 1;

  // Minimum swipe distance (in px) to trigger navigation
  const minSwipeDistance = 50;

  const goToPrevious = () => {
    if (!isFirst) {
      setCurrentIndex(currentIndex - 1);
      setIsZoomed(false);
    }
  };

  const goToNext = () => {
    if (!isLast) {
      setCurrentIndex(currentIndex + 1);
      setIsZoomed(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentItem.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reflets-de-bonheur-${(currentItem.author || 'invité').replace(/\s+/g, '-')}-${currentItem.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Keyboard navigation (uses ref for stable onClose callback)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onCloseRef.current();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsZoomed(false);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < media.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsZoomed(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, media.length]);

  // Touch swipe with passive event listeners for better scroll performance
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchEndRef.current = null;
      touchStartRef.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndRef.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
      const touchStart = touchStartRef.current;
      const touchEnd = touchEndRef.current;
      if (touchStart === null || touchEnd === null) return;

      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe && currentIndex < media.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsZoomed(false);
      } else if (isRightSwipe && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setIsZoomed(false);
      }
    };

    // Add listeners with passive: true for better scroll performance
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentIndex, media.length]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-deep-charcoal/95 z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-deep-charcoal/80 hover:bg-deep-charcoal text-ivory rounded-full transition-all duration-200 hover:scale-110"
        aria-label="Fermer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation buttons */}
      {!isFirst && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 z-10 p-3 bg-deep-charcoal/80 hover:bg-deep-charcoal text-ivory rounded-full transition-all duration-200 hover:scale-110"
          aria-label="Photo précédente"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {!isLast && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 z-10 p-3 bg-deep-charcoal/80 hover:bg-deep-charcoal text-ivory rounded-full transition-all duration-200 hover:scale-110"
          aria-label="Photo suivante"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative max-w-7xl max-h-[90vh] mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {currentItem.type === 'video' ? (
          <video
            src={currentItem.url}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
          />
        ) : (
          <img
            src={currentItem.url}
            alt={currentItem.caption || `Photo par ${currentItem.author}`}
            className={`max-w-full max-h-[80vh] rounded-lg shadow-2xl transition-transform duration-300 ${
              isZoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in'
            }`}
            onClick={() => setIsZoomed(!isZoomed)}
          />
        )}

        {/* Action buttons bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-deep-charcoal/90 to-transparent p-6 rounded-b-lg">
          <div className="flex items-center justify-between text-ivory mb-4">
            <div className="flex-1">
              <p className="font-semibold text-lg mb-1">{currentItem.author}</p>
              {currentItem.caption && (
                <p className="text-sm text-ivory/80">{currentItem.caption}</p>
              )}
            </div>

            <div className="flex gap-2 ml-4">
              {currentItem.type === 'image' && (
                <>
                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="p-2 bg-deep-charcoal/80 hover:bg-burgundy-old hover:text-white rounded-lg transition-all duration-200"
                    aria-label={isZoomed ? 'Dézoomer' : 'Zoomer'}
                    title={isZoomed ? 'Dézoomer' : 'Zoomer'}
                  >
                    {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
                  </button>
                </>
              )}
              <button
                onClick={handleDownload}
                className="p-2 bg-deep-charcoal/80 hover:bg-burgundy-old hover:text-white rounded-lg transition-all duration-200"
                aria-label="Télécharger"
                title="Télécharger"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Reactions Panel */}
          <div className="mb-4">
            <ReactionsPanel mediaId={currentItem.id} />
          </div>

          {/* Image counter */}
          <div className="text-center text-ivory/60 text-sm">
            {currentIndex + 1} / {media.length}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-ivory/40 text-xs hidden md:block">
        <span className="bg-deep-charcoal/60 px-3 py-1 rounded-full">
          ESC pour fermer • ← → pour naviguer
        </span>
      </div>
    </div>
  );
}
