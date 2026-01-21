import { Heart, Wine, Utensils, Music, Camera, Calendar } from 'lucide-react';
import type { TimelineEvent, WeddingConfig } from '../../lib/types';

interface WeddingTimelineProps {
  timeline: TimelineEvent[];
  primaryColor: string;
}

const ICON_MAP = {
  ceremony: Heart,
  cocktail: Wine,
  dinner: Utensils,
  party: Music,
  photo: Camera,
  custom: Calendar,
};

export function WeddingTimeline({ timeline, primaryColor }: WeddingTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-center text-deep-charcoal dark:text-ivory mb-12">
          Programme de la journée
        </h2>

        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2"
            style={{ backgroundColor: `${primaryColor}30` }}
          />

          {/* Timeline items */}
          <div className="space-y-8">
            {timeline.map((event, index) => {
              const IconComponent = ICON_MAP[event.icon || 'custom'];
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  className={`relative flex items-start gap-4 sm:gap-8 ${
                    isEven ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  }`}
                >
                  {/* Icon circle */}
                  <div
                    className="absolute left-6 sm:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center z-10 shadow-md"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>

                  {/* Content card */}
                  <div
                    className={`ml-16 sm:ml-0 sm:w-[calc(50%-3rem)] ${
                      isEven ? 'sm:pr-8 sm:text-right' : 'sm:pl-8 sm:text-left'
                    }`}
                  >
                    <div className="bg-white dark:bg-deep-charcoal/50 rounded-xl p-5 shadow-xs border border-silver-mist/20 hover:shadow-md transition-shadow">
                      <div
                        className={`flex items-center gap-3 mb-2 ${
                          isEven ? 'sm:justify-end' : 'sm:justify-start'
                        }`}
                      >
                        <span
                          className="text-lg font-bold"
                          style={{ color: primaryColor }}
                        >
                          {event.time}
                        </span>
                      </div>

                      <h3 className="text-xl font-semibold text-deep-charcoal dark:text-ivory mb-1">
                        {event.title}
                      </h3>

                      {event.description && (
                        <p className="text-warm-taupe dark:text-silver-mist text-sm">
                          {event.description}
                        </p>
                      )}

                      {event.location && (
                        <p className="text-xs text-warm-taupe/70 dark:text-silver-mist/70 mt-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Spacer for alternate side */}
                  <div className="hidden sm:block sm:w-[calc(50%-3rem)]" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
