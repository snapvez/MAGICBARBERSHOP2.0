import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    localStorage.clear();
    sessionStorage.clear();

    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 border border-yellow-600 rounded-lg p-8 text-center">
            <div className="mb-6">
              <svg
                className="w-16 h-16 text-yellow-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h1 className="text-2xl font-bold text-yellow-600 mb-2">
                Ocorreu um Erro
              </h1>
              <p className="text-gray-300 mb-6">
                Algo não correu como esperado. Por favor, tenta recarregar a aplicação.
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Recarregar Aplicação
            </button>

            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 text-xs text-gray-500 overflow-auto p-3 bg-gray-950 rounded">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
