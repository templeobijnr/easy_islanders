import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    message?: string;
}

/**
 * Global Error Boundary for catching React render errors.
 * 
 * Wrap at the app root to catch unhandled errors and provide
 * a recovery UI instead of a blank/crashed screen.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: unknown): State {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { hasError: true, message };
    }

    componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
        // Log error for debugging - console.error is allowed by ESLint config
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    handleReset = (): void => {
        this.setState({ hasError: false, message: undefined });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.emoji}>😕</Text>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.message}>
                            {this.state.message || 'An unexpected error occurred'}
                        </Text>
                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        maxWidth: 320,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;
