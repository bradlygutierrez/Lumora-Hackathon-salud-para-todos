import {
  Component,
  type ErrorInfo,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import { FullScreenState } from '@/shared/components/FullScreenState';

type GlobalErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Captura errores inesperados de renderizado React.
 *
 * No maneja errores HTTP: esos pasan por ApiError + TanStack Query.
 * Error Boundary sigue siendo una de las excepciones donde React usa
 * class components de forma natural.
 */
export class GlobalErrorBoundary extends Component<
  PropsWithChildren,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('Global React error:', error, info);
    }
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <FullScreenState
          title="Algo salió mal"
          message="Lumora encontró un problema inesperado."
          actionLabel="Intentar nuevamente"
          onAction={this.reset}
        />
      );
    }

    return this.props.children;
  }
}
