import { useEffect, useMemo, useState } from 'react';
import { Camera, Copy, KeyRound, QrCode, RotateCcw, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { GalleryGrid } from '../gallery/GalleryGrid';
import { resetDemo } from '../../lib/demoStorage';

const QA_PASSWORD = '1412';
const QA_ACCESS_KEY = 'reflets_qa_private_gallery_access';
const QA_ROUTE = '/qa-privee';
const QA_RESET_KEYS = [
  'reflets_username',
  'reflets_favorites',
  'reflets_reactions',
  'reflets_guest_id',
  'reflets_guest_token',
  'reflets_guest_session',
];

function getCurrentUrl(): URL {
  return new URL(window.location.href, 'http://localhost');
}

function getShareUrl(): string {
  const url = new URL(QA_ROUTE, getCurrentUrl());
  url.searchParams.set('pin', QA_PASSWORD);
  return url.toString();
}

function cleanPinFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('pin')) return;
  params.delete('pin');
  const search = params.toString();
  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
  );
}

function grantAccess(): void {
  localStorage.setItem(QA_ACCESS_KEY, 'granted');
}

function hasAccess(): boolean {
  return localStorage.getItem(QA_ACCESS_KEY) === 'granted';
}

export function PrivateGalleryQA() {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return `${QA_ROUTE}?pin=${QA_PASSWORD}`;
    return getShareUrl();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pin = new URLSearchParams(window.location.search).get('pin');

    if (hasAccess() || pin === QA_PASSWORD) {
      grantAccess();
      cleanPinFromUrl();
      setUnlocked(true);
    }

    setReady(true);
  }, []);

  const handleUnlock = () => {
    if (password.trim() !== QA_PASSWORD) {
      setError('Code incorrect.');
      return;
    }

    grantAccess();
    setUnlocked(true);
    setError('');
    setPassword('');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleReset = () => {
    if (!window.confirm('Réinitialiser toutes les photos et données de QA sur ce navigateur ?')) {
      return;
    }

    setResetting(true);
    resetDemo();
    QA_RESET_KEYS.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  if (!ready) {
    return (
      <div className="rounded-[32px] border border-white/70 bg-white/80 p-8 text-center text-charcoal/60 shadow-[0_30px_80px_rgba(75,42,51,0.12)] backdrop-blur-sm">
        Chargement de l'espace QA...
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-[0_30px_80px_rgba(75,42,51,0.12)] backdrop-blur-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-burgundy-old/15 bg-burgundy-old/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-burgundy-old">
              <ShieldCheck size={14} />
              QA privée
            </div>

            <h1 className="mt-6 font-serif text-4xl text-charcoal sm:text-5xl">
              Galerie de validation avant release
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-charcoal/70">
              Cet espace sert uniquement a tester la galerie et l'upload sur le code actuel, sans passer par un mariage client.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-charcoal/8 bg-[#fcfaf8] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-charcoal/45">Acces</p>
                <p className="mt-3 flex items-center gap-3 text-2xl font-semibold text-charcoal">
                  <KeyRound size={20} className="text-burgundy-old" />
                  {QA_PASSWORD}
                </p>
              </div>
              <div className="rounded-3xl border border-charcoal/8 bg-[#fcfaf8] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-charcoal/45">Usage</p>
                <p className="mt-3 flex items-center gap-3 text-base text-charcoal/75">
                  <Camera size={20} className="text-burgundy-old" />
                  Upload, galerie, reset de donnees
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-charcoal/8 bg-[#f8f1f3] p-6">
              <label htmlFor="qa-password" className="block text-sm font-medium text-charcoal">
                Entrer le code pour ouvrir l'espace QA
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="qa-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleUnlock();
                  }}
                  placeholder="1412"
                  className="w-full rounded-2xl border border-charcoal/12 bg-white px-4 py-3 text-lg tracking-[0.35em] text-charcoal outline-hidden transition focus:border-burgundy-old focus:ring-2 focus:ring-burgundy-old/20"
                />
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="rounded-2xl bg-burgundy-old px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#8f1622]"
                >
                  Ouvrir l'espace
                </button>
              </div>
              {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            </div>
          </section>

          <aside className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-[0_30px_80px_rgba(75,42,51,0.12)] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-burgundy-old/10 p-3 text-burgundy-old">
                <QrCode size={22} />
              </div>
              <div>
                <h2 className="font-serif text-2xl text-charcoal">QR code QA</h2>
                <p className="text-sm text-charcoal/60">Le scan ouvre directement cette page avec le code.</p>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-charcoal/8 bg-[#fffdfa] p-6 text-center">
              <QRCodeSVG value={shareUrl} size={220} bgColor="#fffdfa" fgColor="#2d2d2d" level="M" />
            </div>

            <div className="mt-5 rounded-3xl border border-charcoal/8 bg-[#fcfaf8] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-charcoal/45">Lien partage</p>
              <p className="mt-2 break-all font-mono text-xs text-charcoal/70">{shareUrl}</p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-charcoal/10 bg-white px-4 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal/25"
            >
              <Copy size={16} />
              {copied ? 'Lien copie' : 'Copier le lien'}
            </button>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[32px] border border-white/70 bg-white/88 p-8 shadow-[0_30px_80px_rgba(75,42,51,0.12)] backdrop-blur-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-burgundy-old/15 bg-burgundy-old/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-burgundy-old">
              <ShieldCheck size={14} />
              Session QA active
            </div>
            <h1 className="mt-5 font-serif text-4xl text-charcoal">Espace prive de test galerie + upload</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/70">
              Cette page utilise les composants actuels de galerie et d'upload. Les donnees restent locales a ce navigateur pour faire des cycles QA repetables.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-2xl border border-charcoal/10 bg-white px-5 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal/25"
            >
              <Copy size={16} />
              {copied ? 'Lien copie' : 'Copier le lien QR'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-charcoal px-5 py-3 text-sm font-medium text-white transition hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={16} />
              {resetting ? 'Reset en cours...' : 'Reset QA'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-3xl border border-charcoal/8 bg-[#fcfaf8] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-charcoal/45">Lien de partage</p>
            <p className="mt-2 break-all font-mono text-sm text-charcoal/70">{shareUrl}</p>
          </div>
          <div className="rounded-3xl border border-charcoal/8 bg-[#fffdfa] p-4">
            <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-sm">
              <QRCodeSVG value={shareUrl} size={160} bgColor="#ffffff" fgColor="#2d2d2d" level="M" />
            </div>
          </div>
        </div>
      </section>

      <GalleryGrid demoMode={true} variant="public" />
    </div>
  );
}
