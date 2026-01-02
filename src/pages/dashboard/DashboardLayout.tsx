import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { GoalSettingModal } from '@/components/dashboard/GoalSettingModal';
import { VictoryNotification } from '@/components/dashboard/VictoryNotification';
import { WelcomeBackNotification } from '@/components/dashboard/WelcomeBackNotification';
import { AnnouncementsNotification } from '@/components/dashboard/AnnouncementsNotification';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import nextGenLogo from '@/assets/next-gen-logo.png';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // Reset horizontal scroll position on route change to prevent "stuck right" issue
  useEffect(() => {
    const resetAllScrollLeft = () => {
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
      if (mainRef.current) {
        mainRef.current.scrollLeft = 0;
        // Also reset any nested horizontal scrollers
        const scrollers = mainRef.current.querySelectorAll('.overflow-x-auto, .overflow-x-scroll, [style*="overflow-x"]');
        scrollers.forEach((el) => {
          (el as HTMLElement).scrollLeft = 0;
        });
      }
    };
    
    // Reset immediately
    resetAllScrollLeft();
    // Reset again after a tick (for dynamically rendered content)
    requestAnimationFrame(resetAllScrollLeft);
  }, [location.pathname]);

  const handleMobileClose = () => {
    setMobileMenuOpen(false);
    // Also reset scroll when closing mobile menu
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    if (mainRef.current) {
      mainRef.current.scrollLeft = 0;
      // Also reset any nested horizontal scrollers
      const scrollers = mainRef.current.querySelectorAll('.overflow-x-auto, .overflow-x-scroll, [style*="overflow-x"]');
      scrollers.forEach((el) => {
        (el as HTMLElement).scrollLeft = 0;
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <DashboardHeader onMenuClick={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1 min-w-0">
        <DashboardSidebar 
          mobileOpen={mobileMenuOpen} 
          onMobileClose={handleMobileClose} 
        />
        <main ref={mainRef} className="flex-1 w-full p-3 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto relative min-w-0">
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
      <GoalSettingModal />
      <VictoryNotification />
      <WelcomeBackNotification />
      <AnnouncementsNotification />
      <DashboardTour variant="sales" />
    </div>
  );
}
