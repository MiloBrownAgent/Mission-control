"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches Convex query/mutation errors
 * and renders a fallback instead of crashing the whole page.
 */
export class ConvexErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isConvexError = this.state.error?.message?.includes("CONVEX") || 
                           this.state.error?.message?.includes("Server Error");
      
      return (
        <div className="rounded-xl border border-[#C4533A]/20 bg-[#C4533A]/5 p-4">
          <p className="text-sm text-[#C4533A] font-medium">
            {isConvexError ? "Database temporarily unavailable" : "Something went wrong"}
          </p>
          <p className="text-xs text-[#6B6560] mt-1">
            {isConvexError 
              ? "Convex is experiencing issues. Data will appear when service is restored."
              : this.state.error?.message || "An unexpected error occurred."
            }
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 text-xs text-[#B8956A] hover:underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
