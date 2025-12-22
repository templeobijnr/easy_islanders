import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock Firebase
vi.mock('../services/firebaseConfig', () => ({
    db: {},
    auth: {},
    storage: {},
    app: {}
}));

// Mock Mapbox GL
vi.mock('mapbox-gl', () => ({
    default: {
        Map: vi.fn(() => ({
            on: vi.fn(),
            remove: vi.fn(),
            addControl: vi.fn(),
            resize: vi.fn(),
            getCanvas: vi.fn(() => ({ style: {} })),
        })),
        NavigationControl: vi.fn(),
        Marker: vi.fn(() => ({
            setLngLat: vi.fn().mockReturnThis(),
            addTo: vi.fn().mockReturnThis(),
            remove: vi.fn(),
            on: vi.fn()
        })),
        accessToken: ''
    }
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));
