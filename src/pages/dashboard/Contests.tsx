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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy, Gift, Plus, Pencil, Trash2, Clock, Crown, CalendarIcon, Medal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

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
  icon: string;
  winner_user_id: string | null;
  winner_display_name: string | null;
  winner_value: number | null;
}

interface LeaderEntry {
  userId: string;
  name: string;
  value: number;
}

const EMOJI_OPTIONS = ['🏆', '🎯', '💰', '🔥', '⭐', '🚀', '💎', '👑', '🎉', '🏅', '💪', '🌟'];

export default function Contests() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<Record<string, LeaderEntry[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize_description: '',
    prize_value: '',
    start_date: undefined as Date | undefined,
    start_time: '09:00',
    end_date: undefined as Date | undefined,
    end_time: '17:00',
    metric_type: 'sales',
    icon: '🏆',
  });
  const [countdown, setCountdown] = useState<Record<string, string>>({});

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
      await fetchLeadersForContest(contest);
    }
    
    setLoading(false);
  };

  const fetchLeadersForContest = async (contest: Contest) => {
    const { data: metricsData } = await supabase
      .from('user_metrics')
      .select('user_id, display_name, sales, leads, closed_deals')
      .order('metric_date', { ascending: false });

    if (!metricsData || metricsData.length === 0) return;

    // Get latest per user and find top 3
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
      .sort((a, b) => b.value - a.value)
      .slice(0, 3); // Get top 3

    if (sorted.length > 0) {
      setLeaders(prev => ({ ...prev, [contest.id]: sorted }));
    }
  };

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      const activeContests = contests.filter(c => {
        const status = getContestStatus(c);
        return status.label === 'Active';
      });
      
      const newCountdowns: Record<string, string> = {};
      activeContests.forEach(contest => {
        newCountdowns[contest.id] = getDetailedTimeRemaining(contest.end_date);
      });
      setCountdown(newCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [contests]);

  useEffect(() => {
    fetchContests();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      prize_description: '',
      prize_value: '',
      start_date: undefined,
      start_time: '09:00',
      end_date: undefined,
      end_time: '17:00',
      metric_type: 'sales',
      icon: '🏆',
    });
    setEditingContest(null);
  };

  const openEditDialog = (contest: Contest) => {
    setEditingContest(contest);
    const startDate = new Date(contest.start_date);
    const endDate = new Date(contest.end_date);
    setFormData({
      title: contest.title,
      description: contest.description || '',
      prize_description: contest.prize_description,
      prize_value: contest.prize_value.toString(),
      start_date: startDate,
      start_time: format(startDate, 'HH:mm'),
      end_date: endDate,
      end_time: format(endDate, 'HH:mm'),
      metric_type: contest.metric_type,
      icon: contest.icon || '🏆',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.start_date || !formData.end_date) {
      toast({ title: 'Please select both start and end dates', variant: 'destructive' });
      return;
    }

    // Combine date and time
    const startDateTime = new Date(formData.start_date);
    const [startHours, startMinutes] = formData.start_time.split(':').map(Number);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(formData.end_date);
    const [endHours, endMinutes] = formData.end_time.split(':').map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    const contestData = {
      title: formData.title,
      description: formData.description || null,
      prize_description: formData.prize_description,
      prize_value: parseFloat(formData.prize_value) || 0,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      metric_type: formData.metric_type,
      icon: formData.icon,
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

  const getDetailedTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    
    if (isPast(end)) return 'Ended';
    
    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now) % 24;
    const minutes = differenceInMinutes(end, now) % 60;
    const seconds = differenceInSeconds(end, now) % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    return `${hours}h ${minutes}m ${seconds}s`;
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

  const getContestProgress = (contest: Contest) => {
    const start = new Date(contest.start_date);
    const end = new Date(contest.end_date);
    const now = new Date();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return (elapsed / total) * 100;
  };

  // Calculate contest wins leaderboard
  const getContestWinsLeaderboard = () => {
    const endedContests = contests.filter(c => c.winner_user_id && c.winner_display_name);
    const winsMap = new Map<string, { name: string; wins: number }>();
    
    endedContests.forEach(contest => {
      const userId = contest.winner_user_id!;
      const current = winsMap.get(userId);
      if (current) {
        current.wins += 1;
      } else {
        winsMap.set(userId, { name: contest.winner_display_name!, wins: 1 });
      }
    });
    
    return Array.from(winsMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 5);
  };

  const activeContest = contests.find(c => {
    const status = getContestStatus(c);
    return status.label === 'Active';
  });

  const winsLeaderboard = getContestWinsLeaderboard();

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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingContest ? 'Edit Contest' : 'Create Contest'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Emoji Selector */}
                <div>
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        className={cn(
                          "text-2xl p-2 rounded-lg border-2 transition-all hover:scale-110",
                          formData.icon === emoji 
                            ? "border-accent bg-accent/20" 
                            : "border-transparent bg-muted hover:bg-muted/80"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

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
                
                {/* Date Pickers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date ? format(formData.start_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => setFormData({ ...formData, start_date: date })}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.end_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end_date ? format(formData.end_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.end_date}
                          onSelect={(date) => setFormData({ ...formData, end_date: date })}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
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

      {/* Hall of Fame - Contest Wins Leaderboard */}
      {winsLeaderboard.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Medal className="h-5 w-5 text-yellow-500" />
              Hall of Fame
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {winsLeaderboard.map((winner, index) => (
                <div key={winner.userId} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-lg">
                    {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                  </span>
                  <span className="font-medium text-foreground">{winner.name}</span>
                  <Badge variant="secondary">{winner.wins} win{winner.wins > 1 ? 's' : ''}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Contest Banner */}
      {activeContest && (
        <Card className="bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border-accent/30">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-accent/20 rounded-full text-4xl">
                  {activeContest.icon || '🏆'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-heading text-foreground">{activeContest.title}</h3>
                    <Badge variant="default">Active</Badge>
                  </div>
                  {activeContest.description && (
                    <p className="text-muted-foreground mb-3">{activeContest.description}</p>
                  )}
                  <div className="flex items-center gap-6 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-foreground">{activeContest.prize_description}</span>
                    </div>
                    {activeContest.prize_value > 0 && (
                      <div className="flex items-center gap-1 bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                        <span className="font-bold">1st Place Prize: ${activeContest.prize_value.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Progress Bar with Countdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time Remaining</span>
                      <span className="font-mono font-semibold text-accent">
                        {countdown[activeContest.id] || getDetailedTimeRemaining(activeContest.end_date)}
                      </span>
                    </div>
                    <Progress value={getContestProgress(activeContest)} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(activeContest.start_date), 'MMM d')}</span>
                      <span>{format(new Date(activeContest.end_date), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Podium Display - Top 3 */}
              {leaders[activeContest.id] && leaders[activeContest.id].length > 0 && (
                <div className="w-full lg:w-auto">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center">Leaderboard</p>
                  <div className="flex items-end justify-center gap-2">
                    {/* 2nd Place */}
                    {leaders[activeContest.id][1] && (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl">🥈</span>
                        <div className="bg-muted/70 rounded-lg p-3 w-24 text-center">
                          <p className="text-xs font-medium text-foreground truncate">{leaders[activeContest.id][1].name}</p>
                          <p className="text-xs text-muted-foreground">
                            {activeContest.metric_type === 'sales' 
                              ? `$${leaders[activeContest.id][1].value.toLocaleString()}`
                              : leaders[activeContest.id][1].value.toLocaleString()
                            }
                          </p>
                          {leaders[activeContest.id][0] && (
                            <p className="text-xs text-red-500 font-medium mt-1">
                              -{activeContest.metric_type === 'sales' 
                                ? `$${(leaders[activeContest.id][0].value - leaders[activeContest.id][1].value).toLocaleString()}`
                                : (leaders[activeContest.id][0].value - leaders[activeContest.id][1].value).toLocaleString()
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 1st Place */}
                    {leaders[activeContest.id][0] && (
                      <div className="flex flex-col items-center -mt-4">
                        <Crown className="h-6 w-6 text-yellow-500 mb-1" />
                        <span className="text-3xl">🥇</span>
                        <div className="bg-accent/20 border border-accent/30 rounded-lg p-3 w-28 text-center">
                          <p className="text-sm font-semibold text-foreground truncate">{leaders[activeContest.id][0].name}</p>
                          <p className="text-sm text-accent font-bold">
                            {activeContest.metric_type === 'sales' 
                              ? `$${leaders[activeContest.id][0].value.toLocaleString()}`
                              : leaders[activeContest.id][0].value.toLocaleString()
                            }
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* 3rd Place */}
                    {leaders[activeContest.id][2] && (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl">🥉</span>
                        <div className="bg-muted/70 rounded-lg p-3 w-24 text-center">
                          <p className="text-xs font-medium text-foreground truncate">{leaders[activeContest.id][2].name}</p>
                          <p className="text-xs text-muted-foreground">
                            {activeContest.metric_type === 'sales' 
                              ? `$${leaders[activeContest.id][2].value.toLocaleString()}`
                              : leaders[activeContest.id][2].value.toLocaleString()
                            }
                          </p>
                          {leaders[activeContest.id][0] && (
                            <p className="text-xs text-red-500 font-medium mt-1">
                              -{activeContest.metric_type === 'sales' 
                                ? `$${(leaders[activeContest.id][0].value - leaders[activeContest.id][2].value).toLocaleString()}`
                                : (leaders[activeContest.id][0].value - leaders[activeContest.id][2].value).toLocaleString()
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
            const isEnded = status.label === 'Ended';
            
            return (
              <Card key={contest.id} className={isActive ? 'border-accent/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{contest.icon || '🏆'}</span>
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
                  {/* Progress bar for active contests */}
                  {isActive && (
                    <div className="mb-4 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(contest.start_date), 'MMM d')}</span>
                        <span className="font-mono text-accent">{countdown[contest.id] || getTimeRemaining(contest.end_date)}</span>
                        <span>{format(new Date(contest.end_date), 'MMM d')}</span>
                      </div>
                      <Progress value={getContestProgress(contest)} className="h-1.5" />
                    </div>
                  )}
                  
                  {/* Winner display for ended contests */}
                  {isEnded && contest.winner_display_name && (
                    <div className="mb-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm text-muted-foreground">Winner:</span>
                        <span className="font-semibold text-foreground">{contest.winner_display_name}</span>
                        {contest.winner_value && (
                          <Badge variant="secondary">
                            {contest.metric_type === 'sales' 
                              ? `$${contest.winner_value.toLocaleString()}`
                              : contest.winner_value.toLocaleString()
                            }
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
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