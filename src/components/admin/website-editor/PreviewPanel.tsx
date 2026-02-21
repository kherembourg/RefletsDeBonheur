import { type RefObject } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import type { DevicePreview } from './types';

interface PreviewPanelProps {
  weddingSlug: string;
  previewKey: number;
  devicePreview: DevicePreview;
  zoom: number;
  isPreviewLoading: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onIframeLoad: () => void;
}

function getPreviewWidth(devicePreview: DevicePreview): number | string {
  switch (devicePreview) {
    case 'mobile':
      return 375;
    case 'tablet':
      return 768;
    default:
      return '100%';
  }
}

export function PreviewPanel({
  weddingSlug,
  previewKey,
  devicePreview,
  zoom,
  isPreviewLoading,
  iframeRef,
  onIframeLoad,
}: PreviewPanelProps) {
  return (
    <main className="flex-1 bg-charcoal/5 p-6 flex flex-col overflow-hidden">
      {/* Preview Container */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
      >
        <div
          className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${
            devicePreview !== 'desktop' ? 'border-8 border-charcoal rounded-[2rem]' : ''
          }`}
          style={{
            width: getPreviewWidth(devicePreview),
            height: devicePreview === 'desktop' ? '100%' : devicePreview === 'tablet' ? '1024px' : '812px',
            maxHeight: '100%',
          }}
        >
          {/* Device frame for mobile/tablet */}
          {devicePreview !== 'desktop' && (
            <div className="h-6 bg-charcoal flex items-center justify-center">
              <div className="w-20 h-1 bg-charcoal-light rounded-full" />
            </div>
          )}

          {/* Iframe Preview with Loading Overlay */}
          <div className="relative w-full" style={{ height: devicePreview !== 'desktop' ? 'calc(100% - 24px)' : '100%' }}>
            <iframe
              key={previewKey}
              ref={iframeRef}
              src={`/${weddingSlug}?preview=true&v=${previewKey}`}
              className="w-full h-full bg-white"
              onLoad={onIframeLoad}
              title="Aperçu du site"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />

            {/* Loading overlay */}
            {isPreviewLoading && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview URL bar */}
      <div className="mt-4 flex items-center justify-center">
        <div className="bg-white rounded-full px-4 py-2 flex items-center gap-2 text-sm shadow-sm border border-charcoal/10">
          <Eye className="w-4 h-4 text-charcoal/50" />
          <span className="text-charcoal/70">/{weddingSlug}</span>
          <span className="text-charcoal/40">• Aperçu en direct</span>
        </div>
      </div>
    </main>
  );
}
