import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };
  declare props: Props;

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error) {
            errorMessage = `Erro no Banco de Dados: ${parsedError.error}`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full text-center space-y-4">
            <div className="p-3 bg-rose-500/10 rounded-full w-fit mx-auto text-rose-500">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold">Ops! Algo deu errado</h2>
            <p className="text-text-secondary">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-xl font-bold transition-all"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
