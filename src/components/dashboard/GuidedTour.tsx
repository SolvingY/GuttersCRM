import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, ChevronLeft, X, Target, Trophy, TrendingUp, Users, Settings } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
}

const tourSteps: TourStep[] = [
  {
    title: 'Your Stats Dashboard',
    description: 'Track your sales, earnings, and closed deals in real-time. These stats update as your admin logs your weekly progress.',
    icon: TrendingUp,
  },
  {
    title: 'Goal Progress',
    description: 'See how close you are to hitting your yearly goal with the visual progress tracker. Every sale gets you closer!',
    icon: Target,
  },
  {
    title: 'Active Contests',
    description: 'Compete with your team in weekly and monthly contests. Win prizes and earn bonus points!',
    icon: Trophy,
  },
  {
    title: 'Leaderboard',
    description: 'See where you rank against your teammates. Climb to the top and show everyone who the real closer is!',
    icon: Users,
  },
  {
    title: 'Settings',
    description: 'Update your display name and manage your account preferences from the settings page.',
    icon: Settings,
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuidedTour({ isOpen, onClose }: GuidedTourProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;
  const Icon = step.icon;

  const handleNext = () => {
    if (isLastStep) {
      // Mark tour as completed
      localStorage.setItem(`tour_completed_${user.id}`, 'true');
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`tour_completed_${user.id}`, 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Tour Card */}
      <Card className="relative z-10 w-full max-w-md mx-4 p-6 bg-background border-border shadow-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleSkip}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-accent'
                  : index < currentStep
                  ? 'w-2 bg-accent/50'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-accent/10 rounded-full">
              <Icon className="h-10 w-10 text-accent" />
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-heading text-foreground mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Step counter */}
          <p className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {tourSteps.length}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handlePrev}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleNext}
          >
            {isLastStep ? (
              "Let's Go!"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <button
            onClick={handleSkip}
            className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
        )}
      </Card>
    </div>
  );
}
