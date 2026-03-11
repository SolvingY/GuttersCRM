export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  tab: 'sales' | 'canvassers';
  defaultVisible: boolean;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // Sales tab
  { id: 'stale_contracts', label: 'Stale Contracts', description: 'Alert for contracts awaiting action', tab: 'sales', defaultVisible: true },
  { id: 'collections_pipeline', label: 'Collections Pipeline', description: 'Payment collection tracking', tab: 'sales', defaultVisible: true },
  { id: 'sales_details', label: 'Detailed Stats', description: 'Full sales rep metrics table', tab: 'sales', defaultVisible: true },
  { id: 'contract_sources', label: 'Contract Sources', description: 'Breakdown by lead source', tab: 'sales', defaultVisible: true },
  { id: 'sales_leaderboard', label: 'Sales Leaderboard', description: 'Sales rep rankings', tab: 'sales', defaultVisible: true },
  // Canvassers tab
  { id: 'canvasser_details', label: 'Canvasser Detailed Stats', description: 'Full canvasser metrics table', tab: 'canvassers', defaultVisible: true },
  { id: 'conversion_funnel', label: 'Team Conversion Funnel', description: 'Doors → Leads → Closed pipeline', tab: 'canvassers', defaultVisible: true },
  { id: 'canvasser_leaderboard', label: 'Canvasser Leaderboard', description: 'Canvasser rankings', tab: 'canvassers', defaultVisible: true },
];

export type WidgetConfig = Record<string, boolean>;

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = Object.fromEntries(
  WIDGET_REGISTRY.map((w) => [w.id, w.defaultVisible])
);
