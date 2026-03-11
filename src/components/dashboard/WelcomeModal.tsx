import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getRandomQuote } from '@/lib/motivationalQuotes';
import { Trophy, Megaphone, Quote, Sparkles, Rocket, Flame, Clock, TrendingUp, Gift, Zap, ClipboardList, AlertCircle, CalendarCheck, FileWarning } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, differenceInHours, isPast } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  created_at: string | null;
}

interface ContestVictory {
  id: string;
  place: number;
  points_awarded: number;
  contest: {
    title: string;
    prize_description: string;
  } | null;
}

interface WagerEvent {
  id: string;
  title: string;
  status: string;
  wagers_close_at: string;
}

interface UserWager {
  id: string;
  event_id: string;
  points_wagered: number;
  potential_payout: number;
  status: string;
  points_won: number;
  created_at: string;
  event_title?: string;
  option_label?: string;
  resolved_at?: string;
}

interface ActiveContest {
  id: string;
  title: string;
  icon: string;
  end_date: string;
  metric_type: string;
  prize_value: number;
  rank?: number;
  value?: number;
  gap?: number;
}

interface NewLead {
  id: string;
  full_name: string;
  service_type: string;
  priority: string;
  assigned_at: string | null;
}

interface LeadUpdate {
  id: string;
  activity_type: string;
  content: string | null;
  created_at: string;
  lead_name?: string;
}

interface OverdueFollowup {
  id: string;
  full_name: string;
  next_followup_due: string;
  status: string;
}

interface OpenLead {
  id: string;
  full_name: string;
  service_type: string;
  status: string;
  priority: string;
  next_followup_due: string | null;
  assigned_at: string | null;
}

interface ScheduledJob {
  id: string;
  full_name: string;
  install_date: string | null;
  install_scheduled_at: string | null;
  quote_amount: number | null;
  total_paid: number;
  balance_owed: number;
  has_contract: boolean;
}

