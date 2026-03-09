import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Outlet } from "react-router-dom";
import { CanvasserSidebar } from "@/components/canvasser/CanvasserSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import nextGenLogo from "@/assets/ngr-logo.png";
import { VictoryNotification } from "@/components/dashboard/VictoryNotification";
import { CanvasserGoalModal } from "@/components/canvasser/CanvasserGoalModal";
import { CanvasserWelcomeModal } from "@/components/canvasser/CanvasserWelcomeModal";
import { GuidedTour } from "@/components/dashboard/GuidedTour";
import { DNAAssessmentPromptModal } from "@/components/dashboard/DNAAssessmentPromptModal";
import { useAuth } from "@/hooks/useAuth";

export default function CanvasserLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Track login on mount — sessionStorage guard prevents duplicate counts on auth refresh
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
    supabase.from('login_history').insert({
      user_id: user.id,
      user_agent: navigator.userAgent,
    } as any).then(({ error }) => {
      if (error) console.error('[LoginHistory] Insert error:', error);
    });
  }, [user?.id]);

  // Check if user has completed tour
  const handleGoalSet = () => {
    if (user && !localStorage.getItem(`tour_completed_${user.id}`)) {
      setTimeout(() => setShowTour(true), 300);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1">
        <CanvasserSidebar 
          mobileOpen={mobileOpen} 
          onMobileClose={() => setMobileOpen(false)} 
        />
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
      <VictoryNotification />
      <CanvasserGoalModal onGoalSet={handleGoalSet} />
      <CanvasserWelcomeModal />
      <GuidedTour isOpen={showTour} onClose={() => setShowTour(false)} />
      <DNAAssessmentPromptModal assessmentRoute="/canvasser/assessment" />
    </div>
  );
}
