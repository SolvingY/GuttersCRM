import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronRight } from 'lucide-react';

export interface AttributionItem {
  userId: string;
  displayName: string;
  tab: 'canvasser' | 'sales';
  weeklyLeadsSet?: number;
  weeklyLeadsClosed?: number;
  weeklyCanvassLeads?: number;
  weeklyCanvassDealsClose?: number;
}

export interface AttributionRow {
  entry_type: 'canvasser_lead_set' | 'canvasser_lead_closed' | 'rep_canvass_lead' | 'rep_canvass_contract';
  canvasser_id: string;
  sales_rep_id: string;
  quantity: number;
}

interface PersonOption {
  id: string;
  full_name: string;
}

interface AttributionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (rows: AttributionRow[]) => void;
  onSkipAll: () => void;
  items: AttributionItem[];
  salesRepOptions: PersonOption[];
  canvasserOptions: PersonOption[];
  weekStart: string;
  weekEnd: string;
}

interface SectionState {
  selections: (string | null)[];
  sameForAll: boolean;
}

export function AttributionModal({
  open, onClose, onConfirm, onSkipAll, items, salesRepOptions, canvasserOptions, weekStart, weekEnd,
}: AttributionModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allAttributions, setAllAttributions] = useState<AttributionRow[]>([]);
  
  // Per-item section states
  const [sections, setSections] = useState<Record<string, SectionState>>({});

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setAllAttributions([]);
      setSections({});
    }
  }, [open]);

  if (items.length === 0) return null;
  const item = items[currentIndex];
  if (!item) return null;

  const isCanvasserTab = item.tab === 'canvasser';
  const dropdownOptions = isCanvasserTab ? salesRepOptions : canvasserOptions;
  const dropdownLabel = isCanvasserTab ? 'Sales Rep' : 'Canvasser';

  // Build metric sections for current item
  type MetricSection = { label: string; count: number; entryType: AttributionRow['entry_type']; key: string };
  const metricSections: MetricSection[] = [];
  if (isCanvasserTab) {
    if (item.weeklyLeadsSet && item.weeklyLeadsSet > 0) metricSections.push({ label: 'Leads Set', count: item.weeklyLeadsSet, entryType: 'canvasser_lead_set', key: `${item.userId}-leads-set` });
    if (item.weeklyLeadsClosed && item.weeklyLeadsClosed > 0) metricSections.push({ label: 'Leads Closed', count: item.weeklyLeadsClosed, entryType: 'canvasser_lead_closed', key: `${item.userId}-leads-closed` });
  } else {
    if (item.weeklyCanvassLeads && item.weeklyCanvassLeads > 0) metricSections.push({ label: 'Canvass Leads', count: item.weeklyCanvassLeads, entryType: 'rep_canvass_lead', key: `${item.userId}-canvass-leads` });
    if (item.weeklyCanvassDealsClose && item.weeklyCanvassDealsClose > 0) metricSections.push({ label: 'Canvass Contracts', count: item.weeklyCanvassDealsClose, entryType: 'rep_canvass_contract', key: `${item.userId}-canvass-contracts` });
  }

  const getSectionState = (key: string, count: number): SectionState => {
    return sections[key] || { selections: Array(count).fill(null), sameForAll: false };
  };

  const updateSectionSelection = (key: string, index: number, value: string, count: number) => {
    const current = getSectionState(key, count);
    const newSelections = [...current.selections];
    if (current.sameForAll) {
      newSelections.fill(value);
    } else {
      newSelections[index] = value;
    }
    setSections(prev => ({ ...prev, [key]: { ...current, selections: newSelections } }));
  };

  const toggleSameForAll = (key: string, count: number) => {
    const current = getSectionState(key, count);
    const newSameForAll = !current.sameForAll;
    let newSelections = [...current.selections];
    if (newSameForAll && newSelections[0]) {
      newSelections = newSelections.map(() => newSelections[0]);
    }
    setSections(prev => ({ ...prev, [key]: { sameForAll: newSameForAll, selections: newSelections } }));
  };

  const collectCurrentAttributions = (): AttributionRow[] => {
    const rows: AttributionRow[] = [];
    for (const section of metricSections) {
      const state = getSectionState(section.key, section.count);
      for (const sel of state.selections) {
        if (sel) {
          rows.push({
            entry_type: section.entryType,
            canvasser_id: isCanvasserTab ? item.userId : sel,
            sales_rep_id: isCanvasserTab ? sel : item.userId,
            quantity: 1,
          });
        }
      }
    }
    return rows;
  };

  const handleNext = () => {
    const currentRows = collectCurrentAttributions();
    const updated = [...allAttributions, ...currentRows];
    if (currentIndex < items.length - 1) {
      setAllAttributions(updated);
      setCurrentIndex(currentIndex + 1);
    } else {
      onConfirm(updated);
    }
  };

  const handleSkip = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (allAttributions.length > 0) {
        onConfirm(allAttributions);
      } else {
        onSkipAll();
      }
    }
  };

  const isLast = currentIndex === items.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attribution — {item.displayName}</DialogTitle>
          <DialogDescription>
            Week: {weekStart} – {weekEnd} &nbsp;·&nbsp; {currentIndex + 1} of {items.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {metricSections.map((section) => {
            const state = getSectionState(section.key, section.count);
            return (
              <div key={section.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">
                    {section.label} ({section.count})
                  </h4>
                  {section.count > 1 && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={state.sameForAll}
                        onCheckedChange={() => toggleSameForAll(section.key, section.count)}
                        id={`same-${section.key}`}
                      />
                      <Label htmlFor={`same-${section.key}`} className="text-xs text-muted-foreground cursor-pointer">
                        Same {dropdownLabel.toLowerCase()} for all
                      </Label>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {Array.from({ length: section.count }, (_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">
                        {section.label.includes('Lead') ? 'Lead' : 'Contract'} {i + 1}
                      </span>
                      <Select
                        value={state.selections[i] || ''}
                        onValueChange={(val) => updateSectionSelection(section.key, i, val, section.count)}
                        disabled={state.sameForAll && i > 0}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={`Select ${dropdownLabel}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {dropdownOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
            Skip
          </Button>
          <Button onClick={handleNext}>
            {isLast ? 'Save' : (
              <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
