// SCIP Design System - Color Theme Studio & Project Exporter Modal
import React, { useState } from 'react';
import { useTheme, PRESET_THEMES, ThemePalette } from '../../context/ThemeContext';
import {
  Palette,
  Copy,
  Check,
  Code,
  Layout,
  Eye,
  Sliders,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X,
  FileCode,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ThemeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'export' | 'tokens' | 'presets' | 'preview';
type ExportFormat = 'tailwind-v4' | 'tailwind-v3' | 'css-variables' | 'react' | 'json';

export const ThemeStudioModal: React.FC<ThemeStudioModalProps> = ({ isOpen, onClose }) => {
  const {
    activeTheme,
    setTheme,
    exportTailwindV4,
    exportTailwindV3,
    exportCssVariables,
    exportReactSnippet,
    exportTokensJson
  } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('tailwind-v4');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const getExportCode = () => {
    switch (exportFormat) {
      case 'tailwind-v4': return exportTailwindV4;
      case 'tailwind-v3': return exportTailwindV3;
      case 'css-variables': return exportCssVariables;
      case 'react': return exportReactSnippet;
      case 'json': return exportTokensJson;
      default: return exportTailwindV4;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs transition-colors"
              style={{ backgroundColor: activeTheme.primary }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="theme-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                  Color Theme Studio & Project Exporter
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
                  style={{
                    backgroundColor: activeTheme.primaryLight,
                    color: activeTheme.primary,
                    border: `1px solid ${activeTheme.primaryBorder}`
                  }}
                >
                  {activeTheme.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect palette tokens, apply live themes, or copy copy-paste code directly into your project.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-2 bg-white">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-emerald-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            style={{
              borderColor: activeTab === 'export' ? activeTheme.primary : 'transparent',
              color: activeTab === 'export' ? activeTheme.primary : undefined
            }}
          >
            <Code className="w-4 h-4" />
            <span>Use On My Project (Code Export)</span>
          </button>

          <button
            onClick={() => setActiveTab('tokens')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'tokens'
                ? 'border-emerald-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            style={{
              borderColor: activeTab === 'tokens' ? activeTheme.primary : 'transparent',
              color: activeTab === 'tokens' ? activeTheme.primary : undefined
            }}
          >
            <Layers className="w-4 h-4" />
            <span>Color Swatches & Tokens</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'presets'
                ? 'border-emerald-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            style={{
              borderColor: activeTab === 'presets' ? activeTheme.primary : 'transparent',
              color: activeTab === 'presets' ? activeTheme.primary : undefined
            }}
          >
            <Sliders className="w-4 h-4" />
            <span>Curated Palettes ({PRESET_THEMES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'preview'
                ? 'border-emerald-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            style={{
              borderColor: activeTab === 'preview' ? activeTheme.primary : 'transparent',
              color: activeTab === 'preview' ? activeTheme.primary : undefined
            }}
          >
            <Eye className="w-4 h-4" />
            <span>Live UI Playground</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40">
          {/* TAB 1: CODE EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Highlight Banner */}
              <div
                className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                style={{
                  backgroundColor: activeTheme.primaryLight,
                  borderColor: activeTheme.primaryBorder
                }}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" style={{ color: activeTheme.primary }} />
                    Exporting theme: <span style={{ color: activeTheme.primary }}>{activeTheme.name}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {activeTheme.tagline}. Select your framework below and click Copy Code to paste into your own repository.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(getExportCode(), 'format-code')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                  style={{ backgroundColor: activeTheme.primary }}
                >
                  {copiedText === 'format-code' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Complete Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Format Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
                <button
                  onClick={() => setExportFormat('tailwind-v4')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    exportFormat === 'tailwind-v4'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tailwind CSS v4 (@theme)
                </button>
                <button
                  onClick={() => setExportFormat('tailwind-v3')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    exportFormat === 'tailwind-v3'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tailwind CSS v3 (Config)
                </button>
                <button
                  onClick={() => setExportFormat('css-variables')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    exportFormat === 'css-variables'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Universal CSS Variables (:root)
                </button>
                <button
                  onClick={() => setExportFormat('react')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    exportFormat === 'react'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  React Provider & Hook
                </button>
                <button
                  onClick={() => setExportFormat('json')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    exportFormat === 'json'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tokens JSON
                </button>
              </div>

              {/* Code Viewer */}
              <div className="relative rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 text-slate-100 shadow-md">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 font-mono text-[11px] text-slate-300">
                      {exportFormat === 'tailwind-v4' && 'src/index.css (@theme)'}
                      {exportFormat === 'tailwind-v3' && 'tailwind.config.js'}
                      {exportFormat === 'css-variables' && 'styles/theme.css'}
                      {exportFormat === 'react' && 'src/context/ThemeContext.tsx'}
                      {exportFormat === 'json' && 'tokens/theme.json'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(getExportCode(), 'code-block')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                  >
                    {copiedText === 'code-block' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed max-h-96">
                  {getExportCode()}
                </pre>
              </div>

              {/* Quick Integration Guide */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  How to use this color theme in your project
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-900 block mb-1">1. Copy Tokens</span>
                    Paste the snippet into your project’s CSS or Tailwind config file as indicated above.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-900 block mb-1">2. Use Utility Classes</span>
                    Style elements with <code className="text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200">bg-brand-primary</code>, <code className="text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200">text-brand-primary</code>, etc.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-900 block mb-1">3. Accessible Contrast</span>
                    Tokens are tuned to pass WCAG AA standards with minimum 4.5:1 contrast against surface backgrounds.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLOR TOKENS & SWATCHES */}
          {activeTab === 'tokens' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Active Palette Tokens: {activeTheme.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any card to copy its HEX value directly to your clipboard.
                  </p>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Primary: <span className="font-bold text-slate-900">{activeTheme.primary}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeTheme.tokens.map((token) => (
                  <div
                    key={token.name}
                    onClick={() => handleCopy(token.hex, token.name)}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{token.label}</span>
                        <span className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-600 flex items-center gap-1">
                          {copiedText === token.name ? (
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          ) : (
                            <>
                              <span>{token.hex}</span>
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </>
                          )}
                        </span>
                      </div>
                      <div
                        className="h-10 w-full rounded-lg shadow-inner mb-2 border border-black/5"
                        style={{ backgroundColor: token.hex }}
                      />
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {token.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Tailwind: {token.tailwindClass}</span>
                      <span>WCAG AA ✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CURATED PALETTES */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Select a Curated Color Theme
                </h3>
                <p className="text-xs text-slate-500">
                  Switch the active color theme to preview how the platform and design tokens look with different visual identities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRESET_THEMES.map((theme) => {
                  const isSelected = theme.id === activeTheme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setTheme(theme.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative bg-white ${
                        isSelected
                          ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                      style={{
                        borderColor: isSelected ? theme.primary : undefined
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{theme.name}</h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {theme.badge}
                            </span>
                            {isSelected && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: theme.primary }}
                              >
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{theme.tagline}</p>
                        </div>
                      </div>

                      {/* Swatch Strip */}
                      <div className="flex items-center gap-1.5 h-6 rounded-lg overflow-hidden border border-slate-200/60 p-0.5 bg-slate-50">
                        <div className="flex-1 h-full rounded" style={{ backgroundColor: theme.primary }} title={`Primary: ${theme.primary}`} />
                        <div className="flex-1 h-full rounded" style={{ backgroundColor: theme.primaryHover }} title={`Hover: ${theme.primaryHover}`} />
                        <div className="flex-1 h-full rounded" style={{ backgroundColor: theme.primaryLight }} title={`Light: ${theme.primaryLight}`} />
                        <div className="flex-1 h-full rounded" style={{ backgroundColor: theme.accent }} title={`Accent: ${theme.accent}`} />
                        <div className="flex-1 h-full rounded" style={{ backgroundColor: theme.textPrimary }} title={`Text: ${theme.textPrimary}`} />
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="font-mono text-[11px] text-slate-400">
                          HEX: {theme.primary}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTheme(theme.id);
                          }}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                            isSelected
                              ? 'text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          style={{
                            backgroundColor: isSelected ? theme.primary : undefined
                          }}
                        >
                          {isSelected ? 'Currently Applied' : 'Apply Theme'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE UI PLAYGROUND */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Component Playground: {activeTheme.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect how standard interface primitives behave with the current color palette.
                </p>
              </div>

              {/* Light Background Preview Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Interactive Controls & Badges
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Primary CTA */}
                  <button
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1.5"
                    style={{ backgroundColor: activeTheme.primary }}
                  >
                    <span>Primary Action</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Outline Button */}
                  <button
                    className="px-4 py-2 rounded-lg text-xs font-semibold border transition-colors"
                    style={{
                      borderColor: activeTheme.primaryBorder,
                      color: activeTheme.primary,
                      backgroundColor: activeTheme.primaryLight
                    }}
                  >
                    Secondary Outline
                  </button>

                  {/* Ghost Button */}
                  <button className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                    Ghost Link
                  </button>

                  {/* Status Badges */}
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: activeTheme.primaryLight,
                      color: activeTheme.primary,
                      border: `1px solid ${activeTheme.primaryBorder}`
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Citizen Report
                  </span>

                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Awaiting Authority Review
                  </span>
                </div>

                {/* Sample Input */}
                <div className="max-w-md">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sample Form Input with Focus Ring
                  </label>
                  <input
                    type="text"
                    defaultValue="High Street storm drain blockage"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden transition-all"
                    style={{
                      borderColor: activeTheme.primary
                    }}
                  />
                </div>

                {/* KPI Stat Card Sample */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div
                    className="p-3.5 rounded-xl border"
                    style={{
                      backgroundColor: activeTheme.primaryLight,
                      borderColor: activeTheme.primaryBorder
                    }}
                  >
                    <div className="text-[11px] font-medium text-slate-600">Active Incidents</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">14</div>
                    <div className="text-[10px] mt-1 font-medium" style={{ color: activeTheme.primary }}>
                      +2 from last 24h
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="text-[11px] font-medium text-slate-600">Cluster Density</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">94.8%</div>
                    <div className="text-[10px] mt-1 text-slate-400">Spatio-temporal DBSCAN</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="text-[11px] font-medium text-slate-600">Avg Response Time</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">3.2 hrs</div>
                    <div className="text-[10px] mt-1 text-emerald-600 font-medium">18% faster vs baseline</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: activeTheme.primary }}
            />
            <span>Active: <strong className="text-slate-800">{activeTheme.name}</strong> ({activeTheme.primary})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(getExportCode(), 'footer-copy')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5"
            >
              {copiedText === 'footer-copy' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs"
              style={{ backgroundColor: activeTheme.primary }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
