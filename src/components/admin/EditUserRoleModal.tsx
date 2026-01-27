import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RANK_OPTIONS, CANVASSER_RANK_OPTIONS } from '@/lib/constants';

interface UserWithRole {
  id: string;
  fullName: string | null;
  role: 'admin' | 'user' | 'canvasser';
  rank: string | null;
  isArchived: boolean;
  archivedAt: string | null;
}

interface EditUserRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function EditUserRoleModal({ open, onOpenChange, user, onSuccess }: EditUserRoleModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<'user' | 'canvasser'>('user');
  const [rank, setRank] = useState<string>('SR1');

  useEffect(() => {
    if (user) {
      setRole(user.role === 'admin' ? 'user' : user.role);
      setRank(user.rank || (user.role === 'canvasser' ? 'C1' : 'SR1'));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke('admin-set-user-role', {
        body: { 
          targetUserId: user.id, 
          newRole: role,
          salesRank: role === 'user' ? rank : undefined,
          canvasserRank: role === 'canvasser' ? rank : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update role');
      }

      toast({
        title: 'Success',
        description: `Updated ${user.fullName || 'user'} to ${role === 'user' ? 'Sales Rep' : 'Canvasser'} (${rank})`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rankOptions = role === 'canvasser' ? CANVASSER_RANK_OPTIONS : RANK_OPTIONS;

  // Reset rank when role changes
  const handleRoleChange = (newRole: 'user' | 'canvasser') => {
    setRole(newRole);
    if (newRole === 'canvasser') {
      setRank('C1');
    } else {
      setRank('SR1');
    }
  };

  if (user?.role === 'admin') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit User Role & Rank</DialogTitle>
          <DialogDescription>
            Update role and rank for {user?.fullName || 'user'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Sales Rep</SelectItem>
                  <SelectItem value="canvasser">Canvasser</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rank" className="text-right">
                Rank
              </Label>
              <Select value={rank} onValueChange={setRank}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select rank" />
                </SelectTrigger>
                <SelectContent>
                  {rankOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
