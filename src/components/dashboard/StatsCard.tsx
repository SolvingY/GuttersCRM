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
    <div className={cn('bg-card border border-border rounded-lg p-4 sm:p-6 min-w-0', className)}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className={cn('text-2xl sm:text-3xl font-heading mt-1 truncate', valueClassName || 'text-foreground')}>{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs sm:text-sm mt-2 truncate',
                trend.isPositive ? 'text-green-600' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}% from last period
            </p>
          )}
        </div>
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
        </div>
      </div>
    </div>
  );
}
