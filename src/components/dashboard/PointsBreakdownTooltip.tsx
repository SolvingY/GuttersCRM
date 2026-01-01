import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalesRepBreakdown {
  type: 'salesRep';
  sales: number;
  closedDeals: number;
  totalPoints: number;
}

interface CanvasserBreakdown {
  type: 'canvasser';
  leadsSet: number;
  leadsWithDamage: number;
  leadsClosed: number;
  totalPoints: number;
}

type BreakdownData = SalesRepBreakdown | CanvasserBreakdown;

interface PointsBreakdownTooltipProps {
  data: BreakdownData;
  children: React.ReactNode;
  className?: string;
}

export function PointsBreakdownTooltip({ data, children, className }: PointsBreakdownTooltipProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 cursor-help', className)}>
            {children}
            <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs bg-popover border border-border shadow-lg"
        >
          <div className="text-sm space-y-2">
            <p className="font-semibold text-foreground border-b border-border pb-1">Points Breakdown</p>
            
            {data.type === 'salesRep' ? (
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <span>{formatCurrency(data.sales)} ÷ $10,000 × 10</span>
                  <span className="font-medium text-foreground">
                    = {Math.floor(data.sales / 10000) * 10} pts
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{data.closedDeals} closed × 10</span>
                  <span className="font-medium text-foreground">
                    = {data.closedDeals * 10} pts
                  </span>
                </div>
                <div className="border-t border-border pt-1 mt-1 flex justify-between gap-4 font-semibold text-foreground">
                  <span>Total</span>
                  <span>{data.totalPoints} pts</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <span>{data.leadsClosed} closed × 10</span>
                  <span className="font-medium text-foreground">
                    = {data.leadsClosed * 10} pts
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{data.leadsWithDamage} w/ damage × 5</span>
                  <span className="font-medium text-foreground">
                    = {data.leadsWithDamage * 5} pts
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{data.leadsSet} set × 1</span>
                  <span className="font-medium text-foreground">
                    = {data.leadsSet} pts
                  </span>
                </div>
                <div className="border-t border-border pt-1 mt-1 flex justify-between gap-4 font-semibold text-foreground">
                  <span>Total</span>
                  <span>{data.totalPoints} pts</span>
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
