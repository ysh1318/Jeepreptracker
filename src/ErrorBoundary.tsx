import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

// Shows crash details directly on the page instead of leaving a blank
// screen. Without this, any uncaught error during render just unmounts the
// whole app with nothing visible — the only trace is in the browser
// console, which isn't practically reachable on a phone-only workflow.
// Remove this once the app has been stable in production for a while and
// proper remote error logging (e.g. Sentry) is in place instead.
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: info.componentStack || '' });
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'monospace',
          fontSize: '13px',
          background: '#1b1c19',
          color: '#f5f5f0',
          minHeight: '100vh',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          <h2 style={{ color: '#ff8080', marginBottom: '12px' }}>Something crashed</h2>
          <p style={{ marginBottom: '8px' }}>
            Screenshot this whole screen and send it back — this is the actual error, not a blank page.
          </p>
          <div style={{ background: '#000', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
            <strong>{this.state.error.name}: {this.state.error.message}</strong>
            {'\n\n'}
            {this.state.error.stack}
          </div>
          {this.state.info && (
            <details>
              <summary>Component stack</summary>
              <div style={{ background: '#000', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
                {this.state.info}
              </div>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}