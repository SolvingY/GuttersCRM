import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; fullName: string | null } | null;
}

export function SetPasswordModal({ open, onOpenChange, user }: SetPasswordModalProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'set-password', targetUserId: user.id, newPassword: password },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to set password');
      }

      toast({
        title: 'Password Updated',
        description: `Password for ${user.fullName || 'user'} has been set successfully.`,
      });
      setPassword('');
      setConfirmPassword('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error setting password:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPassword(''); setConfirmPassword(''); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Password</DialogTitle>
          <DialogDescription>
            Set a new password for <strong>{user?.fullName || 'this user'}</strong>. You will need to share the new password with them directly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || password.length < 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Set Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
