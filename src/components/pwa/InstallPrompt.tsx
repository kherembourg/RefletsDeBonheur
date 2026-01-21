import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Check if device is mobile
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Only show on mobile devices
    if (!isMobileDevice()) {
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if previously dismissed (permanent - only show once)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Show our custom prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Wait 3 seconds before showing
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA installed successfully');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal permanently (only show once)
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="bg-[#333333] text-[#F5F0E8] p-4 shadow-xl">
        <div className="flex items-start gap-3">
          {/* Icon with light background */}
          <div className="shrink-0 w-12 h-12 bg-[#F5F0E8] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="16" r="7" stroke="#ae1725" strokeWidth="2" fill="none"/>
              <circle cx="21" cy="16" r="7" stroke="#ae1725" strokeWidth="2" fill="none"/>
              <polygon points="11,7 9,10 13,10" fill="#ae1725"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            {/* Title with light color */}
            <h3 className="font-semibold text-sm mb-1 text-[#F5F0E8]">
              Installer l'application
            </h3>
            <p className="text-xs text-[#9B9B9B] mb-3">
              Accédez rapidement à vos photos depuis votre écran d'accueil
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-burgundy-old text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#c92a38] transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Installer
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-[#9B9B9B] hover:text-[#F5F0E8] transition-colors"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
