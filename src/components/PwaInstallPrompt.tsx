import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOSDevice, setIsIOSDevice] = useState(false);

    useEffect(() => {
        // Suppress if already running in standalone PWA mode
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        if (isStandalone) return;

        // Check if user already dismissed recently in this session
        if (sessionStorage.getItem('pwa_prompt_dismissed') === 'true') {
            return;
        }

        // Detect iOS
        const isIOS =
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isIOS) {
            setIsIOSDevice(true);
            // Delay slightly so it doesn't interfere with initial page load
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 3000);
            return () => clearTimeout(timer);
        }

        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            setIsVisible(false);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    // iOS Safari Guide
    if (isIOSDevice) {
        return (
            <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-88 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-4 z-[9999] border border-blue-200 dark:border-slate-800 animate-in slide-in-from-bottom-5 text-slate-800 dark:text-slate-100">
                <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl flex-shrink-0">
                        <Share2 size={22} />
                    </div>
                    <div className="flex-1 pr-4">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            iPhone पर Install करें
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Full-screen ऐप की तरह चलाने के लिए 2 आसान स्टेप्स:
                        </p>
                        <ol className="mt-2 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                            <li className="flex items-center gap-1.5">
                                <span className="font-bold text-blue-600">1.</span> Safari में नीचे <Share2 size={13} className="inline text-blue-500" /> <strong>Share</strong> बटन दबाएँ
                            </li>
                            <li className="flex items-center gap-1.5">
                                <span className="font-bold text-blue-600">2.</span> नीचे स्क्रॉल करके <PlusSquare size={13} className="inline text-emerald-500" /> <strong>&ldquo;Add to Home Screen&rdquo;</strong> चुनें
                            </li>
                        </ol>
                        <button
                            onClick={handleDismiss}
                            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                            समझ गया (Got it)
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    aria-label="Close"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute top-3 right-3 p-1"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    // Android / Desktop Chrome Prompt
    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-4 z-[9999] border border-blue-100 dark:border-slate-800 flex items-start gap-3 animate-in slide-in-from-bottom-5">
            <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-2 rounded-xl flex-shrink-0">
                <Download size={24} />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Install App</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Install our app on your device for a faster, better offline experience.</p>
                <div className="mt-3 flex gap-2">
                    <button
                        onClick={handleInstallClick}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                        Install
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
                    >
                        Later
                    </button>
                </div>
            </div>
            <button
                onClick={handleDismiss}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute top-2 right-2 p-1"
            >
                <X size={16} />
            </button>
        </div>
    );
};
