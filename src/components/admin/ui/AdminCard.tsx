import { type ReactNode } from 'react';
import { cn } from '../../../styles/admin-theme';

export interface AdminCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function AdminCard({
  children,
  className,
  padding = 'md',
  hover = false,
  onClick,
}: AdminCardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(
        'bg-white rounded-lg border border-charcoal/5 shadow-xs',
        paddingClasses[padding],
        hover && 'hover:shadow-md hover:border-charcoal/10 transition-all duration-200 cursor-pointer',
        onClick && 'w-full text-left',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

export interface AdminCardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function AdminCardHeader({ children, className, action }: AdminCardHeaderProps) {
  return (
    <div
      className={cn(
        'pb-4 mb-4 border-b border-charcoal/5 flex items-center justify-between',
        className
      )}
    >
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export interface AdminCardTitleProps {
  children: ReactNode;
  className?: string;
  subtitle?: string;
}

export function AdminCardTitle({ children, className, subtitle }: AdminCardTitleProps) {
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-charcoal">{children}</h3>
      {subtitle && <p className="text-sm text-charcoal/50 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export interface AdminCardBodyProps {
  children: ReactNode;
  className?: string;
}

export function AdminCardBody({ children, className }: AdminCardBodyProps) {
  return <div className={className}>{children}</div>;
}

export interface AdminCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function AdminCardFooter({ children, className }: AdminCardFooterProps) {
  return (
    <div
      className={cn(
        'pt-4 mt-4 border-t border-charcoal/5 flex items-center justify-end gap-3',
        className
      )}
    >
      {children}
    </div>
  );
}
