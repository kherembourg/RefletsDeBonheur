import { type ReactNode } from 'react';
import { cn } from '../../../styles/admin-theme';
import type { LucideIcon } from 'lucide-react';

export interface AdminSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function AdminSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  action,
}: AdminSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-burgundy-old/10 flex items-center justify-center shrink-0">
              <Icon className="text-burgundy-old" size={20} />
            </div>
          )}
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">{title}</h2>
            {description && <p className="text-charcoal/50 text-sm font-light">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export interface AdminDividerProps {
  className?: string;
  symbol?: string;
}

export function AdminDivider({ className, symbol = '❧' }: AdminDividerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-4 my-8', className)}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-burgundy-old/20 to-transparent" />
      <div className="text-burgundy-old/30 text-lg">{symbol}</div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-burgundy-old/20 to-transparent" />
    </div>
  );
}

export interface AdminEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      {Icon && (
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-charcoal/5 flex items-center justify-center">
          <Icon className="w-8 h-8 text-charcoal/30" />
        </div>
      )}
      <h3 className="text-lg font-medium text-charcoal mb-2">{title}</h3>
      {description && <p className="text-sm text-charcoal/50 mb-6 max-w-sm mx-auto">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
