import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

const LANDING_PAGE_OPTIONS = [
  { value: '/admin/home', label: 'Home' },
  { value: '/admin/overview', label: 'Scoreboard' },
  { value: '/admin/leads', label: 'Lead Management' },
  { value: '/admin/leaderboards', label: 'Leaderboards' },
  { value: '/admin/timeclock', label: 'TimeClock' },
  { value: '/admin/applicants', label: 'Future Team Mates' },
  { value: '/admin/sales-performance', label: 'Sales Performance' },
  { value: '/admin/goals', label: 'Company Goals' },
];

const MENU_GROUPS = [
  { id: 'pipeline-revenue', label: 'Pipeline & Revenue' },
  { id: 'performance-culture', label: 'Performance & Culture' },
  { id: 'team-operations', label: 'Team Operations' },
  { id: 'system-settings', label: 'System Settings' },
];

interface Preset {
  id: string;
  name: string;
  default_landing_page: string;
  visible_menu_items: string[];
  created_at: string;
}

export default function AdminPresets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [deletingPreset, setDeletingPreset] = useState<Preset | null>(null);
  const [name, setName] = useState('');
  const [landingPage, setLandingPage] = useState('/admin/overview');
  const [visibleGroups, setVisibleGroups] = useState<string[]>(MENU_GROUPS.map(g => g.id));

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['admin-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_presets')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        visible_menu_items: Array.isArray(p.visible_menu_items) ? p.visible_menu_items : [],
      })) as Preset[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        default_landing_page: landingPage,
        visible_menu_items: visibleGroups,
        updated_at: new Date().toISOString(),
      };
      if (editingPreset) {
        const { error } = await supabase.from('admin_presets').update(payload).eq('id', editingPreset.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('admin_presets').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingPreset ? 'Preset Updated' : 'Preset Created' });
      queryClient.invalidateQueries({ queryKey: ['admin-presets'] });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admin_presets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Preset Deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin-presets'] });
      setDeleteDialogOpen(false);
      setDeletingPreset(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openCreate = () => {
    setEditingPreset(null);
    setName('');
    setLandingPage('/admin/overview');
    setVisibleGroups(MENU_GROUPS.map(g => g.id));
    setDialogOpen(true);
  };

  const openEdit = (preset: Preset) => {
    setEditingPreset(preset);
    setName(preset.name);
    setLandingPage(preset.default_landing_page);
    setVisibleGroups(preset.visible_menu_items.length > 0 ? preset.visible_menu_items : MENU_GROUPS.map(g => g.id));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPreset(null);
  };

  const toggleGroup = (groupId: string) => {
    setVisibleGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading text-foreground">Admin Presets</h2>
          <p className="text-sm text-muted-foreground">
            Create role-based presets to control default landing pages and visible menu sections.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Preset
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Landing Page</TableHead>
              <TableHead>Visible Groups</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No presets created yet
                </TableCell>
              </TableRow>
            ) : (
              presets.map((preset) => (
                <TableRow key={preset.id}>
                  <TableCell className="font-medium">{preset.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {LANDING_PAGE_OPTIONS.find(o => o.value === preset.default_landing_page)?.label || preset.default_landing_page}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {preset.visible_menu_items.length === 0 || preset.visible_menu_items.length === MENU_GROUPS.length ? (
                        <Badge variant="secondary">All Groups</Badge>
                      ) : (
                        preset.visible_menu_items.map(id => (
                          <Badge key={id} variant="outline">
                            {MENU_GROUPS.find(g => g.id === id)?.label || id}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(preset)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeletingPreset(preset); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPreset ? 'Edit Preset' : 'Create Preset'}</DialogTitle>
            <DialogDescription>
              Configure the default view and accessible menu sections for this admin role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Preset Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HR Admin" />
            </div>
            <div className="space-y-2">
              <Label>Default Landing Page</Label>
              <Select value={landingPage} onValueChange={setLandingPage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANDING_PAGE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visible Menu Groups</Label>
              <div className="space-y-2">
                {MENU_GROUPS.map(group => (
                  <div key={group.id} className="flex items-center gap-2">
                    <Checkbox
                      id={group.id}
                      checked={visibleGroups.includes(group.id)}
                      onCheckedChange={() => toggleGroup(group.id)}
                    />
                    <label htmlFor={group.id} className="text-sm cursor-pointer">{group.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingPreset ? 'Save Changes' : 'Create Preset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingPreset?.name}</strong>? Users assigned to this preset will lose their custom settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingPreset && deleteMutation.mutate(deletingPreset.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
