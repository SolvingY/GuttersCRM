import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trophy, Gift, Plus, Pencil, Trash2, Clock, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, differenceInHours, isPast, isFuture } from 'date-fns';

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  prize_value: number;
  start_date: string;
  end_date: string;
  metric_type: string;
  is_active: boolean;
  created_at: string;
}

interface LeaderEntry {
  userId: string;
  name: string;
  value: number;
}

export default function Contests() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<Record<string, LeaderEntry>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize_description: '',
    prize_value: '',
    start_date: '',
    end_date: '',
    metric_type: 'sales',
  });

  const fetchContests = async () => {
    const { data, error } = await supabase
      .from('contests')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching contests:', error);
      return;
    }

    setContests(data || []);
    
    // Fetch leaders for active contests
    const activeContests = (data || []).filter(c => c.is_active && !isPast(new Date(c.end_date)));
    for (const contest of activeContests) {
      await fetchLeaderForContest(contest);
    }
    
    setLoading(false);
  };

  const fetchLeaderForContest = async (contest: Contest) => {
    const { data: metricsData } = await supabase
      .from('user_metrics')
      .select('user_id, display_name, sales, leads, closed_deals')
      .order('metric_date', { ascending: false });

    if (!metricsData || metricsData.length === 0) return;

    // Get latest per user and find top
    const latestByUser = new Map<string, { name: string; value: number }>();
    for (const item of metricsData) {
      const key = item.user_id || `metric_${item.user_id}`;
      if (!latestByUser.has(key)) {
        let value = 0;
        if (contest.metric_type === 'sales') {
          value = Number(item.sales) || 0;
        } else if (contest.metric_type === 'leads') {
          value = Number(item.leads) || 0;
        } else {
          value = Number(item.closed_deals) || 0;
        }
        latestByUser.set(key, {
          name: item.display_name || 'Unknown',
          value,
        });
      }
    }

    const sorted = Array.from(latestByUser.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.value - a.value);

    if (sorted.length > 0) {
      setLeaders(prev => ({ ...prev, [contest.id]: sorted[0] }));
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      prize_description: '',
      prize_value: '',
      start_date: '',
      end_date: '',
      metric_type: 'sales',
    });
    setEditingContest(null);
  };

  const openEditDialog = (contest: Contest) => {
    setEditingContest(contest);
    setFormData({
      title: contest.title,
      description: contest.description || '',
      prize_description: contest.prize_description,
      prize_value: contest.prize_value.toString(),
      start_date: format(new Date(contest.start_date), "yyyy-MM-dd'T'HH:mm"),
      end_date: format(new Date(contest.end_date), "yyyy-MM-dd'T'HH:mm"),
      metric_type: contest.metric_type,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const contestData = {
      title: formData.title,
      description: formData.description || null,
      prize_description: formData.prize_description,
      prize_value: parseFloat(formData.prize_value) || 0,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
      metric_type: formData.metric_type,
      is_active: true,
    };

    if (editingContest) {
      const { error } = await supabase
        .from('contests')
        .update(contestData)
        .eq('id', editingContest.id);

      if (error) {
        toast({ title: 'Error updating contest', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Contest updated' });
    } else {
      const { error } = await supabase
        .from('contests')
        .insert(contestData);

      if (error) {
        toast({ title: 'Error creating contest', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Contest created' });
    }

    setDialogOpen(false);
    resetForm();
    fetchContests();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contest?')) return;

    const { error } = await supabase
      .from('contests')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting contest', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Contest deleted' });
    fetchContests();
  };

  const getContestStatus = (contest: Contest) => {
    const now = new Date();
    const start = new Date(contest.start_date);
    const end = new Date(contest.end_date);

    if (!contest.is_active) return { label: 'Inactive', variant: 'secondary' as const };
    if (isFuture(start)) return { label: 'Upcoming', variant: 'outline' as const };
    if (isPast(end)) return { label: 'Ended', variant: 'secondary' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    
    if (isPast(end)) return 'Ended';
    
    const days = differenceInDays(end, now);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    
    const hours = differenceInHours(end, now);
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  };

  const activeContest = contests.find(c => {
    const status = getContestStatus(c);
    return status.label === 'Active';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading text-foreground">Contests</h2>
          <p className="text-muted-foreground">Compete for prizes and recognition</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Contest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingContest ? 'Edit Contest' : 'Create Contest'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="prize_description">Prize Description</Label>
                  <Input
                    id="prize_description"
                    value={formData.prize_description}
                    onChange={(e) => setFormData({ ...formData, prize_description: e.target.value })}
                    placeholder="e.g., $500 Gift Card"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prize_value">Prize Value ($)</Label>
                  <Input
                    id="prize_value"
                    type="number"
                    value={formData.prize_value}
                    onChange={(e) => setFormData({ ...formData, prize_value: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="metric_type">Competition Metric</Label>
                  <Select
                    value={formData.metric_type}
                    onValueChange={(value) => setFormData({ ...formData, metric_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">YTD Sales Revenue</SelectItem>
                      <SelectItem value="leads">Leads Generated</SelectItem>
                      <SelectItem value="closed_deals">Closed Deals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingContest ? 'Update Contest' : 'Create Contest'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active Contest Banner */}
      {activeContest && (
        <Card className="bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border-accent/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/20 rounded-full">
                  <Trophy className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-heading text-foreground">{activeContest.title}</h3>
                    <Badge variant="default">Active</Badge>
                  </div>
                  {activeContest.description && (
                    <p className="text-muted-foreground mb-3">{activeContest.description}</p>
                  )}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-foreground">{activeContest.prize_description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{getTimeRemaining(activeContest.end_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Current Leader */}
              {leaders[activeContest.id] && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Leader</p>
                  <div className="flex items-center gap-2 justify-end">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <span className="text-lg font-heading text-foreground">{leaders[activeContest.id].name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeContest.metric_type === 'sales' 
                      ? `$${leaders[activeContest.id].value.toLocaleString()}`
                      : leaders[activeContest.id].value.toLocaleString()
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Contests */}
      <div className="grid gap-4">
        {contests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No contests yet</p>
              {isAdmin && <p className="text-sm text-muted-foreground mt-1">Click "New Contest" to create one</p>}
            </CardContent>
          </Card>
        ) : (
          contests.map((contest) => {
            const status = getContestStatus(contest);
            const isActive = status.label === 'Active';
            
            return (
              <Card key={contest.id} className={isActive ? 'border-accent/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{contest.title}</CardTitle>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(contest)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(contest.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Prize</p>
                      <p className="font-medium text-foreground">{contest.prize_description}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Metric</p>
                      <p className="font-medium text-foreground capitalize">{contest.metric_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start</p>
                      <p className="font-medium text-foreground">{format(new Date(contest.start_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End</p>
                      <p className="font-medium text-foreground">{format(new Date(contest.end_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  {contest.description && (
                    <p className="text-muted-foreground mt-3">{contest.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
