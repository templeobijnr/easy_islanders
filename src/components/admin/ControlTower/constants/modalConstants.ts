/**
 * Modal Constants
 * 
 * Dimensions and styling values for modal components.
 */

/** Modal header height in pixels */
export const MODAL_HEADER_HEIGHT = 60;

/** Modal padding in pixels */
export const MODAL_PADDING = 16;

/** Maximum modal height as viewport height percentage */
export const MODAL_MAX_HEIGHT_VH = 90;

/** Modal size presets */
export const MODAL_SIZES = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
} as const;
