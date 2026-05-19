/**
 * MpAp Theme Definitions
 */

export const colors = {
  // Core colors
  background: '#0a0c0f',
  surface: '#141920',
  surfaceLight: '#1a2130',
  
  // Accent colors
  accent: '#00d4ff',
  accent2: '#7c3aed',
  
  // Status colors
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  
  // Text colors
  text: '#e8eaf0',
  muted: '#6b7280',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)',
  
  // Tag colors
  tagAssignment: { bg: 'rgba(124,58,237,0.15)', text: '#a78bfa', border: 'rgba(124,58,237,0.3)' },
  tagDeadline: { bg: 'rgba(239,68,68,0.12)', text: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
  tagProject: { bg: 'rgba(16,185,129,0.12)', text: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
  tagEvent: { bg: 'rgba(0,212,255,0.1)', text: '#00d4ff', border: 'rgba(0,212,255,0.25)' },
  tagCrypto: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
};

export const darkTheme = {
  background: colors.background,
  surface: colors.surface,
  surfaceLight: colors.surfaceLight,
  text: colors.text,
  muted: colors.muted,
  border: colors.border,
  border2: colors.border2,
  accent: colors.accent,
};

export const lightTheme = {
  background: '#ffffff',
  surface: '#f5f5f5',
  surfaceLight: '#e8e8e8',
  text: '#1a1a1a',
  muted: '#666666',
  border: 'rgba(0,0,0,0.1)',
  border2: 'rgba(0,0,0,0.2)',
  accent: '#0066cc',
};

export const fonts = {
  mono: 'monospace',
  sans: 'system-ui, -apple-system, sans-serif',
};
