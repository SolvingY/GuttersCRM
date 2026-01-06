import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Flame, Trophy, Clock, Coins, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface WagerEvent {
  id: string;
  title: string;
  description: string | null;
  status: string;
  wagers_close_at: string;
  min_wager: number;
  max_wager: number;
}

interface WagerOption {
  id: string;
  event_id: string;
  option_label: string;
  payout_multiplier: number;
  is_winner: boolean;
}

interface UserWager {
  id: string;
  event_id: string;
  option_id: string;
  points_wagered: number;
  potential_payout: number;
  status: string;
  points_won: number;
  created_at: string;
  event_title?: string;
  option_label?: string;
}

export default function CanvasserPit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<WagerEvent[]>([]);
  const [options, setOptions] = useState<Map<string, WagerOption[]>>(new Map());
  const [userWagers, setUserWagers] = useState<UserWager[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [pointsInWagers, setPointsInWagers] = useState(0);
  
  // Wager dialog state
  const [wagerDialogOpen, setWagerDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<WagerOption | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WagerEvent | null>(null);
  const [wagerAmount, setWagerAmount] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch open events
      const { data: eventsData } = await supabase
        .from('pit_wager_events')
        .select('*')
        .in('status', ['open', 'locked'])
        .order('wagers_close_at', { ascending: true });

      setEvents(eventsData || []);

      // Fetch options for events
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(e => e.id);
        const { data: optionsData } = await supabase
          .from('pit_wager_options')
          .select('*')
          .in('event_id', eventIds);

        const optionsMap = new Map<string, WagerOption[]>();
        optionsData?.forEach(opt => {
          const existing = optionsMap.get(opt.event_id) || [];
          optionsMap.set(opt.event_id, [...existing, opt]);
        });
        setOptions(optionsMap);
      }

      // Fetch user's wagers
      const { data: wagersData } = await supabase
        .from('pit_wagers')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      // Enrich with event and option info
      const enrichedWagers: UserWager[] = [];
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

        enrichedWagers.push({
          ...wager,
          event_title: eventData?.title,
          option_label: optionData?.option_label,
        });
      }
      setUserWagers(enrichedWagers);

      // Calculate points in active wagers
      const pendingWagers = (wagersData || []).filter(w => w.status === 'pending');
      const inWagers = pendingWagers.reduce((sum, w) => sum + w.points_wagered, 0);
      setPointsInWagers(inWagers);

      // Fetch user's current points from canvasser_metrics
      const { data: metricsData } = await supabase
        .from('canvasser_metrics')
        .select('points')
        .eq('user_id', user!.id)
        .order('metric_date', { ascending: false })
        .limit(1)
        .single();

      setUserPoints(Number(metricsData?.points) || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceWager = async () => {
    if (!selectedOption || !selectedEvent || !wagerAmount) return;

    const amount = parseInt(wagerAmount);
    if (amount < selectedEvent.min_wager || amount > selectedEvent.max_wager) {
      toast({
        title: 'Invalid Wager',
        description: `Wager must be between ${selectedEvent.min_wager} and ${selectedEvent.max_wager} points`,
        variant: 'destructive',
      });
      return;
    }

    const availablePoints = userPoints - pointsInWagers;
    if (amount > availablePoints) {
      toast({
        title: 'Insufficient Points',
        description: `You only have ${availablePoints} points available`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const potentialPayout = Math.floor(amount * selectedOption.payout_multiplier);

      const { error } = await supabase
        .from('pit_wagers')
        .insert({
          user_id: user!.id,
          event_id: selectedEvent.id,
          option_id: selectedOption.id,
          points_wagered: amount,
          potential_payout: potentialPayout,
          status: 'pending',
        });

      if (error) throw error;

      // Create transaction record
      await supabase
        .from('pit_point_transactions')
        .insert({
          user_id: user!.id,
          transaction_type: 'wager_placed',
          points_change: -amount,
          balance_after: userPoints - amount,
        });

      toast({
        title: 'Wager Placed!',
        description: `You bet ${amount} points on ${selectedOption.option_label}`,
      });

      setWagerDialogOpen(false);
      setWagerAmount('');
      setSelectedOption(null);
      setSelectedEvent(null);
      fetchData();
    } catch (error) {
      console.error('Error placing wager:', error);
      toast({
        title: 'Error',
        description: 'Failed to place wager',
        variant: 'destructive',
      });
    }
  };

  const openWagerDialog = (event: WagerEvent, option: WagerOption) => {
    setSelectedEvent(event);
    setSelectedOption(option);
    setWagerDialogOpen(true);
  };

  const getTimeRemaining = (closeTime: string) => {
    const now = new Date();
    const close = new Date(closeTime);
    if (close <= now) return 'Closed';
    return formatDistanceToNow(close, { addSuffix: true });
  };

  const hasUserBetOnEvent = (eventId: string) => {
    return userWagers.some(w => w.event_id === eventId && w.status === 'pending');
  };

  // Calculate lifetime stats
  const lifetimeWon = userWagers
    .filter(w => w.status === 'won')
    .reduce((sum, w) => sum + w.points_won, 0);
  const lifetimeLost = userWagers
    .filter(w => w.status === 'lost')
    .reduce((sum, w) => sum + w.points_wagered, 0);
  const lifetimeProfit = lifetimeWon - lifetimeLost;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingWagers = userWagers.filter(w => w.status === 'pending');
  const resolvedWagers = userWagers.filter(w => w.status !== 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          The Pit
        </h1>
        <p className="text-sm text-muted-foreground">
          Wager your points on team performance predictions
        </p>
      </div>

      {/* Point Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Points</p>
                <p className="text-2xl font-bold">{(userPoints - pointsInWagers).toLocaleString()}</p>
              </div>
              <Coins className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Active Wagers</p>
                <p className="text-2xl font-bold">{pointsInWagers.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lifetime Won</p>
                <p className="text-2xl font-bold text-green-500">{lifetimeWon.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
                <p className={`text-2xl font-bold ${lifetimeProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {lifetimeProfit >= 0 ? '+' : ''}{lifetimeProfit.toLocaleString()}
                </p>
              </div>
              {lifetimeProfit >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Active Events ({events.length})</TabsTrigger>
          <TabsTrigger value="my-wagers">My Wagers ({pendingWagers.length})</TabsTrigger>
          <TabsTrigger value="history">History ({resolvedWagers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4">
          {events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active events right now</p>
                <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => {
                const eventOptions = options.get(event.id) || [];
                const userBet = hasUserBetOnEvent(event.id);
                const isClosed = event.status === 'locked' || new Date(event.wagers_close_at) <= new Date();

                return (
                  <Card key={event.id} className={userBet ? 'border-orange-500/50' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {event.title}
                            {userBet && <Badge className="bg-orange-500">You're In</Badge>}
                            {isClosed && <Badge variant="secondary">Closed</Badge>}
                          </CardTitle>
                          {event.description && (
                            <CardDescription className="mt-1">{event.description}</CardDescription>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {getTimeRemaining(event.wagers_close_at)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.min_wager} - {event.max_wager} pts
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {eventOptions.map((opt) => (
                          <Button
                            key={opt.id}
                            variant={userBet ? 'secondary' : 'outline'}
                            className="h-auto py-3 flex-col"
                            disabled={isClosed || userBet}
                            onClick={() => openWagerDialog(event, opt)}
                          >
                            <span className="font-medium">{opt.option_label}</span>
                            <span className="text-xs text-muted-foreground">{opt.payout_multiplier}x payout</span>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-wagers" className="mt-4">
          {pendingWagers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No active wagers</p>
                <p className="text-sm text-muted-foreground mt-1">Place a bet on an active event!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingWagers.map((wager) => (
                <Card key={wager.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{wager.event_title}</p>
                        <p className="text-sm text-muted-foreground">
                          Your pick: <span className="text-foreground font-medium">{wager.option_label}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-500">{wager.points_wagered} pts wagered</p>
                        <p className="text-sm text-muted-foreground">
                          Potential win: <span className="text-green-500">{wager.potential_payout} pts</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {resolvedWagers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No wager history yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {resolvedWagers.map((wager) => (
                <Card key={wager.id} className={wager.status === 'won' ? 'border-green-500/50' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{wager.event_title}</p>
                        <p className="text-sm text-muted-foreground">
                          Pick: {wager.option_label} • {format(new Date(wager.created_at), 'MMM d')}
                        </p>
                      </div>
                      <div className="text-right">
                        {wager.status === 'won' ? (
                          <Badge className="bg-green-500">
                            <Trophy className="h-3 w-3 mr-1" />
                            Won {wager.points_won} pts
                          </Badge>
                        ) : wager.status === 'lost' ? (
                          <Badge variant="destructive">Lost {wager.points_wagered} pts</Badge>
                        ) : (
                          <Badge variant="secondary">Refunded</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Place Wager Dialog */}
      <Dialog open={wagerDialogOpen} onOpenChange={setWagerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Your Wager</DialogTitle>
            <DialogDescription>
              {selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedOption && selectedEvent && (
            <div className="space-y-4 mt-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Your Pick</p>
                <p className="text-xl font-bold">{selectedOption.option_label}</p>
                <p className="text-sm text-orange-500">{selectedOption.payout_multiplier}x payout</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Wager Amount (points)</label>
                <Input
                  type="number"
                  min={selectedEvent.min_wager}
                  max={Math.min(selectedEvent.max_wager, userPoints - pointsInWagers)}
                  placeholder={`${selectedEvent.min_wager} - ${selectedEvent.max_wager}`}
                  value={wagerAmount}
                  onChange={(e) => setWagerAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Available: {(userPoints - pointsInWagers).toLocaleString()} pts
                </p>
              </div>
              {wagerAmount && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Potential Payout</p>
                  <p className="text-2xl font-bold text-green-500">
                    {Math.floor(parseInt(wagerAmount) * selectedOption.payout_multiplier).toLocaleString()} pts
                  </p>
                </div>
              )}
              <Button onClick={handlePlaceWager} className="w-full" disabled={!wagerAmount}>
                <Flame className="h-4 w-4 mr-2" />
                Place Wager
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}