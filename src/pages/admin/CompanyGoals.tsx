import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, Target, DollarSign, Users, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface CompanyGoal {
  id: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
  sales_revenue_goal: number;
  canvasser_leads_goal: number;
  description: string | null;
}

interface CompanyProgress {
  totalSales: number;
  totalLeadsClosed: number;
  salesRepsCount: number;
  canvassersCount: number;
}

export default function CompanyGoals() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState<CompanyGoal | null>(null);
  const [progress, setProgress] = useState<CompanyProgress>({
    totalSales: 0,
    totalLeadsClosed: 0,
    salesRepsCount: 0,
    canvassersCount: 0,
  });

  // Form state
  const [salesGoal, setSalesGoal] = useState('');
  const [leadsGoal, setLeadsGoal] = useState('');
  const [description, setDescription] = useState('');

  const fiscalStart = new Date(2025, 11, 15); // Dec 15, 2025
  const fiscalEnd = new Date(2026, 11, 15); // Dec 15, 2026

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch existing company goal
      const { data: goalData } = await supabase
        .from('company_goals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalData) {
        setGoal(goalData);
        setSalesGoal(String(goalData.sales_revenue_goal || ''));
        setLeadsGoal(String(goalData.canvasser_leads_goal || ''));
        setDescription(goalData.description || '');
      }

      // Fetch sales rep metrics
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const salesRepIds = rolesData?.filter(r => r.role === 'user' || r.role === 'admin').map(r => r.user_id) || [];
      const canvasserIds = rolesData?.filter(r => r.role === 'canvasser').map(r => r.user_id) || [];

      // Fetch total sales from sales reps
      const { data: salesData } = salesRepIds.length > 0
        ? await supabase
            .from('user_metrics')
            .select('user_id, sales')
            .in('user_id', salesRepIds)
            .order('metric_date', { ascending: false })
        : { data: [] };

      // Get latest sales per user
      const salesByUser = new Map<string, number>();
      salesData?.forEach(s => {
        if (!salesByUser.has(s.user_id)) {
          salesByUser.set(s.user_id, Number(s.sales) || 0);
        }
      });
      const totalSales = Array.from(salesByUser.values()).reduce((sum, s) => sum + s, 0);

      // Fetch total leads from canvassers
      const { data: canvasserData } = canvasserIds.length > 0
        ? await supabase
            .from('canvasser_metrics')
            .select('user_id, leads_closed')
            .in('user_id', canvasserIds)
            .order('metric_date', { ascending: false })
        : { data: [] };

      // Get latest leads per user
      const leadsByUser = new Map<string, number>();
      canvasserData?.forEach(c => {
        if (!leadsByUser.has(c.user_id)) {
          leadsByUser.set(c.user_id, Number(c.leads_closed) || 0);
        }
      });
      const totalLeadsClosed = Array.from(leadsByUser.values()).reduce((sum, l) => sum + l, 0);

      setProgress({
        totalSales,
        totalLeadsClosed,
        salesRepsCount: salesByUser.size,
        canvassersCount: leadsByUser.size,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const goalData = {
        fiscal_year_start: format(fiscalStart, 'yyyy-MM-dd'),
        fiscal_year_end: format(fiscalEnd, 'yyyy-MM-dd'),
        sales_revenue_goal: parseFloat(salesGoal) || 0,
        canvasser_leads_goal: parseInt(leadsGoal) || 0,
        description: description || null,
      };

      if (goal?.id) {
        // Update existing goal
        const { error } = await supabase
          .from('company_goals')
          .update(goalData)
          .eq('id', goal.id);

        if (error) throw error;
      } else {
        // Insert new goal
        const { error } = await supabase
          .from('company_goals')
          .insert(goalData);

        if (error) throw error;
      }

      toast({
        title: 'Company Goals Saved',
        description: 'Your company-wide goals have been updated.',
      });

      fetchData();
    } catch (error) {
      console.error('Error saving goals:', error);
      toast({
        title: 'Error',
        description: 'Failed to save company goals',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const salesGoalNum = parseFloat(salesGoal) || 0;
  const leadsGoalNum = parseInt(leadsGoal) || 0;
  const salesProgress = salesGoalNum > 0 ? (progress.totalSales / salesGoalNum) * 100 : 0;
  const leadsProgress = leadsGoalNum > 0 ? (progress.totalLeadsClosed / leadsGoalNum) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Company Goals</h1>
        <p className="text-sm text-muted-foreground">
          Set and track 12-month company-wide goals for sales and canvassing teams
        </p>
      </div>

      {/* Goal Setting Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Fiscal Year Goals
          </CardTitle>
          <CardDescription>
            Dec 15, 2025 - Dec 15, 2026
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesGoal">Company Sales Revenue Goal ($)</Label>
              <Input
                id="salesGoal"
                type="number"
                min="0"
                step="1000"
                placeholder="e.g., 5000000"
                value={salesGoal}
                onChange={(e) => setSalesGoal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Combined target for all sales reps
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadsGoal">Company Leads Closed Goal</Label>
              <Input
                id="leadsGoal"
                type="number"
                min="0"
                placeholder="e.g., 1000"
                value={leadsGoal}
                onChange={(e) => setLeadsGoal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Combined target for all canvassers
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="e.g., Q4 push for end of year targets"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Goals
          </Button>
        </CardContent>
      </Card>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales Progress */}
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-accent" />
              Sales Revenue Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(progress.totalSales)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="text-xl font-semibold text-foreground">{formatCurrency(salesGoalNum)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={Math.min(salesProgress, 100)} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progress.salesRepsCount} sales reps</span>
                <span className={salesProgress >= 100 ? 'text-green-500 font-semibold' : 'text-foreground font-semibold'}>
                  {salesProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            {salesGoalNum > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Remaining to goal</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(Math.max(0, salesGoalNum - progress.totalSales))}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads Progress */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Canvasser Leads Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-3xl font-bold text-foreground">{progress.totalLeadsClosed.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="text-xl font-semibold text-foreground">{leadsGoalNum.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={Math.min(leadsProgress, 100)} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progress.canvassersCount} canvassers</span>
                <span className={leadsProgress >= 100 ? 'text-green-500 font-semibold' : 'text-foreground font-semibold'}>
                  {leadsProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            {leadsGoalNum > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Remaining to goal</p>
                <p className="text-lg font-semibold text-foreground">
                  {Math.max(0, leadsGoalNum - progress.totalLeadsClosed).toLocaleString()} leads
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-accent mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How Company Goals Work</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Set annual targets for combined sales revenue and canvasser leads closed</li>
                <li>Progress is automatically calculated from all team members' metrics</li>
                <li>Sales reps contribute to the revenue goal, canvassers contribute to the leads goal</li>
                <li>Track company-wide performance against targets in real-time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
