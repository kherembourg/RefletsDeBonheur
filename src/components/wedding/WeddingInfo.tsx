import { MapPin, Car, Navigation } from 'lucide-react';
import type { WeddingVenue } from '../../lib/types';

interface WeddingInfoProps {
  venue?: WeddingVenue;
  primaryColor: string;
}

export function WeddingInfo({ venue, primaryColor }: WeddingInfoProps) {
  if (!venue) {
    return null;
  }

  const googleMapsUrl = venue.mapUrl ||
    (venue.coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${venue.coordinates.lat},${venue.coordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`);

  return (
    <section className="py-16 px-4 bg-ivory dark:bg-deep-charcoal/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-center text-deep-charcoal dark:text-ivory mb-12">
          Lieu de la réception
        </h2>

        <div className="bg-white dark:bg-deep-charcoal/50 rounded-2xl shadow-lg overflow-hidden">
          {/* Map placeholder */}
          <div className="h-64 bg-silver-mist/20 relative">
            {venue.coordinates ? (
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${venue.coordinates.lat},${venue.coordinates.lng}&zoom=14`}
                className="w-full h-full border-0"
                loading="lazy"
                title="Carte du lieu"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-warm-taupe">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Carte non disponible</p>
                </div>
              </div>
            )}
          </div>

          {/* Venue details */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div>
                <h3 className="text-2xl font-semibold text-deep-charcoal dark:text-ivory mb-2">
                  {venue.name}
                </h3>
                <p className="text-warm-taupe dark:text-silver-mist flex items-start gap-2">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: primaryColor }} />
                  <span>{venue.address}</span>
                </p>

                {venue.parkingInfo && (
                  <p className="text-warm-taupe dark:text-silver-mist flex items-start gap-2 mt-3">
                    <Car className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: primaryColor }} />
                    <span>{venue.parkingInfo}</span>
                  </p>
                )}
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90 hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                <Navigation className="w-5 h-5" />
                <span>Itinéraire</span>
              </a>
            </div>
          </div>
        </div>

        {/* Additional info cards */}
        <div className="grid sm:grid-cols-2 gap-6 mt-8">
          <div className="bg-white dark:bg-deep-charcoal/50 rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-deep-charcoal dark:text-ivory mb-3">
              Dress code
            </h4>
            <p className="text-warm-taupe dark:text-silver-mist">
              Tenue de cocktail / Chic décontracté
            </p>
          </div>

          <div className="bg-white dark:bg-deep-charcoal/50 rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-deep-charcoal dark:text-ivory mb-3">
              Hébergement
            </h4>
            <p className="text-warm-taupe dark:text-silver-mist">
              Des chambres sont disponibles sur place et aux alentours. Contactez-nous pour plus d'informations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
