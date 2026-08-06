import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, MoreVertical, X } from 'lucide-react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deviceType, setDeviceType] = useState('other'); // 'ios', 'android', 'other'

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone;
    
    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    // Detect device type
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);

    if (isIOS) {
      setDeviceType('ios');
      setIsVisible(true); // iOS does not fire beforeinstallprompt, show button manually
    } else if (isAndroid) {
      setDeviceType('android');
      // Show button on Android after a small delay in case beforeinstallprompt doesn't fire
      // (e.g. testing locally over non-localhost HTTP)
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      setShowModal(false);
      console.log('App successfully installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // If native prompt is available, use it!
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsVisible(false);
      return;
    }

    // If native prompt is not available, show manual instructions modal
    setShowModal(true);
  };

  if (!isVisible) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        aria-label="Install App"
        title="Install App"
        className="tap group fixed right-4 bottom-24 z-50 flex items-center gap-2 rounded-full bg-linear-to-br from-wine-500 to-wine-700 px-4 py-2.5 text-cream-50 shadow-fab transition-all duration-300 ease-out hover:scale-105 active:scale-[0.93] sm:right-6 sm:bottom-6"
      >
        <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-blush-300/30" />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-blush-300/0 transition-colors duration-300 group-hover:bg-blush-300/12" />
        <Download className="size-4 animate-bounce" strokeWidth={2.5} />
        <span className="text-[13px] font-semibold tracking-tight">Install App</span>
      </button>

      {/* Manual Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum-950/40 p-4 backdrop-blur-xs sm:items-center">
          <div className="relative w-full max-w-sm rounded-2xl border border-blush-200/60 bg-cream-50 p-6 shadow-xl anim-fade-up">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-plum-900/60 hover:text-plum-900"
            >
              <X className="size-5" />
            </button>

            <h3 className="pr-6 text-lg font-bold text-plum-900">Install Shri Hari Sweets</h3>
            <p className="mt-2 text-sm text-plum-950/70">
              Add this app to your home screen for quick, offline-capable access to the order manager.
            </p>

            <div className="mt-6 space-y-4">
              {deviceType === 'ios' ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-plum-100 text-plum-900">
                      <Share className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-plum-900">Step 1</p>
                      <p className="text-xs text-plum-950/60">
                        Tap the <span className="font-semibold">Share</span> button at the bottom of the Safari screen.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-plum-100 text-plum-900">
                      <PlusSquare className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-plum-900">Step 2</p>
                      <p className="text-xs text-plum-950/60">
                        Scroll down and select <span className="font-semibold">Add to Home Screen</span>.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-plum-100 text-plum-900">
                      <MoreVertical className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-plum-900">Step 1</p>
                      <p className="text-xs text-plum-950/60">
                        Tap the menu icon (<span className="font-semibold">three vertical dots</span>) in Chrome's top right corner.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-plum-100 text-plum-900">
                      <PlusSquare className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-plum-900">Step 2</p>
                      <p className="text-xs text-plum-950/60">
                        Select <span className="font-semibold">Add to Home screen</span> or <span className="font-semibold">Install app</span>.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full rounded-xl bg-plum-900 py-2.5 text-center text-sm font-bold text-cream-50 shadow-md transition-colors hover:bg-plum-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
