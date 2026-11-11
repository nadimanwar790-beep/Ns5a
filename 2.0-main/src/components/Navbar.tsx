import React, { useState } from 'react';
import { ActiveTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Box,
  Brain,
  Calculator,
  ChevronDown,
  ChevronUp,
  Compass,
  Dices,
  Eye,
  EyeOff,
  Globe,
  Layers,
  Maximize2,
  Minimize2,
  Tv,
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: 'hi' | 'en';
  setLanguage: (lang: 'hi' | 'en') => void;
  projectorMode: boolean;
  setProjectorMode: (val: boolean) => void;
  focusMode: boolean;
  setFocusMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  diagramOnlyMode?: boolean;
  onToggleDiagramOnly?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  projectorMode,
  setProjectorMode,
  focusMode,
  setFocusMode,
  diagramOnlyMode = false,
  onToggleDiagramOnly,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const tabs: { id: ActiveTab; labelHi: string; labelEn: string; icon: React.ReactNode }[] = [
    {
      id: 'cutting_lab',
      labelHi: 'घन/घनाभ काटना',
      labelEn: 'Cube Slicing',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'shapes_3d',
      labelHi: '3D ठोस (बेलन, शंकु)',
      labelEn: '3D Solids',
      icon: <Box className="w-3.5 h-3.5" />,
    },
    {
      id: 'geometry_2d',
      labelHi: '2D ज्यामिति व चतुर्भुज',
      labelEn: '2D Geometry',
      icon: <Compass className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: 'dice_reasoning',
      labelHi: 'पासा रीज़निंग',
      labelEn: 'Dice Reasoning',
      icon: <Dices className="w-3.5 h-3.5" />,
    },
    {
      id: 'offline_solver',
      labelHi: 'ऑफ़लाइन सॉल्वर',
      labelEn: 'Offline Solver',
      icon: <Calculator className="w-3.5 h-3.5 text-indigo-400" />,
    },
    {
      id: 'quiz_practice',
      labelHi: 'अभ्यास क्विज़',
      labelEn: 'Quiz Practice',
      icon: <Brain className="w-3.5 h-3.5" />,
    },
  ];

  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

  // 1. COLLAPSED / FOCUS DIAGRAM MODE: Sleek Floating Mini Pill
  if (focusMode) {
    return (
      <header className="sticky top-1 z-50 flex justify-center px-2 pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 rounded-full px-3 py-1 shadow-2xl flex items-center gap-2 pointer-events-auto transition-all animate-fadeIn">
          {/* Active Tab Dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/50 transition-all"
            >
              {currentTabObj.icon}
              <span className="text-[11px] sm:text-xs">{language === 'hi' ? currentTabObj.labelHi : currentTabObj.labelEn}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {mobileMenuOpen && (
              <div className="absolute top-8 left-0 w-48 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-50 flex flex-col gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-left transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {tab.icon}
                    <span>{language === 'hi' ? tab.labelHi : tab.labelEn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-3 w-px bg-slate-700" />

          {/* Quick Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
            className="text-[10px] font-bold text-slate-300 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 flex items-center gap-1"
          >
            <Globe className="w-3 h-3 text-indigo-400" />
            <span>{language === 'hi' ? 'EN' : 'हिंदी'}</span>
          </button>

          {/* Restore Full Header Button */}
          <button
            id="btn-exit-focus-mode"
            onClick={() => setFocusMode(false)}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/50 px-2 py-0.5 rounded-full transition-all shadow-sm cursor-pointer"
            title={language === 'hi' ? 'पूरा मेनू वापस लाएं' : 'Show Full Menu'}
          >
            <Eye className="w-3 h-3 text-emerald-400" />
            <span>{language === 'hi' ? 'मेनू दिखाएं' : 'Show Menu'}</span>
          </button>

          {/* Only Diagram Button in Focus Pill */}
          <button
            id="btn-pill-only-diagram"
            onClick={onToggleDiagramOnly}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 px-2 py-0.5 rounded-full transition-all shadow-sm cursor-pointer"
            title={language === 'hi' ? 'केवल डायग्राम मोड (सिर्फ डायग्राम दिखेगा)' : 'Only Diagram Mode'}
          >
            <Maximize2 className="w-3 h-3 text-white" />
            <span>{language === 'hi' ? 'सिर्फ डायग्राम' : 'Only Diagram'}</span>
          </button>
        </div>
      </header>
    );
  }

  // 2. STANDARD COMPACT NAVBAR: Single-line streamlined layout
  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-lg">
      <div className={`${projectorMode ? 'w-full px-2 sm:px-4' : 'max-w-7xl mx-auto px-2 sm:px-4'} py-1.5 sm:py-2 transition-all`}>
        <div className="flex items-center justify-between gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <Box className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>3D Math Lab</span>
                <span className="text-[9px] font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-1.5 py-0.2 rounded-full">
                  Studio
                </span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs List (Scrollable horizontally) */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/90 overflow-x-auto max-w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 sm:gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tab.icon}
                  <span>{language === 'hi' ? tab.labelHi : tab.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* ONLY DIAGRAM MODE (ZEN DIAGRAM) BUTTON */}
            <button
              id="btn-only-diagram-mode"
              onClick={onToggleDiagramOnly}
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all shadow-md hover:shadow-emerald-500/25 hover:scale-105 cursor-pointer"
              title={language === 'hi' ? 'केवल डायग्राम मोड (बाकी सब छिपाएं) - शॉर्टकट "D"' : 'Only Diagram Mode (Hide everything else) - Shortcut "D"'}
            >
              <Maximize2 className="w-3.5 h-3.5 text-white" />
              <span className="hidden xs:inline">{language === 'hi' ? 'केवल डायग्राम' : 'Only Diagram'}</span>
            </button>

            {/* PWA 1-Click Install Button */}
            <PWAInstallButton language={language} variant="navbar" />

            {/* FOCUS / CLEAN VIEW BUTTON */}
            <button
              id="btn-toggle-focus-mode"
              onClick={() => setFocusMode(true)}
              className="px-2 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-[11px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 transition-all shadow-sm"
              title={language === 'hi' ? 'टॉप बार छिपाएं और डायग्राम बड़ा करें' : 'Hide Top Bar for Maximum Diagram View'}
            >
              <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">{language === 'hi' ? 'क्लीन व्यू' : 'Clean View'}</span>
            </button>

            {/* 16:9 Projector Mode */}
            <button
              id="btn-projector-toggle"
              onClick={() => setProjectorMode(!projectorMode)}
              className={`p-1 sm:px-2 sm:py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                projectorMode
                  ? 'bg-amber-500/20 border-amber-400/80 text-amber-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title="16:9 Widescreen Projector Mode"
            >
              <Tv className={`w-3.5 h-3.5 ${projectorMode ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">16:9</span>
            </button>

            {/* Fullscreen Button */}
            <button
              id="btn-fullscreen-toggle"
              onClick={toggleFullscreen}
              className="p-1 sm:p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all hidden sm:block"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Language Switcher */}
            <button
              id="btn-language-toggle"
              onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 font-semibold flex items-center gap-1 transition-all"
            >
              <Globe className="w-3 h-3 text-indigo-400" />
              <span>{language === 'hi' ? 'EN' : 'हिंदी'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

