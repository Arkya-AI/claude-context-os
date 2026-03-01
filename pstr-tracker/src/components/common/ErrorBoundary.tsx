import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', margin: '2rem' }}>
          <p style={{ color: '#B22600', fontWeight: 600, fontSize: '1.125rem', marginBottom: 8 }}>
            Something went wrong
          </p>
          <p style={{ color: '#8a8a7e', fontSize: '0.875rem', marginBottom: 16 }}>
            An unexpected error occurred. Please refresh the page or contact IT support.
          </p>
          <button
            className="btn btn--secondary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
