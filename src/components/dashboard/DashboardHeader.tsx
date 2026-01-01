import { useState } from 'react';
import { KeyRound, LogOut, Menu, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import nextGenLogo from '@/assets/next-gen-logo.png';
import { salesQuotes } from '@/lib/salesQuotes';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { user, signOut, isAdmin, isCanvasser, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get a random quote per session
  const [quote] = useState(() => {
    const stored = sessionStorage.getItem('dailyQuote');
    if (stored) return stored;
    
    const randomQuote = salesQuotes[Math.floor(Math.random() * salesQuotes.length)];
    sessionStorage.setItem('dailyQuote', randomQuote);
    return randomQuote;
  });

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      sessionStorage.removeItem('dailyQuote');
      navigate('/');
    }
  };

  // Determine portal title based on current route
  const getPortalTitle = () => {
    if (location.pathname.startsWith('/canvasser')) {
      return 'Canvasser Portal';
    }
    if (location.pathname.startsWith('/admin')) {
      return 'Admin Portal';
    }
    return 'Sales Rep Dashboard';
  };

  // Role badge component
  const getRoleBadge = () => {
    if (isAdmin) {
      return <Badge variant="destructive" className="text-xs">Admin</Badge>;
    }
    if (isCanvasser) {
      return <Badge className="bg-primary text-primary-foreground text-xs">Canvasser</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Sales Rep</Badge>;
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6 relative overflow-hidden">
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src={nextGenLogo} 
          alt="" 
          className="w-24 h-24 object-contain opacity-[0.06]"
        />
      </div>

      <div className="flex items-center gap-3 z-10">
        {/* Mobile hamburger menu */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden text-foreground"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <h1 className="text-base sm:text-lg font-heading text-foreground">{getPortalTitle()}</h1>
        {user && getRoleBadge()}
        
        {/* The 6 Figure System Tagline */}
        <span className="hidden lg:inline-block text-sm font-semibold text-primary ml-4 italic">
          The 6 Figure System
        </span>
      </div>

      {/* Motivational Quote - Center */}
      <div className="hidden md:flex flex-1 justify-center px-4 z-10">
        <span className="text-xs text-muted-foreground italic truncate max-w-md text-center">
          "{quote}"
        </span>
      </div>
      
      <div className="flex items-center z-10">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <KeyRound className="h-4 w-4" />
                <span className="sr-only">Account menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-muted-foreground">
                {user.email}
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin')} className="text-accent">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Portal
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/auth')}
          >
            <KeyRound className="h-4 w-4" />
            <span className="sr-only">Sign in</span>
          </Button>
        )}
      </div>
    </header>
  );
}
