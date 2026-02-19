import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Trophy, Coins, TrendingUp, TrendingDown, Calendar, Zap, Target, Award } from 'lucide-react';
import { format } from 'date-fns';

interface PointTransaction {
  id: string;
  type: 'wager' | 'contest' | 'performance';
  description: string;
  points_change: number;
  balance_after: number | null;
  created_at: string;
  metadata?: {
    event_title?: string;
    contest_title?: string;
  };
}

export default function SupplementerPointsHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'wager' | 'contest' | 'performance'>('all');

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    setLoading(true);
    const allTransactions: PointTransaction[] = [];

    try {
      // 1. Wager transactions
      const { data: wagerTransactions } = await supabase
        .from('pit_point_transactions')
        .select('id, transaction_type, points_change, balance_after, created_at, wager_id')
        .eq('user_id', user!.id)
        .in('transaction_type', ['wager_won', 'wager_lost', 'wager_refunded'])
        .order('created_at', { ascending: false });

      for (const wt of wagerTransactions || []) {
        let eventTitle = '';
        if (wt.wager_id) {
          const { data: wagerData } = await supabase.from('pit_wagers').select('event_id').eq('id', wt.wager_id).single();
          if (wagerData) {
            const { data: eventData } = await supabase.from('pit_wager_events').select('title').eq('id', wagerData.event_id).single();
            eventTitle = eventData?.title || '';
          }
        }
        const typeLabels: Record<string, string> = { wager_won: 'Wager Won', wager_lost: 'Wager Lost', wager_refunded: 'Wager Refunded' };
        allTransactions.push({
          id: wt.id, type: 'wager', description: typeLabels[wt.transaction_type] || wt.transaction_type,
          points_change: wt.points_change, balance_after: wt.balance_after, created_at: wt.created_at,
          metadata: { event_title: eventTitle },
        });
      }

      // 2. Contest victories
      const { data: contestVictories } = await supabase
        .from('contest_victories')
        .select('id, points_awarded, place, created_at, contest_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      for (const cv of contestVictories || []) {
        const { data: contestData } = await supabase.from('contests').select('title').eq('id', cv.contest_id).single();
        const placeLabels: Record<number, string> = { 1: '1st Place', 2: '2nd Place', 3: '3rd Place' };
        allTransactions.push({
          id: cv.id, type: 'contest',
          description: `${placeLabels[cv.place] || `${cv.place}th Place`} - ${contestData?.title || 'Unknown Contest'}`,
          points_change: cv.points_awarded, balance_after: null, created_at: cv.created_at,
          metadata: { contest_title: contestData?.title },
        });
      }

      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'wager': return <Zap className="h-4 w-4 text-orange-500" />;
      case 'contest': return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'performance': return <Target className="h-4 w-4 text-blue-500" />;
      default: return <Coins className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'wager': return <Badge variant="outline" className="text-orange-500 border-orange-500/50">Wager</Badge>;
      case 'contest': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Contest</Badge>;
      case 'performance': return <Badge variant="outline" className="text-blue-500 border-blue-500/50">Performance</Badge>;
      default: return <Badge variant="outline">Other</Badge>;
    }
  };

  const totalWagerGains = transactions.filter(t => t.type === 'wager' && t.description === 'Wager Won').reduce((sum, t) => sum + t.points_change, 0);
  const totalWagerLosses = transactions.filter(t => t.type === 'wager' && t.description === 'Wager Lost').reduce((sum, t) => sum + Math.abs(t.points_change), 0);
  const totalContestPoints = transactions.filter(t => t.type === 'contest').reduce((sum, t) => sum + t.points_change, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><Award className="h-6 w-6 text-accent" />Points History</h1>
        <p className="text-sm text-muted-foreground">Track all your point transactions and earnings</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Contest Wins</p><p className="text-2xl font-bold text-yellow-500">+{totalContestPoints}</p></div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Wager Wins</p><p className="text-2xl font-bold text-orange-500">+{totalWagerGains}</p></div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Wager Losses</p><p className="text-2xl font-bold text-red-500">-{totalWagerLosses}</p></div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Log</CardTitle>
          <CardDescription>All point changes from wagers and contests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
              <TabsTrigger value="contest">Contests ({transactions.filter(t => t.type === 'contest').length})</TabsTrigger>
              <TabsTrigger value="wager">Wagers ({transactions.filter(t => t.type === 'wager').length})</TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No transactions found</div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">{getIcon(tx.type)}</div>
                      <div>
                        <p className="font-medium text-sm">{tx.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getTypeBadge(tx.type)}<span>•</span><span>{format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        {tx.metadata?.event_title && <p className="text-xs text-muted-foreground mt-1">Event: {tx.metadata.event_title}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${tx.points_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{tx.points_change >= 0 ? '+' : ''}{tx.points_change}</p>
                      {tx.balance_after !== null && <p className="text-xs text-muted-foreground">Balance: {tx.balance_after}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
