import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, TrendingUp, Clock } from 'lucide-react';
import { PipelineFunnelWidget } from '@/components/dashboard/PipelineFunnelWidget';
import { TimeToCloseWidget } from '@/components/dashboard/TimeToCloseWidget';

export default function LeadflowStatistics() {
  const [pipelineFunnelOpen, setPipelineFunnelOpen] = useState(true);
  const [timeToCloseOpen, setTimeToCloseOpen] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl uppercase">Leadflow Statistics</h1>
        <p className="text-sm text-muted-foreground">Pipeline conversion and time-to-close analytics</p>
      </div>

      {/* Pipeline Funnel */}
      <Collapsible open={pipelineFunnelOpen} onOpenChange={setPipelineFunnelOpen}>
        <div className="bg-card border border-border rounded-lg p-4">
          <CollapsibleTrigger className="flex items-center gap-2 w-full cursor-pointer">
            {pipelineFunnelOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <TrendingUp className="h-5 w-5 text-accent" />
            <h3 className="font-heading font-semibold text-foreground">Pipeline Funnel</h3>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3">
              <PipelineFunnelWidget />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Time-to-Close Analytics */}
      <Collapsible open={timeToCloseOpen} onOpenChange={setTimeToCloseOpen}>
        <div className="bg-card border border-border rounded-lg p-4">
          <CollapsibleTrigger className="flex items-center gap-2 w-full cursor-pointer">
            {timeToCloseOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Clock className="h-5 w-5 text-accent" />
            <h3 className="font-heading font-semibold text-foreground">Average Time to Close</h3>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3">
              <TimeToCloseWidget />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
