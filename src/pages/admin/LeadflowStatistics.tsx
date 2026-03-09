import { useState } from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import { PipelineFunnelWidget } from '@/components/dashboard/PipelineFunnelWidget';
import { TimeToCloseWidget } from '@/components/dashboard/TimeToCloseWidget';
import { SectionCarousel } from '@/components/dashboard/SectionCarousel';

export default function LeadflowStatistics() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => setOpenSection(prev => prev === id ? null : id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl uppercase">Leadflow Statistics</h1>
        <p className="text-sm text-muted-foreground">Pipeline conversion and time-to-close analytics</p>
      </div>

      <SectionCarousel activeSection={openSection} onToggle={toggle}>
        <SectionCarousel.Item id="pipeline" title="Pipeline Funnel" icon={TrendingUp}>
          <PipelineFunnelWidget />
        </SectionCarousel.Item>
        <SectionCarousel.Item id="time-to-close" title="Average Time to Close" icon={Clock}>
          <TimeToCloseWidget />
        </SectionCarousel.Item>
      </SectionCarousel>
    </div>
  );
}
