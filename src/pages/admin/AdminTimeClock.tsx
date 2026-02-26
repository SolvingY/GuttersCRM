import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, ChevronRight, Plus, MapPin, Clock, AlertTriangle, ShieldCheck, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { updateCanvasserHours } from '@/lib/updateCanvasserHours';
import { cn } from '@/lib/utils';

interface CanvasserInfo {
  userId: string;
  name: string;
}

export default function AdminTimeClock() {
  const [loading, setLoading] = useState(true);
  const [canvassers, setCanvassers] = useState<CanvasserInfo[]>([]);
  
  // Hours Tracker state
  const [selectedHoursWeek, setSelectedHoursWeek] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - ((day + 3) % 7);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  });
  const [canvasserHoursData, setCanvasserHoursData] = useState<any[]>([]);
  const [editingHoursCell, setEditingHoursCell] = useState<string | null>(null);
  const [hoursTrackerOpen, setHoursTrackerOpen] = useState(true);

  // Shift Management state
  const [shiftMgmtOpen, setShiftMgmtOpen] = useState(true);
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [flaggedShifts, setFlaggedShifts] = useState<any[]>([]);
  const [editShiftModalOpen, setEditShiftModalOpen] = useState(false);
  const [addShiftModalOpen, setAddShiftModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [shiftClockIn, setShiftClockIn] = useState('');
  const [shiftClockOut, setShiftClockOut] = useState('');
  const [shiftDoors, setShiftDoors] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftCanvasserId, setShiftCanvasserId] = useState('');
  const [savingShift, setSavingShift] = useState(false);

  // Shift History state
  const [historyOpen, setHistoryOpen] = useState(true);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyDays, setHistoryDays] = useState(7);

  // Work Zones state
  const [workZonesOpen, setWorkZonesOpen] = useState(false);
  const [workZones, setWorkZones] = useState<any[]>([]);
  const [addZoneModalOpen, setAddZoneModalOpen] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneLat, setZoneLat] = useState('');
  const [zoneLng, setZoneLng] = useState('');
  const [zoneRadius, setZoneRadius] = useState('500');
  const [savingZone, setSavingZone] = useState(false);

  const getWeekStartForDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - ((day + 3) % 7);
    const thursday = new Date(d.getFullYear(), d.getMonth(), diff);
    return format(thursday, 'yyyy-MM-dd');
  };

  const getWeekEndForDate = (weekStartStr: string): string => {
    const d = new Date(weekStartStr + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return format(d, 'yyyy-MM-dd');
  };

  const fetchCanvassers = useCallback(async () => {
    const { data: metrics } = await supabase
      .from('canvasser_metrics')
      .select('user_id, display_name');

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, is_archived')
      .eq('is_archived', false);

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'canvasser');

    const roleSet = new Set(roles?.map(r => r.user_id) || []);
    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
    const activeSet = new Set(profiles?.map(p => p.id) || []);

    const seen = new Set<string>();
    const result: CanvasserInfo[] = [];
    metrics?.forEach(m => {
      if (m.user_id && !seen.has(m.user_id) && activeSet.has(m.user_id) && roleSet.has(m.user_id)) {
        seen.add(m.user_id);
        result.push({
          userId: m.user_id,
          name: m.display_name || profileMap.get(m.user_id) || 'Unknown',
        });
      }
    });
    result.sort((a, b) => a.name.localeCompare(b.name));
    setCanvassers(result);
    return result;
  }, []);

  const fetchShifts = useCallback(async () => {
    const { data: active } = await supabase
      .from('canvasser_shifts')
      .select('*')
      .in('status', ['active', 'flagged'])
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: true });
    setActiveShifts(active || []);

    const { data: flagged } = await supabase
      .from('canvasser_shifts')
      .select('*')
      .eq('status', 'flagged')
      .order('clock_in_at', { ascending: true });
    setFlaggedShifts(flagged || []);
  }, []);

  const fetchShiftHistory = useCallback(async () => {
    const since = subDays(new Date(), historyDays).toISOString();
    let query = supabase
      .from('canvasser_shifts')
      .select('*')
      .gte('clock_in_at', since)
      .order('clock_in_at', { ascending: false })
      .limit(200);

    if (historyFilter !== 'all') {
      query = query.eq('canvasser_id', historyFilter);
    }

    const { data } = await query;
    setShiftHistory(data || []);
  }, [historyFilter, historyDays]);

  const fetchWorkZones = useCallback(async () => {
    const { data } = await supabase
      .from('geofence_work_zones')
      .select('*')
      .order('created_at', { ascending: false });
    setWorkZones(data || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchCanvassers();
      await fetchShifts();
      await fetchWorkZones();
      setLoading(false);
    };
    init();
  }, [fetchCanvassers, fetchShifts, fetchWorkZones]);

  useEffect(() => {
    fetchShiftHistory();
  }, [fetchShiftHistory]);

  // Fetch hours for selected week
  useEffect(() => {
    const fetchHours = async () => {
      const weekStart = selectedHoursWeek;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const { data } = await supabase
        .from('daily_canvasser_metric_entries')
        .select('user_id, entry_date, hours_worked_delta')
        .gte('entry_date', weekStart.toISOString().split('T')[0])
        .lte('entry_date', weekEnd.toISOString().split('T')[0]);
      setCanvasserHoursData(data || []);
    };
    fetchHours();
  }, [selectedHoursWeek]);

  const handleSaveHoursCell = async (userId: string, date: string, hours: number, oldHours: number) => {
    setEditingHoursCell(null);
    const delta = hours - oldHours;
    if (delta === 0) return;
    try {
      if (hours > 0) {
        const { error } = await supabase
          .from('daily_canvasser_metric_entries')
          .upsert({ user_id: userId, entry_date: date, hours_worked_delta: hours, updated_at: new Date().toISOString() }, { onConflict: 'user_id,entry_date' });
        if (error) throw error;
      } else {
        await supabase.from('daily_canvasser_metric_entries').delete().eq('user_id', userId).eq('entry_date', date);
      }

      const weekStart = getWeekStartForDate(date);
      const weekEnd = getWeekEndForDate(weekStart);
      const { data: weeklyRow } = await supabase.from('weekly_canvasser_metrics').select('id, hours_worked').eq('user_id', userId).eq('week_start', weekStart).maybeSingle();
      if (weeklyRow) {
        await supabase.from('weekly_canvasser_metrics').update({ hours_worked: Math.max(0, (Number(weeklyRow.hours_worked) || 0) + delta) }).eq('id', weeklyRow.id);
      } else if (hours > 0) {
        await supabase.from('weekly_canvasser_metrics').insert({ user_id: userId, week_start: weekStart, week_end: weekEnd, hours_worked: hours });
      }

      const { data: ytdRow } = await supabase.from('canvasser_metrics').select('id, hours_worked').eq('user_id', userId).maybeSingle();
      if (ytdRow) {
        await supabase.from('canvasser_metrics').update({ hours_worked: Math.max(0, (Number(ytdRow.hours_worked) || 0) + delta) }).eq('id', ytdRow.id);
      }

      setCanvasserHoursData(prev => {
        const filtered = prev.filter(e => !(e.user_id === userId && e.entry_date === date));
        if (hours > 0) filtered.push({ user_id: userId, entry_date: date, hours_worked_delta: hours });
        return filtered;
      });
      toast.success('Hours updated');
    } catch (err) {
      console.error('Error saving hours:', err);
      toast.error('Failed to save hours');
    }
  };

  const handleMoveHoursDay = async (userId: string, oldDate: string, newDate: string, hours: number) => {
    if (oldDate === newDate) return;
    setEditingHoursCell(null);
    try {
      await supabase.from('daily_canvasser_metric_entries').delete().eq('user_id', userId).eq('entry_date', oldDate);
      const { error } = await supabase.from('daily_canvasser_metric_entries').upsert({ user_id: userId, entry_date: newDate, hours_worked_delta: hours, updated_at: new Date().toISOString() }, { onConflict: 'user_id,entry_date' });
      if (error) throw error;

      const oldWeekStart = getWeekStartForDate(oldDate);
      const newWeekStart = getWeekStartForDate(newDate);
      if (oldWeekStart !== newWeekStart) {
        const { data: oldWeekRow } = await supabase.from('weekly_canvasser_metrics').select('id, hours_worked').eq('user_id', userId).eq('week_start', oldWeekStart).maybeSingle();
        if (oldWeekRow) await supabase.from('weekly_canvasser_metrics').update({ hours_worked: Math.max(0, (Number(oldWeekRow.hours_worked) || 0) - hours) }).eq('id', oldWeekRow.id);
        const newWeekEnd = getWeekEndForDate(newWeekStart);
        const { data: newWeekRow } = await supabase.from('weekly_canvasser_metrics').select('id, hours_worked').eq('user_id', userId).eq('week_start', newWeekStart).maybeSingle();
        if (newWeekRow) await supabase.from('weekly_canvasser_metrics').update({ hours_worked: (Number(newWeekRow.hours_worked) || 0) + hours }).eq('id', newWeekRow.id);
        else await supabase.from('weekly_canvasser_metrics').insert({ user_id: userId, week_start: newWeekStart, week_end: newWeekEnd, hours_worked: hours });
      }

      setCanvasserHoursData(prev => {
        const filtered = prev.filter(e => !(e.user_id === userId && (e.entry_date === oldDate || e.entry_date === newDate)));
        filtered.push({ user_id: userId, entry_date: newDate, hours_worked_delta: hours });
        return filtered;
      });
      toast.success(`Hours moved`);
    } catch (err) {
      console.error('Error moving hours:', err);
      toast.error('Failed to move hours');
    }
  };

  const handleEditShift = (shift: any) => {
    setSelectedShift(shift);
    setShiftClockIn(shift.clock_in_at?.slice(0, 16) || '');
    setShiftClockOut(shift.clock_out_at?.slice(0, 16) || '');
    setShiftDoors(shift.doors_knocked?.toString() || '');
    setShiftNotes(shift.notes || '');
    setEditShiftModalOpen(true);
  };

  const handleSaveEditShift = async () => {
    if (!selectedShift || !shiftClockIn || !shiftClockOut) return;
    setSavingShift(true);
    try {
      const oldHours = Number(selectedShift.hours_worked) || 0;
      const oldDoors = Number(selectedShift.doors_knocked) || 0;
      const newHours = Math.round(((new Date(shiftClockOut).getTime() - new Date(shiftClockIn).getTime()) / 3600000) * 4) / 4;
      const newDoors = parseInt(shiftDoors) || 0;
      const hoursDelta = newHours - oldHours;
      const doorsDelta = newDoors - oldDoors;

      await supabase.from('canvasser_shifts').update({
        clock_in_at: new Date(shiftClockIn).toISOString(),
        clock_out_at: new Date(shiftClockOut).toISOString(),
        doors_knocked: newDoors || null,
        notes: shiftNotes || null,
        status: 'completed',
        edited_at: new Date().toISOString(),
      }).eq('id', selectedShift.id);

      if (hoursDelta !== 0 || doorsDelta !== 0) {
        await updateCanvasserHours(selectedShift.canvasser_id, new Date(shiftClockIn), hoursDelta, doorsDelta);
      }

      toast.success('Shift updated');
      setEditShiftModalOpen(false);
      fetchShifts();
      fetchShiftHistory();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
    setSavingShift(false);
  };

  const handleAddManualShift = async () => {
    if (!shiftCanvasserId || !shiftClockIn || !shiftClockOut) return;
    setSavingShift(true);
    try {
      const shiftHours = Math.round(((new Date(shiftClockOut).getTime() - new Date(shiftClockIn).getTime()) / 3600000) * 4) / 4;
      const doors = parseInt(shiftDoors) || 0;

      await supabase.from('canvasser_shifts').insert({
        canvasser_id: shiftCanvasserId,
        clock_in_at: new Date(shiftClockIn).toISOString(),
        clock_out_at: new Date(shiftClockOut).toISOString(),
        doors_knocked: doors || null,
        notes: shiftNotes || null,
        status: 'completed',
      });

      await updateCanvasserHours(shiftCanvasserId, new Date(shiftClockIn), shiftHours, doors);
      toast.success(`Manual shift added: ${shiftHours}h`);
      setAddShiftModalOpen(false);
      setShiftCanvasserId('');
      setShiftClockIn('');
      setShiftClockOut('');
      setShiftDoors('');
      setShiftNotes('');
      fetchShifts();
      fetchShiftHistory();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
    setSavingShift(false);
  };

  const handleDismissShift = async (shift: any) => {
    const clockOut = prompt('Enter clock-out time (YYYY-MM-DDTHH:mm)', format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    if (!clockOut) return;
    try {
      const shiftHours = Math.round(((new Date(clockOut).getTime() - new Date(shift.clock_in_at).getTime()) / 3600000) * 4) / 4;
      await supabase.from('canvasser_shifts').update({
        clock_out_at: new Date(clockOut).toISOString(),
        status: 'completed',
        edited_at: new Date().toISOString(),
      }).eq('id', shift.id);
      await updateCanvasserHours(shift.canvasser_id, new Date(shift.clock_in_at), shiftHours, 0);
      toast.success('Shift dismissed');
      fetchShifts();
      fetchShiftHistory();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const getCanvasserName = (id: string) => canvassers.find(c => c.userId === id)?.name || 'Unknown';

  const handleAddZone = async () => {
    if (!zoneName || !zoneLat || !zoneLng) return;
    setSavingZone(true);
    try {
      const { error } = await supabase.from('geofence_work_zones').insert({
        name: zoneName,
        lat: parseFloat(zoneLat),
        lng: parseFloat(zoneLng),
        radius_meters: parseInt(zoneRadius) || 500,
      } as any);
      if (error) throw error;
      toast.success('Work zone added');
      setAddZoneModalOpen(false);
      setZoneName(''); setZoneLat(''); setZoneLng(''); setZoneRadius('500');
      fetchWorkZones();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
    setSavingZone(false);
  };

  const handleToggleZone = async (zoneId: string, isActive: boolean) => {
    await supabase.from('geofence_work_zones').update({ is_active: isActive } as any).eq('id', zoneId);
    fetchWorkZones();
    toast.success(isActive ? 'Zone activated' : 'Zone deactivated');
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm('Delete this work zone?')) return;
    await supabase.from('geofence_work_zones').delete().eq('id', zoneId);
    fetchWorkZones();
    toast.success('Zone deleted');
  };

  const handleCopyCoords = async (lat: number, lng: number) => {
    const coords = `${lat}, ${lng}`;
    try {
      await navigator.clipboard.writeText(coords);
      toast.success('Coordinates copied');
    } catch {
      const input = document.createElement('input');
      input.value = coords;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success('Coordinates copied');
    }
  };

  const renderLocationLink = (lat: number | null, lng: number | null) => {
    if (lat == null || lng == null) return <span className="text-muted-foreground">--</span>;
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <a
            href={`https://maps.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline text-xs"
          >
            <MapPin className="h-3.5 w-3.5" />
            View on Maps
          </a>
          <button
            onClick={() => handleCopyCoords(lat, lng)}
            className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground text-xs"
            title="Copy coordinates"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading text-foreground">TimeClock</h2>
        <p className="text-muted-foreground">Manage canvasser hours, shifts, and GPS locations</p>
      </div>

      {/* Hours Tracker */}
      <Collapsible open={hoursTrackerOpen} onOpenChange={setHoursTrackerOpen}>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer">
                {hoursTrackerOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <h3 className="text-lg font-heading text-foreground">Canvasser Hours Tracker</h3>
              </CollapsibleTrigger>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => { const w = new Date(selectedHoursWeek); w.setDate(w.getDate() - 7); setSelectedHoursWeek(w); }}>← Prev</Button>
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {selectedHoursWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(selectedHoursWeek.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <Button variant="outline" size="sm" onClick={() => { const w = new Date(selectedHoursWeek); w.setDate(w.getDate() + 7); setSelectedHoursWeek(w); }}>Next →</Button>
              </div>
            </div>
          </div>
          <CollapsibleContent>
            {canvassers.length === 0 ? (
              <div className="p-8 text-center"><p className="text-muted-foreground">No canvasser data available yet.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                      {['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'].map(day => (
                        <th key={day} className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">{day}</th>
                      ))}
                      <th className="text-center py-3 px-4 text-sm font-bold text-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {canvassers.map((canvasser) => {
                      const weekDays = Array.from({ length: 7 }, (_, i) => {
                        const date = new Date(selectedHoursWeek);
                        date.setDate(date.getDate() + i);
                        return format(date, 'yyyy-MM-dd');
                      });
                      const dailyHours = weekDays.map(date => {
                        const entries = canvasserHoursData.filter(e => e.user_id === canvasser.userId && e.entry_date === date);
                        return entries.reduce((sum: number, e: any) => sum + (Number(e.hours_worked_delta) || 0), 0);
                      });
                      const weekTotal = dailyHours.reduce((sum, h) => sum + h, 0);

                      return (
                        <tr key={canvasser.userId} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-foreground font-medium">{canvasser.name}</td>
                          {dailyHours.map((hours, i) => {
                            const cellKey = `${canvasser.userId}-${weekDays[i]}`;
                            const isEditing = editingHoursCell === cellKey;
                            return (
                              <td key={i} className="text-center py-1 px-1">
                                {isEditing ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <input
                                      type="number" step="0.5" min="0" max="24" autoFocus
                                      defaultValue={hours > 0 ? hours : ''}
                                      className="w-16 h-8 text-center text-sm border border-primary rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                      onBlur={(e) => handleSaveHoursCell(canvasser.userId, weekDays[i], parseFloat(e.target.value) || 0, hours)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveHoursCell(canvasser.userId, weekDays[i], parseFloat((e.target as HTMLInputElement).value) || 0, hours);
                                        else if (e.key === 'Escape') setEditingHoursCell(null);
                                      }}
                                    />
                                    {hours > 0 && (
                                      <div className="flex gap-0.5 flex-wrap justify-center">
                                        {['T', 'F', 'S', 'S', 'M', 'T', 'W'].map((dayLabel, dayIdx) => {
                                          if (dayIdx === i) return null;
                                          return (
                                            <button key={dayIdx}
                                              onMouseDown={(e) => { e.preventDefault(); handleMoveHoursDay(canvasser.userId, weekDays[i], weekDays[dayIdx], hours); }}
                                              className="w-5 h-5 text-[10px] rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors text-muted-foreground"
                                              title={`Move to ${['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'][dayIdx]}`}
                                            >{dayLabel}</button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button onClick={() => setEditingHoursCell(cellKey)} className="w-full py-2 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm text-foreground transition-colors" title="Click to edit">
                                    {hours > 0 ? hours.toFixed(1) : '-'}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                          <td className="text-center py-3 px-4 font-bold text-foreground">{weekTotal > 0 ? weekTotal.toFixed(1) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Shift Management */}
      <Collapsible open={shiftMgmtOpen} onOpenChange={setShiftMgmtOpen}>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer">
              {shiftMgmtOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <h3 className="text-lg font-heading text-foreground">Shift Management</h3>
              {(activeShifts.length > 0 || flaggedShifts.length > 0) && (
                <Badge variant="secondary" className="ml-2">{activeShifts.length + flaggedShifts.length}</Badge>
              )}
            </CollapsibleTrigger>
            <Button size="sm" variant="outline" onClick={() => { setSelectedShift(null); setShiftCanvasserId(''); setShiftClockIn(''); setShiftClockOut(''); setShiftDoors(''); setShiftNotes(''); setAddShiftModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Shift
            </Button>
          </div>
          <CollapsibleContent>
            <div className="p-4 space-y-4">
              {activeShifts.filter(s => s.status === 'active').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Currently Clocked In</h4>
                  <div className="space-y-2">
                    {activeShifts.filter(s => s.status === 'active').map((shift: any) => {
                      const elapsed = Date.now() - new Date(shift.clock_in_at).getTime();
                      const hours = Math.floor(elapsed / 3600000);
                      const mins = Math.floor((elapsed % 3600000) / 60000);
                      return (
                        <div key={shift.id} className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{getCanvasserName(shift.canvasser_id)}</span>
                            <span className="text-sm text-muted-foreground">since {format(new Date(shift.clock_in_at), 'h:mm a')}</span>
                            {shift.clock_in_lat && renderLocationLink(shift.clock_in_lat, shift.clock_in_lng)}
                          </div>
                          <Badge variant="outline" className="text-green-600">{hours}h {mins}m</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {flaggedShifts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-600 mb-2">⚠️ Flagged Shifts</h4>
                  <div className="space-y-2">
                    {flaggedShifts.map((shift: any) => (
                      <div key={shift.id} className="flex items-center justify-between p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                        <div>
                          <span className="font-medium text-foreground">{getCanvasserName(shift.canvasser_id)}</span>
                          <span className="text-sm text-muted-foreground ml-2">{format(new Date(shift.clock_in_at), "MMM d 'at' h:mm a")}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditShift(shift)}>Edit</Button>
                          <Button size="sm" variant="secondary" onClick={() => handleDismissShift(shift)}>Dismiss</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeShifts.length === 0 && flaggedShifts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active or flagged shifts</p>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Shift History with Location */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer">
                {historyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <h3 className="text-lg font-heading text-foreground">Shift History with Location</h3>
              </CollapsibleTrigger>
              <div className="flex items-center gap-3">
                <Select value={historyFilter} onValueChange={setHistoryFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Canvassers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Canvassers</SelectItem>
                    {canvassers.map(c => (
                      <SelectItem key={c.userId} value={c.userId}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={historyDays.toString()} onValueChange={v => setHistoryDays(parseInt(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <CollapsibleContent>
            {shiftHistory.length === 0 ? (
              <div className="p-8 text-center"><p className="text-muted-foreground">No shifts found for this period.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Canvasser</th>
                      <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Clock In</th>
                      <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Clock Out</th>
                      <th className="text-right py-3 px-3 text-sm font-medium text-muted-foreground">Hours</th>
                      <th className="text-right py-3 px-3 text-sm font-medium text-muted-foreground">Doors</th>
                      <th className="text-right py-3 px-3 text-sm font-medium text-muted-foreground">Convos</th>
                      <th className="text-right py-3 px-3 text-sm font-medium text-muted-foreground">Not Int.</th>
                      <th className="text-right py-3 px-3 text-sm font-medium text-muted-foreground">Leads Set</th>
                      <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Notes</th>
                      <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Clock-In 📍</th>
                      <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Clock-Out 📍</th>
                      <th className="text-center py-3 px-3 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftHistory.map((shift: any) => {
                      const hrs = shift.clock_out_at
                        ? Math.round(((new Date(shift.clock_out_at).getTime() - new Date(shift.clock_in_at).getTime()) / 3600000) * 4) / 4
                        : null;
                      return (
                        <tr key={shift.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-3 text-foreground font-medium text-sm">{getCanvasserName(shift.canvasser_id)}</td>
                          <td className="py-2 px-3 text-sm text-foreground">{format(new Date(shift.clock_in_at), 'MMM d')}</td>
                          <td className="py-2 px-3 text-sm text-foreground">{format(new Date(shift.clock_in_at), 'h:mm a')}</td>
                          <td className="py-2 px-3 text-sm text-foreground">{shift.clock_out_at ? format(new Date(shift.clock_out_at), 'h:mm a') : '--'}</td>
                          <td className="py-2 px-3 text-sm text-right text-foreground">{hrs != null ? `${hrs}h` : '--'}</td>
                          <td className="py-2 px-3 text-sm text-right text-foreground">{shift.doors_knocked || '--'}</td>
                          <td className="py-2 px-3 text-sm text-right text-foreground">{shift.conversations_had || '--'}</td>
                          <td className="py-2 px-3 text-sm text-right text-foreground">{shift.not_interested || '--'}</td>
                          <td className="py-2 px-3 text-sm text-right text-foreground">{shift.leads_set || '--'}</td>
                          <td className="py-2 px-3 text-sm text-muted-foreground max-w-[150px] truncate">{shift.notes || '--'}</td>
                          <td className="py-2 px-3 text-center">{renderLocationLink(shift.clock_in_lat, shift.clock_in_lng)}</td>
                          <td className="py-2 px-3 text-center">{renderLocationLink(shift.clock_out_lat, shift.clock_out_lng)}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant={shift.status === 'completed' ? 'secondary' : shift.status === 'flagged' ? 'destructive' : 'outline'} className="text-xs">
                              {shift.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Geofence Work Zones */}
      <Collapsible open={workZonesOpen} onOpenChange={setWorkZonesOpen}>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer">
              {workZonesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <ShieldCheck className="h-4 w-4 text-accent" />
              <h3 className="text-lg font-heading text-foreground">Geofence Work Zones</h3>
              <Badge variant="secondary" className="ml-2">{workZones.filter(z => z.is_active).length} active</Badge>
            </CollapsibleTrigger>
            <Button size="sm" variant="outline" onClick={() => setAddZoneModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Zone
            </Button>
          </div>
          <CollapsibleContent>
            <div className="p-4">
              {workZones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No work zones configured. Canvassers can clock in from anywhere.
                </p>
              ) : (
                <div className="space-y-2">
                  {workZones.map((zone: any) => (
                    <div key={zone.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={zone.is_active}
                          onCheckedChange={(checked) => handleToggleZone(zone.id, checked)}
                        />
                        <div>
                          <p className="font-medium text-foreground">{zone.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)} · {zone.radius_meters}m radius
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://maps.google.com/maps?q=${zone.lat},${zone.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteZone(zone.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                💡 When zones are configured, canvassers will see a warning if they try to clock in outside all active zones. They can still clock in but the warning is logged.
              </p>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Add Work Zone Modal */}
      <Dialog open={addZoneModalOpen} onOpenChange={setAddZoneModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Work Zone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zone Name</Label>
              <Input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="e.g. Office, Oak Park" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="any" value={zoneLat} onChange={e => setZoneLat(e.target.value)} placeholder="35.4676" />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="any" value={zoneLng} onChange={e => setZoneLng(e.target.value)} placeholder="-97.5164" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Radius (meters)</Label>
              <Input type="number" min="100" max="50000" value={zoneRadius} onChange={e => setZoneRadius(e.target.value)} placeholder="500" />
              <p className="text-xs text-muted-foreground">500m ≈ 5 city blocks. Tip: Use Google Maps to find coordinates.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddZoneModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddZone} disabled={savingZone || !zoneName || !zoneLat || !zoneLng}>
              {savingZone ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editShiftModalOpen} onOpenChange={setEditShiftModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Shift</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Clock In</Label><Input type="datetime-local" value={shiftClockIn} onChange={e => setShiftClockIn(e.target.value)} /></div>
            <div className="space-y-2"><Label>Clock Out</Label><Input type="datetime-local" value={shiftClockOut} onChange={e => setShiftClockOut(e.target.value)} /></div>
            <div className="space-y-2"><Label>Doors Knocked</Label><Input type="number" min="0" value={shiftDoors} onChange={e => setShiftDoors(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditShiftModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditShift} disabled={savingShift}>{savingShift ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Shift Modal */}
      <Dialog open={addShiftModalOpen} onOpenChange={setAddShiftModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Manual Shift</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Canvasser</Label>
              <Select value={shiftCanvasserId} onValueChange={setShiftCanvasserId}>
                <SelectTrigger><SelectValue placeholder="Select canvasser" /></SelectTrigger>
                <SelectContent>
                  {canvassers.map(c => (
                    <SelectItem key={c.userId} value={c.userId}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Clock In</Label><Input type="datetime-local" value={shiftClockIn} onChange={e => setShiftClockIn(e.target.value)} /></div>
            <div className="space-y-2"><Label>Clock Out</Label><Input type="datetime-local" value={shiftClockOut} onChange={e => setShiftClockOut(e.target.value)} /></div>
            <div className="space-y-2"><Label>Doors Knocked</Label><Input type="number" min="0" value={shiftDoors} onChange={e => setShiftDoors(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddShiftModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddManualShift} disabled={savingShift || !shiftCanvasserId}>{savingShift ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}