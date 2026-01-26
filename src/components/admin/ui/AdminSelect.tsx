import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../styles/admin-theme';

export interface AdminSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface AdminSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  options: AdminSelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      options,
      placeholder,
      size = 'md',
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm pr-8',
      md: 'px-4 py-2.5 text-sm pr-10',
      lg: 'px-4 py-3 text-base pr-10',
    };

    const iconSizes = {
      sm: 'w-4 h-4 right-2',
      md: 'w-5 h-5 right-3',
      lg: 'w-5 h-5 right-3',
    };

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium text-charcoal mb-1.5',
              required && "after:content-['*'] after:ml-0.5 after:text-red-500"
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 appearance-none',
              'bg-white text-charcoal',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-charcoal/10 focus:border-burgundy-old focus:ring-burgundy-old/20',
              disabled && 'bg-charcoal/5 cursor-not-allowed opacity-60',
              sizeClasses[size]
            )}
            disabled={disabled}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={cn(
              'absolute top-1/2 -translate-y-1/2 text-charcoal/40 pointer-events-none',
              iconSizes[size]
            )}
          />
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

AdminSelect.displayName = 'AdminSelect';
