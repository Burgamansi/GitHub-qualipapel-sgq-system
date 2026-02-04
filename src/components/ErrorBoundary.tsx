import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    backgroundColor: '#1a1a1a',
                    color: '#e0e0e0',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{
                        maxWidth: '800px',
                        width: '100%',
                        backgroundColor: '#2a2a2a',
                        padding: '2rem',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                        border: '1px solid #404040'
                    }}>
                        <h1 style={{ color: '#ff6b6b', marginTop: 0, marginBottom: '1rem' }}>
                            Something went wrong
                        </h1>

                        <div style={{
                            backgroundColor: '#333',
                            padding: '1rem',
                            borderRadius: '4px',
                            marginBottom: '1rem',
                            overflowX: 'auto'
                        }}>
                            <code style={{ color: '#ff8787', display: 'block', marginBottom: '0.5rem' }}>
                                {this.state.error?.toString()}
                            </code>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ color: '#4dabf7', marginTop: 0 }}>Troubleshooting Hints:</h3>
                            <ul style={{ lineHeight: '1.6' }}>
                                <li>If this is a "FirebaseError: auth/invalid-api-key", you are missing Vercel Environment Variables.</li>
                                <li>Check Vercel Project Settings {'>'} Environment Variables.</li>
                                <li>Ensure all <code>VITE_FIREBASE_*</code> variables are defined in Production/Preview/Development.</li>
                            </ul>
                        </div>

                        {this.state.errorInfo && (
                            <details style={{ whiteSpace: 'pre-wrap', color: '#888' }}>
                                <summary>Stack Trace</summary>
                                {this.state.errorInfo.componentStack}
                            </details>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                marginTop: '1.5rem',
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#3b5bdb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: '600'
                            }}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
