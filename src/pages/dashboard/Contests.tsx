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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Trophy, Gift, Plus, Pencil, Trash2, Clock, Crown, CalendarIcon, Medal, BarChart3, Users, DollarSign, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  prize_value: number;
  prize_2nd_value: number | null;
  prize_2nd_description: string | null;
  prize_3rd_value: number | null;
  prize_3rd_description: string | null;
  start_date: string;
  end_date: string;
  metric_type: string;
  is_active: boolean;
  created_at: string;
  icon: string;
  winner_user_id: string | null;
  winner_display_name: string | null;
  winner_value: number | null;
  target_role: string;
  points_awarded: boolean;
}

interface LeaderEntry {
  userId: string;
  name: string;
  value: number;
}

const EMOJI_OPTIONS = ['🏆', '🎯', '💰', '🔥', '⭐', '🚀', '💎', '👑', '🎉', '🏅', '💪', '🌟'];

// Active Contest Banner Component
function ActiveContestBanner({ 
  contest, 
  countdown, 
  getDetailedTimeRemaining, 
  getContestProgress, 
  leaders 
}: { 
  contest: Contest; 
  countdown: Record<string, string>; 
  getDetailedTimeRemaining: (endDate: string) => string;
  getContestProgress: (contest: Contest) => number;
  leaders: Record<string, LeaderEntry[]>;
}) {
  return (
    <Card className="bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border-accent/30">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-accent/20 rounded-full text-4xl">
              {contest.icon || '🏆'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-heading text-foreground">{contest.title}</h3>
                <Badge variant="default">Active</Badge>
              </div>
              {contest.description && (
                <p className="text-muted-foreground mb-3">{contest.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-foreground">{contest.prize_description}</span>
                </div>
                {contest.prize_value > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full text-xs">
                    <span className="text-lg">🥇</span>
                    <span className="font-bold">${contest.prize_value.toLocaleString()}</span>
                  </div>
                )}
                {contest.prize_2nd_value && contest.prize_2nd_value > 0 && (
                  <div className="flex items-center gap-1 bg-gray-400/20 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                    <span className="text-lg">🥈</span>
                    <span className="font-bold">${contest.prize_2nd_value.toLocaleString()}</span>
                  </div>
                )}
                {contest.prize_3rd_value && contest.prize_3rd_value > 0 && (
                  <div className="flex items-center gap-1 bg-amber-600/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full text-xs">
                    <span className="text-lg">🥉</span>
                    <span className="font-bold">${contest.prize_3rd_value.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              {/* Progress Bar with Countdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time Remaining</span>
                  <span className="font-mono font-semibold text-accent">
                    {countdown[contest.id] || getDetailedTimeRemaining(contest.end_date)}
                  </span>
                </div>
                <Progress value={getContestProgress(contest)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(contest.start_date), 'MMM d')}</span>
                  <span>{format(new Date(contest.end_date), 'MMM d')}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Podium Display - Top 3 */}
          {leaders[contest.id] && leaders[contest.id].length > 0 && (
            <div className="w-full lg:w-auto">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center">Leaderboard</p>
              <div className="flex items-end justify-center gap-2 sm:gap-3">
                {/* 2nd Place - Medium Height */}
                {leaders[contest.id][1] && (
                  <div className="flex flex-col items-center">
                    <span className="text-xl sm:text-2xl">🥈</span>
                    <div className="bg-muted/70 rounded-lg p-2 sm:p-3 w-20 sm:w-24 text-center h-32 sm:h-36 flex flex-col justify-start pt-2 overflow-hidden">
                      <p className="text-xs font-medium text-foreground truncate px-1" title={leaders[contest.id][1].name}>{leaders[contest.id][1].name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contest.metric_type === 'sales' 
                          ? `$${leaders[contest.id][1].value.toLocaleString()}`
                          : leaders[contest.id][1].value.toLocaleString()
                        }
                      </p>
                      {leaders[contest.id][0] && (
                        <p className="text-xs text-red-500 font-medium mt-0.5">
                          -{contest.metric_type === 'sales' 
                            ? `$${(leaders[contest.id][0].value - leaders[contest.id][1].value).toLocaleString()}`
                            : (leaders[contest.id][0].value - leaders[contest.id][1].value).toLocaleString()
                          }
                        </p>
                      )}
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">+50 pts</p>
                      {contest.prize_2nd_value && contest.prize_2nd_value > 0 && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">${contest.prize_2nd_value.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 1st Place - Tallest Podium */}
                {leaders[contest.id][0] && (
                  <div className="flex flex-col items-center">
                    <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 mb-1" />
                    <span className="text-2xl sm:text-3xl">🥇</span>
                    <div className="bg-accent/20 border border-accent/30 rounded-lg p-2 sm:p-3 w-24 sm:w-28 text-center h-36 sm:h-44 flex flex-col justify-start pt-3">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{leaders[contest.id][0].name}</p>
                      <p className="text-xs sm:text-sm text-accent font-bold">
                        {contest.metric_type === 'sales' 
                          ? `$${leaders[contest.id][0].value.toLocaleString()}`
                          : leaders[contest.id][0].value.toLocaleString()
                        }
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold mt-1">+100 pts</p>
                      {contest.prize_value > 0 && (
                        <p className="text-xs text-green-600 font-medium mt-1">${contest.prize_value.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 3rd Place - Shortest Podium */}
                {leaders[contest.id][2] && (
                  <div className="flex flex-col items-center">
                    <span className="text-xl sm:text-2xl">🥉</span>
                    <div className="bg-muted/70 rounded-lg p-2 sm:p-3 w-20 sm:w-24 text-center h-28 sm:h-32 flex flex-col justify-start pt-2 overflow-hidden">
                      <p className="text-xs font-medium text-foreground truncate px-1" title={leaders[contest.id][2].name}>{leaders[contest.id][2].name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contest.metric_type === 'sales' 
                          ? `$${leaders[contest.id][2].value.toLocaleString()}`
                          : leaders[contest.id][2].value.toLocaleString()
                        }
                      </p>
                      {leaders[contest.id][0] && (
                        <p className="text-xs text-red-500 font-medium mt-0.5">
                          -{contest.metric_type === 'sales' 
                            ? `$${(leaders[contest.id][0].value - leaders[contest.id][2].value).toLocaleString()}`
                            : (leaders[contest.id][0].value - leaders[contest.id][2].value).toLocaleString()
                          }
                        </p>
                      )}
                      <p className="text-xs text-amber-600 font-semibold mt-0.5">+25 pts</p>
                      {contest.prize_3rd_value && contest.prize_3rd_value > 0 && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">${contest.prize_3rd_value.toLocaleString()}</p>
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
  );
}

// Contest Card Component
function ContestCard({ 
  contest, 
  isAdmin, 
  countdown, 
  getContestStatus, 
  getTimeRemaining, 
  getContestProgress, 
  openEditDialog, 
  handleDelete, 
  handleFinalizeContest, 
  finalizingContest 
}: { 
  contest: Contest; 
  isAdmin: boolean; 
  countdown: Record<string, string>; 
  getContestStatus: (contest: Contest) => { label: string; variant: 'default' | 'secondary' | 'outline' };
  getTimeRemaining: (endDate: string) => string;
  getContestProgress: (contest: Contest) => number;
  openEditDialog: (contest: Contest) => void;
  handleDelete: (id: string) => void;
  handleFinalizeContest: (id: string) => void;
  finalizingContest: string | null;
}) {
  const status = getContestStatus(contest);
  const isActive = status.label === 'Active';
  const isEnded = status.label === 'Ended';
  
  return (
    <Card className={isActive ? 'border-accent/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{contest.icon || '🏆'}</span>
            <CardTitle className="text-lg">{contest.title}</CardTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              {isEnded && !contest.points_awarded && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleFinalizeContest(contest.id)}
                  disabled={finalizingContest === contest.id}
                  className="text-accent border-accent/50 hover:bg-accent/10"
                >
                  {finalizingContest === contest.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trophy className="h-4 w-4 mr-1" />
                  )}
                  Finalize
                </Button>
              )}
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
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Team</p>
            <p className="font-medium text-foreground capitalize">{contest.target_role === 'canvasser' ? 'Canvassers' : 'Sales Reps'}</p>
          </div>
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
}


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
    prize_2nd_value: '',
    prize_2nd_description: '',
    prize_3rd_value: '',
    prize_3rd_description: '',
    start_date: undefined as Date | undefined,
    start_time: '09:00',
    end_date: undefined as Date | undefined,
    end_time: '17:00',
    metric_type: 'sales',
    target_role: 'user',
    icon: '🏆',
  });
  const [countdown, setCountdown] = useState<Record<string, string>>({});
  const [finalizingContest, setFinalizingContest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'canvasser'>('user');

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
    const targetRole = contest.target_role || 'user';
    const tableName = targetRole === 'canvasser' ? 'canvasser_metrics' : 'user_metrics';
    
    if (targetRole === 'canvasser') {
      const { data: metricsData } = await supabase
        .from('canvasser_metrics')
        .select('user_id, display_name, leads_set, leads_closed, shifts_worked')
        .order('metric_date', { ascending: false });

      if (!metricsData || metricsData.length === 0) return;

      const latestByUser = new Map<string, { name: string; value: number }>();
      for (const item of metricsData) {
        const key = item.user_id;
        if (!latestByUser.has(key)) {
          let value = 0;
          if (contest.metric_type === 'leads_set') {
            value = Number(item.leads_set) || 0;
          } else if (contest.metric_type === 'shifts_worked') {
            value = Number(item.shifts_worked) || 0;
          } else if (contest.metric_type === 'conversion_rate') {
            const leadsSet = Number(item.leads_set) || 0;
            const leadsClosed = Number(item.leads_closed) || 0;
            value = leadsSet > 0 ? (leadsClosed / leadsSet) * 100 : 0;
          } else if (contest.metric_type === 'leads_closed') {
            value = Number(item.leads_closed) || 0;
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
        .slice(0, 3);

      if (sorted.length > 0) {
        setLeaders(prev => ({ ...prev, [contest.id]: sorted }));
      }
    } else {
      const { data: metricsData } = await supabase
        .from('user_metrics')
        .select('user_id, display_name, sales, leads, closed_deals')
        .order('metric_date', { ascending: false });

      if (!metricsData || metricsData.length === 0) return;

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
        .slice(0, 3);

      if (sorted.length > 0) {
        setLeaders(prev => ({ ...prev, [contest.id]: sorted }));
      }
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
      prize_2nd_value: '',
      prize_2nd_description: '',
      prize_3rd_value: '',
      prize_3rd_description: '',
      start_date: undefined,
      start_time: '09:00',
      end_date: undefined,
      end_time: '17:00',
      metric_type: 'sales',
      target_role: 'user',
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
      prize_2nd_value: (contest.prize_2nd_value || '').toString(),
      prize_2nd_description: contest.prize_2nd_description || '',
      prize_3rd_value: (contest.prize_3rd_value || '').toString(),
      prize_3rd_description: contest.prize_3rd_description || '',
      start_date: startDate,
      start_time: format(startDate, 'HH:mm'),
      end_date: endDate,
      end_time: format(endDate, 'HH:mm'),
      metric_type: contest.metric_type,
      target_role: contest.target_role || 'user',
      icon: contest.icon || '🏆',
    });
    setDialogOpen(true);
  };

  const handleFinalizeContest = async (contestId: string) => {
    setFinalizingContest(contestId);
    try {
      const { data, error } = await supabase.functions.invoke('finalize-contest', {
        body: { contestId },
      });

      if (error) throw error;

      toast({
        title: 'Contest Finalized!',
        description: 'Winners have been determined and points awarded.',
      });
      
      fetchContests();
    } catch (error: any) {
      toast({
        title: 'Error finalizing contest',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setFinalizingContest(null);
    }
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
      prize_2nd_value: parseFloat(formData.prize_2nd_value) || 0,
      prize_2nd_description: formData.prize_2nd_description || null,
      prize_3rd_value: parseFloat(formData.prize_3rd_value) || 0,
      prize_3rd_description: formData.prize_3rd_description || null,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      metric_type: formData.metric_type,
      target_role: formData.target_role,
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

  // Filter contests by target_role
  const salesRepContests = contests.filter(c => c.target_role === 'user' || !c.target_role);
  const canvasserContests = contests.filter(c => c.target_role === 'canvasser');

  // Sort function to put active contests first, then upcoming, then ended
  const sortContestsByStatus = (contestList: Contest[]) => {
    return [...contestList].sort((a, b) => {
      const statusOrder: Record<string, number> = { 'Active': 0, 'Upcoming': 1, 'Ended': 2, 'Inactive': 3 };
      const statusA = getContestStatus(a).label;
      const statusB = getContestStatus(b).label;
      
      // First sort by status priority
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB];
      }
      
      // Then sort by start_date descending within same status
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
  };

  const sortedSalesRepContests = sortContestsByStatus(salesRepContests);
  const sortedCanvasserContests = sortContestsByStatus(canvasserContests);

  // Get active contest for a specific role
  const getActiveContestForTab = (role: 'user' | 'canvasser') => {
    return contests.find(c => {
      const targetRole = c.target_role || 'user';
      const status = getContestStatus(c);
      return targetRole === role && status.label === 'Active';
    });
  };

  const winsLeaderboard = getContestWinsLeaderboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-heading text-foreground">Contests</h2>
          <p className="text-sm text-muted-foreground">Compete for prizes and recognition</p>
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
                {/* 1st Place Prize */}
                <div className="space-y-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🥇</span>
                    <Label className="font-semibold">1st Place Prize</Label>
                  </div>
                  <div>
                    <Label htmlFor="prize_description">Description</Label>
                    <Input
                      id="prize_description"
                      value={formData.prize_description}
                      onChange={(e) => setFormData({ ...formData, prize_description: e.target.value })}
                      placeholder="e.g., $500 Gift Card"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="prize_value">Value ($)</Label>
                    <Input
                      id="prize_value"
                      type="number"
                      value={formData.prize_value}
                      onChange={(e) => setFormData({ ...formData, prize_value: e.target.value })}
                    />
                  </div>
                </div>

                {/* 2nd Place Prize */}
                <div className="space-y-2 p-3 bg-gray-400/10 rounded-lg border border-gray-400/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🥈</span>
                    <Label className="font-semibold">2nd Place Prize</Label>
                  </div>
                  <div>
                    <Label htmlFor="prize_2nd_description">Description</Label>
                    <Input
                      id="prize_2nd_description"
                      value={formData.prize_2nd_description}
                      onChange={(e) => setFormData({ ...formData, prize_2nd_description: e.target.value })}
                      placeholder="e.g., $250 Gift Card"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prize_2nd_value">Value ($)</Label>
                    <Input
                      id="prize_2nd_value"
                      type="number"
                      value={formData.prize_2nd_value}
                      onChange={(e) => setFormData({ ...formData, prize_2nd_value: e.target.value })}
                    />
                  </div>
                </div>

                {/* 3rd Place Prize */}
                <div className="space-y-2 p-3 bg-amber-600/10 rounded-lg border border-amber-600/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🥉</span>
                    <Label className="font-semibold">3rd Place Prize</Label>
                  </div>
                  <div>
                    <Label htmlFor="prize_3rd_description">Description</Label>
                    <Input
                      id="prize_3rd_description"
                      value={formData.prize_3rd_description}
                      onChange={(e) => setFormData({ ...formData, prize_3rd_description: e.target.value })}
                      placeholder="e.g., $100 Gift Card"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prize_3rd_value">Value ($)</Label>
                    <Input
                      id="prize_3rd_value"
                      type="number"
                      value={formData.prize_3rd_value}
                      onChange={(e) => setFormData({ ...formData, prize_3rd_value: e.target.value })}
                    />
                  </div>
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
                  <Label htmlFor="target_role">Target Team</Label>
                  <Select
                    value={formData.target_role}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      target_role: value,
                      metric_type: value === 'canvasser' ? 'leads_set' : 'sales' 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Sales Reps</SelectItem>
                      <SelectItem value="canvasser">Canvassers</SelectItem>
                    </SelectContent>
                  </Select>
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
                      {formData.target_role === 'canvasser' ? (
                        <>
                          <SelectItem value="leads_set">Leads Set</SelectItem>
                          <SelectItem value="leads_closed">Leads Closed</SelectItem>
                          <SelectItem value="shifts_worked">Shifts Worked</SelectItem>
                          <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="sales">YTD Sales Revenue</SelectItem>
                          <SelectItem value="leads">Leads Generated</SelectItem>
                          <SelectItem value="closed_deals">Closed Deals</SelectItem>
                        </>
                      )}
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

      {/* Contest Analytics */}
      {isAdmin && (
        <Card className="bg-gradient-to-r from-primary/5 via-background to-background border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Contest Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Contests</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{contests.length}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Active Now</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {contests.filter(c => getContestStatus(c).label === 'Active').length}
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Prizes Awarded</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  ${contests
                    .filter(c => getContestStatus(c).label === 'Ended' && c.winner_user_id)
                    .reduce((sum, c) => sum + (c.prize_value || 0) + (c.prize_2nd_value || 0) + (c.prize_3rd_value || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {contests.filter(c => getContestStatus(c).label === 'Ended' && c.winner_user_id).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Contest Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'user' | 'canvasser')}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="user" className="flex items-center gap-2">
            <span>Sales Reps</span>
            {salesRepContests.length > 0 && (
              <Badge variant="secondary" className="text-xs">{salesRepContests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="canvasser" className="flex items-center gap-2">
            <span>Canvassers</span>
            {canvasserContests.length > 0 && (
              <Badge variant="secondary" className="text-xs">{canvasserContests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user" className="space-y-4">
          {/* Active Contest Banner for Sales Reps */}
          {getActiveContestForTab('user') && (
            <ActiveContestBanner 
              contest={getActiveContestForTab('user')!} 
              countdown={countdown}
              getDetailedTimeRemaining={getDetailedTimeRemaining}
              getContestProgress={getContestProgress}
              leaders={leaders}
            />
          )}
          
          {/* Sales Rep Contest Cards */}
          <div className="grid gap-4">
            {sortedSalesRepContests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No sales rep contests yet</p>
                  {isAdmin && <p className="text-sm text-muted-foreground mt-1">Click "New Contest" to create one</p>}
                </CardContent>
              </Card>
            ) : (
              sortedSalesRepContests.map((contest) => (
                <ContestCard 
                  key={contest.id} 
                  contest={contest}
                  isAdmin={isAdmin}
                  countdown={countdown}
                  getContestStatus={getContestStatus}
                  getTimeRemaining={getTimeRemaining}
                  getContestProgress={getContestProgress}
                  openEditDialog={openEditDialog}
                  handleDelete={handleDelete}
                  handleFinalizeContest={handleFinalizeContest}
                  finalizingContest={finalizingContest}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="canvasser" className="space-y-4">
          {/* Active Contest Banner for Canvassers */}
          {getActiveContestForTab('canvasser') && (
            <ActiveContestBanner 
              contest={getActiveContestForTab('canvasser')!} 
              countdown={countdown}
              getDetailedTimeRemaining={getDetailedTimeRemaining}
              getContestProgress={getContestProgress}
              leaders={leaders}
            />
          )}
          
          {/* Canvasser Contest Cards */}
          <div className="grid gap-4">
            {sortedCanvasserContests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No canvasser contests yet</p>
                  {isAdmin && <p className="text-sm text-muted-foreground mt-1">Click "New Contest" to create one</p>}
                </CardContent>
              </Card>
            ) : (
              sortedCanvasserContests.map((contest) => (
                <ContestCard 
                  key={contest.id} 
                  contest={contest}
                  isAdmin={isAdmin}
                  countdown={countdown}
                  getContestStatus={getContestStatus}
                  getTimeRemaining={getTimeRemaining}
                  getContestProgress={getContestProgress}
                  openEditDialog={openEditDialog}
                  handleDelete={handleDelete}
                  handleFinalizeContest={handleFinalizeContest}
                  finalizingContest={finalizingContest}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}