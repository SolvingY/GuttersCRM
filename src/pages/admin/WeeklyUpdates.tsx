import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Calendar, TrendingUp, Users } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

interface UserMetric {
  user_id: string;
  display_name: string | null;
  sales: number;
  leads: number;
  closed_deals: number;
  earnings_ytd: number;
}

interface WeeklyEntry {
  userId: string;
  displayName: string;
  weeklySales: string;
  weeklyLeads: string;
  weeklyClosedDeals: string;
  weeklyEarnings: string;
}

interface CanvasserMetric {
  user_id: string;
  display_name: string | null;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  shifts_worked: number;
  income: number;
}

interface CanvasserWeeklyEntry {
  userId: string;
  displayName: string;
  weeklyLeadsSet: string;
  weeklyLeadsClosed: string;
  weeklyLeadsWithDamage: string;
  weeklyShiftsWorked: string;
  weeklyIncome: string;
}

export default function WeeklyUpdates() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserMetric[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntry[]>([]);
  const [canvassers, setCanvassers] = useState<CanvasserMetric[]>([]);
  const [canvasserEntries, setCanvasserEntries] = useState<CanvasserWeeklyEntry[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('current');
  const [activeTab, setActiveTab] = useState<string>('sales-reps');

  const getWeekRange = (weekOption: string) => {
    const now = new Date();
    let weekStart: Date;
    
    if (weekOption === 'current') {
      weekStart = startOfWeek(now, { weekStartsOn: 1 });
    } else if (weekOption === 'previous') {
      weekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    } else {
      weekStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
    }
    
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return { weekStart, weekEnd };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch sales reps
      const { data: salesData, error: salesError } = await supabase
        .from('user_metrics')
        .select('user_id, display_name, sales, leads, closed_deals, earnings_ytd')
        .order('display_name', { ascending: true });

      if (salesError) throw salesError;

      const uniqueUsers = new Map<string, UserMetric>();
      (salesData || []).forEach((item) => {
        if (item.user_id && !uniqueUsers.has(item.user_id)) {
          uniqueUsers.set(item.user_id, item as UserMetric);
        }
      });

      const userList = Array.from(uniqueUsers.values());
      setUsers(userList);

      setWeeklyEntries(
        userList.map((user) => ({
          userId: user.user_id,
          displayName: user.display_name || 'Unknown',
          weeklySales: '',
          weeklyLeads: '',
          weeklyClosedDeals: '',
          weeklyEarnings: '',
        }))
      );

      // Fetch canvassers
      const { data: canvasserData, error: canvasserError } = await supabase
        .from('canvasser_metrics')
        .select('user_id, display_name, leads_set, leads_closed, leads_with_damage, shifts_worked, income')
        .order('display_name', { ascending: true });

      if (canvasserError) throw canvasserError;

      const uniqueCanvassers = new Map<string, CanvasserMetric>();
      (canvasserData || []).forEach((item) => {
        if (item.user_id && !uniqueCanvassers.has(item.user_id)) {
          uniqueCanvassers.set(item.user_id, item as CanvasserMetric);
        }
      });

      const canvasserList = Array.from(uniqueCanvassers.values());
      setCanvassers(canvasserList);

      setCanvasserEntries(
        canvasserList.map((canvasser) => ({
          userId: canvasser.user_id,
          displayName: canvasser.display_name || 'Unknown',
          weeklyLeadsSet: '',
          weeklyLeadsClosed: '',
          weeklyLeadsWithDamage: '',
          weeklyShiftsWorked: '',
          weeklyIncome: '',
        }))
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateEntry = (userId: string, field: keyof WeeklyEntry, value: string) => {
    setWeeklyEntries((prev) =>
      prev.map((entry) =>
        entry.userId === userId ? { ...entry, [field]: value } : entry
      )
    );
  };

  const updateCanvasserEntry = (userId: string, field: keyof CanvasserWeeklyEntry, value: string) => {
    setCanvasserEntries((prev) =>
      prev.map((entry) =>
        entry.userId === userId ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      // Save Sales Rep entries
      for (const entry of weeklyEntries) {
        const weeklySales = parseFloat(entry.weeklySales) || 0;
        const weeklyLeads = parseInt(entry.weeklyLeads) || 0;
        const weeklyClosedDeals = parseInt(entry.weeklyClosedDeals) || 0;
        const weeklyEarnings = parseFloat(entry.weeklyEarnings) || 0;

        if (weeklySales === 0 && weeklyLeads === 0 && weeklyClosedDeals === 0 && weeklyEarnings === 0) {
          continue;
        }

        const { data: currentMetrics, error: fetchError } = await supabase
          .from('user_metrics')
          .select('*')
          .eq('user_id', entry.userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          console.error('Error fetching metrics for user:', entry.userId, fetchError);
          errorCount++;
          continue;
        }

        const newSales = (Number(currentMetrics.sales) || 0) + weeklySales;
        const newLeads = (Number(currentMetrics.leads) || 0) + weeklyLeads;
        const newClosedDeals = (Number(currentMetrics.closed_deals) || 0) + weeklyClosedDeals;
        const newEarnings = (Number(currentMetrics.earnings_ytd) || 0) + weeklyEarnings;

        const { error: updateError } = await supabase
          .from('user_metrics')
          .update({
            sales: newSales,
            leads: newLeads,
            closed_deals: newClosedDeals,
            earnings_ytd: newEarnings,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', entry.userId);

        if (updateError) {
          console.error('Error updating metrics for user:', entry.userId, updateError);
          errorCount++;
        } else {
          successCount++;
        }
      }

      // Save Canvasser entries
      for (const entry of canvasserEntries) {
        const weeklyLeadsSet = parseInt(entry.weeklyLeadsSet) || 0;
        const weeklyLeadsClosed = parseInt(entry.weeklyLeadsClosed) || 0;
        const weeklyLeadsWithDamage = parseInt(entry.weeklyLeadsWithDamage) || 0;
        const weeklyShiftsWorked = parseInt(entry.weeklyShiftsWorked) || 0;
        const weeklyIncome = parseFloat(entry.weeklyIncome) || 0;

        if (weeklyLeadsSet === 0 && weeklyLeadsClosed === 0 && weeklyLeadsWithDamage === 0 && weeklyShiftsWorked === 0 && weeklyIncome === 0) {
          continue;
        }

        const { data: currentMetrics, error: fetchError } = await supabase
          .from('canvasser_metrics')
          .select('*')
          .eq('user_id', entry.userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          console.error('Error fetching metrics for canvasser:', entry.userId, fetchError);
          errorCount++;
          continue;
        }

        const newLeadsSet = (Number(currentMetrics.leads_set) || 0) + weeklyLeadsSet;
        const newLeadsClosed = (Number(currentMetrics.leads_closed) || 0) + weeklyLeadsClosed;
        const newLeadsWithDamage = (Number(currentMetrics.leads_with_damage) || 0) + weeklyLeadsWithDamage;
        const newShiftsWorked = (Number(currentMetrics.shifts_worked) || 0) + weeklyShiftsWorked;
        const newIncome = (Number(currentMetrics.income) || 0) + weeklyIncome;

        const { error: updateError } = await supabase
          .from('canvasser_metrics')
          .update({
            leads_set: newLeadsSet,
            leads_closed: newLeadsClosed,
            leads_with_damage: newLeadsWithDamage,
            shifts_worked: newShiftsWorked,
            income: newIncome,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', entry.userId);

        if (updateError) {
          console.error('Error updating metrics for canvasser:', entry.userId, updateError);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Weekly Updates Saved',
          description: `Successfully updated ${successCount} user(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });

        // Reset entries
        setWeeklyEntries((prev) =>
          prev.map((entry) => ({
            ...entry,
            weeklySales: '',
            weeklyLeads: '',
            weeklyClosedDeals: '',
            weeklyEarnings: '',
          }))
        );
        setCanvasserEntries((prev) =>
          prev.map((entry) => ({
            ...entry,
            weeklyLeadsSet: '',
            weeklyLeadsClosed: '',
            weeklyLeadsWithDamage: '',
            weeklyShiftsWorked: '',
            weeklyIncome: '',
          }))
        );
      } else if (errorCount > 0) {
        toast({
          title: 'Error',
          description: `Failed to update ${errorCount} user(s)`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'No Changes',
          description: 'No weekly data was entered to save',
        });
      }
    } catch (error) {
      console.error('Error saving weekly updates:', error);
      toast({
        title: 'Error',
        description: 'Failed to save weekly updates',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const { weekStart, weekEnd } = getWeekRange(selectedWeek);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Weekly Updates</h1>
          <p className="text-sm text-muted-foreground">Enter weekly numbers for each team member</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Week</SelectItem>
              <SelectItem value="previous">Previous Week</SelectItem>
              <SelectItem value="twoWeeksAgo">2 Weeks Ago</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleSaveAll} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-5 w-5 text-accent" />
            Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </CardTitle>
          <CardDescription>
            Enter the weekly numbers for each team member. These will be added to their yearly totals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="sales-reps">Sales Reps ({users.length})</TabsTrigger>
              <TabsTrigger value="canvassers">Canvassers ({canvassers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="sales-reps">
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No sales reps found. Invite users first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header row - hidden on mobile */}
                  <div className="hidden md:grid md:grid-cols-5 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                    <div>Team Member</div>
                    <div>Weekly Sales ($)</div>
                    <div>Weekly Leads</div>
                    <div>Closed Deals</div>
                    <div>Earnings ($)</div>
                  </div>

                  {weeklyEntries.map((entry) => (
                    <div key={entry.userId} className="space-y-3 md:space-y-0 md:grid md:grid-cols-5 md:gap-4 md:items-center p-4 md:p-0 bg-muted/30 md:bg-transparent rounded-lg md:rounded-none">
                      <div className="font-medium text-foreground">
                        {entry.displayName}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 md:contents">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground md:hidden">Weekly Sales ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={entry.weeklySales}
                            onChange={(e) => updateEntry(entry.userId, 'weeklySales', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground md:hidden">Weekly Leads</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={entry.weeklyLeads}
                            onChange={(e) => updateEntry(entry.userId, 'weeklyLeads', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground md:hidden">Closed Deals</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={entry.weeklyClosedDeals}
                            onChange={(e) => updateEntry(entry.userId, 'weeklyClosedDeals', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground md:hidden">Earnings ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={entry.weeklyEarnings}
                            onChange={(e) => updateEntry(entry.userId, 'weeklyEarnings', e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="canvassers">
              {canvassers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No canvassers found. Invite canvassers first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header row - hidden on mobile */}
                  <div className="hidden md:grid md:grid-cols-6 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                    <div>Team Member</div>
                    <div>Leads Set</div>
                    <div>Leads Closed</div>
                    <div>w/ Damage</div>
                    <div>Shifts</div>
                    <div>Income ($)</div>
                  </div>

                  {canvasserEntries.map((entry) => (
                    <div key={entry.userId} className="space-y-3 md:space-y-0 md:grid md:grid-cols-6 md:gap-4 md:items-center p-4 md:p-0 bg-muted/30 md:bg-transparent rounded-lg md:rounded-none">
                      <div className="font-medium text-foreground">
                        {entry.displayName}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:contents">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground md:hidden">Leads Set</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={entry.weeklyLeadsSet}
                            onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyLeadsSet', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground md:hidden">Leads Closed</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={entry.weeklyLeadsClosed}
                            onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyLeadsClosed', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground md:hidden">w/ Damage</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={entry.weeklyLeadsWithDamage}
                            onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyLeadsWithDamage', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground md:hidden">Shifts</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={entry.weeklyShiftsWorked}
                            onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyShiftsWorked', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground md:hidden">Income ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={entry.weeklyIncome}
                            onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyIncome', e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-accent mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How it works</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Enter the weekly numbers for each team member</li>
                <li>Click "Save All" to add these numbers to their yearly totals</li>
                <li>The leaderboard and contests will update automatically</li>
                <li>You can go back and update previous weeks if needed</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
