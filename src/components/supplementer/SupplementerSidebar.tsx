import { useState, useEffect } from "react";
import { BarChart3, Trophy, Briefcase, Settings, X, ChevronLeft, ChevronRight, Flame, Award, Wrench } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: BarChart3, label: "My Stats", path: "/supplementer/stats" },
  { icon: Trophy, label: "Leaderboard", path: "/supplementer/leaderboard" },
  { icon: Briefcase, label: "Jobs", path: "/supplementer/jobs" },
  { icon: Wrench, label: "Tools", path: "/dashboard/tools" },
  { icon: Flame, label: "The Pit", path: "/supplementer/pit" },
  { icon: Award, label: "Points History", path: "/supplementer/points-history" },
  { icon: Settings, label: "Settings", path: "/supplementer/settings" },
];

interface SupplementerSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function SupplementerSidebar({ mobileOpen = false, onMobileClose }: SupplementerSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-primary text-primary-foreground h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-300",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-primary-foreground/10">
          {!collapsed && (
            <span className="text-sm font-heading uppercase tracking-wide">Supplementer</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-primary text-primary-foreground transform transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-primary-foreground/10">
          <h2 className="font-bold text-lg text-primary-foreground">Supplementer</h2>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-primary-foreground/10 text-primary-foreground/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
