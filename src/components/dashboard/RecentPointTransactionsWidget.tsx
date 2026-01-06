import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Zap, Calendar, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface PointTransaction {
  id: string;
  type: 'wager' | 'contest';
  description: string;
  userName: string;
  points_change: number;
  created_at: string;
}

export function RecentPointTransactionsWidget() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const allTransactions: PointTransaction[] = [];

    try {
      // Fetch recent wager transactions
      const { data: wagerTransactions } = await supabase
        .from('pit_point_transactions')
        .select('id, user_id, transaction_type, points_change, created_at')
        .in('transaction_type', ['wager_won', 'wager_lost'])
        .order('created_at', { ascending: false })
        .limit(20);

      // Get user names for wager transactions
      const userIds = new Set<string>();
      wagerTransactions?.forEach(wt => userIds.add(wt.user_id));

      // Fetch user names
      const { data: salesReps } = await supabase
        .from('user_metrics')
        .select('user_id, display_name')
        .in('user_id', Array.from(userIds));

      const { data: canvassers } = await supabase
        .from('canvasser_metrics')
        .select('user_id, display_name')
        .in('user_id', Array.from(userIds));

      const nameMap = new Map<string, string>();
      salesReps?.forEach(sr => {
        if (sr.user_id && sr.display_name) nameMap.set(sr.user_id, sr.display_name);
      });
      canvassers?.forEach(c => {
        if (c.user_id && c.display_name && !nameMap.has(c.user_id)) {
          nameMap.set(c.user_id, c.display_name);
        }
      });

      wagerTransactions?.forEach(wt => {
        const typeLabels: Record<string, string> = {
          wager_won: 'Won Wager',
          wager_lost: 'Lost Wager',
        };

        allTransactions.push({
          id: wt.id,
          type: 'wager',
          description: typeLabels[wt.transaction_type] || wt.transaction_type,
          userName: nameMap.get(wt.user_id) || 'Unknown User',
          points_change: wt.points_change,
          created_at: wt.created_at,
        });
      });

      // Fetch recent contest victories
      const { data: contestVictories } = await supabase
        .from('contest_victories')
        .select('id, user_id, points_awarded, place, created_at, contest_id')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get contest titles
      const contestIds = contestVictories?.map(cv => cv.contest_id) || [];
      const { data: contestsData } = contestIds.length > 0
        ? await supabase.from('contests').select('id, title').in('id', contestIds)
        : { data: [] };

      const contestTitleMap = new Map<string, string>();
      contestsData?.forEach(c => contestTitleMap.set(c.id, c.title));

      // Get user names for contest winners
      const contestUserIds = contestVictories?.map(cv => cv.user_id) || [];
      const { data: contestSalesReps } = contestUserIds.length > 0
        ? await supabase.from('user_metrics').select('user_id, display_name').in('user_id', contestUserIds)
        : { data: [] };
      const { data: contestCanvassers } = contestUserIds.length > 0
        ? await supabase.from('canvasser_metrics').select('user_id, display_name').in('user_id', contestUserIds)
        : { data: [] };

      contestSalesReps?.forEach(sr => {
        if (sr.user_id && sr.display_name) nameMap.set(sr.user_id, sr.display_name);
      });
      contestCanvassers?.forEach(c => {
        if (c.user_id && c.display_name && !nameMap.has(c.user_id)) {
          nameMap.set(c.user_id, c.display_name);
        }
      });

      contestVictories?.forEach(cv => {
        const placeLabels: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };
        const contestTitle = contestTitleMap.get(cv.contest_id) || 'Contest';

        allTransactions.push({
          id: cv.id,
          type: 'contest',
          description: `${placeLabels[cv.place] || `${cv.place}th`} - ${contestTitle}`,
          userName: nameMap.get(cv.user_id) || 'Unknown User',
          points_change: cv.points_awarded,
          created_at: cv.created_at,
        });
      });

      // Sort by date
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions.slice(0, 15));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string, pointsChange: number) => {
    if (type === 'contest') return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (pointsChange > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" />
            Recent Point Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-accent" />
          Recent Point Activity
        </CardTitle>
        <CardDescription>Latest wager results and contest wins</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-muted">
                    {getIcon(tx.type, tx.points_change)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.userName}</p>
                    <p className="text-xs text-muted-foreground">{tx.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.points_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.points_change >= 0 ? '+' : ''}{tx.points_change}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.created_at), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