export function WelcomeModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [victories, setVictories] = useState<ContestVictory[]>([]);
  const [quote] = useState(getRandomQuote());
  const [loading, setLoading] = useState(true);
  
  // Pit wager states
  const [newWagerEvents, setNewWagerEvents] = useState<WagerEvent[]>([]);
  const [pendingWagers, setPendingWagers] = useState<UserWager[]>([]);
  const [recentResults, setRecentResults] = useState<UserWager[]>([]);
  
  // Active contest states
  const [activeContests, setActiveContests] = useState<ActiveContest[]>([]);

  // Lead notification states
  const [newLeads, setNewLeads] = useState<NewLead[]>([]);
  const [leadUpdates, setLeadUpdates] = useState<LeadUpdate[]>([]);
  const [overdueFollowups, setOverdueFollowups] = useState<OverdueFollowup[]>([]);
  const [openLeads, setOpenLeads] = useState<OpenLead[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [missingContractLeads, setMissingContractLeads] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(`welcome_modal_shown_${user.id}`)) return;

    const fetchData = async () => {
      try {
        // Check if this is a first-time user (no yearly goal set)
        const { data: metricsData } = await supabase
          .from('user_metrics')
          .select('display_name, yearly_goal')
          .eq('user_id', user.id)
          .order('metric_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // If no yearly goal, the GoalSettingModal will show instead
        if (!metricsData || !metricsData.yearly_goal || Number(metricsData.yearly_goal) === 0) {
          setLoading(false);
          return;
        }

        setDisplayName(metricsData.display_name || user.email?.split('@')[0] || 'Closer');

        // Fetch unread announcements
        const { data: allAnnouncements } = await supabase
          .from('announcements')
          .select('id, title, content, priority, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const { data: readAnnouncements } = await supabase
          .from('user_announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id);

        const readIds = new Set(readAnnouncements?.map(r => r.announcement_id) || []);
        const unreadAnnouncements = allAnnouncements?.filter(a => !readIds.has(a.id)) || [];
        setAnnouncements(unreadAnnouncements);

        // Fetch recent contest victories (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: victoriesData } = await supabase
          .from('contest_victories')
          .select(`
            id,
            place,
            points_awarded,
            contest:contests(title, prize_description)
          `)
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(3);

        setVictories((victoriesData as any) || []);

        // Fetch active/open pit wager events
        const { data: eventsData } = await supabase
          .from('pit_wager_events')
          .select('id, title, status, wagers_close_at')
          .in('status', ['open', 'locked'])
          .order('created_at', { ascending: false })
          .limit(3);
        
        setNewWagerEvents(eventsData || []);

        // Fetch user's pending wagers
        const { data: wagersData } = await supabase
          .from('pit_wagers')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Enrich pending wagers
        const pending: UserWager[] = [];
        const recent: UserWager[] = [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        for (const wager of wagersData || []) {
          const { data: eventData } = await supabase
            .from('pit_wager_events')
            .select('title')
            .eq('id', wager.event_id)
            .single();
          
          const { data: optionData } = await supabase
            .from('pit_wager_options')
            .select('option_label')
            .eq('id', wager.option_id)
            .single();

          const enrichedWager = {
            ...wager,
            event_title: eventData?.title,
            option_label: optionData?.option_label,
          };

          if (wager.status === 'pending') {
            pending.push(enrichedWager);
          } else if (wager.resolved_at && new Date(wager.resolved_at) > sevenDaysAgo) {
            recent.push(enrichedWager);
          }
        }
        
        setPendingWagers(pending.slice(0, 3));
        setRecentResults(recent.slice(0, 3));

        // Fetch active contests for sales reps
        const { data: contestsData } = await supabase
          .from('contests')
          .select('*')
          .eq('is_active', true)
          .or('target_role.eq.user,target_role.is.null');

        if (contestsData) {
          const now = new Date();
          const active = contestsData.filter(c => {
            const start = new Date(c.start_date);
            const end = new Date(c.end_date);
            return now >= start && now <= end;
          });

          // Get user rankings for active contests
          const contestsWithRanking: ActiveContest[] = [];
          
          for (const contest of active.slice(0, 2)) {
            const { data: allMetrics } = await supabase
              .from('user_metrics')
              .select('user_id, sales, leads, closed_deals')
              .order('metric_date', { ascending: false });

            if (allMetrics) {
              const latestByUser = new Map<string, number>();
              for (const m of allMetrics) {
                if (!latestByUser.has(m.user_id)) {
                  let value = 0;
                  if (contest.metric_type === 'sales') value = Number(m.sales) || 0;
                  else if (contest.metric_type === 'leads') value = Number(m.leads) || 0;
                  else value = Number(m.closed_deals) || 0;
                  latestByUser.set(m.user_id, value);
                }
              }

              const sorted = Array.from(latestByUser.entries())
                .sort((a, b) => b[1] - a[1]);
              
              const userIndex = sorted.findIndex(([id]) => id === user.id);
              const userValue = latestByUser.get(user.id) || 0;
              const leaderValue = sorted[0]?.[1] || 0;

              contestsWithRanking.push({
                id: contest.id,
                title: contest.title,
                icon: contest.icon || '🏆',
                end_date: contest.end_date,
                metric_type: contest.metric_type,
                prize_value: contest.prize_value || 0,
                rank: userIndex + 1,
                value: userValue,
                gap: leaderValue - userValue,
              });
            }
          }
          
          setActiveContests(contestsWithRanking);
        }

        // --- Lead Notifications ---
        // Determine the reference time for "new" leads
        const lastShownKey = `welcome_modal_last_shown_${user.id}`;
        const lastShownStr = sessionStorage.getItem(lastShownKey);
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
        const referenceSince = lastShownStr ? new Date(lastShownStr) : fortyEightHoursAgo;

        // New leads assigned to this user since last session
        const { data: newLeadsData } = await supabase
          .from('quote_requests')
          .select('id, full_name, service_type, priority, assigned_at')
          .eq('assigned_to', user.id)
          .eq('status', 'new')
          .gte('assigned_at', referenceSince.toISOString())
          .order('assigned_at', { ascending: false })
          .limit(5);

        setNewLeads(newLeadsData || []);

        // Overdue follow-ups
        const { data: overdueData } = await supabase
          .from('quote_requests')
          .select('id, full_name, next_followup_due, status')
          .eq('assigned_to', user.id)
          .not('next_followup_due', 'is', null)
          .lt('next_followup_due', new Date().toISOString())
          .not('status', 'in', '("won","lost","scheduled","completed")')
          .order('next_followup_due', { ascending: true })
          .limit(5);

        setOverdueFollowups(overdueData || []);

        // All open leads (not won/lost) for persistent follow-up prompt
        const { data: openLeadsData } = await supabase
          .from('quote_requests')
          .select('id, full_name, service_type, status, priority, next_followup_due, assigned_at')
          .eq('assigned_to', user.id)
          .not('status', 'in', '("won","lost","scheduled","completed")')
          .order('next_followup_due', { ascending: true, nullsFirst: false })
          .limit(10);

        setOpenLeads(openLeadsData || []);

        // Recent lead updates (activity by others on my leads, last 7 days)
        const sevenDaysAgoDate = new Date();
        sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);

        // First get user's assigned lead IDs
        const { data: myLeadIds } = await supabase
          .from('quote_requests')
          .select('id, full_name')
          .eq('assigned_to', user.id)
          .not('status', 'in', '("won","lost","scheduled","completed")');

        if (myLeadIds && myLeadIds.length > 0) {
          const leadIdMap = new Map(myLeadIds.map(l => [l.id, l.full_name]));
          const ids = myLeadIds.map(l => l.id);

          const { data: activityData } = await supabase
            .from('lead_activity_log')
            .select('id, activity_type, content, created_at, lead_id')
            .in('lead_id', ids)
            .in('activity_type', ['quote_approved', 'quote_rejected', 'status_change', 'assignment'])
            .neq('user_id', user.id)
            .gte('created_at', sevenDaysAgoDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

          const enrichedUpdates: LeadUpdate[] = (activityData || []).map(a => ({
            id: a.id,
            activity_type: a.activity_type,
            content: a.content,
            created_at: a.created_at,
            lead_name: leadIdMap.get(a.lead_id) || 'Unknown',
          }));

          setLeadUpdates(enrichedUpdates);
        }

        // --- Scheduled Jobs with Balance Reminders ---
        const { data: scheduledLeads } = await supabase
          .from('quote_requests')
          .select('id, full_name, install_date, install_scheduled_at, quote_amount')
          .eq('assigned_to', user.id)
          .eq('status', 'scheduled')
          .order('install_date', { ascending: true })
          .limit(10);

        if (scheduledLeads && scheduledLeads.length > 0) {
          const jobsWithBalance: ScheduledJob[] = [];
          for (const sl of scheduledLeads) {
            const { data: payments } = await supabase
              .from('lead_payments')
              .select('amount')
              .eq('lead_id', sl.id);
            const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            const balance = Math.max(0, (sl.quote_amount || 0) - totalPaid);

            // Check if contract exists
            const { data: contractForm } = await supabase
              .from('lead_forms')
              .select('id')
              .eq('lead_id', sl.id)
              .eq('form_type', 'contract')
              .limit(1)
              .maybeSingle();

            jobsWithBalance.push({
              id: sl.id,
              full_name: sl.full_name,
              install_date: sl.install_date,
              install_scheduled_at: sl.install_scheduled_at,
              quote_amount: sl.quote_amount,
              total_paid: totalPaid,
              balance_owed: balance,
              has_contract: !!contractForm,
            });
          }
          setScheduledJobs(jobsWithBalance);
          setMissingContractLeads(jobsWithBalance.filter(j => !j.has_contract).map(j => ({ id: j.id, full_name: j.full_name })));
        }

        // Also check won leads missing contracts
        const { data: wonLeads } = await supabase
          .from('quote_requests')
          .select('id, full_name')
          .eq('assigned_to', user.id)
          .eq('status', 'won')
          .limit(10);

        if (wonLeads && wonLeads.length > 0) {
          for (const wl of wonLeads) {
            const { data: contractForm } = await supabase
              .from('lead_forms')
              .select('id')
              .eq('lead_id', wl.id)
              .eq('form_type', 'contract')
              .limit(1)
              .maybeSingle();
            if (!contractForm) {
              setMissingContractLeads(prev => [...prev, { id: wl.id, full_name: wl.full_name }]);
            }
          }
        }

        // Show modal if returning user
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to let the dashboard load
    const timer = setTimeout(fetchData, 600);
    return () => clearTimeout(timer);
  }, [user]);

  const handleClose = async () => {
    if (!user) return;

    // Mark announcements as read
    if (announcements.length > 0) {
      const reads = announcements.map(a => ({
        user_id: user.id,
        announcement_id: a.id,
      }));
      
      await supabase.from('user_announcement_reads').insert(reads);
    }

    // Mark as shown for this session and record timestamp
    sessionStorage.setItem(`welcome_modal_shown_${user.id}`, 'true');
    sessionStorage.setItem(`welcome_modal_last_shown_${user.id}`, new Date().toISOString());
    setIsOpen(false);
  };

  const handleViewLeads = async () => {
    await handleClose();
    navigate('/dashboard/my-leads');
  };

  if (loading) return null;

  const hasLeadNotifications = newLeads.length > 0 || overdueFollowups.length > 0 || leadUpdates.length > 0 || openLeads.length > 0 || scheduledJobs.length > 0 || missingContractLeads.length > 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">New</Badge>;
      case 'contacted': return <Badge className="bg-yellow-500 text-yellow-950 text-[10px] px-1.5 py-0">Contacted</Badge>;
      case 'quoted': return <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0">Quoted</Badge>;
      case 'scheduled': return <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">Scheduled</Badge>;
      default: return <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{status}</Badge>;
    }
  };

  const getFollowupIndicator = (nextFollowupDue: string | null) => {
    if (!nextFollowupDue) return <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" title="No follow-up set" />;
    const due = new Date(nextFollowupDue);
    const now = new Date();
    if (isPast(due)) return <span className="h-2 w-2 rounded-full bg-destructive inline-block animate-pulse" title="Overdue" />;
    const hoursUntil = differenceInHours(due, now);
    if (hoursUntil <= 24) return <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" title="Due today" />;
    return <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" title="Upcoming" />;
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">Important</Badge>;
      default:
        return null;
    }
  };

  const getPlaceLabel = (place: number) => {
    switch (place) {
      case 1: return '🥇 1st Place';
      case 2: return '🥈 2nd Place';
      case 3: return '🥉 3rd Place';
      default: return `#${place}`;
    }
  };

  const getTimeRemaining = (closeTime: string) => {
    const close = new Date(closeTime);
    if (isPast(close)) return 'Closed';
    return formatDistanceToNow(close, { addSuffix: true });
  };

  const getContestTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    if (isPast(end)) return 'Ended';
    const days = differenceInDays(end, new Date());
    if (days > 0) return `${days}d left`;
    const hours = differenceInHours(end, new Date());
    return `${hours}h left`;
  };

  const getUpdateLabel = (activityType: string) => {
    switch (activityType) {
      case 'quote_approved': return '✅ Quote Approved';
      case 'quote_rejected': return '❌ Quote Rejected';
      case 'status_change': return '🔄 Status Changed';
      case 'assignment': return '📋 Assigned';
      default: return '📝 Update';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-accent/10 rounded-full">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
            </div>
            <h2 className="text-2xl font-heading text-foreground">
              Welcome back closer, {displayName}!
            </h2>
            <p className="text-sm text-muted-foreground">
              Ready to dominate today?
            </p>
          </div>

          {/* Motivational Quote */}
          <div className="bg-secondary/50 rounded-lg p-4 border border-border">
            <div className="flex gap-3">
              <Quote className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm italic text-foreground">"{quote.quote}"</p>
                <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
              </div>
            </div>
          </div>

          {/* Open Leads - Persistent Follow-up Prompt */}
          {openLeads.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <h3 className="text-sm font-semibold text-foreground">Open Leads — Action Required</h3>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                  ⚡ You have {openLeads.length} open lead{openLeads.length > 1 ? 's' : ''}. Follow up to close them out!
                </p>
                <div className="space-y-1.5">
                  {openLeads.map(lead => (
                    <div key={lead.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFollowupIndicator(lead.next_followup_due)}
                        <button
                          onClick={() => { handleClose(); navigate(`/dashboard/leads/${lead.id}`); }}
                          className="text-foreground hover:text-accent underline-offset-2 hover:underline text-left truncate"
                        >
                          {lead.full_name}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {getStatusBadge(lead.status)}
                        {(lead.priority === 'urgent' || lead.priority === 'high') && (
                          <Badge variant={lead.priority === 'urgent' ? 'destructive' : 'default'} className={`text-[10px] px-1.5 py-0 ${lead.priority === 'high' ? 'bg-orange-500' : ''}`}>
                            {lead.priority === 'urgent' ? '🔥' : '⬆'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Scheduled Jobs */}
          {scheduledJobs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-green-600" />
                <h3 className="text-sm font-semibold text-foreground">Upcoming Installs</h3>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="space-y-2">
                  {scheduledJobs.map(job => (
                    <div key={job.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <button
                          onClick={() => { handleClose(); navigate(`/dashboard/leads/${job.id}`); }}
                          className="text-foreground hover:text-accent underline-offset-2 hover:underline text-left truncate max-w-[55%]"
                        >
                          {job.full_name}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {job.install_date ? new Date(job.install_date).toLocaleDateString() : 'Date TBD'}
                        </span>
                      </div>
                      {job.balance_owed > 0 && (
                        <p className="text-xs text-destructive font-medium">
                          💰 Balance owed: ${job.balance_owed.toLocaleString('en-US', { minimumFractionDigits: 2 })} — collect by install date
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Missing Contract Alert */}
          {missingContractLeads.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-foreground">Missing Contract</h3>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-xs font-medium text-destructive mb-2">
                  ⚠️ {missingContractLeads.length} job{missingContractLeads.length > 1 ? 's' : ''} missing a signed contract
                </p>
                <div className="space-y-1.5">
                  {missingContractLeads.map(lead => (
                    <div key={lead.id} className="flex items-center justify-between text-sm">
                      <button
                        onClick={() => { handleClose(); navigate(`/dashboard/leads/${lead.id}`); }}
                        className="text-foreground hover:text-accent underline-offset-2 hover:underline text-left truncate"
                      >
                        {lead.full_name}
                      </button>
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">No Contract</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasLeadNotifications && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">My Leads</h3>
              </div>

              {/* New Leads Assigned */}
              {newLeads.length > 0 && (
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                    📬 {newLeads.length} New Lead{newLeads.length > 1 ? 's' : ''} Assigned
                  </p>
                  <div className="space-y-1.5">
                    {newLeads.map(lead => (
                      <div key={lead.id} className="flex items-center justify-between text-sm">
                        <button
                          onClick={() => { handleClose(); navigate(`/dashboard/leads/${lead.id}`); }}
                          className="text-foreground hover:text-accent underline-offset-2 hover:underline text-left truncate max-w-[60%]"
                        >
                          {lead.full_name}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground capitalize">{lead.service_type}</span>
                          {lead.priority === 'urgent' && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Urgent</Badge>}
                          {lead.priority === 'high' && <Badge className="bg-orange-500 text-[10px] px-1.5 py-0">High</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overdue Follow-ups */}
              {overdueFollowups.length > 0 && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-xs font-medium text-destructive mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {overdueFollowups.length} Overdue Follow-up{overdueFollowups.length > 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1.5">
                    {overdueFollowups.map(lead => (
                      <div key={lead.id} className="flex items-center justify-between text-sm">
                        <button
                          onClick={() => { handleClose(); navigate(`/dashboard/leads/${lead.id}`); }}
                          className="text-foreground hover:text-accent underline-offset-2 hover:underline text-left truncate max-w-[60%]"
                        >
                          {lead.full_name}
                        </button>
                        <span className="text-xs text-destructive">
                          {formatDistanceToNow(new Date(lead.next_followup_due), { addSuffix: false })} overdue
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lead Updates */}
              {leadUpdates.length > 0 && (
                <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recent Lead Updates</p>
                  <div className="space-y-1.5">
                    {leadUpdates.map(update => (
                      <div key={update.id} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground">
                            {getUpdateLabel(update.activity_type)} — {update.lead_name}
                          </span>
                        </div>
                        {update.content && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{update.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Contests */}
          {activeContests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Active Contests</h3>
              </div>
              <div className="space-y-2">
                {activeContests.map((contest) => (
                  <div
                    key={contest.id}
                    className="p-3 bg-gradient-to-br from-accent/10 to-background rounded-lg border border-accent/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{contest.icon}</span>
                        <span className="font-medium text-sm">{contest.title}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {getContestTimeRemaining(contest.end_date)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <Badge className={
                        contest.rank === 1 ? 'bg-yellow-500 text-yellow-950' :
                        contest.rank === 2 ? 'bg-gray-400 text-gray-950' :
                        contest.rank === 3 ? 'bg-amber-600 text-amber-950' :
                        'bg-muted text-muted-foreground'
                      }>
                        {contest.rank === 1 ? '1st' : contest.rank === 2 ? '2nd' : contest.rank === 3 ? '3rd' : `${contest.rank}th`} place
                      </Badge>
                      {contest.rank !== 1 && contest.gap !== undefined && contest.gap > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-accent" />
                          {contest.metric_type === 'sales' ? `$${contest.gap.toLocaleString()}` : contest.gap} to 1st
                        </span>
                      )}
                    </div>
                    {contest.prize_value > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs">
                        <Gift className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Prize: ${contest.prize_value.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pit Wagers Section */}
          {(newWagerEvents.length > 0 || pendingWagers.length > 0 || recentResults.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-foreground">The Pit</h3>
              </div>
              
              {/* New Wager Events */}
              {newWagerEvents.length > 0 && (
                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">
                    🔥 {newWagerEvents.length} Active Wager{newWagerEvents.length > 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1">
                    {newWagerEvents.map(event => (
                      <div key={event.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{event.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.status === 'locked' ? 'Locked' : getTimeRemaining(event.wagers_close_at)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Wagers */}
              {pendingWagers.length > 0 && (
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Your Active Wagers
                  </p>
                  <div className="space-y-1">
                    {pendingWagers.map(wager => (
                      <div key={wager.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{wager.event_title}</span>
                        <span className="text-xs text-muted-foreground">
                          {wager.points_wagered} pts → {wager.potential_payout} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Results */}
              {recentResults.length > 0 && (
                <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recent Results</p>
                  <div className="space-y-1">
                    {recentResults.map(wager => (
                      <div key={wager.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{wager.event_title}</span>
                        {wager.status === 'won' ? (
                          <Badge className="bg-green-500 text-xs">+{wager.points_won} pts</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">-{wager.points_wagered} pts</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contest Victories */}
          {victories.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Recent Victories</h3>
              </div>
              <div className="space-y-2">
                {victories.map((victory) => (
                  <div
                    key={victory.id}
                    className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {victory.contest?.title || 'Contest'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPlaceLabel(victory.place)}
                      </p>
                    </div>
                    <Badge variant="secondary">+{victory.points_awarded} pts</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">
                  Announcements ({announcements.length} new)
                </h3>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 bg-secondary/50 rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{announcement.title}</p>
                      {getPriorityBadge(announcement.priority)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Button */}
          {hasLeadNotifications ? (
            <Button
              onClick={handleViewLeads}
              size="lg"
              className="w-full text-lg font-heading gap-2"
            >
              <ClipboardList className="h-5 w-5" />
              View My Leads
            </Button>
          ) : (
            <Button
              onClick={handleClose}
              size="lg"
              className="w-full text-lg font-heading gap-2"
            >
              <Rocket className="h-5 w-5" />
              Let's Get It
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
