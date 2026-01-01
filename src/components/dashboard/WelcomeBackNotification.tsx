import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getRandomQuote } from '@/lib/salesQuotes';
import nextGenLogo from '@/assets/next-gen-logo.png';

export function WelcomeBackNotification() {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('closer');
  const [quote, setQuote] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // Check if welcome message already shown this session
    const hasShownWelcome = sessionStorage.getItem('welcomeShown');
    if (hasShownWelcome) return;
    
    // Fetch user's name from profiles
    const fetchProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profile?.full_name) {
        // Get first name only
        const firstName = profile.full_name.split(' ')[0];
        setUserName(firstName);
      }
      
      // Get today's quote
      setQuote(getRandomQuote());
      
      // Small delay to let page load
      setTimeout(() => {
        setShowWelcome(true);
      }, 800);
    };
    
    fetchProfile();
  }, [user]);

  const handleDismiss = () => {
    setShowWelcome(false);
    sessionStorage.setItem('welcomeShown', 'true');
  };

  return (
    <Dialog open={showWelcome} onOpenChange={(open) => {
      if (!open) handleDismiss();
    }}>
      <DialogContent className="sm:max-w-md text-center" hideCloseButton>
        <DialogHeader className="space-y-4">
          <div className="flex justify-center">
            <img 
              src={nextGenLogo} 
              alt="Next Generation Roofing" 
              className="w-24 h-24 object-contain"
            />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-heading">
            Welcome back, {userName}! 💪
          </DialogTitle>
          <DialogDescription className="text-base sm:text-lg italic text-muted-foreground px-4">
            "{quote}"
          </DialogDescription>
        </DialogHeader>
        <Button 
          onClick={handleDismiss} 
          className="w-full mt-6"
          size="lg"
          variant="cta"
        >
          Let's Get It
        </Button>
      </DialogContent>
    </Dialog>
  );
}
