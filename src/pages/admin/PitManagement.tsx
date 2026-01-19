import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Flame, Trophy, Clock, CheckCircle, XCircle, Users, Coins, Wand2, Pencil, Eye, RotateCcw, Undo2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface WagerEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  status: string;
  wagers_close_at: string;
  resolves_at: string | null;
  resolved_at: string | null;
  min_wager: number;
  max_wager: number;
  created_at: string;
}

interface WagerOption {
  id: string;
  event_id: string;
  user_id: string | null;
  option_label: string;
  payout_multiplier: number;
  is_winner: boolean;
}

interface Wager {
  id: string;
  user_id: string;
  event_id: string;
  option_id: string;
  points_wagered: number;
  potential_payout: number;
  status: string;
}

interface AvailableUser {
  id: string;
  name: string;
  role: 'salesRep' | 'canvasser';
}

export default function PitManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<WagerEvent[]>([]);
  const [options, setOptions] = useState<Map<string, WagerOption[]>>(new Map());
  const [wagers, setWagers] = useState<Map<string, Wager[]>>(new Map());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [wagerDetailsDialogOpen, setWagerDetailsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WagerEvent | null>(null);
  const [selectedEventWagers, setSelectedEventWagers] = useState<{ userId: string; userName: string; optionLabel: string; pointsWagered: number; potentialPayout: number; status: string; pointsWon: number }[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [userMetricsForResolve, setUserMetricsForResolve] = useState<Map<string, { name: string; metric: number }>>(new Map());
  
  // Edit event form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEventType, setEditEventType] = useState('custom');
  const [editWagersCloseAt, setEditWagersCloseAt] = useState('');
  const [editMinWager, setEditMinWager] = useState('10');
  const [editMaxWager, setEditMaxWager] = useState('500');
  
  // Create event form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEventType, setNewEventType] = useState('custom');
  const [newWagersCloseAt, setNewWagersCloseAt] = useState('');
  const [newMinWager, setNewMinWager] = useState('10');
  const [newMaxWager, setNewMaxWager] = useState('500');
  const [betOnUsers, setBetOnUsers] = useState(false);
  const [newOptions, setNewOptions] = useState<{ label: string; multiplier: string; userId: string | null }[]>([
    { label: '', multiplier: '2.0', userId: null },
    { label: '', multiplier: '2.0', userId: null },
  ]);

  useEffect(() => {
    fetchData();
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      // Fetch sales reps from user_metrics
      const { data: salesReps } = await supabase
        .from('user_metrics')
        .select('user_id, display_name')
        .order('display_name');

      // Fetch canvassers from canvasser_metrics
      const { data: canvassers } = await supabase
        .from('canvasser_metrics')
        .select('user_id, display_name')
        .order('display_name');

      const users: AvailableUser[] = [];
      const seenIds = new Set<string>();

      // Add sales reps
      salesReps?.forEach(sr => {
        if (sr.user_id && !seenIds.has(sr.user_id)) {
          seenIds.add(sr.user_id);
          users.push({
            id: sr.user_id,
            name: sr.display_name || 'Unknown User',
            role: 'salesRep',
          });
        }
      });

      // Add canvassers
      canvassers?.forEach(c => {
        if (c.user_id && !seenIds.has(c.user_id)) {
          seenIds.add(c.user_id);
          users.push({
            id: c.user_id,
            name: c.display_name || 'Unknown User',
            role: 'canvasser',
          });
        }
      });

      setAvailableUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('pit_wager_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Fetch options for all events
      const { data: optionsData } = await supabase
        .from('pit_wager_options')
        .select('*');

      const optionsMap = new Map<string, WagerOption[]>();
      optionsData?.forEach(opt => {
        const existing = optionsMap.get(opt.event_id) || [];
        optionsMap.set(opt.event_id, [...existing, opt]);
      });
      setOptions(optionsMap);

      // Fetch wagers for all events
      const { data: wagersData } = await supabase
        .from('pit_wagers')
        .select('*');

      const wagersMap = new Map<string, Wager[]>();
      wagersData?.forEach(w => {
        const existing = wagersMap.get(w.event_id) || [];
        wagersMap.set(w.event_id, [...existing, w]);
      });
      setWagers(wagersMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wager events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    const validOptions = betOnUsers 
      ? newOptions.filter(o => o.userId)
      : newOptions.filter(o => o.label.trim());

    if (!newTitle || !newWagersCloseAt || validOptions.length < 2) {
      toast({
        title: 'Validation Error',
        description: betOnUsers 
          ? 'Please fill in title, close time, and select at least 2 users'
          : 'Please fill in title, close time, and at least 2 options',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create the event
      const { data: eventData, error: eventError } = await supabase
        .from('pit_wager_events')
        .insert({
          title: newTitle,
          description: newDescription || null,
          event_type: newEventType,
          wagers_close_at: new Date(newWagersCloseAt).toISOString(),
          min_wager: parseInt(newMinWager) || 10,
          max_wager: parseInt(newMaxWager) || 500,
          status: 'open',
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create the options
      const { error: optionsError } = await supabase
        .from('pit_wager_options')
        .insert(
          validOptions.map(opt => ({
            event_id: eventData.id,
            option_label: betOnUsers 
              ? availableUsers.find(u => u.id === opt.userId)?.name || 'Unknown User'
              : opt.label,
            user_id: betOnUsers ? opt.userId : null,
            payout_multiplier: parseFloat(opt.multiplier) || 2.0,
          }))
        );

      if (optionsError) throw optionsError;

      toast({
        title: 'Event Created',
        description: 'The wager event has been created successfully',
      });

      setCreateDialogOpen(false);
      resetCreateForm();
      fetchData();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create wager event',
        variant: 'destructive',
      });
    }
  };

  const handleLockEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('pit_wager_events')
        .update({ status: 'locked' })
        .eq('id', eventId);

      if (error) throw error;

      toast({ title: 'Event Locked', description: 'No more wagers can be placed' });
      fetchData();
    } catch (error) {
      console.error('Error locking event:', error);
      toast({ title: 'Error', description: 'Failed to lock event', variant: 'destructive' });
    }
  };

  const handleResolveEvent = async (winnerId: string) => {
    if (!selectedEvent) return;

    try {
      // Mark the winning option
      await supabase
        .from('pit_wager_options')
        .update({ is_winner: true })
        .eq('id', winnerId);

      // Get all wagers for this event
      const eventWagers = wagers.get(selectedEvent.id) || [];
      const eventOptions = options.get(selectedEvent.id) || [];
      const winningOption = eventOptions.find(o => o.id === winnerId);

      // Process each wager
      for (const wager of eventWagers) {
        const isWinner = wager.option_id === winnerId;
        const newStatus = isWinner ? 'won' : 'lost';
        const pointsWon = isWinner ? wager.potential_payout : 0;

        // Update wager status
        await supabase
          .from('pit_wagers')
          .update({
            status: newStatus,
            points_won: pointsWon,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', wager.id);

        // For winners, update their wager_points and total points in metrics
        if (isWinner) {
          // Try user_metrics first (sales reps)
          const { data: userMetricsData } = await supabase
            .from('user_metrics')
            .select('id, points, wager_points')
            .eq('user_id', wager.user_id)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single();

          if (userMetricsData) {
            const newPoints = (Number(userMetricsData.points) || 0) + pointsWon;
            const newWagerPoints = (Number(userMetricsData.wager_points) || 0) + pointsWon;

            await supabase
              .from('user_metrics')
              .update({ points: newPoints, wager_points: newWagerPoints })
              .eq('id', userMetricsData.id);

            await supabase
              .from('pit_point_transactions')
              .insert({
                user_id: wager.user_id,
                wager_id: wager.id,
                transaction_type: 'wager_won',
                points_change: pointsWon,
                balance_after: newPoints,
              });
          } else {
            // Try canvasser_metrics
            const { data: canvasserMetricsData } = await supabase
              .from('canvasser_metrics')
              .select('id, points, wager_points')
              .eq('user_id', wager.user_id)
              .order('metric_date', { ascending: false })
              .limit(1)
              .single();

            if (canvasserMetricsData) {
              const newPoints = (Number(canvasserMetricsData.points) || 0) + pointsWon;
              const newWagerPoints = (Number(canvasserMetricsData.wager_points) || 0) + pointsWon;

              await supabase
                .from('canvasser_metrics')
                .update({ points: newPoints, wager_points: newWagerPoints })
                .eq('id', canvasserMetricsData.id);

              await supabase
                .from('pit_point_transactions')
                .insert({
                  user_id: wager.user_id,
                  wager_id: wager.id,
                  transaction_type: 'wager_won',
                  points_change: pointsWon,
                  balance_after: newPoints,
                });
            }
          }
        } else {
          // LOSER: Deduct wagered points from their metrics
          const pointsLost = wager.points_wagered;

          // Try user_metrics first (sales reps)
          const { data: userMetricsData } = await supabase
            .from('user_metrics')
            .select('id, points, wager_points')
            .eq('user_id', wager.user_id)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single();

          if (userMetricsData) {
            const newPoints = Math.max(0, (Number(userMetricsData.points) || 0) - pointsLost);
            const newWagerPoints = (Number(userMetricsData.wager_points) || 0) - pointsLost;

            await supabase
              .from('user_metrics')
              .update({ points: newPoints, wager_points: newWagerPoints })
              .eq('id', userMetricsData.id);

            await supabase
              .from('pit_point_transactions')
              .insert({
                user_id: wager.user_id,
                wager_id: wager.id,
                transaction_type: 'wager_lost',
                points_change: -pointsLost,
                balance_after: newPoints,
              });
          } else {
            // Try canvasser_metrics
            const { data: canvasserMetricsData } = await supabase
              .from('canvasser_metrics')
              .select('id, points, wager_points')
              .eq('user_id', wager.user_id)
              .order('metric_date', { ascending: false })
              .limit(1)
              .single();

            if (canvasserMetricsData) {
              const newPoints = Math.max(0, (Number(canvasserMetricsData.points) || 0) - pointsLost);
              const newWagerPoints = (Number(canvasserMetricsData.wager_points) || 0) - pointsLost;

              await supabase
                .from('canvasser_metrics')
                .update({ points: newPoints, wager_points: newWagerPoints })
                .eq('id', canvasserMetricsData.id);

              await supabase
                .from('pit_point_transactions')
                .insert({
                  user_id: wager.user_id,
                  wager_id: wager.id,
                  transaction_type: 'wager_lost',
                  points_change: -pointsLost,
                  balance_after: newPoints,
                });
            }
          }
        }
      }

      // Mark event as resolved
      await supabase
        .from('pit_wager_events')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', selectedEvent.id);

      toast({
        title: 'Event Resolved',
        description: `Winner: ${winningOption?.option_label}. Points have been distributed.`,
      });

      setResolveDialogOpen(false);
      setSelectedEvent(null);
      fetchData();
    } catch (error) {
      console.error('Error resolving event:', error);
      toast({ title: 'Error', description: 'Failed to resolve event', variant: 'destructive' });
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    try {
      const eventWagers = wagers.get(eventId) || [];

      // Refund all wagers
      for (const wager of eventWagers) {
        await supabase
          .from('pit_wagers')
          .update({ status: 'refunded', resolved_at: new Date().toISOString() })
          .eq('id', wager.id);

        // Create refund transaction
        const { data: metricsData } = await supabase
          .from('user_metrics')
          .select('points')
          .eq('user_id', wager.user_id)
          .order('metric_date', { ascending: false })
          .limit(1)
          .single();

        const currentPoints = Number(metricsData?.points) || 0;
        const newBalance = currentPoints + wager.points_wagered;

        await supabase
          .from('pit_point_transactions')
          .insert({
            user_id: wager.user_id,
            wager_id: wager.id,
            transaction_type: 'wager_refunded',
            points_change: wager.points_wagered,
            balance_after: newBalance,
          });
      }

      await supabase
        .from('pit_wager_events')
        .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
        .eq('id', eventId);

      toast({ title: 'Event Cancelled', description: 'All wagers have been refunded' });
      fetchData();
    } catch (error) {
      console.error('Error cancelling event:', error);
      toast({ title: 'Error', description: 'Failed to cancel event', variant: 'destructive' });
    }
  };

  // Open wager details dialog for past events
  const openWagerDetailsDialog = async (event: WagerEvent) => {
    setSelectedEvent(event);
    const eventWagers = wagers.get(event.id) || [];
    const eventOptions = options.get(event.id) || [];

    // Fetch user names for the wagers
    const enrichedWagers: typeof selectedEventWagers = [];
    for (const wager of eventWagers) {
      // Get user name from metrics
      let userName = 'Unknown User';
      const { data: userMetrics } = await supabase
        .from('user_metrics')
        .select('display_name')
        .eq('user_id', wager.user_id)
        .limit(1)
        .single();
      
      if (userMetrics?.display_name) {
        userName = userMetrics.display_name;
      } else {
        const { data: canvasserMetrics } = await supabase
          .from('canvasser_metrics')
          .select('display_name')
          .eq('user_id', wager.user_id)
          .limit(1)
          .single();
        if (canvasserMetrics?.display_name) {
          userName = canvasserMetrics.display_name;
        }
      }

      const option = eventOptions.find(o => o.id === wager.option_id);
      enrichedWagers.push({
        userId: wager.user_id,
        userName,
        optionLabel: option?.option_label || 'Unknown',
        pointsWagered: wager.points_wagered,
        potentialPayout: wager.potential_payout,
        status: wager.status,
        pointsWon: (wager as any).points_won || 0,
      });
    }

    setSelectedEventWagers(enrichedWagers);
    setWagerDetailsDialogOpen(true);
  };

  // Cancel and refund a resolved event
  const handleCancelResolvedEvent = async (eventId: string) => {
    try {
      const eventWagers = wagers.get(eventId) || [];

      // Reverse all point transactions
      for (const wager of eventWagers) {
        if (wager.status === 'won') {
          // Winner - remove the won points
          const { data: userMetricsData } = await supabase
            .from('user_metrics')
            .select('id, points, wager_points')
            .eq('user_id', wager.user_id)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single();

          if (userMetricsData) {
            const pointsWon = (wager as any).points_won || 0;
            const newPoints = Math.max(0, (Number(userMetricsData.points) || 0) - pointsWon);
            const newWagerPoints = (Number(userMetricsData.wager_points) || 0) - pointsWon;

            await supabase
              .from('user_metrics')
              .update({ points: newPoints, wager_points: newWagerPoints })
              .eq('id', userMetricsData.id);
          } else {
            const { data: canvasserMetricsData } = await supabase
              .from('canvasser_metrics')
              .select('id, points, wager_points')
              .eq('user_id', wager.user_id)
              .order('metric_date', { ascending: false })
              .limit(1)
              .single();

            if (canvasserMetricsData) {
              const pointsWon = (wager as any).points_won || 0;
              const newPoints = Math.max(0, (Number(canvasserMetricsData.points) || 0) - pointsWon);
              const newWagerPoints = (Number(canvasserMetricsData.wager_points) || 0) - pointsWon;

              await supabase
                .from('canvasser_metrics')
                .update({ points: newPoints, wager_points: newWagerPoints })
                .eq('id', canvasserMetricsData.id);
            }
          }
        } else if (wager.status === 'lost') {
          // Loser - restore their wagered points
          const { data: userMetricsData } = await supabase
            .from('user_metrics')
            .select('id, points, wager_points')
            .eq('user_id', wager.user_id)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single();

          if (userMetricsData) {
            const newPoints = (Number(userMetricsData.points) || 0) + wager.points_wagered;
            const newWagerPoints = (Number(userMetricsData.wager_points) || 0) + wager.points_wagered;

            await supabase
              .from('user_metrics')
              .update({ points: newPoints, wager_points: newWagerPoints })
              .eq('id', userMetricsData.id);
          } else {
            const { data: canvasserMetricsData } = await supabase
              .from('canvasser_metrics')
              .select('id, points, wager_points')
              .eq('user_id', wager.user_id)
              .order('metric_date', { ascending: false })
              .limit(1)
              .single();

            if (canvasserMetricsData) {
              const newPoints = (Number(canvasserMetricsData.points) || 0) + wager.points_wagered;
              const newWagerPoints = (Number(canvasserMetricsData.wager_points) || 0) + wager.points_wagered;

              await supabase
                .from('canvasser_metrics')
                .update({ points: newPoints, wager_points: newWagerPoints })
                .eq('id', canvasserMetricsData.id);
            }
          }
        }

        // Mark wager as refunded
        await supabase
          .from('pit_wagers')
          .update({ status: 'refunded', resolved_at: new Date().toISOString() })
          .eq('id', wager.id);
      }

      // Reset winning option
      await supabase
        .from('pit_wager_options')
        .update({ is_winner: false })
        .eq('event_id', eventId);

      // Update event status
      await supabase
        .from('pit_wager_events')
        .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
        .eq('id', eventId);

      toast({ title: 'Event Cancelled', description: 'All wagers have been refunded and points reversed.' });
      fetchData();
    } catch (error) {
      console.error('Error cancelling resolved event:', error);
      toast({ title: 'Error', description: 'Failed to cancel event', variant: 'destructive' });
    }
  };

  // Reset a resolved event back to open/locked
  const handleResetEvent = async (eventId: string) => {
    try {
      const eventWagers = wagers.get(eventId) || [];

      // Reverse all point transactions
      for (const wager of eventWagers) {
        if (wager.status === 'won') {
          // Winner - remove the won points
          const { data: userMetricsData } = await supabase
            .from('user_metrics')
            .select('id, points, wager_points')
            .eq('user_id', wager.user_id)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single();

          if (userMetricsData) {
            const pointsWon = (wager as any).points_won || 0;
            const newPoints = Math.max(0, (Number(userMetricsData.points) || 0) - pointsWon);
            const newWagerPoints = (Number(userMetricsData.wager_points) || 0) - pointsWon;

            await supabase
              .from('user_metrics')
              .update({ points: newPoints, wager_points: newWagerPoints })
              .eq('id', userMetricsData.id);
          } else {
            const { data: canvasserMetricsData } = await supabase
              .from('canvasser_metrics')
              .select('id, points, wager_points')
              .eq('user_id', wager.user_id)
              .order('metric_date', { ascending: false })
              .limit(1)
              .single();

            if (canvasserMetricsData) {
              const pointsWon = (wager as any).points_won || 0;
              const newPoints = Math.max(0, (Number(canvasserMetricsData.points) || 0) - pointsWon);
              const newWagerPoints = (Number(canvasserMetricsData.wager_points) || 0) - pointsWon;

              await supabase
                .from('canvasser_metrics')
                .update({ points: newPoints, wager_points: newWagerPoints })
                .eq('id', canvasserMetricsData.id);
            }
          }
        } else if (wager.status === 'lost') {
          // Loser - restore their wagered points
          const { data: userMetricsData } = await supabase
            .from('user_metrics')
            .select('id, points, wager_points')
            .eq('user_id', wager.user_id)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single();

          if (userMetricsData) {
            const newPoints = (Number(userMetricsData.points) || 0) + wager.points_wagered;
            const newWagerPoints = (Number(userMetricsData.wager_points) || 0) + wager.points_wagered;

            await supabase
              .from('user_metrics')
              .update({ points: newPoints, wager_points: newWagerPoints })
              .eq('id', userMetricsData.id);
          } else {
            const { data: canvasserMetricsData } = await supabase
              .from('canvasser_metrics')
              .select('id, points, wager_points')
              .eq('user_id', wager.user_id)
              .order('metric_date', { ascending: false })
              .limit(1)
              .single();

            if (canvasserMetricsData) {
              const newPoints = (Number(canvasserMetricsData.points) || 0) + wager.points_wagered;
              const newWagerPoints = (Number(canvasserMetricsData.wager_points) || 0) + wager.points_wagered;

              await supabase
                .from('canvasser_metrics')
                .update({ points: newPoints, wager_points: newWagerPoints })
                .eq('id', canvasserMetricsData.id);
            }
          }
        }

        // Reset wager to pending
        await supabase
          .from('pit_wagers')
          .update({ status: 'pending', points_won: 0, resolved_at: null })
          .eq('id', wager.id);
      }

      // Reset winning option
      await supabase
        .from('pit_wager_options')
        .update({ is_winner: false })
        .eq('event_id', eventId);

      // Update event status back to locked
      await supabase
        .from('pit_wager_events')
        .update({ status: 'locked', resolved_at: null })
        .eq('id', eventId);

      toast({ title: 'Event Reset', description: 'Event has been reset and is ready to be resolved again.' });
      fetchData();
    } catch (error) {
      console.error('Error resetting event:', error);
      toast({ title: 'Error', description: 'Failed to reset event', variant: 'destructive' });
    }
  };

  // Auto-detect winner based on user metrics
  const handleAutoDetectWinner = async () => {
    if (!selectedEvent) return;

    const eventOptions = options.get(selectedEvent.id) || [];
    const userOptions = eventOptions.filter(opt => opt.user_id);

    if (userOptions.length === 0) {
      toast({
        title: 'Cannot Auto-Detect',
        description: 'This event does not have user-based betting options.',
        variant: 'destructive',
      });
      return;
    }

    setAutoDetecting(true);
    const metricsMap = new Map<string, { name: string; metric: number }>();

    try {
      // Determine what metric to compare based on event type
      const eventType = selectedEvent.event_type;
      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      for (const opt of userOptions) {
        if (!opt.user_id) continue;

        let metricValue = 0;

        if (eventType === 'weekly_top_sales') {
          // Fetch weekly approved revenue
          const { data } = await supabase
            .from('weekly_user_metrics')
            .select('approved_revenue')
            .eq('user_id', opt.user_id)
            .eq('week_start', weekStart)
            .single();
          metricValue = Number(data?.approved_revenue) || 0;
        } else if (eventType === 'weekly_top_canvasser') {
          // Fetch weekly leads set
          const { data } = await supabase
            .from('weekly_canvasser_metrics')
            .select('leads_set, leads_closed')
            .eq('user_id', opt.user_id)
            .eq('week_start', weekStart)
            .single();
          metricValue = (Number(data?.leads_closed) || 0) * 10 + (Number(data?.leads_set) || 0);
        } else {
          // Default: use total points from latest metrics
          const { data: userMetrics } = await supabase
            .from('user_metrics')
            .select('points')
            .eq('user_id', opt.user_id)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single();

          if (userMetrics) {
            metricValue = Number(userMetrics.points) || 0;
          } else {
            // Try canvasser metrics
            const { data: canvasserMetrics } = await supabase
              .from('canvasser_metrics')
              .select('points')
              .eq('user_id', opt.user_id)
              .order('metric_date', { ascending: false })
              .limit(1)
              .single();
            metricValue = Number(canvasserMetrics?.points) || 0;
          }
        }

        metricsMap.set(opt.id, { name: opt.option_label, metric: metricValue });
      }

      setUserMetricsForResolve(metricsMap);
      toast({
        title: 'Metrics Loaded',
        description: 'Review the metrics below and select the winner.',
      });
    } catch (error) {
      console.error('Error auto-detecting winner:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user metrics',
        variant: 'destructive',
      });
    } finally {
      setAutoDetecting(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewEventType('custom');
    setNewWagersCloseAt('');
    setNewMinWager('10');
    setNewMaxWager('500');
    setBetOnUsers(false);
    setNewOptions([{ label: '', multiplier: '2.0', userId: null }, { label: '', multiplier: '2.0', userId: null }]);
  };

  const addOption = () => {
    setNewOptions([...newOptions, { label: '', multiplier: '2.0', userId: null }]);
  };

  const updateOption = (index: number, field: 'label' | 'multiplier' | 'userId', value: string | null) => {
    const updated = [...newOptions];
    if (field === 'userId') {
      updated[index].userId = value;
    } else {
      updated[index][field] = value as string;
    }
    setNewOptions(updated);
  };

  const openEditDialog = (event: WagerEvent) => {
    setSelectedEvent(event);
    setEditTitle(event.title);
    setEditDescription(event.description || '');
    setEditEventType(event.event_type);
    setEditWagersCloseAt(format(new Date(event.wagers_close_at), "yyyy-MM-dd'T'HH:mm"));
    setEditMinWager(String(event.min_wager));
    setEditMaxWager(String(event.max_wager));
    setEditDialogOpen(true);
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('pit_wager_events')
        .update({
          title: editTitle,
          description: editDescription || null,
          event_type: editEventType,
          wagers_close_at: new Date(editWagersCloseAt).toISOString(),
          min_wager: parseInt(editMinWager) || 10,
          max_wager: parseInt(editMaxWager) || 500,
        })
        .eq('id', selectedEvent.id);

      if (error) throw error;

      toast({
        title: 'Event Updated',
        description: 'The wager event has been updated successfully',
      });

      setEditDialogOpen(false);
      setSelectedEvent(null);
      fetchData();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to update wager event',
        variant: 'destructive',
      });
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      custom: { label: 'Custom', color: 'bg-gray-500' },
      weekly_top_sales: { label: 'Weekly Top Sales', color: 'bg-blue-500' },
      weekly_top_canvasser: { label: 'Weekly Top Canvasser', color: 'bg-green-500' },
      contest: { label: 'Contest Winner', color: 'bg-yellow-500' },
    };
    return labels[eventType] || labels.custom;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">Open</Badge>;
      case 'locked':
        return <Badge className="bg-yellow-500">Locked</Badge>;
      case 'resolved':
        return <Badge className="bg-blue-500">Resolved</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEventStats = (eventId: string) => {
    const eventWagers = wagers.get(eventId) || [];
    const totalWagered = eventWagers.reduce((sum, w) => sum + w.points_wagered, 0);
    return { count: eventWagers.length, totalWagered };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const activeEvents = events.filter(e => e.status === 'open' || e.status === 'locked');
  const pastEvents = events.filter(e => e.status === 'resolved' || e.status === 'cancelled');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            The Pit - Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage wager events for your team
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Wager Event</DialogTitle>
              <DialogDescription>
                Set up a new betting event for your team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Who will get the most leads this week?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about this event..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={newEventType} onValueChange={setNewEventType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="weekly_top_sales">Weekly Top Sales</SelectItem>
                      <SelectItem value="weekly_top_canvasser">Weekly Top Canvasser</SelectItem>
                      <SelectItem value="contest">Contest Winner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeAt">Wagers Close At</Label>
                  <Input
                    id="closeAt"
                    type="datetime-local"
                    value={newWagersCloseAt}
                    onChange={(e) => setNewWagersCloseAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minWager">Min Wager (pts)</Label>
                  <Input
                    id="minWager"
                    type="number"
                    min="1"
                    value={newMinWager}
                    onChange={(e) => setNewMinWager(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxWager">Max Wager (pts)</Label>
                  <Input
                    id="maxWager"
                    type="number"
                    min="1"
                    value={newMaxWager}
                    onChange={(e) => setNewMaxWager(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Betting Options</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="flex items-center gap-2 py-2">
                  <Switch checked={betOnUsers} onCheckedChange={setBetOnUsers} />
                  <Label className="cursor-pointer" onClick={() => setBetOnUsers(!betOnUsers)}>
                    Bet on Team Members
                  </Label>
                </div>
                {newOptions.map((opt, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    {betOnUsers ? (
                      <Select 
                        value={opt.userId || ''} 
                        onValueChange={(val) => updateOption(idx, 'userId', val)}
                      >
                        <SelectTrigger className="col-span-2">
                          <SelectValue placeholder="Select user..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Sales Reps</SelectLabel>
                            {availableUsers
                              .filter(u => u.role === 'salesRep')
                              .map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))
                            }
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Canvassers</SelectLabel>
                            {availableUsers
                              .filter(u => u.role === 'canvasser')
                              .map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))
                            }
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder={`Option ${idx + 1}`}
                        value={opt.label}
                        onChange={(e) => updateOption(idx, 'label', e.target.value)}
                        className="col-span-2"
                      />
                    )}
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      placeholder="2.0x"
                      value={opt.multiplier}
                      onChange={(e) => updateOption(idx, 'multiplier', e.target.value)}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {betOnUsers 
                    ? 'Select team members to bet on. The user_id will be stored for tracking.'
                    : 'Multiplier determines payout (e.g., 2.0x = double your points)'
                  }
                </p>
              </div>
              <Button onClick={handleCreateEvent} className="w-full">
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Events ({activeEvents.length})</TabsTrigger>
          <TabsTrigger value="past">Past Events ({pastEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active wager events</p>
                <p className="text-sm text-muted-foreground mt-1">Create one to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeEvents.map((event) => {
                const stats = getEventStats(event.id);
                const eventOptions = options.get(event.id) || [];
                return (
                  <Card key={event.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 flex-wrap">
                            {event.title}
                            {getStatusBadge(event.status)}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getEventTypeLabel(event.event_type).color}>
                              {getEventTypeLabel(event.event_type).label}
                            </Badge>
                            {eventOptions.some(opt => opt.user_id) && (
                              <Badge variant="outline" className="text-xs">User Tracking</Badge>
                            )}
                          </div>
                          {event.description && (
                            <CardDescription className="mt-2">{event.description}</CardDescription>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditDialog(event)}
                          title="Edit event"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Closes</p>
                            <p className="font-medium">{format(new Date(event.wagers_close_at), 'MMM d, h:mm a')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Wagers</p>
                            <p className="font-medium">{stats.count}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Total Wagered</p>
                            <p className="font-medium">{stats.totalWagered.toLocaleString()} pts</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Limits</p>
                          <p className="font-medium">{event.min_wager} - {event.max_wager} pts</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Options:</p>
                        <div className="flex flex-wrap gap-2">
                          {eventOptions.map((opt) => (
                            <Badge key={opt.id} variant="outline" className="text-sm">
                              {opt.option_label} ({opt.payout_multiplier}x)
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {event.status === 'open' && (
                          <Button variant="outline" size="sm" onClick={() => handleLockEvent(event.id)}>
                            Lock Wagers
                          </Button>
                        )}
                        {(event.status === 'open' || event.status === 'locked') && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event);
                                setResolveDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelEvent(event.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {pastEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No past events yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastEvents.map((event) => {
                const stats = getEventStats(event.id);
                const eventOptions = options.get(event.id) || [];
                const winner = eventOptions.find(o => o.is_winner);
                return (
                  <Card key={event.id} className="opacity-90 hover:opacity-100 transition-opacity">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {event.title}
                            {getStatusBadge(event.status)}
                          </CardTitle>
                          {winner && (
                            <CardDescription className="mt-1 flex items-center gap-1">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              Winner: {winner.option_label}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                        <span>{stats.count} wagers</span>
                        <span>{stats.totalWagered.toLocaleString()} pts wagered</span>
                        {event.resolved_at && (
                          <span>Resolved {format(new Date(event.resolved_at), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openWagerDetailsDialog(event)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Wagers
                        </Button>
                        {event.status === 'resolved' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetEvent(event.id)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Reset
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelResolvedEvent(event.id)}
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              Cancel & Refund
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={(open) => {
        setResolveDialogOpen(open);
        if (!open) {
          setUserMetricsForResolve(new Map());
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Event</DialogTitle>
            <DialogDescription>
              Select the winning option. Points will be distributed to winners.
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 mt-4">
              <p className="font-medium">{selectedEvent.title}</p>
              
              {/* Auto-detect button for user-based events */}
              {options.get(selectedEvent.id)?.some(opt => opt.user_id) && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleAutoDetectWinner}
                  disabled={autoDetecting}
                >
                  {autoDetecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Auto-Detect Winner (Fetch Metrics)
                </Button>
              )}

              <div className="space-y-2">
                {options.get(selectedEvent.id)?.map((opt) => {
                  const metrics = userMetricsForResolve.get(opt.id);
                  return (
                    <Button
                      key={opt.id}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => handleResolveEvent(opt.id)}
                    >
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                        {opt.option_label} ({opt.payout_multiplier}x)
                      </div>
                      {metrics && (
                        <Badge variant="secondary" className="ml-2">
                          {metrics.metric.toLocaleString()} pts
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>

              {userMetricsForResolve.size > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Metrics shown above. Click the highest scorer to select as winner.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Wager Event</DialogTitle>
            <DialogDescription>
              Update the event details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle">Event Title</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description (optional)</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editEventType">Event Type (Judging Criteria)</Label>
                <Select value={editEventType} onValueChange={setEditEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="weekly_top_sales">Weekly Top Sales</SelectItem>
                    <SelectItem value="weekly_top_canvasser">Weekly Top Canvasser</SelectItem>
                    <SelectItem value="contest">Contest Winner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCloseAt">Wagers Close At</Label>
                <Input
                  id="editCloseAt"
                  type="datetime-local"
                  value={editWagersCloseAt}
                  onChange={(e) => setEditWagersCloseAt(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editMinWager">Min Wager (pts)</Label>
                <Input
                  id="editMinWager"
                  type="number"
                  min="1"
                  value={editMinWager}
                  onChange={(e) => setEditMinWager(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMaxWager">Max Wager (pts)</Label>
                <Input
                  id="editMaxWager"
                  type="number"
                  min="1"
                  value={editMaxWager}
                  onChange={(e) => setEditMaxWager(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleUpdateEvent} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wager Details Dialog */}
      <Dialog open={wagerDetailsDialogOpen} onOpenChange={setWagerDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Wager Details</DialogTitle>
            <DialogDescription>
              {selectedEvent?.title} - All wagers placed on this event
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            {selectedEventWagers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No wagers placed on this event</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Pick</TableHead>
                    <TableHead className="text-right">Wagered</TableHead>
                    <TableHead className="text-right">Potential</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEventWagers.map((wager, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{wager.userName}</TableCell>
                      <TableCell>{wager.optionLabel}</TableCell>
                      <TableCell className="text-right">{wager.pointsWagered} pts</TableCell>
                      <TableCell className="text-right">{wager.potentialPayout} pts</TableCell>
                      <TableCell className="text-center">
                        {wager.status === 'won' && <Badge className="bg-green-500">Won</Badge>}
                        {wager.status === 'lost' && <Badge variant="destructive">Lost</Badge>}
                        {wager.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                        {wager.status === 'refunded' && <Badge variant="outline">Refunded</Badge>}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-500">
                        {wager.status === 'won' ? `+${wager.pointsWon}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}