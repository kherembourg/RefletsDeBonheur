import { Download, X, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import JSZip from 'jszip';
import type { MediaItem } from '../../lib/services/dataService';

interface BulkActionsProps {
  selectedItems: Set<string>;
  allItems: MediaItem[];
  onClearSelection: () => void;
}

export default function BulkActions({ selectedItems, allItems, onClearSelection }: BulkActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const selectedCount = selectedItems.size;

  const handleBulkDownload = async () => {
    if (selectedCount === 0) return;

    setIsDownloading(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const selectedMedia = allItems.filter(item => selectedItems.has(item.id));

      // Download each image and add to ZIP
      for (let i = 0; i < selectedMedia.length; i++) {
        const item = selectedMedia[i];
        setProgress(Math.round(((i + 1) / selectedMedia.length) * 100));

        try {
          // Fetch the image
          const response = await fetch(item.url);
          const blob = await response.blob();

          // Determine file extension
          const extension = item.type === 'video' ? 'mp4' : 'jpg';

          // Create filename: reflets-[author]-[id].ext
          const sanitizedAuthor = (item.author || 'invité').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
          const filename = `reflets-${sanitizedAuthor}-${item.id}.${extension}`;

          // Add to ZIP
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Failed to download ${item.id}:`, error);
          // Continue with other files even if one fails
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Trigger download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);

      // Create ZIP filename with date
      const date = new Date().toISOString().split('T')[0];
      link.download = `reflets-de-bonheur-${date}-${selectedCount}-photos.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(link.href);

      // Clear selection after successful download
      onClearSelection();
    } catch (error) {
      console.error('Failed to create ZIP:', error);
      alert('Erreur lors de la création du fichier ZIP. Veuillez réessayer.');
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div className="bg-deep-charcoal dark:bg-[#1A1A1A] text-ivory dark:text-[#E5E5E5] rounded-full shadow-2xl px-6 py-4 flex items-center gap-4 border border-[#ae1725]/20">
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <CheckSquare size={20} className="text-[#ae1725]" />
          <span className="font-medium">
            {selectedCount} photo{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-silver-mist/30" />

        {/* Download Button */}
        <button
          onClick={handleBulkDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-[#ae1725] text-white rounded-full font-medium hover:bg-[#c92a38] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={18} />
          {isDownloading ? (
            <span>Téléchargement... {progress}%</span>
          ) : (
            <span>Télécharger ({selectedCount})</span>
          )}
        </button>

        {/* Clear Selection Button */}
        <button
          onClick={onClearSelection}
          disabled={isDownloading}
          className="p-2 hover:bg-ivory/10 rounded-full transition-colors disabled:opacity-50"
          aria-label="Effacer la sélection"
        >
          <X size={20} />
        </button>

        {/* Progress Bar */}
        {isDownloading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-ivory/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ae1725] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
