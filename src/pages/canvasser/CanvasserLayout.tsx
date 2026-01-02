import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CanvasserSidebar } from "@/components/canvasser/CanvasserSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import nextGenLogo from "@/assets/next-gen-logo.png";
import { VictoryNotification } from "@/components/dashboard/VictoryNotification";
import { CanvasserGoalModal } from "@/components/canvasser/CanvasserGoalModal";
import { WelcomeBackNotification } from "@/components/dashboard/WelcomeBackNotification";
import { AnnouncementsNotification } from "@/components/dashboard/AnnouncementsNotification";
import { DashboardTour } from "@/components/dashboard/DashboardTour";

export default function CanvasserLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // DEV-only: Enhanced Overflow/Shift Finder
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const runDiagnostics = (label: string) => {
      const vw = window.innerWidth;
      const sw = document.documentElement.scrollWidth;
      const scrollStates = {
        windowScrollX: window.scrollX,
        docScrollLeft: document.documentElement.scrollLeft,
        bodyScrollLeft: document.body.scrollLeft,
        mainScrollLeft: mainRef.current?.scrollLeft ?? 0,
      };
      
      // Find nested scrollers with scrollLeft > 0
      const nestedScrollers: { el: Element; scrollLeft: number; className: string }[] = [];
      if (mainRef.current) {
        mainRef.current.querySelectorAll('*').forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.scrollLeft > 0) {
            nestedScrollers.push({
              el,
              scrollLeft: htmlEl.scrollLeft,
              className: el.className?.toString?.().slice(0, 60) || '',
            });
          }
        });
      }
      
      // Find right overflow & left offset elements
      const rightOverflow: { el: Element; rect: DOMRect; className: string; styles: Record<string, string> }[] = [];
      const leftOffset: { el: Element; rect: DOMRect; className: string; styles: Record<string, string> }[] = [];
      
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return;
        const computed = window.getComputedStyle(el);
        const styles = {
          position: computed.position,
          overflowX: computed.overflowX,
          whiteSpace: computed.whiteSpace,
          minWidth: computed.minWidth,
          transform: computed.transform,
        };
        
        if (rect.right > vw + 1) {
          rightOverflow.push({ el, rect, className: el.className?.toString?.().slice(0, 60) || '', styles });
        }
        if (rect.left < -1) {
          leftOffset.push({ el, rect, className: el.className?.toString?.().slice(0, 60) || '', styles });
        }
      });
      
      console.log(`[Overflow Finder ${label}] viewport=${vw}, scrollWidth=${sw}`);
      console.log(`[Overflow Finder ${label}] scrollStates:`, scrollStates);
      
      if (nestedScrollers.length > 0) {
        console.warn(`[Overflow Finder ${label}] Nested scrollers with scrollLeft>0:`, nestedScrollers.slice(0, 3));
      }
      
      if (rightOverflow.length > 0) {
        console.warn(`[Overflow Finder ${label}] Right overflow elements:`);
        rightOverflow.sort((a, b) => b.rect.right - a.rect.right).slice(0, 3).forEach((item, i) => {
          console.warn(`  #${i + 1}: <${item.el.tagName.toLowerCase()}> class="${item.className}" right=${item.rect.right.toFixed(0)} width=${item.rect.width.toFixed(0)}`, item.styles);
          if (i === 0) (item.el as HTMLElement).style.outline = '3px solid red';
        });
      }
      
      if (leftOffset.length > 0) {
        console.warn(`[Overflow Finder ${label}] Left offset elements:`);
        leftOffset.sort((a, b) => a.rect.left - b.rect.left).slice(0, 3).forEach((item, i) => {
          console.warn(`  #${i + 1}: <${item.el.tagName.toLowerCase()}> class="${item.className}" left=${item.rect.left.toFixed(0)}`, item.styles);
          if (i === 0) (item.el as HTMLElement).style.outline = '3px solid orange';
        });
      }
      
      if (rightOverflow.length === 0 && leftOffset.length === 0 && nestedScrollers.length === 0 && 
          scrollStates.windowScrollX === 0 && scrollStates.docScrollLeft === 0 && scrollStates.mainScrollLeft === 0) {
        console.log(`[Overflow Finder ${label}] ✓ No issues detected.`);
      }
    };
    
    // Run at multiple intervals to catch late-mounting elements
    runDiagnostics('t=0');
    requestAnimationFrame(() => runDiagnostics('rAF'));
    const t1 = setTimeout(() => runDiagnostics('t=250ms'), 250);
    const t2 = setTimeout(() => runDiagnostics('t=1000ms'), 1000);
    
    const handleResize = () => runDiagnostics('resize');
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
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
    // Fallback for late-mounting content
    const timer = setTimeout(resetAllScroll, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleMobileClose = () => {
    setMobileOpen(false);
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
      <DashboardHeader onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1 min-w-0">
        <CanvasserSidebar 
          mobileOpen={mobileOpen} 
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
      <VictoryNotification />
      <CanvasserGoalModal />
      <WelcomeBackNotification />
      <AnnouncementsNotification />
      <DashboardTour variant="canvasser" />
    </div>
  );
}
