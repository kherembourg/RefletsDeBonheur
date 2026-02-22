import {
  ChevronLeft,
  Layers,
  Cloud,
  CloudOff,
  Loader2,
  Monitor,
  Tablet,
  Smartphone,
  ZoomOut,
  ZoomIn,
  RefreshCw,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import type { DevicePreview, SaveStatus } from './types';
import type { Language } from '../../../i18n/translations';
import { t } from '../../../i18n/utils';

interface EditorToolbarProps {
  weddingSlug: string;
  saveStatus: SaveStatus;
  hasUnsavedChanges: boolean;
  devicePreview: DevicePreview;
  zoom: number;
  lang?: Language;
  onBack: () => void;
  onDeviceChange: (device: DevicePreview) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRefresh: () => void;
  onReset: () => void;
}

export function EditorToolbar({
  weddingSlug,
  saveStatus,
  hasUnsavedChanges,
  devicePreview,
  zoom,
  lang = 'fr',
  onBack,
  onDeviceChange,
  onZoomIn,
  onZoomOut,
  onRefresh,
  onReset,
}: EditorToolbarProps) {
  return (
    <header className="h-14 bg-white border-b border-charcoal/10 flex items-center justify-between px-4 shrink-0 shadow-xs">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t(lang, 'editor.toolbar.back')}</span>
        </button>

        <div className="h-6 w-px bg-charcoal/10" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center">
            <Layers className="w-4 h-4 text-burgundy" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-charcoal">{t(lang, 'editor.toolbar.title')}</h1>
            <p className="text-xs text-charcoal/50">{t(lang, 'editor.toolbar.subtitle')}</p>
          </div>
        </div>

        {/* Auto-save status indicator */}
        <div className="ml-2 flex items-center gap-1.5">
          {saveStatus === 'saving' && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t(lang, 'editor.toolbar.saving')}
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <Cloud className="w-3 h-3" />
              {t(lang, 'editor.toolbar.saved')}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full border border-red-500/30 flex items-center gap-1.5">
              <CloudOff className="w-3 h-3" />
              {t(lang, 'editor.toolbar.error')}
            </span>
          )}
          {saveStatus === 'idle' && hasUnsavedChanges && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
              {t(lang, 'editor.toolbar.unsaved')}
            </span>
          )}
        </div>
      </div>

      {/* Center section - Device Preview */}
      <div className="flex items-center gap-1 bg-charcoal/5 rounded-lg p-1">
        {[
          { id: 'desktop' as const, icon: Monitor, labelKey: 'editor.toolbar.desktop' },
          { id: 'tablet' as const, icon: Tablet, labelKey: 'editor.toolbar.tablet' },
          { id: 'mobile' as const, icon: Smartphone, labelKey: 'editor.toolbar.mobile' },
        ].map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => onDeviceChange(id)}
            className={`p-2 rounded-md transition-all ${
              devicePreview === id
                ? 'bg-white text-charcoal shadow-sm'
                : 'text-charcoal/50 hover:text-charcoal'
            }`}
            title={t(lang, labelKey)}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Zoom controls */}
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={onZoomOut}
            className="p-1.5 rounded text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-charcoal/60 w-12 text-center">{zoom}%</span>
          <button
            onClick={onZoomIn}
            className="p-1.5 rounded text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-charcoal/10" />

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-all"
          title={t(lang, 'editor.toolbar.refresh')}
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="p-2 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-all"
          title={t(lang, 'editor.toolbar.reset')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Open in new tab */}
        <a
          href={`/${weddingSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-all"
          title={t(lang, 'editor.toolbar.openNewTab')}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}
