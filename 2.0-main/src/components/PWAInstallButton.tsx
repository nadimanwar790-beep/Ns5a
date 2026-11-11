import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  language: 'hi' | 'en';
  variant?: 'navbar' | 'floating' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  language,
  variant = 'navbar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running in standalone PWA mode, don't show the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (res) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback instruction dialog for browsers that haven't fired beforeinstallprompt yet
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {/* NAVBAR VARIANT */}
      {variant === 'navbar' && (
        <button
          id="btn-pwa-install-nav"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition-all shadow-md shadow-emerald-950 cursor-pointer border border-emerald-400/30 shrink-0"
          title={language === 'hi' ? 'फोन या कंप्यूटर में ऐप इंस्टॉल करें' : 'Install App on Device'}
        >
          {installSuccess ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-white" />
              <span>{language === 'hi' ? 'इंस्टॉल हो गया!' : 'Installed!'}</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">
                {language === 'hi' ? 'ऐप इंस्टॉल करें' : 'Install App'}
              </span>
              <span className="sm:hidden">
                {language === 'hi' ? 'इंस्टॉल' : 'Install'}
              </span>
            </>
          )}
        </button>
      )}

      {/* FLOATING VARIANT (Optional for bottom right) */}
      {variant === 'floating' && (
        <button
          id="btn-pwa-install-float"
          onClick={handleInstallClick}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all border border-emerald-400/40 cursor-pointer"
        >
          <Smartphone className="w-4 h-4 animate-bounce" />
          <span>{language === 'hi' ? '📱 ऑफ़लाइन ऐप इंस्टॉल करें' : '📱 Install PWA App'}</span>
        </button>
      )}

      {/* INSTALL GUIDE MODAL (for iOS or manual installation guide) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl relative text-slate-200">
            {/* Close Button */}
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            {/* App Icon + Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-indigo-500/50 flex items-center justify-center p-1 shadow-lg">
                <img src="/pwa-192x192.png" alt="App Icon" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'hi' ? 'ऐप इंस्टॉल कैसे करें?' : 'How to Install this App?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'hi' ? '100% ऑफ़लाइन इस्तेमाल के लिए' : 'For 100% Offline Access'}
                </p>
              </div>
            </div>

            {/* Steps Guide */}
            <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-900/60 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-700/50">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {language === 'hi' ? 'सफारी (Safari) में शेयर बटन दबाएं' : 'Tap the Share Button in Safari'}
                      </p>
                      <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                        <Share className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{language === 'hi' ? 'नीचे बार में शेयर आइकॉन' : 'Bottom toolbar share icon'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-900/60 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-700/50">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {language === 'hi' ? '"होम स्क्रीन में जोड़ें" चुनें' : 'Select "Add to Home Screen"'}
                      </p>
                      <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                        <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'hi' ? 'स्क्रॉल करके Add to Home Screen दबाएं' : 'Scroll down and tap Add'}</span>
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-900/60 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-700/50">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {language === 'hi' ? 'ब्राउज़र के 3-डॉट मेनू (⋮) पर क्लिक करें' : 'Click the 3-dot Browser Menu (⋮)'}
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        {language === 'hi' ? 'Chrome, Edge या Brave ब्राउज़र में ऊपर दाईं ओर' : 'Top right corner of Chrome/Edge'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-900/60 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-700/50">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {language === 'hi' ? '"ऐप इंस्टॉल करें" / "Add to Home Screen" चुनें' : 'Select "Install app" / "Add to Home screen"'}
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        {language === 'hi' ? 'यह आपके डिवाइस में बिना इंटरनेट चलने वाली नेटिव ऐप की तरह सेव हो जाएगा।' : 'The app will launch directly like a native standalone app.'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs transition-all shadow-lg"
            >
              {language === 'hi' ? 'समझ गया (OK)' : 'Got it!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
