import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  valueClassName?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className, valueClassName }: StatsCardProps) {
  return (
    <div className={cn('bg-card border border-border rounded-lg p-3 sm:p-6', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-sm text-muted-foreground leading-tight break-words">{title}</p>
          <p className={cn('text-base sm:text-3xl font-heading mt-1 whitespace-nowrap', valueClassName || 'text-foreground')}>{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs sm:text-sm mt-1 sm:mt-2',
                trend.isPositive ? 'text-green-600' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </p>
          )}
        </div>
        <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-accent" />
        </div>
      </div>
    </div>
  );
}
