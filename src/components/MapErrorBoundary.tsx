/**
 * Map Error Boundary (OBS-05)
 *
 * Prevents Mapbox errors from crashing the entire page.
 *
 * INVARIANTS:
 * - Mapbox errors contained to map component.
 * - Fallback shows actionable message.
 * - Error logged with component context.
 *
 * @see Living Document Section 18.4 for invariants.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface MapErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onFallbackClick?: () => void;
}

interface MapErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary specifically for map components.
 */
export class MapErrorBoundary extends Component<
    MapErrorBoundaryProps,
    MapErrorBoundaryState
> {
    constructor(props: MapErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[MapErrorBoundary] Error caught:', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
        });
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        minHeight: '300px',
                    }}
                >
                    <div
                        style={{
                            fontSize: '48px',
                            marginBottom: '1rem',
                        }}
                    >
                        🗺️
                    </div>
                    <h3
                        style={{
                            margin: '0 0 0.5rem 0',
                            color: '#343a40',
                        }}
                    >
                        Map unavailable
                    </h3>
                    <p
                        style={{
                            margin: '0 0 1rem 0',
                            color: '#6c757d',
                            textAlign: 'center',
                        }}
                    >
                        Showing list view instead. You can still browse all listings.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={this.handleRetry}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            Try Again
                        </button>
                        {this.props.onFallbackClick && (
                            <button
                                onClick={this.props.onFallbackClick}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                View as List
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default MapErrorBoundary;
