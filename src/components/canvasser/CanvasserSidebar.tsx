import { useState, useEffect } from "react";
import { BarChart3, Trophy, Award, Settings, X, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import nextGenLogo from '@/assets/next-gen-logo.png';

const navItems = [
  { icon: BarChart3, label: "My Stats", path: "/canvasser/stats" },
  { icon: Trophy, label: "Leaderboard", path: "/canvasser/leaderboard" },
  { icon: Award, label: "Contests", path: "/canvasser/contests" },
  { icon: Settings, label: "Settings", path: "/canvasser/settings" },
];

interface CanvasserSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function CanvasserSidebar({ mobileOpen = false, onMobileClose }: CanvasserSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname]);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-primary text-primary-foreground h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-300 relative overflow-hidden",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className={cn("flex items-center justify-between p-3 border-b border-primary-foreground/10", collapsed && "justify-center")}>
          {!collapsed && (
            <h2 className="font-bold text-lg text-primary-foreground">Canvasser Portal</h2>
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

        {/* Watermark */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <img 
            src={nextGenLogo} 
            alt="" 
            className="w-24 h-24 object-contain opacity-[0.08]"
          />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-primary text-primary-foreground transform transition-transform duration-300 ease-in-out md:hidden relative overflow-hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-primary-foreground/10">
          <h2 className="font-bold text-lg text-primary-foreground">Canvasser Portal</h2>
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

        {/* Watermark */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <img 
            src={nextGenLogo} 
            alt="" 
            className="w-28 h-28 object-contain opacity-[0.08]"
          />
        </div>
      </aside>
    </>
  );
}
