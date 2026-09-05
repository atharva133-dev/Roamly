"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-[300px] w-[300px] rounded-full bg-gradient-to-br from-green-200 to-emerald-500 opacity-60 animate-pulse" />
          </div>
        )
      );
    }
    return this.props.children;
  }
}
