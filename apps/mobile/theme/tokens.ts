/**
 * Design Tokens for AskMerve Mobile
 * 
 * These tokens provide consistent styling values across the app.
 * Names are aligned with web conventions for cross-platform consistency.
 */

export const colors = {
    // Primary brand colors
    primary: '#007AFF',
    primaryLight: '#5AC8FA',
    secondary: '#5856D6',

    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceSecondary: '#F2F2F7',

    // Text colors
    text: '#000000',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    textInverse: '#FFFFFF',

    // Border colors
    border: '#C6C6C8',
    borderLight: '#E5E5EA',

    // Semantic colors
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#007AFF',

    // Tab bar
    tabActive: '#007AFF',
    tabInactive: '#8E8E93',
} as const;

export const spacing = {
    /** 4px */
    xs: 4,
    /** 8px */
    sm: 8,
    /** 12px */
    md: 12,
    /** 16px */
    lg: 16,
    /** 24px */
    xl: 24,
    /** 32px */
    xxl: 32,
    /** 48px */
    xxxl: 48,
} as const;

export const typography = {
    fontFamily: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
    },
    sizes: {
        /** 10px - caption */
        xxs: 10,
        /** 12px - small text */
        xs: 12,
        /** 14px - body small */
        sm: 14,
        /** 16px - body */
        md: 16,
        /** 18px - subtitle */
        lg: 18,
        /** 20px - title */
        xl: 20,
        /** 24px - heading */
        xxl: 24,
        /** 32px - display */
        xxxl: 32,
    },
    lineHeights: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
} as const;

export const borderRadius = {
    /** 4px */
    sm: 4,
    /** 8px */
    md: 8,
    /** 12px */
    lg: 12,
    /** 16px */
    xl: 16,
    /** 9999px - pill/full */
    full: 9999,
} as const;

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
} as const;

// Re-export as default theme object for convenience
export const theme = {
    colors,
    spacing,
    typography,
    borderRadius,
    shadows,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
