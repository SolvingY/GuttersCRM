import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Star, Users, Briefcase, Target, Pencil, TrendingUp } from 'lucide-react';
import { FISCAL_YEAR, getFiscalYearProgress, getDaysRemainingInFiscalYear } from '@/lib/constants';

interface UserStats {
  userId: string;
  name: string;
  sales: number;
  points: number;
  leads: number;
  closedDeals: number;
  yearlyGoal: number;
  salesRank: string;
  earningsYtd?: number;
}

interface UserStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserStats | null;
  onEdit: () => void;
}

export function UserStatsModal({ open, onOpenChange, user, onEdit }: UserStatsModalProps) {
  if (!user) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const goalProgress = user.yearlyGoal > 0 
    ? Math.min((user.sales / user.yearlyGoal) * 100, 100) 
    : 0;

  const fiscalProgress = getFiscalYearProgress();
  const daysRemaining = getDaysRemainingInFiscalYear();

  const getGoalStatusColor = () => {
    if (goalProgress >= fiscalProgress) return 'text-green-500';
    if (goalProgress >= fiscalProgress * 0.8) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-heading">{user.name}</DialogTitle>
              <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {user.salesRank}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Metrics
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatsCard
              title="Total Sales"
              value={formatCurrency(user.sales)}
              icon={DollarSign}
            />
            <StatsCard
              title="YTD Earnings"
              value={formatCurrency(user.earningsYtd || 0)}
              icon={TrendingUp}
            />
            <StatsCard
              title="Points"
              value={user.points.toLocaleString()}
              icon={Star}
            />
            <StatsCard
              title="Leads"
              value={user.leads}
              icon={Users}
            />
            <StatsCard
              title="Closed Deals"
              value={user.closedDeals}
              icon={Briefcase}
            />
            <StatsCard
              title="Yearly Goal"
              value={formatCurrency(user.yearlyGoal)}
              icon={Target}
            />
          </div>

          {/* Goal Progress */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Goal Progress</h4>
              <span className={`font-bold ${getGoalStatusColor()}`}>
                {goalProgress.toFixed(1)}%
              </span>
            </div>
            <Progress value={goalProgress} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatCurrency(user.sales)} of {formatCurrency(user.yearlyGoal)}</span>
              <span>{formatCurrency(user.yearlyGoal - user.sales)} remaining</span>
            </div>
          </div>

          {/* Fiscal Year Progress */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Fiscal Year Progress</h4>
              <span className="text-sm text-muted-foreground">
                {daysRemaining} days remaining
              </span>
            </div>
            <Progress value={fiscalProgress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{FISCAL_YEAR.CURRENT_YEAR_START.toLocaleDateString()}</span>
              <span>{fiscalProgress.toFixed(1)}% of year</span>
              <span>{FISCAL_YEAR.CURRENT_YEAR_END.toLocaleDateString()}</span>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Performance Summary</h4>
            <p className="text-sm text-muted-foreground">
              {user.name} is currently at {goalProgress.toFixed(1)}% of their yearly goal 
              with {fiscalProgress.toFixed(1)}% of the fiscal year completed.
              {goalProgress >= fiscalProgress 
                ? ' They are on track to meet their goal!' 
                : ` They need to increase sales by ${formatCurrency((user.yearlyGoal * (fiscalProgress / 100)) - user.sales)} to get back on track.`}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}