import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? "";
      const looksLikeStaleChunk =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");

      const handleReload = () => {
        try {
          sessionStorage.removeItem("fireguide_chunk_reload_attempted");
        } catch {
          /* ignore */
        }
        window.location.reload();
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4 break-words">{this.state.error?.message}</p>
            {looksLikeStaleChunk ? (
              <p className="text-sm text-gray-500 mb-6">
                This often happens after an update while an older tab is still open. Reloading fetches the latest app files.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 justify-center">
              {looksLikeStaleChunk ? (
                <button
                  type="button"
                  onClick={handleReload}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Reload page
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.href = "/";
                }}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

