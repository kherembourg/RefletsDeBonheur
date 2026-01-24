import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { adminStyles, cn } from '../../../styles/admin-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: adminStyles.button.primary,
      secondary: adminStyles.button.secondary,
      outline: adminStyles.button.outline,
      ghost: adminStyles.button.ghost,
      danger: adminStyles.button.danger,
      success: adminStyles.button.success,
    };

    return (
      <button
        ref={ref}
        className={cn(
          adminStyles.button.base,
          variantClasses[variant],
          adminStyles.button.sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Chargement...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

AdminButton.displayName = 'AdminButton';
