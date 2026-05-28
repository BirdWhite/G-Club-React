'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Auction Dashboard:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] w-full flex flex-col items-center justify-center p-6 text-center bg-background rounded-2xl border border-rose-500/20 shadow-2xl animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6">
            <AlertOctagon className="w-8 h-8 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">화면 렌더링에 오류가 발생했습니다</h2>
          <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
            실시간 데이터를 처리하는 과정에서 예상치 못한 에러가 검출되었습니다. 아래 버튼을 눌러 화면을 새로고침해 주세요.
          </p>
          <div className="bg-card border border-border p-4 rounded-xl max-w-lg w-full text-left font-mono text-xs text-rose-400/90 overflow-auto max-h-32 mb-6 shadow-inner">
            {this.state.error?.toString() || 'Unknown Error'}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold rounded-xl shadow-lg shadow-rose-900/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>대시보드 새로고침</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
