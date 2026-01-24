import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../../styles/admin-theme';

export interface AdminTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  maxLength?: number;
  showCount?: boolean;
}

export const AdminTextarea = forwardRef<HTMLTextAreaElement, AdminTextareaProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      maxLength,
      showCount = false,
      className,
      disabled,
      id,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'block text-sm font-medium text-charcoal mb-1.5',
              required && "after:content-['*'] after:ml-0.5 after:text-red-500"
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            value={value}
            maxLength={maxLength}
            className={cn(
              'w-full border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 resize-none',
              'bg-white text-charcoal placeholder-charcoal/40 px-4 py-3 text-sm',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-charcoal/10 focus:border-burgundy-old focus:ring-burgundy-old/20',
              disabled && 'bg-charcoal/5 cursor-not-allowed opacity-60'
            )}
            disabled={disabled}
            {...props}
          />
          {showCount && maxLength && (
            <span
              className={cn(
                'absolute bottom-3 right-3 text-xs',
                currentLength > maxLength * 0.9 ? 'text-red-500' : 'text-charcoal/40'
              )}
            >
              {currentLength}/{maxLength}
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

AdminTextarea.displayName = 'AdminTextarea';
