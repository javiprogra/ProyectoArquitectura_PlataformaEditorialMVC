import type { ReactNode } from 'react';

export type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'gold';

const toneClasses: Record<BadgeTone, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  blue: 'bg-sky-100 text-sky-800 border-sky-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  gold: 'bg-editorial-accent/20 text-editorial-primary border-editorial-accent/40',
};

interface StatusBadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function StatusBadge({ children, tone = 'gray' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
