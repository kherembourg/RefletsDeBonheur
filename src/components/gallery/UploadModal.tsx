import { XCircle } from 'lucide-react';
import { UploadForm } from './UploadForm';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import type { DataService, MediaItem } from '../../lib/services/dataService';
import { t } from '../../i18n/utils';
import type { Language } from '../../i18n/translations';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (items: MediaItem[]) => void;
  dataService: DataService;
  lang?: Language;
}

export function UploadModal({ isOpen, onClose, onUploadComplete, dataService, lang = 'fr' }: UploadModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-deep-charcoal/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-ivory rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-silver-mist bg-ivory z-10">
          <h3 className="font-bold text-lg text-deep-charcoal">
            {t(lang, 'gallery.addMemories')}
          </h3>
          <button
            onClick={onClose}
            className="text-warm-taupe hover:text-deep-charcoal transition-colors"
            aria-label={t(lang, 'common.close')}
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <ErrorBoundary>
            <UploadForm
              onUploadComplete={onUploadComplete}
              onClose={onClose}
              dataService={dataService}
              lang={lang}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
