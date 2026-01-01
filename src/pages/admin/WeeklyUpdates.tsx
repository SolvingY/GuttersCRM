import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function WeeklyUpdates() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserMetric[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntry[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('current');

  const getWeekRange = (weekOption: string) => {
    const now = new Date();
    let weekStart: Date;
    
    if (weekOption === 'current') {
      weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
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
      // Get all users with their current metrics
      const { data, error } = await supabase
        .from('user_metrics')
        .select('user_id, display_name, sales, leads, closed_deals, earnings_ytd')
        .order('display_name', { ascending: true });

      if (error) throw error;

      // Get unique users (latest record per user)
      const uniqueUsers = new Map<string, UserMetric>();
      (data || []).forEach((item) => {
        if (item.user_id && !uniqueUsers.has(item.user_id)) {
          uniqueUsers.set(item.user_id, item as UserMetric);
        }
      });

      const userList = Array.from(uniqueUsers.values());
      setUsers(userList);

      // Initialize weekly entries with empty values
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

  const handleSaveAll = async () => {
    setSaving(true);
    const { weekStart } = getWeekRange(selectedWeek);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const entry of weeklyEntries) {
        const weeklySales = parseFloat(entry.weeklySales) || 0;
        const weeklyLeads = parseInt(entry.weeklyLeads) || 0;
        const weeklyClosedDeals = parseInt(entry.weeklyClosedDeals) || 0;
        const weeklyEarnings = parseFloat(entry.weeklyEarnings) || 0;

        // Skip if all values are 0 or empty
        if (weeklySales === 0 && weeklyLeads === 0 && weeklyClosedDeals === 0 && weeklyEarnings === 0) {
          continue;
        }

        // Get current user metrics
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

        // Calculate new totals
        const newSales = (Number(currentMetrics.sales) || 0) + weeklySales;
        const newLeads = (Number(currentMetrics.leads) || 0) + weeklyLeads;
        const newClosedDeals = (Number(currentMetrics.closed_deals) || 0) + weeklyClosedDeals;
        const newEarnings = (Number(currentMetrics.earnings_ytd) || 0) + weeklyEarnings;

        // Update user_metrics with new totals
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
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No users found. Add users first.</p>
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
                  {/* User name */}
                  <div className="font-medium text-foreground">
                    {entry.displayName}
                  </div>
                  
                  {/* Mobile labels + inputs */}
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
