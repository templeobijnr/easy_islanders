/**
 * Map Component Index
 * 
 * Entry point for the Map component module.
 * Re-exports types and provides usage documentation.
 * 
 * Note: The actual MapView component is imported directly using platform extensions.
 * Metro bundler resolves MapView.web.tsx for web, MapView.native.tsx for native.
 * 
 * Usage:
 *   // For component - use direct import with extension resolution
 *   import MapView from '../../components/Map/MapView';
 *   
 *   // For types
 *   import type { MapViewProps, MapMarker, MapRegion } from '../../components/Map';
 */

export * from './types';
