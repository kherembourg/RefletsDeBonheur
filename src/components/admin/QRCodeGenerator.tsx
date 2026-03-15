import { useState, useRef, useCallback } from 'react';
import { QrCode, Download, Printer, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../ui/Toast';

interface QRCodeGeneratorProps {
  weddingSlug?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function QRCodeGenerator({ weddingSlug }: QRCodeGeneratorProps) {
  const [accessCode, setAccessCode] = useState('MARIAGE2026');
  const [size, setSize] = useState(300);
  const [includeCode, setIncludeCode] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast, ToastContainer } = useToast();

  const galleryUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${weddingSlug ? `${weddingSlug}/photos?pin=${accessCode}` : 'demo_gallery'}`
    : `/${weddingSlug ? `${weddingSlug}/photos?pin=${accessCode}` : 'demo_gallery'}`;

  const getSvgElement = useCallback((): SVGSVGElement | null => {
    return containerRef.current?.querySelector('svg') ?? null;
  }, []);

  const handleDownload = useCallback(async () => {
    const svg = getSvgElement();
    if (!svg) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#FFFFF0';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'reflets-de-bonheur-qrcode.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    } catch (error) {
      console.error('Download failed:', error);
      showToast('error', 'Erreur lors du téléchargement.');
    }
  }, [size, getSvgElement, showToast]);

  const handlePrint = useCallback(() => {
    const svg = getSvgElement();
    if (!svg) return;
    const svgString = new XMLSerializer().serializeToString(svg);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const safeAccessCode = escapeHtml(accessCode);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - Reflets de Bonheur</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: 'Georgia', serif;
              background: #FFFFF0;
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border: 2px solid #D4AF37;
              border-radius: 20px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            h1 {
              color: #2D2D2D;
              font-size: 32px;
              margin: 0 0 10px 0;
            }
            .subtitle {
              color: #8B7355;
              font-size: 18px;
              margin: 0 0 30px 0;
              font-style: italic;
            }
            img {
              border: 4px solid #D4AF37;
              border-radius: 10px;
              margin: 20px 0;
            }
            .instructions {
              color: #2D2D2D;
              font-size: 16px;
              margin: 20px 0 10px 0;
              font-weight: bold;
            }
            .code {
              background: #F5F5DC;
              color: #2D2D2D;
              padding: 10px 20px;
              border-radius: 8px;
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 2px;
              margin-top: 10px;
              display: inline-block;
              border: 2px dashed #D4AF37;
            }
            .footer {
              color: #8B7355;
              font-size: 14px;
              margin-top: 30px;
            }
            @media print {
              body { background: white; }
              .container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Reflets de Bonheur</h1>
            <p class="subtitle">Partagez vos souvenirs de notre mariage</p>
            <img src="${dataUrl}" alt="QR Code" width="${size}" height="${size}" />
            <p class="instructions">Scannez ce code pour accéder à la galerie</p>
            ${includeCode ? `
              <p class="instructions">Ou utilisez le code :</p>
              <div class="code">${safeAccessCode}</div>
            ` : ''}
            <p class="footer">Merci de célébrer avec nous !</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }, [getSvgElement, accessCode, includeCode, size]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(galleryUrl);
    showToast('success', 'URL copiée dans le presse-papiers.');
  }, [galleryUrl, showToast]);

  return (
    <>
      <ToastContainer />
      <div className="bg-ivory rounded-xl border border-silver-mist p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-burgundy-old/20 rounded-lg">
          <QrCode className="text-burgundy-old" size={24} />
        </div>
        <div>
          <h3 className="font-serif font-bold text-deep-charcoal text-lg">
            QR Code Galerie
          </h3>
          <p className="text-warm-taupe text-sm">
            Facilitez l'accès à vos invités
          </p>
        </div>
        </div>

      {/* QR Code Preview */}
        <div className="bg-white rounded-xl p-6 mb-6 border-2 border-burgundy-old/30 text-center">
          <div ref={containerRef} className="mx-auto rounded-lg shadow-md inline-block" style={{ width: size, height: size }}>
          <QRCodeSVG
            value={galleryUrl}
            size={size}
            bgColor="#FFFFF0"
            fgColor="#2D2D2D"
            level="M"
          />
          </div>
          <p className="text-warm-taupe text-sm mt-4">
            Scannez pour accéder à la galerie
          </p>
          <p className="text-silver-mist text-xs mt-1">
            {galleryUrl}
          </p>
        </div>

      {/* Settings */}
        <div className="space-y-4 mb-6">
        {/* Size Selector */}
        <div>
          <label className="block text-sm font-medium text-deep-charcoal mb-2">
            Taille du QR Code
          </label>
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full px-3 py-2 border border-silver-mist rounded-lg focus:ring-2 focus:ring-burgundy-old focus:border-burgundy-old transition-colors"
          >
            <option value={200}>Petit (200x200)</option>
            <option value={300}>Moyen (300x300)</option>
            <option value={400}>Grand (400x400)</option>
            <option value={500}>Très grand (500x500)</option>
          </select>
        </div>

        {/* Access Code Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-deep-charcoal">
            Inclure le code d'accès sur l'impression
          </label>
          <button
            onClick={() => setIncludeCode(!includeCode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              includeCode ? 'bg-burgundy-old' : 'bg-silver-mist'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-ivory transition-transform ${
                includeCode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {includeCode && (
          <div>
            <label className="block text-sm font-medium text-deep-charcoal mb-2">
              Code d'accès actuel
            </label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-silver-mist rounded-lg focus:ring-2 focus:ring-burgundy-old focus:border-burgundy-old transition-colors font-mono"
              placeholder="MARIAGE2026"
            />
          </div>
        )}
        </div>

      {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 bg-burgundy-old hover:bg-[#c92a38] text-white px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 shadow-xs"
        >
          <Download size={18} />
          Télécharger
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 bg-deep-charcoal hover:bg-deep-charcoal/90 text-ivory px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 shadow-xs"
        >
          <Printer size={18} />
          Imprimer
        </button>

        <button
          onClick={handleCopyUrl}
          className="flex items-center justify-center gap-2 bg-ivory hover:bg-silver-mist/30 text-deep-charcoal border border-silver-mist px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 shadow-xs"
        >
          <Share2 size={18} />
          Copier URL
        </button>
      </div>

      {/* Usage Tips */}
      <div className="mt-6 p-4 bg-soft-blush/30 rounded-lg border border-soft-blush/50">
        <h4 className="font-semibold text-deep-charcoal text-sm mb-2">
          Conseils d'utilisation
        </h4>
        <ul className="text-warm-taupe text-xs space-y-1">
          <li>Imprimez le QR code sur les cartons de table</li>
          <li>Placez-le à l'entrée de la réception</li>
          <li>Incluez-le dans le programme de la cérémonie</li>
          <li>Partagez-le sur les réseaux sociaux avant l'événement</li>
        </ul>
        </div>
      </div>
    </>
  );
}
