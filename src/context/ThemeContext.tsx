// SCIP Design System - Theme Context & Token Export Engine
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ColorToken {
  name: string;
  label: string;
  hex: string;
  tailwindClass: string;
  description: string;
}

export interface ThemePalette {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  primary: string; // hex
  primaryHover: string;
  primaryLight: string;
  primarySubtle: string;
  primaryBorder: string;
  accent: string;
  surfaceBg: string;
  surfaceCard: string;
  textPrimary: string;
  textMuted: string;
  borderMuted: string;
  tokens: ColorToken[];
}

export const PRESET_THEMES: ThemePalette[] = [
  {
    id: 'emerald-civic',
    name: 'Emerald Civic',
    tagline: 'Signature modern civic intelligence & environmental governance palette',
    badge: 'Signature',
    primary: '#059669', // emerald-600
    primaryHover: '#047857', // emerald-700
    primaryLight: '#ecfdf5', // emerald-50
    primarySubtle: '#d1fae5', // emerald-100
    primaryBorder: '#a7f3d0', // emerald-200
    accent: '#0d9488', // teal-600
    surfaceBg: '#f8fafc', // slate-50
    surfaceCard: '#ffffff',
    textPrimary: '#0f172a', // slate-900
    textMuted: '#64748b', // slate-500
    borderMuted: '#e2e8f0', // slate-200
    tokens: [
      { name: 'primary-600', label: 'Primary Brand', hex: '#059669', tailwindClass: 'bg-emerald-600', description: 'Primary action buttons, active navigation, key icons' },
      { name: 'primary-700', label: 'Primary Hover', hex: '#047857', tailwindClass: 'bg-emerald-700', description: 'Interactive button hover state, deep focus borders' },
      { name: 'primary-50', label: 'Primary Light', hex: '#ecfdf5', tailwindClass: 'bg-emerald-50', description: 'Soft active tab backgrounds, subtle badge fills' },
      { name: 'primary-200', label: 'Primary Border', hex: '#a7f3d0', tailwindClass: 'border-emerald-200', description: 'Highlighted card borders, active input boundaries' },
      { name: 'accent-teal', label: 'Accent Highlight', hex: '#0d9488', tailwindClass: 'bg-teal-600', description: 'Secondary metrics, chart series, geospatial pins' },
      { name: 'slate-900', label: 'Text Dominant', hex: '#0f172a', tailwindClass: 'text-slate-900', description: 'Headings, primary typography, brand wordmark' },
      { name: 'slate-600', label: 'Text Muted', hex: '#475569', tailwindClass: 'text-slate-600', description: 'Body text, breadcrumbs, table secondary values' },
      { name: 'slate-50', label: 'Canvas Surface', hex: '#f8fafc', tailwindClass: 'bg-slate-50', description: 'Main application background, quiet viewport container' },
      { name: 'amber-500', label: 'Warning Accent', hex: '#f59e0b', tailwindClass: 'text-amber-500', description: 'Moderate urgency alert badges, SLA reminders' },
      { name: 'rose-600', label: 'Critical Hazard', hex: '#e11d48', tailwindClass: 'bg-rose-600', description: 'High urgency alerts, incident escalations' }
    ]
  },
  {
    id: 'cobalt-logistics',
    name: 'Cobalt Enterprise',
    tagline: 'High-precision telemetry, supply chain analytics & aerospace UI',
    badge: 'Enterprise',
    primary: '#2563eb', // blue-600
    primaryHover: '#1d4ed8', // blue-700
    primaryLight: '#eff6ff', // blue-50
    primarySubtle: '#dbeafe', // blue-100
    primaryBorder: '#bfdbfe', // blue-200
    accent: '#0284c7', // sky-600
    surfaceBg: '#f8fafc',
    surfaceCard: '#ffffff',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
    borderMuted: '#e2e8f0',
    tokens: [
      { name: 'primary-600', label: 'Primary Brand', hex: '#2563eb', tailwindClass: 'bg-blue-600', description: 'Executive buttons, core links, dashboard highlights' },
      { name: 'primary-700', label: 'Primary Hover', hex: '#1d4ed8', tailwindClass: 'bg-blue-700', description: 'Hover and active button states' },
      { name: 'primary-50', label: 'Primary Light', hex: '#eff6ff', tailwindClass: 'bg-blue-50', description: 'Soft background surfaces and pills' },
      { name: 'primary-200', label: 'Primary Border', hex: '#bfdbfe', tailwindClass: 'border-blue-200', description: 'Metric card outlines' },
      { name: 'accent-sky', label: 'Accent Highlight', hex: '#0284c7', tailwindClass: 'bg-sky-600', description: 'Shipment paths and network graphs' },
      { name: 'slate-900', label: 'Text Dominant', hex: '#0f172a', tailwindClass: 'text-slate-900', description: 'Standard primary typography' },
      { name: 'slate-600', label: 'Text Muted', hex: '#475569', tailwindClass: 'text-slate-600', description: 'Secondary labels' },
      { name: 'slate-50', label: 'Canvas Surface', hex: '#f8fafc', tailwindClass: 'bg-slate-50', description: 'Standard background' },
      { name: 'amber-500', label: 'Warning Accent', hex: '#f59e0b', tailwindClass: 'text-amber-500', description: 'Supply disruption warnings' },
      { name: 'rose-600', label: 'Critical Alert', hex: '#e11d48', tailwindClass: 'bg-rose-600', description: 'Contract breaches and stockouts' }
    ]
  },
  {
    id: 'amethyst-governance',
    name: 'Amethyst Insight',
    tagline: 'Deep purple palette for AI decision systems & legal charters',
    badge: 'Executive',
    primary: '#7c3aed', // violet-600
    primaryHover: '#6d28d9', // violet-700
    primaryLight: '#f5f3ff', // violet-50
    primarySubtle: '#ede9fe', // violet-100
    primaryBorder: '#ddd6fe', // violet-200
    accent: '#c026d3', // fuchsia-600
    surfaceBg: '#faf5ff',
    surfaceCard: '#ffffff',
    textPrimary: '#1e1b4b',
    textMuted: '#6b7280',
    borderMuted: '#e5e7eb',
    tokens: [
      { name: 'primary-600', label: 'Primary Brand', hex: '#7c3aed', tailwindClass: 'bg-violet-600', description: 'Auditing CTAs and AI agent triggers' },
      { name: 'primary-700', label: 'Primary Hover', hex: '#6d28d9', tailwindClass: 'bg-violet-700', description: 'Active hover accent' },
      { name: 'primary-50', label: 'Primary Light', hex: '#f5f3ff', tailwindClass: 'bg-violet-50', description: 'Subtle charter quotes' },
      { name: 'primary-200', label: 'Primary Border', hex: '#ddd6fe', tailwindClass: 'border-violet-200', description: 'Card focus rings' },
      { name: 'accent-fuchsia', label: 'Accent Highlight', hex: '#c026d3', tailwindClass: 'bg-fuchsia-600', description: 'Confidence interval badges' },
      { name: 'slate-900', label: 'Text Dominant', hex: '#1e1b4b', tailwindClass: 'text-indigo-950', description: 'Primary headings' },
      { name: 'slate-600', label: 'Text Muted', hex: '#6b7280', tailwindClass: 'text-gray-500', description: 'Supporting descriptions' },
      { name: 'slate-50', label: 'Canvas Surface', hex: '#faf5ff', tailwindClass: 'bg-purple-50/50', description: 'Background tint' },
      { name: 'amber-500', label: 'Warning Accent', hex: '#f59e0b', tailwindClass: 'text-amber-500', description: 'Bias detection flag' },
      { name: 'rose-600', label: 'Critical Alert', hex: '#e11d48', tailwindClass: 'bg-rose-600', description: 'Human review required' }
    ]
  },
  {
    id: 'amber-emergency',
    name: 'Amber Sentinel',
    tagline: 'High-contrast emergency management, municipal hazard dispatch & utility safety',
    badge: 'Tactical',
    primary: '#d97706', // amber-600
    primaryHover: '#b45309', // amber-700
    primaryLight: '#fffbeb', // amber-50
    primarySubtle: '#fef3c7', // amber-100
    primaryBorder: '#fde68a', // amber-200
    accent: '#ea580c', // orange-600
    surfaceBg: '#fffdfa',
    surfaceCard: '#ffffff',
    textPrimary: '#1c1917',
    textMuted: '#78716c',
    borderMuted: '#e7e5e4',
    tokens: [
      { name: 'primary-600', label: 'Primary Brand', hex: '#d97706', tailwindClass: 'bg-amber-600', description: 'Dispatch action buttons' },
      { name: 'primary-700', label: 'Primary Hover', hex: '#b45309', tailwindClass: 'bg-amber-700', description: 'Hover response state' },
      { name: 'primary-50', label: 'Primary Light', hex: '#fffbeb', tailwindClass: 'bg-amber-50', description: 'Advisory alert banner' },
      { name: 'primary-200', label: 'Primary Border', hex: '#fde68a', tailwindClass: 'border-amber-200', description: 'Incident cluster perimeter' },
      { name: 'accent-orange', label: 'Accent Highlight', hex: '#ea580c', tailwindClass: 'bg-orange-600', description: 'Severe warning beacon' },
      { name: 'slate-900', label: 'Text Dominant', hex: '#1c1917', tailwindClass: 'text-stone-900', description: 'Tactical headers' },
      { name: 'slate-600', label: 'Text Muted', hex: '#78716c', tailwindClass: 'text-stone-500', description: 'Sensor timestamps' },
      { name: 'slate-50', label: 'Canvas Surface', hex: '#fffdfa', tailwindClass: 'bg-stone-50', description: 'Main background' },
      { name: 'amber-500', label: 'Warning Accent', hex: '#f59e0b', tailwindClass: 'text-amber-500', description: 'Caution triage' },
      { name: 'rose-600', label: 'Critical Alert', hex: '#dc2626', tailwindClass: 'bg-red-600', description: 'Immediate evacuation alert' }
    ]
  },
  {
    id: 'nordic-teal',
    name: 'Nordic Slate',
    tagline: 'Minimalist Scandinavian municipal design with deep teal & cool slate',
    badge: 'Minimal',
    primary: '#0f766e', // teal-700
    primaryHover: '#115e59', // teal-800
    primaryLight: '#f0fdfa', // teal-50
    primarySubtle: '#ccfbf1', // teal-100
    primaryBorder: '#99f6e4', // teal-200
    accent: '#475569', // slate-600
    surfaceBg: '#f8fafc',
    surfaceCard: '#ffffff',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
    borderMuted: '#cbd5e1',
    tokens: [
      { name: 'primary-700', label: 'Primary Brand', hex: '#0f766e', tailwindClass: 'bg-teal-700', description: 'Quiet authority controls' },
      { name: 'primary-800', label: 'Primary Hover', hex: '#115e59', tailwindClass: 'bg-teal-800', description: 'Active hover feedback' },
      { name: 'primary-50', label: 'Primary Light', hex: '#f0fdfa', tailwindClass: 'bg-teal-50', description: 'Report status tags' },
      { name: 'primary-200', label: 'Primary Border', hex: '#99f6e4', tailwindClass: 'border-teal-200', description: 'Table row focus' },
      { name: 'accent-slate', label: 'Accent Highlight', hex: '#475569', tailwindClass: 'bg-slate-600', description: 'Secondary graphs' },
      { name: 'slate-900', label: 'Text Dominant', hex: '#0f172a', tailwindClass: 'text-slate-900', description: 'Clean headers' },
      { name: 'slate-600', label: 'Text Muted', hex: '#64748b', tailwindClass: 'text-slate-500', description: 'Field notes' },
      { name: 'slate-50', label: 'Canvas Surface', hex: '#f8fafc', tailwindClass: 'bg-slate-50', description: 'Clean background' },
      { name: 'amber-500', label: 'Warning Accent', hex: '#f59e0b', tailwindClass: 'text-amber-500', description: 'Review flag' },
      { name: 'rose-600', label: 'Critical Alert', hex: '#e11d48', tailwindClass: 'bg-rose-600', description: 'Issue block' }
    ]
  },
  {
    id: 'cyber-obsidian',
    name: 'Cyber Obsidian',
    tagline: 'Dark mode tactical operations command center with high-contrast emerald neon',
    badge: 'Dark Mode',
    primary: '#10b981', // emerald-500
    primaryHover: '#34d399', // emerald-400
    primaryLight: 'rgba(16, 185, 129, 0.12)',
    primarySubtle: 'rgba(16, 185, 129, 0.20)',
    primaryBorder: 'rgba(16, 185, 129, 0.35)',
    accent: '#38bdf8', // sky-400
    surfaceBg: '#090d16',
    surfaceCard: '#111827',
    textPrimary: '#f9fafb',
    textMuted: '#9ca3af',
    borderMuted: '#1f2937',
    tokens: [
      { name: 'primary-500', label: 'Neon Primary', hex: '#10b981', tailwindClass: 'bg-emerald-500', description: 'Command center active lights and CTAs' },
      { name: 'primary-400', label: 'Primary Hover', hex: '#34d399', tailwindClass: 'bg-emerald-400', description: 'High-contrast glowing hover' },
      { name: 'primary-glow', label: 'Primary Glow', hex: 'rgba(16,185,129,0.15)', tailwindClass: 'bg-emerald-950/40', description: 'Radar sweep and active tab fills' },
      { name: 'primary-border', label: 'Neon Border', hex: 'rgba(16,185,129,0.4)', tailwindClass: 'border-emerald-500/40', description: 'Tactical borders' },
      { name: 'accent-sky', label: 'Accent Neon', hex: '#38bdf8', tailwindClass: 'bg-sky-400', description: 'Satellite coordinate overlays' },
      { name: 'text-primary', label: 'Text Dominant', hex: '#f9fafb', tailwindClass: 'text-slate-100', description: 'High-contrast typography' },
      { name: 'text-muted', label: 'Text Muted', hex: '#9ca3af', tailwindClass: 'text-slate-400', description: 'Dark telemetry labels' },
      { name: 'surface-bg', label: 'Canvas Surface', hex: '#090d16', tailwindClass: 'bg-slate-950', description: 'Night command canvas' },
      { name: 'amber-400', label: 'Warning Neon', hex: '#fbbf24', tailwindClass: 'text-amber-400', description: 'Hazard warnings' },
      { name: 'rose-500', label: 'Critical Flash', hex: '#f43f5e', tailwindClass: 'bg-rose-500', description: 'Breach alarms' }
    ]
  }
];

