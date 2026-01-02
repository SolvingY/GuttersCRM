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

  // DEV-only: Overflow finder to identify elements causing horizontal scroll
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const findOverflowingElements = () => {
      const viewportWidth = window.innerWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const overflowers: { el: Element; right: number; width: number; className: string; styles: Record<string, string> }[] = [];
      
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > viewportWidth + 1 && rect.width > 0) {
          const computed = window.getComputedStyle(el);
          overflowers.push({
            el,
            right: rect.right,
            width: rect.width,
            className: el.className?.toString?.() || '',
            styles: {
              position: computed.position,
              minWidth: computed.minWidth,
              whiteSpace: computed.whiteSpace,
              transform: computed.transform,
            },
          });
        }
      });
      
      console.log(`[Overflow Finder] viewport=${viewportWidth}, scrollWidth=${scrollWidth}`);
      if (overflowers.length > 0) {
        console.warn('[Overflow Finder] Elements exceeding viewport:');
        overflowers
          .sort((a, b) => b.right - a.right)
          .slice(0, 5)
          .forEach((item, i) => {
            console.warn(`  #${i + 1}: <${item.el.tagName.toLowerCase()}> class="${item.className.slice(0, 80)}" right=${item.right.toFixed(0)} width=${item.width.toFixed(0)}`, item.styles);
            // Highlight top offender with red outline
            if (i === 0) {
              (item.el as HTMLElement).style.outline = '2px solid red';
            }
          });
      } else {
        console.log('[Overflow Finder] No overflowing elements found.');
      }
    };
    
    // Run after render
    const timer = setTimeout(() => {
      requestAnimationFrame(findOverflowingElements);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Reset scroll position on route change (both vertical and horizontal)
  useEffect(() => {
    const resetAllScroll = () => {
      // Reset window scroll
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
      
      // Reset main container
      if (mainRef.current) {
        mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        // Reset any nested horizontal scrollers
        const scrollers = mainRef.current.querySelectorAll('.overflow-x-auto, .overflow-x-scroll, [style*="overflow-x"], [data-radix-scroll-area-viewport]');
        scrollers.forEach((el) => {
          (el as HTMLElement).scrollLeft = 0;
        });
      }
    };
    
    // Reset immediately
    resetAllScroll();
    // Reset after frame paint
    requestAnimationFrame(resetAllScroll);
    // Fallback for late-mounting content (like charts)
    const timer = setTimeout(resetAllScroll, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleMobileClose = () => {
    setMobileMenuOpen(false);
    // Also reset scroll when closing mobile menu
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      const scrollers = mainRef.current.querySelectorAll('.overflow-x-auto, .overflow-x-scroll, [style*="overflow-x"], [data-radix-scroll-area-viewport]');
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
