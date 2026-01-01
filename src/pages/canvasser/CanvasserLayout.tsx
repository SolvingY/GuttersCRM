import { useState } from "react";
import { Outlet } from "react-router-dom";
import { CanvasserSidebar } from "@/components/canvasser/CanvasserSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import ngrWatermark from "@/assets/ngr-watermark.png";
import { VictoryNotification } from "@/components/dashboard/VictoryNotification";
import { CanvasserGoalModal } from "@/components/canvasser/CanvasserGoalModal";

export default function CanvasserLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
              src={ngrWatermark} 
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
      <CanvasserGoalModal />
    </div>
  );
}