interface ThemeContextType {
  activeTheme: ThemePalette;
  themeId: string;
  setTheme: (id: string) => void;
  isThemeStudioOpen: boolean;
  openThemeStudio: () => void;
  closeThemeStudio: () => void;
  exportTailwindV4: string;
  exportTailwindV3: string;
  exportCssVariables: string;
  exportReactSnippet: string;
  exportTokensJson: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('scip_theme_palette');
      if (saved && PRESET_THEMES.some(t => t.id === saved)) {
        return saved;
      }
    } catch {
      // LocalStorage unavailable
    }
    return 'emerald-civic';
  });

  const [isThemeStudioOpen, setIsThemeStudioOpen] = useState(false);

  const activeTheme = PRESET_THEMES.find(t => t.id === themeId) || PRESET_THEMES[0];

  useEffect(() => {
    try {
      localStorage.setItem('scip_theme_palette', themeId);
    } catch {
      // ignore
    }

    // Apply CSS custom properties to document root
    const root = document.documentElement;
    root.style.setProperty('--color-theme-primary', activeTheme.primary);
    root.style.setProperty('--color-theme-primary-hover', activeTheme.primaryHover);
    root.style.setProperty('--color-theme-primary-light', activeTheme.primaryLight);
    root.style.setProperty('--color-theme-primary-subtle', activeTheme.primarySubtle);
    root.style.setProperty('--color-theme-primary-border', activeTheme.primaryBorder);
    root.style.setProperty('--color-theme-accent', activeTheme.accent);
    root.style.setProperty('--color-theme-surface-bg', activeTheme.surfaceBg);
    root.style.setProperty('--color-theme-surface-card', activeTheme.surfaceCard);
    root.style.setProperty('--color-theme-text-primary', activeTheme.textPrimary);
    root.style.setProperty('--color-theme-text-muted', activeTheme.textMuted);
    root.style.setProperty('--color-theme-border-muted', activeTheme.borderMuted);
  }, [themeId, activeTheme]);

  const setTheme = (id: string) => {
    if (PRESET_THEMES.some(t => t.id === id)) {
      setThemeId(id);
    }
  };

  // Code Export Generators for the user's project
  const exportTailwindV4 = `/* =========================================================================
   TAILWIND CSS v4 THEME CONFIGURATION (${activeTheme.name})
   Add this to your src/index.css or main globals.css
   ========================================================================= */

@import "tailwindcss";

@theme {
  --color-brand-primary: ${activeTheme.primary};
  --color-brand-hover: ${activeTheme.primaryHover};
  --color-brand-light: ${activeTheme.primaryLight};
  --color-brand-subtle: ${activeTheme.primarySubtle};
  --color-brand-border: ${activeTheme.primaryBorder};
  --color-brand-accent: ${activeTheme.accent};
  --color-brand-bg: ${activeTheme.surfaceBg};
  --color-brand-card: ${activeTheme.surfaceCard};
  --color-brand-text: ${activeTheme.textPrimary};
  --color-brand-muted: ${activeTheme.textMuted};
  --color-brand-line: ${activeTheme.borderMuted};
}

/* Usage examples in your HTML / JSX:
   <button class="bg-brand-primary hover:bg-brand-hover text-white px-4 py-2 rounded-lg font-medium shadow-xs">
     Submit Observation
   </button>
   <div class="bg-brand-light border border-brand-border text-brand-primary p-4 rounded-xl">
     Civic Alert Notice
   </div>
*/`;

  const exportTailwindV3 = `// =========================================================================
// TAILWIND CSS v3 CONFIGURATION (${activeTheme.name})
// Merge this into your tailwind.config.js (under theme.extend.colors)
// =========================================================================

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '${activeTheme.primary}',
          hover: '${activeTheme.primaryHover}',
          light: '${activeTheme.primaryLight}',
          subtle: '${activeTheme.primarySubtle}',
          border: '${activeTheme.primaryBorder}',
          accent: '${activeTheme.accent}',
          canvas: '${activeTheme.surfaceBg}',
          card: '${activeTheme.surfaceCard}',
          dark: '${activeTheme.textPrimary}',
          muted: '${activeTheme.textMuted}',
          line: '${activeTheme.borderMuted}',
        },
      },
    },
  },
  plugins: [],
};`;

  const exportCssVariables = `/* =========================================================================
   UNIVERSAL CSS VARIABLES (${activeTheme.name})
   Compatible with vanilla HTML/CSS, React, Vue, Next.js, Angular, Svelte
   ========================================================================= */

:root {
  /* Brand Primary Colors */
  --color-primary: ${activeTheme.primary};
  --color-primary-hover: ${activeTheme.primaryHover};
  --color-primary-light: ${activeTheme.primaryLight};
  --color-primary-subtle: ${activeTheme.primarySubtle};
  --color-primary-border: ${activeTheme.primaryBorder};

  /* Accent & Complementary */
  --color-accent: ${activeTheme.accent};

  /* Surfaces & Structural Containers */
  --color-surface-bg: ${activeTheme.surfaceBg};
  --color-surface-card: ${activeTheme.surfaceCard};
  --color-border-subtle: ${activeTheme.borderMuted};

  /* Typography */
  --color-text-primary: ${activeTheme.textPrimary};
  --color-text-muted: ${activeTheme.textMuted};

  /* Focus & Rings */
  --color-ring: ${activeTheme.primary}40;
}

/* Quick CSS Utility Classes */
.btn-primary {
  background-color: var(--color-primary);
  color: #ffffff;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-primary:hover {
  background-color: var(--color-primary-hover);
}
.badge-subtle {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-border);
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}`;

  const exportReactSnippet = `// =========================================================================
// REACT THEME PROVIDER & HOOK (${activeTheme.name})
// Drop into src/context/ThemeContext.tsx
// =========================================================================

import React, { createContext, useContext, useEffect } from 'react';

export const themeTokens = ${JSON.stringify(
    {
      id: activeTheme.id,
      name: activeTheme.name,
      primary: activeTheme.primary,
      primaryHover: activeTheme.primaryHover,
      primaryLight: activeTheme.primaryLight,
      accent: activeTheme.accent,
      surfaceBg: activeTheme.surfaceBg,
      textPrimary: activeTheme.textPrimary,
      textMuted: activeTheme.textMuted,
    },
    null,
    2
  )};

const ThemeContext = createContext({ tokens: themeTokens });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', themeTokens.primary);
    root.style.setProperty('--color-primary-hover', themeTokens.primaryHover);
    root.style.setProperty('--color-primary-light', themeTokens.primaryLight);
  }, []);

  return <ThemeContext.Provider value={{ tokens: themeTokens }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);`;

  const exportTokensJson = JSON.stringify(
    {
      theme: activeTheme.id,
      title: activeTheme.name,
      tagline: activeTheme.tagline,
      colors: {
        primary: {
          value: activeTheme.primary,
          hover: activeTheme.primaryHover,
          light: activeTheme.primaryLight,
          subtle: activeTheme.primarySubtle,
          border: activeTheme.primaryBorder,
        },
        accent: {
          value: activeTheme.accent,
        },
        surface: {
          background: activeTheme.surfaceBg,
          card: activeTheme.surfaceCard,
          border: activeTheme.borderMuted,
        },
        typography: {
          primary: activeTheme.textPrimary,
          muted: activeTheme.textMuted,
        },
      },
      tokens: activeTheme.tokens,
    },
    null,
    2
  );

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        themeId,
        setTheme,
        isThemeStudioOpen,
        openThemeStudio: () => setIsThemeStudioOpen(true),
        closeThemeStudio: () => setIsThemeStudioOpen(false),
        exportTailwindV4,
        exportTailwindV3,
        exportCssVariables,
        exportReactSnippet,
        exportTokensJson,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
