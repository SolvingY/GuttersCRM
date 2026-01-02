import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Menu,
  ArrowLeft,
  KeyRound,
  LogOut,
  Trophy,
  UserCog,
  BarChart3,
  Megaphone
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import nextGenLogo from '@/assets/next-gen-logo.png';

const adminNavItems = [
  { icon: Users, label: 'Master Overview', path: '/admin/overview' },
  { icon: BarChart3, label: 'Leaderboards', path: '/admin/leaderboards' },
  { icon: UserPlus, label: 'Invite Users', path: '/admin/invites' },
  { icon: UserCog, label: 'User Roles', path: '/admin/users' },
  { icon: Calendar, label: 'Weekly Updates', path: '/admin/weekly' },
  { icon: Trophy, label: 'Contests', path: '/admin/contests' },
  { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <h1 className="text-base sm:text-lg font-heading text-foreground">Admin Portal</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/stats')}
            className="text-xs sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Back to</span> Dashboard
          </Button>
          
          {user && (
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
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-w-0">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Desktop sidebar */}
        <aside
          className={cn(
            'bg-accent text-accent-foreground flex-col transition-all duration-300 hidden md:flex relative overflow-hidden',
            collapsed ? 'w-14' : 'w-56'
          )}
        >
          <div className="flex items-center justify-between p-3 border-b border-accent-foreground/10">
            {!collapsed && (
              <span className="text-sm font-heading uppercase tracking-wide">Admin Menu</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-accent-foreground/70 hover:text-accent-foreground hover:bg-accent-foreground/10"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex-1 p-2 space-y-1">
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-background text-foreground'
                      : 'text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* Watermark */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            <img 
              src={nextGenLogo} 
              alt="" 
              className="w-24 h-24 object-contain opacity-[0.08]"
            />
          </div>
        </aside>

        {/* Mobile slide-out sidebar */}
        <aside
          className={cn(
            'fixed top-0 left-0 h-full w-64 bg-accent text-accent-foreground flex flex-col z-50 md:hidden transition-transform duration-300 ease-out relative overflow-hidden',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between p-3 border-b border-accent-foreground/10">
            <span className="text-sm font-heading uppercase tracking-wide">Admin Menu</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-accent-foreground/70 hover:text-accent-foreground hover:bg-accent-foreground/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-background text-foreground'
                      : 'text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Watermark */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            <img 
              src={nextGenLogo} 
              alt="" 
              className="w-28 h-28 object-contain opacity-[0.08]"
            />
          </div>
        </aside>

        {/* Main content with watermark */}
        <main className="flex-1 w-full p-3 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto relative min-w-0">
          {/* Watermark background */}
          <div 
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{ zIndex: 0 }}
          >
            <img 
              src={nextGenLogo} 
              alt="" 
              className="w-64 h-64 md:w-96 md:h-96 object-contain opacity-[0.04]"
            />
          </div>
          
          <div className="w-full md:max-w-7xl md:mx-auto relative z-10 min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
