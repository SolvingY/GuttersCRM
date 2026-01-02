import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { GoalSettingModal } from '@/components/dashboard/GoalSettingModal';
import { VictoryNotification } from '@/components/dashboard/VictoryNotification';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import { GuidedTour } from '@/components/dashboard/GuidedTour';
import { useAuth } from '@/hooks/useAuth';
import nextGenLogo from '@/assets/next-gen-logo.png';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Check if user has completed tour
  const handleGoalSet = () => {
    if (user && !localStorage.getItem(`tour_completed_${user.id}`)) {
      // Small delay to let the goal modal close
      setTimeout(() => setShowTour(true), 300);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader onMenuClick={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1">
        <DashboardSidebar 
          mobileOpen={mobileMenuOpen} 
          onMobileClose={() => setMobileMenuOpen(false)} 
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
      <GoalSettingModal onGoalSet={handleGoalSet} />
      <WelcomeModal />
      <GuidedTour isOpen={showTour} onClose={() => setShowTour(false)} />
      <VictoryNotification />
    </div>
  );
}
