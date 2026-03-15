import { useEffect, useMemo, useState } from 'react';
import { GalleryGrid } from '../gallery/GalleryGrid';

interface ClientSessionShape {
  wedding_name?: string;
  couple_names?: string;
  wedding_slug?: string;
}

interface AccountGalleryState {
  title: string;
  subtitle: string;
  initials: string;
  weddingSlug?: string;
}

const DEFAULT_STATE: AccountGalleryState = {
  title: 'Votre galerie',
  subtitle: 'Galerie privée de votre mariage',
  initials: 'RB',
};

function formatWeddingDate(dateValue?: string): string | null {
  if (!dateValue) return null;

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function getInitials(label?: string): string {
  if (!label) return DEFAULT_STATE.initials;

  const initials = label
    .split(/[&\s]+/)
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || DEFAULT_STATE.initials;
}

export function AccountGalleryShell() {
  const [state, setState] = useState<AccountGalleryState>(DEFAULT_STATE);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessionRaw = localStorage.getItem('reflets_client_session');
    const godSessionRaw = localStorage.getItem('reflets_god_impersonation');

    const session = [sessionRaw, godSessionRaw]
      .map((raw) => {
        if (!raw) return null;
        try {
          return JSON.parse(raw) as ClientSessionShape;
        } catch {
          return null;
        }
      })
      .find(Boolean);

    if (!session) return;

    const title = session.couple_names || session.wedding_name || DEFAULT_STATE.title;
    const subtitle = session.wedding_name && session.wedding_name !== title
      ? session.wedding_name
      : DEFAULT_STATE.subtitle;

    setState({
      title,
      subtitle,
      initials: getInitials(session.couple_names || session.wedding_name),
      weddingSlug: session.wedding_slug,
    });
  }, []);

  const links = useMemo(() => {
    if (!state.weddingSlug) {
      return {
        home: '/',
        gallery: '/account/gallery',
        guestbook: '/livre-or',
        rsvp: '/rsvp',
      };
    }

    return {
      home: `/${state.weddingSlug}`,
      gallery: '/account/gallery',
      guestbook: `/${state.weddingSlug}/livre-or`,
      rsvp: `/${state.weddingSlug}/rsvp`,
    };
  }, [state.weddingSlug]);

  const displayDate = formatWeddingDate(state.subtitle);

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#f7f2f5] via-[#f8f4f8] to-[#efe9f0]">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-8 pb-16">
        <div className="flex items-center justify-between md:hidden text-charcoal/60">
          <a
            href={links.home}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 border border-charcoal/10"
            aria-label="Retour à l'accueil du mariage"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </a>
          <span className="font-serif text-base text-charcoal">{state.title}</span>
          <div className="w-10 h-10 rounded-full bg-white/70 border border-charcoal/10 flex items-center justify-center text-xs text-charcoal/50">
            {state.initials}
          </div>
        </div>

        <div className="hidden md:block text-center">
          <h1 className="font-serif text-4xl lg:text-5xl text-charcoal tracking-wide">
            {state.title}
          </h1>
          <nav className="mt-5 flex items-center justify-center gap-6 text-xs uppercase tracking-[0.3em] text-charcoal/60">
            <a href={links.home} className="hover:text-charcoal transition-colors">Accueil</a>
            <a href={links.gallery} className="text-charcoal border-b border-charcoal pb-1">Galerie</a>
            <a href={links.guestbook} className="hover:text-charcoal transition-colors">Livre d&apos;or</a>
            <a href={links.rsvp} className="hover:text-charcoal transition-colors">RSVP</a>
          </nav>
        </div>

        <div className="mt-8 border-t border-charcoal/10"></div>

        <div className="text-center mt-6">
          <p className="text-xs uppercase tracking-[0.35em] text-charcoal/50">Moments inoubliables</p>
          <p className="text-sm text-charcoal/50 mt-2">
            {displayDate ? `Galerie de mariage · ${displayDate}` : state.subtitle}
          </p>
        </div>

        <div className="mt-10">
          <GalleryGrid variant="public" weddingSlug={state.weddingSlug} />
        </div>
      </div>
    </section>
  );
}
