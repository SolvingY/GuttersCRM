import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Trophy, Medal, Award, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RankedCanvasser {
  user_id: string;
  display_name: string | null;
  points: number;
  rank: number;
}

export function CanvasserYTDRankingWidget() {
  const { user } = useAuth();
  const [topCanvassers, setTopCanvassers] = useState<RankedCanvasser[]>([]);
  const [userRanking, setUserRanking] = useState<RankedCanvasser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRankings();
    }
  }, [user]);

  const fetchRankings = async () => {
    if (!user) return;

    try {
      // Fetch all canvasser metrics ordered by points
      const { data, error } = await supabase
        .from('canvasser_metrics')
        .select('user_id, display_name, points')
        .order('points', { ascending: false });

      if (error) {
        console.error('Error fetching canvasser rankings:', error);
        setLoading(false);
        return;
      }

      // Add rank to each canvasser
      const ranked = (data || []).map((c, idx) => ({
        ...c,
        points: Number(c.points) || 0,
        rank: idx + 1,
      }));

      // Get top 3
      setTopCanvassers(ranked.slice(0, 3));

      // Find current user's rank
      const userRank = ranked.find(c => c.user_id === user.id);
      setUserRanking(userRank || null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">#{rank}</span>;
    }
  };

  const getRankBgClass = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gray-400/10 border-gray-400/30';
      case 3:
        return 'bg-amber-600/10 border-amber-600/30';
      default:
        return 'bg-muted/50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            YTD Point Rankings
          </CardTitle>
          <Link to="/canvasser/leaderboard">
            <Button variant="ghost" size="sm" className="text-xs">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Top 3 */}
        {topCanvassers.map((canvasser) => (
          <div
            key={canvasser.user_id}
            className={`flex items-center justify-between p-3 rounded-lg border ${getRankBgClass(canvasser.rank)} ${
              canvasser.user_id === user?.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {getRankIcon(canvasser.rank)}
              <span className={`font-medium ${canvasser.user_id === user?.id ? 'text-primary' : ''}`}>
                {canvasser.display_name || 'Unknown'}
                {canvasser.user_id === user?.id && (
                  <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                )}
              </span>
            </div>
            <span className="font-bold text-foreground">
              {canvasser.points.toLocaleString()} pts
            </span>
          </div>
        ))}

        {/* User's ranking if not in top 3 */}
        {userRanking && userRanking.rank > 3 && (
          <>
            <div className="text-center text-muted-foreground text-sm py-1">• • •</div>
            <div className="flex items-center justify-between p-3 rounded-lg border ring-2 ring-primary bg-primary/5">
              <div className="flex items-center gap-3">
                {getRankIcon(userRanking.rank)}
                <span className="font-medium text-primary">
                  {userRanking.display_name || 'You'}
                  <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                </span>
              </div>
              <span className="font-bold text-foreground">
                {userRanking.points.toLocaleString()} pts
              </span>
            </div>
          </>
        )}

        {/* No rankings yet */}
        {topCanvassers.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No rankings available yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
