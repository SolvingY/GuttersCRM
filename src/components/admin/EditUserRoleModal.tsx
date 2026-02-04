import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Loader2, Shield, Users, UserCheck } from 'lucide-react';
import { RANK_OPTIONS, CANVASSER_RANK_OPTIONS } from '@/lib/constants';

interface UserWithRole {
  id: string;
  fullName: string | null;
  roles: ('admin' | 'user' | 'canvasser')[];
  salesRank: string | null;
  canvasserRank: string | null;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSalesRep, setIsSalesRep] = useState(false);
  const [isCanvasser, setIsCanvasser] = useState(false);
  const [salesRank, setSalesRank] = useState<string>('SR1');
  const [canvasserRank, setCanvasserRank] = useState<string>('C1');

  useEffect(() => {
    if (user) {
      setIsAdmin(user.roles.includes('admin'));
      setIsSalesRep(user.roles.includes('user'));
      setIsCanvasser(user.roles.includes('canvasser'));
      setSalesRank(user.salesRank || 'SR1');
      setCanvasserRank(user.canvasserRank || 'C1');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate at least one role is selected
    if (!isAdmin && !isSalesRep && !isCanvasser) {
      toast({
        title: 'Error',
        description: 'Please select at least one role',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Build roles array
      const roles: string[] = [];
      if (isAdmin) roles.push('admin');
      if (isSalesRep) roles.push('user');
      if (isCanvasser) roles.push('canvasser');

      // Determine if this is admin-only (admin checked but no operational roles)
      const isAdminOnly = isAdmin && !isSalesRep && !isCanvasser;

      const response = await supabase.functions.invoke('admin-set-user-role', {
        body: { 
          targetUserId: user.id, 
          roles,
          salesRank: isSalesRep ? salesRank : undefined,
          canvasserRank: isCanvasser ? canvasserRank : undefined,
          isAdminOnly,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update roles');
      }

      // Build success message
      const roleNames: string[] = [];
      if (isAdmin && !isSalesRep && !isCanvasser) {
        roleNames.push('Admin Only');
      } else {
        if (isAdmin) roleNames.push('Admin');
        if (isSalesRep) roleNames.push(`Sales Rep (${salesRank})`);
        if (isCanvasser) roleNames.push(`Canvasser (${canvasserRank})`);
      }

      toast({
        title: 'Success',
        description: `Updated ${user.fullName || 'user'} to ${roleNames.join(' + ')}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating roles:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update roles',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = isAdmin || isSalesRep || isCanvasser;
  const isAdminOnly = isAdmin && !isSalesRep && !isCanvasser;
  const isSuperAdmin = isAdmin && (isSalesRep || isCanvasser);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit User Roles & Ranks</DialogTitle>
          <DialogDescription>
            Update roles and ranks for {user?.fullName || 'user'}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Admin Access Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="admin"
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(checked === true)}
                />
                <Label htmlFor="admin" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin (Portal Access)
                </Label>
              </div>
              {isAdminOnly && (
                <p className="ml-6 text-xs text-muted-foreground">
                  Admin-only: No sales or canvasser metrics will be tracked.
                </p>
              )}
              {isSuperAdmin && (
                <p className="ml-6 text-xs text-primary">
                  Super Admin: Full admin access with operational role metrics.
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Operational Roles (can be combined with Admin):
              </p>

              {/* Sales Rep Role */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="salesRep"
                    checked={isSalesRep}
                    onCheckedChange={(checked) => setIsSalesRep(checked === true)}
                  />
                  <Label htmlFor="salesRep" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Sales Rep
                  </Label>
                </div>
                {isSalesRep && (
                  <div className="ml-6">
                    <Label htmlFor="salesRank" className="text-sm text-muted-foreground">
                      Sales Rank
                    </Label>
                    <Select value={salesRank} onValueChange={setSalesRank}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select rank" />
                      </SelectTrigger>
                      <SelectContent>
                        {RANK_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Canvasser Role */}
              <div className="space-y-3 mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canvasser"
                    checked={isCanvasser}
                    onCheckedChange={(checked) => setIsCanvasser(checked === true)}
                  />
                  <Label htmlFor="canvasser" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Canvasser
                  </Label>
                </div>
                {isCanvasser && (
                  <div className="ml-6">
                    <Label htmlFor="canvasserRank" className="text-sm text-muted-foreground">
                      Canvasser Rank
                    </Label>
                    <Select value={canvasserRank} onValueChange={setCanvasserRank}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select rank" />
                      </SelectTrigger>
                      <SelectContent>
                        {CANVASSER_RANK_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {!isValid && (
              <p className="text-sm text-destructive">
                Please select at least one role
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
