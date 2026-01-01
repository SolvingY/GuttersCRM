import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Rocket, 
  BarChart3, 
  Trophy, 
  Target, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';

interface TourStep {
  icon: React.ElementType;
  title: string;
  description: string;
}

const salesTourSteps: TourStep[] = [
  {
    icon: Rocket,
    title: 'Welcome to the 6 Figure System!',
    description: 'This dashboard is your command center for tracking sales performance, competing in contests, and achieving your yearly goals. Let\'s take a quick tour!',
  },
  {
    icon: BarChart3,
    title: 'Your Stats Cards',
    description: 'At the top of your dashboard, you\'ll see key metrics: Total Sales, Earnings, Points, Closed Deals, Leads, and more. These update in real-time as your admin syncs your data.',
  },
  {
    icon: Trophy,
    title: 'Leaderboard & Contests',
    description: 'Compete with your teammates on the leaderboard! Active contests appear at the top of your stats page. Win contests to earn bonus points and prizes.',
  },
  {
    icon: Target,
    title: 'Goal Tracking',
    description: 'Your yearly sales goal is tracked with a progress bar. See exactly how much you\'ve sold and how much remains to hit your target.',
  },
  {
    icon: TrendingUp,
    title: '52-Week Progress Chart',
    description: 'The fiscal year runs Dec 15 - Dec 15. Your 52-week chart shows weekly sales (bars), cumulative total (blue line), and goal pace (dashed line). Stay above the pace line!',
  },
  {
    icon: Calendar,
    title: 'Weekly Updates',
    description: 'Each week your admin will sync your latest numbers. Check the "Recent Weekly Updates" section to see your week-by-week performance breakdown.',
  },
];

const canvasserTourSteps: TourStep[] = [
  {
    icon: Rocket,
    title: 'Welcome to the 6 Figure System!',
    description: 'This dashboard tracks your canvassing performance. Let\'s show you around!',
  },
  {
    icon: BarChart3,
    title: 'Your Performance Metrics',
    description: 'Track Leads Set, Leads Closed, Leads with Damage, and Shifts Worked. Your conversion rate and damage detection rate show how effective you are in the field.',
  },
  {
    icon: Trophy,
    title: 'Canvasser Leaderboard',
    description: 'See how you rank against other canvassers! Compete for the top spots based on leads closed and goal percentage.',
  },
  {
    icon: Target,
    title: 'Yearly Goal',
    description: 'Your leads closed goal is tracked with a progress bar. Each lead you close gets you closer to your annual target!',
  },
  {
    icon: TrendingUp,
    title: 'Points System',
    description: 'Earn points for your work: 10 points per lead closed, 5 points per lead with damage, and 1 point per lead set. Points determine your contest rankings!',
  },
];

interface DashboardTourProps {
  variant?: 'sales' | 'canvasser';
}

export function DashboardTour({ variant = 'sales' }: DashboardTourProps) {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  const steps = variant === 'canvasser' ? canvasserTourSteps : salesTourSteps;

  useEffect(() => {
    if (!user) return;

    const checkTourStatus = async () => {
      // Wait for welcome and announcements to be shown first
      const welcomeShown = sessionStorage.getItem('welcomeShown');
      const announcementsShown = sessionStorage.getItem('announcementsShown');
      const tourShownThisSession = sessionStorage.getItem('tourShown');

      if (tourShownThisSession) {
        setLoading(false);
        return;
      }

      // If welcome hasn't been shown yet, wait
      if (!welcomeShown) {
        const timer = setTimeout(() => checkTourStatus(), 1000);
        return () => clearTimeout(timer);
      }

      // Check if user has completed the tour
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('tour_completed')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking tour status:', error);
        setLoading(false);
        return;
      }

      if (!profile?.tour_completed) {
        // Delay showing tour to let other dialogs close
        setTimeout(() => {
          setShowTour(true);
        }, announcementsShown ? 500 : 2000);
      }

      setLoading(false);
    };

    const timer = setTimeout(checkTourStatus, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    // Mark tour as completed in database
    await supabase
      .from('profiles')
      .update({ tour_completed: true })
      .eq('id', user.id);

    sessionStorage.setItem('tourShown', 'true');
    setShowTour(false);
  };

  const handleSkip = async () => {
    if (!user) return;

    // Mark tour as completed even when skipped
    await supabase
      .from('profiles')
      .update({ tour_completed: true })
      .eq('id', user.id);

    sessionStorage.setItem('tourShown', 'true');
    setShowTour(false);
  };

  if (loading || !showTour) return null;

  const CurrentIcon = steps[currentStep].icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={showTour} onOpenChange={setShowTour}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <CurrentIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-1 mb-4" />
          <DialogTitle className="text-xl">
            {steps[currentStep].title}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            {steps[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between pt-6">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete}>
              Let's Go!
            </Button>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 pt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
