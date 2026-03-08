/**
 * ErrorBoundary Component Tests
 * Tests the reusable React error boundary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// A component that throws on demand
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Content rendered successfully</div>;
}

describe('ErrorBoundary Component', () => {
  // Suppress React error boundary console.error noise in test output
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Normal rendering', () => {
    it('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Content rendered successfully')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should render default fallback on error', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/quelque chose s'est mal passé/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
    });

    it('should render custom ReactNode fallback on error', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('should render function fallback with error and reset', () => {
      render(
        <ErrorBoundary
          fallback={(error, reset) => (
            <div>
              <p>Error: {error.message}</p>
              <button onClick={reset}>Reset</button>
            </div>
          )}
        >
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    });

    it('should call onError callback when error is caught', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should log errors to console', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        '[ErrorBoundary] Caught error:',
        expect.objectContaining({ message: 'Test error' }),
        expect.any(Object)
      );
    });
  });

  describe('Reset behavior', () => {
    it('should reset and re-render children when reset button is clicked', () => {
      // We need a stateful wrapper to control the throw
      let shouldThrow = true;

      function ConditionalThrower() {
        if (shouldThrow) throw new Error('Test error');
        return <div>Recovered content</div>;
      }

      render(
        <ErrorBoundary>
          <ConditionalThrower />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Fix the error condition before resetting
      shouldThrow = false;

      fireEvent.click(screen.getByRole('button', { name: /réessayer/i }));

      expect(screen.getByText('Recovered content')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
