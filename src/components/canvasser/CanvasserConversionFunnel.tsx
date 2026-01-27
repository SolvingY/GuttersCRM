import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface FunnelData {
  doorsKnocked: number;
  conversationsHad: number;
  leadsSet: number;
  leadsWithDamage: number;
  leadsWithoutDamage: number;
  leadsClosed: number;
}

interface CanvasserConversionFunnelProps {
  data: FunnelData;
  title?: string;
}

export function CanvasserConversionFunnel({ data, title = "Conversion Funnel" }: CanvasserConversionFunnelProps) {
  const maxValue = Math.max(
    data.doorsKnocked,
    data.conversationsHad,
    data.leadsSet,
    data.leadsWithDamage + data.leadsWithoutDamage,
    data.leadsClosed,
    1
  );

  const funnelStages = [
    { 
      name: 'Doors Knocked', 
      value: data.doorsKnocked, 
      color: 'hsl(var(--muted-foreground))',
      percent: 100 
    },
    { 
      name: 'Conversations', 
      value: data.conversationsHad, 
      color: 'hsl(215 20% 55%)',
      percent: data.doorsKnocked > 0 ? (data.conversationsHad / data.doorsKnocked) * 100 : 0 
    },
    { 
      name: 'Leads Set', 
      value: data.leadsSet, 
      color: 'hsl(var(--primary))',
      percent: data.doorsKnocked > 0 ? (data.leadsSet / data.doorsKnocked) * 100 : 0 
    },
    { 
      name: 'w/ Damage', 
      value: data.leadsWithDamage, 
      color: 'hsl(45 93% 47%)',
      percent: data.doorsKnocked > 0 ? (data.leadsWithDamage / data.doorsKnocked) * 100 : 0 
    },
    { 
      name: 'w/o Damage', 
      value: data.leadsWithoutDamage, 
      color: 'hsl(220 14% 45%)',
      percent: data.doorsKnocked > 0 ? (data.leadsWithoutDamage / data.doorsKnocked) * 100 : 0 
    },
    { 
      name: 'Closed', 
      value: data.leadsClosed, 
      color: 'hsl(142 71% 45%)',
      percent: data.doorsKnocked > 0 ? (data.leadsClosed / data.doorsKnocked) * 100 : 0 
    },
  ];

  // Calculate stage-to-stage conversion rates
  const getConversionRate = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current / previous) * 100).toFixed(1);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnelStages.map((stage, index) => {
            const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
            const prevStage = index > 0 ? funnelStages[index - 1] : null;
            const stageConversion = prevStage ? getConversionRate(stage.value, prevStage.value) : null;
            
            return (
              <div key={stage.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {stage.value.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      ({stage.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="h-6 bg-muted/30 rounded-md overflow-hidden relative">
                  <div 
                    className="h-full rounded-md transition-all duration-500"
                    style={{ 
                      width: `${Math.max(widthPercent, 2)}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </div>
                {stageConversion && Number(stageConversion) < 100 && (
                  <div className="text-xs text-muted-foreground pl-2">
                    ↳ {stageConversion}% conversion from {prevStage?.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {data.doorsKnocked > 0 
                ? ((data.conversationsHad / data.doorsKnocked) * 100).toFixed(1) 
                : '0.0'}%
            </p>
            <p className="text-xs text-muted-foreground">Door → Conversation</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {data.conversationsHad > 0 
                ? ((data.leadsSet / data.conversationsHad) * 100).toFixed(1) 
                : '0.0'}%
            </p>
            <p className="text-xs text-muted-foreground">Conversation → Lead</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">
              {data.leadsSet > 0 
                ? ((data.leadsClosed / data.leadsSet) * 100).toFixed(1) 
                : '0.0'}%
            </p>
            <p className="text-xs text-muted-foreground">Lead → Close</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
