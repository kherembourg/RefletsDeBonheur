import type { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
}

export function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="p-4 border-2 border-silver-mist rounded-lg text-center bg-ivory hover:border-[#ae1725] transition-colors">
      {icon && (
        <div className="flex justify-center mb-2 text-[#ae1725]">
          {icon}
        </div>
      )}
      <p className="text-3xl font-bold text-[#ae1725]">
        {value}
      </p>
      <p className="text-xs text-warm-taupe uppercase tracking-wide mt-1">
        {label}
      </p>
    </div>
  );
}
