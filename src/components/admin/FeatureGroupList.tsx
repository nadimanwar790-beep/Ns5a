
import React, { useState } from 'react';
import { Feature, FeatureGroup, ALL_FEATURES } from '../../utils/featureRegistry';
import { SystemSettings } from '../../types';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
    onNavigate: (tab: string) => void;
    activeTab: string;
    counts?: Record<string, number>;
    hasPermission: (perm: string) => boolean;
    userRole: string;
    settings?: SystemSettings; // NEW: To check defaultAdminPermissions
}

const GROUPS: { key: FeatureGroup; label: string; icon: keyof typeof LucideIcons; color: string }[] = [
    { key: 'CORE', label: 'Core Management', icon: 'Box', color: 'blue' },
    { key: 'REQUESTS', label: 'User Requests', icon: 'Inbox', color: 'indigo' },
    { key: 'REVISION', label: 'Revision Hub', icon: 'BrainCircuit', color: 'pink' },
    { key: 'CONTENT', label: 'Content & Analysis', icon: 'BarChart3', color: 'purple' },
    { key: 'AI', label: 'AI & Intelligence', icon: 'Sparkles', color: 'violet' },
    { key: 'GAME', label: 'Gamification', icon: 'Gamepad2', color: 'orange' },
    { key: 'ADVANCED', label: 'Advanced Settings', icon: 'Settings', color: 'slate' },
];

export const FeatureGroupList: React.FC<Props> = ({ onNavigate, activeTab, counts, hasPermission, userRole, settings }) => {
    // Default open the group that contains the active tab, or CORE
    const findGroupForTab = (tab: string) => {
        const feature = ALL_FEATURES.find(f => f.adminTab === tab);
        return feature ? feature.group : 'CORE';
    };

    const [expandedGroup, setExpandedGroup] = useState<FeatureGroup>(findGroupForTab(activeTab));

    const handleGroupClick = (group: FeatureGroup) => {
        if (expandedGroup === group) {
            // Keep one open or allow toggle
        } else {
            setExpandedGroup(group);
        }
    };

    const renderIcon = (name: string, size: number = 20, className?: string) => {
        const Icon = (LucideIcons as any)[name];
        return Icon ? <Icon size={size} className={className} /> : <LucideIcons.HelpCircle size={size} className={className} />;
    };

    const getColorClasses = (colorName?: string, isActive?: boolean) => {
        if (isActive) return 'bg-indigo-600 text-white shadow-md';
        switch (colorName) {
            case 'red':
            case 'rose':
                return 'bg-rose-50 text-rose-500 group-hover:bg-rose-100';
            case 'blue':
                return 'bg-blue-50 text-blue-600 group-hover:bg-blue-100';
            case 'purple':
            case 'violet':
                return 'bg-purple-50 text-purple-600 group-hover:bg-purple-100';
            case 'amber':
            case 'yellow':
                return 'bg-amber-50 text-amber-600 group-hover:bg-amber-100';
            case 'orange':
                return 'bg-orange-50 text-orange-500 group-hover:bg-orange-100';
            case 'emerald':
            case 'green':
                return 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100';
            case 'pink':
                return 'bg-pink-50 text-pink-600 group-hover:bg-pink-100';
            case 'indigo':
                return 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100';
            default:
                return 'bg-slate-50 text-slate-600 group-hover:bg-slate-100';
        }
    };

    return (
        <div className="space-y-4">
            {GROUPS.map((group) => {
                const isExpanded = expandedGroup === group.key;
                const groupFeatures = ALL_FEATURES.filter(f => {
                    if (f.group !== group.key || !f.adminVisible || !f.adminTab) return false;

                    const roleUpper = String(userRole || '').toUpperCase();
                    const isFullAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN' || roleUpper === 'SUPER_ADMIN' || roleUpper !== 'SUB_ADMIN';

                    // 1. Super Admin Check
                    if (f.requiresSuperAdmin && !isFullAdmin) return false;

                    // 2. Sub-Admin Global Master Switch (Feature Access Page Control)
                    // If user is SUB_ADMIN, we check if the feature ID is in defaultAdminPermissions
                    if (roleUpper === 'SUB_ADMIN' && settings?.defaultAdminPermissions) {
                        if (!settings.defaultAdminPermissions.includes(f.id)) return false;
                    }

                    // 3. Granular Permission Check
                    if (f.requiredPermission) {
                        return isFullAdmin || hasPermission(f.requiredPermission);
                    }

                    return true;
                });

                if (groupFeatures.length === 0) return null;

                const GroupIcon = (LucideIcons as any)[group.icon];

                return (
                    <div key={group.key} className={`rounded-3xl border transition-all duration-300 overflow-hidden ${isExpanded ? `bg-white border-slate-200/90 shadow-sm` : 'bg-white border-slate-200/60 hover:border-slate-300 shadow-xs'}`}>
                        {/* HEADER */}
                        <button
                            onClick={() => handleGroupClick(group.key)}
                            className={`w-full p-4 flex items-center justify-between transition-colors ${isExpanded ? 'bg-slate-50/70 border-b border-slate-100' : 'bg-white hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-50 text-indigo-600 shadow-xs' : 'bg-slate-100 text-slate-600'}`}>
                                    {GroupIcon && <GroupIcon size={20} />}
                                </div>
                                <span className="font-black text-sm uppercase tracking-wider text-slate-800">
                                    {group.label}
                                </span>
                                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${isExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {groupFeatures.length}
                                </span>
                            </div>
                            <div className={isExpanded ? 'text-indigo-600' : 'text-slate-300'}>
                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </div>
                        </button>

                        {/* CONTENT GRID - CLEAN 4-COLUMN RESPONSIVE GRID (AS SHOWN IN PHOTOS) */}
                        {isExpanded && (
                            <div className="p-3 sm:p-4 grid grid-cols-4 gap-2 sm:gap-3 bg-white">
                                {groupFeatures.map(feature => {
                                    const isActive = activeTab === feature.adminTab;
                                    const count = counts?.[feature.id];
                                    const iconColorClasses = getColorClasses(feature.color, isActive);

                                    return (
                                        <button
                                            key={feature.id}
                                            onClick={() => onNavigate(feature.adminTab!)}
                                            className={`
                                                relative p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group min-h-[78px] text-center cursor-pointer
                                                ${isActive
                                                    ? 'bg-indigo-50/70 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                                                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5'
                                                }
                                            `}
                                        >
                                            <div className={`
                                                w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0
                                                ${iconColorClasses}
                                            `}>
                                                {renderIcon(feature.icon || 'Circle', 18)}
                                            </div>
                                            <span className={`
                                                font-bold text-[10px] sm:text-[11px] text-center transition-colors leading-tight line-clamp-2 w-full
                                                ${isActive ? 'text-indigo-950 font-black' : 'text-slate-700 group-hover:text-slate-900'}
                                            `}>
                                                {feature.label}
                                            </span>

                                            {isActive && (
                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                            )}

                                            {count !== undefined && count > 0 && (
                                                <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                                    {count}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
