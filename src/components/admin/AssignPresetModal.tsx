import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface AssignPresetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string | null;
  currentPresetId: string | null;
  onSuccess: () => void;
}

export function AssignPresetModal({ open, onOpenChange, userId, userName, currentPresetId, onSuccess }: AssignPresetModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPresetId, setSelectedPresetId] = useState<string>(currentPresetId || 'none');

  const { data: presets = [] } = useQuery({
    queryKey: ['admin-presets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_presets').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const value = selectedPresetId === 'none' ? null : selectedPresetId;
      const { error } = await supabase
        .from('profiles')
        .update({ admin_preset_id: value } as any)
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Preset Assigned', description: `Preset updated for ${userName || 'user'}.` });
      queryClient.invalidateQueries({ queryKey: ['admin-presets'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Sync selected when modal opens
  const handleOpenChange = (o: boolean) => {
    if (o) setSelectedPresetId(currentPresetId || 'none');
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Preset</DialogTitle>
          <DialogDescription>
            Choose an admin preset for <strong>{userName || 'this user'}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Admin Preset</Label>
          <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
            <SelectTrigger><SelectValue placeholder="Select a preset" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Full Access)</SelectItem>
              {presets.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
