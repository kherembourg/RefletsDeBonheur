import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenText, CheckCircle2, Circle, FolderPlus, Images, Paintbrush2, Share2, Sparkles } from 'lucide-react';
import { AdminButton } from './ui';
import { t } from '../../i18n/utils';
import type { Language } from '../../i18n/translations';

interface OnboardingChecklistProps {
  weddingSlug?: string;
  shareUrl: string;
  mediaCount: number;
  messageCount: number;
  albumCount: number;
  hasWeddingDetails: boolean;
  lang: Language;
  onCopyShareUrl: () => Promise<void> | void;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href?: string;
  actionLabel?: string;
  action?: () => void;
  icon: typeof Circle;
}

export function OnboardingChecklist({
  weddingSlug,
  shareUrl,
  mediaCount,
  messageCount,
  albumCount,
  hasWeddingDetails,
  lang,
  onCopyShareUrl,
}: OnboardingChecklistProps) {
  const storageKey = weddingSlug ? `reflets_onboarding_shared_${weddingSlug}` : 'reflets_onboarding_shared_demo';
  const [sharedLink, setSharedLink] = useState(false);
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setSharedLink(localStorage.getItem(storageKey) === 'true');

    const params = new URLSearchParams(window.location.search);
    setHighlighted(params.get('onboarding') === '1');
  }, [storageKey]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
    setSharedLink(true);
    onCopyShareUrl();
  };

  const items = useMemo<ChecklistItem[]>(() => ([
    {
      id: 'details',
      title: t(lang, 'admin.onboarding.detailsTitle'),
      description: t(lang, 'admin.onboarding.detailsDescription'),
      done: hasWeddingDetails,
      href: weddingSlug ? `/${weddingSlug}/admin/website-editor` : '/admin/website-editor',
      actionLabel: t(lang, 'admin.onboarding.detailsAction'),
      icon: Paintbrush2,
    },
    {
      id: 'share',
      title: t(lang, 'admin.onboarding.shareTitle'),
      description: t(lang, 'admin.onboarding.shareDescription'),
      done: sharedLink,
      actionLabel: t(lang, 'admin.onboarding.shareAction'),
      action: handleShare,
      icon: Share2,
    },
    {
      id: 'album',
      title: t(lang, 'admin.onboarding.albumTitle'),
      description: t(lang, 'admin.onboarding.albumDescription'),
      done: albumCount > 0,
      href: '#albums',
      actionLabel: t(lang, 'admin.onboarding.albumAction'),
      icon: FolderPlus,
    },
    {
      id: 'media',
      title: t(lang, 'admin.onboarding.mediaTitle'),
      description: t(lang, 'admin.onboarding.mediaDescription'),
      done: mediaCount > 0,
      href: shareUrl,
      actionLabel: t(lang, 'admin.onboarding.mediaAction'),
      icon: Images,
    },
    {
      id: 'guestbook',
      title: t(lang, 'admin.onboarding.guestbookTitle'),
      description: t(lang, 'admin.onboarding.guestbookDescription'),
      done: messageCount > 0,
      href: weddingSlug ? `/${weddingSlug}/livre-or` : '/guestbook',
      actionLabel: t(lang, 'admin.onboarding.guestbookAction'),
      icon: BookOpenText,
    },
  ]), [albumCount, hasWeddingDetails, lang, mediaCount, messageCount, shareUrl, sharedLink, weddingSlug]);

  const completedCount = items.filter((item) => item.done).length;
  const progress = Math.round((completedCount / items.length) * 100);
  const nextItem = items.find((item) => !item.done);

  return (
    <section
      className={`rounded-2xl border shadow-xs p-6 sm:p-7 ${
        highlighted
          ? 'bg-gradient-to-br from-[#fff6f3] via-white to-[#f7eeea] border-[#d4b7b7]'
          : 'bg-white border-charcoal/5'
      }`}
      aria-label={t(lang, 'admin.onboarding.aria')}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f5ece8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-charcoal/70">
            <Sparkles className="h-3.5 w-3.5 text-[#b08b8b]" />
            {t(lang, 'admin.onboarding.badge')}
          </div>
          <h2 className="mt-3 font-serif text-2xl text-charcoal">
            {t(lang, 'admin.onboarding.title')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/65">
            {t(lang, 'admin.onboarding.subtitle')}
          </p>
        </div>

        <div className="min-w-[220px] rounded-2xl bg-[#faf6f4] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-charcoal/45">
            {t(lang, 'admin.onboarding.progress')}
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold text-charcoal">{progress}%</span>
            <span className="pb-1 text-sm text-charcoal/55">
              {t(lang, 'admin.onboarding.progressDetail')
                .replace('{done}', String(completedCount))
                .replace('{total}', String(items.length))}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-charcoal/10">
            <div className="h-full rounded-full bg-[#b08b8b] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {items.map((item) => {
          const StatusIcon = item.done ? CheckCircle2 : item.icon;

          return (
            <div
              key={item.id}
              className={`flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
                item.done ? 'border-emerald-200 bg-emerald-50/60' : 'border-charcoal/8 bg-[#fcfaf9]'
              }`}
            >
              <div className="flex items-start gap-3">
                <StatusIcon className={`mt-0.5 h-5 w-5 ${item.done ? 'text-emerald-600' : 'text-[#b08b8b]'}`} />
                <div>
                  <div className="text-sm font-semibold text-charcoal">{item.title}</div>
                  <div className="mt-1 text-sm leading-relaxed text-charcoal/60">{item.description}</div>
                </div>
              </div>

              {!item.done && (item.href || item.action) && (
                item.href ? (
                  <a
                    href={item.href}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#8c6868] hover:text-[#6d4f4f]"
                  >
                    {item.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={item.action}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#8c6868] hover:text-[#6d4f4f]"
                  >
                    {item.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {nextItem && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#ead9d1] bg-[#fff8f5] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/45">
              {t(lang, 'admin.onboarding.nextLabel')}
            </div>
            <div className="mt-1 text-sm text-charcoal">
              {nextItem.title}
            </div>
          </div>
          {nextItem.href ? (
            <a
              href={nextItem.href}
              className="inline-flex items-center justify-center rounded-lg bg-[#8c6868] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6d4f4f]"
            >
              {t(lang, 'admin.onboarding.nextAction')}
            </a>
          ) : (
            <AdminButton
              type="button"
              variant="primary"
              size="sm"
              onClick={nextItem.action}
            >
              {t(lang, 'admin.onboarding.nextAction')}
            </AdminButton>
          )}
        </div>
      )}
    </section>
  );
}
