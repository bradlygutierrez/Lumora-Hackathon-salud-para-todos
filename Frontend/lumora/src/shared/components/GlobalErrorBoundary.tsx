import {
  Component,
  type ErrorInfo,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import {
  FullScreenState,
} from './FullScreenState';

type GlobalErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Captura crashes inesperados durante
 * el renderizado de React.
 *
 * NO maneja errores HTTP.
 *
 * HTTP:
 * ApiError + TanStack Query
 *
 * Crash React:
 * GlobalErrorBoundary
 */
export class GlobalErrorBoundary extends Component<
  PropsWithChildren,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = {
    hasError: false,
  };

  /**
   * React ejecuta esto cuando un componente hijo
   * lanza una excepción durante render.
   */
  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  /**
   * Más adelante podemos conectar aquí:
   *
   * Sentry
   * Firebase Crashlytics
   * otro sistema de logging
   */
  componentDidCatch(
    error: Error,
    info: ErrorInfo,
  ): void {
    if (__DEV__) {
      console.error(
        'Global React error:',
        error,
        info,
      );
    }
  }

  /**
   * Permite intentar renderizar nuevamente.
   */
  private reset = (): void => {
    this.setState({
      hasError: false,
    });
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