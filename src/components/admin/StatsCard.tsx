import type { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
}

export function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="p-4 border-2 border-silver-mist rounded-lg text-center bg-ivory hover:border-burgundy-old transition-colors">
      {icon && (
        <div className="flex justify-center mb-2 text-burgundy-old">
          {icon}
        </div>
      )}
      <p className="text-3xl font-bold text-burgundy-old">
        {value}
      </p>
      <p className="text-xs text-warm-taupe uppercase tracking-wide mt-1">
        {label}
      </p>
    </div>
  );
}
