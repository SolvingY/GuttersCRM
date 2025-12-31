import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, Trophy, Settings, Users, ChevronLeft, ChevronRight, UserPlus, Gift, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: BarChart3, label: 'My Stats', path: '/dashboard/stats' },
  { icon: Trophy, label: 'Leaderboard', path: '/dashboard/leaderboard' },
  { icon: Gift, label: 'Contests', path: '/dashboard/contests' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

const adminItems = [
  { icon: Users, label: 'Master Overview', path: '/dashboard/admin' },
  { icon: UserPlus, label: 'Invite Users', path: '/dashboard/invites' },
];

interface DashboardSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function DashboardSidebar({ mobileOpen = false, onMobileClose }: DashboardSidebarProps) {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  // Close mobile menu when route changes
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname]);

  // Handle clicking a nav item on mobile
  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'bg-primary text-primary-foreground flex-col transition-all duration-300 hidden md:flex',
          collapsed ? 'w-14' : 'w-56'
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-primary-foreground/10">
          {!collapsed && (
            <span className="text-sm font-heading uppercase tracking-wide">Menu</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {allItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Mobile slide-out sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-primary text-primary-foreground flex flex-col z-50 md:hidden transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-primary-foreground/10">
          <span className="text-sm font-heading uppercase tracking-wide">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onMobileClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {allItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
