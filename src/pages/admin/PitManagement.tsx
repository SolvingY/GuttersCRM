import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Flame, Trophy, Clock, CheckCircle, XCircle, Users, Coins } from 'lucide-react';
import { format } from 'date-fns';

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

export default function PitManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<WagerEvent[]>([]);
  const [options, setOptions] = useState<Map<string, WagerOption[]>>(new Map());
  const [wagers, setWagers] = useState<Map<string, Wager[]>>(new Map());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WagerEvent | null>(null);
  
  // Create event form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEventType, setNewEventType] = useState('custom');
  const [newWagersCloseAt, setNewWagersCloseAt] = useState('');
  const [newMinWager, setNewMinWager] = useState('10');
  const [newMaxWager, setNewMaxWager] = useState('500');
  const [newOptions, setNewOptions] = useState<{ label: string; multiplier: string }[]>([
    { label: '', multiplier: '2.0' },
    { label: '', multiplier: '2.0' },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

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
    if (!newTitle || !newWagersCloseAt || newOptions.filter(o => o.label).length < 2) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in title, close time, and at least 2 options',
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
      const validOptions = newOptions.filter(o => o.label.trim());
      const { error: optionsError } = await supabase
        .from('pit_wager_options')
        .insert(
          validOptions.map(opt => ({
            event_id: eventData.id,
            option_label: opt.label,
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

        // Create point transaction for winners
        if (isWinner) {
          // Get current user points
          const { data: metricsData } = await supabase
            .from('user_metrics')
            .select('points')
            .eq('user_id', wager.user_id)
            .order('metric_date', { ascending: false })
            .limit(1)
            .single();

          const currentPoints = Number(metricsData?.points) || 0;
          const newBalance = currentPoints + pointsWon;

          await supabase
            .from('pit_point_transactions')
            .insert({
              user_id: wager.user_id,
              wager_id: wager.id,
              transaction_type: 'wager_won',
              points_change: pointsWon,
              balance_after: newBalance,
            });
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

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewEventType('custom');
    setNewWagersCloseAt('');
    setNewMinWager('10');
    setNewMaxWager('500');
    setNewOptions([{ label: '', multiplier: '2.0' }, { label: '', multiplier: '2.0' }]);
  };

  const addOption = () => {
    setNewOptions([...newOptions, { label: '', multiplier: '2.0' }]);
  };

  const updateOption = (index: number, field: 'label' | 'multiplier', value: string) => {
    const updated = [...newOptions];
    updated[index][field] = value;
    setNewOptions(updated);
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
                {newOptions.map((opt, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt.label}
                      onChange={(e) => updateOption(idx, 'label', e.target.value)}
                      className="col-span-2"
                    />
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
                  Multiplier determines payout (e.g., 2.0x = double your points)
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
                          <CardTitle className="flex items-center gap-2">
                            {event.title}
                            {getStatusBadge(event.status)}
                          </CardTitle>
                          {event.description && (
                            <CardDescription className="mt-1">{event.description}</CardDescription>
                          )}
                        </div>
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
                  <Card key={event.id} className="opacity-75">
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
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{stats.count} wagers</span>
                        <span>{stats.totalWagered.toLocaleString()} pts wagered</span>
                        {event.resolved_at && (
                          <span>Resolved {format(new Date(event.resolved_at), 'MMM d, yyyy')}</span>
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
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Event</DialogTitle>
            <DialogDescription>
              Select the winning option. Points will be distributed to winners.
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 mt-4">
              <p className="font-medium">{selectedEvent.title}</p>
              <div className="space-y-2">
                {options.get(selectedEvent.id)?.map((opt) => (
                  <Button
                    key={opt.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleResolveEvent(opt.id)}
                  >
                    <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                    {opt.option_label} ({opt.payout_multiplier}x)
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}