/**
 * connectService - Shim for backwards compatibility
 *
 * DO NOT add more code here - use connectService/ folder instead.
 * This file exists only to preserve existing import paths.
 */
// IMPORTANT: Point explicitly at the folder barrel to avoid ESM/package-resolution
// edge cases where `export * from "./connectService"` may not resolve to `index.ts`
// consistently across tooling.
export * from "./connectService/index";
