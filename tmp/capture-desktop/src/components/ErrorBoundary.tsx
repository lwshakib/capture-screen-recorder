import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "../lib/logger";

interface Props {
  children: ReactNode; // Sub-components to be monitored for errors
  fallback?: ReactNode; // Optional custom UI to show when an error occurs
  onError?: (error: Error, errorInfo: ErrorInfo) => void; // Optional callback for external error tracking
}

interface State {
  hasError: boolean; // Flag indicating if a child component has crashed
  error: Error | null; // The actual error object
}

/**
 * ErrorBoundary Class Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Updates state so the next render will show the fallback UI.
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Logs error information after an error has been thrown.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error("ErrorBoundary caught an error", error, {
      componentStack: errorInfo.componentStack,
    });

    // Notify parent listeners if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Clears the error state to allow the app to try rendering the children again.
   */
  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  /**
   * Performs a hard refresh of the window
   */
  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Return custom fallback if provided via props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default Error UI: A centered card with options to reload or reset
      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We encountered an unexpected error. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show technical details only during development for debugging */}
              {this.state.error && import.meta.env.DEV && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-mono text-muted-foreground">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground">
                        Stack trace
                      </summary>
                      <pre className="text-xs mt-2 overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReload} className="flex-1">
                  Reload App
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleReset}
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Default: render normally
    return this.props.children;
  }
}
