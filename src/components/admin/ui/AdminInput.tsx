import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../styles/admin-theme';

export interface AdminInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      leftIcon,
      rightIcon,
      size = 'md',
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-5 h-5',
    };

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium text-charcoal mb-1.5',
              required && "after:content-['*'] after:ml-0.5 after:text-red-500"
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40 pointer-events-none',
                iconSizes[size]
              )}
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2',
              'bg-white text-charcoal placeholder-charcoal/40',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-charcoal/10 focus:border-burgundy-old focus:ring-burgundy-old/20',
              disabled && 'bg-charcoal/5 cursor-not-allowed opacity-60',
              sizeClasses[size],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10'
            )}
            disabled={disabled}
            {...props}
          />
          {rightIcon && (
            <span
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40',
                iconSizes[size]
              )}
            >
              {rightIcon}
            </span>
          )}
        </div>
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-red-500' : 'text-charcoal/50'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

AdminInput.displayName = 'AdminInput';
