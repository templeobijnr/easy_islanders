/**
 * DeckErrorBoundary - Thin wrapper for admin deck error handling
 * 
 * Reuses existing ErrorBoundary component.
 */
import React from "react";
import { DeckErrorFallback } from "../ControlTower/components/DeckErrorFallback";

interface DeckErrorBoundaryProps {
    deckName: string;
    children: React.ReactNode;
}

interface DeckErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class DeckErrorBoundary extends React.Component<DeckErrorBoundaryProps, DeckErrorBoundaryState> {
    constructor(props: DeckErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): DeckErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`[DeckErrorBoundary] Error in ${this.props.deckName}:`, error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <DeckErrorFallback
                    deckName={this.props.deckName}
                    error={this.state.error || undefined}
                    onRetry={this.handleRetry}
                />
            );
        }

        return this.props.children;
    }
}

export default DeckErrorBoundary;
