import { useState, useEffect } from 'react';
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
  Megaphone,
  Target,
  Flame,
  Briefcase,
  Bell,
  ClipboardList
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NewApplicantsModal } from '@/components/admin/NewApplicantsModal';
import { getScoreColor } from '@/lib/dnaAssessment';
import nextGenLogo from '@/assets/next-gen-logo.png';

const adminNavItems = [
  { icon: Users, label: 'Master Overview', path: '/admin/overview' },
  { icon: BarChart3, label: 'Leaderboards', path: '/admin/leaderboards' },
  { icon: Target, label: 'Company Goals', path: '/admin/goals' },
  { icon: UserPlus, label: 'Invite Users', path: '/admin/invites' },
  { icon: UserCog, label: 'User Roles', path: '/admin/users' },
  { icon: Calendar, label: 'Weekly Updates', path: '/admin/weekly' },
  { icon: Trophy, label: 'Contests', path: '/admin/contests' },
  { icon: Flame, label: 'Pit Management', path: '/admin/pit' },
  { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
  { icon: BarChart3, label: 'Report Settings', path: '/admin/reports' },
  { icon: Briefcase, label: 'Future Team Mates', path: '/admin/applicants' },
  { icon: Users, label: 'Contractor Mgmt', path: '/admin/team' },
  { icon: ClipboardList, label: 'Leads', path: '/admin/leads' },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  // Track login on mount — sessionStorage guard prevents duplicate counts on auth refresh
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const sessionKey = `login_counted_${user.id}_${today}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    void supabase.rpc('increment_login_count', { uid: user.id });
  }, [user?.id]);

  const { data: newApps = [] } = useQuery({
    queryKey: ['new-applicants-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_applications')
        .select('id, full_name, desired_position, dna_score')
        .eq('status', 'new')
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as any[];
    },
  });
  const newCount = newApps.length;

  const { data: newLeadsCount = 0 } = useQuery({
    queryKey: ['new-leads-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');
      if (error) throw error;
      return count || 0;
    },
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
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-heading text-foreground leading-tight">Admin Portal</h1>
            <span className="text-[10px] text-accent font-medium tracking-widest uppercase hidden sm:block">The 6 Figure System</span>
          </div>
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
          
          {/* Bell notification */}
          <DropdownMenu open={bellOpen} onOpenChange={setBellOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground relative">
                <Bell className="h-4 w-4" />
                {newCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                    {newCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {newApps.length === 0 ? (
                <DropdownMenuItem disabled>No new applications</DropdownMenuItem>
              ) : (
                <>
                  {newApps.map((a: any) => (
                    <DropdownMenuItem key={a.id} onClick={() => { setBellOpen(false); navigate(`/admin/applicants/${a.id}`); }}>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <p className="font-semibold text-sm">{a.full_name}</p>
                          <p className="text-xs text-muted-foreground">{a.desired_position}</p>
                        </div>
                        <span className={`text-sm font-heading ${getScoreColor(a.dna_score)}`}>{a.dna_score}/30</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => { setBellOpen(false); navigate('/admin/applicants'); }} className="text-accent justify-center text-sm">
                    View All Applications
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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

      <div className="flex flex-1">
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
            'bg-accent text-accent-foreground flex-col transition-all duration-300 hidden md:flex',
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
                  {!collapsed && (
                    <span className="flex-1 flex items-center justify-between">
                      {item.label}
                      {item.path === '/admin/applicants' && newCount > 0 && (
                        <span className="w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                          {newCount}
                        </span>
                      )}
                      {item.path === '/admin/leads' && newLeadsCount > 0 && (
                        <span className="w-5 h-5 bg-accent text-accent-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                          {newLeadsCount}
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Mobile slide-out sidebar */}
        <aside
          className={cn(
            'fixed top-0 left-0 h-full w-64 bg-accent text-accent-foreground flex flex-col z-50 md:hidden transition-transform duration-300 ease-out',
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
                  <span className="flex-1 flex items-center justify-between">
                    {item.label}
                    {item.path === '/admin/applicants' && newCount > 0 && (
                      <span className="w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                        {newCount}
                      </span>
                    )}
                    {item.path === '/admin/leads' && newLeadsCount > 0 && (
                      <span className="w-5 h-5 bg-accent text-accent-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                        {newLeadsCount}
                      </span>
                    )}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main content with watermark */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto relative">
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
          
          <div className="w-full max-w-7xl mx-auto relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
      <NewApplicantsModal />
    </div>
  );
}
