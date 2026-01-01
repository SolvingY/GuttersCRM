import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { GoalSettingModal } from '@/components/dashboard/GoalSettingModal';
import { VictoryNotification } from '@/components/dashboard/VictoryNotification';
import { WelcomeBackNotification } from '@/components/dashboard/WelcomeBackNotification';
import nextGenLogo from '@/assets/next-gen-logo.png';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <GoalSettingModal />
      <VictoryNotification />
      <WelcomeBackNotification />
    </div>
  );
}
