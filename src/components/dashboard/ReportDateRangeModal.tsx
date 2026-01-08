import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, subWeeks, subMonths, subQuarters } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, FileSpreadsheet, FileText } from 'lucide-react';

interface ReportDateRangeModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (startDate: Date, endDate: Date, format: 'excel' | 'pdf') => void;
}

type PresetOption = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-quarter' | 'last-quarter' | 'ytd' | 'custom';

const presets: { value: PresetOption; label: string }[] = [
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'last-quarter', label: 'Last Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

export function ReportDateRangeModal({ open, onClose, onExport }: ReportDateRangeModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>('this-month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    
    switch (selectedPreset) {
      case 'this-week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'last-week':
        const lastWeek = subWeeks(now, 1);
        return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'this-quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'last-quarter':
        const lastQuarter = subQuarters(now, 1);
        return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
      case 'ytd':
        return { start: startOfYear(now), end: now };
      case 'custom':
        return { 
          start: customStartDate || startOfMonth(now), 
          end: customEndDate || now 
        };
      default:
        return { start: startOfMonth(now), end: now };
    }
  };

  const handleExport = (exportFormat: 'excel' | 'pdf') => {
    const { start, end } = getDateRange();
    onExport(start, end, exportFormat);
    onClose();
  };

  const { start, end } = getDateRange();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Report</DialogTitle>
          <DialogDescription>
            Select a date range and export format for your report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset Selection */}
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={selectedPreset === preset.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPreset(preset.value)}
                className="justify-start"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {selectedPreset === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !customStartDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'MMM d, yyyy') : 'Pick start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !customEndDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'MMM d, yyyy') : 'Pick end'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Selected Range Preview */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Selected Range:</p>
            <p className="font-medium text-foreground">
              {format(start, 'MMM d, yyyy')} - {format(end, 'MMM d, yyyy')}
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => handleExport('excel')}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => handleExport('pdf')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
