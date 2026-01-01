import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanvasserSidebar } from "@/components/canvasser/CanvasserSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export default function CanvasserLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <CanvasserSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground md:hidden">Canvasser Portal</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
