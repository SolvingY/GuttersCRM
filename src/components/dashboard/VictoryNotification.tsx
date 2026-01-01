import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Crown, Medal, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Victory {
  id: string;
  contest_id: string;
  place: number;
  points_awarded: number;
  contest?: {
    title: string;
    icon: string;
    prize_description: string;
    prize_2nd_description: string | null;
    prize_3rd_description: string | null;
    prize_value: number;
    prize_2nd_value: number | null;
    prize_3rd_value: number | null;
  };
}

export function VictoryNotification() {
  const { user } = useAuth();
  const [victories, setVictories] = useState<Victory[]>([]);
  const [currentVictoryIndex, setCurrentVictoryIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      // Delay to let welcome toast show first
      const timer = setTimeout(() => {
        fetchUnacknowledgedVictories();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const fetchUnacknowledgedVictories = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('contest_victories')
      .select(`
        id,
        contest_id,
        place,
        points_awarded,
        contests (
          title,
          icon,
          prize_description,
          prize_2nd_description,
          prize_3rd_description,
          prize_value,
          prize_2nd_value,
          prize_3rd_value
        )
      `)
      .eq('user_id', user.id)
      .eq('acknowledged', false);

    if (error) {
      console.error('Error fetching victories:', error);
      return;
    }

    if (data && data.length > 0) {
      const formattedVictories = data.map((v: any) => ({
        id: v.id,
        contest_id: v.contest_id,
        place: v.place,
        points_awarded: v.points_awarded,
        contest: v.contests,
      }));
      setVictories(formattedVictories);
      setOpen(true);
    }
  };

  const acknowledgeVictory = async () => {
    const currentVictory = victories[currentVictoryIndex];
    if (!currentVictory) return;

    const { error } = await supabase
      .from('contest_victories')
      .update({ acknowledged: true })
      .eq('id', currentVictory.id);

    if (error) {
      console.error('Error acknowledging victory:', error);
      return;
    }

    if (currentVictoryIndex < victories.length - 1) {
      setCurrentVictoryIndex(currentVictoryIndex + 1);
    } else {
      setOpen(false);
      setVictories([]);
      setCurrentVictoryIndex(0);
    }
  };

  const currentVictory = victories[currentVictoryIndex];
  if (!currentVictory) return null;

  const getPlaceInfo = (place: number) => {
    switch (place) {
      case 1:
        return {
          label: '1st Place',
          emoji: '🥇',
          icon: Crown,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
        };
      case 2:
        return {
          label: '2nd Place',
          emoji: '🥈',
          icon: Medal,
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/20',
          borderColor: 'border-gray-400/30',
        };
      case 3:
        return {
          label: '3rd Place',
          emoji: '🥉',
          icon: Medal,
          color: 'text-amber-600',
          bgColor: 'bg-amber-600/20',
          borderColor: 'border-amber-600/30',
        };
      default:
        return {
          label: `${place}th Place`,
          emoji: '🏅',
          icon: Star,
          color: 'text-primary',
          bgColor: 'bg-primary/20',
          borderColor: 'border-primary/30',
        };
    }
  };

  const placeInfo = getPlaceInfo(currentVictory.place);
  const PlaceIcon = placeInfo.icon;

  const getPrizeDescription = () => {
    if (!currentVictory.contest) return '';
    switch (currentVictory.place) {
      case 1:
        return currentVictory.contest.prize_description;
      case 2:
        return currentVictory.contest.prize_2nd_description || '';
      case 3:
        return currentVictory.contest.prize_3rd_description || '';
      default:
        return '';
    }
  };

  const getPrizeValue = () => {
    if (!currentVictory.contest) return 0;
    switch (currentVictory.place) {
      case 1:
        return currentVictory.contest.prize_value;
      case 2:
        return currentVictory.contest.prize_2nd_value || 0;
      case 3:
        return currentVictory.contest.prize_3rd_value || 0;
      default:
        return 0;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={cn("sm:max-w-md border-2", placeInfo.borderColor)}>
        <DialogHeader className="text-center">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className={cn("p-4 rounded-full", placeInfo.bgColor)}>
              <Trophy className={cn("h-12 w-12", placeInfo.color)} />
            </div>
            <div className="text-6xl">{placeInfo.emoji}</div>
          </div>
          <DialogTitle className="text-2xl text-center">
            Congratulations!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            You achieved <span className={cn("font-bold", placeInfo.color)}>{placeInfo.label}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentVictory.contest && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">{currentVictory.contest.icon}</span>
                <h3 className="font-semibold text-lg">{currentVictory.contest.title}</h3>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <PlaceIcon className={cn("h-5 w-5", placeInfo.color)} />
              <span className="font-medium">Points Earned:</span>
              <span className={cn("font-bold text-lg", placeInfo.color)}>
                +{currentVictory.points_awarded}
              </span>
            </div>

            {getPrizeDescription() && (
              <div className="text-center">
                <span className="text-sm text-muted-foreground">Prize: </span>
                <span className="font-medium">{getPrizeDescription()}</span>
                {getPrizeValue() > 0 && (
                  <span className="ml-1 text-green-600 font-bold">
                    (${getPrizeValue().toLocaleString()})
                  </span>
                )}
              </div>
            )}
          </div>

          {victories.length > 1 && (
            <p className="text-center text-sm text-muted-foreground">
              Victory {currentVictoryIndex + 1} of {victories.length}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <Button onClick={acknowledgeVictory} className="w-full max-w-xs">
            {currentVictoryIndex < victories.length - 1 ? 'Next Victory' : 'Celebrate! 🎉'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
