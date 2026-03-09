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
  ChevronDown,
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
  ClipboardList,
  TrendingUp,
  Clock,
  LayoutDashboard,
  FileText,
  Settings,
  Activity,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NewApplicantsModal } from '@/components/admin/NewApplicantsModal';
import { getScoreColor } from '@/lib/dnaAssessment';
import nextGenLogo from '@/assets/next-gen-logo.png';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  groupId: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    label: 'Pipeline & Revenue',
    icon: ClipboardList,
    groupId: 'pipeline-revenue',
    items: [
      { icon: ClipboardList, label: 'Lead Management', path: '/admin/leads' },
      { icon: TrendingUp, label: 'Lead Analytics', path: '/admin/leadflow' },
    ],
  },
  {
    label: 'Performance & Culture',
    icon: Activity,
    groupId: 'performance-culture',
    items: [
      { icon: BarChart3, label: 'Sales Performance', path: '/admin/sales-performance' },
      { icon: BarChart3, label: 'Leaderboards', path: '/admin/leaderboards' },
      { icon: Trophy, label: 'Competitions', path: '/admin/contests' },
      { icon: Flame, label: 'Pit Management', path: '/admin/pit' },
      { icon: Target, label: 'Company Goals', path: '/admin/goals' },
      { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
    ],
  },
  {
    label: 'Team Operations',
    icon: Users,
    groupId: 'team-operations',
    items: [
      { icon: Users, label: 'Contractor MGMT', path: '/admin/team' },
      { icon: Clock, label: 'TimeClock', path: '/admin/timeclock' },
      { icon: Briefcase, label: 'Future Team Mates', path: '/admin/applicants' },
      { icon: UserPlus, label: 'Invite Users', path: '/admin/invites' },
      { icon: UserCog, label: 'User Roles', path: '/admin/users' },
      { icon: Calendar, label: 'Weekly Updates', path: '/admin/weekly' },
    ],
  },
  {
    label: 'System Settings',
    icon: Settings,
    groupId: 'system-settings',
    items: [
      { icon: BarChart3, label: 'Report Settings', path: '/admin/reports' },
      { icon: Calendar, label: 'Calendar Setup', path: '/admin/reports' },
      { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
      { icon: Settings, label: 'Admin Presets', path: '/admin/presets' },
    ],
  },
];

function getItemBadge(path: string, newCount: number, newLeadsCount: number) {
  if (path === '/admin/applicants' && newCount > 0) return newCount;
  if (path === '/admin/leads' && newLeadsCount > 0) return newLeadsCount;
  return 0;
}

function getGroupBadge(group: NavGroup, newCount: number, newLeadsCount: number) {
  let count = 0;
  for (const item of group.items) {
    count += getItemBadge(item.path, newCount, newLeadsCount);
  }
  return count;
}

function groupContainsPath(group: NavGroup, pathname: string, search?: string) {
  return group.items.some((item) => {
    const [itemPath, itemQuery] = item.path.split('?');
    if (itemQuery) return pathname === itemPath && search === `?${itemQuery}`;
    return pathname === itemPath;
  });
}

// -- Sidebar nav group (desktop expanded + mobile) --
function SidebarNavGroup({
  group,
  pathname,
  newCount,
  newLeadsCount,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  newCount: number;
  newLeadsCount: number;
  onNavigate?: () => void;
}) {
  const containsActive = groupContainsPath(group, pathname);
  const [open, setOpen] = useState(containsActive);
  const badge = getGroupBadge(group, newCount, newLeadsCount);

  // Auto-expand when active route changes into this group
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors',
            'text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground'
          )}
        >
          <group.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          {badge > 0 && (
            <span className="w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
              {badge}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 space-y-0.5 mt-0.5">
          {group.items.map((item) => {
            const isActive = pathname === item.path;
            const itemBadge = getItemBadge(item.path, newCount, newLeadsCount);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-background text-foreground'
                    : 'text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 flex items-center justify-between">
                  {item.label}
                  {itemBadge > 0 && (
                    <span className="w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                      {itemBadge}
                    </span>
                  )}
                </span>
              </NavLink>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  // Fetch user's admin preset
  const { data: userPreset } = useQuery({
    queryKey: ['admin-user-preset', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('admin_preset_id')
        .eq('id', user.id)
        .single();
      if (!profile?.admin_preset_id) return null;
      const { data: preset } = await supabase
        .from('admin_presets')
        .select('*')
        .eq('id', profile.admin_preset_id)
        .single();
      return preset ? {
        ...preset,
        visible_menu_items: Array.isArray(preset.visible_menu_items) ? preset.visible_menu_items as string[] : [],
      } : null;
    },
    enabled: !!user,
  });

  // Redirect to preset landing page if at /admin root
  useEffect(() => {
    if (userPreset?.default_landing_page && location.pathname === '/admin') {
      navigate(userPreset.default_landing_page, { replace: true });
    }
  }, [userPreset, location.pathname]);

  // Filter nav groups based on preset
  const filteredNavGroups = userPreset?.visible_menu_items?.length
    ? adminNavGroups.filter(g => (userPreset.visible_menu_items as string[]).includes(g.groupId))
    : adminNavGroups;

  // Track login on mount
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const sessionKey = `login_counted_${user.id}_${today}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    supabase.rpc('increment_login_count', { uid: user.id }).then(({ error }) => {
      if (error) console.error('[LoginTrack] RPC error:', error);
      else console.log('[LoginTrack] Login count incremented for', user.id);
    });
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
      toast({ title: 'Error signing out', description: error.message, variant: 'destructive' });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden text-foreground" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-heading text-foreground leading-tight">Admin Portal</h1>
            <span className="text-[10px] text-accent font-medium tracking-widest uppercase hidden sm:block">The 6 Figure System</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/stats')} className="text-xs sm:text-sm">
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
                <DropdownMenuItem className="text-muted-foreground">{user.email}</DropdownMenuItem>
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
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Desktop sidebar */}
        <aside className={cn('bg-accent text-accent-foreground flex-col transition-all duration-300 hidden md:flex', collapsed ? 'w-14' : 'w-56')}>
          <div className="flex items-center justify-between p-3 border-b border-accent-foreground/10">
            {!collapsed && <span className="text-sm font-heading uppercase tracking-wide">Admin Menu</span>}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-accent-foreground/70 hover:text-accent-foreground hover:bg-accent-foreground/10"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {collapsed ? (
              <>
                {/* Scoreboard icon */}
                <button
                  title="Scoreboard"
                  onClick={() => navigate('/admin/overview')}
                  className={cn(
                    'flex items-center justify-center w-full h-10 rounded-md transition-colors relative',
                    location.pathname === '/admin/overview'
                      ? 'bg-background text-foreground'
                      : 'text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                </button>
                <div className="border-b border-accent-foreground/10 my-1" />
                {filteredNavGroups.map((group) => {
                  const badge = getGroupBadge(group, newCount, newLeadsCount);
                  return (
                    <button
                      key={group.label}
                      title={group.label}
                      onClick={() => navigate(group.items[0].path)}
                      className={cn(
                        'flex items-center justify-center w-full h-10 rounded-md transition-colors relative',
                        groupContainsPath(group, location.pathname, location.search)
                          ? 'bg-background text-foreground'
                          : 'text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                      )}
                    >
                      <group.icon className="h-4 w-4" />
                      {badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {/* Scoreboard direct link */}
                <NavLink
                  to="/admin/overview"
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors',
                    location.pathname === '/admin/overview'
                      ? 'bg-background text-foreground'
                      : 'text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                  )}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>Scoreboard</span>
                </NavLink>
                <div className="border-b border-accent-foreground/10 my-1" />
                {filteredNavGroups.map((group) => (
                  <SidebarNavGroup
                    key={group.label}
                    group={group}
                    pathname={location.pathname}
                    newCount={newCount}
                    newLeadsCount={newLeadsCount}
                  />
                ))}
              </>
            )}
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
            {/* Scoreboard direct link */}
            <NavLink
              to="/admin/overview"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors',
                location.pathname === '/admin/overview'
                  ? 'bg-background text-foreground'
                  : 'text-accent-foreground/80 hover:bg-accent-foreground/10 hover:text-accent-foreground'
              )}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Scoreboard</span>
            </NavLink>
            <div className="border-b border-accent-foreground/10 my-1" />
            {filteredNavGroups.map((group) => (
              <SidebarNavGroup
                key={group.label}
                group={group}
                pathname={location.pathname}
                newCount={newCount}
                newLeadsCount={newLeadsCount}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            ))}
          </nav>
        </aside>

        {/* Main content with watermark */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto relative">
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 0 }}>
            <img src={nextGenLogo} alt="" className="w-64 h-64 md:w-96 md:h-96 object-contain opacity-[0.04]" />
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
