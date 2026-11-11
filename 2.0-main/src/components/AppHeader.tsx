import React, { useState } from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Box,
  Sparkles,
  Maximize2,
  Minimize2,
  Globe,
} from 'lucide-react';
import { ShapeType } from '../types';

export type Shape3DChoice =
  | 'cube_lab'
  | 'dice_reasoning'
  | ShapeType;

interface AppHeaderProps {
  selected3DShape: Shape3DChoice;
  setSelected3DShape: (shape: Shape3DChoice) => void;
  language: 'hi' | 'en';
  setLanguage: (lang: 'hi' | 'en') => void;
  diagramOnlyMode: boolean;
  onToggleDiagramOnly: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  selected3DShape,
  setSelected3DShape,
  language,
  setLanguage,
  diagramOnlyMode,
  onToggleDiagramOnly,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 3D Shapes list (Default is cube_lab)
  const shapes3D: { id: Shape3DChoice; nameHi: string; nameEn: string; icon: string; badgeHi?: string; badgeEn?: string }[] = [
    { id: 'cube_lab', nameHi: '🧊 घन-घनाभ विज़ुअल लैब', nameEn: '🧊 Cube-Cuboid Visual Lab', icon: '🧊', badgeHi: 'डिफ़ॉल्ट', badgeEn: 'Default' },
    { id: 'dice_reasoning', nameHi: '🎲 पासा रीज़निंग व नेट', nameEn: '🎲 Dice Reasoning', icon: '🎲' },
    { id: 'cylinder', nameHi: '🛢️ बेलन (Cylinder)', nameEn: '🛢️ Cylinder', icon: '🛢️' },
    { id: 'hollow_cylinder', nameHi: '🔘 खोखला बेलन', nameEn: '🔘 Hollow Cylinder', icon: '🔘' },
    { id: 'cone', nameHi: '🍦 शंकु (Cone)', nameEn: '🍦 Cone', icon: '🍦' },
    { id: 'sphere', nameHi: '🔮 गोला (Sphere)', nameEn: '🔮 Sphere', icon: '🔮' },
    { id: 'hemisphere', nameHi: '🥣 अर्धगोला', nameEn: '🥣 Hemisphere', icon: '🥣' },
    { id: 'frustum', nameHi: '🏺 छिन्नक (Frustum)', nameEn: '🏺 Frustum', icon: '🏺' },
    { id: 'prism', nameHi: '🔺 प्रिज्म (Prism)', nameEn: '🔺 Prism', icon: '🔺' },
    { id: 'pyramid', nameHi: '⛺ पिरामिड (Pyramid)', nameEn: '⛺ Pyramid', icon: '⛺' },
    { id: 'wheel', nameHi: '⚙️ पहिया / रोलर', nameEn: '⚙️ Wheel / Roller', icon: '⚙️' },
  ];

  return (
    <header className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 shadow-lg">
      {/* 1. TOP BRANDING & PRIMARY CONTROLS BAR */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-white/20">
              <Box className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                {language === 'hi' ? 'गणित 3D विज़ुअल स्टूडियो' : 'Math 3D Visual Studio'}
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                100% Offline
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight hidden xs:block">
              {language === 'hi'
                ? 'घन-घनाभ • ठोस आकृतियां • पासा • स्पर्श इंटरैक्शन'
                : 'Solids • Cube-Cuboid • Dice • Touch Interaction'}
            </p>
          </div>
        </div>

        {/* PRIMARY FILTER: the studio is intentionally dedicated to 3D scenes */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs font-bold text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'hi' ? 'इंटरैक्टिव 3D स्टूडियो' : 'Interactive 3D Studio'}</span>
          </div>

          {/* UTILITY ACTIONS: Language + Fullscreen */}
          <div className="flex items-center gap-1">
            <button
              id="lang-toggle-btn"
              onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700/80 transition-all cursor-pointer"
              title="Toggle Language / भाषा बदलें"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'hi' ? 'English' : 'हिन्दी'}</span>
            </button>

            <button
              id="fullscreen-toggle-btn"
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <PWAInstallButton language={language} />
          </div>
        </div>
      </div>

      {/* 2. Shape selector */}
      <div className="w-full bg-slate-950/80 border-t border-slate-800/60 px-2 sm:px-4 py-1.5 overflow-x-auto no-scrollbar shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 min-w-max">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>{language === 'hi' ? '3D आकृतियां:' : '3D Shapes:'}</span>
            </div>

            {shapes3D.map((item) => {
                  const isSelected = selected3DShape === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`shape-3d-${item.id}`}
                      onClick={() => {
                        setSelected3DShape(item.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-300'
                          : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span>{language === 'hi' ? item.nameHi : item.nameEn}</span>
                      {item.badgeHi && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {language === 'hi' ? item.badgeHi : item.badgeEn}
                        </span>
                      )}
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  );
                })}
          </div>
        </div>
    </header>
  );
};
