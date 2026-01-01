import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function WelcomeBackNotification() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    
    // Check if welcome message already shown this session
    const hasShownWelcome = sessionStorage.getItem('welcomeShown');
    if (hasShownWelcome) return;
    
    // Small delay to let page load
    const timer = setTimeout(() => {
      toast({
        title: "Welcome back, closer! 💪",
        description: "Let's crush those goals today!",
      });
      sessionStorage.setItem('welcomeShown', 'true');
    }, 800);
    
    return () => clearTimeout(timer);
  }, [user, toast]);

  return null;
}
